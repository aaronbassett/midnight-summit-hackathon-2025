"""Validation orchestrator that coordinates all security layers.

Orchestrates NER validator, Guard validator, pattern matching, and embedding matching
to provide comprehensive threat detection with confidence-based decision making.
"""

from uuid import UUID

from bandaid.models.events import (
    DetectionLayer,
    EventType,
    SecurityEvent,
    SeverityLevel,
    ThreatType,
    ValidationResult,
)
from bandaid.observability.logger import get_logger
from bandaid.security.confidence import Action, get_confidence_manager
from bandaid.security.guard_validator import get_guard_validator
from bandaid.security.ner_validator import get_ner_validator
from bandaid.security.patterns import get_pattern_detector
from bandaid.storage.events_db import get_events_db

logger = get_logger(__name__)


class ValidationOrchestrator:
    """Orchestrates all security validation layers."""

    def __init__(
        self,
        ner_enabled: bool = True,
        guard_enabled: bool = True,
        regex_enabled: bool = True,
        embeddings_enabled: bool = False,  # Phase 5 feature
        device: str = "cpu",
        lazy_load: bool = True,
    ):
        """Initialize validation orchestrator.

        Args:
            ner_enabled: Enable NER validation
            guard_enabled: Enable Llama Guard validation
            regex_enabled: Enable regex pattern matching
            embeddings_enabled: Enable embedding-based pattern matching
            device: Device for model inference
            lazy_load: Lazy-load models on first use
        """
        self.ner_enabled = ner_enabled
        self.guard_enabled = guard_enabled
        self.regex_enabled = regex_enabled
        self.embeddings_enabled = embeddings_enabled
        self.device = device

        # Initialize validators
        self.ner_validator = (
            get_ner_validator(device=device, lazy_load=lazy_load) if ner_enabled else None
        )
        self.guard_validator = (
            get_guard_validator(device=device, lazy_load=lazy_load) if guard_enabled else None
        )
        self.pattern_detector = get_pattern_detector() if regex_enabled else None
        self.confidence_manager = get_confidence_manager()

        # Initialize embedding matcher for self-learning (T066)
        self.pattern_matcher = None
        if embeddings_enabled:
            from bandaid.learning.matcher import get_pattern_matcher
            from bandaid.learning.pattern_store import get_pattern_store

            pattern_store = get_pattern_store()
            self.pattern_matcher = get_pattern_matcher(pattern_store=pattern_store)

    def _ensure_validators_initialized(self) -> None:
        """Ensure all enabled validators are initialized (lazy loading)."""
        if self.ner_validator and not self.ner_validator.is_initialized():
            logger.info("lazy-loading validator", validator="ner", device=self.device)
            self.ner_validator.initialize()

        if self.guard_validator and not self.guard_validator.is_initialized():
            logger.info("lazy-loading validator", validator="guard", device=self.device)
            self.guard_validator.initialize()

        if self.pattern_matcher and not self.pattern_matcher.embedder.is_initialized():
            logger.info("lazy-loading validator", validator="embedding_matcher")

    async def validate(
        self,
        text: str,
        request_id: UUID,
        provider: str | None = None,
        model: str | None = None,
    ) -> tuple[bool, SecurityEvent]:
        """Validate text through all security layers.

        Args:
            text: Text to validate
            request_id: Request identifier
            provider: Target LLM provider
            model: Target LLM model

        Returns:
            Tuple of (should_block, security_event)

        Raises:
            ValueError: If text is None or empty
        """
        if not text:
            raise ValueError("Text cannot be None or empty")

        self._ensure_validators_initialized()

        validation_results: list[ValidationResult] = []
        all_threats: dict[ThreatType, list[str]] = {}
        max_confidence = 0.0
        primary_threat_type: ThreatType | None = None
        detection_layer: DetectionLayer | None = None
        learned_pattern_id: UUID | None = None

        # Step 0: Check against learned patterns (T066 - embeddings-based matching)
        if self.embeddings_enabled and self.pattern_matcher:
            logger.debug(
                "checking validation layer", layer="embedding_match", text_length=len(text)
            )
            try:
                is_match, matched_pattern, similarity = (
                    self.pattern_matcher.is_similar_to_known_pattern(text)
                )

                if is_match and matched_pattern:
                    logger.warning(
                        "matched known attack pattern",
                        pattern_id=str(matched_pattern.id),
                        similarity=similarity,
                        threat_types=[
                            t.value if hasattr(t, "value") else str(t)
                            for t in matched_pattern.threat_types
                        ],
                    )

                    # High confidence match - likely an attack variant
                    max_confidence = max(0.95, similarity)
                    primary_threat_type = (
                        matched_pattern.threat_types[0]
                        if matched_pattern.threat_types
                        else ThreatType.PROMPT_INJECTION
                    )
                    detection_layer = DetectionLayer.EMBEDDING_MATCH
                    learned_pattern_id = matched_pattern.id

                    # Add to threats
                    for threat_type in matched_pattern.threat_types:
                        all_threats[threat_type] = [f"Pattern match (similarity={similarity:.2f})"]

                    validation_results.append(
                        ValidationResult(
                            layer=DetectionLayer.EMBEDDING_MATCH,
                            passed=False,
                            confidence=similarity,
                            threats_detected=matched_pattern.threat_types,
                            details={
                                "pattern_id": str(matched_pattern.id),
                                "similarity": similarity,
                            },
                        )
                    )

            except Exception as e:  # pylint: disable=broad-except
                logger.error("embedding pattern matching failed", error=str(e), exc_info=True)

        # Step 1: Regex pattern matching (fastest)
        if self.regex_enabled and self.pattern_detector:
            logger.debug("checking validation layer", layer="regex", text_length=len(text))
            pattern_results = self.pattern_detector.detect_all(text)

            if pattern_results:
                for detection in pattern_results:
                    threat_type = detection.threat_type
                    if threat_type not in all_threats:
                        all_threats[threat_type] = []
                    all_threats[threat_type].append(detection.matched_text)

                    if detection.confidence > max_confidence:
                        max_confidence = detection.confidence
                        primary_threat_type = threat_type
                        detection_layer = DetectionLayer.REGEX

                validation_results.append(
                    ValidationResult(
                        layer=DetectionLayer.REGEX,
                        passed=len(pattern_results) == 0,
                        confidence=max_confidence,
                        threats_detected=[d.threat_type for d in pattern_results],
                        details={
                            "matches": [
                                {
                                    "type": d.threat_type.value,
                                    "confidence": d.confidence,
                                    "text": d.matched_text,
                                }
                                for d in pattern_results
                            ]
                        },
                    )
                )

        # Step 2: NER validation
        if self.ner_enabled and self.ner_validator:
            logger.debug("checking validation layer", layer="ner", text_length=len(text))
            try:
                has_threats, confidence, threats = self.ner_validator.validate(text)

                if has_threats:
                    for threat_type, entities in threats.items():
                        if threat_type not in all_threats:
                            all_threats[threat_type] = []
                        all_threats[threat_type].extend(entities)

                    if confidence > max_confidence:
                        max_confidence = confidence
                        primary_threat_type = list(threats.keys())[0]
                        detection_layer = DetectionLayer.NER

                validation_results.append(
                    ValidationResult(
                        layer=DetectionLayer.NER,
                        passed=not has_threats,
                        confidence=confidence,
                        threats_detected=list(threats.keys()),
                        details={"entities": threats},
                    )
                )
            except Exception as e:  # pylint: disable=broad-except
                # Catch all exceptions from validator to ensure resilience
                # NER validation errors should not crash the entire validation pipeline
                logger.error("ner validation failed", error=str(e), exc_info=True)
                # Continue with other validators even if NER fails
                validation_results.append(
                    ValidationResult(
                        layer=DetectionLayer.NER,
                        passed=True,  # Consider passed if validation fails
                        confidence=0.0,
                        threats_detected=[],
                        details={"error": str(e)},
                    )
                )

        # Step 3: Determine action based on confidence
        action = self.confidence_manager.get_action(
            max_confidence, guard_enabled=self.guard_enabled
        )

        logger.debug(
            "confidence evaluation",
            confidence=max_confidence,
            action=action.value,
            primary_threat=primary_threat_type.value if primary_threat_type else None,
        )

        # Step 4: Run Guard validation if needed
        guard_result = None
        if action == Action.VALIDATE_FURTHER and self.guard_validator:
            logger.debug(
                "checking validation layer",
                layer="guard",
                text_length=len(text),
                reason="additional_verification",
            )
            is_unsafe, guard_confidence, violated_categories = await self.guard_validator.validate(
                text
            )

            guard_result = is_unsafe

            if is_unsafe:
                # Guard found violation - increase confidence
                max_confidence = max(max_confidence, guard_confidence)

                # Map Guard categories to threat types (simplified)
                if "S12" in violated_categories or "S4" in violated_categories:
                    # Prompt injection category
                    if ThreatType.PROMPT_INJECTION not in all_threats:
                        all_threats[ThreatType.PROMPT_INJECTION] = []
                    all_threats[ThreatType.PROMPT_INJECTION].extend(list(violated_categories))
                    primary_threat_type = ThreatType.PROMPT_INJECTION
                    detection_layer = DetectionLayer.GUARD

            validation_results.append(
                ValidationResult(
                    layer=DetectionLayer.GUARD,
                    passed=not is_unsafe,
                    confidence=guard_confidence,
                    threats_detected=[ThreatType.PROMPT_INJECTION] if is_unsafe else [],
                    details={"violated_categories": list(violated_categories)},
                )
            )

        # Step 5: Final decision
        should_block = self.confidence_manager.should_block(max_confidence, guard_result)

        # Determine event type and severity
        if should_block:
            event_type = EventType.BLOCKED
            severity = self.confidence_manager.get_severity(
                max_confidence, primary_threat_type or ThreatType.PROMPT_INJECTION
            )
        elif max_confidence >= self.confidence_manager.medium_threshold:
            event_type = EventType.MEDIUM_CONFIDENCE_WARNING
            severity = SeverityLevel.MEDIUM
        else:
            event_type = EventType.ALLOWED
            severity = SeverityLevel.INFO

        # Create security event
        # Redact text for storage (keep first 100 chars as preview)
        redacted_content = self._redact_content(text, all_threats)

        security_event = SecurityEvent(
            event_type=event_type,
            threat_type=primary_threat_type,
            confidence_level=max_confidence if primary_threat_type else None,
            request_id=request_id,
            redacted_content=redacted_content,
            severity_level=severity,
            detection_layer=detection_layer,
            learned_pattern_id=learned_pattern_id,
            provider=provider,
            model=model,
        )

        # Log event to database asynchronously
        await self._log_event(security_event, learned_pattern_id=learned_pattern_id)

        # Send high-severity events to Sentry (T080)
        if severity in [SeverityLevel.CRITICAL, SeverityLevel.HIGH]:
            try:
                from bandaid.observability.sentry import capture_security_event

                capture_security_event(
                    event_type=event_type.value,
                    threat_type=primary_threat_type.value if primary_threat_type else None,
                    confidence=max_confidence if primary_threat_type else 0.0,
                    severity=severity.value,
                    request_id=str(request_id),
                    detection_layer=detection_layer.value if detection_layer else None,
                    provider=provider,
                    model=model,
                )
            except Exception as e:  # pylint: disable=broad-except
                logger.error("failed to send event to sentry", error=str(e), exc_info=True)

        # Learn from blocked attacks (T065 - async pattern learning)
        if (
            should_block
            and primary_threat_type
            and self.embeddings_enabled
            and max_confidence >= 0.8
        ):
            # Only learn from high-confidence detections to avoid false positives
            logger.debug(
                "initiating pattern learning",
                threat_type=primary_threat_type.value if primary_threat_type else None,
                confidence=max_confidence,
            )
            await self._learn_pattern_async(
                text=text,
                threat_types=list(all_threats.keys()) if all_threats else [primary_threat_type],
                confidence=max_confidence,
            )

        logger.info(
            "validation complete",
            should_block=should_block,
            event_type=event_type.value,
            threat_type=primary_threat_type.value if primary_threat_type else None,
            confidence=max_confidence,
            request_id=str(request_id),
        )

        return should_block, security_event

    def _redact_content(self, text: str, threats: dict[ThreatType, list[str]]) -> str:
        """Redact sensitive content for storage (T057).

        Args:
            text: Original text
            threats: Detected threats

        Returns:
            Redacted text (max 1000 chars)
        """
        from bandaid.security.redactor import redact_by_threat_type

        # Apply threat-specific redaction
        if threats:
            text = redact_by_threat_type(text, threats)

        # Truncate to reasonable length
        preview = text[:1000] if len(text) > 1000 else text

        if threats:
            threat_summary = ", ".join(f"{t.value}:{len(m)}" for t, m in threats.items())
            return f"{preview}... [Threats detected: {threat_summary}]"

        return preview

    async def _learn_pattern_async(
        self,
        text: str,
        threat_types: list[ThreatType],
        confidence: float,
    ) -> None:
        """Learn from detected attack pattern (T065).

        Args:
            text: Attack text
            threat_types: List of detected threat types
            confidence: Detection confidence
        """
        try:
            from bandaid.learning.embedder import learn_pattern_async
            from bandaid.learning.pattern_store import get_pattern_store

            pattern_store = get_pattern_store()
            if not pattern_store.client:
                pattern_store.initialize()

            # Learn pattern asynchronously
            pattern_id = await learn_pattern_async(
                text=text,
                threat_types=threat_types,
                confidence=confidence,
                pattern_store=pattern_store,
            )

            if pattern_id:
                logger.info("learned new attack pattern", pattern_id=pattern_id)

        except Exception as e:  # pylint: disable=broad-except
            logger.error("pattern learning failed", error=str(e), exc_info=True)

    async def _log_event(
        self, event: SecurityEvent, learned_pattern_id: UUID | None = None
    ) -> None:
        """Log security event to database (T068 - includes learned pattern ID).

        Args:
            event: SecurityEvent to log
            learned_pattern_id: Optional ID of matched learned pattern
        """
        try:
            db = await get_events_db()
            await db.insert_event(event)
        except Exception as e:  # pylint: disable=broad-except
            logger.error("failed to log security event", error=str(e), exc_info=True)


# Global validation orchestrator
_validation_orchestrator: ValidationOrchestrator | None = None


def get_validation_orchestrator(
    ner_enabled: bool = True,
    guard_enabled: bool = True,
    regex_enabled: bool = True,
    device: str = "cpu",
) -> ValidationOrchestrator:
    """Get global validation orchestrator.

    Args:
        ner_enabled: Enable NER validation
        guard_enabled: Enable Guard validation
        regex_enabled: Enable regex pattern matching
        device: Device for inference

    Returns:
        ValidationOrchestrator instance
    """
    global _validation_orchestrator
    if _validation_orchestrator is None:
        _validation_orchestrator = ValidationOrchestrator(
            ner_enabled=ner_enabled,
            guard_enabled=guard_enabled,
            regex_enabled=regex_enabled,
            device=device,
        )
    return _validation_orchestrator

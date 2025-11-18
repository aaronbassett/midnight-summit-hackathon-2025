"""NER-based validator for PII and financial secret detection.

Uses dslim/bert-base-NER model to detect named entities (PER, ORG, LOC, MISC)
and combines with regex patterns for comprehensive financial secret detection.
"""

import torch
from transformers import AutoModelForTokenClassification, AutoTokenizer, pipeline

from bandaid.models.events import ThreatType
from bandaid.observability.logger import get_logger
from bandaid.security.patterns import get_pattern_detector

logger = get_logger(__name__)


class NERValidator:
    """NER-based validator for detecting PII and financial secrets."""

    def __init__(
        self,
        model_name: str = "dslim/bert-base-NER",
        device: str = "cpu",
        confidence_threshold: float = 0.7,
    ):
        """Initialize NER validator.

        Args:
            model_name: HuggingFace model name
            device: Device for inference ("cpu", "cuda", "mps")
            confidence_threshold: Minimum confidence for entity detection
        """
        self.model_name = model_name
        self.device = device
        self.confidence_threshold = confidence_threshold
        self.pipeline: pipeline | None = None  # type: ignore[valid-type]
        self.pattern_detector = get_pattern_detector()

    def initialize(self) -> None:
        """Load NER model and create pipeline."""
        logger.info("initializing ner validator", model_name=self.model_name, device=self.device)

        try:
            tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            model = AutoModelForTokenClassification.from_pretrained(self.model_name)

            # Move model to device
            if self.device == "cuda" and torch.cuda.is_available():
                model = model.to("cuda")
                device_id = 0
            elif self.device == "mps" and torch.backends.mps.is_available():
                model = model.to("mps")
                device_id = -1  # MPS not directly supported, use CPU in pipeline
            else:
                device_id = -1  # CPU

            self.pipeline = pipeline(  # type: ignore[call-overload]
                "ner",
                model=model,
                tokenizer=tokenizer,
                aggregation_strategy="simple",
                device=device_id if device_id >= 0 else -1,
            )

            logger.info("ner validator initialized successfully")

        except Exception as e:
            logger.error("failed to initialize ner validator", error=str(e), exc_info=True)
            raise

    def validate(self, text: str) -> tuple[bool, float, dict[ThreatType, list[str]]]:
        """Validate text for PII and financial secrets.

        Args:
            text: Text to validate

        Returns:
            Tuple of (has_threats, max_confidence, threats_detected)
            threats_detected is a dict mapping ThreatType to list of detected entities/patterns
        """
        if not self.pipeline:
            raise RuntimeError("NER validator not initialized. Call initialize() first.")

        threats_detected: dict[ThreatType, list[str]] = {}
        entities = []  # Cache NER results for confidence calculation
        ner_max_confidence = 0.0

        # Run NER model
        try:
            entities = self.pipeline(text)  # type: ignore[misc]

            # Map NER entity types to threat types and prefixes
            entity_mapping = {
                "PER": (ThreatType.PII, "person"),
                "ORG": (ThreatType.PII, "organization"),
                "LOC": (ThreatType.PII, "location"),
            }

            # Process NER entities
            for entity in entities:
                if entity["score"] < self.confidence_threshold:
                    continue

                entity_group = entity["entity_group"]
                entity_word = entity["word"]

                # Track max NER confidence
                ner_max_confidence = max(ner_max_confidence, entity["score"])

                # Map entity to threat type using lookup table
                if entity_group in entity_mapping:
                    threat_type, prefix = entity_mapping[entity_group]
                    if threat_type not in threats_detected:
                        threats_detected[threat_type] = []
                    threats_detected[threat_type].append(f"{prefix}:{entity_word}")

        except Exception as e:
            logger.error("ner validation failed", error=str(e), exc_info=True)
            # Don't fail validation on NER errors, continue with regex

        # Run regex pattern detection (for financial secrets NER can't detect)
        pattern_results = self.pattern_detector.detect_all(text)

        for threat_type, (_confidence, matches) in pattern_results.items():  # type: ignore[attr-defined]
            if threat_type not in threats_detected:
                threats_detected[threat_type] = []
            threats_detected[threat_type].extend(matches)

        # Calculate overall confidence
        has_threats = len(threats_detected) > 0
        if has_threats:
            # Use highest confidence from pattern detection or NER (already cached)
            max_confidence = ner_max_confidence

            # Pattern confidence
            if pattern_results:
                pattern_confidence = max(conf for conf, _ in pattern_results.values())  # type: ignore[attr-defined]
                max_confidence = max(max_confidence, pattern_confidence)

            return True, max_confidence, threats_detected

        return False, 0.0, {}

    def is_initialized(self) -> bool:
        """Check if validator is initialized.

        Returns:
            True if initialized, False otherwise
        """
        return self.pipeline is not None


# Global NER validator instance
_ner_validator: NERValidator | None = None


def get_ner_validator(
    model_name: str = "dslim/bert-base-NER",
    device: str = "cpu",
    lazy_load: bool = True,
) -> NERValidator:
    """Get global NER validator instance.

    Args:
        model_name: HuggingFace model name
        device: Device for inference
        lazy_load: If True, delay model loading until first validation

    Returns:
        NERValidator instance
    """
    global _ner_validator
    if _ner_validator is None:
        _ner_validator = NERValidator(model_name=model_name, device=device)

        if not lazy_load:
            _ner_validator.initialize()

    return _ner_validator

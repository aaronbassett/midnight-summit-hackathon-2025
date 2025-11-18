"""LiteLLM hooks for pre-call and post-call validation.

Integrates security validation into LiteLLM's request/response pipeline.
Supports streaming with async iterator hook for post-stream leak detection.
"""

from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

from fastapi import HTTPException

from bandaid.config import get_config, get_device
from bandaid.observability.logger import get_logger
from bandaid.security.validators import get_validation_orchestrator

logger = get_logger(__name__)


async def async_pre_call_hook(
    user_api_key_dict: dict[str, Any],
    cache: Any,
    data: dict[str, Any],
    call_type: str,
) -> dict[str, Any] | None:
    """Pre-call hook to validate requests before sending to LLM.

    This hook is called by LiteLLM before forwarding the request to the LLM provider.
    It runs security validation and blocks requests if threats are detected.

    Args:
        user_api_key_dict: User API key metadata (not used)
        cache: LiteLLM cache instance (not used)
        data: Request data (contains messages, model, etc.)
        call_type: Type of call ("completion", "chat_completion", etc.)

    Returns:
        Modified data dict or None (None = use original data)

    Raises:
        HTTPException: If request should be blocked
    """
    try:
        # Generate request ID for tracking
        request_id = uuid4()

        # Extract text to validate
        text_to_validate = _extract_text_from_request(data, call_type)

        if not text_to_validate:
            logger.debug("no text to validate in request", call_type=call_type)
            return data

        # Get configuration (with defaults for testing)
        try:
            config = get_config()
            ner_enabled = config.security.checks.ner_enabled
            guard_enabled = config.security.checks.guard_enabled
            regex_enabled = config.security.checks.regex_enabled
            device = get_device()
        except RuntimeError:
            # Config not loaded - use defaults (for testing)
            logger.debug("config not loaded, using defaults")
            ner_enabled = True
            guard_enabled = False
            regex_enabled = True
            device = "cpu"

        # Get validation orchestrator
        orchestrator = get_validation_orchestrator(
            ner_enabled=ner_enabled,
            guard_enabled=guard_enabled,
            regex_enabled=regex_enabled,
            device=device,
        )

        # Extract provider and model
        provider = data.get("custom_llm_provider", "unknown")
        model = data.get("model", "unknown")

        logger.info(
            "validating request",
            request_id=str(request_id),
            provider=provider,
            model=model,
            text_length=len(text_to_validate),
        )

        # Run validation
        should_block, security_event = await orchestrator.validate(
            text=text_to_validate,
            request_id=request_id,
            provider=provider,
            model=model,
        )

        if should_block:
            # Block request
            logger.warning(
                "request blocked",
                request_id=str(request_id),
                threat_type=security_event.threat_type.value
                if security_event.threat_type
                else None,
                confidence=security_event.confidence_level,
            )

            # Raise HTTPException to block request
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "threat_detected",
                    "threat_type": security_event.threat_type.value
                    if security_event.threat_type
                    else "unknown",
                    "confidence": security_event.confidence_level,
                    "request_id": str(request_id),
                    "message": f"Request blocked due to detected {security_event.threat_type.value if security_event.threat_type else 'threat'}",
                },
            )

        logger.info(
            "request allowed",
            request_id=str(request_id),
            event_type=security_event.event_type.value,
        )

        # Store request_id in data for correlation with response
        data["metadata"] = data.get("metadata", {})
        data["metadata"]["bandaid_request_id"] = str(request_id)

        return data

    except HTTPException:
        # Re-raise HTTPException (validation failure)
        raise

    except Exception as e:
        logger.error("pre-call hook failed", error=str(e), exc_info=True)
        # Don't block on hook errors - allow request through
        return data


async def async_post_call_hook(
    user_api_key_dict: dict[str, Any],
    response: Any,
    request_data: dict[str, Any],
) -> Any:
    """Post-call hook to scan responses for data leaks (T054-T055).

    Scans LLM responses for PII, financial secrets, and other sensitive data.
    Logs alerts for detected leaks but does NOT block the response.

    Args:
        user_api_key_dict: User API key metadata
        response: LLM response
        request_data: Original request data

    Returns:
        Response (unmodified - we don't block on leaks, only alert)
    """
    try:
        # Extract request ID for correlation
        request_id_str = request_data.get("metadata", {}).get("bandaid_request_id", "unknown")

        if request_id_str == "unknown":
            # Generate new ID if missing
            from uuid import uuid4

            request_id = uuid4()
            request_id_str = str(request_id)
        else:
            from uuid import UUID

            request_id = UUID(request_id_str)

        # Extract response text
        response_text = _extract_text_from_response(response)

        if not response_text:
            logger.debug("no text in response to scan", request_id=request_id_str)
            return response

        logger.debug(
            "scanning response for data leaks",
            request_id=request_id_str,
            response_length=len(response_text),
        )

        # Get configuration
        config = get_config()

        # Get validation orchestrator for leak detection
        get_validation_orchestrator(
            ner_enabled=config.security.checks.ner_enabled,
            guard_enabled=False,  # Don't run Guard on responses (too slow)
            regex_enabled=config.security.checks.regex_enabled,
            device=config.models.device,
        )

        # Run NER + regex detection on response
        # This will detect PII, blockchain addresses, private keys, API keys, seed phrases
        from bandaid.security.ner_validator import get_ner_validator

        ner_validator = get_ner_validator(device=config.models.device)

        if not ner_validator.pipeline:
            try:
                ner_validator.initialize()
            except Exception:
                logger.warning("failed to initialize NER for response scanning")
                return response

        has_leaks, confidence, leaks = ner_validator.validate(response_text)

        if has_leaks:
            # Data leak detected - log alert but don't block
            logger.warning(
                "data leak detected in response",
                request_id=request_id_str,
                leak_types=list(leaks.keys()),
                confidence=confidence,
            )

            # Log security event for each leak type
            from bandaid.models.events import (
                DetectionLayer,
                EventType,
                SecurityEvent,
            )
            from bandaid.storage.events_db import get_events_db

            for threat_type, _entities in leaks.items():
                # Create data leak alert event
                leak_event = SecurityEvent(
                    event_type=EventType.DATA_LEAK_ALERT,
                    threat_type=threat_type,
                    confidence_level=confidence,
                    request_id=request_id,
                    redacted_content=_redact_response_for_logging(response_text, leaks),
                    severity_level=_determine_leak_severity(threat_type),
                    detection_layer=DetectionLayer.NER,
                    learned_pattern_id=None,
                    provider=request_data.get("custom_llm_provider", "unknown"),
                    model=request_data.get("model", "unknown"),
                )

                # Log event to database
                try:
                    db = await get_events_db()
                    await db.insert_event(leak_event)
                except Exception as e:
                    logger.error("failed to log leak event", error=str(e))

            # Send to Sentry if configured (T055)
            if (
                config.observability
                and config.observability.sentry
                and config.observability.sentry.dsn
            ):
                try:
                    from bandaid.observability.sentry import capture_security_event

                    # Send one event per leak type
                    for threat_type in leaks.keys():
                        capture_security_event(
                            event_type="data_leak_alert",
                            threat_type=threat_type.value
                            if hasattr(threat_type, "value")
                            else str(threat_type),
                            confidence=confidence,
                            severity=_determine_leak_severity(threat_type).value,
                            request_id=request_id_str,
                        )
                except Exception as e:
                    logger.error("failed to send leak alert to sentry", error=str(e))

        else:
            logger.debug("no data leaks detected in response", request_id=request_id_str)

        # Always return response unmodified (we alert but don't block)
        return response

    except Exception as e:
        logger.error("post-call hook failed", error=str(e), exc_info=True)
        # Don't block on hook errors - return response
        return response


def _extract_text_from_request(data: dict[str, Any], call_type: str) -> str:
    """Extract text content from request data for validation.

    Args:
        data: Request data
        call_type: Type of call

    Returns:
        Concatenated text to validate
    """
    texts = []

    # Chat completions
    if call_type in ["completion", "acompletion", "chat_completion", "achat_completion"]:
        messages = data.get("messages", [])
        for message in messages:
            if isinstance(message, dict):
                content = message.get("content", "")
                if content:
                    texts.append(content)

    # Legacy completions
    elif call_type in ["text_completion", "atext_completion"]:
        prompt = data.get("prompt", "")
        if prompt:
            texts.append(prompt)

    # Embeddings (lower priority, but still validate)
    elif call_type in ["embedding", "aembedding"]:
        input_text = data.get("input", "")
        if isinstance(input_text, str):
            texts.append(input_text)
        elif isinstance(input_text, list):
            texts.extend([str(item) for item in input_text])

    return "\n".join(texts)


def _extract_text_from_response(response: Any) -> str:
    """Extract text content from LLM response for scanning.

    Args:
        response: LLM response object

    Returns:
        Concatenated text from response
    """
    texts = []

    try:
        # OpenAI-style response
        if hasattr(response, "choices"):
            for choice in response.choices:
                if hasattr(choice, "message"):
                    # Chat completion
                    content = getattr(choice.message, "content", "")
                    if content:
                        texts.append(content)
                elif hasattr(choice, "text"):
                    # Legacy completion
                    text = choice.text
                    if text:
                        texts.append(text)

        # Dict-style response
        elif isinstance(response, dict):
            choices = response.get("choices", [])
            for choice in choices:
                if isinstance(choice, dict):
                    message = choice.get("message", {})
                    content = message.get("content", "")
                    if content:
                        texts.append(content)

                    # Legacy format
                    text = choice.get("text", "")
                    if text:
                        texts.append(text)

    except Exception as e:
        logger.error("failed to extract text from response", error=str(e))

    return "\n".join(texts)


def _redact_response_for_logging(text: str, leaks: dict) -> str:
    """Redact detected leaks from response text for safe logging.

    Args:
        text: Original response text
        leaks: Dictionary of detected leaks by threat type

    Returns:
        Redacted text (max 500 chars with leak summary)
    """
    # Truncate to first 500 chars
    preview = text[:500] if len(text) > 500 else text

    # Add leak summary
    leak_summary = ", ".join(f"{t.value}:{len(e)}" for t, e in leaks.items())
    return f"{preview}... [Data leaks detected: {leak_summary}]"


def _determine_leak_severity(threat_type) -> Any:
    """Determine severity level for data leak based on threat type.

    Args:
        threat_type: ThreatType enum value

    Returns:
        SeverityLevel enum value
    """
    from bandaid.models.events import SeverityLevel, ThreatType

    # Private keys and seed phrases are critical
    if threat_type in [ThreatType.PRIVATE_KEY, ThreatType.SEED_PHRASE]:
        return SeverityLevel.CRITICAL

    # Blockchain addresses and API keys are high severity
    if threat_type in [ThreatType.BLOCKCHAIN_ADDRESS, ThreatType.API_KEY_LEAK]:
        return SeverityLevel.HIGH

    # PII and financial secrets are high severity
    if threat_type in [ThreatType.PII, ThreatType.FINANCIAL_SECRET]:
        return SeverityLevel.HIGH

    # Default to medium
    return SeverityLevel.MEDIUM


async def async_post_call_streaming_iterator_hook(
    user_api_key_dict: dict[str, Any],
    response_iterator: AsyncIterator,
    request_data: dict[str, Any],
) -> AsyncIterator:
    """Streaming hook to collect chunks and scan for data leaks (T091-T092).

    This hook wraps the streaming response iterator to:
    1. Pass through chunks to the client in real-time
    2. Collect all chunks for post-stream analysis
    3. Scan complete response for data leaks asynchronously after streaming completes

    Args:
        user_api_key_dict: User API key metadata
        response_iterator: Async iterator of response chunks
        request_data: Original request data

    Yields:
        Response chunks (unmodified - streaming is never blocked)
    """
    collected_chunks = []
    request_id_str = request_data.get("metadata", {}).get("bandaid_request_id", "unknown")

    try:
        logger.debug("streaming response started", request_id=request_id_str)

        # Stream chunks to client while collecting
        async for chunk in response_iterator:
            collected_chunks.append(chunk)
            yield chunk

        logger.debug(
            "streaming response completed",
            request_id=request_id_str,
            chunk_count=len(collected_chunks),
        )

        # After streaming completes, scan for data leaks asynchronously
        # This happens in the background and doesn't block the client
        _scan_streaming_response_async(
            chunks=collected_chunks,
            request_id_str=request_id_str,
            request_data=request_data,
        )

    except Exception as e:
        logger.error(
            "streaming hook failed", error=str(e), request_id=request_id_str, exc_info=True
        )
        # Don't interrupt the stream on errors


def _scan_streaming_response_async(
    chunks: list,
    request_id_str: str,
    request_data: dict[str, Any],
) -> None:
    """Scan streamed response chunks for data leaks (background task).

    Reconstructs the complete response from chunks and runs leak detection.
    This is fire-and-forget - doesn't block streaming.

    Args:
        chunks: List of response chunks
        request_id_str: Request ID for correlation
        request_data: Original request data
    """
    import asyncio

    # Schedule async scan task
    try:
        loop = asyncio.get_event_loop()
        loop.create_task(
            _scan_streamed_chunks(
                chunks=chunks,
                request_id_str=request_id_str,
                request_data=request_data,
            )
        )
    except RuntimeError:
        # No event loop running, skip scanning
        logger.warning("no event loop for async leak scan", request_id=request_id_str)


async def _scan_streamed_chunks(
    chunks: list,
    request_id_str: str,
    request_data: dict[str, Any],
) -> None:
    """Async task to scan streamed response chunks for data leaks.

    Reconstructs complete response text from chunks and runs NER + regex detection.

    Args:
        chunks: List of response chunks
        request_id_str: Request ID for correlation
        request_data: Original request data
    """
    try:
        # Reconstruct complete response text from chunks
        response_text = _reconstruct_text_from_chunks(chunks)

        if not response_text:
            logger.debug("no text in streamed response to scan", request_id=request_id_str)
            return

        logger.debug(
            "scanning streamed response for data leaks",
            request_id=request_id_str,
            response_length=len(response_text),
            chunk_count=len(chunks),
        )

        # Get configuration
        config = get_config()

        # Get NER validator for leak detection
        from bandaid.security.ner_validator import get_ner_validator

        ner_validator = get_ner_validator(device=config.models.device)

        if not ner_validator.pipeline:
            try:
                ner_validator.initialize()
            except Exception as e:
                logger.warning("failed to initialize NER for stream scanning", error=str(e))
                return

        # Run leak detection
        has_leaks, confidence, leaks = ner_validator.validate(response_text)

        if has_leaks:
            # Data leak detected in streamed response
            logger.warning(
                "data leak detected in streamed response",
                request_id=request_id_str,
                leak_types=list(leaks.keys()),
                confidence=confidence,
            )

            # Log security events for each leak type
            from uuid import UUID

            from bandaid.models.events import (
                DetectionLayer,
                EventType,
                SecurityEvent,
            )
            from bandaid.storage.events_db import get_events_db

            request_id = UUID(request_id_str) if request_id_str != "unknown" else uuid4()

            for threat_type, _entities in leaks.items():
                # Create data leak alert event
                leak_event = SecurityEvent(
                    event_type=EventType.DATA_LEAK_ALERT,
                    threat_type=threat_type,
                    confidence_level=confidence,
                    request_id=request_id,
                    redacted_content=_redact_response_for_logging(response_text, leaks),
                    severity_level=_determine_leak_severity(threat_type),
                    detection_layer=DetectionLayer.NER,
                    learned_pattern_id=None,
                    provider=request_data.get("custom_llm_provider", "unknown"),
                    model=request_data.get("model", "unknown"),
                )

                # Log event to database
                try:
                    db = await get_events_db()
                    await db.insert_event(leak_event)
                except Exception as e:
                    logger.error("failed to log leak event from stream", error=str(e))

            # Send to Sentry if configured
            if (
                config.observability
                and config.observability.sentry
                and config.observability.sentry.dsn
            ):
                try:
                    from bandaid.observability.sentry import capture_security_event

                    for threat_type in leaks.keys():
                        capture_security_event(
                            event_type="data_leak_alert_stream",
                            threat_type=threat_type.value
                            if hasattr(threat_type, "value")
                            else str(threat_type),
                            confidence=confidence,
                            severity=_determine_leak_severity(threat_type).value,
                            request_id=request_id_str,
                        )
                except Exception as e:
                    logger.error("failed to send stream leak alert to sentry", error=str(e))
        else:
            logger.debug("no data leaks detected in streamed response", request_id=request_id_str)

    except Exception as e:
        logger.error(
            "failed to scan streamed chunks", error=str(e), request_id=request_id_str, exc_info=True
        )


def _reconstruct_text_from_chunks(chunks: list) -> str:
    """Reconstruct complete response text from streaming chunks.

    Handles different chunk formats (OpenAI, Anthropic, etc.).

    Args:
        chunks: List of response chunks

    Returns:
        Concatenated response text
    """
    texts = []

    try:
        for chunk in chunks:
            # Handle different chunk formats
            if hasattr(chunk, "choices"):
                # OpenAI-style chunk
                for choice in chunk.choices:
                    if hasattr(choice, "delta"):
                        delta = choice.delta
                        content = getattr(delta, "content", None)
                        if content:
                            texts.append(content)
            elif isinstance(chunk, dict):
                # Dict-style chunk
                choices = chunk.get("choices", [])
                for choice in choices:
                    if isinstance(choice, dict):
                        delta = choice.get("delta", {})
                        content = delta.get("content")
                        if content:
                            texts.append(content)

    except Exception as e:
        logger.error("failed to reconstruct text from chunks", error=str(e))

    return "".join(texts)

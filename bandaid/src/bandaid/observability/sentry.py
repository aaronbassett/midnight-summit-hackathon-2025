"""Sentry integration for centralized error monitoring and alerting.

Integrates with Sentry SDK to send security events, errors, and performance traces.
Automatically redacts sensitive data before sending to Sentry.
"""

from typing import Any

try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration

    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False

from bandaid.observability.logger import get_logger

logger = get_logger(__name__)


class SentryManager:
    """Manager for Sentry integration."""

    def __init__(self):
        """Initialize Sentry manager."""
        self.initialized = False
        self.dsn: str | None = None

    def initialize(
        self,
        dsn: str,
        environment: str = "production",
        traces_sample_rate: float = 0.1,
        enable_logging: bool = True,
    ) -> None:
        """Initialize Sentry SDK.

        Args:
            dsn: Sentry DSN (empty string disables Sentry)
            environment: Sentry environment name
            traces_sample_rate: Sampling rate for performance traces (0.0-1.0)
            enable_logging: Enable automatic logging integration
        """
        if not SENTRY_AVAILABLE:
            logger.warning(
                "sentry_sdk not installed",
                message="Install with: pip install sentry-sdk[fastapi]",
            )
            return

        if not dsn:
            logger.info("sentry disabled", reason="No DSN provided")
            return

        integrations = [FastApiIntegration(transaction_style="url")]

        if enable_logging:
            integrations.append(
                LoggingIntegration(
                    level=None,  # Capture all log levels
                    event_level=None,  # Don't send logs as events by default
                )
            )

        try:
            sentry_sdk.init(
                dsn=dsn,
                environment=environment,
                traces_sample_rate=traces_sample_rate,
                integrations=integrations,
                before_send=self._before_send,
                before_send_transaction=self._before_send_transaction,
            )

            self.initialized = True
            self.dsn = dsn
            logger.info(
                "sentry initialized",
                environment=environment,
                traces_sample_rate=traces_sample_rate,
            )

        except Exception as e:
            logger.error("sentry initialization failed", error=str(e), exc_info=True)

    def _before_send(self, event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
        """Process event before sending to Sentry.

        Redacts sensitive data and adds context.

        Args:
            event: Sentry event dictionary
            hint: Event hint with additional context

        Returns:
            Modified event or None to drop event
        """
        # Redact sensitive data
        event = self._redact_sensitive_data(event)

        # Add app-specific tags
        event.setdefault("tags", {}).update(
            {
                "app": "bandaid",
                "component": "security_proxy",
            }
        )

        return event

    def _before_send_transaction(
        self, event: dict[str, Any], hint: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Process transaction before sending to Sentry.

        Args:
            event: Sentry transaction event
            hint: Event hint

        Returns:
            Modified event or None to drop transaction
        """
        # Add app-specific tags
        event.setdefault("tags", {}).update(
            {
                "app": "bandaid",
            }
        )

        return event

    def _redact_sensitive_data(self, event: dict[str, Any]) -> dict[str, Any]:
        """Redact sensitive data from Sentry event.

        Args:
            event: Sentry event dictionary

        Returns:
            Event with sensitive data redacted
        """
        # Redact from extra data
        if "extra" in event:
            event["extra"] = self._redact_dict(event["extra"])

        # Redact from request data
        if "request" in event:
            if "data" in event["request"]:
                event["request"]["data"] = self._redact_dict(event["request"]["data"])
            if "headers" in event["request"]:
                event["request"]["headers"] = self._redact_dict(event["request"]["headers"])

        # Redact from exception values
        if "exception" in event and "values" in event["exception"]:
            for exc in event["exception"]["values"]:
                if "value" in exc:
                    exc["value"] = self._redact_string(exc["value"])

        return event

    def _redact_dict(self, data: dict[str, Any]) -> dict[str, Any]:
        """Recursively redact sensitive data from dictionary.

        Args:
            data: Dictionary to redact

        Returns:
            Redacted dictionary
        """
        redacted: dict[str, Any] = {}
        sensitive_keys = {
            "api_key",
            "apikey",
            "token",
            "password",
            "secret",
            "authorization",
            "auth",
            "api-key",
            "prompt",
            "content",
            "message",
            "messages",
            "body",
        }

        for key, value in data.items():
            key_lower = key.lower()

            if any(sensitive in key_lower for sensitive in sensitive_keys):
                redacted[key] = "[REDACTED]"
            elif isinstance(value, dict):
                redacted[key] = self._redact_dict(value)
            elif isinstance(value, list):
                redacted[key] = [
                    self._redact_dict(item) if isinstance(item, dict) else "[REDACTED]"
                    for item in value
                ]
            elif isinstance(value, str):
                redacted[key] = self._redact_string(value)
            else:
                redacted[key] = value

        return redacted

    def _redact_string(self, text: str) -> str:
        """Redact sensitive patterns from string (T058).

        Args:
            text: String to redact

        Returns:
            Redacted string
        """
        from bandaid.security.redactor import redact_all

        # Apply comprehensive redaction
        redacted = redact_all(text)

        # Truncate long strings to prevent leaking full prompts
        if len(redacted) > 500:
            return redacted[:500] + "... [TRUNCATED]"

        return redacted

    def capture_security_event(
        self,
        event_type: str,
        threat_type: str | None,
        confidence: float,
        severity: str,
        request_id: str,
        **extra: Any,
    ) -> None:
        """Capture a security event in Sentry.

        Args:
            event_type: Type of event (blocked, allowed, data_leak_alert, etc.)
            threat_type: Type of threat detected (or None)
            confidence: Confidence score (0.0-1.0)
            severity: Severity level (critical, high, medium, low, info)
            request_id: Request identifier
            **extra: Additional context
        """
        if not self.initialized:
            return

        # Map severity to Sentry level
        sentry_level = {
            "critical": "error",
            "high": "warning",
            "medium": "info",
            "low": "info",
            "info": "info",
        }.get(severity, "info")

        # Only send high-severity events to Sentry to reduce noise
        if severity not in ["critical", "high"]:
            return

        try:
            with sentry_sdk.push_scope() as scope:
                scope.set_context(
                    "security_event",
                    {
                        "event_type": event_type,
                        "threat_type": threat_type,
                        "confidence": confidence,
                        "severity": severity,
                        "request_id": request_id,
                    },
                )

                scope.set_tag("event_type", event_type)
                scope.set_tag("threat_type", threat_type or "none")
                scope.set_tag("severity", severity)

                # Add extra context (will be redacted by before_send)
                for key, value in extra.items():
                    scope.set_extra(key, value)

                # Capture message with appropriate level
                sentry_sdk.capture_message(
                    f"Security event: {event_type} ({threat_type or 'allowed'})",
                    level=sentry_level,
                )

                logger.debug(
                    "security event sent to sentry",
                    event_type=event_type,
                    threat_type=threat_type,
                    request_id=request_id,
                )

        except Exception as e:
            logger.error("failed to send event to sentry", error=str(e), exc_info=True)

    def capture_exception(self, exc: Exception, **context: Any) -> None:
        """Capture an exception in Sentry.

        Args:
            exc: Exception to capture
            **context: Additional context
        """
        if not self.initialized:
            return

        try:
            with sentry_sdk.push_scope() as scope:
                for key, value in context.items():
                    scope.set_extra(key, value)

                sentry_sdk.capture_exception(exc)

                logger.debug("exception sent to sentry", exception=str(exc))

        except Exception as e:
            logger.error("failed to send exception to sentry", error=str(e), exc_info=True)

    def flush(self, timeout: float = 2.0) -> None:
        """Flush pending Sentry events.

        Args:
            timeout: Maximum time to wait for flush (seconds)
        """
        if not self.initialized:
            return

        try:
            sentry_sdk.flush(timeout=timeout)
            logger.debug("sentry events flushed", timeout=timeout)
        except Exception as e:
            logger.error("failed to flush sentry events", error=str(e), exc_info=True)


# Global Sentry manager instance
_sentry_manager: SentryManager | None = None


def get_sentry_manager() -> SentryManager:
    """Get global Sentry manager instance.

    Returns:
        Sentry manager instance
    """
    global _sentry_manager
    if _sentry_manager is None:
        _sentry_manager = SentryManager()
    return _sentry_manager


def initialize_sentry(
    dsn: str,
    environment: str = "production",
    traces_sample_rate: float = 0.1,
) -> None:
    """Initialize Sentry integration.

    Args:
        dsn: Sentry DSN
        environment: Environment name
        traces_sample_rate: Trace sampling rate
    """
    manager = get_sentry_manager()
    manager.initialize(dsn, environment, traces_sample_rate)


def capture_security_event(
    event_type: str,
    threat_type: str | None,
    confidence: float,
    severity: str,
    request_id: str,
    **extra: Any,
) -> None:
    """Capture a security event in Sentry.

    Args:
        event_type: Event type
        threat_type: Threat type
        confidence: Confidence score
        severity: Severity level
        request_id: Request ID
        **extra: Extra context
    """
    manager = get_sentry_manager()
    manager.capture_security_event(
        event_type, threat_type, confidence, severity, request_id, **extra
    )


def capture_exception(exc: Exception, **context: Any) -> None:
    """Capture an exception in Sentry.

    Args:
        exc: Exception to capture
        **context: Additional context
    """
    manager = get_sentry_manager()
    manager.capture_exception(exc, **context)

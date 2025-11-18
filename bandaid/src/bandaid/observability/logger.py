"""Structured logging configuration for Bandaid LLM Security Proxy.

Uses structlog for structured, JSON-formatted logging with context propagation.
"""

import logging
import sys
from typing import Any

import structlog
from structlog.types import EventDict, WrappedLogger


def add_app_context(logger: WrappedLogger, method_name: str, event_dict: EventDict) -> EventDict:
    """Add application context to log records.

    Args:
        logger: Wrapped logger instance
        method_name: Name of the log method called
        event_dict: Event dictionary

    Returns:
        Modified event dictionary with app context
    """
    event_dict["app"] = "bandaid"
    event_dict["version"] = "0.1.0"  # TODO: Get from package metadata
    return event_dict


def drop_color_message_key(
    logger: WrappedLogger, method_name: str, event_dict: EventDict
) -> EventDict:
    """Remove the 'color_message' key from event dict (used by dev console renderer).

    Args:
        logger: Wrapped logger instance
        method_name: Name of the log method called
        event_dict: Event dictionary

    Returns:
        Modified event dictionary
    """
    event_dict.pop("color_message", None)
    return event_dict


def configure_logging(
    log_level: str = "INFO", log_format: str = "json", enable_colors: bool = False
) -> None:
    """Configure structured logging for the application.

    Args:
        log_level: Log level (DEBUG, INFO, WARNING, ERROR)
        log_format: Log format ("json" or "text")
        enable_colors: Enable colored output for text format
    """
    # Convert string level to logging constant
    level = getattr(logging, log_level.upper(), logging.INFO)

    # Configure standard library logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )

    # Disable noisy third-party loggers
    logging.getLogger("chromadb").setLevel(logging.WARNING)
    logging.getLogger("transformers").setLevel(logging.WARNING)
    logging.getLogger("torch").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)

    # Choose processors based on format
    processors: list[Any] = [
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        add_app_context,
    ]

    if log_format == "json":
        # JSON output for production
        processors.extend(
            [
                structlog.processors.format_exc_info,
                structlog.processors.UnicodeDecoder(),
                drop_color_message_key,
                structlog.processors.JSONRenderer(),
            ]
        )
    else:
        # Human-readable text output for development
        processors.extend(
            [
                structlog.processors.format_exc_info,
                structlog.processors.UnicodeDecoder(),
                structlog.dev.ConsoleRenderer(colors=enable_colors),
            ]
        )

    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None, **initial_values: Any) -> structlog.stdlib.BoundLogger:
    """Get a structured logger instance.

    Args:
        name: Logger name (defaults to calling module)
        **initial_values: Initial context values to bind to logger

    Returns:
        Structured logger instance with bound context
    """
    logger: structlog.stdlib.BoundLogger = structlog.get_logger(name)

    # Bind initial context if provided
    if initial_values:
        logger = logger.bind(**initial_values)

    return logger


def bind_context(**context: Any) -> None:
    """Bind context to the current thread-local logger.

    Args:
        **context: Context key-value pairs to bind
    """
    structlog.contextvars.bind_contextvars(**context)


def unbind_context(*keys: str) -> None:
    """Unbind context from the current thread-local logger.

    Args:
        *keys: Context keys to unbind
    """
    structlog.contextvars.unbind_contextvars(*keys)


def clear_context() -> None:
    """Clear all bound context from the current thread-local logger."""
    structlog.contextvars.clear_contextvars()


class LoggerContext:
    """Context manager for temporary logger context binding.

    Example:
        with LoggerContext(request_id="abc123", user_id="user456"):
            logger.info("processing request")  # Includes request_id and user_id
        # request_id and user_id automatically removed after exiting context
    """

    def __init__(self, **context: Any):
        """Initialize logger context.

        Args:
            **context: Context key-value pairs to bind
        """
        self.context = context
        self.keys = list(context.keys())

    def __enter__(self) -> None:
        """Enter context and bind values."""
        bind_context(**self.context)

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Exit context and unbind values."""
        unbind_context(*self.keys)


def log_security_event(
    logger: structlog.stdlib.BoundLogger,
    event_type: str,
    threat_type: str | None,
    confidence: float,
    request_id: str,
    severity: str,
    **extra: Any,
) -> None:
    """Log a security event with structured fields.

    Args:
        logger: Structured logger instance
        event_type: Type of event (blocked, allowed, data_leak_alert, etc.)
        threat_type: Type of threat detected (or None if allowed)
        confidence: Confidence score (0.0-1.0)
        request_id: Request identifier
        severity: Severity level (critical, high, medium, low, info)
        **extra: Additional context fields
    """
    log_method = {
        "critical": logger.error,
        "high": logger.warning,
        "medium": logger.info,
        "low": logger.info,
        "info": logger.info,
    }.get(severity, logger.info)

    log_method(
        "security_event",
        event_type=event_type,
        threat_type=threat_type,
        confidence=confidence,
        request_id=request_id,
        severity=severity,
        **extra,
    )


# Example usage:
# from bandaid.observability.logger import get_logger, configure_logging
#
# configure_logging(log_level="INFO", log_format="json")
# logger = get_logger(__name__)
# logger.info("proxy started", port=8000, pid=os.getpid())

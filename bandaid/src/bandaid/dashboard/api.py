"""Dashboard API routes for Bandaid Security Proxy.

Provides REST API endpoints for the dashboard UI to fetch statistics,
events, and learned patterns.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from bandaid.config import get_config
from bandaid.observability.logger import get_logger
from bandaid.storage.events_db import get_events_db

logger = get_logger(__name__)

router = APIRouter(prefix="/api", tags=["dashboard"])


# Response Models
class StatsResponse(BaseModel):
    """Statistics response model."""

    total_requests: int
    blocked_count: int
    allowed_count: int
    threat_breakdown: dict[str, int]


class EventItem(BaseModel):
    """Event item model."""

    id: str
    timestamp: str
    event_type: str
    threat_type: str | None
    confidence_level: float | None
    request_id: str
    redacted_content: str
    severity_level: str
    detection_layer: str | None
    provider: str | None
    model: str | None


class EventsResponse(BaseModel):
    """Events response model."""

    events: list[EventItem]
    total: int
    page: int
    per_page: int
    total_pages: int


class PatternItem(BaseModel):
    """Pattern item model."""

    id: str
    threat_types: list[str]
    detection_count: int
    first_seen: str
    last_seen: str
    redacted_text: str


class PatternsResponse(BaseModel):
    """Patterns response model."""

    patterns: list[PatternItem]
    total: int


class ConfigResponse(BaseModel):
    """Configuration response model (T074)."""

    proxy_port: int
    dashboard_port: int
    log_retention_days: int
    model_device: str
    providers: list[dict]
    confidence_thresholds: dict
    disabled_checks: list[str]
    sentry_enabled: bool


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get aggregate statistics for dashboard.

    Returns:
        StatsResponse with total requests, blocked count, and threat breakdown
    """
    try:
        db = await get_events_db()
        stats = await db.get_stats()

        return StatsResponse(
            total_requests=stats["total_requests"],
            blocked_count=stats["blocked_count"],
            allowed_count=stats["allowed_count"],
            threat_breakdown=stats["threat_breakdown"],
        )
    except Exception as e:
        logger.error("failed to get stats", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch statistics: {e}") from e


@router.get("/events", response_model=EventsResponse)
async def get_events(
    event_type: str | None = Query(None, description="Filter by event type"),
    threat_type: str | None = Query(None, description="Filter by threat type"),
    severity: str | None = Query(None, description="Filter by severity level"),
    start_time: str | None = Query(None, description="Start time filter (ISO 8601)"),
    end_time: str | None = Query(None, description="End time filter (ISO 8601)"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(50, ge=1, le=100, description="Items per page"),
):
    """Get paginated security events with optional filters.

    Args:
        event_type: Filter by event type
        threat_type: Filter by threat type
        severity: Filter by severity level
        start_time: Start time filter (ISO 8601)
        end_time: End time filter (ISO 8601)
        page: Page number (starts at 1)
        per_page: Items per page (max 100)

    Returns:
        EventsResponse with paginated events
    """
    try:
        db = await get_events_db()

        # Parse timestamps
        start_dt = datetime.fromisoformat(start_time) if start_time else None
        end_dt = datetime.fromisoformat(end_time) if end_time else None

        # Calculate offset
        offset = (page - 1) * per_page

        # Fetch events
        events = await db.get_events(
            event_type=event_type,
            threat_type=threat_type,
            severity=severity,
            start_time=start_dt,
            end_time=end_dt,
            limit=per_page,
            offset=offset,
        )

        # Get total count (approximate - could be optimized with separate count query)
        # For now, if we get a full page, assume there might be more
        total = offset + len(events) + (per_page if len(events) == per_page else 0)
        total_pages = (total + per_page - 1) // per_page

        # Convert to response models
        event_items = [
            EventItem(
                id=e["id"],
                timestamp=e["timestamp"],
                event_type=e["event_type"],
                threat_type=e.get("threat_type"),
                confidence_level=e.get("confidence_level"),
                request_id=e["request_id"],
                redacted_content=e["redacted_content"],
                severity_level=e["severity_level"],
                detection_layer=e.get("detection_layer"),
                provider=e.get("provider"),
                model=e.get("model"),
            )
            for e in events
        ]

        return EventsResponse(
            events=event_items,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid timestamp format: {e}") from e
    except Exception as e:
        logger.error("failed to get events", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch events: {e}") from e


@router.get("/patterns", response_model=PatternsResponse)
async def get_patterns(
    limit: int = Query(10, ge=1, le=100, description="Maximum patterns to return"),
):
    """Get learned attack patterns sorted by detection count.

    Args:
        limit: Maximum number of patterns to return (max 100)

    Returns:
        PatternsResponse with top patterns
    """
    try:
        db = await get_events_db()
        patterns = await db.get_top_patterns(limit=limit)

        # Convert to response models
        pattern_items = [
            PatternItem(
                id=p["id"],
                threat_types=eval(p["threat_types"])
                if isinstance(p["threat_types"], str)
                else p["threat_types"],
                detection_count=p["detection_count"],
                first_seen=p["first_seen"],
                last_seen=p["last_seen"],
                redacted_text=p["redacted_text"],
            )
            for p in patterns
        ]

        return PatternsResponse(
            patterns=pattern_items,
            total=len(pattern_items),
        )
    except Exception as e:
        logger.error("failed to get patterns", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch patterns: {e}") from e


@router.get("/config", response_model=ConfigResponse)
async def get_config_status():
    """Get current configuration status (T074).

    Returns non-sensitive configuration information for dashboard display.

    Returns:
        ConfigResponse with current configuration
    """
    try:
        config = get_config()

        # Build providers list (sanitized - no API keys)
        providers_list = [
            {
                "provider": p.provider,
                "configured": bool(p.api_key),
                "default": p.default,
            }
            for p in config.providers
        ]

        # Build confidence thresholds
        thresholds = {
            "high": config.security.confidence.high,
            "medium_min": config.security.confidence.medium_min,
            "low": config.security.confidence.low,
        }

        # Get disabled checks
        disabled = config.disabled_checks if config.disabled_checks else []

        # Check Sentry status
        sentry_enabled = bool(
            config.observability and config.observability.sentry and config.observability.sentry.dsn
        )

        return ConfigResponse(
            proxy_port=config.proxy.port,
            dashboard_port=config.dashboard.port,
            log_retention_days=config.storage.sqlite.retention_days,
            model_device=config.models.device,
            providers=providers_list,
            confidence_thresholds=thresholds,
            disabled_checks=disabled,
            sentry_enabled=sentry_enabled,
        )

    except Exception as e:
        logger.error("failed to get config", error=str(e), exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch config: {e}") from e

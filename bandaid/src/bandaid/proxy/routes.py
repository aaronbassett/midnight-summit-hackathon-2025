"""Additional API routes for health checks and metrics.

Provides system health status, model availability, and Prometheus-style metrics.
"""

from fastapi import APIRouter

from bandaid.config import get_config
from bandaid.observability.logger import get_logger
from bandaid.security.guard_validator import get_guard_validator
from bandaid.security.ner_validator import get_ner_validator
from bandaid.storage.events_db import get_events_db

logger = get_logger(__name__)

router = APIRouter(tags=["system"])


@router.get("/health")
async def health_check() -> dict:
    """Health check endpoint.

    Returns system health status including model availability and provider connectivity.

    Returns:
        Health status dictionary
    """
    try:
        config = get_config()

        # Check model status
        ner_validator = get_ner_validator(device=config.models.device, lazy_load=True)
        guard_validator = get_guard_validator(device=config.models.device, lazy_load=True)

        models_status = {
            "ner_loaded": ner_validator.is_initialized() if config.models.ner.enabled else False,
            "ner_enabled": config.models.ner.enabled,
            "guard_loaded": guard_validator.is_initialized()
            if config.models.guard.enabled
            else False,
            "guard_enabled": config.models.guard.enabled,
            "embeddings_enabled": config.models.embeddings.enabled,
        }

        # Check database
        db_healthy = True
        try:
            await get_events_db(config.storage.sqlite.path)
            db_healthy = True
        except Exception as e:
            logger.error("database health check failed", error=str(e))
            db_healthy = False

        # Check providers
        providers_status = {}
        for provider_config in config.providers:
            providers_status[provider_config.provider] = {
                "configured": True,
                "default": provider_config.default,
            }

        # Overall health
        is_healthy = db_healthy and (
            (config.models.ner.enabled and models_status["ner_loaded"])
            or not config.models.ner.enabled
        )

        status = "healthy" if is_healthy else "degraded"

        return {
            "status": status,
            "version": "0.1.0",
            "models": models_status,
            "database": {"healthy": db_healthy},
            "providers": providers_status,
        }

    except Exception as e:
        logger.error("health check failed", error=str(e), exc_info=True)
        return {
            "status": "unhealthy",
            "error": str(e),
        }


@router.get("/metrics")
async def metrics() -> dict:
    """Prometheus-style metrics endpoint.

    Returns request statistics and system metrics.

    Returns:
        Metrics dictionary
    """
    try:
        config = get_config()

        # Get statistics from database
        db = await get_events_db(config.storage.sqlite.path)
        stats = await db.get_stats()

        # Format as Prometheus-style metrics
        metrics_text = f"""# HELP bandaid_requests_total Total number of requests
# TYPE bandaid_requests_total counter
bandaid_requests_total{{status="blocked"}} {stats.get("blocked_count", 0)}
bandaid_requests_total{{status="allowed"}} {stats.get("allowed_count", 0)}

# HELP bandaid_requests_by_threat Requests by threat type
# TYPE bandaid_requests_by_threat counter
"""

        for threat_type, count in stats.get("threat_breakdown", {}).items():
            metrics_text += f'bandaid_requests_by_threat{{threat_type="{threat_type}"}} {count}\n'

        metrics_text += f"""
# HELP bandaid_total_requests Total requests processed
# TYPE bandaid_total_requests counter
bandaid_total_requests {stats.get("total_requests", 0)}
"""

        # Also return as JSON for easier consumption
        return {
            "metrics_text": metrics_text,
            "stats": stats,
        }

    except Exception as e:
        logger.error("metrics collection failed", error=str(e), exc_info=True)
        return {
            "error": str(e),
        }


@router.get("/stats")
async def statistics() -> dict:
    """Statistics endpoint (JSON format).

    Returns detailed statistics about security events.

    Returns:
        Statistics dictionary
    """
    try:
        config = get_config()

        db = await get_events_db(config.storage.sqlite.path)
        stats = await db.get_stats()

        return {
            "total_requests": stats.get("total_requests", 0),
            "blocked_count": stats.get("blocked_count", 0),
            "allowed_count": stats.get("allowed_count", 0),
            "threat_breakdown": stats.get("threat_breakdown", {}),
            "block_rate": (
                stats.get("blocked_count", 0) / stats.get("total_requests", 1)
                if stats.get("total_requests", 0) > 0
                else 0.0
            ),
        }

    except Exception as e:
        logger.error("statistics collection failed", error=str(e), exc_info=True)
        return {
            "error": str(e),
        }

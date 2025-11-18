"""Scheduled maintenance tasks for database cleanup.

Uses APScheduler to run periodic cleanup jobs for log retention.
"""

from datetime import datetime, timedelta

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from bandaid.config import get_config
from bandaid.observability.logger import get_logger
from bandaid.storage.events_db import get_events_db

logger = get_logger(__name__)

# Global scheduler instance
_scheduler: AsyncIOScheduler | None = None


async def cleanup_old_events_job():
    """Scheduled job to clean up old events based on retention policy."""
    try:
        config = get_config()
        retention_days = config.storage.sqlite.retention_days

        logger.info("running scheduled event cleanup", retention_days=retention_days)

        db = await get_events_db()
        deleted_count = await db.cleanup_old_events(retention_days)

        logger.info("scheduled event cleanup complete", deleted_count=deleted_count)

    except Exception as e:
        logger.error("event cleanup job failed", error=str(e), exc_info=True)


async def cleanup_old_patterns_job():
    """Scheduled job to clean up old patterns from ChromaDB.

    Syncs with SQLite retention policy to maintain consistency.
    """
    try:
        config = get_config()
        retention_days = config.storage.sqlite.retention_days

        logger.info("running scheduled pattern cleanup", retention_days=retention_days)

        # Calculate cutoff date matching SQLite retention
        cutoff_date = (datetime.utcnow() - timedelta(days=retention_days)).isoformat()

        # Clean up ChromaDB patterns
        from bandaid.learning.pattern_store import get_pattern_store

        pattern_store = get_pattern_store()
        deleted_count = pattern_store.delete_old_patterns(cutoff_date)

        logger.info("scheduled pattern cleanup complete", deleted_count=deleted_count)

    except Exception as e:
        logger.error("pattern cleanup job failed", error=str(e), exc_info=True)


def get_scheduler() -> AsyncIOScheduler:
    """Get or create global scheduler instance.

    Returns:
        AsyncIOScheduler instance
    """
    global _scheduler

    if _scheduler is None:
        _scheduler = AsyncIOScheduler()

        # Schedule event cleanup job to run daily at 2 AM
        _scheduler.add_job(
            cleanup_old_events_job,
            trigger=CronTrigger(hour=2, minute=0),
            id="cleanup_old_events",
            name="Clean up old security events",
            replace_existing=True,
        )

        # Schedule pattern cleanup job to run daily at 2:15 AM (after events)
        _scheduler.add_job(
            cleanup_old_patterns_job,
            trigger=CronTrigger(hour=2, minute=15),
            id="cleanup_old_patterns",
            name="Clean up old attack patterns",
            replace_existing=True,
        )

        logger.info("scheduler initialized with cleanup jobs (daily at 2 AM)")

    return _scheduler


def start_scheduler():
    """Start the scheduler.

    Should be called during application startup.
    """
    scheduler = get_scheduler()

    if not scheduler.running:
        scheduler.start()
        logger.info("scheduler started")
    else:
        logger.debug("scheduler already running")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully.

    Should be called during application shutdown.
    """
    global _scheduler

    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=True)
        logger.info("scheduler shut down")
        _scheduler = None
    else:
        logger.debug("scheduler not running")

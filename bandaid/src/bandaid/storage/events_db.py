"""SQLite database management for security events.

Handles creation, schema management, and CRUD operations for security events and
attack pattern metadata.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from uuid import UUID

import aiosqlite

from bandaid.models.events import SecurityEvent
from bandaid.models.patterns import AttackPattern
from bandaid.observability.logger import get_logger

logger = get_logger(__name__)

# SQL schema for security events and attack patterns
SCHEMA_SQL = """
-- Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('blocked', 'allowed', 'data_leak_alert', 'medium_confidence_warning')),
    threat_type TEXT CHECK(threat_type IN ('prompt_injection', 'jailbreak', 'pii', 'financial_secret', 'toxic_content', 'blockchain_address', 'private_key', 'seed_phrase', 'api_key_leak') OR threat_type IS NULL),
    confidence_level REAL CHECK(confidence_level BETWEEN 0.0 AND 1.0 OR confidence_level IS NULL),
    request_id TEXT NOT NULL,
    redacted_content TEXT NOT NULL,
    severity_level TEXT NOT NULL CHECK(severity_level IN ('critical', 'high', 'medium', 'low', 'info')),
    detection_layer TEXT CHECK(detection_layer IN ('ner', 'guard', 'embedding_match', 'regex', 'seed_phrase') OR detection_layer IS NULL),
    learned_pattern_id TEXT,
    provider TEXT,
    model TEXT,
    FOREIGN KEY (learned_pattern_id) REFERENCES attack_pattern_metadata(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_threat ON security_events(threat_type);
CREATE INDEX IF NOT EXISTS idx_events_time_type ON security_events(timestamp, event_type);

-- Attack Pattern Metadata Table (synced with ChromaDB)
CREATE TABLE IF NOT EXISTS attack_pattern_metadata (
    id TEXT PRIMARY KEY,
    threat_types TEXT NOT NULL,  -- JSON array
    detection_count INTEGER NOT NULL DEFAULT 1 CHECK(detection_count >= 0),
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    source_event_id TEXT NOT NULL,
    redacted_text TEXT NOT NULL,
    FOREIGN KEY (source_event_id) REFERENCES security_events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_patterns_last_seen ON attack_pattern_metadata(last_seen);
CREATE INDEX IF NOT EXISTS idx_patterns_count ON attack_pattern_metadata(detection_count);

-- Schema Version Table
CREATE TABLE IF NOT EXISTS schema_version (
    version TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
);
"""


class EventsDatabase:
    """Database manager for security events and attack patterns."""

    def __init__(self, db_path: str = "./data/events.db"):
        """Initialize database manager.

        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._connection: aiosqlite.Connection | None = None

    async def initialize(self) -> None:
        """Initialize database schema if not exists."""
        # Use get_connection() to ensure we initialize on the persistent connection
        # This is critical for :memory: databases in tests
        conn = await self.get_connection()
        await conn.executescript(SCHEMA_SQL)
        await conn.commit()

        # Set initial schema version
        await conn.execute(
            "INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (?, ?)",
            ("1.0.0", datetime.utcnow().isoformat()),
        )
        await conn.commit()

        logger.info("database initialized", db_path=str(self.db_path))

    async def get_connection(self) -> aiosqlite.Connection:
        """Get database connection.

        Returns:
            Async database connection
        """
        if self._connection is None:
            self._connection = await aiosqlite.connect(self.db_path)
            self._connection.row_factory = aiosqlite.Row
        return self._connection

    async def flush_pending(self) -> None:
        """Flush any pending database writes.

        Ensures all transactions are committed before shutdown.
        """
        if self._connection:
            try:
                await self._connection.commit()
                logger.debug("pending database writes flushed")
            except Exception as e:
                logger.error("error flushing database", error=str(e))

    async def close(self) -> None:
        """Close database connection."""
        if self._connection:
            # Ensure pending writes are committed
            await self.flush_pending()
            await self._connection.close()
            self._connection = None
            logger.debug("database connection closed")

    async def insert_event(self, event: SecurityEvent) -> None:
        """Insert a security event.

        Args:
            event: SecurityEvent to insert
        """
        conn = await self.get_connection()

        await conn.execute(
            """
            INSERT INTO security_events (
                id, timestamp, event_type, threat_type, confidence_level,
                request_id, redacted_content, severity_level, detection_layer,
                learned_pattern_id, provider, model
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(event.id),
                event.timestamp.isoformat(),
                event.event_type.value,
                event.threat_type.value if event.threat_type else None,
                event.confidence_level,
                str(event.request_id),
                event.redacted_content,
                event.severity_level.value,
                event.detection_layer.value if event.detection_layer else None,
                str(event.learned_pattern_id) if event.learned_pattern_id else None,
                event.provider,
                event.model,
            ),
        )

        await conn.commit()
        logger.debug("security event inserted", event_id=str(event.id), event_type=event.event_type)

    async def insert_events_batch(self, events: list[SecurityEvent]) -> None:
        """Insert multiple security events in a batch.

        Args:
            events: List of SecurityEvents to insert
        """
        if not events:
            return

        conn = await self.get_connection()

        data = [
            (
                str(e.id),
                e.timestamp.isoformat(),
                e.event_type.value,
                e.threat_type.value if e.threat_type else None,
                e.confidence_level,
                str(e.request_id),
                e.redacted_content,
                e.severity_level.value,
                e.detection_layer.value if e.detection_layer else None,
                str(e.learned_pattern_id) if e.learned_pattern_id else None,
                e.provider,
                e.model,
            )
            for e in events
        ]

        await conn.executemany(
            """
            INSERT INTO security_events (
                id, timestamp, event_type, threat_type, confidence_level,
                request_id, redacted_content, severity_level, detection_layer,
                learned_pattern_id, provider, model
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            data,
        )

        await conn.commit()
        logger.debug("security events batch inserted", count=len(events))

    async def get_events(
        self,
        event_type: str | None = None,
        threat_type: str | None = None,
        severity: str | None = None,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict]:
        """Query security events with filters.

        Args:
            event_type: Filter by event type
            threat_type: Filter by threat type
            severity: Filter by severity level
            start_time: Filter by start time (inclusive)
            end_time: Filter by end time (inclusive)
            limit: Maximum number of events to return
            offset: Number of events to skip

        Returns:
            List of event dictionaries
        """
        conn = await self.get_connection()

        query = "SELECT * FROM security_events WHERE 1=1"
        params: list[str | int] = []

        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)

        if threat_type:
            query += " AND threat_type = ?"
            params.append(threat_type)

        if severity:
            query += " AND severity_level = ?"
            params.append(severity)

        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time.isoformat())

        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time.isoformat())

        query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        async with conn.execute(query, params) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def get_stats(self) -> dict[str, Any]:
        """Get aggregate statistics for dashboard.

        Returns:
            Dictionary with statistics
        """
        conn = await self.get_connection()

        # Total events
        async with conn.execute("SELECT COUNT(*) FROM security_events") as cursor:
            row = await cursor.fetchone()
            total_events = row[0] if row else 0

        # Blocked count
        async with conn.execute(
            "SELECT COUNT(*) FROM security_events WHERE event_type = 'blocked'"
        ) as cursor:
            row = await cursor.fetchone()
            total_blocked = row[0] if row else 0

        # Allowed count
        async with conn.execute(
            "SELECT COUNT(*) FROM security_events WHERE event_type = 'allowed'"
        ) as cursor:
            row = await cursor.fetchone()
            total_allowed = row[0] if row else 0

        # Threat breakdown
        async with conn.execute(
            "SELECT threat_type, COUNT(*) as count FROM security_events WHERE threat_type IS NOT NULL GROUP BY threat_type"
        ) as cursor:
            rows = await cursor.fetchall()
            threat_breakdown = {row[0]: row[1] for row in rows}

        return {
            "total_requests": total_events,
            "blocked_count": total_blocked,
            "allowed_count": total_allowed,
            "threat_breakdown": threat_breakdown,
        }

    async def cleanup_old_events(self, retention_days: int) -> int:
        """Delete events older than retention period.

        Args:
            retention_days: Number of days to retain events

        Returns:
            Number of events deleted
        """
        conn = await self.get_connection()
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

        async with conn.execute(
            "DELETE FROM security_events WHERE timestamp < ?", (cutoff_date.isoformat(),)
        ) as cursor:
            deleted_count = cursor.rowcount

        await conn.commit()

        logger.info(
            "old events cleaned up",
            deleted_count=deleted_count,
            retention_days=retention_days,
            cutoff_date=cutoff_date.isoformat(),
        )

        return deleted_count

    async def insert_pattern_metadata(self, pattern: AttackPattern) -> None:
        """Insert attack pattern metadata.

        Args:
            pattern: AttackPattern to insert
        """
        conn = await self.get_connection()

        await conn.execute(
            """
            INSERT INTO attack_pattern_metadata (
                id, threat_types, detection_count, first_seen, last_seen,
                source_event_id, redacted_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(pattern.id),
                json.dumps([t.value for t in pattern.threat_types]),
                pattern.detection_count,
                pattern.first_seen.isoformat(),
                pattern.last_seen.isoformat(),
                str(pattern.source_event_id),
                pattern.redacted_text,
            ),
        )

        await conn.commit()
        logger.debug("pattern metadata inserted", pattern_id=str(pattern.id))

    async def update_pattern_metadata(
        self, pattern_id: UUID, detection_count: int, last_seen: datetime
    ) -> None:
        """Update attack pattern metadata.

        Args:
            pattern_id: Pattern UUID
            detection_count: Updated detection count
            last_seen: Updated last seen timestamp
        """
        conn = await self.get_connection()

        await conn.execute(
            """
            UPDATE attack_pattern_metadata
            SET detection_count = ?, last_seen = ?
            WHERE id = ?
            """,
            (detection_count, last_seen.isoformat(), str(pattern_id)),
        )

        await conn.commit()
        logger.debug(
            "pattern metadata updated",
            pattern_id=str(pattern_id),
            detection_count=detection_count,
        )

    async def get_pattern_metadata(self, pattern_id: UUID) -> dict | None:
        """Get attack pattern metadata by ID.

        Args:
            pattern_id: Pattern UUID

        Returns:
            Pattern metadata dictionary or None if not found
        """
        conn = await self.get_connection()

        async with conn.execute(
            "SELECT * FROM attack_pattern_metadata WHERE id = ?", (str(pattern_id),)
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def get_top_patterns(self, limit: int = 10) -> list[dict]:
        """Get top attack patterns by detection count.

        Args:
            limit: Maximum number of patterns to return

        Returns:
            List of pattern metadata dictionaries
        """
        conn = await self.get_connection()

        async with conn.execute(
            "SELECT * FROM attack_pattern_metadata ORDER BY detection_count DESC LIMIT ?",
            (limit,),
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


# Global database instance
_events_db: EventsDatabase | None = None


async def get_events_db(db_path: str | None = None) -> EventsDatabase:
    """Get global events database instance.

    Args:
        db_path: Optional database path (uses default if None)

    Returns:
        EventsDatabase instance
    """
    global _events_db
    if _events_db is None:
        _events_db = EventsDatabase(db_path or "./data/events.db")
        await _events_db.initialize()
    return _events_db

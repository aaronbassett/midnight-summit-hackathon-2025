"""Tests for EventsDatabase - SQLite security event storage.

These tests use REAL in-memory SQLite database - no mocks.
Tests real SQL queries, transactions, and data integrity.
"""

import uuid
from datetime import datetime, timedelta

import pytest

from bandaid.models.events import (
    DetectionLayer,
    EventType,
    SecurityEvent,
    SeverityLevel,
    ThreatType,
)
from bandaid.models.patterns import AttackPattern
from bandaid.storage.events_db import EventsDatabase


@pytest.mark.asyncio
class TestDatabaseInitialization:
    """Test database schema creation and initialization."""

    async def test_initialize_creates_schema(self):
        """Test that initialize() creates all required tables."""
        db = EventsDatabase(db_path=":memory:")
        await db.initialize()

        conn = await db.get_connection()

        # Check that tables exist
        cursor = await conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        tables = [row[0] for row in await cursor.fetchall()]

        assert "security_events" in tables
        assert "attack_pattern_metadata" in tables
        assert "schema_version" in tables

        await db.close()

    async def test_initialize_creates_indexes(self):
        """Test that indexes are created."""
        db = EventsDatabase(db_path=":memory:")
        await db.initialize()

        conn = await db.get_connection()

        cursor = await conn.execute("SELECT name FROM sqlite_master WHERE type='index'")
        indexes = [row[0] for row in await cursor.fetchall()]

        assert "idx_events_timestamp" in indexes
        assert "idx_events_type" in indexes
        assert "idx_events_threat" in indexes

        await db.close()

    async def test_schema_version_recorded(self):
        """Test that schema version is recorded."""
        db = EventsDatabase(db_path=":memory:")
        await db.initialize()

        conn = await db.get_connection()

        cursor = await conn.execute("SELECT version FROM schema_version")
        version = await cursor.fetchone()

        assert version is not None
        assert version[0] == "1.0.0"

        await db.close()


@pytest.mark.asyncio
class TestEventInsertion:
    """Test security event insertion."""

    async def test_insert_single_event(self, events_db):
        """Test inserting a single security event."""
        event = SecurityEvent(
            event_type=EventType.BLOCKED,
            threat_type=ThreatType.PROMPT_INJECTION,
            confidence_level=0.95,
            request_id=uuid.uuid4(),
            redacted_content="[REDACTED]",
            severity_level=SeverityLevel.CRITICAL,
            detection_layer=DetectionLayer.REGEX,
        )

        await events_db.insert_event(event)

        # Verify it was inserted
        conn = await events_db.get_connection()
        cursor = await conn.execute(
            "SELECT id, event_type, threat_type FROM security_events WHERE id = ?",
            (str(event.id),),
        )
        row = await cursor.fetchone()

        assert row is not None
        assert row[0] == str(event.id)
        assert row[1] == "blocked"
        assert row[2] == "prompt_injection"

    async def test_insert_event_with_all_fields(self, events_db):
        """Test inserting event with all optional fields populated."""
        event = SecurityEvent(
            event_type=EventType.BLOCKED,
            threat_type=ThreatType.API_KEY_LEAK,
            confidence_level=0.92,
            request_id=uuid.uuid4(),
            redacted_content="API key: ***REDACTED***",
            severity_level=SeverityLevel.HIGH,
            detection_layer=DetectionLayer.REGEX,
            provider="openai",
            model="gpt-4",
        )

        await events_db.insert_event(event)

        conn = await events_db.get_connection()
        cursor = await conn.execute(
            "SELECT provider, model, confidence_level FROM security_events WHERE id = ?",
            (str(event.id),),
        )
        row = await cursor.fetchone()

        assert row[0] == "openai"
        assert row[1] == "gpt-4"
        assert row[2] == 0.92

    async def test_insert_allowed_event(self, events_db):
        """Test inserting an allowed event with no threats."""
        event = SecurityEvent(
            event_type=EventType.ALLOWED,
            threat_type=None,
            confidence_level=None,
            request_id=uuid.uuid4(),
            redacted_content="Clean request",
            severity_level=SeverityLevel.INFO,
            detection_layer=None,
        )

        await events_db.insert_event(event)

        conn = await events_db.get_connection()
        cursor = await conn.execute(
            "SELECT threat_type, confidence_level FROM security_events WHERE id = ?",
            (str(event.id),),
        )
        row = await cursor.fetchone()

        # NULL values should be stored correctly
        assert row[0] is None
        assert row[1] is None


@pytest.mark.asyncio
class TestBatchInsertion:
    """Test batch event insertion."""

    async def test_insert_multiple_events(self, events_db):
        """Test batch insertion of multiple events."""
        events = [
            SecurityEvent(
                event_type=EventType.BLOCKED,
                threat_type=ThreatType.PROMPT_INJECTION,
                confidence_level=0.95,
                request_id=uuid.uuid4(),
                redacted_content=f"Event {i}",
                severity_level=SeverityLevel.CRITICAL,
            )
            for i in range(10)
        ]

        await events_db.insert_events_batch(events)

        # Verify all were inserted
        conn = await events_db.get_connection()
        cursor = await conn.execute("SELECT COUNT(*) FROM security_events")
        count = await cursor.fetchone()

        assert count[0] == 10

    async def test_empty_batch(self, events_db):
        """Test that empty batch doesn't error."""
        await events_db.insert_events_batch([])

        conn = await events_db.get_connection()
        cursor = await conn.execute("SELECT COUNT(*) FROM security_events")
        count = await cursor.fetchone()

        assert count[0] == 0


@pytest.mark.asyncio
class TestEventQuerying:
    """Test querying and filtering events."""

    async def test_get_events_all(self, events_db):
        """Test retrieving all events."""
        # Insert test events
        for i in range(5):
            event = SecurityEvent(
                event_type=EventType.BLOCKED,
                threat_type=ThreatType.PROMPT_INJECTION,
                confidence_level=0.9,
                request_id=uuid.uuid4(),
                redacted_content=f"Event {i}",
                severity_level=SeverityLevel.HIGH,
            )
            await events_db.insert_event(event)

        events = await events_db.get_events()

        assert len(events) == 5

    async def test_filter_by_event_type(self, events_db):
        """Test filtering events by event type."""
        # Insert mixed events
        await events_db.insert_event(
            SecurityEvent(
                event_type=EventType.BLOCKED,
                threat_type=ThreatType.PROMPT_INJECTION,
                confidence_level=0.9,
                request_id=uuid.uuid4(),
                redacted_content="Blocked",
                severity_level=SeverityLevel.HIGH,
            )
        )
        await events_db.insert_event(
            SecurityEvent(
                event_type=EventType.ALLOWED,
                request_id=uuid.uuid4(),
                redacted_content="Allowed",
                severity_level=SeverityLevel.INFO,
            )
        )

        blocked = await events_db.get_events(event_type=EventType.BLOCKED)
        allowed = await events_db.get_events(event_type=EventType.ALLOWED)

        assert len(blocked) == 1
        assert len(allowed) == 1
        assert blocked[0]["event_type"] == "blocked"

    async def test_filter_by_threat_type(self, events_db):
        """Test filtering by threat type."""
        await events_db.insert_event(
            SecurityEvent(
                event_type=EventType.BLOCKED,
                threat_type=ThreatType.PROMPT_INJECTION,
                confidence_level=0.9,
                request_id=uuid.uuid4(),
                redacted_content="Injection",
                severity_level=SeverityLevel.HIGH,
            )
        )
        await events_db.insert_event(
            SecurityEvent(
                event_type=EventType.BLOCKED,
                threat_type=ThreatType.PII,
                confidence_level=0.85,
                request_id=uuid.uuid4(),
                redacted_content="PII",
                severity_level=SeverityLevel.MEDIUM,
            )
        )

        injection_events = await events_db.get_events(threat_type=ThreatType.PROMPT_INJECTION)
        pii_events = await events_db.get_events(threat_type=ThreatType.PII)

        assert len(injection_events) == 1
        assert len(pii_events) == 1
        assert injection_events[0]["threat_type"] == "prompt_injection"

    async def test_filter_by_severity(self, events_db):
        """Test filtering by severity level."""
        await events_db.insert_event(
            SecurityEvent(
                event_type=EventType.BLOCKED,
                threat_type=ThreatType.PROMPT_INJECTION,
                confidence_level=0.95,
                request_id=uuid.uuid4(),
                redacted_content="Critical",
                severity_level=SeverityLevel.CRITICAL,
            )
        )
        await events_db.insert_event(
            SecurityEvent(
                event_type=EventType.ALLOWED,
                request_id=uuid.uuid4(),
                redacted_content="Info",
                severity_level=SeverityLevel.INFO,
            )
        )

        critical = await events_db.get_events(severity=SeverityLevel.CRITICAL)

        assert len(critical) == 1
        assert critical[0]["severity_level"] == "critical"

    async def test_pagination(self, events_db):
        """Test pagination with limit and offset."""
        # Insert 20 events
        for i in range(20):
            await events_db.insert_event(
                SecurityEvent(
                    event_type=EventType.BLOCKED,
                    threat_type=ThreatType.PROMPT_INJECTION,
                    confidence_level=0.9,
                    request_id=uuid.uuid4(),
                    redacted_content=f"Event {i}",
                    severity_level=SeverityLevel.HIGH,
                )
            )

        # Get first page
        page1 = await events_db.get_events(limit=10, offset=0)
        # Get second page
        page2 = await events_db.get_events(limit=10, offset=10)

        assert len(page1) == 10
        assert len(page2) == 10
        # Pages should be different
        assert page1[0]["id"] != page2[0]["id"]

    async def test_time_range_filter(self, events_db):
        """Test filtering by time range."""
        now = datetime.utcnow()
        yesterday = now - timedelta(days=1)
        tomorrow = now + timedelta(days=1)

        # Insert event with specific timestamp
        event = SecurityEvent(
            event_type=EventType.BLOCKED,
            threat_type=ThreatType.PROMPT_INJECTION,
            confidence_level=0.9,
            request_id=uuid.uuid4(),
            redacted_content="Event",
            severity_level=SeverityLevel.HIGH,
        )
        event.timestamp = now  # Set specific timestamp
        await events_db.insert_event(event)

        # Query with time range
        events = await events_db.get_events(
            start_time=yesterday,
            end_time=tomorrow,
        )

        assert len(events) >= 1

        # Query outside time range
        events_future = await events_db.get_events(
            start_time=tomorrow,
            end_time=tomorrow + timedelta(days=1),
        )

        assert len(events_future) == 0


@pytest.mark.asyncio
class TestStatistics:
    """Test statistics aggregation."""

    async def test_get_stats_empty_db(self, events_db):
        """Test stats on empty database."""
        stats = await events_db.get_stats()

        assert stats["total_requests"] == 0
        assert stats["blocked_count"] == 0
        assert stats["allowed_count"] == 0

    async def test_get_stats_with_events(self, events_db):
        """Test stats calculation with events."""
        # Insert 3 blocked, 2 allowed
        for _ in range(3):
            await events_db.insert_event(
                SecurityEvent(
                    event_type=EventType.BLOCKED,
                    threat_type=ThreatType.PROMPT_INJECTION,
                    confidence_level=0.9,
                    request_id=uuid.uuid4(),
                    redacted_content="Blocked",
                    severity_level=SeverityLevel.HIGH,
                )
            )
        for _ in range(2):
            await events_db.insert_event(
                SecurityEvent(
                    event_type=EventType.ALLOWED,
                    request_id=uuid.uuid4(),
                    redacted_content="Allowed",
                    severity_level=SeverityLevel.INFO,
                )
            )

        stats = await events_db.get_stats()

        assert stats["total_requests"] == 5
        assert stats["blocked_count"] == 3
        assert stats["allowed_count"] == 2

    async def test_stats_by_threat_type(self, events_db):
        """Test threat type breakdown in stats."""
        await events_db.insert_event(
            SecurityEvent(
                event_type=EventType.BLOCKED,
                threat_type=ThreatType.PROMPT_INJECTION,
                confidence_level=0.9,
                request_id=uuid.uuid4(),
                redacted_content="Injection",
                severity_level=SeverityLevel.HIGH,
            )
        )
        await events_db.insert_event(
            SecurityEvent(
                event_type=EventType.BLOCKED,
                threat_type=ThreatType.PROMPT_INJECTION,
                confidence_level=0.85,
                request_id=uuid.uuid4(),
                redacted_content="Another injection",
                severity_level=SeverityLevel.HIGH,
            )
        )

        stats = await events_db.get_stats()

        # Should have breakdown by threat type
        assert "threat_breakdown" in stats
        threat_breakdown = stats["threat_breakdown"]
        assert "prompt_injection" in threat_breakdown
        assert threat_breakdown["prompt_injection"] == 2


@pytest.mark.asyncio
class TestRetentionCleanup:
    """Test old event cleanup."""

    async def test_cleanup_old_events(self, events_db):
        """Test deletion of old events."""
        old_time = datetime.utcnow() - timedelta(days=40)
        recent_time = datetime.utcnow() - timedelta(days=10)

        # Insert old event
        old_event = SecurityEvent(
            event_type=EventType.BLOCKED,
            threat_type=ThreatType.PROMPT_INJECTION,
            confidence_level=0.9,
            request_id=uuid.uuid4(),
            redacted_content="Old",
            severity_level=SeverityLevel.HIGH,
        )
        old_event.timestamp = old_time
        await events_db.insert_event(old_event)

        # Insert recent event
        recent_event = SecurityEvent(
            event_type=EventType.BLOCKED,
            threat_type=ThreatType.PROMPT_INJECTION,
            confidence_level=0.9,
            request_id=uuid.uuid4(),
            redacted_content="Recent",
            severity_level=SeverityLevel.HIGH,
        )
        recent_event.timestamp = recent_time
        await events_db.insert_event(recent_event)

        # Cleanup events older than 30 days
        deleted_count = await events_db.cleanup_old_events(retention_days=30)

        assert deleted_count == 1

        # Verify only recent event remains
        events = await events_db.get_events()
        assert len(events) == 1
        assert events[0]["redacted_content"] == "Recent"


@pytest.mark.asyncio
class TestPatternMetadata:
    """Test attack pattern metadata storage."""

    async def test_insert_pattern_metadata(self, events_db):
        """Test inserting pattern metadata."""
        # First insert a security event
        event = SecurityEvent(
            event_type=EventType.BLOCKED,
            threat_type=ThreatType.PROMPT_INJECTION,
            confidence_level=0.95,
            request_id=uuid.uuid4(),
            redacted_content="Attack pattern",
            severity_level=SeverityLevel.CRITICAL,
        )
        await events_db.insert_event(event)

        # Create attack pattern
        pattern = AttackPattern(
            id=uuid.uuid4(),
            threat_types=[ThreatType.PROMPT_INJECTION],
            detection_count=1,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow(),
            source_event_id=event.id,
            redacted_text="[REDACTED]",
        )

        await events_db.insert_pattern_metadata(pattern)

        # Verify it was inserted
        retrieved = await events_db.get_pattern_metadata(pattern.id)
        assert retrieved is not None
        assert retrieved["id"] == str(pattern.id)
        assert retrieved["detection_count"] == 1

    async def test_update_pattern_metadata(self, events_db):
        """Test updating pattern detection count."""
        event = SecurityEvent(
            event_type=EventType.BLOCKED,
            threat_type=ThreatType.PROMPT_INJECTION,
            confidence_level=0.95,
            request_id=uuid.uuid4(),
            redacted_content="Attack",
            severity_level=SeverityLevel.CRITICAL,
        )
        await events_db.insert_event(event)

        pattern = AttackPattern(
            id=uuid.uuid4(),
            threat_types=[ThreatType.PROMPT_INJECTION],
            detection_count=1,
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow(),
            source_event_id=event.id,
            redacted_text="[REDACTED]",
        )
        await events_db.insert_pattern_metadata(pattern)

        # Update detection count
        new_last_seen = datetime.utcnow()
        await events_db.update_pattern_metadata(
            pattern_id=pattern.id,
            detection_count=5,
            last_seen=new_last_seen,
        )

        # Verify update
        retrieved = await events_db.get_pattern_metadata(pattern.id)
        assert retrieved["detection_count"] == 5

    async def test_get_top_patterns(self, events_db):
        """Test retrieving top patterns by detection count."""
        event = SecurityEvent(
            event_type=EventType.BLOCKED,
            threat_type=ThreatType.PROMPT_INJECTION,
            confidence_level=0.95,
            request_id=uuid.uuid4(),
            redacted_content="Attack",
            severity_level=SeverityLevel.CRITICAL,
        )
        await events_db.insert_event(event)

        # Insert patterns with different detection counts
        for count in [5, 10, 3]:
            pattern = AttackPattern(
                id=uuid.uuid4(),
                threat_types=[ThreatType.PROMPT_INJECTION],
                detection_count=count,
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
                source_event_id=event.id,
                redacted_text=f"Pattern {count}",
            )
            await events_db.insert_pattern_metadata(pattern)

        # Get top patterns
        top = await events_db.get_top_patterns(limit=2)

        assert len(top) == 2
        # Should be ordered by detection count (descending)
        assert top[0]["detection_count"] >= top[1]["detection_count"]
        assert top[0]["detection_count"] == 10

# Data Model: Bandaid LLM Security Proxy

**Feature**: 001-llm-security-proxy
**Date**: 2025-11-12
**Status**: Design Phase

## Overview

This document defines the data entities, relationships, validation rules, and persistence strategies for the Bandaid LLM Security Proxy. The system uses two primary storage mechanisms:
- **SQLite**: For event logging, configuration, and dashboard statistics
- **ChromaDB**: For vector embeddings of learned attack patterns

## Entities

### 1. SecurityEvent

**Purpose**: Records all validation events (blocked, allowed, warnings) for audit trail and dashboard display.

**Storage**: SQLite table `security_events`

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| id | UUID | Yes | Unique event identifier | Auto-generated UUID4 |
| timestamp | DateTime | Yes | Event creation time (UTC) | ISO 8601 format |
| event_type | Enum | Yes | Type of event | One of: blocked, allowed, data_leak_alert, medium_confidence_warning |
| threat_type | String | No | Specific threat detected | One of: prompt_injection, jailbreak, pii, financial_secret, toxic_content, null (if allowed) |
| confidence_level | Float | No | Detection confidence score | Range: 0.0-1.0, null if not applicable |
| request_id | UUID | Yes | Unique request identifier | UUID4, correlates with Request |
| redacted_content | Text | Yes | Redacted prompt/response snippet | Max 1000 chars, PII/secrets masked |
| severity_level | Enum | Yes | Event severity | One of: critical, high, medium, low, info |
| detection_layer | String | No | Which layer detected the threat | One of: ner, guard, embedding_match, null |
| learned_pattern_id | UUID | No | ID of learned pattern if matched | References AttackPattern.id, null if baseline |
| provider | String | No | Target LLM provider | e.g., "openai", "anthropic", null |
| model | String | No | Target LLM model | e.g., "gpt-4", "claude-3-opus", null |

**Indexes**:
- Primary: `id`
- Secondary: `timestamp` (for time-range queries)
- Secondary: `event_type` (for filtering)
- Secondary: `threat_type` (for statistics)
- Composite: `(timestamp, event_type)` (for dashboard queries)

**Retention**: Auto-delete events older than `config.log_retention_days` (default: 30)

---

### 2. AttackPattern

**Purpose**: Stores learned attack patterns as vector embeddings for self-learning capability.

**Storage**: ChromaDB collection `attack_patterns` + SQLite metadata table `attack_pattern_metadata`

**Fields (ChromaDB)**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Unique pattern identifier (as ChromaDB document ID) |
| embedding | Vector(384) | Yes | Sentence-transformer embedding (all-MiniLM-L6-v2) |
| metadata | Dict | Yes | Pattern metadata (see below) |

**Metadata Fields** (stored in ChromaDB metadata + SQLite):

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| threat_types | List[String] | Yes | Associated threat types | Non-empty list |
| detection_count | Integer | Yes | Number of times pattern matched | Non-negative, incremented on match |
| first_seen | DateTime | Yes | First detection timestamp | ISO 8601 format |
| last_seen | DateTime | Yes | Most recent match timestamp | ISO 8601 format, >= first_seen |
| source_event_id | UUID | Yes | Original SecurityEvent that created pattern | References SecurityEvent.id |
| redacted_text | Text | Yes | Redacted attack text for reference | Max 500 chars |

**ChromaDB Metadata Filters**:
- `threat_type` (string): For filtering by threat category
- `detection_count` (int): For popularity-based queries
- `last_seen` (timestamp): For recency-based queries

**Similarity Threshold**: Default 0.85 cosine similarity for pattern matching

**Retention**: Unlimited (per design decision from clarifications)

---

### 3. Configuration

**Purpose**: Stores system configuration including LLM provider credentials, ports, thresholds, and feature toggles.

**Storage**: TOML file `~/.bandaid/config.toml` + in-memory Pydantic model

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| proxy_port | Integer | No | Proxy server port | Range: 1024-65535, default: 8000 |
| dashboard_port | Integer | No | Dashboard server port | Range: 1024-65535, default: 8001, != proxy_port |
| log_retention_days | Integer | No | Days to retain events | Range: 1-365, default: 30 |
| sentry_dsn | String | No | Sentry DSN for remote logging | Valid URL or null |
| model_device | Enum | No | Device for ML models | One of: cpu, cuda, mps, default: cpu |

**Nested: provider_configs** (List[Dict]):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| provider | String | Yes | Provider name (openai, anthropic, etc.) |
| api_key | String | Yes | Encrypted API key |
| api_base | String | No | Custom API base URL |
| default | Boolean | No | Whether this is the default provider |

**Nested: confidence_thresholds**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| high | Float | No | High confidence threshold | Range: 0.0-1.0, default: 0.9 |
| medium_min | Float | No | Medium confidence minimum | Range: 0.0-1.0, default: 0.5 |

**Nested: disabled_checks** (List[String]):

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| - | String | Yes (in list) | Check type to disable | One of: pii, financial_secret, prompt_injection, jailbreak, toxic_content |

**Validation Rules**:
- `dashboard_port` must not equal `proxy_port`
- `confidence_thresholds.high` > `confidence_thresholds.medium_min`
- At least one `provider_config` must have `default: true`
- `api_key` values must be encrypted at rest (Fernet encryption)

**State Transitions**:
- Configuration changes require proxy restart (enforced by CLI)
- Changes logged as INFO-level events
- Invalid configurations prevent startup with clear error messages

---

### 4. Request (Transient)

**Purpose**: Represents incoming API requests during processing. Not persisted directly, logged as SecurityEvent.

**Storage**: In-memory only (Pydantic model)

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| request_id | UUID | Yes | Unique request identifier |
| timestamp | DateTime | Yes | Request receipt time |
| source_app | String | No | Identifying header or IP (if available) |
| provider_target | String | Yes | Target LLM provider |
| model_target | String | No | Target LLM model |
| headers | Dict | Yes | Request headers (filtered for sensitive data) |
| body | Dict | Yes | Request body (OpenAI format) |
| validation_results | List[ValidationResult] | Yes | Results from each security layer |

**Nested: ValidationResult**:

| Field | Type | Description |
|-------|------|-------------|
| layer | String | Validator name (ner, guard, embedding) |
| passed | Boolean | Whether validation passed |
| confidence | Float | Confidence score (0.0-1.0) |
| threats_detected | List[String] | List of threat types found |
| details | Dict | Layer-specific details |

**Lifecycle**:
1. Created on request receipt
2. Passed through validation pipeline
3. Logged as SecurityEvent
4. Discarded after response sent

---

### 5. Response (Transient)

**Purpose**: Represents LLM responses during processing. Not persisted directly, logged as SecurityEvent if leaks detected.

**Storage**: In-memory only (Pydantic model)

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| request_id | UUID | Yes | Correlating request ID |
| timestamp | DateTime | Yes | Response receipt time |
| provider | String | Yes | Actual provider that responded |
| model | String | No | Actual model used |
| body | Dict | Yes | Response body (OpenAI format) |
| leak_detections | List[LeakDetection] | Yes | Data leaks found (empty if none) |

**Nested: LeakDetection**:

| Field | Type | Description |
|-------|------|-------------|
| leak_type | String | Type of leak (pii, financial_secret) |
| confidence | Float | Detection confidence |
| location | String | Where in response (e.g., "message.content") |
| redacted_snippet | String | Redacted text snippet showing context |

**Lifecycle**:
1. Created on LLM response receipt
2. Scanned for data leaks
3. Logged as SecurityEvent if leaks detected
4. Forwarded to client
5. Discarded after forwarding

---

## Relationships

### Entity Relationship Diagram

```
SecurityEvent (SQLite)
    │
    ├── source_event_id references ──> AttackPattern (ChromaDB + SQLite metadata)
    │
    └── (correlated by request_id) ─── Request (transient)
                                            │
                                            └─── Response (transient)

Configuration (TOML file)
    │
    ├── provider_configs[] ─── (used by) ──> LiteLLM Router
    └── disabled_checks[] ─── (used by) ───> Security Validators
```

**Key Relationships**:

1. **SecurityEvent → AttackPattern** (One-to-Many):
   - A SecurityEvent creates zero or one AttackPattern (if high-confidence threat detected)
   - An AttackPattern can be referenced by multiple future SecurityEvents (when pattern matched)

2. **Request → Response** (One-to-One):
   - Each Request has exactly one Response (or times out)
   - Correlation via `request_id`

3. **Configuration → Everything** (Global):
   - Configuration is loaded once at startup
   - All components read configuration
   - Changes require restart

---

## Database Schemas

### SQLite Schema

```sql
-- Security Events Table
CREATE TABLE security_events (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('blocked', 'allowed', 'data_leak_alert', 'medium_confidence_warning')),
    threat_type TEXT CHECK(threat_type IN ('prompt_injection', 'jailbreak', 'pii', 'financial_secret', 'toxic_content') OR threat_type IS NULL),
    confidence_level REAL CHECK(confidence_level BETWEEN 0.0 AND 1.0 OR confidence_level IS NULL),
    request_id TEXT NOT NULL,
    redacted_content TEXT NOT NULL,
    severity_level TEXT NOT NULL CHECK(severity_level IN ('critical', 'high', 'medium', 'low', 'info')),
    detection_layer TEXT CHECK(detection_layer IN ('ner', 'guard', 'embedding_match') OR detection_layer IS NULL),
    learned_pattern_id TEXT,
    provider TEXT,
    model TEXT,
    FOREIGN KEY (learned_pattern_id) REFERENCES attack_pattern_metadata(id) ON DELETE SET NULL
);

CREATE INDEX idx_events_timestamp ON security_events(timestamp);
CREATE INDEX idx_events_type ON security_events(event_type);
CREATE INDEX idx_events_threat ON security_events(threat_type);
CREATE INDEX idx_events_time_type ON security_events(timestamp, event_type);

-- Attack Pattern Metadata Table (synced with ChromaDB)
CREATE TABLE attack_pattern_metadata (
    id TEXT PRIMARY KEY,
    threat_types TEXT NOT NULL, -- JSON array
    detection_count INTEGER NOT NULL DEFAULT 1 CHECK(detection_count >= 0),
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    source_event_id TEXT NOT NULL,
    redacted_text TEXT NOT NULL,
    FOREIGN KEY (source_event_id) REFERENCES security_events(id) ON DELETE CASCADE
);

CREATE INDEX idx_patterns_last_seen ON attack_pattern_metadata(last_seen);
CREATE INDEX idx_patterns_count ON attack_pattern_metadata(detection_count);

-- Retention Trigger (optional safety mechanism)
CREATE TRIGGER prevent_old_inserts
BEFORE INSERT ON security_events
FOR EACH ROW
WHEN datetime(NEW.timestamp) < datetime('now', '-' || (SELECT log_retention_days FROM config) || ' days')
BEGIN
    SELECT RAISE(ABORT, 'Cannot insert events older than retention period');
END;
```

### ChromaDB Collection Schema

```python
# Collection: attack_patterns
# Distance function: cosine
# Embedding dimension: 384 (all-MiniLM-L6-v2)

collection = client.get_or_create_collection(
    name="attack_patterns",
    metadata={
        "hnsw:space": "cosine",
        "description": "Learned attack pattern embeddings"
    }
)

# Documents stored with:
# - id: UUID string
# - embedding: 384-dimensional vector
# - metadata: {
#     "threat_types": "['prompt_injection']",  # JSON string
#     "detection_count": 1,
#     "first_seen": "2025-11-12T10:00:00Z",
#     "last_seen": "2025-11-12T10:00:00Z",
#     "source_event_id": "uuid-string",
#     "redacted_text": "Ignore previous instructions..."
# }
```

---

## Validation Rules Summary

### Data Integrity

1. **UUIDs**: All IDs must be valid UUID4 strings
2. **Timestamps**: All timestamps in ISO 8601 UTC format
3. **Confidence Scores**: Range [0.0, 1.0] where applicable
4. **Enums**: Strict validation against allowed values
5. **References**: Foreign keys enforce referential integrity
6. **Redaction**: All stored text must pass redaction validation (no raw PII/secrets)

### Business Rules

1. **Event Retention**: Events older than `log_retention_days` are auto-deleted
2. **Pattern Unlimited**: Attack patterns never expire (per design decision)
3. **Configuration Consistency**: Thresholds, ports, and providers validated on load
4. **Request-Response Correlation**: `request_id` must match between Request and Response
5. **Pattern Uniqueness**: Embeddings within 0.95 similarity considered duplicates (prevented)

### Performance Constraints

1. **Event Insertion**: < 10ms (SQLite batch insert)
2. **Dashboard Queries**: < 100ms (indexed queries)
3. **Pattern Similarity Search**: < 50ms (ChromaDB query)
4. **Configuration Load**: < 50ms (TOML parse + decrypt)

---

## Migration Strategy

### Initial Setup (v1.0.0)

1. Create SQLite database at `~/.bandaid/events.db`
2. Run schema creation SQL
3. Initialize ChromaDB persistent client at `~/.bandaid/chroma/`
4. Create `attack_patterns` collection
5. Copy `config.toml.example` to `~/.bandaid/config.toml` (if not exists)

### Future Migrations

1. Version tracked in SQLite metadata table:
   ```sql
   CREATE TABLE schema_version (
       version TEXT PRIMARY KEY,
       applied_at TEXT NOT NULL
   );
   ```

2. Migration scripts in `src/bandaid/storage/migrations/` named `v{version}.py`

3. Auto-apply on startup if version mismatch detected

4. Always backward compatible (no breaking changes to event schema)

---

## Data Flow

### Request Flow

```
1. Request arrives at FastAPI
   ├─> Create Request object (transient)
   │
2. Pre-call hook (validation)
   ├─> NER validator scans body
   ├─> Guard validator (if needed)
   ├─> Embedding matcher checks ChromaDB
   ├─> Accumulate validation_results
   │
3. Decision
   ├─> If threat detected (high confidence)
   │   ├─> Log SecurityEvent (event_type=blocked)
   │   ├─> Async: Create AttackPattern embedding
   │   └─> Return 403 Forbidden
   │
   ├─> If medium confidence warning
   │   ├─> Log SecurityEvent (event_type=medium_confidence_warning)
   │   └─> Continue to LLM
   │
   └─> If passed
       ├─> Forward to LLM via LiteLLM
       └─> Log SecurityEvent (event_type=allowed)
```

### Response Flow

```
1. LLM responds (streaming or complete)
   ├─> Create Response object (transient)
   │
2. Post-call hook (leak detection)
   ├─> NER validator scans response
   ├─> Guard validator (optional)
   ├─> Accumulate leak_detections
   │
3. Decision
   ├─> If leaks detected
   │   ├─> Log SecurityEvent (event_type=data_leak_alert)
   │   ├─> Send Sentry alert
   │   └─> Forward response anyway (don't block)
   │
   └─> If clean
       └─> Forward response to client
```

### Learning Flow (Async)

```
1. SecurityEvent logged with event_type=blocked
   │
2. Background task triggered
   ├─> Extract redacted prompt text
   ├─> Generate embedding via sentence-transformers
   ├─> Check ChromaDB for duplicate (similarity > 0.95)
   │   ├─> If duplicate: increment detection_count, update last_seen
   │   └─> If novel: insert new AttackPattern
   │
3. Update SQLite attack_pattern_metadata (sync with ChromaDB)
   │
4. Pattern now available for future matching
```

---

## Testing Strategy

### Unit Tests

- Pydantic model validation (invalid field values)
- Enum constraint checks
- Redaction logic correctness
- Timestamp parsing and UTC conversion

### Integration Tests

- SQLite CRUD operations with validation
- ChromaDB embedding storage and retrieval
- Configuration loading from TOML
- Foreign key constraint enforcement
- Retention policy execution

### Performance Tests

- 1000 event inserts (target: < 5s)
- Dashboard query with 10k events (target: < 100ms)
- Pattern similarity search with 1000 patterns (target: < 50ms)
- Configuration load with 10 providers (target: < 50ms)

### Data Integrity Tests

- Request-Response correlation
- Pattern deduplication
- Retention cleanup correctness
- Configuration validation on invalid values

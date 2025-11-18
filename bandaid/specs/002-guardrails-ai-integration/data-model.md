# Data Model: Guardrails AI Integration

**Feature**: 002-guardrails-ai-integration
**Date**: 2025-11-13
**Status**: Design Phase

---

## Overview

This document defines the data entities required for Guardrails AI validator integration. The model extends existing Bandaid schemas (events, configuration) while introducing new entities for validator management and execution tracking.

---

## Entity Definitions

### 1. GuardrailsConfiguration

Represents global Guardrails Hub connection and feature settings.

**Purpose**: Store Hub API credentials, connection status, and global Guardrails behavior settings

**Storage**: Configuration file (YAML) + environment variables

**Schema**:
```python
from pydantic import BaseModel, Field, SecretStr
from typing import Optional

class GuardrailsConfiguration(BaseModel):
    """Global Guardrails configuration"""

    # Feature toggle
    enabled: bool = False

    # Hub authentication
    hub_token: Optional[SecretStr] = None  # JWT from Guardrails Hub
    hub_api_url: str = "https://hub.api.guardrailsai.com"

    # Execution settings
    use_remote_inferencing: bool = True
    default_timeout_seconds: int = 10

    # Fallback behavior
    unsafe_continue_on_error: bool = False  # BANDAID_UNSAFE_VALIDATOR_CONTINUE

    # Observability
    enable_metrics: bool = True
```

**Validation Rules**:
- `hub_token` required when `enabled=True` and `use_remote_inferencing=True`
- `hub_token` must be valid JWT (checked on startup)
- `default_timeout_seconds` must be > 0, ≤ 60
- `unsafe_continue_on_error=True` triggers warning log on startup

**State Transitions**:
```
[Disabled] ──enable──> [Token Validation] ──valid──> [Enabled]
                              │
                              └──invalid──> [Error State]

[Enabled] ──disable──> [Disabled]
```

**Environment Variable Overrides**:
```bash
BANDAID_GUARDRAILS_ENABLED=true
GR_TOKEN=<jwt_token>
GR_VALIDATOR_HUB_SERVICE=https://hub.api.guardrailsai.com
BANDAID_UNSAFE_VALIDATOR_CONTINUE=false
```

**Example (YAML)**:
```yaml
guardrails:
  enabled: true
  hub_token: ${GR_TOKEN}
  hub_api_url: https://hub.api.guardrailsai.com
  use_remote_inferencing: true
  default_timeout_seconds: 10
  unsafe_continue_on_error: false
  enable_metrics: true
```

---

### 2. ValidatorConfig

Represents a single installed Guardrails validator with its configuration.

**Purpose**: Track installed validators, their settings, severity levels, and execution parameters

**Storage**: SQLite database (`guardrails_validators` table) + config file

**Schema**:
```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Literal
from datetime import datetime

class ValidatorConfig(BaseModel):
    """Configuration for a single Guardrails validator"""

    # Identity
    validator_id: str  # Format: "guardrails/detect_pii" or "hub://guardrails/detect_pii"
    validator_name: str  # Human-readable name (e.g., "PII Detection")
    version: str  # Semantic version (e.g., "1.4.2")

    # Installation metadata
    installed_at: datetime
    installation_method: Literal["hub", "manual", "pip"] = "hub"
    package_name: str  # PyPI package name (e.g., "guardrails-detect-pii")

    # Execution settings
    enabled: bool = True
    severity: Literal["critical", "high", "medium", "low"] = "high"
    on_fail: Literal["exception", "filter", "fix", "reask"] = "exception"
    apply_to: List[Literal["input", "output"]] = Field(default_factory=lambda: ["input", "output"])
    timeout_seconds: int = 10
    use_remote: bool = True

    # Validator-specific parameters
    params: Dict[str, Any] = Field(default_factory=dict)

    # Metadata
    description: Optional[str] = None
    author: Optional[str] = None
    hub_uri: Optional[str] = None  # Full Hub URI (e.g., "hub://guardrails/detect_pii~=1.4")
```

**Validation Rules**:
- `validator_id` must be unique per installation
- `severity` maps to confidence score on failure:
  - `critical` → 0.0 (block)
  - `high` → 0.3
  - `medium` → 0.6
  - `low` → 0.8
- `on_fail` determines action on validation failure:
  - `exception`: Stop and block request
  - `filter`: Remove violating content, continue
  - `fix`: Apply programmatic fix, continue
  - `reask`: Retry (not used in proxy mode)
- `apply_to` must contain at least one value
- `timeout_seconds` inherited from `GuardrailsConfiguration.default_timeout_seconds` if not set

**Relationships**:
- Many ValidatorConfigs → One GuardrailsConfiguration
- ValidatorConfig → Many ValidatorExecutionResults

**State Transitions**:
```
[Not Installed] ──install──> [Installed + Disabled]
                                    │
                                    ├──enable──> [Enabled]
                                    │                │
                                    │                ├──validate success──> [Enabled]
                                    │                └──validate error──> [Error State]
                                    │
                                    └──uninstall──> [Removed]

[Enabled] ──disable──> [Installed + Disabled]
```

**Database Schema** (SQLite):
```sql
CREATE TABLE guardrails_validators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    validator_id TEXT NOT NULL UNIQUE,
    validator_name TEXT NOT NULL,
    version TEXT NOT NULL,
    installed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    installation_method TEXT NOT NULL DEFAULT 'hub',
    package_name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    severity TEXT NOT NULL DEFAULT 'high',
    on_fail TEXT NOT NULL DEFAULT 'exception',
    apply_to_input BOOLEAN NOT NULL DEFAULT 1,
    apply_to_output BOOLEAN NOT NULL DEFAULT 1,
    timeout_seconds INTEGER NOT NULL DEFAULT 10,
    use_remote BOOLEAN NOT NULL DEFAULT 1,
    params JSON,
    description TEXT,
    author TEXT,
    hub_uri TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_validator_enabled ON guardrails_validators(enabled);
CREATE INDEX idx_validator_severity ON guardrails_validators(severity);
```

**Example**:
```python
ValidatorConfig(
    validator_id="guardrails/detect_pii",
    validator_name="PII Detection",
    version="1.4.2",
    installed_at=datetime.now(),
    installation_method="hub",
    package_name="guardrails-detect-pii",
    enabled=True,
    severity="critical",
    on_fail="exception",
    apply_to=["input", "output"],
    timeout_seconds=10,
    use_remote=True,
    params={
        "pii_entities": "pii",
        "anonymize": True
    },
    description="Detects and redacts PII using Presidio",
    hub_uri="hub://guardrails/detect_pii~=1.4"
)
```

---

### 3. ValidationPolicy

Defines execution order and grouping of validators for a specific traffic direction.

**Purpose**: Manage which validators run on input vs output, and in what order

**Storage**: Configuration file (YAML)

**Schema**:
```python
from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class ValidationPolicy(BaseModel):
    """Defines validator execution policy"""

    # Policy identity
    name: str  # e.g., "input_policy", "output_policy"
    direction: Literal["input", "output"]

    # Validator execution order
    validator_ids: List[str] = Field(default_factory=list)  # Ordered list of validator IDs

    # Execution settings
    concurrent: bool = True  # Run validators concurrently where possible
    fail_fast: bool = False  # Stop on first failure (only for severity=critical)

    # Fallback behavior
    continue_on_timeout: Optional[bool] = None  # Override global unsafe_continue_on_error
```

**Validation Rules**:
- `validator_ids` must reference existing enabled validators
- Validators with `on_fail="exception"` always fail fast (ignore `fail_fast` setting)
- If `validator_ids` is empty, policy is inactive
- Order preserved when `concurrent=False`
- Order based on severity when `concurrent=True`: critical → high → medium → low

**Default Policies** (auto-generated if not configured):
```yaml
policies:
  - name: "input_policy"
    direction: "input"
    validator_ids:
      - "guardrails/detect_pii"
      - "guardrails/prompt_injection"
    concurrent: true
    fail_fast: false

  - name: "output_policy"
    direction: "output"
    validator_ids:
      - "guardrails/detect_pii"
      - "guardrails/toxic_language"
      - "guardrails/competitor_check"
    concurrent: true
    fail_fast: false
```

**Execution Logic**:
```python
def execute_policy(policy: ValidationPolicy, text: str) -> ValidationResult:
    """Execute validators according to policy"""

    if policy.concurrent:
        # Run validators in parallel (asyncio.gather)
        results = await asyncio.gather(*[
            run_validator_with_timeout(vid, text)
            for vid in policy.validator_ids
        ])
    else:
        # Run validators sequentially
        results = []
        for vid in policy.validator_ids:
            result = await run_validator_with_timeout(vid, text)
            results.append(result)

            # Fail fast for critical validators
            if result.failed and get_severity(vid) == "critical":
                break

    return aggregate_results(results)
```

---

### 4. ValidatorExecutionResult

Captures the outcome of running a validator on traffic.

**Purpose**: Log validation results for security auditing, debugging, and learning

**Storage**: SQLite database (`guardrails_executions` table) + event log

**Schema**:
```python
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime
from uuid import UUID

class ValidatorExecutionResult(BaseModel):
    """Result of a single validator execution"""

    # Execution identity
    execution_id: UUID = Field(default_factory=uuid4)
    request_id: UUID  # Correlates with LLM request in events table
    validator_id: str
    direction: Literal["input", "output"]

    # Execution timing
    started_at: datetime
    completed_at: Optional[datetime] = None
    execution_duration_ms: Optional[float] = None

    # Validation outcome
    status: Literal["pass", "fail", "error", "timeout"] = "pass"
    outcome: Literal["passed", "failed", "exception", "timeout"] = "passed"
    on_fail_action: Literal["exception", "filter", "fix", "reask"]

    # Failure details
    failure_reason: Optional[str] = None
    error_message: Optional[str] = None
    error_spans: List[Dict[str, Any]] = Field(default_factory=list)  # Character positions

    # Content
    original_text: str
    validated_text: Optional[str] = None  # After fix/filter
    fixed_content: Optional[str] = None  # Content after on_fail="fix"

    # Confidence mapping
    confidence_score: float  # Mapped from severity on failure, 1.0 on success
    severity_level: Literal["critical", "high", "medium", "low"]

    # Metadata
    validator_version: str
    remote_execution: bool
    timeout_seconds: int
```

**Validation Rules**:
- `completed_at` must be >= `started_at`
- `execution_duration_ms` = (completed_at - started_at) in milliseconds
- `confidence_score` derived from severity on failure:
  - `status="pass"` → `confidence_score=1.0`
  - `status="fail"` + `severity="critical"` → `confidence_score=0.0`
  - `status="fail"` + `severity="high"` → `confidence_score=0.3`
  - `status="fail"` + `severity="medium"` → `confidence_score=0.6`
  - `status="fail"` + `severity="low"` → `confidence_score=0.8`
  - `status="timeout"` → treat as fail (use severity mapping) unless `unsafe_continue_on_error=true`
  - `status="error"` → treat as fail (use severity mapping)

**Relationships**:
- Many ValidatorExecutionResults → One LLM Request (via `request_id`)
- ValidatorExecutionResult → One ValidatorConfig (via `validator_id`)

**Database Schema** (SQLite):
```sql
CREATE TABLE guardrails_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    execution_id TEXT NOT NULL UNIQUE,
    request_id TEXT NOT NULL,
    validator_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    execution_duration_ms REAL,
    status TEXT NOT NULL DEFAULT 'pass',
    outcome TEXT NOT NULL DEFAULT 'passed',
    on_fail_action TEXT NOT NULL,
    failure_reason TEXT,
    error_message TEXT,
    error_spans JSON,
    original_text TEXT NOT NULL,
    validated_text TEXT,
    fixed_content TEXT,
    confidence_score REAL NOT NULL,
    severity_level TEXT NOT NULL,
    validator_version TEXT NOT NULL,
    remote_execution BOOLEAN NOT NULL DEFAULT 1,
    timeout_seconds INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (validator_id) REFERENCES guardrails_validators(validator_id) ON DELETE CASCADE,
    FOREIGN KEY (request_id) REFERENCES events(request_id) ON DELETE CASCADE
);

CREATE INDEX idx_execution_request ON guardrails_executions(request_id);
CREATE INDEX idx_execution_validator ON guardrails_executions(validator_id);
CREATE INDEX idx_execution_status ON guardrails_executions(status);
CREATE INDEX idx_execution_direction ON guardrails_executions(direction);
CREATE INDEX idx_execution_timestamp ON guardrails_executions(started_at);
```

**Example**:
```python
ValidatorExecutionResult(
    execution_id=UUID("..."),
    request_id=UUID("..."),
    validator_id="guardrails/detect_pii",
    direction="input",
    started_at=datetime.now(),
    completed_at=datetime.now(),
    execution_duration_ms=45.3,
    status="fail",
    outcome="failed",
    on_fail_action="exception",
    failure_reason="PII detected: email address",
    error_spans=[
        {"start": 12, "end": 28, "text": "user@example.com", "entity": "EMAIL"}
    ],
    original_text="Please email user@example.com with the details",
    validated_text="Please email [REDACTED] with the details",
    confidence_score=0.0,
    severity_level="critical",
    validator_version="1.4.2",
    remote_execution=True,
    timeout_seconds=10
)
```

---

## Integration with Existing Entities

### Extended: Event (from existing `events.py`)

Add Guardrails-specific fields to existing `Event` model:

```python
class Event(BaseModel):
    # Existing fields...
    request_id: UUID
    event_type: EventType
    timestamp: datetime
    confidence: float
    threat_type: Optional[ThreatType]

    # NEW: Guardrails integration
    guardrails_enabled: bool = False
    guardrails_validators_run: int = 0
    guardrails_validators_failed: int = 0
    guardrails_lowest_confidence: Optional[float] = None
```

**Migration** (extend existing events table):
```sql
ALTER TABLE events ADD COLUMN guardrails_enabled BOOLEAN DEFAULT 0;
ALTER TABLE events ADD COLUMN guardrails_validators_run INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN guardrails_validators_failed INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN guardrails_lowest_confidence REAL;
```

---

## Aggregate Calculations

### Overall Confidence Score

When multiple validators run on the same request, use the **lowest confidence score** (most conservative approach):

```python
def calculate_overall_confidence(
    builtin_confidence: float,
    guardrails_results: List[ValidatorExecutionResult]
) -> float:
    """Calculate overall confidence from built-in + Guardrails validators"""

    # Start with built-in security layers confidence
    min_confidence = builtin_confidence

    # Apply Guardrails results
    for result in guardrails_results:
        if result.confidence_score < min_confidence:
            min_confidence = result.confidence_score

    return min_confidence
```

**Example**:
```
Built-in layers: confidence = 0.85 (NER flagged mild concern)
Guardrails validators:
  - detect_pii: confidence = 1.0 (passed)
  - toxic_language: confidence = 0.6 (medium severity failure)
  - competitor_check: confidence = 1.0 (passed)

Overall confidence = min(0.85, 1.0, 0.6, 1.0) = 0.6
```

### Validator Performance Metrics

Track validator performance for monitoring:

```python
class ValidatorMetrics(BaseModel):
    """Aggregated metrics per validator"""

    validator_id: str
    total_executions: int
    total_passes: int
    total_failures: int
    total_timeouts: int
    total_errors: int

    avg_execution_ms: float
    p50_execution_ms: float
    p95_execution_ms: float
    p99_execution_ms: float

    failure_rate: float  # failures / total_executions
    timeout_rate: float  # timeouts / total_executions
```

**Query** (SQLite):
```sql
SELECT
    validator_id,
    COUNT(*) as total_executions,
    SUM(CASE WHEN status = 'pass' THEN 1 ELSE 0 END) as total_passes,
    SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) as total_failures,
    SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as total_timeouts,
    SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as total_errors,
    AVG(execution_duration_ms) as avg_execution_ms,
    CAST(SUM(CASE WHEN status IN ('fail', 'timeout', 'error') THEN 1 ELSE 0 END) AS REAL) / COUNT(*) as failure_rate
FROM guardrails_executions
WHERE started_at >= datetime('now', '-7 days')
GROUP BY validator_id;
```

---

## Data Lifecycle

### Validator Installation Lifecycle

```
1. User runs: guardrail validators install hub://guardrails/detect_pii
2. System validates Hub token
3. Pip installs package: guardrails-detect-pii
4. Post-install script downloads models (if local execution)
5. System creates ValidatorConfig record in DB
6. ValidatorConfig.enabled = False initially
7. User enables via: guardrail validators enable detect_pii
8. ValidatorConfig.enabled = True
9. Validator now runs on applicable traffic
```

### Execution Result Retention

```sql
-- Auto-delete old execution results (configurable retention period)
DELETE FROM guardrails_executions
WHERE started_at < datetime('now', '-30 days');

-- Keep failure records longer for security analysis
DELETE FROM guardrails_executions
WHERE status = 'pass'
  AND started_at < datetime('now', '-7 days');
```

### Configuration Backup

```yaml
# Backup validator configurations for disaster recovery
guardrails:
  enabled: true
  validators:
    - validator_id: "guardrails/detect_pii"
      version: "1.4.2"
      enabled: true
      severity: "critical"
      # ... full config
```

---

## Constraints & Indexes

### Performance Optimization

```sql
-- Speed up lookups by request_id (correlate Guardrails results with LLM requests)
CREATE INDEX idx_execution_request ON guardrails_executions(request_id);

-- Speed up validator-specific queries
CREATE INDEX idx_execution_validator ON guardrails_executions(validator_id);

-- Speed up failure analysis queries
CREATE INDEX idx_execution_status ON guardrails_executions(status);

-- Speed up time-range queries
CREATE INDEX idx_execution_timestamp ON guardrails_executions(started_at);

-- Composite index for common dashboard query
CREATE INDEX idx_execution_validator_status_time
ON guardrails_executions(validator_id, status, started_at);
```

### Data Integrity

```sql
-- Ensure validator_id references valid installed validator
FOREIGN KEY (validator_id) REFERENCES guardrails_validators(validator_id) ON DELETE CASCADE;

-- Ensure request_id references valid LLM request
FOREIGN KEY (request_id) REFERENCES events(request_id) ON DELETE CASCADE;

-- Ensure unique execution IDs
CONSTRAINT unique_execution_id UNIQUE (execution_id);

-- Ensure valid enum values
CHECK (status IN ('pass', 'fail', 'error', 'timeout'));
CHECK (severity_level IN ('critical', 'high', 'medium', 'low'));
CHECK (direction IN ('input', 'output'));
```

---

## Migration Strategy

### Phase 1: Schema Creation

```sql
-- Create new tables
CREATE TABLE guardrails_validators (...);
CREATE TABLE guardrails_executions (...);

-- Extend existing tables
ALTER TABLE events ADD COLUMN guardrails_enabled BOOLEAN DEFAULT 0;
ALTER TABLE events ADD COLUMN guardrails_validators_run INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN guardrails_validators_failed INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN guardrails_lowest_confidence REAL;
```

### Phase 2: Backward Compatibility

```python
# Ensure existing code works when Guardrails disabled
if guardrails_config.enabled:
    guardrails_results = run_guardrails_validators(...)
else:
    guardrails_results = []  # Empty list, no Guardrails processing

# Always include guardrails fields in Event, even when disabled
event = Event(
    request_id=request_id,
    event_type=event_type,
    confidence=calculate_confidence(),
    guardrails_enabled=guardrails_config.enabled,
    guardrails_validators_run=len(guardrails_results),
    guardrails_validators_failed=sum(1 for r in guardrails_results if r.status != "pass"),
    guardrails_lowest_confidence=min([r.confidence_score for r in guardrails_results]) if guardrails_results else None
)
```

### Phase 3: Data Seeding (Optional)

```python
# Seed common validators on first setup
DEFAULT_VALIDATORS = [
    ValidatorConfig(
        validator_id="guardrails/detect_pii",
        validator_name="PII Detection",
        version="1.4.2",
        enabled=False,  # User must explicitly enable
        severity="critical",
        on_fail="exception",
        params={"pii_entities": "pii"}
    ),
    # ... other validators
]

# Install on setup wizard completion
for validator_config in DEFAULT_VALIDATORS:
    db.insert(validator_config)
```

---

## Summary

The Guardrails AI integration introduces **four new entities**:

1. **GuardrailsConfiguration**: Global Hub settings and feature toggles
2. **ValidatorConfig**: Individual validator installation and execution settings
3. **ValidationPolicy**: Execution order and grouping logic
4. **ValidatorExecutionResult**: Audit log of validator runs

These entities integrate with existing Bandaid schemas (`Event`, `ThreatType`, `ConfidenceScore`) to provide comprehensive security validation while maintaining backward compatibility and performance requirements.

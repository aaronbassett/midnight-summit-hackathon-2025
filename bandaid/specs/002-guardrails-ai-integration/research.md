# Guardrails AI Integration Research

**Date**: 2025-11-13
**Feature**: 002-guardrails-ai-integration
**Purpose**: Resolve technical clarifications from implementation plan

## Executive Summary

Guardrails AI provides a robust ecosystem for integrating pre-built LLM validators. The library supports both local and remote execution models, uses standard pip packaging for validators, and integrates via JWT authentication with the Guardrails Hub. Key architectural decision: use remote inference for ML-based validators in production to avoid dependency conflicts and enable GPU acceleration.

---

## Research Questions & Resolutions

### 1. Validator Execution Isolation Strategy

**Question**: How does Guardrails handle validator execution isolation to prevent dependency conflicts?

**Decision**: Use **remote inference mode** for production deployment

**Rationale**:
- Guardrails supports two execution modes:
  - **Local execution** (default): Validators run in the same Python process
  - **Remote execution**: Validators call remote endpoints for ML inference
- Remote mode separates guardrailing orchestration from ML model execution
- Prevents dependency conflicts between validators and core application
- Enables GPU acceleration without requiring GPU on proxy server
- Allows independent scaling of validator infrastructure

**Implementation Approach**:
```python
# Configure validator for remote inference
from guardrails.hub import DetectPII

validator = DetectPII(
    use_local=False,  # Use remote inference
    on_fail="exception"
)
```

**Environment Configuration**:
```bash
# In ~/.guardrailsrc or environment
use_remote_inferencing=true
```

**Alternatives Considered**:
- **Local execution**: Simpler setup but risks dependency conflicts; suitable for development/testing
- **Process isolation via multiprocessing**: Adds complexity; not supported in all deployment environments (e.g., AWS Lambda)

**References**:
- https://github.com/guardrails-ai/guardrails/blob/main/docs/src/concepts/remote_validation.md
- https://github.com/guardrails-ai/guardrails/blob/main/guardrails/validator_base.py#L147-L150

---

### 2. Maximum Number of Validators Supported

**Question**: Are there limits on the number of validators that can be installed or executed per request?

**Decision**: **No hard limit**, but practical constraint of **3-5 validators per request** for <100ms latency target

**Rationale**:
- Guardrails runs validators concurrently via asyncio where possible
- Independent validators on different properties run in parallel
- Multiple validators on the same property also execute concurrently
- Official performance target: "< 100ms added latency per LLM request"
- Each validator adds overhead; prioritize critical security checks

**Performance Characteristics**:
- Concurrent execution reduces total latency
- Network latency for remote validators is the main bottleneck
- Can disable concurrency via `GUARDRAILS_RUN_SYNC=true` if needed

**Recommendation for Bandaid**:
- Start with 3-5 critical validators:
  1. PII detection (input/output)
  2. Prompt injection detection (input)
  3. Toxic language filtering (output)
  4. Competitor mention check (output)
  5. Secret detection (output)
- Monitor p50/p95 latency and adjust validator count accordingly
- Consider validator priority/severity when selecting execution order

**References**:
- https://github.com/guardrails-ai/guardrails/blob/main/docs/src/concepts/concurrency.md
- https://www.guardrailsai.com/docs/concepts/async_validation

---

### 3. Validator Dependency Management

**Question**: How does Guardrails handle validators with conflicting dependencies?

**Decision**: Use **remote inference** and **--no-install-local-models** flag to avoid local dependency installation

**Rationale**:
- Validators are distributed as standard pip packages with `pyproject.toml` dependencies
- Each validator can have its own ML model dependencies (transformers, presidio, etc.)
- Local installation puts all dependencies in the same site-packages, risking version conflicts
- Remote inference mode only requires the validator interface (lightweight), not the full dependencies
- Validators are registered in `guardrails/hub/__init__.py` at installation

**Installation Commands**:
```bash
# Install validator with local models (for local execution)
guardrails hub install hub://guardrails/detect_pii

# Install validator WITHOUT local models (for remote inference)
guardrails hub install hub://guardrails/detect_pii --no-install-local-models

# Pin validator version
guardrails hub install hub://guardrails/detect_pii~=1.4
```

**Example Validator Dependencies** (detect_pii):
```toml
dependencies = [
    "presidio-analyzer~=2.2",
    "presidio-anonymizer~=2.2",
    "numpy",
    "guardrails-ai>=0.4.0",
    "nltk>=3.8.1,<4.0.0"
]
```

**Conflict Avoidance Strategies**:
1. **Remote inference** (recommended): Avoid installing heavy dependencies locally
2. **Virtual environments**: Separate Python environments for conflicting dependencies
3. **Selective installation**: Only install validators actively used

**Alternatives Considered**:
- **Docker containers per validator**: Over-engineered for this use case
- **Vendor all dependencies**: High maintenance burden
- **Local execution only**: Acceptable for development; conflicts likely in production

**References**:
- https://github.com/guardrails-ai/guardrails/blob/main/guardrails/hub/validator_package_service.py#L124-L135
- https://github.com/guardrails-ai/detect_pii/blob/main/pyproject.toml

---

### 4. Best Practices for Integration with Existing Security Pipeline

**Question**: How should Guardrails validators integrate with Bandaid's existing security layers?

**Decision**: Implement **layered Guards** with strategic OnFail actions based on severity

**Architecture Pattern**:
```python
from guardrails import Guard
from guardrails.hub import DetectPII, DetectPromptInjection, ToxicLanguage

# Input Guard (pre-LLM)
input_guard = Guard().use_many(
    DetectPII(pii_entities="pii", on_fail="exception"),           # Critical
    DetectPromptInjection(threshold=0.9, on_fail="exception"),    # Critical
)

# Output Guard (post-LLM)
output_guard = Guard().use_many(
    DetectPII(pii_entities="pii", on_fail="fix"),                 # Fix/redact
    ToxicLanguage(threshold=0.5, on_fail="filter"),               # Remove toxic content
    CompetitorCheck(competitors=["competitor1"], on_fail="fix"),  # Redact competitors
)
```

**Integration Points in Bandaid**:
1. **Pre-existing layers** (fastest to slowest):
   - Learned patterns (ChromaDB) - ~10ms
   - Regex patterns - ~1ms
   - NER validator - 20-30ms
   - Llama Guard - 50-80ms

2. **Guardrails layer** (new):
   - Position: After Llama Guard (final validation)
   - Execution: Concurrent where possible
   - Latency target: <50ms (remote inference)

**OnFail Strategy by Severity**:
```python
# Map Guardrails OnFail actions to Bandaid confidence scores
OnFail.EXCEPTION -> severity="critical" -> confidence=0.0   # Block immediately
OnFail.FILTER    -> severity="high"     -> confidence=0.3   # Remove content, continue
OnFail.FIX       -> severity="medium"   -> confidence=0.6   # Apply fix, continue
OnFail.REASK     -> severity="low"      -> confidence=0.8   # Retry (not used in proxy)
```

**Execution Order**:
1. Run input guards (PII, injection detection)
2. Forward request to LLM if guards pass
3. Run output guards on response
4. Apply lowest confidence score from all failures (existing Bandaid behavior)

**Alternatives Considered**:
- **Replace existing layers with Guardrails**: Would lose fast learned patterns layer
- **Run Guardrails first**: Slower than learned patterns, defeats performance optimization
- **Separate Guardrails endpoint**: Over-engineered; increases latency

**References**:
- https://www.guardrailsai.com/docs/concepts/on_fail
- https://github.com/guardrails-ai/guardrails/blob/main/docs/src/how_to_guides/layering.md

---

### 5. API Authentication and Hub Connectivity

**Question**: How does authentication work for the Guardrails Hub API?

**Decision**: Use **JWT tokens** via environment variables for production deployment

**Authentication Flow**:
1. Obtain API key from https://hub.guardrailsai.com/keys
2. Configure via `guardrails configure` command or environment variable
3. Token stored in `~/.guardrailsrc` or `GR_TOKEN` environment variable
4. JWT validated for expiration before Hub API calls

**Configuration Methods**:

**Option 1: CLI Configuration** (development):
```bash
guardrails configure
# Prompts for token, stores in ~/.guardrailsrc
```

**Option 2: Environment Variable** (production):
```bash
export GR_TOKEN=<JWT_TOKEN>
export GR_VALIDATOR_HUB_SERVICE=https://hub.api.guardrailsai.com
```

**Option 3: RC File** (~/.guardrailsrc):
```
token=<JWT_TOKEN>
enable_metrics=true
use_remote_inferencing=true
```

**Token Validation**:
```python
import jwt
from jwt import ExpiredSignatureError, DecodeError

def validate_token(token: str) -> bool:
    try:
        jwt.decode(token, options={"verify_signature": False, "verify_exp": True})
        return True
    except ExpiredSignatureError:
        raise TokenExpiredError("Token expired")
    except DecodeError:
        raise InvalidTokenError("Invalid token format")
```

**Security Considerations**:
- Token is required for:
  - Installing validators from Hub
  - Using remote inference endpoints
  - Accessing paid/premium validators
- Token is NOT required for:
  - Local-only validation with already-installed validators
  - Using open-source validators in local mode

**Recommendation for Bandaid**:
1. **Store token in environment variable** (not config file in version control)
2. **Implement token refresh logic** for long-running services
3. **Graceful degradation**: If token invalid/expired, disable Guardrails features rather than crash
4. **Token validation on startup**: Verify token before starting proxy server

**References**:
- https://github.com/guardrails-ai/guardrails/blob/main/guardrails/hub_token/token.py#L27-L41
- https://github.com/guardrails-ai/guardrails/blob/main/guardrails/classes/rc.py

---

### 6. Validator Installation Mechanism

**Question**: How are validators downloaded and installed from the Hub?

**Decision**: Validators are distributed as **standard pip packages** via PyPI or Guardrails Hub

**Installation Process**:

**Step 1: CLI Installation**
```bash
# Install from Hub
guardrails hub install hub://guardrails/regex_match

# Pin version
guardrails hub install hub://guardrails/detect_pii~=1.4

# Skip local models (for remote inference)
guardrails hub install hub://guardrails/detect_pii --no-install-local-models

# Upgrade existing validator
guardrails hub install hub://guardrails/detect_pii --upgrade
```

**Step 2: Package Resolution**
```python
# Parses URI to extract validator ID and version
validator_id, validator_version = ValidatorPackageService.get_validator_id(package_uri)
# Example: "guardrails/detect_pii" from "hub://guardrails/detect_pii"
```

**Step 3: Pip Installation**
```bash
# Under the hood, runs:
pip install guardrails-detect-pii~=1.4
```

**Step 4: Validator Registration**
```python
# Adds import to guardrails/hub/__init__.py
from guardrails.hub.detect_pii import DetectPII
```

**Step 5: Post-Install Scripts** (optional)
```python
# Some validators download ML models after pip install
# Example: detect_pii/validator/post-install.py downloads Presidio models
```

**Validator Package Structure**:
```
detect_pii/
├── validator/
│   ├── __init__.py
│   ├── main.py          # DetectPII class with validate() method
│   └── post-install.py  # Optional: download ML models
├── tests/
│   └── test_validator.py
├── pyproject.toml       # Dependencies and metadata
├── README.md
└── CHANGELOG.md
```

**Programmatic Installation** (for Bandaid setup wizard):
```python
from guardrails.cli.hub.install import install

# Install validator programmatically
install(
    package_uris=["hub://guardrails/detect_pii"],
    local_models=False,  # Skip local model download
    upgrade=False
)
```

**Listing Installed Validators**:
```bash
guardrails hub list
```

**Uninstalling Validators**:
```bash
pip uninstall guardrails-detect-pii
```

**Recommendation for Bandaid**:
1. **Pin validator versions** in requirements.txt or pyproject.toml
2. **Automate installation** in setup wizard: offer popular validators as checkboxes
3. **Validate installation** before enabling in production
4. **Document installed validators** in config/README
5. **Test validator compatibility** in CI/CD before deploying updates

**References**:
- https://github.com/guardrails-ai/guardrails/blob/main/guardrails/cli/hub/install.py
- https://github.com/guardrails-ai/guardrails/blob/main/guardrails/hub/validator_package_service.py#L143-L175
- https://github.com/guardrails-ai/validator-template (template for custom validators)

---

### 7. Timeout and Error Handling

**Question**: What's the recommended approach for handling validator timeouts and execution errors?

**Decision**: Implement **timeout wrappers** with **OnFail actions** and **circuit breaker pattern** for remote validators

**Timeout Configuration**:

**Built-in Retry Logic** (for LLM calls):
- Automatic exponential backoff
- Max wait time between retries: **60 seconds**
- Configurable via `num_reasks` parameter

**Custom Timeout Wrapper** (for validators):
```python
import signal
from contextlib import contextmanager

class ValidatorTimeoutError(Exception):
    pass

@contextmanager
def timeout(seconds: int = 30):
    """Context manager for validator timeouts"""
    def timeout_handler(signum, frame):
        raise ValidatorTimeoutError(f"Validator execution exceeded {seconds}s timeout")

    # Set alarm
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(seconds)
    try:
        yield
    finally:
        signal.alarm(0)  # Disable alarm

# Usage in Bandaid
try:
    with timeout(seconds=10):
        result = guard.parse(llm_output)
except ValidatorTimeoutError as e:
    # Apply validator's severity level confidence score
    confidence_score = 0.3  # "high" severity from validator config
    logger.warning(f"Validator timeout: {e}")
```

**OnFail Actions by Severity**:

```python
from guardrails import Guard, OnFailAction
from guardrails.hub import DetectPII, ToxicLanguage

# Critical validators - stop immediately on failure
guard_critical = Guard().use_many(
    DetectPII(on_fail=OnFailAction.EXCEPTION),
    DetectPromptInjection(on_fail=OnFailAction.EXCEPTION)
)

# High severity - filter/redact and continue
guard_high = Guard().use_many(
    ToxicLanguage(on_fail=OnFailAction.FILTER),
    DetectSecrets(on_fail=OnFailAction.FIX)
)

# Medium severity - fix and continue
guard_medium = Guard().use_many(
    CompetitorCheck(on_fail=OnFailAction.FIX)
)
```

**Error Handling Patterns**:

**1. Validation Errors**:
```python
from guardrails.errors import ValidationError

try:
    result = guard.parse(llm_output)
except ValidationError as e:
    # Log failed validations
    failed_validations = guard.history.last.failed_validations
    logger.error(f"Validation failed: {failed_validations}")

    # Map to Bandaid confidence score
    severity_scores = {
        "critical": 0.0,
        "high": 0.3,
        "medium": 0.6,
        "low": 0.8
    }
    confidence = severity_scores[validator_severity]

    # Optionally send to Sentry
    sentry_sdk.capture_exception(e)
```

**2. Remote Inference Errors**:
```python
import httpx

try:
    result = guard.parse(llm_output)
except httpx.HTTPError as e:
    # Remote validator endpoint unreachable
    logger.error(f"Remote validator failed: {e}")

    # Option 1: Treat as validation failure (conservative)
    confidence = 0.0

    # Option 2: Skip validator and continue (UNSAFE mode)
    if os.getenv("BANDAID_UNSAFE_VALIDATOR_CONTINUE"):
        confidence = 1.0  # Pass through
        logger.warning("Skipping failed remote validator (UNSAFE mode)")
```

**3. Circuit Breaker Pattern** (for remote validators):
```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=60)
def validate_with_guardrails(guard, output):
    """
    Circuit breaker for remote validators
    - Opens circuit after 5 consecutive failures
    - Attempts recovery after 60 seconds
    """
    return guard.parse(output)

# Usage
try:
    result = validate_with_guardrails(guard, llm_output)
except CircuitBreakerError:
    logger.error("Circuit breaker open - remote validators unavailable")
    # Handle based on BANDAID_UNSAFE_VALIDATOR_CONTINUE setting
```

**Environment-Specific Handling**:

```bash
# Force synchronous execution (e.g., AWS Lambda)
export GUARDRAILS_PROCESS_COUNT=1
export GUARDRAILS_RUN_SYNC=true

# Bandaid-specific timeout configuration
export BANDAID_VALIDATOR_TIMEOUT=10  # seconds
export BANDAID_UNSAFE_VALIDATOR_CONTINUE=false  # Fail safe by default
```

**Integration with Bandaid Confidence System**:

```python
from bandaid.security.confidence import ConfidenceScore

def map_guardrails_result(guard_result, validator_config):
    """Map Guardrails validation result to Bandaid confidence score"""

    if guard_result.validated_output == guard_result.raw_output:
        # Validation passed
        return ConfidenceScore(score=1.0, reason="Guardrails validation passed")

    # Validation failed - map severity to confidence
    severity = validator_config.severity  # "critical", "high", "medium", "low"
    severity_scores = {
        "critical": 0.0,
        "high": 0.3,
        "medium": 0.6,
        "low": 0.8
    }

    failed_validators = guard_result.validation_summaries
    return ConfidenceScore(
        score=severity_scores[severity],
        reason=f"Guardrails validator failed: {failed_validators}"
    )
```

**Recommendation for Bandaid**:

1. **Default timeout**: 10 seconds per validator (configurable via env var)
2. **Timeout behavior**: Treat timeout as validation failure (apply severity-based confidence score)
3. **UNSAFE mode**: `BANDAID_UNSAFE_VALIDATOR_CONTINUE=true` skips timed-out validators
4. **Circuit breaker**: Implement for remote validators to prevent cascading failures
5. **Logging**: Log all timeout/error events to SQLite for security auditing
6. **Sentry integration**: Capture validator errors for monitoring
7. **Graceful degradation**: If all Guardrails validators fail, fall back to built-in security layers

**References**:
- https://github.com/guardrails-ai/guardrails/blob/main/docs/src/concepts/on_fail.md
- https://www.guardrailsai.com/docs/concepts/error_remediation
- https://github.com/guardrails-ai/guardrails/blob/main/guardrails/validator_base.py#L234-L256

---

## Technology Stack Additions

Based on research findings, the following dependencies will be added to Bandaid:

### Required Dependencies

```toml
# pyproject.toml additions
dependencies = [
    # Existing dependencies...

    # Guardrails AI Integration
    "guardrails-ai>=0.5.0",
]
```

### Optional Validators

```toml
# Optional validators (install based on user selection)
[project.optional-dependencies]
guardrails-validators = [
    "guardrails-detect-pii~=1.4",
    "guardrails-toxic-language~=0.1",
    "guardrails-competitor-check~=0.1",
    "guardrails-secrets-present~=0.1",
]
```

### Circuit Breaker

```toml
[project.optional-dependencies]
resilience = [
    "circuitbreaker>=1.4.0",  # For remote validator fault tolerance
]
```

---

## Integration Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                 Bandaid Security Proxy                   │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Existing Security Layers (Fast → Slow)     │ │
│  │  1. Learned Patterns (ChromaDB)        ~10ms      │ │
│  │  2. Regex Patterns                     ~1ms       │ │
│  │  3. NER Validator                      20-30ms    │ │
│  │  4. Llama Guard                        50-80ms    │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │         NEW: Guardrails Layer                      │ │
│  │                                                     │ │
│  │  Input Guards (Pre-LLM):                          │ │
│  │    - DetectPII (on_fail=EXCEPTION)                │ │
│  │    - DetectPromptInjection (on_fail=EXCEPTION)    │ │
│  │                                                     │ │
│  │  Output Guards (Post-LLM):                        │ │
│  │    - DetectPII (on_fail=FIX)                      │ │
│  │    - ToxicLanguage (on_fail=FILTER)               │ │
│  │    - CompetitorCheck (on_fail=FIX)                │ │
│  │                                                     │ │
│  │  Execution: Concurrent where possible             │ │
│  │  Latency Target: <50ms (remote inference)         │ │
│  └────────────────────────────────────────────────────┘ │
│                          ↓                               │
│  ┌────────────────────────────────────────────────────┐ │
│  │         Confidence Score Aggregation               │ │
│  │  - Collect scores from all layers                 │ │
│  │  - Apply LOWEST score (most conservative)         │ │
│  │  - Map Guardrails OnFail → Severity → Confidence  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
           ↓                              ↓
    ✅ Pass (conf > threshold)     ❌ Block (conf ≤ threshold)
           ↓                              ↓
    Forward to LLM              Log + Learn + Return Error
```

### Guardrails Execution Modes

```
┌──────────────────────────────────────────────────────────┐
│             Development / Testing Mode                    │
│                                                            │
│  Bandaid Proxy (Local)                                    │
│       ↓                                                    │
│  Guardrails Validators (Local Execution)                  │
│       ↓                                                    │
│  ML Models (CPU - slower, ~80-150ms per validator)       │
│                                                            │
│  Pros: Simple setup, no additional infrastructure         │
│  Cons: Slower, dependency conflicts possible              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│               Production Mode (Recommended)               │
│                                                            │
│  Bandaid Proxy                                            │
│       ↓                                                    │
│  Guardrails Validators (Remote Inference)                 │
│       ↓ (HTTPS)                                           │
│  Guardrails Hub / Self-Hosted Inference Service          │
│       ↓                                                    │
│  ML Models (GPU - faster, ~10-30ms per validator)        │
│                                                            │
│  Pros: Fast, isolated dependencies, scalable              │
│  Cons: Requires Hub API key or self-hosted infrastructure │
└──────────────────────────────────────────────────────────┘
```

---

## Configuration Strategy

### Guardrails Configuration Schema

```python
# config.py additions
from pydantic import BaseModel, Field
from typing import List, Optional, Literal

class GuardrailsValidatorConfig(BaseModel):
    """Configuration for a single Guardrails validator"""
    validator_id: str  # e.g., "guardrails/detect_pii"
    enabled: bool = True
    severity: Literal["critical", "high", "medium", "low"] = "high"
    on_fail: Literal["exception", "filter", "fix", "reask"] = "exception"
    apply_to: List[Literal["input", "output"]] = ["input", "output"]
    timeout_seconds: int = 10
    use_remote: bool = True
    params: dict = Field(default_factory=dict)  # Validator-specific params

class GuardrailsConfig(BaseModel):
    """Global Guardrails configuration"""
    enabled: bool = False
    hub_token: Optional[str] = None
    hub_api_url: str = "https://hub.api.guardrailsai.com"
    use_remote_inferencing: bool = True
    unsafe_continue_on_error: bool = False  # Skip failed validators
    validators: List[GuardrailsValidatorConfig] = Field(default_factory=list)

# Example configuration
guardrails:
  enabled: true
  hub_token: ${GR_TOKEN}
  use_remote_inferencing: true
  unsafe_continue_on_error: false
  validators:
    - validator_id: "guardrails/detect_pii"
      enabled: true
      severity: "critical"
      on_fail: "exception"
      apply_to: ["input", "output"]
      params:
        pii_entities: "pii"
    - validator_id: "guardrails/toxic_language"
      enabled: true
      severity: "high"
      on_fail: "filter"
      apply_to: ["output"]
      params:
        threshold: 0.5
```

---

## Next Steps

### Phase 1: Design & Contracts

With all research questions resolved, proceed to:

1. **Data Model** (data-model.md):
   - GuardrailsConfig entity
   - ValidatorConfig entity
   - ValidatorExecutionResult entity (extends existing events schema)
   - ValidationPolicy entity

2. **API Contracts** (contracts/):
   - CLI commands for Guardrails management
   - Configuration endpoints (if exposing via API)
   - Validation flow integration points

3. **Quickstart Guide** (quickstart.md):
   - Setup wizard integration
   - Validator installation guide
   - Configuration examples
   - Troubleshooting common issues

4. **Agent Context Update**:
   - Add guardrails-ai to technology stack
   - Update command reference
   - Document new modules

---

## References

### Official Documentation
- Guardrails AI Docs: https://www.guardrailsai.com/docs
- GitHub Repository: https://github.com/guardrails-ai/guardrails
- Validator Hub: https://hub.guardrailsai.com/

### Example Validators
- Detect PII: https://github.com/guardrails-ai/detect_pii
- Toxic Language: https://github.com/guardrails-ai/toxic_language
- Validator Template: https://github.com/guardrails-ai/validator-template

### Integration Guides
- Remote Validation: https://www.guardrailsai.com/docs/concepts/remote_validation
- On-Fail Actions: https://www.guardrailsai.com/docs/concepts/on_fail
- Error Remediation: https://www.guardrailsai.com/docs/concepts/error_remediation
- Async Validation: https://www.guardrailsai.com/docs/concepts/async_validation

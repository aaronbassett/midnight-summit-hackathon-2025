# Bandaid Architecture

## Overview

Bandaid is a local-first LLM security proxy that provides transparent protection for applications using Large Language Models. It acts as a drop-in replacement for LLM provider endpoints, requiring only a single URL change in application configuration.

The system implements a multi-layered security approach combining:
- Pattern-based detection (regex)
- Named Entity Recognition (NER) for PII/secrets
- Policy enforcement via Llama Guard
- Self-learning through vector embeddings
- Real-time observability through a local dashboard

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Application                      │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ HTTP/HTTPS
                                │ (OpenAI-compatible API)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Bandaid Security Proxy                        │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                 FastAPI Application                         │ │
│  │  ┌──────────────────┐  ┌──────────────────┐               │ │
│  │  │  Proxy Endpoints │  │  Dashboard API   │               │ │
│  │  │  /v1/*           │  │  /api/*          │               │ │
│  │  └────────┬─────────┘  └──────────────────┘               │ │
│  └───────────┼──────────────────────────────────────────────────┘ │
│              │                                                     │
│              ▼                                                     │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               LiteLLM Proxy Layer                            │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │ │
│  │  │ Pre-call Hook │  │ LiteLLM Core  │  │ Post-call Hook │  │ │
│  │  │ (Validation)  │  │ (Provider     │  │ (Leak Detect)  │  │ │
│  │  │               │  │  Gateway)     │  │                │  │ │
│  │  └───────┬───────┘  └───────┬───────┘  └────────┬───────┘  │ │
│  └──────────┼──────────────────┼──────────────────┼───────────┘ │
│             │                  │                  │               │
│             ▼                  │                  ▼               │
│  ┌──────────────────────┐     │       ┌──────────────────────┐  │
│  │  Security Validators │     │       │   Leak Detection     │  │
│  │  ┌────────────────┐  │     │       │   (Async)            │  │
│  │  │ Pattern Matcher│◄─┘     │       └──────────────────────┘  │
│  │  │ (ChromaDB)     │        │                                  │
│  │  └────────────────┘        │                                  │
│  │  ┌────────────────┐        │                                  │
│  │  │ NER Validator  │        │                                  │
│  │  │ (bert-base-NER)│        │                                  │
│  │  └────────────────┘        │                                  │
│  │  ┌────────────────┐        │                                  │
│  │  │ Guard Validator│        │                                  │
│  │  │ (Llama-Guard)  │        │                                  │
│  │  └────────────────┘        │                                  │
│  │  ┌────────────────┐        │                                  │
│  │  │ Regex Patterns │        │                                  │
│  │  └────────────────┘        │                                  │
│  └─────────┬──────────────────┘                                  │
│            │                                                      │
│            ▼                                                      │
│  ┌──────────────────────────────────────┐                        │
│  │         Storage Layer                │                        │
│  │  ┌────────────┐  ┌────────────────┐ │                        │
│  │  │   SQLite   │  │   ChromaDB     │ │                        │
│  │  │  (Events)  │  │  (Embeddings)  │ │                        │
│  │  └────────────┘  └────────────────┘ │                        │
│  └──────────────────────────────────────┘                        │
│                                                                   │
│  ┌──────────────────────────────────────┐                        │
│  │      Observability Layer             │                        │
│  │  ┌────────────┐  ┌────────────────┐ │                        │
│  │  │StructLog   │  │    Sentry      │ │                        │
│  │  │ (Logging)  │  │  (Monitoring)  │ │                        │
│  │  └────────────┘  └────────────────┘ │                        │
│  └──────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ OpenAI API
                                ▼
                    ┌─────────────────────┐
                    │   LLM Providers     │
                    │ (OpenAI, Anthropic, │
                    │  Cohere, Google)    │
                    └─────────────────────┘
```

## Component Interactions

### Request Flow (Blocking Validation)

1. **Client → FastAPI**: Client sends LLM request to `/v1/chat/completions`
2. **FastAPI → LiteLLM**: Request routed to LiteLLM proxy layer
3. **Pre-call Hook**: Security validation before forwarding to LLM provider
   - Check ChromaDB for learned attack patterns (vector similarity)
   - Run NER validator for PII/secrets
   - Run Llama Guard for policy violations
   - Execute regex pattern matching
   - Aggregate confidence scores
4. **Decision Point**:
   - If threat detected above threshold → Return 403 error, log to SQLite
   - If safe → Continue to step 5
5. **LiteLLM → Provider**: Forward validated request to LLM provider
6. **Provider → LiteLLM**: Receive response from provider
7. **Post-call Hook**: Check response for data leaks (async, non-blocking)
8. **LiteLLM → Client**: Return response to client

### Streaming Request Flow

1. **Client → FastAPI**: Client sends streaming request (`stream=true`)
2. **Pre-call Hook**: Validate request before streaming starts (same as above)
3. **Decision Point**: Block immediately if threat detected
4. **Streaming Iterator Hook**: Collect chunks as they arrive
5. **Post-stream Processing**: After streaming completes, scan full response for leaks (async)
6. **Alert Generation**: If leak detected, log to SQLite + Sentry (non-blocking)

### Self-Learning Flow (Async)

1. **Threat Detection**: Security validator blocks malicious request
2. **Event Logging**: Write SecurityEvent to SQLite with full context
3. **Background Task**: Async embedder creates vector embedding from blocked content
4. **Pattern Storage**: Store embedding in ChromaDB with metadata
5. **Deduplication**: Check similarity with existing patterns (>0.95 threshold)
6. **Pattern Matching**: Future requests checked against learned patterns first

### Dashboard Flow

1. **User → Browser**: Navigate to `http://localhost:8001/dashboard`
2. **FastAPI → Static Files**: Serve HTML/CSS/JS dashboard UI
3. **Dashboard JS → API**: Fetch stats via `/api/stats`, `/api/events`, `/api/patterns`
4. **API → SQLite/ChromaDB**: Query databases for aggregated data
5. **API → Dashboard**: Return JSON data
6. **Dashboard**: Auto-refresh every 3 seconds

## Key Design Decisions

### Monolithic Architecture

**Decision**: Single Python application with all components in one process

**Rationale**:
- Simplifies deployment (one command to start)
- Reduces operational complexity
- Aligns with "local-first" principle
- No network overhead between components
- Easier to debug and develop

**Trade-offs**:
- Single point of failure (acceptable for single-developer tool)
- Harder to scale horizontally (not a requirement)
- All ML models in-memory (requires more RAM)

### Embedded Databases

**Decision**: Use SQLite (events) and ChromaDB embedded mode (patterns)

**Rationale**:
- No separate database servers to manage
- Data stays local (privacy benefit)
- Simple backup (just copy files)
- Zero configuration required

**Trade-offs**:
- Not suitable for distributed deployments (not a requirement)
- Limited concurrent write performance (acceptable for single user)

### Multi-Layer Security

**Decision**: Four detection layers (patterns, NER, Guard, regex) run in sequence

**Rationale**:
- Defense in depth - multiple chances to catch threats
- Different layers catch different attack types
- Learned patterns provide fastest check
- Regex patterns provide deterministic fallback

**Trade-offs**:
- Higher latency (mitigated by lazy loading, GPU, async logging)
- More complex codebase (justified by security requirements)

### Synchronous Validation, Async Learning

**Decision**: Request validation is synchronous, self-learning is async

**Rationale**:
- Must block malicious requests before they reach LLM
- Learning can happen in background without blocking
- Reduces perceived latency for legitimate requests

**Trade-offs**:
- Patterns not available immediately after detection
- Small window where similar attacks might pass through

### LiteLLM Integration

**Decision**: Use LiteLLM as proxy layer instead of custom integrations

**Rationale**:
- Supports 100+ LLM providers out of the box
- Handles authentication, rate limiting, retries
- Well-tested and maintained
- Reduces code we need to write

**Trade-offs**:
- Dependency on third-party library
- Less control over provider-specific features
- Must work within LiteLLM's hook system

## Data Flow

### Configuration Data

```
config.yaml → ConfigManager → Pydantic Models → Application Components
                    ↓
              Encrypted API Keys (Fernet)
```

### Event Data

```
Security Event → Redactor → SQLite → Dashboard API → UI
                    ↓
                 Sentry (high-severity)
```

### Pattern Learning Data

```
Blocked Request → Embedder → ChromaDB → Pattern Matcher
                             (vector)     (similarity search)
```

## Deployment Model

### Local Development

```bash
# Install
pip install bandaid-security-proxy

# Setup (interactive wizard)
bandaid guardrail setup

# Start
bandaid guardrail start

# View dashboard
bandaid guardrail dashboard
```

### Application Integration

```python
# Before (direct to provider)
import openai
openai.api_base = "https://api.openai.com/v1"

# After (through Bandaid)
import openai
openai.api_base = "http://localhost:8000/v1"
```

### Process Management

- **Foreground Mode**: `bandaid guardrail start` (logs to stdout)
- **Background Mode**: `bandaid guardrail start --daemon` (PID file managed)
- **Stop**: `bandaid guardrail stop` (graceful SIGTERM)
- **Status**: `bandaid guardrail status` (check PID, uptime, stats)

## Performance Characteristics

### Latency Budget

- **Target**: <100ms added latency (p50)
- **Breakdown**:
  - Pattern matching (ChromaDB): <10ms
  - NER validation: 20-30ms
  - Llama Guard: 50-80ms (CPU) or 10-20ms (GPU)
  - Regex patterns: <1ms
  - Event logging (async): 0ms blocking

### Optimization Strategies

1. **Lazy Loading**: ML models loaded on first use
2. **GPU Acceleration**: Auto-detect and use GPU if available
3. **Async Operations**: Logging and learning happen in background
4. **Caching**: ChromaDB maintains in-memory vector index
5. **Efficient Models**: Use quantized/lightweight models (INT8 Llama Guard, MiniLM embeddings)

### Resource Usage

- **RAM**: ~512MB baseline, ~2GB with all models loaded
- **Disk**: ~1GB for 30 days of events (default retention)
- **CPU**: Minimal when idle, spikes during inference
- **GPU**: Optional but recommended for Llama Guard

## Security Considerations

### Data Privacy

- All data stays local (no external services except LLM providers)
- API keys encrypted at rest (Fernet symmetric encryption)
- Sensitive data redacted before logging
- No telemetry or analytics sent to third parties

### Threat Model

**Protected Against**:
- Prompt injection attacks
- Jailbreak attempts
- PII leakage (emails, SSNs, credit cards)
- Financial secret leakage (API keys, private keys, seed phrases)
- Policy violations (hate speech, violence, etc.)

**Not Protected Against**:
- Zero-day LLM vulnerabilities
- Side-channel attacks
- Model extraction attacks
- Network-level attacks (use HTTPS separately)

### Defense in Depth

Layers execute in order of speed and confidence:

1. **Learned Patterns** (fastest, high confidence) - Catches known attacks
2. **Regex Patterns** (fast, deterministic) - Catches structured secrets
3. **NER Validator** (medium, context-aware) - Catches PII and entities
4. **Llama Guard** (slowest, policy-aware) - Catches nuanced violations

## Monitoring and Observability

### Local Dashboard

- Real-time statistics (blocked/allowed requests)
- Event log with filtering (by threat type, severity, time)
- Learned pattern insights (top patterns, detection counts)
- Configuration status (providers, ports, disabled checks)

### Sentry Integration

- High-severity events sent to Sentry
- Error tracking and alerting
- Performance monitoring
- Optional (disabled by default)

### Structured Logging

- JSON-formatted logs via structlog
- Log levels: DEBUG, INFO, WARNING, ERROR
- Contextual data included (request_id, threat_type, confidence)
- Logs written to stdout and file

## Extension Points

### Custom Validators

Implement `BaseValidator` interface:

```python
from bandaid.security.validators import BaseValidator

class CustomValidator(BaseValidator):
    async def validate(self, content: str) -> ValidationResult:
        # Custom validation logic
        pass
```

Register in `validators.py` orchestrator.

### Custom Patterns

Add regex patterns to `src/bandaid/security/patterns.py`:

```python
CUSTOM_PATTERNS = [
    Pattern(
        name="my_custom_secret",
        regex=r"...",
        threat_type="custom_secret",
        confidence=0.95,
    )
]
```

### Custom Llama Guard Policies

Edit `config/blockchain-policy.txt` to define custom policies:

```text
<BEGIN UNSAFE CONTENT CATEGORIES>
O1: Custom Category
Custom category description
...
```

### Dashboard Extensions

Add custom endpoints in `src/bandaid/dashboard/api.py`:

```python
@router.get("/api/custom")
async def custom_endpoint():
    # Custom dashboard data
    pass
```

Update `static/app.js` to fetch and display data.

## Testing Strategy

### Integration Tests

- End-to-end proxy flow tests
- Multi-layer security detection tests
- Self-learning flow tests
- Dashboard API tests

### Unit Tests

- Individual validator tests
- Confidence threshold logic tests
- Redaction utility tests
- CLI command tests

### Test Environment

- Mock LLM responses for deterministic tests
- In-memory SQLite for fast test execution
- Test fixtures for attack prompts and responses

## Failure Modes and Recovery

### Model Loading Failures

- **Symptom**: Models fail to load from HuggingFace
- **Recovery**: Download models manually via `download_models.py` script
- **Prevention**: Validate model cache during setup wizard

### Database Corruption

- **Symptom**: SQLite errors on query
- **Recovery**: Delete `events.db`, restarts with fresh schema
- **Prevention**: Regular backups (copy `.db` file)

### Provider API Failures

- **Symptom**: LLM requests fail with 401/429/500
- **Recovery**: Check API key, rate limits, provider status
- **Prevention**: Provider validation on startup (T100)

### High Latency

- **Symptom**: Requests take >1s to complete
- **Recovery**: Enable GPU, reduce confidence thresholds, disable slow validators
- **Prevention**: Performance benchmarks during setup

### Memory Exhaustion

- **Symptom**: OOM errors with large traffic
- **Recovery**: Increase system RAM, reduce model count, enable log retention cleanup
- **Prevention**: Monitor memory usage via dashboard

## Future Architecture Considerations

### Potential Enhancements (Not in Current Scope)

- Distributed deployment (multiple proxies with shared ChromaDB)
- Fine-tuned models for domain-specific threats
- Real-time pattern sharing across instances
- Advanced rate limiting and quotas
- Multi-tenant support with isolation
- Plugin system for third-party validators

### Architectural Debt

- No connection pooling for LLM providers (handled by LiteLLM)
- Limited test coverage for streaming edge cases
- Dashboard requires full page refresh for config changes
- No graceful degradation if models fail to load

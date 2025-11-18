# Implementation Plan: Bandaid - LLM Security Proxy

**Branch**: `001-llm-security-proxy` | **Date**: 2025-11-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-llm-security-proxy/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a local-first, transparent LLM security proxy that protects applications from prompt injection, data leakage, and AI-specific threats through multi-layered detection, self-learning capabilities, and frictionless developer integration. The system acts as a drop-in replacement for LLM provider endpoints, requiring only a single URL change in application configuration.

The technical approach uses a monolithic Python application built on FastAPI that mounts LiteLLM as a unified gateway to support multiple LLM providers. Security validation happens through synchronous multi-layer detection (NER for PII/secrets, Llama Guard for policy enforcement) with asynchronous self-learning (vector embeddings stored in ChromaDB). All events are logged to SQLite with a local web dashboard for real-time observability.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: FastAPI, LiteLLM, transformers (Llama-Guard-3-8B), dslim/bert-base-NER, sentence-transformers (all-MiniLM-L6-v2), ChromaDB (embedded), SQLite, Typer/Click, Sentry SDK
**Storage**: SQLite (event logging, statistics), ChromaDB embedded (vector embeddings for self-learning)
**Testing**: pytest (integration tests with real LLM API calls), pytest-asyncio (async FastAPI testing)
**Target Platform**: Local development machine (macOS, Linux, Windows), Python 3.11+ required
**Project Type**: Single application (monolithic Python with CLI)
**Performance Goals**: <100ms latency overhead (50th percentile), 100+ concurrent requests, <1s dashboard refresh
**Constraints**: Must run entirely locally without external services (except LLM providers), <512MB RAM baseline, <1GB disk for 30 days of logs
**Scale/Scope**: Single developer per proxy instance, ~1000 requests/day typical usage, support all LiteLLM-compatible providers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

### ✅ I. Ship Fast, Fix What Hurts
- **Compliant**: Monolithic architecture enables fast shipping
- **Compliant**: Dogfooding requirement built into success criteria (SC-001: 10-minute setup)
- **Compliant**: Simple CLI commands prioritize usability over complex orchestration

### ✅ II. Build for Joy, Not Scale
- **Compliant**: Designed for single-developer use, not enterprise scale
- **Compliant**: Local-first with zero external dependencies for core functionality
- **Compliant**: Web dashboard provides immediate, delightful feedback

### ✅ III. Simplicity & Pragmatism (KISS & YAGNI)
- **Compliant**: Single monolithic Python application (no microservices)
- **Compliant**: Embedded databases (SQLite, ChromaDB) - no separate database servers
- **Compliant**: LiteLLM handles provider abstraction - we don't build custom integrations
- **Note**: Four ML models in-process might seem complex, but each serves a distinct, required purpose per spec requirements

### ⚠️ IV. Make It Work, Then Make It Fast
- **Requires Justification**: Spec mandates <100ms latency (FR-040) from day one, requiring performance-conscious design upfront
- **Justification**: Security tools must not degrade user experience. Blocking adds inherent latency; we must minimize it through efficient model loading and async logging
- **Mitigation**: Use lightweight models (bert-base-NER, MiniLM), async background processing for non-blocking operations

### ✅ V. Modularity & Single Responsibility
- **Compliant**: Clear separation: FastAPI (server), LiteLLM (proxy), validators (security), CLI (management), dashboard (UI)
- **Compliant**: Each security layer has single purpose (NER for secrets, Guard for policy, embeddings for learning)

### ✅ VI. User Experience First
- **Compliant**: Interactive setup wizard (guardrail setup)
- **Compliant**: One command to start (guardrail start)
- **Compliant**: Clear error messages with actionable guidance (FR-047, FR-039)
- **Compliant**: Local dashboard for immediate feedback

### Constitution Compliance Summary

**Status**: ✅ **APPROVED with Performance Justification**

The design aligns with constitutional principles. The only deviation is the performance-first approach for latency, which is justified by the security domain's requirement to be transparent and non-disruptive. The 100ms target is conservative and achievable with efficient model selection.

## Project Structure

### Documentation (this feature)

```text
specs/001-llm-security-proxy/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - technology decisions
├── data-model.md        # Phase 1 output - entities and schemas
├── quickstart.md        # Phase 1 output - getting started guide
├── contracts/           # Phase 1 output - API contracts
│   ├── proxy-api.yaml   # OpenAPI spec for proxy endpoints
│   ├── dashboard-api.yaml # OpenAPI spec for dashboard API
│   └── cli-spec.md      # CLI command specifications
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
bandaid/
├── src/
│   ├── bandaid/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI application entry point
│   │   ├── cli.py                   # Typer CLI application
│   │   ├── config.py                # Configuration management
│   │   │
│   │   ├── proxy/
│   │   │   ├── __init__.py
│   │   │   ├── server.py            # FastAPI server setup with LiteLLM
│   │   │   ├── hooks.py             # LiteLLM pre/post call hooks
│   │   │   └── routes.py            # Additional FastAPI routes (health, etc.)
│   │   │
│   │   ├── security/
│   │   │   ├── __init__.py
│   │   │   ├── validators.py        # Orchestrator for all validators
│   │   │   ├── ner_validator.py     # NER-based PII/secret detection
│   │   │   ├── guard_validator.py   # Llama Guard policy enforcement
│   │   │   ├── confidence.py        # Tiered confidence threshold logic
│   │   │   └── redactor.py          # Data redaction utilities
│   │   │
│   │   ├── learning/
│   │   │   ├── __init__.py
│   │   │   ├── embedder.py          # Sentence transformer embeddings
│   │   │   ├── pattern_store.py     # ChromaDB interface for patterns
│   │   │   └── matcher.py           # Vector similarity matching
│   │   │
│   │   ├── storage/
│   │   │   ├── __init__.py
│   │   │   ├── events_db.py         # SQLite event logging
│   │   │   ├── migrations.py        # Database schema migrations
│   │   │   └── queries.py           # SQL queries for dashboard
│   │   │
│   │   ├── dashboard/
│   │   │   ├── __init__.py
│   │   │   ├── api.py               # FastAPI routes for dashboard data
│   │   │   ├── static/              # HTML/CSS/JS for dashboard UI
│   │   │   │   ├── index.html
│   │   │   │   ├── styles.css
│   │   │   │   └── app.js
│   │   │   └── templates/           # Jinja2 templates if needed
│   │   │
│   │   ├── observability/
│   │   │   ├── __init__.py
│   │   │   ├── sentry.py            # Sentry integration
│   │   │   └── logger.py            # Structured logging configuration
│   │   │
│   │   └── models/
│   │       ├── __init__.py
│   │       ├── events.py            # Event data models (Pydantic)
│   │       ├── patterns.py          # Attack pattern models
│   │       └── config.py            # Configuration models
│   │
│   └── scripts/
│       ├── download_models.py       # Pre-download HuggingFace models
│       └── validate_setup.py        # Validate dependencies and models
│
├── tests/
│   ├── conftest.py                  # Pytest fixtures
│   ├── integration/
│   │   ├── test_proxy_flow.py       # End-to-end proxy tests
│   │   ├── test_security_layers.py  # Multi-layer detection tests
│   │   ├── test_self_learning.py    # Self-learning flow tests
│   │   └── test_dashboard.py        # Dashboard API tests
│   ├── unit/
│   │   ├── test_validators.py       # Individual validator tests
│   │   ├── test_confidence.py       # Confidence threshold tests
│   │   ├── test_redactor.py         # Redaction logic tests
│   │   └── test_cli.py              # CLI command tests
│   └── fixtures/
│       ├── test_prompts.py          # Test attack prompts
│       ├── test_responses.py        # Test LLM responses
│       └── mock_models.py           # Mock model responses
│
├── docs/
│   ├── architecture.md              # System architecture overview
│   ├── security-layers.md           # Security layer details
│   └── developer-guide.md           # Development setup guide
│
├── config/
│   ├── config.yaml.example          # Example configuration file
│   └── blockchain-policy.txt        # Custom Llama Guard policy
│
├── pyproject.toml                   # Poetry/pip dependencies
├── setup.py                         # Package setup
├── README.md                        # Project README
├── .env.example                     # Example environment variables
└── .gitignore
```

**Structure Decision**: Single application structure chosen because:
1. All components run in a single Python process (monolithic by design)
2. No frontend/backend split - dashboard is served by same FastAPI server
3. Simplifies deployment (one command to start everything)
4. Aligns with Constitution Principle III (simplicity) and anti-goal of "complex setup"

## Complexity Tracking

No constitutional violations requiring justification. The performance-first approach (Constitution IV) is justified by domain requirements, not complexity creep.

---

## Phase 0: Research & Technology Validation

**Goal**: Validate technology choices, resolve any unknowns, and document decisions.

### Research Tasks

1. **LiteLLM Integration Patterns**
   - Verify LiteLLM hook mechanisms (pre_call_hook, post_call_hook, callbacks)
   - Test streaming support with hooks enabled
   - Confirm multi-provider configuration approach
   - Document any limitations or gotchas

2. **Model Selection & Performance**
   - Benchmark NER model latency (dslim/bert-base-NER vs alternatives)
   - Benchmark Llama-Guard-3-8B inference time on CPU vs GPU
   - Verify sentence-transformers (all-MiniLM-L6-v2) embedding speed
   - Test combined latency of all models in sequence

3. **ChromaDB Embedded Mode**
   - Verify in-process (no server) mode works as documented
   - Test persistence across process restarts
   - Benchmark vector similarity search performance
   - Document storage size growth patterns

4. **FastAPI + LiteLLM Integration**
   - Verify LiteLLM can be mounted as FastAPI middleware/routes
   - Test concurrent request handling
   - Confirm streaming response compatibility
   - Document configuration approach

5. **PII/Secret Detection Patterns**
   - Research regex patterns for blockchain addresses (Ethereum, Bitcoin, etc.)
   - Research patterns for private keys and seed phrases
   - Identify NER model limitations for financial secrets
   - Plan fallback regex patterns where NER insufficient

### Decisions to Document in research.md

- Final model selections with performance benchmarks
- LiteLLM integration approach (middleware vs mount)
- Confidence threshold defaults (high/medium/low boundaries)
- Event retention policy implementation approach
- CLI process management approach (PID file vs service)

---

## Phase 1: Design & Contracts

**Prerequisites**: research.md completed with all decisions documented

### 1. Data Model (data-model.md)

**Entities to Define**:

1. **SecurityEvent**
   - Fields: id, timestamp, event_type, threat_type, confidence_level, request_id, redacted_content, severity_level, detection_layer, learned_pattern_id
   - Relationships: N/A (flat event log)
   - State Transitions: N/A
   - Validation Rules: Required fields per FR-023 to FR-032

2. **AttackPattern**
   - Fields: id, pattern_signature (vector embedding), detection_count, first_seen, last_seen, threat_types[], source_event_id
   - Relationships: References SecurityEvent (source)
   - State Transitions: N/A
   - Validation Rules: Unique embeddings, non-negative counts

3. **Configuration**
   - Fields: proxy_port, dashboard_port, provider_configs[], sentry_dsn, log_retention_days, confidence_thresholds, disabled_checks[]
   - Relationships: N/A
   - State Transitions: Modified via CLI or config file, requires restart
   - Validation Rules: Port ranges, valid provider names, threshold ranges [0-1]

4. **Request (transient, not persisted)**
   - Fields: request_id, timestamp, source_app, provider_target, headers, body, validation_results[]
   - Used for: In-memory processing, logged as SecurityEvent

5. **Response (transient, not persisted)**
   - Fields: request_id, timestamp, body, leak_detections[]
   - Used for: In-memory processing, logged as SecurityEvent if leaks detected

### 2. API Contracts (contracts/)

#### proxy-api.yaml (OpenAPI 3.0)

Endpoints:
- `POST /v1/chat/completions` - OpenAI-compatible chat completions (proxied via LiteLLM)
- `POST /v1/completions` - OpenAI-compatible completions (proxied via LiteLLM)
- `POST /v1/embeddings` - OpenAI-compatible embeddings (proxied via LiteLLM)
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus-style metrics (optional)

Error Responses:
- 403 Forbidden - Threat detected, request blocked
  - Body: `{"error": "threat_detected", "threat_type": "prompt_injection", "confidence": 0.95, "request_id": "uuid"}`
- 500 Internal Server Error - Validation error or proxy error

#### dashboard-api.yaml (OpenAPI 3.0)

Endpoints:
- `GET /api/stats` - Dashboard statistics (total requests, blocked count, threat breakdown)
- `GET /api/events` - Paginated event log (supports filters: type, time_range, severity, confidence)
- `GET /api/patterns` - Learned attack patterns (count, most common)
- `GET /dashboard` - Serve static dashboard HTML

Response Models:
- Stats: `{total_requests, blocked_count, allowed_count, threat_breakdown: {type: count}}`
- Events: `{events: [{SecurityEvent}], total, page, per_page}`
- Patterns: `{patterns: [{id, threat_types, detection_count, first_seen}], total}`

#### cli-spec.md

Commands:
- `guardrail setup` - Interactive wizard for API keys, ports, Sentry DSN (optional)
- `guardrail start` - Start proxy server (detach to background or foreground mode)
- `guardrail stop` - Stop proxy server (find PID and terminate gracefully)
- `guardrail validate` - Validate configuration, check API keys, test model loading
- `guardrail dashboard` - Open http://localhost:{dashboard_port}/dashboard in browser
- `guardrail config show` - Display current configuration
- `guardrail config set <key> <value>` - Update configuration value

Exit Codes:
- 0: Success
- 1: General error
- 2: Configuration error
- 3: Model loading error
- 4: API key validation error

### 3. Quickstart Guide (quickstart.md)

Sections:
1. **Installation** - `pip install bandaid` or clone + `poetry install`
2. **Initial Setup** - Run `guardrail setup`, enter API keys
3. **Start Proxy** - Run `guardrail start`, verify running on localhost:8000
4. **Test Integration** - Example: change `OPENAI_BASE_URL` to `http://localhost:8000/v1`
5. **View Dashboard** - Run `guardrail dashboard`, explore stats
6. **Test Attack Detection** - Send test prompt with injection, verify block
7. **Configuration** - Edit config file to disable checks for testing
8. **Troubleshooting** - Common issues and solutions

### 4. Agent Context Update

Run: `.specify/scripts/bash/update-agent-context.sh claude`

Technologies to add:
- FastAPI (web framework)
- LiteLLM (LLM proxy gateway)
- ChromaDB (vector database, embedded mode)
- transformers (HuggingFace, for Llama Guard and NER)
- sentence-transformers (for embeddings)
- Typer/Click (CLI framework)
- Sentry SDK (error monitoring)

---

## Phase 2: Task Generation (NOT DONE BY /speckit.plan)

**This phase is executed by `/speckit.tasks` command separately.**

The task generation will break down implementation into ordered tasks based on:
- User stories prioritized as P1 > P2 > P3
- Dependencies between components (e.g., models before validators)
- Constitution principle: Ship Fast, Fix What Hurts (working proxy first, then features)

Expected task structure:
1. **Foundation** - Project setup, dependencies, basic FastAPI server
2. **Proxy Integration** - LiteLLM mounting, basic passthrough
3. **Security Layers** - NER validator, Llama Guard validator, confidence logic
4. **Self-Learning** - Embedding generation, ChromaDB storage, pattern matching
5. **Observability** - SQLite logging, Sentry integration, dashboard API
6. **Dashboard UI** - Static HTML/JS/CSS for local dashboard
7. **CLI** - Command implementations, process management
8. **Testing** - Integration tests, attack test suite, performance validation
9. **Documentation** - README, architecture docs, developer guide

---

## Success Criteria Validation

Mapping plan to success criteria from spec.md:

- **SC-001** (10-minute setup): Addressed by interactive `guardrail setup` wizard and single-command start
- **SC-002** (OWASP LLM Top 10): Addressed by Llama Guard policy and test suite in Phase 2
- **SC-003** (Blockchain attacks): Addressed by custom NER patterns and Llama Guard blockchain policy
- **SC-004** (Self-learning demo): Addressed by ChromaDB pattern storage and vector matching
- **SC-005** (1-second dashboard): Addressed by SQLite queries and static dashboard with async refresh
- **SC-006** (<100ms latency): Addressed by model selection research and async logging
- **SC-007** (100 concurrent requests): Addressed by FastAPI async capabilities and benchmarking
- **SC-008** (Streaming support): Addressed by LiteLLM streaming + hook compatibility
- **SC-009** (100% redaction): Addressed by redactor module and validation tests
- **SC-010** (Clear error messages): Addressed by CLI error handling and FR-047
- **SC-011** (95% PII detection): Addressed by NER model + regex fallbacks
- **SC-012** (95% secrets detection): Addressed by custom NER training/patterns + regex
- **SC-013** (<100MB for 30 days): Addressed by log rotation (FR-042) and monitoring

---

## Next Steps

1. ✅ **Phase 0 Complete**: Research tasks documented above
2. ⏭️ **Generate research.md**: Execute research tasks and document decisions
3. ⏭️ **Phase 1**: Generate data-model.md, contracts/, quickstart.md
4. ⏭️ **Update agent context**: Run update script with new technologies
5. ⏭️ **Phase 2**: Run `/speckit.tasks` to generate implementation tasks

**Command to Continue**: Proceed with Phase 0 research task execution.

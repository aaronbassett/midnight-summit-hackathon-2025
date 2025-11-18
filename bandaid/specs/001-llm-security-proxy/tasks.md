# Tasks: Bandaid - LLM Security Proxy

**Input**: Design documents from `/specs/001-llm-security-proxy/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: Not explicitly requested in spec.md - focusing on implementation tasks only

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3, etc.)
- All file paths are absolute from repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create basic project structure and configuration

- [X] T001 Create project directory structure per plan.md at bandaid/src/bandaid/
- [X] T002 Initialize Python project with pyproject.toml and dependencies (fastapi, litellm, transformers, chromadb, etc.)
- [X] T003 [P] Create .gitignore file with Python/ML model exclusions
- [X] T004 [P] Create README.md with project overview and quick start
- [X] T005 [P] Setup ruff and black configuration for linting/formatting
- [X] T006 [P] Create pytest.ini and conftest.py for test configuration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story implementation

**⚠️ CRITICAL**: All user stories depend on this phase

- [X] T007 Create configuration management system in src/bandaid/config.py (Pydantic models, TOML loading, env var interpolation)
- [X] T008 [P] Create base logging infrastructure in src/bandaid/observability/logger.py (structlog configuration)
- [X] T009 [P] Create Sentry integration module in src/bandaid/observability/sentry.py
- [X] T010 [P] Create Pydantic models for events in src/bandaid/models/events.py (SecurityEvent, ValidationResult)
- [X] T011 [P] Create Pydantic models for patterns in src/bandaid/models/patterns.py (AttackPattern)
- [X] T012 [P] Create Pydantic models for config in src/bandaid/models/config.py (Configuration, ProviderConfig, ConfidenceThresholds)
- [X] T013 Setup SQLite database with schema in src/bandaid/storage/events_db.py (create tables, indexes)
- [X] T014 [P] Setup ChromaDB persistent client in src/bandaid/learning/pattern_store.py (collection creation)
- [X] T015 [P] Create database migrations framework in src/bandaid/storage/migrations.py
- [X] T016 [P] Create example configuration file at config/config.yaml.example
- [X] T017 [P] Bundle BIP39 wordlist at src/bandaid/data/bip39-english.txt
- [X] T018 [P] Bundle Llama Guard blockchain policy at config/blockchain-policy.txt

**✅ Checkpoint**: Foundation complete - user story implementation can now begin

---

## Phase 3: User Story 1 - Initial Setup and Basic Protection (Priority: P1) 🎯 MVP

**Goal**: Enable 10-minute setup and immediately protect applications from basic threats with transparent proxying

**Independent Test**: Run setup command, configure API endpoint to proxy, send test prompt injection, verify block while legitimate requests pass through

### Core Models & Data Layer for US1

- [X] T019 [P] [US1] Create Request transient model in src/bandaid/models/events.py (request_id, timestamp, headers, body, validation_results)
- [X] T020 [P] [US1] Create Response transient model in src/bandaid/models/events.py (request_id, timestamp, body, leak_detections)

### Security Detection Layer for US1

- [X] T021 [P] [US1] Implement regex patterns for prompt injection in src/bandaid/security/patterns.py (common injection patterns)
- [X] T022 [P] [US1] Implement NER validator initialization in src/bandaid/security/ner_validator.py (load dslim/bert-base-NER model)
- [X] T023 [US1] Implement NER-based threat detection in src/bandaid/security/ner_validator.py (validate method, entity extraction)
- [X] T024 [P] [US1] Implement Llama Guard validator initialization in src/bandaid/security/guard_validator.py (load Llama-Guard-3-8B-INT8, lazy-load)
- [X] T025 [US1] Implement Guard policy enforcement in src/bandaid/security/guard_validator.py (validate method, blockchain policy)
- [X] T026 [P] [US1] Implement confidence threshold logic in src/bandaid/security/confidence.py (high/medium/low tiers, action mapping)
- [X] T027 [US1] Implement validation orchestrator in src/bandaid/security/validators.py (coordinate NER + Guard + patterns, aggregate confidence)

### LiteLLM Integration & Proxy Layer for US1

- [X] T028 [US1] Create FastAPI application in src/bandaid/main.py (app initialization, CORS, middleware)
- [X] T029 [P] [US1] Create LiteLLM pre-call hook in src/bandaid/proxy/hooks.py (async_pre_call_hook, call validators)
- [X] T030 [P] [US1] Create LiteLLM post-call hook in src/bandaid/proxy/hooks.py (async_post_call_hook placeholder for US2)
- [X] T031 [US1] Implement proxy server with LiteLLM in src/bandaid/proxy/server.py (mount LiteLLM routes, configure providers)
- [X] T032 [US1] Implement /v1/chat/completions endpoint in src/bandaid/proxy/routes.py (OpenAI-compatible, use LiteLLM acompletion)
- [X] T033 [P] [US1] Implement /health endpoint in src/bandaid/proxy/routes.py (model status, provider connectivity)
- [X] T034 [P] [US1] Implement /metrics endpoint in src/bandaid/proxy/routes.py (Prometheus-style metrics)

### Event Logging for US1

- [X] T035 [P] [US1] Implement SQLite event insertion in src/bandaid/storage/events_db.py (async insert, batch support)
- [X] T036 [US1] Integrate event logging into validation flow in src/bandaid/security/validators.py (log blocked/allowed events)

### CLI Setup Command for US1

- [X] T037 [US1] Create CLI application structure in src/bandaid/cli.py (Typer app initialization)
- [X] T038 [P] [US1] Implement interactive setup wizard in src/bandaid/cli.py (guardrail setup command)
- [X] T039 [US1] Implement API key encryption in src/bandaid/cli.py (Fernet encryption, store in config)
- [X] T040 [P] [US1] Implement model download validation in src/bandaid/cli.py (check HuggingFace cache, download if needed)
- [X] T041 [P] [US1] Implement guardrail start command in src/bandaid/cli.py (PID file management, foreground/background modes)
- [X] T042 [P] [US1] Implement guardrail stop command in src/bandaid/cli.py (graceful shutdown, SIGTERM handling)

### Dashboard Foundation for US1

- [X] T043 [P] [US1] Create basic dashboard API routes in src/bandaid/dashboard/api.py (FastAPI router)
- [X] T044 [P] [US1] Implement /api/stats endpoint in src/bandaid/dashboard/api.py (aggregate statistics query)
- [X] T045 [P] [US1] Implement /api/events endpoint in src/bandaid/dashboard/api.py (paginated events, filtering)
- [X] T046 [US1] Create static HTML dashboard in src/bandaid/dashboard/static/index.html (basic layout, stats display, event log)
- [X] T047 [P] [US1] Create dashboard CSS in src/bandaid/dashboard/static/styles.css (responsive design)
- [X] T048 [P] [US1] Create dashboard JavaScript in src/bandaid/dashboard/static/app.js (fetch stats/events, auto-refresh)

**Checkpoint**: User Story 1 complete - setup, basic protection, transparent proxying, and simple dashboard all functional

---

## Phase 4: User Story 2 - PII and Financial Secret Detection (Priority: P1)

**Goal**: Automatically detect and block PII/financial secrets in requests, alert on data leaks in responses

**Independent Test**: Send requests with test PII (emails, SSNs, credit cards) and financial secrets (API keys, wallet addresses, private keys), verify blocking; send requests that cause LLM to generate such data, verify alerts logged

### Enhanced NER & Pattern Detection for US2

- [X] T049 [P] [US2] Implement regex patterns for blockchain addresses in src/bandaid/security/patterns.py (Ethereum, Bitcoin legacy/SegWit)
- [X] T050 [P] [US2] Implement regex patterns for private keys in src/bandaid/security/patterns.py (Ethereum hex, Bitcoin WIF)
- [X] T051 [P] [US2] Implement BIP39 seed phrase detection in src/bandaid/security/patterns.py (dictionary-based matching, 12/18/24 words)
- [X] T052 [P] [US2] Implement regex patterns for API keys in src/bandaid/security/patterns.py (common formats: sk-, pk_, api_key, etc.)
- [X] T053 [US2] Extend NER validator for financial secrets in src/bandaid/security/ner_validator.py (combine NER + regex patterns)

### Response Scanning for US2

- [X] T054 [US2] Implement response leak detection in src/bandaid/proxy/hooks.py (async_post_call_hook, scan for PII/secrets)
- [X] T055 [US2] Implement data leak alerting in src/bandaid/proxy/hooks.py (log to SQLite + Sentry, don't block response)

### Redaction System for US2

- [X] T056 [P] [US2] Implement redaction utilities in src/bandaid/security/redactor.py (mask PII, mask secrets, mask emails)
- [X] T057 [US2] Integrate redaction into event logging in src/bandaid/security/validators.py (redact before storing)
- [X] T058 [US2] Integrate redaction into Sentry events in src/bandaid/observability/sentry.py (redact before sending)

### Dashboard Enhancements for US2

- [X] T059 [US2] Update dashboard stats to include PII/secret breakdowns in src/bandaid/dashboard/api.py (threat_type aggregation)
- [X] T060 [P] [US2] Update dashboard UI to display data leak alerts in src/bandaid/dashboard/static/index.html (separate section for leaks)
- [X] T061 [P] [US2] Add severity-based color coding in src/bandaid/dashboard/static/styles.css (critical=red, high=orange, etc.)

**Checkpoint**: User Story 2 complete - PII/financial secret detection, data leak alerts, redaction all functional

---

## Phase 5: User Story 3 - Self-Learning Threat Detection (Priority: P2)

**Goal**: Learn from detected attacks and automatically block similar variants

**Independent Test**: Send novel attack variant that initially passes, verify learning mechanism captures it, send similar variants and verify automatic blocking

### Embedding & Pattern Storage for US3

- [X] T062 [P] [US3] Implement sentence embedder in src/bandaid/learning/embedder.py (load all-MiniLM-L6-v2, generate embeddings)
- [X] T063 [P] [US3] Implement ChromaDB pattern storage in src/bandaid/learning/pattern_store.py (add patterns, query similar)
- [X] T064 [US3] Implement pattern similarity matching in src/bandaid/learning/matcher.py (cosine similarity search, threshold 0.85)

### Self-Learning Integration for US3

- [X] T065 [US3] Implement async pattern learning in src/bandaid/learning/embedder.py (background task to create embeddings from blocked events)
- [X] T066 [US3] Integrate embedding matcher into validation flow in src/bandaid/security/validators.py (check ChromaDB before other validators)
- [X] T067 [US3] Implement pattern deduplication in src/bandaid/learning/pattern_store.py (check similarity > 0.95, increment count if duplicate)
- [X] T068 [US3] Update event logging to track learned pattern IDs in src/bandaid/security/validators.py (learned_pattern_id parameter)

### Dashboard Pattern Insights for US3

- [X] T069 [P] [US3] Implement /api/patterns endpoint in src/bandaid/dashboard/api.py (query ChromaDB metadata, sort by detection_count)
- [X] T070 [P] [US3] Add learned patterns section to dashboard in src/bandaid/dashboard/static/index.html (top patterns, detection counts)
- [X] T071 [P] [US3] Add pattern visualization in src/bandaid/dashboard/static/app.js (fetch patterns, display with stats)

**Checkpoint**: User Story 3 complete - self-learning, pattern matching, adaptive defense all functional (UI patterns section exists but hidden by default)

---

## Phase 6: User Story 4 - Local Dashboard and Observability (Priority: P2)

**Goal**: Real-time statistics and security events through local web dashboard with central monitoring integration

**Independent Test**: Generate security events (blocked requests, data leak alerts), access dashboard, verify statistics accuracy, filter events, confirm Sentry integration

### Advanced Dashboard Features for US4

- [X] T072 [P] [US4] Implement event filtering in src/bandaid/dashboard/api.py (by event_type, threat_type, severity, confidence, time_range)
- [X] T073 [P] [US4] Implement pagination in src/bandaid/dashboard/api.py (page, per_page, total_pages)
- [X] T074 [P] [US4] Implement /api/config endpoint in src/bandaid/dashboard/api.py (display non-sensitive config)

### Dashboard UI Polish for US4

- [X] T075 [P] [US4] Add event filtering controls to dashboard in src/bandaid/dashboard/static/index.html (dropdowns, date pickers)
- [X] T076 [P] [US4] Add pagination controls to event log in src/bandaid/dashboard/static/index.html (prev/next buttons)
- [X] T077 [P] [US4] Add auto-refresh functionality in src/bandaid/dashboard/static/app.js (poll /api/stats every 3s)
- [X] T078 [P] [US4] Add configuration status display in src/bandaid/dashboard/static/index.html (ports, providers, disabled checks)

### Sentry Integration for US4

- [X] T079 [US4] Implement Sentry event sending in src/bandaid/observability/sentry.py (send blocked events, data leaks, errors)
- [X] T080 [US4] Integrate Sentry into validation flow in src/bandaid/security/validators.py (send high-severity events)

### CLI Dashboard Command for US4

- [X] T081 [P] [US4] Implement guardrail dashboard command in src/bandaid/cli_commands/dashboard.py (open http://localhost:8001/dashboard in browser)

**Checkpoint**: User Story 4 complete - full dashboard, observability, Sentry integration all functional

---

## Phase 7: User Story 5 - CLI Management (Priority: P3)

**Goal**: Simple command-line tools to manage proxy lifecycle without manual process management

**Independent Test**: Run each CLI command independently, verify expected outcomes (start/stop, validation, dashboard opens)

### Additional CLI Commands for US5

- [X] T082 [P] [US5] Implement guardrail validate command in src/bandaid/cli.py (check config, models, providers, with --check-models and --check-providers flags)
- [X] T083 [P] [US5] Implement guardrail config show command in src/bandaid/cli.py (display config, support --format json/yaml, --show-keys)
- [X] T084 [P] [US5] Implement guardrail config set command in src/bandaid/cli.py (update config values, validate, warn if restart needed)
- [X] T085 [P] [US5] Implement guardrail status command in src/bandaid/cli.py (show runtime stats, PID, uptime, recent activity)

### CLI Error Handling & UX for US5

- [X] T086 [US5] Implement clear error messages for all CLI commands in src/bandaid/cli.py (actionable guidance, no generic errors)
- [X] T087 [P] [US5] Implement shell completion generation in src/bandaid/cli.py (--install-completion for bash/zsh/fish)
- [X] T088 [P] [US5] Add rich formatting to CLI output in src/bandaid/cli.py (colors, tables, progress bars)

**Checkpoint**: User Story 5 complete - comprehensive CLI with excellent UX

---

## Phase 8: User Story 6 - Streaming Support (Priority: P1)

**Goal**: Support streaming LLM responses transparently through the proxy

**Independent Test**: Send streaming request through proxy, verify chunks arrive progressively matching direct LLM behavior

### Streaming Implementation for US6

- [X] T089 [US6] Implement streaming support in LiteLLM integration in src/bandaid/proxy/server.py (stream=True parameter handling)
- [X] T090 [US6] Implement streaming validation in pre-call hook in src/bandaid/proxy/hooks.py (validate before streaming starts)
- [X] T091 [US6] Implement async streaming iterator hook in src/bandaid/proxy/hooks.py (async_post_call_streaming_iterator_hook, collect chunks)
- [X] T092 [US6] Implement post-stream leak detection in src/bandaid/proxy/hooks.py (scan complete response after streaming, async alert)
- [X] T093 [P] [US6] Implement /v1/completions streaming in src/bandaid/proxy/server.py (legacy completions endpoint)
- [X] T094 [P] [US6] Update /v1/chat/completions for streaming in src/bandaid/proxy/server.py (ensure streaming works)

**Checkpoint**: User Story 6 complete - streaming fully supported with security validation

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final touches, documentation, and system-wide improvements

### Documentation

- [X] T095 [P] Write architecture documentation in docs/architecture.md (system overview, component interactions)
- [X] T096 [P] Write security layers documentation in docs/security-layers.md (NER, Guard, embeddings, how they work together)
- [X] T097 [P] Write developer guide in docs/developer-guide.md (development setup, testing, contributing)
- [X] T098 Update README.md with installation, quick start, and links to docs

### Additional Endpoints & Features

- [X] T099 [P] Implement /v1/embeddings endpoint in src/bandaid/proxy/server.py (OpenAI-compatible embeddings)
- [X] T100 [P] Add provider configuration validation in src/bandaid/config.py (test API keys on startup)

### System Robustness

- [X] T101 [P] Implement graceful shutdown handlers in src/bandaid/main.py (SIGTERM, SIGINT, flush pending writes)
- [X] T102 [P] Implement log retention cleanup in src/bandaid/storage/events_db.py (scheduled job with APScheduler)
- [X] T103 [P] Implement ChromaDB cleanup for old patterns in src/bandaid/learning/pattern_store.py (sync with SQLite retention)
- [X] T104 Add model lazy-loading optimization in src/bandaid/security/ner_validator.py and guard_validator.py (reduce startup time)
- [X] T105 Add GPU auto-detection in src/bandaid/config.py (torch.cuda.is_available(), set device)

### Scripts & Utilities

- [X] T106 [P] Create model download script in src/scripts/download_models.py (pre-download HuggingFace models)
- [X] T107 [P] Create setup validation script in src/scripts/validate_setup.py (check dependencies, models, ports)

### Final Validation

- [ ] T108 Run through quickstart.md step-by-step to validate all instructions work
- [X] T109 Create .env.example file with all environment variables documented
- [X] T110 Add setup.py for package distribution

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - MVP baseline
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) + partially on US1 (extends validators) - Can start in parallel with US1 if coordinated
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) + US1 (uses validators) - Should follow US1 completion
- **User Story 4 (Phase 6)**: Depends on Foundational (Phase 2) + US1 (dashboard foundation) - Can start after US1 core
- **User Story 5 (Phase 7)**: Depends on Foundational (Phase 2) + US1 (CLI structure) - Can start after US1 core
- **User Story 6 (Phase 8)**: Depends on Foundational (Phase 2) + US1 (proxy layer) - Can start after US1 core
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies (Summary)

```
Phase 2: Foundational
         ↓
Phase 3: US1 (Initial Setup & Basic Protection) 🎯 MVP BASELINE
         ↓
    ┌────┴────┬─────────┬─────────┐
    ↓         ↓         ↓         ↓
Phase 4:   Phase 5:  Phase 6:  Phase 7:  Phase 8:
US2 (PII)  US3 (ML)  US4 (Dash) US5 (CLI) US6 (Stream)
(extends   (uses     (extends   (extends  (extends
US1)       US1)      US1)       US1)      US1)
```

**Critical Path**: Phase 1 → Phase 2 → Phase 3 (US1) → Other stories can parallelize

### Within Each User Story

- Tests (not included) would come first if requested
- Models before services
- Services before endpoints
- Core implementation before integrations
- Story must be independently testable at checkpoint

### Parallel Opportunities

**Within Phase 2 (Foundational):**
- T008, T009, T010, T011, T012, T014, T015, T016, T017, T018 can all run in parallel

**Within Phase 3 (US1):**
- Models: T019, T020 (parallel)
- Security: T021, T022, T024, T026 (parallel)
- After validators ready: T029, T030, T033, T034 (parallel)
- Event logging: T035 (parallel with endpoints)
- CLI: T038, T040, T041, T042 (parallel after T037)
- Dashboard: T043, T044, T045, T047, T048 (parallel after T043)

**Across User Stories (after US1 complete):**
- US2 (Phase 4), US3 (Phase 5), US4 (Phase 6), US5 (Phase 7), US6 (Phase 8) can all progress in parallel with proper coordination

---

## Parallel Example: User Story 1 Core Detection

```bash
# Launch all foundational models together:
Task: "Create Pydantic models for events in src/bandaid/models/events.py"
Task: "Create Pydantic models for patterns in src/bandaid/models/patterns.py"
Task: "Create Pydantic models for config in src/bandaid/models/config.py"

# Launch security components together:
Task: "Implement regex patterns for prompt injection"
Task: "Implement NER validator initialization"
Task: "Implement Llama Guard validator initialization"
Task: "Implement confidence threshold logic"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T018) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T019-T048)
4. **STOP and VALIDATE**: Test US1 independently using quickstart.md
5. Deploy/demo MVP

**Estimated MVP**: ~48 tasks to working security proxy with setup, basic protection, CLI, and dashboard

### Incremental Delivery

1. ✅ **Foundation** (Phases 1-2): Setup + Core infrastructure → 18 tasks COMPLETE
2. ✅ **MVP** (Phase 3): Add US1 → Test independently → Deploy/Demo → Total 48 tasks COMPLETE
3. ✅ **Enhanced Detection** (Phase 4): Add US2 (PII/secrets) → Test → Deploy → Total 61 tasks COMPLETE
4. ✅ **Self-Learning** (Phase 5): Add US3 (ML patterns) → Test → Deploy → Total 71 tasks COMPLETE
5. ✅ **Full Observability** (Phase 6): Add US4 (dashboard polish) → Test → Deploy → Total 81 tasks COMPLETE
6. ✅ **CLI Polish** (Phase 7): Add US5 (CLI commands) → Test → Deploy → Total 68 tasks COMPLETE
7. ✅ **Streaming** (Phase 8): Add US6 (streaming support) → Test → Deploy → Total 74 tasks COMPLETE
8. ⚠️ **Production Ready** (Phase 9): Polish → Final validation → Total 96/110 tasks (14 remaining)

**Current Status**: All user stories complete (Phases 1-8)! 96/110 tasks done (87%). Only 14 polish tasks remain in Phase 9.

### Parallel Team Strategy

With 3 developers after Foundation complete:

1. **All together**: Complete Phase 1 (Setup) + Phase 2 (Foundational)
2. **Once Phase 2 done:**
   - Developer A: User Story 1 (Phase 3) - Core MVP
   - Developer B: User Story 2 (Phase 4) - Start PII detection in parallel
   - Developer C: User Story 6 (Phase 8) - Start streaming support in parallel
3. After US1 complete:
   - Developer A: User Story 3 (Phase 5) - Self-learning
   - Developer B: Finish US2
   - Developer C: Finish US6
4. Final push:
   - Developer A: User Story 4 (Phase 6) - Dashboard
   - Developer B: User Story 5 (Phase 7) - CLI
   - Developer C: Phase 9 - Polish

---

## Notes

- **[P] marker**: Tasks marked with [P] work on different files with no dependencies - can run in parallel
- **[Story] marker**: Maps each task to specific user story for traceability
- **File paths**: All paths are absolute from repository root
- **Checkpoints**: After each user story phase, validate independently before proceeding
- **Tests**: Not included since spec.md doesn't explicitly request TDD approach
- **Constitution alignment**: MVP-first approach follows "Ship Fast, Fix What Hurts" principle
- **Self-learning note**: Pattern storage is unlimited per design decision (no expiration)
- **Performance note**: Llama Guard latency addressed by GPU recommendation + lazy loading + async processing

---

## Task Count Summary

- **Phase 1 (Setup)**: 6 tasks ✅ COMPLETE
- **Phase 2 (Foundational)**: 12 tasks ✅ COMPLETE (BLOCKS all stories)
- **Phase 3 (US1 - MVP)**: 30 tasks ✅ COMPLETE
- **Phase 4 (US2)**: 13 tasks ✅ COMPLETE
- **Phase 5 (US3)**: 10 tasks ✅ COMPLETE
- **Phase 6 (US4)**: 10 tasks ✅ COMPLETE
- **Phase 7 (US5)**: 7 tasks ✅ COMPLETE
- **Phase 8 (US6)**: 6 tasks ✅ COMPLETE
- **Phase 9 (Polish)**: 16 tasks ⚠️ IN PROGRESS (15/16 complete)

**Total**: 110 implementation tasks
**Completed**: 109 tasks (99%)
**Remaining**: 1 task (1%) - Only final validation (T108) remains!

**MVP Scope** (Phases 1-3): 48 tasks ✅ COMPLETE - working security proxy with setup, protection, CLI, and dashboard

**Parallel Opportunities**: ~40% of tasks marked [P] can run concurrently within phases

**Independent Stories**: Each user story (US1-US6) can be tested independently at its checkpoint

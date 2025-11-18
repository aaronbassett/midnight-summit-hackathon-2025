# Tasks: Guardrails AI Validator Integration

**Input**: Design documents from `/specs/002-guardrails-ai-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/cli-commands.md

**Tests**: Integration tests added per constitution testing standards (Phase 8).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Project Structure

Single project structure:
- **Source**: `src/bandaid/`
- **Tests**: `tests/`
- **Database**: SQLite via aiosqlite

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Guardrails dependencies

- [ ] T001 Add guardrails-ai dependency to pyproject.toml (version >=0.5.0)
- [ ] T002 [P] Install guardrails-ai package and verify installation
- [ ] T003 [P] Create src/bandaid/models/guardrails.py for Guardrails-specific pydantic models

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create database migration for guardrails_validators table in src/bandaid/storage/migrations.py
- [ ] T005 Create database migration for guardrails_executions table in src/bandaid/storage/migrations.py
- [ ] T006 Extend events table with guardrails columns in src/bandaid/storage/migrations.py
- [ ] T007 [P] Define GuardrailsConfiguration pydantic model in src/bandaid/models/guardrails.py
- [ ] T008 [P] Define ValidatorConfig pydantic model in src/bandaid/models/guardrails.py
- [ ] T009 [P] Define ValidationPolicy pydantic model in src/bandaid/models/guardrails.py
- [ ] T010 [P] Define ValidatorExecutionResult pydantic model in src/bandaid/models/guardrails.py
- [ ] T011 Extend src/bandaid/config.py to support GuardrailsConfiguration with environment variable overrides
- [ ] T012 Extend src/bandaid/models/events.py Event model with guardrails_enabled, guardrails_validators_run, guardrails_validators_failed, guardrails_lowest_confidence fields
- [ ] T013 Create src/bandaid/security/guardrails_validator.py with base GuardrailsValidator class structure

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Configure Guardrails AI Integration (Priority: P1) 🎯 MVP

**Goal**: Enable administrators to configure Guardrails Hub API credentials and establish connectivity, making the system ready to use validators

**Independent Test**: Provide valid Hub API key through configuration, verify system connects successfully and indicates Guardrails integration is available

### Implementation for User Story 1

- [ ] T014 [P] [US1] Implement Hub token validation logic in src/bandaid/security/guardrails_validator.py (JWT decode with expiration check)
- [ ] T015 [P] [US1] Implement Hub connectivity check in src/bandaid/security/guardrails_validator.py (call /health endpoint)
- [ ] T016 [US1] Implement GuardrailsConfiguration loader in src/bandaid/config.py that reads from YAML config and environment variables
- [ ] T017 [US1] Create guardrail validators configure CLI command in src/bandaid/cli_commands/guardrails.py with --token, --hub-url, --remote, --timeout, --interactive flags
- [ ] T018 [US1] Implement interactive configuration wizard in src/bandaid/cli_commands/guardrails.py with step-by-step prompts
- [ ] T019 [US1] Add configuration persistence to ~/.guardrailsrc and bandaid config file in src/bandaid/cli_commands/guardrails.py
- [ ] T020 [US1] Add configuration display (--show flag) in src/bandaid/cli_commands/guardrails.py
- [ ] T021 [US1] Implement graceful fallback when Guardrails not configured in src/bandaid/security/guardrails_validator.py
- [ ] T022 [US1] Add configuration validation on proxy startup in src/bandaid/proxy/hooks.py
- [ ] T023 [US1] Add error handling for invalid/expired tokens with actionable messages in src/bandaid/cli_commands/guardrails.py
- [ ] T023b [US1] Implement Hub API health check with retry logic in src/bandaid/security/guardrails_validator.py (3 retries with exponential backoff, 5s timeout per attempt, covers FR-017)

**Checkpoint**: At this point, administrators can configure Guardrails Hub connection and verify authentication works

---

## Phase 4: User Story 2 - Install Validators from Hub (Priority: P2)

**Goal**: Allow administrators to select and install specific validators from Guardrails Hub, making them available for configuration and use

**Independent Test**: Configure Guardrails (P1 prerequisite), select validators from Hub, verify successful download and availability

### Implementation for User Story 2

- [ ] T024 [P] [US2] Implement guardrail validators search CLI command in src/bandaid/cli_commands/guardrails.py with query, --category, --limit, --format flags (covers FR-004 browse/discover requirement via search interface)
- [ ] T025 [P] [US2] Implement Hub API client for querying available validators in src/bandaid/security/guardrails_validator.py
- [ ] T026 [US2] Implement guardrail validators install CLI command in src/bandaid/cli_commands/guardrails.py accepting multiple HUB_URI arguments for batch installation, with --version, --no-local-models, --upgrade, --enabled, --severity, --on-fail, --timeout flags; include validator metadata validation for version compatibility check (FR-006, FR-023)
- [ ] T027 [US2] Implement validator package installation via guardrails hub install in src/bandaid/cli_commands/guardrails.py
- [ ] T028 [US2] Create ValidatorConfig database record creation in src/bandaid/storage/events_db.py
- [ ] T029 [US2] Implement guardrail validators list CLI command in src/bandaid/cli_commands/guardrails.py with --enabled-only, --disabled-only, --format, --verbose flags
- [ ] T030 [US2] Add database query methods for listing validators in src/bandaid/storage/events_db.py
- [ ] T031 [US2] Implement guardrail validators uninstall CLI command in src/bandaid/cli_commands/guardrails.py with --confirm, --keep-data flags
- [ ] T032 [US2] Add validator cleanup logic (pip uninstall, delete config, optionally delete execution history) in src/bandaid/cli_commands/guardrails.py
- [ ] T033 [US2] Add error handling for installation failures (network issues, dependency conflicts) with actionable messages in src/bandaid/cli_commands/guardrails.py

**Checkpoint**: At this point, administrators can browse, install, list, and uninstall validators from the Hub

---

## Phase 5: User Story 3 - Apply Validators to LLM Traffic (Priority: P3)

**Goal**: Enable validators to run on incoming prompts and/or outgoing responses, performing security validation and logging results

**Independent Test**: Install validators (P2 prerequisite), configure them to run on test traffic, verify validation results are captured and actions taken

### Implementation for User Story 3

- [ ] T034 [P] [US3] Implement Guard creation from ValidatorConfig in src/bandaid/security/guardrails_validator.py
- [ ] T035 [P] [US3] Implement validator execution with timeout wrapper in src/bandaid/security/guardrails_validator.py
- [ ] T036 [US3] Implement input guard execution in pre_call hook in src/bandaid/proxy/hooks.py
- [ ] T037 [US3] Implement output guard execution in post_call hook in src/bandaid/proxy/hooks.py
- [ ] T038 [US3] Implement ValidationPolicy loading and validator ordering in src/bandaid/security/guardrails_validator.py
- [ ] T039 [US3] Implement sequential validator execution according to configured order in src/bandaid/security/guardrails_validator.py (FR-010)
- [ ] T040 [US3] Create ValidatorExecutionResult database record creation in src/bandaid/storage/events_db.py
- [ ] T041 [US3] Implement severity-to-confidence score mapping in src/bandaid/security/guardrails_validator.py (critical=0.0, high=0.3, medium=0.6, low=0.8)
- [ ] T042 [US3] Implement worst-case confidence score aggregation across multiple validators in src/bandaid/security/guardrails_validator.py
- [ ] T043 [US3] Integrate Guardrails confidence scores with existing confidence system in src/bandaid/security/confidence.py
- [ ] T044 [US3] Implement OnFail action handling (exception, filter, fix, reask) in src/bandaid/security/guardrails_validator.py
- [ ] T045 [US3] Add timeout handling with BANDAID_UNSAFE_VALIDATOR_CONTINUE environment variable support in src/bandaid/security/guardrails_validator.py
- [ ] T046 [US3] Add execution error handling (treat as validation failure by default) in src/bandaid/security/guardrails_validator.py
- [ ] T047 [US3] Implement guardrail validators history CLI command in src/bandaid/cli_commands/guardrails.py with VALIDATOR_ID, --limit, --status, --direction, --since, --format flags
- [ ] T048 [US3] Add database query methods for validator execution history in src/bandaid/storage/events_db.py
- [ ] T049 [US3] Update Event model persistence to include guardrails metadata in src/bandaid/storage/events_db.py
- [ ] T050 [US3] Add request-response correlation for validator results in src/bandaid/storage/events_db.py

**Checkpoint**: At this point, validators run on live traffic, results are logged, and appropriate actions are taken on validation failures

---

## Phase 6: User Story 4 - Manage Validator Configuration (Priority: P4)

**Goal**: Allow administrators to update validator settings (enable/disable, parameters, severity) without system restart

**Independent Test**: Install validators (P2), apply to traffic (P3), modify configuration, verify changes take effect

### Implementation for User Story 4

- [ ] T051 [P] [US4] Implement guardrail validators enable CLI command in src/bandaid/cli_commands/guardrails.py with VALIDATOR_ID, --restart-proxy flags
- [ ] T052 [P] [US4] Implement guardrail validators disable CLI command in src/bandaid/cli_commands/guardrails.py with VALIDATOR_ID, --restart-proxy flags
- [ ] T053 [US4] Add database update methods for enabling/disabling validators in src/bandaid/storage/events_db.py
- [ ] T054 [US4] Implement guardrail validators config CLI command in src/bandaid/cli_commands/guardrails.py with VALIDATOR_ID, --severity, --on-fail, --timeout, --apply-to, --set, --show flags
- [ ] T055 [US4] Add database update methods for validator configuration in src/bandaid/storage/events_db.py
- [ ] T056 [US4] Implement parameter validation for --set flag in src/bandaid/cli_commands/guardrails.py
- [ ] T057 [US4] Implement guardrail validators test CLI command in src/bandaid/cli_commands/guardrails.py with VALIDATOR_ID, --text, --file, --direction, --format flags
- [ ] T058 [US4] Add test execution logic (no database persistence) in src/bandaid/security/guardrails_validator.py
- [ ] T059 [US4] Add configuration change logging with timestamp, validator ID, and change type in src/bandaid/storage/events_db.py
- [ ] T060 [US4] Implement hot reload of validator configuration without proxy restart in src/bandaid/security/guardrails_validator.py

**Checkpoint**: At this point, administrators can enable/disable, configure, and test validators dynamically

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and system integration

- [ ] T061 [P] Extend guardrail setup wizard in src/bandaid/cli_commands/setup.py to include optional Guardrails configuration step
- [ ] T062 [P] Extend guardrail status command in src/bandaid/cli_commands/setup.py to show Guardrails section (enabled, validators, metrics)
- [ ] T063 [P] Add guardrail restart proxy restart integration in src/bandaid/cli_commands/guardrails.py
- [ ] T064 [P] Implement circuit breaker pattern for Guardrails Hub API calls in src/bandaid/security/guardrails_validator.py with retry logic (3 attempts, exponential backoff), timeout (5s), and graceful degradation to local validator execution when Hub unavailable (covers FR-017)
- [ ] T065 [P] Add Sentry integration for validator errors in src/bandaid/security/guardrails_validator.py
- [ ] T066 [P] Add validator performance metrics aggregation (p50, p95, p99 latency) in src/bandaid/storage/events_db.py
- [ ] T067 [P] Implement execution result retention policy (auto-delete old records) in src/bandaid/storage/events_db.py
- [ ] T068 [P] Add comprehensive error messages with actionable next steps across all CLI commands in src/bandaid/cli_commands/guardrails.py
- [ ] T069 [P] Add JSON output format support (--format json) across all CLI commands in src/bandaid/cli_commands/guardrails.py
- [ ] T070 Update CLAUDE.md with guardrails-ai technology and CLI commands
- [ ] T071 Run quickstart.md validation to verify end-to-end workflow

---

## Phase 8: Testing (Integration Tests) 🧪

**Purpose**: Constitution-mandated integration tests for each user story's acceptance scenarios

**⚠️ CRITICAL**: Constitution requires "Integration Tests First" - tests must hit real APIs or realistic fixtures

### User Story 1 Tests - Hub Configuration

- [ ] T072 [P] [US1-TEST] Create test fixture for Guardrails Hub API mock server in tests/integration/fixtures/guardrails_hub.py
- [ ] T073 [US1-TEST] Write integration test for valid Hub API token authentication in tests/integration/test_guardrails_config.py (covers acceptance scenario 1)
- [ ] T074 [P] [US1-TEST] Write integration test for missing Hub API token graceful fallback in tests/integration/test_guardrails_config.py (covers acceptance scenario 2)
- [ ] T075 [P] [US1-TEST] Write integration test for invalid/expired Hub API token error handling in tests/integration/test_guardrails_config.py (covers acceptance scenario 3)

### User Story 2 Tests - Validator Installation

- [ ] T076 [US2-TEST] Write integration test for validator installation from Hub URI in tests/integration/test_guardrails_install.py (covers acceptance scenario 1)
- [ ] T077 [P] [US2-TEST] Write integration test for multiple validator installation in tests/integration/test_guardrails_install.py (covers acceptance scenario 2)
- [ ] T078 [P] [US2-TEST] Write integration test for installation failure handling in tests/integration/test_guardrails_install.py (covers acceptance scenario 3)
- [ ] T079 [P] [US2-TEST] Write integration test for listing installed validators in tests/integration/test_guardrails_install.py (covers acceptance scenario 4)

### User Story 3 Tests - Validator Execution

- [ ] T080 [US3-TEST] Write integration test for prompt validation with configured validators in tests/integration/test_guardrails_execution.py (covers acceptance scenario 1)
- [ ] T081 [P] [US3-TEST] Write integration test for validation failure confidence score mapping in tests/integration/test_guardrails_execution.py (covers acceptance scenario 2)
- [ ] T082 [P] [US3-TEST] Write integration test for multiple validator worst-case aggregation in tests/integration/test_guardrails_execution.py (covers acceptance scenario 3)
- [ ] T083 [P] [US3-TEST] Write integration test for prompt and response validation correlation in tests/integration/test_guardrails_execution.py (covers acceptance scenario 4)
- [ ] T084 [P] [US3-TEST] Write integration test for validator timeout handling with BANDAID_UNSAFE_VALIDATOR_CONTINUE in tests/integration/test_guardrails_execution.py (covers acceptance scenario 5)
- [ ] T085 [P] [US3-TEST] Write integration test for validator execution error handling in tests/integration/test_guardrails_execution.py (covers acceptance scenario 6)

### User Story 4 Tests - Validator Management

- [ ] T086 [P] [US4-TEST] Write integration test for disabling active validator in tests/integration/test_guardrails_management.py (covers acceptance scenario 1)
- [ ] T087 [P] [US4-TEST] Write integration test for validator parameter updates in tests/integration/test_guardrails_management.py (covers acceptance scenario 2)
- [ ] T088 [P] [US4-TEST] Write integration test for validator removal in tests/integration/test_guardrails_management.py (covers acceptance scenario 3)
- [ ] T089 [P] [US4-TEST] Write integration test for configuration change logging in tests/integration/test_guardrails_management.py (covers acceptance scenario 4)

### CI Configuration

- [ ] T090 Add Guardrails integration tests to CI workflow in .github/workflows/test.yml (requires Hub API mock or test credentials)
- [ ] T091 Configure pytest markers for Guardrails tests (unit vs integration) in pyproject.toml

**Checkpoint**: Constitution testing requirements satisfied - all user story acceptance scenarios have integration test coverage

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Depends on User Story 1 (needs Hub configuration to work)
  - User Story 3 (P3): Depends on User Stories 1 & 2 (needs validators installed to execute)
  - User Story 4 (P4): Depends on User Stories 1, 2 & 3 (needs validators running to manage)
- **Polish (Phase 7)**: Depends on all user stories being complete
- **Testing (Phase 8)**: Can run in parallel with implementation phases; tests for each user story can be written after that story's implementation tasks are defined

### User Story Dependencies

- **User Story 1 (P1) - Configuration**: Can start after Foundational (Phase 2) - INDEPENDENT
- **User Story 2 (P2) - Install Validators**: Requires US1 complete (needs Hub configured)
- **User Story 3 (P3) - Apply to Traffic**: Requires US1 & US2 complete (needs validators installed)
- **User Story 4 (P4) - Manage Configuration**: Requires US1, US2 & US3 complete (needs validators running)

### Within Each User Story

**User Story 1**:
- T014, T015 can run in parallel (different concerns: validation vs connectivity)
- T016 must complete before T017-T020 (config loader needed for CLI)
- T017-T020 implement CLI commands (sequential)
- T021-T023 add error handling (can run after T014-T020)

**User Story 2**:
- T024, T025 can run in parallel (search command vs Hub client)
- T026-T028 implement install command (sequential: command → installation → persistence)
- T029, T030 implement list command (sequential: command → database query)
- T031, T032 implement uninstall command (sequential: command → cleanup)
- T033 adds error handling (can run after T024-T032)

**User Story 3**:
- T034, T035 can run in parallel (Guard creation vs timeout wrapper)
- T036, T037 can run in parallel (input hook vs output hook)
- T038, T039 implement policy execution (sequential: policy loading → sequential validator execution per FR-010)
- T040-T046 implement result handling (sequential dependencies on T034-T039)
- T047, T048 implement history command (sequential: command → database query)
- T049, T050 add correlation logic (can run in parallel)

**User Story 4**:
- T051, T052, T053 implement enable/disable (sequential: commands → database)
- T054-T056 implement config command (sequential: command → database → validation)
- T057, T058 implement test command (sequential: command → test execution)
- T059, T060 add logging and hot reload (can run in parallel)

### Parallel Opportunities

**Phase 1 (Setup)**:
- T002, T003 can run in parallel (installation vs model creation)

**Phase 2 (Foundational)**:
- T004, T005, T006 are database migrations (sequential for safety)
- T007, T008, T009, T010 can run in parallel (different model definitions)
- T011, T012, T013 extend existing files (sequential to avoid conflicts)

**Phase 3 (User Story 1)**:
- T014, T015 can run in parallel

**Phase 4 (User Story 2)**:
- T024, T025 can run in parallel

**Phase 5 (User Story 3)**:
- T034, T035 can run in parallel
- T036, T037 can run in parallel
- T049, T050 can run in parallel

**Phase 6 (User Story 4)**:
- T051, T052 can run in parallel (enable vs disable)
- T059, T060 can run in parallel

**Phase 7 (Polish)**:
- T061, T062, T063, T064, T065, T066, T067, T068, T069 can all run in parallel (different files/concerns)

**Phase 8 (Testing)**:
- T072 must complete before T073-T075 (test fixture needed for tests)
- T073, T074, T075 can run in parallel (different test scenarios)
- T076-T079 can run in parallel (different test scenarios)
- T080-T085 can run in parallel (different test scenarios)
- T086-T089 can run in parallel (different test scenarios)
- T090, T091 can run in parallel (CI config vs pytest config)

---

## Parallel Example: User Story 3

```bash
# Launch parallel tasks for Guard setup:
Task: "Implement Guard creation from ValidatorConfig in src/bandaid/security/guardrails_validator.py" (T034)
Task: "Implement validator execution with timeout wrapper in src/bandaid/security/guardrails_validator.py" (T035)

# Launch parallel tasks for hook integration:
Task: "Implement input guard execution in pre_call hook in src/bandaid/proxy/hooks.py" (T036)
Task: "Implement output guard execution in post_call hook in src/bandaid/proxy/hooks.py" (T037)

# Launch parallel tasks for result correlation:
Task: "Update Event model persistence to include guardrails metadata in src/bandaid/storage/events_db.py" (T049)
Task: "Add request-response correlation for validator results in src/bandaid/storage/events_db.py" (T050)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T013) - CRITICAL
3. Complete Phase 3: User Story 1 (T014-T023)
4. **STOP and VALIDATE**: Test Hub configuration, verify authentication works
5. Deploy/demo if ready

**MVP Deliverable**: Administrators can configure Guardrails Hub API credentials and verify connectivity

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (T014-T023) → Test independently → **MVP: Configuration works**
3. Add User Story 2 (T024-T033) → Test independently → **Can install validators**
4. Add User Story 3 (T034-T050) → Test independently → **Validators run on traffic**
5. Add User Story 4 (T051-T060) → Test independently → **Full management capability**
6. Each story adds value without breaking previous stories

### Sequential Dependency Strategy

Due to the dependency chain (US1 → US2 → US3 → US4), this feature should be implemented sequentially:

1. **Week 1**: Setup + Foundational + User Story 1 (T001-T023)
   - Deliverable: Hub configuration working
2. **Week 2**: User Story 2 (T024-T033)
   - Deliverable: Can install and list validators
3. **Week 3**: User Story 3 (T034-T050)
   - Deliverable: Validators running on traffic with logging
4. **Week 4**: User Story 4 (T051-T060)
   - Deliverable: Full validator management
5. **Week 5**: Polish (T061-T071)
   - Deliverable: Production-ready integration

---

## Task Count Summary

- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 10 tasks
- **Phase 3 (User Story 1)**: 11 tasks (includes T023b)
- **Phase 4 (User Story 2)**: 10 tasks
- **Phase 5 (User Story 3)**: 17 tasks
- **Phase 6 (User Story 4)**: 10 tasks
- **Phase 7 (Polish)**: 11 tasks
- **Phase 8 (Testing)**: 20 tasks

**Total**: 92 tasks

### Tasks per User Story

- **US1 (Configuration)**: 10 tasks
- **US2 (Install Validators)**: 10 tasks
- **US3 (Apply to Traffic)**: 17 tasks
- **US4 (Manage Configuration)**: 10 tasks
- **Infrastructure**: 24 tasks (Setup + Foundational + Polish)

### Parallel Opportunities Identified

- **35+ tasks** marked [P] can run in parallel with other tasks (including all test scenarios)
- **4 user stories** with clear boundaries for team parallelization (after foundational complete)
- **Multiple parallel groups** within User Story 3 (largest story) and Phase 8 (testing)

### Independent Test Criteria

- **US1**: Provide valid Hub API key, verify connection established
- **US2**: Install validator, verify appears in list and files exist
- **US3**: Send test prompt with PII, verify blocked and logged
- **US4**: Disable validator, send prompt, verify validator doesn't run

### Suggested MVP Scope

**MVP = User Story 1 ONLY** (T001-T023b + T072-T075)
- 28 tasks total (24 implementation + 4 tests)
- Estimated effort: 1-2 weeks
- Deliverable: Hub configuration and authentication working with test coverage
- Value: Foundation for all other stories, can be demonstrated and validated, constitution-compliant with tests

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- User stories have sequential dependencies: US1 → US2 → US3 → US4
- Each story should still be independently testable once its prerequisites are met
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Follow research.md recommendations: use remote inference, 10s timeout default, secure error handling

# Feature Specification: Guardrails AI Validator Integration

**Feature Branch**: `002-guardrails-ai-integration`
**Created**: 2025-11-13
**Status**: Draft
**Input**: User description: "Add (optional) support for Guardrails AI validators. If the user supplies a Guardrails AI hub API then we should download and integrate the selected validators."

## Clarifications

### Session 2025-11-13

- Q: Default validator timeout value? → A: 10 seconds
- Q: How should validator pass/fail results integrate with the existing security system? → A: Use existing confidence scores system - assign severity level to each validator that maps to confidence score (Guardrails returns pass/fail only)
- Q: How should validators be ordered when multiple are configured? → A: Use order from config file if provided, otherwise use system-defined default order (severity level, high to low)
- Q: What happens when a validator times out during traffic processing? → A: Default behavior treats timeout as validation failure (apply severity level confidence score); if BANDAID_UNSAFE_VALIDATOR_CONTINUE=true environment variable is set, skip the timed-out validator and continue with remaining validators
- Q: How do multiple validator failures combine into the overall confidence score? → A: Use worst/lowest confidence score (most conservative security approach)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure Guardrails AI Integration (Priority: P1)

A security administrator wants to enhance the LLM security proxy with additional validation capabilities from Guardrails AI Hub. They provide their Hub API key during configuration, and the system becomes ready to use Guardrails validators alongside existing security features.

**Why this priority**: This is the foundational capability - without configuration working, no other Guardrails features are accessible. It represents the minimum viable integration.

**Independent Test**: Can be fully tested by providing a valid Hub API key through configuration and verifying the system connects successfully, without requiring any validators to be installed or used.

**Acceptance Scenarios**:

1. **Given** the system is running without Guardrails configured, **When** an administrator provides a valid Guardrails Hub API key through configuration, **Then** the system authenticates successfully and indicates Guardrails integration is available
2. **Given** the system is running, **When** an administrator does not provide a Guardrails Hub API key, **Then** the system operates normally using only built-in security features, and Guardrails functionality remains disabled
3. **Given** an invalid or expired Hub API key is provided, **When** the system attempts to authenticate, **Then** a clear error message is displayed and the system falls back to operating without Guardrails integration
4. **Given** a valid Hub API key is configured and expires during operation, **When** the system detects token expiration, **Then** a warning is logged, previously installed validators continue functioning in local mode, and Hub operations return actionable error messages with token renewal instructions

---

### User Story 2 - Install Validators from Hub (Priority: P2)

Once Guardrails is configured, an administrator wants to select and install specific validators from the Guardrails Hub to extend security capabilities. They browse available validators, select the ones needed for their use case, and the system downloads and prepares them for use.

**Why this priority**: After establishing connectivity (P1), being able to install validators is the next critical step. Without installed validators, the integration provides no practical value.

**Independent Test**: Can be fully tested by configuring Guardrails (P1 prerequisite), selecting validators from the Hub, and verifying they're successfully downloaded and available for use.

**Acceptance Scenarios**:

1. **Given** Guardrails integration is configured, **When** an administrator requests to install a specific validator by its Hub URI, **Then** the system downloads the validator and confirms it's ready for use
2. **Given** Guardrails integration is configured, **When** an administrator requests to install multiple validators, **Then** all validators are downloaded and available for configuration
3. **Given** a validator installation fails (network issue, invalid URI, etc.), **When** the error occurs, **Then** the system reports the specific failure and continues operating with previously installed validators
4. **Given** validators are already installed, **When** an administrator lists available validators, **Then** the system displays all installed Guardrails validators with their names and capabilities

---

### User Story 3 - Apply Validators to LLM Traffic (Priority: P3)

With validators installed, an administrator configures which Guardrails validators should be applied to incoming prompts and/or outgoing responses. The system then uses these validators to perform additional validation checks on LLM traffic, logging results and taking actions based on validation outcomes.

**Why this priority**: This delivers the actual security value of the integration. However, it depends on both P1 (configuration) and P2 (installed validators) being complete.

**Independent Test**: Can be fully tested by installing validators (P2 prerequisite), configuring them to run on test traffic, and verifying that validation results are captured and appropriate actions are taken.

**Acceptance Scenarios**:

1. **Given** Guardrails validators are installed, **When** an administrator configures specific validators to check incoming prompts with assigned severity levels, **Then** those validators run on all incoming prompts and their results are logged
2. **Given** Guardrails validators are configured with severity levels, **When** a prompt fails validation, **Then** the system logs the failure with details and maps the failure to a confidence score based on the validator's assigned severity level
3. **Given** multiple validators are configured, **When** processing LLM traffic, **Then** all validators run in sequence and the worst/lowest confidence score from any validator failure determines the overall confidence score for the request
4. **Given** validators are applied to both prompts and responses, **When** traffic flows through the proxy, **Then** validation occurs at both stages and results are correlated with the request
5. **Given** Guardrails validators are configured, **When** a validator times out, **Then** the system logs the timeout and by default treats it as validation failure (applying the validator's severity level confidence score), unless BANDAID_UNSAFE_VALIDATOR_CONTINUE is enabled which skips the timed-out validator and continues with remaining validators
6. **Given** Guardrails validators are configured, **When** a validator encounters an execution error (non-timeout), **Then** the system logs the error and treats it as validation failure (applying the validator's severity level confidence score)

---

### User Story 4 - Manage Validator Configuration (Priority: P4)

Administrators need to update validator settings over time as security requirements evolve. They can enable/disable specific validators, update their parameters, or remove validators that are no longer needed, without disrupting the overall system.

**Why this priority**: While important for operational flexibility, this can be deferred until the core validation functionality (P1-P3) is proven working. Initial deployments can rely on configuration files or environment variables.

**Independent Test**: Can be fully tested by installing validators (P2), applying them to traffic (P3), then modifying their configuration and verifying the changes take effect without system restart.

**Acceptance Scenarios**:

1. **Given** validators are actively running, **When** an administrator disables a specific validator, **Then** it stops running on new traffic while other validators continue operating
2. **Given** a validator has configurable parameters, **When** an administrator updates those parameters, **Then** subsequent validation uses the new settings
3. **Given** validators are installed, **When** an administrator removes a validator, **Then** it's uninstalled and no longer available for use
4. **Given** configuration changes are made, **When** they take effect, **Then** the system logs the configuration change with timestamp, validator ID, and change type (enable/disable/parameter update)

---

### Edge Cases

- What happens when the Guardrails Hub API is unreachable during validator installation or updates?
- How does the system handle validators that take excessive time to process (timeout scenarios)? Default: treat as validation failure; optionally skip via BANDAID_UNSAFE_VALIDATOR_CONTINUE=true
- What occurs when a validator has dependencies that conflict with existing system packages? (Resolved: Use remote inference mode to avoid conflicts - see FR-022 and plan.md)
- How does the system behave when Guardrails API key expires while validators are actively running? (Resolved: See FR-022 - continue with local validators, log warning)
- What happens if validators produce contradictory results for the same traffic? (System uses worst/lowest confidence score - most conservative approach)
- How does the system handle validator version updates from the Hub? (Out of scope for v1 - see line 168)
- What occurs when attempting to install a validator that's incompatible with the current system version? (Resolved: See FR-023 - validate compatibility, prevent installation with clear error)
- What happens when BANDAID_UNSAFE_VALIDATOR_CONTINUE is enabled but all validators time out? (All validators skipped, request proceeds without Guardrails validation)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow administrators to optionally configure Guardrails AI Hub API credentials
- **FR-002**: System MUST operate normally with all existing security features when Guardrails integration is not configured
- **FR-003**: System MUST authenticate with Guardrails Hub API when credentials are provided and validate the connection
- **FR-004**: System MUST allow administrators to browse and discover validators available in the Guardrails Hub via search command with filtering by category, keywords, and metadata
- **FR-005**: System MUST support installing validators from Guardrails Hub using their unique URIs
- **FR-006**: System MUST support installing multiple validators in a single batch operation (via multiple HUB_URI arguments or space-separated list)
- **FR-007**: System MUST persist installed validators so they remain available across system restarts
- **FR-008**: System MUST allow administrators to configure which validators apply to incoming prompts
- **FR-009**: System MUST allow administrators to configure which validators apply to outgoing LLM responses
- **FR-010**: System MUST execute configured validators in sequence according to the order specified in the configuration file, or by severity level (high to low) if no order is specified
- **FR-011**: System MUST log all validator execution results including validator name, outcome, and any failure details
- **FR-012**: System MUST integrate validator results into the existing confidence score system by assigning each validator a severity level that maps to a confidence score (since Guardrails validators return pass/fail only); when multiple validators fail, the system MUST use the worst/lowest confidence score as the overall result
- **FR-013**: System MUST provide clear error messages when validator installation fails, including the reason for failure
- **FR-014**: System MUST treat validator execution errors and timeouts as validation failures that apply the validator's severity level confidence score to the request (default secure behavior); system MAY skip timed-out validators and continue with remaining validators when BANDAID_UNSAFE_VALIDATOR_CONTINUE environment variable is enabled
- **FR-015**: System MUST allow administrators to enable or disable individual validators without removing them
- **FR-016**: System MUST allow administrators to remove installed validators
- **FR-017**: System MUST handle Guardrails Hub API connectivity failures gracefully without disrupting core proxy functionality
- **FR-018**: System MUST support timeout configuration for validator execution to prevent blocking traffic indefinitely (default: 10 seconds)
- **FR-019**: System MUST correlate validator results from both prompt and response validation for the same request in logs
- **FR-020**: System MUST provide a way to list all installed validators with their current status (enabled/disabled)
- **FR-021**: System MUST allow administrators to assign a severity level to each validator that determines the confidence score when validation fails
- **FR-022**: System MUST detect expired Guardrails Hub API tokens during validator execution and log a warning; when a token expires, the system MUST continue operating with previously installed validators in local mode, and MUST provide clear error message with token renewal instructions when attempting Hub operations (search, install, update)
- **FR-023**: System MUST validate validator version compatibility during installation by checking validator metadata against system requirements; when incompatibility is detected, the system MUST prevent installation and provide a clear error message indicating the incompatibility reason (e.g., "Validator requires Python 3.12+, system running Python 3.11") with recommended actions (upgrade system or use compatible validator version)

### Key Entities

- **Guardrails Configuration**: Represents the Hub API credentials, connection status, and global Guardrails settings (timeouts, fallback behavior)
- **Installed Validator**: Represents a validator downloaded from the Hub, including its URI, name, description, version, installation status, enabled/disabled state, and assigned severity level
- **Validator Execution Result**: Captures the outcome of running a validator on traffic, including validator identifier, validation outcome (pass/fail/error), mapped confidence score (derived from validator's severity level on failure), failure reason, execution duration, and timestamp
- **Validation Policy**: Defines which validators run on which traffic types (prompts vs responses) and the severity level assigned to each validator for confidence score mapping

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can complete Guardrails Hub API configuration in under 2 minutes
- **SC-002**: System continues handling LLM traffic without interruption when Guardrails integration is disabled or fails
- **SC-003**: Validator installation from the Hub completes in under 30 seconds for typical validators
- **SC-004**: 95% of validator executions complete within the configured timeout period
- **SC-005**: System logs all validator results with sufficient detail for security auditing
- **SC-006**: Administrators can enable, disable, or reconfigure validators without restarting the proxy service
- **SC-007**: System handles at least 1000 concurrent requests while running multiple Guardrails validators without performance degradation beyond 20%
- **SC-008**: 100% of Guardrails failures (API unavailable, validator errors) result in logged events and graceful fallback behavior

## Assumptions

- Guardrails AI Hub API provides stable validator URIs that don't change frequently
- Validators from the Hub have reasonable execution times (seconds, not minutes)
- Administrators have network access to Guardrails Hub from the deployment environment
- Standard authentication pattern for Hub API follows industry norms (API key in headers)
- Validators are distributed in a format compatible with the existing system runtime environment
- Multiple validators can be chained without complex dependency resolution beyond what Guardrails library provides
- Validator configuration follows similar patterns to existing security feature configuration (environment variables or configuration files)
- The existing logging infrastructure can handle additional validator result entries without performance impact

## Dependencies

- Guardrails AI Hub API availability and stability
- Existing LLM security proxy infrastructure (from feature 001-llm-security-proxy)
- Current logging and monitoring systems must support additional event types for validator results
- Configuration management system must support optional feature flags and API credentials

## Out of Scope

- Building custom validators (only using pre-built validators from Guardrails Hub)
- Creating a custom UI for validator management (CLI/config file based management is sufficient)
- Automatic validator updates from the Hub (manual update process acceptable for v1)
- Fine-grained RBAC for which administrators can manage validators (system-level admin access is sufficient)
- Performance optimization of validator execution (baseline performance with standard validators is acceptable)
- Custom validator execution environments or sandboxing beyond what Guardrails library provides
- Integration with validator marketplaces other than Guardrails Hub

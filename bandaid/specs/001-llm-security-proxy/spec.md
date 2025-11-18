# Feature Specification: Bandaid - LLM Security Proxy

**Feature Branch**: `001-llm-security-proxy`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "Building Bandaid: A local-first LLM security proxy that protects applications from prompt injection, data leakage, and other AI-specific threats with transparent integration and self-learning capabilities."

## Clarifications

### Session 2025-11-12

- Q: When should the system create a "fingerprint" and start blocking similar attack variants? → A: Learn automatically after any confirmed block by baseline rules (no manual review needed)
- Q: When a detection layer has uncertainty about whether content is truly malicious, how should the system behave? → A: Use tiered confidence thresholds: high confidence blocks, medium logs warnings, low allows
- Q: Which LLM providers should be supported in the initial release? → A: Use LiteLLM AI Gateway for provider support (supports all providers LiteLLM supports)
- Q: How should developers temporarily disable specific security checks during development/debugging? → A: Configuration file setting to disable specific check types globally (requires restart)
- Q: How should the system manage learned attack pattern storage as patterns accumulate over time? → A: Unlimited storage (keep all learned patterns forever)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Initial Setup and Basic Protection (Priority: P1)

As a developer, I want to set up the security proxy in under 10 minutes and immediately protect my LLM application from basic threats without changing any application code except the API endpoint URL.

**Why this priority**: This is the core value proposition - frictionless security. Without simple setup and transparent proxying, developers won't adopt the tool. This provides immediate value by blocking standard attacks with zero application code changes.

**Independent Test**: Can be fully tested by running the setup command, configuring the API endpoint to point to the proxy, sending a test request with a known prompt injection attack, and verifying it's blocked while legitimate requests pass through.

**Acceptance Scenarios**:

1. **Given** a developer has downloaded the tool, **When** they run the setup command, **Then** they are guided through an interactive wizard to enter their LLM provider API keys and the proxy starts automatically.
2. **Given** the proxy is running on localhost:8000, **When** an application sends a request to the proxy instead of the LLM provider, **Then** the request is forwarded to the LLM and the response is returned with no functional difference to the application.
3. **Given** the proxy is running, **When** a request contains a prompt injection attempt (e.g., "Ignore previous instructions..."), **Then** the request is blocked before reaching the LLM and the application receives an error response.
4. **Given** the proxy is running, **When** a legitimate request is sent, **Then** it passes through without modification and receives the normal LLM response.
5. **Given** the proxy has blocked a threat, **When** the developer views the local dashboard, **Then** they can see the blocked request logged with the threat type and redacted sensitive content.

---

### User Story 2 - PII and Financial Secret Detection (Priority: P1)

As a developer, I want the proxy to automatically detect and block requests containing sensitive personal information or critical financial secrets before they reach the LLM, and alert me when LLM responses leak such data.

**Why this priority**: Data protection is a critical security requirement. Blocking PII and financial secrets in requests prevents data leakage to LLM providers, while detecting them in responses prevents leakage to users. This addresses compliance requirements (GDPR, CCPA, etc.) and prevents financial loss from exposed credentials or private keys.

**Independent Test**: Can be fully tested by sending requests containing test PII (emails, SSNs, credit cards) and financial secrets (API keys, wallet addresses, private keys), verifying they're blocked, and sending requests that cause the LLM to generate such data in responses, verifying alerts are logged.

**Acceptance Scenarios**:

1. **Given** the proxy is running, **When** a request contains an email address, **Then** the request is blocked and logged as containing PII.
2. **Given** the proxy is running, **When** a request contains a Social Security Number, **Then** the request is blocked and logged as containing PII.
3. **Given** the proxy is running, **When** a request contains a credit card number, **Then** the request is blocked and logged as containing PII.
4. **Given** the proxy is running, **When** a request contains a blockchain wallet address, **Then** the request is blocked and logged as containing critical financial secrets.
5. **Given** the proxy is running, **When** a request contains a private key or seed phrase, **Then** the request is blocked and logged as containing critical financial secrets.
6. **Given** the proxy is running, **When** a request contains database credentials or API keys, **Then** the request is blocked and logged as containing critical financial secrets.
7. **Given** the proxy is running, **When** an LLM response contains PII or financial secrets, **Then** the response is not blocked but a high-severity alert is logged to both the local database and Sentry.
8. **Given** a data leak has been detected, **When** the developer views the dashboard or Sentry, **Then** they can see the alert with redacted sensitive content.

---

### User Story 3 - Self-Learning Threat Detection (Priority: P2)

As a developer, I want the proxy to learn from attacks it sees so that it automatically blocks similar or variant attacks in the future, even if they aren't caught by the initial detection rules.

**Why this priority**: Traditional rule-based systems can be bypassed with slight variations. Self-learning capability provides adaptive defense that improves over time without manual rule updates. While not critical for launch, this differentiates the tool from basic filters and provides long-term value.

**Independent Test**: Can be fully tested by sending a novel attack variant that initially passes through, verifying the learning mechanism captures it, then sending similar variants and verifying they're now blocked automatically.

**Acceptance Scenarios**:

1. **Given** the proxy has detected a prompt injection attack, **When** a similar but slightly modified attack is sent, **Then** it is automatically blocked without requiring manual rule updates.
2. **Given** the proxy has learned attack patterns, **When** a developer views the dashboard, **Then** they can see statistics on learned patterns and how many attacks were blocked using learned rules vs. baseline rules.
3. **Given** the proxy has been running for some time, **When** an attacker tries jailbreak variants (e.g., DAN variations), **Then** the proxy recognizes the pattern and blocks them automatically.

---

### User Story 4 - Local Dashboard and Observability (Priority: P2)

As a developer, I want to view real-time statistics and security events through a simple local web dashboard and have critical events automatically sent to our central monitoring system.

**Why this priority**: Observability is essential for security tools, but not required for the proxy to function. This enables developers to understand what's being blocked, tune settings if needed, and integrate with existing monitoring infrastructure. The local dashboard provides immediate feedback while Sentry integration supports enterprise monitoring.

**Independent Test**: Can be fully tested by generating various security events (blocked requests, data leak alerts), accessing the dashboard at localhost:8001, verifying statistics are accurate, filtering events, and confirming events appear in Sentry.

**Acceptance Scenarios**:

1. **Given** the proxy is running, **When** a developer runs the dashboard command or navigates to localhost:8001/dashboard, **Then** a web-based dashboard opens showing total requests, blocked vs. allowed counts, and attack type breakdown.
2. **Given** security events have occurred, **When** the developer views the dashboard, **Then** they can see a filterable log of recent events with timestamps, threat types, and redacted content.
3. **Given** security events have occurred, **When** the developer accesses Sentry, **Then** they can see the same events logged with appropriate severity levels.
4. **Given** the dashboard is displaying events, **When** sensitive data would be shown, **Then** it is redacted (e.g., "user@*****.com", "pk_*****", "0x****") before display.
5. **Given** the proxy is running, **When** the developer filters events by type (e.g., "Prompt Injection"), **Then** only events of that type are displayed.

---

### User Story 5 - CLI Management (Priority: P3)

As a developer, I want simple command-line tools to manage the proxy lifecycle (start, stop, validate) without needing to manually manage processes or configuration files.

**Why this priority**: While important for developer experience, the proxy can function with manual management. CLI commands improve usability and reduce friction for day-to-day operations, but aren't required for the core security functionality.

**Independent Test**: Can be fully tested by running each CLI command independently and verifying the expected outcome (proxy starts/stops, validation succeeds/fails with clear messages, dashboard opens in browser).

**Acceptance Scenarios**:

1. **Given** the tool is installed, **When** a developer runs `guardrail setup`, **Then** the proxy server starts on the configured port and confirms it's ready to accept requests.
2. **Given** the proxy is running, **When** a developer runs `guardrail stop`, **Then** the proxy server stops gracefully and confirms shutdown.
3. **Given** the proxy configuration exists, **When** a developer runs `guardrail validate`, **Then** the tool checks if services are running and API keys are valid, reporting the status of each.
4. **Given** the proxy is running, **When** a developer runs `guardrail dashboard`, **Then** the local dashboard opens in their default web browser.
5. **Given** a developer runs any command with invalid arguments, **When** the command fails, **Then** they receive clear error messages explaining what went wrong and how to fix it.

---

### User Story 6 - Streaming Support (Priority: P1)

As a developer, I want the proxy to support streaming LLM responses so that my application's user experience isn't degraded when using the proxy.

**Why this priority**: Many modern LLM applications use streaming for better UX (showing responses as they're generated). Without streaming support, the proxy would break this functionality, making it unusable for streaming applications. This is essential for transparent proxying.

**Independent Test**: Can be fully tested by sending a streaming request through the proxy and verifying that the response chunks arrive progressively, matching the behavior of a direct connection to the LLM provider.

**Acceptance Scenarios**:

1. **Given** an application uses streaming responses, **When** a request is sent through the proxy, **Then** response chunks are forwarded to the application as they arrive from the LLM, maintaining streaming behavior.
2. **Given** the proxy is processing a streaming response, **When** the response is being streamed, **Then** the full response is still scanned for data leaks after streaming completes, with alerts logged if necessary.
3. **Given** a streaming request contains threats, **When** the request is inspected, **Then** it is blocked before any streaming begins, with an immediate error response.

---

### Edge Cases

- What happens when the LLM provider API is unavailable or returns an error? The proxy should forward the error response to the application without modification and log the event.
- What happens when the proxy detects a threat in a very large request (>100KB)? The proxy should efficiently scan large payloads without timing out, potentially using streaming validation.
- What happens when multiple applications send requests simultaneously? The proxy should handle concurrent requests without blocking or degrading performance.
- What happens when a developer forgets to configure API keys? The setup wizard should validate keys during setup, and the validate command should detect missing keys.
- What happens when the local database (SQLite) grows very large? The proxy should implement automatic log rotation or retention policies to prevent unbounded growth.
- What happens when a request is partially malicious (contains both legitimate and malicious content)? The proxy should block the entire request if any malicious content is detected.
- What happens when the proxy's detection rules have false positives? Developers should be able to view flagged requests in the dashboard and potentially whitelist specific patterns (future enhancement beyond MVP).
- What happens when the proxy is under heavy load? The proxy should maintain low latency (<100ms overhead) for validation checks under normal load and degrade gracefully under extreme load.
- What happens during proxy updates or restarts? The proxy should handle graceful shutdown, allowing in-flight requests to complete before stopping.
- What happens when a request contains multiple types of threats? The proxy should log all detected threat types and block based on the highest severity.

## Requirements *(mandatory)*

### Functional Requirements

#### Transparent Proxying
- **FR-001**: System MUST accept requests on a configurable local port (default: localhost:8000) and forward them to the configured LLM provider endpoint.
- **FR-002**: System MUST support multiple LLM providers through LiteLLM, enabling compatibility with all providers supported by LiteLLM (OpenAI, Anthropic, Google, Cohere, Azure OpenAI, etc.).
- **FR-003**: System MUST support all standard LLM provider API endpoints and methods (chat completions, completions, embeddings, etc.) across supported providers.
- **FR-004**: System MUST preserve all request headers, body content, and query parameters when forwarding to the LLM provider (except when blocked).
- **FR-005**: System MUST support streaming responses, forwarding chunks to the client as they arrive from the LLM.
- **FR-006**: System MUST maintain API compatibility allowing applications to switch endpoint URLs without code changes.

#### Threat Detection - Incoming Requests
- **FR-007**: System MUST scan all incoming request bodies for prompt injection patterns before forwarding to the LLM.
- **FR-008**: System MUST scan all incoming requests for jailbreak attempts (e.g., DAN, role-playing exploits) before forwarding to the LLM.
- **FR-009**: System MUST scan all incoming requests for PII including email addresses, Social Security Numbers, phone numbers, and credit card numbers.
- **FR-010**: System MUST scan all incoming requests for critical financial secrets including API keys, database connection strings, blockchain wallet addresses, private keys, and seed phrases.
- **FR-011**: System MUST scan all incoming requests for toxic content including hate speech, violent content, and harassment.
- **FR-012**: System MUST use tiered confidence thresholds when evaluating threats: high-confidence detections block immediately, medium-confidence detections allow through but log warnings for review, low-confidence detections allow through without blocking.
- **FR-013**: System MUST block requests immediately when high-confidence threats are detected, returning an error response to the application without forwarding to the LLM.
- **FR-014**: System MUST provide clear error responses indicating the request was blocked, the threat type detected, confidence level, and a request ID for tracking.

#### Threat Detection - Outgoing Responses
- **FR-015**: System MUST scan all LLM responses for PII before forwarding to the application.
- **FR-016**: System MUST scan all LLM responses for critical financial secrets before forwarding to the application.
- **FR-017**: System MUST log high-severity alerts when PII or financial secrets are detected in responses, without blocking the response.
- **FR-018**: System MUST forward responses to the application even when data leaks are detected, as blocking could break application functionality.

#### Self-Learning
- **FR-019**: System MUST automatically create and store pattern fingerprints whenever baseline detection rules block a request.
- **FR-020**: System MUST store attack patterns from detected threats in a local learning database without requiring manual review or approval.
- **FR-021**: System MUST retain all learned patterns indefinitely without automatic pruning or expiration.
- **FR-022**: System MUST analyze stored attack patterns to identify common structures and variations.
- **FR-023**: System MUST apply learned patterns to future request validation, blocking similar attacks automatically.
- **FR-024**: System MUST distinguish between baseline rule detections and learned pattern detections in logs and statistics.

#### Local Storage and Observability
- **FR-025**: System MUST store all validation events (blocked requests, data leak alerts, allowed requests, and medium-confidence warnings) in a local SQLite database.
- **FR-026**: System MUST redact sensitive data before storing in the local database (replace detected PII/secrets with masked values like "***").
- **FR-027**: System MUST serve a web-based dashboard on a configurable port (default: localhost:8001/dashboard).
- **FR-028**: Dashboard MUST display total request count, blocked vs. allowed ratio, and breakdown by threat type.
- **FR-029**: Dashboard MUST display a filterable, paginated log of recent events with timestamps, threat types, confidence levels, and redacted content.
- **FR-030**: Dashboard MUST allow filtering events by type, time range, severity, and confidence level.
- **FR-031**: System MUST send security events to Sentry for centralized monitoring with appropriate severity levels.
- **FR-032**: System MUST redact sensitive data before sending events to Sentry.

#### CLI Management
- **FR-033**: System MUST provide a `guardrail setup` command that launches an interactive wizard to collect LLM provider API keys for multiple providers.
- **FR-034**: System MUST securely store API keys locally using Fernet symmetric encryption with a machine-specific key stored in the system keychain (encrypted at rest).
- **FR-035**: System MUST provide a `guardrail start` command that starts the proxy server and confirms when it's ready.
- **FR-036**: System MUST provide a `guardrail stop` command that gracefully stops the proxy server.
- **FR-037**: System MUST provide a `guardrail validate` command that checks if services are running and API keys are valid.
- **FR-038**: System MUST provide a `guardrail dashboard` command that opens the local dashboard in the default web browser.
- **FR-039**: All CLI commands MUST provide clear error messages and usage help when invoked incorrectly.

#### Performance and Scalability
- **FR-040**: System MUST add less than 100ms of latency overhead for fast path validation (NER + embeddings + regex) under normal load (< 100 requests/second). Full validation including Llama Guard may take up to 2 seconds on CPU or 300-400ms on GPU; the system MUST handle this gracefully via async processing or conditional validation.
- **FR-041**: System MUST handle concurrent requests without blocking.
- **FR-042**: System MUST implement automatic log retention cleanup for validation events to prevent unbounded database growth. Cleanup runs daily at 2 AM (configurable) and deletes events older than the retention period (default: 30 days retention for events, unlimited retention for learned patterns).

#### Configuration and Deployment
- **FR-043**: System MUST run entirely on the developer's local machine without requiring external cloud services for core functionality.
- **FR-044**: System MUST support configuration via environment variables or configuration file for all key settings (ports, LLM provider endpoints, event retention policies, confidence thresholds, etc.).
- **FR-045**: System MUST allow developers to disable specific threat detection types (PII, secrets, prompt injection, jailbreak, toxic content) via configuration file for development/debugging purposes.
- **FR-046**: System MUST require proxy restart when configuration changes are made to threat detection settings.
- **FR-047**: System MUST log a warning when any threat detection types are disabled, indicating the system is running in a less secure mode.
- **FR-048**: System MUST validate configuration on startup and report clear errors for invalid settings.

### Key Entities

- **Security Event**: Represents a validation event with attributes including timestamp, event type (blocked request, data leak alert, allowed request, medium-confidence warning), threat type (prompt injection, PII, jailbreak, etc.), confidence level, request ID, redacted content snippet, and severity level.

- **Attack Pattern**: Represents a learned threat pattern with attributes including pattern signature, detection count, first seen timestamp, last seen timestamp, and associated threat types.

- **Request**: Represents an incoming API request with attributes including request ID, timestamp, source application identifier, LLM provider target, headers, body content (validated and potentially blocked), and validation result.

- **Response**: Represents an outgoing LLM response with attributes including request ID, timestamp, body content (scanned for leaks), validation result, and any detected data leak types.

- **Configuration**: Represents system configuration including LLM provider API keys for multiple providers, proxy port, dashboard port, Sentry DSN, log retention period, confidence thresholds, and enabled/disabled threat detection types.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can complete the full setup process (download, install, configure, start proxy) in under 10 minutes.
- **SC-002**: The system successfully blocks 100% of standard OWASP LLM Top 10 test attacks provided in the test suite.
- **SC-003**: The system successfully blocks 100% of custom blockchain-related attack scenarios (wallet extraction, private key leaks, seed phrase detection).
- **SC-004**: The self-learning feature demonstrates the ability to block attack variants: an attack passes initially, is learned, and similar variants are blocked within 3 subsequent attempts.
- **SC-005**: Blocked events appear in the local dashboard within 1 second of detection with properly redacted sensitive data.
- **SC-006**: The proxy adds less than 100ms of latency overhead to requests under normal load (measured as 50th percentile).
- **SC-007**: The proxy handles at least 100 concurrent requests without errors or significant latency degradation (95th percentile < 500ms).
- **SC-008**: Streaming responses work transparently through the proxy with no perceivable difference in user experience compared to direct LLM provider connection.
- **SC-009**: 100% of events logged to the dashboard and Sentry have sensitive data properly redacted (verified through automated testing).
- **SC-010**: All CLI commands provide clear, actionable error messages when used incorrectly (measured through usability testing with 5+ developers).
- **SC-011**: The system correctly identifies and blocks at least 95% of PII patterns (emails, SSNs, credit cards) in test datasets.
- **SC-012**: The system correctly identifies and blocks at least 95% of financial secrets (API keys, wallet addresses, private keys) in test datasets.
- **SC-013**: The local database remains under 100MB for 30 days of typical usage (assuming ~1000 requests/day).

## Assumptions

- Developers have basic command-line proficiency and can run simple installation commands.
- Developers have existing applications that use standard LLM API formats.
- Developers have valid API keys for their chosen LLM providers (OpenAI, Anthropic, Google, Cohere, etc.).
- The local machine has sufficient resources to run the proxy including gateway functionality (minimal requirements: 512MB RAM, 1GB disk space).
- ML models are cached at `~/.cache/huggingface/` (respects `HF_HOME` environment variable) requiring approximately 10GB of disk space for the full model suite (NER: 440MB, Guard: 9GB, Embeddings: 22MB).
- Network connectivity to LLM providers is reliable.
- Developers want security without sacrificing the speed and features of their LLM applications.
- The primary threat model is external attacks through application interfaces, not compromised local development environments.
- Initial threat detection rules can be based on industry-standard patterns (OWASP, known jailbreaks, regex for PII/secrets).
- Self-learning will use lightweight ML techniques (pattern matching, similarity scoring) rather than heavy neural networks to maintain low latency.
- SQLite is sufficient for local storage needs (not expecting millions of requests per day in typical development scenarios).
- Dashboard users will access it from the same machine running the proxy (localhost access only by default).
- Sentry integration is optional; the proxy functions fully without it but provides enhanced observability when configured.
- The gateway interface provides sufficient abstraction to support multiple providers without provider-specific security logic.

## Dependencies

- LLM provider APIs must maintain stable endpoints and authentication mechanisms.
- If Sentry integration is used, a valid Sentry DSN must be provided during setup.
- The local machine must allow the proxy to bind to the configured ports (default 8000 and 8001).
- Applications must be able to modify their API endpoint configuration to point to the proxy.

## Out of Scope (for initial release)

- Multi-user authentication or access control for the dashboard (assumes single developer per proxy instance).
- Custom rule creation UI (developers cannot add custom threat detection rules through the dashboard).
- Distributed deployment or clustering (designed for single local instance).
- Provider-specific security customizations (security rules apply uniformly across all providers).
- Automatic remediation or response modification (blocked means blocked, no attempt to "fix" requests).
- Fine-grained whitelisting or exception management (future enhancement).
- Historical analytics or trend analysis (dashboard shows current state and recent events only).
- Integration with security orchestration platforms beyond Sentry.
- Support for LLM providers that don't use HTTP/REST APIs (e.g., native gRPC-only providers).
- Compliance certification or official security audits (internal tool).

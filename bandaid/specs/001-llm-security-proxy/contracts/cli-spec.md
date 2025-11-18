# CLI Specification: Bandaid Security Proxy

**Version**: 1.0.0
**Date**: 2025-11-12

## Overview

The `guardrail` CLI provides simple, developer-friendly commands to manage the Bandaid security proxy lifecycle. All commands follow Unix conventions with clear success/error exit codes and human-readable output.

**Design Principles**:
- **Zero Configuration Required**: Works with sensible defaults
- **Interactive When Needed**: Wizards for setup, prompts for confirmations
- **Clear Feedback**: Every command explains what it's doing
- **Safe by Default**: Destructive operations require confirmation

---

## Global Options

All commands support these global options:

```
--config PATH      Path to config file (default: ~/.bandaid/config.toml)
--verbose, -v      Enable verbose logging output
--quiet, -q        Suppress all non-error output
--help, -h         Show command help
--version          Show version and exit
```

---

## Commands

### `guardrail setup`

**Purpose**: Interactive wizard for initial configuration of the Bandaid proxy.

**Usage**:
```bash
guardrail setup [OPTIONS]
```

**Options**:
- `--non-interactive`: Skip wizard, use defaults (for CI/testing)
- `--force`: Overwrite existing configuration
- `--model-device DEVICE`: Set model device (cpu, cuda, mps)

**Interactive Flow**:

1. **Welcome Screen**:
   ```
   Welcome to Bandaid Security Proxy Setup!

   This wizard will guide you through initial configuration.
   You can change these settings later by editing ~/.bandaid/config.toml

   Press Enter to continue or Ctrl+C to exit.
   ```

2. **Proxy Port Configuration**:
   ```
   Proxy Server Port
   -----------------
   Your applications will send requests to this port.

   Default port: 8000
   Enter port (1024-65535) or press Enter for default:
   ```

3. **Dashboard Port Configuration**:
   ```
   Dashboard Port
   --------------
   The web dashboard will be available at http://localhost:PORT/dashboard

   Default port: 8001
   Enter port (1024-65535, must differ from proxy port) or press Enter for default:
   ```

4. **Provider Configuration**:
   ```
   LLM Provider Setup
   ------------------
   Configure at least one LLM provider. You can add more later.

   Available providers: OpenAI, Anthropic, Google (Gemini), Cohere, Azure OpenAI

   Which provider do you want to configure? (openai):
   ```

   For each provider:
   ```
   OpenAI Configuration
   --------------------
   API Key: ****************************************
   Custom API Base URL (optional, press Enter to skip):
   Set as default provider? (Y/n):

   Add another provider? (y/N):
   ```

5. **Sentry Configuration** (Optional):
   ```
   Sentry Integration (Optional)
   -----------------------------
   Send security events to Sentry for centralized monitoring.

   Enable Sentry? (y/N):
   ```

   If yes:
   ```
   Sentry DSN: https://***@***.ingest.sentry.io/***
   ```

6. **Model Device Selection**:
   ```
   ML Model Device
   ---------------
   Choose where to run security models:
   - cpu: Universal, slower (~1200ms for Guard)
   - cuda: NVIDIA GPU, faster (~300ms for Guard)
   - mps: Apple Silicon GPU, faster (~400ms for Guard)

   Detected hardware: [cpu | cuda | mps]

   Select device (cpu):
   ```

7. **Confirmation**:
   ```
   Configuration Summary
   ---------------------
   Proxy Port: 8000
   Dashboard Port: 8001
   Providers: OpenAI (default), Anthropic
   Sentry: Enabled
   Model Device: cuda

   Save configuration? (Y/n):
   ```

8. **Model Download** (if needed):
   ```
   Downloading ML Models...
   ✓ dslim/bert-base-NER (110MB) - Downloaded
   ✓ meta-llama/Llama-Guard-3-8B (9GB) - Downloading... 45%
   ```

9. **Completion**:
   ```
   ✓ Configuration saved to ~/.bandaid/config.toml
   ✓ ML models downloaded and ready

   Next Steps:
   1. Start the proxy: guardrail start
   2. View the dashboard: guardrail dashboard
   3. Test integration: Change your LLM API endpoint to http://localhost:8000/v1

   For help, run: guardrail --help
   ```

**Exit Codes**:
- `0`: Setup completed successfully
- `1`: Generic error (interrupted, I/O error)
- `2`: Invalid configuration (bad port, invalid API key format)
- `3`: Model download failed
- `4`: API key validation failed

**Examples**:
```bash
# Interactive setup
guardrail setup

# Non-interactive with defaults (for scripts)
guardrail setup --non-interactive

# Force overwrite existing config
guardrail setup --force

# Setup with GPU
guardrail setup --model-device cuda
```

---

### `guardrail start`

**Purpose**: Start the Bandaid proxy server.

**Usage**:
```bash
guardrail start [OPTIONS]
```

**Options**:
- `--foreground, -f`: Run in foreground (don't detach)
- `--port PORT`: Override proxy port from config
- `--dashboard-port PORT`: Override dashboard port from config
- `--reload`: Enable auto-reload on code changes (development)

**Behavior**:

1. **Pre-flight Checks**:
   - Verify config file exists (`~/.bandaid/config.toml`)
   - Validate configuration (ports available, providers configured)
   - Check if proxy is already running (via PID file)
   - Test model loading (eager-load NER, lazy-load Guard)

2. **Startup**:
   ```
   Starting Bandaid Security Proxy...
   ✓ Configuration loaded from ~/.bandaid/config.toml
   ✓ Models loaded (NER: ready, Guard: lazy-load, Embeddings: ready)
   ✓ Database initialized (~/.bandaid/events.db, ~/.bandaid/chroma/)
   ✓ Proxy server listening on http://localhost:8000
   ✓ Dashboard available at http://localhost:8001/dashboard

   PID: 12345 (written to ~/.bandaid/proxy.pid)

   Logs: ~/.bandaid/logs/proxy.log

   Press Ctrl+C to stop (foreground mode) or run: guardrail stop
   ```

3. **Foreground Mode** (`-f`):
   - Prints logs to stdout
   - Ctrl+C triggers graceful shutdown
   - Flushes all pending writes
   - Closes database connections

4. **Background Mode** (default):
   - Forks process (Unix) or starts subprocess (Windows)
   - Writes PID to `~/.bandaid/proxy.pid`
   - Redirects logs to `~/.bandaid/logs/proxy.log`
   - Returns control to shell immediately

**Exit Codes**:
- `0`: Proxy started successfully
- `1`: Generic error
- `2`: Configuration error (invalid config, missing API keys)
- `3`: Model loading failed
- `5`: Port already in use
- `6`: Already running (PID file exists and process is alive)

**Examples**:
```bash
# Start in background (default)
guardrail start

# Start in foreground for debugging
guardrail start --foreground

# Override ports
guardrail start --port 9000 --dashboard-port 9001

# Development mode with auto-reload
guardrail start --reload --foreground
```

---

### `guardrail stop`

**Purpose**: Stop the Bandaid proxy server gracefully.

**Usage**:
```bash
guardrail stop [OPTIONS]
```

**Options**:
- `--force, -f`: Force kill if graceful shutdown fails
- `--timeout SECONDS`: Graceful shutdown timeout (default: 30)

**Behavior**:

1. **Lookup Process**:
   - Read PID from `~/.bandaid/proxy.pid`
   - Verify process is running
   - Verify process is actually Bandaid (check command line)

2. **Graceful Shutdown**:
   ```
   Stopping Bandaid Security Proxy (PID: 12345)...
   ✓ Sent SIGTERM (graceful shutdown)
   ⏳ Waiting for shutdown (timeout: 30s)...
   ✓ Process stopped
   ✓ PID file removed
   ```

3. **Shutdown Actions** (performed by proxy before exit):
   - Finish processing in-flight requests
   - Flush event log to SQLite
   - Close database connections
   - Save ChromaDB state
   - Write final log entry

4. **Force Kill** (if timeout exceeded or `--force`):
   ```
   ⚠ Graceful shutdown timed out
   ✓ Sent SIGKILL (force kill)
   ✓ Process terminated
   ✓ PID file removed
   ```

**Exit Codes**:
- `0`: Proxy stopped successfully
- `1`: Generic error
- `7`: Not running (PID file not found or process dead)

**Examples**:
```bash
# Graceful stop
guardrail stop

# Force kill immediately
guardrail stop --force

# Longer timeout for busy proxy
guardrail stop --timeout 60
```

---

### `guardrail validate`

**Purpose**: Validate configuration and check system health.

**Usage**:
```bash
guardrail validate [OPTIONS]
```

**Options**:
- `--check-models`: Test load all ML models (slow)
- `--check-providers`: Validate API keys with test requests

**Behavior**:

Runs a series of health checks and reports results:

```
Bandaid Configuration Validation
=================================

Configuration File
------------------
✓ File exists: ~/.bandaid/config.toml
✓ Valid TOML syntax
✓ All required fields present
✓ Proxy port 8000 is available
✓ Dashboard port 8001 is available
✓ Confidence thresholds valid (high: 0.9, medium: 0.5-0.89)

Provider Configuration
----------------------
✓ OpenAI: API key configured (sk-...abc) [default]
✓ Anthropic: API key configured (sk-ant-...xyz)
⚠ Google: API key not configured (provider disabled)

ML Models (--check-models)
--------------------------
✓ NER model (dslim/bert-base-NER): Loaded in 1.2s
✓ Guard model (meta-llama/Llama-Guard-3-8B): Loaded in 8.5s
✓ Embedding model (all-MiniLM-L6-v2): Loaded in 0.3s

Storage
-------
✓ SQLite database: ~/.bandaid/events.db (12.5 MB, 1,234 events)
✓ ChromaDB directory: ~/.bandaid/chroma/ (89.2 MB, 456 patterns)
ℹ Disk space available: 125 GB

Provider Connectivity (--check-providers)
-----------------------------------------
✓ OpenAI: Reachable (test request: 245ms)
✓ Anthropic: Reachable (test request: 312ms)
× Google: Not configured

Warnings
--------
⚠ 1 provider not configured (Google)
⚠ Running on CPU (consider GPU for better performance)

Summary
-------
Status: HEALTHY (2 warnings)

Configuration is valid. Run 'guardrail start' to begin.
```

**Exit Codes**:
- `0`: All checks passed (or warnings only)
- `1`: Generic error
- `2`: Configuration invalid
- `3`: Models cannot be loaded
- `4`: API key validation failed

**Examples**:
```bash
# Quick validation
guardrail validate

# Full validation with model loading
guardrail validate --check-models

# Validate API keys with test requests
guardrail validate --check-providers

# Full health check
guardrail validate --check-models --check-providers
```

---

### `guardrail dashboard`

**Purpose**: Open the web dashboard in the default browser.

**Usage**:
```bash
guardrail dashboard [OPTIONS]
```

**Options**:
- `--port PORT`: Override dashboard port
- `--no-open`: Print URL but don't open browser

**Behavior**:

1. Check if proxy is running
2. Determine dashboard URL from config
3. Open URL in default browser

**Output**:
```
Opening Bandaid Dashboard...
✓ Proxy is running (PID: 12345)
✓ Dashboard available at http://localhost:8001/dashboard
🌐 Opening in default browser...
```

Or if proxy not running:
```
⚠ Proxy is not running
ℹ Start the proxy first: guardrail start
✗ Cannot open dashboard
```

**Exit Codes**:
- `0`: Dashboard opened successfully
- `7`: Proxy not running

**Examples**:
```bash
# Open dashboard
guardrail dashboard

# Print URL without opening
guardrail dashboard --no-open

# Use custom port
guardrail dashboard --port 9001
```

---

### `guardrail config show`

**Purpose**: Display current configuration (sanitized).

**Usage**:
```bash
guardrail config show [OPTIONS]
```

**Options**:
- `--format FORMAT`: Output format (table, json, yaml)
- `--show-keys`: Show masked API keys (e.g., sk-...abc)

**Output** (default table format):
```
Bandaid Configuration
=====================

General
-------
Config File: ~/.bandaid/config.toml
Proxy Port: 8000
Dashboard Port: 8001
Log Retention: 30 days
Model Device: cpu

Providers
---------
OpenAI: Configured (sk-...abc) [default]
Anthropic: Configured (sk-ant-...xyz)

Confidence Thresholds
---------------------
High: ≥ 0.9 (block immediately)
Medium: 0.5 - 0.89 (log warning)
Low: < 0.5 (allow)

Disabled Checks
---------------
(none)

Sentry
------
Enabled: Yes
DSN: https://***@o123.ingest.sentry.io/***
```

**Exit Codes**:
- `0`: Configuration displayed successfully
- `2`: Configuration file not found or invalid

**Examples**:
```bash
# Show config as table
guardrail config show

# Show as JSON
guardrail config show --format json

# Show with masked API keys
guardrail config show --show-keys
```

---

### `guardrail config set`

**Purpose**: Update a configuration value without editing the file.

**Usage**:
```bash
guardrail config set <key> <value>
```

**Supported Keys**:
- `proxy_port`: Proxy server port
- `dashboard_port`: Dashboard port
- `log_retention_days`: Event retention period
- `model_device`: Device for ML models (cpu, cuda, mps)
- `confidence.high`: High confidence threshold
- `confidence.medium_min`: Medium confidence minimum
- `sentry_dsn`: Sentry DSN (or "none" to disable)

**Behavior**:

1. Validate new value
2. Update TOML file
3. Warn if proxy restart required

**Output**:
```
Updating configuration...
✓ Set proxy_port = 9000
⚠ Restart required: guardrail stop && guardrail start
```

**Exit Codes**:
- `0`: Configuration updated successfully
- `2`: Invalid key or value

**Examples**:
```bash
# Change proxy port
guardrail config set proxy_port 9000

# Update confidence threshold
guardrail config set confidence.high 0.95

# Disable Sentry
guardrail config set sentry_dsn none

# Change model device
guardrail config set model_device cuda
```

---

### `guardrail status`

**Purpose**: Show proxy runtime status.

**Usage**:
```bash
guardrail status
```

**Output** (if running):
```
Bandaid Security Proxy Status
==============================

Status: RUNNING ✓
PID: 12345
Uptime: 2 hours, 34 minutes
Proxy URL: http://localhost:8000
Dashboard URL: http://localhost:8001/dashboard

Recent Activity (last 1 hour)
------------------------------
Total Requests: 234
Blocked: 5 (2.1%)
Allowed: 229 (97.9%)
Warnings: 3
Data Leak Alerts: 0

Resource Usage
--------------
Memory: 2.4 GB (includes loaded models)
CPU: 12%
Disk (Events DB): 15.3 MB
Disk (Patterns): 92.1 MB

Logs
----
Location: ~/.bandaid/logs/proxy.log
Size: 8.2 MB
Last Entry: 2025-11-12 15:45:32 UTC
```

**Output** (if not running):
```
Bandaid Security Proxy Status
==============================

Status: NOT RUNNING ✗
PID File: Not found

To start: guardrail start
```

**Exit Codes**:
- `0`: Status displayed successfully
- `7`: Proxy not running (but still displays status)

---

## Exit Code Reference

| Code | Meaning | Example Scenario |
|------|---------|------------------|
| 0 | Success | Command completed successfully |
| 1 | Generic error | Unexpected exception, I/O error |
| 2 | Configuration error | Invalid port, malformed TOML, missing required field |
| 3 | Model loading error | HuggingFace model download failed, out of disk space |
| 4 | API key validation error | Invalid API key format, provider rejected key |
| 5 | Port already in use | Another service using 8000 or 8001 |
| 6 | Already running | Attempted to start while PID file exists |
| 7 | Not running | Attempted to stop/status when not running |

---

## Configuration File Format

**Location**: `~/.bandaid/config.toml`

**Example**:
```toml
# Bandaid Security Proxy Configuration

[general]
proxy_port = 8000
dashboard_port = 8001
log_retention_days = 30
model_device = "cpu"  # Options: cpu, cuda, mps

[confidence_thresholds]
high = 0.9          # Block immediately
medium_min = 0.5    # Log warning, allow

[disabled_checks]
# Uncomment to disable specific checks (NOT RECOMMENDED for production)
# checks = ["pii", "financial_secret", "prompt_injection", "jailbreak", "toxic_content"]
checks = []

[[providers]]
provider = "openai"
api_key = "fernet_encrypted_value_here"  # Encrypted at rest
api_base = ""  # Optional custom base URL
default = true

[[providers]]
provider = "anthropic"
api_key = "fernet_encrypted_value_here"
default = false

[observability]
sentry_dsn = "https://***@o123.ingest.sentry.io/***"  # Optional
```

**Note**: API keys are encrypted using Fernet symmetric encryption with a machine-specific key stored in the system keychain. Never commit config files with real API keys to version control.

---

## Environment Variables

The CLI respects these environment variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `BANDAID_CONFIG` | Config file path | `~/.bandaid/config.toml` |
| `BANDAID_HOME` | Data directory | `~/.bandaid` |
| `BANDAID_LOG_LEVEL` | Log level | `INFO` |
| `NO_COLOR` | Disable colored output | (not set) |
| `CI` | Non-interactive mode | (not set) |

**Example**:
```bash
# Use custom config location
export BANDAID_CONFIG=/etc/bandaid/config.toml
guardrail start

# Enable debug logging
export BANDAID_LOG_LEVEL=DEBUG
guardrail validate --check-models
```

---

## Error Messages

All CLI commands provide clear, actionable error messages:

**Good Examples**:
```
✗ Error: Proxy port 8000 is already in use
  Try a different port: guardrail start --port 8080
  Or stop the conflicting service

✗ Error: Configuration file not found: ~/.bandaid/config.toml
  Run setup first: guardrail setup

✗ Error: API key validation failed for provider 'openai'
  The API key format is invalid or the key has been revoked.
  Update your key: guardrail setup --force

✗ Error: Model download failed: meta-llama/Llama-Guard-3-8B
  Insufficient disk space (9.2 GB required, 2.1 GB available)
  Free up disk space and run: guardrail setup
```

**Bad Examples** (what we avoid):
```
✗ Error: ECONNREFUSED
✗ Error: Invalid configuration
✗ Error: An error occurred
```

---

## Shell Completion

The CLI provides shell completion for Bash, Zsh, and Fish:

```bash
# Bash
guardrail --install-completion bash
source ~/.bashrc

# Zsh
guardrail --install-completion zsh
source ~/.zshrc

# Fish
guardrail --install-completion fish
source ~/.config/fish/config.fish
```

Completion supports:
- Command names (start, stop, validate, etc.)
- Option flags (--port, --force, etc.)
- Configuration keys (for `config set`)

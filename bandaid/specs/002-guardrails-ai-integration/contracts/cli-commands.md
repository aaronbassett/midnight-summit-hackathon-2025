# CLI Commands Contract: Guardrails AI Integration

**Feature**: 002-guardrails-ai-integration
**Date**: 2025-11-13
**Contract Type**: Command-Line Interface

---

## Overview

This document defines the command-line interface for managing Guardrails AI validators in the Bandaid security proxy. All commands are accessible via the `guardrail` CLI tool.

---

## Command Structure

```
guardrail validators <subcommand> [options] [arguments]
```

**Design Principles**:
- Follow existing Bandaid CLI conventions (Typer framework)
- Consistent flag names across subcommands
- Human-readable output by default, `--format json` for automation
- Clear error messages with actionable next steps
- Non-destructive operations require confirmation flags

---

## Commands

### 1. Configure Guardrails Hub

Set up Guardrails Hub API credentials and global settings.

**Command**:
```bash
guardrail validators configure [OPTIONS]
```

**Options**:
| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--token` | string | No | None | Guardrails Hub JWT token (or set GR_TOKEN env var) |
| `--hub-url` | string | No | https://hub.api.guardrailsai.com | Guardrails Hub API URL |
| `--remote` | bool | No | true | Use remote inference for validators |
| `--timeout` | int | No | 10 | Default validator timeout in seconds |
| `--interactive` | bool | No | false | Launch interactive configuration wizard |

**Behavior**:
- If `--token` not provided and GR_TOKEN not set, prompt for token input (unless `--interactive`)
- Validate token by calling Hub API `/health` endpoint
- Store configuration in `~/.guardrailsrc` or update existing config
- Update Bandaid config file with Guardrails settings
- Display success message with configured settings

**Output** (default):
```
✓ Guardrails Hub configured successfully

Settings:
  Hub URL: https://hub.api.guardrailsai.com
  Remote Inference: Enabled
  Default Timeout: 10s
  Token: gr_***************xyz (valid)

Next steps:
  - Install validators: guardrail validators install hub://guardrails/detect_pii
  - List available validators: guardrail validators search
```

**Output** (`--format json`):
```json
{
  "success": true,
  "config": {
    "hub_url": "https://hub.api.guardrailsai.com",
    "remote_inference": true,
    "default_timeout": 10,
    "token_valid": true
  }
}
```

**Errors**:
```bash
# Invalid token
Error: Guardrails Hub token is invalid or expired
  → Obtain a new token at https://hub.guardrailsai.com/keys
  → Set with: guardrail validators configure --token <TOKEN>

# Hub unreachable
Error: Cannot connect to Guardrails Hub at https://hub.api.guardrailsai.com
  → Check network connectivity
  → Verify Hub URL: guardrail validators configure --hub-url <URL>
```

**Exit Codes**:
- `0`: Configuration successful
- `1`: Invalid token or Hub unreachable
- `2`: Invalid arguments

---

### 2. Search Available Validators

Browse validators available in the Guardrails Hub.

**Command**:
```bash
guardrail validators search [QUERY] [OPTIONS]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `QUERY` | string | No | Search term (e.g., "pii", "toxic", "injection") |

**Options**:
| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--category` | string | No | all | Filter by category (security, quality, bias, custom) |
| `--limit` | int | No | 20 | Maximum results to display |
| `--format` | string | No | table | Output format (table, json, yaml) |

**Behavior**:
- Query Guardrails Hub API `/validators` endpoint
- Display validators matching query and category filters
- Show validator name, ID, description, version, and install command
- Sort by relevance (if query provided) or popularity

**Output** (default - table):
```
Available Guardrails Validators (12 results):

NAME                  ID                          VERSION   DESCRIPTION
────────────────────────────────────────────────────────────────────────────────
PII Detection         guardrails/detect_pii       1.4.2     Detects and redacts PII using Presidio
Prompt Injection      guardrails/prompt_injection 0.2.1     Detects prompt injection attacks
Toxic Language        guardrails/toxic_language   0.1.5     Filters toxic and offensive content
Competitor Check      guardrails/competitor_check 0.1.2     Detects competitor mentions
Secrets Detection     guardrails/secrets_present  1.0.3     Finds API keys and secrets

To install: guardrail validators install hub://guardrails/<ID>
To view details: guardrail validators info <ID>
```

**Output** (`--format json`):
```json
{
  "total": 12,
  "validators": [
    {
      "id": "guardrails/detect_pii",
      "name": "PII Detection",
      "version": "1.4.2",
      "description": "Detects and redacts PII using Presidio",
      "category": "security",
      "author": "Guardrails AI",
      "install_command": "guardrail validators install hub://guardrails/detect_pii",
      "hub_uri": "hub://guardrails/detect_pii"
    }
  ]
}
```

**Errors**:
```bash
# Hub not configured
Error: Guardrails Hub not configured
  → Run: guardrail validators configure

# No results
No validators found matching "xyz"
  → Try broader search terms
  → Browse all validators: guardrail validators search
```

**Exit Codes**:
- `0`: Search successful (even if 0 results)
- `1`: Hub not configured or unreachable

---

### 3. Install Validator

Install a validator from the Guardrails Hub.

**Command**:
```bash
guardrail validators install HUB_URI [OPTIONS]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `HUB_URI` | string | Yes | Validator Hub URI (e.g., hub://guardrails/detect_pii or guardrails/detect_pii) |

**Options**:
| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--version` | string | No | latest | Validator version (e.g., ~=1.4, ==1.4.2) |
| `--no-local-models` | bool | No | false | Skip downloading local ML models (for remote inference) |
| `--upgrade` | bool | No | false | Upgrade if already installed |
| `--enabled` | bool | No | false | Enable validator after installation |
| `--severity` | string | No | high | Severity level (critical, high, medium, low) |
| `--on-fail` | string | No | exception | Action on failure (exception, filter, fix, reask) |
| `--timeout` | int | No | 10 | Validator timeout in seconds |

**Behavior**:
- Parse Hub URI to extract validator ID and version
- Check if validator already installed (error if exists and `--upgrade` not set)
- Run `guardrails hub install <HUB_URI>` command
- Download ML models unless `--no-local-models` set
- Create `ValidatorConfig` record in database
- Set `enabled` based on `--enabled` flag
- Display installation progress and final status

**Output** (default):
```
Installing validator: guardrails/detect_pii~=1.4

✓ Downloaded package: guardrails-detect-pii (1.4.2)
✓ Installed dependencies: presidio-analyzer, presidio-anonymizer, nltk
⏳ Downloading ML models... (this may take a few minutes)
✓ Downloaded models: en_core_web_lg, presidio_analyzer_default
✓ Registered validator: guardrails/detect_pii

Validator installed successfully!

Settings:
  ID: guardrails/detect_pii
  Version: 1.4.2
  Enabled: false
  Severity: high
  On Fail: exception
  Timeout: 10s

Next steps:
  - Enable validator: guardrail validators enable detect_pii
  - Configure parameters: guardrail validators config detect_pii --set pii_entities=pii
  - Test validator: guardrail validators test detect_pii --text "Email me at user@example.com"
```

**Output** (`--format json`):
```json
{
  "success": true,
  "validator": {
    "id": "guardrails/detect_pii",
    "version": "1.4.2",
    "package_name": "guardrails-detect-pii",
    "enabled": false,
    "severity": "high",
    "on_fail": "exception",
    "timeout": 10
  },
  "models_downloaded": [
    "en_core_web_lg",
    "presidio_analyzer_default"
  ]
}
```

**Errors**:
```bash
# Already installed
Error: Validator guardrails/detect_pii is already installed (version 1.4.2)
  → Use --upgrade to update: guardrail validators install hub://guardrails/detect_pii --upgrade
  → Uninstall first: guardrail validators uninstall detect_pii

# Installation failed
Error: Failed to install validator guardrails/detect_pii
  Reason: Package not found in PyPI

  → Verify validator ID: guardrail validators search pii
  → Check Hub status: https://hub.guardrailsai.com/status

# Dependency conflict
Warning: Validator guardrails/detect_pii requires presidio-analyzer~=2.2,
         but presidio-analyzer==2.1.0 is already installed

  → Recommendation: Use remote inference to avoid dependency conflicts
  → Install with: guardrail validators install hub://guardrails/detect_pii --no-local-models
```

**Exit Codes**:
- `0`: Installation successful
- `1`: Validator already installed (without `--upgrade`)
- `2`: Installation failed (network, dependency conflict, etc.)

---

### 4. List Installed Validators

Display all installed validators and their status.

**Command**:
```bash
guardrail validators list [OPTIONS]
```

**Options**:
| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--enabled-only` | bool | No | false | Show only enabled validators |
| `--disabled-only` | bool | No | false | Show only disabled validators |
| `--format` | string | No | table | Output format (table, json, yaml) |
| `--verbose` | bool | No | false | Show full configuration details |

**Behavior**:
- Query `guardrails_validators` table from database
- Display validator ID, name, version, enabled status, severity, and apply_to
- Sort by enabled status (enabled first), then severity (critical first)

**Output** (default - table):
```
Installed Guardrails Validators (4):

ID                          NAME              VERSION   ENABLED   SEVERITY   APPLY TO
─────────────────────────────────────────────────────────────────────────────────────
guardrails/detect_pii       PII Detection     1.4.2     ✓         critical   input, output
guardrails/prompt_injection Prompt Injection  0.2.1     ✓         critical   input
guardrails/toxic_language   Toxic Language    0.1.5     ✓         high       output
guardrails/competitor_check Competitor Check  0.1.2     ✗         medium     output

Enabled: 3 / 4
Total Executions (last 7 days): 1,234
Average Latency: 42ms

To enable a validator: guardrail validators enable <ID>
To configure: guardrail validators config <ID>
```

**Output** (`--verbose`):
```
Installed Guardrails Validators (4):

────────────────────────────────────────────────────────────
Validator: guardrails/detect_pii
  Name: PII Detection
  Version: 1.4.2
  Package: guardrails-detect-pii
  Installed: 2025-11-10 14:23:00

  Configuration:
    Enabled: true
    Severity: critical
    On Fail: exception
    Apply To: input, output
    Timeout: 10s
    Remote Inference: true

  Parameters:
    pii_entities: pii
    anonymize: true

  Performance (last 7 days):
    Executions: 456
    Failures: 23 (5.0%)
    Average Latency: 38ms
────────────────────────────────────────────────────────────
[... other validators ...]
```

**Output** (`--format json`):
```json
{
  "validators": [
    {
      "id": "guardrails/detect_pii",
      "name": "PII Detection",
      "version": "1.4.2",
      "package_name": "guardrails-detect-pii",
      "enabled": true,
      "severity": "critical",
      "on_fail": "exception",
      "apply_to": ["input", "output"],
      "timeout": 10,
      "remote_inference": true,
      "installed_at": "2025-11-10T14:23:00Z",
      "params": {
        "pii_entities": "pii",
        "anonymize": true
      }
    }
  ],
  "summary": {
    "total": 4,
    "enabled": 3,
    "disabled": 1,
    "total_executions_7d": 1234,
    "avg_latency_ms": 42
  }
}
```

**Exit Codes**:
- `0`: Success (even if no validators installed)

---

### 5. Enable Validator

Enable a disabled validator.

**Command**:
```bash
guardrail validators enable VALIDATOR_ID [OPTIONS]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `VALIDATOR_ID` | string | Yes | Validator ID (e.g., detect_pii or guardrails/detect_pii) |

**Options**:
| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--restart-proxy` | bool | No | false | Restart proxy to apply changes immediately |

**Behavior**:
- Look up validator by ID in database
- Set `enabled=true` in `ValidatorConfig`
- Update configuration file
- Optionally restart proxy if `--restart-proxy` set

**Output** (default):
```
✓ Enabled validator: guardrails/detect_pii

The validator will be applied to:
  - Input prompts
  - LLM responses

Severity: critical (blocks on failure)
On Fail: exception

⚠ Proxy restart required for changes to take effect
  → Restart: guardrail restart
  → Or enable with: guardrail validators enable detect_pii --restart-proxy
```

**Exit Codes**:
- `0`: Validator enabled successfully
- `1`: Validator not found
- `2`: Validator already enabled

---

### 6. Disable Validator

Disable an enabled validator without uninstalling it.

**Command**:
```bash
guardrail validators disable VALIDATOR_ID [OPTIONS]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `VALIDATOR_ID` | string | Yes | Validator ID |

**Options**:
| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--restart-proxy` | bool | No | false | Restart proxy to apply changes immediately |

**Behavior**:
- Look up validator by ID in database
- Set `enabled=false` in `ValidatorConfig`
- Update configuration file
- Optionally restart proxy if `--restart-proxy` set

**Output** (default):
```
✓ Disabled validator: guardrails/detect_pii

The validator will no longer run on LLM traffic.

⚠ Proxy restart required for changes to take effect
  → Restart: guardrail restart
```

**Exit Codes**:
- `0`: Validator disabled successfully
- `1`: Validator not found
- `2`: Validator already disabled

---

### 7. Uninstall Validator

Remove a validator completely from the system.

**Command**:
```bash
guardrail validators uninstall VALIDATOR_ID [OPTIONS]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `VALIDATOR_ID` | string | Yes | Validator ID |

**Options**:
| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--confirm` | bool | No | false | Skip confirmation prompt |
| `--keep-data` | bool | No | false | Keep execution history (delete only validator config) |

**Behavior**:
- Prompt for confirmation (unless `--confirm` set)
- Disable validator if currently enabled
- Uninstall pip package: `pip uninstall <package_name>`
- Delete `ValidatorConfig` record from database
- Optionally delete execution history (unless `--keep-data` set)
- Delete validator from `guardrails/hub/__init__.py` imports

**Output** (default):
```
⚠ This will permanently remove validator: guardrails/detect_pii

  - Uninstall package: guardrails-detect-pii
  - Delete configuration
  - Delete 456 execution records

Continue? [y/N]: y

✓ Uninstalled pip package: guardrails-detect-pii
✓ Deleted validator configuration
✓ Deleted 456 execution records

Validator guardrails/detect_pii has been completely removed.

To reinstall: guardrail validators install hub://guardrails/detect_pii
```

**Exit Codes**:
- `0`: Uninstallation successful
- `1`: Validator not found
- `2`: User cancelled confirmation

---

### 8. Configure Validator Parameters

Update validator-specific parameters.

**Command**:
```bash
guardrail validators config VALIDATOR_ID [OPTIONS]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `VALIDATOR_ID` | string | Yes | Validator ID |

**Options**:
| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--severity` | string | No | current | Severity level (critical, high, medium, low) |
| `--on-fail` | string | No | current | Action on failure (exception, filter, fix, reask) |
| `--timeout` | int | No | current | Validator timeout in seconds |
| `--apply-to` | string | No | current | Traffic direction (input, output, or both) |
| `--set` | string | No | - | Set parameter (format: key=value, repeatable) |
| `--show` | bool | No | false | Show current configuration without updating |

**Behavior**:
- Look up validator by ID
- Update configuration fields based on flags
- Validate parameter values (e.g., `--set pii_entities=pii`)
- Save updated `ValidatorConfig` to database
- Display updated configuration

**Output** (default):
```
Updated configuration for: guardrails/detect_pii

Settings:
  Severity: critical → high
  On Fail: exception (unchanged)
  Timeout: 10s → 15s
  Apply To: input, output (unchanged)

Parameters:
  pii_entities: pii → email,phone
  anonymize: true (new)

⚠ Proxy restart required for changes to take effect
  → Restart: guardrail restart
```

**Output** (`--show`):
```
Configuration for: guardrails/detect_pii

General:
  ID: guardrails/detect_pii
  Name: PII Detection
  Version: 1.4.2
  Enabled: true

Execution:
  Severity: critical
  On Fail: exception
  Timeout: 10s
  Apply To: input, output
  Remote Inference: true

Parameters:
  pii_entities: pii
  anonymize: false

To update: guardrail validators config detect_pii --set <key>=<value>
```

**Examples**:
```bash
# Change severity level
guardrail validators config detect_pii --severity high

# Update multiple parameters
guardrail validators config detect_pii \
  --set pii_entities=email,phone \
  --set anonymize=true \
  --timeout 15

# Apply only to outputs
guardrail validators config detect_pii --apply-to output

# Show current config
guardrail validators config detect_pii --show
```

**Exit Codes**:
- `0`: Configuration updated successfully
- `1`: Validator not found
- `2`: Invalid parameter value

---

### 9. Test Validator

Test a validator on sample text without affecting live traffic.

**Command**:
```bash
guardrail validators test VALIDATOR_ID [OPTIONS]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `VALIDATOR_ID` | string | Yes | Validator ID |

**Options**:
| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--text` | string | No* | - | Text to validate (or use --file) |
| `--file` | path | No* | - | File containing text to validate |
| `--direction` | string | No | input | Traffic direction (input or output) |
| `--format` | string | No | text | Output format (text, json) |

*One of `--text` or `--file` required

**Behavior**:
- Load validator configuration
- Run validator on provided text
- Display validation result, timing, and any modifications
- Do NOT save result to database (test only)

**Output** (default):
```
Testing validator: guardrails/detect_pii

Input Text:
  "Please email me at user@example.com with the details"

Validation Result: ❌ FAILED

Failures:
  - PII detected: EMAIL at position 20-36
  - Entity: user@example.com

On Fail Action: exception
→ Request would be BLOCKED in production

Fixed Text (if on_fail=fix):
  "Please email me at [REDACTED] with the details"

Execution Time: 38ms
Confidence Score: 0.0 (critical severity)

To apply to live traffic:
  - Enable validator: guardrail validators enable detect_pii
  - Restart proxy: guardrail restart
```

**Output** (`--format json`):
```json
{
  "validator_id": "guardrails/detect_pii",
  "validator_version": "1.4.2",
  "input_text": "Please email me at user@example.com with the details",
  "validation_result": {
    "status": "fail",
    "failures": [
      {
        "type": "PII",
        "entity": "EMAIL",
        "text": "user@example.com",
        "start": 20,
        "end": 36
      }
    ],
    "on_fail_action": "exception",
    "would_block": true,
    "fixed_text": "Please email me at [REDACTED] with the details",
    "confidence_score": 0.0,
    "execution_time_ms": 38
  }
}
```

**Exit Codes**:
- `0`: Test completed successfully (regardless of validation result)
- `1`: Validator not found
- `2`: Invalid arguments (missing --text or --file)

---

### 10. View Validator Execution History

Display recent validation events for a validator.

**Command**:
```bash
guardrail validators history VALIDATOR_ID [OPTIONS]
```

**Arguments**:
| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `VALIDATOR_ID` | string | Yes | Validator ID (or "all" for all validators) |

**Options**:
| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--limit` | int | No | 20 | Maximum results to display |
| `--status` | string | No | all | Filter by status (pass, fail, error, timeout, all) |
| `--direction` | string | No | all | Filter by direction (input, output, all) |
| `--since` | string | No | 24h | Time range (e.g., 1h, 24h, 7d, 30d) |
| `--format` | string | No | table | Output format (table, json, csv) |

**Behavior**:
- Query `guardrails_executions` table
- Filter by validator ID, status, direction, and time range
- Display execution results sorted by timestamp (newest first)

**Output** (default - table):
```
Execution History: guardrails/detect_pii (last 24 hours)

TIMESTAMP            REQUEST ID       DIRECTION   STATUS   LATENCY   REASON
──────────────────────────────────────────────────────────────────────────────
2025-11-13 14:23:45  a3f4b2...       input       fail     38ms      PII detected: EMAIL
2025-11-13 14:22:10  9c8d1e...       output      pass     42ms      -
2025-11-13 14:20:33  5b7a3f...       input       timeout  10000ms   Validator timeout
2025-11-13 14:18:21  2e6f9c...       output      pass     35ms      -

Summary:
  Total Executions: 1,234
  Passes: 1,180 (95.6%)
  Failures: 48 (3.9%)
  Timeouts: 5 (0.4%)
  Errors: 1 (0.1%)
  Average Latency: 41ms

To view full details: guardrail validators history detect_pii --format json
```

**Output** (`--format json`):
```json
{
  "validator_id": "guardrails/detect_pii",
  "time_range": "24h",
  "executions": [
    {
      "execution_id": "a3f4b2c1-...",
      "request_id": "9c8d1e5f-...",
      "timestamp": "2025-11-13T14:23:45Z",
      "direction": "input",
      "status": "fail",
      "latency_ms": 38,
      "failure_reason": "PII detected: EMAIL",
      "confidence_score": 0.0
    }
  ],
  "summary": {
    "total": 1234,
    "passes": 1180,
    "failures": 48,
    "timeouts": 5,
    "errors": 1,
    "pass_rate": 0.956,
    "avg_latency_ms": 41
  }
}
```

**Exit Codes**:
- `0`: History retrieved successfully (even if no results)
- `1`: Validator not found

---

## Global Flags

All `guardrail validators` commands support these global flags:

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--help` | bool | false | Show command help and exit |
| `--version` | bool | false | Show Bandaid version and exit |
| `--config` | path | ~/.bandaid/config.yaml | Path to Bandaid config file |
| `--verbose` | bool | false | Enable verbose logging |
| `--quiet` | bool | false | Suppress all output except errors |

---

## Error Handling

### Common Error Scenarios

**Hub Not Configured**:
```bash
Error: Guardrails Hub not configured

Next steps:
  1. Obtain API key: https://hub.guardrailsai.com/keys
  2. Configure: guardrail validators configure --token <TOKEN>
```

**Token Expired**:
```bash
Error: Guardrails Hub token expired

Next steps:
  1. Generate new token: https://hub.guardrailsai.com/keys
  2. Update: guardrail validators configure --token <NEW_TOKEN>
```

**Validator Not Found**:
```bash
Error: Validator 'detect_xyz' not found

Installed validators:
  - detect_pii
  - toxic_language
  - competitor_check

To search Hub: guardrail validators search detect
```

**Network Error**:
```bash
Error: Cannot connect to Guardrails Hub

Possible causes:
  - Network connectivity issue
  - Hub service unavailable
  - Firewall blocking access

Check status: https://hub.guardrailsai.com/status
```

---

## Integration with Existing Commands

### Modified: `guardrail setup`

Extend existing setup wizard to include Guardrails configuration step:

```bash
guardrail setup

...existing setup steps...

────────────────────────────────────────────────
Step 7: Guardrails AI Integration (Optional)
────────────────────────────────────────────────

Guardrails AI provides pre-built validators for LLM security.

Enable Guardrails AI? [y/N]: y

Enter Guardrails Hub API token (or press Enter to skip):
Token: gr_***************xyz

✓ Token validated successfully

Select validators to install:
  [x] PII Detection (recommended)
  [x] Prompt Injection Detection (recommended)
  [ ] Toxic Language Filtering
  [ ] Competitor Mention Check

Installing selected validators...
✓ Installed 2 validators

Guardrails AI configured successfully!
```

### Modified: `guardrail status`

Include Guardrails status in system status output:

```bash
guardrail status

...existing status output...

Guardrails AI:
  Enabled: true
  Hub Connected: true
  Installed Validators: 4 (3 enabled)
  Recent Activity (24h):
    Executions: 1,234
    Failures: 52 (4.2%)
    Average Latency: 42ms
```

---

## Examples

### Complete Workflow

```bash
# 1. Configure Guardrails Hub
guardrail validators configure --token gr_xxxxx

# 2. Search for validators
guardrail validators search pii

# 3. Install PII detection validator
guardrail validators install hub://guardrails/detect_pii --no-local-models

# 4. Configure validator
guardrail validators config detect_pii \
  --severity critical \
  --on-fail exception \
  --set pii_entities=email,phone,ssn

# 5. Test validator
guardrail validators test detect_pii \
  --text "My email is user@example.com"

# 6. Enable validator
guardrail validators enable detect_pii --restart-proxy

# 7. Monitor validator performance
guardrail validators history detect_pii --since 1h

# 8. Disable temporarily
guardrail validators disable detect_pii
```

### JSON Automation

```bash
# Get all validators as JSON
guardrail validators list --format json > validators.json

# Install validators from list
cat validators.json | jq -r '.validators[] | .id' | while read id; do
  guardrail validators install "hub://$id" --no-local-models
done

# Export execution history
guardrail validators history all --format json --since 7d > executions.json
```

---

## Notes

- All commands follow existing Bandaid CLI conventions (Typer framework, rich formatting)
- JSON output mode (`--format json`) for all commands to support automation
- Human-readable error messages with actionable next steps
- Confirmation prompts for destructive operations (disable with `--confirm`)
- Proxy restart required for configuration changes (flag `--restart-proxy` for convenience)

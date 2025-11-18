# CLI Command Interface

**Version**: 1.0.0
**Date**: 2025-11-18
**Tool Name**: `access-control-cli`

## Overview

Command-line interface for privacy-preserving access purchases and verification. Built with TypeScript using a CLI framework (e.g., Commander.js or Yargs).

## Global Options

```bash
--network <network>     # Network to connect to (testnet|devnet|local) [default: testnet]
--config <path>         # Path to config file [default: .env]
--verbose              # Enable verbose logging
--help                 # Show help
--version              # Show version
```

## Commands

### purchase

**Purpose**: Purchase one-time or subscription access

**Usage**:
```bash
access-control-cli purchase <type> [options]
```

**Arguments**:
- `<type>`: Access type (`onetime` or `subscription`)

**Options**:
- `--vendor <address>`: Vendor contract address (required)
- `--wallet <path>`: Path to wallet file (required)
- `--password <password>`: Wallet password (prompted if not provided)

**Example**:
```bash
# Purchase one-time access
access-control-cli purchase onetime --vendor 0xabc123... --wallet ~/.midnight/wallet.json

# Purchase subscription
access-control-cli purchase subscription --vendor 0xabc123... --wallet ~/.midnight/wallet.json --password mypass
```

**Output** (success):
```
Purchasing access...
✓ Token transfer confirmed (100 tokens)
✓ Proof generated and stored on-chain
✓ Purchase complete

Proof ID: 0x1234567890abcdef...
Expires: 2025-12-18 14:30:00 UTC

Save this Proof ID to verify access.
```

**Output** (failure):
```
✗ Purchase failed: Incorrect payment amount
  Expected: 100 tokens
  Transferred: 95 tokens

Please ensure your wallet has sufficient balance and try again.
```

**Exit Codes**:
- 0: Success
- 1: Invalid arguments
- 2: Wallet error (insufficient funds, wrong password)
- 3: Contract error (inactive vendor, invalid price)
- 4: Network error

---

### verify

**Purpose**: Vendor verifies if a proof ID grants access

**Usage**:
```bash
access-control-cli verify <proof-id> [options]
```

**Arguments**:
- `<proof-id>`: 32-byte proof ID (hex string)

**Options**:
- `--contract <address>`: Vendor contract address (required)
- `--wallet <path>`: Path to wallet file (required for transaction signing)

**Example**:
```bash
access-control-cli verify 0x1234567890abcdef... --contract 0xabc123... --wallet ~/.midnight/vendor-wallet.json
```

**Output** (access granted):
```
Verifying proof...
✓ Access granted

Proof ID: 0x1234567890abcdef...
Status: Valid
```

**Output** (access denied):
```
Verifying proof...
✗ Access denied

Proof ID: 0x1234567890abcdef...
Reason: Proof has expired
```

**Exit Codes**:
- 0: Access granted
- 1: Access denied (any reason)
- 2: Invalid arguments
- 3: Network error

---

### set-price

**Purpose**: Vendor updates pricing for access types

**Usage**:
```bash
access-control-cli set-price [options]
```

**Options**:
- `--contract <address>`: Vendor contract address (required)
- `--onetime <amount>`: Price for one-time access in tokens (required)
- `--subscription <amount>`: Price for 30-day subscription in tokens (required)
- `--wallet <path>`: Path to vendor wallet file (required, must be contract owner)
- `--password <password>`: Wallet password (prompted if not provided)

**Example**:
```bash
access-control-cli set-price --contract 0xabc123... --onetime 150 --subscription 600 --wallet ~/.midnight/owner-wallet.json
```

**Output** (success):
```
Updating prices...
✓ Price update confirmed

New Prices:
  One-time access: 150 tokens
  Subscription (30 days): 600 tokens

Existing proofs remain valid at old prices.
```

**Output** (failure):
```
✗ Price update failed: Unauthorized
  Only the contract owner can update prices.
```

**Exit Codes**:
- 0: Success
- 1: Invalid arguments (price <= 0)
- 2: Unauthorized (not contract owner)
- 3: Network error

---

### check-status

**Purpose**: Check proof status and time remaining

**Usage**:
```bash
access-control-cli check-status <proof-id> [options]
```

**Arguments**:
- `<proof-id>`: 32-byte proof ID (hex string)

**Options**:
- `--contract <address>`: Vendor contract address (required)

**Example**:
```bash
access-control-cli check-status 0x1234567890abcdef... --contract 0xabc123...
```

**Output** (valid proof):
```
Checking proof status...

Proof ID: 0x1234567890abcdef...
Status: Valid
Expires: 2025-12-18 14:30:00 UTC
Time Remaining: 29 days, 23 hours, 45 minutes
```

**Output** (invalid proof):
```
Checking proof status...

Proof ID: 0x1234567890abcdef...
Status: Invalid
Reason: Proof has been used (one-time access)
```

**Exit Codes**:
- 0: Proof is valid
- 1: Proof is invalid (expired, used, or doesn't exist)
- 2: Invalid arguments
- 3: Network error

---

### get-prices

**Purpose**: Query current vendor pricing

**Usage**:
```bash
access-control-cli get-prices <contract> [options]
```

**Arguments**:
- `<contract>`: Vendor contract address

**Options**:
- `--json`: Output in JSON format

**Example**:
```bash
access-control-cli get-prices 0xabc123...
```

**Output** (human-readable):
```
Vendor: 0xabc123...
Status: Active

Pricing:
  One-time access: 100 tokens
  Subscription (30 days): 500 tokens
```

**Output** (JSON):
```json
{
  "vendor": "0xabc123...",
  "isActive": true,
  "oneTimePrice": "100",
  "subscriptionPrice": "500"
}
```

**Exit Codes**:
- 0: Success
- 1: Invalid arguments
- 2: Contract not found
- 3: Network error

---

## Configuration File Format

**File**: `.env` or custom path via `--config`

```bash
# Network configuration
NETWORK=testnet  # testnet | devnet | local
INDEXER_URL=https://indexer.testnet.midnight.network/api/v1/graphql
NODE_URL=https://rpc.testnet.midnight.network
PROOF_SERVER_URL=http://localhost:6300

# Default contract address (optional, can override with --contract)
DEFAULT_VENDOR_CONTRACT=0xabc123...

# Wallet configuration (optional, can override with --wallet)
DEFAULT_WALLET_PATH=~/.midnight/wallet.json
```

## Error Handling

### Common Error Messages

| Error | Message | Exit Code |
|-------|---------|-----------|
| Invalid proof ID | "Invalid proof ID format (expected 32-byte hex string)" | 1 |
| Wallet not found | "Wallet file not found: {path}" | 2 |
| Wrong password | "Incorrect wallet password" | 2 |
| Insufficient funds | "Insufficient token balance. Required: {amount}, Available: {balance}" | 2 |
| Inactive vendor | "Vendor is not accepting purchases" | 3 |
| Network timeout | "Network request timed out. Please try again." | 4 |
| Proof collision | "Proof ID collision (extremely rare). Please retry with new randomness." | 3 |

### Verbose Mode Output

When `--verbose` flag is used:
```
[DEBUG] Loading wallet from ~/.midnight/wallet.json
[DEBUG] Connecting to network: testnet
[DEBUG] Indexer URL: https://indexer.testnet.midnight.network/api/v1/graphql
[DEBUG] Querying vendor config for contract 0xabc123...
[DEBUG] Vendor config: { oneTimePrice: 100, subscriptionPrice: 500, isActive: true }
[DEBUG] Generating randomness for proof ID
[DEBUG] Calling purchaseAccess circuit with accessType=1
[DEBUG] Transaction submitted: 0xtxhash...
[DEBUG] Waiting for confirmation...
[INFO] Transaction confirmed in block 12345
✓ Purchase complete
```

## Demo Flow Example

```bash
# 1. Vendor sets initial prices
access-control-cli set-price --contract 0xabc123... --onetime 100 --subscription 500 --wallet vendor.json

# 2. User purchases one-time access
access-control-cli purchase onetime --vendor 0xabc123... --wallet user.json
# Output: Proof ID: 0x1234...

# 3. User checks their proof status
access-control-cli check-status 0x1234... --contract 0xabc123...
# Output: Valid, never expires

# 4. User provides proof ID to vendor (out-of-band: email, API, etc.)

# 5. Vendor verifies access
access-control-cli verify 0x1234... --contract 0xabc123... --wallet vendor.json
# Output: ✓ Access granted

# 6. Vendor tries to verify same proof again
access-control-cli verify 0x1234... --contract 0xabc123... --wallet vendor.json
# Output: ✗ Access denied (Reason: Proof has been used)
```

## Implementation Notes

- Use colored terminal output for success (green ✓) and failure (red ✗) messages
- Prompt for password securely if not provided via argument (use hidden input)
- Support both hex (0x-prefixed) and base64 proof ID formats
- Validate all inputs before making network calls
- Show transaction hashes in verbose mode for blockchain explorers
- Cache vendor config to avoid repeated queries (with TTL)
- Support wallet creation command for new users: `access-control-cli create-wallet`

# Data Model: Private Access Purchase System

**Date**: 2025-11-18
**Context**: Entity definitions for privacy-preserving access control using Midnight blockchain

## Entity Overview

This system uses Midnight's ledger/witness pattern to maintain privacy:
- **Ledger state**: Public on-chain data (proof IDs, expiration, vendor config)
- **Witness data**: Private off-chain data (buyer identity, payment details)

## Core Entities

### AccessProof (On-Chain Ledger State)

**Purpose**: Represents a valid access right without revealing buyer information

**Compact Type Definition**:
```compact
struct AccessProof {
  proofId: Bytes<32>,           // Unique proof identifier (derived from buyer + randomness)
  expiresAt: UInt<64>,          // Unix timestamp when access expires
  accessType: UInt<8>,          // 1 = one-time, 2 = subscription
  vendorId: Bytes<32>,          // Vendor contract address for replay prevention
  usedOnce: Bool                // True if one-time proof has been verified
}
```

**Fields**:
- `proofId`: 32-byte unique identifier, generated using `persistentCommit(buyerAddress, randomness)` to ensure uniqueness while hiding buyer identity
- `expiresAt`: Expiration timestamp (Unix seconds); for one-time access, set to far future (e.g., year 2100); for subscriptions, set to purchaseTime + 30 days
- `accessType`: 1 = one-time access, 2 = 30-day subscription
- `vendorId`: Contract address of vendor who issued the proof (prevents cross-vendor replay)
- `usedOnce`: Tracks if one-time proof has been verified (prevents reuse)

**Validation Rules**:
- `proofId` must be unique (enforced by Map key uniqueness)
- `expiresAt` must be > current timestamp for valid access
- `accessType` must be 1 or 2
- `usedOnce` can only transition from false → true (no rollbacks)

**State Transitions**:
```
[No Proof] --purchase()--> [Active Proof: usedOnce=false, expiresAt=T+duration]
[Active One-Time Proof] --verify()--> [Used Proof: usedOnce=true]
[Active Subscription] --time=expiresAt--> [Expired Proof]
```

### AccessPurchase (Private Witness Data)

**Purpose**: Contains sensitive buyer and payment information, never stored on-chain

**Compact Witness Definition**:
```compact
witness buyerAddress: Bytes<32>;      // Buyer's wallet address
witness paymentAmount: UInt<64>;      // Token amount transferred
witness purchaseTimestamp: UInt<64>;  // When purchase occurred
witness randomness: Bytes<32>;        // For proof ID generation
```

**Fields**:
- `buyerAddress`: Buyer's wallet address (kept private, used to derive proofId)
- `paymentAmount`: Exact token amount transferred (validated against vendor pricing)
- `purchaseTimestamp`: Purchase time (used to calculate expiration)
- `randomness`: Random bytes for proof ID uniqueness

**Usage**: These values are inputs to the `purchaseAccess` circuit but never written to ledger state. Only the buyer knows these values.

**Validation Rules** (enforced in circuit):
- `paymentAmount` must exactly match vendor price for chosen access type
- `purchaseTimestamp` must be ≤ current blockchain time
- `randomness` must be cryptographically random (provided by SDK)

### VendorConfig (On-Chain Ledger State)

**Purpose**: Stores vendor pricing and service configuration

**Compact Type Definition**:
```compact
struct VendorConfig {
  vendorId: Bytes<32>,          // Vendor's contract address
  oneTimePrice: UInt<64>,       // Price in tokens for one-time access
  subscriptionPrice: UInt<64>,  // Price in tokens for 30-day subscription
  isActive: Bool                // Whether vendor is accepting purchases
}
```

**Fields**:
- `vendorId`: Vendor's unique identifier (contract deployment address)
- `oneTimePrice`: Token amount required for one-time access purchase
- `subscriptionPrice`: Token amount required for 30-day subscription
- `isActive`: Admin toggle to pause/resume purchases (default: true)

**Validation Rules**:
- `oneTimePrice` must be > 0
- `subscriptionPrice` must be > 0
- Only vendor (contract owner) can update prices or toggle `isActive`

**State Transitions**:
```
[No Config] --initialize()--> [Active Config: isActive=true, prices set]
[Active Config] --updatePrices()--> [Active Config: new prices]
[Active Config] --pause()--> [Inactive Config: isActive=false]
```

### TokenTransfer (External - Midnight SDK)

**Purpose**: Records token payment from buyer to vendor

**SDK Type** (from @midnight-ntwrk/zswap):
```typescript
interface TransferTransaction {
  from: Address;              // Buyer address
  to: Address;                // Vendor address
  amount: bigint;             // Token amount
  token: Token;               // Native token (tDUST)
}
```

**Integration**: CLI uses `wallet.transferTransaction()` before calling `purchaseAccess` circuit. Circuit validates that transfer amount matches vendor price.

## Relationships

```
AccessPurchase (witness)
    |
    | derives
    v
AccessProof (ledger) --belongs_to--> VendorConfig (ledger)
    ^
    | validated_by
    |
TokenTransfer (SDK)
```

**Relationship Rules**:
1. One AccessPurchase (private) → One AccessProof (public)
2. Multiple AccessProofs → One VendorConfig
3. One TokenTransfer → One AccessPurchase
4. proofId = hash(buyerAddress + randomness) ensures privacy

## On-Chain Storage Structure

```compact
// Global ledger state
ledger state: Map<Bytes<32>, AccessProof>;  // proofId → proof details
ledger vendorConfig: VendorConfig;          // Single vendor config per contract

// Access pattern
export circuit purchaseAccess(...) {
  // Reads: vendorConfig (for price validation)
  // Writes: state[newProofId] = AccessProof{...}
}

export circuit verifyAccess(proofId: Bytes<32>) {
  // Reads: state[proofId], vendorConfig
  // Writes: state[proofId].usedOnce = true (if one-time)
}
```

## Privacy Guarantees

**What Vendors See** (public ledger state):
- Proof ID exists
- Access has/hasn't expired
- Access type (one-time vs subscription) - WAIT, this violates zero-knowledge requirement!

**CORRECTION**: AccessProof should NOT include `accessType` in public state. This reveals information about purchase.

**Revised AccessProof**:
```compact
struct AccessProof {
  proofId: Bytes<32>,
  expiresAt: UInt<64>,
  vendorId: Bytes<32>,
  usedOnce: Bool
  // accessType removed - kept private in witness
}
```

**What Vendors DON'T See**:
- Buyer wallet address
- Payment amount
- Whether purchase was one-time or subscription (both can have same expiration if desired)
- Purchase timestamp

**Verification Flow**:
```
Vendor: verifyAccess(proofId)
Circuit checks:
  1. proof = state[proofId]
  2. proof.expiresAt > currentTime
  3. if proof.usedOnce == true, return false
  4. return true (access granted)
Vendor sees: true/false only
```

## Example Data Flow

### Purchase Flow
```
User (witness):
  buyerAddress = 0xabc...
  paymentAmount = 100 tokens
  randomness = random32bytes()

Circuit:
  validate paymentAmount == vendorConfig.oneTimePrice
  proofId = hash(buyerAddress + randomness)
  expiresAt = now + (365 * 24 * 3600)  // far future for one-time
  state[proofId] = AccessProof{proofId, expiresAt, vendorId, false}

User receives: proofId (32-byte hex string)
```

### Verification Flow
```
Vendor: verifyAccess("0x123...")

Circuit:
  proof = state["0x123..."]
  if proof.expiresAt < now: return false
  if proof.usedOnce == true: return false
  state["0x123..."].usedOnce = true  // mark as used
  return true

Vendor sees: true (access granted)
```

## Data Validation Matrix

| Field | Validation | Enforced By | Error Message |
|-------|-----------|-------------|---------------|
| paymentAmount | Must equal vendor price | Circuit logic | "Incorrect payment amount" |
| expiresAt | Must be > currentTime | Circuit verification | "Access expired" |
| usedOnce | Can't reuse one-time proof | Circuit state check | "Proof already used" |
| vendorId | Must match current contract | Circuit comparison | "Invalid vendor" |
| proofId | Must be unique | Map key constraint | "Proof ID collision" |

## Migration Notes

**For future multi-vendor support**:
- Current design: One contract per vendor
- Future: Shared contract with `vendorId` scoping in proof lookups
- Migration path: Deploy new contract, users purchase new proofs

**For future subscription renewal**:
- Current design: Manual repurchase required
- Future: Add `renewSubscription(proofId)` circuit
- Migration path: No schema changes needed, just add new circuit

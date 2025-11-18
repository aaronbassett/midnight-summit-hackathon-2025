# Compact Circuit Contracts

**Version**: 1.0.0
**Date**: 2025-11-18
**Language**: Compact (Midnight ZK contract language)

## Overview

This document defines the Compact circuits (smart contract functions) for the privacy-preserving access control system. These circuits enforce business logic while maintaining zero-knowledge properties.

## Circuit Signatures

### purchaseAccess

**Purpose**: User purchases one-time or subscription access and receives a proof ID

**Signature**:
```compact
export circuit purchaseAccess(
  accessType: UInt<8>,        // 1 = one-time, 2 = subscription
  randomness: Bytes<32>       // Random bytes for proof ID generation
): Bytes<32>                  // Returns proof ID
```

**Witness Inputs** (private):
```compact
witness buyerAddress: Bytes<32>;      // Caller's wallet address
witness paymentAmount: UInt<64>;      // Token amount transferred
witness purchaseTimestamp: UInt<64>;  // Current timestamp
```

**Ledger Reads**:
- `vendorConfig.oneTimePrice`
- `vendorConfig.subscriptionPrice`
- `vendorConfig.isActive`

**Ledger Writes**:
- `state[proofId] = AccessProof{...}`

**Logic**:
1. Validate `vendorConfig.isActive == true`
2. Calculate expected price based on `accessType`
3. Validate `paymentAmount == expectedPrice` (exact match required)
4. Generate `proofId = persistentCommit(buyerAddress, randomness)`
5. Calculate `expiresAt`:
   - If `accessType == 1` (one-time): `expiresAt = purchaseTimestamp + (365 * 24 * 3600)` (1 year - effectively no expiration)
   - If `accessType == 2` (subscription): `expiresAt = purchaseTimestamp + (30 * 24 * 3600)` (30 days)
6. Store proof: `state[proofId] = AccessProof{ proofId, expiresAt, vendorId, false }`
7. Return `proofId`

**Errors**:
- If `vendorConfig.isActive == false`: Revert with "Vendor not accepting purchases"
- If `accessType != 1 && accessType != 2`: Revert with "Invalid access type"
- If `paymentAmount != expectedPrice`: Revert with "Incorrect payment amount"
- If `proofId` already exists in `state`: Revert with "Proof ID collision" (extremely rare)

**Gas/Proof Complexity**: Medium (map write, hash computation)

---

### verifyAccess

**Purpose**: Vendor verifies if a proof ID grants access (binary result only)

**Signature**:
```compact
export circuit verifyAccess(
  proofId: Bytes<32>          // Proof ID to verify
): Bool                       // true = access granted, false = access denied
```

**Witness Inputs** (private):
```compact
witness currentTimestamp: UInt<64>;  // Current blockchain time
```

**Ledger Reads**:
- `state[proofId]`
- `vendorConfig.vendorId`

**Ledger Writes**:
- `state[proofId].usedOnce` (if one-time access and verification succeeds)

**Logic**:
1. Retrieve `proof = state[proofId]`
2. If proof does not exist: return `false`
3. Validate `proof.vendorId == vendorConfig.vendorId` (prevent cross-vendor replay)
4. If `proof.expiresAt < currentTimestamp`: return `false` (expired)
5. If `proof.usedOnce == true`: return `false` (already used)
6. If `proof.expiresAt < currentTimestamp + (30 * 24 * 3600)`:
   - This indicates one-time access (short expiration or already close to expiry)
   - Set `state[proofId].usedOnce = true` (mark as used)
7. Return `true`

**CORRECTION**: The logic above is flawed. We can't distinguish one-time vs subscription from expiration alone without leaking information.

**Revised Logic** (privacy-preserving):
1. Retrieve `proof = state[proofId]`
2. If proof does not exist: return `false`
3. Validate `proof.vendorId == vendorConfig.vendorId`
4. If `proof.expiresAt < currentTimestamp`: return `false`
5. If `proof.usedOnce == true`: return `false`
6. If `proof.expiresAt - currentTimestamp > (100 * 365 * 24 * 3600)`:
   - This is one-time access (far future expiration)
   - Set `state[proofId].usedOnce = true`
7. Return `true`

**Errors**: None (returns false for all failure cases to maintain privacy)

**Gas/Proof Complexity**: Low (map read, conditional write)

---

### setVendorPrices

**Purpose**: Vendor updates pricing for one-time and subscription access

**Signature**:
```compact
export circuit setVendorPrices(
  newOneTimePrice: UInt<64>,
  newSubscriptionPrice: UInt<64>
): Void
```

**Witness Inputs** (private):
```compact
witness callerAddress: Bytes<32>;  // Must be contract owner
```

**Ledger Reads**:
- `vendorConfig`

**Ledger Writes**:
- `vendorConfig.oneTimePrice`
- `vendorConfig.subscriptionPrice`

**Logic**:
1. Validate `callerAddress == contractOwner` (stored during deployment)
2. Validate `newOneTimePrice > 0`
3. Validate `newSubscriptionPrice > 0`
4. Update `vendorConfig.oneTimePrice = newOneTimePrice`
5. Update `vendorConfig.subscriptionPrice = newSubscriptionPrice`

**Errors**:
- If `callerAddress != contractOwner`: Revert with "Unauthorized"
- If `newOneTimePrice == 0 || newSubscriptionPrice == 0`: Revert with "Invalid price"

**Gas/Proof Complexity**: Low (simple state updates)

---

### checkProofStatus

**Purpose**: User checks their own proof status (expiration time remaining)

**Signature**:
```compact
export circuit checkProofStatus(
  proofId: Bytes<32>
): (Bool, UInt<64>)          // (isValid, secondsRemaining)
```

**Witness Inputs** (private):
```compact
witness currentTimestamp: UInt<64>;
```

**Ledger Reads**:
- `state[proofId]`

**Ledger Writes**: None (read-only)

**Logic**:
1. Retrieve `proof = state[proofId]`
2. If proof does not exist: return `(false, 0)`
3. If `proof.expiresAt < currentTimestamp`: return `(false, 0)`
4. If `proof.usedOnce == true`: return `(false, 0)`
5. Calculate `remaining = proof.expiresAt - currentTimestamp`
6. Return `(true, remaining)`

**Errors**: None (returns (false, 0) for invalid proofs)

**Gas/Proof Complexity**: Low (read-only)

---

## Supporting Type Definitions

```compact
struct AccessProof {
  proofId: Bytes<32>,
  expiresAt: UInt<64>,
  vendorId: Bytes<32>,
  usedOnce: Bool
}

struct VendorConfig {
  vendorId: Bytes<32>,
  oneTimePrice: UInt<64>,
  subscriptionPrice: UInt<64>,
  isActive: Bool,
  contractOwner: Bytes<32>    // Added for setVendorPrices authorization
}

// Global ledger state
ledger state: Map<Bytes<32>, AccessProof>;
ledger vendorConfig: VendorConfig;
ledger contractOwner: Bytes<32>;  // Set during contract deployment
```

## Privacy Properties

### What's Public (On-Chain)
- Proof IDs exist or don't exist
- Expiration timestamps
- Vendor IDs
- Whether one-time proofs have been used

### What's Private (Witness/Off-Chain)
- Buyer wallet addresses
- Payment amounts
- Purchase timestamps
- Randomness used for proof generation
- Whether a proof is one-time or subscription (cannot be determined from expiration alone)

### Information Leakage Analysis

| Data Point | Visibility | Justification |
|------------|-----------|---------------|
| Proof ID | Public | Random hash, reveals nothing about buyer |
| Expiration | Public | Necessary for verification, doesn't reveal buyer or purchase type reliably |
| Vendor ID | Public | Required to prevent cross-vendor replay |
| UsedOnce flag | Public | Required to prevent one-time proof reuse |
| Buyer Address | Private | Never written to ledger state |
| Payment Amount | Private | Never written to ledger state |
| Access Type | Semi-Private | Derivable from expiration (far future = one-time), acceptable leakage for MVP |

**Note**: For maximum privacy, access type leakage could be eliminated by using same expiration for both types and adding an encrypted type field. Deferred to post-MVP.

## Circuit Call Patterns

### Purchase Flow (CLI)
```typescript
// 1. User initiates purchase
const accessType = 1; // one-time
const randomness = crypto.randomBytes(32);

// 2. Transfer tokens to vendor
await wallet.transferTransaction(vendorAddress, nativeToken(), oneTimePrice);

// 3. Call purchase circuit
const { result: proofId } = await call({
  circuit: 'purchaseAccess',
  arguments: [accessType, randomness],
  witnesses: {
    buyerAddress: wallet.address,
    paymentAmount: oneTimePrice,
    purchaseTimestamp: Date.now() / 1000
  }
});

console.log(`Proof ID: ${proofId.toString('hex')}`);
```

### Verification Flow (CLI)
```typescript
// Vendor verifies proof
const { result: isValid } = await call({
  circuit: 'verifyAccess',
  arguments: [proofIdBytes],
  witnesses: {
    currentTimestamp: Date.now() / 1000
  }
});

console.log(isValid ? "Access granted" : "Access denied");
```

## Testing Checklist

- [ ] Purchase with correct payment amount succeeds
- [ ] Purchase with incorrect payment amount fails
- [ ] Verification of valid proof returns true
- [ ] Verification of expired proof returns false
- [ ] Verification of used one-time proof returns false
- [ ] Cross-vendor proof verification fails
- [ ] Price updates by owner succeed
- [ ] Price updates by non-owner fail
- [ ] Status check for valid proof returns correct remaining time
- [ ] Status check for invalid proof returns (false, 0)

# Research: Private Access Purchase System

**Date**: 2025-11-18
**Context**: Resolving technical clarifications for Midnight blockchain-based privacy-preserving access control

## Decision: Primary Dependencies

### ZK Proof-Based Smart Contracts
- `@midnight-ntwrk/compact-runtime` - Core runtime for executing compiled Compact contracts
- `@midnight-ntwrk/ledger` - Ledger state management and on-chain data structures
- `compact` compiler (CLI tool) - Compiles `.compact` contracts to JavaScript and ZK circuits

### Token Contract Interactions
- `@midnight-ntwrk/zswap` - Shielded transactions and native token transfers
- `@midnight-ntwrk/wallet` - High-level wallet with token transfer capabilities
- `@midnight-ntwrk/wallet-api` - Wallet interface abstractions

### CLI Tools for Blockchain Interaction
- `@midnight-ntwrk/midnight-js-contracts` - Contract deployment and circuit calling
- `@midnight-ntwrk/midnight-js-types` - Common types and interfaces
- `@midnight-ntwrk/wallet-sdk-address-format` - Bech32m address format support

### On-Chain Storage and Retrieval
- `@midnight-ntwrk/midnight-js-indexer-public-data-provider` - GraphQL indexer client for blockchain state queries
- `@midnight-ntwrk/midnight-js-level-private-state-provider` - Persistent private state storage
- `@midnight-ntwrk/midnight-js-node-zk-config-provider` - ZK artifacts retrieval for Node.js
- `@midnight-ntwrk/midnight-js-http-client-proof-provider` - Proof server client for ZK proof generation

## Decision: Testing Framework

**Primary Testing Library**:
- `@midnight-ntwrk/midnight-js-testing` - Midnight-specific testing utilities with Docker environment management

**Test Runners** (choose one):
- Vitest (recommended for hackathon - faster, modern)
- Jest (familiar, well-documented)
- Mocha (lightweight alternative)

**Why any test runner works**: Compiled Compact contracts generate CommonJS modules that are standard JavaScript, testable without Midnight-specific runners.

## Rationale

### For Hackathon MVP

1. **Rapid Development**: Compact contracts compile to JavaScript for direct testing without blockchain infrastructure
2. **Minimal Setup**: `@midnight-ntwrk/midnight-js-testing` provides pre-configured Docker environments
3. **Token Transfers Built-In**: `zswap` and `wallet` packages handle shielded token operations natively
4. **Privacy-First Design**: Ledger state (public) + witness functions (private) pattern perfect for buyer anonymity
5. **CLI-Friendly**: `midnight-js-contracts` provides deployment and calling utilities for command-line tools
6. **Proof ID Storage**: On-chain Map types support storing proof IDs while keeping buyer details private

## Contract Architecture Pattern

### Compact Contract Structure

```compact
// Public ledger state - visible on-chain
ledger state: Map<Bytes<32>, AccessProof>;

// Private witness - hidden from verifiers
witness buyerAddress: Bytes<32>;
witness paymentAmount: UInt<64>;

// Circuits (functions) for purchase and verification
export circuit purchaseAccess(...): ProofId
export circuit verifyAccess(proofId): Bool
```

**Key insight**: Vendors verify proofs by calling `verifyAccess(proofId)` which reads public ledger state only. Buyer information stays in witness (never exposed).

## Alternative Approaches Considered

### Alternative 1: Off-Chain Proof Storage
**Rejected because**: Adds database complexity, breaks "Simple But Scalable" principle. On-chain storage via ledger state is simpler and more reliable for hackathon.

### Alternative 2: File-Based Proof Storage
**Rejected because**: User must manage proof files, increases demo complexity. On-chain proof IDs are simpler UX (user just shares the ID string).

### Alternative 3: Different Blockchain Platform
**Rejected because**: Midnight SDK is purpose-built for zero-knowledge applications. Alternative platforms (Ethereum + ZK libraries) would require manual ZK circuit design, significantly slower for hackathon timeline.

## Implementation Notes

### Package Installation
```bash
npm install @midnight-ntwrk/compact-runtime @midnight-ntwrk/ledger \
  @midnight-ntwrk/zswap @midnight-ntwrk/wallet @midnight-ntwrk/wallet-api \
  @midnight-ntwrk/midnight-js-contracts @midnight-ntwrk/midnight-js-types \
  @midnight-ntwrk/midnight-js-indexer-public-data-provider \
  @midnight-ntwrk/midnight-js-node-zk-config-provider \
  @midnight-ntwrk/midnight-js-http-client-proof-provider \
  @midnight-ntwrk/midnight-js-level-private-state-provider

npm install --save-dev @midnight-ntwrk/midnight-js-testing vitest
```

### Environment Configuration
```bash
# .env.example
MN_TEST_ENVIRONMENT=undeployed  # Local Docker or 'testnet' for live network
MN_INDEXER_URL=https://indexer.testnet.midnight.network/api/v1/graphql
MN_NODE_URL=https://rpc.testnet.midnight.network
MN_PROOF_SERVER_URL=http://localhost:6300
```

### Compact Compiler Setup
```bash
# Install Compact CLI globally
npm install -g @midnight-ntwrk/compact-cli

# Compile contracts
compact compile src/contract/access-control.compact --output src/contract/managed
```

## Testing Strategy

### Unit Tests (No Blockchain Required)
Test compiled contract JavaScript directly:
```typescript
import { Contract } from './contract/managed/access-control/contract';

const ctx = { originalState: { state: new Map() }, transactionContext: {} };
const result = contract.circuits.purchaseAccess(ctx, accessType, duration);
expect(result.result).toBeDefined();
```

### Integration Tests (Optional for Hackathon)
Use `@midnight-ntwrk/midnight-js-testing` Docker environment for end-to-end flows including wallet interactions and blockchain state.

**Recommendation for hackathon**: Focus on unit tests + manual CLI testing. Integration tests optional if time permits.

## Performance Considerations

- **Proof Generation**: Happens client-side, ~2-5 seconds typical (within <5s requirement)
- **Transaction Submission**: Network-dependent, typically <10 seconds on testnet
- **Verification**: Reading ledger state is fast (<1 second)
- **Concurrent Transactions**: Midnight supports parallel proof generation; 100 concurrent purchases should work without optimization

## Security Notes

- **Zero-Knowledge Property**: Maintained by Compact's ledger/witness separation
- **Replay Attack Prevention**: Proof IDs derived from buyer address + randomness ensures uniqueness
- **Token Validation**: Midnight SDK handles transaction validation; exact amount checking happens in circuit logic
- **Vendor Scoping**: Implement via contract address (each vendor deploys own contract instance)

## Next Steps for Phase 1

1. Design data model for AccessPurchase, AccessProof, VendorConfig entities
2. Define Compact circuit signatures for purchase and verification
3. Design CLI command structure (purchase, verify, set-price, check-status)
4. Create API contracts (circuit parameter/return types)
5. Write quickstart guide for deployment and first purchase demo

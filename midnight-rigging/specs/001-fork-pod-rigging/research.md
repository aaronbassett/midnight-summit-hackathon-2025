# Midnight Network Research Findings

**Research Date**: 2025-11-17
**Purpose**: Clarify technical requirements for pod-rigging plugin adaptation to Midnight Network

---

## 1. Midnight API Availability During Development

**Decision**: Publicly accessible testnet RPC endpoints and indexer APIs are available for development.

**Rationale**:
- Midnight testnet launched in late 2024 and is fully operational
- Public RPC endpoint: `wss://rpc.testnet-02.midnight.network`
- Public indexer endpoints:
  - HTTP: `https://indexer.testnet-02.midnight.network/api/v1/graphql`
  - WebSocket: `wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws`
- Third-party RPC providers also available (e.g., Ankr: `https://rpc.ankr.com/midnight_testnet/`)
- No authentication required for basic RPC calls
- Viewing keys required only for private/shielded transaction queries via indexer

**Alternatives considered**:
- Mock/stub strategy: Not needed - real testnet available
- Local devnet: Possible but unnecessary given stable testnet availability

**Sources**:
- https://docs.midnight.network/
- https://midnight.network/blog/introducing-the-midnight-testnet
- https://www.ankr.com/docs/rpc-service/chains/chains-api/midnight/
- https://docs.gomaestro.org/midnight

---

## 2. Midnight Smart Contract Language

**Decision**: Midnight uses **Compact**, a TypeScript-based domain-specific language (DSL) for smart contracts.

**Rationale**:
- **Language Name**: Compact
- **Version**: Currently in active development (latest stable in testnet)
- **Syntax**: TypeScript-based, familiar to JavaScript/TypeScript developers
- **Key Features**:
  - Statically typed
  - Purpose-built for data protection
  - Handles both public and private state
  - Integrates seamlessly with standard TypeScript for DApp development
  - Supports zero-knowledge proof generation

**SDK Packages and Import Patterns**:
```typescript
// Core packages available on npm under @midnight-ntwrk namespace
import { ... } from '@midnight-ntwrk/midnight-js-contracts';
import { ... } from '@midnight-ntwrk/midnight-js-types';
import { ... } from '@midnight-ntwrk/compact-runtime';
import { ... } from '@midnight-ntwrk/wallet';
import { ... } from '@midnight-ntwrk/wallet-sdk-hd';
import { ... } from '@midnight-ntwrk/wallet-sdk-capabilities';
```

**Example Contracts**:
- Official examples directory includes:
  - `welcome` - Basic introductory contract
  - `counter` - Simple state management example
  - `bboard` (bulletin board) - More complex example with tutorial

**Compilation and Deployment Tools**:
- Compact compiler (compiles .compact files to TypeScript)
- Scaffold Midnight CLI - Zero-configuration tool for rapid setup
- Docker-based development environment
- Local proof server for ZK proof generation

**Alternatives considered**: None - Compact is the only supported language for Midnight

**Sources**:
- https://docs.midnight.network/develop/reference/compact/
- https://midnight.network/blog/tutorial-building-a-bulletin-board-smart-contract-with-compact
- https://www.npmjs.com/search?q=midnight-ntwrk
- https://docs.midnight.network/develop/tutorial

---

## 3. Midnight Network Architecture

**Decision**: Midnight is a **Substrate-based, privacy-focused blockchain** using zero-knowledge proofs (zkSNARKs) with a dual-state ledger architecture.

**Rationale**:

### Core Architectural Differences from EVM Chains:

**1. Dual-State Ledger**:
- Public state (visible on-chain)
- Private state (off-chain, verified via ZK proofs)
- Contracts can operate on both states simultaneously
- Not account-based like Ethereum - uses UTXO-inspired model with privacy

**2. Zero-Knowledge Infrastructure**:
- Uses zkSNARKs (previously Pluto-Eris curves, transitioning to BLS)
- Halo2 cryptographic framework
- Local proof generation via Proof Server component
- No trusted setup required (Halo2 advantage)

**3. Privacy-First Design**:
- Selective disclosure capabilities
- Metadata protection
- Private transactions by default, with optional public data
- Viewing keys for authorized data access

### Private State Management Patterns:

- **Local Proof Server**: Runs on user's machine, generates ZK proofs offline
- **Private Data**: Never exposed to blockchain, only proofs submitted
- **Viewing Keys**: ChaCha20Poly1305-encrypted keys for accessing private data
- **State Transitions**: Validated via ZK proofs without revealing inputs

### Proof Generation Workflow:

1. **Setup Phase**: Generate public proving and verifying keys
2. **Circuit Construction**: Contract logic translated to arithmetic circuit
3. **Witness Generation**: User provides private data (witness)
4. **Proof Generation**: Local Proof Server creates compact ZK proof
5. **Submission**: Only proof submitted to chain, not witness
6. **Verification**: On-chain verification of proof validity

### Transaction Finality Mechanism:

- **Substrate-based**: Uses Substrate framework
- **Consensus**: Minotaur multi-resource consensus (hybrid PoW/PoS)
- **Finality**: Likely GRANDPA-style deterministic finality (standard for Substrate)
- **Block Production**: Probabilistic consensus for authorship
- **Chain Type**: Partner chain to Cardano (first Cardano partner chain)

### Consensus Algorithm:

- **Minotaur**: Multi-resource consensus combining PoW and PoS
- **Novel Approach**: Pioneered by IOG research paper
- **Security**: Leverages multiple consensus mechanisms for enhanced security
- **Integration**: Designed for interoperability with Cardano

**Alternatives considered**:
- EVM compatibility: Midnight explicitly chose NOT to be EVM-compatible
- Simple PoS: Rejected in favor of multi-resource approach

**Sources**:
- https://midnight.network/blog/midnight-redefines-blockchain-privacy-with-zero-knowledge-and-rational-design
- https://adapulse.io/midnight-enhancing-blockchain-data-privacy-and-security/
- https://medium.com/tap-in-with-taptools/breaking-down-the-midnight-nightpaper-2ddf8c9afdfb
- https://docs.midnight.network/learn/understanding-midnights-technology/zero-knowledge-proofs
- https://cexplorer.io/article/midnight-is-a-partner-chain

---

## 4. Midnight JSON-RPC API

**Decision**: Midnight uses **Substrate-based JSON-RPC methods**, NOT EVM-compatible eth_* methods.

**Rationale**:

### RPC Method Categories:

**Chain & Block Methods**:
- `chain_getBlock` - Returns full block data for specified hash
- `chain_getBlockHash` - Returns block hash for given block number
- `chain_getFinalisedHead` / `chain_getFinalizedHead` - Latest finalized block hash
- `chain_getHead` - Current best block hash
- `chain_getHeader` - Fetch block header
- `chain_getRuntimeVersion` - Current runtime version

**System Methods**:
- `system_health` - Node health and sync status (isSyncing, peers count)
- `system_chainType` - Chain type (Live, Development, Local)
- `system_properties` - Chain properties (token decimals, symbols)

**Offchain Storage Methods**:
- `offchain_localStorageSet` - Set offchain storage (PERSISTENT or LOCAL)

### Connection Pattern:

```javascript
import { ApiPromise, WsProvider } from "@polkadot/api";

const api = await ApiPromise.create({
  provider: new WsProvider("wss://rpc.testnet-02.midnight.network")
});

// Example usage
const blockHash = await api.rpc.chain.getBlockHash();
const block = await api.rpc.chain.getBlock(blockHash);
const header = await api.rpc.chain.getHeader(blockHash);
```

### Authentication Requirements:

- **Basic RPC**: No authentication required
- **Public data**: Freely accessible
- **Private/shielded data**: Requires viewing keys (accessed via Indexer GraphQL API)

### Key Differences from EVM:

- Uses Polkadot.js API, not Ethers.js or Web3.js
- Method naming follows Substrate conventions (chain_*, system_*)
- No eth_* methods (eth_getBalance, eth_sendTransaction, etc.)
- WASM-based runtime, not EVM bytecode
- Different transaction format and signing process

**Alternatives considered**:
- EVM JSON-RPC compatibility layer: Does not exist for Midnight
- Custom abstraction: Would need to map Substrate concepts to EVM-like interface

**Sources**:
- https://www.ankr.com/docs/rpc-service/chains/chains-api/midnight/
- https://dev.to/minhlong2605/nocturne-a-blockchain-explorer-for-midnight-network-3041
- https://docs.midnight.network/develop/reference/midnight-api

---

## 5. Midnight Indexer API

**Decision**: Midnight uses a **GraphQL-based indexer API** with mutations for authentication and subscriptions for real-time updates.

**Rationale**:

### Indexer Endpoint Format and Base URL:

**Testnet-02 Endpoints**:
- HTTP: `https://indexer.testnet-02.midnight.network/api/v1/graphql`
- WebSocket: `wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws`

**URL Structure**: `https://indexer.{network}.midnight.network/api/v1/graphql`
- `{network}` = testnet, testnet-02, mainnet (when launched)

### Authentication Flow:

**For Public Data**: No authentication required

**For Private/Shielded Data**:
1. Generate viewing keys from wallet
2. Use `connect()` mutation with viewing key
3. Receive session token
4. Use token for subsequent queries

**Viewing Key Details**:
- Encryption: ChaCha20Poly1305
- Format: Bech32-encoded
- Purpose: Decrypt shielded transaction data
- Derivation: From wallet private keys
- Common issues: "decode viewing key" errors if improperly formatted

### Available Query Endpoints:

The indexer provides:
- **Queries**: Blockchain data retrieval
  - Block history
  - Transaction search
  - Account state
  - Contract events
  - Shielded transactions (requires viewing key)

- **Mutations**:
  - `connect()` - Authenticate with viewing key
  - Other state-changing operations

- **Subscriptions**: Real-time updates
  - New blocks
  - Transaction confirmations
  - Shielded transaction notifications
  - Contract events

### Response Schema:

**Standard GraphQL format**:
```graphql
query {
  blocks(limit: 10) {
    number
    hash
    timestamp
    transactions {
      hash
      from
      to
      value
    }
  }
}

mutation {
  connect(viewingKey: "midnight1...") {
    sessionToken
    expiresAt
  }
}

subscription {
  shieldedTransactions {
    hash
    encryptedData
    proof
  }
}
```

### Pagination:

- Standard GraphQL pagination patterns
- Cursor-based pagination for large datasets
- Limit/offset support for simpler queries

### Integration Example:

```typescript
import { WalletBuilder } from '@midnight-ntwrk/wallet';

const wallet = await new WalletBuilder()
  .indexer('https://indexer.testnet-02.midnight.network/api/v1/graphql')
  .node('wss://rpc.testnet-02.midnight.network')
  .build();
```

**Alternatives considered**:
- REST API: Not provided, GraphQL is the standard
- Direct node queries: Less efficient, indexer optimizes data access

**Sources**:
- https://docs.midnight.network/relnotes/midnight-indexer/midnight-indexer-2-0-0
- https://www.postman.com/go-maestro/maestro-api/documentation/ye4quyd/midnight-indexer-graphql-api
- https://forum.midnight.network/t/how-to-derive-viewing-keys-for-indexer-graphql-api/328
- https://docs.gomaestro.org/midnight

---

## 6. Midnight Documentation Sources

**Decision**: Comprehensive official documentation is available, supplemented by community resources and third-party integrations.

**Rationale**:

### Official Documentation Site:

**Primary Source**: https://docs.midnight.network/
- Comprehensive developer guides
- API references
- Tutorials and examples
- Release notes
- Architecture documentation

**Main Sections**:

1. **Learn** (`/learn/`):
   - Understanding Midnight's technology
   - Zero-knowledge proofs explained
   - Architecture overview

2. **Develop** (`/develop/`):
   - Developer tutorial
   - Compact language reference
   - API reference documentation
   - How-to guides

3. **Reference** (`/develop/reference/`):
   - Midnight API documentation
   - Compact runtime API
   - Compact language reference
   - DApp Connector API
   - Wallet API

4. **Validate** (`/validate/`):
   - Node operation guides
   - Stake pool setup
   - Block producer documentation

5. **Release Notes** (`/relnotes/`):
   - Version history
   - Breaking changes
   - Migration guides

### GitHub Repositories:

**Official Organization**: https://github.com/midnight-ntwrk
- 4 public repositories
- Official SDKs and tools
- Example contracts
- Issue tracking

### Whitepapers and Technical Specifications:

**Midnight Nightpaper**: Core technical whitepaper (referenced in multiple sources)
- Detailed architecture description
- Cryptographic foundations
- Economic model

**IOG Research Papers**:
- Minotaur consensus paper
- Pluto-Eris curve analysis: https://static.iohk.io/pluto-eris-analysis.pdf

### Developer Guides and Tutorials:

**Official Tutorials**:
1. **Developer Tutorial**: https://docs.midnight.network/develop/tutorial
   - Prerequisites and setup
   - First contract development
   - DApp integration
   - Deployment guide

2. **Bulletin Board Tutorial**: https://midnight.network/blog/tutorial-building-a-bulletin-board-smart-contract-with-compact
   - Step-by-step Compact contract creation
   - Public/private state management
   - Frontend integration

3. **React Wallet Connector**: https://docs.midnight.network/how-to/react-wallet-connect
   - Building wallet integrations
   - DApp Connector API usage

**Community Guides**:
- HackMD tutorials (e.g., https://hackmd.io/@SofiaSukh/rJXzOeyB0)
- Developer blog posts on DEV Community
- Hackathon resources

### API Reference Documentation:

**TypeScript API Docs**:
- Midnight API: https://docs.midnight.network/develop/reference/midnight-api
- Compact Runtime: https://docs.midnight.network/develop/reference/midnight-api/compact-runtime/
- DApp Connector API: https://docs.midnight.network/relnotes/dapp-connector-api/

**Third-Party API Documentation**:
- Maestro Indexer GraphQL: https://www.postman.com/go-maestro/maestro-api/documentation/ye4quyd/midnight-indexer-graphql-api
- Ankr RPC Docs: https://www.ankr.com/docs/rpc-service/chains/chains-api/midnight/

### Additional Resources:

**Blog**: https://midnight.network/blog/
- Technical deep dives
- Release announcements
- Tutorial series
- Hackathon guides

**Forum**: https://forum.midnight.network/
- Community support
- Technical Q&A
- Bug reports and discussions

**Podcast**: Unshielded Podcast
- Interviews with core developers
- Technical explanations (e.g., Compact language episode with Kevin Millikin)

**Third-Party Integrations**:
- MeshJS Midnight: https://github.com/MeshJS/midnight - Developer tools and SDKs
- Scaffold Midnight: CLI tool for rapid project setup
- Blockdaemon integration: Node infrastructure

**Alternatives considered**: None - official documentation is comprehensive

**Sources**: All URLs listed above

---

## Key Implications for pod-rigging Plugin Adaptation

### 1. **Not a Simple Fork**:
Midnight is fundamentally different from pod network:
- Substrate-based, not custom L1 architecture
- Different transaction model (UTXO-inspired vs account-based)
- Privacy-first with dual-state ledger
- Different smart contract paradigm (Compact vs pod's language)

### 2. **Tool Rewriting Strategy**:
Cannot simply adapt pod-rigging tools; must create Midnight-specific equivalents:

**RPC Integration**:
- Replace Ethers.js/Web3.js with Polkadot.js
- Map Substrate RPC methods to plugin tools
- Handle WASM runtime differences

**Indexer Integration**:
- GraphQL instead of REST/JSON-RPC
- Implement viewing key management for private data
- Support subscriptions for real-time updates

**Smart Contract Tooling**:
- Compact language support (not Solidity/Vyper/etc.)
- Template generation for Compact contracts
- Integration with Compact compiler
- Proof server interaction

**Transaction Handling**:
- Different transaction format (Substrate extrinsics)
- Different signing process
- Private transaction proof generation
- Viewing key derivation and management

### 3. **Required New Components**:

**Proof Server Integration**:
- Local proof generation support
- ZK proof validation
- Circuit parameter management

**Viewing Key Management**:
- Key derivation from wallet
- Secure key storage
- Key sharing for multi-user scenarios

**GraphQL Client**:
- Replace REST clients with GraphQL
- Implement authentication flow
- Support subscriptions

### 4. **Development Environment Requirements**:

**Prerequisites**:
- Docker (recommended for consistent environment)
- Linux/macOS/Windows WSL
- Node.js 24.x (LTS)
- TypeScript 5.x
- Sufficient resources for local proof server

**Optional**:
- Full non-block-producing node (for advanced use cases)
- Local indexer (for development/testing)

### 5. **Hackathon Readiness**:

**Available Now**:
- Stable testnet
- Public RPC and indexer endpoints
- Comprehensive documentation
- Example contracts and tutorials
- SDK packages on npm
- Development tooling (Scaffold Midnight)

**No Blockers**:
- All necessary infrastructure is publicly accessible
- No API keys or authentication required for basic usage
- Community support available via forum
- Regular hackathons and ecosystem challenges

---

## Recommendations for Next Steps

### Immediate Actions:

1. **Environment Setup**:
   - Install Docker
   - Set up Polkadot.js development environment
   - Test connection to testnet RPC and indexer

2. **Prototype Development**:
   - Create basic Polkadot.js connection tool
   - Implement simple GraphQL indexer queries
   - Test Compact contract compilation

3. **Architecture Planning**:
   - Design Substrate-specific tool abstractions
   - Plan viewing key management flow
   - Define GraphQL schema for common queries

### Medium-Term Goals:

1. **Core Tool Development**:
   - Substrate RPC MCP server
   - GraphQL indexer MCP server
   - Compact contract templates
   - Viewing key utilities

2. **Documentation**:
   - Midnight-specific developer guides
   - Migration guide from pod-rigging
   - Tool usage examples

3. **Testing**:
   - Testnet integration tests
   - End-to-end workflow validation
   - Performance benchmarking

### Long-Term Considerations:

1. **Mainnet Readiness**:
   - Update endpoints when mainnet launches
   - Production security hardening
   - Rate limiting and caching strategies

2. **Community Engagement**:
   - Contribute to Midnight ecosystem
   - Share tools with hackathon participants
   - Gather feedback and iterate

---

## Appendix: Quick Reference

### Testnet Endpoints:
- **RPC**: `wss://rpc.testnet-02.midnight.network`
- **Indexer HTTP**: `https://indexer.testnet-02.midnight.network/api/v1/graphql`
- **Indexer WS**: `wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws`

### NPM Packages:
```bash
npm install @midnight-ntwrk/wallet
npm install @midnight-ntwrk/midnight-js-contracts
npm install @midnight-ntwrk/compact-runtime
npm install @polkadot/api
```

### Connection Examples:

**RPC Connection**:
```typescript
import { ApiPromise, WsProvider } from "@polkadot/api";
const api = await ApiPromise.create({
  provider: new WsProvider("wss://rpc.testnet-02.midnight.network")
});
```

**Wallet Connection**:
```typescript
import { WalletBuilder } from '@midnight-ntwrk/wallet';
const wallet = await new WalletBuilder()
  .indexer('https://indexer.testnet-02.midnight.network/api/v1/graphql')
  .node('wss://rpc.testnet-02.midnight.network')
  .build();
```

### Documentation Links:
- **Main Docs**: https://docs.midnight.network/
- **Tutorial**: https://docs.midnight.network/develop/tutorial
- **Compact Reference**: https://docs.midnight.network/develop/reference/compact/
- **API Reference**: https://docs.midnight.network/develop/reference/midnight-api
- **GitHub**: https://github.com/midnight-ntwrk
- **Blog**: https://midnight.network/blog/

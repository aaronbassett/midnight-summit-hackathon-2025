# pod network DApp Architecture

Comprehensive guide to pod network decentralized application architecture, covering the complete stack from smart contracts to frontend.

## Overview

A pod network DApp consists of multiple integrated layers:

```
┌─────────────────────────────────────────────────────┐
│                    Frontend Layer                    │
│              (React + Vite + viem)                   │
│  - User interface                                    │
│  - Wallet connection                                 │
│  - Contract interaction                              │
│  - Event listening                                   │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│                  pod network RPC                     │
│  - Transaction submission                            │
│  - Contract state queries                            │
│  - Event logs                                        │
│  - Finality tracking (attestations)                  │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│                 Smart Contract Layer                 │
│              (Solidity + FastTypes)                  │
│  - Business logic                                    │
│  - State management (order-independent)              │
│  - Event emissions                                   │
│  - Access control                                    │
└─────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────┐
│                     CLI Tools                        │
│                  (Rust + pod SDK)                    │
│  - Contract deployment                               │
│  - Transaction submission                            │
│  - State inspection                                  │
│  - Testing utilities                                 │
└─────────────────────────────────────────────────────┘
```

## Layer Breakdown

### 1. Smart Contract Layer (Solidity + FastTypes)

**Purpose**: Core business logic and state management

**Key Characteristics:**

- Written in Solidity (Ethereum-compatible with pod extensions)
- Uses **FastTypes** for order-independent operations
- No reliance on blocks, block numbers, or global transaction ordering
- Events for frontend communication

**Example (Token Contract):**

```solidity
import {Balance} from "pod-sdk/FastTypes.sol";

contract MyToken {
    Balance public balances;

    event Transfer(address indexed from, address indexed to, uint256 amount);

    function transfer(address to, uint256 amount) external {
        balances.transfer(msg.sender, to, amount);
        emit Transfer(msg.sender, to, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances.get(account);
    }
}
```

**Design Principles:**

- **Commutativity**: Operations work in any order
- **Idempotency**: Repeated operations safe
- **No global state dependencies**: No `block.number`, no ordering assumptions

### 2. CLI Tools Layer (Rust + pod SDK)

**Purpose**: Developer tools for contract interaction

**Capabilities:**

- Deploy contracts
- Call contract functions
- Query contract state
- Manage accounts/wallets
- Scripting and automation

**Example (Token CLI):**

```rust
// Scaffold with pod-templating full project templates
// Available in cli/src/main.rs

use pod_sdk::{Contract, Wallet};

fn transfer_tokens(wallet: &Wallet, to: &str, amount: u64) {
    let contract = Contract::new("MyToken", wallet);
    contract.call("transfer", &[to, &amount.to_string()]).await?;
}
```

**Use Cases:**

- **Development**: Rapid testing without frontend
- **Deployment**: Scripted contract deployment
- **Automation**: Batch operations, monitoring
- **Integration**: Backend services interacting with contracts

### 3. Frontend Layer (React + Vite + viem)

**Purpose**: User interface for DApp interaction

**Responsibilities:**

- Wallet connection (MetaMask, WalletConnect, etc.)
- Display contract state (balances, ownership, etc.)
- Submit transactions via wallets
- Real-time event listening
- User feedback (loading, errors, confirmations)

**Stack:**

- **React**: Component-based UI
- **Vite**: Fast dev server, optimized builds
- **viem**: Type-safe web3 library
- **wagmi**: React hooks for web3

**Example Component (Token Transfer):**

```typescript
function TransferForm() {
  const { writeContract } = useWriteContract();

  const handleTransfer = (to: string, amount: string) => {
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'transfer',
      args: [to, parseUnits(amount, 18)],
    });
  };

  return <form>{/* Transfer UI */}</form>;
}
```

### 4. RPC Layer (pod network)

**Purpose**: Communication between frontend/CLI and blockchain

**Provided by pod network:**

- Transaction submission
- Contract state queries (view functions)
- Event log queries
- Finality tracking (attestation-based)

**No direct development needed** - use pod network RPC endpoints

## Data Flow Patterns

### 1. User-Initiated Transaction

```
User clicks "Transfer" button
    ↓
Frontend calls writeContract()
    ↓
viem constructs transaction
    ↓
Wallet prompts user to sign
    ↓
Signed transaction sent to pod RPC
    ↓
Transaction executed on pod network
    ↓
Validators attest (finality)
    ↓
Event emitted from contract
    ↓
Frontend listens to event
    ↓
UI updates to reflect new state
```

### 2. State Query (Read Operation)

```
Frontend needs to display balance
    ↓
useReadContract() hook called
    ↓
viem queries pod RPC
    ↓
RPC returns contract state
    ↓
React component re-renders with data
```

### 3. Event Monitoring (Real-Time Updates)

```
Contract emits Transfer event
    ↓
pod network RPC broadcasts event
    ↓
Frontend WebSocket connection receives event
    ↓
useWatchContractEvent() hook triggers callback
    ↓
UI updates (notification, balance refresh, etc.)
```

## Component Integration Patterns

### Pattern 1: Contract-First DApp

**Workflow:**

1. Design and implement smart contract
2. Generate Rust CLI bindings
3. Test contract via CLI
4. Build frontend that wraps CLI functionality

**When to use:**

- Contract logic is complex and central
- CLI is needed for backend automation
- Developer-first workflow

**Example:** Token with complex supply mechanics, vesting schedules

### Pattern 2: Frontend-First DApp

**Workflow:**

1. Design UI/UX mockups
2. Implement minimal contract for UI needs
3. Build frontend
4. Iterate on contract based on frontend requirements

**When to use:**

- UX is the primary concern
- Contract logic is straightforward
- Consumer-focused application

**Example:** NFT gallery, simple voting DApp

### Pattern 3: Full-Stack Iteration

**Workflow:**

1. Scaffold complete DApp with pod-scaffold-dapp skill
2. Implement contract, CLI, and frontend in parallel
3. Iterate based on integration testing

**When to use:**

- Balanced contract and frontend complexity
- Team has full-stack expertise
- Rapid prototyping

**Example:** Auction DApp, governance platform

## File System Organization

### Recommended Structure

```
my-dapp/
├── contract/                  # Smart contract layer
│   ├── src/
│   │   ├── MyContract.sol     # Main contract
│   │   └── ...
│   ├── test/
│   │   ├── MyContract.t.sol   # Foundry tests
│   │   └── ...
│   ├── script/
│   │   └── Deploy.s.sol       # Deployment script
│   ├── foundry.toml           # Foundry config
│   └── out/                   # Compiled artifacts (ABI, bytecode)
│       └── MyContract.sol/
│           └── MyContract.json
│
├── cli/                       # CLI tools layer
│   ├── src/
│   │   ├── main.rs            # CLI entry point
│   │   └── bindings.rs        # Contract bindings
│   ├── Cargo.toml
│   └── target/
│
├── frontend/                  # Frontend layer
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── contracts/         # Contract config & ABIs
│   │   ├── lib/              # Utilities (wagmi config, chains)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── dist/                  # Production build
│
├── deployments/               # Deployment artifacts
│   ├── devnet.json            # Devnet contract addresses
│   └── mainnet.json           # Mainnet contract addresses
│
├── .env.example               # Environment variables template
├── .gitignore
└── README.md
```

### Environment Configuration

**`.env` (frontend):**

```env
VITE_CONTRACT_ADDRESS=0x...
VITE_CHAIN_ID=54321
VITE_RPC_URL=wss://rpc.testnet-02.midnight.network
VITE_WALLETCONNECT_PROJECT_ID=...
```

**`.env` (CLI):**

```env
MIDNIGHT_RPC_URL=wss://rpc.testnet-02.midnight.network
PRIVATE_KEY=0x...  # For automated deployments only (never commit!)
CONTRACT_ADDRESS=0x...
```

## Deployment Strategy

### 1. Local Development

```bash
# Start local pod network node (if available)
midnight-network-node --dev

# Deploy contract
cd contract && forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast

# Start frontend dev server
cd frontend && npm run dev
```

### 2. Testnet Deployment

```bash
# Deploy to pod devnet
cd contract
forge script script/Deploy.s.sol --rpc-url wss://rpc.testnet-02.midnight.network --broadcast

# Update frontend environment
echo "VITE_CONTRACT_ADDRESS=0x..." >> frontend/.env

# Deploy frontend (Vercel/Netlify)
cd frontend
npm run build
# Upload dist/ to hosting
```

### 3. Mainnet Deployment

**Use `midnight-deployment-engineer` agent for production deployments:**

- Pre-deployment validation
- Deployment script generation
- Contract verification on pod explorer
- Multi-environment configuration

## Testing Strategy

### 1. Contract Layer Testing (Foundry)

```solidity
// contract/test/MyToken.t.sol
contract MyTokenTest is Test {
    MyToken public token;

    function setUp() public {
        token = new MyToken();
    }

    function testTransfer() public {
        token.transfer(address(0x123), 100);
        assertEq(token.balanceOf(address(0x123)), 100);
    }
}
```

**Run tests:**

```bash
cd contract && forge test
```

### 2. CLI Layer Testing (Rust)

```rust
// cli/src/tests.rs
#[test]
fn test_transfer() {
    let wallet = Wallet::new_random();
    // Test CLI commands
}
```

**Run tests:**

```bash
cd cli && cargo test
```

### 3. Frontend Layer Testing (Vitest + Testing Library)

```typescript
// frontend/src/components/__tests__/TransferForm.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('TransferForm', () => {
  it('renders transfer button', () => {
    render(<TransferForm />);
    expect(screen.getByText('Transfer')).toBeInTheDocument();
  });
});
```

**Run tests:**

```bash
cd frontend && npm test
```

### 4. Integration Testing

**Use `pod-test-engineer` agent to generate:**

- End-to-end tests (contract deployment → CLI interaction → frontend)
- Stress tests (high-load scenarios)
- Multi-user scenarios

## pod network-Specific Considerations

### 1. No Block Numbers

**Impact on architecture:**

- No pagination by block range
- No "latest X blocks" queries
- Event logs queried by time range or transaction hash

**Solution:**

- Use event-based indexing
- Store timestamps in contract events
- Use attestation finality, not block confirmations

### 2. No Global Transaction Ordering

**Impact on architecture:**

- No "first-come-first-served" logic in contracts
- No reliance on transaction order in frontend
- Race conditions if not designed for commutativity

**Solution:**

- Use FastTypes (SharedCounter, Balance, AddressSet)
- Design commutative operations
- Use external sequencing for order-dependent features (see `external-sequencing-patterns.md`)

### 3. Validator-Local Timestamps

**Impact on architecture:**

- `block.timestamp` not consensus-guaranteed
- Time-based logic requires special handling

**Solution:**

- Use time utilities from pod SDK
- Emit events for time boundaries
- Frontend displays approximate times

## Security Considerations

1. **Wallet security**: Never store private keys in frontend code
2. **RPC endpoints**: Use rate-limited, authenticated endpoints for production
3. **Contract verification**: Verify all contracts on pod explorer
4. **Input validation**: Validate user inputs in both frontend and contract
5. **Transaction replay**: Ensure nonces and signatures prevent replay attacks
6. **Event trust**: Validate critical events against contract state

## Performance Optimization

1. **Batch reads**: Use multicall for multiple contract reads
2. **Caching**: Cache contract state in frontend (with invalidation on events)
3. **Lazy loading**: Load contract ABIs and components on demand
4. **Optimistic updates**: Update UI immediately, confirm with blockchain
5. **WebSocket connections**: Use WebSockets for event listening (not polling)

## MCP Server Integration

For advanced features, integrate pod MCP servers:

**`midnight-network` MCP:**

- Query transaction finality percentages
- Get network stats (validator count, attestation rates)
- Monitor gas prices

**`pod-templating` MCP:**

- Generate additional contracts
- Scaffold new modules for existing DApps

**`midnight-rag` MCP:**

- Query pod documentation from frontend (help tooltips, docs)

## Resources

- **pod-scaffold-contract skill**: Scaffold additional contracts
- **midnight-developer skill**: Learn pod contract patterns
- **pod-test-engineer agent**: Generate comprehensive tests
- **midnight-deployment-engineer agent**: Deploy to mainnet
- **rag-query skill**: Query pod network documentation

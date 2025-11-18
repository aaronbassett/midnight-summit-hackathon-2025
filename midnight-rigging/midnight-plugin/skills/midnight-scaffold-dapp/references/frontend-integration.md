# Frontend Integration Patterns for pod network DApps

Guide for integrating React + Vite + viem frontends with pod network smart contracts.

## Overview

pod network DApps require frontend patterns that work with pod's coordination-free, blockless execution model. Traditional web3 patterns (block confirmations, transaction ordering assumptions) must be adapted.

## Stack: React + Vite + viem

**Why this stack:**

- **Vite**: Fast dev server, optimized builds, minimal config
- **React**: Component-based UI, rich ecosystem
- **viem**: Type-safe contract interactions, modern web3 library, better performance than ethers.js

## Project Structure

```
my-dapp/
├── contract/               # From pod-templating full project template
│   ├── src/               # Solidity contracts
│   ├── test/              # Foundry tests
│   └── out/               # Compiled artifacts (ABI, bytecode)
├── cli/                   # From pod-templating full project template
│   └── src/               # Rust CLI bindings
├── frontend/              # Add this with the DApp skill
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contracts/     # Generated contract hooks
│   │   ├── lib/          # Utilities and viem config
│   │   └── App.tsx       # Main app
│   ├── public/           # Static assets
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Setting Up viem with pod network

### 1. Install Dependencies

```bash
cd frontend
npm install viem wagmi @tanstack/react-query
```

**Key libraries:**

- `viem`: Core web3 library
- `wagmi`: React hooks for web3
- `@tanstack/react-query`: Data fetching (required by wagmi)

### 2. Configure pod network Chain

Create `frontend/src/lib/chains.ts`:

```typescript
import { defineChain } from 'viem';

export const podDevnet = defineChain({
  id: 54321, // pod devnet chain ID (example)
  name: 'pod network Devnet',
  network: 'pod-devnet',
  nativeCurrency: {
    decimals: 18,
    name: 'POD',
    symbol: 'POD'
  },
  rpcUrls: {
    default: { http: ['wss://rpc.testnet-02.midnight.network'] },
    public: { http: ['wss://rpc.testnet-02.midnight.network'] }
  },
  blockExplorers: {
    default: { name: 'pod Explorer', url: 'https://explorer.pod.network' }
  }
});

export const podMainnet = defineChain({
  id: 12345, // pod mainnet chain ID (example)
  name: 'pod network',
  network: 'pod-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'POD',
    symbol: 'POD'
  },
  rpcUrls: {
    default: { http: ['https://rpc.pod.network'] },
    public: { http: ['https://rpc.pod.network'] }
  },
  blockExplorers: {
    default: { name: 'pod Explorer', url: 'https://explorer.pod.network' }
  }
});
```

### 3. Configure wagmi

Create `frontend/src/lib/wagmi-config.ts`:

```typescript
import { http, createConfig } from 'wagmi';
import { podDevnet, podMainnet } from './chains';
import { injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [podDevnet, podMainnet],
  connectors: [
    injected(),
    walletConnect({
      projectId: 'YOUR_WALLETCONNECT_PROJECT_ID' // Get from walletconnect.com
    })
  ],
  transports: {
    [podDevnet.id]: http(),
    [podMainnet.id]: http()
  }
});
```

### 4. Wrap App with Providers

Update `frontend/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './lib/wagmi-config';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
```

## Contract Integration Patterns

### 1. Generate Type-Safe Contract Hooks

Create `frontend/src/contracts/generated.ts`:

```typescript
import { getContract } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';
import tokenAbi from '../../../contract/out/MyToken.sol/MyToken.json';

// Contract address (from deployment)
export const TOKEN_ADDRESS = '0x...' as const;

// ABI (from compiled contract)
export const TOKEN_ABI = tokenAbi.abi;

// Type-safe contract hook
export function useTokenContract() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  return {
    read: publicClient
      ? getContract({
          address: TOKEN_ADDRESS,
          abi: TOKEN_ABI,
          client: publicClient
        })
      : null,
    write: walletClient
      ? getContract({
          address: TOKEN_ADDRESS,
          abi: TOKEN_ABI,
          client: walletClient
        })
      : null
  };
}
```

### 2. Reading Contract State

```typescript
import { useReadContract } from 'wagmi';
import { TOKEN_ADDRESS, TOKEN_ABI } from './contracts/generated';

function TokenBalance({ address }: { address: string }) {
  const { data: balance, isLoading } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  if (isLoading) return <div>Loading balance...</div>;

  return <div>Balance: {balance?.toString()}</div>;
}
```

### 3. Writing to Contracts

```typescript
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TOKEN_ADDRESS, TOKEN_ABI } from './contracts/generated';
import { parseUnits } from 'viem';

function TransferButton() {
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleTransfer = async () => {
    writeContract({
      address: TOKEN_ADDRESS,
      abi: TOKEN_ABI,
      functionName: 'transfer',
      args: ['0xRecipientAddress', parseUnits('100', 18)],
    });
  };

  return (
    <button onClick={handleTransfer} disabled={isConfirming}>
      {isConfirming ? 'Transferring...' : 'Transfer 100 Tokens'}
    </button>
  );
}
```

## pod network-Specific Patterns

### 1. Transaction Finality (Attestations, not Blocks)

On pod network, finality is based on **attestations** (>2/3 validator signatures), not block confirmations.

**Traditional Ethereum pattern (WRONG for pod):**

```typescript
// ❌ DON'T: Wait for block confirmations (pod has no blocks!)
const receipt = await publicClient.waitForTransactionReceipt({
  hash,
  confirmations: 3 // Meaningless on pod network
});
```

**pod network pattern:**

```typescript
// ✅ DO: Wait for transaction receipt (implies attestation-based finality)
const receipt = await publicClient.waitForTransactionReceipt({ hash });

// Check if transaction succeeded
if (receipt.status === 'success') {
  console.log('Transaction finalized via attestations');
}
```

**For advanced finality tracking**, use the `midnight-network` MCP server:

```typescript
// Query finality percentage from midnight-network MCP
// (Requires MCP integration - see dapp-architecture.md)
const finality = await podNetworkMCP.getTransactionFinality(hash);
console.log(`Finality: ${finality.percentage}%`);
```

### 2. Time-Based Logic (No block.timestamp Consensus)

On pod network, `block.timestamp` is **validator-local** and not consensus-guaranteed. Contracts use time utilities for consensus.

**Frontend implications:**

- Display time-based states (auction end, voting deadline) but warn users of potential delays
- Use contract-emitted events for authoritative time boundaries
- Poll contract state for time-based transitions

**Example: Auction End Time**

```typescript
import { useReadContract } from 'wagmi';
import { AUCTION_ADDRESS, AUCTION_ABI } from './contracts/generated';

function AuctionTimer() {
  const { data: endTime } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: 'auctionEndTime',
  });

  const { data: hasEnded } = useReadContract({
    address: AUCTION_ADDRESS,
    abi: AUCTION_ABI,
    functionName: 'hasEnded',
  });

  return (
    <div>
      <p>Auction ends at: {new Date(Number(endTime) * 1000).toLocaleString()}</p>
      <p>Status: {hasEnded ? 'Ended' : 'Active'}</p>
      {!hasEnded && <p>⚠️ End time approximate (no block timestamps)</p>}
    </div>
  );
}
```

### 3. Event Listening

Watch for contract events using viem:

```typescript
import { useWatchContractEvent } from 'wagmi';
import { TOKEN_ADDRESS, TOKEN_ABI } from './contracts/generated';

function TransferMonitor({ userAddress }: { userAddress: string }) {
  useWatchContractEvent({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    eventName: 'Transfer',
    args: {
      to: userAddress, // Filter for transfers to user
    },
    onLogs(logs) {
      console.log('New transfer received:', logs);
      // Update UI, show notification, etc.
    },
  });

  return <div>Monitoring transfers...</div>;
}
```

## Common DApp Components

### 1. Wallet Connection

```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi';

function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div>
        <p>Connected: {address}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button key={connector.id} onClick={() => connect({ connector })}>
          Connect {connector.name}
        </button>
      ))}
    </div>
  );
}
```

### 2. Network Switcher

```typescript
import { useAccount, useSwitchChain } from 'wagmi';
import { podDevnet, podMainnet } from './lib/chains';

function NetworkSwitcher() {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();

  return (
    <div>
      <p>Current network: {chain?.name}</p>
      <button onClick={() => switchChain({ chainId: podDevnet.id })}>
        Switch to Devnet
      </button>
      <button onClick={() => switchChain({ chainId: podMainnet.id })}>
        Switch to Mainnet
      </button>
    </div>
  );
}
```

### 3. Transaction Status Toast

```typescript
import { useWaitForTransactionReceipt } from 'wagmi';

function TransactionStatus({ hash }: { hash: `0x${string}` | undefined }) {
  const { isLoading, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  });

  if (!hash) return null;

  return (
    <div className="toast">
      {isLoading && <p>⏳ Transaction pending...</p>}
      {isSuccess && <p>✅ Transaction successful!</p>}
      {isError && <p>❌ Transaction failed</p>}
    </div>
  );
}
```

## Testing Frontend Integration

### 1. Unit Tests with Vitest

```typescript
// frontend/src/components/__tests__/TokenBalance.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenBalance } from '../TokenBalance';

describe('TokenBalance', () => {
  it('renders loading state', () => {
    render(<TokenBalance address="0x123" />);
    expect(screen.getByText('Loading balance...')).toBeInTheDocument();
  });
});
```

### 2. Integration Tests with Contract Interaction

Use a local pod network node for integration testing:

```typescript
// frontend/src/__tests__/integration/token-transfer.test.ts
import { test, expect } from 'vitest';
import { createTestClient, http } from 'viem';
import { podDevnet } from '../../lib/chains';

test('transfer tokens', async () => {
  const client = createTestClient({
    chain: podDevnet,
    mode: 'anvil',
    transport: http()
  });

  // Deploy contract, transfer tokens, verify balance
  // (Requires local pod network node running)
});
```

## Performance Optimization

### 1. Batch Contract Reads

Use `multicall` for efficient batch reads:

```typescript
import { useReadContracts } from 'wagmi';
import { TOKEN_ADDRESS, TOKEN_ABI } from './contracts/generated';

function TokenInfo() {
  const { data } = useReadContracts({
    contracts: [
      {
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'name',
      },
      {
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'symbol',
      },
      {
        address: TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'totalSupply',
      },
    ],
  });

  const [name, symbol, totalSupply] = data || [];

  return (
    <div>
      <p>Name: {name?.result}</p>
      <p>Symbol: {symbol?.result}</p>
      <p>Total Supply: {totalSupply?.result?.toString()}</p>
    </div>
  );
}
```

### 2. Optimistic Updates

Update UI immediately, then confirm with blockchain:

```typescript
import { useWriteContract } from 'wagmi';
import { useState } from 'react';

function OptimisticTransfer() {
  const [optimisticBalance, setOptimisticBalance] = useState<bigint>(1000n);
  const { writeContract } = useWriteContract();

  const transfer = async (amount: bigint) => {
    // Optimistically update UI
    setOptimisticBalance((prev) => prev - amount);

    try {
      await writeContract({
        /* ... */
      });
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticBalance((prev) => prev + amount);
    }
  };

  return <div>Balance: {optimisticBalance.toString()}</div>;
}
```

## Best Practices

1. **Use TypeScript**: viem provides excellent type safety
2. **Handle loading states**: Always show feedback during async operations
3. **Error handling**: Gracefully handle rejected transactions, network errors
4. **Respect pod's model**: Don't assume global ordering or block confirmations
5. **Test with real contracts**: Use local pod network node for integration tests
6. **Monitor events**: Use event listening for real-time updates
7. **Optimize reads**: Batch contract reads with multicall when possible

## Resources

- **viem docs**: https://viem.sh
- **wagmi docs**: https://wagmi.sh
- **pod network docs**: (query with rag-query skill)
- **Contract ABIs**: Available in `contract/out/` after compilation

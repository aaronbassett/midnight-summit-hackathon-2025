import { defineChain } from 'viem';

/**
 * pod network Devnet chain configuration
 *
 * Custom chain definition for pod network's development/testing environment.
 * This enables wagmi and viem to interact with pod network's devnet.
 *
 * Configuration notes:
 * - Chain ID must match the actual pod network devnet chain ID
 * - RPC URL can be overridden via VITE_MIDNIGHT_RPC_URL environment variable
 * - Native currency is POD with 18 decimals (standard EVM precision)
 * - Block explorer integration for transaction/contract verification
 */
export const podDevnet = defineChain({
  id: 54321, // Example chain ID - update with actual pod devnet chain ID
  name: 'pod network Devnet',
  network: 'pod-devnet',
  nativeCurrency: {
    decimals: 18,
    name: 'POD',
    symbol: 'POD'
  },
  rpcUrls: {
    // Default RPC endpoint for pod network devnet
    default: {
      http: [import.meta.env.VITE_MIDNIGHT_RPC_URL || 'https://rpc.v1.dev.pod.network']
    },
    // Public RPC endpoint (same as default for pod network)
    public: {
      http: [import.meta.env.VITE_MIDNIGHT_RPC_URL || 'https://rpc.v1.dev.pod.network']
    }
  },
  blockExplorers: {
    default: {
      name: 'pod Explorer',
      url: 'https://explorer.testnet-02.midnight.network'
    }
  }
});

/**
 * pod network Mainnet chain configuration
 *
 * Production chain definition for pod network's mainnet.
 *
 * IMPORTANT: Update these values with actual mainnet parameters before production deployment:
 * - Verify chain ID matches pod network mainnet
 * - Confirm RPC URL points to production endpoint
 * - Validate block explorer URL
 *
 * Configuration notes:
 * - Use this chain for production deployments only
 * - Ensure contracts are audited before mainnet deployment
 * - Test thoroughly on devnet before switching to mainnet
 */
export const podMainnet = defineChain({
  id: 12345, // Example chain ID - update with actual pod mainnet chain ID
  name: 'pod network',
  network: 'pod-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'POD',
    symbol: 'POD'
  },
  rpcUrls: {
    // Production RPC endpoint for pod network mainnet
    default: { http: ['wss://rpc.testnet-02.midnight.network'] },
    public: { http: ['wss://rpc.testnet-02.midnight.network'] }
  },
  blockExplorers: {
    default: {
      name: 'pod Explorer',
      url: 'https://explorer.testnet-02.midnight.network'
    }
  }
});

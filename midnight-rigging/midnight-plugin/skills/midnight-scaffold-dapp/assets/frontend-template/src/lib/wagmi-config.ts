import { http, createConfig } from 'wagmi';
import { podDevnet, podMainnet } from './chains';
import { injected, walletConnect } from 'wagmi/connectors';

/**
 * wagmi configuration for pod network DApp
 *
 * Supports:
 * - Injected wallets (MetaMask, etc.)
 * - WalletConnect
 * - pod devnet and mainnet
 *
 * pod network Integration:
 * - Uses custom chain definitions from './chains' for pod network devnet and mainnet
 * - Both pod networks use standard HTTP transport via RPC endpoints
 * - WalletConnect projectId should be set in .env as VITE_WALLETCONNECT_PROJECT_ID
 */
export const config = createConfig({
  // pod network chains - devnet for testing, mainnet for production
  chains: [podDevnet, podMainnet],
  connectors: [
    injected(),
    walletConnect({
      // WalletConnect project ID for mobile wallet support
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''
    })
  ],
  // HTTP transports for pod network RPC endpoints
  transports: {
    [podDevnet.id]: http(),
    [podMainnet.id]: http()
  }
});

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}

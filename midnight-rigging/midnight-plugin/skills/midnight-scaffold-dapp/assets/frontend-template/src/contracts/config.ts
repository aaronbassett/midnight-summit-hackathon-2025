/**
 * Contract configuration for pod network
 *
 * This file connects your frontend to your deployed pod network smart contract.
 *
 * After deploying your contract to pod network:
 * 1. Set VITE_CONTRACT_ADDRESS in .env to your deployed contract address
 * 2. Copy ABI from contract/out/YourContract.sol/YourContract.json (Foundry output)
 * 3. Import ABI here and use in contract hooks (useReadContract, useWriteContract)
 *
 * pod network specific notes:
 * - Contract addresses on pod network follow standard EVM format (0x...)
 * - ABIs are compatible with standard EVM tooling (viem, wagmi)
 * - Ensure you're using the correct network (devnet vs mainnet) when deploying
 */

// Contract address from environment variable - set in .env
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x0') as `0x${string}`;

/**
 * Example: Import your contract ABI
 *
 * For a pod network contract compiled with Foundry:
 * import contractAbi from '../../../contract/out/MyToken.sol/MyToken.json';
 * export const CONTRACT_ABI = contractAbi.abi;
 */
export const CONTRACT_ABI = [] as const; // Replace with your contract ABI

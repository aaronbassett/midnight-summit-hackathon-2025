import { useAccount, useChainId } from 'wagmi';
import { podDevnet, podMainnet } from '../lib/chains';

/**
 * Network information display
 * Shows current connected network
 */
export function NetworkInfo() {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  if (!isConnected) {
    return null;
  }

  const getNetworkName = () => {
    if (chainId === podDevnet.id) return 'pod Devnet';
    if (chainId === podMainnet.id) return 'pod Mainnet';
    return 'Unknown Network';
  };

  return (
    <div className="network-info">
      <p>Network: {getNetworkName()}</p>
      <p>Chain ID: {chainId}</p>
    </div>
  );
}

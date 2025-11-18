import { useAccount, useConnect, useDisconnect } from 'wagmi';

/**
 * Wallet connection component
 * Allows users to connect/disconnect their wallets
 */
export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <p>
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      <h3>Connect Wallet</h3>
      {connectors.map(connector => (
        <button key={connector.id} onClick={() => connect({ connector })} disabled={isPending}>
          {connector.name}
        </button>
      ))}
    </div>
  );
}

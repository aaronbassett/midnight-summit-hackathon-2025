import { useAccount } from 'wagmi';
import { WalletConnect } from './components/WalletConnect';
import { NetworkInfo } from './components/NetworkInfo';
import './App.css';

/**
 * Main application component
 *
 * TODO: Add your DApp-specific components here
 * - Contract interaction forms
 * - State displays (balances, ownership, etc.)
 * - Event listeners
 */
function App() {
  const { isConnected } = useAccount();

  return (
    <div className="app">
      <header>
        <h1>pod network DApp</h1>
        <NetworkInfo />
        <WalletConnect />
      </header>

      <main>
        {isConnected ? (
          <div className="dapp-content">
            <h2>Welcome to your pod network DApp!</h2>
            <p>This is a starter template. Add your contract interaction components here.</p>

            {/* TODO: Add your components */}
            {/* Example:
            <TokenBalance />
            <TransferForm />
            <EventLog />
            */}
          </div>
        ) : (
          <div className="connect-prompt">
            <p>Please connect your wallet to interact with the DApp.</p>
          </div>
        )}
      </main>

      <footer>
        <p>Built on pod network - coordination-free execution</p>
      </footer>
    </div>
  );
}

export default App;

# pod network DApp Frontend

React + Vite + viem frontend for pod network decentralized applications.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Update the following in `.env`:

- `VITE_CONTRACT_ADDRESS`: Your deployed contract address
- `VITE_MIDNIGHT_RPC_URL`: pod network RPC endpoint (default: devnet)
- `VITE_WALLETCONNECT_PROJECT_ID`: Get from https://cloud.walletconnect.com

### 3. Add Contract ABI

After compiling your contract, copy the ABI:

1. Find ABI in `contract/out/YourContract.sol/YourContract.json`
2. Import in `src/contracts/config.ts`:

```typescript
import contractAbi from '../../../contract/out/YourContract.sol/YourContract.json';
export const CONTRACT_ABI = contractAbi.abi;
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
src/
├── components/        # React components
│   ├── WalletConnect.tsx     # Wallet connection UI
│   └── NetworkInfo.tsx       # Network display
├── contracts/        # Contract configuration
│   └── config.ts            # ABI and address
├── lib/             # Utilities
│   ├── chains.ts            # pod network chain configs
│   └── wagmi-config.ts      # wagmi/viem setup
├── App.tsx          # Main app
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## Adding Contract Interactions

### Example: Read Contract State

```typescript
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contracts/config';

function Balance({ address }: { address: string }) {
  const { data: balance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'balanceOf',
    args: [address],
  });

  return <div>Balance: {balance?.toString()}</div>;
}
```

### Example: Write to Contract

```typescript
import { useWriteContract } from 'wagmi';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contracts/config';

function Transfer() {
  const { writeContract } = useWriteContract();

  return (
    <button
      onClick={() =>
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'transfer',
          args: ['0xRecipient', 100n],
        })
      }
    >
      Transfer
    </button>
  );
}
```

## Building for Production

```bash
npm run build
```

Output in `dist/` directory. Deploy to:

- Vercel: `vercel deploy`
- Netlify: `netlify deploy`
- Traditional hosting: Upload `dist/` contents

## Testing

```bash
npm test
```

## pod network Considerations

- **No block numbers**: pod network has no blocks, use attestations for finality
- **No global ordering**: Transactions are order-independent
- **Time-based logic**: `block.timestamp` is validator-local, not consensus

See `references/frontend-integration.md` for detailed patterns.

## Resources

- [viem docs](https://viem.sh)
- [wagmi docs](https://wagmi.sh)
- [pod network docs](https://docs.pod.network) (query with rag-query skill)

# pod network MCP Server - Tool Architecture

This document explains the data source routing architecture for the pod network MCP Server, which provides intelligent access to blockchain data through multiple sources.

## Data Sources

The server uses two primary data sources:

1. **RPC (JSON-RPC)**: Direct connection to pod network nodes via `https://rpc.v1.dev.pod.network/`
2. **Indexer (REST API)**: Enriched blockchain data via `https://v2-api.pod-indexer.tapforce.dev/api/v1/`

## Data Source Routing Logic

### RPC-Only Tools (Real-time, Network-critical)

The following tools **always use RPC** because they require real-time data or are network-critical operations:

#### State Query Tools (`state.ts`)

- `eth_blockNumber` - Latest block number (real-time)
- `eth_chainId` - Network chain ID (immutable)
- `eth_getBalance` - Account balance (real-time)
- `eth_getTransactionCount` - Nonce for transactions (real-time)

#### Gas Tools (`gas.ts`)

- `eth_gasPrice` - Current gas price (real-time)
- `eth_estimateGas` - Gas estimation for transactions (real-time)

#### Network Tools (`network.ts`)

- `eth_networkId` - Network identifier (immutable)
- `net_version` - Protocol version (immutable)
- `pod_getCommittee` - Committee information (real-time)
- `pod_listReceipts` - Receipt-based attestations (real-time)

#### Transaction Sending (`send.ts`)

- `eth_sendRawTransaction` - Broadcast signed transactions (network-critical)

#### Blocks (`blocks.ts`)

- `eth_getBlockByHash` - Block by hash (can be recent, needs real-time)
- `eth_getBlockByNumber` - Block by number (can be latest, needs real-time)

### Indexer-Only Tools (Enriched, Historical)

The following tools **always use Indexer** because they provide enriched data, pagination, or specialized queries not available via RPC:

#### Account Management (`indexer-account.ts`)

- `indexer_register` - Register new indexer account
- `indexer_login` - Login to account (returns JWT)
- `indexer_listApiKeys` - List API keys for account
- `indexer_createApiKey` - Create new API key
- `indexer_deleteApiKey` - Delete API key
- `indexer_updateApiKey` - Update API key

#### Transaction Query Tools (`indexer-data.ts`)

- `indexer_getTransactionsCount` - Count transactions for address
- `indexer_searchGeneralData` - Search with filters and pagination
- `indexer_listNormalTransactions` - List transactions with pagination
- `indexer_listDecodedTransactions` - List decoded transactions (enriched)
- `indexer_getDecodedTransactionByHash` - Get decoded transaction by hash (enriched)

#### Log Query Tools (`indexer-data.ts`)

- `indexer_listLogs` - List logs with pagination and filters
- `indexer_listDecodedLogs` - List decoded logs (enriched)

#### Contract Verification Tools (`indexer-data.ts`)

- `indexer_getContractSourceCode` - Get verified contract source
- `indexer_verifyContract` - Submit contract for verification

#### Auction Tools (`indexer-data.ts`)

- `indexer_listAuctions` - List auctions with filters and pagination
- `indexer_getAuction` - Get auction by ID
- `indexer_getAuctionCount` - Count auctions with filters
- `indexer_listAuctionBids` - List bids for auction
- `indexer_getWinningBid` - Get winning bid for auction

#### Bridge Tool (`indexer-data.ts`)

- `indexer_getBridgeCertifiedLog` - Get certified bridge log

### Dual-Source Tools (Intelligent Routing)

The following tools can be satisfied by **either RPC or Indexer**. The server intelligently routes based on:

1. **User has Indexer credentials** → Use Indexer (enriched data, better caching)
2. **User lacks Indexer credentials** → Fallback to RPC (zero-config)

#### Transactions (`transactions.ts` + `indexer-data.ts`)

- `eth_getTransactionByHash`
  - **RPC**: Returns basic transaction data
  - **Indexer**: Returns enriched transaction data with decoded information

#### Logs (`logs.ts` + `indexer-data.ts`)

- `eth_getLogs`
  - **RPC**: Returns raw log data with attestation filtering
  - **Indexer**: Returns logs with pagination and richer filtering

**Note**: Currently, dual-source tools are implemented as separate tools with distinct names (`eth_*` for RPC, `indexer_*` for Indexer). Future versions may implement automatic routing within a single tool interface.

## Caching Strategy

### RPC Tools

- **Short TTL (60s)**: Real-time data (blockNumber, gasPrice, balance, txCount)
- **Medium TTL (5min)**: Semi-static data (transactions, receipts, blocks)
- **Long TTL (1hr)**: Static/immutable data (chainId, networkId)

### Indexer Tools

- **Medium TTL (5min)**: Transaction and log queries
- **Long TTL (1hr)**: Contract source code, auction data, certified logs
- **No cache**: Account management operations (register, login, key management)

## Usage Patterns

### Zero-Config Workflow (RPC-only)

```javascript
// No authentication required
eth_blockNumber();
eth_getBalance(address, 'latest');
eth_getTransactionByHash(txHash);
eth_getLogs({ address, topics });
```

### Enhanced Workflow (Indexer)

```javascript
// Step 1: Register and login
indexer_register(login, password);
const { token } = indexer_login(login, password);

// Step 2: Create API key
const { key } = indexer_createApiKey(token, 'my-app-key');

// Step 3: Use enriched queries
indexer_listDecodedTransactions({ address, take: 50 });
indexer_listDecodedLogs({ address, topic });
indexer_getAuction(auctionId);
```

## Adding New Tools

When adding new tools, follow this decision tree:

1. **Does it require real-time data or network operations?**
   - YES → RPC-only tool
   - NO → Continue to step 2

2. **Does it provide enriched/decoded data or pagination?**
   - YES → Indexer-only tool
   - NO → Continue to step 3

3. **Could it benefit from either source?**
   - YES → Dual-source tool (implement intelligent routing)
   - NO → Re-evaluate requirements

## File Organization

```
tools/
├── README.md                 # This file
├── state.ts                  # RPC: Balance, nonce, chain info
├── gas.ts                    # RPC: Gas price, estimation
├── blocks.ts                 # RPC: Block queries
├── transactions.ts           # RPC: Transaction queries
├── logs.ts                   # RPC: Log queries
├── network.ts                # RPC: Network info, pod-specific
├── send.ts                   # RPC: Transaction broadcasting
├── indexer-account.ts        # Indexer: Account management
└── indexer-data.ts           # Indexer: All data queries
```

## Related Files

- `indexer-client.ts` - Indexer REST API client implementation
- `rpc-client.ts` - RPC JSON-RPC client implementation
- `cache.ts` - LRU caching with category-based TTL
- `validation.ts` - Zod schemas for parameter validation
- `index.ts` - Tool registration and routing

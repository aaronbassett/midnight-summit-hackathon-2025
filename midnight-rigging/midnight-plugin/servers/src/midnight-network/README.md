# pod network MCP Server

Comprehensive blockchain exploration toolkit for the pod network, providing direct access via RPC and enriched queries via the Indexer API, plus high-level composite analysis tools.

## Features

- **48 Blockchain Tools**: 17 RPC + 22 Indexer + 9 Composite Analysis tools
- **Zero-Config Setup**: Auto-provisioning credentials with intelligent fallback
- **Dual Data Sources**: RPC for real-time queries, Indexer for historical/enriched data
- **Composite Analysis**: High-level tools combining multiple APIs (address analysis, network health, finality verification)
- **Intelligent Caching**: 6-tier TTL strategy optimized for data mutability
- **Error Recovery**: Automatic retry logic, graceful degradation, partial success reporting
- **Performance**: <100ms cached queries, <2s network queries (95th percentile)
- **Safety**: Input validation, secure credential storage, rate limit handling

## Tools

### RPC Tools (17 tools) - Real-Time Blockchain Queries

**State Queries:**

- `eth_blockNumber` - Get latest block number
- `eth_chainId` - Get chain ID (0x50d for dev network)
- `eth_gasPrice` - Get current gas price estimate
- `eth_getBalance` - Get account balance at specific block
- `eth_getTransactionCount` - Get account nonce

**Block Queries:**

- `eth_getBlockByHash` - Retrieve full block data by hash
- `eth_getBlockByNumber` - Retrieve full block data by number/tag

**Transaction Queries:**

- `eth_getTransactionByHash` - Get transaction details by hash
- `eth_getTransactionReceipt` - Get transaction receipt with logs
- `eth_sendRawTransaction` - Submit signed transaction to network

**Log Queries:**

- `eth_getLogs` - Query event logs with filters (max 1000 results)

**Gas Estimation:**

- `eth_estimateGas` - Estimate gas required for transaction

**Network Info:**

- `eth_networkId` - Get network ID
- `net_version` - Get network version string

**pod network-Specific:**

- `pod_getCommittee` - Get current validator committee members
- `pod_pastPerfectTime` - Get past perfect time (finality checkpoint)
- `pod_listReceipts` - List confirmed receipts since timestamp

### Indexer Tools (22 tools) - Historical & Enriched Data

**Account Management:**

- `indexer_register` - Register new indexer account
- `indexer_login` - Login to get JWT token
- `indexer_listApiKeys` - List API keys for account
- `indexer_createApiKey` - Create new API key
- `indexer_deleteApiKey` - Delete API key
- `indexer_updateApiKey` - Update API key name/expiration

**Transaction Queries:**

- `indexer_getTransactionByHash` - Get enriched transaction data
- `indexer_getTransactionsCount` - Count transactions for address
- `indexer_searchGeneralData` - Search with filters and pagination
- `indexer_listNormalTransactions` - List transactions with pagination
- `indexer_listDecodedTransactions` - List decoded transactions (enriched)
- `indexer_getDecodedTransactionByHash` - Get decoded transaction by hash

**Log Queries:**

- `indexer_listLogs` - List logs with pagination and filters
- `indexer_listDecodedLogs` - List decoded logs (enriched with ABI)

**Contract Verification:**

- `indexer_getContractSourceCode` - Get verified contract source
- `indexer_verifyContract` - Submit contract for verification

**Auction Queries:**

- `indexer_listAuctions` - List auctions with filters
- `indexer_getAuction` - Get auction by ID
- `indexer_getAuctionCount` - Count auctions with filters
- `indexer_listAuctionBids` - List bids for auction
- `indexer_getWinningBid` - Get winning bid for auction

**Bridge Queries:**

- `indexer_getBridgeCertifiedLog` - Get certified bridge log

### Composite Analysis Tools (9 tools) - High-Level Insights

**Address Analysis:**

- `analyze_address` - Comprehensive address profile
  - Combines: balance, nonce, tx count, history, logs, contract source, bridge activity
  - Returns: Type (EOA/Contract), verification status, recent activity, first/last seen
  - Use case: "Analyze this address and tell me everything about it"

**Auction Analysis:**

- `analyze_auction` - Complete auction breakdown
  - Combines: auction details, bids, winner, bidder profiles
  - Returns: Timeline, statistics, bidder balances and activity
  - Use case: "Show me the bid history and winner for auction #123"

**Finality Verification:**

- `verify_finality` - Transaction finality status
  - Combines: receipt attestations, committee quorum, Past Perfect Time
  - Returns: Finalized boolean, attestation count, confidence level (HIGH/MEDIUM/LOW)
  - Use case: "Is this transaction finalized?"

- `analyze_past_perfect_time` - Past Perfect Time analysis
  - Combines: PPT timestamp, receipts around PPT
  - Returns: PPT lag, advancement rate, locked-in receipts
  - Use case: "What's the current finality checkpoint?"

**Network Monitoring:**

- `analyze_committee` - Validator committee composition
  - Returns: Committee size, quorum calculations, validator list
  - Use case: "Who are the current validators?"

- `network_health_dashboard` - Overall network health
  - Combines: throughput, finality metrics, validator participation, PPT lag
  - Returns: Health status (Healthy/Warning/Critical) with trends
  - Use case: "How healthy is the network right now?"

**Performance Analysis:**

- `analyze_pod_performance` - Network performance metrics
  - Combines: receipts in time windows, committee info
  - Returns: Throughput (receipts/sec), finality %, latency percentiles (p50/p90/p95/p99)
  - Use case: "What's the network throughput in the last 60 seconds?"

- `track_attestation_performance` - Attestation statistics
  - Combines: receipts with attestations, committee quorum
  - Returns: Avg attestations, % finalized, validator participation, distribution
  - Use case: "How are validators performing?"

- `benchmark_transaction_speed` - Transaction speed benchmark
  - Combines: transaction submission, receipt polling, committee quorum
  - Returns: Time to first receipt, time to 2/3 attestations, time to full attestation
  - Use case: "How fast are transactions getting finalized?"

## Data Source Routing

The pod network MCP server provides access to blockchain data through three tiers:

### When to Use RPC Tools (Real-Time Queries)

**Use RPC when you need:**

- Current/latest blockchain state (`eth_blockNumber`, `eth_gasPrice`)
- Real-time balance queries (`eth_getBalance`)
- Immediate transaction submission (`eth_sendRawTransaction`)
- Gas estimation for pending transactions (`eth_estimateGas`)
- Fresh network information (`pod_getCommittee`, `pod_pastPerfectTime`)

**Characteristics:**

- Always fresh data (no caching for pending state)
- Higher latency (~500ms network round-trip)
- Limited filtering/pagination capabilities
- Required for write operations (transaction submission)

### When to Use Indexer Tools (Historical & Enriched Data)

**Use Indexer when you need:**

- Historical transaction queries with pagination (`indexer_listNormalTransactions`)
- Decoded/enriched data with ABI information (`indexer_listDecodedLogs`)
- Complex filtering and search (`indexer_searchGeneralData`)
- Verified contract source code (`indexer_getContractSourceCode`)
- Auction/bridge activity queries
- Transaction counts and statistics

**Characteristics:**

- Fast queries with caching (~200ms network, <100ms cached)
- Rich filtering and pagination support
- Decoded events and function calls
- Historical data may lag behind RPC by a few seconds
- Requires credentials (auto-provisioned on first use)

### When to Use Composite Tools (High-Level Analysis)

**Use Composite when you need:**

- Comprehensive profiles combining multiple data sources (`analyze_address`)
- Multi-step workflows with partial success handling (`analyze_auction`)
- Performance benchmarking and monitoring (`network_health_dashboard`)
- Finality verification with confidence scoring (`verify_finality`)
- Abstracted queries hiding implementation details

**Characteristics:**

- Highest-level interface (most user-friendly)
- Automatically combines RPC + Indexer + calculations
- Graceful error handling (partial results if some queries fail)
- Longer execution time (multiple API calls)
- Structured output with errors[] and warnings[] arrays

### Decision Tree

```
Need to submit a transaction? → RPC (eth_sendRawTransaction)
Need historical data with pagination? → Indexer (indexer_listNormalTransactions)
Need current balance? → RPC (eth_getBalance) or Composite (analyze_address for full profile)
Need verified contract source? → Indexer (indexer_getContractSourceCode)
Need comprehensive analysis? → Composite (analyze_address, analyze_auction, network_health_dashboard)
Need latest block number? → RPC (eth_blockNumber)
Need transaction history? → Indexer (indexer_listNormalTransactions)
Need finality status? → Composite (verify_finality)
```

## Past Perfect Time (PPT)

**Past Perfect Time** is pod network's finality checkpoint mechanism. It represents the most recent timestamp (in microseconds) that has been finalized by the validator committee.

### Key Concepts

- **Format**: Microsecond Unix timestamp (e.g., `1731408000000000` = 2025-11-12 10:00:00.000000 UTC)
- **Finality Guarantee**: All transactions with timestamps ≤ PPT are considered finalized and immutable
- **Advancement**: PPT advances as the validator committee reaches consensus (2/3 quorum)
- **Lag**: PPT typically lags behind current time by a few seconds during normal operation

### Using PPT

**Check current finality checkpoint:**

```typescript
// Get current Past Perfect Time
const ppt = await rpcClient.call('pod_pastPerfectTime', []);
const pptDate = new Date(ppt / 1000); // Convert microseconds to milliseconds
console.log(`Finalized up to: ${pptDate.toISOString()}`);
```

**Verify transaction finality:**

```typescript
// Use composite tool for comprehensive finality check
const result = await analyze_finality({ txHash: '0x123...' });
// Returns: { finalized: true/false, confidence: 'HIGH'/'MEDIUM'/'LOW'/'NONE', ... }
```

**Monitor finality lag:**

```typescript
const dashboard = await network_health_dashboard({ windowSeconds: 60 });
console.log(`PPT lag: ${dashboard.pastPerfectTime.lagSeconds}s`);
```

### PPT in Tools

- `pod_pastPerfectTime` - Get current PPT timestamp
- `pod_listReceipts` - List receipts since a given timestamp (uses PPT internally)
- `verify_finality` - Check if transaction is finalized (compares receipt timestamp to PPT)
- `analyze_past_perfect_time` - Detailed PPT analysis with advancement metrics
- `network_health_dashboard` - Includes PPT lag monitoring

## Configuration

Environment variables:

- `POD_RPC_URL` - RPC endpoint (default: https://rpc.v1.dev.pod.network/)
- `POD_INDEXER_URL` - Indexer API endpoint (default: https://v2-api.pod-indexer.tapforce.dev)
- `POD_INDEXER_LOGIN` - Manual indexer login (optional, triggers manual credential mode)
- `POD_INDEXER_PASSWORD` - Manual indexer password (optional, required if login is set)
- `LOG_LEVEL` - Logging level (default: info)

## Credential Lifecycle

The server provides **zero-config** access to pod network blockchain data through intelligent credential management for the Indexer API.

### Auto-Provisioning (Default Behavior)

When you first use an indexer tool (e.g., `indexer_listDecodedTransactions`):

1. **Check for stored credentials** - Looks for `~/.rigging/pod.json`
2. **Auto-provision if missing**:
   - Generates random username (`pod-rigging-{random}`)
   - Generates secure random password (32 characters)
   - Registers account with Indexer API
   - Creates API key
   - Stores credentials securely with 0600 permissions
3. **Reuse on subsequent calls** - All future queries use stored credentials

**Note**: RPC tools (e.g., `eth_blockNumber`, `eth_getBalance`) work immediately without any credentials.

### Manual Credentials (Environment Variables)

For production or shared environments, set credentials explicitly:

```bash
export POD_INDEXER_LOGIN="your-username"
export POD_INDEXER_PASSWORD="your-password"
```

**Important**: Credentials from environment variables are **never** persisted to disk. They take precedence over stored credentials.

### Credential Storage

- **Location**: `~/.rigging/pod.json`
- **Permissions**: 0600 (owner read/write only)
- **Format**:
  ```json
  {
    "login": "pod-rigging-abc123def456",
    "password": "...",
    "apiKey": "...",
    "created": "2025-11-12T10:30:00.000Z",
    "indexerUrl": "https://v2-api.pod-indexer.tapforce.dev"
  }
  ```

### Credential Refresh

If stored credentials become invalid (e.g., API key revoked):

1. **Automatic detection** - 401/403 responses trigger re-provisioning
2. **Re-authentication** - Uses stored login/password to:
   - Login to get new JWT token
   - Create new API key
   - Update stored credentials
3. **Retry query** - Original request is retried with new credentials

### Conflict Resolution

If auto-provisioning encounters a username conflict (rare):

- **Automatic retry** - Generates new random username
- **Max 3 attempts** - After 3 failures, falls back to manual mode
- **Clear error message** - Suggests setting `POD_INDEXER_LOGIN` and `POD_INDEXER_PASSWORD`

### Security

- **Passwords never logged** - FR-014 compliance
- **API keys never logged** - FR-014 compliance
- **Secure file permissions** - 0600 on credentials file
- **Secure directory** - 0700 on `~/.rigging/` directory
- **No env var persistence** - Environment credentials never written to disk

## Cache Strategy

The server uses category-based LRU caching with differentiated TTL strategies optimized for data mutability:

### Cache Categories and Policies

| Category     | TTL      | Max Entries | Use Case                                   |
| ------------ | -------- | ----------- | ------------------------------------------ |
| transactions | Infinite | 1000        | Confirmed transactions (immutable)         |
| contracts    | Infinite | 200         | Contract metadata, source code (immutable) |
| balances     | 10s      | 500         | Account balances (frequent updates)        |
| tokens       | 30s      | 500         | Token balances (moderate updates)          |
| logs         | 30s      | 1000        | Event logs (historical data)               |
| networkStats | 5s       | 1           | Network info (very dynamic)                |

### Cache Key Format

Cache keys use deterministic serialization (FR-069):

```
{tool_name}:{serialized_params}
```

Examples:

- `indexer_getTransactionByHash:0x123abc...`
- `eth_getBalance:0xabcd...:latest`
- `indexer_listLogs:{"address":"0x123...","take":20}`

### Performance

- **Cache Hit**: <100ms (in-memory O(1) lookup)
- **Cache Miss**: Depends on network (RPC: ~500ms, Indexer: ~200ms)
- **LRU Eviction**: Automatic when max entries exceeded
- **Stale Fallback**: Returns stale data during network outages

### Cache Behavior

**Immutable Data** (TTL: Infinite):

- Confirmed transactions never change
- Contract source code is permanent
- Cached indefinitely until LRU eviction

**Mutable Data** (TTL: 5-30s):

- Balances update frequently
- Network stats change every block
- Fresh data fetched after TTL expires

**Pending Transactions** (Not Cached):

- Pending state is excluded from cache (FR-063)
- Always fetched fresh from network

## Error Handling

All errors include:

- `error`: Error code (VALIDATION_ERROR, NETWORK_ERROR, TIMEOUT_ERROR, RPC_ERROR)
- `message`: Human-readable description
- `recovery`: Actionable recovery steps
- `details`: Technical details for debugging

## Performance

- **Cache**: 10,000 entries max, 100MB size limit, LRU eviction
- **Timeout**: 30s per RPC call
- **Retry**: 1 automatic retry on network errors
- **Log Limit**: 1000 entries max with truncation warning

## Development

```bash
# Run tests
pnpm run test:midnight-network

# Build
pnpm run build

# Type check
pnpm run type-check
```

## Architecture

**Core Infrastructure:**

- `index.ts` - MCP server implementation, tool registration (48 tools)
- `client.ts` - HTTP RPC client with retry logic and timeout handling
- `indexer-client.ts` - Indexer API client with auto-provisioning and credential management
- `credentials.ts` - Secure credential storage and refresh logic
- `cache.ts` - Category-based LRU cache manager with differentiated TTL strategies
- `validation.ts` - Zod schemas for all tool inputs
- `logger.ts` - Structured logging with LogTape
- `types.ts` - TypeScript type definitions and error builders

**Tool Implementations** (`tools/` directory):

- `blocks.ts` - Block query tools (eth_getBlockByHash, eth_getBlockByNumber)
- `logs.ts` - Event log queries (eth_getLogs)
- `network.ts` - Network information (eth_networkId, net_version, pod_getCommittee, pod_pastPerfectTime) - 4 tools
- `state.ts` - State queries (eth_blockNumber, eth_chainId, eth_getBalance, eth_gasPrice, eth_getTransactionCount)
- `transactions.ts` - Transaction tools (eth_getTransactionByHash, eth_getTransactionReceipt, eth_sendRawTransaction, eth_estimateGas, pod_listReceipts)
- `indexer-account.ts` - Indexer account management (6 tools)
- `indexer-data.ts` - Indexer data queries (16 tools)
- `composite-address.ts` - Address analysis composite tool
- `composite-auction.ts` - Auction analysis composite tool
- `composite-finality.ts` - Finality verification composite tools (2 tools)
- `composite-network.ts` - Network monitoring composite tools (2 tools)
- `composite-performance.ts` - Performance analysis composite tools (3 tools)

**Testing:**

- `tests/midnight-network/` - Comprehensive test suite covering all tool categories

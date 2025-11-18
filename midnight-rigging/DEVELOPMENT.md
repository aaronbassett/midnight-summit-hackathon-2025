# pod Plugin - Development Documentation

Maintainer and builder documentation for the pod Plugin and RAG server.

## Table of Contents

- [Development Setup](#development-setup)
- [Remote RAG Server](#remote-rag-server)
- [Updating the Knowledge Base](#updating-the-knowledge-base)
- [Testing](#testing)
- [Performance](#performance)
- [Building and Distribution](#building-and-distribution)
- [Architecture](#architecture)

## Development Setup

### Prerequisites

- Node.js 24.11.0+ (LTS)
- Chroma Cloud access with API key and tenant ID
- fly.io account (for production deployment)

### Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/pod-rigging.git
   cd pod-rigging
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables for the RAG server:

   ```bash
   cd rag-mcp
   cp .env.example .env
   # Edit .env and add your CHROMA_API_KEY, CHROMA_TENANT, and CHROMA_DATABASE
   ```

4. Start the RAG server locally:

   ```bash
   cd rag-mcp
   npm run dev
   ```

5. In a new terminal, link the plugin to Claude Code:

   ```bash
   ln -s $(pwd)/midnight-plugin ~/.claude/plugins/midnight-plugin
   ```

6. Configure plugin to use local RAG server:

   Edit `midnight-plugin/.mcp.json`:

   ```json
   {
     "mcpServers": {
       "midnight-rag": {
         "command": "node",
         "args": ["servers/midnight-rag.js"],
         "env": {
           "RAG_SERVER_URL": "http://localhost:3000"
         }
       }
     }
   }
   ```

7. Restart Claude Code

## Remote RAG Server

The RAG MCP server (`rag-mcp/`) provides secure, read-only access to the pod network knowledge base hosted on Chroma Cloud.

### Running Locally

```bash
cd rag-mcp
npm run dev
```

Server starts on `http://localhost:3000` with:

- Health check: `GET /health`
- MCP endpoint: `POST /mcp`
- Cache stats: `GET /cache/stats`

### Building for Production

```bash
cd rag-mcp
npm run build
```

### Deploying to fly.io

```bash
cd rag-mcp
fly auth login

# First time only
fly apps create midnight-rag-mcp
fly secrets set CHROMA_API_KEY=your-api-key-here
fly secrets set CHROMA_TENANT=your-tenant-id-here

# Deploy
fly deploy
```

### Monitoring

```bash
# View logs
fly logs

# Check status
fly status

# View metrics
fly dashboard
```

## Updating the Knowledge Base

With the v2.0.0 architecture, the knowledge base is managed directly in Chroma Cloud. There's no need to sync to local files.

### Adding New Documentation

1. **Upload to Chroma Cloud**:
   - Use the Chroma Cloud web interface or API
   - Add documents to the appropriate collection
   - Ensure metadata includes: `source_title`, `source_url`, `topic_tags`

2. **Test immediately**:
   - The RAG server queries Chroma Cloud in real-time
   - New documents are available immediately (cached for 5 minutes)
   - No plugin restart needed

3. **Clear cache** (if needed):
   ```bash
   curl -X POST https://midnight-rag-mcp.fly.dev/cache/clear
   ```

### Versioning

Updating the knowledge base triggers a **MINOR** version bump per the constitution:

- Update `midnight-plugin/package.json` version
- Document changes in root `README.md` version history
- Create git tag: `git tag v2.1.0 && git push origin v2.1.0`

## Testing

### rag-mcp Server Tests

```bash
cd rag-mcp

# Run all tests
npm test

# Run specific test file
npm test -- src/services/cache.test.ts

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

**Test suites**:

- `src/services/cache.test.ts` - Cache service tests (20 tests)
- `src/middleware/security.test.ts` - Security middleware tests (26 tests)
- `src/services/chroma-client.test.ts` - Chroma Cloud integration tests (17 tests)

**Integration tests** require valid `CHROMA_API_KEY` and `CHROMA_TENANT` in `.env`.

### midnight-plugin Tests

```bash
cd midnight-plugin

# Build TypeScript
npm run build

# Type checking
npm run type-check

# Run all tests
npm test

# Run specific test suite
npm test -- midnight-network/tools-integration.test.ts
```

#### midnight-network MCP Server Tests

**Test suites**:

- `tests/midnight-network/tools-integration.test.ts` - Comprehensive integration tests for all RPC, Indexer, and Composite tools (65+ tests)

**Expected Test Behavior**:

The test suite includes error-handling scenarios that intentionally trigger RPC failures. During test execution, you may see log messages like:

```
[ERR] pod·network·client: rpc_call_failed
[ERR] pod·network·composite-finality: ppt_fetch_failed
```

These failures are **EXPECTED** and indicate proper error handling:

- Tests use non-existent block hashes (e.g., `TEST_BLOCK_HASH`) to verify graceful handling
- Transaction and receipt lookups may return null for non-existent data
- Network connectivity is tested by handling failed requests
- All tests pass despite these logged errors because they correctly handle error scenarios

If you see these RPC failures in test logs but all tests pass, **this is correct behavior**.

**CI Testing Support**:

The midnight-network tests are designed to run in CI environments without requiring Indexer API credentials. Tests are split into two categories:

1. **RPC Tests** (always run):
   - No authentication required
   - Test all Ethereum JSON-RPC methods
   - Test pod-specific RPC methods (committee, past perfect time)
   - ~40 tests

2. **Indexer Tests** (conditionally skipped):
   - Require API key authentication
   - Automatically skipped if `POD_INDEXER_TEST_API_KEY` is not set
   - Include transaction data, logs, contracts, auctions, bridge data
   - ~25 tests

**Running Tests in CI** (without credentials):

```bash
# Run tests - Indexer tests will be skipped automatically
npm test
```

Output shows:

```
✓ RPC Tools - State Queries (5 tests)
✓ RPC Tools - Block Queries (2 tests)
✓ Composite Analysis Tools (7 tests)
○ Indexer Tools - Transaction Data (6 tests) [SKIPPED]
○ Indexer Tools - Log Data (2 tests) [SKIPPED]
```

**Running Full Integration Tests** (with credentials):

```bash
# Set Indexer API key
export POD_INDEXER_TEST_API_KEY=your-api-key-here

# Run all tests including Indexer tests
npm test
```

**Using Runtime Credentials**:

The tests demonstrate the runtime credential pattern (lines 33-35 in `tools-integration.test.ts`):

```typescript
indexerClient = TEST_API_KEY
  ? new IndexerClient({ apiKey: TEST_API_KEY, indexerUrl: INDEXER_URL })
  : new IndexerClient();
```

This ensures:

- CI builds pass without credentials (RPC tests only)
- Local development can test full integration with credentials
- No credential storage in repository

### Manual Testing

#### Test RAG Server

```bash
# Health check
curl http://localhost:3000/health

# MCP endpoint (requires MCP JSON-RPC format)
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "collection_query",
      "arguments": {
        "collection": "pod-knowledge",
        "queryTexts": ["ERC-721"],
        "nResults": 3
      }
    }
  }'
```

#### Test Plugin in Claude Code

1. Ensure RAG server is running (local or production)
2. Install plugin: `ln -s $(pwd)/midnight-plugin ~/.claude/plugins/midnight-plugin`
3. Restart Claude Code
4. Ask a test question: "How do I implement ERC-721 enumerable?"
5. Verify:
   - Skill triggers automatically
   - Search completes in <3 seconds
   - Results include source citations
   - Relevance scores are reasonable (>0.5 for good matches)

## Performance

### Target Metrics

From `specs/001-rag-knowledge-skill/spec.md`:

- **Query response time**: <3 seconds
- **Memory usage**: <500MB (RAG server)
- **Retrieval accuracy**: 90%+ for pod-specific questions

### Actual Performance

**RAG Server** (fly.io, 1 CPU / 1GB RAM):

- **Cold start**: ~500ms
- **Cached queries**: <10ms
- **Uncached queries**: ~200-500ms (Chroma Cloud latency)
- **Memory usage**: ~50-100 MB

**Cache hit rates** (typical):

- Queries: 40-60% (5 min TTL)
- Metadata: 80-90% (1 hour TTL)

### Monitoring Performance

```bash
# Check cache stats
curl http://localhost:3000/cache/stats

# Watch server logs
fly logs
```

### Optimization Tips

1. **Cache tuning**: Adjust TTL values in `src/services/cache.ts`
2. **Rate limiting**: Adjust limits in `.env` if needed
3. **Fly.io scaling**: Increase memory/CPU for heavy usage
4. **Collection indexing**: Ensure Chroma Cloud collections have proper indexes

## Building and Distribution

### Prerequisites

- All dependencies installed: `npm install`
- Tests passing: `npm test`
- Version bumped in `midnight-plugin/package.json`
- RAG server deployed to production

### Build midnight-plugin

```bash
cd midnight-plugin

# Install production dependencies
npm ci --production

# Build TypeScript
npm run build
```

### Create Distribution Tarball

```bash
# From repository root
mkdir -p dist/midnight-plugin

# Copy plugin files
cd midnight-plugin
cp -r skills/ servers/ .claude-plugin/ .mcp.json package.json package-lock.json ../dist/midnight-plugin/
cp -r node_modules/ ../dist/midnight-plugin/

# Create tarball
cd ../dist
tar -czf midnight-plugin-v$(node -p "require('./midnight-plugin/package.json').version").tgz midnight-plugin/
```

### Distribution Checklist

- [ ] Version number updated in `midnight-plugin/package.json`
- [ ] RAG server deployed to production
- [ ] All tests passing (both rag-mcp and midnight-plugin)
- [ ] `node_modules/` includes only production dependencies
- [ ] Tarball size is reasonable (<50MB recommended)
- [ ] Test installation on fresh system

### Release Process

1. **Deploy RAG server** (if changes made):

   ```bash
   cd rag-mcp
   fly deploy
   ```

2. **Update plugin version**:
   - Bump version in `midnight-plugin/package.json`
   - Update `README.md` version history

3. **Build and test**:

   ```bash
   npm test
   cd midnight-plugin && npm run build
   ```

4. **Create distribution**:
   - Follow "Create Distribution Tarball" steps above
   - Test on fresh system

5. **Create GitHub release**:
   - Create release branch: `git checkout -b release/v2.x.x`
   - Commit version changes
   - Push and create PR
   - After merge, create GitHub release with tarball

6. **Tag release**:
   ```bash
   git tag v2.x.x
   git push origin v2.x.x
   ```

## Architecture

### v2.0.0 Architecture Overview

```
┌─────────────────┐
│  Claude Code    │
│   + midnight-plugin  │
└────────┬────────┘
         │ MCP (stdio)
         ▼
┌─────────────────┐
│  midnight-rag.ts     │  (runs locally in plugin)
│  MCP Server     │
└────────┬────────┘
         │ HTTP/MCP
         ▼
┌─────────────────┐
│  rag-mcp        │  (deployed to fly.io)
│  Express + MCP  │
│  - Caching      │
│  - Rate Limits  │
│  - Security     │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  Chroma Cloud   │
│  Vector DB      │
└─────────────────┘
```

### Component Details

**midnight-plugin** (runs locally):

- Stdio MCP server
- Semantic search tool
- Connects to remote RAG server

**rag-mcp** (deployed to fly.io):

- Express + MCP HTTP server
- 7 MCP tools for collection operations
- In-memory LRU cache
- Rate limiting and security
- Read-only proxy to Chroma Cloud

**Chroma Cloud**:

- Hosted vector database
- Contains pod network knowledge base
- Managed via web interface or API

### Data Flow

1. **User asks question** → Claude Code receives input
2. **Skill triggers** → `skills/rag-query/SKILL.md` pattern matches
3. **Plugin MCP server invoked** → `midnight-rag.ts` receives `semantic_search` call
4. **HTTP request to RAG server** → Queries `https://midnight-rag-mcp.fly.dev/mcp`
5. **Cache check** → RAG server checks in-memory cache
6. **Chroma Cloud query** (if cache miss) → Vector similarity search
7. **Results cached** → Store in LRU cache with TTL
8. **Response returned** → JSON with content, sources, scores
9. **Claude synthesizes** → Combines results into natural answer

### Key Technologies

- **TypeScript**: Strict mode for type safety
- **CloudClient**: Chroma Cloud API client
- **MCP SDK**: Model Context Protocol (v1.21.1)
- **Express**: HTTP server framework (v5.1.0)
- **node-cache**: In-memory LRU caching
- **Zod**: Runtime schema validation
- **fly.io**: Serverless deployment platform

### Security Features

1. **Read-only enforcement**: Rejects mutation operations
2. **Rate limiting**: 100 req/15min general, 20 req/min per collection
3. **Input validation**: Zod schemas + size limits
4. **API key protection**: Keys stored as fly.io secrets
5. **CORS**: Configured for Claude Code origin

### Debugging

**RAG Server logs**:

```bash
fly logs
```

**Plugin logs**:

- Claude Code console shows stderr output from `midnight-rag.ts`

**Test connectivity**:

```bash
# Health check
curl https://midnight-rag-mcp.fly.dev/health

# Cache stats
curl https://midnight-rag-mcp.fly.dev/cache/stats
```

## Future Improvements

### HTTP Connection Pooling

**Current Behavior**:

Both `RpcClient` and `IndexerClient` use Node.js `fetch()` without connection pooling. Each API call creates a new TCP connection, which adds latency from:

- TCP handshake (SYN/SYN-ACK/ACK)
- TLS negotiation (for HTTPS)
- Connection teardown (FIN/ACK)

For typical usage (occasional queries from Claude Code), this overhead is negligible. However, for high-throughput scenarios, connection pooling could provide significant benefits.

**When to Implement**:

Consider connection pooling if you experience:

- High-frequency queries (>10 requests/second sustained)
- Real-time monitoring or dashboard applications
- Batch processing of blockchain data
- Latency-sensitive applications where every millisecond counts

**Implementation Approach**:

1. **Install undici** (modern HTTP client with connection pooling):

   ```bash
   npm install undici
   ```

2. **Create a connection pool agent**:

   ```typescript
   import { Agent } from 'undici';

   const agent = new Agent({
     keepAlive: true,
     connections: 10, // Max concurrent connections
     pipelining: 1, // Requests per connection
     keepAliveTimeout: 60000, // 60s idle timeout
     keepAliveMaxTimeout: 600000 // 10min max connection age
   });
   ```

3. **Use agent with fetch**:

   ```typescript
   const response = await fetch(url, {
     dispatcher: agent,
     method: 'POST',
     headers: { ... },
     body: JSON.stringify(request)
   });
   ```

4. **Configure per use case**:
   - **RPC Client**: Lower connection limit (2-5), shorter timeout
   - **Indexer Client**: Higher connection limit (5-10), longer timeout for batch queries
   - **Long-running processes**: Implement agent cleanup on shutdown

**Expected Performance Gains**:

- **Latency reduction**: 20-50ms per request (depends on network RTT)
- **Throughput increase**: 2-3x for burst workloads
- **Server load**: Reduced connection churn on RPC/Indexer endpoints

**Trade-offs**:

- **Memory overhead**: Each pooled connection consumes ~10-20KB
- **Complexity**: Requires lifecycle management (initialization, cleanup)
- **Error handling**: Connection pool exhaustion needs graceful degradation

**References**:

- [undici documentation](https://undici.nodejs.org/)
- [Node.js HTTP Agent documentation](https://nodejs.org/api/http.html#class-httpagent)
- See inline comments in `src/midnight-network/client.ts` and `src/midnight-network/indexer-client.ts`

---

## Additional Resources

- **rag-mcp README**: `rag-mcp/README.md` - Server documentation
- **Constitution**: `.specify/memory/constitution.md` - Project principles
- **Specifications**: `specs/001-rag-knowledge-skill/` - Feature specs
- **Contributing**: `CONTRIBUTING.md` - PR and code standards
- **User Documentation**: `README.md` - Plugin installation and usage

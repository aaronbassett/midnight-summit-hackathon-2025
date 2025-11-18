# pod Rigging

Development tools and infrastructure for the pod network.

## pod Plugin

Cloud-connected knowledge retrieval for pod blockchain and Solidity development in Claude Code.

### Overview

This Claude Code plugin provides semantic search over the pod network knowledge base hosted on Chroma Cloud. Get instant, cited answers to your smart contract development questions with automatic caching and low latency.

**Key Features**:

- ⚡ Automatic knowledge retrieval based on context
- ☁️ Always up-to-date knowledge base (synced from Chroma Cloud)
- 📚 Comprehensive Solidity and blockchain documentation
- 🎯 Semantic search with source citations
- 🔄 Cross-encoder reranking for improved relevance (NEW in 2.1.0)
- ⚙️ Zero configuration required
- 🚀 Fast responses with intelligent caching

### Installation

#### Prerequisites

- Node.js 24.11.0+ (LTS)
- Claude Code installed

#### Quick Start

**Option 1: Download Release** (Recommended for end-users)

1. Download the latest `midnight-plugin-v*.tgz` release
2. Extract the plugin:
   ```bash
   tar -xzf midnight-plugin-v1.0.0.tgz
   ```
3. Install in Claude Code:
   ```bash
   cp -r midnight-plugin ~/.claude/plugins/
   ```
4. Restart Claude Code

> **Note**: Release tarballs include all dependencies bundled. No npm install required.

**Option 2: Install from Repository** (For contributors/developers)

1. Clone this repository
2. Install dependencies and build:
   ```bash
   cd midnight-plugin/servers
   pnpm install
   pnpm build
   cd ../..
   ```
3. Install the plugin:

   ```bash
   cp -r midnight-plugin ~/.claude/plugins/

   # Or create symlink for development
   ln -s $(pwd)/midnight-plugin ~/.claude/plugins/midnight-plugin
   ```

4. Restart Claude Code

### Usage

Once installed, the plugin works automatically. Just ask Solidity or pod-related questions:

**Solidity Programming**:

```
How do I implement ERC-721 enumerable?
What's the difference between view and pure functions?
How do I prevent reentrancy attacks?
```

**pod Network**:

```
How do I deploy a contract on pod network?
What are the pod-specific contract requirements?
Best practices for pod smart contract development?
```

**Smart Contract Development**:

```
How do I use OpenZeppelin's AccessControl?
What's the gas-efficient way to store arrays?
How do I test smart contracts?
```

#### How It Works

1. You ask a blockchain/Solidity question
2. The `rag-query` skill automatically triggers
3. Claude queries the remote RAG server (hosted on fly.io)
4. The RAG server performs semantic search on Chroma Cloud
5. Results are cached and returned with source citations
6. Claude synthesizes the information into a helpful answer

**Architecture**:

```
Claude Code → midnight-plugin → rag-mcp server (fly.io) → Chroma Cloud
```

The remote RAG server provides:

- Read-only access to the knowledge base
- In-memory caching for fast responses
- Rate limiting to control costs
- Automatic scaling based on demand

#### Distribution Model

The plugin uses a **modular package architecture** to balance ease-of-use with maintainability:

**For End-Users (Release Tarballs)**:

- Release tarballs (`midnight-plugin-v*.tgz`) include pre-built servers with dependencies
- No pnpm install required - extract and copy to `~/.claude/plugins/`
- Zero-friction installation experience

**For Contributors (Repository)**:

- Each package (e.g., `servers/`) is independent with its own dependencies
- Build artifacts (`dist/`, `node_modules/`) are NOT committed (gitignored)
- Contributors must build packages: `cd midnight-plugin/servers && pnpm install && pnpm build`
- Keeps repository clean and git operations fast
- Ensures platform-appropriate dependency installation

**Package Structure**:

- `servers/` - MCP server implementations (TypeScript → compiled to dist/)
  - Dependencies: `@modelcontextprotocol/sdk`, `zod`
  - Each server (rag, reranking, etc.) lives in `src/`
  - Built with: `pnpm build` → outputs to `dist/`
- `skills/` - Plain JSON/Markdown skill definitions (no build step)

**Why This Approach?**:

- ✅ End-users get instant, working installation
- ✅ Contributors get clean git history and modular codebase
- ✅ Repository stays lean (~50KB vs 15MB+ with build artifacts)
- ✅ Easy to add new servers without affecting others
- ✅ Type-safe TypeScript development with compiled JavaScript distribution

Heavy dependencies (ChromaDB, Express, caching) live on the remote server at fly.io.

### Configuration

The plugin includes pre-configured settings. No changes needed unless you want to customize behavior.

**MCP Tools**: The plugin exposes tools for querying and reranking:

**`semantic_search`** - Query the knowledge base:

- `query` (string, required): Search query
- `limit` (number, optional): Max results (default: 5)
- `min_relevance` (number, optional): Min similarity threshold 0.0-1.0 (default: 0.5)

**`rerank`** - Rerank results by semantic relevance (NEW in 2.1.0):

- `query` (string, required): Search query for relevance scoring
- `chunks` (array, required): Candidate chunks to rerank (1-50 items)
- `limit` (number, optional): Max results to return after reranking (1-50)
- `model` (string, optional): Reranking model to use:
  - `Xenova/ms-marco-MiniLM-L-6-v2` (default): Fast baseline (~90MB, 30-100ms)
  - `Xenova/bge-reranker-base`: Higher quality (~280MB, 80-200ms)

**Skill Triggers**: Automatically activates for:

- Solidity programming questions
- Smart contract development questions
- Blockchain security questions
- pod network-specific questions
- Compiler error troubleshooting

See `midnight-plugin/skills/rag-query/SKILL.md` for full trigger patterns.

### Development Skills and Agents

The plugin includes specialized skills and agents for pod network development that streamline common workflows.

#### Scaffolding Skills

**`pod-scaffold-contract`**: Interactive smart contract scaffolding

- Template selection with detailed previews and comparisons
- Progressive reference loading for pod network FastTypes and patterns
- Supports basic contracts, tokens, NFTs, voting systems, and auctions
- Automatic project structure creation with Foundry integration

Example usage:

```
"I want to create a new NFT contract for pod network"
→ Claude will use pod-scaffold-contract to guide you through template selection and scaffolding
```

**`pod-scaffold-dapp`**: Full-stack DApp scaffolding

- Complete project setup: contracts + CLI tools + frontend + tests
- React + Vite + wagmi frontend with pod network integration
- Rust CLI tools using pod SDK
- Comprehensive testing infrastructure
- End-to-end development workflow

Example usage:

```
"Help me scaffold a complete DApp for a token auction on pod network"
→ Claude will use pod-scaffold-dapp to create the full stack
```

#### Specialized Agents

The plugin includes three specialized agents that Claude can invoke for complex development tasks:

**`midnight-deployment-engineer`**: Deployment lifecycle management

- Production-ready deployment scripts (Hardhat/Foundry/Truffle)
- Multi-environment configuration (testnet/staging/mainnet)
- Contract verification guidance for pod explorer
- Upgradeable contract implementation (proxies, UUPS, beacon)
- Pre-deployment validation and safety checks

Example usage:

```
"I need to deploy my NFT contract to pod network testnet"
→ Claude will use the midnight-deployment-engineer agent to guide deployment
```

**`pod-source-validator`**: pod network-specific code validation

- Validates adherence to pod network best practices
- Verifies correct pod SDK usage
- Detects generic EVM patterns that should use pod-specific approaches
- Security analysis and code quality checks
- Branding compliance verification

Example usage:

```
"Review my pod network smart contract for best practices"
→ Claude will use pod-source-validator to analyze your code
```

**`pod-test-engineer`**: Comprehensive testing infrastructure

- Unit and integration test creation
- CLI testing tools using pod Rust SDK
- Stress testing binaries for performance validation
- Test harnesses and fixtures
- Adapts Solidity testing patterns to pod network

Example usage:

```
"Create tests for my token transfer function"
→ Claude will use pod-test-engineer to generate comprehensive tests
```

### pod network MCP Server

The plugin includes a full-featured pod network MCP server that provides blockchain interaction tools for RPC and Indexer API access.

#### Features

**RPC Tools** (`eth_*`, `pod_*`, `net_*`):

- Block queries (`eth_getBlockByNumber`, `eth_getBlockByHash`)
- Transaction queries (`eth_getTransactionByHash`, `eth_getTransactionReceipt`)
- Account state (`eth_getBalance`, `eth_getTransactionCount`)
- Log queries (`eth_getLogs`)
- Network info (`eth_chainId`, `eth_networkId`, `pod_getCommittee`)
- Transaction submission (`eth_sendRawTransaction`)

**Indexer Tools** (`indexer_*`):

- Transaction search with decoded data (`indexer_listDecodedTransactions`)
- Event log search with decoded parameters (`indexer_listDecodedLogs`)
- Contract verification and source code (`indexer_getContractSourceCode`, `indexer_verifyContract`)
- Auction queries (`indexer_listAuctions`, `indexer_getAuction`)
- Bridge certified logs (`indexer_getBridgeCertifiedLog`)
- Account management (`indexer_register`, `indexer_login`, `indexer_createApiKey`)

**Composite Analysis Tools**:

- Address analysis (`analyze_address`)
- Auction monitoring (`monitor_auctions`)
- Finality tracking (`finality_latency_tracker`)
- Network health dashboard (`network_health_dashboard`)
- Performance benchmarking (`benchmark_transaction_speed`)

#### Authentication

The Indexer API supports multiple authentication methods with automatic fallback and provisioning.

**Method 1: Auto-Provisioning (Zero Configuration)**

By default, the server automatically creates and stores credentials on first use:

1. Generates random username/password
2. Registers account with Indexer API
3. Creates API key
4. Stores credentials to `~/.rigging/pod.json` (0600 permissions)

No configuration needed - just start using indexer tools!

**Method 2: Environment Variables (Recommended for CI/CD)**

Set environment variables before starting Claude Code. These credentials are **never** persisted to disk.

**Direct API Key** (highest priority):

```bash
export POD_INDEXER_API_KEY="your-api-key"
export POD_INDEXER_URL="https://v2-api.pod-indexer.tapforce.dev"  # optional
```

**Login/Password** (auto-provisions API key on first use):

```bash
export POD_INDEXER_LOGIN="your-username"
export POD_INDEXER_PASSWORD="your-password"
export POD_INDEXER_URL="https://v2-api.pod-indexer.tapforce.dev"  # optional
```

**Method 3: Per-Tool Credentials (Advanced)**

All `indexer_*` tools accept optional runtime credentials that override environment variables and stored credentials **for that specific tool call only**. Credentials are never persisted.

**Tool Parameters**:

- `apiKey` (string, optional): Direct API key (highest priority)
- `login` (string, optional): Username (requires `password`)
- `password` (string, optional): Password (requires `login`)
- `indexerUrl` (string, optional): Custom indexer URL

**MCP Tool Invocation Examples**:

When Claude invokes tools, runtime credentials are passed as parameters alongside the query parameters:

```typescript
// Example 1: Using direct API key for a single query
// Claude would invoke the tool with these parameters:
{
  name: "indexer_listDecodedTransactions",
  arguments: {
    address: "0x1234...",
    limit: 10,
    apiKey: "temporary-api-key"  // Used only for this call, not stored
  }
}

// Example 2: Using login/password for a single query
// Claude would invoke the tool with these parameters:
{
  name: "indexer_getAuction",
  arguments: {
    auctionId: "auction-123",
    login: "my-username",
    password: "my-password"
  }
}

// Example 3: Using a custom indexer URL
{
  name: "indexer_getContractSourceCode",
  arguments: {
    contractAddress: "0xabcd...",
    apiKey: "temp-key",
    indexerUrl: "https://custom-indexer.example.com"
  }
}
```

**In Natural Language**:

You can ask Claude to use specific credentials for a query:

```
"Query the indexer for transactions at address 0x1234 using API key 'temp-xyz'"

"Get auction details for auction-123 using login 'myuser' and password 'mypass'"

"Check contract source code at 0xabcd using the staging indexer at https://staging.pod-indexer.example.com"
```

#### Authentication Priority

Credentials are resolved in this order (highest to lowest priority):

1. **Per-tool parameters** (not persisted)
2. **`POD_INDEXER_API_KEY` environment variable** (not persisted)
3. **`POD_INDEXER_LOGIN` + `POD_INDEXER_PASSWORD` environment variables** (not persisted)
4. **Stored credentials** (`~/.rigging/pod.json`)
5. **Auto-provision** (generates new credentials)

#### Credential Storage

Auto-provisioned credentials are stored in `~/.rigging/pod.json`:

```json
{
  "login": "pod-rigging-abc123def456",
  "password": "secure-random-password",
  "apiKey": "your-api-key",
  "created": "2025-11-12T10:30:00.000Z",
  "indexerUrl": "https://v2-api.pod-indexer.tapforce.dev"
}
```

**API-Key-Only Format** (optional):

```json
{
  "apiKey": "your-api-key",
  "created": "2025-11-12T10:30:00.000Z",
  "indexerUrl": "https://v2-api.pod-indexer.tapforce.dev"
}
```

File permissions are automatically set to `0600` (user read/write only).

#### Re-Authentication

When an API key becomes invalid (401/403 errors):

**With login/password available**:

- Automatically logs in with stored credentials
- Creates new API key
- Updates stored credentials
- Retries original request

**With API-key only**:

- Returns clear error message
- User must provide new credentials (env vars or per-tool params)

#### Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** in CI/CD pipelines
3. **Use per-tool credentials** for temporary access or testing
4. **Rotate API keys** periodically using `indexer_createApiKey` and `indexer_deleteApiKey`
5. **Limit API key scope** if the Indexer API supports it (check API documentation)
6. **Monitor `~/.rigging/pod.json`** permissions (should always be 0600)

### Troubleshooting

#### Plugin Not Loading

1. Check Claude Code plugins directory: `~/.claude/plugins/`
2. Verify plugin structure matches expected layout
3. Restart Claude Code

#### Skill Not Triggering

1. Ask more specific blockchain/Solidity questions
2. Check `midnight-plugin/skills/rag-query/SKILL.md` trigger patterns
3. Try explicitly: "Search the pod knowledge base for X"

#### No Search Results

1. Check RAG server is accessible: Visit https://midnight-rag-mcp.fly.dev/health
2. Lower `min_relevance` threshold (try 0.3-0.4)
3. Ensure query is specific to knowledge base content
4. Check server logs for errors

#### MCP Server Errors

1. Check server logs in Claude Code console
2. Verify RAG server is running: `curl https://midnight-rag-mcp.fly.dev/health`
3. Test server manually: `cd midnight-plugin/servers && pnpm run dev:rag`
4. Verify dependencies installed: `cd midnight-plugin/servers && pnpm install && pnpm build`
5. Check network connectivity to fly.io

#### Connection Errors

If you see "Failed to connect to RAG server":

1. Check internet connection
2. Verify RAG server is running: Visit https://midnight-rag-mcp.fly.dev/health
3. Check firewall/proxy settings
4. Try again in a few seconds (server may be auto-starting)

### Version History

**2.1.0** (2025-11-11)

- Added cross-encoder reranking MCP server (`midnight-reranking`)
- Multi-model support with selectable reranking models:
  - `Xenova/ms-marco-MiniLM-L-6-v2` (default): Fast baseline (~90MB)
  - `Xenova/bge-reranker-base`: Higher quality (~280MB)
- Two-stage retrieval: fast vector search + precise reranking
- Local model inference with automatic caching per model
- LogTape structured logging for observability
- FIFO queue management for concurrent requests
- Configurable result limits (1-50) for performance tuning

**2.0.0** (2025-11-10)

- **BREAKING**: Migrated from offline SQLite to cloud-based architecture
- Remote RAG server deployed on fly.io
- Always up-to-date knowledge base (synced from Chroma Cloud)
- In-memory caching for fast responses
- Rate limiting and security features
- Rewritten in TypeScript with strict mode
- Automatic scaling based on demand

**1.0.0** (2025-11-09)

- Initial release
- Semantic search over pod blockchain knowledge base
- Offline-capable with bundled vector database (deprecated in 2.0.0)
- Automatic triggering based on question context
- Zero-configuration installation

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- How to submit pull requests
- Code style and testing requirements
- Development workflow

## Maintainer Documentation

For build, release, and maintenance tasks, see [DEVELOPMENT.md](DEVELOPMENT.md) for:

- Updating the knowledge base
- Testing the MCP server
- Building and distributing releases
- Performance tuning

## Development

### Repository Structure

```
pod-rigging/
├── README.md             # Plugin user documentation (this file)
├── CONTRIBUTING.md       # Contributor guidelines
├── DEVELOPMENT.md        # Maintainer/builder documentation
├── CLAUDE.md             # Runtime agent guidance
├── midnight-plugin/           # Claude Code plugin (deliverable)
│   ├── .mcp.json         # MCP server configuration
│   ├── skills/           # Skill definitions (plain files)
│   └── servers/          # MCP servers package
│       ├── package.json       # Server dependencies
│       ├── pnpm-lock.yaml     # Lockfile (committed)
│       ├── tsconfig.json      # TypeScript config
│       ├── .gitignore         # Excludes dist/, node_modules/
│       ├── src/               # TypeScript source
│       │   ├── rag/
│       │   │   └── index.ts   # RAG server
│       │   ├── reranking/     # Reranking server (NEW in 2.1.0)
│       │   │   ├── index.ts   # MCP server entry point
│       │   │   ├── types.ts   # Type definitions
│       │   │   ├── validation.ts  # Zod schemas
│       │   │   ├── logger.ts  # LogTape logging
│       │   │   ├── queue.ts   # p-queue FIFO
│       │   │   └── reranker.ts  # Transformers.js pipeline
│       │   └── utils/         # Shared utilities
│       ├── tests/             # Unit/integration tests
│       ├── dist/              # Compiled output (not in git, bundled in releases)
│       │   ├── rag/
│       │   │   └── index.js
│       │   └── reranking/
│       │       └── index.js
│       └── node_modules/      # Dependencies (not in git, bundled in releases)
├── rag-mcp/              # Remote RAG server (deployed to fly.io)
│   ├── src/              # TypeScript source code
│   │   ├── server.ts     # Express + MCP server
│   │   ├── services/     # Chroma client and cache services
│   │   ├── middleware/   # Security and rate limiting
│   │   └── types/        # TypeScript type definitions
│   ├── Dockerfile        # Container configuration
│   ├── fly.toml          # fly.io deployment config
│   ├── package.json      # Server dependencies
│   ├── tsconfig.json     # TypeScript configuration
│   └── README.md         # Server documentation
├── specs/                # Feature specifications
│   └── 001-rag-knowledge-skill/  # RAG feature spec
├── .specify/             # SpecKit templates and constitution
└── .github/workflows/    # CI/CD workflows
```

### Specifications

Feature specifications are stored in `specs/` using the SpecKit methodology:

- `spec.md` - Feature requirements and user stories
- `plan.md` - Implementation plan and architecture
- `tasks.md` - Task breakdown and progress tracking
- `research.md` - Technical research and decisions
- `data-model.md` - Entity definitions
- `contracts/` - API contracts and interfaces

See `.specify/` for SpecKit templates and commands.

**Implemented Features**:

- `001-rag-knowledge-skill` - Cloud-based RAG with semantic search (v2.0.0)
- `002-reranking-mcp-server` - Cross-encoder reranking for improved relevance (v2.1.0)

## Acknowledgments

The pod Plugin is built with:

- [Chroma](https://www.trychroma.com/) - Vector database
- [Transformers.js](https://huggingface.co/docs/transformers.js) - JavaScript ML inference
- [bge-reranker-base](https://huggingface.co/BAAI/bge-reranker-base) - Cross-encoder reranking model
- [MCP SDK](https://github.com/anthropics/mcp) - Model Context Protocol
- [LogTape](https://logtape.org/) - Structured logging
- [p-queue](https://github.com/sindresorhus/p-queue) - Promise queue
- [Claude Code](https://claude.ai/) - AI development assistant

## License

MIT

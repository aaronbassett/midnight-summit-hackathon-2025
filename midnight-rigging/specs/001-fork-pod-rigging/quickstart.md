# Quickstart: Fork pod-rigging for Midnight Network

**Feature**: 001-fork-pod-rigging
**Branch**: 001-fork-pod-rigging
**Date**: 2025-11-17

## Overview

This quickstart guide provides the fastest path to getting the Midnight Network Claude Code plugin up and running for hackathon development. Focus is on P1 (branding/component adaptation) and P2 (content replacement) for MVP demo.

---

## Prerequisites

### Required
- **Node.js**: 24.11.0 LTS or later
- **npm** or **pnpm**: Latest version
- **TypeScript**: 5.9.3 (installed via npm)
- **Git**: For version control
- **Claude Code CLI**: Installed and configured

### Optional (for full development)
- **Docker**: For consistent development environment (Midnight recommendation)
- **Polkadot.js Browser Extension**: For wallet testing
- **VS Code**: Recommended editor with TypeScript support

### Access Required
- **Midnight Testnet**: Public endpoints available (no signup needed)
  - RPC: `wss://rpc.testnet-02.midnight.network`
  - Indexer: `https://indexer.testnet-02.midnight.network/api/v1/graphql`

---

## Quick Start (5 Minutes)

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/[your-org]/midnight-rigging.git
cd midnight-rigging

# Switch to feature branch
git checkout 001-fork-pod-rigging

# Install MCP server dependencies
cd midnight-plugin/servers  # Will be renamed to midnight-plugin/servers in P1
npm install

# Build MCP servers
npm run build

# Run tests to verify setup
npm test
```

**Expected Result**: All tests pass, `dist/` directory contains compiled JavaScript.

---

### Step 2: Configure Claude Code Plugin

```bash
# From repository root
cd midnight-plugin  # Will be renamed to midnight-plugin in P1

# Verify plugin structure
ls -la
# Should see: .claude-plugin/, .mcp.json, skills/, servers/

# Install plugin to Claude Code
# Option A: Symlink for development
claude code plugin install --dev .

# Option B: Production install
claude code plugin install .
```

**Expected Result**: Plugin installed successfully, visible in `claude code plugin list`.

---

### Step 3: Test Basic Functionality

```bash
# Start Claude Code CLI
claude code

# Test domain-agnostic components (should work immediately after fork)
> Use the reranking tool to rank these chunks: ["hello", "world"]
> Render a template for me

# Test pod-specific components (will be updated to Midnight in P1)
> Query the pod network documentation
> What is the pod network?
```

**Expected Result**:
- Reranking tool works (domain-agnostic)
- Templating works (domain-agnostic)
- pod network queries work (will be replaced with Midnight in P1/P2)

---

## Development Workflow

### Phase 1: Branding Update (P1 - First 2-3 Hours)

**Goal**: Replace all pod branding with Midnight branding, verify domain-agnostic components still work.

```bash
# 1. Update CLAUDE.md with Midnight branding rules
# (Manual edit - critical for establishing branding consistency)

# 2. Update constitution.md with Midnight philosophy
# (Manual edit - adapt pod principles to Midnight context)

# 3. Global find/replace for branding
# Use your editor's find/replace across workspace:
# - "midnight-plugin" → "midnight-plugin"
# - "midnight-network" → "midnight-network"
# - "midnight-rag" → "midnight-rag"
# - "midnight-reranking" → "midnight-reranking"
# - "midnight-developer" → "midnight-developer"
# - "midnight-deployment-engineer" → "midnight-deployment-engineer"

# 4. Rename directories
mv midnight-plugin midnight-plugin
cd midnight-plugin/servers/src
mv midnight-network midnight-network

# 5. Update package.json files
# Edit midnight-plugin/servers/package.json:
# - name: "@midnight-plugin/servers"
# - description: "MCP servers for Midnight Network Claude Code plugin"
# - keywords: ["midnight", "blockchain", "mcp", "servers"]
# - author: "Midnight Network"

# 6. Rebuild and test
cd midnight-plugin/servers
npm run build
npm test

# 7. Update .mcp.json server configurations
# Edit midnight-plugin/.mcp.json to update server names and descriptions

# 8. Test plugin with new branding
claude code plugin uninstall midnight-plugin  # Remove old
claude code plugin install --dev /path/to/midnight-plugin
claude code
> Test Midnight branding
```

**Success Criteria (P1)**:
- Zero occurrences of "midnight-plugin", "midnight-network", "midnight-rag" in working files (SC-001)
- Reranking server starts and processes queries within 10 seconds (SC-003)
- Templating engine loads and renders templates within 5 seconds (SC-004)
- All CI/CD workflows updated with Midnight branding

**Time Estimate**: 2-3 hours

---

### Phase 2: Content Replacement (P2 - Next 4-6 Hours)

**Goal**: Populate RAG with Midnight documentation, create Midnight contract templates.

#### Task 2.1: Gather Midnight Documentation

```bash
# Create documentation directory
mkdir -p data/midnight-docs

# Download or scrape Midnight documentation
# Option A: Manual download from https://docs.midnight.network/
# Option B: Use web scraping tool (if allowed by robots.txt)
# Option C: Use official Midnight docs repository (if available)

# Organize documentation by type
data/midnight-docs/
├── tutorials/
├── api-reference/
├── whitepaper/
├── compact-guide/
└── developer-guides/
```

**Documentation Sources** (from research.md):
- https://docs.midnight.network/ (main docs)
- https://github.com/midnight-ntwrk (official repos)
- https://midnight.network/blog/ (technical articles)

**Target**: At least 500 searchable chunks (SC-005)

---

#### Task 2.2: Embed Documentation into ChromaDB

```bash
# Install ChromaDB (if not already installed)
pip install chromadb

# Create embedding script (or adapt from pod-rigging)
# midnight-plugin/servers/scripts/embed-docs.ts

# Run embedding pipeline
cd midnight-plugin/servers
npm run embed-docs -- --source ../../data/midnight-docs --collection midnight-docs-v1

# Verify embeddings
npm run verify-embeddings -- --collection midnight-docs-v1
```

**Expected Output**:
- ChromaDB collection created with 500+ chunks
- Metadata includes source URLs, sections, doc types

**Success Criteria** (SC-005, SC-006):
- RAG database contains ≥500 searchable chunks
- Queries for "Midnight deployment", "ZK proofs", "private state" return relevant results with >0.7 scores

---

#### Task 2.3: Create Midnight Contract Templates

```bash
# Create template directory structure
mkdir -p midnight-plugin/skills/midnight-scaffold-contract/templates/

# Templates to create:
# 1. hello-world (basic)
# 2. counter (state management example)
# 3. token (fungible token)
# 4. nft (non-fungible token)
# 5. voting (governance example)

# For each template:
# - Create .compact contract file
# - Create package.json with @midnight-ntwrk dependencies
# - Create tsconfig.json
# - Create README.md with usage instructions
# - Add Handlebars placeholders for customization

# Example: Hello World template
mkdir -p midnight-plugin/skills/midnight-scaffold-contract/templates/hello-world
cd midnight-plugin/skills/midnight-scaffold-contract/templates/hello-world

# Create contract file: contract.compact.hbs
# (Use Midnight official examples as reference)
```

**Reference Examples**:
- Official Midnight examples: https://github.com/midnight-ntwrk (welcome, counter, bboard)
- Compact syntax guide: https://docs.midnight.network/develop/reference/compact/

**Success Criteria** (SC-007, SC-008):
- Contract scaffold generates valid Compact code that compiles without errors
- Frontend scaffold generates React app that runs `npm install && npm run dev` successfully

---

#### Task 2.4: Update RAG Query Skill Triggers

```bash
# Edit midnight-plugin/skills/midnight-rag-query/skill.json
# Update triggers to match Midnight-specific keywords

{
  "name": "midnight-rag-query",
  "description": "Query Midnight Network documentation",
  "triggers": [
    "Midnight",
    "Compact",
    "zero-knowledge",
    "ZK proof",
    "shielded transaction",
    "private state",
    "Midnight SDK",
    "testnet-02"
  ],
  "collection": "midnight-docs-v1"
}
```

**Success Criteria** (SC-006):
- Skill auto-activates for Midnight-specific questions
- Returns relevant results with source citations

---

#### Task 2.5: Update Synonym Mapping

```bash
# Edit midnight-plugin/servers/data/blockchain-synonyms.txt
# Add Midnight-specific term mappings

# Format: term -> synonyms
Midnight -> Midnight Network, MN, midnight-network
ZK -> zero-knowledge, zk-proof, zkSNARK
shielded -> private, encrypted, protected
Compact -> compact language, compact contract
DUST -> dust token, native token
testnet-02 -> testnet, test network
viewing key -> view key, decrypt key
```

**Success Criteria** (SC-009):
- blockchain-synonyms.txt maps at least 10 Midnight-specific terms correctly

---

### Phase 3: Testing and Validation (P2 - Final 1-2 Hours)

```bash
# 1. Test RAG queries
claude code
> How do I deploy a contract on Midnight Network?
> Explain zero-knowledge proofs in Midnight
> What is Compact?

# Expected: Relevant answers with source citations

# 2. Test contract scaffolding
> Create a new Midnight token contract

# Expected: Valid Compact contract generated

# 3. Test DApp scaffolding
> Scaffold a Midnight DApp with React

# Expected: React app with Midnight chain configuration

# 4. Run automated tests
cd midnight-plugin/servers
npm test

# 5. Build for distribution
npm run build

# 6. Test plugin installation
cd ../..
claude code plugin uninstall midnight-plugin
claude code plugin install midnight-plugin
claude code plugin list
# Expected: midnight-plugin visible with Midnight branding
```

---

## Demo Preparation

### Demo Script (5 Minutes)

**Setup**:
1. Terminal with Claude Code running
2. Empty workspace directory
3. Midnight testnet explorer open in browser

**Demo Flow**:

```bash
# 1. Show plugin capabilities
> List Midnight Network tools
# Shows: RPC tools, indexer tools, scaffolding skills

# 2. Query documentation
> How do I create a shielded transaction in Midnight?
# Shows: RAG retrieval with source citations

# 3. Scaffold a contract
> Create a new Midnight token contract called "DemoToken"
# Shows: Template rendering, file creation, dependency installation

# 4. Explore generated contract
> Show me the generated Compact contract
# Shows: Valid Compact code with DemoToken branding

# 5. Query blockchain data (if P4 complete)
> What is the latest block on Midnight testnet?
# Shows: RPC tool querying Substrate endpoint

# 6. Wrap up
> Explain what makes Midnight different from Ethereum
# Shows: RAG pulling from architecture documentation
```

**Talking Points**:
- "Forked pod-rigging plugin in 6-8 hours"
- "Reused domain-agnostic components (reranking, templating)"
- "Populated 500+ Midnight documentation chunks"
- "Generated Compact contract templates"
- "Integrated with Midnight testnet RPC and indexer"

---

## Troubleshooting

### Plugin Not Loading

```bash
# Check plugin installation
claude code plugin list

# Reinstall with verbose logging
claude code plugin uninstall midnight-plugin
claude code plugin install --dev /absolute/path/to/midnight-plugin --verbose

# Check .mcp.json syntax
cd midnight-plugin
cat .mcp.json | jq .  # Should parse successfully
```

---

### RAG Queries Returning No Results

```bash
# Verify ChromaDB collection exists
python -c "import chromadb; client = chromadb.PersistentClient(path='./chroma-data'); print(client.list_collections())"

# Check collection size
npm run verify-embeddings -- --collection midnight-docs-v1

# Re-embed documentation if needed
npm run embed-docs -- --source ../../data/midnight-docs --collection midnight-docs-v1 --force
```

---

### Contract Scaffold Fails

```bash
# Check template exists
ls -la midnight-plugin/skills/midnight-scaffold-contract/templates/

# Verify Handlebars syntax
npm run validate-templates

# Test template rendering manually
npm run test-template -- --template hello-world --output /tmp/test-contract
```

---

### RPC Connection Fails

```bash
# Test direct connection to Midnight testnet
curl -H "Content-Type: application/json" -d '{"id":1, "jsonrpc":"2.0", "method": "system_health"}' wss://rpc.testnet-02.midnight.network

# Check Polkadot.js installation
npm list @polkadot/api

# Verify network endpoints in code
grep -r "testnet-02" midnight-plugin/servers/src/midnight-network/
```

---

## Next Steps After Quickstart

### For Hackathon MVP (Priority)
1. ✓ Complete P1 branding (this quickstart)
2. ✓ Complete P2 content replacement (this quickstart)
3. Polish demo script
4. Record demo video
5. Write README.md with hackathon submission details

### For Post-Hackathon (Optional)
1. P3: Create midnight-developer agent with ZK expertise
2. P3: Create midnight-deployment-engineer agent
3. P4: Implement Midnight RPC tools (48+ tools)
4. P4: Implement GraphQL indexer integration
5. P4: Add viewing key management for shielded data

---

## Resources

### Midnight Network Documentation
- **Main Docs**: https://docs.midnight.network/
- **Tutorial**: https://docs.midnight.network/develop/tutorial
- **Compact Reference**: https://docs.midnight.network/develop/reference/compact/
- **GitHub**: https://github.com/midnight-ntwrk

### Development Tools
- **Scaffold Midnight**: Official CLI tool for project setup
- **Polkadot.js**: Substrate RPC client library
- **Midnight Wallet**: For testnet interaction

### Community
- **Forum**: https://forum.midnight.network/
- **Blog**: https://midnight.network/blog/
- **Hackathon Resources**: Check Midnight blog for latest hackathon guides

---

## Time Estimates (Hackathon Schedule)

| Phase | Task | Time | Cumulative |
|-------|------|------|------------|
| **P1** | Global branding update | 2-3 hours | 2-3 hours |
| **P2** | Gather documentation | 1 hour | 3-4 hours |
| **P2** | Embed documentation | 1 hour | 4-5 hours |
| **P2** | Create contract templates | 2-3 hours | 6-8 hours |
| **P2** | Update RAG skill triggers | 30 min | 6.5-8.5 hours |
| **Testing** | End-to-end testing | 1-2 hours | 7.5-10.5 hours |
| **Demo** | Demo prep and polish | 1 hour | 8.5-11.5 hours |
| **TOTAL** | **P1 + P2 + Demo** | **8.5-11.5 hours** | **MVP Complete** |

**Hackathon Strategy**: Focus on P1 + P2 for solid MVP demo. P3/P4 are enhancements if time allows.

---

## Success Metrics

After completing this quickstart, you should be able to:

- ✅ Install and run the midnight-plugin
- ✅ Query Midnight documentation via RAG
- ✅ Scaffold Midnight Compact contracts
- ✅ Scaffold Midnight DApps with React
- ✅ See Midnight branding throughout the plugin
- ✅ Have 500+ Midnight documentation chunks embedded
- ✅ Generate valid Compact contracts that compile
- ✅ Demo the plugin in 5 minutes

**Ready for hackathon submission!** 🚀

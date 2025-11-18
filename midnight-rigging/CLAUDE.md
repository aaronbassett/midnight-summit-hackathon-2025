# Midnight Rigging - Agent Guidance

This file provides runtime development guidance for AI agents working on the Midnight Rigging project.

## Brand Name: "midnight network"

**CRITICAL BRANDING RULE**: "midnight network" is a brand name and MUST always be written in lowercase, without exception.

### Correct Usage

-  "midnight network"
-  "midnight"
-  "the midnight network"
-  "midnight network's smart contract language"
-  "midnight network uses Compact"

### Incorrect Usage (NEVER use these)

- L "Midnight" (capitalized when referring to the network)
- L "Midnight Network" (title case)
- L "midnightNetwork" (camelCase)
- L "MIDNIGHT network" (all caps first word)
- L "MIDNIGHT" (all caps)
- L "midnight Network" (mixed case)

### Special Cases

**At the start of a sentence**: STILL lowercase

-  "midnight network enables developers to..."
- L "Midnight network enables developers to..."

**In titles and headings**: STILL lowercase

-  "# Getting Started with midnight network"
- L "# Getting Started with Midnight Network"

**In file names or technical identifiers**: lowercase or kebab-case

-  `midnight-plugin`
-  `midnight-rag`
-  `midnight-network`
- L `Midnight-plugin`
- L `midnightPlugin`

### Rationale

This branding choice reflects the project's philosophy:

- Lowercase, builder-focused, no bullshit
- Like the tool itself—unpretentious, functional, privacy-first
- Consistent with the naming conventions established in the constitution

### Grammar Note

If starting a sentence with "midnight network" feels grammatically awkward, restructure the sentence:

- Instead of: "~~Midnight network is a blockchain platform~~"
- Write: "The midnight network is a blockchain platform"
- Or: "Developers use midnight network to build smart contracts"

## Plugin Directory Boundary (CRITICAL)

**SACRED RULE**: `midnight-plugin/` contains ONLY files Claude Code needs at runtime. Nothing else. Every byte counts.

### What Goes in midnight-plugin/:

- `.claude-plugin/plugin.json` - Plugin manifest (required by Claude Code)
- `.mcp.json` - MCP configuration (Claude Code reads this)
- `skills/` - Skill definitions (Claude Code loads these)
- `servers/` - MCP servers package (Claude Code executes these)
  - `package.json`, `pnpm-lock.yaml` - Package management
  - `dist/` - Compiled JavaScript (runtime)
  - `node_modules/` - Runtime dependencies
  - `src/` - TypeScript source (for contributors)
- `data/` - Bundled databases, embeddings (runtime data, if needed)
- `commands/`, `agents/`, `hooks/`, `scripts/` - Optional (only if plugin uses them for runtime functionality)

### What NEVER Goes in midnight-plugin/:

- ❌ README.md (Claude doesn't read it → goes in repository root)
- ❌ DEVELOPMENT.md (maintainer docs → repository root)
- ❌ CONTRIBUTING.md (contributor docs → repository root)
- ❌ .gitignore (git metadata → use root .gitignore instead)
- ❌ tests/ (development only → repository root)
- ❌ Any documentation files
- ❌ Any build or development tooling

**Note on scripts/**: Only include if scripts are **runtime hooks** executed by Claude Code. Build/maintenance scripts should be separate from the plugin deliverable.

### Repository Structure:

```
midnight-rigging/               # Repository root
├── README.md                   # Plugin user documentation
├── DEVELOPMENT.md              # Maintainer/builder documentation
├── CONTRIBUTING.md             # Contributor guidelines
├── .gitignore                  # Git ignore patterns (covers plugin too)
├── specs/                      # Feature specifications
├── rag-mcp/                    # Remote RAG server (deployed to fly.io)
│   ├── src/                    # TypeScript source code
│   ├── Dockerfile              # Container configuration
│   ├── fly.toml                # fly.io deployment config
│   └── package.json            # Server dependencies
└── midnight-plugin/            # PLUGIN ONLY (deliverable)
    ├── .claude-plugin/         # ✅ Runtime: Plugin metadata
    │   └── plugin.json         #     Plugin manifest
    ├── .mcp.json               # ✅ Runtime: MCP server config
    ├── skills/                 # ✅ Runtime: Skill definitions
    └── servers/                # ✅ Runtime: MCP servers package
        ├── package.json        #     Package dependencies
        ├── pnpm-lock.yaml      #     Lockfile (committed)
        ├── tsconfig.json       #     TypeScript config
        ├── .gitignore          #     Excludes build artifacts
        ├── src/                #     TypeScript source (for contributors)
        │   ├── rag/
        │   ├── reranking/
        │   └── utils/
        ├── tests/              #     Tests
        ├── dist/               #     ✅ Runtime: Compiled JavaScript
        └── node_modules/       #     ✅ Runtime: Dependencies
```

### Boundary Test:

Before adding ANY file to midnight-plugin/, ask:

- **"Does Claude Code need this file to execute the plugin at runtime?"**
- If NO → It goes in repository root
- If YES → Verify it's truly runtime-critical, then add to midnight-plugin/

### Examples of Past Violations (NEVER REPEAT):

- ❌ Planning to put DEVELOPMENT.md in midnight-plugin/ (human docs, not runtime) → Created at repository root
- ❌ Planning to put CONTRIBUTING.md in midnight-plugin/ (contributor docs, not runtime) → Created at repository root
- ❌ Kept README.md in midnight-plugin/ (Claude doesn't read it) → DELETED, moved content to root README.md
- ❌ Kept .gitignore in midnight-plugin/ (git metadata, redundant) → DELETED, using root .gitignore (servers/ has own .gitignore)
- ❌ Used .claude/ directory instead of .claude-plugin/ (wrong convention) → FIXED to .claude-plugin/
- ❌ Missing plugin.json manifest → FIXED by creating .claude-plugin/plugin.json
- ❌ Bundled ChromaDB SQLite files in data/ (v1.0.0) → REMOVED in v2.0.0, migrated to remote server
- ❌ Had package.json at midnight-plugin root (v2.0.0) → REMOVED in v2.1.0, moved to servers/ package

### Rationale:

End-users install the plugin directory only. Contributors clone the full repository. Keep the plugin lean—every byte counts for distribution size and installation speed.

## Additional Guidance

For all other development standards, naming conventions, and principles, refer to:

- **Constitution**: `.specify/memory/constitution.md` - Non-negotiable rules and principles
- **Templates**: `.specify/templates/*.md` - Spec, plan, and task templates
- **Commands**: `.claude/commands/speckit.*.md` - Workflow execution guidance

## Active Technologies
- TypeScript 5.9.3, Node.js 24.11.0 LTS + @modelcontextprotocol/sdk ^1.21.1, @xenova/transformers ^2.17.2 (reranking), handlebars ^4.7.8 (templating), zod ^3.23.8 (validation), @logtape/logtape ^1.1.2 (logging), lru-cache ^11.2.2 (caching), gray-matter ^4.0.3 (frontmatter parsing), @polkadot/api (Substrate RPC client) (001-fork-pod-rigging)
- ChromaDB vector database for RAG knowledge base (to be populated with midnight network documentation), filesystem-based template storage (001-fork-pod-rigging)

- TypeScript 5.9.3, Node.js 24.11.0 LTS + gray-matter@^4.0.3 (frontmatter parsing), @types/gray-matter (TypeScript types), @logtape/logtape@^1.1.2 (logging), zod@^3.23.8 (validation) (007-rigging-mcp)
- N/A (stateless server, reads from filesystem) (007-rigging-mcp)

- TypeScript 5.9.3, Node.js 24.x (LTS) (006-rag-collection-tools)

- TypeScript 5.9.3, Node.js 24.11.0 LTS + @modelcontextprotocol/sdk@^1.21.1, zod@^3.23.8, @logtape/logtape@^1.1.2, lru-cache@^11.0.0, @polkadot/api (midnight network integration) (003-midnight-network-mcp)
- In-memory LRU cache for blockchain data (no persistent storage) (003-midnight-network-mcp)

- TypeScript 5.x, Node.js 24.11.0 (LTS) + @modelcontextprotocol/sdk, @xenova/transformers (Transformers.js), logtape, zod (002-reranking-mcp-server)
- Model files (bge-reranker-base, ~280MB) loaded at runtime from Hugging Face or cached locally (002-reranking-mcp-server)

- Node.js 24.11.0 (LTS), TypeScript 5.x (001-rag-knowledge-skill)

## Recent Changes

- 001-fork-pod-rigging: Migrated from pod network to midnight network branding
- Updated all references from midnight-plugin to midnight-plugin
- Updated all references from midnight-network to midnight-network
- Added @polkadot/api for Substrate RPC connectivity to midnight network

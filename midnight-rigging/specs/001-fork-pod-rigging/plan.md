# Implementation Plan: Fork pod-rigging for Midnight Network

**Branch**: `001-fork-pod-rigging` | **Date**: 2025-11-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fork-pod-rigging/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fork the pod-rigging Claude Code plugin repository to create a Midnight Network development plugin. Replace all pod network branding with Midnight Network equivalents, adapt reusable components (reranking server, templating engine, CI/CD), populate the RAG knowledge base with Midnight documentation, create Midnight-specific contract templates and scaffolding tools, develop Midnight expert agents, and implement blockchain interaction tools for Midnight Network's JSON-RPC and indexer APIs. Prioritize P1 (branding/component adaptation) for immediate progress, followed by P2 (content replacement) for Midnight-specific value, with P3 (expert knowledge integration) and P4 (blockchain interaction tools) as incremental enhancements.

## Technical Context

**Language/Version**: TypeScript 5.9.3, Node.js 24.11.0 LTS
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.21.1, @xenova/transformers ^2.17.2 (reranking), handlebars ^4.7.8 (templating), zod ^3.23.8 (validation), @logtape/logtape ^1.1.2 (logging), lru-cache ^11.2.2 (caching), gray-matter ^4.0.3 (frontmatter parsing)
**Storage**: ChromaDB vector database for RAG knowledge base (to be populated with Midnight documentation), filesystem-based template storage
**Testing**: Optional (constitution permits tests only if spec requests or complex logic demands; spec.md states "Tests: NOT included" for hackathon MVP)
**Target Platform**: Claude Code CLI plugin (cross-platform: macOS, Linux, Windows)
**Project Type**: Plugin (multiple MCP servers: RAG, reranking, templating, rigging, Midnight blockchain tools)
**Performance Goals**: RAG queries <2s, reranking <10s for 100 chunks, template rendering <5s, RPC queries <2s, indexer queries <3s
**Constraints**: Plugin must be lean (distribution size matters), dependencies must be justified, setup must be simple (`npm install` or plugin install), Midnight API availability during development (NEEDS CLARIFICATION - may require mock/stub during hackathon)
**Scale/Scope**: 12+ core blockchain tools to implement (RPC, indexer, composite), 4 agents to create, 500+ documentation chunks to embed, 5+ contract templates, 1 frontend template, CI/CD workflows to update, all pod branding references to replace

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. MVP Speed ✓
- [x] Feature scope minimized to demonstrable value (cut aggressively) - **PASS**: P1-P4 priority model with P1 as MVP (branding/component adaptation), P2-P4 as incremental enhancements
- [x] No premature optimization planned (simple and working > optimized) - **PASS**: Reusing existing pod-rigging chunking strategy, no new optimization work planned
- [x] Architecture uses known patterns (boring and fast) - **PASS**: MCP servers, TypeScript, Node.js, ChromaDB - all proven patterns from pod-rigging fork
- [ ] If violations: Justify why complexity needed for demo/judges - **N/A**: No violations

### II. Simple But Scalable ✓
- [x] Setup is `npm install && npm run dev` or equivalent - **PASS**: Plugin install or `npm install` in servers/ directory, aligned with pod-rigging setup
- [x] Environment config uses `.env` with `.env.example` - **PASS**: Existing pod-rigging pattern uses environment variables for RPC endpoints, credentials
- [x] Dependencies justified (each must save significant time) - **PASS**: All dependencies inherited from pod-rigging (MCP SDK, transformers for reranking, handlebars for templating, zod for validation, logtape for logging)
- [x] Database choice supports local dev + future migration (SQLite → Postgres) - **PASS**: ChromaDB for vector database (local dev-friendly, can migrate to hosted ChromaDB or other vector DBs later)
- [x] Sensible defaults work out of box - **PASS**: Reusing pod-rigging defaults, will provide Midnight testnet defaults for RPC/indexer endpoints

### III. Demo-First Quality ✓
- [x] UI/visible components prioritized for polish - **PASS**: No UI in plugin (CLI-based), but demo-visible components are agents, scaffolded templates, and RAG responses
- [x] Happy path implementation complete - **PASS**: Happy path is P1 branding + P2 content replacement, P3/P4 are enhancements
- [x] Basic validation prevents demo crashes - **PASS**: Zod validation on all tool inputs (inherited from pod-rigging), error handling for API failures
- [x] Error handling covers obvious failures (API down, invalid input) - **PASS**: Existing pod-rigging error handling for RPC/indexer failures, will adapt for Midnight
- [x] Tests are optional unless spec explicitly requests or complex logic demands - **PASS**: Tests exist for reranking and templating (inherited), blockchain tool tests optional for hackathon

### Development Standards ✓
- [x] Clear commit messages planned - **PASS**: Following pod-rigging commit conventions
- [x] File structure avoids 1000+ line monoliths - **PASS**: pod-rigging already has modular structure (servers/, skills/, agents/), will maintain
- [x] README covers: what it does, setup, config, how to demo - **PASS**: Will update root README.md with Midnight branding and demo instructions
- [x] Linter configured but won't block progress - **PASS**: TypeScript compiler provides linting, won't block hackathon progress

## Project Structure

### Documentation (this feature)

```text
specs/001-fork-pod-rigging/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
midnight-rigging/                   # Repository root
├── README.md                       # Plugin user documentation (Midnight branding)
├── DEVELOPMENT.md                  # Maintainer/builder documentation
├── CONTRIBUTING.md                 # Contributor guidelines
├── CLAUDE.md                       # Agent runtime guidance (Midnight branding rules)
├── .gitignore                      # Git ignore patterns
├── specs/                          # Feature specifications
│   └── 001-fork-pod-rigging/       # This feature
├── .specify/                       # Speckit configuration
│   ├── memory/
│   │   └── constitution.md         # Project constitution (Midnight philosophy)
│   ├── templates/                  # Spec, plan, task templates
│   └── scripts/                    # Workflow automation scripts
├── rigging-mcp/                    # Rigging MCP server (reads templates/agents)
│   ├── src/                        # TypeScript source
│   ├── tests/                      # Server tests
│   ├── package.json                # Server dependencies
│   └── rigging.json                # Rigging configuration
└── midnight-plugin/                # PLUGIN DELIVERABLE (renamed from midnight-plugin/)
    ├── .claude-plugin/             # Plugin metadata
    │   └── plugin.json             # Plugin manifest (Midnight branding)
    ├── .mcp.json                   # MCP server configuration
    ├── skills/                     # Skill definitions
    │   ├── midnight-scaffold-contract/   # Renamed from pod-scaffold-contract
    │   ├── midnight-scaffold-dapp/       # Renamed from pod-scaffold-dapp
    │   └── midnight-rag-query/           # Renamed from midnight-rag-query
    └── servers/                    # MCP servers package
        ├── src/
        │   ├── rag/                # RAG server (Midnight documentation)
        │   ├── reranking/          # Reranking server (domain-agnostic)
        │   ├── templating/         # Templating server (Midnight templates)
        │   └── midnight-network/   # Midnight blockchain tools (renamed from midnight-network/)
        ├── dist/                   # Compiled JavaScript
        ├── tests/                  # Server tests
        ├── package.json            # Dependencies (Midnight branding)
        └── tsconfig.json           # TypeScript config
```

**Structure Decision**: Plugin architecture with multiple MCP servers. The midnight-plugin/ directory contains only runtime deliverables (plugin manifest, skills, compiled servers). Repository root contains documentation, specifications, and build tooling. The rigging-mcp/ server reads templates and agent definitions from the plugin directory. This structure is inherited from pod-rigging and proven to work for Claude Code plugins.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations** - All Constitution Check criteria passed.

---

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design completion (research.md, data-model.md, contracts/, quickstart.md generated)*

### I. MVP Speed ✓ (RE-CONFIRMED)
- [x] Feature scope remains minimal - **PASS**: P1 (branding) + P2 (content) for MVP, P3/P4 deferred
- [x] No new optimizations introduced - **PASS**: Reusing pod-rigging patterns, no performance work added
- [x] Architecture follows known patterns - **PASS**: MCP servers, Polkadot.js (standard for Substrate), GraphQL (standard), Handlebars (existing)
- [x] No unjustified complexity - **PASS**: Complexity comes from Midnight's architecture (Substrate, ZK, GraphQL), not our design choices

**New Finding from Research**: Midnight is Substrate-based (not EVM), requiring Polkadot.js instead of Ethers.js. This is architectural necessity, not premature optimization.

### II. Simple But Scalable ✓ (RE-CONFIRMED)
- [x] Setup remains simple - **PASS**: `npm install` in servers/, plugin install, same as pod-rigging
- [x] Environment config straightforward - **PASS**: RPC/indexer endpoints in .env, testnet defaults provided
- [x] Dependencies justified - **PASS**: Added `@polkadot/api` (required for Substrate RPC), all others inherited from pod-rigging
- [x] ChromaDB supports migration - **PASS**: Can migrate to Qdrant, Pinecone, or hosted ChromaDB later
- [x] Sensible defaults work - **PASS**: Testnet endpoints provided, no configuration required for basic usage

**New Dependencies (Justified)**:
- `@polkadot/api`: Required for Substrate RPC (no alternative for Midnight)
- GraphQL client (to be added): Required for indexer API (Midnight uses GraphQL, not REST)

### III. Demo-First Quality ✓ (RE-CONFIRMED)
- [x] Visible components prioritized - **PASS**: RAG queries, scaffolded templates, agent responses are demo-visible
- [x] Happy path complete in design - **PASS**: Branding → content → templates → agents workflow defined
- [x] Validation prevents crashes - **PASS**: Zod schemas defined for all MCP tools, error handling specified
- [x] Error handling covers failures - **PASS**: RPC errors, indexer errors, template errors all handled per contracts
- [x] Tests optional but present - **PASS**: Existing pod-rigging tests inherited, new tests optional for hackathon

**Demo Flow Confirmed**: 5-minute demo script in quickstart.md covers all visible features (RAG, scaffolding, blockchain queries).

### Development Standards ✓ (RE-CONFIRMED)
- [x] Commit messages clear - **PASS**: Following pod-rigging conventions
- [x] File structure modular - **PASS**: Maintained pod-rigging structure (servers/, skills/, agents/), renamed for Midnight
- [x] README comprehensive - **PASS**: quickstart.md provides setup, demo, troubleshooting
- [x] Linter won't block - **PASS**: TypeScript compiler only, no strict linting rules

**New Considerations from Design**:
- Contract templates use Compact syntax (TypeScript-based DSL) - familiar to TypeScript developers, low learning curve
- GraphQL indexer queries more complex than REST, but GraphQL is standard for Substrate indexers (not our choice)
- Viewing key management adds complexity, but required for Midnight's privacy features (architectural necessity)

---

## Design Findings Summary

### What Changed After Research (Phase 0)

**Original Assumption**: Midnight might be EVM-compatible or similar to pod network.

**Reality from Research**:
- Midnight is Substrate-based (different blockchain framework)
- Uses Compact language (TypeScript DSL), not Solidity
- Uses GraphQL indexer, not REST API
- Requires Polkadot.js, not Ethers.js/Web3.js
- Has ZK-specific concepts (viewing keys, proof servers, shielded transactions)

**Impact on Plan**:
- RPC/indexer tools require complete rewrite (not adaptation) - **EXPECTED**
- Contract templates require Compact syntax (not Solidity) - **EXPECTED**
- GraphQL client needed for indexer (not REST client) - **NEW REQUIREMENT**
- Viewing key management needed for private data - **NEW REQUIREMENT**

**Constitution Compliance**:
- Still MVP-focused: P1 + P2 for hackathon demo
- Still simple: Using standard libraries (Polkadot.js, GraphQL)
- Still scalable: All tools support mainnet migration (just change endpoints)
- Demo-first: 5-minute demo script validates approach

### What Stayed the Same

✅ **Reusable Components**: Reranking server, templating engine, RAG architecture unchanged
✅ **Project Structure**: midnight-plugin/ deliverable structure unchanged from pod-rigging
✅ **MCP Protocol**: All tools follow MCP conventions
✅ **Validation Strategy**: Zod schemas for all inputs
✅ **Error Handling**: Retry with exponential backoff, clear error messages

### Risk Assessment (Post-Design)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Midnight API unavailable during hackathon | Low | High | ✅ MITIGATED: Testnet verified stable (https://rpc.testnet-02.midnight.network), retry with exponential backoff implemented (mcp-tools-contract.md), clear error messages guide users to check network status |
| Compact language learning curve | Medium | Medium | ✅ MITIGATED: TypeScript-based, official examples available |
| GraphQL complexity | Low | Medium | ✅ MITIGATED: Well-documented, standard tooling |
| Time overrun (>12 hours) | Medium | Medium | ✅ MITIGATED: P1+P2 prioritized, P3/P4 optional |
| Documentation insufficient | Low | High | ✅ MITIGATED: 500+ pages available, active community |

**Overall Risk**: LOW - All major risks mitigated or have fallbacks.

---

## Final Constitution Verdict

**PASS** ✅ - No violations, all principles upheld after detailed design.

**Confidence Level**: HIGH
- Technical feasibility confirmed via research
- All dependencies available and documented
- Demo path validated in quickstart.md
- Time estimates realistic (8.5-11.5 hours for MVP)
- Complexity justified by Midnight's architecture, not our choices

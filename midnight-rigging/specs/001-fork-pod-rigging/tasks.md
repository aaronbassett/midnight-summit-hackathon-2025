---
description: "Implementation tasks for forking pod-rigging to Midnight Network"
---

# Tasks: Fork pod-rigging for Midnight Network

**Input**: Design documents from `/specs/001-fork-pod-rigging/`
**Prerequisites**: plan.md, spec.md, research.md, contracts/ (mcp-tools-contract.md, skills-contract.md), quickstart.md

**Tests**: NOT included - tests are optional for hackathon MVP

**Hackathon Strategy**: Focus on P1 (branding) + P2 (content) for MVP demo. P3 (agents) and P4 (blockchain tools) are enhancements if time allows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and verification of forked repository structure

- [ ] T001 Verify repository structure matches plan.md (midnight-plugin/, rigging-mcp/, specs/, .specify/)
- [ ] T002 Verify existing pod-rigging dependencies in midnight-plugin/servers/package.json
- [ ] T003 Create feature branch 001-fork-pod-rigging (if not already created)

**Checkpoint**: Repository structure verified, ready for branding updates

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core branding infrastructure that MUST be complete before user story work begins

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Update CLAUDE.md "Brand Name" section with Midnight Network branding rules (replace "pod network" section with "midnight network" lowercase guidelines, special cases, rationale)
- [ ] T005 Update CLAUDE.md "Plugin Directory Boundary" and other runtime guidance sections with Midnight references (update examples, file paths, project philosophy references)
- [ ] T006 Update .specify/memory/constitution.md with Midnight Network project philosophy
- [ ] T007 Create branding reference document documenting all pod→midnight naming mappings for consistency

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Global Branding and Component Adaptation (Priority: P1) 🎯 MVP

**Goal**: Replace all pod-specific branding and verify domain-agnostic components (reranking, templating, CI/CD) work with Midnight branding.

**Independent Test**: Search for "midnight-plugin", "midnight-network", "pod.network" across all files - should return zero occurrences. Reranking server and templating engine should start successfully with Midnight branding.

### Implementation for User Story 1

#### Directory and Package Renaming

- [ ] T008 [P] [US1] Rename midnight-plugin/ directory to midnight-plugin/
- [ ] T009 [P] [US1] Rename midnight-plugin/servers/src/midnight-network/ directory to midnight-plugin/servers/src/midnight-network/
- [ ] T010 [US1] Update midnight-plugin/servers/package.json with Midnight branding (name: "@midnight-plugin/servers", description, keywords, author)
- [ ] T011 [US1] Update midnight-plugin/.claude-plugin/plugin.json with Midnight branding (name, description, author)

#### Configuration File Updates

- [ ] T012 [P] [US1] Update midnight-plugin/.mcp.json with Midnight server names and descriptions
- [ ] T013 [P] [US1] Update root package.json (if exists) with Midnight branding
- [ ] T014 [P] [US1] Update rigging-mcp/package.json with Midnight branding

#### Source Code Branding Updates

- [ ] T015 [P] [US1] Global find/replace "midnight-plugin" → "midnight-plugin" in all TypeScript source files
- [ ] T016 [P] [US1] Global find/replace "midnight-network" → "midnight-network" in all TypeScript source files
- [ ] T017 [P] [US1] Global find/replace "midnight-rag" → "midnight-rag" in all TypeScript source files
- [ ] T018 [P] [US1] Global find/replace "midnight-reranking" → "midnight-reranking" in all TypeScript source files
- [ ] T019 [P] [US1] Global find/replace "midnight-developer" → "midnight-developer" in all TypeScript source files
- [ ] T020 [P] [US1] Global find/replace "midnight-deployment-engineer" → "midnight-deployment-engineer" in all TypeScript source files
- [ ] T021 [US1] Update midnight-plugin/servers/src/midnight-network/ server implementation with Midnight branding in logs and error messages

#### Skill Renaming

- [ ] T022 [P] [US1] Rename midnight-plugin/skills/pod-scaffold-contract/ to midnight-plugin/skills/midnight-scaffold-contract/
- [ ] T023 [P] [US1] Rename midnight-plugin/skills/pod-scaffold-dapp/ to midnight-plugin/skills/midnight-scaffold-dapp/
- [ ] T024 [P] [US1] Rename midnight-plugin/skills/midnight-rag-query/ to midnight-plugin/skills/midnight-rag-query/
- [ ] T025 [US1] Update skill.json files in renamed skill directories with Midnight branding

#### CI/CD Updates

- [ ] T026 [P] [US1] Update .github/workflows/ files with Midnight-specific job names and descriptions
- [ ] T027 [P] [US1] Update any GitHub Actions workflow references from pod to midnight
- [ ] T028 [US1] Verify all CI/CD workflows execute successfully with Midnight branding

#### Build and Verification

- [ ] T029 [US1] Rebuild midnight-plugin/servers/ with `npm run build`
- [ ] T030 [US1] Verify reranking server starts within 10 seconds with Midnight branding in logs
- [ ] T031 [US1] Verify templating engine loads and renders sample template within 5 seconds
- [ ] T032 [US1] Run global search to verify zero occurrences of "midnight-plugin", "midnight-network", "pod.network" in working files (SC-001)

**Checkpoint**: At this point, User Story 1 should be fully functional - all branding updated, domain-agnostic components verified

---

## Phase 4: User Story 2 - Content Replacement for Knowledge Base and Templates (Priority: P2)

**Goal**: Populate RAG knowledge base with Midnight documentation and create Midnight contract templates using Compact language.

**Independent Test**: Query RAG for "How do I deploy a contract on Midnight Network?" and verify relevant results. Generate contract using scaffold command and verify it uses Midnight SDK imports and compiles.

### Implementation for User Story 2

#### Documentation Gathering and Processing

- [ ] T033 [P] [US2] Create data/midnight-docs/ directory structure (tutorials/, api-reference/, whitepaper/, compact-guide/, developer-guides/)
- [ ] T034 [US2] Gather Midnight documentation from https://docs.midnight.network/ (whitepapers, developer docs, API guides, tutorials)
- [ ] T035 [US2] Organize documentation by type into data/midnight-docs/ subdirectories
- [ ] T036 [US2] Create or adapt embedding script midnight-plugin/servers/scripts/embed-docs.ts using pod-rigging's existing chunking strategy
- [ ] T037 [US2] Run embedding pipeline to create ChromaDB collection "midnight-docs-v1" with 500+ chunks (SC-005)
- [ ] T038 [US2] Verify embeddings with verification script - confirm ≥500 chunks embedded

#### RAG Configuration

- [ ] T039 [P] [US2] Update RAG server configuration in midnight-plugin/servers/src/rag/ to connect to "midnight-docs-v1" collection
- [ ] T040 [P] [US2] Update blockchain-synonyms.txt with Midnight-specific term mappings (Midnight, MN, ZK, shielded, Compact, DUST, testnet-02, viewing key) - at least 10 terms (SC-009)
- [ ] T041 [US2] Update midnight-plugin/skills/midnight-rag-query/skill.json with Midnight-specific triggers (Midnight, Compact, zero-knowledge, ZK proof, shielded transaction, private state, Midnight SDK, testnet-02)
- [ ] T042 [US2] Test RAG queries for "Midnight deployment", "ZK proofs", "private state" and verify >0.7 relevance scores (SC-006)

#### Contract Template Creation

- [ ] T043 [P] [US2] Create midnight-plugin/skills/midnight-scaffold-contract/templates/hello-world/ template with Compact contract, package.json (@midnight-ntwrk dependencies), tsconfig.json, README.md
- [ ] T044 [P] [US2] Create midnight-plugin/skills/midnight-scaffold-contract/templates/counter/ template (state management example)
- [ ] T045 [P] [US2] Create midnight-plugin/skills/midnight-scaffold-contract/templates/token/ template (fungible token with Compact)
- [ ] T046 [P] [US2] Create midnight-plugin/skills/midnight-scaffold-contract/templates/nft/ template (non-fungible token with Compact)
- [ ] T047 [P] [US2] Create midnight-plugin/skills/midnight-scaffold-contract/templates/voting/ template (governance example with Compact)
- [ ] T048 [US2] Add Handlebars placeholders to all contract templates ({{contractName}}, {{author}}, {{description}}, etc.)
- [ ] T049 [US2] Test contract scaffold command - verify generated code compiles without errors (SC-007)

#### Frontend Template Creation

- [ ] T050 [P] [US2] Create midnight-plugin/skills/midnight-scaffold-dapp/templates/react-vite/ template with Midnight chain IDs and RPC endpoints (wss://rpc.testnet-02.midnight.network)
- [ ] T051 [P] [US2] Add wallet integration to react-vite template using @midnight-ntwrk/wallet SDK
- [ ] T052 [P] [US2] Add Handlebars placeholders to frontend template
- [ ] T053 [US2] Test frontend scaffold command - verify `npm install && npm run dev` runs successfully (SC-008)

#### Skill Implementation Updates

- [ ] T054 [US2] Implement midnight-scaffold-contract skill workflow per skills-contract.md (validate template, prompt for placeholders, render, install deps, verify compilation)
- [ ] T055 [US2] Implement midnight-scaffold-dapp skill workflow per skills-contract.md (validate framework, scaffold contract if specified, render frontend, configure chain, install deps, start dev server)
- [ ] T056 [US2] Implement midnight-rag-query skill workflow per skills-contract.md (expand query with synonyms, call rag_query, rerank results, generate answer with citations)

**Checkpoint**: At this point, User Story 2 should be fully functional - RAG populated with Midnight docs, templates generate valid Midnight code

---

## Phase 5: User Story 3 - Midnight Expert Knowledge Integration (Priority: P3)

**Goal**: Create AI agents with deep Midnight Network expertise for architectural guidance, deployment assistance, validation checks, and test generation.

**Independent Test**: Invoke each agent (midnight-developer, midnight-deployment-engineer, midnight-source-validator, midnight-test-engineer) with Midnight-specific scenarios and verify accurate ZK concepts, private state management, and Midnight patterns.

**⚠️ NOTE**: This is a P3 enhancement - implement only if time permits after P1+P2 MVP is complete.

### Implementation for User Story 3

#### Agent Deletion and Cleanup

- [ ] T057 [P] [US3] Delete midnight-plugin/agents/midnight-developer/ directory
- [ ] T058 [P] [US3] Delete midnight-plugin/agents/midnight-deployment-engineer/ directory
- [ ] T059 [US3] Remove references to deleted pod agents from .mcp.json or agent registry

#### Midnight Developer Agent

- [ ] T060 [P] [US3] Create midnight-plugin/agents/midnight-developer/ directory structure
- [ ] T061 [P] [US3] Create midnight-developer agent prompt with ZK proof architecture knowledge, private state management, proof generation workflows
- [ ] T062 [P] [US3] Create reference documents for midnight-developer: compact-language-reference.md, zk-proofs-primer.md, private-state-patterns.md
- [ ] T063 [US3] Test midnight-developer agent with "Explain Midnight's zero-knowledge proof architecture" query (SC-010)

#### Midnight Deployment Engineer Agent

- [ ] T064 [P] [US3] Create midnight-plugin/agents/midnight-deployment-engineer/ directory structure
- [ ] T065 [P] [US3] Create midnight-deployment-engineer agent prompt with Midnight deployment script generation capabilities
- [ ] T066 [P] [US3] Create reference documents for midnight-deployment-engineer: deployment-checklist.md, testnet-configuration.md, mainnet-migration.md
- [ ] T067 [US3] Test midnight-deployment-engineer agent generates deployment scripts that successfully deploy to testnet (SC-011)

#### Midnight Source Validator Agent

- [ ] T068 [P] [US3] Create midnight-plugin/agents/midnight-source-validator/ directory structure
- [ ] T069 [P] [US3] Create midnight-source-validator agent prompt with Midnight SDK validation and EVM incompatibility detection
- [ ] T070 [P] [US3] Create reference documents for midnight-source-validator: compact-best-practices.md, common-mistakes.md, evm-migration-differences.md
- [ ] T071 [US3] Test midnight-source-validator agent identifies 100% of incompatible EVM patterns in test contract set (SC-012)

#### Midnight Test Engineer Agent

- [ ] T072 [P] [US3] Create midnight-plugin/agents/midnight-test-engineer/ directory structure
- [ ] T073 [P] [US3] Create midnight-test-engineer agent prompt with Midnight test framework knowledge and ZK-specific edge case testing
- [ ] T074 [P] [US3] Create reference documents for midnight-test-engineer: testing-frameworks.md, zk-testing-patterns.md, integration-test-strategies.md
- [ ] T075 [US3] Test midnight-test-engineer agent generates tests that execute successfully with Midnight test frameworks (SC-013)

#### Agent Integration

- [ ] T076 [US3] Register all new Midnight agents in .mcp.json or agent registry
- [ ] T077 [US3] Verify all agents are accessible and respond correctly when invoked

**Checkpoint**: All Midnight expert agents should be functional and provide accurate guidance

---

## Phase 6: User Story 4 - Midnight Blockchain Interaction Tools (Priority: P4)

**Goal**: Implement MCP tools that interact with Midnight's JSON-RPC endpoint, GraphQL indexer API, and authentication systems for querying blockchain state, submitting transactions, searching events, and analyzing network activity.

**Independent Test**: Invoke each tool category (RPC tools, indexer tools, composite tools) against Midnight testnet and verify responses match Midnight API specifications.

**⚠️ NOTE**: This is a P4 enhancement - implement only if time permits after P1+P2 MVP and P3 agents are complete.

### Implementation for User Story 4

#### Core Infrastructure

- [ ] T078 [P] [US4] Install @polkadot/api dependency in midnight-plugin/servers/package.json
- [ ] T079 [P] [US4] Install GraphQL client library (e.g., graphql-request or Apollo Client) in midnight-plugin/servers/package.json
- [ ] T080 [US4] Create midnight-plugin/servers/src/midnight-network/clients/rpc-client.ts with Polkadot.js WsProvider connection to wss://rpc.testnet-02.midnight.network
- [ ] T081 [US4] Create midnight-plugin/servers/src/midnight-network/clients/indexer-client.ts with GraphQL client connection to https://indexer.testnet-02.midnight.network/api/v1/graphql
- [ ] T082 [US4] Implement viewing key authentication flow in indexer-client.ts (connect mutation, session token management)

#### RPC Tools Implementation (Substrate-based)

- [ ] T083 [P] [US4] Implement midnight_rpc_get_block tool in midnight-plugin/servers/src/midnight-network/tools/rpc/get-block.ts per mcp-tools-contract.md
- [ ] T084 [P] [US4] Implement midnight_rpc_get_balance tool in midnight-plugin/servers/src/midnight-network/tools/rpc/get-balance.ts per mcp-tools-contract.md
- [ ] T085 [P] [US4] Implement midnight_rpc_get_transaction tool in midnight-plugin/servers/src/midnight-network/tools/rpc/get-transaction.ts per mcp-tools-contract.md
- [ ] T086 [P] [US4] Implement midnight_rpc_system_health tool in midnight-plugin/servers/src/midnight-network/tools/rpc/system-health.ts per mcp-tools-contract.md
- [ ] T087 [P] [US4] Implement midnight_rpc_chain_get_finalized_head tool in midnight-plugin/servers/src/midnight-network/tools/rpc/get-finalized-head.ts per mcp-tools-contract.md
- [ ] T088 [US4] Add Zod validation schemas for all RPC tool parameters
- [ ] T089 [US4] Test RPC client connects to Midnight testnet and executes balance query within 2 seconds (SC-014)

#### Indexer Tools Implementation (GraphQL-based)

- [ ] T090 [P] [US4] Implement midnight_indexer_search_transactions tool in midnight-plugin/servers/src/midnight-network/tools/indexer/search-transactions.ts per mcp-tools-contract.md
- [ ] T091 [P] [US4] Implement midnight_indexer_get_account_history tool in midnight-plugin/servers/src/midnight-network/tools/indexer/get-account-history.ts per mcp-tools-contract.md
- [ ] T092 [P] [US4] Implement midnight_indexer_search_events tool in midnight-plugin/servers/src/midnight-network/tools/indexer/search-events.ts per mcp-tools-contract.md
- [ ] T093 [P] [US4] Implement midnight_indexer_connect tool in midnight-plugin/servers/src/midnight-network/tools/indexer/connect.ts per mcp-tools-contract.md
- [ ] T094 [US4] Add Zod validation schemas for all indexer tool parameters
- [ ] T095 [US4] Test indexer client authenticates and retrieves transaction data within 3 seconds (SC-015)

#### Composite Tools Implementation

- [ ] T096 [P] [US4] Implement midnight_analyze_address composite tool in midnight-plugin/servers/src/midnight-network/tools/composite/analyze-address.ts per mcp-tools-contract.md (combines RPC balance + indexer history)
- [ ] T097 [P] [US4] Implement midnight_verify_finality composite tool in midnight-plugin/servers/src/midnight-network/tools/composite/verify-finality.ts per mcp-tools-contract.md (uses Substrate finality rules)
- [ ] T098 [P] [US4] Implement midnight_monitor_network composite tool in midnight-plugin/servers/src/midnight-network/tools/composite/monitor-network.ts per mcp-tools-contract.md (aggregates health metrics)
- [ ] T099 [US4] Add Zod validation schemas for all composite tool parameters

#### Tool Registration and Error Handling

- [ ] T100 [US4] Register all RPC tools in midnight-plugin/servers/src/midnight-network/index.ts MCP server tool list
- [ ] T101 [US4] Register all indexer tools in midnight-plugin/servers/src/midnight-network/index.ts MCP server tool list
- [ ] T102 [US4] Register all composite tools in midnight-plugin/servers/src/midnight-network/index.ts MCP server tool list
- [ ] T103 [US4] Implement exponential backoff retry strategy for network errors per mcp-tools-contract.md
- [ ] T104 [US4] Implement error response format standardization per mcp-tools-contract.md
- [ ] T105 [US4] Verify all 48+ rewritten tools return correctly formatted responses for Midnight Network APIs (SC-016)

#### Caching and Performance

- [ ] T106 [P] [US4] Implement LRU cache for finalized blocks in rpc-client.ts (immutable data)
- [ ] T107 [P] [US4] Implement 5-minute cache for historical indexer queries in indexer-client.ts
- [ ] T108 [US4] Verify RPC tools respond within 2 seconds (95th percentile)
- [ ] T109 [US4] Verify indexer tools respond within 3 seconds (95th percentile)
- [ ] T110 [US4] Verify composite tools respond within 5 seconds (95th percentile)

#### Security and Credential Management

- [ ] T111 [P] [US4] Implement secure viewing key storage (encrypted, never logged)
- [ ] T112 [P] [US4] Implement session token management with automatic expiration handling
- [ ] T113 [US4] Implement input sanitization for all user inputs (address validation, path traversal protection)

#### Testing and Validation

- [ ] T114 [US4] Test midnight_analyze_address provides accurate analysis using Midnight-specific metrics with >95% accuracy (SC-017)
- [ ] T115 [US4] Test all tools against Midnight testnet with various scenarios (happy path, error cases, edge cases)
- [ ] T116 [US4] Verify all 48+ tools are operational and correctly mapped to Midnight API endpoints

**Checkpoint**: All blockchain interaction tools should be functional and tested against Midnight testnet

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements, documentation, and validation

- [ ] T117 [P] Update README.md at repository root with Midnight Network branding, installation instructions, demo instructions
- [ ] T118 [P] Update DEVELOPMENT.md with Midnight-specific development workflows
- [ ] T119 [P] Update CONTRIBUTING.md with Midnight contribution guidelines
- [ ] T120 Code cleanup and refactoring - remove any remaining pod-specific logic or comments
- [ ] T121 Run quickstart.md validation - follow demo script end-to-end
- [ ] T122 Verify all success criteria from spec.md are met (SC-001 through SC-017)
- [ ] T123 Create demo video or screenshots for hackathon submission
- [ ] T124 Write hackathon submission documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 - P1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 - P2 (Phase 4)**: Depends on User Story 1 completion (needs renamed directories and packages)
- **User Story 3 - P3 (Phase 5)**: Depends on User Story 1 completion (needs renamed agent directories) - OPTIONAL for hackathon
- **User Story 4 - P4 (Phase 6)**: Depends on User Story 1 completion (needs midnight-network server structure) - OPTIONAL for hackathon
- **Polish (Phase 7)**: Depends on User Story 1 and 2 completion for MVP; all user stories for full completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 for renamed directories and packages
- **User Story 3 (P3)**: Depends on User Story 1 for infrastructure - Independent of US2 and US4
- **User Story 4 (P4)**: Depends on User Story 1 for infrastructure - Independent of US2 and US3

### Within Each User Story

**User Story 1 (Branding)**:
1. Directory/package renaming first
2. Configuration updates in parallel
3. Source code updates in parallel
4. Build and verify last

**User Story 2 (Content)**:
1. Documentation gathering and processing
2. RAG configuration and template creation in parallel
3. Skill implementation last

**User Story 3 (Agents)**:
1. Delete old agents first
2. Create all new agent directories in parallel
3. Integration and testing last

**User Story 4 (Blockchain Tools)**:
1. Core infrastructure first
2. RPC tools, indexer tools in parallel
3. Composite tools after RPC/indexer tools complete
4. Security, caching, testing last

### Parallel Opportunities

- **Setup**: All tasks can run in parallel
- **Foundational**: All tasks can run in parallel (within Phase 2)
- **User Story 1**: Tasks marked [P] can run in parallel within each subsection
- **User Story 2**: Documentation gathering, template creation, synonym updates can run in parallel
- **User Story 3**: All agent directory creation and prompt writing can run in parallel
- **User Story 4**: RPC tools, indexer tools can run in parallel; caching and security can run in parallel
- **After US1 completes**: US2, US3, US4 can technically start in parallel (though US2 is higher priority for MVP)

---

## Parallel Example: User Story 1 (Branding)

```bash
# Launch all directory renames together:
Task: "Rename midnight-plugin/ directory to midnight-plugin/"
Task: "Rename midnight-plugin/servers/src/midnight-network/ to midnight-network/"

# Launch all package.json updates together:
Task: "Update midnight-plugin/servers/package.json with Midnight branding"
Task: "Update midnight-plugin/.claude-plugin/plugin.json with Midnight branding"
Task: "Update root package.json with Midnight branding"
Task: "Update rigging-mcp/package.json with Midnight branding"

# Launch all source code find/replace operations together:
Task: "Global find/replace midnight-plugin → midnight-plugin in all TypeScript files"
Task: "Global find/replace midnight-network → midnight-network in all TypeScript files"
Task: "Global find/replace midnight-rag → midnight-rag in all TypeScript files"
Task: "Global find/replace midnight-reranking → midnight-reranking in all TypeScript files"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 Only) - RECOMMENDED FOR HACKATHON

1. Complete Phase 1: Setup (verify structure)
2. Complete Phase 2: Foundational (branding foundation)
3. Complete Phase 3: User Story 1 (branding updates)
4. **STOP and VALIDATE**: Test User Story 1 independently - verify zero pod references, components work
5. Complete Phase 4: User Story 2 (content replacement)
6. **STOP and VALIDATE**: Test User Story 2 independently - query RAG, scaffold contracts
7. Complete Phase 7: Polish (README, demo video)
8. **Deploy/Demo** - MVP ready for hackathon submission!

**Time Estimate for MVP**: 8.5-11.5 hours (per quickstart.md)

### Incremental Delivery (If Time Permits)

1. Complete MVP (US1 + US2) → Test → Demo (8.5-11.5 hours)
2. Add User Story 3 (Agents) → Test independently → Enhanced Demo (additional 3-4 hours)
3. Add User Story 4 (Blockchain Tools) → Test independently → Full-Featured Demo (additional 6-8 hours)

**Total Time for Full Feature**: 18-23.5 hours

### Parallel Team Strategy

With multiple developers:

1. **Team completes Setup + Foundational together** (1 hour)
2. **Team completes User Story 1 together** (2-3 hours) - must be sequential due to file dependencies
3. **Once US1 is done, split team**:
   - Developer A: User Story 2 (content) - 4-6 hours
   - Developer B: User Story 3 (agents) - 3-4 hours
   - Developer C: User Story 4 (blockchain tools) - 6-8 hours
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies within the subsection
- [Story] label maps task to specific user story (US1, US2, US3, US4) for traceability
- Each user story should be independently completable and testable
- Commit after each logical group of tasks (e.g., after all package.json updates, after all skill renames)
- Stop at any checkpoint to validate story independently
- **Hackathon Priority**: P1 (US1) + P2 (US2) for MVP, P3 (US3) + P4 (US4) are optional enhancements
- All paths assume repository root is `/Users/aaronbassett/Projects/aaronbassett/midnight-rigging/`
- Use global find/replace carefully - verify changes before committing
- Test domain-agnostic components (reranking, templating) after each branding update to ensure no breakage

# Feature Specification: Fork pod-rigging for Midnight Network

**Feature Branch**: `001-fork-pod-rigging`
**Created**: 2025-11-17
**Status**: Draft
**Input**: User description: "Fork pod-rigging repository to Midnight Network blockchain platform"

**Note**: For hackathon development, prioritize P1 stories for MVP demo. P2/P3 stories are optional enhancements.

## Clarifications

### Session 2025-11-17

- Q: What smart contract language does Midnight Network use (affects template creation, validation rules, and SDK integration patterns)? → A: Compact language (TypeScript-based DSL for zero-knowledge smart contracts) - confirmed via research.md
- Q: What chunking strategy should be used for embedding Midnight documentation (affects embedding quality, retrieval precision, and storage requirements)? → A: Reuse pod-rigging's existing chunking strategy (no changes to chunking logic)
- Q: Does the "48+ rewritten Midnight tools" count include only blockchain-specific tools or also generic utilities with pod-specific naming/logic (affects scope estimation)? → A: Blockchain tools plus any utilities with pod-specific naming/logic
- Q: Should existing pod-specific agents be deleted, archived, or kept alongside Midnight agents (affects repository cleanup scope and backward compatibility)? → A: Delete all pod-specific agents completely
- Q: Does "zero occurrences" of pod branding apply to git history, documentation referencing fork source, or only working files (affects purge thoroughness)? → A: Working files only, preserve git history and attribution

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Global Branding and Low-Effort Component Adaptation (Priority: P1)

As a developer forking pod-rigging for Midnight Network, I need to rename all pod-specific branding and adapt domain-agnostic components so that the repository structure and reusable tooling reflect Midnight Network without requiring rewrites.

**Why this priority**: This is the foundation that unblocks all other work. Without completing branding and component renaming, subsequent development will create naming conflicts and confusion. This story delivers immediate visible progress with minimal risk.

**Independent Test**: Can be fully tested by searching for "pod" references across all files and verifying all domain-agnostic components (reranking server, templating engine, CI/CD) function correctly with Midnight branding.

**Acceptance Scenarios**:

1. **Given** the forked repository, **When** searching for "midnight-plugin", "midnight-network", "pod.network", "midnight-rag", "midnight-reranking", "midnight-developer", "midnight-deployment-engineer" across all files, **Then** all instances are replaced with Midnight equivalents
2. **Given** updated branding in configuration files, **When** the reranking server is started, **Then** it loads successfully with Midnight branding in logs and responds to reranking requests
3. **Given** renamed CI/CD workflows, **When** GitHub Actions run, **Then** all jobs execute successfully with Midnight-specific naming
4. **Given** updated CLAUDE.md and constitution files, **When** reviewed, **Then** they contain Midnight Network branding guidelines and philosophy
5. **Given** the templating engine with Midnight naming, **When** invoked, **Then** it successfully loads and renders templates (even though template content will be replaced in P2)

---

### User Story 2 - Content Replacement for Knowledge Base and Templates (Priority: P2)

As a Midnight Network developer, I need the RAG knowledge base populated with Midnight documentation and scaffolding templates using Midnight SDK patterns so that the plugin provides accurate, Midnight-specific guidance and code generation.

**Why this priority**: This story provides the "content" that makes the plugin useful for Midnight development. While foundational, it can be developed incrementally after branding is complete. The plugin can function without this content, but won't provide Midnight-specific value.

**Independent Test**: Can be tested by querying the RAG system for Midnight-specific questions and generating contracts using scaffold commands, verifying all responses and generated code use Midnight patterns and terminology.

**Acceptance Scenarios**:

1. **Given** gathered Midnight Network documentation, **When** processed and embedded into ChromaDB, **Then** vector database contains searchable Midnight-specific knowledge chunks
2. **Given** Midnight-populated RAG database, **When** querying "How do I deploy a contract on Midnight Network?", **Then** results return Midnight-specific deployment instructions with source citations
3. **Given** updated rag-query skill with Midnight triggers, **When** asking Midnight smart contract questions, **Then** the skill automatically activates and queries the correct knowledge base
4. **Given** new Midnight contract templates (Hello World, token, NFT), **When** scaffold command is invoked, **Then** generated code uses Midnight SDK imports and follows Midnight best practices
5. **Given** Midnight frontend template, **When** DApp scaffold is run, **Then** generated React app is configured with Midnight chain IDs and RPC endpoints
6. **Given** updated blockchain-synonyms.txt with Midnight terms, **When** RAG query expansion runs, **Then** synonyms like "MN", "ZK-chain" correctly map to Midnight concepts

---

### User Story 3 - Midnight Expert Knowledge Integration (Priority: P3)

As a developer using the Midnight plugin, I need AI agents with deep Midnight Network expertise so that I receive accurate architectural guidance, deployment assistance, validation checks, and test generation aligned with Midnight's ZK-based architecture.

**Why this priority**: This story provides the "intelligence layer" that makes the plugin truly powerful. However, it depends on completed branding (P1) and content replacement (P2). It can be developed iteratively as Midnight expertise is accumulated. The plugin delivers value without this, but at a reduced intelligence level.

**Independent Test**: Can be tested by invoking each agent (midnight-developer, midnight-deployment-engineer, midnight-source-validator, midnight-test-engineer) with Midnight-specific scenarios and verifying responses demonstrate deep understanding of ZK concepts, private state management, and Midnight patterns.

**Acceptance Scenarios**:

1. **Given** new midnight-developer agent, **When** asked "Explain Midnight's zero-knowledge proof architecture", **Then** response includes accurate primer on ZK concepts, private state management, and proof generation
2. **Given** midnight-deployment-engineer agent, **When** provided a Midnight contract for deployment, **Then** generates deployment scripts using Midnight-compatible tools and validates contract against Midnight-specific requirements
3. **Given** midnight-source-validator agent, **When** reviewing Midnight contract code, **Then** identifies correct Midnight SDK usage, flags EVM patterns that won't work on Midnight, and suggests Midnight-specific alternatives
4. **Given** midnight-test-engineer agent, **When** asked to create tests for Midnight contracts, **Then** generates tests using Midnight test frameworks and validates ZK-specific edge cases
5. **Given** midnight-dev-skill reference docs, **When** AI queries for Midnight patterns, **Then** retrieves accurate guidance on Midnight architecture, SDK usage, Ethereum migration differences, and security patterns

---

### User Story 4 - Midnight Blockchain Interaction Tools (Priority: P3)

As a developer building on Midnight Network, I need MCP tools that interact with Midnight's JSON-RPC endpoint, indexer API, and authentication systems so that I can query blockchain state, submit transactions, search events, and analyze network activity directly from the plugin.

**Why this priority**: This is the "heart" of blockchain integration but requires investigation of Midnight's specific APIs and authentication flows. It's the most complex rewrite and depends on completed branding and knowledge base. The plugin can provide value through knowledge and scaffolding before this is complete.

**Independent Test**: Can be tested by invoking each tool category (RPC tools, indexer tools, composite tools) against Midnight testnet and verifying responses match Midnight API specifications and business logic rules.

**Acceptance Scenarios**:

1. **Given** Midnight RPC client implementation, **When** calling midnight_getBalance for an address, **Then** returns current balance from Midnight network
2. **Given** Midnight indexer client, **When** calling indexer_listDecodedTransactions, **Then** returns Midnight transactions with decoded parameters using Midnight's schema
3. **Given** Midnight authentication flow, **When** indexer tool is invoked without credentials, **Then** implements Midnight-specific authentication (auto-provision, API key, or login/password) and stores credentials securely
4. **Given** rewritten composite tool analyze_address, **When** provided Midnight address, **Then** analyzes address using Midnight-specific metrics (ZK proofs, private transactions, shielded balances)
5. **Given** rewritten composite tool verify_finality, **When** checking transaction finality, **Then** uses Midnight's consensus mechanism rules to determine finality status
6. **Given** 48+ rewritten Midnight tools, **When** all are registered in MCP server, **Then** each tool maps correctly to Midnight API endpoints and returns properly formatted responses

---

### Edge Cases

- What happens when Midnight Network API endpoints change or are unavailable during development?
  - **Resolution**: Implement retry logic with exponential backoff (3 attempts, 1s/2s/4s delays), provide clear error messages with testnet status URL, verify testnet stability during setup phase (T001-T003). No mock server needed per constitution (avoid premature optimization).
- How does the system handle incomplete Midnight documentation during knowledge base population?
- What if Midnight Network uses non-EVM-compatible RPC methods that don't map to pod's eth_* methods?
- How does authentication work if Midnight indexer API uses different authentication than pod (e.g., JWT tokens vs API keys)?
- What happens if Midnight SDK has breaking changes between template creation and user scaffolding?
- How do we handle ZK-specific patterns that have no equivalent in pod's CRDT-based model?

## Requirements *(mandatory)*

### Functional Requirements

#### P1: Global Branding and Component Adaptation

- **FR-001**: System MUST replace all instances of "midnight-plugin", "midnight-network", "pod.network", "midnight-rag", "midnight-reranking", "midnight-developer", "midnight-deployment-engineer" with Midnight Network equivalents across all files
- **FR-002**: System MUST update CLAUDE.md with Midnight Network branding guidelines
- **FR-003**: System MUST update .specify/memory/constitution.md with Midnight Network project philosophy
- **FR-004**: Reranking server MUST function with renamed midnight-reranking identifier
- **FR-005**: Templating engine core files MUST function with renamed midnight-templating identifier
- **FR-006**: CI/CD workflows MUST execute successfully with Midnight-specific job names and descriptions
- **FR-007**: All package.json files MUST reflect Midnight Network naming and descriptions

#### P2: Content Replacement

- **FR-008**: System MUST gather and process all available Midnight Network documentation (whitepapers, developer docs, API guides, tutorials)
- **FR-009**: System MUST chunk and embed Midnight documentation into a new ChromaDB vector database collection using pod-rigging's existing chunking strategy
- **FR-010**: RAG server MUST connect to Midnight-specific ChromaDB instance
- **FR-011**: rag-query skill triggers MUST activate for Midnight-specific questions (Midnight smart contracts, ZK proofs, private state, Midnight SDK)
- **FR-012**: blockchain-synonyms.txt MUST map Midnight-specific terms (Midnight, MN, ZK-chain, shielded transactions, etc.)
- **FR-013**: System MUST provide contract templates for Midnight Network (Hello World, token, NFT, voting, auction) using Midnight SDK and Compact language (TypeScript-based DSL for zero-knowledge smart contracts)
- **FR-014**: System MUST provide frontend template configured for Midnight Network chain IDs and RPC endpoints
- **FR-015**: All template placeholders MUST use Handlebars syntax compatible with existing template engine

#### P3: Expert Knowledge Integration

- **FR-016**: System MUST delete all existing pod-specific agents (midnight-developer, midnight-deployment-engineer, etc.)
- **FR-017**: System MUST provide midnight-developer agent with Midnight architecture knowledge (ZK proofs, private state, proof generation)
- **FR-018**: System MUST provide midnight-deployment-engineer agent capable of generating Midnight deployment scripts
- **FR-019**: System MUST provide midnight-source-validator agent that validates Midnight SDK usage and identifies incompatible EVM patterns
- **FR-020**: System MUST provide midnight-test-engineer agent that generates Midnight-compatible tests
- **FR-021**: Reference documents MUST cover Midnight core architecture, SDK usage, Ethereum-to-Midnight migration differences, and Midnight security patterns

#### P4: Blockchain Interaction

- **FR-022**: System MUST implement Midnight RPC client targeting Midnight Network JSON-RPC endpoint
- **FR-023**: System MUST implement Midnight indexer client targeting Midnight Indexer API
- **FR-024**: System MUST implement Midnight-specific authentication flow (auto-provision, API keys, or login/password)
- **FR-025**: System MUST provide RPC tools for Midnight (balance queries, transaction queries, account state, log queries, network info, transaction submission)
- **FR-026**: System MUST provide indexer tools for Midnight (transaction search with decoded data, event log search, contract verification, Midnight-specific queries)
- **FR-027**: System MUST provide composite analysis tools using Midnight-specific business logic (address analysis, network monitoring, finality tracking)
- **FR-028**: All tools MUST handle Midnight API response formats and error codes correctly
- **FR-029**: The rewritten Midnight blockchain tools MUST include RPC tools (balance, transaction, block, network queries), indexer tools (transaction search, account history, event search), and composite analysis tools (address analysis, network monitoring, finality tracking). Total count: minimum 12 core tools (5 RPC + 4 indexer + 3 composite) with additional utilities as needed. Note: pod-rigging had 48+ tools, but Midnight scope focuses on essential blockchain interaction tools for MVP.

### Key Entities

- **Midnight Documentation Chunk**: Represents a segment of Midnight Network documentation embedded in the vector database. Attributes: content, metadata (source, page, section), embedding vector, chunk ID
- **Contract Template**: Represents a boilerplate smart contract project for Midnight Network. Attributes: template name, category (basic/token/NFT/voting/auction), source files, Handlebars placeholders, dependencies, Midnight SDK version
- **Frontend Template**: Represents a boilerplate DApp frontend configured for Midnight. Attributes: framework (React/Vite), chain ID, RPC endpoint, wallet integration, component structure
- **Agent**: Represents an AI specialist with Midnight expertise. Attributes: agent name, role description, reference documents, prompt templates, tool access
- **RPC Tool**: Represents a blockchain query or transaction tool. Attributes: tool name, method signature, Midnight RPC method mapping, parameter validation, response format
- **Indexer Tool**: Represents a Midnight indexer query tool. Attributes: tool name, endpoint path, authentication requirements, query parameters, response schema
- **Composite Tool**: Represents a higher-level analysis tool combining multiple API calls. Attributes: tool name, dependent tools, Midnight business logic rules, aggregation logic

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### P1: Global Branding and Component Adaptation

- **SC-001**: Zero occurrences of "midnight-plugin", "midnight-network", "pod.network", "midnight-rag", "midnight-reranking", "midnight-developer" remain in working files after branding update (git history and attribution preserved)
- **SC-002**: All CI/CD workflows execute successfully with Midnight branding within 5 minutes on GitHub Actions
- **SC-003**: Reranking server starts and processes sample queries within 10 seconds after rename
- **SC-004**: Templating engine loads and renders sample templates within 5 seconds after rename

#### P2: Content Replacement

- **SC-005**: RAG database contains at least 500 searchable chunks of Midnight documentation
- **SC-006**: RAG queries for "Midnight deployment", "ZK proofs", "private state" return relevant results with >0.7 relevance scores
- **SC-007**: Contract scaffold command generates valid Midnight SDK code that compiles without errors
- **SC-008**: Frontend scaffold command generates React app that runs `npm install && npm run dev` successfully
- **SC-009**: blockchain-synonyms.txt maps at least 10 Midnight-specific terms correctly

#### P3: Expert Knowledge Integration

- **SC-010**: midnight-developer agent provides accurate responses to 90% of Midnight architecture questions when validated by Midnight expert
- **SC-011**: midnight-deployment-engineer agent generates deployment scripts that successfully deploy contracts to Midnight testnet
- **SC-012**: midnight-source-validator agent identifies 100% of incompatible EVM patterns in test contract set
- **SC-013**: midnight-test-engineer agent generates tests that execute successfully with Midnight test frameworks

#### P4: Blockchain Interaction

- **SC-014**: RPC client successfully connects to Midnight testnet and executes balance queries within 2 seconds
- **SC-015**: Indexer client successfully authenticates and retrieves transaction data within 3 seconds
- **SC-016**: All 48+ rewritten tools return correctly formatted responses for Midnight Network APIs
- **SC-017**: Composite tools provide accurate analysis using Midnight-specific metrics with >95% accuracy when validated against known Midnight addresses/transactions

### Assumptions

1. Midnight Network has publicly accessible documentation (whitepapers, developer guides, API specifications)
2. Midnight Network provides a JSON-RPC endpoint for blockchain queries (may or may not be EVM-compatible)
3. Midnight Network provides an indexer API for transaction/event search (authentication method to be determined)
4. Midnight SDK and smart contract language are sufficiently documented to create valid templates
5. Midnight test frameworks exist and are documented for test generation
6. Project team has access to Midnight Network testnet for validation
7. Midnight Network's architecture is fundamentally different from pod's CRDT/blockless model, requiring full rewrites of domain logic
8. ChromaDB or equivalent vector database is available for Midnight documentation embedding
9. Existing Handlebars templating engine is compatible with Midnight template requirements
10. Project follows hackathon constitution principles (MVP speed, simple but scalable, demo-first quality)

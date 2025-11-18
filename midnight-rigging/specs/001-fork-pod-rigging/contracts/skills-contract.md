# Skills Contract: Midnight Network Plugin

**Version**: 1.0.0
**Date**: 2025-11-17

## Overview

This contract defines the skill interfaces for the Midnight Network Claude Code plugin. Skills are higher-level automation workflows that combine multiple MCP tools and agent capabilities.

---

## 1. midnight-scaffold-contract

**Description**: Scaffolds a new Midnight Compact smart contract project from templates.

**Trigger Patterns**:
- "create a new Midnight contract"
- "scaffold a Compact contract"
- "generate a token contract for Midnight"
- "set up a new smart contract project"

**Parameters**:
```typescript
{
  template: string;         // Template name (hello-world, token, nft, voting, auction)
  project_name: string;     // Name of the project
  contract_name: string;    // Name of the Compact contract
  output_path: string;      // Where to create the project
  author?: string;          // Contract author (optional)
  description?: string;     // Contract description (optional)
}
```

**Workflow**:
1. Validate template exists
2. Prompt user for required placeholders
3. Call `templating_render_template` with values
4. Write files to output_path
5. Run `npm install` in output directory
6. Verify compilation with Compact compiler
7. Display quickstart instructions

**Output**:
```typescript
{
  project_path: string;
  files_created: string[];
  next_steps: string[];     // Instructions for user
  success: boolean;
}
```

**Error Handling**:
- Template not found: Suggest available templates
- Invalid project name: Provide naming guidelines
- Output path exists: Prompt for overwrite or rename
- Compilation fails: Display compiler errors

---

## 2. midnight-scaffold-dapp

**Description**: Scaffolds a full-stack Midnight DApp with frontend and contract integration.

**Trigger Patterns**:
- "create a Midnight DApp"
- "scaffold a full-stack Midnight app"
- "generate a React app for Midnight"
- "set up a Midnight frontend"

**Parameters**:
```typescript
{
  framework: string;        // react-vite, react-next, vue, svelte
  project_name: string;
  include_contract?: string;  // Optional: Contract template to include
  output_path: string;
  features?: string[];      // Optional: wallet-connect, contract-hooks, etc.
}
```

**Workflow**:
1. Validate framework template exists
2. If include_contract specified, scaffold contract first
3. Call `templating_render_template` for frontend
4. Configure chain settings (testnet by default)
5. Install dependencies (`npm install`)
6. If contract included, generate TypeScript contract bindings
7. Run `npm run dev` to verify setup
8. Display quickstart instructions

**Output**:
```typescript
{
  project_path: string;
  frontend_path: string;
  contract_path?: string;
  dev_server_url: string;   // http://localhost:5173 or similar
  next_steps: string[];
  success: boolean;
}
```

**Error Handling**:
- Framework not supported: List available frameworks
- Contract scaffold fails: Provide error details
- npm install fails: Check Node.js version, suggest troubleshooting
- Dev server fails to start: Check port availability

---

## 3. midnight-rag-query

**Description**: Queries the Midnight documentation knowledge base and provides context-aware answers.

**Trigger Patterns**:
- "How do I [action] in Midnight?"
- "Explain Midnight [concept]"
- "What is [Midnight term]?"
- "Show me how to [task] with Compact"
- "Midnight documentation for [topic]"
- Keywords: "zero-knowledge", "ZK proof", "Compact", "shielded transaction", "Midnight SDK"

**Parameters**:
```typescript
{
  query: string;            // User question
  context?: string;         // Optional: Previous conversation context
  include_code_examples?: boolean;  // Default: true
  max_sources?: number;     // Max documentation sources to cite (default: 3)
}
```

**Workflow**:
1. Expand query using Midnight-specific synonyms (blockchain-synonyms.txt)
2. Call `rag_query` to retrieve relevant documentation
3. If results returned, call `rerank` to improve relevance
4. Generate answer using top results as context
5. Cite sources with links
6. If no good results, suggest alternative search terms

**Output**:
```typescript
{
  query: string;
  answer: string;           // Generated answer with citations
  sources: Array<{
    title: string;
    url: string;
    relevance_score: number;
  }>;
  code_examples?: Array<{
    language: string;
    code: string;
    description: string;
  }>;
  confidence_score: number; // 0-1, how confident in answer
}
```

**Error Handling**:
- No results found: Suggest rephrasing, provide general Midnight docs link
- Low confidence (<0.5): Indicate uncertainty, provide multiple possible interpretations
- RAG service unavailable: Fallback to keyword search or direct docs links

---

## 4. midnight-deploy-contract (Future Enhancement)

**Description**: Deploys a Compact contract to Midnight testnet or mainnet.

**Status**: Not included in hackathon MVP (P3/P4 feature)

**Trigger Patterns**:
- "deploy my contract to Midnight"
- "publish my Compact contract"
- "deploy to testnet"

**Parameters**:
```typescript
{
  contract_path: string;    // Path to contract project
  network: string;          // testnet-02, mainnet (future)
  wallet_provider?: string; // Optional: Wallet to use
  verify?: boolean;         // Whether to verify on explorer
}
```

**Note**: This skill requires midnight-deployment-engineer agent (P3 feature).

---

## 5. midnight-analyze-transaction (Future Enhancement)

**Description**: Deep analysis of a Midnight transaction with ZK proof details.

**Status**: Not included in hackathon MVP (P3/P4 feature)

**Trigger Patterns**:
- "analyze transaction [hash]"
- "explain what this transaction does"
- "decode transaction [hash]"

**Parameters**:
```typescript
{
  tx_hash: string;
  include_proof_details?: boolean;  // ZK proof breakdown
  explain_in_plain_language?: boolean;
}
```

---

## Skill Execution Model

### Invocation Flow

1. **Trigger Detection**: User message matches trigger pattern
2. **Parameter Extraction**: Parse user message for skill parameters
3. **Parameter Validation**: Validate and prompt for missing required params
4. **Execution**: Run skill workflow
5. **Response**: Return structured output to user

### User Interaction

Skills can interact with users during execution:
- **Confirmation prompts**: "This will create 15 files in /path/to/project. Continue? (y/n)"
- **Choice prompts**: "Which template would you like? [hello-world, token, nft]"
- **Input prompts**: "Enter contract name:"

### Progress Reporting

Long-running skills report progress:
- "Scaffolding contract project..."
- "Installing dependencies (this may take a minute)..."
- "Compiling Compact contract..."
- "✓ Project created successfully!"

---

## Skill Composition

Skills can invoke other skills:
- `midnight-scaffold-dapp` → invokes `midnight-scaffold-contract` if `include_contract` specified
- `midnight-deploy-contract` → may invoke `midnight-analyze-address` to check deployment address

---

## Error Recovery

Skills implement graceful error recovery:

### Partial Success
If skill partially completes (e.g., contract scaffolded but npm install failed):
- Report what succeeded
- Provide manual steps to complete
- Save state to allow resume

### Rollback
For destructive operations:
- Confirm before overwriting existing files
- Create backup of overwritten content
- Provide undo instructions if applicable

### User Guidance
On error:
- Clear error message (no stack traces shown to user)
- Suggested fixes or workarounds
- Link to relevant documentation
- Option to retry with different parameters

---

## Performance Requirements

### Execution Time Targets

- **midnight-scaffold-contract**: <30 seconds (including npm install)
- **midnight-scaffold-dapp**: <60 seconds (including npm install + dev server start)
- **midnight-rag-query**: <5 seconds for query + answer generation
- **Future skills**: TBD based on complexity

### Resource Limits

- **Maximum project size**: 50MB (prevents accidental large file scaffolding)
- **npm install timeout**: 2 minutes (longer than typical, handles slow networks)
- **RAG query timeout**: 10 seconds (prevents hanging on slow embeddings)

---

## Versioning

Skills follow semantic versioning:
- **MAJOR**: Breaking changes to skill interface or workflow
- **MINOR**: New skills added, new parameters added (backward-compatible)
- **PATCH**: Bug fixes, improved error messages

**Current Version**: 1.0.0 (hackathon MVP - P1 + P2 features only)
**Roadmap**: v2.0.0 will add P3/P4 skills (deployment, transaction analysis, expert agents)

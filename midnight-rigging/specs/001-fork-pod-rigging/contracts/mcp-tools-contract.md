# MCP Tools Contract: Midnight Network Plugin

**Version**: 1.0.0
**Date**: 2025-11-17
**Protocol**: Model Context Protocol (MCP)

## Overview

This contract defines the MCP tool interfaces for the Midnight Network Claude Code plugin. All tools follow MCP conventions and use Zod for parameter validation.

## Tool Naming Convention

All Midnight-specific tools follow this pattern:
- RPC tools: `midnight_rpc_{operation}`
- Indexer tools: `midnight_indexer_{operation}`
- Composite tools: `midnight_{operation}`
- Templating tools: `templating_{operation}` (domain-agnostic)
- RAG tools: `rag_{operation}` (domain-agnostic)
- Reranking tools: `rerank` (domain-agnostic)

---

## 1. RPC Tools (Substrate-based)

### 1.1 midnight_rpc_get_block

**Description**: Retrieves a full block from Midnight Network by hash or number.

**Parameters**:
```typescript
{
  block_hash?: string;      // Optional: Block hash (hex string)
  block_number?: number;    // Optional: Block number (decimal)
  // Note: Exactly one of block_hash or block_number must be provided
}
```

**Response**:
```typescript
{
  hash: string;             // Block hash
  number: number;           // Block number
  timestamp: number;        // Unix timestamp
  parent_hash: string;      // Parent block hash
  state_root: string;       // State root hash
  extrinsics_root: string;  // Extrinsics root hash
  extrinsics: Array<{       // Block transactions
    hash: string;
    method: string;
    section: string;
    args: object;
  }>;
}
```

**Error Codes**:
- `INVALID_PARAMS`: Both or neither of block_hash/block_number provided
- `BLOCK_NOT_FOUND`: Block does not exist
- `RPC_ERROR`: Substrate RPC error

---

### 1.2 midnight_rpc_get_balance

**Description**: Queries the DUST balance for a Midnight address.

**Parameters**:
```typescript
{
  address: string;          // Midnight address (Substrate format)
  block_hash?: string;      // Optional: Query at specific block
}
```

**Response**:
```typescript
{
  address: string;
  balance: {
    free: string;           // Free balance (in smallest unit)
    reserved: string;       // Reserved balance
    frozen: string;         // Frozen balance
  };
  nonce: number;            // Account nonce
  block_hash: string;       // Block at which balance was queried
}
```

**Error Codes**:
- `INVALID_ADDRESS`: Malformed address
- `ACCOUNT_NOT_FOUND`: Address has no balance
- `RPC_ERROR`: Substrate RPC error

---

### 1.3 midnight_rpc_get_transaction

**Description**: Retrieves transaction details by hash.

**Parameters**:
```typescript
{
  tx_hash: string;          // Transaction hash (hex string)
}
```

**Response**:
```typescript
{
  hash: string;
  block_hash: string;
  block_number: number;
  index: number;            // Transaction index in block
  method: string;
  section: string;
  args: object;
  signature: {
    signer: string;
    signature: string;
  };
  success: boolean;
  events: Array<{
    method: string;
    section: string;
    data: object;
  }>;
}
```

**Error Codes**:
- `TX_NOT_FOUND`: Transaction does not exist
- `RPC_ERROR`: Substrate RPC error

---

### 1.4 midnight_rpc_system_health

**Description**: Returns node health and sync status.

**Parameters**: None

**Response**:
```typescript
{
  is_syncing: boolean;
  peers: number;
  should_have_peers: boolean;
}
```

**Error Codes**:
- `RPC_ERROR`: Substrate RPC error

---

### 1.5 midnight_rpc_chain_get_finalized_head

**Description**: Returns the hash of the latest finalized block.

**Parameters**: None

**Response**:
```typescript
{
  hash: string;             // Finalized block hash
  number: number;           // Finalized block number
}
```

**Error Codes**:
- `RPC_ERROR`: Substrate RPC error

---

## 2. Indexer Tools (GraphQL-based)

### 2.1 midnight_indexer_search_transactions

**Description**: Searches for transactions using GraphQL query with filters.

**Parameters**:
```typescript
{
  address?: string;         // Filter by address (from or to)
  block_number?: number;    // Filter by block number
  method?: string;          // Filter by transaction method
  limit?: number;           // Result limit (default: 10, max: 100)
  offset?: number;          // Pagination offset (default: 0)
  order?: 'asc' | 'desc';   // Sort order (default: 'desc')
}
```

**Response**:
```typescript
{
  transactions: Array<{
    hash: string;
    block_number: number;
    block_hash: string;
    timestamp: number;
    from: string;
    method: string;
    section: string;
    args_decoded: object;   // Decoded transaction arguments
    success: boolean;
    events: Array<{
      method: string;
      section: string;
      data: object;
    }>;
  }>;
  total_count: number;
  has_more: boolean;
}
```

**Error Codes**:
- `INVALID_LIMIT`: Limit exceeds maximum
- `GRAPHQL_ERROR`: GraphQL query error
- `AUTH_REQUIRED`: Query requires viewing key (for shielded data)

---

### 2.2 midnight_indexer_get_account_history

**Description**: Retrieves full transaction history for an account.

**Parameters**:
```typescript
{
  address: string;
  limit?: number;
  offset?: number;
  include_shielded?: boolean;  // Requires viewing key if true
  viewing_key?: string;        // Required if include_shielded is true
}
```

**Response**:
```typescript
{
  address: string;
  transactions: Array<{
    hash: string;
    block_number: number;
    timestamp: number;
    type: 'sent' | 'received' | 'contract' | 'shielded';
    amount?: string;
    counterparty?: string;
    method: string;
  }>;
  total_count: number;
}
```

**Error Codes**:
- `INVALID_ADDRESS`: Malformed address
- `VIEWING_KEY_REQUIRED`: Shielded data requested without key
- `INVALID_VIEWING_KEY`: Viewing key malformed or expired
- `GRAPHQL_ERROR`: GraphQL query error

---

### 2.3 midnight_indexer_search_events

**Description**: Searches for contract events by filters.

**Parameters**:
```typescript
{
  contract_address?: string;
  event_name?: string;
  block_range?: {
    from: number;
    to: number;
  };
  limit?: number;
  offset?: number;
}
```

**Response**:
```typescript
{
  events: Array<{
    block_number: number;
    block_hash: string;
    tx_hash: string;
    event_name: string;
    contract_address: string;
    data: object;
    timestamp: number;
  }>;
  total_count: number;
}
```

**Error Codes**:
- `INVALID_BLOCK_RANGE`: Invalid from/to block numbers
- `GRAPHQL_ERROR`: GraphQL query error

---

### 2.4 midnight_indexer_connect

**Description**: Authenticates with indexer using viewing key to access shielded data.

**Parameters**:
```typescript
{
  viewing_key: string;      // Bech32-encoded viewing key
}
```

**Response**:
```typescript
{
  session_token: string;
  expires_at: number;       // Unix timestamp
}
```

**Error Codes**:
- `INVALID_VIEWING_KEY`: Malformed or invalid key
- `AUTH_FAILED`: Authentication failed
- `GRAPHQL_ERROR`: GraphQL mutation error

---

## 3. Composite Tools (High-level Analysis)

### 3.1 midnight_analyze_address

**Description**: Performs comprehensive analysis of a Midnight address using RPC and indexer data.

**Parameters**:
```typescript
{
  address: string;
  include_shielded?: boolean;
  viewing_key?: string;
}
```

**Response**:
```typescript
{
  address: string;
  balance: {
    free: string;
    reserved: string;
    frozen: string;
  };
  activity: {
    total_transactions: number;
    first_seen: number;
    last_seen: number;
    sent_count: number;
    received_count: number;
    contract_interactions: number;
    shielded_transactions: number;  // If viewing key provided
  };
  top_counterparties: Array<{
    address: string;
    interaction_count: number;
  }>;
  recent_transactions: Array<{
    hash: string;
    block_number: number;
    timestamp: number;
    type: string;
  }>;
}
```

**Error Codes**:
- `INVALID_ADDRESS`: Malformed address
- `RPC_ERROR`: Failed to fetch balance
- `INDEXER_ERROR`: Failed to fetch transaction history

---

### 3.2 midnight_verify_finality

**Description**: Checks if a transaction has reached finality using Midnight's consensus mechanism.

**Parameters**:
```typescript
{
  tx_hash: string;
  required_confirmations?: number;  // Default: 1 (GRANDPA finality)
}
```

**Response**:
```typescript
{
  tx_hash: string;
  is_finalized: boolean;
  confirmations: number;
  finalized_block: string;  // Finalized block hash (if finalized)
  estimated_finality_time?: number;  // Seconds remaining (if not finalized)
}
```

**Error Codes**:
- `TX_NOT_FOUND`: Transaction does not exist
- `RPC_ERROR`: Failed to fetch finality status

---

### 3.3 midnight_monitor_network

**Description**: Monitors Midnight Network health and performance metrics.

**Parameters**: None

**Response**:
```typescript
{
  network_status: {
    is_syncing: boolean;
    peers: number;
    latest_block: number;
    finalized_block: number;
  };
  performance: {
    avg_block_time: number;       // Seconds
    transactions_per_second: number;
    finality_lag: number;         // Blocks behind
  };
  timestamp: number;
}
```

**Error Codes**:
- `RPC_ERROR`: Failed to fetch network status
- `INDEXER_ERROR`: Failed to calculate performance metrics

---

## 4. Templating Tools (Domain-agnostic)

### 4.1 templating_render_template

**Description**: Renders a Handlebars template with provided values.

**Parameters**:
```typescript
{
  template_name: string;    // Template identifier
  values: object;           // Placeholder values
  output_path: string;      // Where to write rendered files
}
```

**Response**:
```typescript
{
  template_name: string;
  files_written: Array<{
    path: string;
    size: number;
  }>;
  success: boolean;
}
```

**Error Codes**:
- `TEMPLATE_NOT_FOUND`: Template does not exist
- `INVALID_VALUES`: Missing required placeholders
- `RENDER_ERROR`: Handlebars rendering failed
- `WRITE_ERROR`: Failed to write output files

---

### 4.2 templating_list_templates

**Description**: Lists all available templates.

**Parameters**: None

**Response**:
```typescript
{
  templates: Array<{
    name: string;
    category: string;
    description: string;
    placeholders: Array<{
      name: string;
      type: string;
      required: boolean;
    }>;
  }>;
}
```

---

## 5. RAG Tools (Domain-agnostic)

### 5.1 rag_query

**Description**: Queries the RAG knowledge base for relevant documentation.

**Parameters**:
```typescript
{
  query: string;            // User question
  collection?: string;      // ChromaDB collection (default: "midnight-docs-v1")
  limit?: number;           // Number of results (default: 5)
  rerank?: boolean;         // Whether to rerank results (default: true)
}
```

**Response**:
```typescript
{
  query: string;
  results: Array<{
    content: string;
    metadata: {
      source: string;
      section: string;
      doc_type: string;
    };
    relevance_score: number;
  }>;
  reranked: boolean;
}
```

**Error Codes**:
- `COLLECTION_NOT_FOUND`: ChromaDB collection does not exist
- `EMBEDDING_ERROR`: Failed to embed query
- `SEARCH_ERROR`: ChromaDB search failed

---

## 6. Reranking Tools (Domain-agnostic)

### 6.1 rerank

**Description**: Reranks a list of text chunks based on relevance to a query using Transformers.js.

**Parameters**:
```typescript
{
  query: string;
  chunks: Array<string>;
  top_k?: number;           // Number of top results to return (default: 5)
}
```

**Response**:
```typescript
{
  query: string;
  reranked_chunks: Array<{
    text: string;
    score: number;
    original_index: number;
  }>;
  model_used: string;
}
```

**Error Codes**:
- `MODEL_NOT_LOADED`: Reranking model failed to load
- `RERANK_ERROR`: Reranking operation failed

---

## Error Handling Standards

### Error Response Format

All tools return errors in this format:

```typescript
{
  error: {
    code: string;           // Error code (from list above)
    message: string;        // Human-readable error message
    details?: object;       // Additional error context
  }
}
```

### Retry Strategy

Tools should implement exponential backoff for transient errors:
- Network errors: Retry up to 3 times with 1s, 2s, 4s delays
- Rate limiting: Retry with backoff based on rate limit headers
- Timeout errors: Retry once with increased timeout

### Validation Strategy

All parameters validated using Zod schemas before execution:
- Type checking
- Range validation (e.g., limit <= 100)
- Format validation (e.g., hex strings, addresses)
- Required field checking

---

## Performance Requirements

### Response Time Targets

- **RPC tools**: <2 seconds (95th percentile)
- **Indexer tools**: <3 seconds (95th percentile)
- **Composite tools**: <5 seconds (95th percentile)
- **Templating tools**: <5 seconds (95th percentile)
- **RAG tools**: <2 seconds without reranking, <10 seconds with reranking (95th percentile)
- **Reranking tools**: <10 seconds for 100 chunks (95th percentile)

### Caching Strategy

- **RPC responses**: Cache finalized blocks (immutable), no caching for latest blocks
- **Indexer responses**: Cache historical queries for 5 minutes
- **Templates**: Cache compiled Handlebars templates in memory
- **RAG embeddings**: Pre-computed, no runtime embedding needed
- **Reranking model**: Load once at startup, keep in memory

### Rate Limiting

- **RPC**: Respect Midnight Network RPC rate limits (if any)
- **Indexer**: Batch queries where possible, respect GraphQL complexity limits
- **No artificial rate limiting** for local tools (templating, reranking, RAG)

---

## Security Considerations

### Credential Management

- **Viewing keys**: Encrypted storage, never logged
- **Session tokens**: Stored securely, automatic expiration handling
- **Private keys**: NEVER handled by plugin (wallet responsibility)

### Input Sanitization

- All user inputs validated before use
- SQL injection protection: N/A (no SQL, using GraphQL)
- Command injection protection: No shell execution from user input
- Path traversal protection: Template paths must be relative, no `../`

### Data Privacy

- **Shielded data**: Only accessible with valid viewing key
- **User queries**: Not logged or transmitted externally
- **RAG content**: Stored locally, not sent to third parties

---

## Versioning

This contract follows semantic versioning:
- **MAJOR**: Breaking changes to tool signatures
- **MINOR**: New tools added, backward-compatible changes
- **PATCH**: Bug fixes, performance improvements

**Current Version**: 1.0.0
**Breaking Changes Policy**: Major version bumps announced 2 weeks in advance

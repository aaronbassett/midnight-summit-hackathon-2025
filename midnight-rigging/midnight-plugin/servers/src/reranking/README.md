# pod Reranking MCP Server

Cross-encoder reranking server for improving RAG query relevance using semantic similarity.

## Overview

This MCP server provides a `rerank` tool that uses cross-encoder models to rerank candidate chunks from vector search results by semantic relevance. Supports multiple models with different speed/accuracy tradeoffs:

- **`Xenova/ms-marco-MiniLM-L-6-v2`** (default): Fast baseline model (~90MB, good accuracy)
- **`Xenova/bge-reranker-base`**: Higher quality model (~280MB, better accuracy)

## Architecture

```
src/reranking/
├── index.ts          # MCP server entry point
├── types.ts          # TypeScript type definitions
├── validation.ts     # Zod input validation schemas
├── logger.ts         # LogTape structured logging
├── queue.ts          # p-queue FIFO request management
├── reranker.ts       # Transformers.js cross-encoder singleton
└── README.md         # This file
```

## Key Components

### 1. Reranker Pipeline (`reranker.ts`)

- Multi-model support with independent lazy-loading per model
- Map-based caching ensures each model loaded once per process
- Automatic tokenization and truncation at 512 tokens
- Returns relevance scores (higher = more relevant)
- Default model: `Xenova/ms-marco-MiniLM-L-6-v2` (fast baseline)

### 2. Request Queue (`queue.ts`)

- FIFO processing with concurrency=1 (prevents event loop blocking)
- 30-second timeout per request
- Queue metrics logging (size, pending, wait time)

### 3. Logger (`logger.ts`)

- LogTape structured logging to stdout (JSON format)
- Configurable log level via `LOG_LEVEL` env var
- Logs request metrics, queue status, model loading progress

### 4. Validation (`validation.ts`)

- Zod schemas for input validation
- Query: 1-1000 characters
- Chunks: 1-50 items with required `text` field
- Limit: optional, 1-50 integer
- Model: optional, enum of supported models (defaults to ms-marco-MiniLM-L-6-v2)

## MCP Tool: `rerank`

**Input**:

```json
{
  "query": "How do I deploy a pod contract?",
  "chunks": [
    {
      "text": "pod network deployment guide...",
      "metadata": { "source": "docs" },
      "id": "doc1"
    }
  ],
  "limit": 5,
  "model": "Xenova/bge-reranker-base"
}
```

**Parameters**:

- `query` (required): Search query string (1-1000 chars)
- `chunks` (required): Array of candidate chunks (1-50 items)
- `limit` (optional): Maximum results to return (1-50)
- `model` (optional): Model to use:
  - `Xenova/ms-marco-MiniLM-L-6-v2` (default, fast)
  - `Xenova/bge-reranker-base` (accurate)

**Output**:

```json
{
  "results": [
    {
      "text": "pod network deployment guide...",
      "metadata": { "source": "docs" },
      "id": "doc1",
      "relevance_score": 0.892,
      "rank": 1,
      "truncated": false
    }
  ],
  "search_time_ms": 1247,
  "model_name": "Xenova/bge-reranker-base",
  "total_before_limit": 20,
  "filtered_by_limit": 15,
  "warnings": []
}
```

**Note**: `model_name` in the response reflects which model was actually used (specified via `model` parameter or default).

## Performance

### Model Comparison

| Metric                | ms-marco-MiniLM-L-6-v2 (default) | bge-reranker-base |
| --------------------- | -------------------------------- | ----------------- |
| Model size            | ~90MB                            | ~280MB            |
| First download        | 2-10s (one-time)                 | 5-15s (one-time)  |
| Model loading         | 0.5-2s                           | 1-3s              |
| Inference (10 chunks) | 30-100ms                         | 80-200ms          |
| Memory footprint      | +300MB                           | +800MB            |
| Accuracy              | Good (baseline)                  | Better            |
| Use case              | Speed-sensitive, high throughput | Quality-sensitive |

### First Request (Per Model)

Each model lazy-loads independently on first use:

- **ms-marco-MiniLM-L-6-v2**: 3-12s total (download + load + inference)
- **bge-reranker-base**: 6-18s total (download + load + inference)

Models cache locally in `~/.cache/huggingface/hub` after first download.

### Subsequent Requests

- Queue wait: 0-Ns (depends on queue depth)
- Inference: 30-200ms depending on model and chunk count
- **Total**: inference time + queue wait

### Memory Usage

- Base: ~200MB (Node.js + app)
- Per loaded model:
  - ms-marco-MiniLM-L-6-v2: +300MB
  - bge-reranker-base: +800MB
- **Maximum**: ~1.3GB if both models loaded simultaneously

## Configuration

Environment variables (set in `midnight-plugin/.mcp.json`):

- `LOG_LEVEL`: Log level (default: `info`, options: `trace|debug|info|warning|error|fatal`)
- `RERANK_MODEL`: (Deprecated) Use the `model` parameter in requests instead

**Note**: Model selection is now per-request via the `model` parameter. The `RERANK_MODEL` environment variable is no longer used.

## Error Handling

| Error Code       | Cause                | Recovery                                          |
| ---------------- | -------------------- | ------------------------------------------------- |
| VALIDATION_ERROR | Invalid input        | Check query (1-1000 chars), chunks (1-50 items)   |
| MODEL_ERROR      | Model loading failed | Check network, verify Hugging Face Hub accessible |
| TIMEOUT_ERROR    | 30s timeout exceeded | Reduce candidates or retry                        |
| SERVER_ERROR     | Unexpected error     | Check logs, retry                                 |

## Integration Example

```typescript
// Step 1: Get candidates from vector search (midnight-rag)
const candidates = await mcpClient.callTool('semantic_search', {
  query: 'How do I deploy a pod contract?',
  limit: 20
});

// Step 2: Rerank for precision (midnight-reranking)
const reranked = await mcpClient.callTool('rerank', {
  query: 'How do I deploy a pod contract?',
  chunks: candidates.results.map(r => ({
    text: r.content,
    metadata: { source_title: r.source_title, source_url: r.source_url },
    id: r.rank.toString()
  })),
  limit: 5
});

// Step 3: Use top results
console.log(`Top result: ${reranked.results[0].text}`);
console.log(`Relevance: ${reranked.results[0].relevance_score}`);
```

## Development

### Build

```bash
cd midnight-plugin/servers
pnpm build
```

### Type Check

```bash
pnpm run type-check
```

### Test Manually

```bash
node dist/reranking/index.js
```

## Known Issues

### Sharp Module Build Warning

- Transformers.js has an optional dependency on `sharp` for image processing
- Not required for text-classification tasks
- Build warnings can be safely ignored for this server
- If issues persist, approve build scripts: `pnpm approve-builds sharp`

### First Request Latency

- Models download on first use per model
  - ms-marco-MiniLM-L-6-v2: ~90MB (3-12s)
  - bge-reranker-base: ~280MB (6-18s)
- Subsequent requests with same model are fast (30-200ms)
- Models cache locally in `~/.cache/huggingface/hub`

## References

- **Specification**: `/specs/002-reranking-mcp-server/spec.md`
- **Implementation Plan**: `/specs/002-reranking-mcp-server/plan.md`
- **Integration Guide**: `/specs/002-reranking-mcp-server/quickstart.md`
- **Data Model**: `/specs/002-reranking-mcp-server/data-model.md`
- **Research**: `/specs/002-reranking-mcp-server/research.md`
- **Tasks**: `/specs/002-reranking-mcp-server/tasks.md`

## License

MIT

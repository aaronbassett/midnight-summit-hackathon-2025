# pod network RAG MCP Server

Remote read-only proxy to Chroma Cloud for the pod network knowledge base.

## Overview

This is a stateless HTTP server that provides secure, read-only access to the pod network's vector database hosted on Chroma Cloud. It acts as a proxy between Claude Code plugins and the Chroma Cloud API, protecting API credentials while providing caching and rate limiting.

## Architecture

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

## Features

- **Read-Only**: Rejects all mutation operations (POST/PUT/DELETE to collection endpoints)
- **In-Memory Caching**: LRU cache with TTL to reduce API calls
- **Rate Limiting**:
  - 100 requests per 15 minutes (general)
  - 20 requests per minute per collection
  - 10 requests per minute for queries
- **Security**:
  - Query size limits (10K characters)
  - Max results per query (100)
  - Max IDs per request (1K)
  - Input validation with Zod
- **Stateless**: Uses StreamableHTTPServerTransport for scalability

## MCP Tools

The server exposes 8 MCP tools:

### Collection Management

1. **get_collection** - Get metadata for a single collection
2. **get_collections** - Get metadata for multiple collections
3. **list_collections** - List all available collections

### Collection Operations

4. **collection_count** - Get document count in a collection
5. **collection_peek** - Get sample documents from a collection
6. **collection_query** - Vector similarity search (semantic search)
7. **collection_get** - Get documents by ID or filter

### AI-Powered Collection Discovery (NEW)

8. **describe_collection** - Generate AI-powered description of a collection's contents
   - **Input**: Collection name
   - **Output**: Structured description including:
     - Content summary (2-3 sentences)
     - Data characteristics (3-5 bullet points about data types, themes, patterns)
     - Recommended use cases (3-5 scenarios when to query this collection)
     - Example queries (3-5 sample questions the collection can answer)
   - **Features**:
     - Powered by Google Gemini 1.5 Flash
     - 7-day caching for cost efficiency
     - Handles empty collections gracefully (no LLM call)
     - Rate limited: 3 requests/minute per IP
   - **Use Case**: Understand what a collection contains and when to use it

9. **recommend_collection** - Rank all collections by suitability for a query
   - **Input**: Natural language query
   - **Output**: Top 3 most relevant collections with:
     - Collection name
     - Suitability score (0-100)
     - Explanation (1-2 sentences why it's suitable)
     - Rank (1, 2, or 3)
   - **Features**:
     - Powered by Google Gemini 1.5 Flash
     - 7-day caching for queries
     - Reuses cached collection descriptions (doesn't re-describe)
     - Rate limited: 1/minute per IP + 10/minute global + 200/hour global
   - **Use Case**: Find the best collection to query for a specific information need

## Environment Variables

Create a `.env` file (see `.env.example`):

```bash
# Chroma Cloud API Configuration
CHROMA_API_KEY=your-chroma-cloud-api-key-here
CHROMA_TENANT=your-chroma-cloud-tenant-id-here
CHROMA_DATABASE=pod

# Google Gemini API Configuration (for AI-powered collection discovery)
GEMINI_API_KEY=your-gemini-api-key-here

# Server Configuration
PORT=3000
NODE_ENV=development

# Cache Configuration
CACHE_TTL_SECONDS=300           # 5 minutes default
CACHE_MAX_SIZE_MB=100

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000     # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_QUERY_PER_MINUTE=20

# Security
MAX_QUERY_LENGTH=10000
MAX_RESULTS_PER_QUERY=100
MAX_IDS_PER_REQUEST=1000
```

## Local Development

### Prerequisites

- Node.js 24+ (LTS)
- npm 10+
- Chroma Cloud API key

### Installation

```bash
# From repository root
npm install

# Or from rag-mcp directory
cd rag-mcp
npm install
```

### Build

```bash
npm run build
```

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## API Endpoints

### Health Check

```bash
GET /health
```

Returns server status and cache statistics.

**Response**:

```json
{
  "status": "ok",
  "timestamp": "2024-01-10T12:00:00.000Z",
  "cache": {
    "keys": 42,
    "hits": 156,
    "misses": 34,
    "hitRate": "82.11%"
  }
}
```

### MCP Protocol

```bash
POST /mcp
```

Handles MCP protocol requests. Use an MCP client to interact with this endpoint.

### Error Responses

All error responses include an `error` field with a standardized error code:

| Error Code                   | HTTP Status | Description                                                           |
| ---------------------------- | ----------- | --------------------------------------------------------------------- |
| `RATE_LIMIT_EXCEEDED`        | 429         | General rate limit exceeded (collection-specific: 20 requests/minute) |
| `RATE_LIMIT_EXCEEDED_IP`     | 429         | Per-IP rate limit exceeded for recommendations (1 request/minute)     |
| `RATE_LIMIT_EXCEEDED_GLOBAL` | 429         | Global rate limit exceeded for recommendations (10 requests/minute)   |
| `INVALID_REQUEST`            | 400         | Request validation failed                                             |
| `UNAUTHORIZED`               | 401         | Missing or invalid Chroma API credentials                             |
| `NOT_FOUND`                  | 404         | Collection or resource not found                                      |
| `INTERNAL_ERROR`             | 500         | Server error                                                          |

**Example Rate Limit Error**:

```json
{
  "error": "RATE_LIMIT_EXCEEDED_IP",
  "message": "Too many recommendation requests. Try again later.",
  "retryAfter": 60
}
```

Clients should implement exponential backoff using the `retryAfter` field.

**Example MCP Request**:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "collection_query",
    "arguments": {
      "collection": "pod-knowledge",
      "queryTexts": ["How do I implement ERC-721?"],
      "nResults": 5,
      "include": ["documents", "metadatas", "distances"]
    }
  }
}
```

### Cache Management

```bash
# Get cache statistics
GET /cache/stats

# Clear cache
POST /cache/clear
```

## Deployment to fly.io

### Prerequisites

- Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/)
- Create a fly.io account

### Initial Setup

```bash
# Login to fly.io
fly auth login

# Create app (first time only)
fly apps create midnight-rag-mcp

# Set secrets
fly secrets set CHROMA_API_KEY=your-api-key-here
fly secrets set CHROMA_TENANT=your-tenant-id-here
```

### Deploy

```bash
# From rag-mcp directory
fly deploy
```

### Monitoring

```bash
# View logs
fly logs

# Check status
fly status

# Open in browser
fly open
```

### Scaling

```bash
# Set to 0 machines when idle (auto-stop)
fly scale count 0

# Set min/max machines
fly scale count 0-2
```

## Security Considerations

1. **API Key Protection**: Never expose `CHROMA_API_KEY` in client-side code or public repositories
2. **Rate Limiting**: Configured to prevent abuse and control costs
3. **Read-Only**: Server rejects all mutation operations
4. **Input Validation**: All inputs validated with Zod schemas
5. **CORS**: Configure CORS to restrict allowed origins in production
6. **HTTPS**: fly.io enforces HTTPS automatically

## Cache Strategy

Different operation types have different TTL values:

- **Queries**: 5 minutes (frequently repeated)
- **Get operations**: 5 minutes
- **Peek**: 10 minutes (sample data changes less)
- **Count**: 1 hour (counts change infrequently)
- **List collections**: 1 hour (collection list rarely changes)
- **Get collection metadata**: 1 hour (metadata rarely changes)
- **AI-powered operations**:
  - **describe_collection**: 7 days (collection contents rarely change fundamentally)
  - **recommend_collection**: 7 days (query-to-collection mappings stable over time)
  - **Note**: Aggressive caching reduces Gemini API costs by 80%+ (from ~$4/month to ~$0.80/month)

## Performance

- **Cold start**: ~500ms
- **Cached queries**: <10ms
- **Uncached queries**: ~200-500ms (Chroma Cloud latency)
- **Memory usage**: ~50-100 MB (with 100 MB cache)

## Troubleshooting

### Server won't start

1. Check that all environment variables are set
2. Verify Chroma Cloud API key is valid
3. Check Node.js version (must be 24+)

### Health check failing

```bash
curl http://localhost:3000/health
```

Should return:

```json
{
  "status": "ok",
  "timestamp": "2024-01-10T12:00:00.000Z",
  "cache": {
    "keys": 0,
    "hits": 0,
    "misses": 0,
    "hitRate": "N/A"
  }
}
```

### Rate limit errors

If you're hitting rate limits:

1. Increase `RATE_LIMIT_MAX_REQUESTS` or `RATE_LIMIT_QUERY_PER_MINUTE`
2. Check cache hit rate in `/health` endpoint
3. Consider longer cache TTL values

### Connection to Chroma Cloud fails

1. Verify `CHROMA_API_KEY` is correct
2. Check that `CHROMA_DATABASE` name matches your Chroma Cloud database
3. Ensure network connectivity to `https://api.trychroma.com`

## Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## License

MIT

## Support

For issues and questions, please open an issue on the pod-rigging repository.

/**
 * Type definitions for reranking MCP server
 * Based on specs/002-reranking-mcp-server/data-model.md
 */

// Input types

/**
 * Reranking request parameters
 * @property query - Search query for semantic relevance scoring
 * @property chunks - Candidate chunks from vector search to rerank
 * @property limit - Optional maximum number of results to return (1-50)
 * @property model - Optional model to use for reranking:
 *   - 'Xenova/ms-marco-MiniLM-L-6-v2' (default): Fast baseline, ~90MB, good accuracy
 *   - 'Xenova/bge-reranker-base': Higher quality, ~280MB, better accuracy
 */
export interface RerankRequest {
  query: string;
  chunks: Chunk[];
  limit?: number;
  model?: string;
}

export interface Chunk {
  text: string;
  metadata?: Record<string, unknown>;
  id?: string;
}

// Output types

export interface RerankingResult extends Chunk {
  relevance_score: number;
  rank: number;
  truncated?: boolean;
}

export interface RerankResponse {
  results: RerankingResult[];
  search_time_ms: number;
  model_name: string;
  total_before_limit: number;
  filtered_by_limit: number;
  warnings?: string[];
}

// Error types

export interface RerankError {
  error: string;
  message: string;
  recovery: string;
}

// Internal types

export interface QueueMetrics {
  size: number;
  pending: number;
  isPaused: boolean;
}

export interface InferenceMetrics {
  inference_start_ms: number;
  inference_end_ms: number;
  queue_wait_ms: number;
  total_ms: number;
  truncated_count: number;
}

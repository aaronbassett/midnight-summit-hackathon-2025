/**
 * Reranker Pipeline Singleton
 *
 * Uses Transformers.js cross-encoder for semantic relevance scoring
 * Based on specs/002-reranking-mcp-server/research.md
 */

import { AutoModel, AutoTokenizer } from '@xenova/transformers';
import type { Chunk, RerankingResult } from './types.js';
import { createLogger } from './logger.js';

const logger = createLogger('reranker');

// Type for model and tokenizer instances
type ModelInstance = any;
type TokenizerInstance = any;

interface RerankerInstance {
  model: ModelInstance;
  tokenizer: TokenizerInstance;
}

/**
 * Reranker pipeline with multi-model support
 * Lazy-loads cross-encoder models on first request per model
 */
class RerankerPipeline {
  private static instances: Map<string, RerankerInstance> = new Map();
  private static loadPromises: Map<string, Promise<RerankerInstance>> = new Map();

  // Default model (fast baseline)
  private static readonly DEFAULT_MODEL = 'Xenova/ms-marco-MiniLM-L-6-v2';

  /**
   * Get the reranker instance (model + tokenizer) for specified model, lazy-loading if needed
   * @param modelId - Model to load (e.g., 'Xenova/ms-marco-MiniLM-L-6-v2' or 'Xenova/bge-reranker-base')
   */
  public static async getInstance(modelId: string = this.DEFAULT_MODEL): Promise<RerankerInstance> {
    // If already loaded, return immediately
    const existingInstance = this.instances.get(modelId);
    if (existingInstance !== undefined) {
      return existingInstance;
    }

    // If currently loading this model, wait for the existing load operation
    const existingLoadPromise = this.loadPromises.get(modelId);
    if (existingLoadPromise !== undefined) {
      logger.debug('model_loading_in_progress', { model: modelId });
      return await existingLoadPromise;
    }

    // Start loading this model
    logger.info('model_loading_started', { model: modelId });

    const loadPromise = (async () => {
      try {
        const startTime = Date.now();

        // Load tokenizer and model
        const tokenizer = await AutoTokenizer.from_pretrained(modelId);
        const model = await AutoModel.from_pretrained(modelId);

        const instance = { model, tokenizer };
        const loadTimeMs = Date.now() - startTime;

        // Cache the loaded instance
        this.instances.set(modelId, instance);

        logger.info('model_loaded', {
          model: modelId,
          load_time_ms: loadTimeMs
        });

        return instance;
      } catch (error) {
        // Remove failed load promise so retry is possible
        this.loadPromises.delete(modelId);
        logger.error('model_loading_failed', {
          model: modelId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw new Error(
          `Failed to load reranking model ${modelId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    })();

    // Track the load promise
    this.loadPromises.set(modelId, loadPromise);

    const instance = await loadPromise;

    // Clean up load promise after successful load
    this.loadPromises.delete(modelId);

    return instance;
  }

  /**
   * Rerank chunks by semantic relevance to query
   * @param query - Search query
   * @param chunks - Candidate chunks to rerank
   * @param modelId - Model to use for reranking (defaults to ms-marco-MiniLM-L-6-v2)
   */
  public static async rerank(
    query: string,
    chunks: Chunk[],
    modelId: string = this.DEFAULT_MODEL
  ): Promise<RerankingResult[]> {
    const startTime = Date.now();
    const { model, tokenizer } = await this.getInstance(modelId);

    logger.debug('reranking_started', {
      model: modelId,
      query_length: query.length,
      chunk_count: chunks.length
    });

    // Score each chunk
    const scoredChunks = await Promise.all(
      chunks.map(async (chunk, index) => {
        try {
          // Cross-encoder expects query-document pair as input
          const input = `${query} [SEP] ${chunk.text}`;

          // First, tokenize without truncation to check actual token count
          const untruncatedTokens = await tokenizer(input, {
            padding: false,
            truncation: false
          });
          const actualTokenCount = untruncatedTokens.input_ids.data.length;

          // Now tokenize with truncation for inference
          const inputs = await tokenizer(input, {
            padding: true,
            truncation: true
          });

          // Run inference and get raw logits
          const { logits } = await model(inputs);
          const score = logits.data[0]; // Raw logit score (higher = more relevant)

          // Check if chunk was truncated (512 token limit for these models)
          const wasTruncated = actualTokenCount > 512;

          // Debug logging for truncation detection
          if (chunk.text.length > 1000) {
            logger.debug('truncation_check', {
              chunk_id: chunk.id,
              text_length: chunk.text.length,
              actual_token_count: actualTokenCount,
              truncated: wasTruncated
            });
          }

          return {
            ...chunk,
            relevance_score: score,
            rank: 0, // Will be assigned after sorting
            truncated: wasTruncated ? true : undefined
          };
        } catch (error) {
          logger.error('chunk_scoring_failed', {
            chunk_id: chunk.id || `chunk_${index}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Return with score 0 on error
          return {
            ...chunk,
            relevance_score: 0,
            rank: 0
          };
        }
      })
    );

    // Sort by relevance score descending
    scoredChunks.sort((a, b) => b.relevance_score - a.relevance_score);

    // Assign ranks
    const rankedChunks = scoredChunks.map((chunk, index) => ({
      ...chunk,
      rank: index + 1
    }));

    const inferenceMs = Date.now() - startTime;
    logger.debug('reranking_completed', {
      model: modelId,
      chunk_count: chunks.length,
      inference_ms: inferenceMs,
      avg_ms_per_chunk: Math.round(inferenceMs / chunks.length),
      top_score: rankedChunks[0]?.relevance_score || 0
    });

    return rankedChunks;
  }
}

/**
 * Get the reranker instance (model + tokenizer)
 * @param modelId - Model to load (defaults to ms-marco-MiniLM-L-6-v2)
 */
export async function getReranker(modelId?: string): Promise<RerankerInstance> {
  return await RerankerPipeline.getInstance(modelId);
}

/**
 * Rerank chunks by semantic relevance
 * @param query - Search query
 * @param chunks - Candidate chunks to rerank
 * @param modelId - Model to use for reranking (defaults to ms-marco-MiniLM-L-6-v2)
 */
export async function rerankChunks(
  query: string,
  chunks: Chunk[],
  modelId?: string
): Promise<RerankingResult[]> {
  return await RerankerPipeline.rerank(query, chunks, modelId);
}

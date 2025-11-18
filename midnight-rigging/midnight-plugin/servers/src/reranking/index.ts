#!/usr/bin/env node

/**
 * pod Reranking MCP Server
 *
 * Provides cross-encoder reranking for RAG query results
 * to improve semantic relevance ranking.
 *
 * MCP Tools:
 * - rerank: Rerank candidate chunks using cross-encoder model
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { RerankRequest, RerankResponse, RerankError } from './types.js';
import { RerankRequestSchema } from './validation.js';
import { initializeLogger, createLogger } from './logger.js';
import { getQueue } from './queue.js';
import { rerankChunks } from './reranker.js';

// Initialize logger
await initializeLogger();
const logger = createLogger('server');

// Configuration
const MODEL_NAME = process.env.RERANK_MODEL || 'Xenova/bge-reranker-base';

/**
 * Create and configure MCP server
 */
const server = new McpServer({
  name: 'midnight-reranking',
  version: '1.0.0',
  description: 'pod network Reranking Server - Cross-encoder reranking for improved RAG relevance'
});

/**
 * Register rerank tool
 */
server.tool(
  'rerank',
  'Rerank candidate chunks from vector search using cross-encoder model for improved semantic relevance. Returns chunks ordered by relevance score.',
  {
    query: {
      type: 'string',
      description: 'Search query for semantic relevance scoring'
    },
    chunks: {
      type: 'array',
      description: 'Candidate chunks from vector search to rerank (1-50 items)'
    },
    limit: {
      type: 'number',
      description: 'Maximum results to return (1-50, default: return all)',
      optional: true
    },
    model: {
      type: 'string',
      description:
        "Reranking model to use: 'Xenova/ms-marco-MiniLM-L-6-v2' (fast, default) or 'Xenova/bge-reranker-base' (accurate)",
      optional: true
    }
  },
  async (args: any) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    logger.info('rerank_request_started', {
      requestId,
      query_length: args.query?.length || 0,
      chunk_count: args.chunks?.length || 0,
      limit: args.limit,
      model: args.model
    });

    // Validate inputs
    try {
      const validatedRequest = RerankRequestSchema.parse(args) as RerankRequest;

      // Add to queue and process
      const queue = getQueue();
      const queueMetrics = queue.getMetrics();

      logger.debug('request_queued', {
        requestId,
        queue_size: queueMetrics.size,
        queue_pending: queueMetrics.pending
      });

      const result = await queue.add(async () => {
        const inferenceStart = Date.now();

        // Extract model parameter (defaults to ms-marco-MiniLM-L-6-v2 via validation schema)
        const model = validatedRequest.model || 'Xenova/ms-marco-MiniLM-L-6-v2';

        // Rerank chunks
        const rerankedResults = await rerankChunks(
          validatedRequest.query,
          validatedRequest.chunks,
          model
        );

        // Apply limit if specified
        const limit = validatedRequest.limit;
        const totalBeforeLimit = rerankedResults.length;
        const finalResults = limit ? rerankedResults.slice(0, limit) : rerankedResults;
        const filteredByLimit = limit ? totalBeforeLimit - finalResults.length : 0;

        // Collect warnings
        const warnings: string[] = [];
        const truncatedCount = finalResults.filter(r => r.truncated).length;
        if (truncatedCount > 0) {
          warnings.push(`${truncatedCount} chunk(s) truncated to 512 tokens`);
        }

        // Check queue depth warning
        const currentMetrics = queue.getMetrics();
        if (currentMetrics.size > 10) {
          warnings.push(`Queue backing up with ${currentMetrics.size} pending requests`);
        }

        const inferenceMs = Date.now() - inferenceStart;
        const totalMs = Date.now() - startTime;

        const response: RerankResponse = {
          results: finalResults,
          search_time_ms: totalMs,
          model_name: model,
          total_before_limit: totalBeforeLimit,
          filtered_by_limit: filteredByLimit,
          warnings: warnings.length > 0 ? warnings : undefined
        };

        logger.info('rerank_request_completed', {
          requestId,
          model,
          duration_ms: totalMs,
          inference_ms: inferenceMs,
          queue_wait_ms: totalMs - inferenceMs,
          candidate_count: validatedRequest.chunks.length,
          returned_count: finalResults.length,
          top_score: finalResults[0]?.relevance_score || 0,
          http_status: 200
        });

        return response;
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      const totalMs = Date.now() - startTime;

      // Handle validation errors
      if (error instanceof z.ZodError) {
        const errorResponse: RerankError = {
          error: 'VALIDATION_ERROR',
          message: error.errors[0].message,
          recovery:
            'Check input parameters: query (1-1000 chars), chunks (1-50 items with text field)'
        };

        logger.error('rerank_request_validation_failed', {
          requestId,
          duration_ms: totalMs,
          validation_errors: error.errors.map(e => e.message)
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(errorResponse)
            }
          ],
          isError: true
        };
      }

      // Handle timeout errors
      if (error instanceof Error && error.message.includes('timed out')) {
        const errorResponse: RerankError = {
          error: 'TIMEOUT_ERROR',
          message: 'Reranking operation timed out after 30 seconds',
          recovery: 'Try reducing the number of candidates or retry the request'
        };

        logger.error('rerank_request_timeout', {
          requestId,
          duration_ms: totalMs
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(errorResponse)
            }
          ],
          isError: true
        };
      }

      // Handle model errors
      if (error instanceof Error && error.message.includes('model')) {
        const errorResponse: RerankError = {
          error: 'MODEL_ERROR',
          message: `Failed to load or run reranking model: ${error.message}`,
          recovery:
            'Check network connection and ensure model can be downloaded from Hugging Face Hub'
        };

        logger.error('rerank_request_model_error', {
          requestId,
          duration_ms: totalMs,
          error: error.message
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(errorResponse)
            }
          ],
          isError: true
        };
      }

      // Handle generic errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorResponse: RerankError = {
        error: 'SERVER_ERROR',
        message: `Failed to process reranking request: ${errorMessage}`,
        recovery: 'Check server logs for details and try again'
      };

      logger.error('rerank_request_failed', {
        requestId,
        duration_ms: totalMs,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(errorResponse)
          }
        ],
        isError: true
      };
    }
  }
);

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    logger.info('server_starting', {
      model: MODEL_NAME,
      log_level: process.env.LOG_LEVEL || 'info'
    });

    // Create and connect transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('server_ready', {
      transport: 'stdio',
      tools: ['rerank']
    });
  } catch (error) {
    logger.error('server_startup_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  logger.info('server_shutdown', { signal: 'SIGINT' });
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('server_shutdown', { signal: 'SIGTERM' });
  process.exit(0);
});

// Start server
main().catch(error => {
  logger.error('server_fatal_error', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined
  });
  process.exit(1);
});

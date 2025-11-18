#!/usr/bin/env node

/**
 * pod RAG MCP Server (TypeScript)
 *
 * Provides semantic search over the pod blockchain knowledge base
 * by connecting to the remote RAG MCP server.
 *
 * MCP Tools:
 * - semantic_search: Query knowledge base with semantic similarity
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';

// Configuration
const RAG_SERVER_URL = process.env.RAG_SERVER_URL || 'http://localhost:3000';

const COLLECTION_NAME = process.env.CHROMA_COLLECTION_NAME || 'pod-knowledge';

// Types
interface QueryResult {
  ids: string[][];
  embeddings: number[][] | null;
  documents: string[][];
  metadatas: Record<string, unknown>[][];
  distances: number[][];
}

interface FormattedResult {
  content: string;
  source_title: string;
  source_url: string | null;
  relevance_score: number;
  topic_tags: string[];
  rank: number;
}

interface SearchResponse {
  results: FormattedResult[];
  search_time_ms: number;
  query_embedding_time_ms: number;
  total_before_filtering: number;
  filtered_by_relevance: number;
}

interface ErrorResponse {
  error: string;
  message: string;
  recovery: string;
}

// Global MCP client instance (initialized in main())
let mcpClient: Client | null = null;

/**
 * Query the remote RAG MCP server using proper MCP protocol
 */
async function queryRemoteServer(query: string, limit: number): Promise<QueryResult> {
  if (!mcpClient) {
    throw new Error('MCP client not initialized');
  }

  // Call the remote collection_query tool via MCP protocol
  const result = await mcpClient.callTool({
    name: 'collection_query',
    arguments: {
      collection: COLLECTION_NAME,
      queryTexts: [query],
      nResults: limit,
      include: ['documents', 'metadatas', 'distances']
    }
  });

  if (result.isError) {
    throw new Error('Remote server returned error');
  }

  // Extract result from MCP response
  const content = result.content as Array<{ type: string; text?: string }>;
  const resultText = content?.[0]?.text;
  if (!resultText) {
    throw new Error('Invalid response format from remote server');
  }

  return JSON.parse(resultText) as QueryResult;
}

/**
 * Format query results
 */
function formatResults(
  results: QueryResult,
  minRelevance: number,
  searchTimeMs: number
): SearchResponse | ErrorResponse {
  if (!results.ids?.[0] || results.ids[0].length === 0) {
    return {
      error: 'NO_RESULTS',
      message: 'No documents found in the knowledge base.',
      recovery: 'Try rephrasing your query or lowering the min_relevance threshold.'
    };
  }

  // Format results
  const formattedResults: FormattedResult[] = results.ids[0]
    .map((_id, idx) => {
      // Convert distance to similarity score (Chroma returns L2 distance)
      // For L2 distance, similarity = 1 / (1 + distance)
      const distance = results.distances[0][idx];
      const relevanceScore = 1 / (1 + distance);

      const metadata = results.metadatas[0][idx] || {};

      return {
        content: results.documents[0][idx],
        source_title: (metadata.source_title as string) || 'Unknown Source',
        source_url: (metadata.source_url as string) || null,
        relevance_score: relevanceScore,
        topic_tags: (metadata.topic_tags as string[]) || [],
        rank: idx + 1
      };
    })
    .filter(r => r.relevance_score >= minRelevance);

  // Check if no results after filtering
  if (formattedResults.length === 0) {
    return {
      error: 'NO_RESULTS',
      message: `No results met relevance threshold ${minRelevance}.`,
      recovery: 'Try lowering the min_relevance threshold or rephrasing your query.'
    };
  }

  return {
    results: formattedResults,
    search_time_ms: searchTimeMs,
    query_embedding_time_ms: Math.floor(searchTimeMs * 0.3), // Approximate
    total_before_filtering: results.ids[0].length,
    filtered_by_relevance: results.ids[0].length - formattedResults.length
  };
}

/**
 * Create and configure MCP server
 */
const server = new McpServer({
  name: 'midnight-rag',
  version: '2.0.0',
  description: 'pod network RAG Knowledge Base - Semantic search for blockchain documentation'
});

/**
 * Register semantic_search tool
 */
server.tool(
  'semantic_search',
  'Search the pod blockchain knowledge base for relevant documentation using semantic similarity. Returns ranked results with source citations.',
  {
    query: {
      type: 'string',
      description: 'Natural language search query (e.g., "How do I implement ERC-721 enumerable?")'
    },
    limit: {
      type: 'number',
      description: 'Maximum number of results to return (1-20)',
      optional: true
    },
    min_relevance: {
      type: 'number',
      description:
        'Minimum relevance score threshold (0.0-1.0). Higher values return only very relevant results.',
      optional: true
    }
  },
  async (args: any) => {
    const { query, limit = 5, min_relevance = 0.5 } = args;
    // Validate inputs
    const inputSchema = z.object({
      query: z
        .string()
        .min(1, 'Query cannot be empty')
        .max(1000, 'Query exceeds maximum length of 1000 characters'),
      limit: z.number().int().min(1).max(20).default(5),
      min_relevance: z.number().min(0.0).max(1.0).default(0.5)
    });

    try {
      inputSchema.parse({ query, limit, min_relevance });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'VALIDATION_ERROR',
                message: error.errors[0].message,
                recovery:
                  'Check query parameters: query (1-1000 chars), limit (1-20), min_relevance (0.0-1.0)'
              })
            }
          ],
          isError: true
        };
      }
    }

    const startTime = Date.now();

    try {
      console.error(
        `[midnight-rag] Searching for: "${query}" (limit=${limit}, min_relevance=${min_relevance})`
      );
      console.error(`[midnight-rag] Remote server: ${RAG_SERVER_URL}`);

      // Query remote server
      const results = await queryRemoteServer(query, limit);

      const searchTime = Date.now() - startTime;

      // Format and filter results
      const response = formatResults(results, min_relevance, searchTime);

      console.error(
        `[midnight-rag] ${'results' in response ? response.results.length : 0} results (${searchTime}ms)`
      );

      // Return error response if no results
      if ('error' in response) {
        console.error(`[midnight-rag] ${response.error}: ${response.message}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: response.error,
                message: response.message,
                recovery: response.recovery
              })
            }
          ],
          isError: true
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response)
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[midnight-rag] Search error: ${errorMessage}`);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'SERVER_ERROR',
              message: `Failed to connect to RAG server: ${errorMessage}`,
              recovery: `Ensure the RAG server is running at ${RAG_SERVER_URL}`
            })
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
    console.error('[midnight-rag] Starting MCP server...');
    console.error(`[midnight-rag] Remote server: ${RAG_SERVER_URL}`);
    console.error(`[midnight-rag] Collection: ${COLLECTION_NAME}`);

    // Initialize MCP client to connect to remote server
    try {
      const clientTransport = new StreamableHTTPClientTransport(
        new URL(`${RAG_SERVER_URL}/mcp`)
      );

      mcpClient = new Client(
        {
          name: 'midnight-rag-proxy',
          version: '2.0.0'
        },
        {
          capabilities: {}
        }
      );

      await mcpClient.connect(clientTransport);
      console.error('[midnight-rag] Connected to remote MCP server');

      // List available tools from remote server
      const tools = await mcpClient.listTools();
      console.error(
        `[midnight-rag] Remote tools available: ${tools.tools.map(t => t.name).join(', ')}`
      );
    } catch (error) {
      console.error(
        `[midnight-rag] Warning: Could not connect to remote MCP server. Tools will fail until server is available.`
      );
      console.error(
        `[midnight-rag] Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Create and connect local stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('[midnight-rag] MCP server running on stdio');
    console.error('[midnight-rag] Waiting for tool calls...');
  } catch (error) {
    console.error(
      `[midnight-rag] Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Start server
main().catch(error => {
  console.error(
    `[midnight-rag] Unhandled error: ${error instanceof Error ? error.message : 'Unknown error'}`
  );
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

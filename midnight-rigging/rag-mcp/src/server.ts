/**
 * RAG MCP Server
 *
 * Read-only proxy to Chroma Cloud with caching, rate limiting, and security.
 * Exposes MCP tools for querying vector databases.
 */

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ChromaClientService } from './services/chroma-client.js';
import { CacheService, generateGeminiCacheKey } from './services/cache.js';
import { GeminiClientService } from './services/gemini-client.js';
import { SecurityMiddleware } from './middleware/security.js';
import { RateLimiterMiddleware } from './middleware/rate-limiter.js';
import { initializeLogger, createLogger } from './services/logger.js';
import type {
  ChromaQueryResult,
  ChromaGetResult,
  CollectionInfo,
  CollectionDescription,
  CollectionRecommendation
} from './types/index.js';

// Zod validation schemas for tool parameters
const GetCollectionSchema = z.object({
  name: z.string().min(1, 'Collection name cannot be empty')
});

const GetCollectionsSchema = z.object({
  names: z.array(z.string().min(1)).min(1, 'At least one collection name required')
});

const CollectionCountSchema = z.object({
  collection: z.string().min(1, 'Collection name cannot be empty')
});

const CollectionPeekSchema = z.object({
  collection: z.string().min(1, 'Collection name cannot be empty'),
  limit: z.number().int().min(1).max(100).optional().default(10)
});

const CollectionQuerySchema = z.object({
  collection: z.string().min(1, 'Collection name cannot be empty'),
  queryTexts: z.array(z.string().min(1)).min(1, 'At least one query text required'),
  nResults: z.number().int().min(1).max(100).optional().default(10),
  where: z.record(z.unknown()).optional(),
  whereDocument: z.record(z.unknown()).optional(),
  include: z.array(z.enum(['documents', 'metadatas', 'distances', 'embeddings'])).optional()
});

const CollectionGetSchema = z.object({
  collection: z.string().min(1, 'Collection name cannot be empty'),
  ids: z.array(z.string().min(1)).optional(),
  where: z.record(z.unknown()).optional(),
  whereDocument: z.record(z.unknown()).optional(),
  limit: z.number().int().min(1).max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
  include: z.array(z.enum(['documents', 'metadatas', 'distances', 'embeddings'])).optional()
});

const DescribeCollectionSchema = z.object({
  name: z.string().min(1, 'Collection name cannot be empty')
});

const RecommendCollectionSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty')
});

// Initialize logger (async)
await initializeLogger();
const logger = createLogger('server');

// Validate required environment variables at startup
const requiredEnvVars = ['CHROMA_API_KEY', 'CHROMA_TENANT', 'GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error(
    `Failed to start RAG server: Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
  logger.error('Please set the following environment variables:');
  logger.error('  - CHROMA_API_KEY: API key for Chroma Cloud');
  logger.error('  - CHROMA_TENANT: Tenant name for Chroma Cloud');
  logger.error('  - GEMINI_API_KEY: Google Gemini API key for AI-powered collection discovery');
  process.exit(1);
}

// Initialize services
const chromaClient = new ChromaClientService();
const cache = new CacheService();
const geminiClient = new GeminiClientService();
const security = new SecurityMiddleware();

// Initialize MCP Server
const mcpServer = new McpServer({
  name: 'midnight-rag',
  version: '1.0.0',
  description: 'pod network RAG Knowledge Base - Read-only vector database queries'
});

// Register MCP Tools

/**
 * Tool: get_collection
 * Get metadata for a single collection
 */
mcpServer.tool(
  'get_collection',
  'Get metadata for a single collection by name',
  {
    name: {
      type: 'string',
      description: 'Name of the collection'
    }
  },
  async (args: any) => {
    const { name } = GetCollectionSchema.parse(args);
    const cacheKey = cache.generateKey('get_collection', name);
    const cached = cache.get<CollectionInfo>(cacheKey);

    if (cached) {
      return {
        content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }]
      };
    }

    const collection = await chromaClient.getCollection(name);
    const info: CollectionInfo = {
      id: collection.id,
      name: collection.name,
      metadata: collection.metadata || {}
    };

    cache.set(cacheKey, info, CacheService.getTTLForOperation('get_collection'));

    return {
      content: [{ type: 'text', text: JSON.stringify(info, null, 2) }]
    };
  }
);

/**
 * Tool: get_collections
 * Get metadata for multiple collections
 */
mcpServer.tool(
  'get_collections',
  'Get metadata for multiple collections by names',
  {
    names: {
      type: 'array',
      description: 'Array of collection names',
      items: { type: 'string' }
    }
  },
  async (args: any) => {
    const { names } = GetCollectionsSchema.parse(args);
    const collections = await chromaClient.getCollections(names);
    const infos: CollectionInfo[] = collections.map(col => ({
      id: col.id,
      name: col.name,
      metadata: col.metadata || {}
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(infos, null, 2) }]
    };
  }
);

/**
 * Tool: list_collections
 * List all available collections
 */
mcpServer.tool(
  'list_collections',
  'List all available collections in the database',
  {},
  async () => {
    const cacheKey = cache.generateKey('list_collections', 'all');
    const cached = cache.get<CollectionInfo[]>(cacheKey);

    if (cached) {
      return {
        content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }]
      };
    }

    const collections = await chromaClient.listCollections();
    cache.set(cacheKey, collections, CacheService.getTTLForOperation('list_collections'));

    return {
      content: [{ type: 'text', text: JSON.stringify(collections, null, 2) }]
    };
  }
);

/**
 * Tool: collection_count
 * Get the count of documents in a collection
 */
mcpServer.tool(
  'collection_count',
  'Get the number of documents in a collection',
  {
    collection: {
      type: 'string',
      description: 'Name of the collection'
    }
  },
  async (args: any) => {
    const { collection } = CollectionCountSchema.parse(args);
    const cacheKey = cache.generateKey('count', collection);
    const cached = cache.get<number>(cacheKey);

    if (cached !== undefined) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ count: cached }, null, 2) }]
      };
    }

    const count = await chromaClient.getCount(collection);
    cache.set(cacheKey, count, CacheService.getTTLForOperation('count'));

    return {
      content: [{ type: 'text', text: JSON.stringify({ count }, null, 2) }]
    };
  }
);

/**
 * Tool: collection_peek
 * Peek at sample documents from a collection
 */
mcpServer.tool(
  'collection_peek',
  'Get sample documents from a collection',
  {
    collection: {
      type: 'string',
      description: 'Name of the collection'
    },
    limit: {
      type: 'number',
      description: 'Number of documents to return (default: 10, max: 100)',
      optional: true
    }
  },
  async (args: any) => {
    const { collection, limit } = CollectionPeekSchema.parse(args);
    const cacheKey = cache.generateKey('peek', collection, { limit });
    const cached = cache.get<ChromaGetResult>(cacheKey);

    if (cached) {
      return {
        content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }]
      };
    }

    const result = await chromaClient.peek(collection, limit);
    cache.set(cacheKey, result, CacheService.getTTLForOperation('peek'));

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

/**
 * Tool: collection_query
 * Query collection with vector similarity search
 */
mcpServer.tool(
  'collection_query',
  'Search for similar documents using vector similarity',
  {
    collection: {
      type: 'string',
      description: 'Name of the collection to query'
    },
    queryTexts: {
      type: 'array',
      description: 'Array of query texts to search for',
      items: { type: 'string' }
    },
    nResults: {
      type: 'number',
      description: 'Number of results to return per query (default: 10, max: 100)',
      optional: true
    },
    where: {
      type: 'object',
      description: 'Metadata filter conditions',
      optional: true
    },
    whereDocument: {
      type: 'object',
      description: 'Document content filter conditions',
      optional: true
    },
    include: {
      type: 'array',
      description: 'Fields to include in results (documents, metadatas, distances, embeddings)',
      items: { type: 'string' },
      optional: true
    }
  },
  async (args: any) => {
    const params = CollectionQuerySchema.parse(args);
    const { collection, ...queryParams } = params;

    const cacheKey = cache.generateKey('query', collection, queryParams);
    const cached = cache.get<ChromaQueryResult>(cacheKey);

    if (cached) {
      return {
        content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }]
      };
    }

    const result = await chromaClient.query(collection, queryParams);
    cache.set(cacheKey, result, CacheService.getTTLForOperation('query'));

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

/**
 * Tool: collection_get
 * Get documents by ID or filter
 */
mcpServer.tool(
  'collection_get',
  'Get documents from a collection by ID or filter',
  {
    collection: {
      type: 'string',
      description: 'Name of the collection'
    },
    ids: {
      type: 'array',
      description: 'Array of document IDs to retrieve',
      items: { type: 'string' },
      optional: true
    },
    where: {
      type: 'object',
      description: 'Metadata filter conditions',
      optional: true
    },
    whereDocument: {
      type: 'object',
      description: 'Document content filter conditions',
      optional: true
    },
    limit: {
      type: 'number',
      description: 'Maximum number of documents to return (max: 100)',
      optional: true
    },
    offset: {
      type: 'number',
      description: 'Number of documents to skip',
      optional: true
    },
    include: {
      type: 'array',
      description: 'Fields to include in results (documents, metadatas, embeddings)',
      items: { type: 'string' },
      optional: true
    }
  },
  async (args: any) => {
    const params = CollectionGetSchema.parse(args);
    const { collection, ...getParams } = params;

    const cacheKey = cache.generateKey('get', collection, getParams);
    const cached = cache.get<ChromaGetResult>(cacheKey);

    if (cached) {
      return {
        content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }]
      };
    }

    const result = await chromaClient.get(collection, getParams);
    cache.set(cacheKey, result, CacheService.getTTLForOperation('get'));

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

/**
 * Tool: describe_collection
 * Generate AI-powered description of a collection's contents
 */
mcpServer.tool(
  'describe_collection',
  'Generate AI-powered description of a collection including content summary, data characteristics, recommended use cases, and example queries',
  {
    name: {
      type: 'string',
      description: 'Name of the collection to describe'
    }
  },
  async (args: any) => {
    const { name } = DescribeCollectionSchema.parse(args);

    // T018: Check cache for existing description (7-day TTL)
    const cacheKey = generateGeminiCacheKey('describe', name);
    const cached = cache.get<CollectionDescription>(cacheKey);

    if (cached) {
      logger.info('describe_collection cache hit', { collection: name });
      return {
        content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }]
      };
    }

    logger.info('describe_collection cache miss', { collection: name });

    try {
      // T023: Check if collection exists
      const collection = await chromaClient.getCollection(name);

      // T019: Check if collection is empty
      const count = await collection.count();

      if (count === 0) {
        // Return empty description without LLM call
        const emptyDescription: CollectionDescription = {
          collectionName: name,
          summary: 'This collection exists but contains no documents yet.',
          dataCharacteristics: [],
          recommendedUseCases: [],
          exampleQueries: [],
          documentCount: 0,
          metadata: collection.metadata || {},
          isEmpty: true,
          generatedAt: new Date().toISOString(),
          cachedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };

        // Cache the empty description
        const ttl = CacheService.getTTLForOperation('describe_collection');
        cache.set(cacheKey, emptyDescription, ttl);

        logger.info('describe_collection returned empty collection description', {
          collection: name
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(emptyDescription, null, 2) }]
        };
      }

      // T020: Peek collection (10-20 docs)
      const peekLimit = Math.min(count, 10); // Use 10 docs for peek
      const peek = await collection.peek({ limit: peekLimit });

      // T021: Call Gemini API with validation failure handling
      try {
        const description = await geminiClient.describeCollection({
          collectionName: name,
          peek: peek.documents || [],
          metadata: collection.metadata || {},
          documentCount: count
        });

        // Cache and return successful description
        const ttl = CacheService.getTTLForOperation('describe_collection');
        cache.set(cacheKey, description, ttl);

        logger.info('describe_collection generated successfully', {
          collection: name,
          documentCount: count
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(description, null, 2) }]
        };
      } catch (validationError) {
        // T021: Validation failure handling
        logger.warning('describe_collection validation failed, checking for cached fallback', {
          collection: name,
          error:
            validationError instanceof Error ? validationError.message : String(validationError)
        });

        // Check if we have a cached fallback
        const cachedFallback = cache.get<CollectionDescription>(cacheKey);
        if (cachedFallback) {
          logger.info('describe_collection returning cached fallback after validation failure', {
            collection: name
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(cachedFallback, null, 2) }]
          };
        }

        // No cache fallback available, return generic error (T023)
        throw new Error('Unable to generate description. Please try again later.');
      }
    } catch (error) {
      // T023: Error handling for collection not found, rate limits, and service errors
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('describe_collection failed', {
        collection: name,
        error: errorMessage
      });

      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        throw new Error(`Collection '${name}' not found`);
      }

      throw error;
    }
  }
);

/**
 * Tool: recommend_collection
 * Rank collections by suitability for a query and return top 3 recommendations
 */
mcpServer.tool(
  'recommend_collection',
  'Rank all available collections by suitability for a given query and return the top 3 most relevant collections',
  {
    query: {
      type: 'string',
      description: 'Query to find suitable collections for'
    }
  },
  async (args: any) => {
    const { query } = RecommendCollectionSchema.parse(args);

    // T035: Check cache for existing recommendations (7-day TTL)
    const cacheKey = generateGeminiCacheKey('recommend', query);
    const cached = cache.get<CollectionRecommendation>(cacheKey);

    if (cached) {
      logger.info('recommend_collection cache hit', { query });
      return {
        content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }]
      };
    }

    logger.info('recommend_collection cache miss', { query });

    try {
      // T036: Get all collections from ChromaDB
      const allCollections = await chromaClient.listCollections();

      // T036: For each collection, retrieve or generate description (reuse cached when available)
      const collectionDescriptions: Array<{
        name: string;
        summary: string;
        recommendedUseCases: string[];
      }> = [];

      for (const collectionInfo of allCollections) {
        const collectionName = collectionInfo.name;
        const describeKey = generateGeminiCacheKey('describe', collectionName);

        // Try to get cached description first
        let description = cache.get<CollectionDescription>(describeKey);

        if (!description) {
          // No cached description available, generate one
          logger.info('recommend_collection triggering describe for collection', {
            collection: collectionName,
            query
          });

          try {
            const collection = await chromaClient.getCollection(collectionName);
            const count = await collection.count();

            if (count === 0) {
              // Skip empty collections for recommendations
              logger.info('recommend_collection skipping empty collection', {
                collection: collectionName
              });
              continue;
            }

            // Peek and describe
            const peekLimit = Math.min(count, 10);
            const peek = await collection.peek({ limit: peekLimit });

            description = await geminiClient.describeCollection({
              collectionName,
              peek: peek.documents || [],
              metadata: collection.metadata || {},
              documentCount: count
            });

            // Cache the generated description
            const ttl = CacheService.getTTLForOperation('describe_collection');
            cache.set(describeKey, description, ttl);
          } catch (describeError) {
            logger.warning('recommend_collection failed to describe collection, skipping', {
              collection: collectionName,
              error: describeError instanceof Error ? describeError.message : String(describeError)
            });
            continue;
          }
        }

        // Add to collection descriptions for ranking
        collectionDescriptions.push({
          name: description.collectionName,
          summary: description.summary,
          recommendedUseCases: description.recommendedUseCases
        });
      }

      // Check if we have any collections to recommend
      if (collectionDescriptions.length === 0) {
        throw new Error('No collections available for recommendations');
      }

      // T037: Call Gemini API to rank collections with validation failure handling
      try {
        const recommendation = await geminiClient.recommendCollections({
          query,
          collectionDescriptions
        });

        // Cache and return successful recommendation
        const ttl = CacheService.getTTLForOperation('recommend_collection');
        cache.set(cacheKey, recommendation, ttl);

        logger.info('recommend_collection generated successfully', {
          query,
          recommendationCount: recommendation.recommendations.length
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(recommendation, null, 2) }]
        };
      } catch (validationError) {
        // T037: Validation failure handling
        logger.warning('recommend_collection validation failed, checking for cached fallback', {
          query,
          error:
            validationError instanceof Error ? validationError.message : String(validationError)
        });

        // Check if we have a cached fallback
        const cachedFallback = cache.get<CollectionRecommendation>(cacheKey);
        if (cachedFallback) {
          logger.info('recommend_collection returning cached fallback after validation failure', {
            query
          });
          return {
            content: [{ type: 'text', text: JSON.stringify(cachedFallback, null, 2) }]
          };
        }

        // No cache fallback available, return generic error (T039)
        throw new Error('Unable to generate recommendations. Please try again later.');
      }
    } catch (error) {
      // T039: Error handling for empty query, rate limits, and service errors
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('recommend_collection failed', {
        query,
        error: errorMessage
      });

      throw error;
    }
  }
);

// Initialize Express app
const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(security.limitRequestSize());
app.use(security.enforceReadOnly());

// Apply general rate limiting to all routes
app.use(RateLimiterMiddleware.createGeneralLimiter());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const stats = cache.getStats();
  const totalHitsMisses = stats.hits + stats.misses;
  const memoryUsageMB = (stats.vsize / (1024 * 1024)).toFixed(2);

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: {
      keys: stats.keys,
      hits: stats.hits,
      misses: stats.misses,
      hitRate:
        totalHitsMisses > 0 ? ((stats.hits / totalHitsMisses) * 100).toFixed(2) + '%' : 'N/A',
      memoryUsageMB: parseFloat(memoryUsageMB)
    },
    gemini: {
      model: 'gemini-1.5-flash',
      cacheEnabled: true,
      cacheDays: 7
    }
  });
});

// Simple REST endpoint for querying (for easier client integration)
app.post('/api/query', async (req: Request, res: Response) => {
  try {
    const { collection, queryTexts, nResults = 10, include } = req.body;

    if (!collection || !queryTexts || !Array.isArray(queryTexts)) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'Request must include collection and queryTexts array'
      });
      return;
    }

    const result = await chromaClient.query(collection, {
      queryTexts,
      nResults,
      include: include || ['documents', 'metadatas', 'distances']
    });

    res.json(result);
  } catch (error) {
    logger.error('API query failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      error: 'Query failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List collections endpoint
app.get('/api/collections', async (_req: Request, res: Response) => {
  try {
    const collections = await chromaClient.listCollections();
    res.json({ collections });
  } catch (error) {
    logger.error(
      'API list collections failed',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({
      error: 'Failed to list collections',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// MCP endpoint (stateless mode)
// Note: Using stateless mode with per-request connection to avoid session state
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined // Stateless mode
    });

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res);

    // Clean up resources when response closes
    res.on('close', () => {
      transport.close();
    });
  } catch (error) {
    logger.error('MCP request failed', error instanceof Error ? error : new Error(String(error)));
    if (!res.headersSent) {
      res.status(500).json({ error: 'MCP request failed' });
    }
  }
});

// Cache management endpoints (for debugging/monitoring)
app.get('/cache/stats', (_req: Request, res: Response) => {
  res.json(cache.getStats());
});

app.post('/cache/clear', (_req: Request, res: Response) => {
  cache.clear();
  res.json({ message: 'Cache cleared successfully' });
});

// Error handling
app.use(security.errorHandler());

// Start server
const httpServer = app.listen(port, () => {
  logger.info('pod network RAG MCP Server started', {
    status: 'running',
    port,
    database: process.env.CHROMA_DATABASE || 'pod',
    environment: process.env.NODE_ENV || 'development',
    endpoints: ['/mcp', '/health', '/cache/stats'],
    toolsAvailable: 8
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal} signal, closing HTTP server`, { signal });
  httpServer.close(err => {
    if (err) {
      logger.error('Error closing server', { error: err });
      process.exit(1);
    }
    logger.info('HTTP server closed successfully');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after 10 second timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

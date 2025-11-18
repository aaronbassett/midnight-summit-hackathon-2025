/**
 * Chroma Cloud Client Service
 *
 * Read-only wrapper around ChromaDB client.
 * Enforces security and provides a clean interface for querying Chroma Cloud.
 */

import { CloudClient, Collection, IncludeEnum, type EmbeddingFunction } from 'chromadb';
import { z } from 'zod';
import type {
  ChromaQueryParams,
  ChromaGetParams,
  ChromaQueryResult,
  ChromaGetResult,
  CollectionInfo
} from '../types/index.js';

/**
 * Validation schemas for Chroma Cloud parameters
 */
const IncludeEnum_Schema = z.enum(['documents', 'embeddings', 'metadatas', 'distances']);

const ChromaQueryParams_Schema = z.object({
  queryTexts: z.array(z.string()),
  nResults: z.number().int().positive().optional(),
  where: z.record(z.unknown()).optional(),
  whereDocument: z.record(z.unknown()).optional(),
  include: z.array(IncludeEnum_Schema).optional()
});

const ChromaGetParams_Schema = z.object({
  ids: z.array(z.string()).optional(),
  where: z.record(z.unknown()).optional(),
  whereDocument: z.record(z.unknown()).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  include: z.array(IncludeEnum_Schema).optional()
});

/**
 * Read-only embedding function for querying collections
 * We never add/update documents, so this function should never be called
 */
class ReadOnlyEmbeddingFunction implements EmbeddingFunction {
  async generate(_texts: string[]): Promise<number[][]> {
    throw new Error('Read-only server cannot generate embeddings');
  }
}

/**
 * Cache entry for collections with timestamp
 */
interface CacheEntry {
  collection: Collection;
  timestamp: number;
}

export class ChromaClientService {
  private client: CloudClient;
  private readonly database: string;
  private collectionCache: Map<string, CacheEntry>;
  private readonly embeddingFunction: EmbeddingFunction;
  private readonly cacheTTLMs: number; // Cache TTL in milliseconds (default: 10 minutes)

  constructor() {
    const apiKey = process.env.CHROMA_API_KEY;
    const tenant = process.env.CHROMA_TENANT;

    if (!apiKey) {
      throw new Error('CHROMA_API_KEY environment variable is required');
    }

    if (!tenant) {
      throw new Error('CHROMA_TENANT environment variable is required');
    }

    this.database = process.env.CHROMA_DATABASE || 'pod';
    this.client = new CloudClient({
      apiKey,
      tenant,
      database: this.database
    });

    this.collectionCache = new Map();
    this.embeddingFunction = new ReadOnlyEmbeddingFunction();
    // Cache TTL: 10 minutes by default, configurable via environment variable
    this.cacheTTLMs = parseInt(process.env.COLLECTION_CACHE_TTL_MS || '600000', 10);
  }

  /**
   * Check if a cache entry is still valid based on TTL
   */
  private isCacheValid(entry: CacheEntry): boolean {
    const ageMs = Date.now() - entry.timestamp;
    return ageMs < this.cacheTTLMs;
  }

  /**
   * Get a single collection by name
   */
  async getCollection(name: string): Promise<Collection> {
    // Check cache with TTL validation
    if (this.collectionCache.has(name)) {
      const entry = this.collectionCache.get(name)!;
      if (this.isCacheValid(entry)) {
        return entry.collection;
      }
      // Cache entry expired, remove it
      this.collectionCache.delete(name);
    }

    // Fetch from Chroma Cloud
    try {
      const collection = await this.client.getCollection({
        name,
        embeddingFunction: this.embeddingFunction
      });
      // Store with timestamp
      this.collectionCache.set(name, {
        collection,
        timestamp: Date.now()
      });
      return collection;
    } catch (error) {
      throw new Error(
        `Collection '${name}' not found in database '${this.database}': ${(error as Error).message}`
      );
    }
  }

  /**
   * Get multiple collections by name
   */
  async getCollections(names: string[]): Promise<Collection[]> {
    return Promise.all(names.map(name => this.getCollection(name)));
  }

  /**
   * List all available collections
   */
  async listCollections(): Promise<CollectionInfo[]> {
    const collections = await this.client.listCollections();

    return collections.map(col => ({
      id: col.id,
      name: col.name,
      metadata: col.metadata || {}
    }));
  }

  /**
   * Get the count of documents in a collection
   */
  async getCount(collectionName: string): Promise<number> {
    const collection = await this.getCollection(collectionName);
    return collection.count();
  }

  /**
   * Peek at sample documents from a collection
   */
  async peek(collectionName: string, limit: number = 10): Promise<ChromaGetResult> {
    const collection = await this.getCollection(collectionName);
    const result = await collection.peek({ limit });

    return {
      ids: result.ids,
      embeddings: result.embeddings,
      documents: result.documents,
      metadatas: result.metadatas
    };
  }

  /**
   * Query collection with vector similarity search
   */
  async query(collectionName: string, params: ChromaQueryParams): Promise<ChromaQueryResult> {
    // Validate input parameters
    const validatedParams = ChromaQueryParams_Schema.parse(params);

    const collection = await this.getCollection(collectionName);

    // Convert include field values to IncludeEnum
    const INCLUDE_MAP: Record<string, IncludeEnum> = {
      documents: IncludeEnum.documents,
      embeddings: IncludeEnum.embeddings,
      metadatas: IncludeEnum.metadatas,
      distances: IncludeEnum.distances
    };

    const includeEnum = validatedParams.include
      ? validatedParams.include.map(i => {
          const key = i.toLowerCase();
          const value = INCLUDE_MAP[key];
          if (!value) {
            throw new Error(`Invalid include value: ${i}`);
          }
          return value;
        })
      : [IncludeEnum.documents, IncludeEnum.metadatas, IncludeEnum.distances];

    const result = await collection.query({
      queryTexts: validatedParams.queryTexts,
      nResults: validatedParams.nResults,
      where: validatedParams.where as any,
      whereDocument: validatedParams.whereDocument as any,
      include: includeEnum
    });

    return {
      ids: result.ids,
      embeddings: result.embeddings as number[][][] | null,
      documents: result.documents,
      metadatas: result.metadatas,
      distances: result.distances as number[][] | null
    };
  }

  /**
   * Get documents by ID or filter
   */
  async get(collectionName: string, params: ChromaGetParams): Promise<ChromaGetResult> {
    // Validate input parameters
    const validatedParams = ChromaGetParams_Schema.parse(params);

    const collection = await this.getCollection(collectionName);

    // Convert include field values to IncludeEnum
    const INCLUDE_MAP: Record<string, IncludeEnum> = {
      documents: IncludeEnum.documents,
      embeddings: IncludeEnum.embeddings,
      metadatas: IncludeEnum.metadatas,
      distances: IncludeEnum.distances
    };

    const includeEnum = validatedParams.include
      ? validatedParams.include.map(i => {
          const key = i.toLowerCase();
          const value = INCLUDE_MAP[key];
          if (!value) {
            throw new Error(`Invalid include value: ${i}`);
          }
          return value;
        })
      : [IncludeEnum.documents, IncludeEnum.metadatas];

    const result = await collection.get({
      ids: validatedParams.ids,
      where: validatedParams.where as any,
      whereDocument: validatedParams.whereDocument as any,
      limit: validatedParams.limit,
      offset: validatedParams.offset,
      include: includeEnum
    });

    return {
      ids: result.ids,
      embeddings: result.embeddings,
      documents: result.documents,
      metadatas: result.metadatas
    };
  }

  /**
   * Clear the collection cache (useful for testing or after long periods)
   */
  clearCache(): void {
    this.collectionCache.clear();
  }

  /**
   * Validate collection name to prevent injection
   */
  static validateCollectionName(name: string): boolean {
    // Collection names should be alphanumeric with hyphens/underscores
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(name) && name.length > 0 && name.length <= 100;
  }
}

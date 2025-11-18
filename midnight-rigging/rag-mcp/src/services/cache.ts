/**
 * Cache Service
 *
 * In-memory caching for query results to reduce Chroma Cloud API calls.
 * Uses LRU eviction and TTL-based expiration.
 */

import NodeCache from 'node-cache';
import { createHash } from 'node:crypto';
import { getLogger } from '@logtape/logtape';

const logger = getLogger('cache');

export class CacheService {
  private cache: NodeCache;
  private readonly defaultTTL: number;
  private readonly maxSize: number;

  constructor() {
    this.defaultTTL = parseInt(process.env.CACHE_TTL_SECONDS || '300', 10); // 5 minutes
    this.maxSize = parseInt(process.env.CACHE_MAX_SIZE_MB || '100', 10);

    this.cache = new NodeCache({
      stdTTL: this.defaultTTL,
      checkperiod: 60, // Check for expired keys every 60 seconds
      useClones: true, // Clone objects to prevent accidental mutation of cached data
      deleteOnExpire: true
    });

    // Log cache stats periodically
    this.cache.on('expired', (key: string) => {
      logger.debug('Cache entry expired', { key });
    });
  }

  /**
   * Generate a cache key from method, collection, and parameters
   */
  generateKey(method: string, collection: string, params?: unknown): string {
    const paramsHash = params ? this.hashObject(params) : '';
    return `${method}:${collection}:${paramsHash}`;
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      logger.debug('Cache hit', { key });
    }
    return value;
  }

  /**
   * Set a value in the cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    // Check size before adding (approximate)
    const sizeEstimate = this.estimateSize(value);
    if (sizeEstimate > this.maxSize * 1024 * 1024) {
      logger.warn('Value too large for cache', { key, sizeBytes: sizeEstimate });
      return false;
    }

    const success = this.cache.set(key, value, ttl || this.defaultTTL);
    if (success) {
      logger.debug('Cache entry set', { key, ttlSeconds: ttl || this.defaultTTL });
    }
    return success;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.flushAll();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  } {
    return this.cache.getStats();
  }

  /**
   * Hash an object to create a deterministic cache key
   * Handles nested objects and arrays by sorting arrays for consistent hashing
   */
  private hashObject(obj: unknown): string {
    // Normalize the object by sorting arrays and keys
    const normalized = this.normalizeForHashing(obj);
    const sortedJson = JSON.stringify(normalized, Object.keys(normalized as object).sort());
    return createHash('md5').update(sortedJson).digest('hex').substring(0, 16);
  }

  /**
   * Normalize an object for consistent hashing by sorting arrays
   */
  private normalizeForHashing(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      // Sort arrays to ensure consistent hashing regardless of order
      return obj
        .map(item => this.normalizeForHashing(item))
        .sort((a, b) => {
          const aStr = JSON.stringify(a);
          const bStr = JSON.stringify(b);
          return aStr.localeCompare(bStr);
        });
    } else if (obj !== null && typeof obj === 'object') {
      // Recursively normalize nested objects
      const normalized: Record<string, unknown> = {};
      for (const key of Object.keys(obj as object).sort()) {
        normalized[key] = this.normalizeForHashing((obj as Record<string, unknown>)[key]);
      }
      return normalized;
    }
    return obj;
  }

  /**
   * Estimate the size of a value in bytes (rough approximation)
   */
  private estimateSize(value: unknown): number {
    const jsonString = JSON.stringify(value);
    return Buffer.byteLength(jsonString, 'utf8');
  }

  /**
   * Get TTL configurations for different operation types
   */
  static getTTLForOperation(operation: string): number {
    const ttls: Record<string, number> = {
      query: 300, // 5 minutes - queries are most frequently repeated
      get: 300, // 5 minutes
      peek: 600, // 10 minutes - sample data changes less
      count: 3600, // 1 hour - counts change infrequently
      list_collections: 3600, // 1 hour - collection list rarely changes
      get_collection: 3600, // 1 hour - collection metadata rarely changes
      describe_collection: 604800, // 7 days - collection descriptions stable
      recommend_collection: 604800 // 7 days - query recommendations stable
    };

    return ttls[operation] || 300;
  }
}

/**
 * Generate a normalized cache key for Gemini API calls
 * Handles case normalization and whitespace collapsing for better cache hit rates
 */
export function generateGeminiCacheKey(type: 'describe' | 'recommend', input: string): string {
  // Normalize: lowercase, trim, collapse whitespace
  const normalized = input.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${type}:${normalized}`;
}

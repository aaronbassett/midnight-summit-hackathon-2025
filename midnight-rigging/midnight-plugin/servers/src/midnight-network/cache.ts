import { LRUCache } from 'lru-cache';
import { createLogger } from './logger.js';

const logger = createLogger('cache');

/**
 * FR-069: Generate deterministic cache key from tool name and parameters
 * Format: {tool_name}:{serialized_params}
 */
export function generateCacheKey(toolName: string, params: any): string {
  if (params === undefined || params === null) {
    return toolName;
  }

  // For simple types (string, number, boolean), use direct serialization
  if (typeof params !== 'object') {
    return `${toolName}:${String(params)}`;
  }

  // For objects/arrays, use JSON.stringify with sorted keys for deterministic output
  const serialized = JSON.stringify(params, Object.keys(params).sort());
  return `${toolName}:${serialized}`;
}

/**
 * Configuration for different cache categories.
 * ttl: Time to live in milliseconds. 0 means infinite.
 * max: Maximum number of items in the cache.
 */
const CACHE_CONFIGS = {
  transactions: { max: 1000, ttl: 0 }, // Confirmed transactions: immutable, infinite TTL
  balances: { max: 500, ttl: 10 * 1000 }, // Account balances: 10s TTL
  tokens: { max: 500, ttl: 30 * 1000 }, // Token balances: 30s TTL
  networkStats: { max: 1, ttl: 5 * 1000 }, // Network stats: 5s TTL
  contracts: { max: 200, ttl: 0 }, // Contract metadata: immutable, infinite TTL
  logs: { max: 1000, ttl: 30 * 1000 } // Historical logs: 30s TTL
};

export type CacheCategory = keyof typeof CACHE_CONFIGS;

/**
 * Wrapper for cached values to track staleness
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class CacheManager {
  private caches: Map<CacheCategory, LRUCache<string, CacheEntry<any>>>;
  private hits = 0;
  private misses = 0;
  private staleHits = 0;

  constructor() {
    this.caches = new Map();
    for (const key in CACHE_CONFIGS) {
      const category = key as CacheCategory;
      const config = CACHE_CONFIGS[category];
      // Note: We don't set TTL on LRUCache itself, as we manage staleness manually
      // This allows us to return stale data when fresh data is unavailable
      this.caches.set(
        category,
        new LRUCache({
          max: config.max,
          updateAgeOnGet: false
        })
      );
      logger.debug('cache_initialized', { category, config });
    }
  }

  /**
   * Retrieves an item from the cache if it is still fresh (within TTL).
   * @param category The category of the cache to use.
   * @param key The key of the item to retrieve.
   * @returns The cached value if fresh, undefined otherwise
   */
  get<T = any>(category: CacheCategory, key: string): T | undefined {
    const cache = this.caches.get(category);
    if (!cache) {
      logger.warning('cache_category_not_found', { category });
      return undefined;
    }

    const entry = cache.get(key);
    if (entry !== undefined) {
      const config = CACHE_CONFIGS[category];
      const age = Date.now() - entry.timestamp;

      // Check if entry is still fresh (0 TTL means infinite/never stale)
      if (config.ttl === 0 || age < config.ttl) {
        this.hits++;
        logger.debug('cache_hit', { category, key, age });
        return entry.value as T;
      }

      // Entry exists but is stale
      logger.debug('cache_stale', { category, key, age, ttl: config.ttl });
    }

    this.misses++;
    logger.debug('cache_miss', { category, key });
    return undefined;
  }

  /**
   * Retrieves an item from the cache even if it is stale.
   * Used as fallback when network is unavailable.
   * @param category The category of the cache to use.
   * @param key The key of the item to retrieve.
   * @returns An object with the value (if exists) and staleness information
   */
  getStale<T = any>(
    category: CacheCategory,
    key: string
  ): { value: T; isStale: boolean; age: number } | undefined {
    const cache = this.caches.get(category);
    if (!cache) {
      throw new Error(`Invalid cache category: ${category}`);
    }

    const entry = cache.get(key);
    if (entry === undefined) {
      return undefined;
    }

    const config = CACHE_CONFIGS[category];
    const age = Date.now() - entry.timestamp;
    const isStale = config.ttl > 0 && age >= config.ttl;

    if (isStale) {
      this.staleHits++;
      logger.warning('cache_stale_hit', { category, key, age, ttl: config.ttl });
    } else {
      this.hits++;
      logger.debug('cache_hit', { category, key, age });
    }

    return {
      value: entry.value as T,
      isStale,
      age
    };
  }

  /**
   * Adds or updates an item in the cache.
   * The TTL is determined by the category's configuration.
   * @param category The category of the cache to use.
   * @param key The key of the item to set.
   * @param value The value to store.
   */
  set<T = any>(category: CacheCategory, key: string, value: T): void {
    const cache = this.caches.get(category);
    if (!cache) {
      throw new Error(`Invalid cache category: ${category}`);
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now()
    };

    cache.set(key, entry);
    logger.debug('cache_set', { category, key });
  }

  /**
   * Returns aggregated statistics for all cache instances.
   */
  getStats() {
    const total = this.hits + this.misses + this.staleHits;
    const size = Array.from(this.caches.values()).reduce((acc, cache) => acc + cache.size, 0);

    return {
      hits: this.hits,
      staleHits: this.staleHits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits + this.staleHits) / total : 0,
      size,
      categories: Object.fromEntries(
        Array.from(this.caches.entries()).map(([category, cache]) => [
          category,
          {
            size: cache.size,
            max: cache.max,
            ttl: CACHE_CONFIGS[category].ttl
          }
        ])
      )
    };
  }
}

export const cache = new CacheManager();
export { CACHE_CONFIGS };

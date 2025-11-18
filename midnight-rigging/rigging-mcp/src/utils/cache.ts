/**
 * Caching utilities for the rigging-mcp server
 *
 * Note: Skills and agents are cached in the in-memory index built at startup.
 * This module provides caching for computed responses like discovery.
 */

import { DiscoveryResponse } from '../types.js';

/**
 * Cache for discovery response
 * Single cached value, invalidated on index rebuild
 */
let discoveryCache: DiscoveryResponse | null = null;

/**
 * Get cached discovery response
 *
 * @returns Cached discovery response or null if not cached
 */
export function getDiscoveryCache(): DiscoveryResponse | null {
  return discoveryCache;
}

/**
 * Set cached discovery response
 *
 * @param response - Discovery response to cache
 */
export function setDiscoveryCache(response: DiscoveryResponse): void {
  discoveryCache = response;
}

/**
 * Clear all caches (called on index rebuild)
 */
export function clearAllCaches(): void {
  discoveryCache = null;
}

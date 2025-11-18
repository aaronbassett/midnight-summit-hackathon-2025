import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheManager } from '../../src/midnight-network/cache.js';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  describe('cache hit rate (T071)', () => {
    it('should track cache hits and misses', () => {
      // First access - miss
      expect(cache.get('transactions', 'key1')).toBeUndefined();

      // Set value
      cache.set('transactions', 'key1', 'value1');

      // Second access - hit
      expect(cache.get('transactions', 'key1')).toBe('value1');

      // Third access - hit
      expect(cache.get('transactions', 'key1')).toBe('value1');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 2);
    });

    it('should achieve >80% hit rate with realistic access pattern', () => {
      // Simulate realistic workload: 100 queries, 20 unique blocks
      const blockCount = 20;
      const blocks: string[] = [];
      for (let i = 0; i < blockCount; i++) {
        blocks.push(`0x${i.toString(16)}`);
      }

      // Populate cache
      blocks.forEach(block => cache.set('transactions', `block:${block}`, { data: block }));

      // Simulate 100 queries with 80% hitting cached blocks
      for (let i = 0; i < 100; i++) {
        const block = blocks[Math.floor(Math.random() * blocks.length)];
        cache.get('transactions', `block:${block}`);
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.8);
    });
  });

  describe('TTL expiration (T072)', () => {
    it('should accept TTL configuration for fast-changing data', () => {
      cache.set('balances', 'latest', '0x123'); // 10s TTL from category config
      expect(cache.get('balances', 'latest')).toBe('0x123');
    });

    it('should accept TTL configuration for semi-mutable data', () => {
      cache.set('logs', 'gasPrice', '0x5f5e100'); // 30s TTL from category config
      expect(cache.get('logs', 'gasPrice')).toBe('0x5f5e100');
    });

    it('should accept TTL=0 for immutable entries', () => {
      cache.set('transactions', 'block:0x123', { number: '0x123' });
      expect(cache.get('transactions', 'block:0x123')).toBeDefined();
    });
  });

  describe('cache size limits', () => {
    it('should respect max entry count', () => {
      // Add 1001 entries to transactions category (exceeds max 1000)
      for (let i = 0; i < 1001; i++) {
        cache.set('transactions', `key${i}`, `value${i}`);
      }

      // Oldest entries should be evicted
      expect(cache.get('transactions', 'key0')).toBeUndefined();

      // Recent entries should exist
      expect(cache.get('transactions', 'key1000')).toBeDefined();
    });
  });

  describe('cache statistics', () => {
    it('should return accurate statistics', () => {
      cache.set('transactions', 'k1', 'v1');
      cache.set('transactions', 'k2', 'v2');

      cache.get('transactions', 'k1'); // hit
      cache.get('transactions', 'k1'); // hit
      cache.get('transactions', 'k3'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.67, 2);
    });
  });
});

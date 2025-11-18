/**
 * Cache Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CacheService } from './cache.js';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same inputs', () => {
      const key1 = cache.generateKey('query', 'test-collection', { foo: 'bar' });
      const key2 = cache.generateKey('query', 'test-collection', { foo: 'bar' });
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different methods', () => {
      const key1 = cache.generateKey('query', 'test-collection', { foo: 'bar' });
      const key2 = cache.generateKey('get', 'test-collection', { foo: 'bar' });
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different collections', () => {
      const key1 = cache.generateKey('query', 'collection-1', { foo: 'bar' });
      const key2 = cache.generateKey('query', 'collection-2', { foo: 'bar' });
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different params', () => {
      const key1 = cache.generateKey('query', 'test-collection', { foo: 'bar' });
      const key2 = cache.generateKey('query', 'test-collection', { foo: 'baz' });
      expect(key1).not.toBe(key2);
    });

    it('should handle undefined params', () => {
      const key = cache.generateKey('query', 'test-collection');
      expect(key).toBe('query:test-collection:');
    });
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      const key = 'test-key';
      const value = { data: 'test' };

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const retrieved = cache.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should respect custom TTL', async () => {
      const key = 'test-ttl';
      const value = { data: 'test' };

      cache.set(key, value, 1); // 1 second TTL

      // Immediate retrieval should work
      expect(cache.get(key)).toEqual(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should be expired
      expect(cache.get(key)).toBeUndefined();
    });

    it('should not cache values exceeding size limit', () => {
      // Create a large value (> 100 MB default limit)
      const largeValue = { data: 'x'.repeat(101 * 1024 * 1024) };
      const key = 'large-key';

      const success = cache.set(key, largeValue);

      expect(success).toBe(false);
      expect(cache.get(key)).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      const key = 'test-key';
      cache.set(key, { data: 'test' });

      const deleted = cache.delete(key);

      expect(deleted).toBe(1);
      expect(cache.get(key)).toBeUndefined();
    });

    it('should return 0 for non-existent keys', () => {
      const deleted = cache.delete('non-existent');
      expect(deleted).toBe(0);
    });
  });

  describe('clear', () => {
    it('should clear all entries', () => {
      cache.set('key1', { data: '1' });
      cache.set('key2', { data: '2' });
      cache.set('key3', { data: '3' });

      cache.clear();

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      cache.set('key1', { data: '1' });
      cache.set('key2', { data: '2' });

      // Trigger hits and misses
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('non-existent'); // miss

      const stats = cache.getStats();

      expect(stats.keys).toBe(2);
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });
  });

  describe('getTTLForOperation', () => {
    it('should return correct TTL for query operations', () => {
      expect(CacheService.getTTLForOperation('query')).toBe(300);
    });

    it('should return correct TTL for get operations', () => {
      expect(CacheService.getTTLForOperation('get')).toBe(300);
    });

    it('should return correct TTL for peek operations', () => {
      expect(CacheService.getTTLForOperation('peek')).toBe(600);
    });

    it('should return correct TTL for count operations', () => {
      expect(CacheService.getTTLForOperation('count')).toBe(3600);
    });

    it('should return correct TTL for list_collections', () => {
      expect(CacheService.getTTLForOperation('list_collections')).toBe(3600);
    });

    it('should return correct TTL for get_collection', () => {
      expect(CacheService.getTTLForOperation('get_collection')).toBe(3600);
    });

    it('should return default TTL for unknown operations', () => {
      expect(CacheService.getTTLForOperation('unknown')).toBe(300);
    });
  });
});

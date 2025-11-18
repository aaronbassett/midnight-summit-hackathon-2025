/**
 * Chroma Client Service Integration Tests
 *
 * These tests connect to Chroma Cloud API using credentials from .env
 * Requires: CHROMA_API_KEY and CHROMA_DATABASE in environment
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ChromaClientService } from './chroma-client.js';
import type { ChromaQueryParams, ChromaGetParams } from '../types/index.js';

describe('ChromaClientService', () => {
  let client: ChromaClientService;
  let testCollectionName: string;

  beforeAll(async () => {
    // Verify environment variables are set
    if (!process.env.CHROMA_API_KEY) {
      throw new Error('CHROMA_API_KEY environment variable is required for integration tests');
    }

    if (!process.env.CHROMA_TENANT) {
      throw new Error('CHROMA_TENANT environment variable is required for integration tests');
    }

    client = new ChromaClientService();

    // Get first available collection for testing
    const collections = await client.listCollections();
    if (collections.length === 0) {
      throw new Error(
        'No collections found in Chroma Cloud database. Please create a test collection.'
      );
    }

    testCollectionName = collections[0].name;
    console.log(`Using test collection: ${testCollectionName}`);
  });

  describe('constructor', () => {
    it('should throw error if CHROMA_API_KEY is not set', () => {
      const originalKey = process.env.CHROMA_API_KEY;
      delete process.env.CHROMA_API_KEY;

      expect(() => new ChromaClientService()).toThrow(
        'CHROMA_API_KEY environment variable is required'
      );

      process.env.CHROMA_API_KEY = originalKey;
    });

    it('should throw error if CHROMA_TENANT is not set', () => {
      const originalTenant = process.env.CHROMA_TENANT;
      delete process.env.CHROMA_TENANT;

      expect(() => new ChromaClientService()).toThrow(
        'CHROMA_TENANT environment variable is required'
      );

      process.env.CHROMA_TENANT = originalTenant;
    });
  });

  describe('listCollections', () => {
    it('should list all collections', async () => {
      const collections = await client.listCollections();

      expect(Array.isArray(collections)).toBe(true);
      expect(collections.length).toBeGreaterThan(0);

      // Verify collection structure
      const collection = collections[0];
      expect(collection).toHaveProperty('id');
      expect(collection).toHaveProperty('name');
      expect(collection).toHaveProperty('metadata');
      expect(typeof collection.id).toBe('string');
      expect(typeof collection.name).toBe('string');
      expect(typeof collection.metadata).toBe('object');
    });
  });

  describe('getCollection', () => {
    it('should get a collection by name', async () => {
      const collection = await client.getCollection(testCollectionName);

      expect(collection).toBeDefined();
      expect(collection.name).toBe(testCollectionName);
      expect(collection.id).toBeDefined();
    });

    it('should cache collections after first fetch', async () => {
      // Clear cache first
      client.clearCache();

      // First fetch
      const collection1 = await client.getCollection(testCollectionName);

      // Second fetch (should use cache)
      const collection2 = await client.getCollection(testCollectionName);

      expect(collection1).toBe(collection2); // Same instance due to caching
    });

    it('should throw error for non-existent collection', async () => {
      await expect(client.getCollection('non-existent-collection-12345')).rejects.toThrow(
        /not found/i
      );
    });
  });

  describe('getCollections', () => {
    it('should get multiple collections by name', async () => {
      const allCollections = await client.listCollections();
      const names = allCollections.slice(0, 2).map(c => c.name);

      const collections = await client.getCollections(names);

      expect(collections.length).toBe(names.length);
      expect(collections[0].name).toBe(names[0]);
    });
  });

  describe('getCount', () => {
    it('should return document count for collection', async () => {
      const count = await client.getCount(testCollectionName);

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('peek', () => {
    it('should return sample documents', async () => {
      const result = await client.peek(testCollectionName, 5);

      expect(result).toBeDefined();
      expect(Array.isArray(result.ids)).toBe(true);
      expect(Array.isArray(result.documents)).toBe(true);
      expect(Array.isArray(result.metadatas)).toBe(true);

      // Should return at most the requested limit
      expect(result.ids.length).toBeLessThanOrEqual(5);
    });

    it('should respect limit parameter', async () => {
      const result = await client.peek(testCollectionName, 2);

      expect(result.ids.length).toBeLessThanOrEqual(2);
    });

    it('should use default limit of 10', async () => {
      const result = await client.peek(testCollectionName);

      expect(result.ids.length).toBeLessThanOrEqual(10);
    });
  });

  describe('query', () => {
    it.skip('should perform semantic search', async () => {
      const params: ChromaQueryParams = {
        queryTexts: ['blockchain smart contract'],
        nResults: 3
      };

      const result = await client.query(testCollectionName, params);

      expect(result).toBeDefined();
      expect(Array.isArray(result.ids)).toBe(true);
      expect(Array.isArray(result.documents)).toBe(true);
      expect(Array.isArray(result.distances)).toBe(true);

      // Query results are nested arrays (one per query text)
      expect(result.ids.length).toBe(1);
      expect(result.ids[0].length).toBeLessThanOrEqual(3);
    });

    it.skip('should include requested fields', async () => {
      const params: ChromaQueryParams = {
        queryTexts: ['test query'],
        nResults: 2,
        include: ['documents', 'metadatas', 'distances']
      };

      const result = await client.query(testCollectionName, params);

      expect(result.documents).toBeDefined();
      expect(result.metadatas).toBeDefined();
      expect(result.distances).toBeDefined();
    });

    it.skip('should handle multiple query texts', async () => {
      const params: ChromaQueryParams = {
        queryTexts: ['blockchain', 'smart contract'],
        nResults: 2
      };

      const result = await client.query(testCollectionName, params);

      // Should return results for both queries
      expect(result.ids.length).toBe(2);
    });
  });

  describe('get', () => {
    it('should retrieve documents with limit', async () => {
      const params: ChromaGetParams = {
        limit: 5
      };

      const result = await client.get(testCollectionName, params);

      expect(result).toBeDefined();
      expect(Array.isArray(result.ids)).toBe(true);
      expect(Array.isArray(result.documents)).toBe(true);
      expect(result.ids.length).toBeLessThanOrEqual(5);
    });

    it('should retrieve documents by IDs', async () => {
      // First get some IDs
      const peekResult = await client.peek(testCollectionName, 2);
      const ids = peekResult.ids.slice(0, 1);

      const params: ChromaGetParams = {
        ids
      };

      const result = await client.get(testCollectionName, params);

      expect(result.ids).toEqual(ids);
    });

    it('should include requested fields', async () => {
      const params: ChromaGetParams = {
        limit: 3,
        include: ['documents', 'metadatas']
      };

      const result = await client.get(testCollectionName, params);

      expect(result.documents).toBeDefined();
      expect(result.metadatas).toBeDefined();
    });
  });

  describe('validateCollectionName', () => {
    it('should accept valid collection names', () => {
      expect(ChromaClientService.validateCollectionName('valid-collection')).toBe(true);
      expect(ChromaClientService.validateCollectionName('collection_123')).toBe(true);
      expect(ChromaClientService.validateCollectionName('MyCollection')).toBe(true);
    });

    it('should reject invalid collection names', () => {
      expect(ChromaClientService.validateCollectionName('')).toBe(false);
      expect(ChromaClientService.validateCollectionName('invalid name')).toBe(false);
      expect(ChromaClientService.validateCollectionName('invalid/collection')).toBe(false);
      expect(ChromaClientService.validateCollectionName('a'.repeat(101))).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear the collection cache', async () => {
      // Fetch a collection to populate cache
      await client.getCollection(testCollectionName);

      // Clear cache
      client.clearCache();

      // Cache should be empty (we can't directly test this, but we can verify no errors)
      const collection = await client.getCollection(testCollectionName);
      expect(collection).toBeDefined();
    });
  });
});

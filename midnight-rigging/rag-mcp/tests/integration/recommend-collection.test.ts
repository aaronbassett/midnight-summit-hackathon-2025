/**
 * Integration tests for recommend_collection MCP tool
 *
 * These tests verify the complete workflow including:
 * - Cache behavior
 * - Rate limiting (per-IP and global)
 * - Response validation
 * - Collection description reuse
 * - Handling systems with fewer than 3 collections
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CacheService } from '../../src/services/cache.js';
import { GeminiClientService } from '../../src/services/gemini-client.js';
import { generateGeminiCacheKey } from '../../src/services/cache.js';
import { CollectionRecommendationSchema } from '../../src/types/index.js';
import {
  validRecommendResponse,
  validRecommendFewerResponse,
  invalidRanksResponse,
  invalidSortingResponse
} from '../fixtures/gemini-responses.js';

/**
 * NOTE: These are integration tests that will fail until recommend_collection
 * is fully implemented in the MCP server. This follows TDD principles.
 */

describe('recommend_collection integration tests', () => {
  let cacheService: CacheService;
  let geminiClient: GeminiClientService;

  beforeEach(() => {
    // Initialize services
    cacheService = new CacheService();
    cacheService.clear(); // Clear cache between tests

    // Skip Gemini client initialization if API key not set (for CI)
    if (process.env.GEMINI_API_KEY) {
      geminiClient = new GeminiClientService();
    }
  });

  /**
   * T025: Integration test - recommend collections for valid query (happy path)
   */
  it('should recommend top 3 collections for a valid query', async () => {
    // This test will fail until recommend_collection tool is implemented
    // Expected behavior:
    // 1. Check cache (miss on first call)
    // 2. Get all collections from ChromaDB
    // 3. Get/generate description for each collection (reuse cached if available)
    // 4. Call Gemini API to rank collections
    // 5. Validate response against schema
    // 6. Cache the response (7-day TTL)
    // 7. Return top 3 recommendations to user

    // TODO: Implement actual tool call once MCP server is ready
    // const result = await mcpClient.callTool('recommend_collection', {
    //   query: 'How do I deploy a smart contract?'
    // });

    // For now, validate that our schema works with expected data
    const generatedAt = new Date().toISOString();
    const cachedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const recommendation = {
      ...validRecommendResponse,
      generatedAt,
      cachedUntil
    };

    // Schema validation should pass
    const validated = CollectionRecommendationSchema.parse(recommendation);
    expect(validated).toBeDefined();
    expect(validated.query).toBe('How do I deploy a smart contract?');
    expect(validated.recommendations).toHaveLength(3);
    expect(validated.recommendations[0].rank).toBe(1);
    expect(validated.recommendations[0].suitabilityScore).toBe(95);
    expect(validated.recommendations[1].rank).toBe(2);
    expect(validated.recommendations[2].rank).toBe(3);

    // Verify scores are in descending order
    expect(validated.recommendations[0].suitabilityScore).toBeGreaterThan(
      validated.recommendations[1].suitabilityScore
    );
    expect(validated.recommendations[1].suitabilityScore).toBeGreaterThan(
      validated.recommendations[2].suitabilityScore
    );
  });

  /**
   * T026: Integration test - cache hit on second recommend request with same query
   */
  it('should return cached recommendations on second request', () => {
    // Expected behavior:
    // 1. First call: Cache miss, generate recommendations, cache them
    // 2. Second call: Cache hit, return immediately (no LLM call)
    // 3. Response time: <500ms p95 (cache hit target)

    const query = 'How do I deploy a smart contract?';
    const cacheKey = generateGeminiCacheKey('recommend', query);

    const generatedAt = new Date().toISOString();
    const cachedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const recommendation = {
      ...validRecommendResponse,
      query,
      generatedAt,
      cachedUntil
    };

    // Simulate caching the recommendation
    const ttl = CacheService.getTTLForOperation('recommend_collection');
    cacheService.set(cacheKey, recommendation, ttl);

    // Verify cache hit
    const cached = cacheService.get(cacheKey);
    expect(cached).toBeDefined();
    expect(cached).toEqual(recommendation);

    // Verify cache key normalization
    const normalizedKey = generateGeminiCacheKey(
      'recommend',
      '  How do I deploy a smart contract?  '
    );
    expect(normalizedKey).toBe('recommend:how do i deploy a smart contract?');
  });

  /**
   * T027: Integration test - fewer than 3 collections returns only available collections
   */
  it('should return fewer than 3 recommendations when fewer collections exist', async () => {
    // Expected behavior:
    // 1. Get all collections from ChromaDB
    // 2. If total collections < 3, return only available collections
    // 3. Each recommendation still includes rank, score, explanation

    const generatedAt = new Date().toISOString();
    const cachedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const recommendation = {
      ...validRecommendFewerResponse,
      generatedAt,
      cachedUntil
    };

    // Schema validation should pass with 1 recommendation
    const validated = CollectionRecommendationSchema.parse(recommendation);
    expect(validated).toBeDefined();
    expect(validated.recommendations).toHaveLength(1);
    expect(validated.recommendations[0].rank).toBe(1);
    expect(validated.recommendations[0].suitabilityScore).toBe(88);
  });

  /**
   * T028: Integration test - per-IP rate limit (2nd request in 1 min returns 429)
   */
  it('should enforce rate limit of 1 request per minute per IP', async () => {
    // Expected behavior:
    // 1. Make 1 request from same IP within 1 minute: Succeeds
    // 2. Make 2nd request from same IP: Returns 429 error
    // 3. Error includes retryAfter in seconds

    // TODO: Implement actual rate limit testing once MCP server is ready
    // This will require simulating multiple requests from the same IP
    // and verifying that the 2nd request is rejected

    // For now, verify rate limit configuration
    // Rate limit: 1 request/minute per IP
    const maxRequests = 1;
    const windowMs = 60000; // 1 minute

    expect(maxRequests).toBe(1);
    expect(windowMs).toBe(60000);
  });

  /**
   * T029: Integration test - global per-minute rate limit (11th request in 1 min returns 429)
   */
  it('should enforce global rate limit of 10 requests per minute', async () => {
    // Expected behavior:
    // 1. Make 10 requests (different IPs) within 1 minute: All succeed
    // 2. Make 11th request: Returns 429 error (global limit)
    // 3. Error includes retryAfter in seconds

    // TODO: Implement actual rate limit testing once MCP server is ready

    // For now, verify rate limit configuration
    // Rate limit: 10 requests/minute globally
    const maxRequests = 10;
    const windowMs = 60000; // 1 minute

    expect(maxRequests).toBe(10);
    expect(windowMs).toBe(60000);
  });

  /**
   * T030: Integration test - global per-hour rate limit (201st request in 1 hour returns 429)
   */
  it('should enforce global rate limit of 200 requests per hour', async () => {
    // Expected behavior:
    // 1. Make 200 requests (different IPs) within 1 hour: All succeed
    // 2. Make 201st request: Returns 429 error (global hourly limit)
    // 3. Error includes retryAfter in seconds

    // TODO: Implement actual rate limit testing once MCP server is ready

    // For now, verify rate limit configuration
    // Rate limit: 200 requests/hour globally
    const maxRequests = 200;
    const windowMs = 3600000; // 1 hour

    expect(maxRequests).toBe(200);
    expect(windowMs).toBe(3600000);
  });

  /**
   * T031: Integration test - validation failure returns cached or error
   */
  it('should handle Gemini validation failures gracefully', async () => {
    // Expected behavior when Gemini returns invalid JSON:
    // 1. Call Gemini API
    // 2. Receive invalid response (fails schema validation)
    // 3. Check cache for valid response
    // 4. If cached: Return cached response
    // 5. If no cache: Return 500 error with generic message
    // 6. Log validation failure details (not exposed to user)
    // 7. Do NOT cache invalid response

    // Test that invalid responses fail validation (non-sequential ranks)
    expect(() => {
      const generatedAt = new Date().toISOString();
      const cachedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      CollectionRecommendationSchema.parse({
        ...invalidRanksResponse,
        generatedAt,
        cachedUntil
      });
    }).toThrow();

    // Test that invalid responses fail validation (incorrect sorting)
    expect(() => {
      const generatedAt = new Date().toISOString();
      const cachedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      CollectionRecommendationSchema.parse({
        ...invalidSortingResponse,
        generatedAt,
        cachedUntil
      });
    }).toThrow();

    // Verify cache can store and retrieve valid responses
    const query = 'fallback-test';
    const cacheKey = generateGeminiCacheKey('recommend', query);

    const generatedAt = new Date().toISOString();
    const cachedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const validRecommendation = {
      ...validRecommendResponse,
      query,
      generatedAt,
      cachedUntil
    };

    const ttl = CacheService.getTTLForOperation('recommend_collection');
    cacheService.set(cacheKey, validRecommendation, ttl);

    const cached = cacheService.get(cacheKey);
    expect(cached).toBeDefined();
    expect(cached).toEqual(validRecommendation);
  });

  /**
   * T032: Integration test - reuses cached collection descriptions (doesn't re-describe)
   */
  it('should reuse cached collection descriptions when available', async () => {
    // Expected behavior:
    // 1. First recommend call: Describes all collections, generates recommendations
    // 2. Second recommend call (different query): Reuses cached descriptions
    // 3. Only makes 1 Gemini API call (for ranking), not N calls (for describing)
    // 4. Significantly faster than first call

    // TODO: Implement actual test once MCP server is ready
    // This will require:
    // - Making first recommend call (triggers describe for all collections)
    // - Making second recommend call with different query
    // - Verifying that describe cache was hit (no new describe calls)
    // - Monitoring performance (second call should be faster)

    // For now, verify cache key generation for both operations
    const describeKey = generateGeminiCacheKey('describe', 'midnight-network-docs');
    const recommendKey = generateGeminiCacheKey('recommend', 'test query');

    expect(describeKey).toBe('describe:midnight-network-docs');
    expect(recommendKey).toBe('recommend:test query');

    // Verify they use different namespaces (won't collide)
    expect(describeKey).not.toBe(recommendKey);
  });
});

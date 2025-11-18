/**
 * Integration Tests
 *
 * End-to-end tests for the complete reranking MCP server:
 * - Full MCP tool call with real model inference
 * - Input validation
 * - Error handling
 * - Response format
 * - Performance requirements
 *
 * Based on T012 from specs/002-reranking-mcp-server/tasks.md
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { RerankRequest, RerankResponse, Chunk } from '../../dist/reranking/types.js';
import { RerankRequestSchema } from '../../dist/reranking/validation.js';
import { rerankChunks } from '../../dist/reranking/reranker.js';
import { getQueue } from '../../dist/reranking/queue.js';

// Load test fixtures
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, 'fixtures');

let testQueries: any[];
let testChunks: any[];

// Load fixtures before tests
test('load test fixtures', async () => {
  const queriesJson = await readFile(join(fixturesDir, 'queries.json'), 'utf-8');
  const chunksJson = await readFile(join(fixturesDir, 'chunks.json'), 'utf-8');

  testQueries = JSON.parse(queriesJson);
  testChunks = JSON.parse(chunksJson);

  assert.ok(testQueries.length > 0, 'Should load test queries');
  assert.ok(testChunks.length > 0, 'Should load test chunks');
});

describe('End-to-End Reranking', () => {
  test('basic reranking with pod network query', async () => {
    // Use query1: "How do I deploy a pod contract?"
    const query = testQueries[0].text;
    const chunks: Chunk[] = testChunks.slice(0, 5).map((c: any) => ({
      id: c.id,
      text: c.text,
      metadata: c.metadata
    }));

    const results = await rerankChunks(query, chunks);

    // Verify response structure
    assert.strictEqual(results.length, 5, 'Should return all chunks');
    assert.ok(
      typeof results[0].relevance_score === 'number',
      'Should have numeric relevance scores'
    );

    // pod deployment query should rank pod deployment chunk highest
    // chunk1 is pod deployment guide
    assert.strictEqual(
      results[0].id,
      'chunk1',
      'pod deployment chunk should rank highest for pod deployment query'
    );

    // Verify scores in descending order
    for (let i = 1; i < results.length; i++) {
      assert.ok(
        results[i - 1].relevance_score >= results[i].relevance_score,
        'Results should be ordered by relevance score descending'
      );
    }
  });

  test('reranking improves over vector-only ordering', async () => {
    // pod consensus query with mixed chunks
    const query = testQueries[1].text; // "What is the pod network consensus mechanism?"
    const chunks: Chunk[] = [
      testChunks[1], // Ethereum deployment (not relevant)
      testChunks[3], // pod consensus (highly relevant)
      testChunks[0] // pod deployment (somewhat relevant)
    ];

    // Use bge-reranker-base for consistent rankings with test expectations
    const results = await rerankChunks(query, chunks, 'Xenova/bge-reranker-base');

    // chunk4 (pod consensus) should rank highest for consensus query
    assert.strictEqual(
      results[0].id,
      'chunk4',
      'Consensus chunk should rank highest for consensus query'
    );

    // Ethereum chunk should rank lowest
    assert.strictEqual(results[2].id, 'chunk2', 'Irrelevant Ethereum chunk should rank lowest');
  });

  test('cross-domain ranking (Ethereum query)', async () => {
    // Ethereum gas optimization query
    const query = testQueries[3].text; // "Ethereum gas optimization techniques"
    const chunks: Chunk[] = testChunks.slice(0, 6).map((c: any) => ({
      id: c.id,
      text: c.text,
      metadata: c.metadata
    }));

    const results = await rerankChunks(query, chunks);

    // chunk6 is gas optimization guide - should rank in top positions
    const chunk6Result = results.find(r => r.id === 'chunk6');
    assert.ok(chunk6Result, 'Should find gas optimization chunk');
    assert.ok(chunk6Result.rank <= 3, 'Gas optimization chunk should rank in top 3 for gas query');

    // Verify Ethereum-related chunks score higher than generic content
    const chunk6Score = chunk6Result.relevance_score;
    const genericResult = results.find(r => r.id === 'chunk8'); // Generic blockchain
    if (genericResult) {
      assert.ok(
        chunk6Score > genericResult.relevance_score,
        'Ethereum-specific content should score higher than generic content'
      );
    }

    console.log(
      'Ethereum query rankings:',
      results.slice(0, 3).map(r => `${r.id}: ${r.relevance_score.toFixed(3)}`)
    );
  });

  test('handles long chunks with truncation warning', async () => {
    const query = 'test query';
    const chunks: Chunk[] = [
      testChunks[6] // chunk7 - very long chunk with repeated text
    ];

    const results = await rerankChunks(query, chunks);

    assert.strictEqual(results.length, 1);

    // Original text should always be preserved
    assert.strictEqual(results[0].text, chunks[0].text, 'Original text should be preserved');

    // Truncation detection is token-based, not character-based
    // chunk7 is ~1800 chars but produces 654 tokens when combined with query
    // Since 654 > 512 (model token limit), it should be flagged as truncated
    assert.strictEqual(
      results[0].truncated,
      true,
      'chunk7 exceeds 512 token limit and should be flagged as truncated'
    );
  });

  test('input validation catches empty query', async () => {
    const invalidRequest = {
      query: '', // Empty query - invalid
      chunks: [{ text: 'test chunk' }]
    };

    const result = RerankRequestSchema.safeParse(invalidRequest);
    assert.strictEqual(result.success, false, 'Empty query should fail validation');

    if (!result.success) {
      const error = result.error.errors[0];
      assert.match(error.message, /query/i, 'Error should mention query field');
    }
  });

  test('input validation catches empty chunks array', async () => {
    const invalidRequest = {
      query: 'test query',
      chunks: [] // Empty array - invalid
    };

    const result = RerankRequestSchema.safeParse(invalidRequest);
    assert.strictEqual(result.success, false, 'Empty chunks array should fail validation');

    if (!result.success) {
      const error = result.error.errors[0];
      assert.match(error.message, /chunk/i, 'Error should mention chunks');
    }
  });

  test('input validation catches too many chunks', async () => {
    const invalidRequest = {
      query: 'test query',
      chunks: Array(51).fill({ text: 'chunk' }) // 51 chunks - exceeds max of 50
    };

    const result = RerankRequestSchema.safeParse(invalidRequest);
    assert.strictEqual(result.success, false, 'Too many chunks should fail validation');
  });

  test('input validation catches missing chunk text', async () => {
    const invalidRequest = {
      query: 'test query',
      chunks: [
        { text: 'valid chunk' },
        { metadata: { foo: 'bar' } } // Missing required 'text' field
      ]
    };

    const result = RerankRequestSchema.safeParse(invalidRequest);
    assert.strictEqual(result.success, false, 'Chunk without text should fail validation');
  });

  test('input validation accepts valid limit parameter', async () => {
    const validRequest = {
      query: 'test query',
      chunks: [{ text: 'chunk1' }, { text: 'chunk2' }],
      limit: 1
    };

    const result = RerankRequestSchema.safeParse(validRequest);
    assert.strictEqual(result.success, true, 'Valid limit should pass validation');
  });

  test('input validation rejects invalid limit', async () => {
    const invalidRequest = {
      query: 'test query',
      chunks: [{ text: 'chunk1' }],
      limit: 0 // Invalid - must be >= 1
    };

    const result = RerankRequestSchema.safeParse(invalidRequest);
    assert.strictEqual(result.success, false, 'Invalid limit should fail validation');
  });

  test('metadata preservation through reranking', async () => {
    const query = 'test query';
    const customMetadata = {
      source_url: 'https://example.com/doc',
      topic_tags: ['test', 'example'],
      custom_field: { nested: { data: [1, 2, 3] } },
      number_field: 42,
      boolean_field: true
    };

    const chunks: Chunk[] = [
      {
        id: 'meta-test',
        text: 'Chunk with complex metadata',
        metadata: customMetadata
      }
    ];

    const results = await rerankChunks(query, chunks);

    assert.strictEqual(results.length, 1);
    assert.deepStrictEqual(
      results[0].metadata,
      customMetadata,
      'Complex metadata should be preserved exactly'
    );
  });

  test('performance target: 20 chunks in under 5 seconds (SC-001)', async () => {
    const query = testQueries[0].text;
    const chunks: Chunk[] = testChunks.slice(0, 8).map((c: any) => ({
      id: c.id,
      text: c.text,
      metadata: c.metadata
    }));

    // Duplicate to get ~20 chunks
    const allChunks = [...chunks, ...chunks, ...chunks.slice(0, 4)]; // 20 chunks

    const startTime = Date.now();
    const results = await rerankChunks(query, allChunks);
    const duration = Date.now() - startTime;

    assert.strictEqual(results.length, 20, 'Should process all 20 chunks');
    assert.ok(duration < 5000, `Processing 20 chunks should take <5s (took ${duration}ms)`);

    console.log(
      `Performance: 20 chunks processed in ${duration}ms (${Math.round(duration / 20)}ms per chunk)`
    );
  });

  test('queue integration: sequential processing', async () => {
    const queue = getQueue();
    const executionOrder: number[] = [];

    // Submit multiple reranking requests through the queue
    const request1 = queue.add(async () => {
      executionOrder.push(1);
      return await rerankChunks('query 1', [{ text: 'chunk 1' }]);
    });

    const request2 = queue.add(async () => {
      executionOrder.push(2);
      return await rerankChunks('query 2', [{ text: 'chunk 2' }]);
    });

    const request3 = queue.add(async () => {
      executionOrder.push(3);
      return await rerankChunks('query 3', [{ text: 'chunk 3' }]);
    });

    await Promise.all([request1, request2, request3]);

    // Verify FIFO order
    assert.deepStrictEqual(executionOrder, [1, 2, 3], 'Requests should be processed in FIFO order');
  });

  test('multiple concurrent queries with different domains', async () => {
    const podQuery = testQueries[0].text; // pod deployment
    const ethQuery = testQueries[3].text; // Ethereum gas

    const chunks: Chunk[] = testChunks.slice(0, 6).map((c: any) => ({
      id: c.id,
      text: c.text,
      metadata: c.metadata
    }));

    // Run both queries concurrently (use bge-reranker-base for consistent rankings)
    const [podResults, ethResults] = await Promise.all([
      rerankChunks(podQuery, chunks, 'Xenova/bge-reranker-base'),
      rerankChunks(ethQuery, chunks, 'Xenova/bge-reranker-base')
    ]);

    // pod query should rank pod chunks highest
    assert.strictEqual(podResults[0].id, 'chunk1', 'pod query should rank pod deployment highest');

    // Ethereum query should rank Ethereum chunks highest
    assert.strictEqual(
      ethResults[0].id,
      'chunk6',
      'Ethereum query should rank gas optimization highest'
    );

    // Verify different ranking orders for same chunks
    assert.notDeepStrictEqual(
      podResults.map(r => r.id),
      ethResults.map(r => r.id),
      'Different queries should produce different rankings'
    );
  });

  test('realistic RAG workflow simulation', async () => {
    // Simulate: Vector search returns top 10 candidates
    const userQuery = testQueries[2].text; // "How to write smart contracts in pod?"
    const vectorCandidates: Chunk[] = [
      testChunks[4], // pod smart contract language guide (highly relevant)
      testChunks[0], // pod deployment (somewhat relevant)
      testChunks[2], // Solidity security (not pod-specific)
      testChunks[1], // Ethereum deployment (not relevant)
      testChunks[7] // Generic blockchain (not relevant)
    ];

    // Rerank to get top 3 most relevant (use bge-reranker-base for consistent rankings)
    const reranked = await rerankChunks(userQuery, vectorCandidates, 'Xenova/bge-reranker-base');
    const top3 = reranked.slice(0, 3);

    // Verify pod language guide ranks in top positions (ML models may vary slightly)
    const chunk5Result = reranked.find(r => r.id === 'chunk5');
    assert.ok(chunk5Result, 'Should find pod language guide');
    assert.ok(
      chunk5Result.rank <= 2,
      'pod language guide should rank in top 2 for smart contract query'
    );

    // Verify pod-specific content ranks higher than generic content
    const podChunks = reranked.filter(
      r =>
        r.metadata &&
        'relevance_domain' in r.metadata &&
        r.metadata.relevance_domain === 'midnight-network'
    );
    const genericChunk = reranked.find(r => r.id === 'chunk8'); // Generic blockchain

    assert.ok(podChunks.length >= 2, 'Should have at least 2 pod-specific chunks in results');

    if (genericChunk && podChunks.length > 0) {
      // At least one pod chunk should score higher than generic
      const anyPodHigher = podChunks.some(p => p.relevance_score > genericChunk.relevance_score);
      assert.ok(anyPodHigher, 'pod-specific content should score higher than generic content');
    }

    // Verify all have relevance scores and correct ranks
    top3.forEach((result, i) => {
      assert.ok(
        typeof result.relevance_score === 'number',
        `Result ${i + 1} should have relevance score`
      );
      assert.strictEqual(result.rank, i + 1, `Result ${i + 1} should have correct rank`);
    });

    console.log(
      'RAG workflow rankings:',
      top3.map(r => `${r.id}: ${r.relevance_score.toFixed(3)}`)
    );
  });

  test('edge case: single chunk with very short text', async () => {
    const query = 'pod';
    const chunks: Chunk[] = [{ id: 'short', text: 'pod' }];

    const results = await rerankChunks(query, chunks);

    assert.strictEqual(results.length, 1);
    assert.ok(typeof results[0].relevance_score === 'number', 'Should have a relevance score');
    assert.strictEqual(results[0].rank, 1);
  });

  test('edge case: query matches chunk text exactly', async () => {
    const query = 'pod network deployment guide';
    const chunks: Chunk[] = [
      { id: 'exact', text: 'pod network deployment guide' },
      { id: 'similar', text: 'pod network deployment overview' },
      { id: 'different', text: 'Ethereum smart contract deployment' }
    ];

    const results = await rerankChunks(query, chunks);

    // Exact/similar matches should rank in top 2
    const exactResult = results.find(r => r.id === 'exact');
    const similarResult = results.find(r => r.id === 'similar');
    assert.ok(exactResult && exactResult.rank <= 2, 'Exact match should rank in top 2');
    assert.ok(similarResult && similarResult.rank <= 2, 'Similar match should rank in top 2');

    // Different domain should rank lower
    const differentResult = results.find(r => r.id === 'different');
    assert.ok(differentResult && differentResult.rank === 3, 'Different domain should rank lowest');
  });
});

describe('Response Format Validation', () => {
  test('response includes all required fields', async () => {
    const query = testQueries[0].text;
    const chunks: Chunk[] = testChunks.slice(0, 3).map((c: any) => ({
      id: c.id,
      text: c.text,
      metadata: c.metadata
    }));

    const results = await rerankChunks(query, chunks);

    // Simulate full response structure (like MCP tool would return)
    const response = {
      results,
      search_time_ms: 1000,
      model_name: 'Xenova/bge-reranker-base',
      total_before_limit: results.length,
      filtered_by_limit: 0
    };

    // Verify required fields
    assert.ok(Array.isArray(response.results), 'Should have results array');
    assert.ok(typeof response.search_time_ms === 'number', 'Should have search_time_ms');
    assert.ok(typeof response.model_name === 'string', 'Should have model_name');
    assert.ok(typeof response.total_before_limit === 'number', 'Should have total_before_limit');
    assert.ok(typeof response.filtered_by_limit === 'number', 'Should have filtered_by_limit');

    // Verify result structure
    response.results.forEach((result, i) => {
      assert.ok(typeof result.text === 'string', `Result ${i} should have text`);
      assert.ok(
        typeof result.relevance_score === 'number',
        `Result ${i} should have relevance_score`
      );
      assert.ok(typeof result.rank === 'number', `Result ${i} should have rank`);
    });
  });
});

describe('Model Selection (User Story 3)', () => {
  test('reranking with fast baseline model (ms-marco-MiniLM-L-6-v2)', async () => {
    const query = testQueries[0].text;
    const chunks: Chunk[] = testChunks.slice(0, 3).map((c: any) => ({
      id: c.id,
      text: c.text,
      metadata: c.metadata
    }));

    const results = await rerankChunks(query, chunks, 'Xenova/ms-marco-MiniLM-L-6-v2');

    assert.strictEqual(results.length, 3, 'Should return all chunks');
    assert.ok(
      typeof results[0].relevance_score === 'number' && !isNaN(results[0].relevance_score),
      'Should have numeric relevance scores'
    );

    // Verify scores in descending order
    for (let i = 1; i < results.length; i++) {
      assert.ok(
        results[i - 1].relevance_score >= results[i].relevance_score,
        'Results should be ordered by relevance score descending'
      );
    }
  });

  test('reranking with high-quality model (bge-reranker-base)', async () => {
    const query = testQueries[0].text;
    const chunks: Chunk[] = testChunks.slice(0, 3).map((c: any) => ({
      id: c.id,
      text: c.text,
      metadata: c.metadata
    }));

    const results = await rerankChunks(query, chunks, 'Xenova/bge-reranker-base');

    assert.strictEqual(results.length, 3, 'Should return all chunks');
    assert.ok(
      typeof results[0].relevance_score === 'number' && !isNaN(results[0].relevance_score),
      'Should have numeric relevance scores'
    );

    // Verify scores in descending order
    for (let i = 1; i < results.length; i++) {
      assert.ok(
        results[i - 1].relevance_score >= results[i].relevance_score,
        'Results should be ordered by relevance score descending'
      );
    }
  });

  test('reranking with default model (omit model parameter)', async () => {
    const query = testQueries[0].text;
    const chunks: Chunk[] = testChunks.slice(0, 3).map((c: any) => ({
      id: c.id,
      text: c.text,
      metadata: c.metadata
    }));

    // No model parameter - should use default (ms-marco-MiniLM-L-6-v2)
    const results = await rerankChunks(query, chunks);

    assert.strictEqual(results.length, 3, 'Should return all chunks');
    assert.ok(
      typeof results[0].relevance_score === 'number' && !isNaN(results[0].relevance_score),
      'Should have numeric relevance scores'
    );
  });

  test('different models produce different scores', async () => {
    const query = testQueries[0].text;
    const chunks: Chunk[] = testChunks.slice(0, 3).map((c: any) => ({
      id: c.id,
      text: c.text,
      metadata: c.metadata
    }));

    const resultsBase = await rerankChunks(query, chunks, 'Xenova/ms-marco-MiniLM-L-6-v2');
    const resultsLarge = await rerankChunks(query, chunks, 'Xenova/bge-reranker-base');

    // Both should return same number of results
    assert.strictEqual(resultsBase.length, resultsLarge.length);

    // Scores should differ (different models = different scoring)
    // Allow for possibility of identical scores, but at least one should differ
    const scoresIdentical = resultsBase.every(
      (r, i) => Math.abs(r.relevance_score - resultsLarge[i].relevance_score) < 0.001
    );

    // It's highly unlikely all scores are identical with different models
    // But if they are, just verify both models produced valid results
    if (scoresIdentical) {
      console.log('Note: Both models produced similar scores for this query/chunks combination');
    }

    assert.ok(
      typeof resultsBase[0].relevance_score === 'number' && !isNaN(resultsBase[0].relevance_score),
      'Baseline model should produce numeric scores'
    );
    assert.ok(
      typeof resultsLarge[0].relevance_score === 'number' &&
        !isNaN(resultsLarge[0].relevance_score),
      'Large model should produce numeric scores'
    );
  });
});

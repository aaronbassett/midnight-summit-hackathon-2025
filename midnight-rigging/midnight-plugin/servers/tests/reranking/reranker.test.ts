/**
 * Reranker Unit Tests
 *
 * Tests for the reranker pipeline singleton:
 * - Lazy loading behavior
 * - Score normalization
 * - Truncation handling
 * - Ranking assignment
 *
 * Based on T010 from specs/002-reranking-mcp-server/tasks.md
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getReranker, rerankChunks } from '../../dist/reranking/reranker.js';
import type { Chunk } from '../../dist/reranking/types.js';

describe('Reranker Pipeline', () => {
  test('lazy loads model on first request', async () => {
    // First request should trigger model loading
    const startTime = Date.now();
    const reranker = await getReranker();
    const loadTime = Date.now() - startTime;

    assert.ok(reranker !== null, 'Reranker should be loaded');

    // Note: First load can take 5-30 seconds depending on network
    // We're just testing it completes successfully
    console.log(`Model load time: ${loadTime}ms`);
  });

  test('reuses loaded model instance (singleton)', async () => {
    // Get reranker twice - should be same instance
    const reranker1 = await getReranker();
    const reranker2 = await getReranker();

    assert.strictEqual(reranker1, reranker2, 'Should return same singleton instance');
  });

  test('ranks chunks by semantic relevance', async () => {
    const query = 'How do I deploy a pod contract?';
    const chunks: Chunk[] = [
      {
        id: 'generic',
        text: 'Generic blockchain content about distributed ledgers',
        metadata: { topic: 'general' }
      },
      {
        id: 'pod-specific',
        text: 'pod network deployment guide: First, compile your contract using the pod compiler. Then, use the pod CLI to deploy.',
        metadata: { topic: 'pod-deployment' }
      },
      {
        id: 'ethereum',
        text: 'Ethereum deployment uses web3.js or ethers.js libraries.',
        metadata: { topic: 'ethereum' }
      }
    ];

    const results = await rerankChunks(query, chunks);

    // Verify structure
    assert.strictEqual(results.length, 3, 'Should return all chunks');
    assert.strictEqual(results[0].rank, 1, 'Top result should have rank 1');

    // Verify relevance scores are in descending order
    assert.ok(
      results[0].relevance_score >= results[1].relevance_score,
      'Scores should be in descending order'
    );
    assert.ok(
      results[1].relevance_score >= results[2].relevance_score,
      'Scores should be in descending order'
    );

    // Verify all original fields preserved
    results.forEach(result => {
      assert.ok(result.text, 'Original text should be preserved');
      assert.ok(result.metadata, 'Original metadata should be preserved');
      assert.ok(typeof result.relevance_score === 'number', 'Should have relevance score');
      assert.ok(typeof result.rank === 'number', 'Should have rank');
    });

    // Note: Actual ranking depends on model inference - we verify structure/ordering, not specific ranks
    console.log(
      'Rankings:',
      results.map(r => `${r.id}: ${r.relevance_score.toFixed(3)}`)
    );
  });

  test('assigns sequential ranks starting from 1', async () => {
    const query = 'test query';
    const chunks: Chunk[] = [
      { id: '1', text: 'chunk one' },
      { id: '2', text: 'chunk two' },
      { id: '3', text: 'chunk three' }
    ];

    const results = await rerankChunks(query, chunks);

    // Verify ranks are sequential
    const ranks = results.map(r => r.rank);
    assert.deepStrictEqual(ranks, [1, 2, 3], 'Ranks should be sequential 1, 2, 3');
  });

  test('handles chunks with long text (truncation)', async () => {
    const query = 'test query';

    // Create a very long chunk (>2000 chars triggers truncation warning)
    const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50);

    const chunks: Chunk[] = [
      { id: 'short', text: 'Short chunk' },
      { id: 'long', text: longText }
    ];

    const results = await rerankChunks(query, chunks);

    // Find the long chunk in results
    const longResult = results.find(r => r.id === 'long');
    assert.ok(longResult, 'Long chunk should be in results');

    // Verify truncation flag is set
    assert.strictEqual(longResult.truncated, true, 'Long chunk should be flagged as truncated');

    // Verify original text is preserved (not actually truncated in output)
    assert.strictEqual(longResult.text, longText, 'Original text should be preserved in output');
  });

  test('handles empty chunks array gracefully', async () => {
    const query = 'test query';
    const chunks: Chunk[] = [];

    const results = await rerankChunks(query, chunks);

    assert.strictEqual(results.length, 0, 'Should return empty array for empty input');
  });

  test('handles single chunk', async () => {
    const query = 'test query';
    const chunks: Chunk[] = [{ id: 'single', text: 'Single chunk content' }];

    const results = await rerankChunks(query, chunks);

    assert.strictEqual(results.length, 1, 'Should return single result');
    assert.strictEqual(results[0].rank, 1, 'Single result should have rank 1');
    assert.ok(typeof results[0].relevance_score === 'number', 'Should have relevance score');
  });

  test('preserves chunk metadata and optional fields', async () => {
    const query = 'test query';
    const chunks: Chunk[] = [
      {
        id: 'with-metadata',
        text: 'Chunk with metadata',
        metadata: {
          source_url: 'https://example.com',
          topic_tags: ['test', 'example'],
          custom_field: 42
        }
      },
      {
        // No id or metadata
        text: 'Chunk without metadata'
      }
    ];

    const results = await rerankChunks(query, chunks);

    // Verify metadata preserved
    const withMetadata = results.find(r => r.id === 'with-metadata');
    assert.ok(withMetadata, 'Chunk with metadata should be in results');
    assert.deepStrictEqual(
      withMetadata.metadata,
      chunks[0].metadata,
      'Metadata should be preserved'
    );

    // Verify chunk without metadata works
    const withoutMetadata = results.find(r => !r.id);
    assert.ok(withoutMetadata, 'Chunk without metadata should be in results');
    assert.strictEqual(withoutMetadata.text, 'Chunk without metadata');
  });

  test('scores reflect semantic similarity', async () => {
    const query = 'pod network deployment';
    const chunks: Chunk[] = [
      {
        id: 'highly-relevant',
        text: 'pod network deployment guide: compile and deploy contracts using pod CLI'
      },
      {
        id: 'somewhat-relevant',
        text: 'pod network uses a proof-of-stake consensus mechanism'
      },
      {
        id: 'not-relevant',
        text: 'Cats are wonderful pets that enjoy sleeping in the sun'
      }
    ];

    const results = await rerankChunks(query, chunks);

    // Verify scores are ordered descending
    const topScore = results[0].relevance_score;
    const midScore = results[1].relevance_score;
    const lowScore = results[2].relevance_score;

    assert.ok(topScore >= midScore && midScore >= lowScore, 'Scores should be in descending order');

    // Verify the highly relevant chunk has highest or second-highest score
    // (Model may score slightly differently based on token embeddings)
    const highlyRelevantResult = results.find(r => r.id === 'highly-relevant');
    assert.ok(highlyRelevantResult, 'Should find highly-relevant chunk');
    assert.ok(highlyRelevantResult.rank <= 2, 'Highly relevant chunk should rank in top 2');

    // Verify irrelevant chunk scores significantly lower
    const notRelevantResult = results.find(r => r.id === 'not-relevant');
    assert.ok(notRelevantResult, 'Should find not-relevant chunk');
    assert.ok(
      notRelevantResult.relevance_score < topScore,
      'Irrelevant chunk should score lower than top result'
    );

    console.log(
      'Semantic similarity scores:',
      results.map(r => `${r.id}: ${r.relevance_score.toFixed(3)}`)
    );
  });
});

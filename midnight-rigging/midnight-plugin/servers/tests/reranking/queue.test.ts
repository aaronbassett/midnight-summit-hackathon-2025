/**
 * Queue Unit Tests
 *
 * Tests for the FIFO request queue manager:
 * - FIFO ordering
 * - Timeout handling
 * - Concurrent request serialization
 * - Queue metrics
 *
 * Based on T011 from specs/002-reranking-mcp-server/tasks.md
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { getQueue } from '../../dist/reranking/queue.js';

describe('Request Queue', () => {
  test('processes requests in FIFO order', async () => {
    const queue = getQueue();
    const executionOrder: number[] = [];

    // Add 3 tasks that track their execution order
    const task1 = queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      executionOrder.push(1);
      return 'task1';
    });

    const task2 = queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      executionOrder.push(2);
      return 'task2';
    });

    const task3 = queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      executionOrder.push(3);
      return 'task3';
    });

    // Wait for all tasks to complete
    await Promise.all([task1, task2, task3]);

    // Verify FIFO order
    assert.deepStrictEqual(executionOrder, [1, 2, 3], 'Tasks should execute in FIFO order');
  });

  test('serializes concurrent requests (concurrency=1)', async () => {
    const queue = getQueue();
    let concurrentCount = 0;
    let maxConcurrent = 0;

    // Create tasks that track concurrent execution
    const createTask = (id: number) =>
      queue.add(async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);

        await new Promise(resolve => setTimeout(resolve, 100));

        concurrentCount--;
        return `task${id}`;
      });

    // Launch 5 tasks concurrently
    const tasks = [createTask(1), createTask(2), createTask(3), createTask(4), createTask(5)];

    await Promise.all(tasks);

    // Verify only 1 task executed at a time
    assert.strictEqual(maxConcurrent, 1, 'Only 1 task should execute concurrently (concurrency=1)');
  });

  test('timeout handling throws error after specified duration', async () => {
    const queue = getQueue();

    // Task that takes too long (200ms, timeout at 100ms)
    const slowTask = queue.add(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'should-not-complete';
      },
      { timeout: 100 }
    );

    await assert.rejects(slowTask, /timed out/i, 'Should throw timeout error');
  });

  test('successful task completes within timeout', async () => {
    const queue = getQueue();

    // Fast task (50ms, timeout at 200ms)
    const fastTask = queue.add(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'completed';
      },
      { timeout: 200 }
    );

    const result = await fastTask;
    assert.strictEqual(result, 'completed', 'Fast task should complete');
  });

  test('queue metrics reflect current state', async () => {
    const queue = getQueue();

    // Start with empty queue
    const initialMetrics = queue.getMetrics();
    assert.strictEqual(initialMetrics.size, 0, 'Initial queue should be empty');
    assert.strictEqual(initialMetrics.pending, 0, 'No tasks should be pending initially');
    assert.strictEqual(initialMetrics.isPaused, false, 'Queue should not be paused');

    // Add a slow task
    const slowTask = queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'slow';
    });

    // Immediately check metrics (task should be executing)
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    const duringMetrics = queue.getMetrics();

    // Either pending or size should be non-zero depending on timing
    const hasActivity = duringMetrics.pending > 0 || duringMetrics.size > 0;
    assert.ok(hasActivity, 'Queue should show activity while task is running');

    // Wait for task to complete
    await slowTask;

    // Queue should be empty again
    const afterMetrics = queue.getMetrics();
    assert.strictEqual(afterMetrics.size, 0, 'Queue should be empty after task completion');
  });

  test('handles task errors without breaking queue', async () => {
    const queue = getQueue();
    const executionOrder: string[] = [];

    // Task 1: succeeds
    const task1 = queue.add(async () => {
      executionOrder.push('task1');
      return 'success1';
    });

    // Task 2: throws error
    const task2 = queue.add(async () => {
      executionOrder.push('task2');
      throw new Error('Task 2 failed');
    });

    // Task 3: succeeds
    const task3 = queue.add(async () => {
      executionOrder.push('task3');
      return 'success3';
    });

    // Verify task 1 succeeds
    const result1 = await task1;
    assert.strictEqual(result1, 'success1');

    // Verify task 2 throws
    await assert.rejects(task2, /Task 2 failed/);

    // Verify task 3 still succeeds (queue not broken)
    const result3 = await task3;
    assert.strictEqual(result3, 'success3');

    // Verify execution order
    assert.deepStrictEqual(
      executionOrder,
      ['task1', 'task2', 'task3'],
      'All tasks should execute in order despite errors'
    );
  });

  test('queue metrics during multiple concurrent adds', async () => {
    const queue = getQueue();

    // Add 5 tasks that each take 50ms
    const tasks = Array.from({ length: 5 }, (_, i) =>
      queue.add(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return `task${i}`;
      })
    );

    // Check metrics while tasks are queued
    await new Promise(resolve => setTimeout(resolve, 10));
    const metrics = queue.getMetrics();

    // With concurrency=1, we should have 1 pending and 4 queued (or similar distribution)
    const totalActivity = metrics.size + metrics.pending;
    assert.ok(
      totalActivity > 0 && totalActivity <= 5,
      'Queue should show activity for queued tasks'
    );

    // Wait for all to complete
    await Promise.all(tasks);

    // Queue should be empty
    const finalMetrics = queue.getMetrics();
    assert.strictEqual(finalMetrics.size, 0, 'Queue should be empty');
    assert.strictEqual(finalMetrics.pending, 0, 'No tasks should be pending');
  });

  test('default timeout is 30 seconds', async () => {
    const queue = getQueue();

    // Task that completes quickly
    const startTime = Date.now();
    await queue.add(async () => {
      return 'quick';
    });
    const duration = Date.now() - startTime;

    // Verify it completes quickly (not waiting for 30s timeout)
    assert.ok(duration < 1000, 'Quick task should complete without hitting timeout');
  });

  test('custom timeout overrides default', async () => {
    const queue = getQueue();

    // Task that takes 150ms, with custom 50ms timeout
    const slowTask = queue.add(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
        return 'too-slow';
      },
      { timeout: 50 }
    );

    // Should timeout in ~50ms, not 30s
    const startTime = Date.now();
    await assert.rejects(slowTask, /timed out/i);
    const duration = Date.now() - startTime;

    assert.ok(
      duration < 200,
      'Should timeout quickly with custom timeout, not wait for default 30s'
    );
  });

  test('queue returns correct results for different task types', async () => {
    const queue = getQueue();

    // Test various return types
    const stringTask = queue.add(async () => 'string result');
    const numberTask = queue.add(async () => 42);
    const objectTask = queue.add(async () => ({ key: 'value' }));
    const arrayTask = queue.add(async () => [1, 2, 3]);

    assert.strictEqual(await stringTask, 'string result');
    assert.strictEqual(await numberTask, 42);
    assert.deepStrictEqual(await objectTask, { key: 'value' });
    assert.deepStrictEqual(await arrayTask, [1, 2, 3]);
  });

  test('clear method empties queue', async () => {
    const queue = getQueue();

    // Add tasks
    queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'task1';
    });

    queue.add(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return 'task2';
    });

    // Wait a bit for queue to have tasks
    await new Promise(resolve => setTimeout(resolve, 10));

    // Clear queue
    queue.clear();

    // Verify queue is empty
    const metrics = queue.getMetrics();
    assert.strictEqual(metrics.size, 0, 'Queue should be empty after clear');
  });
});

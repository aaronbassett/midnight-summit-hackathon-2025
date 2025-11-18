/**
 * FIFO Request Queue Manager
 *
 * Uses p-queue for sequential request processing with timeout support
 * Based on specs/002-reranking-mcp-server/research.md
 */

import PQueue from 'p-queue';
import type { QueueMetrics } from './types.js';
import { createLogger } from './logger.js';

const logger = createLogger('queue');

/**
 * Request queue singleton
 * Ensures single-threaded execution to prevent event loop blocking
 */
class RequestQueue {
  private static instance: RequestQueue;
  private queue: PQueue;
  private readonly TIMEOUT_MS = 30000; // 30 seconds

  private constructor() {
    this.queue = new PQueue({
      concurrency: 1 // FIFO, single-threaded
    });

    logger.info('request_queue_initialized', {
      concurrency: 1,
      timeout_ms: this.TIMEOUT_MS
    });
  }

  public static getInstance(): RequestQueue {
    if (!RequestQueue.instance) {
      RequestQueue.instance = new RequestQueue();
    }
    return RequestQueue.instance;
  }

  /**
   * Add a task to the queue with timeout
   */
  public async add<T>(task: () => Promise<T>, options?: { timeout?: number }): Promise<T> {
    const timeout = options?.timeout || this.TIMEOUT_MS;
    const queueStartTime = Date.now();

    // Log queue metrics before adding
    const metricsBeforeAdd = this.getMetrics();
    logger.debug('task_queued', {
      queue_size: metricsBeforeAdd.size,
      queue_pending: metricsBeforeAdd.pending
    });

    try {
      const result = await this.queue.add(
        async () => {
          const queueWaitMs = Date.now() - queueStartTime;
          logger.debug('task_started', {
            queue_wait_ms: queueWaitMs
          });

          return await task();
        },
        {
          timeout,
          throwOnTimeout: true
        }
      );

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        logger.error('task_timeout', {
          timeout_ms: timeout,
          queue_size: this.getMetrics().size
        });
        throw new Error(`Operation timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Get current queue metrics
   */
  public getMetrics(): QueueMetrics {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      isPaused: this.queue.isPaused
    };
  }

  /**
   * Clear all pending tasks (for testing/shutdown)
   */
  public clear(): void {
    this.queue.clear();
    logger.info('queue_cleared');
  }
}

/**
 * Get the request queue singleton instance
 */
export function getQueue(): RequestQueue {
  return RequestQueue.getInstance();
}

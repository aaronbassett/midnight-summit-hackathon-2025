import { createLogger } from './logger.js';
import type { JsonRpcRequest, JsonRpcResponse } from './types.js';
import { getErrorMessage, getErrorStack } from './types.js';

const logger = createLogger('client');
const DEFAULT_RPC_URL = 'https://rpc.v1.dev.pod.network/';
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 100;

/**
 * Future Improvement: Connection Pooling
 *
 * Currently, each RPC call creates a new HTTP connection using Node.js fetch().
 * For high-throughput scenarios, consider implementing HTTP connection pooling
 * using a custom HTTP agent (e.g., `agentkeepalive` or `undici`).
 *
 * Benefits:
 * - Reduced latency by reusing TCP connections
 * - Lower overhead from connection handshakes
 * - Better performance under sustained load
 *
 * Implementation approach:
 * - Use `undici.Agent` with `keepAlive: true` and connection limits
 * - Pass agent to fetch() via dispatcher option
 * - Configure maxConnections, maxIdleTime, and timeout
 *
 * See DEVELOPMENT.md "Future Improvements" section for details.
 */

export class RpcClient {
  private rpcUrl: string;
  private timeoutMs: number;

  constructor(rpcUrl?: string, timeoutMs?: number) {
    const url = rpcUrl || process.env.MIDNIGHT_RPC_URL || DEFAULT_RPC_URL;

    // Validate URL format
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`Invalid RPC URL protocol: ${parsed.protocol}. Must be http: or https:`);
      }
      this.rpcUrl = url;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid RPC URL format: ${url}`);
      }
      throw error;
    }

    this.timeoutMs = timeoutMs ?? TIMEOUT_MS;
  }

  async call<T = any>(method: string, params: any[] | Record<string, any>): Promise<T> {
    return this.callWithRetry(method, params, 0);
  }

  private async callWithRetry<T = any>(
    method: string,
    params: any[] | Record<string, any>,
    retryCount: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const startTime = Date.now(); // Track query duration

    try {
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now()
      };

      logger.info('data_source_rpc', { method, url: this.rpcUrl });
      logger.debug('rpc_request', { method, params });

      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jsonResponse: JsonRpcResponse<T> = await response.json();

      if ('error' in jsonResponse) {
        const { code, message, data } = jsonResponse.error;
        const errorMsg = data
          ? `RPC Error ${code}: ${message} (${JSON.stringify(data)})`
          : `RPC Error ${code}: ${message}`;
        throw new Error(errorMsg);
      }

      const duration = Date.now() - startTime;

      // FR-083: Log slow queries (>2s) at warning level
      if (duration > 2000) {
        logger.warning('slow_query', { method, duration, url: this.rpcUrl });
      }

      logger.debug('rpc_response', { method, result: 'success', duration });
      return jsonResponse.result;
    } catch (error) {
      if (retryCount < MAX_RETRIES && this.isNetworkError(error)) {
        const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
        logger.warning('network_error_retry', {
          method,
          retryCount: retryCount + 1,
          maxRetries: MAX_RETRIES,
          delayMs,
          error
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.callWithRetry(method, params, retryCount + 1);
      }

      // FR-072: Clear error message for RPC unavailability
      if (this.isNetworkError(error)) {
        const errorMsg = `Unable to connect to pod network RPC at ${this.rpcUrl}. ${getErrorMessage(error)}`;
        logger.error('rpc_unavailable', new Error(errorMsg));
        throw new Error(errorMsg);
      }

      // FR-077: Log with full request context
      logger.error('rpc_call_failed', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        method,
        params,
        url: this.rpcUrl
      });
      throw error;
    } finally {
      // Always clean up timeout and abort controller to release resources
      clearTimeout(timeout);
      controller.abort();
    }
  }

  private isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('aborted')
    );
  }
}

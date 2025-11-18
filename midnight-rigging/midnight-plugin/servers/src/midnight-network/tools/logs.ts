import { RpcClient } from '../client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('logs-tools');
const client = new RpcClient();
const LOG_LIMIT = 1000;

export async function eth_getLogs(params: [any]): Promise<any> {
  try {
    const [filter] = params;

    const cacheKey = `eth_getLogs:${JSON.stringify(filter)}`;
    const cached = cache.get('logs', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify(cached) }] };
    }

    const logs = await client.call('eth_getLogs', params);
    const truncated = Array.isArray(logs) && logs.length > LOG_LIMIT;
    const result = truncated ? logs.slice(0, LOG_LIMIT) : logs;

    const response = {
      result,
      truncated,
      warning: truncated
        ? `Results limited to ${LOG_LIMIT} entries. Narrow your filter criteria (block range, topics, address) for complete results.`
        : undefined
    };

    cache.set('logs', cacheKey, response);

    logger.info('eth_getLogs', { filter, count: result.length, truncated });
    return { content: [{ type: 'text', text: JSON.stringify(response) }] };
  } catch (error) {
    logger.error('eth_getLogs_error', error instanceof Error ? error : new Error(String(error)));
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

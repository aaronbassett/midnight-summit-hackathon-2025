import { RpcClient } from '../client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('blocks-tools');
const client = new RpcClient();

export async function eth_getBlockByHash(params: [string, boolean]): Promise<any> {
  try {
    const [blockHash, includeTransactions] = params;
    const cacheKey = `eth_getBlockByHash:${blockHash}:${includeTransactions}`;
    const cached = cache.get('transactions', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }
    const result = await client.call('eth_getBlockByHash', params);
    cache.set('transactions', cacheKey, result);
    logger.info('eth_getBlockByHash', { blockHash, result: 'success' });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'eth_getBlockByHash_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

export async function eth_getBlockByNumber(params: [string, boolean]): Promise<any> {
  try {
    const [blockIdentifier, includeTransactions] = params;
    const cacheKey = `eth_getBlockByNumber:${blockIdentifier}:${includeTransactions}`;
    const category = blockIdentifier === 'latest' ? 'networkStats' : 'transactions';
    const cached = cache.get(category, cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }
    const result = await client.call('eth_getBlockByNumber', params);
    cache.set(category, cacheKey, result);
    logger.info('eth_getBlockByNumber', { blockIdentifier, result: 'success' });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'eth_getBlockByNumber_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

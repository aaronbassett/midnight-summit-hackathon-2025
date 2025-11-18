import { RpcClient } from '../client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('transactions-tools');
const client = new RpcClient();

export async function eth_getTransactionByHash(params: [string]): Promise<any> {
  try {
    const [txHash] = params;

    const cacheKey = `eth_getTransactionByHash:${txHash}`;
    const cached = cache.get('transactions', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('eth_getTransactionByHash', params);
    cache.set('transactions', cacheKey, result);

    logger.info('eth_getTransactionByHash', { txHash });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'eth_getTransactionByHash_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

export async function eth_getTransactionCount(params: [string, string]): Promise<any> {
  try {
    const [address, blockIdentifier] = params;

    const cacheKey = `eth_getTransactionCount:${address}:${blockIdentifier}`;
    const category = blockIdentifier === 'latest' ? 'balances' : 'transactions';
    const cached = cache.get(category, cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('eth_getTransactionCount', params);
    cache.set(category, cacheKey, result);

    logger.info('eth_getTransactionCount', { address, blockIdentifier });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'eth_getTransactionCount_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

export async function eth_getTransactionReceipt(params: [string]): Promise<any> {
  try {
    const [txHash] = params;

    const cacheKey = `eth_getTransactionReceipt:${txHash}`;
    const cached = cache.get('transactions', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('eth_getTransactionReceipt', params);
    cache.set('transactions', cacheKey, result);

    logger.info('eth_getTransactionReceipt', { txHash });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'eth_getTransactionReceipt_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

export async function pod_listReceipts(
  params: [{ address?: string; since: number }]
): Promise<any> {
  try {
    const [{ address, since }] = params;

    const cacheKey = address ? `pod_listReceipts:${address}:${since}` : `pod_listReceipts:${since}`;
    const cached = cache.get('balances', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    // pod_listReceipts expects params as object, not array
    const result = await client.call('pod_listReceipts', params[0]);
    cache.set('balances', cacheKey, result);

    logger.info('pod_listReceipts', { address, since });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'pod_listReceipts_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

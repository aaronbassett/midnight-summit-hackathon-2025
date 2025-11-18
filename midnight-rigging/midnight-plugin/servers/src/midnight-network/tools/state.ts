/**
 * State query tools for pod network MCP Server
 * Implements: eth_blockNumber, eth_chainId, eth_gasPrice, eth_getBalance, eth_getCode
 */

import { RpcClient } from '../client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('state-tools');
const client = new RpcClient();

/**
 * eth_blockNumber - Get the latest block number
 */
export async function eth_blockNumber(): Promise<any> {
  try {
    const cacheKey = 'eth_blockNumber';
    const cached = cache.get('networkStats', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('eth_blockNumber', []);
    cache.set('networkStats', cacheKey, result);

    logger.info('eth_blockNumber', { result });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'eth_blockNumber_error',
      error instanceof Error ? error : new Error(String(error))
    );
    const errorResponse = buildErrorResponse(error);
    return { content: [{ type: 'text', text: JSON.stringify(errorResponse) }], isError: true };
  }
}

/**
 * eth_chainId - Get the chain ID
 */
export async function eth_chainId(): Promise<any> {
  try {
    const cacheKey = 'eth_chainId';
    const cached = cache.get('networkStats', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('eth_chainId', []);
    cache.set('networkStats', cacheKey, result);

    logger.info('eth_chainId', { result });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error('eth_chainId_error', error instanceof Error ? error : new Error(String(error)));
    const errorResponse = buildErrorResponse(error);
    return { content: [{ type: 'text', text: JSON.stringify(errorResponse) }], isError: true };
  }
}

/**
 * eth_gasPrice - Get current gas price
 */
export async function eth_gasPrice(): Promise<any> {
  try {
    const cacheKey = 'eth_gasPrice';
    const cached = cache.get('networkStats', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('eth_gasPrice', []);
    cache.set('networkStats', cacheKey, result);

    logger.info('eth_gasPrice', { result });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error('eth_gasPrice_error', error instanceof Error ? error : new Error(String(error)));
    const errorResponse = buildErrorResponse(error);
    return { content: [{ type: 'text', text: JSON.stringify(errorResponse) }], isError: true };
  }
}

/**
 * eth_getBalance - Get account balance
 */
export async function eth_getBalance(params: [string, string]): Promise<any> {
  try {
    const [address, blockIdentifier] = params;

    const cacheKey = `eth_getBalance:${address}:${blockIdentifier}`;
    const category = blockIdentifier === 'latest' ? 'balances' : 'transactions';
    const cached = cache.get(category, cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('eth_getBalance', params);
    cache.set(category, cacheKey, result);

    logger.info('eth_getBalance', { address, blockIdentifier, result });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error('eth_getBalance_error', error instanceof Error ? error : new Error(String(error)));
    const errorResponse = buildErrorResponse(error);
    return { content: [{ type: 'text', text: JSON.stringify(errorResponse) }], isError: true };
  }
}

/**
 * eth_getCode - Get code at address (contract bytecode)
 * Returns '0x' for EOAs (Externally Owned Accounts)
 * Returns bytecode hex string for contracts
 */
export async function eth_getCode(params: [string, string]): Promise<any> {
  try {
    const [address, blockIdentifier] = params;

    const cacheKey = `eth_getCode:${address}:${blockIdentifier}`;
    const category = blockIdentifier === 'latest' ? 'balances' : 'transactions';
    const cached = cache.get(category, cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('eth_getCode', params);
    cache.set(category, cacheKey, result);

    logger.info('eth_getCode', { address, blockIdentifier, result: result.slice(0, 10) + '...' });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error('eth_getCode_error', error instanceof Error ? error : new Error(String(error)));
    const errorResponse = buildErrorResponse(error);
    return { content: [{ type: 'text', text: JSON.stringify(errorResponse) }], isError: true };
  }
}

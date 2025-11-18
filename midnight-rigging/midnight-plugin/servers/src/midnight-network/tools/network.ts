import { RpcClient } from '../client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('network-tools');
const client = new RpcClient();

export async function eth_networkId(): Promise<any> {
  try {
    const cacheKey = 'eth_networkId';
    const cached = cache.get('networkStats', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('eth_networkId', []);
    cache.set('networkStats', cacheKey, result);

    logger.info('eth_networkId', { result });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error('eth_networkId_error', error instanceof Error ? error : new Error(String(error)));
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

export async function net_version(): Promise<any> {
  try {
    const cacheKey = 'net_version';
    const cached = cache.get('networkStats', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('net_version', []);
    cache.set('networkStats', cacheKey, result);

    logger.info('net_version', { result });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error('net_version_error', error instanceof Error ? error : new Error(String(error)));
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

export async function pod_getCommittee(): Promise<any> {
  try {
    const cacheKey = 'pod_getCommittee';
    const cached = cache.get('logs', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('pod_getCommittee', []);
    cache.set('logs', cacheKey, result);

    logger.info('pod_getCommittee', { result });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'pod_getCommittee_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

export async function pod_pastPerfectTime(): Promise<any> {
  try {
    const cacheKey = 'pod_pastPerfectTime';
    const cached = cache.get('networkStats', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('pod_pastPerfectTime', []);
    cache.set('networkStats', cacheKey, result);

    logger.info('pod_pastPerfectTime', { result });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'pod_pastPerfectTime_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

import { RpcClient } from '../client.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('gas-tools');
const client = new RpcClient();

export async function eth_estimateGas(params: [any]): Promise<any> {
  try {
    const [transaction] = params;

    const result = await client.call('eth_estimateGas', params);

    logger.info('eth_estimateGas', { transaction, result });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'eth_estimateGas_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

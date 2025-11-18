import { RpcClient } from '../client.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse } from '../types.js';

const logger = createLogger('send-tools');
const client = new RpcClient();

export async function eth_sendRawTransaction(params: [string]): Promise<any> {
  try {
    const [signedTx] = params;

    const result = await client.call('eth_sendRawTransaction', [signedTx]);

    logger.info('eth_sendRawTransaction', { txHash: result });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'eth_sendRawTransaction_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

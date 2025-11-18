/**
 * pod network Indexer - Account Management Tools
 * Implements FR-032 through FR-037: register, login, list/create/delete/update API keys
 */

import { IndexerClient } from '../indexer-client.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse, type RuntimeCredentials } from '../types.js';

const logger = createLogger('indexer-account-tools');
const sharedClient = new IndexerClient();

/**
 * Get IndexerClient instance for a request.
 * If runtime credentials are provided, creates a new client with those credentials.
 * Otherwise, returns the shared client instance.
 */
function getClient(runtimeCredentials?: RuntimeCredentials): IndexerClient {
  if (
    runtimeCredentials &&
    (runtimeCredentials.apiKey ||
      runtimeCredentials.login ||
      runtimeCredentials.password ||
      runtimeCredentials.indexerUrl)
  ) {
    return new IndexerClient(runtimeCredentials);
  }
  return sharedClient;
}

/**
 * FR-032: Register new account
 * @param params [{ login: string, password: string }]
 */
export async function indexer_register(
  params: [{ login: string; password: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ login, password }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const result = await client.register(login, password);

    logger.info('indexer_register', { login });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_register_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-033: Login to account
 * @param params [{ login: string, password: string }]
 */
export async function indexer_login(
  params: [{ login: string; password: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ login, password }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const result = await client.login(login, password);

    logger.info('indexer_login', { login });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error('indexer_login_error', error instanceof Error ? error : new Error(String(error)));
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-034: List API keys for account
 * @param params [{ jwtToken: string }]
 */
export async function indexer_listApiKeys(
  params: [{ jwtToken: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ jwtToken }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const result = await client.listApiKeys(jwtToken);

    logger.info('indexer_listApiKeys', { count: result.length });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_listApiKeys_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-035: Create new API key
 * @param params [{ jwtToken: string, name: string, expiresAt?: string }]
 */
export async function indexer_createApiKey(
  params: [{ jwtToken: string; name: string; expiresAt?: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ jwtToken, name }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const result = await client.createApiKey(jwtToken, name);

    logger.info('indexer_createApiKey', { name });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_createApiKey_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-036: Delete API key
 * @param params [{ jwtToken: string, keyId: string }]
 */
export async function indexer_deleteApiKey(
  params: [{ jwtToken: string; keyId: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ jwtToken, keyId }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const result = await client.call('DELETE', `/account/api-keys/${keyId}`, { jwtToken });

    logger.info('indexer_deleteApiKey', { keyId });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_deleteApiKey_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-037: Update API key
 * @param params [{ jwtToken: string, keyId: string, name?: string, expiresAt?: string }]
 */
export async function indexer_updateApiKey(
  params: [
    { jwtToken: string; keyId: string; name?: string; expiresAt?: string },
    RuntimeCredentials?
  ]
): Promise<any> {
  try {
    const [{ jwtToken, keyId, name, expiresAt }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const body: any = {};
    if (name) body.name = name;
    if (expiresAt) body.expiresAt = expiresAt;

    const result = await client.call('PUT', `/account/api-keys/${keyId}`, { jwtToken, body });

    logger.info('indexer_updateApiKey', { keyId });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_updateApiKey_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

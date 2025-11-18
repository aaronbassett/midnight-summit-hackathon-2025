/**
 * pod network Indexer - Data Query Tools
 * Implements FR-038 through FR-052: transactions, logs, contracts, auctions, bridge
 */

import { IndexerClient } from '../indexer-client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import { buildErrorResponse, type RuntimeCredentials } from '../types.js';

const logger = createLogger('indexer-data-tools');
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
 * FR-041: Get transaction by hash from indexer
 * Provides enriched transaction data with decoded information
 */
export async function indexer_getTransactionByHash(
  params: [string, RuntimeCredentials?]
): Promise<any> {
  try {
    const [txHash, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);

    const cacheKey = `indexer_getTransactionByHash:${txHash}`;
    const cached = cache.get('transactions', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('GET', `/data/transaction/${txHash}`);
    cache.set('transactions', cacheKey, result);

    logger.info('indexer_getTransactionByHash', { txHash });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_getTransactionByHash_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-038: Get transaction count for address
 */
export async function indexer_getTransactionsCount(
  params: [{ address: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ address }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const cacheKey = `indexer_getTransactionsCount:${address}`;
    const cached = cache.get('transactions', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('GET', `/data/transactions/count?address=${address}`);
    cache.set('transactions', cacheKey, result);

    logger.info('indexer_getTransactionsCount', { address });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_getTransactionsCount_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-039: Search general data with filters
 */
export async function indexer_searchGeneralData(
  params: [{ take?: number; skip?: number }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ take = 20, skip = 0 }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const queryParams = new URLSearchParams({ take: String(take), skip: String(skip) });
    const result = await client.call('GET', `/data/search?${queryParams}`);

    logger.info('indexer_searchGeneralData', { take, skip });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_searchGeneralData_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-040: List normal transactions with pagination
 */
export async function indexer_listNormalTransactions(
  params: [{ address?: string; take?: number; skip?: number }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ address, take = 20, skip = 0 }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const queryParams = new URLSearchParams({ take: String(take), skip: String(skip) });
    if (address) queryParams.set('address', address);

    const result = await client.call('GET', `/data/transactions?${queryParams}`);

    logger.info('indexer_listNormalTransactions', { address, take, skip });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_listNormalTransactions_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-042: List decoded transactions with pagination
 */
export async function indexer_listDecodedTransactions(
  params: [{ address?: string; take?: number; skip?: number }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ address, take = 20, skip = 0 }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const queryParams = new URLSearchParams({ take: String(take), skip: String(skip) });
    if (address) queryParams.set('address', address);

    const result = await client.call('GET', `/data/transactions/decoded?${queryParams}`);

    logger.info('indexer_listDecodedTransactions', { address, take, skip });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_listDecodedTransactions_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-043: Get decoded transaction by hash
 */
export async function indexer_getDecodedTransactionByHash(
  params: [string, RuntimeCredentials?]
): Promise<any> {
  try {
    const [txHash, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const cacheKey = `indexer_getDecodedTransactionByHash:${txHash}`;
    const cached = cache.get('transactions', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('GET', `/data/transaction/${txHash}/decoded`);
    cache.set('transactions', cacheKey, result);

    logger.info('indexer_getDecodedTransactionByHash', { txHash });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_getDecodedTransactionByHash_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

// T020: Log query tools
/**
 * FR-044: List logs with pagination
 */
export async function indexer_listLogs(
  params: [{ address?: string; topic?: string; take?: number; skip?: number }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ address, topic, take = 20, skip = 0 }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const queryParams = new URLSearchParams({ take: String(take), skip: String(skip) });
    if (address) queryParams.set('address', address);
    if (topic) queryParams.set('topic', topic);

    const result = await client.call('GET', `/data/logs?${queryParams}`);

    logger.info('indexer_listLogs', { address, topic, take, skip });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_listLogs_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-045: List decoded logs with pagination
 */
export async function indexer_listDecodedLogs(
  params: [{ address?: string; topic?: string; take?: number; skip?: number }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ address, topic, take = 20, skip = 0 }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const queryParams = new URLSearchParams({ take: String(take), skip: String(skip) });
    if (address) queryParams.set('address', address);
    if (topic) queryParams.set('topic', topic);

    const result = await client.call('GET', `/data/logs/decoded?${queryParams}`);

    logger.info('indexer_listDecodedLogs', { address, topic, take, skip });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_listDecodedLogs_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

// T021: Contract verification tools
/**
 * FR-046: Get contract source code
 */
export async function indexer_getContractSourceCode(
  params: [{ address: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ address }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const cacheKey = `indexer_getContractSourceCode:${address}`;
    const cached = cache.get('contracts', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('GET', `/data/contract/${address}/source`);
    cache.set('contracts', cacheKey, result);

    logger.info('indexer_getContractSourceCode', { address });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_getContractSourceCode_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-046: Verify contract
 */
export async function indexer_verifyContract(
  params: [
    {
      address: string;
      sourceCode: string;
      compiler: string;
      compilerVersion: string;
      contractName: string;
      constructorArguments?: string;
    },
    RuntimeCredentials?
  ]
): Promise<any> {
  try {
    const [
      { address, sourceCode, compiler, compilerVersion, contractName, constructorArguments },
      runtimeCredentials
    ] = params;
    const client = getClient(runtimeCredentials);
    const body = { sourceCode, compiler, compilerVersion, contractName, constructorArguments };
    const result = await client.call('POST', `/data/contract/${address}/verify`, { body });

    logger.info('indexer_verifyContract', { address, contractName });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_verifyContract_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

// T022: Auction tools
/**
 * FR-047: List auctions with pagination
 */
export async function indexer_listAuctions(
  params: [
    { contractAddress?: string; status?: string; take?: number; skip?: number },
    RuntimeCredentials?
  ]
): Promise<any> {
  try {
    const [{ contractAddress, status, take = 20, skip = 0 }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const queryParams = new URLSearchParams({ take: String(take), skip: String(skip) });
    if (contractAddress) queryParams.set('contractAddress', contractAddress);
    if (status) queryParams.set('status', status);

    const result = await client.call('GET', `/data/auctions?${queryParams}`);

    logger.info('indexer_listAuctions', { contractAddress, status, take, skip });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_listAuctions_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-048: Get auction by ID
 */
export async function indexer_getAuction(
  params: [{ auctionId: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ auctionId }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const cacheKey = `indexer_getAuction:${auctionId}`;
    const cached = cache.get('contracts', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('GET', `/data/auction/${auctionId}`);
    cache.set('contracts', cacheKey, result);

    logger.info('indexer_getAuction', { auctionId });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_getAuction_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-049: Get auction count
 */
export async function indexer_getAuctionCount(
  params: [{ contractAddress?: string; status?: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ contractAddress, status }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const queryParams = new URLSearchParams();
    if (contractAddress) queryParams.set('contractAddress', contractAddress);
    if (status) queryParams.set('status', status);

    const result = await client.call('GET', `/data/auctions/count?${queryParams}`);

    logger.info('indexer_getAuctionCount', { contractAddress, status });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_getAuctionCount_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-050: List auction bids
 */
export async function indexer_listAuctionBids(
  params: [{ auctionId: string; take?: number; skip?: number }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ auctionId, take = 20, skip = 0 }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const queryParams = new URLSearchParams({ take: String(take), skip: String(skip) });
    const result = await client.call('GET', `/data/auction/${auctionId}/bids?${queryParams}`);

    logger.info('indexer_listAuctionBids', { auctionId, take, skip });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_listAuctionBids_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

/**
 * FR-051: Get winning bid for auction
 */
export async function indexer_getWinningBid(
  params: [{ auctionId: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ auctionId }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const cacheKey = `indexer_getWinningBid:${auctionId}`;
    const cached = cache.get('contracts', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('GET', `/data/auction/${auctionId}/winning-bid`);
    cache.set('contracts', cacheKey, result);

    logger.info('indexer_getWinningBid', { auctionId });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_getWinningBid_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

// T023: Bridge tool
/**
 * FR-052: Get bridge certified log
 */
export async function indexer_getBridgeCertifiedLog(
  params: [{ logId: string }, RuntimeCredentials?]
): Promise<any> {
  try {
    const [{ logId }, runtimeCredentials] = params;
    const client = getClient(runtimeCredentials);
    const cacheKey = `indexer_getBridgeCertifiedLog:${logId}`;
    const cached = cache.get('logs', cacheKey);
    if (cached !== undefined) {
      return { content: [{ type: 'text', text: JSON.stringify({ result: cached }) }] };
    }

    const result = await client.call('GET', `/data/bridge/certified-log/${logId}`);
    cache.set('logs', cacheKey, result);

    logger.info('indexer_getBridgeCertifiedLog', { logId });
    return { content: [{ type: 'text', text: JSON.stringify({ result }) }] };
  } catch (error) {
    logger.error(
      'indexer_getBridgeCertifiedLog_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

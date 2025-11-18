/**
 * Address Analysis Composite Tool
 * FR-053: Combines multiple queries to produce comprehensive address profile
 */

import { RpcClient } from '../client.js';
import { IndexerClient } from '../indexer-client.js';
import { cache } from '../cache.js';
import { createLogger } from '../logger.js';
import {
  buildErrorResponse,
  IndexerTransaction,
  IndexerLog,
  IndexerSourceCodeData,
  BridgeActivity,
  IndexerTransactionCountResponse,
  IndexerTransactionList,
  IndexerLogList,
  BridgeActivityList,
  IndexerSourceCodeResponse
} from '../types.js';

const logger = createLogger('composite-address');
const rpcClient = new RpcClient();
const indexerClient = new IndexerClient();

export interface AddressAnalysis {
  address: string;
  type: 'EOA' | 'Contract' | 'Unknown';
  balance: string;
  nonce: string;
  transactionCount: number;
  recentTransactions: IndexerTransaction[];
  recentLogs: IndexerLog[];
  contractInfo?: {
    bytecode: string;
    sourceCode?: IndexerSourceCodeData;
    verified: boolean;
  };
  bridgeActivity?: BridgeActivity[];
  firstSeen?: string;
  lastSeen?: string;
  errors: string[];
  warnings: string[];
}

/**
 * analyze_address - Comprehensive address profile analysis
 *
 * Combines:
 * - eth_getBalance (balance)
 * - eth_getTransactionCount (nonce)
 * - eth_getCode (contract detection)
 * - indexer_listNormalTransactions (transaction history)
 * - indexer_listLogs (event logs)
 * - indexer_getContractSourceCode (verified contract source)
 * - indexer_getBridgeCertifiedLog (bridge activity)
 *
 * Implements partial success reporting (FR research finding #7)
 */
export async function analyze_address(params: [{ address: string; limit?: number }]): Promise<any> {
  try {
    const [{ address, limit = 10 }] = params;

    logger.info('analyze_address_start', { address, limit });

    const analysis: AddressAnalysis = {
      address,
      type: 'Unknown',
      balance: '0x0',
      nonce: '0x0',
      transactionCount: 0,
      recentTransactions: [],
      recentLogs: [],
      errors: [],
      warnings: []
    };

    // Execute queries in parallel with error handling for each
    const results = await Promise.allSettled([
      // RPC queries
      rpcClient.call('eth_getBalance', [address, 'latest']),
      rpcClient.call('eth_getTransactionCount', [address, 'latest']),
      rpcClient.call('eth_getCode', [address, 'latest']),

      // Indexer queries (with auto-provisioning)
      indexerClient
        .call('GET', '/data/general/transactions-count', { params: { address } })
        .catch(() => {
          analysis.warnings.push('Could not fetch transaction count from indexer');
          return null;
        }),
      indexerClient
        .call('GET', '/data/normal-transactions', { params: { address, take: limit } })
        .catch(() => {
          analysis.warnings.push('Could not fetch transaction history from indexer');
          return null;
        }),
      indexerClient.call('GET', '/data/logs', { params: { address, take: limit } }).catch(() => {
        analysis.warnings.push('Could not fetch event logs from indexer');
        return null;
      }),
      indexerClient.call('GET', '/data/bridge/certified-log', { params: { address } }).catch(() => {
        // Bridge activity is optional, don't warn
        return null;
      })
    ]);

    // Process RPC results
    if (results[0].status === 'fulfilled') {
      analysis.balance = results[0].value;
    } else {
      analysis.errors.push('Failed to fetch balance');
    }

    if (results[1].status === 'fulfilled') {
      analysis.nonce = results[1].value;
    } else {
      analysis.errors.push('Failed to fetch nonce');
    }

    // Determine address type from eth_getCode
    if (results[2].status === 'fulfilled') {
      const code = results[2].value as string;
      if (code === '0x' || code === '0x0') {
        analysis.type = 'EOA';
      } else {
        analysis.type = 'Contract';
        analysis.contractInfo = {
          bytecode: code,
          verified: false
        };

        // Try to fetch contract source code if it's a contract
        try {
          const sourceResult = await indexerClient.call<IndexerSourceCodeResponse>(
            'GET',
            '/etherscan-like/api',
            {
              params: {
                module: 'contract',
                action: 'getsourcecode',
                address
              }
            }
          );

          if (sourceResult && sourceResult.result && sourceResult.result[0]) {
            const sourceData = sourceResult.result[0];
            if (sourceData.SourceCode) {
              analysis.contractInfo.sourceCode = sourceData;
              analysis.contractInfo.verified = true;
            }
          }
        } catch (err) {
          analysis.warnings.push('Could not fetch contract source code');
        }
      }
    } else {
      analysis.errors.push('Failed to fetch contract code');
    }

    // Process indexer results
    if (results[3].status === 'fulfilled' && results[3].value) {
      const countData = results[3].value as IndexerTransactionCountResponse;
      analysis.transactionCount = countData.count || 0;
    }

    if (results[4].status === 'fulfilled' && results[4].value) {
      const txData = results[4].value as IndexerTransactionList;
      analysis.recentTransactions = txData.items || txData.result || [];

      // Extract first/last seen timestamps
      if (analysis.recentTransactions.length > 0) {
        const timestamps = analysis.recentTransactions
          .map((tx: IndexerTransaction) => tx.timestamp)
          .filter(Boolean)
          .sort();

        if (timestamps.length > 0) {
          analysis.firstSeen = String(timestamps[0]);
          analysis.lastSeen = String(timestamps[timestamps.length - 1]);
        }
      }
    }

    if (results[5].status === 'fulfilled' && results[5].value) {
      const logData = results[5].value as IndexerLogList;
      analysis.recentLogs = logData.items || logData.result || [];
    }

    if (results[6].status === 'fulfilled' && results[6].value) {
      const bridgeData = results[6].value as BridgeActivityList;
      if (bridgeData.items || bridgeData.result) {
        analysis.bridgeActivity = bridgeData.items || bridgeData.result;
      }
    }

    // Cache the analysis (5 minute TTL for address analysis)
    const cacheKey = `analyze_address:${address}:${limit}`;
    cache.set('transactions', cacheKey, analysis);

    logger.info('analyze_address_complete', {
      address,
      type: analysis.type,
      txCount: analysis.transactionCount,
      errorCount: analysis.errors.length,
      warningCount: analysis.warnings.length
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ result: analysis }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error(
      'analyze_address_error',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(buildErrorResponse(error)) }],
      isError: true
    };
  }
}

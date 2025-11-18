/**
 * pod network MCP Server - Main Entry Point
 * Registers all RPC tools + Indexer tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { initializeLogger, createLogger } from './logger.js';
import { cache } from './cache.js';
import { validateParams } from './validation.js';
import * as types from './types.js';
import * as state from './tools/state.js';
import * as blocks from './tools/blocks.js';
import * as transactions from './tools/transactions.js';
import * as logs from './tools/logs.js';
import * as gas from './tools/gas.js';
import * as send from './tools/send.js';
import * as network from './tools/network.js';
import * as indexerData from './tools/indexer-data.js';
import * as indexerAccount from './tools/indexer-account.js';
import * as compositeAddress from './tools/composite-address.js';
import * as compositeAuction from './tools/composite-auction.js';
import * as compositeFinality from './tools/composite-finality.js';
import * as compositeNetwork from './tools/composite-network.js';
import * as compositePerformance from './tools/composite-performance.js';

const logger = createLogger('server');

/**
 * Optional runtime credential parameters for indexer_* tools.
 * These credentials override environment variables and stored credentials
 * for the specific tool call only. They are NOT persisted to disk.
 *
 * Priority: apiKey > login+password > env vars > stored credentials
 */
const RUNTIME_CREDENTIAL_PROPERTIES = {
  apiKey: {
    type: 'string',
    description:
      'Optional API key for this request only (not persisted). Highest priority if provided.'
  },
  login: {
    type: 'string',
    description:
      'Optional username for this request only (not persisted). Requires password. Creates new API key on first use.'
  },
  password: {
    type: 'string',
    description:
      'Optional password for this request only (not persisted). Requires login. Creates new API key on first use.'
  },
  indexerUrl: {
    type: 'string',
    description: 'Optional custom indexer URL for this request only (not persisted).'
  }
};

/**
 * Runtime credential properties without login/password (for tools that already have those as required params)
 */
const RUNTIME_CREDENTIAL_PROPERTIES_NO_LOGIN = {
  apiKey: {
    type: 'string',
    description:
      'Optional API key for this request only (not persisted). Overrides login/password for authentication.'
  },
  indexerUrl: {
    type: 'string',
    description: 'Optional custom indexer URL for this request only (not persisted).'
  }
};

const TOOLS = [
  {
    name: 'eth_blockNumber',
    description: 'Get latest block number from pod network',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'eth_chainId',
    description: 'Get chain ID (0x50d for dev network)',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'eth_gasPrice',
    description: 'Get current gas price estimate in wei',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'eth_getBalance',
    description: 'Get account balance in wei at specific block',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '0x-prefixed address' },
        blockIdentifier: {
          type: 'string',
          description: 'Block number (hex) or tag (latest/earliest/finalized)'
        }
      },
      required: ['address', 'blockIdentifier']
    }
  },
  {
    name: 'eth_getCode',
    description:
      'Get code at address (contract bytecode). Returns "0x" for EOAs, bytecode for contracts',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '0x-prefixed address' },
        blockIdentifier: {
          type: 'string',
          description: 'Block number (hex) or tag (latest/earliest/finalized)'
        }
      },
      required: ['address', 'blockIdentifier']
    }
  },
  {
    name: 'eth_getBlockByHash',
    description: 'Retrieve full block data by block hash',
    inputSchema: {
      type: 'object',
      properties: {
        blockHash: { type: 'string', description: '0x-prefixed block hash' },
        includeTransactions: {
          type: 'boolean',
          description: 'Include full transaction objects (true) or hashes only (false)'
        }
      },
      required: ['blockHash', 'includeTransactions']
    }
  },
  {
    name: 'eth_getBlockByNumber',
    description: 'Retrieve full block data by block number or tag',
    inputSchema: {
      type: 'object',
      properties: {
        blockIdentifier: {
          type: 'string',
          description: 'Block number (hex) or tag (latest/earliest/finalized)'
        },
        includeTransactions: {
          type: 'boolean',
          description: 'Include full transaction objects (true) or hashes only (false)'
        }
      },
      required: ['blockIdentifier', 'includeTransactions']
    }
  },
  {
    name: 'eth_getTransactionByHash',
    description: 'Get transaction details by hash',
    inputSchema: {
      type: 'object',
      properties: { txHash: { type: 'string', description: '0x-prefixed transaction hash' } },
      required: ['txHash']
    }
  },
  {
    name: 'eth_getTransactionCount',
    description: 'Get nonce (transaction count) for address',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '0x-prefixed address' },
        blockIdentifier: {
          type: 'string',
          description: 'Block number (hex) or tag (latest/earliest/finalized)'
        }
      },
      required: ['address', 'blockIdentifier']
    }
  },
  {
    name: 'eth_getTransactionReceipt',
    description: 'Get transaction receipt with status and logs',
    inputSchema: {
      type: 'object',
      properties: { txHash: { type: 'string', description: '0x-prefixed transaction hash' } },
      required: ['txHash']
    }
  },
  {
    name: 'eth_getLogs',
    description: 'Query event logs with filters (max 1000 results)',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'object', description: 'Filter with fromBlock, toBlock, address, topics' }
      },
      required: ['filter']
    }
  },
  {
    name: 'eth_estimateGas',
    description: 'Estimate gas required for transaction',
    inputSchema: {
      type: 'object',
      properties: {
        transaction: {
          type: 'object',
          description: 'Transaction object with from, to, data, value'
        }
      },
      required: ['transaction']
    }
  },
  {
    name: 'eth_sendRawTransaction',
    description: 'Broadcast signed transaction to network',
    inputSchema: {
      type: 'object',
      properties: {
        signedTx: { type: 'string', description: '0x-prefixed signed transaction' }
      },
      required: ['signedTx']
    }
  },
  {
    name: 'eth_networkId',
    description: 'Get network ID as decimal string',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'net_version',
    description: 'Get network version as decimal string',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'pod_getCommittee',
    description: 'Get current validator committee members',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'pod_pastPerfectTime',
    description: 'Get past perfect time (finality checkpoint) as microsecond Unix timestamp',
    inputSchema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'pod_listReceipts',
    description: 'List confirmed transaction receipts after a specified timestamp',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Optional 0x-prefixed address to filter receipts by sender or recipient'
        },
        since: {
          type: 'number',
          description: 'Required timestamp in microseconds since Unix epoch'
        }
      },
      required: ['since']
    }
  },
  {
    name: 'indexer_getTransactionByHash',
    description: 'Get enriched transaction data from indexer with decoded information',
    inputSchema: {
      type: 'object',
      properties: {
        txHash: {
          type: 'string',
          description: '0x-prefixed transaction hash'
        },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['txHash']
    }
  },
  // Account management tools (T018)
  {
    name: 'indexer_register',
    description: 'Register new indexer account',
    inputSchema: {
      type: 'object',
      properties: {
        login: { type: 'string', description: 'Username for account' },
        password: { type: 'string', description: 'Password for account' },
        ...RUNTIME_CREDENTIAL_PROPERTIES_NO_LOGIN
      },
      required: ['login', 'password']
    }
  },
  {
    name: 'indexer_login',
    description: 'Login to indexer account',
    inputSchema: {
      type: 'object',
      properties: {
        login: { type: 'string', description: 'Username' },
        password: { type: 'string', description: 'Password' },
        ...RUNTIME_CREDENTIAL_PROPERTIES_NO_LOGIN
      },
      required: ['login', 'password']
    }
  },
  {
    name: 'indexer_listApiKeys',
    description: 'List all API keys for account',
    inputSchema: {
      type: 'object',
      properties: {
        jwtToken: { type: 'string', description: 'JWT authentication token' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['jwtToken']
    }
  },
  {
    name: 'indexer_createApiKey',
    description: 'Create new API key',
    inputSchema: {
      type: 'object',
      properties: {
        jwtToken: { type: 'string', description: 'JWT authentication token' },
        name: { type: 'string', description: 'Name for the API key' },
        expiresAt: { type: 'string', description: 'Optional expiration date' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['jwtToken', 'name']
    }
  },
  {
    name: 'indexer_deleteApiKey',
    description: 'Delete API key',
    inputSchema: {
      type: 'object',
      properties: {
        jwtToken: { type: 'string', description: 'JWT authentication token' },
        keyId: { type: 'string', description: 'API key ID to delete' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['jwtToken', 'keyId']
    }
  },
  {
    name: 'indexer_updateApiKey',
    description: 'Update API key',
    inputSchema: {
      type: 'object',
      properties: {
        jwtToken: { type: 'string', description: 'JWT authentication token' },
        keyId: { type: 'string', description: 'API key ID to update' },
        name: { type: 'string', description: 'New name for API key' },
        expiresAt: { type: 'string', description: 'New expiration date' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['jwtToken', 'keyId']
    }
  },
  // Transaction query tools (T019)
  {
    name: 'indexer_getTransactionsCount',
    description: 'Get transaction count for address',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '0x-prefixed address' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['address']
    }
  },
  {
    name: 'indexer_searchGeneralData',
    description: 'Search general data with pagination',
    inputSchema: {
      type: 'object',
      properties: {
        take: { type: 'number', description: 'Number of results (default: 20)' },
        skip: { type: 'number', description: 'Number to skip (default: 0)' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: []
    }
  },
  {
    name: 'indexer_listNormalTransactions',
    description: 'List normal transactions with pagination',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Optional address filter' },
        take: { type: 'number', description: 'Number of results (default: 20)' },
        skip: { type: 'number', description: 'Number to skip (default: 0)' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: []
    }
  },
  {
    name: 'indexer_listDecodedTransactions',
    description: 'List decoded transactions with pagination',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Optional address filter' },
        take: { type: 'number', description: 'Number of results (default: 20)' },
        skip: { type: 'number', description: 'Number to skip (default: 0)' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: []
    }
  },
  {
    name: 'indexer_getDecodedTransactionByHash',
    description: 'Get decoded transaction by hash',
    inputSchema: {
      type: 'object',
      properties: {
        txHash: { type: 'string', description: '0x-prefixed transaction hash' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['txHash']
    }
  },
  // Log query tools (T020)
  {
    name: 'indexer_listLogs',
    description: 'List logs with pagination and filters',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Optional contract address filter' },
        topic: { type: 'string', description: 'Optional topic filter' },
        take: { type: 'number', description: 'Number of results (default: 20)' },
        skip: { type: 'number', description: 'Number to skip (default: 0)' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: []
    }
  },
  {
    name: 'indexer_listDecodedLogs',
    description: 'List decoded logs with pagination and filters',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Optional contract address filter' },
        topic: { type: 'string', description: 'Optional topic filter' },
        take: { type: 'number', description: 'Number of results (default: 20)' },
        skip: { type: 'number', description: 'Number to skip (default: 0)' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: []
    }
  },
  // Contract verification tools (T021)
  {
    name: 'indexer_getContractSourceCode',
    description: 'Get verified contract source code',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '0x-prefixed contract address' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['address']
    }
  },
  {
    name: 'indexer_verifyContract',
    description: 'Verify and publish contract source code',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '0x-prefixed contract address' },
        sourceCode: { type: 'string', description: 'Contract source code' },
        compiler: { type: 'string', description: 'Compiler name' },
        compilerVersion: { type: 'string', description: 'Compiler version' },
        contractName: { type: 'string', description: 'Contract name' },
        constructorArguments: {
          type: 'string',
          description: 'Optional constructor arguments (hex)'
        },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['address', 'sourceCode', 'compiler', 'compilerVersion', 'contractName']
    }
  },
  // Auction tools (T022)
  {
    name: 'indexer_listAuctions',
    description: 'List auctions with pagination and filters',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: { type: 'string', description: 'Optional contract address filter' },
        status: {
          type: 'string',
          description: 'Optional status filter (active/completed/cancelled)'
        },
        take: { type: 'number', description: 'Number of results (default: 20)' },
        skip: { type: 'number', description: 'Number to skip (default: 0)' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: []
    }
  },
  {
    name: 'indexer_getAuction',
    description: 'Get auction by ID',
    inputSchema: {
      type: 'object',
      properties: {
        auctionId: { type: 'string', description: 'Auction ID' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['auctionId']
    }
  },
  {
    name: 'indexer_getAuctionCount',
    description: 'Get auction count with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        contractAddress: { type: 'string', description: 'Optional contract address filter' },
        status: { type: 'string', description: 'Optional status filter' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: []
    }
  },
  {
    name: 'indexer_listAuctionBids',
    description: 'List bids for an auction',
    inputSchema: {
      type: 'object',
      properties: {
        auctionId: { type: 'string', description: 'Auction ID' },
        take: { type: 'number', description: 'Number of results (default: 20)' },
        skip: { type: 'number', description: 'Number to skip (default: 0)' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['auctionId']
    }
  },
  {
    name: 'indexer_getWinningBid',
    description: 'Get winning bid for auction',
    inputSchema: {
      type: 'object',
      properties: {
        auctionId: { type: 'string', description: 'Auction ID' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['auctionId']
    }
  },
  // Bridge tool (T023)
  {
    name: 'indexer_getBridgeCertifiedLog',
    description: 'Get bridge certified log by ID',
    inputSchema: {
      type: 'object',
      properties: {
        logId: { type: 'string', description: 'Log ID' },
        ...RUNTIME_CREDENTIAL_PROPERTIES
      },
      required: ['logId']
    }
  },
  // Composite analysis tools (T048-T056)
  {
    name: 'analyze_address',
    description:
      'Comprehensive address profile analysis combining balance, nonce, transaction history, logs, contract info, and bridge activity',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: '0x-prefixed address to analyze' },
        limit: { type: 'number', description: 'Limit for transaction/log history (default: 10)' }
      },
      required: ['address']
    }
  },
  {
    name: 'analyze_auction',
    description: 'Comprehensive auction analysis with bids, bidder profiles, and timeline',
    inputSchema: {
      type: 'object',
      properties: {
        auctionId: { type: 'string', description: 'Auction ID' },
        includeBidderProfiles: {
          type: 'boolean',
          description: 'Include bidder profiles (default: true)'
        }
      },
      required: ['auctionId']
    }
  },
  {
    name: 'verify_finality',
    description: 'Verify transaction finality status with attestation count and confidence level',
    inputSchema: {
      type: 'object',
      properties: {
        txHash: { type: 'string', description: '0x-prefixed transaction hash' }
      },
      required: ['txHash']
    }
  },
  {
    name: 'analyze_past_perfect_time',
    description: 'Analyze Past Perfect Time (finality checkpoint) with receipts and lag metrics',
    inputSchema: {
      type: 'object',
      properties: {
        windowSeconds: { type: 'number', description: 'Time window in seconds (default: 60)' }
      },
      required: []
    }
  },
  {
    name: 'analyze_committee',
    description: 'Committee composition analysis with quorum calculations',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'network_health_dashboard',
    description:
      'Comprehensive network health monitoring with throughput, finality, validator participation, and PPT lag',
    inputSchema: {
      type: 'object',
      properties: {
        windowSeconds: { type: 'number', description: 'Time window in seconds (default: 60)' }
      },
      required: []
    }
  },
  {
    name: 'analyze_pod_performance',
    description:
      'Network performance metrics including throughput, finality, and latency percentiles',
    inputSchema: {
      type: 'object',
      properties: {
        windowSeconds: { type: 'number', description: 'Time window in seconds (default: 60)' }
      },
      required: []
    }
  },
  {
    name: 'track_attestation_performance',
    description: 'Attestation statistics with distribution and validator participation',
    inputSchema: {
      type: 'object',
      properties: {
        windowSeconds: { type: 'number', description: 'Time window in seconds (default: 60)' }
      },
      required: []
    }
  },
  {
    name: 'benchmark_transaction_speed',
    description:
      'Benchmark transaction speed from submission through attestation stages (requires signed transaction)',
    inputSchema: {
      type: 'object',
      properties: {
        signedTx: { type: 'string', description: '0x-prefixed signed transaction' },
        pollIntervalMs: {
          type: 'number',
          description: 'Polling interval in milliseconds (default: 500)'
        },
        maxPollAttempts: { type: 'number', description: 'Maximum polling attempts (default: 40)' }
      },
      required: ['signedTx']
    }
  }
];

async function main() {
  await initializeLogger();
  logger.info('server_starting', { version: '1.0.0', tools: TOOLS.length });

  const server = new Server(
    { name: 'midnight-network', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  /**
   * Extract runtime credentials from tool arguments.
   * Returns undefined if no runtime credentials are provided.
   */
  function extractRuntimeCredentials(args: any): types.RuntimeCredentials | undefined {
    const { apiKey, login, password, indexerUrl } = args;
    // Only create credentials object if at least one field is provided
    if (apiKey || login || password || indexerUrl) {
      return { apiKey, login, password, indexerUrl };
    }
    return undefined;
  }

  /**
   * Tool handler type for consistent error handling and validation
   */
  type ToolHandler = (args: any) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;

  /**
   * Handler map for all MCP tools
   * Each handler encapsulates validation and execution logic
   */
  const toolHandlers: Record<string, ToolHandler> = {
    eth_blockNumber: async _args => {
      validateParams('eth_blockNumber', []);
      return await state.eth_blockNumber();
    },
    eth_chainId: async _args => {
      validateParams('eth_chainId', []);
      return await state.eth_chainId();
    },
    eth_gasPrice: async _args => {
      validateParams('eth_gasPrice', []);
      return await state.eth_gasPrice();
    },
    eth_getBalance: async args => {
      const a = args as unknown as types.ToolArgsGetBalance;
      const validatedParams = validateParams('eth_getBalance', [a.address, a.blockIdentifier]);
      return await state.eth_getBalance(validatedParams as [string, string]);
    },
    eth_getCode: async args => {
      const a = args as unknown as types.ToolArgsGetCode;
      const validatedParams = validateParams('eth_getCode', [a.address, a.blockIdentifier]);
      return await state.eth_getCode(validatedParams as [string, string]);
    },
    eth_getBlockByHash: async args => {
      const a = args as unknown as types.ToolArgsGetBlockByHash;
      const validatedParams = validateParams('eth_getBlockByHash', [
        a.blockHash,
        a.includeTransactions
      ]);
      return await blocks.eth_getBlockByHash(validatedParams as [string, boolean]);
    },
    eth_getBlockByNumber: async args => {
      const a = args as unknown as types.ToolArgsGetBlockByNumber;
      const validatedParams = validateParams('eth_getBlockByNumber', [
        a.blockIdentifier,
        a.includeTransactions
      ]);
      return await blocks.eth_getBlockByNumber(validatedParams as [string, boolean]);
    },
    eth_getTransactionByHash: async args => {
      const a = args as unknown as types.ToolArgsGetTransactionByHash;
      const validatedParams = validateParams('eth_getTransactionByHash', [a.txHash]);
      return await transactions.eth_getTransactionByHash(validatedParams as [string]);
    },
    eth_getTransactionCount: async args => {
      const a = args as unknown as types.ToolArgsGetTransactionCount;
      const validatedParams = validateParams('eth_getTransactionCount', [
        a.address,
        a.blockIdentifier
      ]);
      return await transactions.eth_getTransactionCount(validatedParams as [string, string]);
    },
    eth_getTransactionReceipt: async args => {
      const a = args as unknown as types.ToolArgsGetTransactionReceipt;
      const validatedParams = validateParams('eth_getTransactionReceipt', [a.txHash]);
      return await transactions.eth_getTransactionReceipt(validatedParams as [string]);
    },
    eth_getLogs: async args => {
      const a = args as unknown as types.ToolArgsGetLogs;
      const validatedParams = validateParams('eth_getLogs', [a.filter]);
      return await logs.eth_getLogs(validatedParams as [any]);
    },
    eth_estimateGas: async args => {
      const a = args as unknown as types.ToolArgsEstimateGas;
      const validatedParams = validateParams('eth_estimateGas', [a.transaction]);
      return await gas.eth_estimateGas(validatedParams as [any]);
    },
    eth_sendRawTransaction: async args => {
      const a = args as unknown as types.ToolArgsSendRawTransaction;
      const validatedParams = validateParams('eth_sendRawTransaction', [a.signedTx]);
      return await send.eth_sendRawTransaction(validatedParams as [string]);
    },
    eth_networkId: async _args => {
      validateParams('eth_networkId', []);
      return await network.eth_networkId();
    },
    net_version: async _args => {
      validateParams('net_version', []);
      return await network.net_version();
    },
    pod_getCommittee: async _args => {
      validateParams('pod_getCommittee', []);
      return await network.pod_getCommittee();
    },
    pod_pastPerfectTime: async _args => {
      validateParams('pod_pastPerfectTime', []);
      return await network.pod_pastPerfectTime();
    },
    pod_listReceipts: async args => {
      const a = args as unknown as types.ToolArgsListReceipts;
      const validatedParams = validateParams('pod_listReceipts', [
        { address: a.address, since: a.since }
      ]);
      return await transactions.pod_listReceipts(
        validatedParams as [{ address?: string; since: number }]
      );
    },
    indexer_getTransactionByHash: async args => {
      const a = args as unknown as types.ToolArgsGetTransactionByHash;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_getTransactionByHash', [
        a.txHash,
        runtimeCredentials
      ]);
      return await indexerData.indexer_getTransactionByHash(
        validatedParams as [string, types.RuntimeCredentials?]
      );
    },
    indexer_register: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_register', [
        { login: a.login, password: a.password },
        runtimeCredentials
      ]);
      return await indexerAccount.indexer_register(
        validatedParams as [{ login: string; password: string }, types.RuntimeCredentials?]
      );
    },
    indexer_login: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_login', [
        { login: a.login, password: a.password },
        runtimeCredentials
      ]);
      return await indexerAccount.indexer_login(
        validatedParams as [{ login: string; password: string }, types.RuntimeCredentials?]
      );
    },
    indexer_listApiKeys: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_listApiKeys', [
        { jwtToken: a.jwtToken },
        runtimeCredentials
      ]);
      return await indexerAccount.indexer_listApiKeys(
        validatedParams as [{ jwtToken: string }, types.RuntimeCredentials?]
      );
    },
    indexer_createApiKey: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_createApiKey', [
        { jwtToken: a.jwtToken, name: a.name, expiresAt: a.expiresAt },
        runtimeCredentials
      ]);
      return await indexerAccount.indexer_createApiKey(
        validatedParams as [
          { jwtToken: string; name: string; expiresAt?: string },
          types.RuntimeCredentials?
        ]
      );
    },
    indexer_deleteApiKey: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_deleteApiKey', [
        { jwtToken: a.jwtToken, keyId: a.keyId },
        runtimeCredentials
      ]);
      return await indexerAccount.indexer_deleteApiKey(
        validatedParams as [{ jwtToken: string; keyId: string }, types.RuntimeCredentials?]
      );
    },
    indexer_updateApiKey: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_updateApiKey', [
        { jwtToken: a.jwtToken, keyId: a.keyId, name: a.name, expiresAt: a.expiresAt },
        runtimeCredentials
      ]);
      return await indexerAccount.indexer_updateApiKey(
        validatedParams as [
          { jwtToken: string; keyId: string; name?: string; expiresAt?: string },
          types.RuntimeCredentials?
        ]
      );
    },
    indexer_getTransactionsCount: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_getTransactionsCount', [
        { address: a.address },
        runtimeCredentials
      ]);
      return await indexerData.indexer_getTransactionsCount(
        validatedParams as [{ address: string }, types.RuntimeCredentials?]
      );
    },
    indexer_searchGeneralData: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_searchGeneralData', [
        { take: a.take, skip: a.skip },
        runtimeCredentials
      ]);
      return await indexerData.indexer_searchGeneralData(
        validatedParams as [{ take?: number; skip?: number }, types.RuntimeCredentials?]
      );
    },
    indexer_listNormalTransactions: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_listNormalTransactions', [
        { address: a.address, take: a.take, skip: a.skip },
        runtimeCredentials
      ]);
      return await indexerData.indexer_listNormalTransactions(
        validatedParams as [
          { address?: string; take?: number; skip?: number },
          types.RuntimeCredentials?
        ]
      );
    },
    indexer_listDecodedTransactions: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_listDecodedTransactions', [
        { address: a.address, take: a.take, skip: a.skip },
        runtimeCredentials
      ]);
      return await indexerData.indexer_listDecodedTransactions(
        validatedParams as [
          { address?: string; take?: number; skip?: number },
          types.RuntimeCredentials?
        ]
      );
    },
    indexer_getDecodedTransactionByHash: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_getDecodedTransactionByHash', [
        a.txHash,
        runtimeCredentials
      ]);
      return await indexerData.indexer_getDecodedTransactionByHash(
        validatedParams as [string, types.RuntimeCredentials?]
      );
    },
    indexer_listLogs: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_listLogs', [
        { address: a.address, topic: a.topic, take: a.take, skip: a.skip },
        runtimeCredentials
      ]);
      return await indexerData.indexer_listLogs(
        validatedParams as [
          { address?: string; topic?: string; take?: number; skip?: number },
          types.RuntimeCredentials?
        ]
      );
    },
    indexer_listDecodedLogs: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_listDecodedLogs', [
        { address: a.address, topic: a.topic, take: a.take, skip: a.skip },
        runtimeCredentials
      ]);
      return await indexerData.indexer_listDecodedLogs(
        validatedParams as [
          { address?: string; topic?: string; take?: number; skip?: number },
          types.RuntimeCredentials?
        ]
      );
    },
    indexer_getContractSourceCode: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_getContractSourceCode', [
        { address: a.address },
        runtimeCredentials
      ]);
      return await indexerData.indexer_getContractSourceCode(
        validatedParams as [{ address: string }, types.RuntimeCredentials?]
      );
    },
    indexer_verifyContract: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_verifyContract', [
        {
          address: a.address,
          sourceCode: a.sourceCode,
          compiler: a.compiler,
          compilerVersion: a.compilerVersion,
          contractName: a.contractName,
          constructorArguments: a.constructorArguments
        },
        runtimeCredentials
      ]);
      return await indexerData.indexer_verifyContract(
        validatedParams as [
          {
            address: string;
            sourceCode: string;
            compiler: string;
            compilerVersion: string;
            contractName: string;
            constructorArguments?: string;
          },
          types.RuntimeCredentials?
        ]
      );
    },
    indexer_listAuctions: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_listAuctions', [
        { contractAddress: a.contractAddress, status: a.status, take: a.take, skip: a.skip },
        runtimeCredentials
      ]);
      return await indexerData.indexer_listAuctions(
        validatedParams as [
          { contractAddress?: string; status?: string; take?: number; skip?: number },
          types.RuntimeCredentials?
        ]
      );
    },
    indexer_getAuction: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_getAuction', [
        { auctionId: a.auctionId },
        runtimeCredentials
      ]);
      return await indexerData.indexer_getAuction(
        validatedParams as [{ auctionId: string }, types.RuntimeCredentials?]
      );
    },
    indexer_getAuctionCount: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_getAuctionCount', [
        { contractAddress: a.contractAddress, status: a.status },
        runtimeCredentials
      ]);
      return await indexerData.indexer_getAuctionCount(
        validatedParams as [
          { contractAddress?: string; status?: string },
          types.RuntimeCredentials?
        ]
      );
    },
    indexer_listAuctionBids: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_listAuctionBids', [
        { auctionId: a.auctionId, take: a.take, skip: a.skip },
        runtimeCredentials
      ]);
      return await indexerData.indexer_listAuctionBids(
        validatedParams as [
          { auctionId: string; take?: number; skip?: number },
          types.RuntimeCredentials?
        ]
      );
    },
    indexer_getWinningBid: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_getWinningBid', [
        { auctionId: a.auctionId },
        runtimeCredentials
      ]);
      return await indexerData.indexer_getWinningBid(
        validatedParams as [{ auctionId: string }, types.RuntimeCredentials?]
      );
    },
    indexer_getBridgeCertifiedLog: async args => {
      const a = args as any;
      const runtimeCredentials = extractRuntimeCredentials(a);
      const validatedParams = validateParams('indexer_getBridgeCertifiedLog', [
        { logId: a.logId },
        runtimeCredentials
      ]);
      return await indexerData.indexer_getBridgeCertifiedLog(
        validatedParams as [{ logId: string }, types.RuntimeCredentials?]
      );
    },
    analyze_address: async args => {
      const a = args as any;
      const validatedParams = validateParams('analyze_address', [
        { address: a.address, limit: a.limit }
      ]);
      return await compositeAddress.analyze_address(
        validatedParams as [{ address: string; limit?: number }]
      );
    },
    analyze_auction: async args => {
      const a = args as any;
      const validatedParams = validateParams('analyze_auction', [
        { auctionId: a.auctionId, includeBidderProfiles: a.includeBidderProfiles }
      ]);
      return await compositeAuction.analyze_auction(
        validatedParams as [{ auctionId: string; includeBidderProfiles?: boolean }]
      );
    },
    verify_finality: async args => {
      const a = args as any;
      const validatedParams = validateParams('verify_finality', [{ txHash: a.txHash }]);
      return await compositeFinality.verify_finality(validatedParams as [{ txHash: string }]);
    },
    analyze_past_perfect_time: async args => {
      const a = args as any;
      const validatedParams = validateParams('analyze_past_perfect_time', [
        { windowSeconds: a.windowSeconds }
      ]);
      return await compositeFinality.analyze_past_perfect_time(
        validatedParams as [{ windowSeconds?: number }]
      );
    },
    analyze_committee: async _args => {
      const validatedParams = validateParams('analyze_committee', [{}]);
      return await compositeNetwork.analyze_committee(validatedParams as [Record<string, never>]);
    },
    network_health_dashboard: async args => {
      const a = args as any;
      const validatedParams = validateParams('network_health_dashboard', [
        { windowSeconds: a.windowSeconds }
      ]);
      return await compositeNetwork.network_health_dashboard(
        validatedParams as [{ windowSeconds?: number }]
      );
    },
    analyze_pod_performance: async args => {
      const a = args as any;
      const validatedParams = validateParams('analyze_pod_performance', [
        { windowSeconds: a.windowSeconds }
      ]);
      return await compositePerformance.analyze_pod_performance(
        validatedParams as [{ windowSeconds?: number }]
      );
    },
    track_attestation_performance: async args => {
      const a = args as any;
      const validatedParams = validateParams('track_attestation_performance', [
        { windowSeconds: a.windowSeconds }
      ]);
      return await compositePerformance.track_attestation_performance(
        validatedParams as [{ windowSeconds?: number }]
      );
    },
    benchmark_transaction_speed: async args => {
      const a = args as any;
      const validatedParams = validateParams('benchmark_transaction_speed', [
        {
          signedTx: a.signedTx,
          pollIntervalMs: a.pollIntervalMs,
          maxPollAttempts: a.maxPollAttempts
        }
      ]);
      return await compositePerformance.benchmark_transaction_speed(
        validatedParams as [{ signedTx: string; pollIntervalMs?: number; maxPollAttempts?: number }]
      );
    }
  };

  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;
    logger.info('tool_call', { name });

    try {
      const handler = toolHandlers[name];

      if (!handler) {
        logger.error('unknown_tool', { name });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'INVALID_METHOD', message: `Unknown tool: ${name}` })
            }
          ],
          isError: true
        };
      }

      return await handler(args);
    } catch (error) {
      logger.error('tool_error', error instanceof Error ? error : new Error(String(error)));
      return {
        content: [
          { type: 'text', text: JSON.stringify({ error: 'SERVER_ERROR', message: String(error) }) }
        ],
        isError: true
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('server_ready', { tools: 16 });

  // Log cache stats periodically
  const statsInterval = setInterval(() => {
    const stats = cache.getStats();
    logger.info('cache_stats', {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
      size: stats.size
    });
  }, 60000); // Every 60 seconds

  // Graceful shutdown handler
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info('shutdown_initiated', { signal });

    // Log final cache stats
    const stats = cache.getStats();
    logger.info('final_cache_stats', {
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      cacheHitRate: `${(stats.hitRate * 100).toFixed(1)}%`,
      cacheSize: stats.size
    });

    // Clean up resources
    clearInterval(statsInterval);

    // Close server connection
    try {
      await server.close();
      logger.info('server_closed');
    } catch (error) {
      logger.error('server_close_error', error instanceof Error ? error : new Error(String(error)));
    }

    logger.info('shutdown_complete');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(error => {
  console.error('Fatal:', error);
  process.exit(1);
});

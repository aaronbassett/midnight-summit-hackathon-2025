import { z } from 'zod';

const hexString = z.string().regex(/^0x[0-9a-fA-F]+$/);
const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const blockIdentifier = z.union([hexString, z.enum(['earliest', 'finalized', 'latest'])]);
const pagination = z.object({
  take: z.number().int().positive().max(1000).optional(),
  skip: z.number().int().nonnegative().optional()
});

export const schemas = {
  // --- Standard RPC Schemas ---
  eth_blockNumber: z.tuple([]),
  eth_chainId: z.tuple([]),
  eth_gasPrice: z.tuple([]),
  eth_getBalance: z.tuple([address, blockIdentifier]),
  eth_getBlockByHash: z.tuple([hexString, z.boolean()]),
  eth_getBlockByNumber: z.tuple([blockIdentifier, z.boolean()]),
  eth_getTransactionByHash: z.tuple([hexString]),
  eth_getTransactionCount: z.tuple([address, blockIdentifier]),
  eth_getTransactionReceipt: z.tuple([hexString]),
  eth_getLogs: z.tuple([
    z.object({
      address: address.optional(),
      topics: z.array(hexString.nullable()).optional(),
      fromBlock: blockIdentifier.optional(),
      toBlock: blockIdentifier.optional(),
      minimum_attestations: z.number().optional()
    })
  ]),
  eth_estimateGas: z.tuple([
    z.object({
      from: address.optional(),
      to: address.optional(),
      gas: hexString.optional(),
      gasPrice: hexString.optional(),
      value: hexString.optional(),
      data: hexString.optional()
    })
  ]),
  eth_sendRawTransaction: z.tuple([hexString]),
  eth_networkId: z.tuple([]),
  net_version: z.tuple([]),
  eth_getCode: z.tuple([address, blockIdentifier]),
  pod_getCommittee: z.tuple([]),
  pod_pastPerfectTime: z.tuple([]),
  pod_listReceipts: z.tuple([
    z.object({
      address: address.optional(),
      since: z.number().int().positive()
    })
  ]),

  // --- Indexer Tool Schemas ---
  indexer_getTransactions: z.tuple([
    pagination
      .extend({
        address: address.optional(),
        timestampFrom: z.number().int().positive().optional(),
        timestampTo: z.number().int().positive().optional(),
        sort: z.enum(['ASC', 'DESC']).optional()
      })
      .optional()
  ]),
  indexer_getLogs: z.tuple([
    pagination
      .extend({
        address: address.optional(),
        topics: z
          .array(z.union([hexString, z.array(hexString), z.null()]))
          .max(4)
          .optional(),
        topicOperator: z.enum(['AND', 'OR']).default('AND').optional()
      })
      .optional()
  ]),
  indexer_getAuctions: z.tuple([
    pagination
      .extend({
        contractAddress: address.optional(),
        status: z.enum(['active', 'completed', 'cancelled']).optional()
      })
      .optional()
  ]),
  indexer_verifyContract: z.tuple([
    z.object({
      address: address,
      sourceCode: z.string().min(1),
      compiler: z.string().min(1),
      compilerVersion: z.string().min(1),
      constructorArguments: hexString.optional(),
      contractName: z.string().min(1)
    })
  ]),
  indexer_createApiKey: z.tuple([
    z.object({
      name: z.string().min(1).max(100),
      expiresAt: z.string().datetime({ offset: true }).optional()
    })
  ]),

  // Indexer data query tools (T014)
  indexer_getTransactionByHash: z.tuple([hexString]),

  // --- Indexer Account Management Tools (T018) ---
  indexer_register: z.tuple([
    z.object({
      login: z.string().min(1).max(100),
      password: z.string().min(8).max(100)
    })
  ]),
  indexer_login: z.tuple([
    z.object({
      login: z.string().min(1).max(100),
      password: z.string().min(8).max(100)
    })
  ]),
  indexer_listApiKeys: z.tuple([
    z.object({
      jwtToken: z.string().min(1)
    })
  ]),
  indexer_deleteApiKey: z.tuple([
    z.object({
      jwtToken: z.string().min(1),
      keyId: z.string().min(1)
    })
  ]),
  indexer_updateApiKey: z.tuple([
    z.object({
      jwtToken: z.string().min(1),
      keyId: z.string().min(1),
      name: z.string().min(1).max(100).optional(),
      expiresAt: z.string().datetime({ offset: true }).optional()
    })
  ]),

  // --- Indexer Transaction Query Tools (T019) ---
  indexer_getTransactionsCount: z.tuple([
    z.object({
      address: address
    })
  ]),
  indexer_searchGeneralData: z.tuple([
    z.object({
      take: z.number().int().positive().max(1000).optional(),
      skip: z.number().int().nonnegative().optional()
    })
  ]),
  indexer_listNormalTransactions: z.tuple([
    z.object({
      address: address.optional(),
      take: z.number().int().positive().max(1000).optional(),
      skip: z.number().int().nonnegative().optional()
    })
  ]),
  indexer_listDecodedTransactions: z.tuple([
    z.object({
      address: address.optional(),
      take: z.number().int().positive().max(1000).optional(),
      skip: z.number().int().nonnegative().optional()
    })
  ]),
  indexer_getDecodedTransactionByHash: z.tuple([hexString]),

  // --- Indexer Log Query Tools (T020) ---
  indexer_listLogs: z.tuple([
    z.object({
      address: address.optional(),
      topic: hexString.optional(),
      take: z.number().int().positive().max(1000).optional(),
      skip: z.number().int().nonnegative().optional()
    })
  ]),
  indexer_listDecodedLogs: z.tuple([
    z.object({
      address: address.optional(),
      topic: hexString.optional(),
      take: z.number().int().positive().max(1000).optional(),
      skip: z.number().int().nonnegative().optional()
    })
  ]),

  // --- Indexer Contract Verification Tools (T021) ---
  indexer_getContractSourceCode: z.tuple([
    z.object({
      address: address
    })
  ]),

  // --- Indexer Auction Tools (T022) ---
  indexer_listAuctions: z.tuple([
    z.object({
      contractAddress: address.optional(),
      status: z.string().optional(),
      take: z.number().int().positive().max(1000).optional(),
      skip: z.number().int().nonnegative().optional()
    })
  ]),
  indexer_getAuction: z.tuple([
    z.object({
      auctionId: z.string().min(1)
    })
  ]),
  indexer_getAuctionCount: z.tuple([
    z.object({
      contractAddress: address.optional(),
      status: z.string().optional()
    })
  ]),
  indexer_listAuctionBids: z.tuple([
    z.object({
      auctionId: z.string().min(1),
      take: z.number().int().positive().max(1000).optional(),
      skip: z.number().int().nonnegative().optional()
    })
  ]),
  indexer_getWinningBid: z.tuple([
    z.object({
      auctionId: z.string().min(1)
    })
  ]),

  // --- Indexer Bridge Tool (T023) ---
  indexer_getBridgeCertifiedLog: z.tuple([
    z.object({
      logId: z.string().min(1)
    })
  ]),

  // --- Composite Analysis Tools (T048-T056) ---
  analyze_address: z.tuple([
    z.object({
      address: address,
      limit: z.number().int().positive().optional()
    })
  ]),
  analyze_auction: z.tuple([
    z.object({
      auctionId: z.string().min(1),
      includeBidderProfiles: z.boolean().optional()
    })
  ]),
  verify_finality: z.tuple([
    z.object({
      txHash: hexString
    })
  ]),
  analyze_past_perfect_time: z.tuple([
    z.object({
      windowSeconds: z.number().int().positive().optional()
    })
  ]),
  analyze_committee: z.tuple([z.object({})]),
  network_health_dashboard: z.tuple([
    z.object({
      windowSeconds: z.number().int().positive().optional()
    })
  ]),
  analyze_pod_performance: z.tuple([
    z.object({
      windowSeconds: z.number().int().positive().optional()
    })
  ]),
  track_attestation_performance: z.tuple([
    z.object({
      windowSeconds: z.number().int().positive().optional()
    })
  ]),
  benchmark_transaction_speed: z.tuple([
    z.object({
      signedTx: hexString,
      pollIntervalMs: z.number().int().positive().optional(),
      maxPollAttempts: z.number().int().positive().optional()
    })
  ])
};

export function validateParams(method: string, params: any[]): any[] {
  const schema = schemas[method as keyof typeof schemas];
  if (!schema) {
    throw new Error(`Unknown method: ${method}`);
  }
  return schema.parse(params);
}

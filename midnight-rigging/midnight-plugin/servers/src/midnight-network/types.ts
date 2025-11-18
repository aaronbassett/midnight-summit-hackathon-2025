/**
 * Type definitions for pod network MCP Server
 */

export interface JsonRpcRequest<T = any[] | Record<string, any>> {
  jsonrpc: '2.0';
  method: string;
  params: T;
  id: number | string;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcSuccessResponse<T = any> {
  jsonrpc: '2.0';
  id: number | string;
  result: T;
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0';
  id: number | string;
  error: JsonRpcError;
}

export type JsonRpcResponse<T = any> = JsonRpcSuccessResponse<T> | JsonRpcErrorResponse;

export type Address = string;
export type Hash = string;
export type HexString = string;
export type BlockIdentifier = string | 'earliest' | 'finalized' | 'latest';

export interface PodMetadata {
  attestations: number;
  committee_size: number;
  timestamp: string;
  [key: string]: any;
}

export interface Block {
  number: string;
  hash: Hash;
  parentHash: Hash;
  timestamp: string;
  transactions: string[];
  pod_metadata?: PodMetadata;
}

export interface Transaction {
  hash: Hash;
  from: Address;
  to: Address | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: HexString;
  pod_metadata?: PodMetadata;
}

export interface TransactionReceipt {
  transactionHash: Hash;
  blockHash: Hash;
  blockNumber: string;
  from: Address;
  to: Address | null;
  gasUsed: string;
  logs: LogEntry[];
  status: string;
  pod_metadata?: PodMetadata;
}

export interface LogEntry {
  address: Address;
  topics: Hash[];
  data: HexString;
  blockNumber: string;
  transactionHash: Hash;
  logIndex: string;
  pod_metadata?: PodMetadata;
}

export interface Committee {
  quorum_size: number;
  replicas: string[];
}

export interface CacheEntry<T = any> {
  data: T;
  cachedAt: number;
  ttl: number;
  size: number;
}

export type ErrorCode = 'VALIDATION_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT_ERROR' | 'RPC_ERROR';

export interface ErrorResponse {
  error: ErrorCode;
  message: string;
  recovery: string;
  details?: any;
}

// Tool argument interfaces
export interface ToolArgsGetBalance {
  address: Address;
  blockIdentifier: BlockIdentifier;
}

export interface ToolArgsGetCode {
  address: Address;
  blockIdentifier: BlockIdentifier;
}

export interface ToolArgsGetBlockByHash {
  blockHash: Hash;
  includeTransactions: boolean;
}

export interface ToolArgsGetBlockByNumber {
  blockIdentifier: BlockIdentifier;
  includeTransactions: boolean;
}

export interface ToolArgsGetTransactionByHash {
  txHash: Hash;
}

export interface ToolArgsGetTransactionCount {
  address: Address;
  blockIdentifier: BlockIdentifier;
}

export interface ToolArgsGetTransactionReceipt {
  txHash: Hash;
}

export interface ToolArgsGetLogs {
  filter: {
    address?: Address;
    topics?: (Hash | null)[];
    fromBlock?: BlockIdentifier;
    toBlock?: BlockIdentifier;
    minimum_attestations?: number;
  };
}

export interface ToolArgsEstimateGas {
  transaction: {
    from?: Address;
    to?: Address;
    gas?: HexString;
    gasPrice?: HexString;
    value?: HexString;
    data?: HexString;
  };
}

export interface ToolArgsSendRawTransaction {
  signedTx: HexString;
}

export interface ToolArgsListReceipts {
  address?: Address;
  since: number;
}

export type ToolArguments =
  | { tool: 'eth_blockNumber' }
  | { tool: 'eth_chainId' }
  | { tool: 'eth_gasPrice' }
  | ({ tool: 'eth_getBalance' } & ToolArgsGetBalance)
  | ({ tool: 'eth_getBlockByHash' } & ToolArgsGetBlockByHash)
  | ({ tool: 'eth_getBlockByNumber' } & ToolArgsGetBlockByNumber)
  | ({ tool: 'eth_getTransactionByHash' } & ToolArgsGetTransactionByHash)
  | ({ tool: 'eth_getTransactionCount' } & ToolArgsGetTransactionCount)
  | ({ tool: 'eth_getTransactionReceipt' } & ToolArgsGetTransactionReceipt)
  | ({ tool: 'eth_getLogs' } & ToolArgsGetLogs)
  | ({ tool: 'eth_estimateGas' } & ToolArgsEstimateGas)
  | ({ tool: 'eth_sendRawTransaction' } & ToolArgsSendRawTransaction)
  | { tool: 'eth_networkId' }
  | { tool: 'net_version' }
  | { tool: 'pod_getCommittee' }
  | ({ tool: 'pod_listReceipts' } & ToolArgsListReceipts);

/**
 * Normalizes unknown errors to Error instances for consistent handling.
 * Use this when you need to ensure you have an Error object.
 *
 * @param error - Unknown error value (could be Error, string, or anything)
 * @returns Error instance
 *
 * @example
 * ```typescript
 * try {
 *   // some code
 * } catch (error) {
 *   logger.error('operation_failed', normalizeError(error));
 * }
 * ```
 */
export function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Extracts error message from unknown error values.
 * Use this when you need just the message string.
 *
 * @param error - Unknown error value
 * @returns Error message string
 *
 * @example
 * ```typescript
 * const errorMsg = `Operation failed: ${getErrorMessage(error)}`;
 * ```
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Extracts stack trace from error if available.
 * Returns undefined for non-Error values.
 *
 * @param error - Unknown error value
 * @returns Stack trace string or undefined
 *
 * @example
 * ```typescript
 * logger.error('error', {
 *   message: getErrorMessage(error),
 *   stack: getErrorStack(error)
 * });
 * ```
 */
export function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

export function buildErrorResponse(error: unknown, _rpcUrl?: string): ErrorResponse {
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return {
        error: 'TIMEOUT_ERROR',
        message: 'RPC request timed out after 30 seconds',
        recovery: 'Try again or narrow query scope.',
        details: error.message
      };
    }
    return {
      error: 'RPC_ERROR',
      message: error.message,
      recovery: 'Check RPC endpoint and parameters.',
      details: error.message
    };
  }
  return {
    error: 'RPC_ERROR',
    message: 'Unknown error',
    recovery: 'Try again.',
    details: String(error)
  };
}

// --- pod network Indexer API Types ---

export interface IndexerAccount {
  accountId: string;
  login: string;
}

export interface IndexerAuthResponse {
  account: IndexerAccount;
  jwtToken: string;
}

export interface IndexerApiKey {
  name: string;
  keyPrefix: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export interface IndexerCreateApiKeyResponse {
  apiKey: string;
  name: string;
  expiresAt: string | null;
}

/**
 * Runtime credentials that can be provided per-tool or per-request.
 * These credentials are NOT persisted to disk.
 *
 * Authentication priority:
 * 1. apiKey (direct API key)
 * 2. login + password (will provision new API key)
 *
 * All fields are optional to support various authentication patterns.
 */
export interface RuntimeCredentials {
  /** Direct API key (highest priority if provided) */
  apiKey?: string;
  /** Username for login/password authentication */
  login?: string;
  /** Password for login/password authentication (requires login) */
  password?: string;
  /** Custom indexer URL (overrides default) */
  indexerUrl?: string;
}

// Attestation types for pod metadata (research finding #9)
export interface Attestation {
  publicKey: string;
  signature: {
    r: string;
    s: string;
    v: number;
    yParity: number;
  };
  timestamp: number; // microseconds
}

export interface DetailedPodMetadata {
  attestations: Attestation[];
  receipt_timestamp: number;
  confirmation_level: 'finalized' | 'pending';
}

// Indexer transaction types
export interface IndexerTransaction {
  hash: Hash;
  from: Address;
  to: Address | null;
  value: string;
  gas: string;
  gasPrice: string;
  input: HexString;
  timestamp: number;
  blockNumber: string | null;
  status: string;
}

// Indexer log types
export interface IndexerLog {
  address: Address;
  topics: Hash[];
  data: HexString;
  transactionHash: Hash;
  logIndex: string;
  timestamp: number;
  pod_metadata?: DetailedPodMetadata;
}

// Auction types
export interface Auction {
  id: string;
  contractAddress: Address;
  status: 'active' | 'completed' | 'cancelled';
  startTime: number;
  endTime: number;
  winningBid?: AuctionBid;
}

export interface AuctionBid {
  id: string;
  auctionId: string;
  bidder: Address;
  amount: string;
  timestamp: number;
  transactionHash: Hash;
}

// Contract verification types
export interface ContractSourceCode {
  address: Address;
  sourceCode: string;
  compiler: string;
  compilerVersion: string;
  constructorArguments: string;
  contractName: string;
  verified: boolean;
}

// Indexer API response types
export interface IndexerTransactionCountResponse {
  count: number;
}

export interface IndexerPaginatedResponse<T> {
  items?: T[];
  result?: T[];
  total?: number;
  page?: number;
  limit?: number;
}

// Etherscan-like API source code response
export interface IndexerSourceCodeData {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

export interface IndexerSourceCodeResponse {
  status: string;
  message: string;
  result: IndexerSourceCodeData[];
}

export interface BridgeActivity {
  transactionHash: Hash;
  address: Address;
  timestamp: number;
  data: HexString;
  blockNumber: string;
}

export type IndexerTransactionList = IndexerPaginatedResponse<IndexerTransaction>;
export type IndexerLogList = IndexerPaginatedResponse<IndexerLog>;
export type BridgeActivityList = IndexerPaginatedResponse<BridgeActivity>;

/**
 * HTTP Client for the pod network Indexer API
 *
 * Manages authentication, credential provisioning, and resilient request handling
 * with retries for network errors and rate limiting.
 */

import { createLogger } from './logger.js';
import { CredentialManager, type StoredCredentials } from './credentials.js';
import type {
  IndexerApiKey,
  IndexerAuthResponse,
  IndexerCreateApiKeyResponse,
  RuntimeCredentials
} from './types.js';
import { normalizeError, getErrorMessage, getErrorStack } from './types.js';

const DEFAULT_INDEXER_URL = 'https://v2-api.pod-indexer.tapforce.dev';
const TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Future Improvement: Connection Pooling
 *
 * Currently, each Indexer API call creates a new HTTP connection using Node.js fetch().
 * For high-frequency queries (e.g., real-time monitoring, batch processing), consider
 * implementing HTTP connection pooling using a custom HTTP agent.
 *
 * Benefits:
 * - Reduced latency by reusing TCP connections
 * - Better throughput for burst workloads
 * - Lower server load from connection churn
 *
 * Implementation approach:
 * - Use `undici.Agent` with `keepAlive: true` and connection limits
 * - Pass agent to fetch() via dispatcher option
 * - Configure maxConnections, maxIdleTime, and pipelining
 * - Handle connection lifecycle for long-running processes
 *
 * See DEVELOPMENT.md "Future Improvements" section for details.
 */

/**
 * Custom error class to signal authentication failures (401/403)
 * that should trigger a re-provisioning attempt.
 */
class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export interface RequestOptions {
  body?: Record<string, any>;
  params?: Record<string, string | number | boolean | undefined>;
  jwtToken?: string;
  noAuth?: boolean;
}

export class IndexerClient {
  private readonly baseUrl: string;
  private readonly credentialManager: CredentialManager;
  private readonly logger: ReturnType<typeof createLogger>;
  private credentials: StoredCredentials | null = null;
  private readonly isInitializing: Promise<void>;
  private readonly runtimeCredentials?: RuntimeCredentials;
  private readonly persistCredentials: boolean;

  /**
   * Create a new IndexerClient
   *
   * @param runtimeCredentials - Optional credentials for this specific client instance.
   *                             If provided, these credentials will NOT be persisted to disk.
   *                             If not provided, credentials will be loaded from environment
   *                             variables or ~/.rigging/midnight.json, or auto-provisioned.
   *
   * Runtime credentials priority:
   * 1. runtimeCredentials.apiKey (if provided)
   * 2. runtimeCredentials.login + password (if provided)
   * 3. Environment variables (POD_INDEXER_API_KEY, POD_INDEXER_LOGIN, POD_INDEXER_PASSWORD)
   * 4. Stored credentials (~/.rigging/midnight.json)
   * 5. Auto-provision (generate new credentials)
   */
  constructor(runtimeCredentials?: RuntimeCredentials) {
    this.logger = createLogger('indexer-client');
    this.credentialManager = new CredentialManager();
    this.runtimeCredentials = runtimeCredentials;
    this.persistCredentials = !runtimeCredentials; // Only persist if no runtime creds

    // Validate runtime credentials synchronously before initialization
    if (runtimeCredentials) {
      const hasApiKey = runtimeCredentials.apiKey !== undefined;
      const hasLogin = runtimeCredentials.login !== undefined;
      const hasPassword = runtimeCredentials.password !== undefined;

      // Must provide either apiKey OR (login + password)
      if (hasApiKey) {
        if (runtimeCredentials.apiKey!.length === 0) {
          throw new Error('Runtime API key cannot be empty');
        }
        // If apiKey is provided, login/password are ignored
      } else if (hasLogin || hasPassword) {
        // If either login or password is provided, both must be provided
        if (!hasLogin || !hasPassword) {
          throw new Error('Invalid runtime credentials: login and password must both be provided');
        }
        if (runtimeCredentials.login!.length === 0 || runtimeCredentials.password!.length === 0) {
          throw new Error('Runtime login and password cannot be empty');
        }
      } else {
        // Runtime credentials object provided but no authentication fields
        throw new Error(
          'Invalid runtime credentials: must provide either apiKey OR (login + password)'
        );
      }
    }

    // Determine base URL (runtime > env > default)
    this.baseUrl =
      runtimeCredentials?.indexerUrl || process.env.POD_INDEXER_URL || DEFAULT_INDEXER_URL;

    try {
      new URL(this.baseUrl);
    } catch (error) {
      const err = new Error(`Invalid Indexer URL format: ${this.baseUrl}`);
      this.logger.error('invalid_url', err);
      throw err;
    }

    this.isInitializing = this.initialize();
  }

  /**
   * Loads credentials from storage or provisions new ones if none are found.
   * This method is called from the constructor to ensure the client is ready.
   *
   * Priority order:
   * 1. Runtime credentials (from constructor)
   * 2. Environment variables
   * 3. Stored credentials
   * 4. Auto-provision
   */
  private async initialize(): Promise<void> {
    // Priority 1: Use runtime credentials if provided
    if (this.runtimeCredentials) {
      // Direct API key (highest priority)
      if (this.runtimeCredentials.apiKey) {
        this.logger.info('indexer_runtime_credentials_api_key');
        this.credentials = {
          apiKey: this.runtimeCredentials.apiKey,
          created: new Date().toISOString(),
          indexerUrl: this.baseUrl
        };
        return;
      }

      // Login + password (will need to provision API key)
      if (this.runtimeCredentials.login && this.runtimeCredentials.password) {
        this.logger.info('indexer_runtime_credentials_login', {
          login: this.runtimeCredentials.login
        });
        this.credentials = {
          login: this.runtimeCredentials.login,
          password: this.runtimeCredentials.password,
          apiKey: '', // Will be generated on first Indexer request
          created: new Date().toISOString(),
          indexerUrl: this.baseUrl
        };
        return;
      }

      // Runtime credentials provided but incomplete
      throw new Error(
        'Invalid runtime credentials: must provide either apiKey OR (login + password)'
      );
    }

    // Priority 2-3: Load from environment or storage
    this.credentials = this.credentialManager.loadCredentials();
    if (this.credentials) {
      const source = this.credentials.login ? 'loaded with login' : 'loaded with API key only';
      this.logger.info('indexer_credentials_loaded', { source });
      return;
    }

    // Priority 4: Auto-provision
    this.logger.info('no_indexer_credentials_found_provisioning_new_ones');
    try {
      // Bind `this` context for methods passed to credentialManager
      const registerFn = this.register.bind(this);
      const createApiKeyFn = this.createApiKey.bind(this);

      this.credentials = await this.credentialManager.provisionCredentials(
        registerFn,
        createApiKeyFn
      );
      this.logger.info('indexer_credentials_provisioned', { login: this.credentials.login });
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error('indexer_initialization_failed', err);
      throw new Error(`Failed to initialize IndexerClient: ${err.message}`);
    }
  }

  /**
   * Registers a new account. Primarily used during auto-provisioning.
   */
  public async register(login: string, password: string): Promise<IndexerAuthResponse> {
    return this.call<IndexerAuthResponse>('POST', '/account/auth/register', {
      body: { login, password, passwordConfirm: password },
      noAuth: true
    });
  }

  /**
   * Logs in to an existing account to retrieve a JWT.
   */
  public async login(login: string, password: string): Promise<IndexerAuthResponse> {
    await this.isInitializing;
    return this.call<IndexerAuthResponse>('POST', '/account/auth/login', {
      body: { login, password },
      noAuth: true
    });
  }

  /**
   * Lists all API keys for an account using a JWT.
   */
  public async listApiKeys(jwtToken: string): Promise<IndexerApiKey[]> {
    await this.isInitializing;
    return this.call<IndexerApiKey[]>('GET', '/account/api-keys/', { jwtToken });
  }

  /**
   * Creates a new API key for an account using a JWT.
   * Returns the API key object with the actual key value.
   */
  public async createApiKey(jwtToken: string, name: string): Promise<IndexerCreateApiKeyResponse> {
    return this.call<IndexerCreateApiKeyResponse>('POST', '/account/api-keys/', {
      body: { name },
      jwtToken
    });
  }

  /**
   * Generic method to make an HTTP call to the Indexer API.
   * Handles authentication failures by triggering re-provisioning and retrying once.
   */
  public async call<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    try {
      return await this.callWithRetry(method, path, options, 0);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.logger.warning('auth_error_reprovisioning', { path, error: String(error) });
        await this.reprovisionApiKey();
        // Retry the call one more time with the new API key
        return this.callWithRetry(method, path, options, 0);
      }
      throw error;
    }
  }

  private async callWithRetry<T>(
    method: string,
    path: string,
    options: RequestOptions,
    retryCount: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const startTime = Date.now(); // Track query duration

    const url = new URL(path, this.baseUrl);
    if (options.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    if (options.jwtToken) {
      headers['jwt-account'] = options.jwtToken;
    } else if (!options.noAuth) {
      if (!this.credentials?.apiKey) {
        throw new Error('API key is missing. Client may not be initialized.');
      }
      headers['api_key'] = this.credentials.apiKey;
    }

    try {
      this.logger.info('data_source_indexer', { method, path, url: this.baseUrl });
      this.logger.debug('indexer_request', { method, url: url.toString() });

      const response = await fetch(url.toString(), {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal
      });

      if (response.ok) {
        const result = (await response.json()) as T;
        const duration = Date.now() - startTime;

        // FR-083: Log slow queries (>2s) at warning level
        if (duration > 2000) {
          this.logger.warning('slow_query', { method, path, duration, url: this.baseUrl });
        }

        this.logger.debug('indexer_response', { method, path, duration });
        return result;
      }

      const errorBody = await response.text();

      // FR-075: Handle 404 data not found - return null instead of throwing
      if (response.status === 404) {
        this.logger.info('data_not_found', { path, method });
        return null as T;
      }

      // FR-076: Handle 400 malformed request with descriptive message
      if (response.status === 400) {
        const errorMessage = `Malformed request to ${path}: ${errorBody}`;
        // FR-077: Log with full request context
        this.logger.error('malformed_request', {
          error: errorMessage,
          method,
          path,
          url: url.toString(),
          body: options.body,
          status: response.status
        });
        throw new Error(errorMessage);
      }

      // Handle 429 rate limiting with exponential backoff
      if (response.status === 429 && retryCount < MAX_RETRIES) {
        const delayMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
        this.logger.warning('rate_limit_retry', { path, attempt: retryCount + 1, delayMs });
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.callWithRetry(method, path, options, retryCount + 1);
      }

      // Handle authentication failures (401/403)
      if (response.status === 401 || response.status === 403) {
        const errorMessage = `Authentication failed for ${path}: ${errorBody}`;
        throw new AuthenticationError(errorMessage);
      }

      // Generic HTTP error
      const errorMessage = `HTTP ${response.status} ${response.statusText} for ${path}: ${errorBody}`;
      throw new Error(errorMessage);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error; // Propagate auth errors for the outer handler
      }

      // Retry network errors with exponential backoff
      if (this.isNetworkError(error) && retryCount < MAX_RETRIES) {
        const delayMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
        this.logger.warning('network_error_retry', { path, attempt: retryCount + 1, delayMs });
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.callWithRetry(method, path, options, retryCount + 1);
      }

      // FR-071: Provide RPC fallback guidance when indexer is unavailable
      if (this.isNetworkError(error)) {
        const rpcFallbackHint = this.getRpcFallbackHint(path);
        const fallbackMessage = rpcFallbackHint
          ? `Indexer unavailable. Consider using RPC alternative: ${rpcFallbackHint}`
          : 'Indexer unavailable. Some queries may require RPC tools instead.';

        this.logger.warning('indexer_unavailable_rpc_fallback', {
          path,
          error: getErrorMessage(error),
          fallbackHint: rpcFallbackHint
        });

        throw new Error(`${fallbackMessage} Original error: ${getErrorMessage(error)}`);
      }

      // FR-077: Log with full request context
      this.logger.error('indexer_call_failed', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        method,
        path,
        url: url.toString(),
        body: options.body
      });
      throw error;
    } finally {
      // Always clean up timeout and abort controller to release resources
      clearTimeout(timeout);
      controller.abort();
    }
  }

  /**
   * Re-provision API key when authentication fails.
   * Only possible if login/password are available.
   */
  private async reprovisionApiKey(): Promise<void> {
    if (!this.credentials?.login || !this.credentials?.password) {
      const err = new Error(
        'Cannot re-provision API key without login/password. ' +
          'The provided API key is invalid and cannot be refreshed automatically. ' +
          'Please provide valid credentials or use login/password for automatic recovery.'
      );
      this.logger.error('reprovision_failed_no_credentials', err);
      throw err;
    }

    this.logger.info('reprovisioning_api_key', { login: this.credentials.login });

    try {
      const { jwtToken } = await this.login(this.credentials.login, this.credentials.password);
      const keyName = `pod rigging - reprovisioned - ${new Date().toISOString()}`;
      const { apiKey } = await this.createApiKey(jwtToken, keyName);

      this.credentials.apiKey = apiKey;

      // Only persist if allowed (not using runtime credentials)
      if (this.persistCredentials) {
        this.credentialManager.storeCredentials(this.credentials);
        this.logger.info('reprovisioning_api_key_success_stored', {
          login: this.credentials.login
        });
      } else {
        this.logger.info('reprovisioning_api_key_success_not_stored', {
          login: this.credentials.login,
          reason: 'runtime credentials'
        });
      }
    } catch (error) {
      const err = normalizeError(error);
      this.logger.error('reprovisioning_failed', err);
      throw new Error(`Failed to re-provision API key: ${err.message}`);
    }
  }

  private isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    return (
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('aborted') ||
      msg.includes('fetch failed')
    );
  }

  /**
   * FR-071: Provides RPC alternative suggestions when indexer is unavailable
   * Maps indexer endpoints to their RPC equivalents where available
   */
  private getRpcFallbackHint(path: string): string | null {
    // Transaction queries
    if (path.includes('/data/transaction/') && !path.includes('/decoded')) {
      return 'eth_getTransactionByHash for basic transaction data';
    }

    // Log queries
    if (path.includes('/data/logs') && !path.includes('/decoded')) {
      return 'eth_getLogs for basic log queries';
    }

    // Block queries
    if (path.includes('/data/block')) {
      return 'eth_getBlockByNumber or eth_getBlockByHash for block data';
    }

    // No RPC equivalent for: decoded data, auctions, contracts, bridge
    return null;
  }
}

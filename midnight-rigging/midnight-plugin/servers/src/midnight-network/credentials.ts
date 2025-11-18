/**
 * Credential Storage and Provisioning for pod network Indexer
 * Manages auto-provisioning, storage, and environment variable override
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { createLogger } from './logger.js';

const logger = createLogger('credentials');

const CREDENTIALS_DIR = path.join(os.homedir(), '.rigging');
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, 'midnight.json');
const DEFAULT_INDEXER_URL = 'https://v2-api.pod-indexer.tapforce.dev';

/**
 * Credentials stored in ~/.rigging/midnight.json
 * Supports two formats:
 * 1. Full credentials: {login, password, apiKey, created, indexerUrl}
 * 2. API-key only: {apiKey, created, indexerUrl} (login/password optional)
 */
export interface StoredCredentials {
  login?: string;
  password?: string;
  apiKey: string;
  created: string;
  indexerUrl: string;
}

export class CredentialManager {
  /**
   * Validate that stored credentials have required fields
   * Supports two formats:
   * 1. Full: login, password, apiKey, created, indexerUrl
   * 2. API-key only: apiKey, created, indexerUrl (login/password optional)
   */
  private validateCredentials(credentials: any): credentials is StoredCredentials {
    // Required fields for all credential formats
    const hasRequiredFields =
      typeof credentials === 'object' &&
      credentials !== null &&
      typeof credentials.apiKey === 'string' &&
      credentials.apiKey.length > 0 &&
      typeof credentials.created === 'string' &&
      typeof credentials.indexerUrl === 'string';

    if (!hasRequiredFields) {
      return false;
    }

    // If login is present, password must also be present (and vice versa)
    const hasLogin = typeof credentials.login === 'string' && credentials.login.length > 0;
    const hasPassword = typeof credentials.password === 'string' && credentials.password.length > 0;

    // Both login/password must be present together, or both must be absent
    return hasLogin === hasPassword;
  }

  /**
   * Load credentials from environment variables or ~/.rigging/midnight.json
   *
   * Priority order:
   * 1. POD_INDEXER_API_KEY environment variable (highest priority)
   * 2. POD_INDEXER_LOGIN + POD_INDEXER_PASSWORD environment variables
   * 3. Stored credentials from ~/.rigging/midnight.json
   * 4. null (triggers auto-provisioning)
   */
  loadCredentials(): StoredCredentials | null {
    const indexerUrl = process.env.POD_INDEXER_URL || DEFAULT_INDEXER_URL;

    // Priority 1: Check for direct API key in environment
    const envApiKey = process.env.POD_INDEXER_API_KEY;
    if (envApiKey) {
      logger.info('credentials_loaded_from_env_api_key');
      return {
        apiKey: envApiKey,
        created: new Date().toISOString(),
        indexerUrl
        // No login/password - API key only
      };
    }

    // Priority 2: Check for login/password in environment
    const envLogin = process.env.POD_INDEXER_LOGIN;
    const envPassword = process.env.POD_INDEXER_PASSWORD;

    if (envLogin && envPassword) {
      logger.info('credentials_loaded_from_env_login');
      // No apiKey needed if using login/password from env
      return {
        login: envLogin,
        password: envPassword,
        apiKey: '', // Will be generated on first Indexer request
        created: new Date().toISOString(),
        indexerUrl
      };
    }

    // Priority 3: Load from stored file
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      logger.debug('credentials_file_not_found', { path: CREDENTIALS_FILE });
      return null;
    }

    try {
      const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      const credentials = JSON.parse(data);

      // Validate credentials structure
      if (!this.validateCredentials(credentials)) {
        logger.warning('credentials_invalid_structure', { path: CREDENTIALS_FILE });
        return null;
      }

      const credType = credentials.login ? 'full' : 'api_key_only';
      logger.info('credentials_loaded_from_file', {
        type: credType,
        login: credentials.login || '(none)'
      });
      return credentials;
    } catch (error) {
      logger.error(
        'credentials_load_error',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  /**
   * Store credentials to ~/.rigging/midnight.json with 0600 permissions (FR-011, FR-012, FR-013)
   * Never store credentials from environment variables (FR-015)
   */
  storeCredentials(credentials: StoredCredentials): void {
    // Never persist env var credentials
    if (
      process.env.POD_INDEXER_API_KEY ||
      process.env.POD_INDEXER_LOGIN ||
      process.env.POD_INDEXER_PASSWORD
    ) {
      logger.info('credentials_not_stored_from_env');
      return;
    }

    try {
      // Create directory with 0700 permissions (recursive: true handles existing dirs)
      // FR-012: Directory permissions
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
      logger.debug('credentials_dir_ensured', { path: CREDENTIALS_DIR });

      // Atomically create file with 0600 permissions to prevent TOCTOU race condition
      // FR-013: File permissions must be set atomically during creation
      const fd = fs.openSync(CREDENTIALS_FILE, 'w', 0o600);
      try {
        const content = JSON.stringify(credentials, null, 2);
        fs.writeSync(fd, content, 0, 'utf8');
      } finally {
        fs.closeSync(fd);
      }

      logger.info('credentials_stored', { login: credentials.login, path: CREDENTIALS_FILE });
    } catch (error) {
      logger.error(
        'credentials_store_error',
        error instanceof Error ? error : new Error(String(error))
      );
      throw new Error(`Failed to store credentials: ${error}`);
    }
  }

  /**
   * Generate random alphanumeric username for auto-provisioning
   * Format: pod-rigging-{12-char-alphanumeric}
   */
  private generateUsername(): string {
    const randomBytes = crypto.randomBytes(9); // 9 bytes = 12 base64url characters
    const randomString = randomBytes.toString('base64url').slice(0, 12);
    return `pod-rigging-${randomString}`;
  }

  /**
   * Generate secure random password for auto-provisioning
   */
  private generatePassword(): string {
    const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 base64 characters
    return randomBytes.toString('base64url');
  }

  /**
   * Auto-provision credentials via Indexer API:
   * 1. Register account with random username/password
   * 2. Login to get JWT token
   * 3. Create API key
   * 4. Store credentials to ~/.rigging/midnight.json
   *
   * Note: FR-010 (reusing existing API keys) is not implemented because the Indexer API
   * list_api_keys endpoint only returns key prefixes, not the actual key values. The full
   * key is only available at creation time. Credential reuse happens via stored credentials
   * in ~/.rigging/midnight.json instead.
   *
   * Handles conflicts with retry logic (FR-009: max 3 attempts)
   */
  async provisionCredentials(
    registerFn: (login: string, password: string) => Promise<{ jwtToken: string }>,
    createApiKeyFn: (jwtToken: string, name: string) => Promise<{ apiKey: string }>
  ): Promise<StoredCredentials> {
    const maxRetries = 3;
    const indexerUrl = process.env.POD_INDEXER_URL || DEFAULT_INDEXER_URL;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const login = this.generateUsername();
      const password = this.generatePassword();

      try {
        logger.info('credentials_provisioning_attempt', { attempt, login });

        // Step 1: Register account
        const { jwtToken } = await registerFn(login, password);
        logger.debug('credentials_registration_success', { login });

        // Step 2: Create API key
        const keyName = `pod rigging - ${new Date().toISOString()}`;
        const { apiKey } = await createApiKeyFn(jwtToken, keyName);
        logger.debug('credentials_api_key_created');

        // Step 3: Store credentials
        const credentials: StoredCredentials = {
          login,
          password,
          apiKey,
          created: new Date().toISOString(),
          indexerUrl
        };

        this.storeCredentials(credentials);

        logger.info('credentials_provisioned_successfully', { login });
        return credentials;
      } catch (error) {
        const isDuplicateError = this.isDuplicateUsernameError(error);

        if (isDuplicateError && attempt < maxRetries) {
          logger.warning('credentials_duplicate_username', {
            attempt,
            maxRetries,
            error: String(error)
          });
          // Retry with new username
          continue;
        }

        // Max retries reached or non-duplicate error
        logger.error(
          'credentials_provisioning_failed',
          error instanceof Error ? error : new Error(String(error))
        );
        throw new Error(
          `Unable to auto-provision credentials after ${attempt} attempts. ` +
            `Please set POD_INDEXER_LOGIN and POD_INDEXER_PASSWORD environment variables.`
        );
      }
    }

    // Should never reach here due to throw in loop
    throw new Error('Credential provisioning failed');
  }

  /**
   * Detect duplicate username error from registration response (FR-009, research finding #4)
   */
  private isDuplicateUsernameError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    const msg = error.message.toLowerCase();

    // Check for HTTP status codes
    const statusMatch = error.message.match(/HTTP (\d+)/);
    const is409or400 = statusMatch && (statusMatch[1] === '409' || statusMatch[1] === '400');

    // Check for duplicate-related keywords
    const hasDuplicateKeyword =
      msg.includes('username') ||
      msg.includes('login') ||
      msg.includes('exists') ||
      msg.includes('duplicate') ||
      msg.includes('already');

    return !!(is409or400 && hasDuplicateKeyword);
  }
}

/**
 * Exponential backoff retry utility for handling rate limits and transient errors
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number; // milliseconds
  maxDelay?: number; // milliseconds
  exponentialBase?: number;
  jitter?: boolean;
  retryableErrors?: (error: unknown) => boolean;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 32000,
  exponentialBase: 2,
  jitter: true,
  retryableErrors: (error: unknown) => {
    // Retry on rate limits (429) and server errors (5xx)
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: unknown }).status;
      if (status === 429) return true;
      if (typeof status === 'number' && status >= 500 && status < 600) return true;
    }

    // Retry on network errors
    if (error instanceof Error) {
      if (error.message.includes('fetch failed')) return true;
      if (error.message.includes('network')) return true;
    }

    return false;
  },
};

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  exponentialBase: number,
  maxDelay: number,
  jitter: boolean
): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(exponentialBase, attempt), maxDelay);

  if (!jitter) {
    return exponentialDelay;
  }

  // Add random jitter (±25% of delay)
  const jitterRange = exponentialDelay * 0.25;
  const jitterOffset = (Math.random() * 2 - 1) * jitterRange;

  return Math.max(0, exponentialDelay + jitterOffset);
}

/**
 * Retry a function with exponential backoff
 *
 * @example
 * ```typescript
 * const result = await retryWithExponentialBackoff(
 *   async () => fetch('https://api.example.com/data'),
 *   { maxAttempts: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt < opts.maxAttempts - 1) {
        const delay = calculateDelay(
          attempt,
          opts.baseDelay,
          opts.exponentialBase,
          opts.maxDelay,
          opts.jitter
        );

        console.warn(
          `Attempt ${attempt + 1}/${opts.maxAttempts} failed. Retrying in ${Math.round(delay)}ms...`,
          lastError.message
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new RetryError(`Failed after ${opts.maxAttempts} attempts`, opts.maxAttempts, lastError);
}

/**
 * Retry a function with custom retry condition
 *
 * @example
 * ```typescript
 * const result = await retryWithCondition(
 *   async () => fetchData(),
 *   (result) => result.status === 'pending', // Retry while pending
 *   { maxAttempts: 10, baseDelay: 2000 }
 * );
 * ```
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (result: T) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastResult: T;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      lastResult = await fn();

      if (!shouldRetry(lastResult)) {
        return lastResult;
      }

      // Don't delay after last attempt
      if (attempt < opts.maxAttempts - 1) {
        const delay = calculateDelay(
          attempt,
          opts.baseDelay,
          opts.exponentialBase,
          opts.maxDelay,
          opts.jitter
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      // If error is thrown, check if it's retryable
      if (!opts.retryableErrors(error)) {
        throw error;
      }

      if (attempt < opts.maxAttempts - 1) {
        const delay = calculateDelay(
          attempt,
          opts.baseDelay,
          opts.exponentialBase,
          opts.maxDelay,
          opts.jitter
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw new RetryError(
    `Condition not met after ${opts.maxAttempts} attempts`,
    opts.maxAttempts,
    new Error('Max attempts reached')
  );
}

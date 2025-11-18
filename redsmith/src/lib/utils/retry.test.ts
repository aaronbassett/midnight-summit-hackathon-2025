// src/lib/utils/retry.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithExponentialBackoff, retryWithCondition, RetryError } from './retry';

// Helper to create a structured error object for testing
const createApiError = (status: number, message: string) => {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
};

describe('retryWithExponentialBackoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Suppress console.warn during tests for cleaner output
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return the result on the first attempt if successful', async () => {
    const successfulFn = vi.fn().mockResolvedValue('success');
    const result = await retryWithExponentialBackoff(successfulFn);

    expect(result).toBe('success');
    expect(successfulFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors and eventually succeed', async () => {
    const retryableError = createApiError(429, 'Too Many Requests');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValue('success');

    const options = { maxAttempts: 5, baseDelay: 100, jitter: false };
    const promise = retryWithExponentialBackoff(fn, options);

    // First retry delay: 100 * 2^0 = 100ms
    await vi.advanceTimersByTimeAsync(100);
    // Second retry delay: 100 * 2^1 = 200ms
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw the original error immediately for non-retryable errors', async () => {
    const nonRetryableError = createApiError(400, 'Bad Request');
    const fn = vi.fn().mockRejectedValue(nonRetryableError);

    await expect(retryWithExponentialBackoff(fn)).rejects.toThrow(nonRetryableError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw a RetryError after exhausting all attempts', async () => {
    const retryableError = createApiError(503, 'Service Unavailable');
    const fn = vi.fn().mockRejectedValue(retryableError);
    const options = { maxAttempts: 3, baseDelay: 100, jitter: false };

    const promise = retryWithExponentialBackoff(fn, options);
    // Suppress unhandled rejection warnings during timer advancement
    promise.catch(() => {});

    // First retry delay
    await vi.advanceTimersByTimeAsync(100);
    // Second retry delay
    await vi.advanceTimersByTimeAsync(200);

    await expect(promise).rejects.toThrow(RetryError);
    await expect(promise).rejects.toThrow('Failed after 3 attempts');

    try {
      await promise;
    } catch (e) {
      const err = e as RetryError;
      expect(err.attempts).toBe(3);
      expect(err.lastError).toBe(retryableError);
      expect(err.name).toBe('RetryError');
    }

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should use a custom retryableErrors function', async () => {
    const customError = new Error('custom_error_code');
    const fn = vi.fn().mockRejectedValueOnce(customError).mockResolvedValue('success');

    const options = {
      maxAttempts: 3,
      baseDelay: 100,
      jitter: false,
      retryableErrors: (err: unknown) =>
        err instanceof Error && err.message === 'custom_error_code',
    };

    const promise = retryWithExponentialBackoff(fn, options);
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on 5xx server errors', async () => {
    const serverError = createApiError(500, 'Internal Server Error');
    const fn = vi.fn().mockRejectedValueOnce(serverError).mockResolvedValue('success');

    const options = { maxAttempts: 3, baseDelay: 100, jitter: false };
    const promise = retryWithExponentialBackoff(fn, options);

    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on network errors', async () => {
    const networkError = new Error('fetch failed');
    const fn = vi.fn().mockRejectedValueOnce(networkError).mockResolvedValue('success');

    const options = { maxAttempts: 3, baseDelay: 100, jitter: false };
    const promise = retryWithExponentialBackoff(fn, options);

    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should cap delay at maxDelay', async () => {
    const retryableError = createApiError(429, 'Too Many Requests');
    const fn = vi.fn().mockRejectedValue(retryableError);

    const options = {
      maxAttempts: 10,
      baseDelay: 1000,
      maxDelay: 5000,
      jitter: false,
    };

    const promise = retryWithExponentialBackoff(fn, options);
    // Suppress unhandled rejection warnings during timer advancement
    promise.catch(() => {});

    // Advance through multiple retries to hit max delay
    for (let i = 0; i < 9; i++) {
      const expectedDelay = Math.min(1000 * Math.pow(2, i), 5000);
      await vi.advanceTimersByTimeAsync(expectedDelay);
    }

    await expect(promise).rejects.toThrow(RetryError);
    expect(fn).toHaveBeenCalledTimes(10);
  });
});

describe('retryWithCondition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should return the result when the retry condition is false', async () => {
    const fn = vi.fn().mockResolvedValue({ status: 'complete' });
    const shouldRetry = (result: { status: string }) => result.status === 'pending';

    const result = await retryWithCondition(fn, shouldRetry);

    expect(result).toEqual({ status: 'complete' });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry while the condition is true and eventually succeed', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'complete' });

    const shouldRetry = (result: { status: string }) => result.status === 'pending';
    const options = { maxAttempts: 5, baseDelay: 100, jitter: false };

    const promise = retryWithCondition(fn, shouldRetry, options);

    // First retry delay
    await vi.advanceTimersByTimeAsync(100);
    // Second retry delay
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;

    expect(result).toEqual({ status: 'complete' });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should throw a RetryError if the condition is never met', async () => {
    const fn = vi.fn().mockResolvedValue({ status: 'pending' });
    const shouldRetry = (result: { status: string }) => result.status === 'pending';
    const options = { maxAttempts: 3, baseDelay: 100, jitter: false };

    const promise = retryWithCondition(fn, shouldRetry, options);
    // Suppress unhandled rejection warnings during timer advancement
    promise.catch(() => {});

    // First retry delay
    await vi.advanceTimersByTimeAsync(100);
    // Second retry delay
    await vi.advanceTimersByTimeAsync(200);

    await expect(promise).rejects.toThrow(RetryError);
    await expect(promise).rejects.toThrow('Condition not met after 3 attempts');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should still handle retryable errors thrown by the function', async () => {
    const retryableError = createApiError(500, 'Internal Server Error');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValue({ status: 'complete' });

    const shouldRetry = (result: { status: string }) => result.status === 'pending';
    const options = { maxAttempts: 3, baseDelay: 100, jitter: false };

    const promise = retryWithCondition(fn, shouldRetry, options);
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toEqual({ status: 'complete' });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw non-retryable errors immediately', async () => {
    const nonRetryableError = createApiError(400, 'Bad Request');
    const fn = vi.fn().mockRejectedValue(nonRetryableError);
    const shouldRetry = (result: { status: string }) => result.status === 'pending';

    await expect(retryWithCondition(fn, shouldRetry)).rejects.toThrow(nonRetryableError);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('RetryError', () => {
  it('should create a RetryError with correct properties', () => {
    const originalError = new Error('Original error');
    const retryError = new RetryError('Failed after 5 attempts', 5, originalError);

    expect(retryError.message).toBe('Failed after 5 attempts');
    expect(retryError.attempts).toBe(5);
    expect(retryError.lastError).toBe(originalError);
    expect(retryError.name).toBe('RetryError');
    expect(retryError).toBeInstanceOf(Error);
  });
});

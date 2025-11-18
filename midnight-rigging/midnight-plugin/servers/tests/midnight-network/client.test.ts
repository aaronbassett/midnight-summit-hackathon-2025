import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RpcClient } from '../../src/midnight-network/client.js';

describe('RpcClient', () => {
  let client: RpcClient;

  beforeEach(() => {
    client = new RpcClient('https://rpc.v1.dev.pod.network/');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('retry mechanism (T070)', () => {
    it('should retry once on network error', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      // First call fails with network error
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      // Second call (retry) succeeds
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x50d' })
      } as Response);

      const result = await client.call('eth_chainId', []);

      expect(result).toBe('0x50d');
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      fetchSpy.mockRestore();
    });

    it('should fail after retry attempt fails', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      // All calls fail (initial + 3 retries)
      fetchSpy.mockRejectedValue(new Error('Network error'));

      await expect(client.call('eth_chainId', [])).rejects.toThrow('Network error');
      expect(fetchSpy).toHaveBeenCalledTimes(4); // 1 initial + 3 retries

      fetchSpy.mockRestore();
    });

    it('should not retry on RPC errors', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32602, message: 'Invalid params' }
        })
      } as Response);

      await expect(client.call('eth_chainId', [])).rejects.toThrow('Invalid params');
      expect(fetchSpy).toHaveBeenCalledTimes(1); // No retry

      fetchSpy.mockRestore();
    });

    it('should timeout after configured duration', async () => {
      const fastClient = new RpcClient('https://rpc.v1.dev.pod.network/', 100); // 100ms timeout
      const fetchSpy = vi.spyOn(global, 'fetch');

      // Simulate request that takes 200ms (longer than 100ms timeout)
      fetchSpy.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      await expect(fastClient.call('eth_chainId', [])).rejects.toThrow();

      fetchSpy.mockRestore();
    });
  });

  describe('RPC response handling', () => {
    it('should handle successful JSON-RPC response', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x123' })
      } as Response);

      const result = await client.call('eth_blockNumber', []);
      expect(result).toBe('0x123');

      fetchSpy.mockRestore();
    });

    it('should throw on RPC error response', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          error: { code: -32600, message: 'Invalid request' }
        })
      } as Response);

      await expect(client.call('eth_blockNumber', [])).rejects.toThrow('Invalid request');

      fetchSpy.mockRestore();
    });

    it('should throw on HTTP error', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      await expect(client.call('eth_blockNumber', [])).rejects.toThrow();

      fetchSpy.mockRestore();
    });
  });
});

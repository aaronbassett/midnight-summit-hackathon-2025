/**
 * Security Middleware Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { SecurityMiddleware } from './security.js';

describe('SecurityMiddleware', () => {
  let security: SecurityMiddleware;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    security = new SecurityMiddleware();

    mockReq = {
      method: 'GET',
      params: {},
      body: {},
      query: {},
      get: vi.fn()
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();
  });

  describe('enforceReadOnly', () => {
    it('should allow GET requests', () => {
      mockReq.method = 'GET';

      const middleware = security.enforceReadOnly();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow POST requests', () => {
      mockReq.method = 'POST';

      const middleware = security.enforceReadOnly();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject PUT requests', () => {
      mockReq.method = 'PUT';

      const middleware = security.enforceReadOnly();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Method Not Allowed'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject DELETE requests', () => {
      mockReq.method = 'DELETE';

      const middleware = security.enforceReadOnly();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject PATCH requests', () => {
      mockReq.method = 'PATCH';

      const middleware = security.enforceReadOnly();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(405);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateCollectionName', () => {
    it('should accept valid collection names', () => {
      mockReq.params = { collection: 'valid-collection' };

      const middleware = security.validateCollectionName();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid collection names with special characters', () => {
      mockReq.params = { collection: 'invalid/collection' };

      const middleware = security.validateCollectionName();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid Collection Name'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject collection names that are too long', () => {
      mockReq.params = { collection: 'a'.repeat(101) };

      const middleware = security.validateCollectionName();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow requests without collection param', () => {
      mockReq.params = {};

      const middleware = security.validateCollectionName();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateQueryParams', () => {
    it('should accept valid query parameters', () => {
      mockReq.body = {
        queryTexts: ['test query'],
        nResults: 5,
        include: ['documents', 'metadatas']
      };

      const middleware = security.validateQueryParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject query texts that exceed max length', () => {
      mockReq.body = {
        queryTexts: ['x'.repeat(10001)] // Exceeds default 10000 limit
      };

      const middleware = security.validateQueryParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Query Too Long'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject nResults that exceed max limit', () => {
      mockReq.body = {
        queryTexts: ['test'],
        nResults: 101 // Exceeds default 100 limit
      };

      const middleware = security.validateQueryParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many Results Requested'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid parameter types', () => {
      mockReq.body = {
        queryTexts: 'not an array', // Should be array
        nResults: 5
      };

      const middleware = security.validateQueryParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid Query Parameters'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateGetParams', () => {
    it('should accept valid get parameters', () => {
      mockReq.body = {
        ids: ['id1', 'id2'],
        limit: 10,
        include: ['documents', 'metadatas']
      };

      const middleware = security.validateGetParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject too many IDs', () => {
      mockReq.body = {
        ids: Array(1001).fill('id') // Exceeds default 1000 limit
      };

      const middleware = security.validateGetParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too Many IDs'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject limit that exceeds max', () => {
      mockReq.body = {
        limit: 101 // Exceeds default 100 limit
      };

      const middleware = security.validateGetParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Limit Too High'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid parameter types', () => {
      mockReq.body = {
        ids: 'not-an-array',
        limit: 10
      };

      const middleware = security.validateGetParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validatePeekParams', () => {
    it('should accept valid limit', () => {
      mockReq.query = { limit: '10' };

      const middleware = security.validatePeekParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject limit that exceeds max', () => {
      mockReq.query = { limit: '101' };

      const middleware = security.validatePeekParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Limit Too High'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid limit', () => {
      mockReq.query = { limit: 'invalid' };

      const middleware = security.validatePeekParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject negative limit', () => {
      mockReq.query = { limit: '-5' };

      const middleware = security.validatePeekParams();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('limitRequestSize', () => {
    it('should allow requests within size limit', () => {
      (mockReq.get as any).mockReturnValue('1000'); // 1000 bytes

      const middleware = security.limitRequestSize();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding 1 MB', () => {
      (mockReq.get as any).mockReturnValue(String(2 * 1024 * 1024)); // 2 MB

      const middleware = security.limitRequestSize();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Request Too Large'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow requests without content-length header', () => {
      (mockReq.get as any).mockReturnValue(undefined);

      const middleware = security.limitRequestSize();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    it('should handle errors and return 500', () => {
      const error = new Error('Test error');
      const mockNextInHandler = vi.fn();

      const errorHandler = security.errorHandler();
      errorHandler(error, mockReq as Request, mockRes as Response, mockNextInHandler);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal Server Error'
        })
      );
    });

    it('should not expose error details to client', () => {
      const error = new Error('Sensitive internal error message');
      const mockNextInHandler = vi.fn();

      const errorHandler = security.errorHandler();
      errorHandler(error, mockReq as Request, mockRes as Response, mockNextInHandler);

      const jsonCall = (mockRes.json as any).mock.calls[0][0];
      expect(jsonCall.message).not.toContain('Sensitive');
      expect(jsonCall.message).toBe('An unexpected error occurred.');
    });
  });
});

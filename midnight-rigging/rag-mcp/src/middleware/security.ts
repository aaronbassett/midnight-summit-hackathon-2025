/**
 * Security Middleware
 *
 * Enforces security constraints on incoming requests:
 * - Query size limits
 * - Input validation
 * - Read-only enforcement
 */

import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ChromaClientService } from '../services/chroma-client.js';
import { createLogger } from '../services/logger.js';
import type { SecurityConfig } from '../types/index.js';

export class SecurityMiddleware {
  private readonly config: SecurityConfig;
  private readonly logger = createLogger('security');

  constructor() {
    this.config = {
      maxQueryLength: parseInt(process.env.MAX_QUERY_LENGTH || '10000', 10),
      maxResultsPerQuery: parseInt(process.env.MAX_RESULTS_PER_QUERY || '100', 10),
      maxIdsPerRequest: parseInt(process.env.MAX_IDS_PER_REQUEST || '1000', 10)
    };
  }

  /**
   * Enforce read-only operations
   */
  enforceReadOnly() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const method = req.method.toUpperCase();

      // Only allow GET requests (read-only)
      if (method !== 'GET' && method !== 'POST') {
        res.status(405).json({
          error: 'Method Not Allowed',
          message: 'This server is read-only. Only GET and POST requests are allowed.'
        });
        return;
      }

      next();
    };
  }

  /**
   * Validate collection name
   */
  validateCollectionName() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const collectionName = req.params.collection || req.params.name;

      if (collectionName) {
        if (!ChromaClientService.validateCollectionName(collectionName)) {
          res.status(400).json({
            error: 'Invalid Collection Name',
            message:
              'Collection name must be alphanumeric with hyphens/underscores, 1-100 characters.'
          });
          return;
        }
      }

      next();
    };
  }

  /**
   * Validate query parameters for query endpoint
   */
  validateQueryParams() {
    const querySchema = z.object({
      queryTexts: z.array(z.string()).min(1).max(10),
      nResults: z.number().int().positive().max(this.config.maxResultsPerQuery).optional(),
      where: z.record(z.unknown()).optional(),
      whereDocument: z.record(z.unknown()).optional(),
      include: z.array(z.enum(['documents', 'embeddings', 'metadatas', 'distances'])).optional()
    });

    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Validate query text length
        if (req.body.queryTexts) {
          for (const text of req.body.queryTexts) {
            if (text.length > this.config.maxQueryLength) {
              res.status(400).json({
                error: 'Query Too Long',
                message: `Query text exceeds maximum length of ${this.config.maxQueryLength} characters.`
              });
              return;
            }
          }
        }

        // Validate nResults doesn't exceed limit
        if (req.body.nResults && req.body.nResults > this.config.maxResultsPerQuery) {
          res.status(400).json({
            error: 'Too Many Results Requested',
            message: `nResults exceeds maximum of ${this.config.maxResultsPerQuery}.`
          });
          return;
        }

        // Validate with Zod schema
        querySchema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            error: 'Invalid Query Parameters',
            details: error.errors
          });
          return;
        }
        next(error);
      }
    };
  }

  /**
   * Validate get parameters for get endpoint
   */
  validateGetParams() {
    const getSchema = z.object({
      ids: z.array(z.string()).max(this.config.maxIdsPerRequest).optional(),
      where: z.record(z.unknown()).optional(),
      whereDocument: z.record(z.unknown()).optional(),
      limit: z.number().int().positive().max(this.config.maxResultsPerQuery).optional(),
      offset: z.number().int().nonnegative().optional(),
      include: z.array(z.enum(['documents', 'embeddings', 'metadatas', 'distances'])).optional()
    });

    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Validate IDs array size
        if (req.body.ids && req.body.ids.length > this.config.maxIdsPerRequest) {
          res.status(400).json({
            error: 'Too Many IDs',
            message: `IDs array exceeds maximum of ${this.config.maxIdsPerRequest}.`
          });
          return;
        }

        // Validate limit doesn't exceed max results
        if (req.body.limit && req.body.limit > this.config.maxResultsPerQuery) {
          res.status(400).json({
            error: 'Limit Too High',
            message: `Limit exceeds maximum of ${this.config.maxResultsPerQuery}.`
          });
          return;
        }

        // Validate with Zod schema
        getSchema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({
            error: 'Invalid Get Parameters',
            details: error.errors
          });
          return;
        }
        next(error);
      }
    };
  }

  /**
   * Validate peek parameters
   */
  validatePeekParams() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      if (isNaN(limit) || limit < 1) {
        res.status(400).json({
          error: 'Invalid Limit',
          message: 'Limit must be a positive integer.'
        });
        return;
      }

      if (limit > this.config.maxResultsPerQuery) {
        res.status(400).json({
          error: 'Limit Too High',
          message: `Limit exceeds maximum of ${this.config.maxResultsPerQuery}.`
        });
        return;
      }

      next();
    };
  }

  /**
   * General request size limit middleware
   */
  limitRequestSize() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentLength = req.get('content-length');

      if (contentLength && parseInt(contentLength, 10) > 1024 * 1024) {
        // 1 MB limit
        res.status(413).json({
          error: 'Request Too Large',
          message: 'Request body exceeds 1 MB limit.'
        });
        return;
      }

      next();
    };
  }

  /**
   * Error handler for security-related errors
   */
  errorHandler() {
    return (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
      this.logger.error('Security error occurred', err);

      // Don't expose internal error details
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred.'
      });
    };
  }
}

/**
 * Rate Limiting Middleware
 *
 * Protects the server from abuse by limiting request rates:
 * - General rate limit: 100 requests per 15 minutes
 * - Per-collection limit: 20 requests per minute
 * - Query limit: 10 requests per minute (stricter for resource-intensive ops)
 *
 * Uses in-memory store with automatic expiration of old entries.
 * Memory growth is bounded by the rate limit window size -
 * expired entries are automatically cleaned up.
 *
 * Note: For production environments with high traffic, consider
 * using Redis or another persistent store for rate limiting data.
 */

import rateLimit from 'express-rate-limit';
import { MemoryStore } from 'express-rate-limit';
import type { Request, Response } from 'express';
import type { RateLimitConfig } from '../types/index.js';

export class RateLimiterMiddleware {
  /**
   * General rate limiter for all requests
   */
  static createGeneralLimiter(): ReturnType<typeof rateLimit> {
    const config: RateLimitConfig = {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      message: 'Too many requests from this IP, please try again later.'
    };

    return rateLimit({
      store: new MemoryStore(),
      windowMs: config.windowMs,
      max: config.maxRequests,
      message: {
        error: 'Too Many Requests',
        message: config.message,
        retryAfter: Math.ceil(config.windowMs / 1000) // seconds
      },
      standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
      legacyHeaders: false, // Disable `X-RateLimit-*` headers
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          error: 'Too Many Requests',
          message: config.message,
          retryAfter: Math.ceil(config.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Per-collection rate limiter (stricter limits for specific collections)
   */
  static createCollectionLimiter(): ReturnType<typeof rateLimit> {
    const windowMs = 60000; // 1 minute
    const maxRequests = parseInt(process.env.RATE_LIMIT_QUERY_PER_MINUTE || '20', 10);

    return rateLimit({
      store: new MemoryStore(),
      windowMs,
      max: maxRequests,
      // Use collection name as key generator for per-collection limiting
      keyGenerator: (req: Request) => {
        const collectionName = req.params.collection || req.params.name || 'unknown';
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `${ip}:${collectionName}`;
      },
      message: {
        error: 'Too Many Requests',
        message: 'Too many requests for this collection, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        const collectionName = req.params.collection || req.params.name || 'this collection';
        res.status(429).json({
          error: 'Too Many Requests',
          message: `Too many requests for ${collectionName}, please try again later.`,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }

  /**
   * Query endpoint rate limiter (most resource-intensive operations)
   */
  static createQueryLimiter(): ReturnType<typeof rateLimit> {
    const windowMs = 60000; // 1 minute
    const maxRequests = 10; // Stricter limit for query operations

    return rateLimit({
      store: new MemoryStore(),
      windowMs,
      max: maxRequests,
      keyGenerator: (req: Request) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `query:${ip}`;
      },
      message: {
        error: 'Too Many Requests',
        message: 'Too many query requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      skipFailedRequests: true // Don't count failed requests
    });
  }

  /**
   * describe_collection rate limiter (per-IP: 3 requests/minute)
   */
  static createDescribeLimiter(): ReturnType<typeof rateLimit> {
    const windowMs = 60000; // 1 minute
    const maxRequests = 3;

    return rateLimit({
      store: new MemoryStore(),
      windowMs,
      max: maxRequests,
      keyGenerator: (req: Request) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `describe:${ip}`;
      },
      message: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests for this collection. Try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests for this collection. Try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }

  /**
   * recommend_collection rate limiter - Per-IP (1 request/minute)
   */
  static createRecommendIPLimiter(): ReturnType<typeof rateLimit> {
    const windowMs = 60000; // 1 minute
    const maxRequests = 1;

    return rateLimit({
      store: new MemoryStore(),
      windowMs,
      max: maxRequests,
      keyGenerator: (req: Request) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return `recommend:${ip}`;
      },
      message: {
        error: 'RATE_LIMIT_EXCEEDED_IP',
        message: 'Too many recommendation requests. Try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED_IP',
          message: 'Too many recommendation requests. Try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }

  /**
   * recommend_collection rate limiter - Global per-minute (10 requests/minute)
   */
  static createRecommendGlobalMinute(): ReturnType<typeof rateLimit> {
    const windowMs = 60000; // 1 minute
    const maxRequests = 10;

    return rateLimit({
      store: new MemoryStore(),
      windowMs,
      max: maxRequests,
      keyGenerator: () => 'recommend:global:minute',
      message: {
        error: 'RATE_LIMIT_EXCEEDED_GLOBAL',
        message: 'Service is temporarily busy. Try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED_GLOBAL',
          message: 'Service is temporarily busy. Try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }

  /**
   * recommend_collection rate limiter - Global per-hour (200 requests/hour)
   */
  static createRecommendGlobalHour(): ReturnType<typeof rateLimit> {
    const windowMs = 3600000; // 1 hour
    const maxRequests = 200;

    return rateLimit({
      store: new MemoryStore(),
      windowMs,
      max: maxRequests,
      keyGenerator: () => 'recommend:global:hour',
      message: {
        error: 'RATE_LIMIT_EXCEEDED_GLOBAL',
        message: 'Service is temporarily busy. Try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED_GLOBAL',
          message: 'Service is temporarily busy. Try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
    });
  }
}

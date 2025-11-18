/**
 * Structured Logger Service for pod network MCP Server
 *
 * Uses LogTape for structured logging with stderr output
 * (stdout reserved for MCP JSON-RPC protocol)
 */

import { Writable } from 'node:stream';
import {
  configure,
  getStreamSink,
  getLogger,
  type Logger as LogtapeLogger
} from '@logtape/logtape';

let isInitialized = false;

/**
 * Initialize the logger with stderr output
 * (stdout is reserved for MCP protocol messages)
 */
export async function initializeLogger(): Promise<void> {
  if (isInitialized) {
    return;
  }

  await configure({
    sinks: {
      stderr: getStreamSink(Writable.toWeb(process.stderr))
    },
    loggers: [
      {
        category: ['pod', 'network'],
        lowestLevel: (process.env.LOG_LEVEL || 'info') as
          | 'trace'
          | 'debug'
          | 'info'
          | 'warning'
          | 'error'
          | 'fatal',
        sinks: ['stderr']
      },
      // Configure meta logger to use stderr (prevents stdout pollution)
      {
        category: ['logtape', 'meta'],
        lowestLevel: 'warning',
        sinks: ['stderr']
      }
    ]
  });

  isInitialized = true;
}

/**
 * Get a logger instance for a specific category
 */
export function getAppLogger(category: string): LogtapeLogger {
  return getLogger(['pod', 'network', category]);
}

/**
 * Logger interface with structured logging methods
 */
export interface StructuredLogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warning(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown> | Error): void;
}

/**
 * Create a wrapper around logtape logger for consistent structured logging
 */
export function createLogger(category: string): StructuredLogger {
  const logger = getAppLogger(category);

  return {
    debug: (message: string, context?: Record<string, unknown>) => {
      logger.debug(message, context || {});
    },
    info: (message: string, context?: Record<string, unknown>) => {
      logger.info(message, context || {});
    },
    warning: (message: string, context?: Record<string, unknown>) => {
      logger.warn(message, context || {});
    },
    error: (message: string, context?: Record<string, unknown> | Error) => {
      if (context instanceof Error) {
        logger.error(message, {
          error: context.message,
          stack: context.stack
        });
      } else {
        logger.error(message, context || {});
      }
    }
  };
}

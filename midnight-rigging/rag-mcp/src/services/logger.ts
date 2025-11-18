/**
 * Structured Logger Service
 *
 * Uses logtape for structured logging with Console sink
 * Provides consistent logging across the application
 */

import {
  configure,
  getConsoleSink,
  getLogger,
  type Logger as LogtapeLogger
} from '@logtape/logtape';

let isInitialized = false;

/**
 * Initialize the logger with console output
 */
export async function initializeLogger(): Promise<void> {
  if (isInitialized) {
    return;
  }

  await configure({
    sinks: {
      console: getConsoleSink()
    },
    loggers: [
      {
        category: ['pod', 'rag'],
        lowestLevel: (process.env.LOG_LEVEL || 'info') as
          | 'trace'
          | 'debug'
          | 'info'
          | 'warning'
          | 'error'
          | 'fatal',
        sinks: ['console']
      }
    ]
  });

  isInitialized = true;
}

/**
 * Get a logger instance for a specific category
 */
export function getAppLogger(category: string): LogtapeLogger {
  return getLogger(['pod', 'rag', category]);
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

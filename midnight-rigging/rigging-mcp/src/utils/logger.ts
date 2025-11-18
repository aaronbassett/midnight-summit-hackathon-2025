/**
 * LogTape logger configuration
 */

import { configure, getConsoleSink, getLogger } from '@logtape/logtape';

/**
 * Initialize logger
 */
export async function initLogger(): Promise<void> {
  await configure({
    sinks: {
      console: getConsoleSink()
    },
    loggers: [
      {
        category: 'rigging-mcp',
        sinks: ['console'],
        lowestLevel: (process.env.LOG_LEVEL ?? 'info') as any
      }
    ]
  });
}

/**
 * Get logger instance
 */
export function getLog() {
  return getLogger('rigging-mcp');
}

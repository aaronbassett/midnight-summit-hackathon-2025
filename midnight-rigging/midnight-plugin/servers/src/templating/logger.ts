/**
 * LogTape structured logging setup for templating MCP server
 */

import { Writable } from 'node:stream';
import { configure, getStreamSink, getLogger } from '@logtape/logtape';

/**
 * Initialize LogTape logger for templating operations
 */
export async function initializeLogger(): Promise<void> {
  const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();

  await configure({
    sinks: {
      stderr: getStreamSink(Writable.toWeb(process.stderr))
    },
    loggers: [
      {
        category: ['templating'],
        lowestLevel: logLevel as 'debug' | 'info' | 'warning' | 'error' | 'fatal',
        sinks: ['stderr']
      }
    ]
  });
}

/**
 * Get logger instance for templating operations
 */
export function getTemplatingLogger() {
  return getLogger(['templating']);
}

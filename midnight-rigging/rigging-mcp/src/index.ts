#!/usr/bin/env node

/**
 * rigging-mcp HTTP server entry point
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { loadConfig, resolveConfigPath } from './config.js';
import { initLogger, getLog } from './utils/logger.js';
import { buildIndex } from './indexer.js';
import { handleDiscovery } from './discovery.js';
import { handlePromptsContent, handlePromptsMetadata } from './prompts.js';
import { handleResourcesContent, handleResourcesMetadata } from './resources.js';
import { handleReferences } from './references.js';
import { RiggingError, ErrorType } from './utils/errors.js';
import { parseArgs } from './utils/cli.js';
import { HttpStatus, formatErrorForConsole } from './utils/http.js';

/**
 * HTTP request router
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const log = getLog();
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  log.debug(`${method} ${pathname}`);

  try {
    // Route requests
    if (method === 'GET' && pathname === '/discovery') {
      await handleDiscovery(req, res);
    } else if (method === 'GET' && pathname.startsWith('/prompts/')) {
      const parts = pathname.split('/').filter(Boolean);
      // parts[0] = 'prompts', parts[1] = namespace, parts[2] = name, parts[3] = 'metadata' (optional)
      if (parts.length === 3 && parts[1] && parts[2]) {
        // /prompts/{namespace}/{name}
        await handlePromptsContent(req, res);
      } else if (parts.length === 4 && parts[1] && parts[2] && parts[3] === 'metadata') {
        // /prompts/{namespace}/{name}/metadata
        await handlePromptsMetadata(req, res);
      } else {
        throw new RiggingError(ErrorType.NOT_FOUND, 'Invalid prompts endpoint');
      }
    } else if (method === 'GET' && pathname.startsWith('/resources/')) {
      const parts = pathname.split('/').filter(Boolean);
      // parts[0] = 'resources', parts[1] = namespace, parts[2] = name, parts[3] = 'metadata' (optional)
      if (parts.length === 3 && parts[1] && parts[2]) {
        // /resources/{namespace}/{name}
        await handleResourcesContent(req, res);
      } else if (parts.length === 4 && parts[1] && parts[2] && parts[3] === 'metadata') {
        // /resources/{namespace}/{name}/metadata
        await handleResourcesMetadata(req, res);
      } else {
        throw new RiggingError(ErrorType.NOT_FOUND, 'Invalid resources endpoint');
      }
    } else if (method === 'GET' && pathname.startsWith('/references/')) {
      await handleReferences(req, res);
    } else {
      // 404 for unknown routes
      res.writeHead(HttpStatus.NOT_FOUND, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'NOT_FOUND',
          message: `Route not found: ${pathname}`
        })
      );
    }
  } catch (error) {
    // Error handling
    log.error`Request error: ${error}`;

    if (error instanceof RiggingError) {
      const statusCode =
        error.type === 'NOT_FOUND' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(error.toResponse()));
    } else {
      res.writeHead(HttpStatus.INTERNAL_SERVER_ERROR, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'INTERNAL_ERROR',
          message: (error as Error).message
        })
      );
    }
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Initialize logger
  await initLogger();
  const log = getLog();

  try {
    // Parse CLI arguments
    const cliArgs = parseArgs();

    log.info('rigging-mcp server starting...');

    // Resolve and load config
    const configPath = await resolveConfigPath(cliArgs.config);
    log.info(`Loading config from: ${configPath}`);

    const config = await loadConfig(configPath);

    // Log loaded sources
    for (const source of config.sources) {
      log.info(`Source '${source.namespace}': skills=${source.skills}, agents=${source.agents}`);
    }

    // Build index
    log.info('Building index...');
    await buildIndex(config);
    log.info('Index built successfully');

    // Determine port (CLI override or config)
    const port = cliArgs.port ?? config.server?.port ?? 3000;
    const host = config.server?.host ?? 'localhost';

    // Start HTTP server
    const server = createServer(handleRequest);

    // Set request timeout (30 seconds) to prevent hanging connections
    server.setTimeout(30000);

    server.listen(port, host, () => {
      log.info(`Server listening on http://${host}:${port}`);
      log.info('Endpoints:');
      log.info(`  GET /discovery - List all resources`);
      log.info(`  GET /prompts/{namespace}/{name} - Get agent prompt`);
      log.info(`  GET /prompts/{namespace}/{name}/metadata - Get agent metadata`);
      log.info(`  GET /resources/{namespace}/{name} - Get skill resource`);
      log.info(`  GET /resources/{namespace}/{name}/metadata - Get skill metadata`);
      log.info(`  GET /references/{namespace}/{skillName}/{referenceName} - Get reference`);
    });

    // Handle shutdown
    process.on('SIGINT', () => {
      log.info('Shutting down gracefully...');
      server.close(() => {
        log.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    log.error`Fatal error: ${error}`;
    formatErrorForConsole(error);
    process.exit(1);
  }
}

// Run server
main();

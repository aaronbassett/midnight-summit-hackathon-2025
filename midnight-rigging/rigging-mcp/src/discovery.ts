/**
 * Discovery endpoint handler
 */

import { IncomingMessage, ServerResponse } from 'http';
import { getIndex } from './indexer.js';
import { getDiscoveryCache } from './utils/cache.js';
import { HttpStatus } from './utils/http.js';

/**
 * Handle GET /discovery endpoint
 *
 * Returns namespace-prefixed URIs for all agents, skills, and references.
 * Uses cached response for performance.
 */
export async function handleDiscovery(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Check cache first (built during index initialization)
  const cachedResponse = getDiscoveryCache();

  if (cachedResponse) {
    // Use cached response
    res.writeHead(HttpStatus.OK, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(cachedResponse, null, 2));
    return;
  }

  // Fallback: build response from index (should not happen in normal operation)
  // This ensures the endpoint still works if cache is somehow missing
  const index = getIndex();

  const response = {
    prompts: Array.from(index.agents.values()).map(agent => agent.uri),
    resources: Array.from(index.skills.values()).map(skill => skill.uri),
    references: Array.from(index.references.values()).map(reference => reference.uri)
  };

  res.writeHead(HttpStatus.OK, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(response, null, 2));
}

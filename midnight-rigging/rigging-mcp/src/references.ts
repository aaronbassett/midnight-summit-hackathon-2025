/**
 * Reference documents endpoint handler
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { lookupReference } from './indexer.js';
import { notFoundError } from './utils/errors.js';

/**
 * Parse namespace, skill name, and reference name from URL path
 * Expected format: /references/{namespace}/{skillName}/{referenceName}
 */
function parseReferencesPath(pathname: string): {
  namespace: string;
  skillName: string;
  referenceName: string;
} {
  const parts = pathname.split('/').filter(Boolean);
  // parts[0] = 'references', parts[1] = namespace, parts[2] = skillName, parts[3] = referenceName
  return {
    namespace: parts[1],
    skillName: parts[2],
    referenceName: parts[3]
  };
}

/**
 * Handle GET /references/{namespace}/{skillName}/{referenceName}
 *
 * Returns reference markdown content
 */
export async function handleReferences(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const { namespace, skillName, referenceName } = parseReferencesPath(url.pathname);

  // Lookup reference
  const reference = lookupReference(namespace, skillName, referenceName);
  if (!reference) {
    throw notFoundError('Reference', `${skillName}/${referenceName}`, namespace);
  }

  // Return markdown content
  res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
  res.end(reference.content);
}

/**
 * Skill resources endpoint handlers
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { lookupSkill } from './indexer.js';
import { notFoundError } from './utils/errors.js';
import { yamlStringify } from './utils/yaml.js';

/**
 * Parse namespace and name from URL path
 * Expected format: /resources/{namespace}/{name}
 */
function parseResourcesPath(pathname: string): { namespace: string; name: string } {
  const parts = pathname.split('/').filter(Boolean);
  // parts[0] = 'resources', parts[1] = namespace, parts[2] = name
  return {
    namespace: parts[1],
    name: parts[2]
  };
}

/**
 * Handle GET /resources/{namespace}/{name}
 *
 * Returns skill SKILL.md content
 */
export async function handleResourcesContent(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const { namespace, name } = parseResourcesPath(url.pathname);

  // Lookup skill
  const skill = lookupSkill(namespace, name);
  if (!skill) {
    throw notFoundError('Skill', name, namespace);
  }

  // Return full markdown content (including frontmatter)
  const fullContent =
    skill.frontmatter && Object.keys(skill.frontmatter).length > 0
      ? `---\n${yamlStringify(skill.frontmatter)}---\n\n${skill.content}`
      : skill.content;

  res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
  res.end(fullContent);
}

/**
 * Handle GET /resources/{namespace}/{name}/metadata
 *
 * Returns skill frontmatter with parameters schema as JSON
 */
export async function handleResourcesMetadata(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const pathname = url.pathname.replace('/metadata', '');
  const { namespace, name } = parseResourcesPath(pathname);

  // Lookup skill
  const skill = lookupSkill(namespace, name);
  if (!skill) {
    throw notFoundError('Skill', name, namespace);
  }

  // Return frontmatter as JSON
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(skill.frontmatter, null, 2));
}

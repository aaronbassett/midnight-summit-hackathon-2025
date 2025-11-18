/**
 * Agent prompts endpoint handlers
 */

import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { lookupAgent } from './indexer.js';
import { substituteTemplate } from './templates.js';
import { notFoundError } from './utils/errors.js';
import { yamlStringify } from './utils/yaml.js';

/**
 * Parse namespace and name from URL path
 * Expected format: /prompts/{namespace}/{name}
 */
function parsePromptsPath(pathname: string): { namespace: string; name: string } {
  const parts = pathname.split('/').filter(Boolean);
  // parts[0] = 'prompts', parts[1] = namespace, parts[2] = name
  return {
    namespace: parts[1],
    name: parts[2]
  };
}

/**
 * Handle GET /prompts/{namespace}/{name}
 *
 * Returns agent prompt content with optional template substitution
 */
export async function handlePromptsContent(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const { namespace, name } = parsePromptsPath(url.pathname);

  // Lookup agent
  const agent = lookupAgent(namespace, name);
  if (!agent) {
    throw notFoundError('Agent', name, namespace);
  }

  // Extract query parameters for template substitution
  const args: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    args[key] = value;
  }

  // Apply template substitution if arguments provided
  let content = agent.content;
  if (Object.keys(args).length > 0) {
    content = substituteTemplate(content, args);
  }

  // Return full markdown content (including frontmatter in original form)
  const fullContent =
    agent.frontmatter && Object.keys(agent.frontmatter).length > 0
      ? `---\n${yamlStringify(agent.frontmatter)}---\n\n${content}`
      : content;

  res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8' });
  res.end(fullContent);
}

/**
 * Handle GET /prompts/{namespace}/{name}/metadata
 *
 * Returns agent frontmatter as JSON
 */
export async function handlePromptsMetadata(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const pathname = url.pathname.replace('/metadata', '');
  const { namespace, name } = parsePromptsPath(pathname);

  // Lookup agent
  const agent = lookupAgent(namespace, name);
  if (!agent) {
    throw notFoundError('Agent', name, namespace);
  }

  // Return frontmatter as JSON
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(agent.frontmatter, null, 2));
}

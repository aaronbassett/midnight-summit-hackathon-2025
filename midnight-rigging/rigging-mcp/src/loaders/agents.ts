/**
 * Agent loader - scans directory and parses markdown files
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Agent, Argument } from '../types.js';
import { parseFrontmatter } from '../frontmatter.js';
import { getLog } from '../utils/logger.js';
import { RiggingError } from '../utils/errors.js';
import { validateFileSize } from '../utils/validation.js';

/**
 * Load all agents from a directory
 *
 * @param directory - Path to agents directory
 * @param namespace - Namespace for these agents
 * @returns Array of loaded agents
 */
export async function loadAgents(directory: string, namespace: string): Promise<Agent[]> {
  const log = getLog();
  const agents: Agent[] = [];

  try {
    const files = await readdir(directory);

    for (const file of files) {
      // Only process .md files
      if (!file.endsWith('.md')) {
        continue;
      }

      try {
        const filePath = join(directory, file);

        // Validate file size before reading (prevent DoS from large files)
        await validateFileSize(filePath);

        const fileContent = await readFile(filePath, 'utf-8');

        // Parse frontmatter
        const { data, content } = parseFrontmatter(fileContent, file);

        // Extract agent name from filename (remove .md extension)
        const name = file.replace(/\.md$/, '');

        // Extract arguments from frontmatter if present
        const arguments_ = extractArguments(data);

        // Build agent entity
        const agent: Agent = {
          name,
          namespace,
          frontmatter: data,
          content,
          arguments: arguments_,
          uri: `mcp://rigging/${namespace}/prompts/${name}`
        };

        agents.push(agent);
        log.debug(`Loaded agent: ${namespace}/${name}`);
      } catch (error) {
        if (error instanceof RiggingError) {
          // Log parsing errors but continue (graceful degradation per FR-014)
          log.warn(`Skipping agent '${file}': ${error.message}`);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    log.error`Failed to load agents from ${directory}: ${error}`;
    throw error;
  }

  return agents;
}

/**
 * Extract arguments array from frontmatter
 */
function extractArguments(frontmatter: Record<string, unknown>): Argument[] | undefined {
  const args = frontmatter.arguments;

  if (!args || !Array.isArray(args)) {
    return undefined;
  }

  return args
    .filter(arg => typeof arg === 'object' && arg !== null)
    .map((arg: any) => ({
      name: arg.name ?? '',
      description: arg.description,
      required: arg.required,
      default: arg.default
    }))
    .filter(arg => arg.name !== ''); // Remove invalid arguments
}

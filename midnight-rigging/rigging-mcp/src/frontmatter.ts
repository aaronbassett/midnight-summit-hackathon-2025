/**
 * YAML frontmatter parsing using gray-matter
 */

import matter from 'gray-matter';
import { invalidYamlError } from './utils/errors.js';

/**
 * Parse result from gray-matter
 */
export interface ParseResult {
  data: Record<string, unknown>;
  content: string;
}

/**
 * Parse YAML frontmatter from markdown file content
 *
 * @param fileContent - Raw markdown file content
 * @param fileName - Name of file (for error reporting)
 * @returns Parsed frontmatter data and content
 * @throws RiggingError if YAML parsing fails
 */
export function parseFrontmatter(fileContent: string, fileName: string): ParseResult {
  try {
    const result = matter(fileContent);
    return {
      data: result.data as Record<string, unknown>,
      content: result.content
    };
  } catch (error) {
    throw invalidYamlError(fileName, error as Error);
  }
}

/**
 * Check if content has frontmatter
 */
export function hasFrontmatter(content: string): boolean {
  return content.trimStart().startsWith('---');
}

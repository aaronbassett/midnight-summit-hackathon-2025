/**
 * Skills loader - scans directories and parses SKILL.md files
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { Skill, Reference } from '../types.js';
import { parseFrontmatter } from '../frontmatter.js';
import { getLog } from '../utils/logger.js';
import { pathExists, validateFileSize } from '../utils/validation.js';
import { RiggingError } from '../utils/errors.js';

/**
 * Load all skills from a directory
 *
 * @param directory - Path to skills directory
 * @param namespace - Namespace for these skills
 * @returns Array of loaded skills
 */
export async function loadSkills(directory: string, namespace: string): Promise<Skill[]> {
  const log = getLog();
  const skills: Skill[] = [];

  try {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      // Only process directories
      if (!entry.isDirectory()) {
        continue;
      }

      const skillName = entry.name;
      const skillDir = join(directory, skillName);
      const skillFile = join(skillDir, 'SKILL.md');

      // Check if SKILL.md exists
      if (!(await pathExists(skillFile))) {
        log.warn(`Skipping '${skillName}': SKILL.md not found`);
        continue;
      }

      try {
        // Validate file size before reading (prevent DoS from large files)
        await validateFileSize(skillFile);

        // Read and parse SKILL.md
        const fileContent = await readFile(skillFile, 'utf-8');
        const { data, content } = parseFrontmatter(fileContent, skillFile);

        // Extract parameters from frontmatter if present
        const parameters = data.parameters as Record<string, unknown> | undefined;

        // Load references
        const references = await loadReferences(skillDir, skillName, namespace);

        // Build skill entity
        const skill: Skill = {
          name: skillName,
          namespace,
          frontmatter: data,
          content,
          parameters,
          references,
          uri: `mcp://rigging/${namespace}/resources/${skillName}`
        };

        skills.push(skill);
        log.debug(`Loaded skill: ${namespace}/${skillName} (${references.length} references)`);
      } catch (error) {
        if (error instanceof RiggingError) {
          // Log parsing errors but continue (graceful degradation per FR-014)
          log.warn(`Skipping skill '${skillName}': ${error.message}`);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    log.error`Failed to load skills from ${directory}: ${error}`;
    throw error;
  }

  return skills;
}

/**
 * Load reference documents for a skill
 *
 * @param skillDir - Path to skill directory
 * @param skillName - Name of the skill
 * @param namespace - Namespace for the skill
 * @returns Array of loaded references
 */
async function loadReferences(
  skillDir: string,
  skillName: string,
  namespace: string
): Promise<Reference[]> {
  const log = getLog();
  const references: Reference[] = [];
  const referencesDir = join(skillDir, 'references');

  // Check if references directory exists
  if (!(await pathExists(referencesDir))) {
    return references;
  }

  try {
    const files = await readdir(referencesDir);

    for (const file of files) {
      // Only process .md files
      if (!file.endsWith('.md')) {
        continue;
      }

      try {
        const filePath = join(referencesDir, file);

        // Validate file size before reading (prevent DoS from large files)
        await validateFileSize(filePath);

        const content = await readFile(filePath, 'utf-8');

        // Reference name from filename (remove .md extension)
        const name = file.replace(/\.md$/, '');

        // Build reference entity
        const reference: Reference = {
          name,
          skillName,
          namespace,
          content,
          uri: `mcp://rigging/${namespace}/references/${skillName}/${name}`
        };

        references.push(reference);
        log.debug(`Loaded reference: ${namespace}/${skillName}/${name}`);
      } catch (error) {
        log.warn(`Failed to load reference '${file}': ${error}`);
      }
    }
  } catch (error) {
    log.warn`Failed to read references directory for '${skillName}': ${error}`;
  }

  return references;
}

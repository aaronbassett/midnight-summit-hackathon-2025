/**
 * Configuration file loading and validation
 */

import { readFile } from 'fs/promises';
import { resolve, dirname, relative } from 'path';
import { Config } from './types.js';
import { ConfigSchema } from './utils/schemas.js';
import {
  invalidJsonError,
  invalidConfigError,
  duplicateNamespaceError,
  fsError
} from './utils/errors.js';
import { validateDirectory, pathExists } from './utils/validation.js';

/**
 * Load and parse config file from path
 *
 * @param configPath - Path to rigging.json config file
 * @returns Parsed and validated config
 * @throws RiggingError if file doesn't exist, is invalid JSON, or fails validation
 */
export async function loadConfig(configPath: string): Promise<Config> {
  // Read config file
  let content: string;
  try {
    content = await readFile(configPath, 'utf-8');
  } catch (error) {
    throw fsError(configPath, 'read config file', error as Error);
  }

  // Parse JSON
  let rawConfig: unknown;
  try {
    rawConfig = JSON.parse(content);
  } catch (error) {
    throw invalidJsonError(configPath, error as Error);
  }

  // Validate schema
  const result = ConfigSchema.safeParse(rawConfig);
  if (!result.success) {
    throw invalidConfigError('Config schema validation failed', result.error.format());
  }

  const config = result.data;

  // Validate namespace uniqueness
  validateNamespaceUniqueness(config);

  // Validate directory paths (resolve relative to config file location)
  const configDir = dirname(resolve(configPath));
  await validateSourcePaths(config, configDir);

  return config;
}

/**
 * Validate that all namespaces are unique
 */
function validateNamespaceUniqueness(config: Config): void {
  const namespaces = new Set<string>();

  for (const source of config.sources) {
    if (namespaces.has(source.namespace)) {
      throw duplicateNamespaceError(source.namespace);
    }
    namespaces.add(source.namespace);
  }
}

/**
 * Validate that all source directories exist and are readable
 */
async function validateSourcePaths(config: Config, configDir: string): Promise<void> {
  for (const source of config.sources) {
    // Resolve paths relative to config file
    const skillsPath = resolve(configDir, source.skills);
    const agentsPath = resolve(configDir, source.agents);

    // Prevent path traversal attacks - ensure resolved paths are within or alongside config directory
    validatePathSafety(skillsPath, configDir, `skills path '${source.skills}'`);
    validatePathSafety(agentsPath, configDir, `agents path '${source.agents}'`);

    // Validate directories exist
    await validateDirectory(skillsPath);
    await validateDirectory(agentsPath);

    // Update source paths to absolute paths
    source.skills = skillsPath;
    source.agents = agentsPath;
  }
}

/**
 * Validate that a resolved path doesn't escape to system directories
 * Allows paths within config directory or sibling directories, but blocks system paths
 */
function validatePathSafety(
  resolvedPath: string,
  configDir: string,
  pathDescription: string
): void {
  // Block access to critical system directories (but allow /var/folders for temp files)
  const dangerousPaths = [
    '/etc/',
    '/var/log/',
    '/var/run/',
    '/usr/bin/',
    '/usr/sbin/',
    '/root/',
    '/sys/',
    '/proc/',
    '/boot/'
  ];

  for (const dangerousPath of dangerousPaths) {
    if (resolvedPath.startsWith(dangerousPath) || resolvedPath === dangerousPath.slice(0, -1)) {
      throw invalidConfigError(
        `Path traversal detected: ${pathDescription} resolves to suspicious system path`,
        { resolvedPath, configDir }
      );
    }
  }

  // Check for excessive upward traversal (more than one level up)
  // This allows ../sibling but blocks ../../../../../../etc
  const rel = relative(configDir, resolvedPath);
  if (rel.startsWith('../..')) {
    throw invalidConfigError(
      `Path traversal detected: ${pathDescription} attempts to traverse too far outside config directory`,
      { resolvedPath, configDir, relativePath: rel }
    );
  }
}

/**
 * Resolve config file path with fallback logic
 *
 * Priority:
 * 1. Provided path (if specified)
 * 2. ./rigging.json (current directory)
 * 3. ./rigging.json.example (current directory)
 *
 * @param providedPath - Optional path from CLI argument
 * @returns Resolved config file path
 * @throws RiggingError if no config file found
 */
export async function resolveConfigPath(providedPath?: string): Promise<string> {
  // If path provided, use it
  if (providedPath) {
    if (await pathExists(providedPath)) {
      return resolve(providedPath);
    }
    throw fsError(providedPath, 'find config file', new Error('File does not exist'));
  }

  // Try rigging.json in current directory
  const configPath = resolve(process.cwd(), 'rigging.json');
  if (await pathExists(configPath)) {
    return configPath;
  }

  // Try rigging.json.example in current directory
  const examplePath = resolve(process.cwd(), 'rigging.json.example');
  if (await pathExists(examplePath)) {
    return examplePath;
  }

  // No config found
  throw invalidConfigError(
    'No config file found. Please create rigging.json or provide --config PATH',
    {
      searchPaths: [configPath, examplePath],
      example: {
        sources: [
          {
            namespace: 'pod',
            skills: '../midnight-plugin/skills',
            agents: '../midnight-plugin/agents'
          }
        ],
        server: {
          port: 3000,
          host: 'localhost'
        }
      }
    }
  );
}

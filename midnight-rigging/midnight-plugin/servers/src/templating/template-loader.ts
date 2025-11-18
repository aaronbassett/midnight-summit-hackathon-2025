/**
 * Template discovery and YAML parsing
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';
import {
  type TemplateListEntry,
  type TemplateMetadata,
  TemplatingError,
  TemplatingErrorType,
  SYSTEM_VARIABLES
} from './types.js';
import { templateMetadataSchema } from './validation.js';
import { getTemplatingLogger } from './logger.js';
import { pathExists } from './filesystem.js';

const logger = getTemplatingLogger();

/**
 * Get the templates root directory
 */
export function getTemplatesRoot(): string {
  // Use environment variable if set, otherwise use bundled templates
  if (process.env.TEMPLATE_ROOT) {
    return process.env.TEMPLATE_ROOT;
  }

  // Get the directory of this module file
  const moduleDir = fileURLToPath(new URL('.', import.meta.url));
  return join(moduleDir, 'templates');
}

/**
 * Discover all available templates
 * @returns Array of template list entries
 */
export async function discoverTemplates(): Promise<TemplateListEntry[]> {
  const templatesRoot = getTemplatesRoot();

  logger.debug('Discovering templates', { templatesRoot });

  // Check if templates directory exists
  if (!(await pathExists(templatesRoot))) {
    logger.error('Templates directory not found', { templatesRoot });
    throw new TemplatingError(
      TemplatingErrorType.TEMPLATE_DIR_NOT_FOUND,
      `Templates directory not found: ${templatesRoot}`
    );
  }

  // Read all directory entries
  const entries = await readdir(templatesRoot, { withFileTypes: true });
  const templateDirs = entries.filter(entry => entry.isDirectory());

  logger.debug('Found template directories', {
    count: templateDirs.length,
    names: templateDirs.map(d => d.name)
  });

  // Load metadata for each template
  const templates: TemplateListEntry[] = [];

  for (const dir of templateDirs) {
    const templatePath = join(templatesRoot, dir.name);
    const yamlPath = join(templatePath, 'template.yaml');

    try {
      // Try to load and parse template.yaml
      const metadata = await loadTemplateMetadata(yamlPath);
      templates.push({
        name: dir.name,
        description: metadata.description,
        hasError: false
      });
    } catch (error) {
      // Include templates with errors in the list
      logger.warn('Template has invalid metadata', {
        template: dir.name,
        error: error instanceof Error ? error.message : String(error)
      });

      templates.push({
        name: dir.name,
        description: 'This template has configuration errors',
        hasError: true
      });
    }
  }

  // Sort alphabetically by name
  templates.sort((a, b) => a.name.localeCompare(b.name));

  logger.info('Template discovery complete', {
    total: templates.length,
    withErrors: templates.filter(t => t.hasError).length
  });

  return templates;
}

/**
 * Load and validate template metadata from template.yaml
 * @param yamlPath Path to template.yaml file
 * @returns Parsed and validated template metadata
 */
export async function loadTemplateMetadata(yamlPath: string): Promise<TemplateMetadata> {
  logger.debug('Loading template metadata', { yamlPath });

  // Check if file exists
  if (!(await pathExists(yamlPath))) {
    throw new TemplatingError(
      TemplatingErrorType.TEMPLATE_ERROR,
      `template.yaml not found at ${yamlPath}`
    );
  }

  // Read and parse YAML
  const yamlContent = await readFile(yamlPath, 'utf-8');
  let parsed: unknown;

  try {
    parsed = loadYaml(yamlContent);
  } catch (error) {
    logger.warn('YAML parse error', {
      yamlPath,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new TemplatingError(
      TemplatingErrorType.TEMPLATE_ERROR,
      'Failed to parse template.yaml. Please check the YAML syntax.'
    );
  }

  // Validate against schema
  const result = templateMetadataSchema.safeParse(parsed);

  if (!result.success) {
    logger.warn('Template validation error', {
      yamlPath,
      errors: result.error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
    throw new TemplatingError(
      TemplatingErrorType.TEMPLATE_ERROR,
      'Invalid template.yaml. Please check the template configuration.'
    );
  }

  logger.debug('Template metadata loaded successfully', {
    name: result.data.name,
    requiredVars: result.data.requiredVariables.length,
    optionalVars: result.data.optionalVariables?.length || 0
  });

  return result.data;
}

/**
 * Get full template details including metadata and system variables
 * @param templateName Name of the template
 * @returns Template details response
 */
export async function getTemplateDetails(templateName: string) {
  const templatesRoot = getTemplatesRoot();
  const templatePath = join(templatesRoot, templateName);

  logger.debug('Getting template details', { templateName, templatePath });

  // Check if template directory exists
  if (!(await pathExists(templatePath))) {
    throw new TemplatingError(
      TemplatingErrorType.TEMPLATE_NOT_FOUND,
      `Template not found: ${templateName}`
    );
  }

  // Load metadata
  const yamlPath = join(templatePath, 'template.yaml');
  let metadata: TemplateMetadata;

  try {
    metadata = await loadTemplateMetadata(yamlPath);
  } catch (error) {
    // Return generic error message for malformed templates
    if (error instanceof TemplatingError && error.type === TemplatingErrorType.TEMPLATE_ERROR) {
      throw new TemplatingError(
        TemplatingErrorType.TEMPLATE_ERROR,
        'This template has errors and cannot be rendered.'
      );
    }
    throw error;
  }

  // Return details with system variables
  return {
    ...metadata,
    systemVariables: Object.keys(SYSTEM_VARIABLES)
  };
}

/**
 * Get the source directory for a template
 * @param templateName Name of the template
 * @returns Path to the template's source directory
 */
export async function getTemplateSourceDir(templateName: string): Promise<string> {
  const templatesRoot = getTemplatesRoot();
  const templatePath = join(templatesRoot, templateName);
  const sourceDir = join(templatePath, 'source');

  // Validate template exists
  if (!(await pathExists(templatePath))) {
    throw new TemplatingError(
      TemplatingErrorType.TEMPLATE_NOT_FOUND,
      `Template not found: ${templateName}`
    );
  }

  // Validate source directory exists
  if (!(await pathExists(sourceDir))) {
    throw new TemplatingError(
      TemplatingErrorType.TEMPLATE_ERROR,
      `Template source directory not found: ${sourceDir}`
    );
  }

  return sourceDir;
}

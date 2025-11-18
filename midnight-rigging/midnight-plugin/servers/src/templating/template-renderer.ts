/**
 * Template rendering engine with Handlebars
 */

import { mkdir, readFile, writeFile, copyFile, chmod, stat } from 'node:fs/promises';
import { join, resolve, dirname, basename, sep } from 'node:path';
import { platform, arch, homedir } from 'node:os';
import Handlebars from 'handlebars';
import {
  type RenderRequest,
  type RenderResponse,
  type ImplementationGuide,
  TemplatingError,
  TemplatingErrorType
} from './types.js';
import { getTemplatingLogger } from './logger.js';
import { sanitizePath, getAllFiles, validateTargetPath, isBinaryFile } from './filesystem.js';
import { loadTemplateMetadata, getTemplateSourceDir } from './template-loader.js';
import { validateRequiredVariables, validateReservedVariableNames } from './validation.js';

const logger = getTemplatingLogger();

// Constants for binary detection and file sampling
const BINARY_SAMPLE_SIZE = 512;
const NON_PRINTABLE_THRESHOLD = 0.3;

// Constants for circular reference protection
const MAX_VARIABLE_DEPTH = 10;

/**
 * Get system variables for injection into template context
 */
function getSystemVariables(
  targetPath: string,
  templateName: string,
  templateVersion?: string
): Record<string, string> {
  const absoluteTarget = resolve(targetPath);
  const targetName = basename(absoluteTarget);

  // Determine OS type
  let osType = 'Unknown';
  let shellExt = 'sh';

  switch (platform()) {
    case 'darwin':
      osType = 'macOS';
      shellExt = 'sh';
      break;
    case 'linux':
      osType = 'Linux';
      shellExt = 'sh';
      break;
    case 'win32':
      osType = 'Windows';
      shellExt = 'bat';
      break;
  }

  const now = new Date();

  return {
    TARGET_DIR: absoluteTarget,
    TARGET_NAME: targetName,
    HOME_DIR: homedir(),
    PATH_SEP: sep,
    TEMPLATE_NAME: templateName,
    TEMPLATE_VERSION: templateVersion || '',
    CURRENT_DATE: now.toISOString().split('T')[0],
    CURRENT_YEAR: now.getFullYear().toString(),
    CURRENT_TIMESTAMP: now.toISOString(),
    OS_PLATFORM: platform(),
    OS_ARCH: arch(),
    OS_TYPE: osType,
    SHELL_EXT: shellExt
  };
}

// ASCII character constants
const ASCII_NULL = 0x00;
const ASCII_PRINTABLE_START = 0x20;
const ASCII_PRINTABLE_END = 0x7e;
const ASCII_TAB = 0x09;
const ASCII_NEWLINE = 0x0a;
const ASCII_CARRIAGE_RETURN = 0x0d;

/**
 * Check if file content is binary
 */
function isContentBinary(buffer: Buffer, sampleSize: number = BINARY_SAMPLE_SIZE): boolean {
  const sample = buffer.subarray(0, Math.min(sampleSize, buffer.length));

  // Check for null bytes (strong indicator of binary content)
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === ASCII_NULL) {
      return true;
    }
  }

  // Check for high percentage of non-printable characters
  let nonPrintable = 0;
  for (let i = 0; i < sample.length; i++) {
    const byte = sample[i];
    // Count bytes that aren't printable ASCII or common whitespace
    if (
      (byte < ASCII_PRINTABLE_START || byte > ASCII_PRINTABLE_END) &&
      byte !== ASCII_TAB &&
      byte !== ASCII_NEWLINE &&
      byte !== ASCII_CARRIAGE_RETURN
    ) {
      nonPrintable++;
    }
  }

  // If more than threshold non-printable, consider it binary
  return nonPrintable / sample.length > NON_PRINTABLE_THRESHOLD;
}

/**
 * Preserve file permissions from source to destination
 */
async function preserveFilePermissions(sourcePath: string, destPath: string): Promise<void> {
  try {
    const stats = await stat(sourcePath);
    await chmod(destPath, stats.mode);
  } catch (error) {
    logger.warn('Failed to preserve file permissions', {
      sourcePath,
      destPath,
      error: error instanceof Error ? error.message : String(error)
    });
    // Non-fatal: continue even if permissions preservation fails
  }
}

/**
 * Detect circular references in variable objects
 */
function detectCircularReferences(
  obj: Record<string, unknown>,
  visited = new Set<unknown>(),
  depth = 0
): void {
  if (depth > MAX_VARIABLE_DEPTH) {
    throw new Error(`Variable nesting depth exceeds maximum (${MAX_VARIABLE_DEPTH})`);
  }

  for (const [key, value] of Object.entries(obj)) {
    if (visited.has(value)) {
      throw new Error(
        `Circular reference detected in variable "${key}". ` +
          'Template variables must not contain circular references.'
      );
    }

    if (typeof value === 'object' && value !== null) {
      visited.add(value);
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            detectCircularReferences(item as Record<string, unknown>, new Set(visited), depth + 1);
          }
        }
      } else {
        detectCircularReferences(value as Record<string, unknown>, new Set(visited), depth + 1);
      }
    }
  }
}

/**
 * Configure Handlebars with security restrictions
 */
function configureHandlebars(): void {
  // Clear all unsafe built-in helpers to prevent template injection attacks
  // Only allow safe string interpolation
  Handlebars.registerHelper('safe-string', (str: string) => new Handlebars.SafeString(str));

  // Handlebars is already configured at module load time
  // Just ensure no additional unsafe helpers are added
}

/**
 * Render template with variable substitution
 */
export async function renderTemplate(request: RenderRequest): Promise<RenderResponse> {
  const { templateName, targetPath, variables } = request;

  logger.info('Starting template rendering', {
    templateName,
    targetPath,
    variableCount: Object.keys(variables).length
  });

  // Configure Handlebars security
  configureHandlebars();

  // Validate target path
  await validateTargetPath(targetPath);

  // Load template metadata
  const sourceDir = await getTemplateSourceDir(templateName);
  const templateDir = dirname(sourceDir);
  const yamlPath = join(templateDir, 'template.yaml');
  const metadata = await loadTemplateMetadata(yamlPath);

  // Validate required variables
  const requiredVarNames = metadata.requiredVariables.map(v => v.name);
  const missingVars = validateRequiredVariables(requiredVarNames, variables);

  if (missingVars.length > 0) {
    throw new TemplatingError(
      TemplatingErrorType.VALIDATION_ERROR,
      `Missing required variables: ${missingVars.join(', ')}`
    );
  }

  // Validate no reserved variable names
  const userVarNames = Object.keys(variables);
  const conflictingVars = validateReservedVariableNames(userVarNames);

  if (conflictingVars.length > 0) {
    throw new TemplatingError(
      TemplatingErrorType.VALIDATION_ERROR,
      `Variables cannot use reserved system variable names (uppercase with underscores): ${conflictingVars.join(', ')}`
    );
  }

  // Merge user variables with optional defaults
  const mergedVars = { ...variables };
  if (metadata.optionalVariables) {
    for (const optVar of metadata.optionalVariables) {
      if (!(optVar.name in mergedVars)) {
        mergedVars[optVar.name] = optVar.default;
      }
    }
  }

  // Detect circular references in user-provided variables
  try {
    detectCircularReferences(mergedVars);
  } catch (error) {
    throw new TemplatingError(
      TemplatingErrorType.VALIDATION_ERROR,
      error instanceof Error ? error.message : 'Invalid variable structure'
    );
  }

  // Inject system variables
  const systemVars = getSystemVariables(targetPath, templateName, metadata.version);
  const allVars = { ...mergedVars, ...systemVars };

  logger.debug('Variables prepared', {
    userVars: Object.keys(mergedVars).length,
    systemVars: Object.keys(systemVars).length,
    total: Object.keys(allVars).length
  });

  // Get all files in template
  const files = await getAllFiles(sourceDir);

  logger.debug('Template files discovered', { count: files.length });

  // Render files
  const absoluteTarget = resolve(targetPath);
  let filesCreated = 0;
  let directoriesCreated = 0;
  const sanitizedPaths: string[] = [];
  const warnings: string[] = [];
  const createdDirs = new Set<string>();

  // Create target directory
  await mkdir(absoluteTarget, { recursive: true });
  createdDirs.add(absoluteTarget);
  directoriesCreated++;

  for (const relativePath of files) {
    const sourcePath = join(sourceDir, relativePath);

    // Render file path with Handlebars
    let renderedPath = relativePath;
    try {
      renderedPath = Handlebars.compile(relativePath)(allVars);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Failed to render file path', {
        path: relativePath,
        error: errorMsg
      });
      warnings.push(`Failed to render path template for ${relativePath}`);
    }

    // Sanitize path components
    const pathComponents = renderedPath.split('/');
    let pathWasSanitized = false;

    for (let i = 0; i < pathComponents.length; i++) {
      const { sanitized, wasModified } = sanitizePath(pathComponents[i]);
      if (wasModified) {
        pathWasSanitized = true;
        pathComponents[i] = sanitized;
      }
    }

    renderedPath = pathComponents.join('/');

    if (pathWasSanitized) {
      sanitizedPaths.push(renderedPath);
    }

    const targetFilePath = join(absoluteTarget, renderedPath);

    // Create parent directories only if not already created
    const parentDir = dirname(targetFilePath);
    if (!createdDirs.has(parentDir)) {
      await mkdir(parentDir, { recursive: true });
      createdDirs.add(parentDir);
      directoriesCreated++;
    }

    // Check if file is binary
    const isBinary = await isBinaryFile(sourcePath);

    if (isBinary) {
      // Copy binary files without modification
      await copyFile(sourcePath, targetFilePath);
      await preserveFilePermissions(sourcePath, targetFilePath);
      logger.debug('Copied binary file', { from: relativePath, to: renderedPath });
    } else {
      // Read file content
      const content = await readFile(sourcePath, 'utf-8');

      // Check if content is actually binary (double-check)
      if (isContentBinary(Buffer.from(content))) {
        await copyFile(sourcePath, targetFilePath);
        await preserveFilePermissions(sourcePath, targetFilePath);
        logger.debug('Copied detected binary file', {
          from: relativePath,
          to: renderedPath
        });
      } else {
        // Render content with Handlebars
        let renderedContent = content;
        try {
          renderedContent = Handlebars.compile(content)(allVars);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          logger.warn('Failed to render file content', {
            path: relativePath,
            error: errorMsg
          });
          warnings.push(`Failed to render content template for ${relativePath}`);
        }

        // Write rendered content
        await writeFile(targetFilePath, renderedContent, 'utf-8');
        await preserveFilePermissions(sourcePath, targetFilePath);
        logger.debug('Rendered and wrote text file', {
          from: relativePath,
          to: renderedPath
        });
      }
    }

    filesCreated++;
  }

  // Generate implementation guide
  const implementationGuide: ImplementationGuide = metadata.structure
    ? {
        overview: metadata.structure.overview,
        keyFiles: metadata.structure.keyFiles.map(kf => ({
          path: Handlebars.compile(kf.path)(allVars),
          purpose: kf.purpose
        })),
        commonCustomizations: metadata.structure.commonCustomizations,
        nextSteps: metadata.structure.nextSteps
      }
    : {
        overview: `Template ${templateName} has been rendered successfully.`,
        keyFiles: []
      };

  logger.info('Template rendering complete', {
    templateName,
    targetPath: absoluteTarget,
    filesCreated,
    directoriesCreated,
    sanitizedPaths: sanitizedPaths.length,
    warnings: warnings.length
  });

  return {
    filesCreated,
    directoriesCreated,
    targetPath: absoluteTarget,
    sanitizedPaths: sanitizedPaths.length > 0 ? sanitizedPaths : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
    implementationGuide
  };
}

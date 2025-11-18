/**
 * Filesystem utilities for template rendering
 */

import { access, constants, readdir } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { isBinaryFile as detectBinaryFile } from 'isbinaryfile';
import { getTemplatingLogger } from './logger.js';

const logger = getTemplatingLogger();

/**
 * Invalid filesystem characters by platform
 */
const INVALID_CHARS: Record<string, RegExp> = {
  win32: /[<>:"|?*\x00-\x1F]/g,
  darwin: /[\x00:]/g,
  linux: /[\x00/]/g
};

/**
 * Sanitize a filename or directory name by replacing invalid characters
 * @param name The name to sanitize
 * @param platform The target platform (defaults to current platform)
 * @returns Sanitized name and whether sanitization occurred
 */
export function sanitizePath(
  name: string,
  platform: string = process.platform
): { sanitized: string; wasModified: boolean } {
  const pattern = INVALID_CHARS[platform] || INVALID_CHARS.linux;
  const sanitized = name.replace(pattern, '_');
  const wasModified = sanitized !== name;

  if (wasModified) {
    logger.debug('Sanitized path component', {
      original: name,
      sanitized,
      platform
    });
  }

  return { sanitized, wasModified };
}

/**
 * Check if a path exists
 * @param path The path to check
 * @returns true if the path exists, false otherwise
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is writable
 * @param path The path to check
 * @returns true if the path is writable, false otherwise
 */
export async function isWritable(path: string): Promise<boolean> {
  try {
    await access(path, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a directory is writable (for creating new files/directories)
 * @param dirPath The directory path to check
 * @returns true if the directory is writable, false otherwise
 */
export async function canWriteToDirectory(dirPath: string): Promise<boolean> {
  const exists = await pathExists(dirPath);
  if (!exists) {
    return false;
  }

  return await isWritable(dirPath);
}

/**
 * Common binary file extensions for quick detection
 */
const BINARY_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.ico',
  '.pdf',
  '.zip',
  '.tar',
  '.gz',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.dat',
  '.db',
  '.sqlite',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.webp',
  '.svg',
  '.mp3',
  '.mp4',
  '.mov',
  '.avi'
]);

/**
 * Detect if a file is binary based on file extension and content
 * Uses extension detection for quick checks, isbinaryfile for existing files
 * @param filePath The file path to check
 * @returns true if the file appears to be binary, false otherwise
 */
export async function isBinaryFile(filePath: string): Promise<boolean> {
  // Quick check by extension first (works for all files, existing or not)
  const ext = filePath.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && BINARY_EXTENSIONS.has(ext)) {
    return true;
  }

  // If file exists and doesn't match quick check, use isbinaryfile for accurate detection
  if (await pathExists(filePath)) {
    try {
      return await detectBinaryFile(filePath);
    } catch (error) {
      logger.warn('Binary file detection failed, treating as text', {
        filePath,
        error: error instanceof Error ? error.message : String(error)
      });
      // On error, assume text file for safety
      return false;
    }
  }

  // File doesn't exist or can't be detected, assume text
  return false;
}

/**
 * Recursively get all files in a directory
 * @param dirPath The directory path to scan
 * @param baseDir The base directory for relative path calculation
 * @returns Array of file paths relative to baseDir
 * @throws Error if path traversal attempt detected
 */
export async function getAllFiles(dirPath: string, baseDir: string = dirPath): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dirPath, { withFileTypes: true });
  const absoluteBase = resolve(baseDir);
  const absoluteDir = resolve(dirPath);

  for (const entry of entries) {
    const fullPath = resolve(join(absoluteDir, entry.name));

    // Security: Prevent path traversal attacks
    if (!fullPath.startsWith(absoluteBase + sep)) {
      logger.error('Path traversal attempt detected', {
        entryName: entry.name,
        fullPath,
        basePath: absoluteBase
      });
      throw new Error('Invalid file path: contains directory traversal');
    }

    const relativePath = fullPath.substring(absoluteBase.length + 1);

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, baseDir);
      files.push(...subFiles);
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Validate that a target path is safe for rendering
 * @param targetPath The target path to validate
 * @throws Error if the path is invalid or inaccessible
 */
export async function validateTargetPath(targetPath: string): Promise<void> {
  // Resolve to absolute path
  const absolutePath = resolve(targetPath);

  // Check if target already exists
  if (await pathExists(absolutePath)) {
    throw new Error(
      `Target directory already exists: ${absolutePath}. Please choose a different location or remove the existing directory.`
    );
  }

  // Check if parent directory exists and is writable
  const parentDir = resolve(absolutePath, '..');
  const parentExists = await pathExists(parentDir);

  if (!parentExists) {
    throw new Error(
      `Parent directory does not exist: ${parentDir}. Please create the parent directory first.`
    );
  }

  const canWrite = await canWriteToDirectory(parentDir);
  if (!canWrite) {
    throw new Error(
      `No write permission for parent directory: ${parentDir}. Please check permissions.`
    );
  }
}

/**
 * Directory and file validation utilities
 */

import { access, constants, stat } from 'fs/promises';
import { fsError } from './errors.js';

/** Maximum file size in bytes (100MB) */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Check if a directory exists and is readable
 */
export async function validateDirectory(path: string): Promise<void> {
  try {
    await access(path, constants.R_OK);
  } catch (error) {
    throw fsError(path, 'read directory', error as Error);
  }
}

/**
 * Check if a file exists and is readable
 */
export async function validateFile(path: string): Promise<void> {
  try {
    await access(path, constants.R_OK);
  } catch (error) {
    throw fsError(path, 'read file', error as Error);
  }
}

/**
 * Check if a path exists (file or directory)
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
 * Validate file size to prevent DoS from large files
 *
 * @param path - Path to file to check
 * @throws RiggingError if file exceeds maximum size (100MB)
 */
export async function validateFileSize(path: string): Promise<void> {
  try {
    const stats = await stat(path);
    if (stats.size > MAX_FILE_SIZE) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
      throw fsError(
        path,
        'read file',
        new Error(`File size (${sizeMB}MB) exceeds maximum allowed size (${maxMB}MB)`)
      );
    }
  } catch (error) {
    // Re-throw if already a RiggingError, otherwise wrap
    if ((error as any).type) {
      throw error;
    }
    throw fsError(path, 'check file size', error as Error);
  }
}

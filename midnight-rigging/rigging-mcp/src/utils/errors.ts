/**
 * Error handling utilities
 */

import { ErrorResponse } from '../types.js';

/**
 * Error types for the rigging-mcp server
 */
export enum ErrorType {
  NOT_FOUND = 'NOT_FOUND',
  INVALID_YAML = 'INVALID_YAML',
  INVALID_JSON = 'INVALID_JSON',
  FS_ERROR = 'FS_ERROR',
  INVALID_CONFIG = 'INVALID_CONFIG',
  DUPLICATE_NAMESPACE = 'DUPLICATE_NAMESPACE'
}

/**
 * Custom error class for rigging-mcp
 */
export class RiggingError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'RiggingError';
  }

  /**
   * Convert error to HTTP response format
   */
  toResponse(): ErrorResponse {
    return {
      error: this.type,
      message: this.message,
      details: this.details
    };
  }
}

/**
 * Create a NOT_FOUND error
 */
export function notFoundError(
  resourceType: string,
  name: string,
  namespace?: string
): RiggingError {
  const fullName = namespace ? `${namespace}/${name}` : name;
  return new RiggingError(ErrorType.NOT_FOUND, `${resourceType} '${fullName}' not found`, {
    type: resourceType,
    name,
    namespace
  });
}

/**
 * Create an INVALID_YAML error
 */
export function invalidYamlError(file: string, error: Error): RiggingError {
  return new RiggingError(
    ErrorType.INVALID_YAML,
    `Failed to parse frontmatter in '${file}': ${error.message}`,
    { file, originalError: error.message }
  );
}

/**
 * Create an INVALID_JSON error
 */
export function invalidJsonError(file: string, error: Error): RiggingError {
  return new RiggingError(
    ErrorType.INVALID_JSON,
    `Failed to parse JSON in '${file}': ${error.message}`,
    { file, originalError: error.message }
  );
}

/**
 * Create an FS_ERROR
 */
export function fsError(path: string, operation: string, error: Error): RiggingError {
  return new RiggingError(
    ErrorType.FS_ERROR,
    `Failed to ${operation}: ${path} - ${error.message}`,
    { path, operation, originalError: error.message }
  );
}

/**
 * Create an INVALID_CONFIG error
 */
export function invalidConfigError(message: string, details?: unknown): RiggingError {
  return new RiggingError(ErrorType.INVALID_CONFIG, `Invalid configuration: ${message}`, details);
}

/**
 * Create a DUPLICATE_NAMESPACE error
 */
export function duplicateNamespaceError(namespace: string): RiggingError {
  return new RiggingError(
    ErrorType.DUPLICATE_NAMESPACE,
    `Duplicate namespace detected: '${namespace}'`,
    { namespace }
  );
}

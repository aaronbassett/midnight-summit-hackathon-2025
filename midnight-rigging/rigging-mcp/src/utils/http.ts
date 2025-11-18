/**
 * HTTP utilities and constants
 */

/**
 * HTTP status codes used by the rigging-mcp server
 */
export enum HttpStatus {
  OK = 200,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

/**
 * Format error for console output
 *
 * @param error - Error to format
 * @returns void
 */
export function formatErrorForConsole(error: unknown): void {
  if (error && typeof error === 'object' && 'message' in error) {
    console.error(`\nError: ${error.message}`);
    if ('details' in error && error.details) {
      console.error('Details:', JSON.stringify(error.details, null, 2));
    }
  } else {
    console.error(`\nUnexpected error: ${String(error)}`);
  }
}

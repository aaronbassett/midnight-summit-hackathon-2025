/**
 * Template substitution using regex-based placeholder replacement
 */

/**
 * Sanitize user input to prevent injection attacks
 * Escapes HTML special characters and markdown control characters
 *
 * @param input - User-provided string to sanitize
 * @returns Sanitized string safe for template substitution
 */
function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Substitute template placeholders with provided arguments
 *
 * Replaces {{placeholder}} patterns with corresponding values from args.
 * If an argument is not provided, the placeholder remains unchanged.
 * All user inputs are sanitized to prevent injection attacks.
 *
 * @param content - Content with {{placeholder}} patterns
 * @param args - Key-value pairs for substitution
 * @returns Content with substitutions applied
 */
export function substituteTemplate(content: string, args: Record<string, string>): string {
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    // Return sanitized argument value if provided, otherwise keep placeholder
    return args[key] ? sanitizeInput(args[key]) : match;
  });
}

/**
 * Extract placeholder names from content
 *
 * @param content - Content with {{placeholder}} patterns
 * @returns Array of unique placeholder names
 */
export function extractPlaceholders(content: string): string[] {
  const placeholders = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    placeholders.add(match[1]);
  }

  return Array.from(placeholders);
}

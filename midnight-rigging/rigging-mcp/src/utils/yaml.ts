/**
 * YAML serialization utilities
 */

/**
 * Simple YAML stringifier for frontmatter
 * Handles simple key-value objects, arrays, and nested objects
 *
 * @param obj - Object to serialize to YAML
 * @returns YAML string representation
 */
export function yamlStringify(obj: Record<string, unknown>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === 'object') {
          lines.push(`  - ${JSON.stringify(item)}`);
        } else {
          lines.push(`  - ${item}`);
        }
      }
    } else if (typeof value === 'object') {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

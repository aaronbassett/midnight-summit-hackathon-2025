// Integration tests for frontmatter parsing
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, hasFrontmatter } from '../../dist/frontmatter.js';
import { RiggingError } from '../../dist/utils/errors.js';

describe('Frontmatter Parsing', () => {
  describe('parseFrontmatter()', () => {
    it('should parse valid YAML frontmatter', () => {
      // Arrange
      const content = `---
name: test-skill
description: A test skill
parameters:
  type: object
---

# Content here`;

      // Act
      const result = parseFrontmatter(content, 'test.md');

      // Assert
      assert.strictEqual(result.data.name, 'test-skill');
      assert.strictEqual(result.data.description, 'A test skill');
      assert.ok(result.data.parameters);
      assert.strictEqual(result.content.trim(), '# Content here');
    });

    it('should handle files without frontmatter', () => {
      // Arrange
      const content = '# Just content\n\nNo frontmatter here';

      // Act
      const result = parseFrontmatter(content, 'test.md');

      // Assert
      assert.deepStrictEqual(result.data, {});
      assert.strictEqual(result.content, content);
    });

    it('should handle empty frontmatter', () => {
      // Arrange
      const content = `---
---

# Content`;

      // Act
      const result = parseFrontmatter(content, 'test.md');

      // Assert
      assert.deepStrictEqual(result.data, {});
      assert.strictEqual(result.content.trim(), '# Content');
    });

    it('should throw RiggingError for invalid YAML syntax', () => {
      // Arrange
      const content = `---
name: test
invalid: [unclosed array
---

Content`;

      // Act & Assert
      assert.throws(
        () => parseFrontmatter(content, 'bad.md'),
        (err: RiggingError) => {
          assert.strictEqual(err.type, 'INVALID_YAML');
          assert.match(err.message, /Failed to parse frontmatter/);
          return true;
        }
      );
    });

    it('should parse frontmatter with nested objects', () => {
      // Arrange
      const content = `---
arguments:
  - name: task
    description: Task to perform
    required: false
  - name: framework
    default: typescript
---

Content`;

      // Act
      const result = parseFrontmatter(content, 'test.md');

      // Assert
      assert.ok(Array.isArray(result.data.arguments));
      assert.strictEqual((result.data.arguments as any)[0].name, 'task');
      assert.strictEqual((result.data.arguments as any)[1].default, 'typescript');
    });

    it('should handle empty content after frontmatter', () => {
      // Arrange
      const content = `---
name: test
---`;

      // Act
      const result = parseFrontmatter(content, 'test.md');

      // Assert
      assert.strictEqual(result.data.name, 'test');
      assert.strictEqual(result.content, '');
    });
  });

  describe('hasFrontmatter()', () => {
    it('should return true for content with frontmatter', () => {
      assert.strictEqual(hasFrontmatter('---\nname: test\n---'), true);
    });

    it('should return true for content with frontmatter after whitespace', () => {
      assert.strictEqual(hasFrontmatter('  \n---\nname: test\n---'), true);
    });

    it('should return false for content without frontmatter', () => {
      assert.strictEqual(hasFrontmatter('# Just a heading'), false);
    });

    it('should return false for empty content', () => {
      assert.strictEqual(hasFrontmatter(''), false);
    });
  });
});

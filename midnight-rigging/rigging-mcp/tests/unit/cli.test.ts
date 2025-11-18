// Unit tests for CLI argument parsing
import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../../dist/utils/cli.js';

describe('CLI Argument Parsing', () => {
  describe('parseArgs()', () => {
    it('should return empty object for no arguments', () => {
      // Arrange
      const args: string[] = [];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.deepStrictEqual(result, {});
    });

    it('should parse --config argument', () => {
      // Arrange
      const args = ['--config', '/path/to/config.json'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.config, '/path/to/config.json');
      assert.strictEqual(result.port, undefined);
    });

    it('should parse --port argument', () => {
      // Arrange
      const args = ['--port', '8080'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.port, 8080);
      assert.strictEqual(result.config, undefined);
    });

    it('should parse both --config and --port arguments', () => {
      // Arrange
      const args = ['--config', './custom.json', '--port', '3000'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.config, './custom.json');
      assert.strictEqual(result.port, 3000);
    });

    it('should handle arguments in any order', () => {
      // Arrange
      const args = ['--port', '9000', '--config', '/etc/rigging.json'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.port, 9000);
      assert.strictEqual(result.config, '/etc/rigging.json');
    });

    it('should parse port as integer (valid number)', () => {
      // Arrange
      const args = ['--port', '65535'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.port, 65535);
      assert.strictEqual(typeof result.port, 'number');
    });

    it('should handle NaN for non-numeric port values', () => {
      // Arrange
      const args = ['--port', 'not-a-number'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.ok(Number.isNaN(result.port));
    });

    it('should handle negative port numbers', () => {
      // Arrange
      const args = ['--port', '-100'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.port, -100);
    });

    it('should handle port numbers exceeding valid range (>65535)', () => {
      // Arrange
      const args = ['--port', '99999'];

      // Act
      const result = parseArgs(args);

      // Assert
      // parseArgs doesn't validate range, just parses
      assert.strictEqual(result.port, 99999);
    });

    it('should ignore --config with no value', () => {
      // Arrange
      const args = ['--config'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.config, undefined);
    });

    it('should ignore --port with no value', () => {
      // Arrange
      const args = ['--port'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.port, undefined);
    });

    it('should handle paths with spaces', () => {
      // Arrange
      const args = ['--config', '/path/with spaces/config.json'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.config, '/path/with spaces/config.json');
    });

    it('should handle relative paths', () => {
      // Arrange
      const args = ['--config', './configs/dev.json'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.config, './configs/dev.json');
    });

    it('should handle absolute paths', () => {
      // Arrange
      const args = ['--config', '/etc/rigging/production.json'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.config, '/etc/rigging/production.json');
    });

    it('should ignore unknown arguments', () => {
      // Arrange
      const args = ['--unknown', 'value', '--config', 'test.json'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.config, 'test.json');
      assert.strictEqual((result as any).unknown, undefined);
    });

    it('should exit with code 0 when --help is provided', () => {
      // Arrange
      const args = ['--help'];
      const mockExit = mock.fn((_code?: number) => {
        throw new Error('process.exit called');
      });
      const originalExit = process.exit;
      process.exit = mockExit as any;

      // Act & Assert
      try {
        assert.throws(
          () => parseArgs(args),
          (err: Error) => {
            assert.strictEqual(err.message, 'process.exit called');
            return true;
          }
        );
        assert.strictEqual(mockExit.mock.calls.length, 1);
        assert.strictEqual(mockExit.mock.calls[0].arguments[0], 0);
      } finally {
        // Restore original process.exit
        process.exit = originalExit;
      }
    });

    it('should exit with code 0 when -h is provided', () => {
      // Arrange
      const args = ['-h'];
      const mockExit = mock.fn((_code?: number) => {
        throw new Error('process.exit called');
      });
      const originalExit = process.exit;
      process.exit = mockExit as any;

      // Act & Assert
      try {
        assert.throws(
          () => parseArgs(args),
          (err: Error) => {
            assert.strictEqual(err.message, 'process.exit called');
            return true;
          }
        );
        assert.strictEqual(mockExit.mock.calls.length, 1);
        assert.strictEqual(mockExit.mock.calls[0].arguments[0], 0);
      } finally {
        // Restore original process.exit
        process.exit = originalExit;
      }
    });

    it('should handle --help with other arguments (help takes precedence)', () => {
      // Arrange
      const args = ['--config', 'test.json', '--help', '--port', '8080'];
      const mockExit = mock.fn((_code?: number) => {
        throw new Error('process.exit called');
      });
      const originalExit = process.exit;
      process.exit = mockExit as any;

      // Act & Assert
      try {
        assert.throws(
          () => parseArgs(args),
          (err: Error) => {
            assert.strictEqual(err.message, 'process.exit called');
            return true;
          }
        );
        assert.strictEqual(mockExit.mock.calls.length, 1);
        assert.strictEqual(mockExit.mock.calls[0].arguments[0], 0);
      } finally {
        // Restore original process.exit
        process.exit = originalExit;
      }
    });

    it('should handle port 0 (let OS choose)', () => {
      // Arrange
      const args = ['--port', '0'];

      // Act
      const result = parseArgs(args);

      // Assert
      assert.strictEqual(result.port, 0);
    });

    it('should handle multiple occurrences of same flag (last wins)', () => {
      // Arrange
      const args = ['--port', '3000', '--port', '8080'];

      // Act
      const result = parseArgs(args);

      // Assert
      // Last value should win
      assert.strictEqual(result.port, 8080);
    });
  });
});

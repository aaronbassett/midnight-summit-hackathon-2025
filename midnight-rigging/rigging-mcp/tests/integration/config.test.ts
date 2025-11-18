// Integration tests for config loading and validation
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { loadConfig, resolveConfigPath } from '../../dist/config.js';
import { RiggingError } from '../../dist/utils/errors.js';

describe('Config Loading', () => {
  let tempDir: string;
  let originalCwd: string;

  before(async () => {
    // Save the original CWD to restore it later
    originalCwd = process.cwd();
    // Create a unique temporary directory for the entire test suite
    tempDir = await mkdtemp(join(tmpdir(), 'rigging-mcp-config-test-'));
    // Change the current working directory to the temp directory
    // This isolates tests that rely on process.cwd()
    process.chdir(tempDir);
  });

  after(async () => {
    // Restore the original CWD
    process.chdir(originalCwd);
    // Clean up the temporary directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('loadConfig()', () => {
    it('should load and validate a correct config file with relative paths', async () => {
      // Arrange
      const skillsDir = join(tempDir, 'test-skills');
      const agentsDir = join(tempDir, 'test-agents');
      await mkdir(skillsDir);
      await mkdir(agentsDir);

      const config = {
        sources: [
          {
            namespace: 'test',
            skills: './test-skills',
            agents: './test-agents'
          }
        ]
      };
      const configPath = join(tempDir, 'rigging.json');
      await writeFile(configPath, JSON.stringify(config));

      // Act
      const loadedConfig = await loadConfig(configPath);

      // Assert
      assert.strictEqual(loadedConfig.sources.length, 1);
      assert.strictEqual(loadedConfig.sources[0].namespace, 'test');
      // Validates that relative paths were resolved to absolute paths
      assert.strictEqual(loadedConfig.sources[0].skills, skillsDir);
      assert.strictEqual(loadedConfig.sources[0].agents, agentsDir);
    });

    it('should load config with multiple namespaces', async () => {
      // Arrange
      const skills1 = join(tempDir, 'skills-1');
      const agents1 = join(tempDir, 'agents-1');
      const skills2 = join(tempDir, 'skills-2');
      const agents2 = join(tempDir, 'agents-2');
      await mkdir(skills1);
      await mkdir(agents1);
      await mkdir(skills2);
      await mkdir(agents2);

      const config = {
        sources: [
          { namespace: 'ns1', skills: './skills-1', agents: './agents-1' },
          { namespace: 'ns2', skills: './skills-2', agents: './agents-2' }
        ]
      };
      const configPath = join(tempDir, 'multi-ns.json');
      await writeFile(configPath, JSON.stringify(config));

      // Act
      const loadedConfig = await loadConfig(configPath);

      // Assert
      assert.strictEqual(loadedConfig.sources.length, 2);
      assert.strictEqual(loadedConfig.sources[0].namespace, 'ns1');
      assert.strictEqual(loadedConfig.sources[1].namespace, 'ns2');
    });

    it('should throw RiggingError (FS_ERROR) if config file does not exist', async () => {
      // Arrange
      const nonExistentPath = join(tempDir, 'non-existent.json');

      // Act & Assert
      await assert.rejects(
        () => loadConfig(nonExistentPath),
        (err: RiggingError) => {
          assert.strictEqual(err.type, 'FS_ERROR');
          assert.match(err.message, /Failed to read config file/);
          return true;
        }
      );
    });

    it('should throw RiggingError (INVALID_JSON) for malformed JSON', async () => {
      // Arrange
      const configPath = join(tempDir, 'invalid.json');
      await writeFile(configPath, '{ "sources": [ }'); // Malformed JSON

      // Act & Assert
      await assert.rejects(
        () => loadConfig(configPath),
        (err: RiggingError) => {
          assert.strictEqual(err.type, 'INVALID_JSON');
          assert.match(err.message, /Failed to parse JSON/);
          return true;
        }
      );
    });

    it('should throw RiggingError (INVALID_CONFIG) for invalid schema (missing namespace)', async () => {
      // Arrange
      const skillsDir = join(tempDir, 's');
      const agentsDir = join(tempDir, 'a');
      await mkdir(skillsDir, { recursive: true });
      await mkdir(agentsDir, { recursive: true });
      const config = { sources: [{ skills: './s', agents: './a' }] }; // Missing namespace
      const configPath = join(tempDir, 'invalid-schema.json');
      await writeFile(configPath, JSON.stringify(config));

      // Act & Assert
      await assert.rejects(
        () => loadConfig(configPath),
        (err: RiggingError) => {
          assert.strictEqual(err.type, 'INVALID_CONFIG');
          assert.match(err.message, /Config schema validation failed/);
          assert.ok(err.details); // Zod error details should be attached
          return true;
        }
      );
    });

    it('should throw RiggingError (INVALID_CONFIG) for empty sources array', async () => {
      // Arrange
      const config = { sources: [] };
      const configPath = join(tempDir, 'empty-sources.json');
      await writeFile(configPath, JSON.stringify(config));

      // Act & Assert
      await assert.rejects(
        () => loadConfig(configPath),
        (err: RiggingError) => {
          assert.strictEqual(err.type, 'INVALID_CONFIG');
          assert.match(err.message, /Config schema validation failed/);
          return true;
        }
      );
    });

    it('should throw RiggingError (DUPLICATE_NAMESPACE) for duplicate namespaces', async () => {
      // Arrange
      const skillsDir = join(tempDir, 's');
      const agentsDir = join(tempDir, 'a');
      await mkdir(skillsDir, { recursive: true });
      await mkdir(agentsDir, { recursive: true });
      const config = {
        sources: [
          { namespace: 'dup', skills: './s', agents: './a' },
          { namespace: 'dup', skills: './s', agents: './a' }
        ]
      };
      const configPath = join(tempDir, 'duplicate-ns.json');
      await writeFile(configPath, JSON.stringify(config));

      // Act & Assert
      await assert.rejects(
        () => loadConfig(configPath),
        (err: RiggingError) => {
          assert.strictEqual(err.type, 'DUPLICATE_NAMESPACE');
          assert.match(err.message, /Duplicate namespace detected: 'dup'/);
          return true;
        }
      );
    });

    it('should throw RiggingError (FS_ERROR) if a source directory does not exist', async () => {
      // Arrange
      const config = {
        sources: [
          {
            namespace: 'test',
            skills: './non-existent-skills',
            agents: './non-existent-agents'
          }
        ]
      };
      const configPath = join(tempDir, 'bad-paths.json');
      await writeFile(configPath, JSON.stringify(config));

      // Act & Assert
      await assert.rejects(
        () => loadConfig(configPath),
        (err: RiggingError) => {
          assert.strictEqual(err.type, 'FS_ERROR');
          assert.match(err.message, /Failed to read directory/);
          return true;
        }
      );
    });

    it('should reject invalid namespace format (uppercase)', async () => {
      // Arrange
      const skillsDir = join(tempDir, 's');
      const agentsDir = join(tempDir, 'a');
      await mkdir(skillsDir, { recursive: true });
      await mkdir(agentsDir, { recursive: true });
      const config = {
        sources: [{ namespace: 'InvalidNamespace', skills: './s', agents: './a' }]
      };
      const configPath = join(tempDir, 'invalid-namespace.json');
      await writeFile(configPath, JSON.stringify(config));

      // Act & Assert
      await assert.rejects(
        () => loadConfig(configPath),
        (err: RiggingError) => {
          assert.strictEqual(err.type, 'INVALID_CONFIG');
          assert.match(err.message, /Config schema validation failed/);
          // Zod error details should mention namespace validation
          return true;
        }
      );
    });
  });

  describe('resolveConfigPath()', () => {
    it('should resolve the provided path if it exists', async () => {
      // Arrange
      const configPath = join(tempDir, 'custom-config.json');
      await writeFile(configPath, '{}');

      // Act
      const resolvedPath = await resolveConfigPath(configPath);

      // Assert
      assert.strictEqual(resolvedPath, resolve(configPath));
    });

    it('should throw if the provided path does not exist', async () => {
      // Arrange
      const nonExistentPath = join(tempDir, 'non-existent-custom.json');

      // Act & Assert
      await assert.rejects(
        () => resolveConfigPath(nonExistentPath),
        (err: RiggingError) => {
          assert.strictEqual(err.type, 'FS_ERROR');
          assert.match(err.message, /Failed to find config file/);
          return true;
        }
      );
    });

    it('should find rigging.json in the current directory by default', async () => {
      // Arrange
      const configPath = resolve(process.cwd(), 'rigging.json');
      await writeFile(configPath, '{}');

      // Act
      const resolvedPath = await resolveConfigPath();

      // Assert
      assert.strictEqual(resolvedPath, configPath);
      await rm(configPath); // Clean up for next test
    });

    it('should find rigging.json.example as a fallback', async () => {
      // Arrange
      const examplePath = resolve(process.cwd(), 'rigging.json.example');
      await writeFile(examplePath, '{}');

      // Act
      const resolvedPath = await resolveConfigPath();

      // Assert
      assert.strictEqual(resolvedPath, examplePath);
      await rm(examplePath); // Clean up for next test
    });

    it('should prefer rigging.json over rigging.json.example', async () => {
      // Arrange
      const configPath = resolve(process.cwd(), 'rigging.json');
      const examplePath = resolve(process.cwd(), 'rigging.json.example');
      await writeFile(configPath, '{"real": true}');
      await writeFile(examplePath, '{"example": true}');

      // Act
      const resolvedPath = await resolveConfigPath();

      // Assert
      assert.strictEqual(resolvedPath, configPath);
      await rm(configPath);
      await rm(examplePath);
    });

    it('should throw if no config file is found', async () => {
      // Act & Assert
      await assert.rejects(
        () => resolveConfigPath(),
        (err: RiggingError) => {
          assert.strictEqual(err.type, 'INVALID_CONFIG');
          assert.match(err.message, /No config file found/);
          return true;
        }
      );
    });
  });
});

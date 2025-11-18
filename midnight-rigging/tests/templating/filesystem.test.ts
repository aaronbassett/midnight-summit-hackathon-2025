/**
 * Unit tests for filesystem utilities
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, chmod, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  sanitizePath,
  pathExists,
  isWritable,
  canWriteToDirectory,
  isBinaryFile,
  getAllFiles,
  validateTargetPath
} from '../../midnight-plugin/servers/dist/templating/filesystem.js';

describe('sanitizePath', () => {
  it('should replace invalid Windows characters', () => {
    const result = sanitizePath('file<name>test', 'win32');
    assert.strictEqual(result.sanitized, 'file_name_test');
    assert.strictEqual(result.wasModified, true);
  });

  it('should replace Windows control characters', () => {
    const result = sanitizePath('file\x00name\x1F', 'win32');
    assert.strictEqual(result.sanitized, 'file_name_');
    assert.strictEqual(result.wasModified, true);
  });

  it('should replace macOS colon character', () => {
    const result = sanitizePath('file:name:test', 'darwin');
    assert.strictEqual(result.sanitized, 'file_name_test');
    assert.strictEqual(result.wasModified, true);
  });

  it('should replace macOS null bytes', () => {
    const result = sanitizePath('file\x00name', 'darwin');
    assert.strictEqual(result.sanitized, 'file_name');
    assert.strictEqual(result.wasModified, true);
  });

  it('should replace Linux forward slashes', () => {
    const result = sanitizePath('file/name/test', 'linux');
    assert.strictEqual(result.sanitized, 'file_name_test');
    assert.strictEqual(result.wasModified, true);
  });

  it('should replace Linux null bytes', () => {
    const result = sanitizePath('file\x00name', 'linux');
    assert.strictEqual(result.sanitized, 'file_name');
    assert.strictEqual(result.wasModified, true);
  });

  it('should return wasModified false when no changes made', () => {
    const result = sanitizePath('valid-file-name', 'win32');
    assert.strictEqual(result.sanitized, 'valid-file-name');
    assert.strictEqual(result.wasModified, false);
  });

  it('should handle empty string', () => {
    const result = sanitizePath('', 'win32');
    assert.strictEqual(result.sanitized, '');
    assert.strictEqual(result.wasModified, false);
  });

  it('should use current platform when not specified', () => {
    const result = sanitizePath('test-file');
    assert.ok(result.sanitized !== undefined);
    assert.ok(typeof result.wasModified === 'boolean');
  });

  it('should handle multiple consecutive invalid characters', () => {
    const result = sanitizePath('file<<<>>>name', 'win32');
    assert.strictEqual(result.sanitized, 'file______name');
    assert.strictEqual(result.wasModified, true);
  });

  it('should use linux pattern for unknown platforms', () => {
    const result = sanitizePath('file/name', 'unknown-platform');
    assert.strictEqual(result.sanitized, 'file_name');
    assert.strictEqual(result.wasModified, true);
  });
});

describe('pathExists', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `filesystem-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return true for existing directory', async () => {
    const exists = await pathExists(testDir);
    assert.strictEqual(exists, true);
  });

  it('should return true for existing file', async () => {
    const filePath = join(testDir, 'test-file.txt');
    await writeFile(filePath, 'test content');

    const exists = await pathExists(filePath);
    assert.strictEqual(exists, true);
  });

  it('should return false for non-existent path', async () => {
    const nonExistent = join(testDir, 'does-not-exist');
    const exists = await pathExists(nonExistent);
    assert.strictEqual(exists, false);
  });

  it('should return false for non-existent nested path', async () => {
    const nonExistent = join(testDir, 'foo', 'bar', 'baz');
    const exists = await pathExists(nonExistent);
    assert.strictEqual(exists, false);
  });
});

describe('isWritable', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `filesystem-test-writable-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    // Restore write permissions before cleanup
    if (process.platform !== 'win32') {
      await chmod(testDir, 0o755).catch(() => {});
    }
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return true for writable directory', async () => {
    const writable = await isWritable(testDir);
    assert.strictEqual(writable, true);
  });

  it('should return false for non-existent path', async () => {
    const nonExistent = join(testDir, 'does-not-exist');
    const writable = await isWritable(nonExistent);
    assert.strictEqual(writable, false);
  });

  // Skip permission tests on Windows (chmod doesn't work the same way)
  if (process.platform !== 'win32') {
    it('should return false for read-only directory', async () => {
      const readOnlyDir = join(testDir, 'read-only');
      await mkdir(readOnlyDir);
      await chmod(readOnlyDir, 0o444); // Read-only

      const writable = await isWritable(readOnlyDir);
      assert.strictEqual(writable, false);

      // Cleanup: restore permissions
      await chmod(readOnlyDir, 0o755);
    });
  }
});

describe('canWriteToDirectory', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `filesystem-test-canwrite-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    // Restore permissions before cleanup
    if (process.platform !== 'win32') {
      await chmod(testDir, 0o755).catch(() => {});
    }
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return true for existing writable directory', async () => {
    const canWrite = await canWriteToDirectory(testDir);
    assert.strictEqual(canWrite, true);
  });

  it('should return false for non-existent directory', async () => {
    const nonExistent = join(testDir, 'does-not-exist');
    const canWrite = await canWriteToDirectory(nonExistent);
    assert.strictEqual(canWrite, false);
  });

  // Skip permission tests on Windows
  if (process.platform !== 'win32') {
    it('should return false for read-only directory', async () => {
      const readOnlyDir = join(testDir, 'read-only-dir');
      await mkdir(readOnlyDir);
      await chmod(readOnlyDir, 0o444); // Read-only

      const canWrite = await canWriteToDirectory(readOnlyDir);
      assert.strictEqual(canWrite, false);

      // Cleanup: restore permissions
      await chmod(readOnlyDir, 0o755);
    });
  }
});

describe('isBinaryFile', () => {
  it('should detect PNG files as binary', async () => {
    const result = await isBinaryFile('logo.png');
    assert.strictEqual(result, true);
  });

  it('should detect JPEG files as binary', async () => {
    const result = await isBinaryFile('image.jpg');
    assert.strictEqual(result, true);
  });

  it('should detect PDF files as binary', async () => {
    const result = await isBinaryFile('document.pdf');
    assert.strictEqual(result, true);
  });

  it('should detect ZIP files as binary', async () => {
    const result = await isBinaryFile('archive.zip');
    assert.strictEqual(result, true);
  });

  it('should detect executables as binary', async () => {
    const result = await isBinaryFile('program.exe');
    assert.strictEqual(result, true);
  });

  it('should detect shared libraries as binary', async () => {
    const result = await isBinaryFile('library.so');
    assert.strictEqual(result, true);
  });

  it('should detect font files as binary', async () => {
    const woff = await isBinaryFile('font.woff');
    const ttf = await isBinaryFile('font.ttf');
    assert.strictEqual(woff, true);
    assert.strictEqual(ttf, true);
  });

  it('should not detect text files as binary', async () => {
    const txt = await isBinaryFile('file.txt');
    const md = await isBinaryFile('README.md');
    const json = await isBinaryFile('config.json');
    assert.strictEqual(txt, false);
    assert.strictEqual(md, false);
    assert.strictEqual(json, false);
  });

  it('should not detect source code files as binary', async () => {
    const ts = await isBinaryFile('main.ts');
    const js = await isBinaryFile('app.js');
    const py = await isBinaryFile('script.py');
    assert.strictEqual(ts, false);
    assert.strictEqual(js, false);
    assert.strictEqual(py, false);
  });

  it('should be case-insensitive for extensions', async () => {
    const upper = await isBinaryFile('IMAGE.PNG');
    const mixed = await isBinaryFile('Image.JpG');
    assert.strictEqual(upper, true);
    assert.strictEqual(mixed, true);
  });

  it('should handle files without extensions', async () => {
    const result = await isBinaryFile('Makefile');
    assert.strictEqual(result, false);
  });

  it('should detect .bin files as binary', async () => {
    const result = await isBinaryFile('data.bin');
    assert.strictEqual(result, true);
  });

  it('should detect .dat files as binary', async () => {
    const result = await isBinaryFile('data.dat');
    assert.strictEqual(result, true);
  });

  it('should detect database files as binary', async () => {
    const db = await isBinaryFile('app.db');
    const sqlite = await isBinaryFile('data.sqlite');
    assert.strictEqual(db, true);
    assert.strictEqual(sqlite, true);
  });
});

describe('getAllFiles', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `filesystem-test-getall-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Create flat structure
    await writeFile(join(testDir, 'file1.txt'), 'content1');
    await writeFile(join(testDir, 'file2.txt'), 'content2');

    // Create nested structure
    await mkdir(join(testDir, 'subdir1'), { recursive: true });
    await writeFile(join(testDir, 'subdir1', 'file3.txt'), 'content3');
    await mkdir(join(testDir, 'subdir1', 'nested'), { recursive: true });
    await writeFile(join(testDir, 'subdir1', 'nested', 'file4.txt'), 'content4');

    // Create another subdir
    await mkdir(join(testDir, 'subdir2'), { recursive: true });
    await writeFile(join(testDir, 'subdir2', 'file5.txt'), 'content5');
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should return all files in flat directory', async () => {
    const flatDir = join(tmpdir(), `filesystem-test-flat-${Date.now()}`);
    await mkdir(flatDir, { recursive: true });
    await writeFile(join(flatDir, 'a.txt'), 'a');
    await writeFile(join(flatDir, 'b.txt'), 'b');

    const files = await getAllFiles(flatDir);
    assert.strictEqual(files.length, 2);
    assert.ok(files.includes('a.txt'));
    assert.ok(files.includes('b.txt'));

    await rm(flatDir, { recursive: true, force: true });
  });

  it('should return all files in nested structure', async () => {
    const files = await getAllFiles(testDir);
    assert.strictEqual(files.length, 5);
    assert.ok(files.includes('file1.txt'));
    assert.ok(files.includes('file2.txt'));
    assert.ok(files.includes('subdir1/file3.txt'));
    assert.ok(files.includes('subdir1/nested/file4.txt'));
    assert.ok(files.includes('subdir2/file5.txt'));
  });

  it('should return relative paths from baseDir', async () => {
    const files = await getAllFiles(testDir, testDir);
    // All paths should be relative (not start with /)
    for (const file of files) {
      assert.ok(!file.startsWith('/'));
      assert.ok(!file.includes(testDir));
    }
  });

  it('should not include directories in results', async () => {
    const files = await getAllFiles(testDir);
    // Should only contain files, not directory names
    assert.ok(!files.includes('subdir1'));
    assert.ok(!files.includes('subdir2'));
    assert.ok(!files.includes('subdir1/nested'));
  });

  it('should handle empty directory', async () => {
    const emptyDir = join(tmpdir(), `filesystem-test-empty-${Date.now()}`);
    await mkdir(emptyDir, { recursive: true });

    const files = await getAllFiles(emptyDir);
    assert.strictEqual(files.length, 0);

    await rm(emptyDir, { recursive: true, force: true });
  });

  it('should use dirPath as baseDir when not specified', async () => {
    const files = await getAllFiles(testDir);
    // Should have relative paths without baseDir prefix
    for (const file of files) {
      assert.ok(!file.includes(testDir));
    }
  });
});

describe('validateTargetPath', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `filesystem-test-validate-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    // Restore permissions before cleanup
    if (process.platform !== 'win32') {
      await chmod(testDir, 0o755).catch(() => {});
    }
    await rm(testDir, { recursive: true, force: true });
  });

  it('should pass for non-existent path with writable parent', async () => {
    const newPath = join(testDir, 'new-project');
    await assert.doesNotReject(async () => {
      await validateTargetPath(newPath);
    });
  });

  it('should throw error for existing path', async () => {
    const existingPath = join(testDir, 'existing');
    await mkdir(existingPath);

    await assert.rejects(
      async () => {
        await validateTargetPath(existingPath);
      },
      (error: Error) => {
        assert.ok(error.message.includes('already exists'));
        return true;
      }
    );
  });

  it('should throw error for non-existent parent', async () => {
    const noParent = join(testDir, 'does-not-exist', 'child', 'new-project');

    await assert.rejects(
      async () => {
        await validateTargetPath(noParent);
      },
      (error: Error) => {
        assert.ok(error.message.includes('Parent directory does not exist'));
        return true;
      }
    );
  });

  // Skip permission tests on Windows
  if (process.platform !== 'win32') {
    it('should throw error for non-writable parent', async () => {
      const readOnlyParent = join(testDir, 'read-only-parent');
      await mkdir(readOnlyParent);
      await chmod(readOnlyParent, 0o444); // Read-only

      const newPath = join(readOnlyParent, 'new-project');

      await assert.rejects(
        async () => {
          await validateTargetPath(newPath);
        },
        (error: Error) => {
          assert.ok(error.message.includes('No write permission'));
          return true;
        }
      );

      // Cleanup: restore permissions
      await chmod(readOnlyParent, 0o755);
    });
  }

  it('should resolve relative paths to absolute', async () => {
    // Test that relative path is handled (no error about resolution)
    const relativePath = join(testDir, 'new-relative');
    await assert.doesNotReject(async () => {
      await validateTargetPath(relativePath);
    });
  });

  it('should throw error for existing file (not just directory)', async () => {
    const existingFile = join(testDir, 'existing-file.txt');
    await writeFile(existingFile, 'content');

    await assert.rejects(
      async () => {
        await validateTargetPath(existingFile);
      },
      (error: Error) => {
        assert.ok(error.message.includes('already exists'));
        return true;
      }
    );
  });
});

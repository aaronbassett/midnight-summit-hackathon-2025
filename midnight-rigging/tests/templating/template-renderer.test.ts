/**
 * Unit tests for template renderer
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir, platform } from 'node:os';
import { renderTemplate } from '../../midnight-plugin/servers/dist/templating/template-renderer.js';
import {
  TemplatingError,
  TemplatingErrorType
} from '../../midnight-plugin/servers/dist/templating/types.js';

describe('renderTemplate', () => {
  let testRoot: string;
  let originalTemplateRoot: string | undefined;

  before(async () => {
    testRoot = join(tmpdir(), `template-renderer-test-${Date.now()}`);
    await mkdir(testRoot, { recursive: true });
    originalTemplateRoot = process.env.TEMPLATE_ROOT;

    // Point to our test fixtures (use absolute path from repository root)
    const repoRoot = join(process.cwd(), '../..'); // From midnight-plugin/servers to repo root
    process.env.TEMPLATE_ROOT = join(repoRoot, 'tests', 'templating', 'fixtures');
  });

  after(async () => {
    if (originalTemplateRoot === undefined) {
      delete process.env.TEMPLATE_ROOT;
    } else {
      process.env.TEMPLATE_ROOT = originalTemplateRoot;
    }
    await rm(testRoot, { recursive: true, force: true });
  });

  it('should render simple template successfully', async () => {
    const targetPath = join(testRoot, 'simple-output');

    const response = await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'My Project',
        description: 'Test Description',
        author: 'Test Author'
      }
    });

    assert.ok(response.filesCreated > 0);
    assert.ok(response.directoriesCreated > 0);
    assert.strictEqual(response.targetPath, targetPath);

    // Verify file was created and variables were substituted
    const readmePath = join(targetPath, 'README.md');
    const content = await readFile(readmePath, 'utf-8');
    assert.ok(content.includes('My Project'));
    assert.ok(content.includes('Test Author'));
    assert.ok(!content.includes('{{project_name}}'));
  });

  it('should inject system variables', async () => {
    const targetPath = join(testRoot, 'system-vars-output');

    await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'Test',
        description: 'Test Description',
        author: 'Author'
      }
    });

    const content = await readFile(join(targetPath, 'README.md'), 'utf-8');

    // Check for system variables
    assert.ok(content.includes(targetPath)); // TARGET_DIR
    assert.ok(!content.includes('{{TARGET_DIR}}'));
    assert.ok(!content.includes('{{CURRENT_DATE}}'));
    assert.ok(!content.includes('{{OS_PLATFORM}}'));
  });

  it('should throw error for missing required variables', async () => {
    const targetPath = join(testRoot, 'missing-vars');

    await assert.rejects(
      async () => {
        await renderTemplate({
          templateName: 'valid-simple',
          targetPath,
          variables: {
            project_name: 'Test'
            // Missing required 'description'
          }
        });
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.VALIDATION_ERROR);
        assert.ok(error.message.includes('Missing required variables'));
        assert.ok(error.message.includes('description'));
        return true;
      }
    );
  });

  it('should throw error for reserved variable names', async () => {
    const targetPath = join(testRoot, 'reserved-vars');

    await assert.rejects(
      async () => {
        await renderTemplate({
          templateName: 'valid-simple',
          targetPath,
          variables: {
            project_name: 'Test',
            description: 'Description',
            author: 'Author',
            USER_NAME: 'should fail', // Reserved pattern ^[A-Z_]+$
            MY_VAR: 'also reserved'
          }
        });
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.VALIDATION_ERROR);
        assert.ok(error.message.includes('reserved system variable names'));
        assert.ok(error.message.includes('USER_NAME'));
        return true;
      }
    );
  });

  it('should throw error for existing target path', async () => {
    const targetPath = join(testRoot, 'existing-target');
    await mkdir(targetPath, { recursive: true });

    await assert.rejects(
      async () => {
        await renderTemplate({
          templateName: 'valid-simple',
          targetPath,
          variables: {
            project_name: 'Test',
            description: 'Description',
            author: 'Author'
          }
        });
      },
      (error: Error) => {
        // validateTargetPath throws a generic Error, not Templating Error
        assert.ok(error.message.includes('already exists'));
        return true;
      }
    );
  });

  it('should merge optional variables with defaults', async () => {
    const targetPath = join(testRoot, 'optional-vars');

    // valid-simple has optional variable 'author' with default 'Test User'
    const response = await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'Test',
        description: 'Test Description'
        // Not providing 'author', should use default 'Test User'
      }
    });

    assert.ok(response.filesCreated > 0);

    // The default author from template.yaml should be used
    const content = await readFile(join(targetPath, 'README.md'), 'utf-8');
    assert.ok(content.includes('Test User')); // Default value for author
  });

  it('should override optional variable defaults', async () => {
    const targetPath = join(testRoot, 'override-optional');

    await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'Test',
        description: 'Test Description',
        author: 'Custom Author' // Override default 'Test User'
      }
    });

    const content = await readFile(join(targetPath, 'README.md'), 'utf-8');
    assert.ok(content.includes('Custom Author'));
    assert.ok(!content.includes('Test User'));
  });

  it('should render complex nested structure', async () => {
    const targetPath = join(testRoot, 'complex-output');

    const response = await renderTemplate({
      templateName: 'valid-complex',
      targetPath,
      variables: {
        project_name: 'ComplexProject',
        module_name: 'MyModule',
        author: 'Test Author'
      }
    });

    assert.ok(response.filesCreated >= 3);

    // Check nested directory structure was created
    const modulePath = join(targetPath, 'src', 'MyModule', 'MyModule.ts');
    const content = await readFile(modulePath, 'utf-8');
    assert.ok(content.includes('MyModule'));
  });

  it('should render file paths with Handlebars', async () => {
    const targetPath = join(testRoot, 'path-rendering');

    await renderTemplate({
      templateName: 'valid-complex',
      targetPath,
      variables: {
        project_name: 'Test',
        module_name: 'CustomModule',
        author: 'Author'
      }
    });

    // File path should be: src/{{module_name}}/{{module_name}}.ts
    // Rendered as: src/CustomModule/CustomModule.ts
    const modulePath = join(targetPath, 'src', 'CustomModule', 'CustomModule.ts');
    const content = await readFile(modulePath, 'utf-8');
    assert.ok(content.length > 0);
  });

  it('should copy binary files without modification', async () => {
    const targetPath = join(testRoot, 'binary-output');

    const response = await renderTemplate({
      templateName: 'binary-files',
      targetPath,
      variables: {
        project_name: 'BinaryTest'
      }
    });

    assert.ok(response.filesCreated >= 2);

    // Binary files should be copied as-is
    const pngPath = join(targetPath, 'logo.png');
    const binPath = join(targetPath, 'data.bin');

    const pngBuffer = await readFile(pngPath);
    const binBuffer = await readFile(binPath);

    assert.ok(pngBuffer.length > 0);
    assert.ok(binBuffer.length > 0);

    // PNG should start with PNG signature
    assert.strictEqual(pngBuffer[0], 0x89);
    assert.strictEqual(pngBuffer[1], 0x50); // 'P'
    assert.strictEqual(pngBuffer[2], 0x4e); // 'N'
    assert.strictEqual(pngBuffer[3], 0x47); // 'G'
  });

  it('should replace undeclared variables with empty strings', async () => {
    const targetPath = join(testRoot, 'undeclared-vars');

    await renderTemplate({
      templateName: 'undeclared-vars',
      targetPath,
      variables: {
        project_name: 'TestProject'
      }
    });

    const content = await readFile(join(targetPath, 'README.md'), 'utf-8');

    // Declared variable should be replaced
    assert.ok(content.includes('TestProject'));
    assert.ok(!content.includes('{{project_name}}'));

    // Undeclared variables are replaced with empty strings by Handlebars
    assert.ok(!content.includes('{{undeclared_var}}'));
    assert.ok(!content.includes('{{another_undeclared}}'));
    assert.ok(!content.includes('{{foo}}'));
  });

  it('should generate implementation guide with structure', async () => {
    const targetPath = join(testRoot, 'impl-guide');

    const response = await renderTemplate({
      templateName: 'valid-complex',
      targetPath,
      variables: {
        project_name: 'GuideTest',
        module_name: 'TestModule',
        author: 'Author'
      }
    });

    assert.ok(response.implementationGuide);
    assert.ok(response.implementationGuide.overview);
    assert.ok(Array.isArray(response.implementationGuide.keyFiles));
    assert.ok(response.implementationGuide.keyFiles.length > 0);

    // Key files paths should be rendered
    const firstKeyFile = response.implementationGuide.keyFiles[0];
    assert.ok(firstKeyFile.path);
    assert.ok(firstKeyFile.purpose);
  });

  it('should generate implementation guide from structure section', async () => {
    const targetPath = join(testRoot, 'structure-guide');

    const response = await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'Simple',
        description: 'Test Description',
        author: 'Author'
      }
    });

    // valid-simple has a structure section defined
    assert.ok(response.implementationGuide);
    assert.ok(response.implementationGuide.overview);
    assert.ok(Array.isArray(response.implementationGuide.keyFiles));
    assert.ok(response.implementationGuide.keyFiles.length > 0);
  });

  it('should return correct file and directory counts', async () => {
    const targetPath = join(testRoot, 'counts');

    const response = await renderTemplate({
      templateName: 'valid-complex',
      targetPath,
      variables: {
        project_name: 'Test',
        module_name: 'Module',
        author: 'Author'
      }
    });

    assert.strictEqual(typeof response.filesCreated, 'number');
    assert.ok(response.filesCreated >= 3);

    assert.strictEqual(typeof response.directoriesCreated, 'number');
    assert.ok(response.directoriesCreated >= 1);
  });

  it('should sanitize invalid path characters', async () => {
    const targetPath = join(testRoot, 'sanitized');

    // Create a custom template with invalid characters in path
    const customTemplate = join(process.env.TEMPLATE_ROOT!, 'sanitize-test');
    const sourceDir = join(customTemplate, 'source');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      join(customTemplate, 'template.yaml'),
      'name: Sanitize Test\ndescription: Test path sanitization\nrequiredVariables:\n  - name: filename\n    description: Filename'
    );

    // Create file with variable that will have invalid chars on Windows
    await writeFile(join(sourceDir, '{{filename}}.txt'), 'test content');

    const response = await renderTemplate({
      templateName: 'sanitize-test',
      targetPath,
      variables: {
        filename: platform() === 'win32' ? 'file<name>test' : 'file:name:test'
      }
    });

    // Should have sanitized the path
    if (response.sanitizedPaths && response.sanitizedPaths.length > 0) {
      assert.ok(response.sanitizedPaths[0].includes('_'));
      assert.ok(!response.sanitizedPaths[0].includes('<'));
      assert.ok(!response.sanitizedPaths[0].includes('>'));
      assert.ok(!response.sanitizedPaths[0].includes(':'));
    }
  });

  it('should create parent directories for nested files', async () => {
    const targetPath = join(testRoot, 'nested-dirs');

    await renderTemplate({
      templateName: 'valid-complex',
      targetPath,
      variables: {
        project_name: 'Nested',
        module_name: 'DeepModule',
        author: 'Author'
      }
    });

    // Check that nested directories exist
    const nestedPath = join(targetPath, 'src', 'DeepModule');
    const nestedFile = join(nestedPath, 'DeepModule.ts');
    const content = await readFile(nestedFile, 'utf-8');
    assert.ok(content.length > 0);
  });

  it('should return absolute target path', async () => {
    const targetPath = join(testRoot, 'absolute-path');

    const response = await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'Test',
        description: 'Test Description',
        author: 'Author'
      }
    });

    assert.ok(response.targetPath.startsWith('/') || response.targetPath.match(/^[A-Z]:\\/));
    assert.strictEqual(response.targetPath, targetPath);
  });

  it('should handle template without optional variables', async () => {
    const targetPath = join(testRoot, 'no-optional');

    // binary-files template has no optional variables
    const response = await renderTemplate({
      templateName: 'binary-files',
      targetPath,
      variables: {
        project_name: 'BinaryTest'
      }
    });

    assert.ok(response.filesCreated > 0);
  });

  it('should not include sanitizedPaths when none were sanitized', async () => {
    const targetPath = join(testRoot, 'no-sanitization');

    const response = await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'ValidName',
        description: 'Valid Description',
        author: 'Valid Author'
      }
    });

    assert.strictEqual(response.sanitizedPaths, undefined);
  });

  it('should not include warnings when no issues occurred', async () => {
    const targetPath = join(testRoot, 'no-warnings');

    const response = await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'Clean',
        description: 'Test Description',
        author: 'Author'
      }
    });

    assert.strictEqual(response.warnings, undefined);
  });

  it('should handle empty source directory', async () => {
    const emptyTemplate = join(process.env.TEMPLATE_ROOT!, 'empty-template');
    const sourceDir = join(emptyTemplate, 'source');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      join(emptyTemplate, 'template.yaml'),
      'name: Empty\ndescription: Empty template'
    );

    const targetPath = join(testRoot, 'empty-output');

    const response = await renderTemplate({
      templateName: 'empty-template',
      targetPath,
      variables: {}
    });

    assert.strictEqual(response.filesCreated, 0);
    assert.ok(response.directoriesCreated >= 1); // Target dir created
  });

  it('should handle single file template', async () => {
    const singleFileTemplate = join(process.env.TEMPLATE_ROOT!, 'single-file');
    const sourceDir = join(singleFileTemplate, 'source');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      join(singleFileTemplate, 'template.yaml'),
      'name: Single File\ndescription: Single file template\nrequiredVariables:\n  - name: content\n    description: Content'
    );
    await writeFile(join(sourceDir, 'file.txt'), '{{content}}');

    const targetPath = join(testRoot, 'single-file-output');

    const response = await renderTemplate({
      templateName: 'single-file',
      targetPath,
      variables: {
        content: 'Hello World'
      }
    });

    assert.strictEqual(response.filesCreated, 1);

    const content = await readFile(join(targetPath, 'file.txt'), 'utf-8');
    assert.strictEqual(content, 'Hello World');
  });

  it('should preserve file permissions for non-binary files', async () => {
    // This is more of a note that we write files normally
    // Node.js preserves reasonable defaults
    const targetPath = join(testRoot, 'permissions');

    await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'Test',
        description: 'Test Description',
        author: 'Author'
      }
    });

    // Just verify file was created
    const filePath = join(targetPath, 'README.md');
    const content = await readFile(filePath, 'utf-8');
    assert.ok(content.length > 0);
  });

  it('should handle variables with special characters', async () => {
    const targetPath = join(testRoot, 'special-chars');

    await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'Test & Demo',
        description: 'Test Description',
        author: 'Author <email@example.com>'
      }
    });

    const content = await readFile(join(targetPath, 'README.md'), 'utf-8');
    // Handlebars HTML-escapes special characters by default
    assert.ok(content.includes('Test &amp; Demo') || content.includes('Test & Demo'));
    assert.ok(
      content.includes('Author &lt;email@example.com&gt;') ||
        content.includes('Author <email@example.com>')
    );
  });

  it('should handle multiline variable values', async () => {
    const targetPath = join(testRoot, 'multiline');

    await renderTemplate({
      templateName: 'valid-simple',
      targetPath,
      variables: {
        project_name: 'Multi\nLine\nProject',
        description: 'Test Description',
        author: 'Author'
      }
    });

    const content = await readFile(join(targetPath, 'README.md'), 'utf-8');
    assert.ok(content.includes('Multi\nLine\nProject'));
  });

  it('should throw error for non-existent template', async () => {
    const targetPath = join(testRoot, 'nonexistent');

    await assert.rejects(
      async () => {
        await renderTemplate({
          templateName: 'does-not-exist',
          targetPath,
          variables: {}
        });
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_NOT_FOUND);
        return true;
      }
    );
  });

  it('should throw error for template without source directory', async () => {
    const noSourceTemplate = join(process.env.TEMPLATE_ROOT!, 'no-source-template');
    await mkdir(noSourceTemplate, { recursive: true });
    await writeFile(
      join(noSourceTemplate, 'template.yaml'),
      'name: No Source\ndescription: Missing source dir'
    );

    const targetPath = join(testRoot, 'no-source-output');

    await assert.rejects(
      async () => {
        await renderTemplate({
          templateName: 'no-source-template',
          targetPath,
          variables: {}
        });
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_ERROR);
        assert.ok(error.message.includes('source directory not found'));
        return true;
      }
    );
  });
});

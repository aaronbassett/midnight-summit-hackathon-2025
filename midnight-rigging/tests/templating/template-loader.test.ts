/**
 * Unit tests for template loader
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getTemplatesRoot,
  discoverTemplates,
  loadTemplateMetadata,
  getTemplateDetails,
  getTemplateSourceDir
} from '../../midnight-plugin/servers/dist/templating/template-loader.js';
import {
  TemplatingError,
  TemplatingErrorType
} from '../../midnight-plugin/servers/dist/templating/types.js';

describe('getTemplatesRoot', () => {
  let originalTemplateRoot: string | undefined;

  before(() => {
    originalTemplateRoot = process.env.TEMPLATE_ROOT;
  });

  after(() => {
    if (originalTemplateRoot === undefined) {
      delete process.env.TEMPLATE_ROOT;
    } else {
      process.env.TEMPLATE_ROOT = originalTemplateRoot;
    }
  });

  it('should return default bundled templates directory', () => {
    delete process.env.TEMPLATE_ROOT;
    const root = getTemplatesRoot();
    assert.ok(root.endsWith('templating/templates'));
  });

  it('should use TEMPLATE_ROOT environment variable when set', () => {
    const customRoot = '/custom/templates/path';
    process.env.TEMPLATE_ROOT = customRoot;
    const root = getTemplatesRoot();
    assert.strictEqual(root, customRoot);
  });

  it('should prefer environment variable over default', () => {
    const customRoot = '/env/override/path';
    process.env.TEMPLATE_ROOT = customRoot;
    const root = getTemplatesRoot();
    assert.strictEqual(root, customRoot);
    assert.ok(!root.includes('templating/templates'));
  });
});

describe('discoverTemplates', () => {
  let testRoot: string;
  let originalTemplateRoot: string | undefined;

  before(async () => {
    testRoot = join(tmpdir(), `template-loader-test-${Date.now()}`);
    await mkdir(testRoot, { recursive: true });
    originalTemplateRoot = process.env.TEMPLATE_ROOT;
    process.env.TEMPLATE_ROOT = testRoot;
  });

  after(async () => {
    if (originalTemplateRoot === undefined) {
      delete process.env.TEMPLATE_ROOT;
    } else {
      process.env.TEMPLATE_ROOT = originalTemplateRoot;
    }
    await rm(testRoot, { recursive: true, force: true });
  });

  it('should discover valid templates', async () => {
    // Create two valid templates
    const template1 = join(testRoot, 'template1');
    const template2 = join(testRoot, 'template2');
    await mkdir(template1, { recursive: true });
    await mkdir(template2, { recursive: true });
    await writeFile(
      join(template1, 'template.yaml'),
      'name: Template 1\ndescription: First template'
    );
    await writeFile(
      join(template2, 'template.yaml'),
      'name: Template 2\ndescription: Second template'
    );

    const templates = await discoverTemplates();
    assert.strictEqual(templates.length, 2);
    assert.ok(templates.some(t => t.name === 'template1'));
    assert.ok(templates.some(t => t.name === 'template2'));
  });

  it('should sort templates alphabetically', async () => {
    // Create templates in non-alphabetical order
    const templateZ = join(testRoot, 'zzz-template');
    const templateA = join(testRoot, 'aaa-template');
    await mkdir(templateZ, { recursive: true });
    await mkdir(templateA, { recursive: true });
    await writeFile(join(templateZ, 'template.yaml'), 'name: Z Template\ndescription: Last');
    await writeFile(join(templateA, 'template.yaml'), 'name: A Template\ndescription: First');

    const templates = await discoverTemplates();
    assert.ok(templates.length >= 2);
    const aaaIndex = templates.findIndex(t => t.name === 'aaa-template');
    const zzzIndex = templates.findIndex(t => t.name === 'zzz-template');
    assert.ok(aaaIndex < zzzIndex);
  });

  it('should include templates with errors', async () => {
    const brokenTemplate = join(testRoot, 'broken-template');
    await mkdir(brokenTemplate, { recursive: true });
    await writeFile(
      join(brokenTemplate, 'template.yaml'),
      'name: "Broken\ndescription: Invalid YAML'
    );

    const templates = await discoverTemplates();
    const broken = templates.find(t => t.name === 'broken-template');
    assert.ok(broken);
    assert.strictEqual(broken.hasError, true);
    assert.strictEqual(broken.description, 'This template has configuration errors');
  });

  it('should mark templates with missing required fields as errors', async () => {
    const invalidTemplate = join(testRoot, 'invalid-template');
    await mkdir(invalidTemplate, { recursive: true });
    await writeFile(
      join(invalidTemplate, 'template.yaml'),
      'name: Only Name' // Missing description
    );

    const templates = await discoverTemplates();
    const invalid = templates.find(t => t.name === 'invalid-template');
    assert.ok(invalid);
    assert.strictEqual(invalid.hasError, true);
  });

  it('should throw error for non-existent templates directory', async () => {
    const savedRoot = process.env.TEMPLATE_ROOT;
    process.env.TEMPLATE_ROOT = '/path/that/does/not/exist';

    await assert.rejects(
      async () => {
        await discoverTemplates();
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_DIR_NOT_FOUND);
        assert.ok(error.message.includes('Templates directory not found'));
        return true;
      }
    );

    // Restore environment variable
    process.env.TEMPLATE_ROOT = savedRoot;
  });

  it('should ignore non-directory entries', async () => {
    // Create a file in templates root (should be ignored)
    await writeFile(join(testRoot, 'not-a-template.txt'), 'random file');

    const templates = await discoverTemplates();
    assert.ok(!templates.some(t => t.name === 'not-a-template.txt'));
  });

  it('should return template list entries with correct structure', async () => {
    const template = join(testRoot, 'structure-test');
    await mkdir(template, { recursive: true });
    await writeFile(
      join(template, 'template.yaml'),
      'name: Structure Test\ndescription: Testing structure'
    );

    const templates = await discoverTemplates();
    const found = templates.find(t => t.name === 'structure-test');
    assert.ok(found);
    assert.strictEqual(typeof found.name, 'string');
    assert.strictEqual(typeof found.description, 'string');
    assert.strictEqual(typeof found.hasError, 'boolean');
    assert.strictEqual(found.hasError, false);
  });
});

describe('loadTemplateMetadata', () => {
  let testDir: string;

  before(async () => {
    testDir = join(tmpdir(), `loader-metadata-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  after(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should load valid template metadata', async () => {
    const yamlPath = join(testDir, 'valid.yaml');
    await writeFile(
      yamlPath,
      'name: Valid Template\ndescription: A valid template\nversion: 1.0.0'
    );

    const metadata = await loadTemplateMetadata(yamlPath);
    assert.strictEqual(metadata.name, 'Valid Template');
    assert.strictEqual(metadata.description, 'A valid template');
    assert.strictEqual(metadata.version, '1.0.0');
  });

  it('should load template with required variables', async () => {
    const yamlPath = join(testDir, 'with-vars.yaml');
    await writeFile(
      yamlPath,
      'name: Template\ndescription: Description\nrequiredVariables:\n  - name: var1\n    description: Variable 1'
    );

    const metadata = await loadTemplateMetadata(yamlPath);
    assert.strictEqual(metadata.requiredVariables.length, 1);
    assert.strictEqual(metadata.requiredVariables[0].name, 'var1');
  });

  it('should load template with optional variables', async () => {
    const yamlPath = join(testDir, 'with-optional.yaml');
    await writeFile(
      yamlPath,
      'name: Template\ndescription: Description\noptionalVariables:\n  - name: opt1\n    description: Optional 1\n    default: "default"'
    );

    const metadata = await loadTemplateMetadata(yamlPath);
    assert.ok(metadata.optionalVariables);
    assert.strictEqual(metadata.optionalVariables.length, 1);
    assert.strictEqual(metadata.optionalVariables[0].name, 'opt1');
    assert.strictEqual(metadata.optionalVariables[0].default, 'default');
  });

  it('should throw error for non-existent file', async () => {
    const nonExistent = join(testDir, 'does-not-exist.yaml');

    await assert.rejects(
      async () => {
        await loadTemplateMetadata(nonExistent);
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_ERROR);
        assert.ok(error.message.includes('template.yaml not found'));
        return true;
      }
    );
  });

  it('should throw error for malformed YAML', async () => {
    const malformedPath = join(testDir, 'malformed.yaml');
    await writeFile(malformedPath, 'name: "Unclosed quote\ndescription: Invalid');

    await assert.rejects(
      async () => {
        await loadTemplateMetadata(malformedPath);
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_ERROR);
        assert.ok(error.message.includes('Failed to parse template.yaml'));
        return true;
      }
    );
  });

  it('should throw error for invalid schema (missing name)', async () => {
    const invalidPath = join(testDir, 'invalid-no-name.yaml');
    await writeFile(invalidPath, 'description: Missing name field');

    await assert.rejects(
      async () => {
        await loadTemplateMetadata(invalidPath);
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_ERROR);
        assert.ok(error.message.includes('Invalid template.yaml'));
        return true;
      }
    );
  });

  it('should throw error for invalid schema (missing description)', async () => {
    const invalidPath = join(testDir, 'invalid-no-desc.yaml');
    await writeFile(invalidPath, 'name: Missing Description');

    await assert.rejects(
      async () => {
        await loadTemplateMetadata(invalidPath);
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_ERROR);
        assert.ok(error.message.includes('Invalid template.yaml'));
        return true;
      }
    );
  });

  it('should parse all optional metadata fields', async () => {
    const yamlPath = join(testDir, 'full-metadata.yaml');
    await writeFile(
      yamlPath,
      `name: Full Template
description: Complete metadata
version: 2.0.0
author: Test Author
license: MIT
homepage: https://example.com
keywords:
  - test
  - template`
    );

    const metadata = await loadTemplateMetadata(yamlPath);
    assert.strictEqual(metadata.version, '2.0.0');
    assert.strictEqual(metadata.author, 'Test Author');
    assert.strictEqual(metadata.license, 'MIT');
    assert.strictEqual(metadata.homepage, 'https://example.com');
    assert.ok(metadata.keywords);
    assert.strictEqual(metadata.keywords.length, 2);
  });
});

describe('getTemplateDetails', () => {
  let testRoot: string;
  let originalTemplateRoot: string | undefined;

  before(async () => {
    testRoot = join(tmpdir(), `template-details-test-${Date.now()}`);
    await mkdir(testRoot, { recursive: true });
    originalTemplateRoot = process.env.TEMPLATE_ROOT;
    process.env.TEMPLATE_ROOT = testRoot;
  });

  after(async () => {
    if (originalTemplateRoot === undefined) {
      delete process.env.TEMPLATE_ROOT;
    } else {
      process.env.TEMPLATE_ROOT = originalTemplateRoot;
    }
    await rm(testRoot, { recursive: true, force: true });
  });

  it('should return template details with system variables', async () => {
    const templateDir = join(testRoot, 'test-template');
    await mkdir(templateDir, { recursive: true });
    await writeFile(join(templateDir, 'template.yaml'), 'name: Test\ndescription: Test template');

    const details = await getTemplateDetails('test-template');
    assert.strictEqual(details.name, 'Test');
    assert.strictEqual(details.description, 'Test template');
    assert.ok(Array.isArray(details.systemVariables));
    assert.ok(details.systemVariables.length > 0);
  });

  it('should include all system variables', async () => {
    const templateDir = join(testRoot, 'sys-vars-template');
    await mkdir(templateDir, { recursive: true });
    await writeFile(
      join(templateDir, 'template.yaml'),
      'name: System Vars\ndescription: Testing system variables'
    );

    const details = await getTemplateDetails('sys-vars-template');
    // Check for some known system variables
    assert.ok(details.systemVariables.includes('TARGET_DIR'));
    assert.ok(details.systemVariables.includes('CURRENT_DATE'));
    assert.ok(details.systemVariables.includes('OS_PLATFORM'));
  });

  it('should throw error for non-existent template', async () => {
    await assert.rejects(
      async () => {
        await getTemplateDetails('does-not-exist');
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_NOT_FOUND);
        assert.ok(error.message.includes('Template not found'));
        return true;
      }
    );
  });

  it('should throw generic error for template with errors', async () => {
    const brokenDir = join(testRoot, 'broken-template');
    await mkdir(brokenDir, { recursive: true });
    await writeFile(
      join(brokenDir, 'template.yaml'),
      'name: Broken' // Missing description
    );

    await assert.rejects(
      async () => {
        await getTemplateDetails('broken-template');
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_ERROR);
        assert.strictEqual(error.message, 'This template has errors and cannot be rendered.');
        return true;
      }
    );
  });

  it('should return template with all metadata fields', async () => {
    const templateDir = join(testRoot, 'full-details');
    await mkdir(templateDir, { recursive: true });
    await writeFile(
      join(templateDir, 'template.yaml'),
      `name: Full Details
description: Complete template
version: 1.0.0
author: Author Name
requiredVariables:
  - name: var1
    description: Variable 1
optionalVariables:
  - name: opt1
    description: Optional 1
    default: "value"`
    );

    const details = await getTemplateDetails('full-details');
    assert.strictEqual(details.version, '1.0.0');
    assert.strictEqual(details.author, 'Author Name');
    assert.strictEqual(details.requiredVariables.length, 1);
    assert.ok(details.optionalVariables);
    assert.strictEqual(details.optionalVariables.length, 1);
  });
});

describe('getTemplateSourceDir', () => {
  let testRoot: string;
  let originalTemplateRoot: string | undefined;

  before(async () => {
    testRoot = join(tmpdir(), `template-source-test-${Date.now()}`);
    await mkdir(testRoot, { recursive: true });
    originalTemplateRoot = process.env.TEMPLATE_ROOT;
    process.env.TEMPLATE_ROOT = testRoot;
  });

  after(async () => {
    if (originalTemplateRoot === undefined) {
      delete process.env.TEMPLATE_ROOT;
    } else {
      process.env.TEMPLATE_ROOT = originalTemplateRoot;
    }
    await rm(testRoot, { recursive: true, force: true });
  });

  it('should return source directory path', async () => {
    const templateDir = join(testRoot, 'source-test');
    const sourceDir = join(templateDir, 'source');
    await mkdir(sourceDir, { recursive: true });

    const result = await getTemplateSourceDir('source-test');
    assert.strictEqual(result, sourceDir);
  });

  it('should throw error for non-existent template', async () => {
    await assert.rejects(
      async () => {
        await getTemplateSourceDir('does-not-exist');
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_NOT_FOUND);
        assert.ok(error.message.includes('Template not found'));
        return true;
      }
    );
  });

  it('should throw error for missing source directory', async () => {
    const templateDir = join(testRoot, 'no-source');
    await mkdir(templateDir, { recursive: true });
    // Create template directory but not source subdirectory

    await assert.rejects(
      async () => {
        await getTemplateSourceDir('no-source');
      },
      (error: TemplatingError) => {
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_ERROR);
        assert.ok(error.message.includes('Template source directory not found'));
        return true;
      }
    );
  });

  it('should validate template exists before checking source', async () => {
    // This tests the order of validation
    await assert.rejects(
      async () => {
        await getTemplateSourceDir('completely-missing');
      },
      (error: TemplatingError) => {
        // Should get TEMPLATE_NOT_FOUND, not TEMPLATE_ERROR
        assert.strictEqual(error.type, TemplatingErrorType.TEMPLATE_NOT_FOUND);
        return true;
      }
    );
  });

  it('should return absolute path', async () => {
    const templateDir = join(testRoot, 'absolute-path-test');
    const sourceDir = join(templateDir, 'source');
    await mkdir(sourceDir, { recursive: true });

    const result = await getTemplateSourceDir('absolute-path-test');
    assert.ok(result.startsWith('/') || result.match(/^[A-Z]:\\/)); // Unix or Windows absolute path
  });
});

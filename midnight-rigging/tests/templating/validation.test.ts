/**
 * Unit tests for validation schemas and functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  templateMetadataSchema,
  renderRequestSchema,
  templateDetailsRequestSchema,
  validateReservedVariableNames,
  validateRequiredVariables
} from '../../midnight-plugin/servers/dist/templating/validation.js';

describe('templateMetadataSchema', () => {
  it('should parse valid metadata with all fields', () => {
    const metadata = {
      name: 'Test Template',
      description: 'A test template',
      version: '1.0.0',
      author: 'Test Author',
      license: 'MIT',
      homepage: 'https://example.com',
      documentation: 'https://docs.example.com',
      repository: 'https://github.com/example/repo',
      bugs: 'https://github.com/example/repo/issues',
      keywords: ['test', 'template'],
      longDescription: 'A longer description',
      useCases: ['Testing', 'Development'],
      requiredVariables: [{ name: 'var1', description: 'Variable 1' }],
      optionalVariables: [{ name: 'var2', description: 'Variable 2', default: 'default' }],
      structure: {
        overview: 'Project overview',
        keyFiles: [{ path: 'file.ts', purpose: 'Main file' }],
        commonCustomizations: ['Add feature X'],
        nextSteps: ['Run build']
      },
      exampleStructure: ['file1.ts', 'file2.ts']
    };

    const result = templateMetadataSchema.parse(metadata);
    assert.strictEqual(result.name, 'Test Template');
    assert.strictEqual(result.version, '1.0.0');
    assert.strictEqual(result.requiredVariables.length, 1);
  });

  it('should parse minimal metadata (name and description only)', () => {
    const metadata = {
      name: 'Minimal Template',
      description: 'A minimal template'
    };

    const result = templateMetadataSchema.parse(metadata);
    assert.strictEqual(result.name, 'Minimal Template');
    assert.strictEqual(result.description, 'A minimal template');
    assert.deepStrictEqual(result.requiredVariables, []);
  });

  it('should reject missing name', () => {
    const metadata = {
      description: 'Missing name'
    };

    assert.throws(() => {
      templateMetadataSchema.parse(metadata);
    });
  });

  it('should reject missing description', () => {
    const metadata = {
      name: 'Missing Description'
    };

    assert.throws(() => {
      templateMetadataSchema.parse(metadata);
    });
  });

  it('should accept optional fields', () => {
    const metadata = {
      name: 'Template',
      description: 'Description',
      version: '2.0.0',
      author: 'Author Name'
    };

    const result = templateMetadataSchema.parse(metadata);
    assert.strictEqual(result.version, '2.0.0');
    assert.strictEqual(result.author, 'Author Name');
  });

  it('should validate URL formats', () => {
    const metadata = {
      name: 'Template',
      description: 'Description',
      homepage: 'https://valid.com'
    };

    const result = templateMetadataSchema.parse(metadata);
    assert.strictEqual(result.homepage, 'https://valid.com');
  });

  it('should reject invalid URL formats', () => {
    const metadata = {
      name: 'Template',
      description: 'Description',
      homepage: 'not-a-valid-url'
    };

    assert.throws(() => {
      templateMetadataSchema.parse(metadata);
    });
  });

  it('should validate structure section', () => {
    const metadata = {
      name: 'Template',
      description: 'Description',
      structure: {
        overview: 'Overview text',
        keyFiles: [{ path: 'main.ts', purpose: 'Entry point' }]
      }
    };

    const result = templateMetadataSchema.parse(metadata);
    assert.ok(result.structure);
    assert.strictEqual(result.structure.overview, 'Overview text');
    assert.strictEqual(result.structure.keyFiles.length, 1);
  });

  it('should reject structure with missing overview', () => {
    const metadata = {
      name: 'Template',
      description: 'Description',
      structure: {
        keyFiles: [{ path: 'main.ts', purpose: 'Entry point' }]
      }
    };

    assert.throws(() => {
      templateMetadataSchema.parse(metadata);
    });
  });

  it('should reject structure with empty keyFiles', () => {
    const metadata = {
      name: 'Template',
      description: 'Description',
      structure: {
        overview: 'Overview',
        keyFiles: []
      }
    };

    assert.throws(() => {
      templateMetadataSchema.parse(metadata);
    });
  });

  it('should accept optional commonCustomizations and nextSteps', () => {
    const metadata = {
      name: 'Template',
      description: 'Description',
      structure: {
        overview: 'Overview',
        keyFiles: [{ path: 'file.ts', purpose: 'Purpose' }],
        commonCustomizations: ['Customize A', 'Customize B'],
        nextSteps: ['Step 1', 'Step 2']
      }
    };

    const result = templateMetadataSchema.parse(metadata);
    assert.strictEqual(result.structure!.commonCustomizations!.length, 2);
    assert.strictEqual(result.structure!.nextSteps!.length, 2);
  });
});

describe('renderRequestSchema', () => {
  it('should parse valid request', () => {
    const request = {
      templateName: 'test-template',
      targetPath: '/path/to/target',
      variables: { var1: 'value1', var2: 'value2' }
    };

    const result = renderRequestSchema.parse(request);
    assert.strictEqual(result.templateName, 'test-template');
    assert.strictEqual(result.targetPath, '/path/to/target');
    assert.deepStrictEqual(result.variables, { var1: 'value1', var2: 'value2' });
  });

  it('should reject missing templateName', () => {
    const request = {
      targetPath: '/path/to/target',
      variables: {}
    };

    assert.throws(() => {
      renderRequestSchema.parse(request);
    });
  });

  it('should reject missing targetPath', () => {
    const request = {
      templateName: 'test',
      variables: {}
    };

    assert.throws(() => {
      renderRequestSchema.parse(request);
    });
  });

  it('should reject missing variables', () => {
    const request = {
      templateName: 'test',
      targetPath: '/path'
    };

    assert.throws(() => {
      renderRequestSchema.parse(request);
    });
  });

  it('should accept empty variables object', () => {
    const request = {
      templateName: 'test',
      targetPath: '/path',
      variables: {}
    };

    const result = renderRequestSchema.parse(request);
    assert.deepStrictEqual(result.variables, {});
  });

  it('should validate templateName length (max 100)', () => {
    const longName = 'a'.repeat(101);
    const request = {
      templateName: longName,
      targetPath: '/path',
      variables: {}
    };

    assert.throws(() => {
      renderRequestSchema.parse(request);
    });
  });

  it('should accept templateName at max length (100)', () => {
    const maxName = 'a'.repeat(100);
    const request = {
      templateName: maxName,
      targetPath: '/path',
      variables: {}
    };

    const result = renderRequestSchema.parse(request);
    assert.strictEqual(result.templateName.length, 100);
  });

  it('should reject empty templateName', () => {
    const request = {
      templateName: '',
      targetPath: '/path',
      variables: {}
    };

    assert.throws(() => {
      renderRequestSchema.parse(request);
    });
  });
});

describe('templateDetailsRequestSchema', () => {
  it('should parse valid request', () => {
    const request = {
      templateName: 'test-template'
    };

    const result = templateDetailsRequestSchema.parse(request);
    assert.strictEqual(result.templateName, 'test-template');
  });

  it('should reject missing templateName', () => {
    const request = {};

    assert.throws(() => {
      templateDetailsRequestSchema.parse(request);
    });
  });

  it('should validate templateName length (max 100)', () => {
    const longName = 'a'.repeat(101);
    const request = {
      templateName: longName
    };

    assert.throws(() => {
      templateDetailsRequestSchema.parse(request);
    });
  });

  it('should reject empty templateName', () => {
    const request = {
      templateName: ''
    };

    assert.throws(() => {
      templateDetailsRequestSchema.parse(request);
    });
  });
});

describe('validateReservedVariableNames', () => {
  it('should return empty array for valid names', () => {
    const validNames = ['user_name', 'userName', 'myVar', 'project_name'];
    const result = validateReservedVariableNames(validNames);
    assert.deepStrictEqual(result, []);
  });

  it('should detect all-uppercase names', () => {
    const reservedNames = ['USER_NAME', 'MY_VAR', 'TARGET_DIR'];
    const result = validateReservedVariableNames(reservedNames);
    assert.strictEqual(result.length, 3);
    assert.ok(result.includes('USER_NAME'));
    assert.ok(result.includes('MY_VAR'));
    assert.ok(result.includes('TARGET_DIR'));
  });

  it('should allow mixed case names', () => {
    const mixedNames = ['User_Name', 'My_Var', 'Target_Dir'];
    const result = validateReservedVariableNames(mixedNames);
    assert.deepStrictEqual(result, []);
  });

  it('should detect single uppercase letter', () => {
    const singleLetter = ['A', 'B_C', 'X_Y_Z'];
    const result = validateReservedVariableNames(singleLetter);
    assert.strictEqual(result.length, 3);
  });

  it('should allow lowercase with underscores', () => {
    const validNames = ['user_name', 'my_var', 'target_dir'];
    const result = validateReservedVariableNames(validNames);
    assert.deepStrictEqual(result, []);
  });

  it('should allow camelCase', () => {
    const validNames = ['userName', 'myVar', 'targetDir'];
    const result = validateReservedVariableNames(validNames);
    assert.deepStrictEqual(result, []);
  });

  it('should handle empty array', () => {
    const result = validateReservedVariableNames([]);
    assert.deepStrictEqual(result, []);
  });

  it('should handle mixed valid and reserved names', () => {
    const mixedNames = ['valid_name', 'RESERVED_NAME', 'anotherValid', 'ANOTHER_RESERVED'];
    const result = validateReservedVariableNames(mixedNames);
    assert.strictEqual(result.length, 2);
    assert.ok(result.includes('RESERVED_NAME'));
    assert.ok(result.includes('ANOTHER_RESERVED'));
  });
});

describe('validateRequiredVariables', () => {
  it('should return empty array when all variables provided', () => {
    const required = ['var1', 'var2', 'var3'];
    const provided = { var1: 'value1', var2: 'value2', var3: 'value3' };
    const result = validateRequiredVariables(required, provided);
    assert.deepStrictEqual(result, []);
  });

  it('should detect missing variables', () => {
    const required = ['var1', 'var2', 'var3'];
    const provided = { var1: 'value1' };
    const result = validateRequiredVariables(required, provided);
    assert.strictEqual(result.length, 2);
    assert.ok(result.includes('var2'));
    assert.ok(result.includes('var3'));
  });

  it('should handle empty required array', () => {
    const required: string[] = [];
    const provided = { var1: 'value1' };
    const result = validateRequiredVariables(required, provided);
    assert.deepStrictEqual(result, []);
  });

  it('should handle empty provided object', () => {
    const required = ['var1', 'var2'];
    const provided = {};
    const result = validateRequiredVariables(required, provided);
    assert.strictEqual(result.length, 2);
    assert.ok(result.includes('var1'));
    assert.ok(result.includes('var2'));
  });

  it('should ignore extra provided variables', () => {
    const required = ['var1'];
    const provided = { var1: 'value1', var2: 'value2', var3: 'value3' };
    const result = validateRequiredVariables(required, provided);
    assert.deepStrictEqual(result, []);
  });

  it('should detect single missing variable', () => {
    const required = ['var1', 'var2'];
    const provided = { var1: 'value1' };
    const result = validateRequiredVariables(required, provided);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0], 'var2');
  });

  it('should handle variable with empty string value', () => {
    const required = ['var1'];
    const provided = { var1: '' };
    const result = validateRequiredVariables(required, provided);
    // Empty string is still "provided" - validation passes
    assert.deepStrictEqual(result, []);
  });
});

import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly', // Node.js 18+ global
        AbortController: 'readonly', // Node.js 18+ global
        URL: 'readonly' // Node.js URL global
      }
    },
    rules: {
      // Error on unused vars (blocks merge)
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Error on console.log (use console.error for logging)
      'no-console': ['error', { allow: ['error', 'warn'] }],

      // Code quality rules (errors block merge)
      'no-var': 'error',
      'prefer-const': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 0 }],
      'no-trailing-spaces': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'all'],

      // Best practices
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error'
    }
  },
  // CommonJS files (skill scripts)
  {
    files: ['midnight-plugin/skills/**/scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly'
      }
    }
  },
  {
    ignores: [
      'node_modules/**',
      'midnight-plugin/node_modules/**',
      'midnight-plugin/servers/node_modules/**',
      'rag-mcp/**', // TypeScript workspace - uses own linting if needed
      'dist/**',
      'midnight-plugin/servers/dist/**', // Compiled TypeScript output
      'rigging-mcp/dist/**', // rigging-mcp compiled output
      'build/**',
      'coverage/**',
      '.nyc_output/**',
      'midnight-plugin/data/**',
      '*.min.js',
      'tests/templating/fixtures/**', // Test fixtures (intentionally malformed/template files)
      'midnight-plugin/servers/tests/templating/fixtures/**' // Test fixtures
    ]
  }
];

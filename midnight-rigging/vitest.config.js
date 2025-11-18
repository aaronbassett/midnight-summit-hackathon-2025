import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test file patterns
    include: ['tests/**/*.test.js'],

    // Timeout for each test (10 seconds)
    testTimeout: 10000,

    // Hook timeouts
    hookTimeout: 10000,

    // Run tests sequentially (safer for DB operations)
    sequence: {
      concurrent: false
    },

    // Reporter
    reporters: ['verbose'],

    // Coverage (optional)
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'tests/**', '**/*.test.js', '**/*.spec.js']
    }
  }
});

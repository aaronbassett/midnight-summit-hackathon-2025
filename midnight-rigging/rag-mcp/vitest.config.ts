import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load .env file before running tests
config();

export default defineConfig({
  test: {
    // Test file patterns
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],

    // Environment
    environment: 'node',

    // Timeout for each test (30 seconds for API calls)
    testTimeout: 30000,

    // Hook timeouts
    hookTimeout: 10000,

    // Run tests sequentially (safer for API operations)
    sequence: {
      concurrent: false
    },

    // Reporter
    reporters: ['verbose'],

    // Coverage
    coverage: {
      enabled: false,
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'dist/**', '**/*.test.ts', '**/*.spec.ts']
    },

    // Global setup
    globals: true
  }
});

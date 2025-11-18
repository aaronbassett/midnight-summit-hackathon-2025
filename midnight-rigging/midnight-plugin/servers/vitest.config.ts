import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/midnight-network/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/reranking/**']
  }
});

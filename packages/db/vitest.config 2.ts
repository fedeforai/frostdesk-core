import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest tests in src/; tests/ contains Jest-based tests (not run here).
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});

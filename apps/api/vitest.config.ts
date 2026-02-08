import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/routes/admin/**/*.test.ts', 'src/routes/__tests__/admin_check.test.ts', 'src/loadEnv.test.ts'],
    setupFiles: ['src/vitest.setup.ts'],
    environment: 'node',
  },
});

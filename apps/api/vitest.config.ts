import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/routes/admin/**/*.test.ts', 'src/routes/instructor/**/*.test.ts', 'src/routes/__tests__/admin_check.test.ts', 'src/loadEnv.test.ts', 'src/report_builders/**/*.test.ts', 'src/lib/**/*.test.ts'],
    setupFiles: ['src/vitest.setup.ts'],
    environment: 'node',
  },
});

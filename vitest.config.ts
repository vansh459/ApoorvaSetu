import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/localStorageSetup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/workflow/**/*.ts', 'src/utils/dates.ts', 'src/services/repositories/**/*.ts'],
      reporter: ['text', 'lcov']
    }
  }
});

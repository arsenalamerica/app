import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/components': resolve(__dirname, './src/components/index.ts'),
      '@/data': resolve(__dirname, './data/src/index.ts'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },
  test: {
    // Env comes from varlock, loaded by `import 'varlock/auto-load'` at the top of
    // vitest.setup.ts. Prefer declaring test values in .env.schema over adding a
    // `test.env` block here, so the schema stays the single source of truth and
    // shows up in the generated env.d.ts.
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['.claude/**', 'e2e/**', 'node_modules/**'],
    coverage: {
      enabled: true,
      provider: 'v8',
      exclude: ['node_modules/**', 'e2e/**'],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
});

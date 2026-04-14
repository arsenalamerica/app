import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/components': resolve(__dirname, './src/components'),
      '@/hooks': resolve(__dirname, './src/hooks'),
      '@/lib': resolve(__dirname, './src/lib'),
      '@/types': resolve(__dirname, './src/types'),
    },
  },
  test: {
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

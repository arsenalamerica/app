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
      reporter: ['text', 'cobertura'],
      include: ['src/**/*.{ts,tsx}', 'data/src/**/*.{ts,tsx}'],
      // Excluded beyond non-code assets: pure re-export barrels only.
      // data/src/branches/index.ts stays in scope; it builds the branch maps.
      exclude: [
        'node_modules/**',
        'e2e/**',
        '**/*.module.scss',
        '**/*.json',
        'src/components/index.ts',
        'src/lib/sportmonks/index.ts',
        'src/lib/utils/index.ts',
        'data/src/index.ts',
        'data/src/branches/*/index.ts',
        // Type-only module: no runtime statements for v8 to instrument.
        'data/src/branches/types.ts',
        // Route error boundaries are pure `export default RouteError`
        // re-exports; v8 produces an empty statement map for this shape. If an
        // error.tsx ever gains real logic, remove this and test it.
        'src/app/**/error.tsx',
      ],
      thresholds: {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      },
    },
  },
});

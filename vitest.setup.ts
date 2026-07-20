// Loads and validates .env.schema so `ENV.*` is populated in tests. Without it a
// bare `vitest run` never initializes varlock and every `ENV.*` read silently
// returns undefined. Loading in-process (rather than wrapping the test script in
// `varlock run`) lets varlock auto-detect the `test` environment from NODE_ENV,
// which test runners only set after startup. Must stay first — it has to run
// before any module that reads ENV at import time.
import 'varlock/auto-load';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';

// Fail tests on unexpected console.warn/error. Tests that intentionally trigger
// these (e.g. testing an error branch) must mock console.error/warn explicitly
// within that test, which overrides this global mock for that call.
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    throw new Error(`Unexpected console.warn: ${args.join(' ')}`);
  });
  vi.spyOn(console, 'error').mockImplementation((...args) => {
    throw new Error(`Unexpected console.error: ${args.join(' ')}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

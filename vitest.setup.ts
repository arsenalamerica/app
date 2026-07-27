// Loads and validates .env.schema so `ENV.*` is populated in tests. Without it a
// bare `vitest run` never initializes varlock and every `ENV.*` read silently
// returns undefined, because happy-dom makes varlock take its browser branch and
// initialize with an empty value map. Loading in-process (rather than wrapping the
// test script in `varlock run`) lets varlock auto-detect the `test` environment
// from NODE_ENV/VITEST/VITEST_POOL_ID, which test runners set only after startup.
// Keep this first so it runs before any future import that reads ENV at module
// scope.
import 'varlock/auto-load';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';

// Fail tests on unexpected console.warn/error. Tests that intentionally trigger
// these (e.g. testing an error branch) must mock console.error/warn explicitly
// within that test, which overrides this global mock for that call.
// Fail tests on unmocked network access. happy-dom's CORS policy blocks *reading*
// a cross-origin response but still sends the request, so without this an errant
// test performs real DNS/TCP/TLS to a third-party API. Tests that need fetch mock
// it themselves, which overrides this spy for that test.
//
// Throws synchronously rather than returning a rejected promise: unlike real
// fetch, but a floating `.catch()` cannot quietly swallow it.
// Captured before any spy replaces it, so the `data:` passthrough below reaches
// the real implementation instead of recursing into the spy.
const realFetch = globalThis.fetch;

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    // `data:` URIs resolve in-process with no DNS/TCP/TLS, so they were never
    // in scope for this guard. next/og loads its resvg WASM module and any
    // data-URI <img> source through fetch, so rendering an ImageResponse in a
    // test hits this path.
    if (String(input).startsWith('data:')) return realFetch(input, init);
    throw new Error(`Unmocked network request in test: ${String(input)}`);
  });
});

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

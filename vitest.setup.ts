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

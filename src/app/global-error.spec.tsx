import '@testing-library/react';

import * as Sentry from '@sentry/nextjs';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import GlobalError from './global-error';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('next/error', () => ({
  default: ({ statusCode }: { statusCode: number }) => (
    <p>Error {statusCode}</p>
  ),
}));

// GlobalError renders a literal <html>/<body> shell. React 19 treats <html>,
// <head>, and <body> as document-level "host singletons" shared across every
// root in the same document, so mounting more than one instance across tests
// (even in separate detached containers) throws. A single mount is enough to
// exercise the whole component: one effect, no branches.
describe('GlobalError', () => {
  it('reports the error to Sentry and renders the fallback UI', async () => {
    // React 19 treats <html>/<body> as document-level "host singletons".
    // Mounting one via createRoot(document.documentElement) triggers an
    // internal, asynchronous "component suspended inside act" warning
    // unrelated to this component's own logic (no Suspense boundary exists
    // here) as part of that singleton bookkeeping. Swallow console.error for
    // this render only and flush microtasks before the test ends so the
    // warning is observed here rather than leaking as an unhandled rejection
    // into a later test.
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = Object.assign(new Error('boom'), { digest: 'abc123' });
    const root = createRoot(document.documentElement);

    await act(async () => {
      root.render(<GlobalError error={error} />);
    });

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(document.body.textContent).toContain('Error 0');
  });
});

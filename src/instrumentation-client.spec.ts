import * as Sentry from '@sentry/nextjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const replayIntegrationMarker = Symbol('replay-integration');

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => replayIntegrationMarker),
  captureRouterTransitionStart: vi.fn(),
}));

describe('instrumentation-client', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPublicVercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalNodeEnv ?? 'test');
    process.env.NEXT_PUBLIC_VERCEL_ENV = originalPublicVercelEnv;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('initializes Sentry as disabled outside a production build, falling back to NODE_ENV', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;

    await import('./instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: expect.stringContaining('sentry.io'),
        integrations: [replayIntegrationMarker],
        enabled: false,
        environment: 'test',
        tracesSampleRate: 0.1,
        enableLogs: true,
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
        sendDefaultPii: true,
      }),
    );
  });

  it('enables Sentry and maps environment to NEXT_PUBLIC_VERCEL_ENV in a production build', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';

    await import('./instrumentation-client');

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        environment: 'preview',
      }),
    );
  });

  it('ignores the stackless Safari fetch-abort message and app:// script urls', async () => {
    await import('./instrumentation-client');

    const options = vi.mocked(Sentry.init).mock.calls[0]?.[0] ?? {};

    expect(options.ignoreErrors).toEqual([expect.any(RegExp)]);
    expect(options.denyUrls).toEqual([expect.any(RegExp)]);

    const [loadFailed] = options.ignoreErrors as [RegExp];
    const [appScheme] = options.denyUrls as [RegExp];

    expect(loadFailed.test('TypeError: Load failed')).toBe(true);
    expect(loadFailed.test('Load failed')).toBe(true);
    // Anchored at both ends, so an error that merely mentions loading and a
    // `Load failed` carrying real detail both still report.
    expect(loadFailed.test('Image load failed for /crest.png')).toBe(false);
    expect(
      loadFailed.test('TypeError: Load failed while fetching fixtures'),
    ).toBe(false);

    expect(appScheme.test('app:///')).toBe(true);
    expect(appScheme.test('app://navigation_performance_logger_android')).toBe(
      true,
    );
    // A host that merely starts with `app` is ours, not a webview bridge.
    expect(appScheme.test('https://app.arsenalamerica.us/_next/x.js')).toBe(
      false,
    );
  });

  it('re-exports onRouterTransitionStart as Sentry.captureRouterTransitionStart', async () => {
    const { onRouterTransitionStart } = await import(
      './instrumentation-client'
    );
    expect(onRouterTransitionStart).toBe(Sentry.captureRouterTransitionStart);
  });
});

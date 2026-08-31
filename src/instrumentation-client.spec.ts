import * as Sentry from '@sentry/nextjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const replayIntegrationMarker = Symbol('replay-integration');
const thirdPartyFilterMarker = Symbol('third-party-error-filter');

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  replayIntegration: vi.fn(() => replayIntegrationMarker),
  thirdPartyErrorFilterIntegration: vi.fn(() => thirdPartyFilterMarker),
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
        integrations: [replayIntegrationMarker, thirdPartyFilterMarker],
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

  it('filters third-party frames by application key, not by message text', async () => {
    await import('./instrumentation-client');

    expect(Sentry.thirdPartyErrorFilterIntegration).toHaveBeenCalledWith({
      filterKeys: ['arsenalamerica-app'],
      behaviour: 'drop-error-if-contains-third-party-frames',
    });
  });

  it('ignores the stackless Safari fetch-abort message and app:// script urls', async () => {
    await import('./instrumentation-client');

    const options = vi.mocked(Sentry.init).mock.calls[0]?.[0] ?? {};
    const [loadFailed] = (options.ignoreErrors ?? []) as [RegExp];
    const [appScheme] = (options.denyUrls ?? []) as [RegExp];

    expect(loadFailed.test('TypeError: Load failed')).toBe(true);
    expect(loadFailed.test('Load failed')).toBe(true);
    expect(loadFailed.test('Image load failed for /crest.png')).toBe(false);

    expect(appScheme.test('app:///')).toBe(true);
    expect(appScheme.test('app://navigation_performance_logger_android')).toBe(
      true,
    );
    expect(appScheme.test('https://arsenalamerica.us/_next/static/x.js')).toBe(
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

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

  it('re-exports onRouterTransitionStart as Sentry.captureRouterTransitionStart', async () => {
    const { onRouterTransitionStart } = await import(
      './instrumentation-client'
    );
    expect(onRouterTransitionStart).toBe(Sentry.captureRouterTransitionStart);
  });
});

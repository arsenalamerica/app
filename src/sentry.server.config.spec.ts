import * as Sentry from '@sentry/nextjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
}));

describe('sentry.server.config', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalNodeEnv ?? 'test');
    process.env.VERCEL_ENV = originalVercelEnv;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('initializes Sentry as disabled outside a production build', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    delete process.env.VERCEL_ENV;

    await import('./sentry.server.config');

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: expect.stringContaining('sentry.io'),
        enabled: false,
        environment: 'test',
        tracesSampleRate: 0.1,
        enableLogs: true,
        sendDefaultPii: true,
      }),
    );
  });

  it('enables Sentry and maps environment to VERCEL_ENV in a production build', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.VERCEL_ENV = 'preview';

    await import('./sentry.server.config');

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        environment: 'preview',
      }),
    );
  });
});

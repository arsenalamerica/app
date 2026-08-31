import * as Sentry from '@sentry/nextjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { serverConfigLoaded, edgeConfigLoaded } = vi.hoisted(() => ({
  serverConfigLoaded: vi.fn(),
  edgeConfigLoaded: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureRequestError: vi.fn(),
}));

vi.mock('./sentry.server.config', () => {
  serverConfigLoaded();
  return {};
});
vi.mock('./sentry.edge.config', () => {
  edgeConfigLoaded();
  return {};
});

describe('instrumentation', () => {
  const originalRuntime = process.env.NEXT_RUNTIME;

  afterEach(() => {
    process.env.NEXT_RUNTIME = originalRuntime;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('exports onRequestError as Sentry.captureRequestError', async () => {
    const { onRequestError } = await import('./instrumentation');
    expect(onRequestError).toBe(Sentry.captureRequestError);
  });

  it('loads only the server Sentry config in the nodejs runtime', async () => {
    process.env.NEXT_RUNTIME = 'nodejs';
    const { register } = await import('./instrumentation');

    await register();

    expect(serverConfigLoaded).toHaveBeenCalledTimes(1);
    expect(edgeConfigLoaded).not.toHaveBeenCalled();
  });

  it('loads only the edge Sentry config in the edge runtime', async () => {
    process.env.NEXT_RUNTIME = 'edge';
    const { register } = await import('./instrumentation');

    await register();

    expect(edgeConfigLoaded).toHaveBeenCalledTimes(1);
    expect(serverConfigLoaded).not.toHaveBeenCalled();
  });

  it('loads neither config outside nodejs/edge runtimes', async () => {
    process.env.NEXT_RUNTIME = '';
    const { register } = await import('./instrumentation');

    await register();

    expect(serverConfigLoaded).not.toHaveBeenCalled();
    expect(edgeConfigLoaded).not.toHaveBeenCalled();
  });
});

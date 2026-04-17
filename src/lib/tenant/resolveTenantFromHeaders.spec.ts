import { headers } from 'next/headers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveTenantFromHeaders } from './resolveTenantFromHeaders';

vi.mock('next/headers');

const mockHost = (host: string | null) =>
  vi.mocked(headers).mockResolvedValue({
    get: () => host,
  } as unknown as Awaited<ReturnType<typeof headers>>);

describe('resolveTenantFromHeaders', () => {
  const originalEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.VERCEL_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('treats a null host header as localhost', async () => {
    mockHost(null);
    const domain = await resolveTenantFromHeaders({ caller: 'test' });
    expect(domain).toBe('tacomagooners.com');
  });

  it('resolves localhost to tacomagooners.com', async () => {
    mockHost('localhost:3000');
    const domain = await resolveTenantFromHeaders({ caller: 'test' });
    expect(domain).toBe('tacomagooners.com');
  });

  it('resolves a known host to itself', async () => {
    mockHost('pdxgooners.com');
    const domain = await resolveTenantFromHeaders({ caller: 'test' });
    expect(domain).toBe('pdxgooners.com');
  });

  it('falls back to PREVIEW_FALLBACK for unknown host on preview', async () => {
    process.env.VERCEL_ENV = 'preview';
    mockHost('app-git-foo-arsenalamerica.vercel.app');
    const domain = await resolveTenantFromHeaders({ caller: 'test' });
    expect(domain).toBe('boisegooners.com');
  });

  it('warns and falls back to PREVIEW_FALLBACK for unknown host in production', async () => {
    process.env.VERCEL_ENV = 'production';
    mockHost('bad.example');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const domain = await resolveTenantFromHeaders({ caller: 'test-caller' });

    expect(domain).toBe('boisegooners.com');
    expect(warn).toHaveBeenCalledWith(
      '[test-caller] unknown host in production: bad.example',
    );
  });
});

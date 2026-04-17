import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

import robots from './robots';

vi.mock('next/headers');
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

const mockHost = (host: string | null) =>
  vi.mocked(headers).mockResolvedValue({
    get: () => host,
  } as unknown as Awaited<ReturnType<typeof headers>>);

describe('robots', () => {
  const originalEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.VERCEL_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns robots for a known branch hostname', async () => {
    mockHost('tacomagooners.com');
    const result = await robots();
    expect(result.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(result.sitemap).toBe('https://tacomagooners.com/sitemap.xml');
  });

  it('returns tacomagooners robots on localhost', async () => {
    mockHost('localhost:3000');
    const result = await robots();
    expect(result.sitemap).toBe('https://tacomagooners.com/sitemap.xml');
  });

  it('falls back to PREVIEW_FALLBACK for unknown host on preview', async () => {
    process.env.VERCEL_ENV = 'preview';
    mockHost('app-git-foo-arsenalamerica.vercel.app');
    const result = await robots();
    expect(result.sitemap).toBe('https://boisegooners.com/sitemap.xml');
  });

  it('calls notFound() and warns for unknown host in production', async () => {
    process.env.VERCEL_ENV = 'production';
    mockHost('not-a-branch.example');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(robots()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('not-a-branch.example'),
    );
  });
});

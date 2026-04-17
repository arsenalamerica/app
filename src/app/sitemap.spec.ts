import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

import sitemap from './sitemap';

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

describe('sitemap', () => {
  const originalEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.VERCEL_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns sitemap entries for a known branch hostname', async () => {
    mockHost('tacomagooners.com');
    const entries = await sitemap();
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.url)).toEqual([
      'https://tacomagooners.com',
      'https://tacomagooners.com/fixtures',
      'https://tacomagooners.com/table',
    ]);
  });

  it('returns tacomagooners sitemap on localhost', async () => {
    mockHost('localhost:3000');
    const entries = await sitemap();
    expect(entries[0].url).toBe('https://tacomagooners.com');
  });

  it('falls back to PREVIEW_FALLBACK for unknown host on preview', async () => {
    process.env.VERCEL_ENV = 'preview';
    mockHost('app-git-foo-arsenalamerica.vercel.app');
    const entries = await sitemap();
    expect(entries[0].url).toMatch(/^https:\/\/boisegooners\.com/);
  });

  it('calls notFound() and warns for unknown host in production', async () => {
    process.env.VERCEL_ENV = 'production';
    mockHost('not-a-branch.example');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(sitemap()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('not-a-branch.example'),
    );
  });
});

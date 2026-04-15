import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Manifest from './manifest';

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

describe('manifest', () => {
  const originalEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.VERCEL_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('returns a manifest for a known branch hostname', async () => {
    mockHost('tacomagooners.com');
    const manifest = await Manifest();
    expect(manifest.name).toBe('Tacoma Gooners');
  });

  it('returns the tacomagooners manifest on localhost', async () => {
    mockHost('localhost:3000');
    const manifest = await Manifest();
    expect(manifest.name).toBe('Tacoma Gooners');
  });

  it('falls back to DOMAINS[0] for unknown host on preview', async () => {
    process.env.VERCEL_ENV = 'preview';
    mockHost('app-git-foo-arsenalamerica.vercel.app');
    const manifest = await Manifest();
    expect(manifest.name).toBe('Boise Gooners');
  });

  it('calls notFound() and warns for unknown host in production', async () => {
    process.env.VERCEL_ENV = 'production';
    mockHost('not-a-branch.example');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(Manifest()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('not-a-branch.example'),
    );
  });
});

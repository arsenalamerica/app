import { headers } from 'next/headers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { branchData } from '@/data';

import Image from './opengraph-image';

vi.mock('next/headers');

const mockHost = (host: string) =>
  vi.mocked(headers).mockResolvedValue({
    get: () => host,
  } as unknown as Awaited<ReturnType<typeof headers>>);

const domains = Object.keys(branchData);

describe('opengraph-image route handler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(domains)('returns a Response for domain=%s', async (domain) => {
    mockHost(domain);
    const response = await Image();
    expect(response).toBeInstanceOf(Response);
  });
});

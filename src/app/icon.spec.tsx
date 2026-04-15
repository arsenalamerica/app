import { headers } from 'next/headers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { branchData } from '@/data';

import Icon from './icon';
import { ICON_SIZES } from './icon-sizes';

vi.mock('next/headers');

const mockHost = (host: string) =>
  vi.mocked(headers).mockResolvedValue({
    get: () => host,
  } as unknown as Awaited<ReturnType<typeof headers>>);

const domains = Object.keys(branchData);

describe('Icon route handler', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(
    domains.flatMap((domain) => ICON_SIZES.map((size) => ({ domain, size }))),
  )('returns a Response for domain=$domain size=$size', async ({
    domain,
    size,
  }) => {
    mockHost(domain);
    const response = await Icon({ id: String(size) });
    expect(response).toBeInstanceOf(Response);
  });
});

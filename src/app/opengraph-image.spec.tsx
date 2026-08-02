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

  it.each(domains)(
    'renders an image Response for domain=%s',
    async (domain) => {
      mockHost(domain);
      const response = await Image();
      expect(response).toBeInstanceOf(Response);

      // Consume the body so next/og finishes rendering inside the test. Without
      // this the render runs on past the end of the test, its data-URI fetches
      // land after the fetch spy is restored, and vitest reports them as
      // unhandled rejections.
      //
      // It also makes the assertion mean something: `toBeInstanceOf(Response)`
      // alone passes even if image rendering is completely broken.
      const png = await response.arrayBuffer();
      expect(png.byteLength).toBeGreaterThan(0);
    },
  );
});

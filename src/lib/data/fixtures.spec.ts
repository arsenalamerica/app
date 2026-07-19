import { beforeEach, describe, expect, it, vi } from 'vitest';

import { smFixtures, smTvStation } from '@/lib/sportmonks';

import { getNextFixture } from './fixtures';

// cacheLife/cacheTag are no-ops here; they need the Next `cacheComponents`
// runtime, which vitest does not provide.
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock('@/lib/sportmonks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sportmonks')>()),
  smFixtures: vi.fn(),
  smTvStation: vi.fn(),
}));

const fixture = (overrides = {}) => ({
  id: 1,
  name: 'Arsenal vs Spurs',
  participants: [{ name: 'Tottenham Hotspur' }],
  venue: { name: 'Emirates Stadium' },
  tvstations: [],
  ...overrides,
});

describe('getNextFixture', () => {
  beforeEach(() => {
    vi.mocked(smTvStation).mockReset();
    vi.mocked(smFixtures).mockReset();
  });

  it('returns an empty array when no fixture matches', async () => {
    // Regression: issue #182. This used to throw, which crashed every branch
    // home page between seasons instead of degrading to an off-season state.
    vi.mocked(smFixtures).mockResolvedValue({ data: [] } as never);

    await expect(getNextFixture()).resolves.toEqual([]);
  });

  it('returns the matched fixture when one exists', async () => {
    vi.mocked(smFixtures).mockResolvedValue({ data: [fixture()] } as never);

    const [next] = await getNextFixture();

    expect(next.id).toBe(1);
  });

  it('drops tv stations whose lookup fails rather than throwing', async () => {
    vi.mocked(smFixtures).mockResolvedValue({
      data: [
        fixture({
          tvstations: [
            { tvstation_id: 10, country_id: 3483 },
            { tvstation_id: 11, country_id: 3483 },
          ],
        }),
      ],
    } as never);
    vi.mocked(smTvStation)
      .mockResolvedValueOnce({ data: { name: 'USA Network' } } as never)
      .mockRejectedValueOnce(new Error('Sportmonks 503'));

    const [next] = await getNextFixture();

    expect(next.tvstations).toHaveLength(1);
    expect(next.tvstations[0].tvstation_id).toBe(10);
  });
});

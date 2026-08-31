import { beforeEach, describe, expect, it, vi } from 'vitest';

import { smFixture, smFixtures, smTvStation } from '@/lib/sportmonks';

import {
  getNextFixture,
  getSettledFixtureById,
  getUnsettledFixtureById,
} from './fixtures';

// cacheLife/cacheTag are no-ops here; they need the Next `cacheComponents`
// runtime, which vitest does not provide.
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock('@/lib/sportmonks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sportmonks')>()),
  smFixture: vi.fn(),
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

  it('requests the next fixture sorted via camelCase sortBy, not sort_by', async () => {
    // Regression: issue #349. Sportmonks v3 only recognises `sortBy`
    // (camelCase) — `sort_by` is silently ignored, leaving default ordering
    // in place, so `getNextFixture` could return the wrong fixture as
    // "next". The API itself does the sorting (there is no client-side sort
    // here to test against several out-of-order candidates), so what this
    // pins is the request shape: `sortBy` present with the right value, and
    // `sort_by` gone for good.
    vi.mocked(smFixtures).mockResolvedValue({ data: [fixture()] } as never);

    await getNextFixture();

    expect(smFixtures).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'starting_at',
        order: 'asc',
        per_page: '1',
      }),
    );
    const [callArgs] = vi.mocked(smFixtures).mock.calls[0];
    expect(callArgs).not.toHaveProperty('sort_by');
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
    expect(next.tvstations?.[0].tvstation_id).toBe(10);
  });

  it('handles a fixture whose tvStations include is absent', async () => {
    // Regression for issue #337.
    vi.mocked(smFixtures).mockResolvedValue({
      data: [fixture({ tvstations: undefined })],
    } as never);

    const [next] = await getNextFixture();

    expect(next.tvstations).toEqual([]);
    expect(smTvStation).not.toHaveBeenCalled();
  });

  it('applies shite even when a fixture has no venue', async () => {
    // Sportmonks sends `venue: null`, not an absent key, for a fixture with no
    // assigned venue — verified against 19872591 and 19872640.
    vi.mocked(smFixtures).mockResolvedValue({
      data: [fixture({ venue: null })],
    } as never);

    const [next] = await getNextFixture();

    expect(next.venue).toBeNull();
  });

  it('handles a fixture with no participants', async () => {
    vi.mocked(smFixtures).mockResolvedValue({
      data: [fixture({ participants: undefined })],
    } as never);

    const [next] = await getNextFixture();

    expect(next.participants).toBeUndefined();
  });
});

describe('getSettledFixtureById', () => {
  beforeEach(() => {
    vi.mocked(smFixture).mockReset();
  });

  it('fetches and rewrites a fixture by id', async () => {
    vi.mocked(smFixture).mockResolvedValue({
      data: fixture({ id: 7 }),
    } as never);

    const result = await getSettledFixtureById(7);

    expect(smFixture).toHaveBeenCalledWith(7, { include: expect.any(String) });
    expect(result.id).toBe(7);
    expect(result.participants[0].name).toBe('Totnum Shitspur');
    expect(result.venue?.name).toBe('Emirates Stadium');
  });
});

describe('getUnsettledFixtureById', () => {
  beforeEach(() => {
    vi.mocked(smFixture).mockReset();
  });

  it('fetches and rewrites a fixture by id', async () => {
    vi.mocked(smFixture).mockResolvedValue({
      data: fixture({ id: 9 }),
    } as never);

    const result = await getUnsettledFixtureById(9);

    expect(smFixture).toHaveBeenCalledWith(9, { include: expect.any(String) });
    expect(result.id).toBe(9);
  });
});

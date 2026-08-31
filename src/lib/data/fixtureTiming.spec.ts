import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  computeFixtureOrder,
  getFixtureTiming,
  SETTLED_THRESHOLD_S,
} from './fixtureTiming';

// cacheLife/cacheTag are no-ops here; they need the Next `cacheComponents`
// runtime, which vitest does not provide.
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

describe('computeFixtureOrder', () => {
  const nowS = 1_000_000;

  it('sorts fixtures by kickoff regardless of input order', () => {
    const list = [
      { id: 3, kickoff: nowS + 300 },
      { id: 1, kickoff: nowS + 100 },
      { id: 2, kickoff: nowS + 200 },
    ];

    const { orderedIds } = computeFixtureOrder(list, nowS);

    expect(orderedIds).toEqual([1, 2, 3]);
  });

  it('marks fixtures older than the settled threshold as settled', () => {
    const list = [
      { id: 1, kickoff: nowS - SETTLED_THRESHOLD_S - 10 }, // settled
      { id: 2, kickoff: nowS - SETTLED_THRESHOLD_S + 10 }, // not settled
      { id: 3, kickoff: nowS + 100 }, // upcoming
    ];

    const { settledIds, nextFixtureId } = computeFixtureOrder(list, nowS);

    expect(settledIds).toEqual([1]);
    expect(nextFixtureId).toBe(2);
  });

  it('returns undefined nextFixtureId when every fixture is settled', () => {
    const list = [{ id: 1, kickoff: nowS - SETTLED_THRESHOLD_S - 10 }];

    const { nextFixtureId } = computeFixtureOrder(list, nowS);

    expect(nextFixtureId).toBeUndefined();
  });

  it('returns an empty timing result for an empty fixture list', () => {
    expect(computeFixtureOrder([], nowS)).toEqual({
      nextFixtureId: undefined,
      orderedIds: [],
      settledIds: [],
    });
  });
});

describe('getFixtureTiming', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes fixture order from the real fixture index at the current time', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01T00:00:00Z'));

    const timing = await getFixtureTiming();

    expect(Array.isArray(timing.orderedIds)).toBe(true);
    expect(Array.isArray(timing.settledIds)).toBe(true);
  });
});

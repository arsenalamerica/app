import { describe, expect, it, vi } from 'vitest';

import { smStandings } from '@/lib/sportmonks';

import { getStandings } from './standings';

// cacheLife/cacheTag are no-ops here; they need the Next `cacheComponents`
// runtime, which vitest does not provide.
vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

vi.mock('@/lib/sportmonks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sportmonks')>()),
  smStandings: vi.fn(),
}));

// Every stat key `getStandings` requires to be present before it will return
// a row — see `STANDING_STAT_KEYS` in `./standings.ts`.
const FULL_DETAILS = [
  { value: 10, type: { code: 'overall-matches-played' } },
  { value: 5, type: { code: 'overall-won' } },
  { value: 20, type: { code: 'overall-points' } },
  { value: 1, type: { code: 'overall-draw' } },
  { value: 4, type: { code: 'overall-lost' } },
  { value: 15, type: { code: 'overall-goals-for' } },
  { value: 8, type: { code: 'overall-goals-against' } },
  { value: 5, type: { code: 'home-matches-played' } },
  { value: 3, type: { code: 'home-won' } },
  { value: 1, type: { code: 'home-draw' } },
  { value: 1, type: { code: 'home-lost' } },
  { value: 9, type: { code: 'home-scored' } },
  { value: 4, type: { code: 'home-conceded' } },
  { value: 5, type: { code: 'away-matches-played' } },
  { value: 2, type: { code: 'away-won' } },
  { value: 0, type: { code: 'away-draw' } },
  { value: 3, type: { code: 'away-lost' } },
  { value: 6, type: { code: 'away-scored' } },
  { value: 4, type: { code: 'away-conceded' } },
  { value: 7, type: { code: 'goal-difference' } },
  { value: 10, type: { code: 'home-points' } },
  { value: 10, type: { code: 'away-points' } },
];

describe('getStandings', () => {
  it('flattens details into a stats map and applies shite to participant names', async () => {
    vi.mocked(smStandings).mockResolvedValue({
      data: [
        {
          id: 1,
          points: 10,
          participant: {
            name: 'Tottenham Hotspur',
            short_code: 'TOT',
          },
          details: FULL_DETAILS,
        },
      ],
    } as never);

    const [standing] = await getStandings();

    expect(standing.participant).toEqual({
      name: 'Totnum Shitspur',
      short_code: 'TOT',
    });
    expect(standing.stats['overall-won']).toBe(5);
    expect(standing.stats['overall-points']).toBe(20);
    expect(Object.keys(standing.stats)).toHaveLength(22);
    expect(standing.points).toBe(10);
    expect(standing).not.toHaveProperty('details');
  });

  it('returns an empty array when the season has no standings rows', async () => {
    vi.mocked(smStandings).mockResolvedValue({ data: [] } as never);

    expect(await getStandings()).toEqual([]);
  });

  it('throws StandingsRowIncludeMissingError when a row is missing participant', async () => {
    vi.mocked(smStandings).mockResolvedValue({
      data: [
        {
          id: 7,
          points: 10,
          participant: null,
          details: FULL_DETAILS,
        },
      ],
    } as never);

    await expect(getStandings()).rejects.toMatchObject({
      name: 'StandingsRowIncludeMissingError',
      rowId: 7,
      include: 'participant',
    });
  });

  it('throws StandingsRowIncludeMissingError when a detail has no type at all', async () => {
    vi.mocked(smStandings).mockResolvedValue({
      data: [
        {
          id: 9,
          points: 10,
          participant: { name: 'Arsenal', short_code: 'ARS' },
          details: [{ value: 5, type: null }],
        },
      ],
    } as never);

    await expect(getStandings()).rejects.toMatchObject({
      name: 'StandingsRowIncludeMissingError',
      rowId: 9,
      include: 'details.type',
    });
  });

  it('throws StandingsRowIncludeMissingError when a detail has a type object with no code', async () => {
    vi.mocked(smStandings).mockResolvedValue({
      data: [
        {
          id: 10,
          points: 10,
          participant: { name: 'Arsenal', short_code: 'ARS' },
          details: [{ value: 5, type: {} }],
        },
      ],
    } as never);

    await expect(getStandings()).rejects.toMatchObject({
      name: 'StandingsRowIncludeMissingError',
      rowId: 10,
      include: 'details.type',
    });
  });

  it('throws StandingsRowIncludeMissingError when details is absent entirely', async () => {
    vi.mocked(smStandings).mockResolvedValue({
      data: [
        {
          id: 11,
          points: 10,
          participant: { name: 'Arsenal', short_code: 'ARS' },
          details: null,
        },
      ],
    } as never);

    await expect(getStandings()).rejects.toMatchObject({
      rowId: 11,
      include: 'details.type',
    });
  });

  it('throws StandingsRowIncludeMissingError when details is an empty array', async () => {
    vi.mocked(smStandings).mockResolvedValue({
      data: [
        {
          id: 12,
          points: 10,
          participant: { name: 'Arsenal', short_code: 'ARS' },
          details: [],
        },
      ],
    } as never);

    await expect(getStandings()).rejects.toMatchObject({
      name: 'StandingsRowIncludeMissingError',
      rowId: 12,
      include: 'details.type:overall-matches-played',
    });
  });

  it('throws StandingsRowIncludeMissingError when details is missing a stat key', async () => {
    vi.mocked(smStandings).mockResolvedValue({
      data: [
        {
          id: 13,
          points: 10,
          participant: { name: 'Arsenal', short_code: 'ARS' },
          // Drop the last key (away-points) from an otherwise-complete list.
          details: FULL_DETAILS.slice(0, -1),
        },
      ],
    } as never);

    await expect(getStandings()).rejects.toMatchObject({
      name: 'StandingsRowIncludeMissingError',
      rowId: 13,
      include: 'details.type:away-points',
    });
  });
});

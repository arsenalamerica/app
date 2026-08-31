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
          details: [
            { value: 5, type: { code: 'overall-won' } },
            { value: 20, type: { code: 'overall-points' } },
          ],
        },
      ],
    } as never);

    const [standing] = await getStandings();

    expect(standing.participant).toEqual({
      name: 'Totnum Shitspur',
      short_code: 'TOT',
    });
    expect(standing.stats).toEqual({
      'overall-won': 5,
      'overall-points': 20,
    });
    expect(standing.points).toBe(10);
    expect(standing).not.toHaveProperty('details');
  });
});

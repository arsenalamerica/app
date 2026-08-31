import { describe, expect, it, vi } from 'vitest';
import { sportmonksFetch } from './sportmonks';
import { StandingsRowIncludeMissingError, smStandings } from './standings';

vi.mock('./sportmonks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./sportmonks')>()),
  sportmonksFetch: vi.fn(),
}));

describe('smStandings', () => {
  it('requests standings for the configured premier league season', async () => {
    vi.mocked(sportmonksFetch).mockResolvedValue({ data: [] } as never);

    await smStandings({ include: 'foo' });

    expect(sportmonksFetch).toHaveBeenCalledWith('/standings/seasons/28083', {
      include: 'foo',
    });
  });
});

describe('StandingsRowIncludeMissingError', () => {
  it('names itself so it groups on its own in Sentry', () => {
    const error = new StandingsRowIncludeMissingError(7, 'participant');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('StandingsRowIncludeMissingError');
    expect(error.rowId).toBe(7);
    expect(error.include).toBe('participant');
    expect(error.message).toBe(
      'Standings row 7 is missing the "participant" include',
    );
  });
});

import { describe, expect, it, vi } from 'vitest';
import { sportmonksFetch } from './sportmonks';
import { smStandings } from './standings';

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

import { describe, expect, it, vi } from 'vitest';

import { sportmonksFetch } from './sportmonks';
import { smTvStation } from './tv-station';

vi.mock('./sportmonks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./sportmonks')>()),
  sportmonksFetch: vi.fn(),
}));

describe('smTvStation', () => {
  it('requests a tv station by id', async () => {
    vi.mocked(sportmonksFetch).mockResolvedValue({ data: {} } as never);

    await smTvStation(10, { include: 'foo' });

    expect(sportmonksFetch).toHaveBeenCalledWith('/tv-stations/10', {
      include: 'foo',
    });
  });

  it('works without params', async () => {
    vi.mocked(sportmonksFetch).mockResolvedValue({ data: {} } as never);

    await smTvStation(10);

    expect(sportmonksFetch).toHaveBeenCalledWith('/tv-stations/10', undefined);
  });
});

import { describe, expect, it, vi } from 'vitest';

import { smFixture, smFixtures } from './fixtures';
import { sportmonksFetch } from './sportmonks';

vi.mock('./sportmonks', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./sportmonks')>()),
  sportmonksFetch: vi.fn(),
}));

describe('smFixtures', () => {
  it('requests fixtures within the season window for the Arsenal team', async () => {
    vi.mocked(sportmonksFetch).mockResolvedValue({ data: [] } as never);

    await smFixtures({ include: 'foo' });

    expect(sportmonksFetch).toHaveBeenCalledWith(
      expect.stringMatching(/^\/fixtures\/between\/.+\/.+\/19$/),
      { include: 'foo' },
    );
  });
});

describe('smFixture', () => {
  it('requests a single fixture by id', async () => {
    vi.mocked(sportmonksFetch).mockResolvedValue({ data: {} } as never);

    await smFixture(42, { include: 'foo' });

    expect(sportmonksFetch).toHaveBeenCalledWith('/fixtures/42', {
      include: 'foo',
    });
  });

  it('defaults query params to an empty object', async () => {
    vi.mocked(sportmonksFetch).mockResolvedValue({ data: {} } as never);

    await smFixture(42);

    expect(sportmonksFetch).toHaveBeenCalledWith('/fixtures/42', {});
  });
});

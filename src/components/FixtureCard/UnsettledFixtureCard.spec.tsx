import { render, screen } from '@testing-library/react';

import { getUnsettledFixtureById } from '@/lib/data/fixtures';
import type { FixtureEntity } from '@/lib/sportmonks';
import { UnsettledFixtureCard } from './UnsettledFixtureCard';

vi.mock('@/lib/data/fixtures');

const fixture: FixtureEntity = {
  id: 43,
  name: 'Arsenal vs City',
  starting_at: '2024-02-06T15:00:00Z',
  starting_at_timestamp: 1707231600,
  state_id: 1,
  state: {
    id: 1,
    state: 'NS',
    name: 'Not Started',
    short_name: 'NS',
    developer_name: 'NS',
  },
  league: { id: 8, name: 'Premier League', image_path: 'league.png' },
  venue: { id: 1, name: 'Emirates Stadium', image_path: 'venue.png' },
  participants: [
    {
      id: 19,
      name: 'Arsenal',
      image_path: 'arsenal.png',
      short_code: 'ARS',
      meta: { location: 'home' },
    },
    {
      id: 9,
      name: 'City',
      image_path: 'city.png',
      short_code: 'MCI',
      meta: { location: 'away' },
    },
  ],
  scores: [],
  periods: [],
  tvstations: [],
};

describe('UnsettledFixtureCard', () => {
  it('fetches the unsettled fixture and renders it', async () => {
    vi.mocked(getUnsettledFixtureById).mockResolvedValue(fixture);

    const el = await UnsettledFixtureCard({ fixtureId: 43 });
    const { container } = render(el);

    expect(getUnsettledFixtureById).toHaveBeenCalledWith(43);
    expect(screen.getByText('Arsenal')).toBeTruthy();
    expect(container.querySelector('[data-id="43"]')).toBeTruthy();
    expect(container.querySelector('[data-upcoming="true"]')).toBeTruthy();
  });
});

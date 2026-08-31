import { render, screen } from '@testing-library/react';

import { getSettledFixtureById } from '@/lib/data/fixtures';
import type { FixtureEntity } from '@/lib/sportmonks';
import { SettledFixtureCard } from './SettledFixtureCard';

vi.mock('@/lib/data/fixtures');

const fixture: FixtureEntity = {
  id: 42,
  name: 'Arsenal vs Spurs',
  starting_at: '2024-01-06T15:00:00Z',
  starting_at_timestamp: 1704553200,
  state_id: 5,
  state: {
    id: 5,
    state: 'FT',
    name: 'Full Time',
    short_name: 'FT',
    developer_name: 'FT',
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
      id: 6,
      name: 'Spurs',
      image_path: 'spurs.png',
      short_code: 'TOT',
      meta: { location: 'away' },
    },
  ],
  scores: [
    { description: 'CURRENT', score: { participant: 'home', goals: 2 } },
    { description: 'CURRENT', score: { participant: 'away', goals: 1 } },
  ],
  periods: [],
  tvstations: [],
};

describe('SettledFixtureCard', () => {
  it('fetches the settled fixture and renders it', async () => {
    vi.mocked(getSettledFixtureById).mockResolvedValue(fixture);

    const el = await SettledFixtureCard({ fixtureId: 42 });
    const { container } = render(el);

    expect(getSettledFixtureById).toHaveBeenCalledWith(42);
    expect(screen.getByText('Arsenal')).toBeTruthy();
    expect(container.querySelector('[data-id="42"]')).toBeTruthy();
    expect(container.querySelector('[data-settled="true"]')).toBeTruthy();
  });
});

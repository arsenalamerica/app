import { render, screen } from '@testing-library/react';

import type { StandingEntity } from '@/lib/sportmonks';
import { LeagueTable, LeagueTableLoading } from './LeagueTable';

function standing(overrides: Partial<StandingEntity> = {}): StandingEntity {
  return {
    id: 1,
    participant_id: 19,
    sport_id: 1,
    league_id: 8,
    season_id: 1,
    stage_id: 1,
    group_id: 1,
    round_id: 1,
    standing_rule_id: 1,
    position: 1,
    result: '',
    points: 30,
    participant: {
      id: 19,
      sport_id: 1,
      country_id: 1,
      venue_id: 1,
      name: 'Arsenal',
      short_code: 'ARS',
      image_path: 'arsenal.png',
    },
    form: [],
    stats: {
      'overall-matches-played': 10,
      'overall-won': 8,
      'overall-draw': 1,
      'overall-lost': 1,
      'overall-goals-for': 20,
      'overall-goals-against': 5,
      'home-matches-played': 5,
      'home-won': 4,
      'home-draw': 1,
      'home-lost': 0,
      'home-scored': 10,
      'home-conceded': 2,
      'away-matches-played': 5,
      'away-won': 4,
      'away-draw': 0,
      'away-lost': 1,
      'away-scored': 10,
      'away-conceded': 3,
      'goal-difference': 15,
      'home-points': 13,
      'away-points': 12,
      'overall-points': 30,
    },
    ...overrides,
  };
}

describe('LeagueTable', () => {
  it('renders a row per standing with team name, short code, and stats', () => {
    render(<LeagueTable standings={[standing()]} />);

    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('ARS')).toBeInTheDocument();
    // Goal difference: goals-for (20) - goals-against (5) = 15
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('renders no rows when standings is undefined', () => {
    const { container } = render(
      // @ts-expect-error exercising the optional-chaining branch
      <LeagueTable standings={undefined} />,
    );

    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });

  it('renders no rows when standings is empty', () => {
    const { container } = render(<LeagueTable standings={[]} />);

    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
  });
});

describe('LeagueTableLoading', () => {
  it('renders 20 placeholder rows', () => {
    const { container } = render(<LeagueTableLoading />);

    expect(container.querySelectorAll('tbody tr')).toHaveLength(20);
    expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0);
  });
});

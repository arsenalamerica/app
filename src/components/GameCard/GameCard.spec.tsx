import { render } from '@testing-library/react';

import type { FixtureEntity } from '@/lib/sportmonks';
import { GameCard } from './GameCard';

// happy-dom reports zero height for every element, which makes react-textfit
// (used by GameCardBilling/GameCardTime) warn that it "can not process
// element without height." Render children directly instead of exercising
// its resize-measurement logic.
vi.mock('react-textfit', () => ({
  Textfit: ({ children }: { children: React.ReactNode }) => children,
}));

const branch = { domain: 'boisegooners.com', timezone: 'America/Boise' };

const arsenal = {
  id: 19,
  name: 'Arsenal',
  image_path: 'arsenal.png',
  short_code: 'ARS',
};
const westHam = {
  id: 1,
  name: 'West Ham',
  image_path: 'westham.png',
  short_code: 'WHU',
};

const baseFixture: FixtureEntity = {
  id: 42,
  name: 'Arsenal vs West Ham',
  starting_at: '2023-11-14T22:13:20Z',
  starting_at_timestamp: 1_700_000_000,
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
    { ...arsenal, meta: { location: 'home' } },
    { ...westHam, meta: { location: 'away' } },
  ],
  scores: [],
  periods: [],
  tvstations: [],
};

describe('GameCard', () => {
  function nonBadgeSvgCount(container: HTMLElement): number {
    return Array.from(container.querySelectorAll('svg')).filter(
      (svg) => !svg.hasAttribute('role'),
    ).length;
  }

  it('renders the branch logo when the domain is known', () => {
    const { container } = render(<GameCard branch={branch} {...baseFixture} />);

    // The branch Logo plus the home/away background svg.
    expect(nonBadgeSvgCount(container)).toBe(2);
  });

  it('omits the branch logo when the domain is unknown', () => {
    const { container } = render(
      <GameCard
        branch={{ domain: 'unknown-domain.example', timezone: 'UTC' }}
        {...baseFixture}
      />,
    );

    // Only the home/away background svg should be present, no branch Logo.
    expect(nonBadgeSvgCount(container)).toBe(1);
  });

  it('renders billing, badges, and time when both teams are present', () => {
    const { container, getAllByRole } = render(
      <GameCard branch={branch} {...baseFixture} />,
    );

    expect(getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
    expect(container.querySelectorAll('svg[role="img"]').length).toBe(2);
  });

  it('omits billing, badges, and time when a team is missing', () => {
    const { container } = render(
      <GameCard
        branch={branch}
        {...baseFixture}
        participants={[{ ...arsenal, meta: { location: 'home' } }]}
      />,
    );

    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(0);
    expect(container.querySelectorAll('h2')).toHaveLength(0);
  });

  it('renders the home-game background when the local team is Arsenal', () => {
    const { container } = render(<GameCard branch={branch} {...baseFixture} />);

    const backgrounds = Array.from(container.querySelectorAll('svg')).filter(
      (svg) =>
        svg.getAttribute('viewBox') === '0 0 512 512' &&
        !svg.hasAttribute('role'),
    );
    expect(backgrounds).toHaveLength(1);
  });

  it('renders the away-game background when the local team is not Arsenal', () => {
    const { container } = render(
      <GameCard
        branch={branch}
        {...baseFixture}
        participants={[
          { ...westHam, meta: { location: 'home' } },
          { ...arsenal, meta: { location: 'away' } },
        ]}
      />,
    );

    const backgrounds = Array.from(container.querySelectorAll('img')).filter(
      (img) => img.getAttribute('src')?.includes('away2026'),
    );
    expect(backgrounds).toHaveLength(1);
  });
});

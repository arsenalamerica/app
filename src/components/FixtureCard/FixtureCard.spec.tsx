import { render, screen } from '@testing-library/react';

import type { FixtureEntity } from '@/lib/sportmonks';
import { FixtureCard, FixtureCardLoading } from './FixtureCard';

type FixtureCardProps = Omit<FixtureEntity, 'id'>;

const baseFixture = (
  overrides: Partial<FixtureCardProps> = {},
): FixtureCardProps => ({
  name: 'Arsenal vs Spurs',
  starting_at: '2024-01-06T15:00:00Z',
  starting_at_timestamp: 1704553200,
  state_id: 5,
  tvstations: [],
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
    { description: '2ND_HALF', score: { participant: 'home', goals: 1 } },
  ],
  periods: [],
  ...overrides,
});

describe('FixtureCard', () => {
  it('renders a placeholder when there are no participants', () => {
    const { container } = render(
      <FixtureCard {...baseFixture({ participants: undefined })} />,
    );

    expect(screen.getByText('No upcoming fixtures...')).toBeTruthy();
    expect(container.querySelector('h1, h2, [role="heading"]')).toBeTruthy();
  });

  it('renders only the home team when the visitor is absent', () => {
    const fixture = baseFixture({
      participants: [
        {
          id: 19,
          name: 'Arsenal',
          image_path: 'arsenal.png',
          short_code: 'ARS',
          meta: { location: 'home' },
        },
      ],
    });

    render(<FixtureCard {...fixture} />);

    expect(screen.getByText('Arsenal')).toBeTruthy();
    expect(screen.queryByText('Spurs')).toBeNull();
  });

  it('renders only the away team when the home side is absent', () => {
    const fixture = baseFixture({
      participants: [
        {
          id: 6,
          name: 'Spurs',
          image_path: 'spurs.png',
          short_code: 'TOT',
          meta: { location: 'away' },
        },
      ],
    });

    render(<FixtureCard {...fixture} />);

    expect(screen.getByText('Spurs')).toBeTruthy();
    expect(screen.queryByText('Arsenal')).toBeNull();
  });

  it('shows the ticking minute for an in-progress fixture', () => {
    const fixture = baseFixture({
      state: {
        id: 2,
        state: 'INPLAY_1ST_HALF',
        name: '1st Half',
        short_name: '1H',
        developer_name: 'INPLAY_1ST_HALF',
      },
      periods: [
        {
          id: 1,
          fixture_id: 1,
          type_id: 1,
          started: 0,
          ended: 0,
          counts_from: 0,
          ticking: true,
          sort_order: 1,
          description: '1st-half',
          time_added: 0,
          period_length: 45,
          minutes: 37,
          seconds: 12,
          has_timer: true,
        },
      ],
    });

    render(<FixtureCard {...fixture} />);

    expect(screen.getByText("37'")).toBeTruthy();
    expect(screen.getByText('2-1')).toBeTruthy();
  });

  it('shows HT when active but no period is ticking', () => {
    const fixture = baseFixture({
      state: {
        id: 3,
        state: 'HT',
        name: 'Half Time',
        short_name: 'HT',
        developer_name: 'HT',
      },
      periods: [],
    });

    render(<FixtureCard {...fixture} />);

    expect(screen.getByText('HT')).toBeTruthy();
  });

  it('shows a local date and time for a future fixture', () => {
    const fixture = baseFixture({
      state: {
        id: 1,
        state: 'NS',
        name: 'Not Started',
        short_name: 'NS',
        developer_name: 'NS',
      },
    });

    const { container } = render(<FixtureCard {...fixture} />);

    const expectedIso = new Date(
      fixture.starting_at_timestamp * 1000,
    ).toISOString();
    const timeEls = container.querySelectorAll('time');
    expect(timeEls.length).toBe(2);
    for (const el of timeEls) {
      expect(el.getAttribute('dateTime')).toBe(expectedIso);
    }
  });

  it('shows a UTC date and the current score for a completed fixture', () => {
    const fixture = baseFixture();

    const { container } = render(<FixtureCard {...fixture} />);

    const expectedIso = new Date(
      fixture.starting_at_timestamp * 1000,
    ).toISOString();
    const expectedDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(fixture.starting_at_timestamp * 1000));

    const timeEl = container.querySelector('time');
    expect(timeEl?.getAttribute('dateTime')).toBe(expectedIso);
    expect(timeEl?.textContent).toBe(expectedDate);
    expect(screen.getByText('2-1')).toBeTruthy();
  });

  it('falls back to an empty score when scores is undefined', () => {
    const fixture = baseFixture({ scores: undefined });

    render(<FixtureCard {...fixture} />);

    expect(screen.getByText('undefined-undefined')).toBeTruthy();
  });

  it('renders the venue name when present', () => {
    const fixture = baseFixture();

    render(<FixtureCard {...fixture} />);

    expect(screen.getByText('Emirates Stadium')).toBeTruthy();
  });

  it('renders without a venue name when venue is absent', () => {
    const fixture = baseFixture({ venue: undefined });

    render(<FixtureCard {...fixture} />);

    expect(screen.queryByText('Emirates Stadium')).toBeNull();
  });

  it('forwards leftover props to the underlying Card', () => {
    const fixture = baseFixture();

    const { container } = render(
      <FixtureCard {...fixture} data-testid='fixture-card' />,
    );

    expect(
      container.querySelector('[data-testid="fixture-card"]'),
    ).toBeTruthy();
  });
});

describe('FixtureCardLoading', () => {
  it('renders the loading skeleton', () => {
    const { container } = render(<FixtureCardLoading />);

    expect(screen.getAllByText('Loading').length).toBe(2);
    expect(container.querySelectorAll('.loading').length).toBeGreaterThan(0);
  });
});

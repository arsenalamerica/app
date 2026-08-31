import * as Sentry from '@sentry/nextjs';
import { render, screen } from '@testing-library/react';

import { FixtureCard } from './FixtureCard';
import { FixtureCardBoundary } from './FixtureCardBoundary';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

function Boom(): never {
  throw new Error('boom');
}

describe('FixtureCardBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <FixtureCardBoundary>
        <div>Child content</div>
      </FixtureCardBoundary>,
    );

    expect(screen.getByText('Child content')).toBeTruthy();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('renders the fallback and reports to Sentry when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <FixtureCardBoundary>
        <Boom />
      </FixtureCardBoundary>,
    );

    expect(screen.getAllByText('Fixture unavailable').length).toBeGreaterThan(
      0,
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error));
  });

  it('catches a real FixtureCard throw on malformed fixture data', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <FixtureCardBoundary>
        <FixtureCard
          name='Arsenal vs Spurs'
          starting_at='2024-01-06T15:00:00Z'
          starting_at_timestamp={1704553200}
          state_id={5}
          tvstations={[]}
          state={{
            id: 5,
            state: 'FT',
            name: 'Full Time',
            short_name: 'FT',
            developer_name: 'FT',
          }}
          league={{ id: 8, name: 'Premier League', image_path: 'league.png' }}
          venue={{ id: 1, name: 'Emirates Stadium', image_path: 'venue.png' }}
          participants={undefined as never}
          scores={[]}
          periods={[]}
        />
      </FixtureCardBoundary>,
    );

    expect(screen.getAllByText('Fixture unavailable').length).toBeGreaterThan(
      0,
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Fixture "Arsenal vs Spurs" is missing its participants',
      }),
    );
  });
});

import * as Sentry from '@sentry/nextjs';
import { render, screen } from '@testing-library/react';

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
});

import { fireEvent, render, screen } from '@testing-library/react';

import { FixtureCardError } from './FixtureCardError';

describe('FixtureCardError', () => {
  it('renders the fallback content', () => {
    render(
      <FixtureCardError
        error={new Error('boom')}
        resetErrorBoundary={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Fixture unavailable').length).toBeGreaterThan(
      0,
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
  });

  it('calls resetErrorBoundary when the retry button is clicked', () => {
    const resetErrorBoundary = vi.fn();
    render(
      <FixtureCardError
        error={new Error('boom')}
        resetErrorBoundary={resetErrorBoundary}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(resetErrorBoundary).toHaveBeenCalledTimes(1);
  });
});

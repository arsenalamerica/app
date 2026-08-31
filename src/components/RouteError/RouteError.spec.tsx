import * as Sentry from '@sentry/nextjs';
import { fireEvent, render } from '@testing-library/react';

import { RouteError } from './RouteError';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

describe('RouteError', () => {
  it('should report the error to Sentry', () => {
    const error = new Error('boom');
    const reset = vi.fn();

    render(<RouteError error={error} reset={reset} />);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
  });

  it('should call reset when "Try again" is clicked', () => {
    const error = new Error('boom');
    const reset = vi.fn();

    const { getByRole } = render(<RouteError error={error} reset={reset} />);
    fireEvent.click(getByRole('button', { name: 'Try again' }));

    expect(reset).toHaveBeenCalled();
  });
});

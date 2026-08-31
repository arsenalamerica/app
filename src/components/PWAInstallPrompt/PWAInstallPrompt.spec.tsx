import { render, screen, waitFor } from '@testing-library/react';

import { PWAInstallPrompt } from './PWAInstallPrompt';

vi.mock('react-ios-pwa-prompt', () => ({
  default: () => <div data-testid='pwa-prompt' />,
}));

describe('PWAInstallPrompt', () => {
  it('renders nothing before mount', () => {
    const { container } = render(<PWAInstallPrompt />);

    // Immediately after the first render, the `mounted` effect has not yet
    // committed, so the component returns null.
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the lazy-loaded prompt once mounted', async () => {
    render(<PWAInstallPrompt />);

    await waitFor(() => {
      expect(screen.getByTestId('pwa-prompt')).toBeInTheDocument();
    });
  });
});

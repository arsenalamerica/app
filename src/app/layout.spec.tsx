import { describe, expect, it, vi } from 'vitest';

import RootLayout, { viewport } from './layout';

vi.mock('@vercel/analytics/next', () => ({
  Analytics: () => null,
}));

vi.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
}));

// RootLayout renders a literal <html>/<body> shell, which testing-library
// cannot mount into a container div without triggering React's nested-<html>
// recovery path. Inspect the returned element tree directly instead.
describe('RootLayout', () => {
  it('exports the expected viewport config', () => {
    expect(viewport).toEqual({
      width: 'device-width',
      initialScale: 1,
      viewportFit: 'cover',
    });
  });

  it('renders an <html lang="en"> shell with children inside <body>', () => {
    const element = RootLayout({ children: <p>hello</p> });

    expect(element.type).toBe('html');
    expect(element.props.lang).toBe('en');

    const [body] = element.props.children as React.ReactElement<{
      children: React.ReactNode;
    }>[];
    expect(body.type).toBe('body');
    expect(body.props.children).toEqual(<p>hello</p>);
  });
});

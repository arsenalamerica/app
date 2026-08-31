import { render, screen } from '@testing-library/react';

import { FixtureCardTeam } from './FixtureCardTeam';

describe('FixtureCardTeam', () => {
  it('renders the team name and short code', () => {
    render(
      <FixtureCardTeam
        id={19}
        name='Arsenal'
        short_code='ARS'
        image_path='arsenal.png'
      />,
    );

    expect(screen.getByText('Arsenal')).toBeTruthy();
    expect(screen.getByText('ARS')).toBeTruthy();
  });

  it('does not apply the loading classname when isLoading is not set', () => {
    const { container } = render(
      <FixtureCardTeam
        id={19}
        name='Arsenal'
        short_code='ARS'
        image_path='arsenal.png'
      />,
    );

    expect(container.querySelector('.loading')).toBeNull();
  });

  it('applies the loading classname when isLoading is true', () => {
    const { container } = render(
      <FixtureCardTeam
        isLoading
        id={19}
        name='Loading'
        short_code='XXX'
        image_path='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
      />,
    );

    expect(container.querySelectorAll('.loading').length).toBeGreaterThan(0);
  });
});

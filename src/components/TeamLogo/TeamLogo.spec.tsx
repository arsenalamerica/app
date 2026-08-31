import { render } from '@testing-library/react';

import { TeamLogo } from './TeamLogo';

vi.mock('next/image', () => ({
  default: ({
    alt,
    className,
  }: {
    alt: string;
    className?: string | string[];
  }) => (
    // biome-ignore lint/performance/noImgElement: test mock, not a real image component
    <img
      alt={alt}
      className={Array.isArray(className) ? className.join(' ') : className}
    />
  ),
}));

describe('TeamLogo', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <TeamLogo teamId={19} name='Team Name' fallback='img_path' />,
    );
    expect(baseElement).toBeTruthy();
  });

  it('should render the loading image when isLoading is true', () => {
    const { container } = render(
      <TeamLogo
        teamId={19}
        name='Team Name'
        fallback='img_path'
        isLoading
        className='custom'
      />,
    );

    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', 'Loading...');
    expect(img).toHaveClass('custom', 'loading');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('should warn and render the fallback image when the team is not found', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { container } = render(
      <TeamLogo teamId={-1} name='Unknown Team' fallback='img_path' />,
    );

    expect(warn).toHaveBeenCalledWith('TeamLogo for -1:Unknown Team not found');
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', 'Unknown Team Logo');
    expect(container.querySelector('svg')).toBeNull();
  });
});

import { render } from '@testing-library/react';

import { SocialLogo } from './SocialLogo';

vi.mock('next/image', () => ({
  default: ({ alt, className }: { alt: string; className?: string }) => (
    // biome-ignore lint/performance/noImgElement: test mock, not a real image component
    <img alt={alt} className={className} />
  ),
}));

describe('SocialLogo', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <SocialLogo leagueId={2} name='League Name' fallback='img_path' />,
    );
    expect(baseElement).toBeTruthy();
  });

  it('should warn and render the fallback image when the logo is not found', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { container } = render(
      <SocialLogo leagueId={-1} name='Unknown League' fallback='img_path' />,
    );

    expect(warn).toHaveBeenCalledWith('Logo for -1:Unknown League not found');
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('alt', 'Unknown League Logo');
    expect(container.querySelector('svg')).toBeNull();
  });
});

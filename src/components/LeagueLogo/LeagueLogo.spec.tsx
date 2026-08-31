import { render } from '@testing-library/react';

import { LeagueLogo } from './LeagueLogo';

vi.mock('next/image', () => ({
  // biome-ignore lint/performance/noImgElement: test mock, not a real image component
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe('LeagueLogo', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <LeagueLogo leagueId={2} name='League Name' fallback='img_path' />,
    );
    expect(baseElement).toBeTruthy();
  });

  it('should warn and render the fallback image when the league is not found', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { getByAltText } = render(
      <LeagueLogo leagueId={-1} name='Unknown League' fallback='img_path' />,
    );

    expect(warn).toHaveBeenCalledWith('Logo for -1:Unknown League not found');
    expect(getByAltText('Unknown League Logo')).toBeTruthy();
  });
});

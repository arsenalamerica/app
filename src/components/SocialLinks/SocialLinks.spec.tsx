import { render } from '@testing-library/react';
import { vi } from 'vitest';

import { SocialLinks } from './SocialLinks';

describe('SocialLinks', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <SocialLinks
        links={[{ name: 'Instagram', url: 'https://instagram.com/example' }]}
      />,
    );
    expect(baseElement).toBeTruthy();
  });

  it('should warn and skip unknown icons', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { baseElement } = render(
      <SocialLinks links={[{ name: 'UnknownSite' }]} />,
    );
    expect(console.warn).toHaveBeenCalledWith(
      'Social icon not found: UnknownSite',
    );
    expect(baseElement).toBeTruthy();
  });
});

import { render } from '@testing-library/react';

import Logo, { logoSrc } from './Logo';

describe('boisegooners Logo', () => {
  it('should render successfully', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('re-exports the logoSrc used as the embedded image', () => {
    expect(typeof logoSrc).toBe('string');
    expect(logoSrc.length).toBeGreaterThan(0);
  });
});

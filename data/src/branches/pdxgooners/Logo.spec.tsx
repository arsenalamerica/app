import { render } from '@testing-library/react';

import Logo from './Logo';

describe('pdxgooners Logo', () => {
  it('should render successfully', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

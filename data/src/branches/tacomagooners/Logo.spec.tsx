import { render } from '@testing-library/react';

import Logo from './Logo';

describe('tacomagooners Logo', () => {
  it('should render successfully', () => {
    const { container } = render(<Logo />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

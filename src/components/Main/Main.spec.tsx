import { render } from '@testing-library/react';

import { Main } from './Main';

describe('Main', () => {
  it('should render children', () => {
    const { getByText } = render(<Main>content</Main>);
    expect(getByText('content')).toBeTruthy();
  });

  it('should render without children', () => {
    const { container } = render(<Main />);
    expect(container.querySelector('main')).toBeTruthy();
  });

  it('should merge a custom className with the module class', () => {
    const { container } = render(<Main className='custom' />);
    expect(container.querySelector('main')).toHaveClass('custom');
  });
});

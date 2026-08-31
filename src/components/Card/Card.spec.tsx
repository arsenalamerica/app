import { render } from '@testing-library/react';
import { createRef } from 'react';

import { Card } from './Card';

describe('Card', () => {
  it('should render as a section by default', () => {
    const { container } = render(<Card>content</Card>);
    const element = container.querySelector('section');
    expect(element).toBeTruthy();
    expect(element).toHaveTextContent('content');
  });

  it('should render as the provided tag', () => {
    const { container } = render(<Card as='div'>content</Card>);
    expect(container.querySelector('div')).toBeTruthy();
    expect(container.querySelector('section')).toBeNull();
  });

  it('should merge a custom className with the module class', () => {
    const { container } = render(<Card className='custom'>content</Card>);
    const element = container.querySelector('section');
    expect(element).toHaveClass('custom');
  });

  it('should forward the ref to the rendered element', () => {
    const ref = createRef<HTMLElement>();
    render(<Card ref={ref}>content</Card>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });
});

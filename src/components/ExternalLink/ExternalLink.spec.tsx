import { render } from '@testing-library/react';
import { createRef } from 'react';

import ExternalLink from './ExternalLink';

describe('ExternalLink', () => {
  it('should render an anchor with target=_blank and default rel', () => {
    const { container } = render(
      <ExternalLink href='https://example.com'>link</ExternalLink>,
    );
    const anchor = container.querySelector('a');
    expect(anchor).toHaveAttribute('target', '_blank');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should append a caller-supplied rel value', () => {
    const { container } = render(
      <ExternalLink href='https://example.com' rel='nofollow'>
        link
      </ExternalLink>,
    );
    const anchor = container.querySelector('a');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer nofollow');
  });

  it('should forward the ref to the anchor element', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(
      <ExternalLink href='https://example.com' ref={ref}>
        link
      </ExternalLink>,
    );
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });
});

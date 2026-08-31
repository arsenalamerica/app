import { render, screen } from '@testing-library/react';

import { FixtureCardAnchor } from './FixtureCardAnchor';

describe('FixtureCardAnchor', () => {
  it('scrolls the wrapped content into view on mount', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    render(
      <FixtureCardAnchor>
        <div>Child content</div>
      </FixtureCardAnchor>,
    );

    expect(screen.getByText('Child content')).toBeTruthy();
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'instant',
      block: 'center',
    });
  });
});

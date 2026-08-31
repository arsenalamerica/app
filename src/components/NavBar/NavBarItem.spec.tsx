import * as Ariakit from '@ariakit/react';
import { act, render } from '@testing-library/react';
import { usePathname, useSearchParams } from 'next/navigation';

import { NavBarItem } from './NavBarItem';

vi.mock('next/navigation');

function mockNavigation(pathname: string) {
  vi.mocked(usePathname).mockReturnValue(pathname);
  // @ts-expect-error We are only mocking the toString method, not the entire object
  vi.mocked(useSearchParams).mockReturnValue({
    toString: () => 'mockedToString',
  });
}

describe('NavBarItem', () => {
  it('should render the label and icon when no children are provided', () => {
    mockNavigation('/other');
    const { getByText } = render(
      <Ariakit.Toolbar>
        <NavBarItem href='/' label='Home' icon={<i>icon</i>} />
      </Ariakit.Toolbar>,
    );
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('icon')).toBeTruthy();
  });

  it('should render the label without an icon element when icon is not provided', () => {
    mockNavigation('/other');
    const { getByText, queryByText } = render(
      <Ariakit.Toolbar>
        <NavBarItem href='/' label='Home' />
      </Ariakit.Toolbar>,
    );
    expect(getByText('Home')).toBeTruthy();
    expect(queryByText('icon')).toBeNull();
  });

  it('should render children instead of label/icon when provided', () => {
    mockNavigation('/other');
    const { getByText, queryByText } = render(
      <Ariakit.Toolbar>
        <NavBarItem href='/' label='Home' icon={<i>icon</i>}>
          custom children
        </NavBarItem>
      </Ariakit.Toolbar>,
    );
    expect(getByText('custom children')).toBeTruthy();
    expect(queryByText('Home')).toBeNull();
  });

  it('should set autoFocus when the current pathname matches a string href', async () => {
    mockNavigation('/');
    const { container } = render(
      <Ariakit.Toolbar>
        <NavBarItem href='/' label='Home' />
      </Ariakit.Toolbar>,
    );
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', '/?mockedToString');

    // Ariakit applies autoFocus asynchronously; flush it within act() so the
    // resulting state update doesn't leak into a later test.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('should not set autoFocus when the current pathname does not match the href', () => {
    mockNavigation('/other');
    const { container } = render(
      <Ariakit.Toolbar>
        <NavBarItem href='/' label='Home' />
      </Ariakit.Toolbar>,
    );
    const link = container.querySelector('a');
    expect(link).not.toHaveFocus();
  });
});

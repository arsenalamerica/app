import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

import * as icons from './icons';

describe('icons', () => {
  it.each(Object.entries(icons))('should render the %s icon', (_name, icon) => {
    const { container } = render(icon as ReactElement);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});

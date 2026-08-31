import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Layout from './layout';

vi.mock('@/components', () => ({
  Main: ({ children }: { children: React.ReactNode }) => (
    <main>{children}</main>
  ),
}));

describe('table/layout', () => {
  it('renders the Premier League Table heading around its children inside Main', () => {
    const { getByRole, getByText } = render(
      <Layout>
        <p>child content</p>
      </Layout>,
    );

    expect(
      getByRole('heading', { name: 'Premier League Table' }),
    ).toBeInTheDocument();
    expect(getByText('child content')).toBeInTheDocument();
  });
});

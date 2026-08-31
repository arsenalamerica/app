import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import TablePageLoading from './loading';

vi.mock('@/components', () => ({
  LeagueTableLoading: () => <p>loading table</p>,
}));

describe('table/loading', () => {
  it('renders the LeagueTableLoading skeleton', async () => {
    const ui = await TablePageLoading();
    const { getByText } = render(ui);

    expect(getByText('loading table')).toBeInTheDocument();
  });
});

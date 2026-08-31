import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getStandings } from '@/lib/data/standings';

import LeagueTablePage from './page';

vi.mock('@/lib/data/standings', () => ({
  getStandings: vi.fn(),
}));

vi.mock('@/components', () => ({
  LeagueTable: ({ standings }: { standings: unknown[] }) => (
    <p>standings: {standings.length}</p>
  ),
}));

describe('table/page', () => {
  it('renders LeagueTable with the fetched standings', async () => {
    vi.mocked(getStandings).mockResolvedValue([
      { position: 1 },
      { position: 2 },
    ] as never);

    const ui = await LeagueTablePage();
    const { getByText } = render(ui);

    expect(getByText('standings: 2')).toBeInTheDocument();
  });
});

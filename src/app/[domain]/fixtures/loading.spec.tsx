import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FixturesPageLoading from './loading';

vi.mock('@/components', () => ({
  FixtureCardLoading: ({ id }: { id?: number } = {}) => <p>loading {id}</p>,
}));

vi.mock('@/lib/sportmonks/fixtures.json', () => ({
  default: [{ id: 1 }, { id: 2 }],
}));

describe('fixtures/loading', () => {
  it('renders one skeleton per fixture in the static index', () => {
    const elements = FixturesPageLoading();
    const { getAllByText } = render(elements);

    expect(getAllByText(/loading/)).toHaveLength(2);
  });
});

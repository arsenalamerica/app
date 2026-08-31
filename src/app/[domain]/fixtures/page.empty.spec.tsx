import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FixturesPage from './page';

vi.mock('@/lib/sportmonks/fixtures.json', () => ({ default: [] }));

// Isolated in its own file: the empty-fixtures early return short-circuits
// before getFixtureTiming/@/components are ever used, so this only needs the
// json module mocked (a separate module registry per test file keeps this
// mock from leaking into page.spec.tsx's non-empty scenarios).
describe('fixtures/page (no fixtures scheduled)', () => {
  it('renders a fallback message when the static fixture index is empty', async () => {
    const ui = await FixturesPage();
    const { getByText } = render(ui);

    expect(getByText('No fixtures scheduled yet.')).toBeInTheDocument();
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getFixtureTiming } from '@/lib/data/fixtureTiming';

import FixturesPage, { generateStaticParams } from './page';

vi.mock('@/data', () => ({
  branchData: {
    'tacomagooners.com': {},
    'boisegooners.com': {},
  },
}));

vi.mock('@/lib/data/fixtureTiming', () => ({
  getFixtureTiming: vi.fn(),
  SETTLED_REAL: 2,
  UPCOMING_REAL: 8,
}));

vi.mock('@/lib/sportmonks/fixtures.json', () => ({
  default: [{ id: 1 }],
}));

vi.mock('@/components', () => ({
  DeferredFixtureCard: ({
    fixtureId,
    settled,
  }: {
    fixtureId: number;
    settled: boolean;
  }) => (
    <p>
      deferred-{fixtureId}-{String(settled)}
    </p>
  ),
  FixtureCardAnchor: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='anchor'>{children}</div>
  ),
  FixtureCardBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='boundary'>{children}</div>
  ),
  FixtureCardLoading: () => <p>loading</p>,
  SettledFixtureCard: ({ fixtureId }: { fixtureId: number }) => (
    <p>settled-{fixtureId}</p>
  ),
  UnsettledFixtureCard: ({ fixtureId }: { fixtureId: number }) => (
    <p>unsettled-{fixtureId}</p>
  ),
}));

describe('fixtures/page', () => {
  describe('generateStaticParams', () => {
    it('enumerates every branch domain', () => {
      expect(generateStaticParams()).toEqual([
        { domain: 'tacomagooners.com' },
        { domain: 'boisegooners.com' },
      ]);
    });
  });

  describe('FixturesPage', () => {
    it('renders the mixed real/deferred timeline with a next-fixture anchor', async () => {
      vi.mocked(getFixtureTiming).mockResolvedValue({
        nextFixtureId: 4,
        orderedIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        settledIds: [1, 2, 3],
      });

      const ui = await FixturesPage();
      const { getByText, getAllByTestId } = render(ui);

      // Settled block: 3 ids, SETTLED_REAL=2 -> first is deferred, last two real.
      expect(getByText('deferred-1-true')).toBeInTheDocument();
      expect(getByText('settled-2')).toBeInTheDocument();
      expect(getByText('settled-3')).toBeInTheDocument();

      // Next fixture (4) renders real, wrapped in the anchor.
      expect(getByText('unsettled-4')).toBeInTheDocument();
      expect(getAllByTestId('anchor')).toHaveLength(1);

      // Upcoming tail: 8 ids after the pivot (5..12), UPCOMING_REAL=8 ->
      // first 7 real, last (12) deferred.
      for (const id of [5, 6, 7, 8, 9, 10, 11]) {
        expect(getByText(`unsettled-${id}`)).toBeInTheDocument();
      }
      expect(getByText('deferred-12-false')).toBeInTheDocument();
    });

    it('renders the settled block with no anchor when there is no next fixture', async () => {
      vi.mocked(getFixtureTiming).mockResolvedValue({
        nextFixtureId: undefined,
        orderedIds: [1, 2, 3],
        settledIds: [1, 2, 3],
      });

      const ui = await FixturesPage();
      const { getByText, queryAllByTestId } = render(ui);

      expect(getByText('deferred-1-true')).toBeInTheDocument();
      expect(getByText('settled-2')).toBeInTheDocument();
      expect(getByText('settled-3')).toBeInTheDocument();
      expect(queryAllByTestId('anchor')).toHaveLength(0);
    });
  });
});

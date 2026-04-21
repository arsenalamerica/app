import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  DeferredFixtureCard,
  FixtureCardError,
  FixtureCardLoading,
  SettledFixtureCard,
  UnsettledFixtureCard,
} from '@/components';
import { branchData } from '@/data';
import {
  getFixtureTiming,
  SETTLED_REAL,
  UPCOMING_REAL,
} from '@/lib/data/fixtureTiming';
import fixturesData from '@/lib/sportmonks/fixtures.json';

// Enumerate the branch domains at build so Next prerenders a PPR shell per
// tenant. Each card still streams from the Data Cache through Suspense at
// request time — cached components don't inline into first-paint HTML.
export function generateStaticParams(): Array<{ domain: string }> {
  return Object.keys(branchData).map((domain) => ({ domain }));
}

export default async function FixturesPage() {
  if (fixturesData.length === 0) {
    return <p>No fixtures scheduled yet.</p>;
  }

  const { nextFixtureId, orderedIds, settledIds } = await getFixtureTiming();
  const settled = new Set(settledIds);

  // Pivot on the next upcoming fixture. Settled block comes first in reverse-
  // chronological order (most recent result at top); upcoming block follows
  // starting with the next fixture in chronological order.
  const pivot =
    nextFixtureId != null
      ? orderedIds.indexOf(nextFixtureId)
      : orderedIds.length;
  const upcoming = orderedIds.slice(pivot);
  const settledReversed = orderedIds.slice(0, pivot).reverse();

  const renderReal = (id: number) => {
    const Card = settled.has(id) ? SettledFixtureCard : UnsettledFixtureCard;
    return (
      <ErrorBoundary key={id} FallbackComponent={FixtureCardError}>
        <Suspense fallback={<FixtureCardLoading />}>
          <Card fixtureId={id} />
        </Suspense>
      </ErrorBoundary>
    );
  };

  const renderDeferred = (id: number) => (
    <DeferredFixtureCard key={id} fixtureId={id} settled={settled.has(id)} />
  );

  return (
    <>
      {settledReversed.map((id, i) =>
        i < SETTLED_REAL ? renderReal(id) : renderDeferred(id),
      )}
      {upcoming.map((id, i) =>
        i < UPCOMING_REAL ? renderReal(id) : renderDeferred(id),
      )}
    </>
  );
}

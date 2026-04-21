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
import { getFixtureTiming } from '@/lib/data/fixtureTiming';
import fixturesData from '@/lib/sportmonks/fixtures.json';

// Cards rendered with full data on first paint. All other slots render as
// skeleton placeholders that hydrate via IntersectionObserver on scroll.
const UPCOMING_REAL = 8;
const SETTLED_REAL = 2;

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

  // Pivot on the next upcoming fixture. Upcoming block starts at pivot
  // (chronological); settled block starts below it in reverse-chronological
  // order so natural scroll=0 puts the next match at the top of the page.
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
      {upcoming.map((id, i) =>
        i < UPCOMING_REAL ? renderReal(id) : renderDeferred(id),
      )}
      {settledReversed.map((id, i) =>
        i < SETTLED_REAL ? renderReal(id) : renderDeferred(id),
      )}
    </>
  );
}

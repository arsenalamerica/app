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
import { NextFixtureAnchor } from './NextFixtureAnchor';

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

  // Pivot on the next upcoming fixture. Settled block comes first in
  // chronological order (oldest result first); upcoming block follows starting
  // with the next fixture. Together the full list is a single ascending
  // timeline: oldest settled → most recent settled → next upcoming → last.
  const pivot =
    nextFixtureId != null
      ? orderedIds.indexOf(nextFixtureId)
      : orderedIds.length;
  const upcoming = orderedIds.slice(pivot);
  const settledOrdered = orderedIds.slice(0, pivot);

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
      {settledOrdered.map((id, i) =>
        i >= settledOrdered.length - SETTLED_REAL
          ? renderReal(id)
          : renderDeferred(id),
      )}
      {upcoming.map((id, i) => {
        if (i !== 0)
          return i < UPCOMING_REAL ? renderReal(id) : renderDeferred(id);
        const Card = settled.has(id)
          ? SettledFixtureCard
          : UnsettledFixtureCard;
        return (
          <NextFixtureAnchor key={id}>
            <ErrorBoundary FallbackComponent={FixtureCardError}>
              <Suspense fallback={<FixtureCardLoading />}>
                <Card fixtureId={id} />
              </Suspense>
            </ErrorBoundary>
          </NextFixtureAnchor>
        );
      })}
    </>
  );
}

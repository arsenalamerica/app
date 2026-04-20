import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  FixtureCardError,
  FixtureCardLoading,
  SettledFixtureCard,
  UnsettledFixtureCard,
} from '@/components';
import { branchData } from '@/data';
import { getFixtureTiming } from '@/lib/data/fixtureTiming';
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

  return (
    <>
      {orderedIds.map((id) => {
        const htmlId = id === nextFixtureId ? 'next-fixture' : undefined;
        const Card = settled.has(id)
          ? SettledFixtureCard
          : UnsettledFixtureCard;
        return (
          <ErrorBoundary key={id} FallbackComponent={FixtureCardError}>
            <Suspense fallback={<FixtureCardLoading />}>
              <Card fixtureId={id} htmlId={htmlId} />
            </Suspense>
          </ErrorBoundary>
        );
      })}
    </>
  );
}

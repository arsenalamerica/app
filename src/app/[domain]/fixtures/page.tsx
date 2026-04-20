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
import type { FixtureIndexEntry } from '@/lib/sportmonks/fixtures';
import fixturesData from '@/lib/sportmonks/fixtures.json';

const fixtures: FixtureIndexEntry[] = fixturesData;

// Enumerate the branch domains at build so Next prerenders a PPR shell per
// tenant — settled cards ship as static HTML in the build artifact instead of
// rendering fresh on every request.
export function generateStaticParams(): Array<{ domain: string }> {
  return Object.keys(branchData).map((domain) => ({ domain }));
}

export default async function FixturesPage() {
  if (fixtures.length === 0) {
    return <p>No fixtures scheduled yet.</p>;
  }

  const { nextFixtureId, settledIds } = await getFixtureTiming();
  const settled = new Set(settledIds);

  return (
    <>
      {fixtures.map(({ id }) => {
        const htmlId = id === nextFixtureId ? 'next-fixture' : undefined;
        // Settled cards are NOT wrapped in Suspense so their cached output
        // lands directly in the PPR shell at build; unsettled cards keep the
        // Suspense hole so live scores stream in at request time.
        return (
          <ErrorBoundary key={id} FallbackComponent={FixtureCardError}>
            {settled.has(id) ? (
              <SettledFixtureCard fixtureId={id} htmlId={htmlId} />
            ) : (
              <Suspense fallback={<FixtureCardLoading />}>
                <UnsettledFixtureCard fixtureId={id} htmlId={htmlId} />
              </Suspense>
            )}
          </ErrorBoundary>
        );
      })}
    </>
  );
}

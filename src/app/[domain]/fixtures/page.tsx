import { connection } from 'next/server';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  FixtureCardError,
  FixtureCardLoading,
  SettledFixtureCard,
  UnsettledFixtureCard,
} from '@/components';
import type { FixtureIndexEntry } from '@/lib/sportmonks/fixtures';
import fixturesData from '@/lib/sportmonks/fixtures.json';

const fixtures: FixtureIndexEntry[] = fixturesData;

// 24h past kickoff: match is settled — scores, lineups, and stats no longer change.
// Before this threshold the fixture is upcoming, live, or just-ended (still mutable).
const SETTLED_THRESHOLD_S = 86_400;

export default async function FixturesPage() {
  // connection() opts out of prerender so Date.now() is allowed. Without it,
  // Next 16 cache components error: "used Date.now() before accessing uncached data".
  await connection();
  const nowS = Math.floor(Date.now() / 1000);
  // fixtures.json is sorted by id for deterministic diffs — sort by kickoff here
  // so .find() returns the chronologically-next unsettled match, not just the
  // first one in id order.
  const nextFixtureId = [...fixtures]
    .sort((a, b) => a.kickoff - b.kickoff)
    .find(({ kickoff }) => kickoff > nowS - SETTLED_THRESHOLD_S)?.id;

  if (fixtures.length === 0) {
    return <p>No fixtures scheduled yet.</p>;
  }

  return (
    <>
      {fixtures.map(({ id, kickoff }) => {
        const isSettled = nowS - kickoff > SETTLED_THRESHOLD_S;
        const Card = isSettled ? SettledFixtureCard : UnsettledFixtureCard;
        const htmlId = id === nextFixtureId ? 'next-fixture' : undefined;
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

import { FixtureCardLoading } from '@/components';
import { computeFixtureOrder } from '@/lib/data/fixtureTiming';
import type { FixtureIndexEntry } from '@/lib/sportmonks/fixtures';
import fixturesData from '@/lib/sportmonks/fixtures.json';

const fixtures: FixtureIndexEntry[] = fixturesData;

// Mirrors page.tsx's DOM shape and keys (keyed by fixture id) so React
// reconciles position-by-id when the route content streams in.
export default function FixturesPageLoading() {
  const nowS = Math.floor(Date.now() / 1000);
  const { orderedIds, nextFixtureId } = computeFixtureOrder(fixtures, nowS);
  const pivot =
    nextFixtureId != null
      ? orderedIds.indexOf(nextFixtureId)
      : orderedIds.length;
  const upcoming = orderedIds.slice(pivot);
  const settledReversed = orderedIds.slice(0, pivot).reverse();

  return (
    <>
      {upcoming.map((id) => (
        <FixtureCardLoading key={id} />
      ))}
      {settledReversed.map((id) => (
        <FixtureCardLoading key={id} />
      ))}
    </>
  );
}

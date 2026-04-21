import { FixtureCardLoading } from '@/components';
import { computeFixtureOrder } from '@/lib/data/fixtureTiming';
import type { FixtureIndexEntry } from '@/lib/sportmonks/fixtures';
import fixturesData from '@/lib/sportmonks/fixtures.json';

const fixtures: FixtureIndexEntry[] = fixturesData;

// Mirrors page.tsx's DOM structure so the loading paint occupies the same
// vertical space and key order as the resolved page — no layout shift.
export default function FixturesPageLoading() {
  const nowS = Math.floor(Date.now() / 1000);
  const { orderedIds, nextFixtureId } = computeFixtureOrder(fixtures, nowS);
  const pivot =
    nextFixtureId != null
      ? orderedIds.indexOf(nextFixtureId)
      : orderedIds.length;
  const settledOrdered = orderedIds.slice(0, pivot);
  const upcoming = orderedIds.slice(pivot);

  return (
    <>
      {settledOrdered.map((id) => (
        <FixtureCardLoading key={id} />
      ))}
      {upcoming.map((id) => (
        <FixtureCardLoading key={id} />
      ))}
    </>
  );
}

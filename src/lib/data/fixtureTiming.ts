import { cacheLife, cacheTag } from 'next/cache';

import type { FixtureIndexEntry } from '@/lib/sportmonks/fixtures';
import fixturesData from '@/lib/sportmonks/fixtures.json';

const fixtures: FixtureIndexEntry[] = fixturesData;

// 24h past kickoff: match is settled — scores, lineups, and stats no longer
// change. Before this threshold the fixture is upcoming, live, or just-ended.
export const SETTLED_THRESHOLD_S = 86_400;

export type FixtureTiming = {
  nextFixtureId: number | undefined;
  // fixtures.json is sorted by id (for deterministic PR diffs from the sync
  // script). orderedIds is the same set re-sorted by kickoff so the page can
  // iterate it in chronological order.
  orderedIds: number[];
  settledIds: number[];
};

// Pure sync helper so loading.tsx can compute the same ordering without
// awaiting a cache read (the loading fallback must paint immediately).
export function computeFixtureOrder(
  fixtureList: FixtureIndexEntry[],
  nowS: number,
): FixtureTiming {
  const settledCutoff = nowS - SETTLED_THRESHOLD_S;
  const ordered = [...fixtureList].sort((a, b) => a.kickoff - b.kickoff);
  const orderedIds = ordered.map(({ id }) => id);
  const settledIds = ordered
    .filter(({ kickoff }) => kickoff < settledCutoff)
    .map(({ id }) => id);
  const nextFixtureId = ordered.find(
    ({ kickoff }) => kickoff > settledCutoff,
  )?.id;
  return { nextFixtureId, orderedIds, settledIds };
}

// Wraps Date.now() inside 'use cache' so the page body can stay prerender-
// eligible under Next 16 cacheComponents. The chosen cacheLife profile is the
// upper bound on how long it takes the Settled/Unsettled dispatch to move to
// the next match after a fixture crosses the 24h-settled threshold.
export async function getFixtureTiming(): Promise<FixtureTiming> {
  'use cache';
  cacheLife('hours');
  cacheTag('fixtures:timing');
  return computeFixtureOrder(fixtures, Math.floor(Date.now() / 1000));
}

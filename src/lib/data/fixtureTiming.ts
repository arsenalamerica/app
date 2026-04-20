import { cacheLife, cacheTag } from 'next/cache';

import type { FixtureIndexEntry } from '@/lib/sportmonks/fixtures';
import fixturesData from '@/lib/sportmonks/fixtures.json';

const fixtures: FixtureIndexEntry[] = fixturesData;

// 24h past kickoff: match is settled — scores, lineups, and stats no longer
// change. Before this threshold the fixture is upcoming, live, or just-ended.
export const SETTLED_THRESHOLD_S = 86_400;

export type FixtureTiming = {
  nextFixtureId: number | undefined;
  settledIds: number[];
};

// Wraps Date.now() inside 'use cache' so the page body can stay prerender-
// eligible under Next 16 cacheComponents. cacheLife('hours') means the
// Settled/Unsettled dispatch — and the #next-fixture anchor — re-evaluate at
// most hourly; acceptable given the 24h settlement threshold.
export async function getFixtureTiming(): Promise<FixtureTiming> {
  'use cache';
  cacheLife('hours');
  cacheTag('fixtures:timing');

  const nowS = Math.floor(Date.now() / 1000);
  const settledCutoff = nowS - SETTLED_THRESHOLD_S;

  const settledIds = fixtures
    .filter(({ kickoff }) => kickoff < settledCutoff)
    .map(({ id }) => id);

  // fixtures.json is sorted by id — sort by kickoff so .find() returns the
  // chronologically-next unsettled match, not just the lowest-id unsettled one.
  const nextFixtureId = [...fixtures]
    .sort((a, b) => a.kickoff - b.kickoff)
    .find(({ kickoff }) => kickoff > settledCutoff)?.id;

  return { nextFixtureId, settledIds };
}

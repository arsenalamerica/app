'use server';

import {
  getSettledFixtureById,
  getUnsettledFixtureById,
} from '@/lib/data/fixtures';
import type { FixtureEntity } from '@/lib/sportmonks';
import type { FixtureIndexEntry } from '@/lib/sportmonks/fixtures';
import fixturesData from '@/lib/sportmonks/fixtures.json';

const fixtures: FixtureIndexEntry[] = fixturesData;

export async function loadDeferredFixture(
  id: number,
  settled: boolean,
): Promise<FixtureEntity> {
  // Validate id against the static fixture index. fixture.id re-derives the
  // value from a trusted server-side source, breaking the taint chain from
  // the client-supplied parameter to the downstream fetch URL.
  const fixture = fixtures.find((f) => f.id === id);
  if (!fixture) throw new Error(`Unknown fixture id=${id}`);
  return settled
    ? getSettledFixtureById(fixture.id)
    : getUnsettledFixtureById(fixture.id);
}

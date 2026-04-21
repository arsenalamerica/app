'use server';

import {
  getSettledFixtureById,
  getUnsettledFixtureById,
} from '@/lib/data/fixtures';
import type { FixtureEntity } from '@/lib/sportmonks';

export async function loadDeferredFixture(
  id: number,
  settled: boolean,
): Promise<FixtureEntity> {
  return settled ? getSettledFixtureById(id) : getUnsettledFixtureById(id);
}

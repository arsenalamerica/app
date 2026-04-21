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
  try {
    return await (settled
      ? getSettledFixtureById(id)
      : getUnsettledFixtureById(id));
  } catch (err) {
    console.error('[loadDeferredFixture] fetch failed:', err);
    throw err;
  }
}

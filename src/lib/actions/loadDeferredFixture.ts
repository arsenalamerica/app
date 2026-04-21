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
    // Validate id before logging: server action args are user-controlled input,
    // so a direct log of `id` triggers CodeQL's log-injection rule (CWE-117).
    const safeId = Number.isInteger(id) && id > 0 ? id : Number.NaN;
    console.error('[loadDeferredFixture] failed for fixture', safeId, err);
    throw err;
  }
}

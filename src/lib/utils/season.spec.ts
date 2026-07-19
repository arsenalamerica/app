import { afterEach, describe, expect, it, vi } from 'vitest';

// season.ts resolves the window once at module load, so each case has to set the
// clock before a fresh import.
async function seasonAt(date: string) {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date(date));
  const { season } = await import('./season');
  return season;
}

describe('season', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it('rolls over on July 1, not August', async () => {
    // Regression: issue #182. A June-index cutoff left all of July pointed at
    // the season that had already finished, so no upcoming fixture existed.
    await expect(seasonAt('2026-07-01T00:00:00')).resolves.toEqual({
      start: '2026-07-01',
      end: '2027-06-30',
    });
  });

  it('uses the new season for the rest of July', async () => {
    await expect(seasonAt('2026-07-18T12:00:00')).resolves.toEqual({
      start: '2026-07-01',
      end: '2027-06-30',
    });
  });

  it('uses the previous season window in June', async () => {
    await expect(seasonAt('2026-06-30T12:00:00')).resolves.toEqual({
      start: '2025-07-01',
      end: '2026-06-30',
    });
  });

  it('holds the same window across the new calendar year', async () => {
    await expect(seasonAt('2027-02-14T12:00:00')).resolves.toEqual({
      start: '2026-07-01',
      end: '2027-06-30',
    });
  });
});

'use cache';

import { cacheLife, cacheTag } from 'next/cache';

import {
  type StandingEntity,
  type StandingRow,
  StandingsRowIncludeMissingError,
  smStandings,
} from '@/lib/sportmonks';
import { shite } from '@/lib/utils';

// The exact set of stat keys `LeagueTable` reads off `StandingEntity['stats']`.
// A row can pass the per-detail `hasDetailType` guard below (every present
// detail has a `type.code`) while still handing back too few details — an
// empty `details: []` is the extreme case, `.every()` on it is vacuously
// true. Casting `Object.fromEntries(...)` to `StandingEntity['stats']`
// without checking this would silently produce an incomplete stats object;
// the UI would then render `undefined` cells and `NaN` for goal difference
// rather than failing loudly. This list is what makes the completeness check
// possible without duplicating `StandingEntity['stats']` as a second source
// of truth for the key set.
const STANDING_STAT_KEYS: (keyof StandingEntity['stats'])[] = [
  'overall-matches-played',
  'overall-won',
  'overall-draw',
  'overall-lost',
  'overall-goals-for',
  'overall-goals-against',
  'home-matches-played',
  'home-won',
  'home-draw',
  'home-lost',
  'home-scored',
  'home-conceded',
  'away-matches-played',
  'away-won',
  'away-draw',
  'away-lost',
  'away-scored',
  'away-conceded',
  'goal-difference',
  'home-points',
  'away-points',
  'overall-points',
];

export async function getStandings(): Promise<StandingEntity[]> {
  cacheLife('hours');
  cacheTag('standings');

  const { data } = await smStandings({
    include: [
      ['participant', ['name', 'short_code', 'image_path'].join()].join(':'),
      'details.type',
      'form',
    ].join(';'),
  });

  return data.map(({ details, participant, ...rest }) => {
    if (participant == null) {
      throw new StandingsRowIncludeMissingError(rest.id, 'participant');
    }
    if (details == null || !details.every(hasDetailType)) {
      throw new StandingsRowIncludeMissingError(rest.id, 'details.type');
    }

    const stats = Object.fromEntries(
      details.map(({ type, value }) => [type.code, value]),
    ) as StandingEntity['stats'];

    const missingStatKey = STANDING_STAT_KEYS.find((key) => !(key in stats));
    if (missingStatKey) {
      throw new StandingsRowIncludeMissingError(
        rest.id,
        `details.type:${missingStatKey}`,
      );
    }

    return {
      ...rest,
      participant: {
        ...participant,
        name: shite(participant.name),
        short_code: shite(participant.short_code),
      },
      stats,
    };
  });
}

function hasDetailType(
  detail: NonNullable<StandingRow['details']>[number],
): detail is { value: number; type: { code: string } } {
  return detail.type?.code != null;
}

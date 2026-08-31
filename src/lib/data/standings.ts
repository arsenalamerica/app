'use cache';

import { cacheLife, cacheTag } from 'next/cache';

import {
  type StandingEntity,
  type StandingRow,
  StandingsRowIncludeMissingError,
  smStandings,
} from '@/lib/sportmonks';
import { shite } from '@/lib/utils';

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

    return {
      ...rest,
      participant: {
        ...participant,
        name: shite(participant.name),
        short_code: shite(participant.short_code),
      },
      stats: Object.fromEntries(
        details.map(({ type, value }) => [type.code, value]),
      ) as StandingEntity['stats'],
    };
  });
}

function hasDetailType(
  detail: NonNullable<StandingRow['details']>[number],
): detail is { value: number; type: { code: string } } {
  return detail.type?.code != null;
}

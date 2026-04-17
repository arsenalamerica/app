'use cache';

import { cacheLife, cacheTag } from 'next/cache';

import { type StandingEntity, smStandings } from '@/lib/sportmonks';
import { shite } from '@/lib/utils';

export async function getStandings(): Promise<StandingEntity[]> {
  cacheLife('hours');
  cacheTag('standings');
  try {
    const { data } = await smStandings({
      include: [
        ['participant', ['name', 'short_code', 'image_path'].join()].join(':'),
        'details.type',
        'form',
      ].join(';'),
    });

    const cleanData = data.map(({ details, participant, ...rest }) => ({
      ...rest,
      participant: {
        ...participant,
        name: shite(participant.name),
        short_code: shite(participant.short_code),
      },
      stats: Object.fromEntries(
        details.map(({ type, value }) => [type.code, value]),
      ),
    }));

    return cleanData as unknown as StandingEntity[];
  } catch (error) {
    console.error(error);
    throw error;
  }
}

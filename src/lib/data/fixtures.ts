'use cache';

import { cacheLife, cacheTag } from 'next/cache';

import { type FixtureEntity, smFixtures, smTvStation } from '@/lib/sportmonks';
import { shite } from '@/lib/utils';

const USA_COUNTRY_ID = 3483;

function applyShite(fixture: FixtureEntity): FixtureEntity {
  return {
    ...fixture,
    participants: fixture.participants?.map((p) => ({
      ...p,
      name: shite(p.name),
    })),
    venue: fixture.venue
      ? { ...fixture.venue, name: shite(fixture.venue.name) }
      : fixture.venue,
  };
}

export async function getFixtures(): Promise<FixtureEntity[]> {
  cacheLife('minutes');
  cacheTag('fixtures');
  try {
    const params = {
      include: [
        'league:name,image_path',
        'participants:name,short_code,image_path',
        'scores',
        'state',
        'periods',
        'venue:name,city_name',
      ].join(';'),
      sort_by: 'starting_at',
      order: 'asc',
      per_page: '50',
    };

    const all: FixtureEntity[] = [];
    let page = 1;
    const MAX_PAGES = 2;

    while (page <= MAX_PAGES) {
      const { data, pagination } = await smFixtures(undefined, {
        ...params,
        page: String(page),
      });
      all.push(...data.map(applyShite));
      if (!pagination.has_more) break;
      page += 1;
    }

    return all;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getNextFixture(): Promise<FixtureEntity[]> {
  cacheLife('minutes');
  cacheTag('next-fixture');
  try {
    const { data } = await smFixtures(undefined, {
      include: [
        'league:name,image_path',
        'participants.sidelined.player',
        'scores',
        'state',
        'lineups.player',
        'periods',
        'tvStations',
        // 'metadata.type',
        // 'referees',
        'venue:name,city_name',
      ].join(';'),
      // All active or upcoming fixture states: https://docs.sportmonks.com/football/tutorials-and-guides/tutorials/includes/states#state-interactions
      filters: 'fixtureStates:1,2,3,22,4,6,21,7,25,9',
      sort_by: 'starting_at',
      order: 'asc',
      per_page: '1',
    });

    const tvstations = await Promise.all(
      data[0].tvstations
        .filter(({ country_id }) => country_id === USA_COUNTRY_ID)
        .map(async (tvstation) => {
          const { data } = await smTvStation(tvstation.tvstation_id);
          return { ...tvstation, ...data };
        }),
    );
    data[0].tvstations = tvstations;

    return data.map(applyShite);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

'use cache';

import { cacheLife, cacheTag } from 'next/cache';

import {
  type FixtureEntity,
  smFixture,
  smFixtures,
  smTvStation,
} from '@/lib/sportmonks';
import { shite } from '@/lib/utils';

const USA_COUNTRY_ID = 3483;

const FIXTURE_INCLUDES = [
  'league:name,image_path',
  'participants:name,short_code,image_path',
  'scores',
  'state',
  'periods',
  'venue:name,city_name',
].join(';');

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

async function fetchFixtureWithRewrite(id: number): Promise<FixtureEntity> {
  const { data } = await smFixture(id, { include: FIXTURE_INCLUDES });
  return applyShite(data);
}

export async function getSettledFixtureById(
  id: number,
): Promise<FixtureEntity> {
  cacheLife('max');
  cacheTag(`fixture:${id}`);
  return fetchFixtureWithRewrite(id);
}

export async function getUnsettledFixtureById(
  id: number,
): Promise<FixtureEntity> {
  cacheLife('minutes');
  cacheTag(`fixture:${id}`);
  return fetchFixtureWithRewrite(id);
}

export async function getNextFixture(): Promise<FixtureEntity[]> {
  cacheLife('minutes');
  cacheTag('next-fixture');

  const { data } = await smFixtures({
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

  if (data.length === 0) {
    throw new Error(
      'getNextFixture: no fixture matched active/upcoming state filter',
    );
  }

  const settled = await Promise.allSettled(
    data[0].tvstations
      .filter(({ country_id }) => country_id === USA_COUNTRY_ID)
      .map(async (tvstation) => {
        const { data: stationData } = await smTvStation(tvstation.tvstation_id);
        return { ...tvstation, ...stationData };
      }),
  );
  data[0].tvstations = settled.flatMap((r) =>
    r.status === 'fulfilled' ? [r.value] : [],
  );

  return data.map(applyShite);
}

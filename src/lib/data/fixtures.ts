import { type FixtureEntity, smFixtures, smTvStation } from '@/lib/sportmonks';
import { season } from '@/lib/utils';

const USA_COUNTRY_ID = 3483;

export async function getFixtures(): Promise<FixtureEntity[]> {
  try {
    const { data, ...rest } = await smFixtures(undefined, {
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
      per_page: ['50'].join(';'),
    });

    let data2: FixtureEntity[] = [];
    let rest2 = {};

    if (rest.pagination.has_more) {
      const { data, ...rest } = await smFixtures(undefined, {
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
        per_page: ['50'].join(';'),
        page: ['2'].join(';'),
      });

      data2 = data;
      rest2 = rest;
    }

    console.info(rest);
    console.info(rest2);

    return [...data, ...data2];
  } catch (error) {
    console.error(error);
    return [
      {
        season,
        status: 500,
        error,
      },
    ] as unknown as FixtureEntity[];
  }
}

export async function getNextFixture(): Promise<FixtureEntity[]> {
  try {
    const { data, ...rest } = await smFixtures(undefined, {
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
      filters: ['fixtureStates:1,2,3,22,4,6,21,6,7,25,9'].join(';'),
      sort_by: 'starting_at',
      order: 'asc',
      per_page: ['1'].join(';'),
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

    console.info(rest);

    return data;
  } catch (error) {
    console.error(error);
    return [
      {
        season,
        status: 500,
        error,
      },
    ] as unknown as FixtureEntity[];
  }
}

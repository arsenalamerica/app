import { season } from '@/lib/utils';

import {
  ARSENAL_TEAM_ID,
  type EntityBase,
  type Sportmonks,
  sportmonks,
} from './sportmonks';

type Participant = {
  short_code: string;
  meta: { location: string };
} & EntityBase;

// https://docs.sportmonks.com/football/tutorials-and-guides/tutorials/includes/states
export const REGULAR_TIME_ACTIVE_STATES = [
  'INPLAY_1ST_HALF',
  'HT',
  'INPLAY_2ND_HALF',
];

export type FixtureEntity = {
  id: number;
  league: EntityBase;
  name: string;
  participants: Participant[];
  starting_at_timestamp: number;
  starting_at: string;
  state_id: number;
  state: {
    id: number;
    state: string;
    name: string;
    short_name: string;
    developer_name: string;
  };
  periods: {
    id: number;
    fixture_id: number;
    type_id: number;
    started: number;
    ended: number;
    counts_from: number;
    ticking: boolean;
    sort_order: number;
    description: string;
    time_added: number;
    period_length: number;
    minutes: number;
    seconds: number;
    has_timer: boolean;
  }[];
  scores: {
    score: { goals: number; participant: string };
    description: string;
  }[];
  tvstations: { tvstation_id: number; country_id: number }[];
  venue: EntityBase;
};

export type FixturesEndpoint = {
  data: FixtureEntity[];
} & Sportmonks;

export async function smFixtures(
  _id: string | undefined,
  query: object,
): Promise<FixturesEndpoint> {
  return sportmonks
    .url(`/fixtures/between/${season.start}/${season.end}/${ARSENAL_TEAM_ID}`)
    .query(query)
    .get() as Promise<FixturesEndpoint>;
}

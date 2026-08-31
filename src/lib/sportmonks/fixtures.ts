import { season } from '@/lib/utils';

import {
  ARSENAL_TEAM_ID,
  type EntityBase,
  type Sportmonks,
  sportmonksFetch,
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
  // Absent unless the `tvStations` include was requested, which only
  // getNextFixture does — FIXTURE_INCLUDES omits it, so every fixture from
  // getSettledFixtureById / getUnsettledFixtureById has this undefined.
  tvstations?: { tvstation_id: number; country_id: number }[];
  // Present but `null` when Sportmonks has no venue assigned. Verified across
  // the current season: the key is always there, and fixtures 19872591 and
  // 19872640 (Champions League, pre-draw) return null. Nullable, not optional.
  venue: EntityBase | null;
  has_odds?: boolean;
  has_premium_odds?: boolean;
  placeholder?: boolean;
};

export type FixturesEndpoint = {
  data: FixtureEntity[];
} & Sportmonks;

export type FixtureEndpoint = {
  data: FixtureEntity;
} & Sportmonks;

export type FixtureIndexEntry = {
  id: number;
  kickoff: number;
};

export async function smFixtures(
  query: Record<string, string>,
): Promise<FixturesEndpoint> {
  return sportmonksFetch<FixturesEndpoint>(
    `/fixtures/between/${season.start}/${season.end}/${ARSENAL_TEAM_ID}`,
    query,
  );
}

export async function smFixture(
  id: number,
  query: Record<string, string> = {},
): Promise<FixtureEndpoint> {
  return sportmonksFetch<FixtureEndpoint>(`/fixtures/${id}`, query);
}

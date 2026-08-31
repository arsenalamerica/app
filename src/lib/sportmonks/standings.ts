import seasons from './seasons.json';
import { type Sportmonks, sportmonksFetch } from './sportmonks';

/**
 * A standings row that answers the envelope check (issue #340's
 * `SportmonksNotFoundError`) but is missing a per-row include the caller
 * requested — `participant` or `details[].type` absent or nullish. No live
 * occurrence has been observed; this exists so a row-level omission fails
 * loudly with the offending row and include named, rather than surfacing as
 * a raw `TypeError` several frames downstream on `/table` (issue #345, same
 * failure shape as #337). `this.name` is set so it groups on its own in
 * Sentry, same as `SportmonksNotFoundError`.
 */
export class StandingsRowIncludeMissingError extends Error {
  constructor(
    readonly rowId: number,
    readonly include: string,
  ) {
    super(`Standings row ${rowId} is missing the "${include}" include`);
    this.name = 'StandingsRowIncludeMissingError';
  }
}

type StandingBase = {
  id: number;
  participant_id: number;
  sport_id: number;
  league_id: number;
  season_id: number;
  stage_id: number;
  group_id: number;
  round_id: number;
  standing_rule_id: number;
  position: number;
  result: string;
  points: number;
  form: [];
};

export type StandingParticipant = {
  id: number;
  sport_id: number;
  country_id: number;
  venue_id: number;
  name: string;
  short_code: string;
  image_path: string;
};

export type StandingStats = {
  'overall-matches-played': number;
  'overall-won': number;
  'overall-draw': number;
  'overall-lost': number;
  'overall-goals-for': number;
  'overall-goals-against': number;
  'home-matches-played': number;
  'home-won': number;
  'home-draw': number;
  'home-lost': number;
  'home-scored': number;
  'home-conceded': number;
  'away-matches-played': number;
  'away-won': number;
  'away-draw': number;
  'away-lost': number;
  'away-scored': number;
  'away-conceded': number;
  'goal-difference': number;
  'home-points': number;
  'away-points': number;
  'overall-points': number;
};

/**
 * Raw shape of a row as Sportmonks returns it for the `participant` and
 * `details.type` includes this app requests — before `getStandings` cleans it
 * up. `participant` and `details` are declared here even though the includes
 * were requested, because a per-row omission is exactly the failure this
 * module guards against; see `StandingsRowIncludeMissingError`.
 */
export type StandingRow = StandingBase & {
  participant?: StandingParticipant | null;
  details?: { value: number; type: { code: string } | null }[] | null;
};

/**
 * Cleaned row shape returned by `getStandings`: `details` flattened into
 * `stats`, `participant` guaranteed present. `getStandings` is the only
 * producer, and it throws `StandingsRowIncludeMissingError` rather than ever
 * returning a row that does not match this shape.
 */
export type StandingEntity = StandingBase & {
  participant: StandingParticipant;
  stats: StandingStats;
};

export type StandingsEndpoint = {
  data: StandingRow[];
} & Sportmonks;

export async function smStandings(
  query: Record<string, string>,
): Promise<StandingsEndpoint> {
  return sportmonksFetch<StandingsEndpoint>(
    `/standings/seasons/${seasons.premierLeague.seasonId}`,
    query,
  );
}

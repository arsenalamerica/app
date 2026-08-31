---
name: sportmonks
description: >-
  Sportmonks Football API v3 reference for this app — base URLs, auth, endpoint routes,
  include and filter syntax, sorting and pagination, and the known league/team/type IDs.
  Also covers how this repo talks to the API and the licensing rule that constrains what
  may be committed.

  Use when adding or changing a Sportmonks call, choosing includes or filters, debugging a
  4xx from the API, working in `src/lib/sportmonks/` or `src/lib/data/`, or touching the
  fixture and season sync scripts.

  Trigger phrases include "Sportmonks", "MONK_TOKEN", "fixture", "fixtures", "livescore",
  "standings", "topscorers", "squad", "lineups", "include", "season id", "team id",
  "league id", "tv station"
---

# Sportmonks Football API v3

Reference verified against `https://docs.sportmonks.com/v3/llms-full.txt`. When something here
disagrees with the live docs, the live docs win — say so rather than working around it.

## Base URLs

```
Football:  https://api.sportmonks.com/v3/football
Core:      https://api.sportmonks.com/v3/core
```

The auth docs page also shows `https://api.sportmonks.com/api/v3/`. Every route in the docs'
own examples uses the `/v3/football` form, which is what `SPORTMONKS_BASE` in
`src/lib/sportmonks/sportmonks.ts` uses. Stay on that form.

## Auth

Two equivalent methods; either or both may be used.

| Method | Form |
| --- | --- |
| Header (**this repo**) | `Authorization: YOUR_TOKEN` — no `Bearer` prefix |
| Query param | `?api_token=YOUR_TOKEN` |

This repo deliberately uses the header. Do not switch to `api_token` — a token in a URL leaks
into access logs, proxies, and error messages.

Docs: <https://docs.sportmonks.com/football/welcome/authentication>

**A malformed token returns an opaque 401.** `Headers` stringifies an undefined value to the
literal `"undefined"`, which Sportmonks rejects with no useful detail. That is why
`sportmonksFetch` guards `MONK_TOKEN` explicitly before building the request rather than letting
the API answer. See `docs/adr/006-varlock-env-management.md`.

## Endpoints

All paths are relative to the football base URL unless marked Core.

### Search

```
GET /players/search/{query}
GET /teams/search/{query}
GET /leagues/search/{query}
GET /seasons/search/{query}
GET /fixtures/search/{query}
```

### Players, teams, leagues, seasons

```
GET /players/{id}
GET /players/latest
GET /teams/{id}
GET /leagues
GET /leagues/{id}
GET /leagues/live
GET /leagues/countries/{country_id}
GET /leagues/date/{date}
GET /leagues/teams/{team_id}
GET /leagues/teams/{team_id}/current
GET /seasons/{id}
GET /seasons/teams/{team_id}
GET /seasons/{season_id}/brackets
GET /venues/{id}
GET /coaches/{id}
GET /referees/{id}
```

`GET /leagues/{id}?include=currentSeason` is how `scripts/sync-seasons.mjs` resolves the live
Premier League season ID.

### Squads

```
GET /squads/teams/{team_id}
GET /squads/seasons/{season_id}/teams/{team_id}
```

### Fixtures

```
GET /fixtures
GET /fixtures/{id}
GET /fixtures/multi/{id,id,id}
GET /fixtures/date/{date}                                 # YYYY-MM-DD
GET /fixtures/between/{start}/{end}
GET /fixtures/between/{start}/{end}/{team_id}
GET /fixtures/head-to-head/{team1_id}/{team2_id}
GET /fixtures/latest                                      # updated within the last 10 seconds
GET /fixtures/upcoming/tv-stations/{tv_station_id}
GET /fixtures/past/tv-stations/{tv_station_id}
GET /fixtures/upcoming/markets/{market_id}
```

### Livescores

```
GET /livescores
GET /livescores/inplay
GET /livescores/latest
```

### Standings

```
GET /standings/seasons/{season_id}
GET /standings/live/leagues/{league_id}
GET /standings/rounds/{round_id}
```

### Topscorers

```
GET /topscorers/seasons/{season_id}
```

### TV stations

```
GET /tv-stations
GET /tv-stations/{tv_station_id}
```

### States and types

```
GET /states
GET /states/{id}
GET /core/types            # Core API
GET /core/types/{id}       # Core API
```

States and types are effectively static. Resolve `state_id` / `type_id` locally rather than
adding `state` / `.type` includes to every request when payload size matters.

## Request syntax

| Token | Meaning | Example |
| --- | --- | --- |
| `include=` | Include relations | `include=lineups` |
| `;` | Ends a (nested) relation, start the next | `include=lineups;events;participants` |
| `:` | Field selection **on an include** | `include=participants:name,short_code,image_path` |
| `.` | Nested include | `include=events.player.country` |
| `,` | Separates selected fields or filter IDs | `include=events:minute,player_name` |
| `select=` | Field selection on the **base entity** | `select=name` |
| `filters=` | Filter the request | `filters=eventTypes:15` |

Includes are semicolon-separated, **not** comma-separated — commas were the v2 syntax.

### Common includes

```
participants       the two teams
scores             current and final scoreline
state              match state (NS/LIVE/HT/FT/AET/PEN)
league             league name and ID
round              gameweek/matchday
events             goals, cards, substitutions
lineups            starting XI and bench
statistics         team stats (shots, possession, corners)
periods            first-half / second-half breakdown
venue              stadium info
tvStations         broadcasters
player             full player object (nest inside squad/lineup)
position           player position
detailedPosition   more granular position
```

`lineups.details` and `periods.statistics` multiply in size across many concurrent fixtures.
Reach for them deliberately.

### Filters

`key:value`, comma-separated IDs.

```
fixtureLeagues:{league_id}
fixtureStates:{state_id,state_id}       # 2 = 1st half, 22 = 2nd half
fixtureStatisticTypes:{type_ids}
eventTypes:{type_ids}
seasonTopscorerTypes:{type_id}
```

The full state ID list is not in the API reference — use `GET /states`, or
<https://docs.sportmonks.com/football/tutorials-and-guides/tutorials/includes/states>.

### Sorting and pagination

```
?sortBy=starting_at&order=desc&page=1&per_page=25
```

- **`sortBy`** is the parameter name — camelCase. `sort_by` is **not** recognised and is silently
  ignored, leaving default ordering in place. Supported fields today: `starting_at`, `name`.
- `order` is `asc` or `desc`.
- `per_page` defaults to `25`, maximum `50`.
- Offset pagination is capped: a request where `(page - 1) × per_page` exceeds `20,000` is
  rejected with a 4xx. At `per_page=50` that is page 401.
- **Cursor pagination is the recommended form** (added 2026-06-05). Responses carry
  `pagination.next_cursor`; pass it back as `?cursor=`, repeating while `has_more` is true. The
  page-number method and `next_page` remain supported for existing integrations.

## Known IDs

| Thing | ID | Source |
| --- | --- | --- |
| Arsenal team | `19` | `ARSENAL_TEAM_ID`, `src/lib/sportmonks/sportmonks.ts` |
| USA country | `3483` | `USA_COUNTRY_ID`, `src/lib/data/fixtures.ts` |
| Premier League | `8` | league |
| Champions League | `2` | league |
| La Liga / Bundesliga / Serie A / Ligue 1 | `564` / `82` / `384` / `301` | leagues |
| Topscorer types | goals `208`, assists `209`, yellow cards `84` | `seasonTopscorerTypes` |

**Never hardcode a season ID.** The live Premier League season lives in
`src/lib/sportmonks/seasons.json` and is refreshed by `scripts/sync-seasons.mjs`.

## In this repo

- **`sportmonksFetch` in `src/lib/sportmonks/sportmonks.ts` is the only path to the API.** Never
  call `fetch` against Sportmonks directly. Endpoint wrappers live beside it: `fixtures.ts`,
  `standings.ts`, `tv-station.ts`.
- **Every response is enveloped.** The `Sportmonks` type carries `rate_limit`, `pagination`,
  `subscription`, and `timezone` alongside `data`.
- **`MONK_TOKEN` comes from varlock's typed `ENV`.** It resolves to an **empty string** under
  `test` by design, so an unmocked test trips the guard instead of reaching the real API. Mock the
  calling module — do not set a fake token.
- **Licensing: this repo is public.** Never commit raw Sportmonks payloads — scores, lineups,
  events, stats. `fixtures.json` holds `{ id, kickoff }` only, which is the schedule and not
  licensed match data. Rationale: `docs/adr/005-fixture-index-and-state-aware-caching.md`.
- **Caching lives in `src/lib/data/`, not in the client.** `getSettledFixtureById` /
  `getUnsettledFixtureById` use `'use cache'` with `cacheLife('max')` and `cacheLife('minutes')`
  respectively, keyed on fixture ID alone so the Vercel Data Cache entry is shared across
  tenants. Adding a parameter to those signatures breaks that sharing. See ADR-005.
- **`seasons.json` and `fixtures.json` are owned by `scripts/sync-*.mjs`.** Never hand-edit them;
  the PR-conflict auto-resolver also opts both out of structural merge (`-merge`, written to
  `.git/info/attributes` at CI runtime by `.github/scripts/pr-conflict-rebase.sh`) because merging
  two regenerated snapshots produces a list that was never fetched from the API. See `.github/CLAUDE.md` and
  `docs/adr/008-mergiraf-conflict-auto-resolution.md`.

## API behavior worth knowing

- **Post-match reconciliation.** Sportmonks corrects stats and backfills delayed lineups after the
  final whistle. This is why ADR-005 waits 24 hours past kickoff before treating a fixture as
  settled and caching it with `cacheLife('max')`.
- **Retroactive corrections to settled fixtures do happen**, rarely. A `cacheLife('max')` entry
  will not pick one up; `cacheTag('fixture:${id}')` is the invalidation hook.
- **Rate limit state rides in every response** under `rate_limit` (`remaining`,
  `resets_in_seconds`, `requested_entity`). It is per requested entity, not global.

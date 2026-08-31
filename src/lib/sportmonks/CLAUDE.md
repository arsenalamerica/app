# src/lib/sportmonks/ — Sportmonks API client

Thin typed wrappers around the Sportmonks Football API v3. For endpoint routes, include and
filter syntax, sorting, pagination, and known IDs, use the **`sportmonks` skill**
(`.claude/skills/sportmonks/SKILL.md`). This file holds the repo rules; the skill holds the API
surface. Neither restates the other.

## Rules

- **`sportmonksFetch` in `sportmonks.ts` is the only path to the API from `src/`.** Endpoint
  wrappers (`fixtures.ts`, `standings.ts`, `tv-station.ts`) go through it. Never call `fetch`
  against Sportmonks directly from app code. `scripts/sync-*.mjs` are the one exception, for
  reasons documented in `scripts/CLAUDE.md`.
- **`sportmonksFetch` throws `SportmonksNotFoundError` on a 200 with no `data` key.** Sportmonks
  does not 404 a missing or unlicensed entity, so that is the only signal it is gone. Do not
  relax the check to truthiness or to the `message` field — an empty collection returns `data: []`
  with the same generic message. See `docs/adr/011-fixture-index-sync-hardening.md`.
- **A new endpoint wrapper must be re-exported from `index.ts`**, and its endpoint type exported
  too. `src/lib/data/` imports from the `@/lib/sportmonks` barrel, so a wrapper that is not
  re-exported is unreachable from the data layer. (`TvStationEndpoint` in `tv-station.ts` is
  currently unexported, unlike its siblings.)
- **No caching here.** `'use cache'`, `cacheLife`, and `cacheTag` belong in `src/lib/data/`.
  This layer is transport plus types. Note that `src/lib/data/fixtures.ts` declares `'use cache'`
  at **file** scope, so every export there is cached — an uncacheable helper cannot be added to
  that file. See `docs/adr/005-fixture-index-and-state-aware-caching.md`.
- **`MONK_TOKEN` resolves to an empty string under `test`** by design, so the guard in
  `sportmonksFetch` fires instead of a test reaching the real API. Mock the calling module.
  The one exception is a test of `sportmonksFetch` itself, which mocks the `varlock/env` seam to
  reach the branches below the guard — see `sportmonks.spec.ts`. See
  `.claude/rules/file-env-schema.md`.
- **`fixtures.json` and `seasons.json` are generated.** `scripts/sync-fixtures.mjs` and
  `scripts/sync-seasons.mjs` write them; the cron workflows in `.github/workflows/` are what open
  the PR. Never hand-edit either file, and see `.github/CLAUDE.md` for the merge-driver opt-out
  that keeps them out of structural conflict resolution.
- **This repo is public — never commit raw Sportmonks payloads.** `fixtures.json` carries
  `{ id, kickoff }` only. Widening it is a licensing decision, not a refactor. See ADR-005.

## Response envelope

Every endpoint returns `{ data }` intersected with the `Sportmonks` type in `sportmonks.ts`
(`rate_limit`, `pagination`, `subscription`, `timezone`). New endpoint wrappers should follow
that shape rather than typing `data` alone.

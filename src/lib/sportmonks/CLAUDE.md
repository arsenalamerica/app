# src/lib/sportmonks/ — Sportmonks API client

Thin typed wrappers around the Sportmonks Football API v3. For endpoint routes, include and
filter syntax, sorting, pagination, and known IDs, use the **`sportmonks` skill**
(`.agents/skills/sportmonks/SKILL.md`) — it is the reference, and this file does not repeat it.

## Rules

- **`sportmonksFetch` in `sportmonks.ts` is the only path to the API.** Endpoint wrappers
  (`fixtures.ts`, `standings.ts`, `tv-station.ts`) go through it. Never call `fetch` against
  Sportmonks directly, from app code or from a test.
- **No caching here.** `'use cache'`, `cacheLife`, and `cacheTag` belong in `src/lib/data/`.
  This layer is transport plus types. See `docs/adr/005-fixture-index-and-state-aware-caching.md`.
- **`MONK_TOKEN` resolves to an empty string under `test`** by design, so the guard in
  `sportmonksFetch` fires instead of a test reaching the real API. Mock the calling module;
  do not set a fake token. See `.claude/rules/file-env-schema.md`.
- **`fixtures.json` and `seasons.json` are generated.** `scripts/sync-fixtures.mjs` and
  `scripts/sync-seasons.mjs` own them and open PRs on change. Never hand-edit either.
- **This repo is public — never commit raw Sportmonks payloads.** `fixtures.json` carries
  `{ id, kickoff }` only. Widening it is a licensing decision, not a refactor. See ADR-005.

## Response envelope

Every endpoint returns `{ data }` intersected with the `Sportmonks` type in `sportmonks.ts`
(`rate_limit`, `pagination`, `subscription`, `timezone`). New endpoint wrappers should follow
that shape rather than typing `data` alone.

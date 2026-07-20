# scripts/

Standalone Node.js scripts for scheduled data syncing. Run via `yarn sync:*` or from GitHub Actions cron workflows.

## sync-seasons.mjs

Fetches the current Premier League season ID from the Sportmonks `/leagues/{id}` endpoint and updates `src/lib/sportmonks/seasons.json`. Requires `MONK_TOKEN`, supplied by varlock from 1Password (see `.env.schema`).

- Run locally: `yarn sync:seasons` (wrapped in `varlock run --`, which injects the token)
- Automated: `.github/workflows/sync-seasons.yml` (monthly cron)
- Exits 0 whether or not the file changed; non-zero on API errors

Uses native Node.js `fetch` and `fs/promises` — no extra dependencies.

## sync-fixtures.mjs

Fetches the full Arsenal fixture list for the current season from Sportmonks `/fixtures/between/{start}/{end}/{teamId}` and updates `src/lib/sportmonks/fixtures.json` with just `{ id, kickoff }` per fixture (licensing-safe, public-repo friendly). See `docs/adr/005-fixture-index-and-state-aware-caching.md` for the full rationale. Requires `MONK_TOKEN`, supplied by varlock from 1Password (see `.env.schema`).

- Run locally: `yarn sync:fixtures` (wrapped in `varlock run --`, which injects the token)
- Automated: `.github/workflows/sync-fixtures.yml` (daily cron)
- Exits 0 whether or not the file changed; non-zero on API errors; no-op when content matches disk

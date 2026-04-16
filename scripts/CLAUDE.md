# scripts/

Standalone Node.js scripts for scheduled data syncing. Run via `yarn sync:*` or from GitHub Actions cron workflows.

## sync-seasons.mjs

Fetches the current Premier League season ID from the Sportmonks `/leagues/{id}` endpoint and updates `src/lib/sportmonks/seasons.json`. Requires `MONK_TOKEN` env var.

- Run locally: `MONK_TOKEN=<token> yarn sync:seasons`
- Automated: `.github/workflows/sync-seasons.yml` (monthly cron)
- Exits 0 whether or not the file changed; non-zero on API errors

Uses native Node.js `fetch` and `fs/promises` — no extra dependencies.

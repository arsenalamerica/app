# scripts/

Standalone Node.js scripts for scheduled data syncing. Run via `yarn sync:*` or from GitHub Actions cron workflows.

For the Sportmonks routes, includes, and filters these scripts call, see the `sportmonks` skill
(`.agents/skills/sportmonks/SKILL.md`).

Both scripts call `fetch` against Sportmonks directly rather than going through
`src/lib/sportmonks/sportmonks.ts`. That is deliberate — they are standalone Node ESM and read
`process.env.MONK_TOKEN`, so they cannot import a module that depends on `varlock/env`. The cost is
that the base URL, the auth header, and the team/league IDs are duplicated here; the skill lists
every place that has to change together.

## sync-seasons.mjs

Fetches the current Premier League season ID from Sportmonks and updates `src/lib/sportmonks/seasons.json`. Requires `MONK_TOKEN`, supplied by varlock from 1Password (see `.env.schema`).

- Run locally: `yarn sync:seasons` (wrapped in `varlock run --`, which injects the token)
- Automated: `.github/workflows/sync-seasons.yml` (monthly cron)
- Exits 0 whether or not the file changed; non-zero on API errors

Uses native Node.js `fetch` and `fs/promises` — no extra dependencies.

## sync-fixtures.mjs

Fetches the full Arsenal fixture list for the current season from Sportmonks and updates `src/lib/sportmonks/fixtures.json` with just `{ id, kickoff }` per fixture (licensing-safe, public-repo friendly). See `docs/adr/005-fixture-index-and-state-aware-caching.md` for the full rationale. Requires `MONK_TOKEN`, supplied by varlock from 1Password (see `.env.schema`).

- Run locally: `yarn sync:fixtures` (wrapped in `varlock run --`, which injects the token)
- Automated: `.github/workflows/sync-fixtures.yml` (daily cron)
- Exits 0 whether or not the file changed; non-zero on API errors; no-op when content matches disk
- Paginates at 50/page, capped at `MAX_PAGES = 20` so a pagination bug cannot loop forever
- Skips any fixture with `placeholder: true` (`isPlaceholderFixture`) — a provisional id Sportmonks assigns before a competition draw resolves and later deletes and reissues. Then validates every surviving id against `/fixtures/{id}` (`fixtureIdResolves`) before it's written; a dead id answers 200 with no `data` key, so the check is key-presence, not truthiness. See `docs/adr/011-fixture-index-sync-hardening.md`.
- Skips the write when Sportmonks returns zero fixtures over a non-empty committed file
  (`isEmptyOverwrite`) — treated as an upstream anomaly, not a schedule change, and still exits 0

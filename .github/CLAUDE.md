# .github/CLAUDE.md

## Composite Action

Config: `.github/actions/setup/action.yml`

Shared setup used by all CI jobs after checkout: Node (from `.nvmrc`), corepack enable, yarn cache restore, `yarn install --immutable`.

Note: `actions/checkout` must remain in each job directly — local composite actions can only be resolved after the repo is checked out.

Note: yarn caching is handled explicitly in the composite action (not via `actions/setup-node`'s built-in cache option, which is npm-only in v6). See `docs/adr/002-github-actions-yarn-cache.md` for details.

## CI Workflow

Config: `.github/workflows/ci.yml`

Runs on push and pull request to `main`. Jobs:

- **biome**, **knip**, **typecheck**, and **test** run in parallel on all events. **knip** detects unused files, exports, and dependencies; uses `--reporter github-actions` for inline PR annotations.
- **build** runs after all four pass on all events — runs `vercel build`, then deploys to preview (on `pull_request`) or production (on push to `main`). Exposes `url` as a job output for downstream jobs.
- **e2e** and **lighthouse** both run on `pull_request` only, after `build`, and run in parallel with each other.
  - **e2e**: Runs Playwright tests against the Vercel preview URL via `PLAYWRIGHT_BASE_URL` (from the `build` job output) and `VERCEL_BYPASS_SECRET`. Installs Chromium only. Uploads `playwright-report/` as a CI artifact on every run.
  - **lighthouse**: Matrix job auditing `/`, `/fixtures`, and `/table` against the Vercel preview URL using `treosh/lighthouse-ci-action`. Runs 3 audits per route and uploads artifacts (`lighthouse-root`, `lighthouse-fixtures`, `lighthouse-table`). Thresholds defined in `lighthouserc.json`. All three matrix checks are required in the `shared-ci` ruleset (`settings.yml`).

Concurrency is configured to cancel in-progress runs on PRs when new commits are pushed. Runs on `main` are never cancelled.

A top-level `permissions: contents: read` block restricts all jobs to read-only token access by default. The `build` job overrides this with `contents: read` + `deployments: write` for Vercel deployment.

## Git Hooks (lefthook)

Config: `lefthook.yml`

- **pre-commit** runs scoped checks on staged files only: `biome`, `sort-package-json`, `knip`, and `vitest related` (JS/TS staged files only). Docs-only commits incur near-zero hook cost.
- **pre-push** runs project-wide `yarn typecheck` and full `yarn test` once before the push, preserving CI parity without per-commit latency.
- Never use `--no-verify`. Pre-commit failures must be fixed, not bypassed (root `CLAUDE.md`).

## Vercel Deployment

The `build` job uses the Vercel CLI (`vercel` devDependency) with these required repository secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `SENTRY_AUTH_TOKEN` — consumed by the Sentry post-build hook during `vercel build` (which invokes Turbopack `next build`) to upload source maps to Sentry. Configured in `next.config.ts` via `withSentryConfig({ authToken: process.env.SENTRY_AUTH_TOKEN })`. Local builds work without it; upload is skipped silently when unset.

Project IDs are sourced from `.vercel/project.json` (gitignored). Re-run `vercel link` locally to regenerate if needed.

## Dependabot

Config: `.github/dependabot.yml`

Monitors `npm` dependencies weekly, targeting `main`. Commit messages use `chore(deps):` prefix via the `commit-message` config.

## Dependabot Auto-merge

Config: `.github/workflows/dependabot-auto-merge.yml`

Triggers on `pull_request_target` (runs in base branch context so `GITHUB_TOKEN` has full permissions). Checks `github.actor == 'dependabot[bot]'` and enables auto-merge via squash. `pull_request_target` is safe here because no PR code is checked out or executed.

## Sync Seasons Workflow

Config: `.github/workflows/sync-seasons.yml`

Monthly cron (1st of the month at noon UTC) + manual `workflow_dispatch`. Runs `scripts/sync-seasons.mjs` to fetch the current Premier League season ID from Sportmonks and update `src/lib/sportmonks/seasons.json`. If the season ID changed, force-pushes a `chore/sync-seasons` branch and creates a PR (or updates the existing one) via the GitHub App token.

## Sync Fixtures Workflow

Config: `.github/workflows/sync-fixtures.yml`

Daily cron (06:00 UTC) + manual `workflow_dispatch`. Runs `scripts/sync-fixtures.mjs` to fetch the Arsenal fixture list for the current season from Sportmonks and update `src/lib/sportmonks/fixtures.json` (IDs + kickoffs only). Opens a PR only when the content actually changes. See `docs/adr/005-fixture-index-and-state-aware-caching.md` for why this file is committed and why daily is the right cadence.

Same App-token pattern, same secret requirements, same idempotence check as `sync-seasons.yml`.

Does **not** use the composite setup action — the script only needs Node.js, not `yarn install`.

Idempotent: re-running on the same day force-pushes the branch and reuses the existing PR.

Required secrets (in addition to those listed in Vercel Deployment):
- `MONK_TOKEN` — Sportmonks API token
- `APP_ID` — GitHub App ID for automated PR creation
- `APP_PK` — GitHub App private key

The `gunnersaurus-bot` GitHub App token is used instead of `GITHUB_TOKEN` so the resulting PR triggers CI workflows. See `actions/create-github-app-token@v2`. Commits are attributed to `gunnersaurus-bot[bot]`.

## E2E Coverage Policy

Any new user-facing feature must have a corresponding e2e spec added or updated before the PR is merged. Document the spec in the PR description's test plan section.

## Notes

- Node version is pinned via `.nvmrc` — update there to change it everywhere
- Corepack must be enabled before running any `yarn` commands — handled in the composite action

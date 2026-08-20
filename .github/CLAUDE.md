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
  - **lighthouse**: Matrix job auditing `/`, `/fixtures`, and `/table` against the Vercel preview URL using `treosh/lighthouse-ci-action`. Runs 3 audits per route and uploads artifacts (`lighthouse-root`, `lighthouse-fixtures`, `lighthouse-table`). Thresholds defined in `lighthouserc.js`, which also injects the Vercel protection-bypass headers from `VERCEL_BYPASS_SECRET` (see `lighthouserc.js` for why a URL query parameter is not sufficient) and **throws if that secret is missing** — an unauthorized preview request 302s to `vercel.com/login` and Lighthouse scores that page instead of failing, so a silent fallback would report scores for the wrong site. The action's own `uploadArtifacts` is off: Lighthouse copies resolved settings into every report (`configSettings.extraHeaders`), and this repository is public, so a redaction step scrubs the secret before `actions/upload-artifact` runs. Any change that publishes report files must keep that scrub in front of it. All three matrix checks are required in the `shared-ci` ruleset (`settings.yml`).
    - **`categories:seo` is `off` and must stay off** while audits run against preview URLs. `is-crawlable` (weight 4.04 of 12.04 as of Lighthouse 12.6.x — verify against a report's `categories.seo.auditRefs` if the version moves) always scores 0 because Vercel serves previews with `x-robots-tag: noindex`, which caps achievable SEO on a preview at 0.664 even with every other audit passing. Any `minScore` above that is unpassable by construction. Re-enable only if the job is pointed at production.

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

Monitors `npm` and `github-actions` dependencies daily, targeting `main`. Commit messages use `chore(deps):` prefix via the `commit-message` config.

The `react` group keeps `react`, `react-dom`, `@types/react`, and `@types/react-dom` in one PR — `react` and `react-dom` must resolve to the exact same version or React refuses to boot. Group patterns are exact names, never wildcards: `react*` would sweep in `react-error-boundary`, `react-ios-pwa-prompt`, and `react-textfit`, and `@types/react*` would sweep in `@types/react-textfit` — all independently versioned.

## Dependabot Auto-merge

Config: `.github/workflows/dependabot-auto-merge.yml`

Triggers on `pull_request_target` (base branch context). Gates on `github.event.pull_request.user.login == 'dependabot[bot]'`, approves if not already approved, then enables auto-merge via squash. `pull_request_target` is safe here because no PR code is checked out or executed.

**Gate on PR author, never `github.actor`.** `actor` is whoever triggered the event, so a human pushing to a Dependabot branch (fixing a lockfile conflict, say) becomes the actor and skips the job — the PR then silently drops out of auto-merge management with no error. The author is a stable, unforgeable property of the PR.

**Must use the App token (`APP_ID`/`APP_PK`), never `GITHUB_TOKEN`.** GitHub does not create workflow runs from `GITHUB_TOKEN`-triggered events, so an auto-merge enabled with it lands a commit on `main` that triggers nothing downstream — including `pr-conflict-rebase.yml`. Switching this one line back to `GITHUB_TOKEN` silently disables the auto-rebase chain with no error anywhere.

The approve step is a no-op today (no ruleset requires approving reviews) and exists so the workflow keeps working if that changes.

**The approve step is guarded by a `latestReviews` check.** `pull_request_target` fires on every push, so an unconditional approve stacks a duplicate review each time (PR #240 collected eight). The guard matches on `steps.app-token.outputs.app-slug` — App-authored reviews use the bare slug, not the `[bot]`-suffixed login the REST API returns, so hardcoding either form is a silent mismatch. Use `latestReviews`, not `reviews`: it returns one entry per author and reports a dismissed approval as `DISMISSED`, so a re-approve still happens if the approval goes stale.

## PR Conflict Check & Auto-rebase

Config: `.github/workflows/pr-conflict-rebase.yml`, logic in `.github/scripts/pr-conflict-rebase.sh`

Runs on every push to `main`. For open non-draft PRs targeting `main`: updates `BEHIND` ones, attempts a Mergiraf auto-resolution on `DIRTY` ones and labels them `conflicting` if that fails, and removes a stale `conflicting` label once a PR is clean. This is what clears the Dependabot queue — auto-merge lands one PR, leaving the rest `BEHIND`, and this updates them so CI re-runs against the new base.

PRs whose head-commit `statusCheckRollup` is `FAILURE`/`ERROR` are skipped on both the update and auto-resolve paths — either one re-runs the full pipeline to reproduce a known failure. `PENDING` still updates: a run against a stale base is already invalidated, so cancelling it is cheaper than letting it finish.

Five things that will break it:

- **Must use the App token, never `GITHUB_TOKEN`.** `github-actions[bot]` pushes do not trigger downstream workflows, so a `GITHUB_TOKEN` rebase would leave PRs green against a base they were never tested on. Uses `APP_ID`/`APP_PK` for the same reason `sync-fixtures.yml` does.
- **A PR carrying a merge commit is updated with merge, not rebase.** A rebase-update replays the commits in head-not-base and *drops merge commits* — on a PR mergiraf already resolved, that silently discards the resolution, resurfaces the conflict, and re-labels the PR, wasting a full CI run. Detected from `parents.totalCount` in the GraphQL query. Switching this back to an unconditional `--rebase` makes auto-resolution undo itself on the next push to `main`.
- **The App deliberately lacks `workflows: write`,** and the two paths hit that wall for *different* reasons: a rebase replays the PR's own commits, so it trips on a PR that edits `.github/workflows/`; auto-resolve replays *base's* commits, so it trips only when `main` has touched a workflow since the merge base. A PR that edits workflows where `main` has not **will** be auto-resolved — nothing in the script prevents it, and the only enforcement anywhere is GitHub's server-side rejection. The rebase path reports `Skipped (needs manual update)`; the auto-resolve path reports `Labeled (needs manual update)`. Detection matches GitHub's error text via `WORKFLOWS_SCOPE_ERR`, so a reword upstream fails loudly instead.
- **Assumes the `conflicting` label exists.** It never creates it. Delete the label and every `DIRTY` PR turns the run red.
- **The `mergiraf` version and its SHA-256 are pinned by hand in the workflow.** Dependabot cannot see a raw Codeberg `curl`, so nothing will ever open a bump PR. When bumping, update both values together and check the release notes against the merge-driver flag line in the script.

Auto-resolution is deterministic (tree-sitter based, no model). It pushes a merge commit only when every conflict resolves and no markers remain; `yarn.lock`, `skills-lock.json`, and the two `src/lib/sportmonks/*.json` files are opted out via `-merge` (four literal paths, not a glob — a new generated file there must be added by hand). Note that this makes the most common Dependabot conflict, the lockfile, still a manual fix.

Two behaviors that are easy to misread:

- **A transient auto-resolve failure still labels the PR.** The PR is genuinely `DIRTY`; dropping the label over a local fetch/push problem would hide it from every triage query keyed on `conflicting`. The failure is recorded separately and turns the run red.
- **A provably stale `DIRTY` verdict touches no label at all.** If the merge turns out to be a no-op, the branch is gone, or the head moved mid-run, the script skips like the `UNKNOWN` case rather than labeling on data it has just disproved.

The `mergiraf` install step is `continue-on-error`. Auto-resolution is an enhancement on top of the update/label automation, which needs no binary — a Codeberg outage degrades to label-only rather than taking the whole queue-clearing job offline.

See `docs/adr/007-pr-conflict-rebase-automation.md` and `docs/adr/008-mergiraf-conflict-auto-resolution.md` for the full rationale.

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

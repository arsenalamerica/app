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
- **e2e** runs on `pull_request` only, after `build`. Runs Playwright tests against the Vercel preview URL via `PLAYWRIGHT_BASE_URL` (from the `build` job output) and `VERCEL_BYPASS_SECRET`. Installs Chromium only. Uploads `playwright-report/` as a CI artifact on every run.
- **lighthouse** runs on `pull_request` only, after `build`. Audits the root `/` path against the Vercel preview URL using `treosh/lighthouse-ci-action`. Runs 2 audits and uploads artifacts. Thresholds defined in `lighthouserc.json`.

Concurrency is configured to cancel in-progress runs on PRs when new commits are pushed. Runs on `main` are never cancelled.

A top-level `permissions: contents: read` block restricts all jobs to read-only token access by default. The `build` job overrides this with `contents: read` + `deployments: write` for Vercel deployment.

## Vercel Deployment

The `build` job uses the Vercel CLI (`vercel` devDependency) with three required repository secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Project IDs are sourced from `.vercel/project.json` (gitignored). Re-run `vercel link` locally to regenerate if needed.

## Dependabot

Config: `.github/dependabot.yml`

Monitors `npm` dependencies weekly, targeting `main`. Commit messages use `chore(deps):` prefix via the `commit-message` config.

## Dependabot Auto-merge

Config: `.github/workflows/dependabot-auto-merge.yml`

Triggers on `pull_request_target` (runs in base branch context so `GITHUB_TOKEN` has full permissions). Checks `github.actor == 'dependabot[bot]'` and enables auto-merge via squash. `pull_request_target` is safe here because no PR code is checked out or executed.

## E2E Coverage Policy

Any new user-facing feature must have a corresponding e2e spec added or updated before the PR is merged. Document the spec in the PR description's test plan section.

## Notes

- Node version is pinned via `.nvmrc` — update there to change it everywhere
- Corepack must be enabled before running any `yarn` commands — handled in the composite action

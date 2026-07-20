# ADR-007: Automated PR rebase and conflict labeling on push to `main`

## Status

Accepted

## Context

Dependabot runs daily against `npm` and `github-actions` (`.github/dependabot.yml`), and every Dependabot PR is auto-merged once green (`.github/workflows/dependabot-auto-merge.yml`). With a queue of open dependency PRs this produces a cascade: one PR merges, and every other open PR immediately becomes `BEHIND` its base.

Three costs follow, all observed in practice:

- **Wasted CI.** A `BEHIND` branch whose CI is still running is computing a result against a base that no longer exists. The full pipeline here is not cheap — `build` plus `e2e` plus a three-way `lighthouse` matrix — so a run that is invalidated before it finishes is a meaningful spend.
- **Manual toil.** Clearing a queue of nine PRs meant repeated `gh pr update-branch --rebase` passes, re-running after each merge, because each merge re-staled the remainder.
- **Late conflict discovery.** Lockfile conflicts (`yarn.lock`, `package.json`) surface only when someone looks. A PR can sit `DIRTY` for days with no signal.

GitHub's own "Update branch" button is manual and per-PR. Dependabot's `rebase-strategy: auto` only rebases PRs Dependabot itself owns, and only on its own schedule — it does not react to a merge landing on `main`, and it does nothing for non-Dependabot PRs.

The critical constraint is **which identity performs the push.** `GITHUB_TOKEN` pushes run as `github-actions[bot]`, and GitHub's loop-prevention rules mean that actor's pushes do not trigger downstream `on: push` / `on: pull_request` workflows. A rebase performed with `GITHUB_TOKEN` would therefore leave the PR up to date but never re-run CI against the new base — strictly worse than not rebasing, because the PR would appear green against a base it was never tested on.

This repo already resolves that exact problem elsewhere: `sync-fixtures.yml` and `sync-seasons.yml` use the `gunnersaurus-bot` App token (`APP_ID` / `APP_PK`) rather than `GITHUB_TOKEN` so their PRs trigger CI. The App is a distinct identity, so its pushes do trigger workflows. It already holds `contents: write` and `pull_requests: write` — it force-pushes branches and opens PRs in those workflows today — which is precisely the permission set `gh pr update-branch --rebase` and `gh pr edit --add-label` require. No new App, secret, or permission grant is needed.

`mergeStateStatus` is computed asynchronously and its latency is unbounded in practice; flat sleeps of 8s and 30s both returned `UNKNOWN` for every PR in real runs, and one case took over four minutes. Any implementation must poll rather than sleep, and must treat `UNKNOWN` as "not yet known" rather than "clean".

## Decision

1. Add `.github/workflows/pr-conflict-rebase.yml`, triggered `on: push` to `main`, with the decision logic in `.github/scripts/pr-conflict-rebase.sh`.
2. Authenticate every write with the `gunnersaurus-bot` App token (`APP_ID` / `APP_PK`), never `GITHUB_TOKEN`. Grant the workflow only `permissions: contents: read`, which `actions/checkout` needs to fetch the script.
3. Act on `mergeStateStatus`, scoped to open non-draft PRs whose base is the pushed branch:
   - `BEHIND` → rebase via `gh pr update-branch --rebase`
   - `DIRTY` → add the `conflicting` label
   - `UNKNOWN` → skip without touching labels; re-evaluated on the next push
   - anything else → no-op, and remove a stale `conflicting` label if present
4. Poll for `mergeStateStatus` resolution (12 attempts × 15s) rather than sleeping a fixed interval, and proceed best-effort with whatever has resolved.
5. Treat a failed rebase as ambiguous: re-query `mergeStateStatus` to distinguish a genuine new conflict (label it) from a transient API error (retry on the next push).
6. Set `concurrency.cancel-in-progress: true`. A rebase decision is only meaningful against the latest tip, and each rebase is a single atomic API call, so cancelling cannot leave partial state.
7. Exit nonzero if any write fails, so a broken token or permission turns the run red instead of silently reporting green while doing nothing.
8. Create the `conflicting` label once via a manual CLI sweep. The workflow never creates or verifies labels; it assumes the label exists.

## Consequences

- **CI spend shifts from wasted to useful.** Runs against stale bases are cancelled by the rebase instead of running to completion. Net effect on a merge cascade is fewer total runs, not more, because the invalidated runs would have been re-run anyway.
- **The queue self-clears.** Each merge triggers a rebase of everything still open, which re-triggers CI, which lets auto-merge land the next one. No manual `update-branch` passes.
- **Conflicts surface immediately** via the `conflicting` label rather than on inspection.
- **Hard dependency on the `conflicting` label existing.** If it is deleted, every `DIRTY` PR turns the run red. This is deliberate — silent failure is worse — but it is a footgun worth knowing about.
- **Hard dependency on `APP_ID` / `APP_PK`.** If the App's key is rotated or its permissions narrowed, this workflow fails alongside `sync-fixtures` and `sync-seasons`. It shares their fate rather than adding a new failure mode.
- **Bounded blast radius.** The workflow only ever touches PRs in its own repository, and only those targeting the pushed branch. It creates nothing and deletes nothing.
- **A burst of merges cancels intermediate runs.** `cancel-in-progress` means only the last push's evaluation completes. This is correct — earlier evaluations are stale by definition — but a PR could briefly stay `BEHIND` until the next push if a run is cancelled mid-sweep.
- **Reverting is cheap.** Delete the workflow and script. Nothing else depends on them, and the `conflicting` label can stay or go independently.

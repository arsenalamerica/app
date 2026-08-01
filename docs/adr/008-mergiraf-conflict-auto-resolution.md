# ADR-008: Deterministic conflict auto-resolution with Mergiraf

## Status

Accepted

## Context

ADR-007 established `.github/workflows/pr-conflict-rebase.yml`. It has two outcomes per open PR targeting `main`:

- `BEHIND` — rebase via the GitHub API, so CI re-runs against the new base.
- `DIRTY` — add the `conflicting` label and stop.

The `DIRTY` branch is a dead end. The label makes the conflict visible, which was the point, but every conflicting PR is still manual work. In a repo whose PR volume is dominated by a daily Dependabot queue with auto-merge, `DIRTY` is not rare: it is the normal end state for the second and subsequent PRs in any batch that touches overlapping files.

Many of those conflicts are structural rather than semantic — two commits editing different declarations that happen to land in the same diff hunk. Git's default merge driver is line-based and cannot tell that apart from a genuine contradiction, so it conflicts on both.

[Mergiraf](https://mergiraf.org) is a syntax-aware three-way merge driver built on tree-sitter grammars. It parses both sides, merges at the AST level, and falls back to conflict markers when the merge is genuinely ambiguous. It is deterministic: no model, no network, no nondeterminism between runs. The same three inputs always produce the same output, which is the property that makes it acceptable to run unattended against real branches.

Measured against this repo's actual file types, verified locally against `v0.18.0`:

| Scenario | Result |
|---|---|
| Two sides edit different functions in one `.ts` file | resolved, exit 0 |
| Two sides each add a different function at the same position | declined, conflict markers, exit 1 |
| File under a `-merge` attribute | always conflicts, by construction |

The second row matters as much as the first: a merge tool that guesses at genuine ambiguity is worse than no tool. Mergiraf declining ordering ambiguity is the behavior that makes an unattended push defensible.

This extension is not novel here: it already runs in production in a sibling repository, against a fork of this repo's script, which is where the pattern comes from.

### Constraints specific to this repo

**The App still lacks `workflows: write`.** ADR-007 measured that trade and declined it: the scope is arbitrary CI code execution across every repo the App is installed in, bought for roughly one action bump per month. That decision is unchanged here, but it now bites a second code path. Merging `main` into a PR head replays `main`'s workflow-file edits into the merge commit, so the App's `git push` is rejected with the same `refusing to allow a GitHub App to create or update workflow` error that `gh pr update-branch` already produces.

**Lockfiles must never be spliced.** A `yarn.lock` merged hunk-by-hunk can describe a dependency graph that neither side ever resolved and that no `yarn install` ever produced. `yarn.lock` is also the single most common conflict in the Dependabot queue, so opting it out is not a corner case — it is the main case.

**The Sportmonks data files are generated, not authored.** `src/lib/sportmonks/fixtures.json` and `seasons.json` are wholesale-regenerated snapshots (ADR-005). A structural merge of two generated snapshots produces a fixture list that was never fetched from the API.

**Pushing to a PR head rewrites someone's branch.** The push is a fast-forward merge commit rather than a force-push, so no history is destroyed, but an author with local work will get a non-fast-forward on their next push if they do not pull first.

## Decision

1. Extend the `DIRTY` branch of `.github/scripts/pr-conflict-rebase.sh`: merge the base into the PR head locally with Mergiraf configured as the git merge driver, and push the resulting merge commit only when every conflict resolves fully. Anything short of that falls back to the existing label path, so a failed resolution is never worse than the pre-ADR-008 behavior.

2. Pin the Mergiraf release by version **and** SHA-256 in the workflow, verified with `sha256sum -c` before extraction. Dependabot's `github-actions` ecosystem does not see a raw Codeberg `curl`, so nothing will open a bump PR — the pin is bumped by hand, and the release notes must be checked against the merge-driver flag line in the script.

3. Register the driver only for file types Mergiraf actually supports, via `mergiraf languages --gitattributes`, written to `.git/info/attributes` rather than a tracked `.gitattributes`. A bare `*` would route binaries — icons, fonts — through the driver and bypass git's own binary detection. Writing to `info/attributes` keeps the runner-only configuration out of the repo, where it would otherwise change local merge behavior for every contributor who does not have the binary installed.

4. Opt four paths out entirely with `-merge` (treat as binary, always conflict, always label): `yarn.lock`, `skills-lock.json`, `src/lib/sportmonks/fixtures.json`, `src/lib/sportmonks/seasons.json`.

5. Do not attempt a resolution in three cases, all of which fall through to labeling:
   - the head-commit `statusCheckRollup` is `FAILURE`/`ERROR` — same cost argument as ADR-007's rebase skip, since resolving a conflict does not fix a failing test and the push would re-run the full `build` + `e2e` + three-way `lighthouse` pipeline to reproduce a known failure;
   - the head is `main` — no bot-authored merge commits pushed to a shared branch;
   - the head is cross-repo — no push access to forks.

6. Treat a push rejected for the missing `workflows` scope as a **skip, not a failure**, mirroring how ADR-007 already handles the same rejection on the rebase path. The PR is still labeled, and the run stays green. Detection matches GitHub's error text, so an upstream reword surfaces as a loud transient failure rather than a silent behavior change.

7. Comment on the PR when a resolution is pushed, so the author is not surprised by a non-fast-forward on their next push. Best-effort: a failed comment warns, it does not undo the resolution.

8. Guard the one-time driver setup as a unit and fail the run loudly if any part of it breaks. A silently missing driver or attribute file would route every merge through git's default driver and turn the whole feature into a no-op that still reports green — the worst possible failure mode, because it looks like "no conflicts were resolvable."

## Consequences

**The most common conflict in this repo still will not auto-resolve.** `yarn.lock` is opted out by decision 4, so a Dependabot PR whose only conflict is the lockfile gets labeled exactly as before. The realistic near-term win is source-file conflicts, not the dependency queue. Closing that gap means regenerating the lockfile after a successful source merge (`yarn install --mode=update-lockfile`) rather than splicing it, which is a larger change with its own failure modes and is deliberately out of scope here.

**PR branches can now be written to by CI.** Previously the workflow only called GitHub APIs; it now pushes commits to contributor branches. The push is a merge commit, never a force-push, and the marker check plus the full-resolution requirement gate it. Authors must `git pull` before pushing further work.

**A new third-party binary is in the CI path**, fetched from Codeberg on every run of this workflow. The SHA pin means a compromised or altered artifact fails the step rather than executing. It is a manual bump with no automated reminder, so the version will drift until someone looks.

**Runtime grows.** The job now does a full-history checkout (`fetch-depth: 0`) instead of a shallow one, plus a binary download, plus a real `git merge` per `DIRTY` PR. This workflow is not on the critical path of any deployment, so the cost is acceptable.

**Merge commits appear in PR branches.** Every PR here is squash-merged, so these disappear at merge time and never reach `main`'s history.

**The `workflows: write` decision is now load-bearing in two places.** If ADR-007's trade is ever revisited, both the rebase path and this resolution path change behavior together.

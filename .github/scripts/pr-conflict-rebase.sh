#!/usr/bin/env bash
#
# Rebase, auto-resolve, or label every open, non-draft PR targeting the given
# base branch in this repo. Invoked by .github/workflows/pr-conflict-rebase.yml
# on every push to main, scoped to only that base branch.
#
#   mergeStateStatus DIRTY    -> real conflicts. First attempt a deterministic
#                                structural resolution with mergiraf (ADR-008):
#                                merge the base into the head locally and, when
#                                every conflict fully resolves, push the merge
#                                commit (App-token push, so CI re-runs; the
#                                commit disappears at squash-merge time).
#                                Anything short of full resolution falls back
#                                to adding the `conflicting` label. Not
#                                attempted on a head equal to the base, on
#                                cross-repo heads (no push access to forks),
#                                or when the head commit's statusCheckRollup
#                                is FAILURE/ERROR — see the skip rationale
#                                below. A provably stale DIRTY verdict skips
#                                without touching the label (rc=4).
#   mergeStateStatus BEHIND   -> clean but stale, update via the GitHub API
#                                (a failed update is re-checked below to tell
#                                a new conflict apart from a transient error),
#                                UNLESS the head commit's statusCheckRollup is
#                                FAILURE/ERROR — see the skip rationale below.
#                                Uses rebase, EXCEPT on a PR that already
#                                carries a merge commit, where a rebase would
#                                drop it (and with it any earlier mergiraf
#                                resolution) — those update via merge.
#   mergeStateStatus UNKNOWN  -> GitHub hasn't finished computing merge state
#                                even after the delay below; skip WITHOUT
#                                touching any existing label (this is not a
#                                confirmed-clean result).
#   anything else             -> confirmed clean/blocked/unstable; no-op, and
#                                remove a stale `conflicting` label if present.
#
# Requires: GH_TOKEN — a GitHub App installation token. $1 — the base branch.
# Also expects: a full-history checkout of this repo as the working directory
# (the mergiraf path runs real `git merge`s, which need merge bases), the
# `mergiraf` binary on PATH, and optionally APP_SLUG (the GitHub App slug,
# used for the merge-commit author identity).
#
# This script is called ONLY by .github/workflows/pr-conflict-rebase.yml.
# Do not reference it from any other workflow.
#
# Exits nonzero if any write (label edit, rebase, auto-resolve) failed or the
# mergiraf setup block fails, so a broken App token/permission doesn't
# silently show green while doing nothing.

set -uo pipefail

BASE="${1:?usage: pr-conflict-rebase.sh <base-branch>}"
REPO="$GITHUB_REPOSITORY"
OWNER="${REPO%%/*}"
NAME="${REPO##*/}"
LABEL="conflicting"
# GitHub's rejection text when an App without `workflows: write` tries to
# create or update a file under .github/workflows/. Both the rebase path and
# the auto-resolve path match on it, so it lives in one place — two copies
# drift apart the first time someone updates only the site they were debugging.
WORKFLOWS_SCOPE_ERR='refusing to allow a GitHub App to create or update workflow'

# Attempt to fully resolve a DIRTY PR by merging $BASE into its head with
# mergiraf. Deterministic — no agent, no LLM. Works on a detached HEAD so the
# loop never leaves local branches behind. Returns:
#   0 -> fully resolved and pushed (PR is no longer conflicting)
#   1 -> no resolution to push: mergiraf declined, or conflict markers survived
#        an exit-0 merge. Caller falls through to labeling.
#   2 -> transient/infrastructure failure (fetch, checkout, a non-conflict git
#        merge failure, an unrecognized push rejection). Caller STILL labels —
#        the PR is genuinely DIRTY and must not lose its label over a local
#        problem — and additionally records a red-run failure.
#   3 -> resolved, but the push was rejected because the merge commit updates
#        .github/workflows/ and this App deliberately lacks `workflows: write`
#        (ADR-007). Caller labels as usual and reports a skip, not a failure.
#   4 -> our DIRTY snapshot is provably stale (no-op merge, the head branch is
#        gone, or the head moved under us). Caller skips WITHOUT touching any
#        label, matching the UNKNOWN precedent: this is not a confirmed verdict.
try_mergiraf_resolve() {
  local number="$1" head_ref="$2" push_output merge_rc grep_rc head_sha
  local -a merged_paths
  if ! git fetch -q origin "+refs/heads/$head_ref:refs/remotes/origin/$head_ref" \
    "+refs/heads/$BASE:refs/remotes/origin/$BASE"; then
    # A fetch failure is ambiguous: the branch may simply be gone (the author
    # deleted it, which closes the PR — benign and expected), or the network
    # may be broken. Ask the remote directly rather than turning a routine
    # branch deletion into a red run.
    if git ls-remote --exit-code --heads origin "$head_ref" >/dev/null 2>&1; then
      echo "::warning::PR #$number: fetch failed but the branch exists — infrastructure, not a conflict verdict." >&2
      return 2
    fi
    echo "  head branch $head_ref no longer exists — PR is closing; skipping."
    return 4
  fi
  if ! git checkout -q --detach "origin/$head_ref"; then
    # Almost certainly a dirty tree left by a failed abort in a previous
    # iteration — reset so the NEXT iteration isn't poisoned too. Without
    # this guard, one bad abort would make every later merge fail from a
    # stale HEAD and mislabel those PRs as unresolvable on a green run.
    echo "::warning::PR #$number: checkout failed — resetting working tree." >&2
    git merge --abort 2>/dev/null || git reset --hard -q ||
      {
        echo "::error::PR #$number: working tree cleanup failed — aborting before later PRs are judged on a poisoned tree." >&2
        exit 1
      }
    return 2
  fi
  head_sha=$(git rev-parse HEAD)
  if git merge-base --is-ancestor "origin/$head_ref" "origin/$BASE"; then
    # The head is already fully contained in the base: there is nothing to
    # merge and nothing to resolve, so the queried DIRTY verdict is stale.
    # Caught explicitly because merging here would "succeed" and push a commit
    # whose tree is just the base — emptying the contributor's PR.
    echo "  head is already contained in $BASE — queried DIRTY state was stale."
    return 4
  fi
  # --no-ff is load-bearing, not stylistic. Without it, a head that is already
  # an ancestor of the base fast-forwards, the staleness guard below (which
  # only catches the opposite direction) passes, and the push replaces the
  # contributor's branch with the base tip — emptying their PR on a green run.
  git merge --no-ff --no-edit "origin/$BASE"
  merge_rc=$?
  if [ "$merge_rc" -ne 0 ]; then
    # --abort restores the pre-merge state; if it refuses (rare), reset --hard
    # is the guaranteed cleanup on a detached HEAD (also clears MERGE_HEAD).
    git merge --abort 2>/dev/null || git reset --hard -q ||
      {
        echo "::error::PR #$number: working tree cleanup failed — aborting before later PRs are judged on a poisoned tree." >&2
        exit 1
      }
    # Only rc=1 means "conflicts". rc=2 is a refusal to clobber local changes
    # (a tree poisoned by an earlier iteration) and rc=128 is fatal. Reporting
    # either as "mergiraf declined" would label a PR that has no conflict at
    # all, on a green run — so they take the infrastructure path instead.
    if [ "$merge_rc" -ne 1 ]; then
      echo "::warning::PR #$number: git merge failed with rc=$merge_rc — infrastructure, not a conflict verdict." >&2
      return 2
    fi
    echo "  mergiraf could not fully resolve."
    return 1
  fi
  if [ "$(git rev-parse HEAD)" = "$head_sha" ]; then
    # No-op merge ("Already up to date"): the DIRTY snapshot we queried went
    # stale and the PR merges cleanly. We have just PROVEN it is not
    # conflicting, so labeling it would be wrong — skip and leave the label
    # alone, exactly as the UNKNOWN case does with unconfirmed data.
    echo "  merge was a no-op — queried DIRTY state was stale."
    return 4
  fi
  # Scope the marker scan to the paths this merge actually touched. A bare
  # `git grep <rev>` scans the ENTIRE tree, so one unrelated committed file
  # with a marker-shaped line (a doc illustrating conflicts, a vendored
  # bundle) would silently disable auto-resolution repo-wide while every run
  # still reported green — the exact no-op failure mode ADR-008 exists to
  # prevent. Exit status is inspected explicitly because git grep returns 128
  # on error, and an errored scan must never be read as "clean, push it".
  # Deliberately NOT piped through xargs: GNU xargs exits 123 when its child
  # exits 1, so a clean "no markers found" would be indistinguishable from a
  # scan error and every successful merge would be refused.
  mapfile -t merged_paths < <(git diff --name-only "$head_sha" HEAD)
  if [ "${#merged_paths[@]}" -eq 0 ]; then
    grep_rc=1
  else
    git grep -qI -e '^<<<<<<<' -e '^>>>>>>>' HEAD -- "${merged_paths[@]}"
    grep_rc=$?
  fi
  if [ "$grep_rc" -eq 0 ]; then
    # Defense in depth: never push a resolution containing conflict markers,
    # even if the merge driver exited 0 with markers left in a file.
    # (Detached HEAD, so the stray merge commit is simply abandoned.)
    echo "::warning::PR #$number: conflict markers in merge result — not pushing." >&2
    return 1
  elif [ "$grep_rc" -ne 1 ]; then
    echo "::error::PR #$number: marker scan failed (rc=$grep_rc) — refusing to push an unverified merge." >&2
    return 2
  fi
  if push_output=$(git push origin "HEAD:refs/heads/$head_ref" 2>&1); then
    echo "  fully resolved by mergiraf — merge commit pushed."
    # Best-effort heads-up so the author isn't surprised by a non-fast-
    # forward on their next push. Informational only: a failed comment
    # doesn't undo the resolution, so it warns instead of going red.
    gh pr comment "$number" --repo "$REPO" --body \
      "Conflicts with \`$BASE\` were auto-resolved by [Mergiraf](https://mergiraf.org) and a merge commit was pushed to this branch. Run \`git pull\` before pushing more work, and review the resolution — CI is re-running against it." ||
      echo "::warning::PR #$number: failed to post the auto-resolve comment." >&2
    return 0
  fi
  echo "$push_output"
  git checkout -q --detach "origin/$BASE" ||
    echo "::warning::PR #$number: could not restore HEAD to origin/$BASE." >&2
  if grep -qF "$WORKFLOWS_SCOPE_ERR" <<<"$push_output"; then
    # Same wall the BEHIND path hits (ADR-007). NOTE the trigger differs from
    # the rebase path: there it is the PR's own commits touching a workflow
    # file, here it is BASE's workflow edits being replayed into the merge
    # commit. A PR that edits workflows where base has not is NOT stopped by
    # this — see .github/CLAUDE.md, which used to claim otherwise.
    echo "  merge result updates .github/workflows/ — needs a manual resolution (see ADR-007)."
    return 3
  fi
  if grep -qE '\[rejected\].*(fetch first|non-fast-forward)|\[remote rejected\].*stale info' <<<"$push_output"; then
    # The author pushed during our run, so the branch we resolved is no longer
    # the branch that exists. Our DIRTY verdict is stale by definition — this
    # is routine on an active repo and must not turn the run red.
    echo "  head moved during the run (author pushed) — skipping; next run re-evaluates."
    return 4
  fi
  echo "::warning::PR #$number: mergiraf resolved the conflict but the push was rejected for an unrecognized reason." >&2
  return 2
}

# GitHub computes mergeStateStatus asynchronously after a push, and how long
# it takes is unbounded in practice — a flat sleep isn't reliable (8s and 30s
# both came back UNKNOWN for every PR on real runs; one observed case took
# 4+ minutes to resolve). Poll instead, up to a bounded budget, and proceed
# with whatever's resolved once the budget runs out — anything still UNKNOWN
# is skipped without touching labels (see the UNKNOWN case below) and picked
# up on the next push, so this is a best-effort budget, not a guarantee.
POLL_ATTEMPTS=12
POLL_DELAY_SECONDS=15
attempt=0
while :; do
  # Each PR is base64-encoded (@base64 below) so a title containing newlines
  # or quotes can't break the line-oriented while-read loop or be misparsed
  # by jq when decoded back out further down.
  # shellcheck disable=SC2016
  if ! prs=$(gh api graphql \
    -f query='query($owner:String!,$name:String!,$base:String!){
      repository(owner:$owner,name:$name){
        pullRequests(first:100, states:[OPEN], baseRefName:$base){
          nodes{
            number title isDraft mergeStateStatus headRefName isCrossRepository
            labels(first:20){ nodes{ name } }
            commits(last:1){ nodes{ commit{ statusCheckRollup{ state } } } }
            # Every commit in head-not-base, purely to spot merge commits
            # (parents > 1). A rebase-update replays these commits and DROPS
            # merge commits, which would silently discard an earlier
            # auto-resolution — see the BEHIND case. Aliased so it does not
            # collide with the statusCheckRollup selection above.
            headCommits: commits(first:100){ nodes{ commit{ parents{ totalCount } } } }
          }
        }
      }
    }' \
    -f owner="$OWNER" -f name="$NAME" -f base="$BASE" \
    --jq '.data.repository.pullRequests.nodes[] | @base64'); then
    echo "::error::Failed to query PRs targeting $BASE" >&2
    exit 1
  fi

  if [ -z "$prs" ]; then
    echo "No open PRs target $BASE — nothing to do."
    exit 0
  fi

  still_unknown=$(printf '%s\n' "$prs" | while IFS= read -r encoded; do
    [ -z "$encoded" ] && continue
    printf '%s' "$encoded" | base64 -d | jq -r '.mergeStateStatus'
  done | grep -cx "UNKNOWN" || true)

  attempt=$((attempt + 1))
  if [ "$still_unknown" -eq 0 ] || [ "$attempt" -ge "$POLL_ATTEMPTS" ]; then
    break
  fi
  echo "$still_unknown PR(s) still UNKNOWN (attempt $attempt/$POLL_ATTEMPTS) — waiting ${POLL_DELAY_SECONDS}s before re-checking."
  sleep "$POLL_DELAY_SECONDS"
done

# --- mergiraf auto-resolution plumbing (ADR-008) ---------------------------
# One-time preconditions for try_mergiraf_resolve, placed after the early
# exit above so a no-PR run never writes the token anywhere. Guarded as a
# unit — fail the run loudly if any breaks: e.g. a silently missing
# driver/attribute would make every merge use git's default driver, quietly
# turning the whole feature into a no-op ("Auto-resolved 0" on a green run
# with no explanation).
#
# - Bot identity for the merge commits; token auth on the remote (checkout
#   runs with persist-credentials:false). The token lives in .git/config for
#   the rest of the job — acceptable while this is the job's last step on an
#   ephemeral runner; revisit if steps are ever added after this one.
# - Merge attributes go to info/attributes so no tracked file is touched,
#   and only mergiraf-supported types get the driver (`mergiraf languages
#   --gitattributes`) — a bare `*` would route binaries (icons, fonts)
#   through the driver, bypassing git's binary detection.
# - Four paths are then opted out entirely (`-merge` = treat as binary ->
#   always conflicts -> labeled), for three different reasons:
#     * yarn.lock — spliced hunk-by-hunk it can describe a dependency graph
#       neither side ever resolved and no `yarn install` ever produced.
#     * skills-lock.json — entries are keyed by a `computedHash`; a merged
#       entry's hash would correspond to no actually-fetched skill.
#     * src/lib/sportmonks/fixtures.json (see ADR-005) and seasons.json (see
#       .github/workflows/sync-seasons.yml) — wholesale-regenerated snapshots,
#       so a structural merge of two of them is a list that was never fetched.
#       ADR-005 covers fixtures.json only; it says nothing about seasons.json.
#
# The binary itself is optional. Its install step is `continue-on-error`
# because auto-resolution is an enhancement layered on the rebase/label
# automation that predates it — a Codeberg outage must not take the whole
# queue-clearing job down. When it is missing, skip the driver setup and run
# label-only, which is exactly the pre-ADR-008 behavior.
MERGIRAF_AVAILABLE=true
if ! command -v mergiraf >/dev/null 2>&1; then
  MERGIRAF_AVAILABLE=false
  echo "::warning::mergiraf not on PATH — running label-only; rebase and labeling are unaffected."
fi

APP_SLUG="${APP_SLUG:-gunnersaurus-bot}"
if [ "$MERGIRAF_AVAILABLE" = "true" ]; then
  # The numeric user id prefix makes the commit author email resolve to the
  # App's bot account (<id>+<slug>[bot]@users.noreply.github.com), linking the
  # avatar on pushed merge commits. Best-effort: without it commits are valid
  # but unlinked, so a lookup failure degrades instead of failing the run.
  BOT_ID=$(gh api "users/${APP_SLUG}[bot]" --jq .id 2>/dev/null) || BOT_ID=""
  if ! {
    git config user.name "${APP_SLUG}[bot]" &&
      git config user.email "${BOT_ID:+${BOT_ID}+}${APP_SLUG}[bot]@users.noreply.github.com" &&
      git remote set-url origin "https://x-access-token:${GH_TOKEN}@github.com/${REPO}.git" &&
      git config merge.mergiraf.name mergiraf &&
      git config merge.mergiraf.driver 'mergiraf merge --git %O %A %B -s %S -x %X -y %Y -p %P -l %L' &&
      {
        mergiraf languages --gitattributes &&
          echo 'yarn.lock -merge' &&
          echo 'skills-lock.json -merge' &&
          echo 'src/lib/sportmonks/fixtures.json -merge' &&
          echo 'src/lib/sportmonks/seasons.json -merge'
      } >>"$(git rev-parse --git-dir)/info/attributes"
  }; then
    echo "::error::mergiraf setup failed — aborting before any PR is touched." >&2
    exit 1
  fi

  # Assert the setup had the intended EFFECT, not merely that its commands
  # exited 0. `mergiraf languages --gitattributes` printing nothing (a build
  # without grammars, a renamed flag, output moved to stderr) exits 0 and
  # leaves .git/info/attributes with only the -merge opt-outs: no file routes
  # to the driver, every merge silently uses git's line-based default, and the
  # run reports "Auto-resolved 0" while green. That is verbatim the failure
  # ADR-008 decision 8 claims this block prevents, and the exit-code check
  # alone does not catch it. `git check-attr` is the cheap oracle for what git
  # will actually do; the driver lookup catches an attribute naming a driver
  # that was never defined, which git resolves silently to its default.
  attr_probe=$(git check-attr merge -- probe.ts 2>/dev/null)
  if [ "${attr_probe##*: }" != "mergiraf" ]; then
    echo "::error::mergiraf driver not registered for .ts (check-attr says '${attr_probe##*: }') — every merge would silently use git's default driver." >&2
    exit 1
  fi
  if ! git config --get merge.mergiraf.driver >/dev/null; then
    echo "::error::merge.mergiraf.driver is not defined — git would fall back to its default driver with no diagnostic." >&2
    exit 1
  fi
fi

has_label() {
  jq -e --arg l "$LABEL" '.labels.nodes | any(.name == $l)' <<<"$1" >/dev/null
}

labeled=0
unlabeled=0
autoresolved=0
rebased=0
failed=0
skipped=0
skipped_failing=0
skipped_workflows=0
unknown=0
label_errors=0
summary_rows=""

# Fixed, short, Title Case "result" vocabulary below — every PR gets exactly
# one of these, regardless of which branch it took, so the step-summary
# bullet list has one consistent line per PR instead of only the
# "interesting" outcomes.
while IFS= read -r encoded; do
  [ -z "$encoded" ] && continue
  pr=$(printf '%s' "$encoded" | base64 -d)

  number=$(jq -r '.number' <<<"$pr")
  title=$(jq -r '.title' <<<"$pr")
  is_draft=$(jq -r '.isDraft' <<<"$pr")
  state=$(jq -r '.mergeStateStatus' <<<"$pr")
  # NONE when no checks have reported yet — jq would emit "null" otherwise,
  # and a bare null must not read as a failure state.
  rollup=$(jq -r '.commits.nodes[0].commit.statusCheckRollup.state // "NONE"' <<<"$pr")
  head_ref=$(jq -r '.headRefName' <<<"$pr")
  # Default to the SAFE value on a missing/!=bool field: treating an unknown
  # PR as a fork skips the push rather than attempting one against a repo we
  # may not be able to write. Hoisted here with the others rather than being
  # parsed inline at the point of use, so a jq failure cannot read as "false".
  is_fork=$(jq -r 'if .isCrossRepository == false then "false" else "true" end' <<<"$pr")
  # Does the PR carry a merge commit? If so a rebase-update would drop it —
  # see the BEHIND case. Defaults to "true" (the conservative branch, which
  # picks the non-destructive merge-update) if the field is missing.
  has_merge_commit=$(jq -r '
    if .headCommits.nodes == null then "true"
    elif .headCommits.nodes | map(.commit.parents.totalCount // 2) | any(. > 1) then "true"
    else "false" end' <<<"$pr")
  url="https://github.com/$REPO/pull/$number"
  result=""

  if has_label "$pr"; then currently_labeled=true; else currently_labeled=false; fi

  echo "== PR #$number ($state, draft=$is_draft, ci=$rollup) =="

  if [ "$is_draft" = "true" ]; then
    echo "  draft — skipping."
    skipped=$((skipped + 1))
    result="Draft"
  else
    case "$state" in
      DIRTY)
        # Attempt a mergiraf resolution first — including already-labeled PRs,
        # since a conflict labeled on an earlier push may have become solvable
        # as the base moved. Three cases never attempt it:
        #
        #   - failing CI: pushing a merge commit re-runs the whole pipeline
        #     (build + e2e + 3-way lighthouse matrix) to reproduce a failure
        #     that is already known, and resolving a conflict does not fix a
        #     failing test. Same cost argument as the BEHIND skip below.
        #   - a `main` head: no bot-authored merge commits pushed to the
        #     shared branch. Such PRs stay label-only for a human.
        #   - cross-repo heads: no push access to forks.
        #
        # Those all fall through to the labeling path, which is the pre-ADR-008
        # behavior, so a skip is never worse than doing nothing.
        resolve_rc=1
        if [ "$MERGIRAF_AVAILABLE" != "true" ]; then
          echo "  mergiraf unavailable — labeling only."
        elif [ "$rollup" = "FAILURE" ] || [ "$rollup" = "ERROR" ]; then
          echo "  CI is $rollup — not attempting auto-resolve; labeling only."
          skipped_failing=$((skipped_failing + 1))
        elif [ "$head_ref" = "$BASE" ] || [ "$is_fork" = "true" ]; then
          echo "  head is the base branch or a fork — not attempting auto-resolve; labeling only."
          skipped=$((skipped + 1))
        else
          try_mergiraf_resolve "$number" "$head_ref"
          resolve_rc=$?
        fi

        if [ "$resolve_rc" -eq 0 ]; then
          autoresolved=$((autoresolved + 1))
          if [ "$currently_labeled" = "true" ]; then
            if gh pr edit "$number" --repo "$REPO" --remove-label "$LABEL"; then
              result="Auto-resolved, unlabeled"
            else
              echo "::error::Failed to remove $LABEL from PR #$number" >&2
              label_errors=$((label_errors + 1))
              result="Auto-resolved, unlabel failed"
            fi
          else
            result="Auto-resolved"
          fi
        elif [ "$resolve_rc" -eq 4 ]; then
          # Our DIRTY snapshot is provably stale (no-op merge, branch gone, or
          # the head moved under us). Like UNKNOWN, this is not a confirmed
          # verdict, so it must not add OR remove a label — the previous code
          # labeled these as conflicting right after proving they merge clean.
          unknown=$((unknown + 1))
          result="Stale (skipped)"
        else
          # 1 = mergiraf couldn't resolve (or wasn't attempted); 2 = a local
          # failure that says nothing about the conflict; 3 = it resolved but
          # the push needs the `workflows` scope the App doesn't hold. GitHub
          # still considers all three DIRTY, so all three label — dropping the
          # label on 2 would silently remove a genuinely conflicting PR from
          # every triage query keyed on it. 2 additionally goes red, and 3
          # additionally counts as a skip.
          suffix=""
          if [ "$resolve_rc" -eq 3 ]; then
            skipped_workflows=$((skipped_workflows + 1))
            suffix=" (needs manual update)"
          elif [ "$resolve_rc" -eq 2 ]; then
            failed=$((failed + 1))
            suffix=" (auto-resolve failed)"
          fi
          if [ "$currently_labeled" = "true" ]; then
            echo "  already labeled — no-op."
            result="Already labeled${suffix}"
          elif gh pr edit "$number" --repo "$REPO" --add-label "$LABEL"; then
            labeled=$((labeled + 1))
            result="Labeled${suffix}"
          else
            echo "::error::Failed to add $LABEL to PR #$number" >&2
            label_errors=$((label_errors + 1))
            result="Label failed${suffix}"
          fi
        fi
        ;;
      BEHIND)
        # A rebase does not fix a failing PR — it re-runs the whole pipeline
        # (build + e2e + 3-way lighthouse matrix) to reproduce a failure that
        # is already known. Skip those, for the same reason drafts are
        # skipped: the CI spend has no near-term payoff. The PR stays BEHIND
        # until someone fixes it, which is the correct end state.
        #
        # Only FAILURE/ERROR skip. PENDING must NOT: a run in flight against
        # a stale base is already invalidated, so rebasing (and cancelling it)
        # is strictly cheaper than letting it finish. A null rollup means no
        # checks have reported yet, which is not a failure either.
        # A rebase-update replays the commits in head-not-base and DROPS merge
        # commits. On a PR that mergiraf already auto-resolved, that silently
        # discards the resolution, resurfaces the original conflict, fails the
        # rebase, and re-labels the PR `conflicting` — undoing the previous
        # run's work and wasting a full CI run in the process. Update such PRs
        # with a merge instead, which preserves it. Harmless here: everything
        # is squash-merged, so the extra merge commit never reaches main's
        # history either way.
        update_args=("$number" --repo "$REPO")
        update_method="rebase"
        if [ "$has_merge_commit" = "true" ]; then
          update_method="merge"
        else
          update_args+=(--rebase)
        fi

        if [ "$rollup" = "FAILURE" ] || [ "$rollup" = "ERROR" ]; then
          echo "  CI is $rollup — skipping update until it is fixed."
          skipped_failing=$((skipped_failing + 1))
          result="Skipped (failing CI)"
        elif update_output=$(gh pr update-branch "${update_args[@]}" 2>&1); then
          [ -n "$update_output" ] && echo "$update_output"
          echo "  updated via $update_method."
          rebased=$((rebased + 1))
          if [ "$currently_labeled" = "true" ]; then
            if gh pr edit "$number" --repo "$REPO" --remove-label "$LABEL"; then
              unlabeled=$((unlabeled + 1))
              result="Rebased, unlabeled"
            else
              echo "::error::Failed to remove $LABEL from PR #$number" >&2
              label_errors=$((label_errors + 1))
              result="Rebased, unlabel failed"
            fi
          else
            result="Rebased"
          fi
        elif grep -qF "$WORKFLOWS_SCOPE_ERR" <<<"$update_output"; then
          # Rebasing replays the PR's commits, so a PR that edits
          # .github/workflows/ can only be rebased by an identity holding the
          # `workflows` scope. This App deliberately does not have it: that
          # scope allows writing workflow files — i.e. running arbitrary code
          # with repo secrets — in every repo the App is installed in, which
          # is far too broad to trade for the ~1 action bump per month this
          # affects. Those PRs get a manual "Update branch" click instead.
          #
          # Reported as a skip, not a failure: the run must stay green, or a
          # routine actions/* bump turns CI red for a known, accepted reason.
          echo "$update_output"
          echo "  touches .github/workflows/ — needs a manual update (see ADR-007)."
          skipped_workflows=$((skipped_workflows + 1))
          result="Skipped (needs manual update)"
        else
          echo "$update_output"
          # A failed rebase is ambiguous: it could mean a new conflict landed
          # between the query above and this call (a race), or a transient
          # error. Re-query mergeStateStatus to tell those apart before
          # deciding whether to label or just retry on the next push.
          echo "  rebase call failed — re-checking for a conflict race."
          # $owner/$name/$number are GraphQL variables (bound via -f/-F
          # below), not shell vars, so the single-quoted query intentionally
          # doesn't expand.
          # shellcheck disable=SC2016
          if recheck_output=$(gh api graphql \
            -f query='query($owner:String!,$name:String!,$number:Int!){
              repository(owner:$owner,name:$name){
                pullRequest(number:$number){ mergeStateStatus }
              }
            }' \
            -f owner="$OWNER" -f name="$NAME" -F number="$number" \
            --jq '.data.repository.pullRequest.mergeStateStatus' 2>&1); then
            recheck_state="$recheck_output"
          else
            echo "::warning::Recheck query for PR #$number failed: $recheck_output" >&2
            recheck_state="UNKNOWN"
          fi
          if [ "$recheck_state" = "DIRTY" ]; then
            echo "  confirmed conflicting after failed rebase."
            if [ "$currently_labeled" = "true" ]; then
              result="Rebase failed, already labeled"
            elif gh pr edit "$number" --repo "$REPO" --add-label "$LABEL"; then
              labeled=$((labeled + 1))
              result="Rebase failed, labeled"
            else
              echo "::error::Failed to add $LABEL to PR #$number" >&2
              label_errors=$((label_errors + 1))
              result="Rebase failed, label failed"
            fi
          else
            echo "  transient failure (state=$recheck_state) — will retry on next push."
            failed=$((failed + 1))
            result="Rebase failed"
          fi
        fi
        ;;
      UNKNOWN)
        # GitHub hasn't finished computing merge state — this is NOT a
        # confirmed-clean result, so unlike the catch-all below it must never
        # touch an existing label. Skip and let the next push re-evaluate it.
        echo "  still unknown after polling — skipping, no label change."
        unknown=$((unknown + 1))
        result="Unknown"
        ;;
      *)
        if [ "$currently_labeled" = "true" ]; then
          if gh pr edit "$number" --repo "$REPO" --remove-label "$LABEL"; then
            unlabeled=$((unlabeled + 1))
            result="Unlabeled"
          else
            echo "::error::Failed to remove $LABEL from PR #$number" >&2
            label_errors=$((label_errors + 1))
            result="Unlabel failed"
          fi
        else
          echo "  clean/blocked/unstable — no-op."
          result="Clean"
        fi
        ;;
    esac
  fi

  summary_rows+="- [#$number]($url) $title — $state — $result"$'\n'
done <<<"$prs"

echo
printf 'Labeled %d, unlabeled %d, rebased %d, auto-resolved %d, failed %d, label errors %d, skipped %d draft(s), skipped %d failing CI, skipped %d workflow-file PR(s), %d still unknown.\n' \
  "$labeled" "$unlabeled" "$rebased" "$autoresolved" "$failed" "$label_errors" "$skipped" "$skipped_failing" "$skipped_workflows" "$unknown"

if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "## PR conflict/rebase check — base: $BASE"
    echo
    printf '%s\n' "$summary_rows"
    echo "| Status | Count |"
    echo "|---|---|"
    echo "| Labeled | $labeled |"
    echo "| Unlabeled | $unlabeled |"
    echo "| Rebased | $rebased |"
    echo "| Auto-resolved | $autoresolved |"
    echo "| Failed | $failed |"
    echo "| Label errors | $label_errors |"
    echo "| Skipped drafts | $skipped |"
    echo "| Skipped (failing CI) | $skipped_failing |"
    echo "| Skipped (needs manual update) | $skipped_workflows |"
    echo "| Unknown or stale (label untouched) | $unknown |"
  } >> "$GITHUB_STEP_SUMMARY"
fi

# Fail the run if any write failed — a broken App token/permission should
# turn this red, not silently do nothing while reporting green.
if [ "$failed" -gt 0 ] || [ "$label_errors" -gt 0 ]; then
  echo "::error::$failed rebase/auto-resolve failure(s) and $label_errors label-edit failure(s) — see summary above." >&2
  exit 1
fi

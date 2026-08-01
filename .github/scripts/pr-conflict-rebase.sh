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
#                                attempted on a `main` head, on cross-repo
#                                heads (no push access to forks), or when the
#                                head commit's statusCheckRollup is
#                                FAILURE/ERROR — see the skip rationale below.
#   mergeStateStatus BEHIND   -> clean but stale, rebase via the GitHub API
#                                (a failed rebase is re-checked below to tell
#                                a new conflict apart from a transient error),
#                                UNLESS the head commit's statusCheckRollup is
#                                FAILURE/ERROR — see the skip rationale below.
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

# Attempt to fully resolve a DIRTY PR by merging $BASE into its head with
# mergiraf. Deterministic — no agent, no LLM. Works on a detached HEAD so the
# loop never leaves local branches behind. Returns:
#   0 -> fully resolved and pushed (PR is no longer conflicting)
#   1 -> mergiraf could not fully resolve (caller falls through to labeling)
#   2 -> transient/infrastructure failure (fetch, checkout, push race) — the
#        merge state we queried may be stale, so the caller records a red-run
#        failure instead of labeling on stale data
#   3 -> resolved, but the push was rejected because the merge commit updates
#        .github/workflows/ and this App deliberately lacks `workflows: write`
#        (ADR-007). Caller labels as usual and reports a skip, not a failure.
try_mergiraf_resolve() {
  local number="$1" head_ref="$2" push_output
  if ! git fetch -q origin "+refs/heads/$head_ref:refs/remotes/origin/$head_ref" \
    "+refs/heads/$BASE:refs/remotes/origin/$BASE"; then
    echo "::warning::PR #$number: fetch failed — infrastructure, not a conflict verdict." >&2
    return 2
  fi
  if ! git checkout -q --detach "origin/$head_ref"; then
    # Almost certainly a dirty tree left by a failed abort in a previous
    # iteration — reset so the NEXT iteration isn't poisoned too. Without
    # this guard, one bad abort would make every later merge fail from a
    # stale HEAD and mislabel those PRs as unresolvable on a green run.
    echo "::warning::PR #$number: checkout failed — resetting working tree." >&2
    git merge --abort 2>/dev/null || git reset --hard -q
    return 2
  fi
  if git merge --no-edit "origin/$BASE"; then
    if [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$head_ref")" ]; then
      # No-op merge ("Already up to date"): the DIRTY snapshot we queried
      # went stale and the PR resolved itself. Nothing was merged, so no
      # push and no author comment — fall through to labeling; the next
      # run's clean-state pass settles the label.
      echo "  merge was a no-op — queried DIRTY state was stale."
      return 1
    fi
    if git grep -qI -e '^<<<<<<< ' -e '^>>>>>>> ' HEAD; then
      # Defense in depth: never push a resolution containing conflict
      # markers, even if the merge driver exited 0 with markers left in a
      # file. (Detached HEAD, so the stray merge commit is simply abandoned.)
      echo "::warning::PR #$number: conflict markers in merge result — not pushing." >&2
      return 1
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
    git checkout -q --detach "origin/$BASE"
    if grep -qF 'refusing to allow a GitHub App to create or update workflow' <<<"$push_output"; then
      # Same wall the BEHIND path hits (ADR-007): merging base into head
      # replays base's workflow-file edits into the merge commit, and this
      # App has no `workflows` scope. Not a failure — a known, accepted
      # limitation that costs one manual conflict resolution.
      echo "  merge result touches .github/workflows/ — needs a manual resolution (see ADR-007)."
      return 3
    fi
    echo "::warning::PR #$number: mergiraf resolved the conflict but the push failed (likely a race with a new push to $head_ref)." >&2
    return 2
  fi
  # --abort restores the pre-merge state; if it refuses (rare), reset --hard
  # is the guaranteed cleanup on a detached HEAD (also clears MERGE_HEAD).
  git merge --abort 2>/dev/null || git reset --hard -q
  echo "  mergiraf could not fully resolve."
  return 1
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
# - The two lockfiles and the two Sportmonks data files are then opted out
#   entirely (`-merge` = treat as binary -> always conflicts -> labeled). A
#   lockfile spliced hunk-by-hunk can describe a dependency graph neither
#   side ever resolved, and the Sportmonks JSON is wholesale-regenerated by
#   sync-fixtures/sync-seasons (ADR-005) — a structural merge of two
#   generated snapshots is a fixture list that was never fetched.
APP_SLUG="${APP_SLUG:-gunnersaurus-bot}"
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
        if [ "$rollup" = "FAILURE" ] || [ "$rollup" = "ERROR" ]; then
          echo "  CI is $rollup — not attempting auto-resolve; labeling only."
        elif [ "$head_ref" = "main" ] ||
          [ "$(jq -r '.isCrossRepository' <<<"$pr")" = "true" ]; then
          echo "  head is main or a fork — not attempting auto-resolve; labeling only."
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
        elif [ "$resolve_rc" -eq 2 ]; then
          failed=$((failed + 1))
          result="Auto-resolve failed (transient)"
        else
          # 1 = mergiraf couldn't resolve (or wasn't attempted); 3 = it did,
          # but the push needs the `workflows` scope the App doesn't hold.
          # Either way GitHub still considers the PR conflicting, so both take
          # the same labeling path — 3 only adds a suffix and a skip count so
          # the summary distinguishes "unresolvable" from "needs a human".
          suffix=""
          if [ "$resolve_rc" -eq 3 ]; then
            skipped_workflows=$((skipped_workflows + 1))
            suffix=" (needs manual update)"
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
        if [ "$rollup" = "FAILURE" ] || [ "$rollup" = "ERROR" ]; then
          echo "  CI is $rollup — skipping rebase until it is fixed."
          skipped_failing=$((skipped_failing + 1))
          result="Skipped (failing CI)"
        elif rebase_output=$(gh pr update-branch "$number" --repo "$REPO" --rebase 2>&1); then
          [ -n "$rebase_output" ] && echo "$rebase_output"
          echo "  rebased."
          rebased=$((rebased + 1))
          if [ "$currently_labeled" = "true" ]; then
            if gh pr edit "$number" --repo "$REPO" --remove-label "$LABEL"; then
              result="Rebased, unlabeled"
            else
              echo "::error::Failed to remove $LABEL from PR #$number" >&2
              label_errors=$((label_errors + 1))
              result="Rebased, unlabel failed"
            fi
          else
            result="Rebased"
          fi
        elif grep -qF 'refusing to allow a GitHub App to create or update workflow' <<<"$rebase_output"; then
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
          echo "$rebase_output"
          echo "  touches .github/workflows/ — needs a manual update (see ADR-007)."
          skipped_workflows=$((skipped_workflows + 1))
          result="Skipped (needs manual update)"
        else
          echo "$rebase_output"
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
    echo "| Still unknown | $unknown |"
  } >> "$GITHUB_STEP_SUMMARY"
fi

# Fail the run if any write failed — a broken App token/permission should
# turn this red, not silently do nothing while reporting green.
if [ "$failed" -gt 0 ] || [ "$label_errors" -gt 0 ]; then
  echo "::error::$failed rebase/auto-resolve failure(s) and $label_errors label-edit failure(s) — see summary above." >&2
  exit 1
fi

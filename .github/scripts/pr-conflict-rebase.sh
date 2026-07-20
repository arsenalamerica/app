#!/usr/bin/env bash
#
# Rebase or label every open, non-draft PR targeting the given base branch in
# this repo. Invoked by .github/workflows/pr-conflict-rebase.yml on every push
# to main/develop, scoped to only that base branch.
#
#   mergeStateStatus DIRTY    -> real conflicts, add the `conflicting` label.
#   mergeStateStatus BEHIND   -> clean but stale, rebase via the GitHub API
#                                (a failed rebase is re-checked below to tell
#                                a new conflict apart from a transient error).
#   mergeStateStatus UNKNOWN  -> GitHub hasn't finished computing merge state
#                                even after the delay below; skip WITHOUT
#                                touching any existing label (this is not a
#                                confirmed-clean result).
#   anything else             -> confirmed clean/blocked/unstable; no-op, and
#                                remove a stale `conflicting` label if present.
#
# Requires: GH_TOKEN — a GitHub App installation token. $1 — the base branch.
#
# This script is called ONLY by .github/workflows/pr-conflict-rebase.yml.
# Do not reference it from any other workflow.
#
# Exits nonzero if any write (label edit, rebase) failed, so a broken App
# token/permission doesn't silently show green while doing nothing.

set -uo pipefail

BASE="${1:?usage: pr-conflict-rebase.sh <base-branch>}"
REPO="$GITHUB_REPOSITORY"
OWNER="${REPO%%/*}"
NAME="${REPO##*/}"
LABEL="conflicting"

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
            number title isDraft mergeStateStatus
            labels(first:20){ nodes{ name } }
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

has_label() {
  jq -e --arg l "$LABEL" '.labels.nodes | any(.name == $l)' <<<"$1" >/dev/null
}

labeled=0
unlabeled=0
rebased=0
failed=0
skipped=0
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
  url="https://github.com/$REPO/pull/$number"
  result=""

  if has_label "$pr"; then currently_labeled=true; else currently_labeled=false; fi

  echo "== PR #$number ($state, draft=$is_draft) =="

  if [ "$is_draft" = "true" ]; then
    echo "  draft — skipping."
    skipped=$((skipped + 1))
    result="Draft"
  else
    case "$state" in
      DIRTY)
        if [ "$currently_labeled" = "true" ]; then
          echo "  already labeled — no-op."
          result="Already labeled"
        elif gh pr edit "$number" --repo "$REPO" --add-label "$LABEL"; then
          labeled=$((labeled + 1))
          result="Labeled"
        else
          echo "::error::Failed to add $LABEL to PR #$number" >&2
          label_errors=$((label_errors + 1))
          result="Label failed"
        fi
        ;;
      BEHIND)
        if gh pr update-branch "$number" --repo "$REPO" --rebase; then
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
        else
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
printf 'Labeled %d, unlabeled %d, rebased %d, failed %d, label errors %d, skipped %d draft(s), %d still unknown.\n' \
  "$labeled" "$unlabeled" "$rebased" "$failed" "$label_errors" "$skipped" "$unknown"

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
    echo "| Failed | $failed |"
    echo "| Label errors | $label_errors |"
    echo "| Skipped drafts | $skipped |"
    echo "| Still unknown | $unknown |"
  } >> "$GITHUB_STEP_SUMMARY"
fi

# Fail the run if any write failed — a broken App token/permission should
# turn this red, not silently do nothing while reporting green.
if [ "$failed" -gt 0 ] || [ "$label_errors" -gt 0 ]; then
  echo "::error::$failed rebase failure(s) and $label_errors label-edit failure(s) — see summary above." >&2
  exit 1
fi

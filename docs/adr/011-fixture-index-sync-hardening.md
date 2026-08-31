# ADR-011: Fixture index sync hardening

## Status

Accepted

## Context

The 2026-08-30 sync (PR #323, commit `c5aa372`) committed 8 provisional Champions League
league-phase fixture ids to `src/lib/sportmonks/fixtures.json`. Sportmonks marks such fixtures
`placeholder: true`: a slot reserved before the league-phase draw resolves, carrying an id
that Sportmonks deletes and reissues once the real pairing is known. ADR-005's sync script
had no concept of this — it wrote every id the `/fixtures/between` endpoint returned.

Once the draw resolved, the 8 placeholder ids stopped existing. Every deferred fixture card
on `/fixtures` that dispatched to one of them crashed: Sentry APP-M (150 events / 23 users in
one hour) and APP-D (149 events). The index was repaired directly in PR #339. Issue #337
tracks the remediation; PR #340 (stacked below this one) added a runtime guard in the data
layer for the case where a bad id reaches the index anyway; this PR hardens the sync script
so a dead id does not reach the index in the first place.

## Decision

Filter `placeholder: true` fixtures at fetch time, validate every surviving id against
`/fixtures/{id}` before writing the index, and let the workflow's own PR auto-merge once the
required checks pass. The reasoning for each follows.

### Why a provisional id is a different failure class than a rescheduled fixture

ADR-005's sync cadence was built for the ordinary case: a fixture gets postponed or moved for
broadcast, and its `kickoff` changes while its `id` stays valid. That case is naturally
self-correcting — the next day's cron re-fetches the same id with the new kickoff and the
committed file updates. A placeholder id is not a variant of that case: the id itself stops
resolving, and the failure is silent until a request hits that specific card, which is why it
surfaced as a page-crash spike rather than a sync-time error.

The script rebuilds `byId` from scratch on every run and writes the result wholesale, so it
does eventually drop an id that `/fixtures/between` stops returning — the repair in PR #339
is exactly that. What it cannot do is drop an id the collection endpoint still returns but
that no longer resolves individually, and it cannot act at all until a human merges the PR it
opens. Those are the two gaps this ADR closes: validation for the first, auto-merge for the
second. Placeholder filtering is upstream of both — it keeps the provisional ids out rather
than relying on either to clean up after them.

Filtering `placeholder: true` at fetch time (`isPlaceholderFixture`,
`scripts/sync-fixtures.mjs`) removes the predictable source of these ids — competitions with a
multi-stage draw. It does not, on its own, guarantee every id that does get written stays
resolvable; Sportmonks can still withdraw or renumber a fixture for reasons this filter does
not model. That gap is what per-id validation closes.

### Why validation keys on `data` presence, not truthiness or `message`

Sportmonks does not 404 a missing single entity. `/fixtures/{id}` for a dead id answers HTTP
200 with a body carrying no `data` key at all — only a generic `message`. Two tempting checks
were rejected:

- **Presence or content of `message`.** This is the dangerous one. Sportmonks returns the same
  generic string — "No result(s) found matching your request. Either the query did not return
  any results or you don't have access to it via your current subscription." — on a *legitimately
  empty collection* as well. `/fixtures/between` for a window with no matches answers
  `data: [], message: "No result(s) found…"`. Branching on `message` would therefore treat an
  ordinary off-season response as a failure, which is exactly the regression ADR-005's
  `getNextFixture` off-season path (issue #182) exists to prevent. The message also does double
  duty for "not found" and "not licensed", so it cannot distinguish those either.
- **Truthiness of `data`.** This happens to work for the two shapes observed today (`undefined`
  when absent, a truthy `[]` or object when present), but it encodes an assumption about which
  values Sportmonks may put in `data` rather than about whether the entity exists. A future
  `data: null` or `data: 0` would silently reclassify a valid response as a dead id.

`fixtureIdResolves` (`scripts/sync-fixtures.mjs`) checks `'data' in body` — the one predicate
that is true exactly when the entity exists and false exactly when it does not, regardless of
what the key holds or what else the response carries. `sportmonksFetch` in #340 uses the same
predicate for the same reason.

### Why validation needs a drop cap, not just `isEmptyOverwrite`

ADR-005 already guarded against writing an empty index over a non-empty committed one
(`isEmptyOverwrite`), for the case of an upstream fetch returning nothing. Per-id validation
adds a second path to that same outcome, and `isEmptyOverwrite` only covers part of it: it
short-circuits on `nextFixtures.length > 0`, so it fires at exactly zero and never on a
partial shrink.

That partial case is the dangerous one, and it is created by this ADR rather than inherited.
Validation turns one fetch into ~55 independent per-id checks, each an opportunity to misfire.
If 40 of 47 fail, seven fixtures survive, `isEmptyOverwrite` sees a non-empty list and permits
the write, and — because this same ADR removes human review — a 40-fixture deletion merges
with nobody looking. No required check catches it either: `/fixtures` renders a seven-fixture
schedule perfectly well, so `e2e`, the Lighthouse matrix, and the preview deployment are all
green on a gutted index.

There is a deterministic version too. `'data' in body` is false both for "deleted" and for
"outside your subscription", so a competition the token can read through the team-scoped
collection endpoint but not per-fixture would be stripped out on every run, permanently,
with self-healing never arriving.

`isExcessiveDrop` therefore caps how many ids one run may drop (`MAX_VALIDATION_DROPS`, set to
2) and **throws** rather than skipping the write the way `isEmptyOverwrite` does. The
difference in handling is deliberate: an empty upstream response is transient and the next
cron retries, whereas a subscription-scope change repeats every run and needs a human. The cap
is not zero because fixtures genuinely are withdrawn, one at a time.

### Why auto-merge is an acceptable reversal of ADR-005's human-review decision here

ADR-005 decided the daily sync opens a PR for human review on every change, on the reasoning
that schedule shifts are rare enough that the review cost is near zero. That reasoning still
holds for *reviewing* the diff — but review was never verifying content Sportmonks itself
already vouches for; the reviewer was checking that the script behaved (right shape, no
unexpected mass deletion), not adjudicating a football schedule. This PR now asserts that
behavioral property in code instead of by eye:

- **Placeholder filtering** removes the one class of id the incident showed a human reviewer
  would not have caught either — nothing in an `{ id, kickoff }` diff signals that an id is
  provisional.
- **Per-id validation** confirms every id in the diff resolves on Sportmonks at write time,
  which is strictly more verification than a human glancing at a kickoff-timestamp diff
  performed.
- **`isExcessiveDrop`** replaces the other half of what the reviewer was doing — noticing an
  unexpected mass deletion — by aborting the run instead of opening a PR at all.

What bounds the residual risk of merging without a human in the loop:

- The PR is bot-authored (`gunnersaurus-bot[bot]`, the same GitHub App used for
  `sync-seasons.yml`, `pr-conflict-rebase.yml`, and `dependabot-auto-merge.yml`).
- It touches exactly one file, `src/lib/sportmonks/fixtures.json`, containing only `{ id,
  kickoff }` — no licensed match data per ADR-005's public-repo constraint.
- Auto-merge does not bypass any required check. The full `ci.yml` pipeline still gates the
  merge, including `e2e` and the three `lighthouse (…)` matrix contexts against a live Vercel
  preview of the exact diff, plus the separate `shared-cd-preview` rule requiring a successful
  Preview deployment.
  A validated-but-malformed write (wrong field, corrupted sort, truncated file) still has to
  survive `/fixtures` rendering correctly in a real preview before it reaches `main`.

Auto-merge is enabled via `gh pr merge --auto --squash`, called on both the freshly-created
and reused-existing-PR paths (`.github/workflows/sync-fixtures.yml`), and — as with every other
workflow in this repo that pushes bot commits meant to trigger downstream CI — uses the GitHub
App token, never `GITHUB_TOKEN`. GitHub raises no workflow runs from `GITHUB_TOKEN`-triggered
events, so a `GITHUB_TOKEN`-authored merge would land a commit on `main` that triggers nothing
downstream, silently breaking `pr-conflict-rebase.yml`'s ability to re-baseline the rest of the
open-PR queue. See `.github/CLAUDE.md`'s Dependabot Auto-merge and PR Conflict Check sections
for the same rationale applied to those two workflows.

### Rate-limit headroom

Per-id validation adds one Sportmonks request per fixture the collection endpoint returns
after placeholder filtering — every id is probed, whether or not it survives. The committed
index held 55 entries before the #339 repair and 47 after, so a daily run costs roughly that
many extra requests.

The headroom figures come from a manual probe on 2026-08-30 against the current token, not
from anything in this repo: probing all 55 then-committed ids left `rate_limit.remaining: 2615`
on a per-entity cap of 3000/hour. (The two numbers do not differ by exactly 55 because the
counter is a rolling hourly window that other calls in the same session also drew from.) The
sync runs once daily, so even a season with double the fixture count would not approach the
cap.

If that headroom ever tightens — a lower-tier plan, a shared token, additional daily jobs
against the same key — the response is to drop per-id validation, not to work around it.
Placeholder filtering alone removes the specific failure class this incident exposed; the
runtime guard added in #340 (`src/lib/sportmonks/sportmonks.ts`, with the home-page path
covered in `src/lib/data/fixtures.ts`) is the actual
safety net for any id that still reaches the index unvalidated. Validation is defense in depth
on top of that guard, not a replacement for it, and is the cheaper of the two to remove.

### Rejected alternatives

- **Rely on the runtime guard alone (#340), skip sync-time validation.** The guard turns a
  dead id into a single-card error fallback instead of a page crash, which is the correct
  behavior once a bad id is already committed. But it does nothing to keep a bad id out of the
  index, so every deferred card for that id would render a permanent error fallback until the
  next manual repair — the #339 outcome, just contained to one card instead of many. Validating
  at sync time keeps the index itself accurate, which the runtime guard cannot do from inside a
  single request.
- **Commit directly from the workflow, no PR.** Removes the review step ADR-005 established
  without adding anything in its place. The auto-merged PR still passes through every required
  check — `e2e`, the `lighthouse (…)` matrix, `build` against a live preview — before landing;
  a direct commit
  to `main` would skip all of it. The PR is also the audit trail: `git log` on
  `fixtures.json` stays a list of reviewable (if now auto-merged) diffs instead of opaque
  workflow-authored commits.
- **Validate only the ids that changed, not the full committed set.** Cheaper, but does not
  catch an id that was valid at commit time and has since been withdrawn — exactly the failure
  this ADR exists to prevent, since the incident id was valid when written and invalid by the
  time it was rendered. Full-set validation is the only version of this check that also
  self-heals a committed id that the collection endpoint still returns but that no longer
  resolves individually. (An id the collection endpoint drops is already removed by the
  wholesale rebuild, with or without validation.)

## Consequences

- **ADR-005's sync-maintenance decision is narrowly superseded.** Its committed-index
  rationale (licensing-safe `{ id, kickoff }` only), the two cached fetchers, the PPR shell,
  and per-card isolation are unchanged and still govern. Only the "opens a PR for human
  review" / "Schedule shifts land as human-reviewed PRs" cadence is superseded, by the
  auto-merge decision above.
- **A sync run now makes one additional Sportmonks request per non-placeholder fixture the
  collection endpoint returns** — ~47 per day at the current index size. Documented headroom
  above; revisit if the token's rate limit ever tightens.
- **A transport failure during validation aborts the run without writing**, the same behavior
  as a pagination-fetch failure — `fixtureIdResolves` throws on a non-`ok` response rather than
  treating it as "id does not exist."
- **The sync PR merges without a human reviewing the diff**, contingent on every required CI
  check passing against a live preview built from that exact diff. A reviewer can still catch
  it before merge if CI is slow to complete; nothing prevents a manual look.
- **A partial validation wipe now aborts the run.** `isEmptyOverwrite` fires only at exactly
  zero, so `isExcessiveDrop` covers the shrink case it cannot see. It throws rather than
  skipping the write, because a subscription-scope change repeats on every run instead of
  self-correcting. Removing either guard reopens a path to an auto-merged index deletion.

# 009. Lighthouse preview bypass and recalibrated thresholds

## Status

Accepted

## Context

The CI Lighthouse gate ran against Vercel preview deployments using
`x-vercel-protection-bypass` in the URL query string. That parameter authorizes only
the document request. Every subresource — `_next/static/*` chunks and
`manifest.webmanifest` — was 302-redirected to `vercel.com/sso-api` by Vercel
Deployment Protection.

Measured from CI artifacts on a *passing* main run: 2 of 87 requests returned 200, and
**zero JavaScript files loaded**. Lighthouse was scoring a blank shell.

Two consequences followed:

1. **`best-practices` was measuring infra noise.** The SSO redirect chain tripped
   `errors-in-console`, `inspector-issues`, and `third-party-cookies`. A passing main run
   scored exactly 0.96 against a 0.96 gate — zero headroom — so the check passed or failed
   by chance. PR #282 flipped fail to pass on a bare re-run with no code change, and PR #286
   (`next` 16.3.1) was blocked by it despite every substantive check passing.

2. **The `performance` thresholds (0.85 root/table, 0.92 fixtures) were calibrated against
   a page that never loaded its own JavaScript**, and so never measured the real app.

## Decision

Append `&x-vercel-set-bypass-cookie=samesitenone` to the Lighthouse URL in
`.github/workflows/ci.yml`. Vercel then sets a bypass cookie on the first response so
subresource requests are authorized. `samesitenone` rather than `true` because the
redirect chain crosses origins.

Recalibrate `categories:performance` in `lighthouserc.json` from 0.85/0.92 to **0.55** for
all routes, reflecting the first honest measurements.

## Consequences

- `best-practices` now scores **1.00** on all three routes, up from 0.93–0.96, and becomes
  a meaningful gate rather than a coin flip.
- Lighthouse now loads the real page: 45 of 47 requests succeed, 21 JS chunks, 1.47 MB
  transferred.
- Observed performance is 0.62–0.66 median with high run-to-run variance (root measured
  0.38 / 0.62 / 0.63 across three runs). `lighthouse-ci` aggregates optimistically, taking
  the best run, so 0.55 leaves headroom for that variance.
- **0.55 is a deliberately weak gate.** It ratchets from the honest baseline rather than
  asserting the app is fast. The real performance work — 1.47 MB of transfer across 21
  chunks — is deferred to a follow-up, and this threshold should be raised as that lands.
- Historical Lighthouse scores in this repo are not comparable to post-change scores.

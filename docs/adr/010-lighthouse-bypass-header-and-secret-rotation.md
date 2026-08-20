# 010. Lighthouse bypass via header, and bypass secret rotation

## Status

Accepted (supersedes ADR-009)

## Context

ADR-009 addressed the same problem by appending `x-vercel-set-bypass-cookie=samesitenone`
to the query string. That fixed the audits but left the bypass secret in the URL, and so in
every uploaded report. This ADR replaces that mechanism.

The CI Lighthouse gate audited Vercel preview deployments with the Deployment
Protection bypass secret in the URL query string. That secret authorizes only the request
it is attached to, so it covered the document and nothing else. Every subresource —
`_next/static/*` chunks, CSS, `manifest.webmanifest` — was 302-redirected to
`vercel.com/sso-api`.

Measured from CI artifacts on a *passing* run of `main`: **2 of 87 requests returned 200,
and zero JavaScript files loaded.** Lighthouse was scoring a blank shell.

Three problems followed:

1. **`best-practices` measured infrastructure noise, not the app.** The SSO redirect chain
   tripped `errors-in-console`, `inspector-issues`, and `third-party-cookies`. A passing
   `main` run scored exactly 0.96 against a 0.96 gate — zero headroom — so the check passed
   or failed by chance. PR #282 flipped fail to pass on a bare re-run with no code change,
   and PR #286 (`next` 16.3.1) was blocked by it while every substantive check passed.

2. **The performance thresholds never measured this app.** 0.85 (root/table) and 0.92
   (fixtures) were calibrated against a page that never executed its own JavaScript.

3. **The bypass secret leaked into public artifacts.** Lighthouse records
   `finalDisplayedUrl` verbatim, so the query parameter was written in cleartext into every
   uploaded report. This repository is public; the token appeared 6 times in a single
   downloaded report.

## Decision

Send the bypass as a **header** rather than a query parameter, via `extraHeaders` in
`lighthouserc.js`, paired with `x-vercel-set-bypass-cookie`. Vercel sets a bypass cookie on
the document response that Chrome replays for every subresource. Vercel documents that
pairing for headers only, which is why the config moved from `.json` to `.js` — it needs to
read the secret from the environment at collect time.

`lighthouserc.js` **throws when the secret is absent** rather than auditing the wrong page.
Vercel answers an unauthorized preview request with a 302 to `vercel.com/login`, not a 4xx,
and Lighthouse only errors when the document request is >= 400. A missing secret otherwise
produces a full set of plausible scores for Vercel's login page attributed to this app.

The action's own `uploadArtifacts` is disabled and a redaction step scrubs the secret from
`.lighthouseci/` before `actions/upload-artifact` runs, because Lighthouse copies resolved
settings (`configSettings.extraHeaders`) into every report.

Recalibrate `categories:performance` from 0.85/0.92 to **0.5** for all routes.

## Consequences

- `best-practices` scores **1.00** on all three routes, up from 0.93–0.96, and is a
  meaningful gate rather than a coin flip.
- Lighthouse now loads the real page: 45 of 47 requests succeed, 21 JS chunks, ~1.5 MB.
- Measured performance is root 0.62, fixtures 0.66–0.73, table 0.77–0.86, with individual
  runs as low as 0.32. `lighthouse-ci` aggregates optimistically (best of 3), so 0.5 leaves
  headroom for that variance.
- **0.5 is a deliberately weak gate.** It ratchets from an honest baseline rather than
  asserting the app is fast. The real performance work — ~1.5 MB across 21 chunks — is
  deferred, and this threshold should rise as that lands.
- **`VERCEL_BYPASS_SECRET` must be rotated.** Every Lighthouse artifact produced before this
  change contains the token in cleartext in a public repository.
- Historical Lighthouse scores in this repository are not comparable to later ones.
- Any future change that publishes report files must keep the redaction step in front of the
  upload.

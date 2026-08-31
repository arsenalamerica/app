# ADR-013: Filter third-party mobile webview errors with `ignoreErrors` and `denyUrls`

## Status

Accepted

## Context

Mobile in-app browsers (Instagram, Facebook, LinkedIn) inject their own instrumentation
scripts into every page they render. When those scripts throw, `@sentry/nextjs` reports the
error from our client as if it were ours, and the Sentry "Create GH Issue" alert rule opens a
GitHub bug for it. Five open issues were nothing but this:

| Issues | Shape |
| --- | --- |
| #193, #169 | iOS webview bridge, every frame at `app:///` |
| #164, #152 | Android webview bridge, every frame at `app://navigation_performance_logger_android` |
| #161 | `TypeError: Load failed`, no stack at all — Safari's message for a fetch aborted by navigation |

None have an application fix. They arrive as long as people open the site from a social app,
so the stream is unbounded and non-actionable. Issue #255 weighed four options: message and
URL pattern filters; `thirdPartyErrorFilterIntegration`; Sentry inbound filters in project
settings; and narrowing the alert rule.

`thirdPartyErrorFilterIntegration` looked strongest on paper. It keys on provenance rather
than message text: the Sentry bundler plugin stamps first-party modules with an
`applicationKey`, and the integration drops events whose frames carry no matching stamp. That
removes the class rather than enumerating instances, and needs no maintenance as vendors
rename their bridges.

## Decision

Ship option 1. `src/instrumentation-client.ts` sets:

- `ignoreErrors: [/^(TypeError: )?Load failed$/]` for #161. Sentry matches `ignoreErrors`
  against both the bare exception value and `Type: value`, so one anchored alternation covers
  both forms.
- `denyUrls: [/^app:\/\//]` for #193, #169, #164 and #152. Sentry resolves the URL from the
  last valid frame of the root exception, which for all four is under the `app:` scheme —
  a scheme nothing we ship uses.

**`thirdPartyErrorFilterIntegration` was implemented, then reverted, because it breaks the
build.** Setting `applicationKey` makes the SDK register a Turbopack loader on
`*.{ts,tsx,js,jsx,mjs,cjs}` that injects a module-metadata IIFE into every source module. On
`src/lib/actions/loadDeferredFixture.ts` that invalidates the `'use server'` module: Next then
traces the file into the client graph and fails the build on its `next/headers` import
(`Preview` deploy for commit `196e7e6`). The loader has no path-exclusion option beyond the
hardcoded `next/dist/build/polyfills`, so there is no way to opt server-action files out.

Two further problems surfaced while evaluating it, and are worth recording in case the
Sentry-side bug is fixed and someone revisits:

- `drop-error-if-contains-third-party-frames` uses `Array.some`, so a single unstamped frame
  drops the whole event. Unstamped first-party frames are normal (excluded polyfills,
  generated runtime chunks), so this would have cost real client errors — which #255
  explicitly requires we keep. `drop-error-if-exclusively-contains-third-party-frames` is the
  correct variant.
- The integration returns early when an event has no frames, so a stackless event is passed
  through untouched. #161 would not have been covered by it either way and always needed the
  `ignoreErrors` entry.

Sentry inbound filters were rejected because they are neither version-controlled nor visible
in review. Narrowing the alert rule remains worth doing separately: filtering decides what
Sentry stores, the alert rule decides what becomes a GitHub bug, and those are usefully
separate controls.

## Consequences

- The five issues stop filing bugs, and the build is unaffected.
- The filters are pattern-based, so they need revisiting if a vendor moves off the `app:`
  scheme. That is the cost of not using the provenance filter, and is accepted.
- `Load failed` is Safari's message for any failed fetch, not only an aborted one, so a
  genuine network failure on a bare fetch is silenced too. At the point of filtering the two
  are indistinguishable.
- Both filters are enforced by `Sentry.eventFiltersIntegration`, which is a default
  integration. Passing `integrations` as an array merges with the defaults rather than
  replacing them; setting `defaultIntegrations: false` would silently disable both.

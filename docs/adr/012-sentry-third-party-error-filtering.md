# ADR-012: Filter third-party client errors by bundle provenance

## Status

Accepted

## Context

Mobile in-app browsers (Instagram, Facebook, LinkedIn) inject their own instrumentation
scripts into every page they render. When those scripts throw, `@sentry/nextjs` reports the
error from our client as if it were ours, and the Sentry "Create GH Issue" alert rule opens a
GitHub bug for it. Five open issues were nothing but this: #193 and #169 (iOS webview bridge,
frames at `app:///`), #164 and #152 (Android bridge, `app://navigation_performance_logger_android`),
and #161 (`TypeError: Load failed`, Safari's message for a fetch aborted by navigation, with
no stack at all).

None of these have an application fix. They arrive as long as people open the site from a
social app, so the stream is unbounded and non-actionable. Issue #255 weighed four options:
message and URL pattern filters, `thirdPartyErrorFilterIntegration`, Sentry inbound filters
in project settings, and narrowing the alert rule.

## Decision

Filter on provenance, in the repo, with two narrower filters behind it.

1. `next.config.ts` passes `applicationKey` to the Sentry bundler plugin, which stamps
   first-party modules with that key via a Turbopack loader.
   `src/instrumentation-client.ts` passes the same key to
   `Sentry.thirdPartyErrorFilterIntegration` as `filterKeys`. Both read one exported constant,
   `src/sentry.applicationKey.ts`, because a drift between them silently disables all client
   error reporting.

2. The behaviour is `drop-error-if-exclusively-contains-third-party-frames`, not the
   `contains` variant. `contains` drops an event if *any* frame is unstamped, and unstamped
   first-party frames are normal: the loader skips `next/dist/build/polyfills`, and generated
   runtime chunks are not source modules. That would cost us real errors, which #255
   explicitly requires we keep. The cost of `exclusively` is that an event whose frames are
   all discarded by the SDK (no filename, or no position information) is dropped vacuously.

3. `ignoreErrors: [/^(TypeError: )?Load failed$/]` handles #161. The integration returns early
   when an event has no frames, so a stackless event is passed through untouched and the
   provenance filter cannot see it. This case has to be matched by message.

4. `denyUrls: [/^app:\/\//]` is a second, independent filter for the same webview noise. Sentry
   matches it against the last valid frame of the root exception, so it catches errors thrown
   wholly inside an injected script and leaves a mixed stack that ends in our code alone.

Sentry inbound filters were rejected because they are neither version-controlled nor visible
in review. Narrowing the alert rule remains worth doing separately: filtering decides what
Sentry stores, the alert rule decides what becomes a GitHub bug, and those are usefully
separate controls.

## Consequences

- The filter needs no maintenance as vendors rename their bridges; it keys on who built the
  code, not on what the message says.
- If module stamping ever stops happening — most plausibly by adding a `turbopack.rules` entry
  for `*.{ts,tsx,js,jsx,mjs,cjs}`, which makes the SDK skip its own loader with only a debug
  log — no frame is first-party and every stacked client error is dropped silently. The tell
  is client issue volume in Sentry going to zero. The remedy is
  `apply-tag-if-exclusively-contains-third-party-frames` plus a `!third_party_code:True`
  search, not a looser filter.
- `Load failed` is Safari's message for any failed fetch, not only an aborted one, so a
  genuine network failure on a bare fetch is silenced too. Accepted: at the point of
  filtering the two are indistinguishable.
- Turbopack's module cache is disabled for stamped modules, so build times may rise.

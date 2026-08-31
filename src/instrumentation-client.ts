// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

import { SENTRY_APPLICATION_KEY } from './sentry.applicationKey';

Sentry.init({
  dsn: 'https://7baae90e741e2ddfbc9a504ddad08533@o4511266925969408.ingest.us.sentry.io/4511267016605696',

  integrations: [
    Sentry.replayIntegration(),

    // Mobile in-app browsers (Instagram, Facebook, LinkedIn) inject their own
    // instrumentation scripts into every page they render. When those throw, the
    // event arrives here looking like ours and the "Create GH Issue" alert rule
    // files a bug nobody can action (#193, #169, #164, #152).
    //
    // This filters on provenance rather than message text: the SDK's Turbopack
    // loader stamps each first-party module with the shared application key
    // (`next.config.ts`), and a frame without that stamp is third-party. No
    // pattern list to maintain as vendors rename their bridges.
    //
    // `exclusively` rather than the `contains` variant, deliberately. `contains`
    // uses `Array.some`, so a single unstamped frame drops the whole event —
    // and unstamped first-party frames are normal here: the loader skips
    // `next/dist/build/polyfills`, and generated runtime chunks are not source
    // modules, so they never carry the key. That would quietly cost us real
    // errors, which #255 explicitly requires we keep. `exclusively` uses
    // `Array.every`, so an event survives if any frame is ours, and the webview
    // errors this targets have no first-party frame at all.
    //
    // The cost of `exclusively` is one edge case: the SDK discards frames with
    // no filename or no position information before the check, so an event
    // whose frames are all discarded yields an empty list and `every` is
    // vacuously true. That shape is dropped. Stackless events are not affected
    // — the SDK returns early when there are no frames at all, which is why
    // #161 needs the `ignoreErrors` entry below.
    //
    // If stamping ever stops happening (see the Turbopack rule warning in
    // `next.config.ts`), no frame is first-party and every stacked client error
    // is dropped silently. The tell is client issue volume in Sentry going to
    // zero; the fix is `apply-tag-if-exclusively-contains-third-party-frames`
    // plus a `!third_party_code:True` search, not a looser filter.
    Sentry.thirdPartyErrorFilterIntegration({
      filterKeys: [SENTRY_APPLICATION_KEY],
      behaviour: 'drop-error-if-exclusively-contains-third-party-frames',
    }),
  ],

  // The integration above only runs when an event has a stack to inspect; a
  // stackless event is passed through untouched. #161 is exactly that: Safari
  // reports a fetch aborted by navigation as a bare `TypeError: Load failed`
  // with no frames, so it has to be matched by message. Anchored to the whole
  // string so an error that merely mentions loading, or a `Load failed` that
  // carries real detail, still reports. Note this is Safari's message for any
  // failed fetch, not only an aborted one, so a genuine network outage on a
  // bare fetch is silenced too — accepted because it is indistinguishable from
  // the noise at the point of filtering.
  ignoreErrors: [/^(TypeError: )?Load failed$/],

  // A second, independent filter for the same noise: both the iOS (`app:///`)
  // and Android (`app://navigation_performance_logger_android`) injected
  // scripts report under the `app:` scheme, which nothing we ship uses. Sentry
  // matches this against the last valid frame of the root exception only, so it
  // catches errors thrown wholly inside an injected script and deliberately
  // leaves a mixed stack that ends in our own code alone.
  denyUrls: [/^app:\/\//],

  // Off outside a real build — see the comment in `sentry.server.config.ts`.
  // NODE_ENV rather than the NEXT_PUBLIC_VERCEL_ENV used below: Next inlines
  // NODE_ENV into the client bundle unconditionally, so this cannot silently
  // disable production reporting if Vercel stops exposing system env vars.
  enabled: process.env.NODE_ENV === 'production',

  // Map to GitHub deployment environments (production, preview) instead of
  // the SDK's default `vercel-*` auto-detection. Client only sees
  // NEXT_PUBLIC_* env vars, so use the public mirror of VERCEL_ENV.
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

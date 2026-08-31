// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://7baae90e741e2ddfbc9a504ddad08533@o4511266925969408.ingest.us.sentry.io/4511267016605696',

  integrations: [Sentry.replayIntegration()],

  // Mobile in-app browsers (Instagram, Facebook, LinkedIn) inject their own
  // instrumentation scripts into every page they render. When those throw, the
  // event arrives here looking like ours and the "Create GH Issue" alert rule
  // files a bug nobody can action. Two filters cover the five issues #255
  // catalogues; see `docs/adr/013-sentry-third-party-error-filtering.md` for
  // why the provenance-based `thirdPartyErrorFilterIntegration` was tried and
  // rejected, so this does not get re-litigated.
  //
  // #161 is a bare `TypeError: Load failed` with no stack at all: Safari's
  // message for a fetch aborted by navigation. Nothing but the message
  // identifies it. Anchored at both ends so an error that merely mentions
  // loading, or a `Load failed` carrying real detail, still reports. This is
  // also Safari's message for any failed fetch, so a genuine network failure on
  // a bare fetch is silenced too — accepted, because at the point of filtering
  // the two are indistinguishable.
  ignoreErrors: [/^(TypeError: )?Load failed$/],

  // #193 and #169 (iOS bridge, frames at `app:///`) and #164 and #152 (Android
  // bridge, `app://navigation_performance_logger_android`) report every frame
  // under the `app:` scheme, which nothing we ship uses. Sentry matches this
  // against the last valid frame of the root exception, so it catches errors
  // thrown wholly inside an injected script and deliberately leaves a mixed
  // stack that ends in our own code alone.
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

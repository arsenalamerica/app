// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://7baae90e741e2ddfbc9a504ddad08533@o4511266925969408.ingest.us.sentry.io/4511267016605696',

  integrations: [
    Sentry.replayIntegration(),

    // Mobile in-app browsers (Instagram, Facebook, LinkedIn) inject their own
    // instrumentation scripts into every page they render. When those throw, the
    // event arrives here looking like ours and the "Create GH Issue" alert rule
    // files a bug nobody can action (#193, #169, #164, #152).
    //
    // This filters on provenance rather than message text: the Sentry bundler
    // plugin stamps every module it builds with `applicationKey`
    // (`next.config.ts`), and any frame without that stamp is third-party. No
    // pattern list to maintain as vendors rename their bridges.
    //
    // `drop-error-if-contains-third-party-frames` over the `exclusively`
    // variant on purpose. The `exclusively` mode evaluates with `Array.every`,
    // which is vacuously true when an event's frames all lack a filename, so it
    // would silently drop that whole shape. `contains` uses `Array.some` and
    // keeps them. The trade-off is that a genuine first-party error whose stack
    // passes through any unstamped frame is dropped too; if real errors go
    // missing, switch to `apply-tag-if-contains-third-party-frames` and filter
    // with `!third_party_code:True` in Sentry instead of loosening this.
    Sentry.thirdPartyErrorFilterIntegration({
      filterKeys: ['arsenalamerica-app'],
      behaviour: 'drop-error-if-contains-third-party-frames',
    }),
  ],

  // The integration above only runs when an event has a stack to inspect; a
  // stackless event is passed through untouched. #161 is exactly that: Safari
  // reports a fetch aborted by navigation as a bare `TypeError: Load failed`
  // with no frames, so it has to be matched by message. Anchored to the whole
  // string so a real error that merely mentions loading is unaffected.
  ignoreErrors: [/^(TypeError: )?Load failed$/],

  // Belt and braces for the webview bridges above: both the iOS (`app:///`) and
  // Android (`app://navigation_performance_logger_android`) injected scripts
  // report under the `app:` scheme, which nothing we ship uses. This still
  // catches them if module metadata is ever missing from a build and the
  // provenance filter has nothing to match on.
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

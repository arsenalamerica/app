// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://7baae90e741e2ddfbc9a504ddad08533@o4511266925969408.ingest.us.sentry.io/4511267016605696',

  integrations: [Sentry.replayIntegration()],

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

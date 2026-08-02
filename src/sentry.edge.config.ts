// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://7baae90e741e2ddfbc9a504ddad08533@o4511266925969408.ingest.us.sentry.io/4511267016605696',

  // Off outside a real build — see the comment in `sentry.server.config.ts`.
  enabled: process.env.NODE_ENV === 'production',

  // Map to GitHub deployment environments (production, preview) instead of
  // the SDK's default `vercel-*` auto-detection.
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,

  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

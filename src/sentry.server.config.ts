// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://7baae90e741e2ddfbc9a504ddad08533@o4511266925969408.ingest.us.sentry.io/4511267016605696',

  // Local `next dev` reports into the same project as production, and the
  // Sentry alert rule opens a GitHub issue per new issue — a developer's
  // missing local secret should not file a bug. Vercel builds `next build`
  // for both production and preview, so NODE_ENV is the signal that keeps
  // both reporting while switching off `next dev` and `vitest`.
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

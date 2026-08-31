/**
 * Identifies this app's own bundle to Sentry.
 *
 * `next.config.ts` hands it to the bundler plugin as `applicationKey`, which
 * stamps it onto the module metadata of every module the plugin builds.
 * `instrumentation-client.ts` hands the same value to
 * `thirdPartyErrorFilterIntegration` as a `filterKeys` entry, and any frame
 * without the stamp is treated as third-party.
 *
 * Shared rather than duplicated because the two must be identical: if they
 * drift, every frame reads as third-party and the integration silently drops
 * every client error that has a stack. There is no runtime signal for that.
 */
export const SENTRY_APPLICATION_KEY = 'arsenalamerica-app';

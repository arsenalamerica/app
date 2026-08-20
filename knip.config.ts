import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  // Consumed by treosh/lighthouse-ci-action via its configPath input, never
  // imported from application code. See .github/workflows/ci.yml.
  entry: ['lighthouserc.js'],

  ignoreExportsUsedInFile: true,

  ignoreDependencies: [
    // Pinned in devDependencies so the version our build pipeline relies on is
    // explicit, not transitive. Consumed at build time by @sentry/nextjs's
    // Turbopack post-build hook to upload source maps; never imported directly.
    '@sentry/cli',

    // Loaded by varlock at env-load time via `@plugin()` in .env.schema, which
    // knip does not parse. Never imported from TypeScript.
    '@varlock/1password-plugin',
  ],
};

export default config;

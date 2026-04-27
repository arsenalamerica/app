import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: [
    // Git worktrees used by Claude Code are checked out under .claude/worktrees/.
    // Knip would otherwise scan them and report false positives.
    '.claude/**',
  ],

  ignoreExportsUsedInFile: true,

  ignoreBinaries: [
    // Invoked via npx in the lefthook sort-package-json pre-commit hook.
    // Not installed as a project dependency — npx fetches it on demand.
    'sort-package-json',
  ],

  ignoreDependencies: [
    // Pinned in devDependencies so the version our build pipeline relies on is
    // explicit, not transitive. Consumed at build time by @sentry/nextjs's
    // Turbopack post-build hook to upload source maps; never imported directly.
    '@sentry/cli',
  ],
};

export default config;

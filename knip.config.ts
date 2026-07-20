import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: [
    // Git worktrees used by Claude Code are checked out under .claude/worktrees/.
    // Each is a full duplicate checkout (src/, package.json, node_modules), so
    // without this knip would scan them and report every file twice.
    //
    // Knip reports `.claude/** — Remove from ignore` as a configuration hint
    // whenever no worktree is present: in CI, in a fresh clone, and from inside
    // a worktree (which has no nested .claude/worktrees/ of its own). That hint
    // is expected and wrong — the ignore only does its job in the root checkout
    // when a worktree exists. Do not remove it. It is a hint, not an error, and
    // knip still exits 0.
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

    // Loaded by varlock at env-load time via `@plugin()` in .env.schema, which
    // knip does not parse. Never imported from TypeScript.
    '@varlock/1password-plugin',
  ],
};

export default config;

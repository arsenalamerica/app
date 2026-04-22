import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: [
    // Git worktrees used by Claude Code are checked out under .claude/worktrees/.
    // Knip would otherwise scan them and report false positives.
    '.claude/**',
    // Older worktree convention; leftover directories may exist here.
    '.clone/**',
  ],

  ignoreExportsUsedInFile: true,

  ignoreBinaries: [
    // Invoked via npx in the lefthook sort-package-json pre-commit hook.
    // Not installed as a project dependency — npx fetches it on demand.
    'sort-package-json',
  ],
};

export default config;

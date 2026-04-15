import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignore: [
    // Git worktrees used by Claude Code are checked out under .claude/worktrees/.
    // Knip would otherwise scan them and report false positives.
    '.claude/**',
    // Phase 4 migration debt carried over from arsenalamerica/source. Tracked
    // in docs/adr/003-migrate-branches-from-source.md; revisit once the
    // migration has settled.
    'src/components/FixtureCard/types.ts',
    'src/components/NextGame/NextGameError.tsx',
    'src/components/NextGame/NextGameLoading.tsx',
    'src/styles/bork/_index.scss',
    'src/styles/bork/components/_index.scss',
    'src/styles/bork/utilities/_index.scss',
    'src/styles/bork/utilities/extends.scss',
    'src/styles/bork/utilities/mixins.scss',
    'src/styles/bork/utilities/variables.scss',
  ],

  ignoreExportsUsedInFile: true,

  ignoreBinaries: [
    // Invoked via npx in the lefthook sort-package-json pre-commit hook.
    // Not installed as a project dependency — npx fetches it on demand.
    'sort-package-json',
  ],
};

export default config;

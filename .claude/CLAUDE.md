# .claude/ — Claude Operational Guide

Tooling and infrastructure context for Claude sessions in this repo. For codebase conventions see the root `CLAUDE.md`.

## Rules

- Destructive command permissions must **never** be added to `settings.json`. If a destructive action needs to be permitted, add it to `settings.local.json` only.
- Permissions added to `settings.json` must be kept in alphabetical order.
- Topic-specific instructions live in `.claude/rules/`. See `.claude/rules/path-claude-rules.md` for the filename prefix convention that determines when each rule loads.

## Worktree workflow

Worktrees live at `.claude/worktrees/<branch-name>/` and are created via `claude --worktree <name>` or `git worktree add`. They share a git object store with the root checkout but **do not** share installed dependencies. See `docs/adr/004-yarn-hardlinks-global.md` for the disk-dedup decision that underlies this workflow.

### Branch naming convention

All worktree branches **must** use the prefix `wktr-<issueNumber>-<oneToThreeWordDesc>` so branches are immediately identifiable as worktree work tied to a specific issue. Examples:

- `wktr-42-fix-tenant-layout`
- `wktr-15-add-error-boundaries`
- `wktr-99-knip-cleanup`

### Installing dependencies per worktree

Always run `yarn install` inside the worktree immediately after creation. **Never** symlink `node_modules/` back to the root checkout. Yarn Berry 4's global cache at `~/.yarn/berry/cache/` makes per-worktree installs cheap (tens of seconds cache-warm): downloads are skipped, only the link step runs.

A symlinked `node_modules/` silently breaks in several ways:

- A branch that adds/removes a dependency mutates the **root's** tree — the root's lockfile and `node_modules/` disagree.
- Two worktrees running `yarn install` concurrently race on the same `install-state.gz` and corrupt state.
- Next.js file watchers follow the symlink and pick up changes written by another worktree's build.
- `node_modules/.cache/` (Next, webpack, Biome, tsc) is shared — worktrees thrash each other's caches.

### Disk dedup

`.yarnrc.yml:16` sets `nmMode: hardlinks-global` so each worktree's `node_modules/` hardlinks into Yarn Berry's global store. See `docs/adr/004-yarn-hardlinks-global.md` for the rationale and the `hardlinks-local` rejection.

### Caveats to watch for

These scenarios are unlikely in this repo today but will cause problems if they come up:

- **Shared inodes across worktrees.** Editing a file inside `node_modules/foo/` in one worktree mutates the same inode in every other worktree. If you need to experiment-patch a dependency, delete and reinstall that package's subtree to unshare first.
- **`patch-package` incompatibility.** Tools that mutate `node_modules/` files directly collide with the global store. `yarn patch` (Berry-native) is safe — it writes to `.yarn/patches/`. Classic `patch-package` is dangerous; audit before adopting. This repo uses neither today.
- **Cross-volume worktrees fall back to copying.** The global store lives under `~/.yarn/berry/`. A worktree on a different filesystem (external drive, NFS mount) silently degrades to copying. Not broken, just not optimized.

## Investigating production issues

For Vercel runtime logs, deployment state, build failures, and the DNS / domain infrastructure behind the branch sites, use the `production-debugging` skill (`.agents/skills/production-debugging/SKILL.md`).

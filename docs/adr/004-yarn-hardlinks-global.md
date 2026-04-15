# ADR-004: Yarn Berry `nmMode: hardlinks-global` for cross-worktree `node_modules/` dedup

## Status

Accepted

## Context

The root `CLAUDE.md` mandates worktrees for all issue work (`.claude/worktrees/<branch-name>/`), and worktrees must not share a `node_modules/` with the root checkout — a symlinked `node_modules/` silently breaks when a branch mutates dependencies, races on `install-state.gz`, pollutes Next.js file watchers, and thrashes shared `node_modules/.cache/` across trees.

An independent install per worktree solves those failure modes but costs ~500MB of disk per worktree at current dependency scale. Running three or four worktrees simultaneously is routine enough that paying ~2GB for parallelism is worth avoiding.

Yarn Berry 4 (already in use — `packageManager: yarn@4.13.0`, `nodeLinker: node-modules`) offers `nmMode: hardlinks-global`: each `node_modules/` is hardlinked from a central content-addressed store under `~/.yarn/berry/`. Per-worktree disk cost drops to near-zero (extra inodes, not bytes), while each tree keeps an independent dependency graph for lockfile purposes.

The alternative setting `hardlinks-local` only dedupes duplicate packages within a single `node_modules/` tree and does nothing for the cross-worktree case this repo actually faces. PnP (`nodeLinker: pnp`) would also solve it, but Next.js 16 + PnP has known rough edges and the migration cost isn't warranted just for worktree ergonomics.

Material caveats exist but are unlikely to bite this repo today:

- `patch-package` mutates `node_modules/` files in place and would collide with the hardlinked global store. The repo has no `patch-package` dependency and no `patches/` directory. `yarn patch` (Berry-native) is unaffected — it writes to `.yarn/patches/`.
- Editing a file inside one worktree's `node_modules/` mutates the inode shared with every other worktree. Unusual in normal development; noted in the `Worktree workflow` section of `.claude/CLAUDE.md` for anyone who does reach for an in-place `node_modules/` edit.
- Worktrees on a different filesystem from `~/.yarn/berry/` fall back to copying silently — correct, just not optimized.
- No CI impact: CI's `~/.yarn/berry/` is empty at the start of every run, so `nmMode: hardlinks-global` is a no-op there.

## Decision

1. Set `nmMode: hardlinks-global` in `.yarnrc.yml`, adjacent to the existing `nodeLinker: node-modules`.
2. Keep `nodeLinker: node-modules` — no PnP migration.
3. Document the workflow and caveats in `.claude/CLAUDE.md` under a new "Worktree workflow" section, so anyone about to hit a caveat scenario has the context to understand why.
4. Require `yarn install` per worktree (never a symlink back to the root); covered in the same `.claude/CLAUDE.md` section.

## Consequences

- **Disk**: marginal cost of each additional worktree's `node_modules/` is near-zero. N worktrees ≈ the size of one, not N × 500MB.
- **Install time**: unchanged for the first install on a cold cache. Subsequent worktrees link from the global store and complete in tens of seconds.
- **Independence preserved**: each worktree has its own lockfile state and its own `node_modules/` tree. A dependency change in one worktree does not leak into another.
- **`patch-package` becomes a latent blocker**: if the repo ever adopts `patch-package`, this ADR must be revisited (either supersede, or switch that workflow to `yarn patch`).
- **In-place `node_modules/` edits propagate**: a behavioral change worth knowing about; documented in the `Worktree workflow` section of `.claude/CLAUDE.md`. Delete-and-reinstall unshares the subtree.
- **Reverting is cheap**: remove the `nmMode` line from `.yarnrc.yml` and run `yarn install` in each tree. Berry rebuilds with copies; no corruption risk.
- **CI**: no change. The setting is a no-op against an empty Berry store.

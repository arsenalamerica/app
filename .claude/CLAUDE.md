# .claude/ — Claude Operational Guide

Tooling and infrastructure context for Claude sessions in this repo. For codebase conventions see the root `CLAUDE.md`.

## Settings Files

- `settings.json` — shared settings committed to the repository
- `settings.local.json` — local overrides, not committed (gitignored)

## Rules

- Destructive command permissions must **never** be added to `settings.json`. If a destructive action needs to be permitted, add it to `settings.local.json` only.
- Permissions added to `settings.json` must be kept in alphabetical order.

## Worktree workflow

Worktrees live at `.claude/worktrees/<branch-name>/` and are created via `claude --worktree <name>` or `git worktree add`. They share a git object store with the root checkout but **do not** share installed dependencies. See `docs/adr/004-yarn-hardlinks-global.md` for the disk-dedup decision that underlies this workflow.

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

Prefer real runtime data over inferring from source. The **Vercel MCP** (`mcp__vercel__*` tools) is the canonical source of truth for deployed state:

- `get_runtime_logs` — serverless / edge function output, errors, request metadata. Supports filtering by `level`, `source`, `query`, time range, deployment, and status code.
- `list_deployments` / `get_deployment` — deployment state, alias mapping, which `READY` deployment is actually serving production.
- `get_deployment_build_logs` — why a build failed or was cancelled.

Team slug: `arsenalamerica`. Project: `app`.

## DNS and domain infrastructure

Not derivable from the repo — captured here so it doesn't have to be rediscovered:

- **Registrar:** holds `pnwarmory.com` and the branch-site domains. Nameserver delegation must point at the DNS provider below.
- **DNS:** Cloudflare. Authoritative zones for production hostnames. Records for Vercel-hosted names are `DNS only` (gray cloud) CNAMEs to `cname.vercel-dns.com`. Apex records rely on Cloudflare's CNAME flattening.
- **Edge / serving:** Vercel, attached via the CNAME chain above.

### When DNS looks wrong

Verify delegation before touching Cloudflare records:

```
dig NS <domain> @1.1.1.1 +short
```

If the authoritative nameservers are not `*.ns.cloudflare.com`, the Cloudflare zone has **no effect** — editing records in a non-authoritative zone is a silent no-op. The fix in that case is at the registrar (nameserver delegation, domain renewal, etc.), not in Cloudflare.

Useful secondary checks:

```
dig <host> +noall +answer          # what's actually being served
dig cname.vercel-dns.com +short    # sanity-check the Vercel CNAME target
dig SOA <domain> +short            # who is authoritatively answering
```

A `TypeError: fetch failed` surfacing in Vercel runtime logs on server-side API calls is often a network-layer symptom (DNS misdirection, TLS failure, connection refused), not an application-layer bug — confirm via `dig` and `curl -v` against the target host before changing code.

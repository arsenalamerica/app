# ADR-003: Migrate `branches` from `arsenalamerica/source` into this repo

## Status

Accepted

## Context

This is Phase 4 of the five-phase consolidation documented in [`arsenalamerica/source` `ARCHITECTURE.md`](https://github.com/arsenalamerica/source/blob/main/ARCHITECTURE.md). Phases 1 and 2 in source collapsed `apps/api` into `apps/branches` and flattened the NX `libs/` + `data/` tree into `apps/branches/src/*` with `@/*` aliases. Phase 3 (see [ADR-002](./002-bootstrap-from-career-baseline.md)) bootstrapped this repo from the `brianespinosa/career` tooling baseline with a hello-world route deployed to a `*.vercel.app` URL.

Phase 4 moves every non-config file under `source/apps/branches/**` into `arsenalamerica/app`, hooks up the six tenant domains, and archives the source repo. Because Phase 2 already flattened the tree to `@/*` imports and Phase 3 seeded the destination from the same convention, the move is close to a literal `git mv` plus a focused set of compatibility fixes and a Jest→Vitest rewrite.

## Decision

### Code move

1. `source/data/` → `app/data/` at repo root (21 files, matches career's layout).
2. `source/apps/branches/src/{components,lib/sportmonks,lib/utils,styles/bork}/` → `app/src/{components,lib/sportmonks,lib/utils,styles/bork}/`.
3. `source/apps/branches/lib/data/` → `app/src/lib/data/`; the three `../../lib/data/...` imports in `[domain]/**/page.tsx` were rewritten to `@/lib/data/...`.
4. `source/apps/branches/app/*` → `app/src/app/*`, replacing the Phase 3 hello-world `page.tsx` / `layout.tsx`. The Phase 3 `page.test.tsx` was deleted — real specs live adjacent to their components.
5. `source/apps/branches/middleware.ts` → `app/src/proxy.ts` (see Next 16 compatibility below).
6. `source/apps/branches/fonts/` → `app/src/fonts/`; `source/apps/branches/public/robots.txt` → `app/public/robots.txt`.
7. `source/apps/branches/icon-sizes.ts` → `app/src/app/icon-sizes.ts`; both `manifest.ts` and `[domain]/icon.tsx` reach it with one relative hop from there.

Not carried over: `index.d.ts` (SVGR shim, obsolete since `data/` ships precompiled `.tsx`), `jest.config.ts`, `tsconfig.spec.json`, `project.json` (NX), `next.config.js` (replaced by `next.config.ts`).

### Next 15 → 16 compatibility

1. `[domain]/opengraph-image.tsx` and `[domain]/icon.tsx` were updated to `params: Promise<{ domain: string }>` and await the promise before indexing `branchLogo`. The stale `HomeProps` interface in `[domain]/page.tsx` was deleted.
2. `middleware.ts` → `proxy.ts`, with the exported function renamed from `middleware` to `proxy`. Next 16 deprecates the `middleware` file convention; the behavior is otherwise identical.
3. `@vercel/og` → `next/og`. `opengraph-image.tsx` now matches `icon.tsx` in using the Next 16 built-in, and `@vercel/og` is not in `package.json`.

### Jest → Vitest

Six Jest specs (`ClientOnly`, `FathomNext`, `LeagueLogo`, `NavBar`, `SocialLogo`, `TeamLogo`) were rewritten against Vitest. Rewrites are mechanical: `vi.mock` / `vi.mocked` replace `jest.mock` / `jest.mocked`, and `describe` / `it` / `expect` use Vitest globals (`"types": ["vitest/globals"]` in `tsconfig.json`). The source tree's `LeagueLogo.spec.tsx` that actually exercised `SocialLogo` was renamed to `SocialLogo.spec.tsx` during the move.

Coverage thresholds stay at the Phase 3 value of `0` for this PR. The suite is six smoke tests — real numbers are a follow-up once the suite stabilizes.

### Vercel configuration

`vercel.json` pins three North-American regions:

```json
{ "regions": ["pdx1", "iad1", "cle1"] }
```

- `pdx1` (Portland, `us-west-2`) — all five current PNW tenants plus Los Angeles.
- `iad1` (Washington D.C., `us-east-1`) — Vercel's default; covers future east-coast clubs.
- `cle1` (Cleveland, `us-east-2`) — midwest coverage; Vercel has no true central-US region.

Multi-region `regions` is Pro-plan only; the team was verified on Pro before this PR. No `functions`, `crons`, or `headers` fields — none trace to a concrete failing constraint today.

### Dead code removed during the move

- The commented-out WAF auto-blocker (`BADDIES` list + `@vercel/functions` block) in `middleware.ts` and the unused `NextFetchEvent` import / `event` parameter.
- Unreferenced `UNHANDLED_STATES`, `ACTIVE_GAME_STATES`, `EXTRA_TIME_ACTIVE_STATES`, `LeagueGameStates`, `KnockoutGameStates` in `lib/sportmonks/fixtures.ts`.
- Unused `isDevelopment` utility and its re-export in `lib/utils/`.
- Duplicate `export default NavBar;` below the named export.

### Migration debt (tracked, not fixed in this PR)

Scope of this PR is a code move, not a redesign. The following lint/Knip findings are captured in config overrides rather than rewritten:

**`biome.json` overrides** disable these rules for the listed files:

- `a11y/noSvgWithoutTitle` — `data/src/branches/**/Logo.tsx`, several social/team/league SVG renderers.
- `suspicious/noArrayIndexKey` — `NavBar.tsx`, `LeagueTable.tsx`, `GameCard.tsx`.
- `performance/noDynamicNamespaceImportAccess` — simple-icons lookups in `SocialLinks.tsx`.
- `correctness/noUnusedFunctionParameters` — skeleton row helper in `fixtures/loading.tsx`.

**`knip.config.ts` ignores** retain the carried-over `NextGameError.tsx`, `NextGameLoading.tsx`, `FixtureCard/types.ts`, and the `bork/` aggregate SCSS indexes — all unreferenced, but kept for follow-up evaluation alongside a component-level refactor.

Follow-up work (not this PR): rule-by-rule cleanup of the overrides, tightening Vitest coverage thresholds past `0`, and deciding whether to keep or drop the NextGame shell components and bork aggregates.

## Consequences

- Every tenant now renders out of this repo; `arsenalamerica/source` becomes archivable once the DNS cutover (handled manually by the repo owner in the Vercel UI) completes.
- `MONK_TOKEN` must be provisioned on the `app` Vercel project before production traffic flips; this is captured as a separate operational PR, not a code change.
- Git history for `apps/branches` does not follow the files into this repo. The archived `arsenalamerica/source` retains that history and is linked from `README.md`.
- The Next 15→16 fixes and the `proxy.ts` rename mean this repo is on Next 16 conventions end-to-end; no future upgrade step is needed for the moved routes.
- `@vercel/og` drops from the dependency tree. `next/og` is bundled with Next 16 and has an identical `ImageResponse` surface.

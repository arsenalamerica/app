# ADR-002: Bootstrap `arsenalamerica/app` from the `brianespinosa/career` tooling baseline

## Status

Accepted

## Context

This repository is the Phase 3 destination of a five-phase consolidation of `arsenalamerica/source`, documented in that repo's [`ARCHITECTURE.md`](https://github.com/arsenalamerica/source/blob/main/ARCHITECTURE.md). Phases 1 and 2 (completed in source) collapsed the `apps/api` proxy into `apps/branches` and flattened the NX `libs/` + `data/` tree into `apps/branches/src/*` with `@/*` aliases. Phase 4 (later) will migrate the `branches` app into this repo and retire `arsenalamerica/source`.

The goal for Phase 3 is a **new, empty** repo with target tooling deploying a hello-world to Vercel on every PR and merge. The branches app itself is not part of this phase.

Two paths were considered:

1. **In-place reshape** of `arsenalamerica/source` — preserves git history and Vercel project identity; no DNS cutover needed. However, the git history carries years of NX-specific patterns and commits that would pollute any `gh repo sync`-style fan-out across personal Next.js repos.
2. **New repo seeded from `brianespinosa/career`** — breaks git continuity at the cost of clean history, and preserves the "all my personal Next.js repos share identical tooling and can be updated in lockstep" property.

Related source-repo decisions (captured there, linked here for traceability): source [`ADR-001`](https://github.com/arsenalamerica/source/blob/main/docs/adr/001-consolidate-api-into-branches.md) and source [`ADR-002`](https://github.com/arsenalamerica/source/blob/main/docs/adr/002-flatten-libs-into-branches.md).

## Decision

1. **New repo.** Create `arsenalamerica/app` as a new GitHub repository, public, in the `arsenalamerica` organization. Do not reshape source in place.

2. **Tooling baseline.** Start from `brianespinosa/career` as a literal file copy, then strip career-specific elements:

   | Dropped from career                                                                                | Reason                                    |
   | -------------------------------------------------------------------------------------------------- | ----------------------------------------- |
   | `@radix-ui/colors`, `@radix-ui/react-icons`, `@radix-ui/themes`                                    | Design system is career-specific          |
   | `@react-spring/web`, `@visx/visx`, `d3-shape`, `motion`                                            | Career-only visualization stack           |
   | `normalize.css`                                                                                    | No global SCSS reset in this repo         |
   | `package.json` scripts `data-types`, `em`, `ic`                                                    | CSV→JSON pipeline is career-only          |
   | `biome.json` `CareerChart.tsx` override                                                            | No such file here                         |
   | `knip.config.ts` ignores for `@visx/*`, `@react-spring/web`, `normalize.css`, `mlr`                | Unused without the visualization stack    |
   | `tsconfig.json` aliases `@/img/*`, `@/data/*`                                                      | No `src/img/` or `data/` directory (yet)  |
   | `.yarnrc.yml` `packageExtensions` for `@visx/visx@*` and `@visx/xychart@*`                         | Unused without the visualization stack    |
   | `.github/workflows/ci.yml` lighthouse matrix paths `/P1`, `/P1/3ckmgrhn`                           | Career-only routes                        |

3. **`.claude/` strategy.** Merge career's harness config (settings, rules, alphabetized permissions) with `arsenalamerica/source`'s Vercel MCP investigation workflow and DNS/Cloudflare/Vercel playbook. **Do not** port career's `.mcp.json` GitHub MCP configuration — tooling preference is to use `gh` CLI for GitHub operations.

4. **ADR strategy.** Do not mirror source's ADR-001 or ADR-002 into this repo — those decisions describe `arsenalamerica/source`. Link to them instead. This repo's first non-meta ADR (this one) records the bootstrap decision.

5. **Coverage thresholds.** Vitest coverage thresholds are set to `0` in this phase. A single hello-world smoke test cannot meaningfully satisfy career's 85/84/87/86 thresholds; real numbers return in Phase 4 when the branches app migrates in with its test suite.

6. **Out of scope for Phase 3.** No custom domain attachment, no `MONK_TOKEN` provisioning, no Sportmonks code, no `middleware.ts`, no `[domain]` routing, no SCSS, no branch logos. Those arrive in Phase 4.

## Consequences

- Personal Next.js repos (`brianespinosa/career`, `arsenalamerica/app`, future siblings) converge on identical tooling. Tooling fan-outs (biome / knip / Next / React / dependency bumps) can be scripted identically across the fleet.
- Git history for this repo starts clean at bootstrap; the history of `branches` in `arsenalamerica/source` is not preserved. That history remains available on the archived source repo (post-Phase 4) and is referenced from this repo's `README.md`.
- DNS cutover is deferred to Phase 4. Until then, `arsenalamerica/source` continues to serve every tenant domain without interruption, and this repo sits idle on a `*.vercel.app` URL.
- Coverage thresholds re-tightening is a Phase 4 task. A follow-up ADR in Phase 4 will record the migration decisions (including Jest→Vitest, Cypress removal, and the new thresholds).

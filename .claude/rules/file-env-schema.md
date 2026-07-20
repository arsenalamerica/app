---
paths:
  - "**/.env*"
  - "**/env.d.ts"
---

# Env schema and generated types

For env-spec syntax, decorators, resolver functions, and the varlock CLI surface, use the vendored
varlock skill at `.claude/skills/varlock` (or the docs MCP, `varlock-docs`). It is third-party and
updated out-of-band via `npx skills update varlock`, so treat it as reference material — the rules below
are this repo's own and take precedence.

`env.d.ts` is generated from `.env.schema` by varlock's `@generateTsTypes` decorator. It is committed so
editors resolve `ENV.*` immediately on a fresh clone, before anything has been installed or run.

## After editing `.env.schema`

Regenerate and commit the types in the same change:

```sh
yarn varlock codegen
```

Never hand-edit `env.d.ts` — its header says so, and the next `varlock load` overwrites it. If the
generated file looks wrong, fix `.env.schema` and regenerate.

Validate with `yarn varlock load --agent` (JSON, sensitive values redacted).

## Values that differ by environment

`MONK_TOKEN` resolves to **empty** under `test` so the suite makes no 1Password network call. It still
decrypts `.env.local` locally for `OP_TOKEN`, so a mass test failure on a cold biometric session is
usually a declined or timed-out Touch ID prompt, not a real regression — rerun and accept it. Resolve
any new
1Password-backed var to empty too, never to a stand-in value: a truthy placeholder passes runtime
guards and reaches the real API, and varlock infers `test` from an ambient `NODE_ENV`/`VITEST`, so a
placeholder also leaks into `yarn dev` and the sync scripts.

Declare test values here rather than in a `vitest.config.ts` `test.env` block, so the schema stays the
single source of truth and shows up in the generated `env.d.ts`.

## Do not put secrets in `.env.schema`

It is committed. Secret values belong in 1Password and are referenced as `op://` URIs. Never write a
resolved value into this file, and never create a `.env` to hold one — see `.claude/CLAUDE.md` for the
full workflow and `docs/adr/006-varlock-env-management.md` for why local dev and CI resolve differently.

## Safety net, not a substitute

`postinstall` runs `varlock codegen`, so CI regenerates from the schema on every fresh install and is
correct even if a stale `env.d.ts` was committed. That means forgetting to regenerate will **not** fail
CI — the committed file just rots silently. Regenerate as part of the change.

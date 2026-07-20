---
paths:
  - "**/.env.schema"
  - "**/env.d.ts"
---

# Env schema and generated types

`env.d.ts` is generated from `.env.schema` by varlock's `@generateTsTypes` decorator. It is committed
so a fresh clone typechecks without running anything first, and so editors resolve `ENV.*` immediately.

## After editing `.env.schema`

Regenerate and commit the types in the same change:

```sh
yarn varlock codegen
```

Never hand-edit `env.d.ts` — its header says so, and the next `varlock load` overwrites it. If the
generated file looks wrong, fix `.env.schema` and regenerate.

Validate the schema itself with `yarn varlock load --agent` (JSON, sensitive values redacted).
`yarn varlock audit` reports drift between the schema and `process.env` reads in code.

## Do not put secrets in `.env.schema`

It is committed. Secret values belong in 1Password and are referenced as `op://` URIs. Never write a
resolved value into this file, and never create a `.env` to hold one — see `.claude/CLAUDE.md` for the
full workflow and `docs/adr/006-varlock-env-management.md` for why local dev and CI resolve differently.

## Safety net, not a substitute

`postinstall` runs `varlock codegen`, so CI regenerates from the schema on every fresh install and is
correct even if a stale `env.d.ts` was committed. That means forgetting to regenerate will **not** fail
CI — the committed file just rots silently. Regenerate as part of the change.

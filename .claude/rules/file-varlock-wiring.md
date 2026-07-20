---
paths:
  - "**/package.json"
  - "**/.yarnrc.yml"
  - "**/next.config.ts"
  - "**/vitest.config.ts"
  - "**/vitest.setup.ts"
---

# How varlock is wired into this project

Four entrypoints load env differently. Changing any of these files can silently break one of them —
`ENV.*` returns `undefined` rather than throwing when varlock has not loaded.

## Next (`next dev` / `next build`)

`package.json` `resolutions` aliases `@next/env` to `@varlock/nextjs-integration`, which is what
activates env loading; `next.config.ts` wraps the export in `varlockNextConfigPlugin()`. The alias needs
an explicit version — Yarn 4 rejects both the bare `npm:` form and the `**/` glob the varlock docs
suggest. It also makes `next` the parent of a package that peer-depends on `varlock`, so `.yarnrc.yml`
carries a `packageExtensions` entry adding it. `YN0086` is a hard error here, so without that entry
`yarn install` fails outright.

Keep the `@varlock/nextjs-integration` version in `resolutions` and the direct dependency in step with
each other; nothing enforces it, and a Dependabot bump to one will silently skew them.

## Tests

`vitest.setup.ts` starts with `import 'varlock/auto-load'`. Keep it first. Without it a bare
`vitest run` never initializes varlock — happy-dom makes it take a browser branch that initializes with
an empty value map, so every `ENV.*` read silently returns `undefined`. Loading in-process (rather than
wrapping the script in `varlock run`) is what lets varlock auto-detect the `test` environment, which
test runners set only after startup.

The same file fails tests on unmocked `fetch`. happy-dom blocks *reading* a cross-origin response but
still sends the request, so without it an errant test does real DNS/TCP/TLS to a third-party API.

## Scripts

`varlock run --` wraps `sync:fixtures` and `sync:seasons` — entrypoints Next does not own.

**Not `e2e`.** Playwright needs no schema-managed secret, and wrapping it resolved the whole schema
including the 1Password-backed `MONK_TOKEN`, which failed the CI e2e job outright.

## Gotcha: unset optional vars

On the auto-load and Next paths, varlock materializes unset optional vars as `''`, not `undefined`
(under `varlock run` they stay `undefined`). Never write an `=== undefined` check against a var
populated this way — see `next.config.ts` for the `|| undefined` normalization this forced.

See `docs/adr/006-varlock-env-management.md` for the rationale behind all of the above.

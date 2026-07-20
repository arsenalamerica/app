# ADR-006: varlock for env management, with 1Password scoped to local dev

## Status

Accepted

## Context

This repo had no `.env` file and no env template. `.gitignore` blanket-ignored `.env*`, so a checked-in
example was impossible without a negation. The practical consequences:

- **Nothing documented what the app needs.** A fresh clone running `yarn dev` hit a bare
  `throw new Error('MONK_TOKEN is not set')` from `src/lib/sportmonks/sportmonks.ts` with no pointer to
  where the token comes from. The only record of it lived in `scripts/CLAUDE.md`, as a
  `MONK_TOKEN=<token> yarn sync:seasons` example.
- **No validation.** Nine `process.env` reads across app code, build config, scripts, and Playwright,
  with four different failure modes: `throw`, `process.exit(1)`, silent fallback, and `?? ''`. A missing
  `VERCEL_BYPASS_SECRET` coerced to `''` and surfaced as a confusing 401 rather than a clear error.
- **Plaintext secrets on disk are an LLM exposure risk.** The motivating concern in issue #86: any
  `.env` a developer creates locally sits in the working tree where an agent session can read it.

We already keep secrets in 1Password. [varlock](https://varlock.dev) lets the committed `.env.schema`
carry `op://` references instead of values, resolving them at load time.

## Decision

Adopt varlock with `.env.schema` as the committed contract for every environment variable.

### 1Password resolution is scoped to local development

`@initOp(allowAppAuth=forEnv(development), account=kandb)`. Local dev authenticates through the
1Password desktop app over the `op` CLI (Touch ID). CI and Vercel are unchanged: `MONK_TOKEN`,
`SENTRY_AUTH_TOKEN`, and `VERCEL_BYPASS_SECRET` continue to come from GitHub secrets and Vercel project
env.

This works because varlock gives `process.env` the highest precedence and **skips a resolver entirely
when it is overridden**. In CI the `op()` call is never evaluated, so no 1Password credential exists in
the deploy path and a 1Password outage cannot break a deployment.

The rejected alternative was a 1Password service account whose token becomes the single `OP_TOKEN`
secret in GitHub and Vercel, with every secret resolved from the vault in all environments. It is a
cleaner single source of truth, but it makes 1Password a hard runtime dependency of every build and
deploy, and it trades N low-risk secrets for one high-value one. Revisit if the secret count grows
enough that drift between Vercel and 1Password becomes a real maintenance cost.

### Next.js integrates by replacing `@next/env`

Per varlock's Next.js integration, `@next/env` is aliased to `@varlock/nextjs-integration` through a
`resolutions` entry, and `next.config.ts` is wrapped in `varlockNextConfigPlugin()`. This is a
deliberately invasive mechanism — it substitutes a Next internal — so it is recorded here explicitly.
Two consequences follow:

- Yarn 4 rejects the glob form (`**/@next/env`) that varlock's docs give for yarn, and requires a
  version on the alias: `"@next/env": "npm:@varlock/nextjs-integration@1.1.6"`.
- The alias makes `next` the parent of a package that peer-depends on `varlock`, which `next` does not
  declare. `.yarnrc.yml` carries a `packageExtensions` entry adding it. `YN0086` is configured as a
  hard error in this repo, so this is required for `yarn install` to pass at all.

### Application code keeps reading `process.env`

Only `sportmonks.ts` moved to varlock's typed `ENV`, replacing its hand-rolled throw with schema
validation. The `VERCEL_ENV` / `NODE_ENV` / `NEXT_RUNTIME` reads stay on `process.env`, which varlock
still populates for sensitive server-side vars — only the browser bundle is restricted to
`NEXT_PUBLIC_`. Migrating them would mean rewriting the `process.env.VERCEL_ENV` mutation in four spec
files (`manifest`, `sitemap`, `robots`, `resolveTenantFromHeaders`) for no validation benefit, since
those vars are platform-injected and already optional.

## Consequences

**New prerequisite for local development.** Contributors need the `op` CLI installed and "Integrate
with 1Password CLI" enabled in the desktop app, plus access to the `arsenalamerica-app` vault. Without
it `yarn dev` fails at load with a varlock error naming the missing CLI. This is a real onboarding cost
and is documented in `README.md`.

**Unit tests need an env placeholder.** `VARLOCK_ENV` resolves to `test` under vitest, and
`src/lib/data/fixtures.spec.ts` uses `importOriginal` on `@/lib/sportmonks`, so the real module loads
and would fire the `op()` resolver. `vitest.config.ts` sets `test.env.MONK_TOKEN` to a placeholder;
process env wins, so the resolver never runs and `yarn test` never prompts for Touch ID. Any future
test that transitively imports a module reading a 1Password-backed var needs the same treatment.

**Leak scanning at commit time.** `varlock scan --staged` runs in `lefthook.yml`, resolving `@sensitive`
values and blocking a commit that contains one. This is what actually enforces the issue's "no plaintext
secrets" goal — the `.gitignore` change alone would not catch a secret pasted into a source file.

**`knip` needs an ignore.** `@varlock/1password-plugin` is referenced only from `.env.schema` via
`@plugin()`, which knip does not parse, so it is listed in `ignoreDependencies`.

**Schema drift is now detectable.** `varlock audit` reports env vars used in code but absent from the
schema, and vice versa — a check that did not previously exist.

**`env.d.ts` is generated but committed.** It holds only type declarations and doc comments derived
from the schema — no values — so it is safe to commit, and doing so means a fresh clone typechecks and
editors resolve `ENV.*` without running anything first. `postinstall` also runs `varlock codegen`, so
CI regenerates from the schema regardless and stays correct even if a stale copy is committed. The
consequence is that forgetting to regenerate does not fail CI; the committed file just rots quietly.
`.claude/rules/file-env-schema.md` is what guards that, and biome excludes the file so formatting does
not fight codegen.

Coupling codegen to the `typecheck` script was tried first and rejected: it paid the generation cost on
every typecheck while other consumers of the types still got nothing.

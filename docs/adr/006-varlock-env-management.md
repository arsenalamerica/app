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
- **No validation.** Nine distinct env vars read across ~35 sites in app code, build config, scripts,
  and Playwright, with four different failure modes: `throw`, `process.exit(1)`, silent fallback, and `?? ''`. A missing
  `VERCEL_BYPASS_SECRET` coerced to `''` and surfaced as a confusing 401 rather than a clear error.
- **Plaintext secrets on disk are an LLM exposure risk.** The motivating concern in issue #86: any
  `.env` a developer creates locally sits in the working tree where an agent session can read it.

We already keep secrets in 1Password. [varlock](https://varlock.dev) lets the committed `.env.schema`
carry `op://` references instead of values, resolving them at load time.

## Decision

Adopt varlock with `.env.schema` as the committed contract for every environment variable.

### 1Password resolution is scoped to local development

`@initOp(token=$OP_TOKEN)`, where `OP_TOKEN` is a service account scoped to the `arsenalamerica-app`
vault and nothing else. CI and Vercel are unchanged: `MONK_TOKEN`, `SENTRY_AUTH_TOKEN`, and
`VERCEL_BYPASS_SECRET` continue to come from GitHub secrets and Vercel project env.

This works because varlock gives `process.env` the highest precedence and **skips a resolver entirely
when it is overridden**. In CI the `op()` call is never evaluated, so no 1Password credential exists in
the deploy path and a 1Password outage cannot break a deployment. `OP_TOKEN` is `@optional` and unset
there; it is also `@internal`, so it never enters the application environment.

Two alternatives were rejected:

**Desktop-app auth** (`allowAppAuth`) was implemented first and then replaced. It authenticates as the
developer's personal 1Password account, which grants the whole app access to every vault that account
can see — far more than it needs. It also drags in real prerequisites: the `op` CLI at v2.33+, the
1Password 8 desktop app (v7 lacks the Developer settings pane entirely and fails with an error that
never names the version as the cause), the CLI integration toggle, and an `account=` pin on machines
signed in to more than one account. A scoped service account has none of that: the SDK is bundled, so
there is no CLI or desktop app requirement, and the credential can only ever read one vault.

**A service account used in CI and production too** — one `OP_TOKEN` secret in GitHub and Vercel, every
secret resolved from the vault everywhere. Cleaner as a single source of truth, but it makes 1Password
a hard runtime dependency of every build and deploy, and trades N low-risk secrets for one high-value
one. Revisit if drift between Vercel and 1Password becomes a real maintenance cost.

### Secret zero lives in an encrypted, gitignored file

The service account token is itself a secret, so it cannot go in the committed schema. It sits in
`.env.local` as `varlock(prompt)`: on first `varlock load` the developer is prompted once, and varlock
writes the value back encrypted, hardware-backed via the Secure Enclave on macOS. So the trade is one
locally-encrypted, single-vault credential in place of ambient access to a personal account — and still
no plaintext secret anywhere on disk, which was the point of issue #86.

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

**New prerequisite for local development.** Contributors need the `arsenalamerica-app` service account
token from a maintainer, entered once at the `yarn varlock load` prompt. No `op` CLI, desktop app, or
personal vault access is required. Creating the `.env.local` line that triggers the prompt is a manual
first step — `varlock load` does not prompt for empty values on its own. Without a valid token,
`yarn dev` prints a varlock error and **stays up anyway** (see the guard section below); a rotated or
malformed token surfaces as a raw plugin stack trace rather than a tidy message. Documented in
`README.md`.

**Tests load varlock in-process.** `ENV` is populated only when varlock actually loads, and a bare
`vitest run` does not load it — happy-dom makes varlock take a browser branch that initializes with an
empty value map, so every `ENV.*` read silently returns `undefined`. `vitest.setup.ts` therefore starts
with `import 'varlock/auto-load'`, varlock's documented entry point for plain Node and test runners.

Loading in-process was chosen over wrapping the script in `varlock run`, because varlock can then
auto-detect the `test` environment from `NODE_ENV=test` / `VITEST` / `VITEST_POOL_ID` — which test
runners set only after startup, too late for a wrapper, forcing an explicit `VARLOCK_ENV=test` prefix
in `package.json`. Keeping that out of the script means the test commands stay plain `vitest`.

It costs roughly a second of wall clock, because auto-load shells out to the varlock CLI once per test
*file* (~600ms each, largely hidden by parallelism). Doing it in `globalSetup` pays that once and
measured slightly faster, but workers then receive the env blob without varlock's `patchGlobalConsole`
redaction, so `ENV` values print unmasked in test output. The redaction is worth more than the
difference.

To keep tests offline, `.env.schema` resolves `MONK_TOKEN` to empty under `test` rather than calling
`op()`, so the suite never touches 1Password and works in CI where no vault credential exists. Empty
rather than a placeholder is deliberate: see the guard section below. Setting `test.env.MONK_TOKEN` in
`vitest.config.ts` would also work now that auto-load exists (the CLI child process inherits it, and
`process.env` outranks the schema), but keeping the test contract in `.env.schema` leaves one source of
truth that is visible in the generated `env.d.ts`.

**`sportmonksFetch` keeps an explicit token guard.** Requiring the var makes `next build` and
`varlock run` exit before reaching it, but `next dev` deliberately stays up on a config error so you can
fix and hot-reload — and `ENV` then returns `undefined`. `Headers` stringifies that to the literal
`"undefined"`, which Sportmonks rejects as an opaque 401. So the guard the schema was supposed to
replace still earns its place, for the most common local failures: `OP_TOKEN` missing from
`.env.local`, or revoked. Schema validation and the guard cover different runtimes; neither is
redundant.

This is also why `test` resolves `MONK_TOKEN` to empty rather than to a stand-in token. A placeholder
is truthy, so it would pass the guard and reach the real API. Worse, varlock infers `test` from an
ambient `NODE_ENV`/`VITEST`, so a placeholder would also be handed to `yarn dev` and to the sync
scripts — the data-writing entrypoints — for anyone with those exported in their shell, producing
exactly the opaque 401 the guard exists to prevent. Empty makes the guard fire instead.

**`e2e` is deliberately not wrapped in `varlock run`.** Playwright needs no schema-managed secret — CI
supplies `PLAYWRIGHT_BASE_URL` and `VERCEL_BYPASS_SECRET` directly as job env, and
`playwright.config.ts` supplies its own fallbacks. Wrapping it made the whole schema resolve, including
the 1Password-backed `MONK_TOKEN`, which failed the CI e2e job outright.

The cost is that Playwright stays outside schema validation, so the `?? ''` on `VERCEL_BYPASS_SECRET`
at `playwright.config.ts:13` — one of the motivating problems listed above — is *not* fixed by this
change. A missing bypass secret still coerces to an empty header and surfaces as a confusing 401 rather
than a named error. Worth a follow-up.

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

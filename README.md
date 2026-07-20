# app

[![CI](https://github.com/arsenalamerica/app/actions/workflows/ci.yml/badge.svg)](https://github.com/arsenalamerica/app/actions/workflows/ci.yml)

> Arsenal America branch apps

## Local setup

Environment variables are managed by [varlock](https://varlock.dev). `.env.schema` is committed and
holds no secret values — secrets are `op://` references resolved from the `arsenalamerica-app`
1Password vault at load time. **Do not create a `.env` file.**

Secrets resolve through a 1Password **service account** scoped to the `arsenalamerica-app` vault. It
uses a bundled SDK, so there is no `op` CLI or 1Password desktop app to install.

One-time setup — ask a maintainer for the `arsenalamerica-app` service account token, then:

```sh
yarn install
echo 'OP_TOKEN=varlock(prompt)' > .env.local   # creates the gitignored file
yarn varlock load                              # prompts, then encrypts it in place
yarn dev
```

The `varlock(prompt)` line is what triggers the prompt — `varlock load` does not ask for empty values
on its own, so without it you get `op(): Unable to authenticate with 1Password` instead.

`.env.local` is gitignored, and varlock rewrites that line as an encrypted value (hardware-backed via
the Secure Enclave on macOS), so the token is never stored in plaintext. You are prompted only once.

If your token is later rotated or revoked, varlock fails with a `invalid service account token` stack
trace from the plugin rather than a tidy message, and `next dev` still reports `✓ Ready` afterwards —
re-run the two commands above to replace it.

The dev server prints `✨ loaded by varlock ✨` when env loading is wired up correctly.

Useful commands:

| Command | Purpose |
|---|---|
| `yarn varlock load` | Show resolved config with sensitive values masked |
| `yarn varlock reveal MONK_TOKEN` | View a single secret value |
| `yarn varlock audit` | Find drift between `.env.schema` and code usage |

CI and Vercel do not use 1Password — they supply the same variables as real environment variables,
which take precedence over the schema. See `docs/adr/006-varlock-env-management.md`.

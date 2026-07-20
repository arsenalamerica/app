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
yarn varlock load          # prompts for the token, encrypts it into .env.local
yarn dev
```

`.env.local` is gitignored, and the token is encrypted at rest (hardware-backed via the Secure Enclave
on macOS), so it is never stored in plaintext. You are prompted only once.

The dev server prints `✨ loaded by varlock ✨` when env loading is wired up correctly.

Useful commands:

| Command | Purpose |
|---|---|
| `yarn varlock load` | Show resolved config with sensitive values masked |
| `yarn varlock reveal MONK_TOKEN` | View a single secret value |
| `yarn varlock audit` | Find drift between `.env.schema` and code usage |

CI and Vercel do not use 1Password — they supply the same variables as real environment variables,
which take precedence over the schema. See `docs/adr/006-varlock-env-management.md`.

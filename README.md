# app

[![CI](https://github.com/arsenalamerica/app/actions/workflows/ci.yml/badge.svg)](https://github.com/arsenalamerica/app/actions/workflows/ci.yml)

> Arsenal America branch apps

## Local setup

Environment variables are managed by [varlock](https://varlock.dev). `.env.schema` is committed and
holds no secret values — secrets are `op://` references resolved from the `arsenalamerica-app`
1Password vault at load time. **Do not create a `.env` file.**

One-time prerequisites:

1. Install the 1Password CLI — `brew install 1password-cli` (needs v2.33+)
2. Use the **1Password 8** desktop app. CLI app integration depends on the Developer settings pane,
   which v7 does not have — on v7, `op` fails with a `connecting to desktop app` error that does not
   mention the version as the cause.
3. Enable **1Password → Settings → Developer → Integrate with 1Password CLI**
4. Make sure your account has access to the `arsenalamerica-app` vault

If you are signed in to more than one 1Password account, note that `.env.schema` pins resolution to
the personal account via `account=my.1password.com`.

Then:

```sh
yarn install
yarn dev
```

The dev server prints `✨ loaded by varlock ✨` when env loading is wired up correctly. The first run
prompts for Touch ID to unlock 1Password.

Useful commands:

| Command | Purpose |
|---|---|
| `yarn varlock load` | Show resolved config with sensitive values masked |
| `yarn varlock reveal MONK_TOKEN` | View a single secret value |
| `yarn varlock audit` | Find drift between `.env.schema` and code usage |

CI and Vercel do not use 1Password — they supply the same variables as real environment variables,
which take precedence over the schema. See `docs/adr/006-varlock-env-management.md`.

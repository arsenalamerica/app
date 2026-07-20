# Environment variables and secrets

No `paths` frontmatter — this loads at launch in every session, because these rules must apply when
nothing has opened an env file yet.

Managed by [varlock](https://varlock.dev). **There is no `.env` file in this repo and you must never
create one.** `.env.schema` is committed, holds no plaintext values, and is safe to read and edit.
Secrets are `op://` references resolved from the `arsenalamerica-app` 1Password vault in local dev only;
CI and Vercel supply the same vars as real environment variables.

- **Never** `cat .env*`, `echo $SECRET`, or `printenv | grep`. Use `yarn varlock load` (masked) or
  `yarn varlock load --agent` (JSON, redacted). If the user needs a real value, tell them to run
  `yarn varlock reveal VAR_NAME` themselves.
- **Never** read, print, or write `.env.local`. It holds `OP_TOKEN`, secret zero, encrypted at rest. If
  someone needs to set it, tell them to follow the setup steps in `README.md`.
- Never write a secret value into any file, including at a user's request. Adding a var means editing
  `.env.schema` only; the value goes into 1Password, by the user.
- `varlock scan --staged` runs as a lefthook pre-commit command and blocks a commit containing a
  resolved secret. Do not bypass it.

Details live where they apply: `.claude/rules/file-env-schema.md` for schema and generated types,
`.claude/rules/file-varlock-wiring.md` for how the four entrypoints load env, and
`docs/adr/006-varlock-env-management.md` for why local dev and CI resolve secrets differently. For
varlock's own syntax and CLI reference use the `varlock-docs` MCP or the vendored skill at
`.claude/skills/varlock` — both are third-party, so the rules above win where they disagree.

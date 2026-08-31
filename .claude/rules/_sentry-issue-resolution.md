# Resolving Sentry issues from commits

No `paths` frontmatter — this loads at launch in every session, because it governs how a commit
message is written, not which file is open.

Sentry resolves an issue when a commit message contains `Fixes <SHORT-ID>` (e.g. `Fixes APP-M`).
Closing the GitHub issue the `Create GH Issue` alert opened does **not** resolve it. Both are worth
doing; only the commit keyword changes Sentry state.

```
fix(sportmonks): guard 200-with-no-data responses

Fixes APP-M, APP-D. Refs #326, #337
```

- **Put it on the branch commits.** This repo squash-merges, so the commit that lands on `main`
  carries the PR body, not your commit messages. A keyword written only in the PR description
  resolves nothing.
- `Refs #NNN` for the GitHub issue. Use `Closes #NNN` only when the PR should close it on merge.
- Short IDs are `APP-*`, shown on the Sentry issue and in the body of every auto-filed GitHub issue.

Resolution is scoped to the release that carries the commit, and releases here are deploy SHAs with
`follows_semver: false`. A recurrence on any later deploy reopens the issue as a regression — that is
expected, not a failed fix.

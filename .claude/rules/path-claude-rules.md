---
paths:
  - "**/.claude/rules/**"
---

# Rules Directory Conventions

`~/.claude/rules/` files use a prefix convention:

- `_<name>.md` — always-loaded (no `paths` frontmatter)
- `file-<name>.md` — specific named files
- `type-<ext>.md` — by extension
- `path-<dir>.md` — by directory

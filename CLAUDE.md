# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Requirements

### Distributed Documentation Structure

This repository **REQUIRES** distributed CLAUDE.md files throughout the directory tree. Each subdirectory with significant functionality must have its own CLAUDE.md file.

**When adding new features or directories:**

- Create separate CLAUDE.md files in relevant subdirectories
- Do NOT expand this root CLAUDE.md file with detailed information
- Keep this root file focused on high-level repository overview only
- Distributed files keep context focused and only load relevant information when working in specific parts of the codebase

**README.md vs CLAUDE.md distinction:**

When a directory has a README.md, the CLAUDE.md should reference it. When a directory has both files:

- **README.md** — User-facing documentation (what the component does, detailed explanations, setup instructions, architecture overview)
- **CLAUDE.md** — Claude-specific development guidance (critical warnings, gotchas, common tasks with file:line references, testing patterns)
- **Pattern**: CLAUDE.md should reference README.md for overview/details and focus only on what Claude needs to work safely and effectively

### Documentation Maintenance

When making code changes, you MUST proactively suggest updates to relevant documentation:

- **CLAUDE.md files** — If you add/modify workflows, configuration files, or significant functionality, suggest updates to the relevant CLAUDE.md file in that directory
  - Keep CLAUDE.md files concise (prefer pointers over content duplication)
  - Avoid code snippets that will become outdated
  - Use file:line references to point to authoritative sources
  - Focus on high-level "what/why/how", not detailed descriptions
- **README.md files** — If changes affect user-facing documentation or setup instructions, suggest updates to the relevant README.md file
- **Proactive identification** — After completing code changes, explicitly check if documentation has become outdated and offer to update it

Do not wait for the user to ask about documentation. Identify when your changes have made documentation stale and suggest specific updates.

### Worktrees

**REQUIRED**: All issue work MUST be done in a git worktree, not on the main working tree.

See `.claude/CLAUDE.md` for the worktree workflow, branch naming convention, and per-worktree dependency rules.

### Git Workflow

All commit messages MUST follow [Conventional Commits](https://www.conventionalcommits.org/) syntax:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

**NEVER** commit with `--no-verify`. If a pre-commit hook fails, fix the underlying issue before committing. Bypassing hooks defeats the purpose of CI parity at commit time.

**Commit message requirements:**

- Keep messages brief and easy to parse — avoid lengthy descriptions
- Focus on specific, scannable details that help humans quickly identify what a commit contains

**Pull request requirements:**

- Keep PR descriptions focused on technical changes, testing, and references

### Architecture Decision Records (ADRs)

ADRs are stored in `docs/adr/` and follow the naming convention `NNN-descriptive-slug.md`.

**Template** (Status / Context / Decision / Consequences). Status values: `Proposed`, `Accepted`, `Deprecated`, `Superseded by ADR-NNN`.

**PR checklist — for every pull request:**

- **New ADR?** — If the PR introduces a significant architectural decision (new dependency, data flow pattern, tooling change, performance trade-off), create an ADR.
- **Existing ADRs followed?** — Verify the changes comply with accepted ADRs. If a change conflicts, either revise the ADR first or explicitly note the deviation.
- **Revise an ADR?** — If the constraints that drove a previous decision have changed, revisiting it is valid. Update the ADR's status to `Superseded by ADR-NNN` and write the replacement.

### Yarn Install Warnings

`yarn install` may produce warnings. All warnings MUST be resolved before closing any PR — investigate the cause and fix it (e.g. add or remove a `packageExtensions` entry in `.yarnrc.yml`, pin a transitive dependency, or update the offending package).


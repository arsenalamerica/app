# ADR-001: Use Architecture Decision Records (ADRs)

## Status

Accepted

## Context

This repository captures architectural decisions in a lightweight, discoverable format so that future contributors (human or AI) can answer *why* a particular approach was chosen without doing code archaeology. Decisions worth recording include new dependencies, data flow patterns, tooling changes, and performance trade-offs — anything where the *why* is load-bearing and non-obvious.

Seeding this convention from day one — rather than adopting it later — means the log is intelligible and complete, instead of starting mid-stream at whichever decision happened to be the first one documented.

## Decision

1. **Location.** ADRs live in `docs/adr/`.
2. **Naming.** Files use the pattern `NNN-descriptive-slug.md`, where `NNN` is a zero-padded three-digit sequence (`001`, `002`, …). This ADR is `001-use-adrs.md`; the first domain-specific decision starts at `002`.
3. **Template.** Each ADR uses the following sections:

   ```md
   # ADR-NNN: <Title>

   ## Status

   <Proposed | Accepted | Deprecated | Superseded by ADR-NNN>

   ## Context

   …

   ## Decision

   …

   ## Consequences

   …
   ```

4. **Status values.**
   - **Proposed** — under discussion; not yet adopted.
   - **Accepted** — in force.
   - **Deprecated** — no longer followed, but not replaced.
   - **Superseded by ADR-NNN** — replaced by a later ADR; add a reciprocal `Supersedes ADR-NNN` note in the replacement.

5. **When to write one.** Every pull request that introduces a significant architectural decision (new dependency, data flow pattern, tooling change, performance trade-off) must include an ADR. PRs that conflict with an accepted ADR must either supersede it (new ADR + status update on the old one) or explicitly note the deviation in the PR description.

## Consequences

- New contributors can read `docs/adr/` in numerical order and reconstruct the reasoning behind the codebase's shape without needing to ask or infer from git blame.
- PR reviews have a durable reference for "why is it this way?" — conflicts surface against a written rule, not tribal memory.
- Writing an ADR adds one markdown file per significant decision. The cost is small; the payoff is that the *why* survives code churn, team turnover, and long gaps between contributors.
- ADRs are append-only: errors are corrected via a superseding ADR, not by editing a historical one. Past context stays intact.

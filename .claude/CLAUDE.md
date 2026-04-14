# .claude/ — Claude Operational Guide

Tooling and infrastructure context for Claude sessions in this repo. For codebase conventions see the root `CLAUDE.md`.

## Settings Files

- `settings.json` — shared settings committed to the repository
- `settings.local.json` — local overrides, not committed (gitignored)

## Rules

- Destructive command permissions must **never** be added to `settings.json`. If a destructive action needs to be permitted, add it to `settings.local.json` only.
- Permissions added to `settings.json` must be kept in alphabetical order.

## Investigating production issues

Prefer real runtime data over inferring from source. The **Vercel MCP** (`mcp__vercel__*` tools) is the canonical source of truth for deployed state:

- `get_runtime_logs` — serverless / edge function output, errors, request metadata. Supports filtering by `level`, `source`, `query`, time range, deployment, and status code.
- `list_deployments` / `get_deployment` — deployment state, alias mapping, which `READY` deployment is actually serving production.
- `get_deployment_build_logs` — why a build failed or was cancelled.

Team slug: `arsenalamerica`. Project: `app`.

## DNS and domain infrastructure

Not derivable from the repo — captured here so it doesn't have to be rediscovered:

- **Registrar:** holds `pnwarmory.com` and the branch-site domains. Nameserver delegation must point at the DNS provider below.
- **DNS:** Cloudflare. Authoritative zones for production hostnames. Records for Vercel-hosted names are `DNS only` (gray cloud) CNAMEs to `cname.vercel-dns.com`. Apex records rely on Cloudflare's CNAME flattening.
- **Edge / serving:** Vercel, attached via the CNAME chain above.

### When DNS looks wrong

Verify delegation before touching Cloudflare records:

```
dig NS <domain> @1.1.1.1 +short
```

If the authoritative nameservers are not `*.ns.cloudflare.com`, the Cloudflare zone has **no effect** — editing records in a non-authoritative zone is a silent no-op. The fix in that case is at the registrar (nameserver delegation, domain renewal, etc.), not in Cloudflare.

Useful secondary checks:

```
dig <host> +noall +answer          # what's actually being served
dig cname.vercel-dns.com +short    # sanity-check the Vercel CNAME target
dig SOA <domain> +short            # who is authoritatively answering
```

A `TypeError: fetch failed` surfacing in Vercel runtime logs on server-side API calls is often a network-layer symptom (DNS misdirection, TLS failure, connection refused), not an application-layer bug — confirm via `dig` and `curl -v` against the target host before changing code.

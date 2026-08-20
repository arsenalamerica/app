---
name: production-debugging
description: >-
  Investigate production and deployment issues for this app using real runtime data
  rather than inferring from source. Covers Vercel runtime logs, deployment and alias
  state, build failures, plus the DNS and domain infrastructure behind the branch sites.

  Use when a deployed page is broken, a deployment failed or is serving the wrong build,
  a domain or subdomain does not resolve, TLS or nameservers look wrong, or server-side
  calls fail with "TypeError: fetch failed".

  Trigger phrases include "production", "deployed", "runtime logs", "deployment failed",
  "build logs", "DNS", "nameserver", "domain", "Cloudflare", "Vercel", "fetch failed",
  "site is down", "wrong version deployed"
---

# Production and Deployment Debugging

Prefer real runtime data over inferring from source.

## Vercel — canonical source of truth for deployed state

The Vercel MCP (`mcp__vercel__*` tools) is authoritative for what is actually running.

- **Team slug:** `arsenalamerica`
- **Project:** `app`

Reach for `get_runtime_logs` for serverless and edge function output, `list_deployments` /
`get_deployment` to establish which `READY` deployment is actually serving production and how
aliases map to it, and `get_deployment_build_logs` when a build failed or was cancelled. Consult
the tools' own schemas for the filters each one supports.

Establish which deployment is serving before reading logs — a confusing log trail is often logs
from a deployment that is no longer aliased to production.

## DNS and domain infrastructure

Not derivable from the repo, so it is captured here:

- **Registrar:** holds `pnwarmory.com` and the branch-site domains. Nameserver delegation must
  point at the DNS provider below.
- **DNS:** Cloudflare. Authoritative zones for production hostnames. Records for Vercel-hosted
  names are `DNS only` (gray cloud) CNAMEs to `cname.vercel-dns.com`. Apex records rely on
  Cloudflare's CNAME flattening.
- **Edge / serving:** Vercel, attached via the CNAME chain above.

### When DNS looks wrong

Verify delegation **before** touching Cloudflare records:

```
dig NS <domain> @1.1.1.1 +short
```

If the authoritative nameservers are not `*.ns.cloudflare.com`, the Cloudflare zone has **no
effect** — editing records in a non-authoritative zone is a silent no-op. The fix in that case is
at the registrar (nameserver delegation, domain renewal, etc.), not in Cloudflare.

Useful secondary checks:

```
dig <host> +noall +answer          # what's actually being served
dig cname.vercel-dns.com +short    # sanity-check the Vercel CNAME target
dig SOA <domain> +short            # who is authoritatively answering
```

### `TypeError: fetch failed`

A `TypeError: fetch failed` surfacing in Vercel runtime logs on server-side API calls is often a
network-layer symptom (DNS misdirection, TLS failure, connection refused), not an
application-layer bug. Confirm via `dig` and `curl -v` against the target host before changing
code.

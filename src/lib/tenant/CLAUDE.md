# src/lib/tenant/ — Tenant Resolution

Shared helpers for resolving which branch site (tenant) a request belongs to.

## Key file

- `resolveTenantFromHeaders.ts` — reads the `Host` header and maps it to a known branch domain. For unknown hosts in production, emits a `[<caller>] unknown host in production: <host>` warning and falls back to `PREVIEW_FALLBACK`. Outside production, falls back silently to `PREVIEW_FALLBACK`. Never calls `notFound()`.

## Callers

Used by the five metadata routes: `src/app/manifest.ts`, `src/app/opengraph-image.tsx`, `src/app/icon.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`. Each passes its own `caller` identifier for log attribution.

## Testing

Tests in `resolveTenantFromHeaders.spec.ts` mock `next/headers`. The global `vitest.setup.ts` installs a `beforeEach` spy on `console.warn` that throws on unexpected calls, so the production-unknown-host test must explicitly mock `console.warn` to override it.

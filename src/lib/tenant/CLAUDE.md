# src/lib/tenant/ — Tenant Resolution

Shared helpers for resolving which branch site (tenant) a request belongs to.

## Key file

- `resolveTenantFromHeaders.ts` — reads the `Host` header and maps it to a known branch domain. Supports `strict` mode (warns + 404 for unknown production hosts) vs non-strict (falls back to `PREVIEW_FALLBACK`).

## Callers

Used by the three metadata routes: `src/app/manifest.ts`, `src/app/opengraph-image.tsx`, `src/app/icon.tsx`. All call with `strict: true`.

## Testing

Tests in `resolveTenantFromHeaders.spec.ts` mock `next/headers` and `next/navigation`. The global `vitest.setup.ts` throws on unexpected `console.warn`, so the strict-production test must explicitly mock `console.warn`.

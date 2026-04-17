import type { MetadataRoute } from 'next';

import { resolveTenantFromHeaders } from '@/lib/tenant/resolveTenantFromHeaders';

const ROUTES = ['', '/fixtures', '/table'] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = await resolveTenantFromHeaders({ caller: 'sitemap' });

  const lastModified = new Date();

  return ROUTES.map((path) => ({
    url: `https://${host}${path}`,
    lastModified,
  }));
}

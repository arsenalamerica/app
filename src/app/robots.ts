import type { MetadataRoute } from 'next';

import { resolveTenantFromHeaders } from '@/lib/tenant/resolveTenantFromHeaders';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = await resolveTenantFromHeaders({
    caller: 'robots',
    strict: true,
  });

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `https://${host}/sitemap.xml`,
  };
}

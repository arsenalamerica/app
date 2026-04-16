import type { MetadataRoute } from 'next';

import { branchData } from '@/data';
import { resolveTenantFromHeaders } from '@/lib/tenant/resolveTenantFromHeaders';

import { ICON_SIZES } from './icon-sizes';

export default async function Manifest(): Promise<MetadataRoute.Manifest> {
  const branchSite = await resolveTenantFromHeaders({
    caller: 'manifest',
    strict: true,
  });

  const branch = branchData[branchSite];

  return {
    name: branch.name,
    short_name: branch.name,
    description: branch.name,
    start_url: '/',
    display: 'standalone',
    background_color: '#da1f26',
    theme_color: '#da1f26',
    icons: ICON_SIZES.map((size) => ({
      src: `/icon/${size}`,
      sizes: `${size}x${size}`,
      type: 'image/png',
    })),
  };
}

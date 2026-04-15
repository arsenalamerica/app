import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { branchData } from '@/data';

import { ICON_SIZES } from './icon-sizes';

const DOMAINS = Object.keys(branchData);
const PREVIEW_FALLBACK = DOMAINS[0];

export default async function Manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = await headers();
  const domain = headersList.get('host') || 'localhost';

  const isLocal = domain.startsWith('localhost');
  const isKnown = domain in branchData;

  let branchSite: string;
  if (isLocal) {
    branchSite = 'tacomagooners.com';
  } else if (isKnown) {
    branchSite = domain;
  } else if (process.env.VERCEL_ENV !== 'production') {
    // dev / preview — safe to fall back so previews are usable
    branchSite = PREVIEW_FALLBACK;
  } else {
    // Production with unknown host — do NOT silently impersonate a branch
    console.warn(`[manifest] unknown host in production: ${domain}`);
    notFound();
  }

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

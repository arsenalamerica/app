import { headers } from 'next/headers';

import { branchData } from '@/data';

/** First domain in branchData — used as the fallback on preview/dev. */
export const PREVIEW_FALLBACK = Object.keys(branchData)[0];

const LOCAL_FALLBACK = 'tacomagooners.com';

interface ResolveTenantOptions {
  /** Identifier for log messages, e.g. 'manifest', 'opengraph-image', 'icon'. */
  caller: string;
}

export async function resolveTenantFromHeaders({
  caller,
}: ResolveTenantOptions): Promise<string> {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost';

  if (host.startsWith('localhost')) return LOCAL_FALLBACK;
  if (host in branchData) return host;

  if (process.env.VERCEL_ENV === 'production') {
    console.warn(`[${caller}] unknown host in production: ${host}`);
  }

  return PREVIEW_FALLBACK;
}

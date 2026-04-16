import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { branchData } from '@/data';

/** First domain in branchData — used as the fallback on preview/dev. */
export const PREVIEW_FALLBACK = Object.keys(branchData)[0];

const LOCAL_FALLBACK = 'tacomagooners.com';

interface ResolveTenantOptions {
  /** Identifier for log messages, e.g. 'manifest', 'icon'. */
  caller: string;
  /**
   * When true and the host is unknown in production,
   * logs a warning and calls notFound().
   * When false, falls back to PREVIEW_FALLBACK regardless of environment.
   */
  strict: boolean;
}

export async function resolveTenantFromHeaders({
  caller,
  strict,
}: ResolveTenantOptions): Promise<string> {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost';

  if (host.startsWith('localhost')) return LOCAL_FALLBACK;
  if (host in branchData) return host;

  if (strict && process.env.VERCEL_ENV === 'production') {
    console.warn(`[${caller}] unknown host in production: ${host}`);
    return notFound();
  }

  return PREVIEW_FALLBACK;
}

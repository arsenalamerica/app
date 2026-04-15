import { type NextRequest, NextResponse } from 'next/server';

import { branchData } from '@/data';

const DOMAINS = Object.keys(branchData);

export function proxy(request: NextRequest) {
  const url = request.nextUrl;

  // Check for local development
  const isLocal = url.hostname === 'localhost';
  // Check if we are on a preview deployment
  const isPreview = url.hostname.endsWith('vercel.app');

  // Get the hostname from the URL, or if we are local, from the 'domain' query parameter
  const siteDomain = isLocal
    ? request.nextUrl.searchParams.get('domain') || url.hostname
    : url.hostname;

  // Check if the domain is one of our branch sites
  const isBranchSite = DOMAINS.includes(siteDomain);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', url.pathname);

  // If the path already starts with a known domain segment (e.g. /boisegooners.com/icon/32),
  // the request is following a Next.js-generated internal URL — skip the rewrite to avoid
  // double-prefixing (/boisegooners.com/boisegooners.com/...).
  const firstPathSegment = url.pathname.split('/')[1];
  if (DOMAINS.includes(firstPathSegment)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isBranchSite) {
    return NextResponse.rewrite(
      new URL(`/${siteDomain}${url.pathname}`, request.url),
      { request: { headers: requestHeaders } },
    );
  } else if (isPreview) {
    // Set the first branch site as the default build preview domain
    return NextResponse.rewrite(
      new URL(`/${DOMAINS[0]}${url.pathname}`, request.url),
      { request: { headers: requestHeaders } },
    );
  } else {
    if (!isLocal) {
      console.warn('Not a branch site:', siteDomain);
    }
    // Keep the url at the base path for non-branch sites so we show our 404 page
    return NextResponse.rewrite(new URL(`/`, request.url), {
      request: { headers: requestHeaders },
    });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _vercel (Vercel Analytics / Speed Insights beacons)
     * - favicon.ico, sitemap.xml, robots.txt, manifest.webmanifest (metadata files)
     */
    '/((?!api|_next/static|_next/image|_vercel|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest).*)',
  ],
};

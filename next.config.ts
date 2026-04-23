import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    const textMetadata = {
      key: 'Cache-Control',
      value: 'public, s-maxage=86400, stale-while-revalidate=3600',
    };
    const imageMetadata = {
      key: 'Cache-Control',
      value: 'public, s-maxage=604800, stale-while-revalidate=86400',
    };
    return [
      { source: '/manifest.webmanifest', headers: [textMetadata] },
      { source: '/robots.txt', headers: [textMetadata] },
      { source: '/sitemap.xml', headers: [textMetadata] },
      { source: '/icon/:size', headers: [imageMetadata] },
      { source: '/opengraph-image', headers: [imageMetadata] },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sportmonks.com',
        pathname: '/images/**',
      },
    ],
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;

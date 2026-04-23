import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=86400, stale-while-revalidate=3600',
          },
        ],
      },
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

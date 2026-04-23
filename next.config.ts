import { withSentryConfig } from '@sentry/nextjs';
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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'arsenal-america',

  project: 'app',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});

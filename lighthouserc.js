// Lighthouse CI configuration. This is a .js file rather than .json so the
// Vercel Deployment Protection bypass secret can be read from the environment
// at collect time.
//
// The bypass must be sent as a header, not a URL query parameter. A query
// parameter only authorizes the document request; every subresource
// (/_next/static chunks, CSS, the web manifest) is then redirected to Vercel's
// SSO endpoint and blocked, which trips the `errors-in-console` audit. Pairing
// the secret with `x-vercel-set-bypass-cookie` persists authorization across
// follow-up requests. Mirrors playwright.config.ts, which does the same for e2e.
//
// https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation

const bypassSecret = process.env.VERCEL_BYPASS_SECRET;

const assertions = {
  'categories:accessibility': ['error', { minScore: 0.98 }],
  'categories:best-practices': ['error', { minScore: 0.96 }],
  'categories:seo': 'off',
};

module.exports = {
  ci: {
    collect: {
      settings: bypassSecret
        ? {
            extraHeaders: JSON.stringify({
              'x-vercel-protection-bypass': bypassSecret,
              'x-vercel-set-bypass-cookie': 'true',
            }),
          }
        : {},
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '.*/fixtures(\\?.*)?$',
          assertions: {
            'categories:performance': ['error', { minScore: 0.92 }],
            ...assertions,
          },
        },
        {
          matchingUrlPattern: '^(?!.*/fixtures(\\?|$)).*$',
          assertions: {
            'categories:performance': ['error', { minScore: 0.85 }],
            ...assertions,
          },
        },
      ],
    },
  },
};

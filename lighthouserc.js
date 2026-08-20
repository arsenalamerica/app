// Lighthouse CI configuration. This is a .js file rather than .json so the
// Vercel Deployment Protection bypass secret can be read from the environment
// at collect time.
//
// The secret authorizes only the request it is attached to. Sent as a URL query
// parameter it covers the document and nothing else, so every subresource
// (/_next/static chunks, CSS, the web manifest) was redirected to Vercel's SSO
// endpoint and blocked — which tripped the `errors-in-console` audit and put
// best-practices under its threshold. Pairing the secret with
// `x-vercel-set-bypass-cookie` sets a bypass cookie on the document response
// that Chrome then replays for every subresource. Vercel documents that pairing
// for headers only, hence extraHeaders rather than a query parameter.
//
// playwright.config.ts sends the same bypass header for e2e, but not the cookie
// header — see docs/adr/006 for that known gap.
//
// https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation

const bypassSecret = process.env.VERCEL_BYPASS_SECRET;

// Fail loudly rather than auditing the wrong page. Vercel answers an
// unauthorized preview request with a 302 to vercel.com/login, not a 4xx, and
// Lighthouse only errors when the document request is >= 400. So without this
// guard a missing secret produces a full set of plausible scores for Vercel's
// login page, attributed to this app — best-practices lands at 0.96, exactly on
// our threshold, so the check can even pass. Nothing outside CI loads this file.
if (!bypassSecret) {
  throw new Error(
    'VERCEL_BYPASS_SECRET is not set. These audits target a Vercel preview with ' +
      'Deployment Protection enabled; without the bypass header every request ' +
      'redirects to vercel.com/login and Lighthouse silently scores that page ' +
      'instead of this app. Set it as job env in .github/workflows/ci.yml.',
  );
}

// Performance thresholds were 0.85 (root/table) and 0.92 (fixtures). Both were
// calibrated while the bypass was a URL query parameter, so every subresource
// 302'd to Vercel SSO and Lighthouse scored a shell with zero JavaScript loaded
// (2 of 87 requests returned 200). Those numbers never measured this app.
//
// With the bypass header above, the real page loads (45 of 47 requests, 21 JS
// chunks, ~1.5 MB) and measured performance is: root 0.62, fixtures 0.66-0.73,
// table 0.77-0.86, with individual runs dipping to 0.32. lighthouse-ci
// aggregates optimistically (best of 3), so 0.5 leaves headroom for that
// variance. This is a deliberately weak gate that ratchets from an honest
// baseline; raise it as real performance work lands. See docs/adr/010.
const assertions = {
  'categories:accessibility': ['error', { minScore: 0.98 }],
  'categories:best-practices': ['error', { minScore: 0.96 }],
  'categories:seo': 'off',
};

module.exports = {
  ci: {
    collect: {
      settings: {
        extraHeaders: JSON.stringify({
          'x-vercel-protection-bypass': bypassSecret,
          'x-vercel-set-bypass-cookie': 'true',
        }),
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '.*/fixtures(\\?.*)?$',
          assertions: {
            'categories:performance': ['error', { minScore: 0.5 }],
            ...assertions,
          },
        },
        {
          matchingUrlPattern: '^(?!.*/fixtures(\\?|$)).*$',
          assertions: {
            'categories:performance': ['error', { minScore: 0.5 }],
            ...assertions,
          },
        },
      ],
    },
  },
};

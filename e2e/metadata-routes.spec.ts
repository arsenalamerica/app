import { expect, test } from '@playwright/test';

import { ICON_SIZES } from '../src/app/icon-sizes';

/**
 * Smoke tests for routes excluded from the proxy middleware matcher.
 * Each path here must remain in the matcher's negative-lookahead so the
 * proxy does not rewrite them to a non-existent /[domain]/... route.
 *
 * Matcher exclusion list (src/proxy.ts):
 *   favicon.ico | icon | opengraph-image | sitemap.xml | robots.txt | manifest.webmanifest
 *
 * Icon coverage is driven by ICON_SIZES so it cannot drift from
 * src/app/manifest.ts, which emits one <link rel="icon"> per size.
 */

for (const size of ICON_SIZES) {
  const label = size === 32 ? `${size} (favicon)` : String(size);
  test(`GET /icon/${size} returns 200 (${label})`, async ({ request }) => {
    const response = await request.get(`/icon/${size}`);
    expect(response.ok()).toBeTruthy();
  });
}

test('GET /opengraph-image returns 200', async ({ request }) => {
  const response = await request.get('/opengraph-image');
  expect(response.ok()).toBeTruthy();
});

test('GET /sitemap.xml returns 200', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.ok()).toBeTruthy();
});

test('GET /robots.txt returns 200', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.ok()).toBeTruthy();
});

test('GET /manifest.webmanifest returns 200', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBeTruthy();
});

import { expect, test } from '@playwright/test';

/**
 * Smoke tests for routes excluded from the proxy middleware matcher.
 * Each path here must remain in the matcher's negative-lookahead so the
 * proxy does not rewrite them to a non-existent /[domain]/... route.
 *
 * Matcher exclusion list (src/proxy.ts):
 *   favicon.ico | icon | opengraph-image | sitemap.xml | robots.txt | manifest.webmanifest
 */

test('GET /icon/32 returns 200 (favicon size)', async ({ request }) => {
  const response = await request.get('/icon/32');
  expect(response.ok()).toBeTruthy();
});

test('GET /icon/192 returns 200', async ({ request }) => {
  const response = await request.get('/icon/192');
  expect(response.ok()).toBeTruthy();
});

test('GET /icon/512 returns 200', async ({ request }) => {
  const response = await request.get('/icon/512');
  expect(response.ok()).toBeTruthy();
});

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

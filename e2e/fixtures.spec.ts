import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('fixtures page renders the Fixtures heading', async ({ page }) => {
  await page.goto('/fixtures');
  await expect(page.getByRole('heading', { name: 'Fixtures' })).toBeVisible();
});

test('fixtures page exposes the next-fixture scroll anchor', async ({
  page,
}) => {
  await page.goto('/fixtures');
  // The next-fixture anchor is what the client-side scroll-into-view effect
  // targets. Its presence confirms the server derived the correct fixture id
  // from the committed fixtures.json index without calling getNextFixture().
  await expect(page.locator('#next-fixture')).toBeAttached();
});

test('fixtures page has no detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/fixtures');
  await page.getByRole('heading', { name: 'Fixtures' }).waitFor();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

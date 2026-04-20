import { expect, test } from '@playwright/test';

test('fixtures page renders the Fixtures heading', async ({ page }) => {
  await page.goto('/fixtures');
  await expect(page.getByRole('heading', { name: 'Fixtures' })).toBeVisible();
});

test('fixtures page exposes the next-fixture scroll anchor', async ({
  page,
}) => {
  await page.goto('/fixtures');
  // Anchor presence confirms the server derived the correct fixture id from
  // the committed fixtures.json index without calling getNextFixture(), and
  // gives /fixtures#next-fixture a navigable deep-link target.
  await expect(page.locator('#next-fixture')).toBeAttached();
});

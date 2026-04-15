import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('tenant home page renders the Next Match heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Next Match' })).toBeVisible();
});

test('tenant home page has no detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

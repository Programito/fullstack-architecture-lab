import { expect, test } from '@playwright/test';

test('loads the frontend starter page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Proyecto Full Stack' })).toBeVisible();
  await expect(page.getByText('Angular frontend')).toBeVisible();
});

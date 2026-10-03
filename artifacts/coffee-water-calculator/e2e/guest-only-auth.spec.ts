import { expect, test } from '@playwright/test';

test('legacy authentication routes return to the guest calculator', async ({ page }) => {
  for (const legacyPath of ['/sign-in', '/sign-up', '/user-portal']) {
    await page.goto(legacyPath);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Watermancer', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in to sync/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
    await expect(page.locator('script[src*="clerk"]')).toHaveCount(0);
  }
});
import { expect, test } from '@playwright/test';

test('groups both concentrate workspaces under Calculator and defaults to DIY', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('mode-alchemist')).toBeVisible();
  await expect(page.getByTestId('mode-watermancer')).toBeVisible();

  await page.getByTestId('mode-concentrates').click();
  await expect(page.getByRole('tab', { name: 'Calculator', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('mode-concentrates')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('concentrate-workspace-diy')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('DIY single-salt concentrate', { exact: true })).toBeVisible();

  await page.getByTestId('concentrate-workspace-recipe').click();
  await expect(page.getByTestId('concentrate-workspace-recipe')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('No recipe concentrate loaded', { exact: true })).toBeVisible();

  await page.getByTestId('mode-alchemist').click();
  await expect(page.getByTestId('mode-alchemist')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('mode-concentrates').click();
  await expect(page.getByTestId('concentrate-workspace-diy')).toHaveAttribute('aria-selected', 'true');
});
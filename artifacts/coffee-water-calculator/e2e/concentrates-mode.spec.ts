import { expect, test } from '@playwright/test';

test('keeps both concentrate workspaces under Concentrates and defaults to DIY', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('mode-alchemist')).toBeVisible();
  await expect(page.getByTestId('mode-watermancer')).toBeVisible();
  const appTabs = page.getByRole('tablist', { name: 'App workspace' }).getByRole('tab');
  expect((await appTabs.allTextContents()).map(label => label.trim())).toEqual([
    'Calculator',
    'Concentrates',
    'Mixer',
    'Water grading',
    'Guide',
  ]);

  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByTestId('tab-concentrates')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Calculator', exact: true })).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByTestId('concentrate-workspace-diy')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('DIY single-salt concentrate', { exact: true })).toBeVisible();

  await page.getByTestId('concentrate-workspace-recipe').click();
  await expect(page.getByTestId('concentrate-workspace-recipe')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('No recipe concentrate loaded', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Calculator', exact: true }).click();
  await expect(page.getByTestId('mode-alchemist')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByTestId('concentrate-workspace-diy')).toHaveAttribute('aria-selected', 'true');
});
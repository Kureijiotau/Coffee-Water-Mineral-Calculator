import { expect, test } from '@playwright/test';

const recipeNames = ['Club Soda', 'Jelly', 'Lily', 'Conflate'];

async function openPeakKitchenGroup(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Select mineral recipe' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mineral recipes' });
  return dialog.getByRole('group', { name: 'PeakKitchen' });
}

test('lists PeakKitchen recipes in Brewer and Alchemist pickers', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('mode-brewer').click();
  let group = await openPeakKitchenGroup(page);
  await expect(group.getByRole('option')).toHaveCount(4);
  expect((await group.getByRole('option').allTextContents()).map(label => label.trim()))
    .toEqual(recipeNames);
  await group.getByRole('option', { name: 'Club Soda', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select mineral recipe' })).toContainText('Club Soda');
  expect(Number(await page.getByRole('textbox', { name: 'Magnesium Chloride target ppm' }).inputValue()))
    .toBeCloseTo(1545.376, 2);

  await page.getByTestId('mode-alchemist').click();
  group = await openPeakKitchenGroup(page);
  await expect(group.getByRole('option')).toHaveCount(4);
  await group.getByRole('option', { name: 'Lily', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select mineral recipe' })).toContainText('Lily');
  expect(Number(await page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm' }).inputValue()))
    .toBeCloseTo(1074.365, 2);

  group = await openPeakKitchenGroup(page);
  await group.getByRole('option', { name: 'Jelly', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select mineral recipe' })).toContainText('Jelly');
  expect(Number(await page.getByRole('textbox', { name: 'Magnesium Chloride target ppm' }).inputValue()))
    .toBeCloseTo(819.518, 2);

  group = await openPeakKitchenGroup(page);
  await group.getByRole('option', { name: 'Conflate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Select mineral recipe' })).toContainText('Conflate');
  expect(Number(await page.getByRole('textbox', { name: 'Calcium Chloride target ppm' }).inputValue()))
    .toBeCloseTo(792.657, 2);
});

test('selecting Conflate in Watermancer sets its silica target and batch-scaled drops', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-watermancer').click();

  const group = await openPeakKitchenGroup(page);
  await expect(group.getByRole('option')).toHaveCount(4);
  await group.getByRole('option', { name: 'Conflate', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Select mineral recipe' })).toContainText('Conflate');
  await expect(page.getByTestId('watermancer-silica-target-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('watermancer-silica-target-value')).toContainText('250.0');
  await expect(page.getByTestId('watermancer-silica-dose')).toContainText('20 drops');

  await page.getByRole('textbox', { name: /^Final batch volume in /i }).fill('0.5');
  await expect(page.getByTestId('watermancer-silica-dose')).toContainText('10 drops');

  await page.getByTestId('watermancer-silica-target-edit').click();
  await page.getByTestId('watermancer-silica-target-input').fill('175');
  await page.getByTestId('watermancer-silica-target-done').click();
  await expect(page.getByTestId('watermancer-silica-target-value')).toContainText('175.0');

  const nextGroup = await openPeakKitchenGroup(page);
  await nextGroup.getByRole('option', { name: 'Jelly', exact: true }).click();
  await expect(page.getByTestId('watermancer-silica-target-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('watermancer-silica-target-value')).toContainText('175.0');
});

test('shows Conflate silica as a separate Brewer preparation item', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-brewer').click();
  const group = await openPeakKitchenGroup(page);
  await group.getByRole('option', { name: 'Conflate', exact: true }).click();

  await page.getByRole('button', {
    name: 'See how to make this recipe and save it as an image',
  }).click();
  const dialog = page.getByRole('dialog');
  const silicaStep = dialog.getByTestId('recipe-silica-step');
  await expect(silicaStep).toBeVisible();
  await expect(silicaStep).toContainText('20 drops');
  await expect(silicaStep).toContainText('250.0 mg');
});

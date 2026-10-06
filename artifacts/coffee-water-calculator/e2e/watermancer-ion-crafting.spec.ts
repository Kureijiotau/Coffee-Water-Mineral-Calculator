import { expect, test } from '@playwright/test';

test('crafts a balanced magnesium-and-sulfate target without changing chloride', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();

  await expect(page.getByText('1. Set your target water', { exact: true })).toBeVisible();
  await page.getByTitle('Edit this Watermancer profile before saving').click();
  await page.getByTestId('watermancer-ion-crafting-toggle').click();

  const chlorideTarget = page.getByTestId('watermancer-ion-target-chloride');
  const chlorideBefore = await chlorideTarget.inputValue();
  await page.getByTestId('watermancer-ion-crafting-primary').selectOption('magnesium');
  await page.getByTestId('watermancer-ion-crafting-counterion').selectOption('sulfate');
  await page.getByTestId('watermancer-ion-crafting-primary-target').fill('80');

  const applyPair = page.getByTestId('watermancer-ion-crafting-apply');
  await expect(applyPair).toBeEnabled();
  await expect(page.getByText(/Calculated Sulfate target/)).toBeVisible();
  await applyPair.click();

  await expect(page.getByTestId('watermancer-ion-target-magnesium')).toHaveValue('80');
  expect(Number(await page.getByTestId('watermancer-ion-target-sulfate').inputValue()))
    .toBeGreaterThan(0);
  await expect(chlorideTarget).toHaveValue(chlorideBefore);

  await page.getByTestId('watermancer-charge-check-run').click();
  await expect(page.getByText(
    'The absolute charge difference is within the 0.1 ppm rounding tolerance.',
  )).toBeVisible();
});

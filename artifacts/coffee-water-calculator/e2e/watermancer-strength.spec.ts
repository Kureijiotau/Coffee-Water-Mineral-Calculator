import { expect, test } from '@playwright/test';

async function readTargetCeiling(page: import('@playwright/test').Page, ionId: string): Promise<number> {
  const text = await page.getByTestId(`watermancer-ion-ceiling-${ionId}`).innerText();
  const match = text.match(/Ceiling:\s*([\d.]+)\s*ppm/);
  if (!match) throw new Error(`Could not read the ${ionId} target ceiling from "${text}"`);
  return Number(match[1]);
}

test('target strength scales all ions without offering GH-only mode', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();

  const strengthButton = page.getByTestId('watermancer-strength-toggle');
  await expect(strengthButton).toBeVisible();
  await expect(strengthButton).toContainText('Strength');
  await expect(strengthButton).not.toContainText('GH Strength');
  await strengthButton.click();

  await expect(page.getByTestId('watermancer-strength-gh-only-toggle')).toHaveCount(0);

  const calciumAtBaseline = await readTargetCeiling(page, 'calcium');
  const magnesiumAtBaseline = await readTargetCeiling(page, 'magnesium');
  const bicarbonateAtBaseline = await readTargetCeiling(page, 'bicarbonate');

  const strengthSlider = page.getByTestId('watermancer-strength-slider');
  await strengthSlider.focus();
  await strengthSlider.press('ArrowRight');
  await expect(strengthSlider).toHaveValue('105');
  await expect(strengthButton).toContainText('105%');

  expect(await readTargetCeiling(page, 'calcium')).toBeGreaterThan(calciumAtBaseline);
  expect(await readTargetCeiling(page, 'magnesium')).toBeGreaterThan(magnesiumAtBaseline);
  expect(await readTargetCeiling(page, 'bicarbonate')).toBeGreaterThan(bicarbonateAtBaseline);
});

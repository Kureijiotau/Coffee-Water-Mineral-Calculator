import { expect, test } from '@playwright/test';

test('switching the default 1 L batch selects one US gallon, then converts normally', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-brewer').click();

  let volumeInput = page.getByRole('textbox', { name: 'Final batch volume in liters' });
  let toggle = page.getByRole('button', { name: 'Switch volume units to gallons' });
  await expect(volumeInput).toHaveValue('1');
  await toggle.click();

  volumeInput = page.getByRole('textbox', { name: 'Final batch volume in gallons' });
  await expect(volumeInput).toHaveValue('1');
  await volumeInput.fill('2');
  await page.getByRole('button', { name: 'Switch volume units to liters' }).click();

  const litersInput = page.getByRole('textbox', { name: 'Final batch volume in liters' });
  await expect(litersInput).toHaveValue('7.570823568');
});

test('the concentrate batch-volume toggle also turns its default 1 L into one gallon', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();

  const volumeInput = page.getByLabel('Final brewing water');
  await expect(volumeInput).toHaveValue('1');
  await page.getByRole('button', { name: 'Toggle brewing water units' }).click();
  await expect(volumeInput).toHaveValue('1');
  await expect(page.getByRole('button', { name: 'Toggle brewing water units' })).toHaveText('gallons');
});

test('calculator volume conversion stays correct through repeated unit switches', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-brewer').click();

  await expect(page.getByRole('textbox', { name: 'Final batch volume in liters' })).toHaveValue('1');
  await page.getByRole('button', { name: 'Switch volume units to gallons' }).click();
  await expect(page.getByRole('textbox', { name: 'Final batch volume in gallons' })).toHaveValue('1');

  await page.getByRole('button', { name: 'Switch volume units to liters' }).click();
  await expect(page.getByRole('textbox', { name: 'Final batch volume in liters' })).toHaveValue('3.785411784');
  await page.getByRole('button', { name: 'Switch volume units to gallons' }).click();
  await expect(page.getByRole('textbox', { name: 'Final batch volume in gallons' })).toHaveValue('1');

  await page.getByRole('button', { name: 'Switch volume units to liters' }).click();
  await expect(page.getByRole('textbox', { name: 'Final batch volume in liters' })).toHaveValue('3.785411784');
});

test('concentrate batch conversion stays correct through repeated unit switches', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();

  const volumeInput = page.getByLabel('Final brewing water');
  const toggle = page.getByRole('button', { name: 'Toggle brewing water units' });
  await expect(volumeInput).toHaveValue('1');
  await toggle.click();
  await expect(volumeInput).toHaveValue('1');
  await toggle.click();
  await expect(volumeInput).toHaveValue('3.785411784');
  await toggle.click();
  await expect(volumeInput).toHaveValue('1');
  await toggle.click();
  await expect(volumeInput).toHaveValue('3.785411784');
});

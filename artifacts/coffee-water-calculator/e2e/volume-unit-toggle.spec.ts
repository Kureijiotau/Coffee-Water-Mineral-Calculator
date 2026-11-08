import { expect, test } from '@playwright/test';

test('remembers separate liter and gallon batch inputs', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-brewer').click();

  const litersInput = page.getByRole('textbox', { name: 'Final batch volume in liters' });
  await litersInput.fill('1.5');
  await page.getByRole('button', { name: 'Switch volume units to gallons' }).click();

  const gallonsInput = page.getByRole('textbox', { name: 'Final batch volume in gallons' });
  await expect(gallonsInput).toHaveValue('1');
  await gallonsInput.fill('1.9');
  await page.getByRole('button', { name: 'Switch volume units to liters' }).click();
  await expect(litersInput).toHaveValue('1.5');
  await page.getByRole('button', { name: 'Switch volume units to gallons' }).click();
  await expect(gallonsInput).toHaveValue('1.9');
});

test('switching between units preserves each entered batch value', async ({ page }) => {
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
  await expect(litersInput).toHaveValue('1');
});

test('the concentrate batch-volume field remembers its liter and gallon entries', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();

  const volumeInput = page.getByLabel('Final brewing water');
  const toggle = page.getByRole('button', { name: 'Toggle brewing water units' });
  await expect(volumeInput).toHaveValue('1');
  await volumeInput.fill('1.5');
  await toggle.click();
  await expect(volumeInput).toHaveValue('1');
  await volumeInput.fill('1.9');
  await toggle.click();
  await expect(volumeInput).toHaveValue('1.5');
  await toggle.click();
  await expect(volumeInput).toHaveValue('1.9');
  await expect(toggle).toHaveText('gallons');
});

test('calculator unit switches keep their separate default values', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-brewer').click();

  await expect(page.getByRole('textbox', { name: 'Final batch volume in liters' })).toHaveValue('1');
  await page.getByRole('button', { name: 'Switch volume units to gallons' }).click();
  await expect(page.getByRole('textbox', { name: 'Final batch volume in gallons' })).toHaveValue('1');

  await page.getByRole('button', { name: 'Switch volume units to liters' }).click();
  await expect(page.getByRole('textbox', { name: 'Final batch volume in liters' })).toHaveValue('1');
  await page.getByRole('button', { name: 'Switch volume units to gallons' }).click();
  await expect(page.getByRole('textbox', { name: 'Final batch volume in gallons' })).toHaveValue('1');

  await page.getByRole('button', { name: 'Switch volume units to liters' }).click();
  await expect(page.getByRole('textbox', { name: 'Final batch volume in liters' })).toHaveValue('1');
});

test('concentrate batch unit switches keep the liter and gallon values separate', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();

  const volumeInput = page.getByLabel('Final brewing water');
  const toggle = page.getByRole('button', { name: 'Toggle brewing water units' });
  await expect(volumeInput).toHaveValue('1');
  await toggle.click();
  await expect(volumeInput).toHaveValue('1');
  await toggle.click();
  await expect(volumeInput).toHaveValue('1');
  await toggle.click();
  await expect(volumeInput).toHaveValue('1');
  await toggle.click();
  await expect(volumeInput).toHaveValue('1');
});

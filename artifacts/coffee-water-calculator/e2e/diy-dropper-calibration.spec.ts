import { expect, test } from '@playwright/test';

test('edits the shared tip calibration in Stock Builder and reuses it in the Guide and DIY Lotus Drops', async ({ page }) => {
  await page.addInitScript(() => {
    const key = 'coffee-water-diy-concentrate-inputs';
    if (localStorage.getItem(key) !== null) return;
    localStorage.setItem(key, JSON.stringify({
      lotusCalibrationInputs: {
        straight: { dropsInput: '100', weightInput: '3', style: 'straight' },
        round: { dropsInput: '80', weightInput: '4', style: 'round' },
      },
    }));
  });

  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();
  await page.getByTestId('mass-shared-calibration').locator('summary').click();

  const dropsInput = page.getByRole('textbox', { name: 'Straight tip measured drops' });
  const weightInput = page.getByRole('textbox', { name: 'Straight tip water weight in grams' });
  await expect(dropsInput).toHaveValue('100');
  await expect(weightInput).toHaveValue('3');
  await expect(dropsInput).not.toHaveAttribute('readonly');
  await expect(weightInput).not.toHaveAttribute('readonly');

  await dropsInput.fill('120');
  await weightInput.fill('4');
  await expect(page.getByTestId('mass-selected-dropper-rate'))
    .toHaveText('30.0 drops/mL · Calibrated');

  await page.getByRole('combobox', { name: 'Stock dropper tip' }).selectOption('round');
  const roundDropsInput = page.getByRole('textbox', { name: 'Round tip measured drops' });
  const roundWeightInput = page.getByRole('textbox', { name: 'Round tip water weight in grams' });
  await expect(roundDropsInput).toHaveValue('80');
  await expect(roundWeightInput).toHaveValue('4');
  await expect(page.getByTestId('mass-selected-dropper-rate'))
    .toHaveText('20.0 drops/mL · Calibrated');
  await page.getByRole('combobox', { name: 'Stock dropper tip' }).selectOption('straight');
  await expect(page.getByTestId('mass-selected-dropper-rate'))
    .toHaveText('30.0 drops/mL · Calibrated');
  await expect(dropsInput).toHaveValue('120');
  await expect(weightInput).toHaveValue('4');

  await page.getByRole('tab', { name: 'DIY Lotus Drops', exact: true }).click();
  await page.getByTestId('mass-shared-calibration').locator('summary').click();
  await expect(page.getByRole('textbox', { name: 'Straight tip measured drops' })).toHaveValue('120');
  await expect(page.getByRole('textbox', { name: 'Straight tip water weight in grams' })).toHaveValue('4');
  await expect(page.getByRole('textbox', { name: 'Round tip measured drops' })).toHaveValue('80');
  await expect(page.getByRole('textbox', { name: 'Round tip water weight in grams' })).toHaveValue('4');

  await page.getByTestId('tab-watermancer-guide').click();
  await page.getByTestId('button-step-calibrate').click();
  await expect(page.getByLabel('Straight measured drops')).toHaveValue('120');
  await expect(page.getByLabel('Straight water weight in grams')).toHaveValue('4');
  await expect(page.getByLabel('Round measured drops')).toHaveValue('80');
  await expect(page.getByLabel('Round water weight in grams')).toHaveValue('4');

  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await page.getByRole('tab', { name: 'DIY Lotus Drops', exact: true }).click();
  await page.getByTestId('mass-shared-calibration').locator('summary').click();
  await expect(page.getByRole('textbox', { name: 'Straight tip measured drops' })).toHaveValue('120');
  await expect(page.getByRole('textbox', { name: 'Straight tip water weight in grams' })).toHaveValue('4');
  await expect(page.getByRole('textbox', { name: 'Round tip measured drops' })).toHaveValue('80');
  await expect(page.getByRole('textbox', { name: 'Round tip water weight in grams' })).toHaveValue('4');
});

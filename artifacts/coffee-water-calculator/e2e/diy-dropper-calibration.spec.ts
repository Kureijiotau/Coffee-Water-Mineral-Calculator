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

  const dropsInput = page.getByLabel('Measured number of drops');
  const weightInput = page.getByLabel('Measured drop weight in grams');
  await expect(dropsInput).toHaveValue('100');
  await expect(weightInput).toHaveValue('3');
  await expect(dropsInput).not.toHaveAttribute('readonly');
  await expect(weightInput).not.toHaveAttribute('readonly');

  await dropsInput.fill('120');
  await weightInput.fill('4');
  await expect(page.getByTestId('diy-stock-builder-tip-straight'))
    .toHaveAccessibleName('Straight tip, 30.0 drops per mL');

  await page.getByTestId('diy-stock-builder-tip-round').click();
  await expect(dropsInput).toHaveValue('80');
  await expect(weightInput).toHaveValue('4');
  await page.getByTestId('diy-stock-builder-tip-straight').click();
  await expect(dropsInput).toHaveValue('120');
  await expect(weightInput).toHaveValue('4');

  await page.getByRole('tab', { name: 'DIY Lotus Drops', exact: true }).click();
  await expect(page.getByTestId('input-lotus-calibration-drops-straight')).toHaveValue('120');
  await expect(page.getByTestId('input-lotus-calibration-weight-straight')).toHaveValue('4');
  await expect(page.getByTestId('input-lotus-calibration-drops-round')).toHaveValue('80');
  await expect(page.getByTestId('input-lotus-calibration-weight-round')).toHaveValue('4');

  await page.getByTestId('tab-watermancer-guide').click();
  await page.getByTestId('button-step-calibrate').click();
  await expect(page.getByLabel('Straight measured drops')).toHaveValue('120');
  await expect(page.getByLabel('Straight water weight in grams')).toHaveValue('4');
  await expect(page.getByLabel('Round measured drops')).toHaveValue('80');
  await expect(page.getByLabel('Round water weight in grams')).toHaveValue('4');

  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await page.getByRole('tab', { name: 'DIY Lotus Drops', exact: true }).click();
  await expect(page.getByTestId('input-lotus-calibration-drops-straight')).toHaveValue('120');
  await expect(page.getByTestId('input-lotus-calibration-weight-straight')).toHaveValue('4');
  await expect(page.getByTestId('input-lotus-calibration-drops-round')).toHaveValue('80');
  await expect(page.getByTestId('input-lotus-calibration-weight-round')).toHaveValue('4');
});

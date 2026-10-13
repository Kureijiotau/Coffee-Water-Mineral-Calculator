import { expect, test } from '@playwright/test';

test('shows fixed Lotus-model and personal per-drop ppm/mg on every DIY Lotus card', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();
  await page.getByRole('tab', { name: 'DIY Lotus Drops', exact: true }).click();

  const physicalSaltForms = {
    magnesium: { formula: 'MgCl₂', form: 'Hexahydrate' },
    calcium: { formula: 'CaCl₂', form: 'Dihydrate' },
    potassium: { formula: 'KHCO₃', form: 'Anhydrous' },
    sodium: { formula: 'NaHCO₃', form: 'Anhydrous' },
  };

  for (const [id, salt] of Object.entries(physicalSaltForms)) {
    await expect(page.getByTestId(`lotus-per-drop-summary-${id}`)).toBeVisible();
    await expect(page.getByTestId(`lotus-drop-lotus-${id}`)).toBeVisible();
    await expect(page.getByTestId(`lotus-drop-user-${id}`)).toBeVisible();
    const saltDoseHeader = page.getByTestId(`lotus-per-drop-summary-${id}`)
      .getByRole('columnheader', { name: /salt dose/i });
    await expect(saltDoseHeader).toContainText(salt.formula);
    await expect(saltDoseHeader).toContainText(salt.form);
  }

  const lotusReference = page.getByTestId('lotus-drop-lotus-magnesium');
  const userDropper = page.getByTestId('lotus-drop-user-magnesium');
  await expect(lotusReference).toContainText('2.430 ppm');
  await expect(lotusReference).toContainText('9.149 mg');
  await expect(userDropper).toContainText('3.933 ppm');
  await expect(userDropper).toContainText('20.0 drops/mL · estimate');

  const referenceBeforeCalibration = await lotusReference.textContent();
  const dropperBeforeCalibration = await userDropper.textContent();
  await page.getByTestId('input-lotus-calibration-drops-straight').fill('100');
  await page.getByTestId('input-lotus-calibration-weight-straight').fill('4');
  await expect(userDropper).toContainText('25.0 drops/mL · calibrated');
  await expect(lotusReference).toHaveText(referenceBeforeCalibration ?? '');
  await expect(userDropper).not.toHaveText(dropperBeforeCalibration ?? '');

  await page.getByRole('checkbox', { name: 'Add bonus Epsom' }).check();
  const epsom = page.getByTestId('lotus-per-drop-summary-bonus-epsom');
  await expect(epsom).toBeVisible();
  await expect(epsom).toContainText('Mg-matched Lotus reference');
  await expect(epsom).toContainText('Salt mass is estimated');
  const epsomHeader = epsom.getByRole('columnheader', { name: /salt dose/i });
  await expect(epsomHeader).toContainText('MgSO₄');
  await expect(epsomHeader).toContainText('Heptahydrate (Epsom)');
});

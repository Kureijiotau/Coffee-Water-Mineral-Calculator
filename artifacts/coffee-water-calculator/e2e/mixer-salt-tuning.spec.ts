import { expect, test, type Page } from '@playwright/test';

const activeIonIds = [
  'calcium',
  'magnesium',
  'sodium',
  'potassium',
  'bicarbonate',
  'sulfate',
  'chloride',
  'citrates',
  'silica',
] as const;

async function completeManualSource(page: Page, side: 'a' | 'b'): Promise<void> {
  await page.getByTestId(`select-mixer-source-mode-${side}`).selectOption('manual');
  await page.getByTestId(`input-mixer-manual-name-${side}`).fill(`Manual ${side.toUpperCase()}`);
  for (const ionId of activeIonIds) {
    await page.getByTestId(`input-mixer-manual-ion-${side}-${ionId}`).fill('0');
  }
}

test('lets users tune the final blend with a salt dose and hydration form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mixer', exact: true }).click();
  await expect(page.getByTestId('workspace-water-mixer')).toBeVisible();

  await completeManualSource(page, 'a');
  await completeManualSource(page, 'b');
  await expect(page.getByTestId('status-mixer-result')).toHaveText('Calculated');

  const sodiumReading = page.getByTestId('text-mixer-final-ion-sodium');
  await expect(sodiumReading).toContainText('0.00');

  await page.getByTestId('button-toggle-mixer-salt-nacl').click();
  await page.getByTestId('button-increase-mixer-salt-nacl').click();
  await expect(page.getByTestId('input-mixer-salt-dose-nacl')).toHaveValue('1');
  await expect(sodiumReading).not.toContainText('0.00');
  await expect(page.getByTestId('text-mixer-step-salt-sodium-chloride')).toHaveText('1.00 mg');

  await page.getByTestId('button-toggle-mixer-salt-mgso4').click();
  await page.getByTestId('select-mixer-salt-form-mgso4').selectOption('0');
  await page.getByTestId('button-increase-mixer-salt-mgso4').click();
  await expect(page.getByTestId('select-mixer-salt-form-mgso4')).toHaveValue('0');
  await expect(page.getByTestId('text-mixer-final-ion-magnesium')).not.toContainText('0.00');
  await expect(page.getByTestId('list-mixer-recipe-steps')).toContainText('Add final-blend salts');
});
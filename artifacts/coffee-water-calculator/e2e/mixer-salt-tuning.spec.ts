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
  for (const ionId of activeIonIds) {
    await expect(page.getByTestId(`text-mixer-source-ion-a-${ionId}`)).toBeVisible();
    await expect(page.getByTestId(`text-mixer-source-ion-b-${ionId}`)).toBeVisible();
  }

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

test('offers saved Watermancer ion profiles in the finished-source picker', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cwm.watermancerProfiles', JSON.stringify([{
      id: 'saved-profile-for-mixer',
      name: 'Saved Light Roast Profile',
      targets: {
        calcium: 12,
        magnesium: 4,
        sodium: 3,
        potassium: 1,
        bicarbonate: 18,
        sulfate: 6,
        chloride: 9,
        citrates: 0,
        silica: 2,
      },
      source: 'Browser regression',
    }]));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Mixer', exact: true }).click();

  const picker = page.getByTestId('select-mixer-saved-source-a');
  await expect(picker.locator('option')).toContainText('Saved Light Roast Profile · Watermancer saved profile · Browser regression');
  await picker.selectOption('watermancer-profile:saved-profile-for-mixer');
  await expect(page.getByTestId('text-mixer-source-name-a')).toHaveText('Saved Light Roast Profile');
  await expect(page.getByTestId('text-mixer-source-ion-a-calcium')).toContainText('12.00');
});
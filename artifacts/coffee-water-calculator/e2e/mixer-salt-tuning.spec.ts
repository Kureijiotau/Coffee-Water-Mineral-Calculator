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
  await page.getByRole('tab', { name: 'Mixer', exact: true }).click();
  await expect(page.getByTestId('workspace-water-mixer')).toBeVisible();

  await completeManualSource(page, 'a');
  await completeManualSource(page, 'b');
  await expect(page.getByTestId('status-mixer-result')).toHaveText('Calculated');
  await expect(page.getByTestId('panel-mixer-live-readings')).toBeVisible();
  await expect(page.getByTestId('panel-mixer-live-readings-rail')).toBeVisible();
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

test('confirms saved Mixer recipe deletion and clears an active deleted source', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('cwm.waterMixerRecipes');
  });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Mixer', exact: true }).click();
  await completeManualSource(page, 'a');
  await completeManualSource(page, 'b');

  await page.getByTestId('button-open-save-mixer-recipe').click();
  await page.getByTestId('input-mixer-recipe-name').fill('Delete me blend');
  await page.getByTestId('button-save-mixer-recipe').click();

  const recipeCard = page.getByTestId(/card-mixer-saved-recipe-/);
  await expect(recipeCard).toContainText('Delete me blend');
  const savedSourcePicker = page.getByTestId('select-mixer-saved-source-a');
  await savedSourcePicker.selectOption({ label: 'Delete me blend · Mixer recipe' });
  await expect(page.getByTestId('text-mixer-source-name-a')).toHaveText('Delete me blend');

  const recipeId = await recipeCard.getAttribute('data-testid').then(value => value?.replace('card-mixer-saved-recipe-', '') ?? '');
  await page.getByTestId(`button-delete-mixer-recipe-${recipeId}`).click();
  await expect(page.getByRole('dialog', { name: 'Delete saved recipe?' })).toBeVisible();
  await page.getByTestId('button-cancel-delete-mixer-recipe').click();
  await expect(recipeCard).toBeVisible();

  await page.getByTestId(`button-delete-mixer-recipe-${recipeId}`).click();
  await page.getByTestId('button-confirm-delete-mixer-recipe').click();
  await expect(page.getByTestId(`card-mixer-saved-recipe-${recipeId}`)).toHaveCount(0);
  await expect(page.getByTestId('status-mixer-delete')).toHaveText('Deleted "Delete me blend".');
  await expect(page.getByTestId('status-mixer-result')).toHaveText('Incomplete');
  await expect(page.getByTestId('status-mixer-live-readings-incomplete')).toBeVisible();
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
  await page.getByRole('tab', { name: 'Mixer', exact: true }).click();

  const picker = page.getByTestId('select-mixer-saved-source-a');
  await expect(picker.locator('option').filter({
    hasText: 'Saved Light Roast Profile · Watermancer saved profile · Browser regression',
  })).toHaveCount(1);
  await picker.selectOption('watermancer-profile:saved-profile-for-mixer');
  await expect(page.getByTestId('text-mixer-source-name-a')).toHaveText('Saved Light Roast Profile');
  await expect(page.getByTestId('text-mixer-source-ion-a-calcium')).toContainText('12.0');
});
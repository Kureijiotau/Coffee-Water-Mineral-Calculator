import { expect, test } from '@playwright/test';

const TASTINGS_KEY = 'cwm.waterTastings.v1';
const PROFILES_KEY = 'cwm.watermancerProfiles';
const ALCHEMIST_PROFILES_KEY = 'cwm.profiles';

async function openWaterTasting(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Water Tasting', exact: true }).click();
  await expect(page.getByTestId('water-tasting-tab')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ tastingsKey, profilesKey, alchemistProfilesKey }) => {
    const clearedFlag = '__water_tasting_e2e_storage_cleared__';
    if (sessionStorage.getItem(clearedFlag) === 'yes') return;
    localStorage.removeItem(tastingsKey);
    localStorage.removeItem(profilesKey);
    localStorage.removeItem(alchemistProfilesKey);
    sessionStorage.setItem(clearedFlag, 'yes');
  }, {
    tastingsKey: TASTINGS_KEY,
    profilesKey: PROFILES_KEY,
    alchemistProfilesKey: ALCHEMIST_PROFILES_KEY,
  });
});

test('saves a partial tasting, edits it to a complete score, and deletes it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWaterTasting(page);

  await expect(page.getByTestId('button-open-watermancer')).toBeVisible();
  await page.getByTestId('button-open-watermancer').click();
  await expect(page.getByRole('button', { name: 'Watermancer', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Water Tasting', exact: true }).click();

  await page.getByTestId('select-tasting-profile').selectOption('safe-profile');
  await page.getByTestId('input-tasting-name').fill('Sunday morning cup');
  await page.getByTestId('input-tasting-roast').fill('Light');
  await page.getByTestId('input-tasting-origin').fill('Huila, Colombia');
  await page.getByTestId('input-tasting-brewMethod').fill('V60');
  await page.getByTestId('button-rating-clarity-7').click();
  await expect(page.getByTestId('announcement-tasting-total'))
    .toHaveText('1 of 5 ratings selected. The total appears when all five are rated.');
  await page.getByTestId('toggle-descriptors-water-character').click();
  await page.getByTestId('button-descriptor-mineral').click();
  await page.getByTestId('button-save-tasting').click();

  await expect(page.getByTestId('status-tasting-feedback')).toContainText('Tasting saved');
  await expect(page.getByTestId('count-tasting-history')).toHaveText('1 entry');
  const card = page.locator('[data-testid^="card-tasting-"]');
  await expect(card).toHaveCount(1);
  const cardTestId = await card.getAttribute('data-testid');
  const tastingId = cardTestId!.replace('card-tasting-', '');
  await expect(page.getByTestId(`profile-tasting-${tastingId}`)).toHaveText('Aiki safe profile');
  await expect(page.getByTestId(`coffee-tasting-${tastingId}`)).toHaveText('Sunday morning cup');
  await expect(page.getByTestId(`descriptors-tasting-${tastingId}`)).toContainText('Mineral');
  await expect(page.getByTestId(`total-tasting-${tastingId}`)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.reload();
  await page.getByRole('tab', { name: 'Water Tasting', exact: true }).click();
  await expect(page.getByTestId(`card-tasting-${tastingId}`)).toBeVisible();

  await page.getByTestId(`button-edit-tasting-${tastingId}`).click();
  await expect(page.getByTestId('input-tasting-name')).toHaveValue('Sunday morning cup');
  await expect(page.getByTestId('value-rating-clarity')).toHaveText('7 / 10');
  await page.getByTestId('input-tasting-name').fill('Sunday cup, revised');
  await page.getByTestId('button-rating-flavorExpression-8').click();
  await page.getByTestId('button-rating-balance-6').click();
  await page.getByTestId('button-rating-mouthfeel-8').click();
  await page.getByTestId('button-rating-finish-9').click();
  await expect(page.getByTestId('value-tasting-total')).toHaveText('38 / 50');
  await expect(page.getByTestId('announcement-tasting-total')).toHaveText('Your impression total is 38 out of 50.');
  const waterCharacterGroup = page.getByTestId('group-descriptors-water-character');
  const isWaterCharacterOpen = await waterCharacterGroup.evaluate(group => (group as HTMLDetailsElement).open);
  if (!isWaterCharacterOpen) await page.getByTestId('toggle-descriptors-water-character').click();
  await page.getByTestId('button-descriptor-saline').click();
  await expect(page.getByTestId('value-tasting-total')).toHaveText('38 / 50');
  await page.getByTestId('button-save-tasting').click();

  await expect(page.getByTestId('status-tasting-feedback')).toContainText('Tasting updated');
  await expect(page.getByTestId(`coffee-tasting-${tastingId}`)).toHaveText('Sunday cup, revised');
  await expect(page.getByTestId(`total-tasting-${tastingId}`)).toHaveText('38 / 50');

  await page.getByTestId(`button-delete-tasting-${tastingId}`).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByTestId(`button-confirm-delete-tasting-${tastingId}`).click();
  await expect(page.getByTestId(`card-tasting-${tastingId}`)).toHaveCount(0);
  await expect(page.getByTestId('empty-tasting-history')).toBeVisible();

  await page.reload();
  await page.getByRole('tab', { name: 'Water Tasting', exact: true }).click();
  await expect(page.getByTestId('empty-tasting-history')).toBeVisible();
});

test('keeps a deleted profile name available when editing its tasting', async ({ page }) => {
  await page.addInitScript(tastingsKey => {
    localStorage.setItem(tastingsKey, JSON.stringify([{
      id: 'legacy-tasting',
      createdAt: '2026-09-27T09:00:00.000Z',
      updatedAt: '2026-09-27T09:00:00.000Z',
      profileSourceId: 'saved:removed-water',
      profileNameSnapshot: 'Deleted favorite water',
      coffee: {},
      ratings: { clarity: 5 },
      descriptorIds: [],
    }]));
  }, TASTINGS_KEY);

  await openWaterTasting(page);
  await expect(page.getByTestId('profile-tasting-legacy-tasting')).toHaveText('Deleted favorite water');
  await page.getByTestId('button-edit-tasting-legacy-tasting').click();
  await expect(page.getByTestId('select-tasting-profile')).toHaveValue('saved:removed-water');
  await expect(page.getByTestId('select-tasting-profile').locator('option:checked'))
    .toHaveText('Deleted favorite water (no longer available)');
  await page.getByTestId('button-save-tasting').click();
  await expect(page.getByTestId('status-tasting-feedback')).toContainText('Tasting updated');
  await expect(page.getByTestId('profile-tasting-legacy-tasting')).toHaveText('Deleted favorite water');
});

test('selects a saved target, preserves its prior name snapshot, and keeps history newest-first', async ({ page }) => {
  await page.addInitScript(({ profilesKey, tastingsKey }) => {
    const seededFlag = '__water_tasting_saved_profile_fixture_seeded__';
    if (sessionStorage.getItem(seededFlag) === 'yes') return;
    localStorage.setItem(profilesKey, JSON.stringify([{
      id: 'e2e-profile',
      name: 'Renamed E2E Water',
      targets: { calcium: 40 },
    }]));
    localStorage.setItem(tastingsKey, JSON.stringify([
      {
        id: 'older-saved-water-tasting',
        createdAt: '2026-09-26T09:00:00.000Z',
        updatedAt: '2026-09-26T09:00:00.000Z',
        profileSourceId: 'saved:e2e-profile',
        profileNameSnapshot: 'Original E2E Water',
        coffee: { name: 'Older cup' },
        ratings: { clarity: 5 },
        descriptorIds: [],
      },
      {
        id: 'newer-saved-water-tasting',
        createdAt: '2026-09-27T09:00:00.000Z',
        updatedAt: '2026-09-27T09:00:00.000Z',
        profileSourceId: 'saved:e2e-profile',
        profileNameSnapshot: 'Original E2E Water',
        coffee: { name: 'Newer cup' },
        ratings: { clarity: 6 },
        descriptorIds: [],
      },
    ]));
    sessionStorage.setItem(seededFlag, 'yes');
  }, { profilesKey: PROFILES_KEY, tastingsKey: TASTINGS_KEY });

  await openWaterTasting(page);
  await page.getByTestId('select-tasting-profile').selectOption('saved:e2e-profile');
  await expect(page.getByTestId('select-tasting-profile').locator('option:checked')).toHaveText('Renamed E2E Water');
  await page.getByTestId('input-tasting-name').fill('Fresh cup');
  await page.getByTestId('button-save-tasting').click();
  await expect(page.getByTestId('status-tasting-feedback')).toContainText('Tasting saved');

  const cards = page.locator('[data-testid^="card-tasting-"]');
  await expect(cards).toHaveCount(3);
  const firstCardTestId = await cards.first().getAttribute('data-testid');
  const newTastingId = firstCardTestId!.replace('card-tasting-', '');
  await expect(cards.nth(1)).toHaveAttribute('data-testid', 'card-tasting-newer-saved-water-tasting');
  await expect(cards.nth(2)).toHaveAttribute('data-testid', 'card-tasting-older-saved-water-tasting');
  await expect(page.getByTestId(`profile-tasting-${newTastingId}`)).toHaveText('Renamed E2E Water');

  await page.reload();
  await page.getByRole('tab', { name: 'Water Tasting', exact: true }).click();
  const reloadedCards = page.locator('[data-testid^="card-tasting-"]');
  await expect(reloadedCards).toHaveCount(3);
  await expect(reloadedCards.first()).toHaveAttribute('data-testid', `card-tasting-${newTastingId}`);
  await expect(reloadedCards.nth(1)).toHaveAttribute('data-testid', 'card-tasting-newer-saved-water-tasting');
  await expect(reloadedCards.nth(2)).toHaveAttribute('data-testid', 'card-tasting-older-saved-water-tasting');

  await page.getByTestId('button-edit-tasting-older-saved-water-tasting').click();
  await expect(page.getByTestId('select-tasting-profile')).toHaveValue('saved:e2e-profile');
  await expect(page.getByTestId('text-profile-snapshot'))
    .toHaveText('Originally saved as “Original E2E Water”. That name stays with this note.');
  await page.getByTestId('button-save-tasting').click();
  await expect(page.getByTestId('profile-tasting-older-saved-water-tasting')).toHaveText('Original E2E Water');
});

test('shows the existing mineral analysis card for each profile source', async ({ page }) => {
  await page.addInitScript(profilesKey => {
    localStorage.setItem(profilesKey, JSON.stringify([
      {
        id: 'e2e-finished-profile',
        name: 'Finished E2E Water',
        targets: { calcium: 40 },
        finishedIons: { calcium: 25 },
      },
      {
        id: 'e2e-target-profile',
        name: 'Target E2E Water',
        targets: { magnesium: 15 },
      },
    ]));
  }, PROFILES_KEY);

  await openWaterTasting(page);
  const select = page.getByTestId('select-tasting-profile');
  await expect(select.locator('optgroup[label="Built-in"]')).toHaveCount(1);
  await expect(select.locator('optgroup[label="Alchemist"]')).toHaveCount(1);
  await expect(select.locator('optgroup[label="Watermancer"]')).toHaveCount(1);
  await expect(select.locator('optgroup[label="Alchemist"] option').first()).toHaveAttribute(
    'value',
    /^alchemist:/,
  );

  const analysis = page.getByTestId('panel-tasting-profile-analysis');
  await select.selectOption('safe-profile');
  await expect(analysis).toContainText('Aiki safe profile');
  await expect(analysis).toContainText('Mineral analysis');
  await expect(analysis).not.toContainText('NaN');
  const safeCardText = await analysis.innerText();

  await select.selectOption('salt-table');
  await expect(analysis).toContainText('Current salt table');
  const saltTableText = await analysis.innerText();
  expect(saltTableText).not.toBe(safeCardText);

  const alchemistOptionValue = await select
    .locator('optgroup[label="Alchemist"] option')
    .first()
    .getAttribute('value');
  expect(alchemistOptionValue).toMatch(/^alchemist:/);
  await select.selectOption(alchemistOptionValue!);
  await expect(analysis).toContainText('Current recipe');

  await select.selectOption('saved:e2e-finished-profile');
  await expect(analysis).toContainText('Finished E2E Water');
  await expect(analysis).toContainText('25.0');
  await expect(analysis).not.toContainText('NaN');
  const finishedProfileText = await analysis.innerText();

  await select.selectOption('saved:e2e-target-profile');
  await expect(analysis).toContainText('Target E2E Water');
  await expect(analysis).toContainText('15.0');
  expect(await analysis.innerText()).not.toBe(finishedProfileText);
});

test('does not overwrite malformed saved tasting data', async ({ page }) => {
  await page.addInitScript(tastingsKey => {
    localStorage.setItem(tastingsKey, '{malformed');
  }, TASTINGS_KEY);

  await openWaterTasting(page);
  await expect(page.getByTestId('alert-tasting-storage')).toContainText('saving is blocked');
  await page.getByTestId('select-tasting-profile').selectOption('salt-table');
  await page.getByTestId('input-tasting-name').fill('Unsaved cup');
  await page.getByTestId('button-save-tasting').click();
  await expect(page.getByTestId('status-tasting-feedback')).toContainText('saving is blocked');
  await expect(page.getByTestId('empty-tasting-history')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), TASTINGS_KEY)).toBe('{malformed');
});

test('does not overwrite data corrupted after the form is opened', async ({ page }) => {
  await openWaterTasting(page);
  await page.getByTestId('select-tasting-profile').selectOption('salt-table');
  await page.getByTestId('input-tasting-name').fill('Unsaved cup');
  await page.evaluate(key => localStorage.setItem(key, '{corrupted after load'), TASTINGS_KEY);
  await page.getByTestId('button-save-tasting').click();

  await expect(page.getByTestId('status-tasting-feedback')).toContainText('could not be read');
  await expect(page.getByTestId('empty-tasting-history')).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), TASTINGS_KEY)).toBe('{corrupted after load');
});

test('saves and reopens the cup-shape spectrum and descriptors', async ({ page }) => {
  await openWaterTasting(page);
  await page.getByTestId('select-tasting-profile').selectOption('salt-table');

  const acidity = page.getByTestId('input-spectrum-acidityFocus');
  const body = page.getByTestId('input-spectrum-bodyWeight');
  const structure = page.getByTestId('input-spectrum-structure');
  const finish = page.getByTestId('input-spectrum-finish');
  await expect(acidity).toHaveValue('0');
  await expect(body).toHaveValue('0');
  await expect(structure).toHaveValue('0');
  await expect(finish).toHaveValue('0');

  await acidity.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await body.focus();
  await page.keyboard.press('ArrowLeft');
  await structure.focus();
  await page.keyboard.press('ArrowRight');

  await page.getByTestId('toggle-descriptors-acidity-sweetness').click();
  await page.getByTestId('button-descriptor-sparkling').click();
  await page.getByTestId('toggle-descriptors-body-tactile').click();
  await page.getByTestId('button-descriptor-hollow').click();
  await page.getByTestId('toggle-descriptors-finish-defects').click();
  await page.getByTestId('button-descriptor-clean-finish').click();
  await page.getByTestId('button-save-tasting').click();

  const card = page.locator('[data-testid^="card-tasting-"]').first();
  const summary = card.locator('[data-testid^="spectrum-tasting-"]');
  await expect(summary).toContainText('Acidity');
  await expect(summary).toContainText('+2');
  await expect(summary).toContainText('Body');
  await expect(summary).toContainText('−1');
  await expect(card).toContainText('Sparkling');
  await expect(card).toContainText('Hollow');
  await expect(card).toContainText('Clean finish');

  await card.locator('[data-testid^="button-edit-tasting-"]').click();
  await expect(acidity).toHaveValue('2');
  await expect(body).toHaveValue('-1');
  await expect(structure).toHaveValue('1');
  await expect(finish).toHaveValue('0');
});

test('refreshes Watermancer picker options when another tab saves a profile', async ({ page }) => {
  await openWaterTasting(page);
  await page.evaluate(() => {
    const trackedWindow = window as Window & { __profileStorageWrites?: number };
    trackedWindow.__profileStorageWrites = 0;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'cwm.profiles' || key === 'cwm.watermancerProfiles') {
        trackedWindow.__profileStorageWrites = (trackedWindow.__profileStorageWrites ?? 0) + 1;
      }
      originalSetItem.call(this, key, value);
    };
  });
  await page.waitForTimeout(350);
  const writesBeforeRemoteUpdate = await page.evaluate(
    () => (window as Window & { __profileStorageWrites?: number }).__profileStorageWrites ?? 0,
  );

  const otherTab = await page.context().newPage();
  await otherTab.goto('/');
  await otherTab.waitForTimeout(350);
  await otherTab.evaluate(({ alchemistKey, watermancerKey }) => {
    localStorage.setItem(alchemistKey, JSON.stringify([{
      id: 'cross-tab-alchemist',
      name: 'Cross-tab Alchemist',
      ranges: {},
    }]));
    localStorage.setItem(watermancerKey, JSON.stringify([{
      id: 'cross-tab-water',
      name: 'Cross-tab Water',
      targets: { calcium: 25 },
    }]));
  }, {
    alchemistKey: ALCHEMIST_PROFILES_KEY,
    watermancerKey: PROFILES_KEY,
  });

  await expect(
    page.getByTestId('select-tasting-profile').locator('option[value="saved:cross-tab-water"]'),
  ).toHaveCount(1);
  await expect(
    page.getByTestId('select-tasting-profile').locator('option[value="alchemist:cross-tab-alchemist"]'),
  ).toHaveCount(1);
  await page.waitForTimeout(400);
  const writesAfterRemoteUpdate = await page.evaluate(
    () => (window as Window & { __profileStorageWrites?: number }).__profileStorageWrites ?? 0,
  );
  expect(writesAfterRemoteUpdate).toBe(writesBeforeRemoteUpdate);
  await otherTab.close();
});
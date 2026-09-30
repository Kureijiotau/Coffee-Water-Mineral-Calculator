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

test('records water’s effect with five sliders and edits a partial tasting', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWaterTasting(page);

  await expect(page.getByTestId('input-descriptive-fragrance')).toHaveCount(0);
  await expect(page.getByTestId('toggle-descriptors-fragrance-aroma')).toHaveCount(0);
  await expect(page.getByTestId('input-tasting-roast')).toHaveCount(0);
  await expect(page.getByTestId('input-tasting-origin')).toHaveCount(0);
  await expect(page.getByTestId('input-tasting-brewMethod')).toHaveCount(0);

  await expect(page.getByTestId('button-open-watermancer')).toBeVisible();
  await page.getByTestId('button-open-watermancer').click();
  await expect(page.getByRole('button', { name: 'Watermancer', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Water Tasting', exact: true }).click();

  await page.getByTestId('select-tasting-profile').selectOption('safe-profile');
  await page.getByTestId('input-tasting-name').fill('Sunday morning cup');

  const fragranceAroma = page.getByTestId('input-affective-fragranceAroma');
  await fragranceAroma.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const flavorAftertaste = page.getByTestId('input-affective-flavorAftertaste');
  await flavorAftertaste.focus();
  await page.keyboard.press('ArrowRight');
  const acidity = page.getByTestId('input-affective-acidity');
  await acidity.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const mouthfeel = page.getByTestId('input-affective-mouthfeel');
  await mouthfeel.focus();
  await page.keyboard.press('ArrowLeft');
  const overall = page.getByTestId('input-affective-overall');
  await overall.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(fragranceAroma).toHaveValue('6');
  await expect(flavorAftertaste).toHaveValue('6');
  await expect(acidity).toHaveValue('8');
  await expect(mouthfeel).toHaveValue('4');
  await expect(overall).toHaveValue('7');
  await expect(page.getByTestId('cue-affective-overall')).toHaveText('Moderately high');
  await expect(page.getByTestId('panel-tasting-profile-analysis')).toHaveCount(0);
  await page.getByTestId('button-save-tasting').click();

  await expect(page.getByTestId('status-tasting-feedback')).toContainText('Tasting saved');
  await expect(page.getByTestId('count-tasting-history')).toHaveText('1 entry');
  const card = page.locator('[data-testid^="card-tasting-"]');
  await expect(card).toHaveCount(1);
  const cardTestId = await card.getAttribute('data-testid');
  const tastingId = cardTestId!.replace('card-tasting-', '');
  await expect(page.getByTestId(`profile-tasting-${tastingId}`)).toHaveText('Aiki safe profile');
  await expect(page.getByTestId(`coffee-tasting-${tastingId}`)).toHaveText('Sunday morning cup');
  await expect(page.getByTestId(`descriptors-tasting-${tastingId}`)).toHaveCount(0);
  await expect(page.getByTestId(`total-tasting-${tastingId}`)).toHaveCount(0);
  await expect(page.getByTestId(`overall-tasting-${tastingId}`)).toHaveText('Overall 7 / 9');
  await expect(page.getByTestId(`scores-tasting-${tastingId}`)).toContainText('Fragrance');
  await expect(page.getByTestId(`scores-tasting-${tastingId}`)).toContainText('6 / 9');
  await expect(page.getByTestId(`scores-tasting-${tastingId}`)).toContainText('Mouthfeel');
  await expect(page.getByTestId(`scores-tasting-${tastingId}`)).not.toContainText('/ 15');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.reload();
  await page.getByRole('tab', { name: 'Water Tasting', exact: true }).click();
  await expect(page.getByTestId(`card-tasting-${tastingId}`)).toBeVisible();

  await page.getByTestId(`button-edit-tasting-${tastingId}`).click();
  await expect(page.getByTestId('input-tasting-name')).toHaveValue('Sunday morning cup');
  await expect(page.getByTestId('input-affective-fragranceAroma')).toHaveValue('6');
  await expect(page.getByTestId('input-affective-flavorAftertaste')).toHaveValue('6');
  await expect(page.getByTestId('input-affective-acidity')).toHaveValue('8');
  await expect(page.getByTestId('input-affective-mouthfeel')).toHaveValue('4');
  await expect(page.getByTestId('input-affective-overall')).toHaveValue('7');
  await page.getByTestId('input-tasting-name').fill('Sunday cup, revised');
  await page.getByTestId('button-save-tasting').click();

  await expect(page.getByTestId('status-tasting-feedback')).toContainText('Tasting updated');
  await expect(page.getByTestId(`coffee-tasting-${tastingId}`)).toHaveText('Sunday cup, revised');
  await expect(page.getByTestId(`overall-tasting-${tastingId}`)).toHaveText('Overall 7 / 9');
  await expect(page.getByTestId(`scores-tasting-${tastingId}`)).toContainText('Fragrance');

  await page.getByTestId(`button-delete-tasting-${tastingId}`).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByTestId(`button-confirm-delete-tasting-${tastingId}`).click();
  await expect(page.getByTestId(`card-tasting-${tastingId}`)).toHaveCount(0);
  await expect(page.getByTestId('empty-tasting-history')).toBeVisible();

  await page.reload();
  await page.getByRole('tab', { name: 'Water Tasting', exact: true }).click();
  await expect(page.getByTestId('empty-tasting-history')).toBeVisible();
});

test('keeps hidden details when editing a saved CVA tasting', async ({ page }) => {
  const legacyDetails = {
    fragrance: 3,
    aroma: 4,
    flavor: 5,
    aftertaste: 6,
    acidity: 7,
    sweetness: 8,
    mouthfeel: 9,
  };
  await page.addInitScript(({ tastingsKey, record }) => {
    localStorage.setItem(tastingsKey, JSON.stringify([record]));
  }, {
    tastingsKey: TASTINGS_KEY,
    record: {
      id: 'hidden-details-cva',
      createdAt: '2026-09-28T09:00:00.000Z',
      updatedAt: '2026-09-28T09:00:00.000Z',
      profileSourceId: 'safe-profile',
      profileNameSnapshot: 'Aiki safe profile',
      coffee: { name: 'Older cup', roast: 'Light', origin: 'Huila', brewMethod: 'V60' },
      scoringVersion: 2,
      descriptive: legacyDetails,
      affective: { fragranceAroma: 5, flavorAftertaste: 6, acidity: 7, mouthfeel: 8, overall: 9 },
      descriptorIds: ['mineral', 'clean-finish'],
    },
  });
  await openWaterTasting(page);
  await expect(page.getByTestId('card-tasting-hidden-details-cva')).toBeVisible();
  await page.getByTestId('button-edit-tasting-hidden-details-cva').click();
  await expect(page.getByTestId('input-tasting-name')).toHaveValue('Older cup');
  await expect(page.getByTestId('input-tasting-roast')).toHaveCount(0);
  await page.getByTestId('input-tasting-name').fill('Older cup, renamed');
  await page.getByTestId('input-affective-overall').focus();
  await page.keyboard.press('ArrowLeft');
  await page.getByTestId('button-save-tasting').click();
  await expect(page.getByTestId('status-tasting-feedback')).toContainText('Tasting updated');

  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]'), TASTINGS_KEY);
  expect(saved[0].descriptive).toEqual(legacyDetails);
  expect(saved[0].descriptorIds).toEqual(['mineral', 'clean-finish']);
  expect(saved[0].coffee).toEqual({
    name: 'Older cup, renamed',
    roast: 'Light',
    origin: 'Huila',
    brewMethod: 'V60',
  });
  expect(saved[0].affective.overall).toBe(8);
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

test('keeps legacy ratings, cup-shape values, and descriptors in their original format', async ({ page }) => {
  await page.addInitScript(tastingsKey => {
    localStorage.setItem(tastingsKey, JSON.stringify([{
      id: 'legacy-spectrum',
      createdAt: '2026-09-27T09:00:00.000Z',
      updatedAt: '2026-09-27T09:00:00.000Z',
      profileSourceId: 'safe-profile',
      profileNameSnapshot: 'Aiki safe profile',
      coffee: { name: 'Legacy cup' },
      ratings: {
        clarity: 5,
        flavorExpression: 6,
        balance: 7,
        mouthfeel: 8,
        finish: 9,
      },
      spectrum: {
        acidityFocus: 2,
        bodyWeight: -1,
        structure: 1,
        finish: 0,
      },
      descriptorIds: ['sparkling', 'hollow', 'clean-finish'],
    }]));
  }, TASTINGS_KEY);

  await openWaterTasting(page);
  await expect(page.getByTestId('total-tasting-legacy-spectrum')).toHaveText('35 / 50');
  await page.getByTestId('button-edit-tasting-legacy-spectrum').click();
  await expect(page.getByTestId('value-rating-clarity')).toHaveText('5 / 10');

  const acidity = page.getByTestId('input-spectrum-acidityFocus');
  const body = page.getByTestId('input-spectrum-bodyWeight');
  const structure = page.getByTestId('input-spectrum-structure');
  const finish = page.getByTestId('input-spectrum-finish');
  await expect(acidity).toHaveValue('2');
  await expect(body).toHaveValue('-1');
  await expect(structure).toHaveValue('1');
  await expect(finish).toHaveValue('0');

  await acidity.focus();
  await page.keyboard.press('ArrowRight');
  await body.focus();
  await page.keyboard.press('ArrowLeft');

  await page.getByTestId('toggle-descriptors-main-tastes').click();
  await page.getByTestId('button-descriptor-jammy').click();
  await page.getByTestId('button-save-tasting').click();

  const card = page.locator('[data-testid^="card-tasting-"]').first();
  const summary = card.locator('[data-testid^="spectrum-tasting-"]');
  await expect(summary).toContainText('Acidity');
  await expect(summary).toContainText('+3');
  await expect(summary).toContainText('Body');
  await expect(summary).toContainText('−2');
  await expect(card).toContainText('Sparkling');
  await expect(card).toContainText('Hollow');
  await expect(card).toContainText('Clean finish');
  await expect(card).toContainText('Jammy');
  expect(await page.evaluate(key => {
    const records = JSON.parse(localStorage.getItem(key) ?? '[]');
    return records[0];
  }, TASTINGS_KEY)).toMatchObject({
    ratings: {
      clarity: 5,
      flavorExpression: 6,
      balance: 7,
      mouthfeel: 8,
      finish: 9,
    },
    spectrum: { acidityFocus: 3, bodyWeight: -2, structure: 1, finish: 0 },
  });
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]')[0]?.scoringVersion, TASTINGS_KEY))
    .toBeUndefined();

  await card.locator('[data-testid^="button-edit-tasting-"]').click();
  await expect(acidity).toHaveValue('3');
  await expect(body).toHaveValue('-2');
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
import { expect, test, type Page } from '@playwright/test';

const SAVED_PROFILE_SORT_KEY = 'coffee-water-profile-picker-sort-mode';
const SAVED_PROFILES_KEY = 'cwm.watermancerProfiles';
const SAVED_RECIPES_KEY = 'cwc-saved-recipes';

const existingOptionsNewestFirst = [
  'Profile · Zebra water',
  'Recipe · Espresso recipe',
  'Profile · Beta water',
];

function makeProfile(id: string, name: string) {
  return {
    id,
    name,
    targets: {
      calcium: 20,
      magnesium: 5,
      sodium: 2,
      potassium: 1,
      bicarbonate: 30,
      sulfate: 10,
      chloride: 8,
      citrates: 0,
    },
  };
}

async function seedSavedItems(page: Page): Promise<void> {
  await page.addInitScript(({ profilesKey, recipesKey, sortKey, profiles, recipes }) => {
    localStorage.setItem(profilesKey, JSON.stringify(profiles));
    localStorage.setItem(recipesKey, JSON.stringify(recipes));
    localStorage.setItem(sortKey, 'newest-first');
  }, {
    profilesKey: SAVED_PROFILES_KEY,
    recipesKey: SAVED_RECIPES_KEY,
    sortKey: SAVED_PROFILE_SORT_KEY,
    profiles: [
      makeProfile('watermancer-1000000000000-beta', 'Beta water'),
      makeProfile('watermancer-1100000000000-zebra', 'Zebra water'),
    ],
    recipes: [{
      id: `saved-${(1_050_000_000_000).toString(36)}-abcde`,
      name: 'Espresso recipe',
      salts: { nacl: { target: '10', formIdx: 0 } },
    }],
  });
}

async function openSavedPicker(page: Page) {
  await page.getByRole('button', { name: 'Select mineral recipe' }).click();
  return page.getByRole('dialog', { name: 'Mineral recipes' });
}

async function expectSavedOrder(page: Page, expected: string[]): Promise<void> {
  const picker = await openSavedPicker(page);
  const savedGroup = picker.getByRole('group', { name: 'My saved profiles' });
  await expect(savedGroup).toBeVisible();
  const labels = await savedGroup.getByRole('option').allTextContents();
  expect(labels.map(label => label.trim())).toEqual(expected);
  await page.getByRole('button', { name: 'Select mineral recipe' }).click();
}

for (const viewport of [
  { label: 'desktop', width: 1280, height: 900 },
  { label: 'narrow', width: 390, height: 844 },
]) {
  test(`saves a Watermancer profile and selects it in Mixer responsively at ${viewport.label} width`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedSavedItems(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Watermancer', exact: true }).click();

    await expect(page.getByText('1. Set your target water', { exact: true })).toBeVisible();
    await expectSavedOrder(page, existingOptionsNewestFirst);

    const pickerBeforeSave = await openSavedPicker(page);
    await expect(
      pickerBeforeSave.getByRole('group', { name: 'Kimoi.coffee Recipes' }).getByRole('option').first(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Select mineral recipe' }).click();

    const beginSave = await page.evaluate(() => performance.now());
    await page.getByTitle('Edit this Watermancer profile before saving').click();
    await page.locator('button').filter({ hasText: 'Save as new' }).click();
    const profileName = page.getByPlaceholder('Name your profile');
    await expect(profileName).toBeVisible();
    const editorOpenMs = await page.evaluate(start => performance.now() - start, beginSave);
    expect(editorOpenMs, 'opening the save editor should not pause the UI').toBeLessThan(2_500);

    await profileName.fill('Browser save profile');
    const beginCommit = await page.evaluate(() => performance.now());
    await profileName.locator('xpath=..').locator('button').first().click();

    const targetPicker = page.getByRole('button', { name: 'Select mineral recipe' });
    await expect(targetPicker).toContainText('Profile · Browser save profile');
    const saveAndSelectMs = await page.evaluate(start => performance.now() - start, beginCommit);
    expect(saveAndSelectMs, 'saving and selecting the new profile should not pause the UI').toBeLessThan(2_500);

    await expect.poll(async () => page.evaluate(profileStorageKey => {
      const profiles = JSON.parse(localStorage.getItem(profileStorageKey) ?? '[]') as Array<{ name: string }>;
      return profiles.some(profile => profile.name === 'Browser save profile');
    }, SAVED_PROFILES_KEY)).toBe(true);
    const savedProfiles = await page.evaluate(profileStorageKey => JSON.parse(
      localStorage.getItem(profileStorageKey) ?? '[]',
    ) as Array<{ id: string; name: string; targets: Record<string, number> }>, SAVED_PROFILES_KEY);
    expect(savedProfiles.map(profile => profile.name)).toContain('Browser save profile');
    const savedProfile = savedProfiles.find(profile => profile.name === 'Browser save profile');
    expect(savedProfile).toBeDefined();

    const pickerAfterSave = await openSavedPicker(page);
    const savedGroup = pickerAfterSave.getByRole('group', { name: 'My saved profiles' });
    const selectedProfile = savedGroup.getByRole('option', { name: 'Profile · Browser save profile' });
    await expect(selectedProfile).toHaveAttribute('aria-selected', 'true');
    await expect(
      pickerAfterSave.getByRole('group', { name: 'Kimoi.coffee Recipes' }).getByRole('option').first(),
    ).toBeVisible();
    const savedSort = pickerAfterSave.getByRole('button', { name: 'Sort saved' });
    await savedSort.click();
    const sortDialog = page.getByRole('dialog', { name: 'Sort saved profiles' });
    await expect(
      sortDialog.getByRole('radio', { name: 'Date added · Newest first' }),
    ).toHaveAttribute('aria-checked', 'true');
    await sortDialog.getByRole('button', { name: 'Done' }).click();
    const labelsAfterSave = await savedGroup.getByRole('option').allTextContents();
    expect(labelsAfterSave.map(label => label.trim())).toEqual([
      'Profile · Browser save profile',
      ...existingOptionsNewestFirst,
    ]);
    await page.getByRole('button', { name: 'Select mineral recipe' }).click();

    await page.getByRole('tab', { name: 'Mixer', exact: true }).click();
    const mixerSourcePicker = page.getByTestId('select-mixer-saved-source-a');
    await expect(mixerSourcePicker.locator('option').filter({
      hasText: 'Browser save profile · Watermancer saved profile',
    })).toHaveCount(1);
    await mixerSourcePicker.selectOption(`watermancer-profile:${savedProfile!.id}`);
    await expect(page.getByTestId('text-mixer-source-name-a')).toHaveText('Browser save profile');

    for (const [ionId, value] of Object.entries(savedProfile!.targets)) {
      const displayedValue = value < 10 ? value.toFixed(2) : value.toFixed(1);
      await expect(page.getByTestId(`text-mixer-source-ion-a-${ionId}`)).toContainText(displayedValue);
    }
  });
}

test('keeps the selected Watermancer target when sync replaces its duplicate ID', async ({ page }) => {
  const previousProfile = makeProfile('local-water-target', 'Saved target');
  const survivingProfile = { ...previousProfile, id: 'cloud-water-target' };
  await page.addInitScript(({ profilesKey, targetKey, profile }) => {
    localStorage.setItem(profilesKey, JSON.stringify([profile]));
    localStorage.setItem(targetKey, `saved:${profile.id}`);
  }, {
    profilesKey: SAVED_PROFILES_KEY,
    targetKey: 'coffee-water-watermancer-target-source',
    profile: previousProfile,
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();
  const targetPicker = page.getByRole('button', { name: 'Select mineral recipe' });
  await expect(targetPicker).toContainText('Profile · Saved target');

  await page.evaluate(({ profilesKey, profile }) => {
    localStorage.setItem(profilesKey, JSON.stringify([profile]));
    window.dispatchEvent(new Event('cwm:account-sync-remote-change'));
  }, { profilesKey: SAVED_PROFILES_KEY, profile: survivingProfile });

  await expect(targetPicker).toContainText('Profile · Saved target');
  await expect.poll(() => page.evaluate(targetKey => localStorage.getItem(targetKey), 'coffee-water-watermancer-target-source'))
    .toBe('saved:cloud-water-target');

  const pickerDialog = async () => {
    await targetPicker.click();
    return page.getByRole('dialog', { name: 'Mineral recipes' });
  };
  let dialog = await pickerDialog();
  await expect(dialog.getByRole('option', { name: 'Profile · Saved target' })).toHaveAttribute('aria-selected', 'true');
  await targetPicker.click();
  await page.reload();
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();
  dialog = await pickerDialog();
  await expect(dialog.getByRole('option', { name: 'Profile · Saved target' })).toHaveAttribute('aria-selected', 'true');
});
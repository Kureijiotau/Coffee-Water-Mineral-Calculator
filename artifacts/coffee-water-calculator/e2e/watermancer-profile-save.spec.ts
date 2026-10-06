import { expect, test, type Page } from '@playwright/test';

const SAVED_PROFILE_SORT_KEY = 'coffee-water-profile-picker-sort-mode';
const SAVED_PROFILES_KEY = 'cwm.watermancerProfiles';
const SAVED_RECIPES_KEY = 'cwc-saved-recipes';
const TEST_SEED_MARKER = 'watermancer-profile-save-test-seeded';

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
  await page.addInitScript(({ profilesKey, recipesKey, sortKey, seedMarker, profiles, recipes }) => {
    if (localStorage.getItem(seedMarker) === 'true') return;
    localStorage.setItem(profilesKey, JSON.stringify(profiles));
    localStorage.setItem(recipesKey, JSON.stringify(recipes));
    localStorage.setItem(sortKey, 'newest-first');
    localStorage.setItem(seedMarker, 'true');
  }, {
    profilesKey: SAVED_PROFILES_KEY,
    recipesKey: SAVED_RECIPES_KEY,
    sortKey: SAVED_PROFILE_SORT_KEY,
    seedMarker: TEST_SEED_MARKER,
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
    await page.getByTestId('watermancer-profile-edit').click();
    await page.getByTestId('watermancer-ion-target-calcium').fill('31.5');
    await page.getByTestId('watermancer-profile-save-as-new').click();
    const profileName = page.getByPlaceholder('Name your profile');
    await expect(profileName).toBeVisible();
    const editorOpenMs = await page.evaluate(start => performance.now() - start, beginSave);
    expect(editorOpenMs, 'opening the save editor should not pause the UI').toBeLessThan(2_500);

    await profileName.fill('Browser save profile');
    const beginCommit = await page.evaluate(() => performance.now());
    await page.getByTestId('watermancer-profile-save-as-new-confirm').click();

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
    expect(savedProfile!.targets.calcium).toBe(31.5);

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

test('creates and selects a named zero-target Watermancer profile immediately', async ({ page }) => {
  await seedSavedItems(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();

  await page.getByTestId('watermancer-profile-new').click();
  const nameInput = page.getByTestId('watermancer-new-profile-name');
  await expect(nameInput).toBeFocused();
  await expect(page.getByRole('button', { name: 'Create zero-target profile' })).toBeDisabled();
  await nameInput.fill('Zero target profile');
  await nameInput.press('Enter');

  const targetPicker = page.getByRole('button', { name: 'Select mineral recipe' });
  await expect(targetPicker).toContainText('Profile · Zero target profile');
  await expect.poll(async () => page.evaluate(profilesKey => {
    const profiles = JSON.parse(localStorage.getItem(profilesKey) ?? '[]') as Array<{
      id: string;
      name: string;
      targets: Record<string, number>;
    }>;
    return profiles.find(profile => profile.name === 'Zero target profile') ?? null;
  }, SAVED_PROFILES_KEY)).toMatchObject({
    name: 'Zero target profile',
    targets: {
      bicarbonate: 0,
      calcium: 0,
      chloride: 0,
      citrates: 0,
      magnesium: 0,
      potassium: 0,
      sodium: 0,
      sulfate: 0,
    },
  });

  await page.reload();
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();
  await expect(targetPicker).toContainText('Profile · Zero target profile');
});

test('canceling the zero-target profile name prompt leaves saved profiles and selection unchanged', async ({ page }) => {
  await seedSavedItems(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();
  const targetPicker = page.getByRole('button', { name: 'Select mineral recipe' });
  const selectedSourceBefore = await targetPicker.textContent();
  const profilesBefore = await page.evaluate(profilesKey => localStorage.getItem(profilesKey), SAVED_PROFILES_KEY);

  await page.getByTestId('watermancer-profile-new').click();
  await page.getByTestId('watermancer-new-profile-name').fill('Do not save');
  await page.getByRole('button', { name: 'Cancel new profile' }).click();

  await expect(page.getByTestId('watermancer-new-profile-form')).toHaveCount(0);
  await expect(targetPicker).toHaveText(selectedSourceBefore ?? '');
  expect(await page.evaluate(profilesKey => localStorage.getItem(profilesKey), SAVED_PROFILES_KEY))
    .toBe(profilesBefore);
});

test('overwrites only the selected profile targets and keeps that profile selected', async ({ page }) => {
  await seedSavedItems(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();

  const targetPicker = page.getByRole('button', { name: 'Select mineral recipe' });
  const picker = await openSavedPicker(page);
  await picker.getByRole('group', { name: 'My saved profiles' })
    .getByRole('option', { name: 'Profile · Beta water' }).click();
  await expect(targetPicker).toContainText('Profile · Beta water');

  await page.getByRole('button', { name: 'Edit Calcium target' }).click();
  const calciumTarget = page.getByTestId('watermancer-ion-target-calcium');
  await expect(calciumTarget).toBeVisible();
  await calciumTarget.fill('37.5');
  await page.getByTestId('watermancer-profile-overwrite').click();

  await expect(targetPicker).toContainText('Profile · Beta water');
  await expect.poll(async () => page.evaluate(profilesKey => {
    const profiles = JSON.parse(localStorage.getItem(profilesKey) ?? '[]') as Array<{
      id: string;
      name: string;
      targets: Record<string, number>;
    }>;
    return profiles.find(profile => profile.id === 'watermancer-1000000000000-beta') ?? null;
  }, SAVED_PROFILES_KEY)).toMatchObject({
    id: 'watermancer-1000000000000-beta',
    name: 'Beta water',
    targets: {
      calcium: 37.5,
      magnesium: 5,
      sodium: 2,
      potassium: 1,
      bicarbonate: 30,
      sulfate: 10,
      chloride: 8,
      citrates: 0,
    },
  });
});

test('overwrites a saved profile with final readings only when they differ and keeps the toolbar on one row', async ({ page }) => {
  await page.setViewportSize({ width: 1009, height: 900 });
  await seedSavedItems(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();

  const targetPicker = page.getByRole('button', { name: 'Select mineral recipe' });
  const picker = await openSavedPicker(page);
  await picker.getByRole('group', { name: 'My saved profiles' })
    .getByRole('option', { name: 'Profile · Beta water' }).click();
  await expect(targetPicker).toContainText('Profile · Beta water');

  const finalOverwrite = page.getByTestId('watermancer-profile-overwrite-final');
  await expect(finalOverwrite).toHaveCount(0);

  // A 1 L batch with an empty water source is a valid zero-ion final mixture.
  await page.getByRole('button', { name: 'Add water source' }).click();
  await expect(finalOverwrite).toBeVisible();

  const toolbar = page.getByTestId('watermancer-profile-toolbar');
  const toolbarButtons = toolbar.locator('button:visible');
  await expect(toolbar.getByTestId('watermancer-profile-new')).toBeVisible();
  await expect(toolbar.getByTestId('watermancer-profile-edit')).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Delete saved profile Beta water' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Download current profile' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Import water profile' })).toBeVisible();
  await expect(toolbar.getByRole('button', { name: 'Reset Watermancer inputs' })).toBeVisible();
  await expect(toolbar.getByTestId('watermancer-strength-toggle')).toBeVisible();
  const buttonTops = await toolbarButtons.evaluateAll(buttons => (
    buttons.map(button => button.getBoundingClientRect().top)
  ));
  expect(Math.max(...buttonTops) - Math.min(...buttonTops)).toBeLessThanOrEqual(1);

  let confirmationMessage = '';
  page.once('dialog', async dialog => {
    confirmationMessage = dialog.message();
    await dialog.dismiss();
  });
  await finalOverwrite.click();
  expect(confirmationMessage).toContain('Beta water');
  await expect(finalOverwrite).toBeVisible();

  page.once('dialog', dialog => dialog.accept());
  await finalOverwrite.click();
  await expect(finalOverwrite).toHaveCount(0);
  await expect.poll(async () => page.evaluate(profilesKey => {
    const profiles = JSON.parse(localStorage.getItem(profilesKey) ?? '[]') as Array<{
      id: string;
      targets: Record<string, number>;
      finishedIons?: Record<string, number>;
    }>;
    return profiles.find(profile => profile.id === 'watermancer-1000000000000-beta') ?? null;
  }, SAVED_PROFILES_KEY)).toMatchObject({
    id: 'watermancer-1000000000000-beta',
    targets: { calcium: 0, magnesium: 0, sodium: 0, bicarbonate: 0, chloride: 0, sulfate: 0 },
    finishedIons: { calcium: 0, magnesium: 0, sodium: 0, bicarbonate: 0, chloride: 0, sulfate: 0 },
  });
});

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
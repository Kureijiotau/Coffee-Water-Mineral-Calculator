import { expect, test } from '@playwright/test';
import { DAYS } from '../src/week1GuideRecipes';
import { computeIonTotals } from '../src/waterData';

const weekOneGroupName = 'Robert Asami · Week 1';
const publishedDayNames = DAYS.map(day => day.title);

async function openRecipeGroup(page: import('@playwright/test').Page, groupName: string) {
  await page.getByRole('button', { name: 'Select mineral recipe' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mineral recipes' });
  return dialog.getByRole('group', { name: groupName });
}

async function openGuideDay(page: import('@playwright/test').Page, day: number) {
  await page.goto('/');
  await page.getByTestId('mode-alchemist').click();
  await page.getByRole('tab', { name: 'R. Asami Guide', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(`DAY ${day}`) }).click();
}

async function applyGuideRecipe(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Use this recipe', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Calculator', exact: true }))
    .toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'R. Asami Guide', exact: true }))
    .toHaveAttribute('aria-selected', 'false');
  await expect(page.getByTestId('mode-brewer')).toHaveAttribute('aria-pressed', 'true');
}

test('keeps mineral-preparation controls out of the Guide page', async ({ page }) => {
  await openGuideDay(page, 1);

  await expect(page.getByText('Choose how you’ll measure minerals', { exact: true }))
    .toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Use this recipe', exact: true }))
    .toBeVisible();
});

test('lists all seven Week 1 recipes for Brewer and Alchemist without changing other recipes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cwc-saved-recipes', JSON.stringify([{
      id: 'saved-catalog-regression',
      name: 'Catalog regression',
      salts: { nacl: { target: '10', formIdx: 0 } },
    }]));
  });
  await page.goto('/');

  await page.getByTestId('mode-brewer').click();
  let group = await openRecipeGroup(page, weekOneGroupName);
  await expect(group.getByRole('option')).toHaveCount(7);
  expect(await group.getByRole('option').allTextContents()).toEqual(publishedDayNames);
  await group.getByRole('option', { name: publishedDayNames[0], exact: true }).click();
  const recipePicker = page.getByRole('button', { name: 'Select mineral recipe' });
  await expect(recipePicker).toContainText(publishedDayNames[0]);
  expect(Number(await page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm' }).inputValue()))
    .toBeGreaterThan(0);

  group = await openRecipeGroup(page, 'Kimoi.coffee Recipes');
  await group.getByRole('option', { name: /Kimoi Water/ }).click();
  await expect(recipePicker).toContainText('Kimoi Water');
  group = await openRecipeGroup(page, 'My saved profiles');
  await group.getByRole('option', { name: 'Recipe · Catalog regression', exact: true }).click();
  await expect(recipePicker).toContainText('Recipe · Catalog regression');
  expect(Number(await page.getByRole('textbox', { name: 'Sodium Chloride target ppm' }).inputValue()))
    .toBeGreaterThan(0);

  await page.getByTestId('mode-alchemist').click();
  group = await openRecipeGroup(page, weekOneGroupName);
  await expect(group.getByRole('option')).toHaveCount(7);
  await group.getByRole('option', { name: publishedDayNames[5], exact: true }).click();
  await expect(recipePicker).toContainText(publishedDayNames[5]);
  expect(Number(await page.getByRole('textbox', { name: 'Magnesium Chloride target ppm' }).inputValue()))
    .toBeGreaterThan(0);
});

test('uses the calculated Week 1 ion profile as a Watermancer target source', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-watermancer').click();

  const group = await openRecipeGroup(page, weekOneGroupName);
  await expect(group.getByRole('option')).toHaveCount(7);
  expect(await group.getByRole('option').allTextContents()).toEqual(publishedDayNames);
  await group.getByRole('option', { name: publishedDayNames[5], exact: true }).click();

  await page.getByTestId('watermancer-profile-edit').click();
  const expectedIons = computeIonTotals(DAYS[5].targets, {}, 1);
  for (const ionId of [
    'sodium',
    'potassium',
    'magnesium',
    'calcium',
    'chloride',
    'sulfate',
    'bicarbonate',
  ] as const) {
    const field = page.getByTestId(`watermancer-ion-target-${ionId}`);
    await expect(field).toBeVisible();
    expect(Number(await field.inputValue())).toBeCloseTo(Number(expectedIons[ionId]), 5);
  }
});

test('hands a selected non-default guide day to Brewer from Alchemist', async ({ page }) => {
  await openGuideDay(page, 6);

  await applyGuideRecipe(page);
  await expect(page.getByTestId('brewer-salt-row-gh-mgcl2')).toBeVisible();
  const magnesiumChlorideTarget = page.getByRole('textbox', {
    name: 'Magnesium Chloride target ppm',
  });
  expect(Number(await magnesiumChlorideTarget.inputValue()))
    .toBeCloseTo(DAYS[5].targets.mgcl2, 3);
  expect(Number(await page.getByRole('textbox', {
    name: 'Magnesium Chloride direct dose in milligrams',
  }).inputValue())).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Advanced: hydration forms' }).click();
  await expect(page.getByRole('combobox', {
    name: 'Magnesium Chloride hydration form',
  })).toHaveValue(String(DAYS[5].formIdx.mgcl2));
});

for (const swap of [
  {
    name: 'magnesium chloride',
    control: 'Swap Epsom salt for magnesium chloride',
    included: 'Magnesium Chloride',
    excluded: 'Magnesium Sulfate',
    includedForm: '1',
  },
  {
    name: 'sodium bicarbonate',
    control: 'Optional Watermancer swap: potassium bicarbonate for sodium bicarbonate',
    included: 'Sodium Bicarbonate',
    excluded: 'Potassium Bicarbonate',
    includedForm: '0',
  },
]) {
  test(`preserves the Day 5 ${swap.name} swap when opening Brewer`, async ({ page }) => {
    await openGuideDay(page, 5);
    await page.getByRole('button', { name: swap.control, exact: true }).click();

    await applyGuideRecipe(page);
    const includedTarget = page.getByRole('textbox', {
      name: `${swap.included} target ppm`,
    });
    const excludedTarget = page.getByRole('textbox', {
      name: `${swap.excluded} target ppm`,
    });
    expect(Number(await includedTarget.inputValue())).toBeGreaterThan(0);
    await expect(excludedTarget).toHaveValue('');

    await page.getByRole('button', { name: 'Advanced: hydration forms' }).click();
    await expect(page.getByRole('combobox', {
      name: `${swap.included} hydration form`,
    })).toHaveValue(swap.includedForm);
  });
}

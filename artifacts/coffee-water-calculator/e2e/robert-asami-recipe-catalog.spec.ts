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
  await expect(group.getByRole('option').allTextContents()).resolves.toEqual(publishedDayNames);
  await group.getByRole('option', { name: publishedDayNames[0], exact: true }).click();
  const recipePicker = page.getByRole('button', { name: 'Select mineral recipe' });
  await expect(recipePicker).toContainText(publishedDayNames[0]);
  expect(Number(await page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm' }).inputValue()))
    .toBeGreaterThan(0);

  group = await openRecipeGroup(page, 'Kimoi.coffee Recipes');
  await group.getByRole('option').first().click();
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
  await expect(group.getByRole('option').allTextContents()).resolves.toEqual(publishedDayNames);
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
    expect(Number(await field.inputValue())).toBeCloseTo(expectedIons[ionId], 5);
  }
});

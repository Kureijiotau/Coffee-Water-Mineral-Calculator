import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { extractWaterRecipeJsonFromPng } from '../src/waterRecipeImage';

test('shows calculator modes in order and defaults to Alchemist', async ({ page }) => {
  await page.goto('/');

  const modeButtons = page.locator('[data-testid^="mode-"]');
  expect(await modeButtons.evaluateAll(buttons => (
    buttons.map(button => button.getAttribute('data-testid'))
  ))).toEqual([
    'mode-brewer',
    'mode-alchemist',
    'mode-watermancer',
  ]);
  await expect(page.getByTestId('mode-alchemist')).toHaveAttribute('aria-pressed', 'true');
});

test('persists an explicit Brewer selection across refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-brewer').click();

  await expect(page.getByTestId('mode-brewer')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('cwm.calculatorMode')))
    .toBe('brewer');

  await page.reload();
  await expect(page.getByTestId('mode-brewer')).toHaveAttribute('aria-pressed', 'true');
});

test('does not activate modern Brewer from the legacy Brewer marker', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cwm.nerdLevel', 'brewer'));
  await page.goto('/');

  await expect(page.getByTestId('mode-alchemist')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('mode-brewer')).toHaveAttribute('aria-pressed', 'false');
});

test('renders a grouped salt-only Brewer workspace at desktop and mobile widths', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-brewer').click();

  const groupIds = await page.locator('[data-testid^="brewer-salt-group-"]').evaluateAll(elements => (
    elements.map(element => element.getAttribute('data-testid'))
  ));
  expect(groupIds).toEqual([
    'brewer-salt-group-gh',
    'brewer-salt-group-kh',
    'brewer-salt-group-additional',
  ]);
  await expect(page.getByTestId('brewer-salt-group-gh')).toContainText('GH contributors');
  await expect(page.getByTestId('brewer-salt-group-kh')).toContainText('KH contributors');
  await expect(page.getByTestId('brewer-salt-group-additional')).toContainText('Additional ions');
  await expect(page.getByTestId('brewer-salt-row-gh-mgso4')).toHaveClass(/bg-indigo-500/);
  await expect(page.getByTestId('brewer-salt-row-kh-nahco3')).toHaveClass(/bg-amber-500/);
  await expect(page.getByTestId('brewer-salt-row-additional-nacl')).toBeVisible();
  await expect(page.getByText('Craft with mineral water as a base.', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('ion-watch-disclosure')).toHaveCount(0);
  await expect(page.getByText('Brightness / acidity', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Fruit character', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Taste profile position')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Final batch volume in liters' })).toBeVisible();
  await expect(page.getByText('Salt Recipe Summary (as CaCO₃)')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm' }))
    .toHaveAttribute('placeholder', 'X ppm');
  await expect(page.getByRole('textbox', { name: 'Magnesium Sulfate direct dose in milligrams' }))
    .toHaveAttribute('placeholder', 'Y mg');
  await page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm' }).fill('1');
  await expect(page.getByRole('button', { name: 'Make Concentrate' })).toBeVisible();
  await expect(page.getByRole('button', { name: /recipe steps|get recipe card|see how to make/i })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('brewer-salt-group-gh')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(2);
});

test('shares recipe edits while keeping Alchemist waters out of Brewer results and exports', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-alchemist').click();
  await page.getByText('Craft with mineral water as a base.', { exact: true }).click();
  await page.getByRole('button', { name: 'Add water source' }).click();

  const waterEntry = page.getByTestId('mineral-water-entry').first();
  await waterEntry.getByTestId('mineral-water-name').fill('Salt-only test source');
  await waterEntry.getByTestId('mineral-water-volume').fill('500');
  await waterEntry.getByTestId('mineral-water-ion-sodium').fill('300');

  await page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm' }).fill('10');
  await page.getByRole('textbox', { name: 'Final batch volume in liters' }).fill('2');
  await page.getByTestId('mode-brewer').click();

  await expect(page.getByTestId('mineral-water-entry')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm' })).toHaveValue('10');
  await expect(page.getByRole('textbox', { name: 'Final batch volume in liters' })).toHaveValue('2');
  await page.getByRole('button', { name: /recipe steps|get recipe card|see how to make/i }).click();
  const steps = page.getByRole('dialog');
  await expect(steps).toBeVisible();
  await expect(steps.getByText('Salt-only test source', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('button[title="Download the current profile"]').click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = new Uint8Array(await readFile(path!));
  const embeddedJson = extractWaterRecipeJsonFromPng(bytes);
  const exportedRecipe = JSON.parse(embeddedJson ?? new TextDecoder().decode(bytes)) as {
    sourceWaters?: unknown;
    finishedWaterIons?: Record<string, number>;
  };
  expect(exportedRecipe.sourceWaters).toBeUndefined();
  expect(exportedRecipe.finishedWaterIons?.sodium ?? 0).toBe(0);
  expect(exportedRecipe.finishedWaterIons?.magnesium ?? 0).toBeGreaterThan(0);

  await page.getByTestId('mode-alchemist').click();
  await expect(page.getByTestId('mineral-water-entry')).toHaveCount(1);
  await expect(page.getByTestId('mineral-water-name')).toHaveValue('Salt-only test source');
  await expect(page.getByTestId('mineral-water-volume')).toHaveValue('500');
  await expect(page.getByTestId('mineral-water-ion-sodium')).toHaveValue('300');
  await expect(page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm' })).toHaveValue('10');
  await expect(page.getByRole('textbox', { name: 'Final batch volume in liters' })).toHaveValue('2');
  await expect(page.getByTestId('ion-watch-disclosure')).toBeVisible();
});

test('keeps Watermancer target and source-water controls available', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-watermancer').click();
  await expect(page.locator('[data-watermancer-stage="target"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add water source' })).toBeVisible();
});

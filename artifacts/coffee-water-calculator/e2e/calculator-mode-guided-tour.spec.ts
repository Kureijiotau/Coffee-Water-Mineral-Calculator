import { expect, test, type Page } from '@playwright/test';

type RecipeMode = 'Brewer' | 'Alchemist';
const tourDialog = (page: Page, mode: RecipeMode) => page.getByRole('dialog', { name: `${mode} tour` });

async function openFreshCalculator(page: Page, width = 1280, height = 900) {
  await page.setViewportSize({ width, height });
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
}

test('opens each recipe-mode tour once independently and allows replay', async ({ page }) => {
  await openFreshCalculator(page);

  await expect(tourDialog(page, 'Alchemist')).toBeVisible();
  await expect(page.getByTestId('calculator-guided-tour-progress')).toHaveText('1 of 6');
  await expect(page.getByTestId('calculator-guided-tour-spotlight')).toHaveAttribute(
    'data-target-testid',
    'alchemist-batch-volume',
  );
  await page.getByRole('button', { name: 'Skip', exact: true }).click();

  await page.getByTestId('mode-brewer').click();
  await expect(tourDialog(page, 'Brewer')).toBeVisible();
  await expect(page.getByTestId('calculator-guided-tour-progress')).toHaveText('1 of 4');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();

  await page.getByTestId('mode-alchemist').click();
  await expect(tourDialog(page, 'Alchemist')).toBeHidden();
  await page.getByTestId('calculator-guided-tour-trigger').click();
  await expect(tourDialog(page, 'Alchemist')).toBeVisible();
});

test('keeps the guided-tour spotlight outline compact', async ({ page }) => {
  await openFreshCalculator(page);

  const spotlight = page.getByTestId('calculator-guided-tour-spotlight');
  await expect(spotlight).toBeVisible();
  await expect.poll(() => spotlight.evaluate(element => getComputedStyle(element).borderTopWidth))
    .toBe('1px');
  await expect.poll(() => spotlight.evaluate(element => getComputedStyle(element).boxShadow))
    .toContain('2px');
});

test('starts the Watermancer tour once and offers replay', async ({ page }) => {
  await openFreshCalculator(page);
  await expect(tourDialog(page, 'Alchemist')).toBeVisible();
  await page.getByRole('button', { name: 'Skip', exact: true }).click();

  await page.getByTestId('mode-watermancer').click();
  await expect(tourDialog(page, 'Watermancer')).toBeVisible();
  await expect(page.getByTestId('calculator-guided-tour-progress')).toHaveText('1 of 7');
  await expect(page.getByTestId('calculator-guided-tour-spotlight')).toHaveAttribute(
    'data-target-testid',
    'watermancer-ion-targets',
  );
  await page.getByRole('button', { name: 'Skip', exact: true }).click();

  await expect(page.getByTestId('calculator-guided-tour-trigger')).toHaveAccessibleName(
    'Open Watermancer tour',
  );
  await page.getByTestId('calculator-guided-tour-trigger').click();
  await expect(tourDialog(page, 'Watermancer')).toBeVisible();
});

test('follows the Watermancer tour from targets through the final mixture', async ({ page }) => {
  await openFreshCalculator(page);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByTestId('mode-watermancer').click();

  const spotlight = page.getByTestId('calculator-guided-tour-spotlight');
  const targets = [
    'watermancer-ion-targets',
    'watermancer-batch-volume',
    'watermancer-water-sources',
    'watermancer-salts',
    'watermancer-auto-match',
    'watermancer-final-mixture',
    'watermancer-recipe-steps',
  ];
  for (const [index, target] of targets.entries()) {
    await expect(spotlight).toHaveAttribute('data-target-testid', target);
    if (index < targets.length - 1) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
  }
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
});

test('follows the approved visible step order in both calculator modes', async ({ page }) => {
  await openFreshCalculator(page);

  const spotlight = page.getByTestId('calculator-guided-tour-spotlight');
  const alchemistTargets = [
    'alchemist-batch-volume',
    'alchemist-mineral-water-base',
    'alchemist-mineral-recipe',
    'alchemist-ion-watch',
    'alchemist-salt-summary',
    'alchemist-recipe-steps',
  ];
  for (const [index, target] of alchemistTargets.entries()) {
    await expect(spotlight).toHaveAttribute('data-target-testid', target);
    if (index < alchemistTargets.length - 1) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
  }
  await page.getByRole('button', { name: 'Finish', exact: true }).click();

  await page.getByTestId('mode-brewer').click();
  await expect(tourDialog(page, 'Brewer')).toBeVisible();
  const brewerTargets = [
    'brewer-batch-volume',
    'brewer-mineral-recipe',
    'brewer-salt-summary',
    'brewer-recipe-steps',
  ];
  for (const [index, target] of brewerTargets.entries()) {
    await expect(spotlight).toHaveAttribute('data-target-testid', target);
    if (index < brewerTargets.length - 1) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
  }
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
});

test('keeps the Alchemist tour dialog and highlighted sections on a phone screen', async ({ page }) => {
  await openFreshCalculator(page, 375, 812);

  await expect(tourDialog(page, 'Alchemist')).toBeVisible();
  const dialog = await tourDialog(page, 'Alchemist').boundingBox();
  const target = await page.getByTestId('alchemist-batch-volume').boundingBox();
  expect(dialog).not.toBeNull();
  expect(target).not.toBeNull();
  expect(dialog!.x).toBeGreaterThanOrEqual(0);
  expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(375);
  expect(target!.x).toBeGreaterThanOrEqual(0);
  expect(target!.x + target!.width).toBeLessThanOrEqual(375);
});

test('keeps the Watermancer tour target visible on a phone screen', async ({ page }) => {
  await openFreshCalculator(page, 375, 812);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByTestId('mode-watermancer').click();

  await expect(tourDialog(page, 'Watermancer')).toBeVisible();
  const dialog = await tourDialog(page, 'Watermancer').boundingBox();
  const target = await page.getByTestId('watermancer-ion-targets').boundingBox();
  expect(dialog).not.toBeNull();
  expect(target).not.toBeNull();
  expect(dialog!.x).toBeGreaterThanOrEqual(0);
  expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(375);
  expect(target!.x).toBeGreaterThanOrEqual(0);
  expect(target!.x + target!.width).toBeLessThanOrEqual(375);
});

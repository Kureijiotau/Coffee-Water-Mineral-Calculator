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
  await expect(page.getByTestId('calculator-guided-tour-visual'))
    .toHaveAttribute('data-illustration-key', 'alchemist-batch-volume');
  await page.getByRole('button', { name: 'Skip', exact: true }).click();

  await page.getByTestId('mode-brewer').click();
  await expect(tourDialog(page, 'Brewer')).toBeVisible();
  await expect(page.getByTestId('calculator-guided-tour-progress')).toHaveText('1 of 4');
  await expect(page.getByTestId('calculator-guided-tour-visual'))
    .toHaveAttribute('data-illustration-key', 'brewer-batch-volume');
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
  const illustrations = [
    'ion-targets',
    'batch-volume',
    'source-waters',
    'salts',
    'auto-match',
    'final-mixture',
    'recipe-steps',
  ];
  const visual = page.getByTestId('calculator-guided-tour-visual');
  for (const [index, target] of targets.entries()) {
    await expect(spotlight).toHaveAttribute('data-target-testid', target);
    await expect(visual).toHaveAttribute('data-illustration-key', illustrations[index]);
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
    ['alchemist-batch-volume', 'alchemist-batch-volume'],
    ['alchemist-mineral-water-base', 'alchemist-mineral-water-base'],
    ['alchemist-mineral-recipe', 'alchemist-mineral-recipe'],
    ['alchemist-ion-watch', 'alchemist-ion-watch'],
    ['alchemist-salt-summary', 'alchemist-salt-summary'],
    ['alchemist-recipe-steps', 'alchemist-recipe-steps'],
  ];
  for (const [index, [target, illustration]] of alchemistTargets.entries()) {
    await expect(spotlight).toHaveAttribute('data-target-testid', target);
    await expect(page.getByTestId('calculator-guided-tour-visual'))
      .toHaveAttribute('data-illustration-key', illustration);
    if (index < alchemistTargets.length - 1) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
  }
  await page.getByRole('button', { name: 'Finish', exact: true }).click();

  await page.getByTestId('mode-brewer').click();
  await expect(tourDialog(page, 'Brewer')).toBeVisible();
  const brewerTargets = [
    ['brewer-batch-volume', 'brewer-batch-volume'],
    ['brewer-mineral-recipe', 'brewer-mineral-recipe'],
    ['brewer-salt-summary', 'brewer-salt-summary'],
    ['brewer-recipe-steps', 'brewer-recipe-steps'],
  ];
  for (const [index, [target, illustration]] of brewerTargets.entries()) {
    await expect(spotlight).toHaveAttribute('data-target-testid', target);
    await expect(page.getByTestId('calculator-guided-tour-visual'))
      .toHaveAttribute('data-illustration-key', illustration);
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

test('keeps illustrated Brewer and Alchemist tour cards within a phone viewport', async ({ page }) => {
  await openFreshCalculator(page, 375, 812);

  const dialog = tourDialog(page, 'Alchemist');
  const visual = page.getByTestId('calculator-guided-tour-visual');
  const checkBounds = async () => {
    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(375);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(812);
    await expect(visual).toBeVisible();
  };

  for (let step = 0; step < 6; step += 1) {
    await checkBounds();
    if (step < 5) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Finish', exact: true }).click();

  await page.getByTestId('mode-brewer').click();
  const brewerDialog = tourDialog(page, 'Brewer');
  for (let step = 0; step < 4; step += 1) {
    const dialogBox = await brewerDialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(375);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(812);
    await expect(visual).toBeVisible();
    if (step < 3) await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
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

test('keeps the illustrated spotlight and guide card in view on a phone', async ({ page }) => {
  await openFreshCalculator(page, 375, 812);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByTestId('mode-watermancer').click();

  const dialog = tourDialog(page, 'Watermancer');
  const spotlight = page.getByTestId('calculator-guided-tour-spotlight');
  for (const target of [
    'watermancer-ion-targets',
    'watermancer-batch-volume',
    'watermancer-water-sources',
    'watermancer-salts',
    'watermancer-auto-match',
    'watermancer-final-mixture',
    'watermancer-recipe-steps',
  ]) {
    await expect(spotlight).toHaveAttribute('data-target-testid', target);
    const dialogBox = await dialog.boundingBox();
    const spotlightBox = await spotlight.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(spotlightBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(375);
    expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(812);
    const overlaps = dialogBox!.x < spotlightBox!.x + spotlightBox!.width
      && dialogBox!.x + dialogBox!.width > spotlightBox!.x
      && dialogBox!.y < spotlightBox!.y + spotlightBox!.height
      && dialogBox!.y + dialogBox!.height > spotlightBox!.y;
    expect(overlaps).toBe(false);
    if (target !== 'watermancer-recipe-steps') {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
  }
});

test('navigates the Watermancer tour by keyboard and restores focus on Escape', async ({ page }) => {
  await openFreshCalculator(page);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByTestId('mode-watermancer').click();

  await expect(page.getByTestId('calculator-guided-tour-visual'))
    .toHaveAttribute('data-illustration-key', 'ion-targets');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('calculator-guided-tour-progress')).toHaveText('2 of 7');
  await expect(page.getByTestId('calculator-guided-tour-visual'))
    .toHaveAttribute('data-illustration-key', 'batch-volume');

  await page.keyboard.press('Escape');
  await expect(tourDialog(page, 'Watermancer')).toBeHidden();
  await expect(page.getByTestId('calculator-guided-tour-trigger')).toBeFocused();
});

test('closes a Watermancer tour with a missing target without marking it seen', async ({ page }) => {
  await openFreshCalculator(page);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByTestId('mode-watermancer').click();
  await page.getByTestId('watermancer-ion-targets').evaluate(element => element.remove());

  await expect(tourDialog(page, 'Watermancer')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('watermancer.watermancer-tour.v1'))).toBeNull();

  await page.reload();
  await page.getByTestId('mode-watermancer').click();
  await expect(tourDialog(page, 'Watermancer')).toBeVisible();
  await expect(page.getByTestId('calculator-guided-tour-progress')).toHaveText('1 of 7');
});

test('keeps Watermancer diagrams static with reduced motion enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFreshCalculator(page);
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByTestId('mode-watermancer').click();

  const visual = page.getByTestId('calculator-guided-tour-visual');
  await expect(visual).toHaveAttribute('data-illustration-key', 'ion-targets');
  await expect.poll(() => visual.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
});

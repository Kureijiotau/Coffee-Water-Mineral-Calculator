import { expect, test, type Page } from '@playwright/test';

const tourDialog = (page: Page) => page.getByRole('dialog', { name: 'Concentrates tour' });

async function openFreshConcentratesTour(page: Page, width = 1280, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await expect(tourDialog(page)).toBeVisible();
}

async function expectSpotlightPlacement(page: Page) {
  const placement = await page.evaluate(() => {
    const spotlight = document.querySelector<HTMLElement>('[data-testid="concentrate-guided-tour-spotlight"]');
    const targetId = spotlight?.dataset.targetTestid;
    const target = targetId
      ? document.querySelector<HTMLElement>(`[data-testid="${targetId}"]`)
      : null;
    const dialog = document.querySelector<HTMLElement>('[data-testid="concentrate-guided-tour-dialog"]');
    if (!target || !dialog) return null;
    const targetRect = target.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const pixelTolerance = 1;
    return {
      targetVisible: targetRect.top >= -pixelTolerance
        && targetRect.left >= -pixelTolerance
        && targetRect.bottom <= window.innerHeight + pixelTolerance
        && targetRect.right <= window.innerWidth + pixelTolerance,
      dialogVisible: dialogRect.top >= 0
        && dialogRect.left >= 0
        && dialogRect.bottom <= window.innerHeight
        && dialogRect.right <= window.innerWidth,
      targetRect: { top: targetRect.top, bottom: targetRect.bottom, left: targetRect.left, right: targetRect.right },
      dialogRect: { top: dialogRect.top, bottom: dialogRect.bottom, left: dialogRect.left, right: dialogRect.right },
      overlaps: targetRect.left < dialogRect.right
        && targetRect.right > dialogRect.left
        && targetRect.top < dialogRect.bottom
        && targetRect.bottom > dialogRect.top,
      targetId,
    };
  });
  expect(placement).not.toBeNull();
  expect(
    placement!.targetVisible,
    `${placement!.targetId} should remain in the viewport; target=${JSON.stringify(placement!.targetRect)}`,
  ).toBe(true);
  expect(placement!.dialogVisible, 'the explanation should remain in the viewport').toBe(true);
  expect(
    placement!.overlaps,
    `the explanation should not cover ${placement!.targetId}; target=${JSON.stringify(placement!.targetRect)}, dialog=${JSON.stringify(placement!.dialogRect)}`,
  ).toBe(false);
}

test('opens automatically on the first visit and supports Back, Next, and Skip', async ({ page }) => {
  await openFreshConcentratesTour(page);

  await expect(page.getByTestId('concentrate-guided-tour-progress')).toHaveText('1 of 5');
  await expect(page.getByTestId('mass-stock-composition')).toBeVisible();
  await expectSpotlightPlacement(page);

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByTestId('concentrate-guided-tour-progress')).toHaveText('2 of 5');
  await expect(tourDialog(page)).toBeFocused();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByTestId('concentrate-guided-tour-progress')).toHaveText('1 of 5');

  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(tourDialog(page)).toBeHidden();
  await expect(page.getByTestId('concentrate-workspace-heading')).toBeFocused();
});

test('remembers Skip, offers replay, and Escape restores focus to the Tour button', async ({ page }) => {
  await openFreshConcentratesTour(page);

  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('tab', { name: 'Calculator', exact: true }).click();
  await page.getByTestId('tab-concentrates').click();
  await expect(tourDialog(page)).toBeHidden();

  const replay = page.getByTestId('concentrate-tour-trigger');
  await replay.click();
  await expect(tourDialog(page)).toBeVisible();
  await expect(tourDialog(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(tourDialog(page)).toBeHidden();
  await expect(replay).toBeFocused();
});

test('remembers Finish after completing the tour', async ({ page }) => {
  await openFreshConcentratesTour(page);

  for (let step = 1; step < 5; step += 1) {
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.getByTestId('concentrate-guided-tour-progress')).toHaveText('5 of 5');
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await page.getByRole('tab', { name: 'Calculator', exact: true }).click();
  await page.getByTestId('tab-concentrates').click();
  await expect(tourDialog(page)).toBeHidden();
});

test('uses only Lotus Drops targets and keeps each step visible on a small screen', async ({ page }) => {
  await openFreshConcentratesTour(page, 375, 667);

  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByRole('tab', { name: 'DIY Lotus Drops', exact: true }).click();
  await page.getByTestId('concentrate-tour-trigger').click();

  const expectedTargets = [
    'lotus-dropper-field',
    'mass-shared-calibration-fields',
    'lotus-brew-volume-section',
    'lotus-per-drop-summary',
    'lotus-finished-stock-mass',
  ];
  for (let index = 0; index < expectedTargets.length; index += 1) {
    const spotlight = page.getByTestId('concentrate-guided-tour-spotlight');
    await expect(spotlight).toHaveAttribute('data-target-testid', expectedTargets[index]);
    await expectSpotlightPlacement(page);
    if (index < expectedTargets.length - 1) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
  }
  await expect(page.getByTestId('mass-stock-composition')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('uses the recipe branch and leaves recipe and calibration values unchanged', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('mode-alchemist').click();
  await page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm', exact: true }).fill('30');
  await page.getByRole('button', { name: 'Make Concentrate', exact: true }).click();
  await expect(tourDialog(page)).toBeVisible();
  await expect(page.getByTestId('concentrate-workspace-recipe')).toHaveAttribute('aria-selected', 'true');

  const readValues = () => page.evaluate(() => Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      '[data-testid="mass-stock-card"] input, [data-testid="mass-stock-card"] select',
    ),
  ).map(element => [element.getAttribute('aria-label') ?? element.textContent ?? '', element.value]));
  const before = await readValues();
  const expectedTargets = [
    'concentrate-recipe-overview',
    'mass-recipe-stock-arrangement',
    'mass-recipe-stock-weight',
    'recipe-dose-result',
    'mass-recipe-preparation-card',
  ];
  for (let index = 0; index < expectedTargets.length; index += 1) {
    await expect(page.getByTestId('concentrate-guided-tour-spotlight'))
      .toHaveAttribute('data-target-testid', expectedTargets[index]);
    if (expectedTargets[index] === 'mass-recipe-stock-arrangement') {
      await expect(tourDialog(page)).toContainText('Separate salts');
      await expect(tourDialog(page)).toContainText('GH + KH');
      await expect(tourDialog(page)).toContainText('All-in-one');
    }
    if (index < expectedTargets.length - 1) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
  }
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  expect(await readValues()).toEqual(before);
});

test('offers a Calculator route when Recipe Concentrate has no recipe loaded', async ({ page }) => {
  await openFreshConcentratesTour(page);

  await page.getByRole('button', { name: 'Skip', exact: true }).click();
  await page.getByTestId('concentrate-workspace-recipe').click();
  await expect(page.getByRole('heading', { name: 'No recipe concentrate loaded' })).toBeVisible();
  await page.getByTestId('concentrate-tour-trigger').click();

  await expect(tourDialog(page)).toContainText('Start with a recipe');
  await expect(page.getByTestId('concentrate-guided-tour-spotlight'))
    .toHaveAttribute('data-target-testid', 'concentrate-empty-state');
  await page.getByRole('button', { name: 'Open Calculator', exact: true }).click();
  await expect(tourDialog(page)).toBeHidden();
  await expect(page.getByRole('tab', { name: 'Calculator', exact: true })).toHaveAttribute('aria-selected', 'true');
});

test('closes safely when the next step target is no longer available', async ({ page }) => {
  await openFreshConcentratesTour(page);

  await page.evaluate(() => document.querySelector('[data-testid="mass-shared-calibration-fields"]')?.remove());
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(tourDialog(page)).toBeHidden();
});

test('uses a reduced-motion presentation when the browser requests it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFreshConcentratesTour(page);

  const duration = await page.getByTestId('concentrate-guided-tour-spotlight')
    .evaluate(element => getComputedStyle(element).transitionDuration);
  expect(duration.split(',').every(value => Number.parseFloat(value) === 0)).toBe(true);
});

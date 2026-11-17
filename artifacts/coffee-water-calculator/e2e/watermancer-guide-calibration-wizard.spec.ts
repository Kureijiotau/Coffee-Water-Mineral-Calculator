import { expect, test, type Page } from '@playwright/test';

async function openCalibrationWizard(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('watermancer.concentrates-tour.v1', 'seen');
    localStorage.setItem('watermancer.brewer-tour.v1', 'seen');
    localStorage.setItem('watermancer.alchemist-tour.v1', 'seen');
  });
  await page.goto('/');
  await page.getByTestId('tab-watermancer-guide').click();
  await page.getByTestId('button-step-calibrate').click();
  await page.getByTestId('button-guided-calibration').click();
  const dialog = page.getByTestId('guided-calibration-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function enterFirstRun(page: Page, drops = '50', weight = '2') {
  await page.getByTestId('guided-calibration-run-1-drops').fill(drops);
  await page.getByTestId('guided-calibration-run-1-weight').fill(weight);
  await page.getByTestId('guided-calibration-next').click();
}

async function reachResultWithTwoRuns(page: Page, secondRun: { drops: string; weight: string }) {
  await enterFirstRun(page);
  await page.getByTestId('guided-calibration-run-2-drops').fill(secondRun.drops);
  await page.getByTestId('guided-calibration-run-2-weight').fill(secondRun.weight);
  await page.getByTestId('guided-calibration-next').click();
}

test('saves three runs to the selected tip card and preselects the saved style', async ({ page }) => {
  await openCalibrationWizard(page);
  const straightTip = page.getByTestId('guided-calibration-tip-straight');
  await expect(straightTip).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-next').click();
  await enterFirstRun(page);
  await page.getByTestId('guided-calibration-run-2-drops').fill('100');
  await page.getByTestId('guided-calibration-run-2-weight').fill('4');
  await page.getByTestId('guided-calibration-run-3-drops').fill('100');
  await page.getByTestId('guided-calibration-run-3-weight').fill('4');
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-save').click();

  await expect(page.getByTestId('guided-calibration-dialog')).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'Straight measured drops' })).toHaveValue('250');
  await expect(page.getByRole('spinbutton', { name: 'Straight water weight in grams' })).toHaveValue('10');

  await page.getByTestId('button-guided-calibration').click();
  await expect(page.getByTestId('guided-calibration-tip-straight')).toHaveAttribute('aria-pressed', 'true');
});

test('saves only the required first run when later runs are skipped', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('watermancer.concentrates-tour.v1', 'seen');
    localStorage.setItem('watermancer.brewer-tour.v1', 'seen');
    localStorage.setItem('watermancer.alchemist-tour.v1', 'seen');
  });
  await page.goto('/');
  await page.getByTestId('tab-watermancer-guide').click();
  await page.getByTestId('button-step-calibrate').click();
  await page.getByRole('spinbutton', { name: 'Straight measured drops' }).fill('40');
  await page.getByRole('spinbutton', { name: 'Straight water weight in grams' }).fill('2');
  await page.getByTestId('button-use-guide-calibration-straight').click();
  await expect(page.getByTestId('guide-tip-calibration-straight')).toContainText('Applied to DIY tools');

  await openCalibrationWizard(page);

  await expect(page.getByTestId('guided-calibration-tip-straight')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('guided-calibration-tip-round').click();
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-next').click();
  await enterFirstRun(page);
  await expect(page.getByTestId('guided-calibration-run-2-drops')).toHaveValue('');
  await expect(page.getByTestId('guided-calibration-run-3-drops')).toHaveValue('');
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-save').click();

  await expect(page.getByRole('spinbutton', { name: 'Round measured drops' })).toHaveValue('50');
  await expect(page.getByRole('spinbutton', { name: 'Round water weight in grams' })).toHaveValue('2');
  await expect(page.getByRole('spinbutton', { name: 'Straight measured drops' })).toHaveValue('40');
  await expect(page.getByRole('spinbutton', { name: 'Straight water weight in grams' })).toHaveValue('2');
});

test('shows a repeat-measurement warning when spread exceeds five percent', async ({ page }) => {
  await openCalibrationWizard(page);
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-next').click();
  await reachResultWithTwoRuns(page, { drops: '55', weight: '2' });

  await expect(page.getByTestId('guided-calibration-warning')).toContainText('5%');
  await expect(page.getByTestId('guided-calibration-warning')).toContainText('vertical');
});

test('shows the required photo alternatives and tip posture caption on each relevant page', async ({ page }) => {
  const dialog = await openCalibrationWizard(page);
  const tipPhotos = dialog.getByRole('img');
  await expect(tipPhotos).toHaveCount(2);
  await expect(tipPhotos.nth(0)).toHaveAttribute('alt', 'Close-up of a straight dropper tip.');
  await expect(tipPhotos.nth(1)).toHaveAttribute('alt', 'Close-up of a round dropper tip.');
  await expect(tipPhotos.nth(0)).toHaveAttribute('loading', 'eager');
  await expect(tipPhotos.nth(1)).toHaveAttribute('loading', 'eager');
  await expect(dialog.getByText('Tip shape only. Hold the dropper vertical when dispensing.', { exact: true })).toHaveCount(2);

  await page.getByTestId('guided-calibration-next').click();
  const scaleImage = dialog.getByRole('img', { name: 'Milligram scale with a weighing pan.' });
  await expect(scaleImage).toBeVisible();
  await expect(scaleImage).toHaveAttribute('loading', 'lazy');

  await page.getByTestId('guided-calibration-next').click();
  const runOneTip = dialog.getByRole('img', { name: 'Close-up of a straight dropper tip.' });
  await expect(runOneTip).toBeVisible();
  await expect(runOneTip).toHaveAttribute('loading', 'lazy');
  await expect(dialog.getByText('Tip shape only. Hold the dropper vertical when dispensing.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('guided-calibration-next')).toBeDisabled();
  await page.getByTestId('guided-calibration-run-1-drops').fill('50');
  await page.getByTestId('guided-calibration-run-1-weight').fill('2');
  await expect(page.getByTestId('guided-calibration-next')).toBeEnabled();
  await page.getByTestId('guided-calibration-next').click();

  await expect(dialog.getByRole('img', { name: 'Close-up of a straight dropper tip.' })).toBeVisible();
  await expect(dialog.getByRole('img', { name: 'Close-up of a straight dropper tip.' })).toHaveAttribute('loading', 'lazy');
  await expect(dialog.getByText('Tip shape only. Hold the dropper vertical when dispensing.', { exact: true })).toBeVisible();
  await page.getByTestId('guided-calibration-next').click();
  const lineupImage = dialog.getByRole('img', { name: 'Labelled dropper bottles, one salt per bottle.' });
  await expect(lineupImage).toBeVisible();
  await expect(lineupImage).toHaveAttribute('loading', 'lazy');
});

test('Start over returns to tip selection and resets the measurement runs', async ({ page }) => {
  await openCalibrationWizard(page);
  await page.getByTestId('guided-calibration-tip-round').click();
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-run-1-drops').fill('75');
  await page.getByTestId('guided-calibration-run-1-weight').fill('3');
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-start-over').click();

  await expect(page.getByTestId('guided-calibration-page-1')).toBeVisible();
  await expect(page.getByTestId('guided-calibration-tip-straight')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-next').click();
  await expect(page.getByTestId('guided-calibration-run-1-drops')).toHaveValue('50');
  await expect(page.getByTestId('guided-calibration-run-1-weight')).toHaveValue('');
});

test('keeps the primary action visible on every page at 375 by 812', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const dialog = await openCalibrationWizard(page);
  const assertPrimaryVisible = async (testId: string) => {
    const action = page.getByTestId(testId);
    await expect(action).toBeVisible();
    const bounds = await action.boundingBox();
    if (!bounds) throw new Error(`${testId} should have a visible bounding box`);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(812);
  };

  await assertPrimaryVisible('guided-calibration-next');
  await page.getByTestId('guided-calibration-next').click();
  await assertPrimaryVisible('guided-calibration-next');
  await page.getByTestId('guided-calibration-next').click();
  await page.getByTestId('guided-calibration-run-1-drops').fill('50');
  await page.getByTestId('guided-calibration-run-1-weight').fill('2');
  await assertPrimaryVisible('guided-calibration-next');
  await page.getByTestId('guided-calibration-next').click();
  await assertPrimaryVisible('guided-calibration-next');
  await page.getByTestId('guided-calibration-next').click();
  await assertPrimaryVisible('guided-calibration-save');
  await expect(dialog).toBeVisible();
});

test('keeps the desktop dialog body from scrolling and the primary action in one position', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const dialog = await openCalibrationWizard(page);
  const positions: Array<{ x: number; y: number }> = [];

  for (let pageIndex = 1; pageIndex <= 5; pageIndex += 1) {
    const body = dialog.getByTestId('guided-calibration-scroll-body');
    const dimensions = await body.evaluate(element => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight);

    const action = page.getByTestId(pageIndex === 5 ? 'guided-calibration-save' : 'guided-calibration-next');
    const bounds = await action.boundingBox();
    if (!bounds) throw new Error(`Page ${pageIndex} primary action should be visible`);
    positions.push({ x: bounds.x, y: bounds.y });

    if (pageIndex === 3) {
      await page.getByTestId('guided-calibration-run-1-drops').fill('50');
      await page.getByTestId('guided-calibration-run-1-weight').fill('2');
    }
    if (pageIndex < 5) await page.getByTestId('guided-calibration-next').click();
  }

  expect(positions.every(position => position.x === positions[0].x && position.y === positions[0].y)).toBe(true);
});

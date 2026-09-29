import { expect, test, type Locator, type Page } from '@playwright/test';

const COMPACT_FOLLOW_KEY = 'coffee-water-watermancer-compact-follow';

async function openWatermancer(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();
  const readings = page.getByRole('region', { name: 'Current ion readings' });
  await expect(readings).toBeVisible();
  return readings;
}

async function enableSaltAndSetDose(page: Page, saltName: string, doseMg: number) {
  const row = page.locator('.watermancer-salt-table__row').filter({ hasText: saltName });
  const dose = row.getByLabel(`${saltName} dose in milligrams`, { exact: true });
  const notUsedButton = row.getByRole('button', { name: 'Not used', exact: true });

  if (await notUsedButton.count()) {
    await notUsedButton.click();
  }

  await dose.fill(String(doseMg));
  return dose;
}

async function readPosition(element: Locator) {
  return element.evaluate(node => getComputedStyle(node).position);
}

async function readTop(element: Locator) {
  return element.evaluate(node => node.getBoundingClientRect().top);
}

async function expectClearOfPinnedDock(control: Locator, readings: Locator) {
  await control.scrollIntoViewIfNeeded();
  const controlBox = await control.boundingBox();
  const dockBox = await readings.boundingBox();
  expect(controlBox).not.toBeNull();
  expect(dockBox).not.toBeNull();
  expect(controlBox!.y + controlBox!.height).toBeLessThanOrEqual(dockBox!.y);
}

async function useWatermancerShortcut(
  page: Page,
  stepNumber: string,
  label: string,
  stage: Locator,
  anchor: Locator,
  readings: Locator,
) {
  await page.getByRole('button', {
    name: `Go to Watermancer step ${stepNumber}: ${label}`,
  }).click();
  await expect(stage).toBeFocused();
  await page.evaluate(() => new Promise<void>(resolve => {
    let timer = window.setTimeout(finish, 160);
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(finish, 160);
    };
    function finish() {
      window.removeEventListener('scroll', onScroll);
      resolve();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }));
  await expect.poll(async () => {
    const anchorBox = await anchor.boundingBox();
    const dockBox = await readings.boundingBox();
    return Boolean(
      anchorBox
      && dockBox
      && anchorBox.y >= 0
      && anchorBox.y + anchorBox.height <= dockBox.y - 12,
    );
  }).toBe(true);
}

async function isFullyVisibleWithinRail(item: Locator, rail: Locator) {
  return item.evaluate(element => {
    const railElement = element.closest('[aria-label="Live ions and current mixture ratios"]');
    if (!railElement) return false;
    const itemRect = element.getBoundingClientRect();
    const railRect = railElement.getBoundingClientRect();
    return itemRect.left >= railRect.left && itemRect.right <= railRect.right;
  });
}

async function expectPinnedAndCompact(page: Page, readings: Locator) {
  await expect.poll(() => readPosition(readings)).toBe('fixed');
  const box = await readings.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThan(110);

  const topBeforeScroll = await readTop(readings);
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => readTop(readings)).toBeCloseTo(topBeforeScroll, 0);
}

async function createLiveSaltReadings(page: Page) {
  await enableSaltAndSetDose(page, 'Calcium Chloride', 100);
  const magnesiumDose = await enableSaltAndSetDose(page, 'Magnesium Sulfate', 100);

  const magnesiumReading = page.locator('[data-watermancer-ion="magnesium"]');
  const magnesiumCalciumRatio = page.locator('[data-watermancer-ratio="mg-ca"]');
  await expect(magnesiumReading).toContainText(/\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?/);
  await expect(magnesiumReading).toHaveAttribute('aria-label', /Magnesium: .* target .* milligrams per liter/);
  await expect(magnesiumCalciumRatio).toBeVisible();
  await expect(magnesiumCalciumRatio).toContainText(/:1/);

  return { magnesiumDose, magnesiumReading, magnesiumCalciumRatio };
}

test('keeps compact readings pinned and preserves separate Classic Follow behavior', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const readings = await openWatermancer(page);

  await expectPinnedAndCompact(page, readings);
  const { magnesiumDose, magnesiumReading, magnesiumCalciumRatio } = await createLiveSaltReadings(page);

  const magnesiumBefore = await magnesiumReading.innerText();
  const ratioBefore = await magnesiumCalciumRatio.innerText();
  await magnesiumDose.fill('200');
  await expect.poll(() => magnesiumReading.innerText()).not.toBe(magnesiumBefore);
  await expect.poll(() => magnesiumCalciumRatio.innerText()).not.toBe(ratioBefore);
  await expect(magnesiumReading).toHaveAttribute('aria-label', /Updated\. Magnesium:/);

  await readings.getByRole('button', { name: 'Unpin compact ion readings from the screen' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem(COMPACT_FOLLOW_KEY))).toBe('false');
  await page.reload();
  const watermancerButton = page.getByRole('button', { name: 'Watermancer', exact: true });
  await watermancerButton.click();
  const unpinnedReadings = page.getByRole('region', { name: 'Current ion readings' });
  await expect(unpinnedReadings.getByRole('button', { name: 'Keep compact ion readings visible while scrolling' })).toBeVisible();
  await expect.poll(() => readPosition(unpinnedReadings)).toBe('relative');

  await unpinnedReadings.getByRole('button', { name: 'Keep compact ion readings visible while scrolling' }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem(COMPACT_FOLLOW_KEY))).toBe('true');
  await page.reload();
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();
  const repinnedReadings = page.getByRole('region', { name: 'Current ion readings' });
  await expectPinnedAndCompact(page, repinnedReadings);

  const display = page.getByRole('group', { name: 'Ion readings display' });
  await display.getByRole('button', { name: 'Classic', exact: true }).click();
  const classicFollow = page.getByRole('button', { name: 'Keep the ion readings card visible while scrolling' });
  await expect(classicFollow).toBeVisible();
  await classicFollow.click();
  const classicCard = page.getByRole('heading', { name: 'Current ion readings' })
    .locator('xpath=ancestor::div[contains(@class, "app-card")][1]');
  await expect.poll(() => readPosition(classicCard)).toBe('fixed');
  await expect(classicCard).toBeVisible();

  await page.getByRole('button', { name: 'Stop following the ion readings card while scrolling' }).click();
  await expect.poll(() => readPosition(classicCard)).toBe('relative');
  await display.getByRole('button', { name: 'Compact', exact: true }).click();
  await expect.poll(() => readPosition(page.getByRole('region', { name: 'Current ion readings' }))).toBe('fixed');
});

test('shows mobile live changes and scrolls changed ions into the visible rail', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const readings = await openWatermancer(page);

  await expectPinnedAndCompact(page, readings);
  const { magnesiumDose, magnesiumReading, magnesiumCalciumRatio } = await createLiveSaltReadings(page);
  const rail = readings.locator('[aria-label="Live ions and current mixture ratios"]');
  const ratioBefore = await magnesiumCalciumRatio.innerText();
  const magnesiumBefore = await magnesiumReading.innerText();

  const initialRailMetrics = await rail.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(initialRailMetrics.scrollWidth).toBeGreaterThan(initialRailMetrics.clientWidth);
  await rail.evaluate(element => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect.poll(() => rail.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);

  await magnesiumDose.fill('200');
  await expect.poll(() => magnesiumReading.innerText()).not.toBe(magnesiumBefore);
  await expect.poll(() => magnesiumCalciumRatio.innerText()).not.toBe(ratioBefore);
  await expect(magnesiumReading).toHaveAttribute('aria-label', /Updated\. Magnesium:/);
  await expect.poll(() => magnesiumReading.evaluate(item => {
    const railElement = item.closest('[aria-label="Live ions and current mixture ratios"]');
    if (!railElement) return false;
    const itemRect = item.getBoundingClientRect();
    const railRect = (railElement as HTMLElement).getBoundingClientRect();
    return itemRect.left >= railRect.left && itemRect.right <= railRect.right;
  })).toBe(true);
});

test('keeps pinned readings and Watermancer controls usable on short landscape screens', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  const readings = await openWatermancer(page);

  await expectPinnedAndCompact(page, readings);
  const { magnesiumDose, magnesiumReading } = await createLiveSaltReadings(page);

  const magnesiumBefore = await magnesiumReading.innerText();
  await magnesiumDose.fill('200');
  await expect.poll(() => magnesiumReading.innerText()).not.toBe(magnesiumBefore);
  await expect(magnesiumReading).toHaveAttribute('aria-label', /Updated\. Magnesium:/);
  await expectClearOfPinnedDock(magnesiumDose, readings);

  const rail = readings.locator('[aria-label="Live ions and current mixture ratios"]');
  await expect.poll(() => isFullyVisibleWithinRail(magnesiumReading, rail)).toBe(true);

  const targetStage = page.locator('[data-watermancer-stage="target"]');
  const calciumTargetCard = targetStage
    .locator('[class~="group/ion"]')
    .filter({ has: targetStage.getByText('Calcium', { exact: true }) });
  await expect(calciumTargetCard).toHaveAttribute('aria-label', 'Edit Calcium target');
  await calciumTargetCard.click();

  const calciumTargetInput = calciumTargetCard.locator('input');
  await expect(calciumTargetInput).toBeVisible();
  await expectClearOfPinnedDock(calciumTargetInput, readings);
  const calciumTargetBefore = Number(await calciumTargetInput.inputValue());
  await calciumTargetInput.fill(String(calciumTargetBefore + 1));
  await expect(calciumTargetInput).toHaveValue(String(calciumTargetBefore + 1));

  const sulfateRatio = readings.locator('[data-watermancer-ratio="cl-so4"]');
  const railExtent = await rail.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(railExtent.scrollWidth).toBeGreaterThan(railExtent.clientWidth);
  await rail.evaluate(element => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect.poll(() => isFullyVisibleWithinRail(sulfateRatio, rail)).toBe(true);
  await sulfateRatio.click();
  await expect(sulfateRatio).toHaveAttribute('aria-label', /SO₄:Cl ratio/);
  await expect.poll(() => readPosition(readings)).toBe('fixed');
});

test('workflow shortcuts keep target, salt, and matching controls clear of the pinned dock', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  const readings = await openWatermancer(page);
  await expect.poll(() => readPosition(readings)).toBe('fixed');

  const targetStage = page.locator('[data-watermancer-stage="target"]');
  const sodiumTargetCard = targetStage.locator('[aria-label="Edit Sodium target"]');
  await useWatermancerShortcut(page, '1', 'Set target', targetStage, sodiumTargetCard, readings);
  await sodiumTargetCard.click();
  const sodiumTargetInput = sodiumTargetCard.locator('input');
  await expectClearOfPinnedDock(sodiumTargetInput, readings);
  const sodiumTargetBefore = Number(await sodiumTargetInput.inputValue());
  await sodiumTargetInput.fill(String(sodiumTargetBefore + 1));
  await expect(sodiumTargetInput).toHaveValue(String(sodiumTargetBefore + 1));

  const saltStage = page.locator('[data-watermancer-stage="salts"]');
  const firstSaltRow = saltStage.locator('.watermancer-salt-table__row').first();
  await useWatermancerShortcut(page, '3', 'Add salts', saltStage, firstSaltRow, readings);
  const magnesiumDose = await enableSaltAndSetDose(page, 'Magnesium Chloride', 100);
  await expectClearOfPinnedDock(magnesiumDose, readings);
  await magnesiumDose.fill('125');
  await expect(magnesiumDose).toHaveValue('125');

  const matchingStage = page.locator('[data-watermancer-stage="match"]');
  await expect(matchingStage).toBeVisible();
  const guideMatch = matchingStage.locator('details').filter({ hasText: 'Guide the match' });
  const guideMatchSummary = guideMatch.locator('summary');
  await useWatermancerShortcut(page, '4', 'Choose route', matchingStage, guideMatchSummary, readings);
  await guideMatchSummary.click();
  await expect(guideMatch).toHaveAttribute('open', '');
  await expect.poll(() => readPosition(readings)).toBe('fixed');
});

test('shows target and final GH, KH, and modeled TDS in both readings layouts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const readings = await openWatermancer(page);
  const compactSummary = readings.locator('[data-watermancer-metric-summary]');
  const metricIds = ['gh', 'kh', 'tds'];
  const readMetricValues = async (summary: Locator) => Promise.all(
    metricIds.map(id => summary.locator(`[data-watermancer-metric="${id}"] span`).nth(1).innerText()),
  );

  await expect(compactSummary).toHaveAttribute('data-source', 'targets');
  for (const id of metricIds) {
    await expect(compactSummary.locator(`[data-watermancer-metric="${id}"]`)).toBeVisible();
  }
  await expect(compactSummary.locator('[data-watermancer-metric="tds"]'))
    .toHaveAttribute('aria-label', /Modeled TDS: .* mg\/L/);
  const targetValues = await readMetricValues(compactSummary);

  await createLiveSaltReadings(page);
  await expect(compactSummary).toHaveAttribute('data-source', 'final-mixture');
  const finalValues = await readMetricValues(compactSummary);
  expect(finalValues).not.toEqual(targetValues);

  await compactSummary.getByRole('button', { name: 'Show target metrics' }).click();
  await expect(compactSummary).toHaveAttribute('data-source', 'targets');
  await expect.poll(() => readMetricValues(compactSummary)).toEqual(targetValues);

  const display = page.getByRole('group', { name: 'Ion readings display' });
  await display.getByRole('button', { name: 'Classic', exact: true }).click();
  const classicSummary = page.locator('[data-watermancer-metric-summary]');
  await expect(classicSummary).toHaveAttribute('data-source', 'targets');
  await expect.poll(() => readMetricValues(classicSummary)).toEqual(targetValues);

  await classicSummary.getByRole('button', { name: 'Final mixture', exact: true }).click();
  await expect(classicSummary).toHaveAttribute('data-source', 'final-mixture');
  await expect.poll(() => readMetricValues(classicSummary)).toEqual(finalValues);
});

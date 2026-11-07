import { expect, test } from '@playwright/test';

test('places DIY stock controls beside preparation on desktop and stacks them on phones', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();

  const controls = page.getByTestId('mass-diy-controls');
  const preparation = page.getByTestId('mass-diy-preparation');
  await expect(controls).toBeVisible();
  await expect(preparation).toBeVisible();
  const desktop = await Promise.all([controls.boundingBox(), preparation.boundingBox()]);
  expect(desktop[0]).not.toBeNull();
  expect(desktop[1]).not.toBeNull();
  expect(desktop[1]!.x).toBeGreaterThan(desktop[0]!.x);

  await page.setViewportSize({ width: 402, height: 874 });
  const mobile = await Promise.all([controls.boundingBox(), preparation.boundingBox()]);
  expect(mobile[0]).not.toBeNull();
  expect(mobile[1]).not.toBeNull();
  expect(mobile[1]!.y).toBeGreaterThan(mobile[0]!.y);
});

test('shows the simplified DIY flow in salt-to-preparation order', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();

  await expect(page.getByRole('heading', { name: 'Build a single-salt stock', exact: true })).toBeVisible();
  await expect(page.getByText('Advanced stock targets', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Recipe target (anhydrous-equivalent mg/L)', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Stock strength percent w/w')).toHaveCount(0);
  await expect(page.getByLabel('Stock dropper tip')).toBeVisible();
  await expect(page.getByRole('button', { name: 'ppm as CaCO₃', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'mg/L salt per drop', exact: true })).toBeVisible();

  const ordered = await page.evaluate(() => {
    const selectors = document.querySelector('[aria-label="DIY concentrate salt"]')?.closest('section');
    const calibration = document.querySelector('[data-testid="mass-shared-calibration"]');
    const tip = document.querySelector('[data-testid="mass-dosing-tip-selection"]');
    const stock = document.querySelector('[data-testid="mass-stock-setup"]');
    const dose = document.querySelector('[data-testid="mass-stock-dose"]');
    const preparation = document.querySelector('[data-testid="mass-stock-preparation-card"]');
    const elements = [selectors, calibration, tip, stock, dose, preparation];
    return elements.every(Boolean) && elements.slice(0, -1).every((element, index) =>
      Boolean(element!.compareDocumentPosition(elements[index + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(ordered).toBe(true);
});

test('simplified DIY flow calibrates both tips independently and collapses after reload', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();

  const panel = page.getByTestId('mass-shared-calibration');
  await expect(panel).toHaveAttribute('open', '');
  await expect(panel).toContainText('Not calibrated');
  await page.getByLabel('Round tip measured drops').fill('60');
  await page.getByLabel('Round tip water weight in grams').fill('5');
  await expect(panel).toContainText('Calibrated');
  await expect(panel).toHaveAttribute('open', '');

  await page.getByLabel('Stock dropper tip').selectOption('straight');
  await expect(page.getByTestId('mass-selected-dropper-rate')).toContainText('Estimated');
  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByLabel('Stock dropper tip')).toHaveValue('straight');
  await expect(page.getByTestId('mass-selected-dropper-rate')).toContainText('Estimated');
  const reopenedPanel = page.getByTestId('mass-shared-calibration');
  await expect(reopenedPanel).not.toHaveAttribute('open', '');
  await expect(reopenedPanel).toContainText('Calibrated');
});

test('simplified DIY flow retains legacy percent-plan data without showing percent controls', async ({ page }) => {
  await page.goto('/');
  const calibration = { basis: 'stock', drops: 100, massG: 5, compositionKey: 'legacy-stock', tipKey: 'straight' };
  await page.evaluate(({ calibration }) => localStorage.setItem('coffee-water-diy-concentrate-inputs', JSON.stringify({
    massStockPlan: {
      version: 2, basis: 'mass', workspaceMode: 'diy', toolMode: 'percent', selectedSaltId: 'mgso4',
      dropperStyle: 'straight', percentWw: 5, strategy: 'individual', finalLiters: 1,
      recipe: { mgso4: { target: 30, formIdx: 0 } },
      groups: [{ id: 'diy-mgso4', totalStockMassG: 75, strength: 20, saltIds: ['mgso4'], calibration }],
    },
  })), { calibration });
  await page.reload();
  await page.getByTestId('tab-concentrates').click();

  await expect(page.getByLabel('DIY single-salt concentrate target stock weight in grams')).toHaveValue('75');
  await expect(page.getByLabel('Stock strength percent w/w')).toHaveCount(0);
  await expect(page.getByText('Advanced stock targets', { exact: true })).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => {
    const plan = JSON.parse(localStorage.getItem('coffee-water-diy-concentrate-inputs') ?? '{}').massStockPlan;
    return {
      mode: plan.toolMode,
      percent: plan.percentWw,
      stockWeight: plan.groups?.[0]?.totalStockMassG,
      calibration: plan.groups?.[0]?.calibration,
    };
  })).toEqual({ mode: 'recipe', percent: 5, stockWeight: 75, calibration });
});

test('keeps supporting explanations tucked away and dose math collapsed', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();

  const waterHelp = page.locator('[data-testid^="mass-water-volume-help-"]').first();
  await expect(waterHelp.getByRole('tooltip')).toBeHidden();
  await waterHelp.getByRole('button').click();
  await expect(waterHelp.getByRole('tooltip')).toContainText('1 mL ≈ 1 g');

  const calibrationHelp = page.getByTestId('mass-shared-calibration-help');
  await expect(calibrationHelp.getByRole('tooltip')).toBeHidden();
  await calibrationHelp.getByRole('button').focus();
  await expect(calibrationHelp.getByRole('tooltip')).toContainText('holding the dropper vertically');
  await expect(page.locator('[data-testid^="mass-stock-dose-details-"]')).not.toHaveAttribute('open', '');
});

test('keeps original volume inputs and requires an explicit weight rebuild', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('coffee-water-diy-concentrate-inputs', JSON.stringify({
    stockVolumeInput: '59', calibrationDropsInput: '100', calibrationWeightInput: '5',
  })));
  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByText('Legacy volume-based stock — historical record')).toBeVisible();
  await expect(page.getByTestId('mass-stock-card')).toHaveCount(0);
  await page.getByLabel('New target stock weight (g)').fill('100');
  await page.getByRole('button', { name: 'Rebuild by weight' }).click();
  await expect(page.getByTestId('mass-stock-card')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('coffee-water-diy-concentrate-inputs') ?? '{}'));
  expect(saved.stockVolumeInput).toBe('59');
  expect(saved.massStockPlan.basis).toBe('mass');
  expect(saved.massStockPlan.legacyVolumePlan.stockVolumeInput).toBe('59');
  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByTestId('mass-stock-card')).toBeVisible();
  await expect(page.getByText('Legacy volume-based stock — historical record')).toHaveCount(0);
});

test('exports the same mass preparation sequence, without a stock-volume assumption', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();
  await page.evaluate(() => {
    const original = URL.createObjectURL;
    URL.createObjectURL = function (blob: Blob | MediaSource) {
      if (blob instanceof Blob) (window as unknown as { preparationBlob: Blob }).preparationBlob = blob;
      return original.call(URL, blob);
    };
  });
  await page.getByRole('button', { name: 'Download preparation text' }).click();
  const text = await page.evaluate(() => (window as unknown as { preparationBlob: Blob }).preparationBlob.text());
  expect(text).toContain('total contents weigh 100 g');
  expect(text).toContain('Place the bottle on the scale and tare it once.');
  expect(text).toContain('Add');
  expect(text).toContain('splash of your measured water');
  expect(text).toContain('Leave enough headspace');
  expect(text).toContain('shake/mix until the salt dissolves');
  expect(text).toContain('This approximation does not apply to finished concentrate.');
  expect(text).not.toMatch(/20–30%|remaining water|Do not tare again|dose.*mL|mL stock/i);
});

test('keeps separate recipe stocks independent and doses an all-in-one stock by mass', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-alchemist').click();
  await page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm', exact: true }).fill('30');
  await page.getByRole('textbox', { name: 'Sodium Bicarbonate target ppm', exact: true }).fill('10');
  await page.getByRole('button', { name: 'Make Concentrate', exact: true }).click();
  await expect(page.getByTestId('concentrate-workspace-recipe')).toHaveAttribute('aria-selected', 'true');
  const magnesium = page.getByTestId('mass-stock-card').filter({ has: page.getByRole('heading', { name: 'Magnesium Sulfate concentrate', exact: true }) });
  const sodium = page.getByTestId('mass-stock-card').filter({ has: page.getByRole('heading', { name: 'Sodium Bicarbonate concentrate', exact: true }) });
  await magnesium.getByLabel('Magnesium Sulfate concentrate target stock weight in grams').fill('150');
  await expect(sodium.getByLabel('Sodium Bicarbonate concentrate target stock weight in grams')).toHaveValue('100');
  await expect(magnesium).toContainText('7.5 g stock');
  await page.getByLabel('Stock arrangement', { exact: true }).selectOption('all-in-one');
  const combined = page.getByTestId('mass-stock-card');
  await expect(combined).toHaveCount(1);
  await combined.getByLabel('All-in-one concentrate target stock weight in grams').fill('100');
  await combined.getByLabel('All-in-one concentrate recipe strength').fill('20');
  await expect(combined).toContainText('5 g stock');
  await page.getByRole('button', { name: 'Open concentrate recipe steps', exact: true }).click();
  await expect(combined).toContainText('total contents weigh');
  await combined.getByRole('button', { name: 'Set strength from drop target' }).click();
  const pinnedStrength = Number(await combined.getByLabel('All-in-one concentrate recipe strength').inputValue());
  await combined.getByLabel('All-in-one concentrate target stock weight in grams').fill('200');
  await expect(combined).toContainText('Pinned target');
  await expect.poll(async () => Number(await combined.getByLabel('All-in-one concentrate recipe strength').inputValue())).toBeCloseTo(pinnedStrength * 2, 6);
});

test('uses salt-first mass preparation in the Watermancer Guide', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Watermancer Guide', exact: true }).click();
  await page.getByRole('button', { name: 'Step 4: Prepare 1 mg per drop stocks', exact: true }).click();
  await page.getByLabel('Target stock weight in grams').fill('50');
  const guide = page.getByTestId('guide-stock-preparation');
  await expect(guide).toContainText('g/water drop');
  await expect(guide).toContainText('tare it once');
  await expect(guide).toContainText('Add 1.000 g of the selected salt to the bottle');
  await expect(guide).toContainText('splash of your measured water');
  await expect(guide).toContainText('total contents weigh 50 g');
  await expect(guide).toContainText('headspace');
  await expect(guide).toContainText('shake/mix');
  await expect(guide).not.toContainText('20–30%');
  await expect(guide).toContainText('This approximation does not apply to finished concentrate.');
  await expect(guide).not.toContainText('mL stock');
});

test('does not silently replace a malformed saved mass plan', async ({ page }) => {
  await page.goto('/');
  const original = JSON.stringify({ massStockPlan: { version: 2, basis: 'mass', strategy: 'individual', finalLiters: 1,
    groups: [{ id: 'bad', totalStockMassG: 100, strength: 20, saltIds: ['unknown'], calibration: null }] } });
  await page.evaluate(value => localStorage.setItem('coffee-water-diy-concentrate-inputs', value), original);
  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByRole('alert')).toContainText('Invalid stock group');
  await expect(page.getByTestId('mass-stock-card')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('coffee-water-diy-concentrate-inputs'))).toBe(original);
  await page.getByRole('button', { name: 'Start a new mass plan', exact: true }).click();
  await expect(page.getByTestId('mass-stock-card')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('coffee-water-diy-concentrate-inputs:recovery'))).toBe(original);
});

test('preserves DIY spreadsheet CaCO3-equivalent drop targets by weight', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();
  await page.getByRole('button', { name: 'ppm as CaCO₃', exact: true }).click();
  await page.getByRole('button', { name: 'Set strength from drop target' }).click();
  const doseDetails = page.locator('[data-testid^="mass-stock-dose-details-"]').first();
  await expect(page.getByTestId('mass-stock-card')).toContainText('Pinned target: 5 ppm CaCO₃-equivalent per drop');
  await expect(doseDetails).not.toHaveAttribute('open', '');
  await doseDetails.locator('summary').click();
  await expect(doseDetails).toContainText('Pinned planning target: 5 ppm CaCO₃-equivalent per drop');
  await expect(doseDetails).toContainText('DIY spreadsheet basis: 5 ppm CaCO₃-equivalent per drop');
  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByRole('button', { name: 'ppm as CaCO₃', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const reloadedDoseDetails = page.locator('[data-testid^="mass-stock-dose-details-"]').first();
  await reloadedDoseDetails.locator('summary').click();
  await expect(reloadedDoseDetails).toContainText('Pinned planning target: 5 ppm CaCO₃-equivalent per drop');
});

import { expect, test } from '@playwright/test';

test('prepares 100 g of 5% stock, verifies drops, invalidates changed composition, and retains the plan after refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();
  await page.getByRole('tab', { name: 'Single-salt weight percentage' }).click();
  await page.getByLabel('Single-salt % w/w stock target stock weight in grams').fill('100');
  await page.getByLabel('Stock strength percent w/w').fill('5');
  const card = page.getByTestId('mass-stock-card');
  await expect(card).toContainText('95 g');
  await expect(card).toContainText('19–28.5 g');
  await expect(card).toContainText('Do not tare again');
  await expect(card).toContainText('0.8 g stock');
  await expect(card).toContainText('Water-based planning estimate');
  await card.getByText('Calibrate this finished stock by weight', { exact: true }).click();
  await card.getByLabel('Single-salt % w/w stock counted stock drops').fill('100');
  await card.getByLabel('Single-salt % w/w stock measured stock weight').fill('5');
  await card.getByRole('button', { name: 'Use measured stock calibration' }).click();
  await expect(card).toContainText('Measured finished-stock calibration');
  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByRole('tab', { name: 'Single-salt weight percentage' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('mass-stock-card')).toContainText('Measured finished-stock calibration');
  await page.getByLabel('Stock strength percent w/w').fill('6');
  await expect(page.getByTestId('mass-stock-card')).toContainText('The stock composition or tip changed');
  await expect(page.getByTestId('mass-stock-card')).toContainText('Water-based planning estimate');
  await page.getByLabel('Stock dropper tip').selectOption('round');
  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByLabel('Stock dropper tip')).toHaveValue('round');
  await expect(page.getByTestId('mass-stock-card')).toContainText('Water-based planning estimate');
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
  await page.getByRole('tab', { name: 'Single-salt weight percentage' }).click();
  await page.getByLabel('Single-salt % w/w stock target stock weight in grams').fill('100');
  await page.getByLabel('Stock strength percent w/w').fill('5');
  await page.evaluate(() => {
    const original = URL.createObjectURL;
    URL.createObjectURL = function (blob: Blob | MediaSource) {
      if (blob instanceof Blob) (window as unknown as { preparationBlob: Blob }).preparationBlob = blob;
      return original.call(URL, blob);
    };
  });
  await page.getByRole('button', { name: 'Download preparation text' }).click();
  const text = await page.evaluate(() => (window as unknown as { preparationBlob: Blob }).preparationBlob.text());
  expect(text).toContain('19–28.5 g');
  expect(text).toContain('total contents weigh 100 g');
  expect(text).toContain('Do not tare again');
  expect(text).toContain('This approximation does not apply to finished concentrate.');
  expect(text).not.toMatch(/dose.*mL|mL stock/i);
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
  await expect(combined).toContainText('20–30% of the calculated');
  await expect(combined).toContainText('Do not tare again');
  await combined.getByRole('button', { name: 'Set strength from drop target' }).click();
  const pinnedStrength = Number(await combined.getByLabel('All-in-one concentrate recipe strength').inputValue());
  await combined.getByLabel('All-in-one concentrate target stock weight in grams').fill('200');
  await expect(combined).toContainText('Pinned planning target');
  await expect.poll(async () => Number(await combined.getByLabel('All-in-one concentrate recipe strength').inputValue())).toBeCloseTo(pinnedStrength * 2, 6);
});

test('uses grams and partial water in the Watermancer Guide', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Watermancer Guide', exact: true }).click();
  await page.getByRole('button', { name: 'Step 4: Prepare 1 mg per drop stocks', exact: true }).click();
  await page.getByLabel('Target stock weight in grams').fill('50');
  const guide = page.getByTestId('guide-stock-preparation');
  await expect(guide).toContainText('g/water drop');
  await expect(guide).toContainText('20–30% of the calculated');
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
  await page.getByLabel('Drop target basis').selectOption('caco3');
  await page.getByRole('button', { name: 'Set strength from drop target' }).click();
  await expect(page.getByTestId('mass-stock-card')).toContainText('Pinned planning target: 1 ppm CaCO₃-equivalent per drop');
  await expect(page.getByTestId('mass-stock-card')).toContainText('DIY spreadsheet basis: 1 ppm CaCO₃-equivalent per drop');
  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByLabel('Drop target basis')).toHaveValue('caco3');
  await expect(page.getByTestId('mass-stock-card')).toContainText('Pinned planning target: 1 ppm CaCO₃-equivalent per drop');
});

import { expect, test, type Page } from '@playwright/test';

async function openLotusDropsWithoutSavedCalibration(page: Page) {
  await page.addInitScript(() => {
    const initializedKey = 'lotus-output-test-initialized';
    if (sessionStorage.getItem(initializedKey) === '1') return;
    localStorage.setItem('coffee-water-diy-concentrate-inputs', JSON.stringify({
      lotusCalibrationInputs: {},
      lotusStockDropMeasurements: {},
    }));
    sessionStorage.setItem(initializedKey, '1');
  });
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();
  await page.getByRole('tab', { name: 'DIY Lotus Drops', exact: true }).click();
}

async function selectStyle(page: Page, style: 'Round' | 'Straight') {
  await page.getByRole('group', { name: 'Lotus dropper tip style' })
    .getByRole('button', { name: style, exact: true })
    .click();
}

test('uses a consistent card hierarchy across Lotus setup, volume, and preparation', async ({ page }) => {
  await openLotusDropsWithoutSavedCalibration(page);

  const cards = [
    page.getByTestId('lotus-selected-dropper'),
    page.getByTestId('lotus-brew-volume-section'),
    page.getByTestId('lotus-stock-preparation-section'),
  ];
  for (const card of cards) {
    await expect(card).toHaveClass(/rounded-2xl/);
    await expect(card).toHaveClass(/p-4/);
  }
  await expect(page.getByTestId('mass-shared-calibration')).toHaveClass(/rounded-xl/);
});

test('groups Lotus dropper selection, tip style, and calibration into one setup card', async ({ page }) => {
  await openLotusDropsWithoutSavedCalibration(page);

  const setup = page.getByTestId('lotus-selected-dropper');
  await expect(setup).toContainText('Dropper setup');
  await expect(setup.getByRole('group', { name: 'Lotus dropper tip style' })).toBeVisible();
  await expect(setup.getByTestId('mass-shared-calibration')).toBeVisible();
  await expect(setup.getByTestId('lotus-selected-calibration-status')).toContainText('Not calibrated');
  await expect(setup.getByTestId('mass-shared-calibration').locator('summary')).not.toContainText('Not calibrated');
  await expect(page.getByRole('button', { name: 'Open concentrate recipe steps' })).toHaveCount(0);
});

test('selects one dropper and gates mass preparation on its tip calibration', async ({ page }) => {
  await openLotusDropsWithoutSavedCalibration(page);

  const selector = page.getByRole('combobox', { name: 'Dropper to prepare' });
  await expect(selector).toHaveValue('magnesium');
  const activeDropper = page.getByTestId('lotus-selected-dropper');
  await expect(activeDropper).toContainText('Magnesium Chloride');
  await expect(activeDropper).toContainText('Hexahydrate');

  const massInput = page.getByTestId('lotus-finished-stock-mass');
  await expect(massInput).toBeDisabled();
  await expect(page.getByTestId('lotus-selected-stock-preparation')).toHaveCount(0);

  await selectStyle(page, 'Straight');
  await expect(massInput).toBeDisabled();
  await page.getByRole('textbox', { name: 'Straight tip measured drops' }).fill('100');
  await page.getByRole('textbox', { name: 'Straight tip water weight in grams' }).fill('4');
  await expect(massInput).toBeEnabled();

  await massInput.fill('0');
  await expect(page.getByTestId('lotus-selected-stock-preparation')).toHaveCount(0);
  await massInput.fill('100');
  const prep = page.getByTestId('lotus-selected-stock-preparation');
  await expect(prep).toBeVisible();
  await expect(prep).toContainText('tare it once');
  await expect(prep).toContainText('100 g (salt + water; bottle excluded)');
  await expect(prep).toContainText('headspace');
  await expect(prep).toContainText('shake/mix until the salt dissolves');

  await selectStyle(page, 'Round');
  await expect(massInput).toBeDisabled();
  await page.getByRole('textbox', { name: 'Round tip measured drops' }).fill('60');
  await page.getByRole('textbox', { name: 'Round tip water weight in grams' }).fill('5');
  await expect(massInput).toBeEnabled();

  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await page.getByRole('tab', { name: 'DIY Lotus Drops', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Dropper to prepare' })).toHaveValue('magnesium');
  await expect(page.getByTestId('lotus-finished-stock-mass')).toHaveValue('100');
  await expect(page.getByTestId('lotus-selected-stock-preparation')).toBeVisible();
});

test('shows calibrated ppm per drop separately from the fixed Lotus reference', async ({ page }) => {
  await openLotusDropsWithoutSavedCalibration(page);
  const selector = page.getByRole('combobox', { name: 'Dropper to prepare' });

  const saltForms = [
    { value: 'magnesium', salt: 'Magnesium Chloride', form: 'Hexahydrate' },
    { value: 'calcium', salt: 'Calcium Chloride', form: 'Dihydrate' },
    { value: 'potassium', salt: 'Potassium Bicarbonate', form: 'Anhydrous' },
    { value: 'sodium', salt: 'Sodium Bicarbonate', form: 'Anhydrous' },
  ];

  for (const item of saltForms) {
    await selector.selectOption(item.value);
    const selected = page.getByTestId('lotus-selected-dropper');
    await expect(selected).toContainText(item.salt);
    await expect(selected).toContainText(item.form);
  }

  await selector.selectOption('bonus-epsom');
  const bonus = page.getByTestId('lotus-selected-dropper');
  await expect(bonus).toContainText('Magnesium Sulfate');
  await expect(bonus).toContainText('Heptahydrate (Epsom)');
  await expect(bonus).toContainText('Bonus · not Lotus');

  await selector.selectOption('magnesium');
  await selectStyle(page, 'Straight');
  await page.getByRole('textbox', { name: 'Straight tip measured drops' }).fill('100');
  await page.getByRole('textbox', { name: 'Straight tip water weight in grams' }).fill('4');
  const massInput = page.getByTestId('lotus-finished-stock-mass');
  await massInput.fill('100');

  const fixedReference = page.getByTestId('lotus-fixed-reference');
  const calibratedDrop = page.getByTestId('lotus-calibrated-ppm-per-drop');
  await expect(fixedReference).toContainText('2.430 ppm');
  await expect(calibratedDrop).toContainText('3.146 ppm');
  await expect(calibratedDrop).toContainText('450 mL');
  const saltMassBefore = await page.getByTestId('lotus-stock-salt-mass').textContent();
  const waterMassBefore = await page.getByTestId('lotus-stock-water-mass').textContent();

  const volumeValue = page.getByTestId('lotus-brew-volume-value');
  const volumeSlider = page.getByTestId('lotus-brew-volume-slider');
  await expect(volumeValue).toHaveText('450 mL');
  await page.getByRole('group', { name: 'Lotus brew volume units' })
    .getByRole('button', { name: 'L', exact: true })
    .click();
  await expect(volumeValue).toHaveText('0.45 L');
  await volumeSlider.evaluate((element: HTMLInputElement) => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setValue?.call(element, '0.9');
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(volumeValue).toHaveText('0.9 L');
  await expect(fixedReference).toContainText('1.215 ppm');
  await expect(calibratedDrop).toContainText('1.573 ppm');
  await expect(page.getByTestId('lotus-stock-salt-mass')).toHaveText(saltMassBefore ?? '');
  await expect(page.getByTestId('lotus-stock-water-mass')).toHaveText(waterMassBefore ?? '');
  await page.getByRole('group', { name: 'Lotus brew volume units' })
    .getByRole('button', { name: 'Gal', exact: true })
    .click();
  await expect(volumeValue).toHaveText('0.238 Gal');
  await page.getByRole('button', { name: 'Reset brew volume' }).click();
  await expect(volumeValue).toHaveText('450 mL');
  await expect(fixedReference).toContainText('2.430 ppm');
  await expect(calibratedDrop).toContainText('3.146 ppm');

  await page.getByRole('textbox', { name: 'Straight tip measured drops' }).fill('120');
  await expect(calibratedDrop).toContainText('2.622 ppm');
  await expect(fixedReference).toContainText('2.430 ppm');
  await expect(page.getByTestId('lotus-stock-salt-mass')).toHaveText(saltMassBefore ?? '');
  await expect(page.getByTestId('lotus-stock-water-mass')).toHaveText(waterMassBefore ?? '');
});

test('supports the complete Lotus preparation flow at a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLotusDropsWithoutSavedCalibration(page);

  const dropper = page.getByRole('combobox', { name: 'Dropper to prepare' });
  await dropper.selectOption('calcium');
  await expect(page.getByTestId('lotus-selected-dropper')).toContainText('Calcium Chloride');

  const tipGroup = page.getByRole('group', { name: 'Lotus dropper tip style' });
  const straightTip = tipGroup.getByRole('button', { name: 'Straight', exact: true });
  await straightTip.click();
  await expect(straightTip).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('textbox', { name: 'Straight tip measured drops' }).fill('100');
  await page.getByRole('textbox', { name: 'Straight tip water weight in grams' }).fill('4');
  await expect(page.getByTestId('lotus-selected-calibration-status')).toContainText('Straight calibrated');

  const massInput = page.getByRole('textbox', { name: 'Finished stock mass in grams' });
  await massInput.fill('100');
  const preparation = page.getByTestId('lotus-selected-stock-preparation');
  await expect(preparation).toBeVisible();
  await expect(preparation.getByRole('listitem')).toHaveText([
    'Place the bottle on the scale and tare it once.',
    /^Add \d+\.\d{3} g Dihydrate Calcium Chloride to the bottle\.$/,
    'If you weigh the salt on parchment, use a splash of your measured water to rinse any clinging crystals into the bottle.',
    'Add water until the total contents weigh 100 g (salt + water; bottle excluded).',
    'Leave enough headspace for shaking.',
    'Cap the bottle and shake/mix until the salt dissolves.',
  ]);
  await expect(preparation).toContainText('For plain water at room temperature, 1 mL ≈ 1 g, so you can weigh your water.');

  const volume = page.getByTestId('lotus-brew-volume-value');
  const slider = page.getByRole('slider', { name: 'Final brewing water volume' });
  const units = page.getByRole('group', { name: 'Lotus brew volume units' });
  await expect(volume).toHaveText('450 mL');
  await units.getByRole('button', { name: 'L', exact: true }).click();
  await slider.press('ArrowRight');
  await expect(volume).toHaveText('0.46 L');
  await page.getByRole('button', { name: 'Reset brew volume' }).click();
  await expect(volume).toHaveText('450 mL');

  const tapTargets = [
    dropper,
    straightTip,
    tipGroup.getByRole('button', { name: 'Round', exact: true }),
    page.getByRole('textbox', { name: 'Straight tip measured drops' }),
    page.getByRole('textbox', { name: 'Straight tip water weight in grams' }),
    massInput,
    units.getByRole('button', { name: 'mL', exact: true }),
    page.getByRole('button', { name: 'Reset brew volume' }),
    slider,
  ];
  for (const target of tapTargets) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0, `${await target.getAttribute('aria-label') ?? await target.textContent()} tap height`).toBeGreaterThanOrEqual(40);
  }

  const documentWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(documentWidth.scroll, 'page should not scroll horizontally on a phone').toBeLessThanOrEqual(documentWidth.client);
});

test('aligns Lotus fields and keeps the calibration status in one place', async ({ page }) => {
  await openLotusDropsWithoutSavedCalibration(page);

  const section = page.getByTestId('lotus-selected-dropper');
  const dropper = page.getByRole('combobox', { name: 'Dropper to prepare' });
  await expect(section.getByTestId('lotus-selected-calibration-status')).toContainText('Not calibrated');
  await expect(page.getByTestId('mass-shared-calibration').locator('summary')).not.toContainText('Not calibrated');

  const mineral = page.getByTestId('lotus-selected-mineral');
  const dropperBox = await page.getByTestId('lotus-dropper-field').boundingBox();
  const mineralBox = await mineral.boundingBox();
  expect(dropperBox).not.toBeNull();
  expect(mineralBox).not.toBeNull();
  expect(Math.abs(dropperBox!.y - mineralBox!.y)).toBeLessThanOrEqual(2);

  await dropper.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('group', { name: 'Lotus dropper tip style' })
    .getByRole('button', { name: 'Straight', exact: true })).toBeFocused();
});

test('keeps the optional mineral marker inside its phone-width summary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLotusDropsWithoutSavedCalibration(page);

  const dropper = page.getByRole('combobox', { name: 'Dropper to prepare' });
  await dropper.selectOption('bonus-epsom');
  const mineral = page.getByTestId('lotus-selected-mineral');
  await expect(mineral).toContainText('Bonus · not Lotus');

  const dropperBox = await dropper.boundingBox();
  const mineralBox = await mineral.boundingBox();
  expect(dropperBox).not.toBeNull();
  expect(mineralBox).not.toBeNull();
  expect(mineralBox!.y).toBeGreaterThan(dropperBox!.y);

  const documentWidth = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(documentWidth.scroll, 'page should not scroll horizontally on a phone').toBeLessThanOrEqual(documentWidth.client);
});

test('offers a collapsed published-recipe dosing calculator below stock preparation', async ({ page }) => {
  await openLotusDropsWithoutSavedCalibration(page);

  const preparation = page.getByTestId('lotus-stock-preparation-section');
  const panel = page.getByTestId('lotus-recipe-dose-panel');
  await expect(panel).toBeVisible();
  await expect(panel.locator('summary')).toContainText('Dose a published Lotus recipe');
  await expect(panel).not.toHaveAttribute('open', '');

  const preparationBox = await preparation.boundingBox();
  const panelBox = await panel.boundingBox();
  expect(preparationBox).not.toBeNull();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.y).toBeGreaterThan(preparationBox!.y);

  await panel.locator('summary').click();
  const selector = panel.getByRole('combobox', { name: 'Published Lotus recipe' });
  await expect(selector).toHaveValue('');
  await expect(selector.locator('option')).toHaveCount(8);
  await expect(panel.getByTestId('lotus-recipe-dose-results')).toHaveCount(0);

  await selectStyle(page, 'Straight');
  await selector.selectOption('lotus-simple-and-sweet');
  await expect(panel.getByTestId('lotus-recipe-dose-results')).toBeVisible();
  await expect(panel.getByTestId('lotus-recipe-dose-count-magnesium')).toHaveText('3 drops');
  await expect(panel.getByTestId('lotus-recipe-dose-count-calcium')).toHaveText('6 drops');
  await expect(panel.getByTestId('lotus-recipe-dose-count-potassium')).toHaveText('3 drops');
  await expect(panel.getByTestId('lotus-recipe-dose-count-sodium')).toHaveText('5 drops');
  await expect(panel).toContainText('Watermancer estimate for DIY stocks');
  await expect(panel.getByRole('link', { name: 'Lotus instructions' }))
    .toHaveAttribute('href', 'https://lotuscoffeeproducts.com/pages/product-instructions');
});

test('recalculates Lotus recipe counts for brew volume and saved tip calibration', async ({ page }) => {
  await openLotusDropsWithoutSavedCalibration(page);
  await selectStyle(page, 'Straight');

  const panel = page.getByTestId('lotus-recipe-dose-panel');
  await panel.locator('summary').click();
  await panel.getByRole('combobox', { name: 'Published Lotus recipe' })
    .selectOption('lotus-simple-and-sweet');

  const magnesiumCount = page.getByTestId('lotus-recipe-dose-count-magnesium');
  const calciumCount = page.getByTestId('lotus-recipe-dose-count-calcium');
  const potassiumCount = page.getByTestId('lotus-recipe-dose-count-potassium');
  const sodiumCount = page.getByTestId('lotus-recipe-dose-count-sodium');
  await expect(magnesiumCount).toHaveText('3 drops');
  await expect(panel).toContainText('Lotus reference estimate');

  await page.getByRole('textbox', { name: 'Straight tip measured drops' }).fill('100');
  await page.getByRole('textbox', { name: 'Straight tip water weight in grams' }).fill('5');
  await expect(page.getByTestId('lotus-recipe-dose-basis-magnesium')).toHaveText('Water calibration');
  await expect(magnesiumCount).toHaveText('2 drops');
  await expect(calciumCount).toHaveText('5 drops');
  await expect(potassiumCount).toHaveText('2 drops');
  await expect(sodiumCount).toHaveText('4 drops');

  const slider = page.getByRole('slider', { name: 'Final brewing water volume' });
  await slider.evaluate((element: HTMLInputElement) => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setValue?.call(element, '900');
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.getByTestId('lotus-brew-volume-value')).toHaveText('900 mL');
  await expect(magnesiumCount).toHaveText('5 drops');
  await expect(calciumCount).toHaveText('10 drops');
  await expect(potassiumCount).toHaveText('5 drops');
  await expect(sodiumCount).toHaveText('8 drops');
});

test('uses and restores a separate finished-stock drop measurement for each stock', async ({ page }) => {
  await openLotusDropsWithoutSavedCalibration(page);
  await selectStyle(page, 'Straight');

  const panel = page.getByTestId('lotus-recipe-dose-panel');
  await panel.locator('summary').click();
  await panel.getByRole('combobox', { name: 'Published Lotus recipe' })
    .selectOption('lotus-simple-and-sweet');
  await expect(page.getByTestId('lotus-recipe-dose-basis-magnesium'))
    .toHaveText('Lotus reference estimate');

  const magnesiumDrops = page.getByRole('textbox', { name: 'Magnesium stock measured drops' });
  const magnesiumWeight = page.getByRole('textbox', { name: 'Magnesium stock measured weight in grams' });
  await magnesiumDrops.fill('10');
  await magnesiumWeight.fill('2');
  await expect(page.getByTestId('lotus-stock-measurement-status'))
    .toContainText('0.2000 g/drop');
  await expect(page.getByTestId('lotus-recipe-dose-basis-magnesium'))
    .toHaveText('Finished-stock measurement');
  await expect(page.getByTestId('lotus-recipe-dose-count-magnesium')).toHaveText('1 drops');

  await page.getByRole('combobox', { name: 'Dropper to prepare' }).selectOption('calcium');
  await page.getByRole('textbox', { name: 'Calcium stock measured drops' }).fill('10');
  await page.getByRole('textbox', { name: 'Calcium stock measured weight in grams' }).fill('2');
  await expect(page.getByTestId('lotus-recipe-dose-basis-calcium'))
    .toHaveText('Finished-stock measurement');

  await page.getByRole('combobox', { name: 'Dropper to prepare' }).selectOption('magnesium');
  await expect(magnesiumDrops).toHaveValue('10');
  await expect(magnesiumWeight).toHaveValue('2');
  await page.reload();
  await page.getByTestId('tab-concentrates').click();
  await page.getByRole('tab', { name: 'DIY Lotus Drops', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Magnesium stock measured drops' })).toHaveValue('10');
  await expect(page.getByRole('textbox', { name: 'Magnesium stock measured weight in grams' })).toHaveValue('2');
  await page.getByTestId('lotus-recipe-dose-panel').locator('summary').click();
  await page.getByRole('combobox', { name: 'Published Lotus recipe' })
    .selectOption('lotus-simple-and-sweet');
  await expect(page.getByTestId('lotus-recipe-dose-basis-magnesium'))
    .toHaveText('Finished-stock measurement');
});

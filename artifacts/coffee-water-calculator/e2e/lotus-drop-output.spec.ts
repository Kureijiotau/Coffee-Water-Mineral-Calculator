import { expect, test, type Page } from '@playwright/test';

async function openLotusDropsWithoutSavedCalibration(page: Page) {
  await page.addInitScript(() => {
    const initializedKey = 'lotus-output-test-initialized';
    if (sessionStorage.getItem(initializedKey) === '1') return;
    localStorage.setItem('coffee-water-diy-concentrate-inputs', JSON.stringify({
      lotusCalibrationInputs: {},
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
  await expect(page.getByTestId('mass-shared-calibration').locator('summary')).toContainText('straight calibrated');

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
  await expect(section.getByTestId('lotus-selected-calibration-status')).toHaveCount(0);
  await expect(page.getByTestId('mass-shared-calibration').locator('summary')).toContainText('Not calibrated');

  const mineral = page.getByTestId('lotus-selected-mineral');
  const dropperBox = await dropper.boundingBox();
  const mineralBox = await mineral.boundingBox();
  expect(dropperBox).not.toBeNull();
  expect(mineralBox).not.toBeNull();
  expect(Math.abs(dropperBox!.y - mineralBox!.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(dropperBox!.height - mineralBox!.height)).toBeLessThanOrEqual(2);

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

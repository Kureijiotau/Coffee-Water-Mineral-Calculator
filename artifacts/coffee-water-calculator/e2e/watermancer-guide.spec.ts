import { expect, test } from '@playwright/test';

test('keeps Watermancer Guide separate, keyboard-accessible, and locally navigable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const watermancerGuideTab = page.getByTestId('tab-watermancer-guide');
  const weekOneGuideTab = page.getByRole('tab', { name: 'Guide', exact: true });

  await expect(watermancerGuideTab).toBeVisible();
  await expect(watermancerGuideTab).toHaveAttribute('aria-controls', 'watermancer-guide-panel');
  await expect(watermancerGuideTab).toHaveAttribute('aria-selected', 'false');
  await weekOneGuideTab.click();
  await expect(weekOneGuideTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: "Robert Asami's 7-day water crash course" })).toBeVisible();
  await expect(watermancerGuideTab).toHaveAttribute('aria-selected', 'false');

  await watermancerGuideTab.focus();
  await page.keyboard.press('Enter');
  await expect(watermancerGuideTab).toHaveAttribute('aria-selected', 'true');
  await expect(weekOneGuideTab).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByTestId('watermancer-guide')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Watermancer Guide', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set up the supplies', exact: true })).toBeVisible();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 1 of 6');
  await expect(page.getByTestId('button-previous-step')).toBeDisabled();

  await page.getByTestId('button-next-step').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 2 of 6');
  await expect(page.getByTestId('step-calibrate')).toBeVisible();
  await page.getByTestId('button-previous-step').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 1 of 6');

  const calibrationReference = page.getByTestId('button-reference-drop-calibration');
  const doseReference = page.getByTestId('button-reference-mg-per-drop');
  await calibrationReference.click();
  await doseReference.click();
  await expect(calibrationReference).toHaveAttribute('aria-expanded', 'true');
  await expect(doseReference).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('reference-drop-calibration')).toBeVisible();
  await expect(page.getByTestId('reference-mg-per-drop')).toBeVisible();
  await calibrationReference.click();
  await expect(calibrationReference).toHaveAttribute('aria-expanded', 'false');
  await expect(doseReference).toHaveAttribute('aria-expanded', 'true');

  await page.getByTestId('button-step-set-targets').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 4 of 6');
  await weekOneGuideTab.click();
  await expect(page.getByRole('heading', { name: "Robert Asami's 7-day water crash course" })).toBeVisible();
  await watermancerGuideTab.click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 1 of 6');

  const pageWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(pageWidths.content).toBeLessThanOrEqual(pageWidths.viewport);
});

test('opens the existing tools without changing the selected Watermancer target', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-watermancer').click();

  const targetPicker = page.getByRole('button', { name: 'Select mineral recipe' });
  const profileBefore = (await targetPicker.innerText()).trim();
  await page.getByTestId('watermancer-profile-edit').click();
  const calciumTarget = page.getByTestId('watermancer-ion-target-calcium');
  await expect(calciumTarget).toBeVisible();
  const calciumBefore = await calciumTarget.inputValue();

  const watermancerGuideTab = page.getByTestId('tab-watermancer-guide');
  await watermancerGuideTab.click();
  await expect(page.getByTestId('watermancer-guide')).toBeVisible();
  await page.getByTestId('button-open-watermancer').last().click();
  await expect(page.getByTestId('mode-watermancer')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetPicker).toContainText(profileBefore);
  await page.getByTestId('watermancer-profile-edit').click();
  await expect(calciumTarget).toHaveValue(calciumBefore);

  await watermancerGuideTab.click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 1 of 6');
  await page.getByTestId('button-open-diy-concentrate').last().click();
  await expect(page.getByTestId('tab-concentrates')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('concentrate-workspace-diy')).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('tab', { name: 'Calculator', exact: true }).click();
  await expect(page.getByTestId('mode-watermancer')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetPicker).toContainText(profileBefore);
  await page.getByTestId('watermancer-profile-edit').click();
  await expect(calciumTarget).toHaveValue(calciumBefore);
});

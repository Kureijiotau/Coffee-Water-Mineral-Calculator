import { expect, test } from '@playwright/test';

test('recipe picker selects by pointer and keyboard, then dismisses correctly', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-alchemist').click();

  const picker = page.getByRole('button', { name: 'Select mineral recipe' });
  const dialog = page.getByRole('dialog', { name: 'Mineral recipes' });
  await picker.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('option', { name: 'Jelly', exact: true }).click();
  await expect(picker).toContainText('Jelly');
  await expect(dialog).toBeHidden();
  await expect(picker).toBeFocused();

  await picker.click();
  const finalOption = dialog.getByRole('option').last();
  const finalOptionLabel = (await finalOption.innerText()).trim();
  await picker.press('End');
  await picker.press('Enter');
  await expect(picker).toContainText(finalOptionLabel);
  await expect(dialog).toBeHidden();
  await expect(picker).toBeFocused();

  await picker.click();
  await picker.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(picker).toBeFocused();

  await picker.click();
  await page.getByTestId('mode-brewer').click();
  await expect(dialog).toBeHidden();
});

test('first-visit concentrate tour leaves its highlighted mineral picker clickable', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('tab-concentrates').click();

  const tour = page.getByRole('dialog', { name: 'Concentrates tour' });
  await expect(tour).toBeVisible();
  await expect(page.getByTestId('concentrate-guided-tour-spotlight'))
    .toHaveAttribute('data-target-testid', 'mass-stock-composition');

  const mineral = page.getByRole('combobox', { name: 'DIY concentrate salt' });
  const initialSalt = await mineral.inputValue();
  await mineral.click();
  await mineral.press('ArrowDown');
  await mineral.press('Enter');
  await expect(mineral).not.toHaveValue(initialSalt);
  await expect(mineral).toBeFocused();
  const selectedSalt = await mineral.inputValue();
  await expect(tour).toBeVisible();
  await expect(page.getByTestId('concentrate-guided-tour-spotlight'))
    .toHaveAttribute('data-target-testid', 'mass-stock-composition');

  const stockMass = page.getByRole('textbox', {
    name: 'DIY single-salt concentrate target stock weight in grams',
  });
  await expect(stockMass).toHaveValue('100');
  await stockMass.fill('125');

  await tour.getByRole('button', { name: 'Skip', exact: true }).click();
  await expect(tour).toBeHidden();
  await mineral.selectOption(initialSalt);
  await expect(mineral).toHaveValue(initialSalt);
  await expect(stockMass).toHaveValue('100');
  await mineral.selectOption(selectedSalt);
  await expect(stockMass).toHaveValue('125');
});

test('Watermancer picker and strength panel support selection and dismissal', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-watermancer').click();

  const picker = page.getByRole('button', { name: 'Select mineral recipe' });
  const recipeDialog = page.getByRole('dialog', { name: 'Mineral recipes' });
  await picker.click();
  await expect(recipeDialog).toBeVisible();
  await recipeDialog.getByRole('option', { name: 'Conflate', exact: true }).click();
  await expect(picker).toContainText('Conflate');
  await expect(recipeDialog).toBeHidden();

  const strengthToggle = page.getByTestId('watermancer-strength-toggle');
  await strengthToggle.click();
  const strengthDialog = page.getByRole('dialog', { name: 'Target strength' });
  await expect(strengthDialog).toBeVisible();
  const slider = page.getByTestId('watermancer-strength-slider');
  await slider.focus();
  await slider.press('ArrowRight');
  await expect(slider).toHaveValue('105');
  await page.keyboard.press('Escape');
  await expect(strengthDialog).toBeHidden();

  await strengthToggle.click();
  await page.getByRole('button', { name: 'Close target strength' }).click();
  await expect(strengthDialog).toBeHidden();
});

test.describe('mobile touch picker interactions', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test('recipe menu opens, selects, and closes after an outside tap', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mode-alchemist').tap();

    const picker = page.getByRole('button', { name: 'Select mineral recipe' });
    const dialog = page.getByRole('dialog', { name: 'Mineral recipes' });
    await picker.tap();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('option', { name: 'Club Soda', exact: true }).tap();
    await expect(picker).toContainText('Club Soda');
    await expect(dialog).toBeHidden();

    await picker.tap();
    await expect(dialog).toBeVisible();
    await page.getByTestId('mode-watermancer').tap();
    await expect(dialog).toBeHidden();
  });

  test('first-visit tour stays anchored after a mobile salt selection', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByTestId('tab-concentrates').tap();

    const tour = page.getByRole('dialog', { name: 'Concentrates tour' });
    const mineral = page.getByRole('combobox', { name: 'DIY concentrate salt' });
    const initialSalt = await mineral.inputValue();
    const selectedSalt = await mineral.locator('option').nth(1).getAttribute('value');
    expect(selectedSalt).not.toBeNull();

    await mineral.tap();
    await mineral.selectOption(selectedSalt!);
    await expect(mineral).not.toHaveValue(initialSalt);
    await expect(tour).toBeVisible();

    await tour.getByRole('button', { name: 'Skip', exact: true }).tap();
    await expect(tour).toBeHidden();
  });
});

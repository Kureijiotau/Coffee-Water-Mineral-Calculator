import { expect, test, type Page } from '@playwright/test';

type RecipeMode = 'alchemist' | 'brewer';

async function openCalculator(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('watermancer.alchemist-tour.v1', 'seen');
    localStorage.setItem('watermancer.brewer-tour.v1', 'seen');
    localStorage.setItem('watermancer.watermancer-tour.v1', 'seen');
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
}

async function openRecipeMode(page: Page, mode: RecipeMode) {
  await openCalculator(page);
  await page.getByTestId(`mode-${mode}`).click();
  await expect(page.getByTestId(`${mode}-salt-summary`)).toBeVisible();
}

test('shows the explainer only in Brewer and Alchemist summaries', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  await expect(page.getByTestId('salt-units-explainer-trigger')).toBeVisible();

  await page.getByTestId('mode-brewer').click();
  await expect(page.getByTestId('brewer-salt-summary')).toBeVisible();
  await expect(page.getByTestId('salt-units-explainer-trigger')).toBeVisible();

  await page.getByTestId('mode-watermancer').click();
  await expect(page.getByTestId('alchemist-salt-summary')).toBeHidden();
  await expect(page.getByTestId('salt-units-explainer-trigger')).toHaveCount(0);
  await expect(page.getByTestId('salt-units-explainer-dialog')).toHaveCount(0);
});

test('explains live salt, ion, and hardness values without changing the recipe', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  await page.getByRole('textbox', { name: 'Final batch volume in liters' }).fill('1');
  await page.getByRole('button', { name: 'Advanced: hydration forms' }).click();
  await page.getByLabel('Magnesium Chloride target ppm').fill('40');
  await page.getByLabel('Magnesium Chloride hydration form').selectOption('1');

  const targetInput = page.getByLabel('Magnesium Chloride target ppm');
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  const title = guide.getByRole('heading', { level: 3 });
  await expect(guide).toBeVisible();
  await expect(guide).toHaveAttribute('aria-modal', 'false');
  await expect(guide.getByTestId('salt-units-explainer-progress')).toHaveText('1 of 4');
  await expect(title).toHaveText('Salt target vs weighed mass');
  await expect(title).toHaveAttribute('aria-live', 'polite');
  await expect(guide.getByTestId('salt-units-target-mgcl2')).toHaveText('40 ppm');
  await expect(guide.getByTestId('salt-units-form-mgcl2')).toHaveText('Hexahydrate');
  await expect(guide.getByTestId('salt-units-mass-mgcl2')).toHaveText('85.42 mg');

  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(title).toHaveText('A salt separates into ions');
  await expect(guide.getByTestId('salt-units-ion-mgcl2-magnesium')).toContainText('10.21 mg/L');
  await expect(guide.getByTestId('salt-units-ion-mgcl2-chloride')).toContainText('29.79 mg/L');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(title).toHaveText('mg is mass; mg/L is concentration');
  await expect(guide.getByText(/In dilute water, mg\/L is approximately ppm/)).toBeVisible();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(title).toHaveText('GH and KH use different ions');
  await expect(guide.getByTestId('salt-units-gh-mgcl2')).toContainText('42.05 ppm CaCO₃');
  await expect(guide.getByTestId('salt-units-kh-mgcl2')).toContainText('0 ppm CaCO₃');
  await expect(guide.getByTestId('salt-units-total-gh')).toContainText('42.05 ppm CaCO₃');

  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(title).toHaveText('mg is mass; mg/L is concentration');
  await expect(targetInput).toHaveValue('40');
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect(targetInput).toHaveValue('40');
});

test('refreshes the open guide when target, hydration, and batch volume change', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  await page.getByRole('textbox', { name: 'Final batch volume in liters' }).fill('1');
  await page.getByRole('button', { name: 'Advanced: hydration forms' }).click();
  await page.getByLabel('Magnesium Chloride target ppm').fill('40');
  await page.getByLabel('Magnesium Chloride hydration form').selectOption('1');
  await page.getByTestId('salt-units-explainer-trigger').scrollIntoViewIfNeeded();
  await page.getByTestId('salt-units-explainer-trigger').click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  await expect(guide.getByTestId('salt-units-mass-mgcl2')).toHaveText('85.42 mg');

  await page.getByLabel('Magnesium Chloride target ppm').fill('50');
  await expect(guide.getByTestId('salt-units-target-mgcl2')).toHaveText('50 ppm');
  await expect(guide.getByTestId('salt-units-mass-mgcl2')).toHaveText('106.77 mg');

  await page.getByLabel('Magnesium Chloride hydration form').selectOption('0');
  await expect(guide.getByTestId('salt-units-mass-mgcl2')).toHaveText('50 mg');

  await page.getByRole('textbox', { name: 'Final batch volume in liters' }).fill('2');
  await expect(guide.getByTestId('salt-units-mass-mgcl2')).toHaveText('100 mg');

  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByTestId('salt-units-ion-mgcl2-magnesium')).toContainText('12.76 mg/L');
  for (let step = 0; step < 2; step += 1) {
    await guide.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(guide.getByTestId('salt-units-total-gh')).toContainText('52.56 ppm CaCO₃');
});

test('tracks recipe changes while open and starts fresh after switching modes', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  const picker = page.getByRole('button', { name: 'Select mineral recipe' });
  const recipeDialog = page.getByRole('dialog', { name: 'Mineral recipes' });

  await picker.click();
  await recipeDialog.getByRole('option', { name: 'Club Soda', exact: true }).click();
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  const target = guide.getByTestId('salt-units-target-mgcl2');
  const mass = guide.getByTestId('salt-units-mass-mgcl2');
  const initialTarget = await target.innerText();
  const initialMass = await mass.innerText();

  await picker.click();
  await recipeDialog.getByRole('option', { name: 'Jelly', exact: true }).click();
  await expect(target).not.toHaveText(initialTarget);
  await expect(mass).not.toHaveText(initialMass);
  const updatedTarget = await target.innerText();
  const updatedMass = await mass.innerText();

  await page.getByTestId('mode-watermancer').click();
  await expect(guide).toHaveCount(0);
  await page.getByTestId('mode-alchemist').click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(guide.getByTestId('salt-units-explainer-progress')).toHaveText('1 of 4');
  await expect(guide.getByTestId('salt-units-target-mgcl2')).toHaveText(updatedTarget);
  await expect(guide.getByTestId('salt-units-mass-mgcl2')).toHaveText(updatedMass);
});

test('keeps the guide within a narrow phone viewport', async ({ page }) => {
  await openRecipeMode(page, 'brewer');
  await page.getByLabel('Magnesium Chloride target ppm').fill('40');
  await page.setViewportSize({ width: 390, height: 844 });
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  await expect(guide).toBeVisible();
  const bounds = await guide.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByTestId('salt-units-explainer-progress')).toHaveText('2 of 4');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByTestId('salt-units-total-gh')).toBeVisible();
});

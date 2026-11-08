import { expect, test } from '@playwright/test';
import { recipeStockSaltMasses } from '../src/concentrateMass';
import { SALTS } from '../src/waterData';

function expectedStockSaltMassValue(saltId: string, targetPpm: number, doseMgPerLiter?: number) {
  const salt = SALTS.find(item => item.id === saltId)!;
  const target = doseMgPerLiter === undefined
    ? targetPpm
    : doseMgPerLiter * salt.anhydrousMass / (salt.hydrationForms[salt.defaultFormIdx ?? 0].molarMass);
  const amount = recipeStockSaltMasses({ [saltId]: target }, { [saltId]: salt.defaultFormIdx ?? 0 }, 20)
    .find(row => row.saltId === saltId)!.physicalMassMg / 1000;
  return Number(amount.toFixed(6)).toString();
}

async function expectRecipeHandoff(page: import('@playwright/test').Page, expectedSaltMassValue: string) {
  await expect(page.getByTestId('concentrate-workspace-recipe')).toHaveAttribute('aria-selected', 'true');
  const card = page.getByTestId('mass-stock-card').filter({
    has: page.getByRole('heading', { name: 'Magnesium Sulfate concentrate', exact: true }),
  });
  await expect(card.getByRole('textbox', {
    name: 'Magnesium Sulfate concentrate salt mass in grams',
    exact: true,
  })).toHaveValue(expectedSaltMassValue);
}

async function getMagnesiumStockSaltMass(page: import('@playwright/test').Page) {
  const card = page.getByTestId('mass-stock-card').filter({
    has: page.getByRole('heading', { name: 'Magnesium Sulfate concentrate', exact: true }),
  });
  return card.getByRole('textbox', {
    name: 'Magnesium Sulfate concentrate salt mass in grams',
    exact: true,
  }).inputValue();
}

test('keeps both concentrate workspaces under Concentrates and defaults to DIY', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('mode-alchemist')).toBeVisible();
  await expect(page.getByTestId('mode-watermancer')).toBeVisible();
  const appTabs = page.getByRole('tablist', { name: 'App workspace' }).getByRole('tab');
  expect((await appTabs.allTextContents()).map(label => label.trim())).toEqual([
    'Calculator',
    'Concentrates',
    'Mixer',
    'Water grading',
    'R. Asami Guide',
    'Watermancer Guide',
  ]);

  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByTestId('tab-concentrates')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Calculator', exact: true })).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByTestId('concentrate-workspace-diy')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('DIY single-salt concentrate', { exact: true })).toBeVisible();

  await page.getByTestId('concentrate-workspace-recipe').click();
  await expect(page.getByTestId('concentrate-workspace-recipe')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('No recipe concentrate loaded', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Calculator', exact: true }).click();
  await expect(page.getByTestId('mode-alchemist')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByTestId('concentrate-workspace-diy')).toHaveAttribute('aria-selected', 'true');
});

test('aligns concentrate mode tabs and save button at the right edge', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tab-concentrates').click();

  const header = page.locator('.concentrate-workspace > .app-panel').first();
  const actions = page.getByTestId('concentrate-header-actions');
  await expect(actions.getByRole('tablist', { name: 'DIY concentrate workspace' })).toBeVisible();
  await expect(actions.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

  const headerBox = await header.boundingBox();
  const actionsBox = await actions.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect(Math.abs(headerBox!.x + headerBox!.width - actionsBox!.x - actionsBox!.width)).toBeLessThan(36);
});

test('opens Recipe Concentrate with the active Alchemist salt target', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-alchemist').click();
  await page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm', exact: true }).fill('25');

  await page.getByTestId('tab-concentrates').click();
  await expectRecipeHandoff(page, expectedStockSaltMassValue('mgso4', 25));
});

test('opens Recipe Concentrate with Brewer targets instead of Alchemist rows', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-alchemist').click();
  await page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm', exact: true }).fill('');
  await page.getByTestId('mode-brewer').click();
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByTestId('concentrate-workspace-recipe')).toHaveAttribute('aria-selected', 'true');
  const defaultBrewerMass = await getMagnesiumStockSaltMass(page);
  expect(Number.parseFloat(defaultBrewerMass)).toBeGreaterThan(0);

  await page.getByRole('tab', { name: 'Calculator', exact: true }).click();
  await page.getByTestId('mode-alchemist').click();
  await page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm', exact: true }).fill('100');
  await page.getByTestId('mode-brewer').click();
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByTestId('concentrate-workspace-recipe')).toHaveAttribute('aria-selected', 'true');
  expect(await getMagnesiumStockSaltMass(page)).toBe(defaultBrewerMass);
});

test('opens Recipe Concentrate with Watermancer dose overrides', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-watermancer').click();
  const magnesium = page.locator('.watermancer-salt-table__row').filter({ hasText: 'Magnesium Sulfate' });
  const notUsed = magnesium.getByRole('button', { name: 'Not used', exact: true });
  if (await notUsed.count()) await notUsed.click();
  await magnesium.getByLabel('Magnesium Sulfate dose in milligrams', { exact: true }).fill('30');

  await page.getByTestId('tab-concentrates').click();
  await expectRecipeHandoff(page, expectedStockSaltMassValue('mgso4', 0, 30));
});

test('an empty active recipe opens DIY without deleting the previous recipe handoff', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-alchemist').click();
  const target = page.getByRole('textbox', { name: 'Magnesium Sulfate target ppm', exact: true });
  await target.fill('12');
  await page.getByTestId('tab-concentrates').click();
  await expectRecipeHandoff(page, expectedStockSaltMassValue('mgso4', 12));

  await page.getByRole('tab', { name: 'Calculator', exact: true }).click();
  await target.fill('');
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByTestId('concentrate-workspace-diy')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('concentrate-workspace-recipe').click();
  await expectRecipeHandoff(page, expectedStockSaltMassValue('mgso4', 12));
});
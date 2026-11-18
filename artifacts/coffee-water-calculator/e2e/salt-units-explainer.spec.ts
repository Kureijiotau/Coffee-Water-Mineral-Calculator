import { expect, test, type Page } from '@playwright/test';

type RecipeMode = 'alchemist' | 'brewer';

async function openCalculator(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('watermancer.alchemist-tour.v1', 'seen');
    localStorage.setItem('watermancer.brewer-tour.v1', 'seen');
    localStorage.setItem('watermancer.watermancer-tour.v1', 'seen');
    localStorage.setItem('watermancer.concentrates-tour.v1', 'seen');
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

test('shows the rounded fallback guide when no mineral recipe is selected', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  const title = guide.getByRole('heading', { level: 3 });
  await expect(guide).toBeVisible();
  await expect(guide).toHaveAttribute('aria-modal', 'true');
  const overlay = page.getByTestId('salt-units-explainer-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS('background-color', 'rgba(2, 6, 23, 0.75)');
  await expect(guide.getByTestId('salt-units-explainer-progress')).toHaveText('1 of 3');
  await expect(title).toHaveText('What your salts turn into');
  await expect(title).toHaveAttribute('aria-live', 'polite');
  await expect(guide.getByTestId('salt-units-page-copy'))
    .toHaveText('Each salt you weigh dissolves into ions. Ions are what your water actually gets.');
  await expect(guide.getByTestId('salt-units-recipe-eyebrow')).toHaveText('ROUNDED EXAMPLE · 1 L');
  await expect(guide.getByTestId('salt-units-fallback-note'))
    .toHaveText('Rounded examples for 1 L, using the common crystal forms.');
  await expect(guide.getByTestId('salt-units-row-mgcl2')).toContainText('85 mg');
  await expect(guide.getByTestId('salt-units-row-cacl2')).toContainText('53 mg');
  await expect(guide.getByTestId('salt-units-row-mgso4')).toContainText('82 mg');
  await expect(guide.getByTestId('salt-units-row-mgcl2')).toContainText('crystal water');
  await expect(guide.getByTestId('salt-units-fallback-example-mgcl2')).toContainText('≈ 10.2 mg/L');
  await expect(guide.getByTestId('salt-units-row-mgcl2')).toContainText('Hexahydrate');
  await expect(guide.getByTestId('salt-units-row-cacl2')).toContainText('Dihydrate');
  await expect(guide.getByTestId('salt-units-row-mgso4')).toContainText('Heptahydrate (Epsom)');
  await expect(guide.getByTestId('salt-units-row-nacl')).toContainText('Dry form');
  await expect(guide).not.toContainText(/anhydrous/i);
  await expect(guide.getByTestId('salt-units-row-nacl')).not.toContainText('crystal water');
  await expect(guide.getByTestId('salt-units-ion-magnesium-mgcl2')).toHaveCSS('color', 'rgb(253, 224, 71)');

  const closeButton = guide.getByRole('button', { name: 'Close salt units explainer' });
  await closeButton.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(guide.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();

  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(title).toHaveText('Crystal water adds weight, not minerals');
  await expect(guide.getByTestId('salt-units-page-copy'))
    .toHaveText('Same ions, heavier crystal. The water inside the crystal adds weight but no minerals. Weigh the form on your jar.');
  await expect(guide.getByTestId('salt-units-hydration-comparison')).toBeVisible();
  await expect(guide.getByTestId('salt-units-hydration-form-0')).toContainText('Hexahydrate');
  await expect(guide.getByTestId('salt-units-hydration-form-0')).toContainText('x2.1');
  await expect(guide.getByTestId('salt-units-dry-reference')).toContainText('Dry reference (rarely sold)');

  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(title).toHaveText('What counts toward GH and KH');
  await expect(guide.getByTestId('salt-units-page-copy'))
    .toHaveText('GH counts calcium and magnesium. KH counts bicarbonate and carbonate. Sodium, potassium, chloride and sulfate count for neither.');
  await expect(guide.getByRole('group', { name: 'GH and KH readout' })).toBeVisible();
  await expect(guide.getByTestId('salt-units-gh-value')).toContainText('ppm as CaCO₃');
  await expect(guide.getByTestId('salt-units-kh-value')).toContainText('ppm as CaCO₃');
  await expect(guide.getByTestId('salt-units-unit-legend')).toContainText('mg = what you weigh.');
  await expect(guide.getByTestId('salt-units-no-hardness-ions')).toContainText('SO₄²⁻');

  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(title).toHaveText('Crystal water adds weight, not minerals');
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('changes the worked example when switching recipes and keeps the dialog scoped to recipe modes', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  const picker = page.getByRole('button', { name: 'Select mineral recipe' });
  const recipeDialog = page.getByRole('dialog', { name: 'Mineral recipes' });

  await picker.click();
  await recipeDialog.getByRole('option', { name: 'Club Soda', exact: true }).click();
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  const example = guide.getByTestId('salt-units-row-mgcl2');
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await picker.click();
  await recipeDialog.getByRole('option', { name: 'Jelly', exact: true }).click();
  await trigger.click();
  await expect(guide.getByTestId('salt-units-recipe-eyebrow')).toContainText('Jelly');
  await expect(example).toBeVisible();

  await page.keyboard.press('Escape');
  await page.getByTestId('mode-watermancer').click();
  await expect(guide).toHaveCount(0);
  await page.getByTestId('mode-alchemist').click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(guide.getByTestId('salt-units-explainer-progress')).toHaveText('1 of 3');
  await expect(guide.getByTestId('salt-units-recipe-eyebrow')).toContainText('Jelly');
});

test('closes the modal when the dimmed backdrop is clicked', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  const overlay = page.getByTestId('salt-units-explainer-overlay');
  await expect(guide).toBeVisible();
  await overlay.click({ position: { x: 2, y: 2 } });
  await expect(guide).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('keeps the guide within a narrow phone viewport', async ({ page }) => {
  await openRecipeMode(page, 'brewer');
  await page.getByLabel('Magnesium Chloride target ppm').fill('40');
  await page.setViewportSize({ width: 375, height: 844 });
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  await expect(guide).toBeVisible();
  const bounds = await guide.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(375);
  expect(Math.abs(bounds!.x + bounds!.width / 2 - 187.5)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(await guide.evaluate(element => element.scrollWidth)).toBeLessThanOrEqual(bounds!.width);
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByTestId('salt-units-explainer-progress')).toHaveText('2 of 3');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByTestId('salt-units-gh-value')).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  const landscapeBounds = await guide.boundingBox();
  expect(landscapeBounds).not.toBeNull();
  expect(landscapeBounds!.x).toBeGreaterThanOrEqual(0);
  expect(landscapeBounds!.x + landscapeBounds!.width).toBeLessThanOrEqual(844);
  expect(landscapeBounds!.y).toBeGreaterThanOrEqual(0);
  expect(landscapeBounds!.y + landscapeBounds!.height).toBeLessThanOrEqual(390);
});

test('keeps the guide footer visible on phone pages without scrolling', async ({ page }) => {
  await openRecipeMode(page, 'brewer');
  await page.setViewportSize({ width: 375, height: 812 });
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  const initialPageScrollY = await page.evaluate(() => window.scrollY);
  const assertFooterVisible = async () => {
    const footer = guide.locator('footer');
    await expect(footer).toBeVisible();
    const bounds = await footer.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(812);
    expect(await page.evaluate(() => window.scrollY)).toBe(initialPageScrollY);
  };

  await assertFooterVisible();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await assertFooterVisible();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByRole('button', { name: 'Done', exact: true })).toBeVisible();
  await assertFooterVisible();
});

test('keeps every desktop page unscrolled, its fallback note visible, and the action in the same position', async ({ page }) => {
  await openRecipeMode(page, 'brewer');
  await page.setViewportSize({ width: 1280, height: 800 });
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  const positions = [];
  for (let step = 0; step < 3; step += 1) {
    const body = guide.locator('header + div');
    const bodySize = await body.evaluate(element => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    }));
    expect(bodySize.scrollHeight, `page ${step + 1} should fit without scrolling`).toBeLessThanOrEqual(bodySize.clientHeight);
    const titleBounds = await guide.getByRole('heading', { level: 3 }).boundingBox();
    const copyBounds = await guide.getByTestId('salt-units-page-copy').boundingBox();
    expect(titleBounds).not.toBeNull();
    expect(copyBounds).not.toBeNull();
    const titleToCopyGap = copyBounds!.y - (titleBounds!.y + titleBounds!.height);
    expect(titleToCopyGap, `page ${step + 1} title-to-copy gap was ${titleToCopyGap}px`).toBeLessThanOrEqual(40);
    const action = guide.getByRole('button', { name: /^(Next|Done)$/ });
    const bounds = await action.boundingBox();
    expect(bounds).not.toBeNull();
    positions.push(bounds!);
    if (step === 0) {
      const footnote = guide.getByTestId('salt-units-fallback-note');
      const footnoteBounds = await footnote.boundingBox();
      const bodyBounds = await body.boundingBox();
      expect(footnoteBounds).not.toBeNull();
      expect(bodyBounds).not.toBeNull();
      expect(footnoteBounds!.y).toBeGreaterThanOrEqual(bodyBounds!.y);
      expect(footnoteBounds!.y + footnoteBounds!.height).toBeLessThanOrEqual(bodyBounds!.y + bodyBounds!.height);
    }
    if (step < 2) await action.click();
  }

  for (const position of positions.slice(1)) {
    expect(position.x).toBeCloseTo(positions[0].x, 0);
    expect(position.y).toBeCloseTo(positions[0].y, 0);
    expect(position.width).toBeCloseTo(positions[0].width, 0);
    expect(position.height).toBeCloseTo(positions[0].height, 0);
  }
});

test('keeps the page-three content close to the footer on desktop', async ({ page }) => {
  await openRecipeMode(page, 'brewer');
  await page.setViewportSize({ width: 1280, height: 800 });
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await guide.getByRole('button', { name: 'Next', exact: true }).click();

  const lastContentBlock = guide.getByTestId('salt-units-no-hardness-ions');
  const contentBounds = await lastContentBlock.boundingBox();
  const footerBounds = await guide.locator('footer').boundingBox();
  expect(contentBounds).not.toBeNull();
  expect(footerBounds).not.toBeNull();
  const gap = footerBounds!.y - (contentBounds!.y + contentBounds!.height);
  expect(gap, `page 3 content-to-footer gap was ${gap}px`).toBeLessThan(100);
});

test('uses the selected recipe name and its live salts as the worked example', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  const picker = page.getByRole('button', { name: 'Select mineral recipe' });
  await picker.click();
  await page.getByRole('dialog', { name: 'Mineral recipes' })
    .getByRole('option', { name: 'Club Soda', exact: true }).click();

  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const guide = page.getByTestId('salt-units-explainer-dialog');

  await expect(guide.getByTestId('salt-units-recipe-eyebrow')).toHaveText('YOUR RECIPE · Club Soda · 1 L');
  await expect(guide.getByTestId('salt-units-row-mgcl2')).toContainText('Magnesium Chloride');
  await expect(guide.getByTestId('salt-units-row-cacl2')).toBeVisible();
  await expect(guide.getByTestId('salt-units-row-mgcl2')).toContainText('Hexahydrate');
  await expect(guide.getByTestId('salt-units-ion-magnesium-mgcl2')).toContainText('mg/L');
  await expect(guide.getByTestId('salt-units-hidden-count')).toHaveText('+1 more');

  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByTestId('salt-units-hydration-comparison')).toBeVisible();
  await expect(guide.getByTestId('salt-units-hydration-form-0')).toContainText('x2.1');

  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByTestId('salt-units-gh-value')).toBeVisible();
  await expect(guide.getByTestId('salt-units-kh-value')).toBeVisible();
});

test('uses the rounded six-salt fallback when no recipe is selected', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const guide = page.getByTestId('salt-units-explainer-dialog');

  await expect(guide.getByTestId('salt-units-fallback-note'))
    .toHaveText('Rounded examples for 1 L, using the common crystal forms.');
  await expect(guide.getByTestId('salt-units-row-mgcl2')).toContainText('85 mg');
  await expect(guide.getByTestId('salt-units-row-mgcl2')).toContainText('crystal water');
  await expect(guide.getByTestId('salt-units-fallback-example-mgcl2')).toContainText('≈ 10.2 mg/L');
});

test('reuses calculator ion colours and keeps each page explanation within its word budget', async ({ page }) => {
  await openRecipeMode(page, 'brewer');
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const guide = page.getByTestId('salt-units-explainer-dialog');
  const calculatorIon = page.getByTestId('brewer-salt-row-gh-mgcl2')
    .locator('[aria-label="Ions in Magnesium Chloride"] [title="Magnesium"] span');
  const explainerIon = guide.getByTestId('salt-units-ion-magnesium-mgcl2');
  await expect(explainerIon).toHaveCSS(
    '--ion-fg',
    await calculatorIon.evaluate(element => getComputedStyle(element).getPropertyValue('--ion-fg').trim()),
  );

  const wordBudgets = [25, 30, 30];
  for (let pageIndex = 0; pageIndex < wordBudgets.length; pageIndex += 1) {
    const copy = guide.getByTestId('salt-units-page-copy');
    const words = (await copy.innerText()).trim().split(/\s+/);
    expect(words.length, `page ${pageIndex + 1} body copy`).toBeLessThanOrEqual(wordBudgets[pageIndex]);
    if (pageIndex < 2) await guide.getByRole('button', { name: 'Next', exact: true }).click();
  }
});

test('uses plain science wording on every explainer page', async ({ page }) => {
  await openRecipeMode(page, 'brewer');
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();
  const guide = page.getByTestId('salt-units-explainer-dialog');
  const prohibitedTerms = /\b(?:loot|stats?|score(?:board)?|dead\s+weight|unlock|level|power[- ]?up|buff|quest|hp)\b/i;

  for (let pageIndex = 0; pageIndex < 3; pageIndex += 1) {
    const dialogCopy = await guide.evaluate(dialog => {
      const labels = Array.from(dialog.querySelectorAll<HTMLElement>('[aria-label], [title], [alt]'))
        .flatMap(element => [
          element.getAttribute('aria-label'),
          element.getAttribute('title'),
          element.getAttribute('alt'),
        ])
        .filter(Boolean)
        .join(' ');
      return `${dialog.innerText} ${labels}`;
    });
    expect(dialogCopy).not.toMatch(prohibitedTerms);
    if (pageIndex < 2) await guide.getByRole('button', { name: 'Next', exact: true }).click();
  }
});

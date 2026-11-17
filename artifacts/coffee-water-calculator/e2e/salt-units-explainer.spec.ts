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

test('shows a static rounded chemistry guide without changing the recipe', async ({ page }) => {
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
  await expect(guide).toHaveAttribute('aria-modal', 'true');
  const overlay = page.getByTestId('salt-units-explainer-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS('background-color', 'rgba(2, 6, 23, 0.75)');
  await expect(guide.getByTestId('salt-units-explainer-progress')).toHaveText('1 of 3');
  await expect(title).toHaveText('Salt splits into tiny pieces');
  await expect(title).toHaveAttribute('aria-live', 'polite');
  await expect(guide).toContainText('When salt dissolves, it splits into tiny charged pieces called ions.');
  await expect(guide.getByTestId('salt-units-example-mgcl2')).toContainText('40 mg/L');
  await expect(guide.getByTestId('salt-units-example-magnesium-mgcl2')).toContainText('≈ 10 mg/L');
  await expect(guide.getByTestId('salt-units-example-chloride-mgcl2')).toContainText('≈ 30 mg/L');
  await expect(guide.getByTestId('salt-units-example-mgso4')).toContainText('Magnesium Sulfate');
  await expect(guide.getByTestId('salt-units-example-nahco3')).toContainText('Sodium Bicarbonate');
  for (const saltId of ['mgcl2', 'cacl2', 'mgso4']) {
    await expect(guide.getByTestId(`salt-units-example-${saltId}`)).toContainText('dry (anhydrous) form');
  }
  await expect(guide).toContainText(
    'Rounded examples for 1 L, using dry salts. The common crystal forms hold water, so you weigh more for the same ions: about 2.1x for magnesium chloride hexahydrate, 2.0x for Epsom salt, 1.3x for calcium chloride dihydrate. The calculator does this for you.',
  );
  await expect(guide.getByTestId('salt-units-salt-name-mgcl2')).toHaveCSS('color', 'rgb(253, 224, 71)');
  await expect(guide.getByTestId('salt-units-example-mgcl2')).toHaveCSS(
    'border-color',
    'rgba(253, 224, 71, 0.42)',
  );
  await expect(guide.getByTestId('salt-units-example-mgcl2')).toHaveCSS(
    'background-image',
    /linear-gradient/,
  );

  const closeButton = guide.getByRole('button', { name: 'Close salt units explainer' });
  await closeButton.focus();
  await page.keyboard.press('Shift+Tab');
  await expect(guide.getByRole('button', { name: 'Next', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(closeButton).toBeFocused();

  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(title).toHaveText('GH and KH measure different things');
  await expect(guide.getByTestId('salt-units-gh-example')).toContainText('about 10 mg/L magnesium gives about 41 ppm GH');
  await expect(guide.getByTestId('salt-units-kh-example')).toContainText('about 18 mg/L bicarbonate gives about 15 ppm KH');
  await expect(guide.getByText('Calcium and magnesium make GH', { exact: false })).toHaveCount(1);
  await expect(guide.getByText('Bicarbonate and carbonate make KH', { exact: false })).toHaveCount(1);
  await expect(guide.getByTestId('salt-units-no-hardness-ions')).toContainText('Chloride');
  const otherIonChips = guide.getByTestId('salt-units-no-hardness-ions').locator('[data-testid^="salt-units-ion-key-"]');
  await expect(otherIonChips).toHaveCount(4);
  for (const ionName of ['Sodium', 'Potassium', 'Chloride', 'Sulfate']) {
    await expect(guide.getByTestId('salt-units-no-hardness-ions')).toContainText(ionName);
  }
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(title).toHaveText('What do mg, mg/L, and ppm mean?');
  await expect(guide.getByTestId('salt-units-unit-mg')).toContainText('Amount');
  await expect(guide.getByTestId('salt-units-unit-mg')).toContainText('How much salt you weigh.');
  await expect(guide.getByTestId('salt-units-unit-mg-l')).toContainText('How much is in 1 L of water.');
  await expect(guide.getByTestId('salt-units-unit-ppm')).toContainText('In water, ppm is about the same as mg/L.');
  await expect(guide).toContainText(
    '25 mg/L sodium bicarbonate does not mean 25 ppm KH. Its bicarbonate (about 18 mg/L) gives about 15 ppm KH. Sodium counts toward neither GH nor KH.',
  );

  await guide.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(title).toHaveText('GH and KH measure different things');
  await expect(targetInput).toHaveValue('40');
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await expect(targetInput).toHaveValue('40');
});

test('keeps the same rounded example after recipe inputs change', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  await page.getByRole('textbox', { name: 'Final batch volume in liters' }).fill('1');
  await page.getByRole('button', { name: 'Advanced: hydration forms' }).click();
  await page.getByLabel('Magnesium Chloride target ppm').fill('40');
  await page.getByLabel('Magnesium Chloride hydration form').selectOption('1');
  await page.getByTestId('salt-units-explainer-trigger').scrollIntoViewIfNeeded();
  await page.getByTestId('salt-units-explainer-trigger').click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  await expect(guide.getByTestId('salt-units-example-magnesium-mgcl2')).toContainText('≈ 10 mg/L');

  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await page.getByLabel('Magnesium Chloride target ppm').fill('50');
  await page.getByLabel('Magnesium Chloride hydration form').selectOption('0');
  await page.getByRole('textbox', { name: 'Final batch volume in liters' }).fill('2');
  await page.getByTestId('salt-units-explainer-trigger').click();
  await expect(guide.getByTestId('salt-units-example-mgcl2')).toContainText('40 mg/L');
  await expect(guide.getByTestId('salt-units-example-magnesium-mgcl2')).toContainText('≈ 10 mg/L');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByTestId('salt-units-gh-example')).toContainText('about 41 ppm GH');
});

test('keeps the fixed examples after switching recipes and modes', async ({ page }) => {
  await openRecipeMode(page, 'alchemist');
  const picker = page.getByRole('button', { name: 'Select mineral recipe' });
  const recipeDialog = page.getByRole('dialog', { name: 'Mineral recipes' });

  await picker.click();
  await recipeDialog.getByRole('option', { name: 'Club Soda', exact: true }).click();
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  const example = guide.getByTestId('salt-units-example-mgcl2');
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await picker.click();
  await recipeDialog.getByRole('option', { name: 'Jelly', exact: true }).click();
  await trigger.click();
  await expect(example).toContainText('40 mg/L salt');
  await expect(example).toContainText('≈ 10 mg/L');

  await page.keyboard.press('Escape');
  await page.getByTestId('mode-watermancer').click();
  await expect(guide).toHaveCount(0);
  await page.getByTestId('mode-alchemist').click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click();
  await expect(guide.getByTestId('salt-units-explainer-progress')).toHaveText('1 of 3');
  await expect(guide.getByTestId('salt-units-example-mgcl2')).toContainText('40 mg/L salt');
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
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByTestId('salt-units-explainer-progress')).toHaveText('2 of 3');
  await guide.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(guide.getByTestId('salt-units-unit-ppm')).toBeVisible();

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

test('keeps the guide action button in the same desktop position on all pages', async ({ page }) => {
  await openRecipeMode(page, 'brewer');
  await page.setViewportSize({ width: 1280, height: 800 });
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  const positions = [];
  for (let step = 0; step < 3; step += 1) {
    const action = guide.getByRole('button', { name: /^(Next|Done)$/ });
    const bounds = await action.boundingBox();
    expect(bounds).not.toBeNull();
    positions.push(bounds!);
    if (step === 0) {
      const footnote = guide.getByText(
        'Rounded examples for 1 L, using dry salts. The common crystal forms hold water, so you weigh more for the same ions: about 2.1x for magnesium chloride hexahydrate, 2.0x for Epsom salt, 1.3x for calcium chloride dihydrate. The calculator does this for you.',
        { exact: true },
      );
      const footnoteBounds = await footnote.boundingBox();
      const footerBounds = await guide.locator('footer').boundingBox();
      expect(footnoteBounds).not.toBeNull();
      expect(footerBounds).not.toBeNull();
      expect(footnoteBounds!.y + footnoteBounds!.height).toBeLessThanOrEqual(footerBounds!.y);
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

test('fits all guide pages in the desktop body without scrolling', async ({ page }) => {
  await openRecipeMode(page, 'brewer');
  await page.setViewportSize({ width: 1280, height: 800 });
  const trigger = page.getByTestId('salt-units-explainer-trigger');
  await trigger.scrollIntoViewIfNeeded();
  await trigger.click();

  const guide = page.getByTestId('salt-units-explainer-dialog');
  const body = guide.locator('div.mt-2.min-h-0.flex-1.overflow-y-auto');
  for (let step = 0; step < 3; step += 1) {
    const metrics = await body.evaluate(element => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(
      metrics.scrollHeight,
      `page ${step + 1} body should fit without scrolling`,
    ).toBeLessThanOrEqual(metrics.clientHeight);

    if (step === 0) {
      const footnote = guide.getByText(
        'Rounded examples for 1 L, using dry salts. The common crystal forms hold water, so you weigh more for the same ions: about 2.1x for magnesium chloride hexahydrate, 2.0x for Epsom salt, 1.3x for calcium chloride dihydrate. The calculator does this for you.',
        { exact: true },
      );
      const bodyBounds = await body.boundingBox();
      const footnoteBounds = await footnote.boundingBox();
      expect(bodyBounds).not.toBeNull();
      expect(footnoteBounds).not.toBeNull();
      expect(footnoteBounds!.y).toBeGreaterThanOrEqual(bodyBounds!.y);
      expect(footnoteBounds!.y + footnoteBounds!.height).toBeLessThanOrEqual(
        bodyBounds!.y + bodyBounds!.height,
      );
    }

    if (step < 2) {
      await guide.getByRole('button', { name: 'Next', exact: true }).click();
      await expect(guide.getByTestId('salt-units-explainer-progress')).toHaveText(
        `${step + 2} of 3`,
      );
    }
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

  const lastContentBlock = guide.getByText(
    '25 mg/L sodium bicarbonate does not mean 25 ppm KH. Its bicarbonate (about 18 mg/L) gives about 15 ppm KH. Sodium counts toward neither GH nor KH.',
    { exact: true },
  );
  const contentBounds = await lastContentBlock.boundingBox();
  const footerBounds = await guide.locator('footer').boundingBox();
  expect(contentBounds).not.toBeNull();
  expect(footerBounds).not.toBeNull();
  const gap = footerBounds!.y - (contentBounds!.y + contentBounds!.height);
  expect(gap, `page 3 content-to-footer gap was ${gap}px`).toBeLessThan(100);
});

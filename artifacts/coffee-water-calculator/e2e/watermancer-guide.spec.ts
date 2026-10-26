import { expect, test, type Page } from '@playwright/test';

const saltProductPhotos = [
  {
    label: 'Nigari',
    imageUrl: 'https://foodsofnations.com/cdn/shop/products/daf7f988103e9107f33a5013b0c92784.jpg?v=1653932166&width=1946',
    imageAlt: 'Food of Nations magnesium chloride and nigari flakes',
    sourceUrl: 'https://foodsofnations.com/products/nigari-flakes',
  },
  {
    label: 'Saltverk',
    imageUrl: 'https://saltverk.com/cdn/shop/files/Saltverk_FlakySalt.png?v=1781557939&width=1946',
    imageAlt: 'Jar of Saltverk Flaky Sea Salt',
    sourceUrl: 'https://saltverk.com/products/saltverk-pure-flaky-sea-salt',
  },
  {
    label: 'Vera Salt',
    imageUrl: 'https://verasalt.co/cdn/shop/files/Fine_Front_-_V2.png?v=1774573085&width=1946',
    imageAlt: 'Vera Salt fine spring salt package',
    sourceUrl: 'https://verasalt.co/products/fine-pure-natural-spring-salt-300g-microplastic-free',
  },
  {
    label: 'Arm & Hammer',
    imageUrl: 'https://www.armandhammer.com/-/media/aah/feature/product/bakingsoda/baking-soda-new/baking-soda-8-oz.jpg',
    imageAlt: 'Arm & Hammer Baking Soda Box',
    sourceUrl: 'https://www.armandhammer.com/en/baking-soda/baking-soda-products/pure-baking-soda/baking-soda-box-8-oz',
  },
] as const;

async function openWatermancerSuppliesStep(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('tab-watermancer-guide').click();
  await page.getByTestId('button-next-step').click();
  await expect(page.getByTestId('step-supplies')).toBeVisible();
}

test('brands the Week 1 Guide tab with Robert Asami’s glyph', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const guideTab = page.getByRole('tab', { name: 'R. Asami Guide', exact: true });
  await expect(guideTab).toBeVisible();
  await expect(guideTab).toHaveAttribute('aria-selected', 'false');

  const guideGlyph = guideTab.locator('img');
  await expect(guideGlyph).toHaveCount(1);
  await expect(guideGlyph).toHaveAttribute('src', /robert-asami-logo-transparent\.png/);
  await expect(guideGlyph).toHaveAttribute('alt', '');
  await expect(guideGlyph).toHaveAttribute('aria-hidden', 'true');

  await guideTab.click();
  await expect(guideTab).toHaveAttribute('aria-selected', 'true');

  const pageWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(pageWidths.content).toBeLessThanOrEqual(pageWidths.viewport);

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(desktopWidths.content).toBeLessThanOrEqual(desktopWidths.viewport);
});

test('keeps Watermancer Guide separate, keyboard-accessible, and locally navigable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const watermancerGuideTab = page.getByTestId('tab-watermancer-guide');
  const weekOneGuideTab = page.getByRole('tab', { name: 'R. Asami Guide', exact: true });

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
  await expect(page.getByRole('heading', { name: 'Watermancer Guide', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Quick reference', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Why taste needs a full profile', exact: true })).toBeVisible();
  await expect(page.getByTestId('guide-welcome')).toHaveText(
    'Welcome to the Watermancer Guide. This guide will help you set up a separate dropper for each mineral salt so you can fine-tune your water recipes down to the individual ion levels and gain precise control over your water profile.'
  );
  await expect(page.getByTestId('guide-counterion-comparison')).toBeVisible();
  await expect(page.getByTestId('guide-counterion-comparison').getByRole('img')).toHaveCount(2);
  const zoomToggle = page.getByRole('button', { name: 'Cursor zoom: Chloride + sodium example' });
  await expect(zoomToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const zoomImage = page.getByTestId('counterion-example-chloride-sodium');
  await zoomToggle.scrollIntoViewIfNeeded();
  const toggleBounds = await zoomToggle.boundingBox();
  if (!toggleBounds) throw new Error('Zoom control should have a visible bounding box');
  await page.mouse.move(toggleBounds.x + toggleBounds.width * 0.2, toggleBounds.y + toggleBounds.height * 0.3);
  await zoomToggle.click();
  await expect(zoomToggle).toHaveAttribute('aria-pressed', 'true');
  await expect(zoomImage).toHaveCSS('transform', 'matrix(2.2, 0, 0, 2.2, 0, 0)');
  const firstZoomOrigin = await zoomImage.evaluate(image => image.style.transformOrigin);
  await page.mouse.move(toggleBounds.x + toggleBounds.width * 0.6, toggleBounds.y + toggleBounds.height * 0.6);
  await expect.poll(() => zoomImage.evaluate(image => image.style.transformOrigin)).not.toBe(firstZoomOrigin);
  await zoomToggle.click();
  await expect(zoomToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(zoomImage).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 1 of 7');
  await expect(page.getByRole('list', { name: 'Guide steps' })).toBeVisible();
  await expect(page.getByTestId('button-previous-step')).toBeDisabled();

  const stepNavigation = page.getByRole('list', { name: 'Guide steps' });
  const stepContent = page.getByTestId('step-why-profile');
  await expect(stepContent).toBeVisible();
  const navigationPrecedesCurrentStep = await stepNavigation.evaluate(navigation => {
    const content = document.querySelector('[data-testid="step-why-profile"]');
    return Boolean(content && (navigation.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(navigationPrecedesCurrentStep).toBe(true);

  await page.getByTestId('button-next-step').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 2 of 7');
  await expect(page.getByTestId('step-supplies')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Set up the supplies', exact: true })).toBeVisible();
  await expect(page.getByText('Gather the salts, separate droppers', { exact: false })).toBeVisible();
  await expect(page.getByTestId('guide-salt-photo')).toBeVisible();
  await expect(page.getByTestId('guide-dropper-bottles-photo')).toBeVisible();
  await expect(page.getByTestId('guide-scale-photo')).toBeVisible();
  await expect(page.getByTestId('guide-welcome')).toHaveCount(0);
  await expect(page.getByTestId('guide-counterion-comparison')).toHaveCount(0);
  await page.getByTestId('button-previous-step').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 1 of 7');

  await page.getByTestId('button-step-set-targets').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 5 of 7');
  await weekOneGuideTab.click();
  await expect(page.getByRole('heading', { name: "Robert Asami's 7-day water crash course" })).toBeVisible();
  await watermancerGuideTab.click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 1 of 7');

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
  await page.getByTestId('button-step-set-targets').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 5 of 7');
  await page.getByTestId('button-next-step').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 6 of 7');
  await page.getByTestId('button-open-watermancer').last().click();
  await expect(page.getByTestId('mode-watermancer')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetPicker).toContainText(profileBefore);
  await page.getByTestId('watermancer-profile-edit').click();
  await expect(calciumTarget).toHaveValue(calciumBefore);

  await watermancerGuideTab.click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 1 of 7');
  await page.getByTestId('tab-concentrates').click();
  await expect(page.getByTestId('tab-concentrates')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('concentrate-workspace-diy')).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('tab', { name: 'Calculator', exact: true }).click();
  await expect(page.getByTestId('mode-watermancer')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetPicker).toContainText(profileBefore);
  await page.getByTestId('watermancer-profile-edit').click();
  await expect(calciumTarget).toHaveValue(calciumBefore);
});

test('keeps Step 6 ranges and provides visible, expandable Step 7 screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/');
  await page.getByTestId('tab-watermancer-guide').click();
  await page.getByTestId('button-step-set-targets').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 5 of 7');

  await page.getByTestId('button-next-step').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 6 of 7');
  const startingFramework = page.getByTestId('guide-starting-framework');
  await expect(startingFramework).toContainText('11–12.5 ppm');
  await expect(startingFramework).toContainText('In my tastings');
  await expect(startingFramework).toContainText(
    'It scales every ion target, including bicarbonate (KH), not just GH.',
  );

  await page.getByTestId('button-next-step').click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 7 of 7');
  const workflow = page.getByTestId('watermancer-guide-workflow');
  await expect(workflow).toBeVisible();
  await expect(workflow).not.toContainText(/kimoi/i);
  const guideRecipe = page.getByTestId('watermancer-guide-recipe');
  await expect(guideRecipe).toBeVisible();
  await expect(guideRecipe).toContainText('Guide recipe');
  await expect(guideRecipe).toContainText('1 L batch');
  await expect(guideRecipe).toContainText('RO / distilled water');
  await expect(guideRecipe).toContainText('966 mL');
  await expect(guideRecipe).toContainText('Evian');
  await expect(guideRecipe).toContainText('34 mL');
  await expect(guideRecipe).toContainText('14 mg');
  await expect(guideRecipe).toContainText('20 mg');
  await expect(guideRecipe).toContainText('4 mg');
  await expect(guideRecipe).toContainText('2 mg');

  const screenshotPreviews = page.locator(
    '[data-testid^="watermancer-guide-screen-"][data-testid$="-preview"]',
  );
  await expect(screenshotPreviews).toHaveCount(10);
  for (let index = 0; index < 10; index += 1) {
    const preview = screenshotPreviews.nth(index);
    await expect(preview).toBeVisible();
    const bounds = await preview.boundingBox();
    expect(bounds?.width).toBeLessThanOrEqual(360);
  }

  const recipePreview = page.getByTestId('watermancer-guide-screen-recipe-picker-preview');
  await expect(recipePreview).toHaveAccessibleName('View larger screenshot: Select a recipe');
  const previewSource = await recipePreview.getByRole('img').getAttribute('src');
  await recipePreview.click();

  const screenshotDialog = page.getByRole('dialog');
  await expect(screenshotDialog).toBeVisible();
  await expect(screenshotDialog.getByRole('heading', { name: 'Select a recipe' })).toBeVisible();
  await expect(screenshotDialog.getByRole('img')).toHaveAttribute('src', previewSource ?? '');

  await page.keyboard.press('Escape');
  await expect(screenshotDialog).toHaveCount(0);
  await expect(recipePreview).toBeFocused();

  await recipePreview.focus();
  await page.keyboard.press('Enter');
  await expect(screenshotDialog).toBeVisible();
  await screenshotDialog.getByRole('button', { name: 'Close' }).click();
  await expect(screenshotDialog).toHaveCount(0);
  await expect(recipePreview).toBeFocused();

  const pageWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(pageWidths.content).toBeLessThanOrEqual(pageWidths.viewport);

  await page.setViewportSize({ width: 1280, height: 1000 });
  await expect(workflow).toBeVisible();
  for (let index = 0; index < 10; index += 1) {
    const preview = screenshotPreviews.nth(index);
    await expect(preview).toBeVisible();
    const bounds = await preview.boundingBox();
    expect(bounds?.width).toBeLessThanOrEqual(360);
  }
  const desktopPageWidths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(desktopPageWidths.content).toBeLessThanOrEqual(desktopPageWidths.viewport);

  await recipePreview.scrollIntoViewIfNeeded();
  const desktopPreviewBounds = await recipePreview.boundingBox();
  if (!desktopPreviewBounds) throw new Error('Desktop screenshot preview should have a bounding box');
  await recipePreview.click();
  await expect(screenshotDialog).toBeVisible();
  const enlargedImageBounds = await screenshotDialog.getByRole('img').boundingBox();
  expect(enlargedImageBounds?.width).toBeGreaterThan(desktopPreviewBounds.width);
  const desktopDialogBounds = await screenshotDialog.boundingBox();
  expect(desktopDialogBounds?.x).toBeGreaterThanOrEqual(0);
  expect((desktopDialogBounds?.x ?? 0) + (desktopDialogBounds?.width ?? 0)).toBeLessThanOrEqual(1280);
  expect(desktopDialogBounds?.height).toBeLessThanOrEqual(1000);
  await screenshotDialog.getByRole('button', { name: 'Close' }).click();
  await expect(screenshotDialog).toHaveCount(0);
  await expect(recipePreview).toBeFocused();
});

test('keeps the Watermancer recipe action clear of the pinned readings dock across screen sizes', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-watermancer').click();

  const readingsDock = page.getByRole('region', { name: 'Current ion readings' });
  const recipeAction = page.getByRole('button', { name: 'Open recipe steps' });
  await expect(readingsDock).toHaveCSS('position', 'fixed');
  await expect(recipeAction).toBeVisible();

  for (const viewport of [
    { label: 'desktop', width: 1440, height: 1000 },
    { label: 'narrow desktop', width: 1280, height: 900 },
    { label: 'tablet', width: 1024, height: 768 },
    { label: 'mobile', width: 390, height: 844 },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const layout = await page.evaluate(() => {
      const action = document.querySelector<HTMLElement>('[aria-label="Open recipe steps"]');
      const dock = document.querySelector<HTMLElement>('[aria-label="Current ion readings"]');
      if (!action || !dock) return null;

      const actionRect = action.getBoundingClientRect();
      const dockRect = dock.getBoundingClientRect();
      const centerHit = document.elementFromPoint(
        actionRect.left + actionRect.width / 2,
        actionRect.top + actionRect.height / 2,
      );
      return {
        overlapsDock:
          actionRect.left < dockRect.right &&
          actionRect.right > dockRect.left &&
          actionRect.top < dockRect.bottom &&
          actionRect.bottom > dockRect.top,
        centerHitIsAction: Boolean(centerHit && action.contains(centerHit)),
      };
    });

    expect(layout, `${viewport.label} should have both the action and pinned dock`).not.toBeNull();
    expect(layout?.overlapsDock, `${viewport.label} action should not overlap the dock`).toBe(false);
    expect(layout?.centerHitIsAction, `${viewport.label} action should own its center hit target`).toBe(true);
  }
});

test('shows source-linked product previews for the named Step 2 examples', async ({ page }) => {
  await openWatermancerSuppliesStep(page);

  for (const product of saltProductPhotos) {
    const trigger = page.getByRole('button', { name: product.label, exact: true });
    const preview = page.getByRole('group', { name: `${product.label} product preview` });
    await expect(trigger).toBeVisible();
    await trigger.hover();
    await expect(preview).toBeVisible();

    const image = preview.getByRole('img');
    await expect(image).toHaveAttribute('src', product.imageUrl);
    await expect(image).toHaveAttribute('alt', product.imageAlt);
    await expect(image).toHaveAttribute('loading', 'lazy');
    await expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');
    await expect(preview.getByRole('link', { name: 'View product source' }))
      .toHaveAttribute('href', product.sourceUrl);

    const isPortalledOutsideStep = await preview.evaluate(
      element => !element.closest('[data-testid="step-supplies"]'),
    );
    expect(isPortalledOutsideStep).toBe(true);
    await page.mouse.move(0, 0);
    await expect(preview).toHaveCount(0);
  }
});

test('opens and dismisses product previews with the keyboard', async ({ page }) => {
  await openWatermancerSuppliesStep(page);
  await page.mouse.move(0, 0);

  const trigger = page.getByRole('button', { name: 'Saltverk', exact: true });
  const preview = page.getByRole('group', { name: 'Saltverk product preview' });
  await trigger.focus();
  await expect(preview).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
});

test('lets keyboard users tab to and activate a product source link', async ({ page }) => {
  await page.context().route('https://saltverk.com/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>Saltverk source</title>',
    });
  });
  await openWatermancerSuppliesStep(page);
  await page.mouse.move(0, 0);

  const trigger = page.getByRole('button', { name: 'Saltverk', exact: true });
  const preview = page.getByRole('group', { name: 'Saltverk product preview' });
  await trigger.focus();
  await expect(preview).toBeVisible();
  await page.keyboard.press('Tab');

  const sourceLink = page.getByRole('link', { name: 'Open source for Saltverk' });
  await expect(sourceLink).toBeFocused();
  await expect(sourceLink).toBeVisible();
  await expect(sourceLink).toHaveAttribute(
    'href',
    'https://saltverk.com/products/saltverk-pure-flaky-sea-salt',
  );
  await expect(preview).toHaveCount(0);

  const popupPromise = page.waitForEvent('popup');
  await sourceLink.press('Enter');
  const popup = await popupPromise;
  await expect(popup).toHaveURL('https://saltverk.com/products/saltverk-pure-flaky-sea-salt');
});

test('opens a product preview when tapped on a touch screen', async ({ browser, browserName }) => {
  test.skip(browserName !== 'chromium', 'Touch emulation is covered in Chromium.');
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  try {
    const page = await context.newPage();
    await openWatermancerSuppliesStep(page);
    const trigger = page.getByRole('button', { name: 'Vera Salt', exact: true });
    const preview = page.getByRole('group', { name: 'Vera Salt product preview' });
    await trigger.tap();
    await expect(preview).toBeVisible();
  } finally {
    await context.close();
  }
});

test('keeps the product source available when a preview image fails to load', async ({ page }) => {
  await page.route('**/daf7f988103e9107f33a5013b0c92784.jpg**', route => route.abort());
  await openWatermancerSuppliesStep(page);

  const trigger = page.getByRole('button', { name: 'Nigari', exact: true });
  const preview = page.getByRole('group', { name: 'Nigari product preview' });
  await trigger.hover();
  await expect(preview).toBeVisible();
  await expect(preview.getByText('Product photo unavailable')).toBeVisible();
  await expect(preview.getByRole('link', { name: 'View product source' })).toHaveAttribute(
    'href',
    'https://foodsofnations.com/products/nigari-flakes',
  );
});

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
  await page.getByTestId('button-open-watermancer').last().click();
  await expect(page.getByTestId('mode-watermancer')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetPicker).toContainText(profileBefore);
  await page.getByTestId('watermancer-profile-edit').click();
  await expect(calciumTarget).toHaveValue(calciumBefore);

  await watermancerGuideTab.click();
  await expect(page.getByTestId('text-current-step')).toHaveText('Step 1 of 7');
  await page.getByTestId('button-open-diy-concentrate').last().click();
  await expect(page.getByTestId('tab-concentrates')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('concentrate-workspace-diy')).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('tab', { name: 'Calculator', exact: true }).click();
  await expect(page.getByTestId('mode-watermancer')).toHaveAttribute('aria-pressed', 'true');
  await expect(targetPicker).toContainText(profileBefore);
  await page.getByTestId('watermancer-profile-edit').click();
  await expect(calciumTarget).toHaveValue(calciumBefore);
});

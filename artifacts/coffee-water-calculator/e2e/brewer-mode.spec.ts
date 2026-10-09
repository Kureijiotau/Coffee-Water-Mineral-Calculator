import { expect, test } from '@playwright/test';

test('shows calculator modes in order and defaults to Alchemist', async ({ page }) => {
  await page.goto('/');

  const modeButtons = page.locator('[data-testid^="mode-"]');
  expect(await modeButtons.evaluateAll(buttons => (
    buttons.map(button => button.getAttribute('data-testid'))
  ))).toEqual([
    'mode-brewer',
    'mode-alchemist',
    'mode-watermancer',
  ]);
  await expect(page.getByTestId('mode-alchemist')).toHaveAttribute('aria-pressed', 'true');
});

test('persists an explicit Brewer selection across refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('mode-brewer').click();

  await expect(page.getByTestId('mode-brewer')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('cwm.calculatorMode')))
    .toBe('brewer');

  await page.reload();
  await expect(page.getByTestId('mode-brewer')).toHaveAttribute('aria-pressed', 'true');
});

test('does not activate modern Brewer from the legacy Brewer marker', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cwm.nerdLevel', 'brewer'));
  await page.goto('/');

  await expect(page.getByTestId('mode-alchemist')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('mode-brewer')).toHaveAttribute('aria-pressed', 'false');
});

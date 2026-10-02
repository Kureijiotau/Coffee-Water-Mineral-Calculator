import { expect, test } from '@playwright/test';

const deployedAppUrl = process.env.WATER_TASTING_SYNC_URL;
const storageStatePath = process.env.WATER_TASTING_SYNC_STORAGE_STATE;

async function openWaterTasting(page: import('@playwright/test').Page) {
  await page.goto(deployedAppUrl!);
  await page.getByRole('tab', { name: 'Water grading', exact: true }).click();
  await expect(page.getByTestId('water-tasting-tab')).toBeVisible();
}

async function chooseFirstWaterProfile(page: import('@playwright/test').Page) {
  const profileSelect = page.getByTestId('select-tasting-profile');
  await expect.poll(() => profileSelect.locator('option').evaluateAll(options =>
    options.some(option => !option.disabled && (option as HTMLOptionElement).value !== ''),
  )).toBe(true);
  const firstAvailable = await profileSelect.locator('option').evaluateAll(options =>
    options.find(option => !option.disabled && (option as HTMLOptionElement).value !== '')
      ?.getAttribute('value'),
  );
  expect(firstAvailable).toBeTruthy();
  await profileSelect.selectOption(firstAvailable!);
}

test('saved tastings converge across two signed-in sessions while drafts stay local', async ({ browser }) => {
  test.skip(
    !deployedAppUrl || !storageStatePath,
    'Set WATER_TASTING_SYNC_URL and WATER_TASTING_SYNC_STORAGE_STATE to run against a deployed signed-in account.',
  );

  const deviceA = await browser.newContext({ storageState: storageStatePath });
  const deviceB = await browser.newContext({ storageState: storageStatePath });
  const pageA = await deviceA.newPage();
  const pageB = await deviceB.newPage();
  const uniqueName = `Cross-device tasting ${Date.now()}`;

  try {
    await openWaterTasting(pageA);
    await openWaterTasting(pageB);

    // A draft is only form state; it must not reach the other session.
    await chooseFirstWaterProfile(pageB);
    await pageB.getByTestId('input-tasting-name').fill(`${uniqueName} draft`);
    await expect(pageA.getByText(`${uniqueName} draft`, { exact: true })).toHaveCount(0);
    await pageB.reload();
    await pageB.getByRole('tab', { name: 'Water grading', exact: true }).click();

    // Save on device A, then load the other session from the same account API.
    await chooseFirstWaterProfile(pageA);
    await pageA.getByTestId('input-tasting-name').fill(uniqueName);
    await pageA.getByTestId('input-water-tasting-notes').fill('Saved on device A.');
    await pageA.getByTestId('button-save-tasting').click();
    await expect(pageA.getByTestId('status-tasting-feedback')).toContainText('Tasting saved');
    const card = pageA.locator('[data-testid^="card-tasting-"]')
      .filter({ hasText: uniqueName });
    await expect(card).toHaveCount(1);
    const tastingId = (await card.getAttribute('data-testid'))!.replace('card-tasting-', '');

    await pageB.reload();
    await pageB.getByRole('tab', { name: 'Water grading', exact: true }).click();
    await expect(pageB.getByTestId(`coffee-tasting-${tastingId}`)).toHaveText(uniqueName);
    await expect(pageB.getByTestId(`notes-tasting-${tastingId}`)).toHaveText('Saved on device A.');

    // Edit on device B; device A must load the newer version, not its stale copy.
    await pageB.getByTestId(`button-edit-tasting-${tastingId}`).click();
    await pageB.getByTestId('input-tasting-name').fill(`${uniqueName} edited`);
    await pageB.getByTestId('input-water-tasting-notes').fill('Edited on device B.');
    await pageB.getByTestId('button-save-tasting').click();
    await expect(pageB.getByTestId('status-tasting-feedback')).toContainText('Tasting updated');

    await pageA.reload();
    await pageA.getByRole('tab', { name: 'Water grading', exact: true }).click();
    await expect(pageA.getByTestId(`coffee-tasting-${tastingId}`)).toHaveText(`${uniqueName} edited`);
    await expect(pageA.getByTestId(`notes-tasting-${tastingId}`)).toHaveText('Edited on device B.');

    // Delete from A, then ensure B cannot restore its older saved copy.
    await pageA.getByTestId(`button-delete-tasting-${tastingId}`).click();
    await pageA.getByTestId(`button-confirm-delete-tasting-${tastingId}`).click();
    await expect(pageA.getByTestId(`card-tasting-${tastingId}`)).toHaveCount(0);

    await pageB.reload();
    await pageB.getByRole('tab', { name: 'Water grading', exact: true }).click();
    await expect(pageB.getByTestId(`card-tasting-${tastingId}`)).toHaveCount(0);
    await expect(pageB.getByText(`${uniqueName} draft`, { exact: true })).toHaveCount(0);
  } finally {
    await deviceA.close();
    await deviceB.close();
  }
});
import { expect, test, type Locator, type Page } from '@playwright/test';

async function holdTouch(page: Page, target: Locator, durationMs = 850): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  expect(box, 'held stepper button should have a visible hit target').not.toBeNull();

  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{
        x: box!.x + box!.width / 2,
        y: box!.y + box!.height / 2,
        id: 1,
      }],
    });
    await page.waitForTimeout(durationMs);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
}

async function openWatermancer(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();
}

async function activateWatermancerSalt(page: Page, saltName: string): Promise<Locator> {
  const row = page.locator('.watermancer-salt-table__row').filter({ hasText: saltName });
  const unused = row.getByRole('button', { name: 'Not used', exact: true });
  if (await unused.count()) await unused.tap();

  const dose = row.getByLabel(`${saltName} dose in milligrams`, { exact: true });
  await dose.fill('30');
  await expect(dose).toHaveValue('30');
  return row;
}

async function activateMixerSalt(page: Page, saltId: string): Promise<Locator> {
  const row = page.getByTestId(`row-mixer-salt-${saltId}`);
  await row.getByTestId(`button-toggle-mixer-salt-${saltId}`).tap();
  return row;
}

async function contextMenuIsPrevented(target: Locator): Promise<boolean> {
  return target.evaluate(element => {
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

async function doseLabelOverlaps(page: Page): Promise<string[]> {
  return page.locator('.watermancer-salt-table__dose-controls button').evaluateAll(buttons => {
    const labels = [...document.querySelectorAll<HTMLElement>('.watermancer-salt-table__dose-label')]
      .filter(label => label.getClientRects().length > 0);
    const overlaps: string[] = [];

    for (const button of buttons) {
      const buttonRect = button.getBoundingClientRect();
      for (const label of labels) {
        const labelRect = label.getBoundingClientRect();
        const intersects = buttonRect.left < labelRect.right
          && buttonRect.right > labelRect.left
          && buttonRect.top < labelRect.bottom
          && buttonRect.bottom > labelRect.top;
        if (intersects) {
          const buttonName = button.getAttribute('aria-label') ?? button.textContent?.trim() ?? 'unnamed stepper';
          overlaps.push(`${buttonName} is overlapped by "${label.textContent?.trim() ?? 'dose label'}"`);
        }
      }
    }

    return overlaps;
  });
}

test('mobile volume steppers respond to taps and held touches', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Alchemist', exact: true }).tap();

  const batchVolume = page.getByRole('textbox', { name: /Final batch volume in/ });
  const batchIncrease = page.getByRole('button', { name: /Increase Final batch volume in/ });
  const batchBefore = Number(await batchVolume.inputValue());
  await batchIncrease.tap();
  await expect.poll(async () => Number(await batchVolume.inputValue())).toBeCloseTo(batchBefore + 0.1);

  await page.getByRole('button', { name: 'Watermancer', exact: true }).tap();
  await page.getByRole('button', { name: 'Add water source', exact: true }).tap();

  const waterStepper = page.locator('[aria-label="Water volume adjustment"]').first();
  const waterReading = waterStepper.locator('span').first();
  const waterIncrease = waterStepper.getByRole('button', { name: 'Increase water volume by 1 mL' });
  await expect(waterReading).toHaveText('0 mL');
  await waterIncrease.tap();
  await expect(waterReading).toHaveText('1 mL');

  await holdTouch(page, waterIncrease);
  await expect.poll(async () => Number((await waterReading.innerText()).replace(/[^\d.-]/g, ''))).toBeGreaterThan(2);
});

test('Watermancer doses repeat on hold while Mixer doses respond to taps', async ({ page }) => {
  await openWatermancer(page);
  const watermancerRow = await activateWatermancerSalt(page, 'Calcium Chloride');
  const watermancerDose = watermancerRow.getByLabel('Calcium Chloride dose in milligrams', { exact: true });
  const watermancerIncrease = watermancerRow.getByRole('button', {
    name: 'Increase Calcium Chloride dose by 1 mg',
  });

  await watermancerIncrease.tap();
  await expect(watermancerDose).toHaveValue('31');
  await holdTouch(page, watermancerIncrease);
  await expect.poll(async () => Number(await watermancerDose.inputValue())).toBeGreaterThan(33);

  await page.getByRole('tab', { name: 'Mixer', exact: true }).tap();
  const mixerRow = await activateMixerSalt(page, 'nacl');
  const mixerDose = mixerRow.getByTestId('input-mixer-salt-dose-nacl');
  const mixerIncrease = mixerRow.getByTestId('button-increase-mixer-salt-nacl');
  const mixerDecrease = mixerRow.getByTestId('button-decrease-mixer-salt-nacl');

  await expect(mixerDose).toHaveValue('0.00');
  await mixerIncrease.tap();
  await expect(mixerDose).toHaveValue('1');
  await mixerDecrease.tap();
  await expect(mixerDose).toHaveValue('0');
});

test('mobile stepper buttons block context menus without covering selectable labels', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Alchemist', exact: true }).tap();
  const batchIncrease = page.getByRole('button', { name: /Increase Final batch volume in/ });
  expect(await contextMenuIsPrevented(batchIncrease)).toBe(true);

  await page.getByRole('button', { name: 'Watermancer', exact: true }).tap();
  await page.getByRole('button', { name: 'Add water source', exact: true }).tap();
  const waterStepper = page.locator('[aria-label="Water volume adjustment"]').first();
  const waterIncrease = waterStepper.getByRole('button', { name: 'Increase water volume by 1 mL' });
  expect(await contextMenuIsPrevented(waterIncrease)).toBe(true);

  const watermancerRow = await activateWatermancerSalt(page, 'Calcium Chloride');
  const watermancerIncrease = watermancerRow.getByRole('button', {
    name: 'Increase Calcium Chloride dose by 1 mg',
  });
  expect(await contextMenuIsPrevented(watermancerIncrease)).toBe(true);
  expect(await doseLabelOverlaps(page), 'overlapping Watermancer dose buttons and labels').toEqual([]);

  await page.getByRole('tab', { name: 'Mixer', exact: true }).tap();
  const mixerRow = await activateMixerSalt(page, 'nacl');
  const mixerIncrease = mixerRow.getByTestId('button-increase-mixer-salt-nacl');
  expect(await contextMenuIsPrevented(mixerIncrease)).toBe(true);

  const doseLabel = mixerRow.locator('.watermancer-salt-table__dose-label');
  const textBehavior = await doseLabel.evaluate(element => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const text = selection?.toString() ?? '';
    const userSelect = getComputedStyle(element).userSelect;
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
    });
    element.dispatchEvent(event);

    return {
      text,
      userSelect,
      contextMenuPrevented: event.defaultPrevented,
    };
  });
  expect(textBehavior.text).toBe('FINAL DOSE');
  expect(textBehavior.userSelect).not.toBe('none');
  expect(textBehavior.contextMenuPrevented).toBe(false);
  expect(await doseLabelOverlaps(page), 'overlapping Mixer dose buttons and labels').toEqual([]);
});
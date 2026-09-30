import { expect, test } from '@playwright/test';

type DeferredModule = 'WaterMixer' | 'WaterTastingTab' | 'IonRatioTable' | 'LabelScanner';

function deferredModuleFromUrl(url: string): DeferredModule | null {
  const match = new URL(url).pathname.match(
    /\/src\/(WaterMixer|WaterTastingTab|IonRatioTable|LabelScanner)\.tsx$/,
  );
  return (match?.[1] as DeferredModule | undefined) ?? null;
}

test('requests standalone workspace modules only when selected', async ({ page }) => {
  const requestedModules = new Set<DeferredModule>();
  page.on('request', request => {
    const module = deferredModuleFromUrl(request.url());
    if (module) requestedModules.add(module);
  });

  await page.goto('/');
  await expect(page.getByTestId('tab-water-grading')).toBeVisible();
  expect([...requestedModules]).toEqual([]);

  await page.getByTestId('tab-water-grading').click();
  await expect.poll(() => requestedModules.has('WaterTastingTab')).toBe(true);
  await expect(page.getByTestId('water-tasting-tab')).toBeVisible();

  await page.getByRole('tab', { name: 'Mixer', exact: true }).click();
  await expect.poll(() => requestedModules.has('WaterMixer')).toBe(true);
  await expect(page.getByTestId('panel-mixer-live-readings')).toBeVisible();

  await page.getByRole('tab', { name: 'Calculator', exact: true }).click();
  await page.getByRole('button', { name: 'Watermancer', exact: true }).click();
  await expect.poll(() => requestedModules.has('LabelScanner')).toBe(true);

  // The Ion Ratios entry point is currently feature-gated off. Its lazy chunk
  // must still stay out of the initial load.
  expect(requestedModules.has('IonRatioTable')).toBe(false);
});

test('shows panel-local loading and recovery states for a deferred Mixer chunk', async ({ page }) => {
  let releaseRequest!: () => void;
  const requestGate = new Promise<void>(resolve => {
    releaseRequest = resolve;
  });

  await page.route(/\/src\/WaterMixer\.tsx(?:\?.*)?$/, async route => {
    await requestGate;
    await route.continue();
  });

  await page.goto('/');
  await page.getByRole('tab', { name: 'Mixer', exact: true }).click();
  const loading = page.getByRole('status').filter({ hasText: 'Loading Mixer…' });
  try {
    await expect(loading).toBeVisible();
  } finally {
    releaseRequest();
  }
  await expect(loading).toHaveCount(0);

  await page.reload();
  await page.route(/\/src\/WaterMixer\.tsx(?:\?.*)?$/, route => route.abort());
  await page.getByRole('tab', { name: 'Mixer', exact: true }).click();
  const failure = page.getByRole('alert');
  await expect(failure).toContainText('Mixer could not be loaded.');
  await expect(failure).toContainText('may discard unsaved edits');
  await expect(failure.getByRole('button', { name: 'Reload app' })).toBeVisible();
});
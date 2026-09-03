import { readFile } from 'node:fs/promises';
import { expect, test, type Download, type Page } from '@playwright/test';

const targetInputs = [
  'Magnesium Sulfate target ppm',
  'Magnesium Chloride target ppm',
  'Magnesium Citrate target ppm',
  'Calcium Chloride target ppm',
  'Calcium Citrate target ppm',
  'Sodium Bicarbonate target ppm',
  'Sodium Chloride target ppm',
  'Potassium Bicarbonate target ppm',
  'Potassium Chloride target ppm',
] as const;

const expectedSaltLabels = [
  'Magnesium Sulfate',
  'Magnesium Chloride',
  'Magnesium Citrate',
  'Calcium Chloride',
  'Calcium Citrate',
  'Sodium Bicarbonate',
  'Sodium Chloride',
  'Potassium Bicarbonate',
  'Potassium Chloride',
] as const;

function readPngDimensions(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(0, 8)).toEqual(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

async function captureDownload(download: Download): Promise<Buffer> {
  expect(download.suggestedFilename()).toBe('mineral-recipe.WATER.png');
  const failure = await download.failure();
  expect(failure).toBeNull();
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(bytes.byteLength).toBeGreaterThan(100_000);
  return bytes;
}

async function openRecipeSteps(page: Page): Promise<void> {
  await page.getByRole('button', {
    name: /open recipe steps|see how to make this recipe and save it as an image/i,
  }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function configureLongConcentrateRecipe(page: Page): Promise<void> {
  for (const [index, name] of targetInputs.entries()) {
    await page.getByRole('textbox', { name }).fill(String(index + 4));
  }
  const concentrateToggle = page.getByRole('checkbox', { name: 'Use all-in-one concentrate' });
  await concentrateToggle.evaluate(element => (element as HTMLInputElement).click());
  await expect(concentrateToggle).toBeChecked();
  await openRecipeSteps(page);

  const dialog = page.getByRole('dialog');
  for (const salt of expectedSaltLabels) {
    await expect(dialog.getByText(salt, { exact: false }).first()).toBeVisible();
  }
  await expect(dialog.getByRole('complementary', { name: 'Concentrate dosing reference' })).toBeVisible();
}

async function downloadShareCard(page: Page): Promise<Buffer> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save Recipe Image' }).click();
  return captureDownload(await downloadPromise);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('downloads a complete deterministic PNG for a long concentrate recipe', async ({ page }) => {
  await configureLongConcentrateRecipe(page);
  await page.evaluate(() => {
    const originalCreateObjectURL = URL.createObjectURL.bind(URL);
    const captureWindow = window as typeof window & { __recipeShareCardSvg?: string };
    URL.createObjectURL = (blob: Blob | MediaSource) => {
      if (blob instanceof Blob && blob.type.startsWith('image/svg+xml')) {
        void blob.text().then(svg => {
          captureWindow.__recipeShareCardSvg = svg;
        });
      }
      return originalCreateObjectURL(blob);
    };
  });

  const first = await downloadShareCard(page);
  const second = await downloadShareCard(page);
  const firstDimensions = readPngDimensions(first);
  const secondDimensions = readPngDimensions(second);

  expect(firstDimensions).toEqual({ width: 2400, height: 2918 });
  expect(secondDimensions).toEqual(firstDimensions);
  await expect(page.getByRole('button', { name: 'Save Recipe Image' })).toBeEnabled();

  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __recipeShareCardSvg?: string }
  ).__recipeShareCardSvg ?? '')).not.toBe('');
  const svg = await page.evaluate(() => (
    window as typeof window & { __recipeShareCardSvg?: string }
  ).__recipeShareCardSvg ?? '');
  expect(svg).toContain('CONCENTRATE DOSING REFERENCE');
  expect(svg).toContain('FINAL · VERIFY AND BREW');
  for (const salt of expectedSaltLabels) {
    expect(svg).toContain(salt);
  }
  expect(svg).not.toContain('Save Recipe Image');
  expect(svg).not.toContain('Close recipe steps');
});

test('restores the save action and reports a conversion failure', async ({ page }) => {
  await openRecipeSteps(page);
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback) {
      callback(null);
    };
  });

  const saveButton = page.getByRole('button', { name: 'Save Recipe Image' });
  await saveButton.click();

  await expect(page.getByRole('status')).toContainText(
    'Couldn’t create the share-card image in this browser.',
  );
  await expect(saveButton).toBeEnabled();
  await expect(saveButton).toHaveText('Save Recipe Image');
});
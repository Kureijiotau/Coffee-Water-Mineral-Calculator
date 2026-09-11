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

async function downloadMixerShareCard(page: Page): Promise<Buffer> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save Recipe Image' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('mixer-blend.WATER.png');
  const path = await download.path();
  expect(path).not.toBeNull();
  const bytes = await readFile(path!);
  expect(bytes.byteLength).toBeGreaterThan(100_000);
  return bytes;
}

async function convertPng(page: Page, png: Buffer, mimeType: 'image/webp' | 'image/jpeg'): Promise<Buffer> {
  const encoded = png.toString('base64');
  const bytes = await page.evaluate(async ({ encodedPng, outputMimeType }) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encodedPng}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create an image conversion canvas.');
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => {
        if (value) resolve(value);
        else reject(new Error(`The browser could not encode ${outputMimeType}.`));
      }, outputMimeType, 0.95);
    });
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, { encodedPng: encoded, outputMimeType: mimeType });
  return Buffer.from(bytes);
}

async function configureTwoWaterMixerRecipe(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Mixer' }).click();
  for (const side of ['a', 'b'] as const) {
    await page.getByTestId(`select-mixer-source-mode-${side}`).selectOption('manual');
    await page.getByTestId(`input-mixer-manual-name-${side}`).fill(side === 'a' ? 'North spring' : 'South spring');
    await page.getByTestId(`input-mixer-volume-${side}`).fill(side === 'a' ? '640' : '360');
    for (const [ion, value] of Object.entries({
      calcium: side === 'a' ? '18' : '42',
      magnesium: side === 'a' ? '4' : '9',
      sodium: side === 'a' ? '7' : '21',
      potassium: side === 'a' ? '1' : '3',
      chloride: side === 'a' ? '12' : '31',
      sulfate: side === 'a' ? '8' : '17',
      bicarbonate: side === 'a' ? '28' : '64',
      citrates: side === 'a' ? '2' : '5',
    })) {
      await page.getByTestId(`input-mixer-manual-ion-${side}-${ion}`).fill(value);
    }
  }

  await page.getByTestId('button-toggle-mixer-salt-mgso4').click();
  await page.getByTestId('select-mixer-salt-form-mgso4').selectOption('0');
  await page.getByTestId('input-mixer-salt-dose-mgso4').fill('85');
  await page.getByTestId('button-toggle-mixer-salt-mgcl2').click();
  await page.getByTestId('select-mixer-salt-form-mgcl2').selectOption('1');
  await page.getByTestId('input-mixer-salt-dose-mgcl2').fill('125');
  await expect(page.getByTestId('status-mixer-result')).toHaveText('Calculated');
  await page.getByTestId('button-open-mixer-recipe-card').click();
  await expect(page.getByRole('dialog', { name: 'Mixer recipe card' })).toBeVisible();
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

test('recovers both waters and recipe readings after WEBP and JPEG conversion', async ({ page }) => {
  const converted = [
    { extension: 'webp', mimeType: 'image/webp' as const },
    { extension: 'jpg', mimeType: 'image/jpeg' as const },
  ];

  for (const { extension, mimeType } of converted) {
    await configureTwoWaterMixerRecipe(page);
    const png = await downloadMixerShareCard(page);
    const convertedBytes = await convertPng(page, png, mimeType);
    await page.getByRole('button', { name: 'Close Mixer recipe card' }).click();
    await page.getByRole('tab', { name: 'Calculator' }).click();
    await page.getByRole('button', { name: 'Watermancer' }).click();

    const importInput = page.locator('input[type="file"]').first();
    await importInput.setInputFiles({
      name: `mineral-recipe.WATER.${extension}`,
      mimeType,
      buffer: convertedBytes,
    });

    await expect(page.getByRole('status')).toContainText(
      'Imported “mineral-recipe” into Watermancer',
    );
    const waterNames = page.locator('input[placeholder="Water name (e.g. Solán de Cabras)"]');
    await expect(waterNames).toHaveCount(2);
    await expect(waterNames.nth(0)).toHaveValue('North spring');
    await expect(waterNames.nth(1)).toHaveValue('South spring');
    await expect(waterNames.nth(0).locator('xpath=..').locator('input').nth(1)).toHaveValue('640');
    await expect(waterNames.nth(1).locator('xpath=..').locator('input').nth(1)).toHaveValue('360');

    await expect(page.getByLabel('Magnesium Sulfate hydration form')).toHaveValue('0');
    await expect(page.getByLabel('Magnesium Chloride hydration form')).toHaveValue('1');
    await expect(page.getByText('Magnesium Sulfate', { exact: true })).toBeVisible();
    await expect(page.getByText('Magnesium Chloride', { exact: true })).toBeVisible();
    await expect(page.locator('[data-watermancer-ion-row="calcium"]')).toContainText('26.6');

    await page.reload();
  }
});
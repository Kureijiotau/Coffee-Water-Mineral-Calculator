import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { embedWaterRecipeJsonInPng } from '../src/waterRecipeImage.ts';

const legacyRecipeFixture = 'src/fixtures/legacy-water/coffee-water-recipe-v1.json';
const legacyRecipeName = 'Magnesia (MgCl₂ MgSO₄ NaCl)';
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function openMixer(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Mixer', exact: true }).click();
  await expect(page.getByTestId('workspace-water-mixer')).toBeVisible();
}

async function importJson(
  page: Page,
  payload: string | Buffer,
  name: string,
): Promise<void> {
  await page.getByTestId('input-import-mixer-recipe').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer: typeof payload === 'string' ? Buffer.from(payload) : payload,
  });
}

async function importPackagedPng(page: Page, payload: string | Buffer, name: string): Promise<void> {
  const text = typeof payload === 'string' ? payload : payload.toString('utf8');
  const packaged = embedWaterRecipeJsonInPng(
    ONE_PIXEL_PNG,
    text,
  );
  await page.getByTestId('input-import-mixer-recipe').setInputFiles({
    name,
    mimeType: 'image/png',
    buffer: Buffer.from(packaged),
  });
}

test('imports legacy recipe readings and keeps the recovered source after reload', async ({ page }) => {
  const fixture = await readFile(legacyRecipeFixture);
  await openMixer(page);

  await importJson(page, fixture, 'legacy-magnesia.WATER');

  await expect(page.getByTestId('status-mixer-import')).toContainText(
    `Imported "${legacyRecipeName}" into Water A.`,
  );
  await expect(page.getByTestId('text-mixer-source-name-a')).toHaveText(legacyRecipeName);
  await expect(page.getByTestId('text-mixer-source-ion-a-calcium')).toContainText('0.43');
  await expect(page.getByTestId('text-mixer-source-ion-a-magnesium')).toContainText('5.92');
  await expect(page.getByTestId('text-mixer-source-ion-a-sodium')).toContainText('5.18');
  await expect(page.getByTestId('text-mixer-source-ion-a-bicarbonate')).toContainText('11.4');
  await expect(page.getByTestId('text-mixer-source-ion-a-sulfate')).toContainText('4.02');

  await page.reload();
  await page.getByRole('tab', { name: 'Mixer', exact: true }).click();
  await expect(page.getByTestId('workspace-water-mixer')).toBeVisible();

  const picker = page.getByTestId('select-mixer-saved-source-a');
  const recoveredOptions = picker.locator('option').filter({ hasText: legacyRecipeName });
  await expect(recoveredOptions).toHaveCount(1);
  const recoveredSourceId = await recoveredOptions.getAttribute('value');
  expect(recoveredSourceId).toBeTruthy();
  await picker.selectOption(recoveredSourceId!);

  await expect(page.getByTestId('text-mixer-source-name-a')).toHaveText(legacyRecipeName);
  await expect(page.getByTestId('text-mixer-source-ion-a-calcium')).toContainText('0.43');
  await expect(page.getByTestId('text-mixer-source-ion-a-bicarbonate')).toContainText('11.4');
});

test('imports packaged legacy recipe-card PNG readings into Mixer', async ({ page }) => {
  const fixture = await readFile(legacyRecipeFixture);
  await openMixer(page);

  await importPackagedPng(page, fixture, 'legacy-magnesia.WATER.png');

  await expect(page.getByTestId('status-mixer-import')).toContainText(
    `Imported "${legacyRecipeName}" into Water A.`,
  );
  await expect(page.getByTestId('text-mixer-source-name-a')).toHaveText(legacyRecipeName);
  await expect(page.getByTestId('text-mixer-source-ion-a-calcium')).toContainText('0.43');
  await expect(page.getByTestId('text-mixer-source-ion-a-magnesium')).toContainText('5.92');
  await expect(page.getByTestId('text-mixer-source-ion-a-sodium')).toContainText('5.18');
  await expect(page.getByTestId('text-mixer-source-ion-a-bicarbonate')).toContainText('11.4');
  await expect(page.getByTestId('text-mixer-source-ion-a-sulfate')).toContainText('4.02');
});

test('keeps the invalid PNG feedback visible when recipe metadata is missing', async ({ page }) => {
  await openMixer(page);

  await page.getByTestId('input-import-mixer-recipe').setInputFiles({
    name: 'plain.WATER.png',
    mimeType: 'image/png',
    buffer: ONE_PIXEL_PNG,
  });

  await expect(page.getByTestId('status-mixer-import')).toHaveText(
    'That PNG does not contain embedded recipe readings for the Mixer.',
  );
  await expect(page.getByTestId('status-mixer-source-incomplete-a')).toBeVisible();
});

test('rejects unsupported versions and does not migrate a same-name custom recipe', async ({ page }) => {
  await openMixer(page);

  await importJson(page, JSON.stringify({
    kind: 'coffee-water-recipe',
    version: 99,
    name: legacyRecipeName,
    salts: {
      mgso4: { target: '4.883476553307854', formIdx: 1 },
      mgcl2: { target: '11.2390986763469', formIdx: 1 },
      nacl: { target: '13', formIdx: 0 },
    },
  }), 'unsupported-recipe.json');

  await expect(page.getByTestId('status-mixer-import')).toHaveText(
    'That file is not a supported coffee-water recipe or session.',
  );
  await expect(page.getByTestId('status-mixer-source-incomplete-a')).toBeVisible();

  await importJson(page, JSON.stringify({
    kind: 'coffee-water-recipe',
    version: 1,
    name: legacyRecipeName,
    salts: {
      mgso4: { target: '5', formIdx: 1 },
      mgcl2: { target: '11.2390986763469', formIdx: 1 },
      nacl: { target: '13', formIdx: 0 },
    },
  }), 'same-name-custom-recipe.json');

  await expect(page.getByTestId('status-mixer-import')).toContainText(
    `Imported "${legacyRecipeName}" into Water A.`,
  );
  await expect(page.getByTestId('text-mixer-source-ion-a-calcium')).toContainText('0.00');
  await expect(page.getByTestId('text-mixer-source-ion-a-bicarbonate')).toContainText('0.00');
  await expect(page.getByTestId('select-mixer-saved-source-a').locator('option').filter({
    hasText: 'Legacy recipe · zero-mineral RO estimate',
  })).toHaveCount(1);
});
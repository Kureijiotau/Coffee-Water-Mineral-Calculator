import { describe, expect, it, vi } from 'vitest';
import * as waterRecipeImage from './waterRecipeImage';
import {
  detectRecipeImageMimeType,
  embedWaterRecipeJsonInPng,
  getRecipeImageMimeType,
  resolveRecipeImageMimeType,
} from './waterRecipeImage';
import { serializeRecipeFile } from './recipes';
import { computeIonTotals } from './waterData';
import {
  parseWaterMixerImportText,
  readWaterMixerImportFile,
} from './waterMixerImport';
import { serializeWaterMixRecipeFile } from './waterMixer';
import {
  LEGACY_WATER_MIGRATIONS,
  migrateLegacyWaterPayload,
} from './legacyWaterRecovery';
import legacyRecipeFixture from './fixtures/legacy-water/coffee-water-recipe-v1.json';
import legacyPlanFixture from './fixtures/legacy-water/coffee-water-plan-v1.json';
import legacyProfileFixture from './fixtures/legacy-water/watermancer-profile-v1.json';
import legacySourceFixture from './fixtures/legacy-water/coffee-water-mix-source-v1.json';
import legacyMixFixture from './fixtures/legacy-water/coffee-water-mix-v1.json';
import {
  createTwoWaterRecipeCardQrPng,
  TWO_WATER_RECIPE_CARD_FIXTURE,
  TWO_WATER_RECIPE_CARD_QR_TEXT,
  TWO_WATER_RECIPE_CARD_SHARE_TOKEN,
} from './testFixtures/twoWaterRecipeCard';

const legacyFixtures = [
  legacyRecipeFixture,
  legacyPlanFixture,
  legacyProfileFixture,
  legacySourceFixture,
  legacyMixFixture,
];

function registryPayloadFromFixture(fixture: (typeof legacyFixtures)[number], version = fixture.version) {
  const saltTargets = fixture.saltTargets
    ?? (fixture.salts
      ? Object.fromEntries(
        Object.entries(fixture.salts).map(([saltId, entry]) => [saltId, Number(entry.target)]),
      )
      : undefined);
  const ions = fixture.finalIons ?? fixture.ions;
  return {
    kind: fixture.kind,
    version,
    name: fixture.name,
    ...(saltTargets ? { saltTargets } : {}),
    ...(ions ? { ions } : {}),
  };
}

const ONE_PIXEL_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
  character => character.charCodeAt(0),
);

describe('Mixer recipe imports', () => {
  it('recognizes supported MIME types and filename-only image types', () => {
    expect(getRecipeImageMimeType('recipe.png', 'image/png')).toBe('image/png');
    expect(getRecipeImageMimeType('recipe.webp', 'image/webp')).toBe('image/webp');
    expect(getRecipeImageMimeType('recipe.jpeg', 'image/jpeg')).toBe('image/jpeg');
    expect(getRecipeImageMimeType('recipe.webp')).toBe('image/webp');
    expect(getRecipeImageMimeType('recipe.jpg')).toBe('image/jpeg');
    expect(getRecipeImageMimeType('recipe.txt', 'image/avif')).toBeNull();
  });

  it('uses image bytes instead of inaccurate declared metadata', () => {
    expect(detectRecipeImageMimeType(ONE_PIXEL_PNG)).toBe('image/png');
    expect(resolveRecipeImageMimeType('recipe.png', 'image/jpeg', ONE_PIXEL_PNG)).toBe('image/png');
    expect(resolveRecipeImageMimeType('recipe.webp', 'image/png', Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]))).toBe('image/webp');
    expect(resolveRecipeImageMimeType('recipe.jpg', 'image/png', Uint8Array.from([
      0xff, 0xd8, 0xff, 0xe0,
    ]))).toBe('image/jpeg');
  });

  it('keeps the fixture matrix aligned with every registered kind and version', () => {
    expect(legacyFixtures.map(fixture => `${fixture.kind}:${fixture.version}`)).toEqual(
      LEGACY_WATER_MIGRATIONS.map(migration => `${migration.kind}:${migration.version}`),
    );

    for (const fixture of legacyFixtures) {
      const migration = migrateLegacyWaterPayload(registryPayloadFromFixture(fixture));

      expect(migration?.ions, `${fixture.kind} v${fixture.version}`).toEqual(
        fixture.expectedFinishedIons,
      );
    }
  });

  it('recovers the exact finished readings from the legacy recipe file fixture', () => {
    const result = parseWaterMixerImportText(JSON.stringify(legacyRecipeFixture));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.source.ions).toEqual(legacyRecipeFixture.expectedFinishedIons);
    expect(result.provenance).toContain('Recovered legacy Magnesia baseline');
  });

  it('recovers the exact finished readings from the legacy Mixer file fixture', () => {
    const result = parseWaterMixerImportText(JSON.stringify(legacyMixFixture));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.source.ions).toEqual(legacyMixFixture.expectedFinishedIons);
    expect(result.provenance).toContain('Recovered legacy Magnesia baseline');
  });

  it('does not migrate unsupported versions or same-name custom recipes', () => {
    for (const fixture of legacyFixtures) {
      const unsupported = migrateLegacyWaterPayload(
        registryPayloadFromFixture(fixture, fixture.version + 1),
      );
      expect(unsupported, `${fixture.kind} unsupported version`).toBeNull();
    }

    const customRecipe = {
      ...legacyRecipeFixture,
      salts: {
        ...legacyRecipeFixture.salts,
        mgso4: { ...legacyRecipeFixture.salts.mgso4, target: '5' },
      },
    };
    const customResult = parseWaterMixerImportText(JSON.stringify(customRecipe));

    expect(customResult.kind).toBe('source');
    if (customResult.kind !== 'source') return;
    expect(customResult.provenance).toBe('Legacy recipe · zero-mineral RO estimate');
    expect(customResult.source.ions).toEqual(computeIonTotals({
      mgso4: 5,
      mgcl2: 11.2390986763469,
      nacl: 13.000000000000002,
    }, {}, 1));
  });

  it('imports legacy finished-water readings as a source snapshot', () => {
    const result = parseWaterMixerImportText(JSON.stringify({
      kind: 'coffee-water-recipe',
      version: 1,
      name: 'Legacy finished water',
      ions: { calcium: 42, magnesium: 8, bicarbonate: 30 },
    }));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.source.name).toBe('Legacy finished water');
    expect(result.source.sourceKind).toBe('saved-recipe');
    expect(result.source.ions.calcium).toBe(42);
    expect(result.source.ions.sulfate).toBe(0);
  });

  it('imports final readings embedded in a new recipe-card payload', () => {
    const text = serializeRecipeFile({
      name: 'Current recipe card',
      salts: { mgcl2: { target: '12', formIdx: 0 } },
      finishedWaterIons: { calcium: 35, magnesium: 11, chloride: 28 },
      finishedWaterMetadata: { tds: 91 },
    });

    const result = parseWaterMixerImportText(text);

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.source.ions.magnesium).toBe(11);
    expect(result.source.metadata).toEqual({ tds: 91 });
  });

  it('reads recipe-card PNG metadata before parsing the payload', async () => {
    const text = serializeRecipeFile({
      name: 'Packaged card',
      salts: { nahco3: { target: '5', formIdx: 0 } },
      finishedWaterIons: { bicarbonate: 22 },
    });
    const packaged = embedWaterRecipeJsonInPng(ONE_PIXEL_PNG, text);
    const file = {
      name: 'packaged.WATER.png',
      type: 'image/png',
      arrayBuffer: async () => packaged.buffer,
    } as unknown as File;

    const result = await readWaterMixerImportFile(file);

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.source.name).toBe('Packaged card');
    expect(result.source.ions.bicarbonate).toBe(22);
  });

  it('uses QR first for deterministic PNG, WEBP, and JPEG card imports', async () => {
    const qrPng = await createTwoWaterRecipeCardQrPng();
    const imageBytesByType = {
      png: qrPng,
      webp: Uint8Array.from([
        0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
      ]),
      jpg: Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]),
    } as const;
    const mixerText = serializeWaterMixRecipeFile({
      name: TWO_WATER_RECIPE_CARD_FIXTURE.name,
      sourceA: {
        name: TWO_WATER_RECIPE_CARD_FIXTURE.mineralWaters[0].name,
        sourceKind: 'manual',
        ions: Object.fromEntries(
          Object.entries(TWO_WATER_RECIPE_CARD_FIXTURE.mineralWaters[0].ions)
            .map(([id, value]) => [id, Number(value)]),
        ),
      },
      sourceB: {
        name: TWO_WATER_RECIPE_CARD_FIXTURE.additionWaters[0].name,
        sourceKind: 'manual',
        ions: Object.fromEntries(
          Object.entries(TWO_WATER_RECIPE_CARD_FIXTURE.additionWaters[0].ions)
            .map(([id, value]) => [id, Number(value)]),
        ),
      },
      volumeAMl: Number(TWO_WATER_RECIPE_CARD_FIXTURE.mineralWaters[0].volumeMl),
      volumeBMl: Number(TWO_WATER_RECIPE_CARD_FIXTURE.additionWaters[0].volumeMl),
      finalIons: TWO_WATER_RECIPE_CARD_FIXTURE.finishedIons ?? {},
    });
    const qrReader = vi.spyOn(waterRecipeImage, 'extractWaterRecipeJsonFromQrImage')
      .mockResolvedValue(mixerText);
    const metadataReader = vi.spyOn(waterRecipeImage, 'extractWaterRecipeJsonFromPng');

    try {
      for (const [extension, type] of [
        ['png', 'image/png'],
        ['webp', 'image/webp'],
        ['jpg', 'image/jpeg'],
        ['png', 'image/jpeg'],
      ] as const) {
        const imageBytes = extension === 'png' && type === 'image/jpeg'
          ? qrPng
          : imageBytesByType[extension];
        const file = {
          name: `two-water.WATER.${extension}`,
          type,
          arrayBuffer: async () => imageBytes.buffer,
        } as unknown as File;

        const result = await readWaterMixerImportFile(file);

        expect(qrReader).toHaveBeenLastCalledWith(
          imageBytes.buffer,
          extension === 'png' ? 'image/png' : type,
        );
        expect(result.kind).toBe('source');
        if (result.kind !== 'source') continue;
        expect(result.source.name).toBe(TWO_WATER_RECIPE_CARD_FIXTURE.name);
        expect(result.source.ions).toMatchObject(TWO_WATER_RECIPE_CARD_FIXTURE.finishedIons);
      }

      expect(metadataReader).not.toHaveBeenCalled();
      expect(qrReader).toHaveBeenCalledTimes(4);
      expect(TWO_WATER_RECIPE_CARD_QR_TEXT).toContain(TWO_WATER_RECIPE_CARD_SHARE_TOKEN);
    } finally {
      qrReader.mockRestore();
      metadataReader.mockRestore();
    }
  });

  it('applies the complete share-token QR through the direct Mixer upload boundary', async () => {
    const qrPng = await createTwoWaterRecipeCardQrPng();
    const qrReader = vi.spyOn(waterRecipeImage, 'extractWaterRecipeJsonFromQrImage')
      .mockResolvedValue(TWO_WATER_RECIPE_CARD_SHARE_TOKEN);
    const metadataReader = vi.spyOn(waterRecipeImage, 'extractWaterRecipeJsonFromPng');
    const file = {
      name: 'two-water.WATER.png',
      type: 'image/png',
      arrayBuffer: async () => qrPng.buffer,
    } as unknown as File;

    try {
      // Share-token decoding belongs here, beside QR/image decoding. The
      // Mixer UI should receive one complete recipe instead of reimplementing
      // token parsing and losing the second source water.
      const result = await readWaterMixerImportFile(file);

      expect(qrReader).toHaveBeenCalledWith(qrPng.buffer, 'image/png');
      expect(metadataReader).not.toHaveBeenCalled();
      expect(result.kind).toBe('recipe');
      if (result.kind !== 'recipe') return;

      expect(result.recipe.name).toBe(TWO_WATER_RECIPE_CARD_FIXTURE.name);
      expect(result.recipe.sourceA.name).toBe('North spring');
      expect(result.recipe.sourceB.name).toBe('South spring');
      expect(result.recipe.sourceA.ions).toMatchObject(
        Object.fromEntries(Object.entries(TWO_WATER_RECIPE_CARD_FIXTURE.mineralWaters[0].ions)
          .map(([id, value]) => [id, Number(value)])),
      );
      expect(result.recipe.sourceB.ions).toMatchObject(
        Object.fromEntries(Object.entries(TWO_WATER_RECIPE_CARD_FIXTURE.additionWaters[0].ions)
          .map(([id, value]) => [id, Number(value)])),
      );
      expect(result.recipe.volumeAMl).toBe(640);
      expect(result.recipe.volumeBMl).toBe(360);
      expect(result.recipe.formIdxBySaltId).toMatchObject({
        mgso4: 0,
        mgcl2: 1,
      });
      expect(result.recipe.finalIons).toMatchObject(TWO_WATER_RECIPE_CARD_FIXTURE.finishedIons);
    } finally {
      qrReader.mockRestore();
      metadataReader.mockRestore();
    }
  });

  it('reopens a Mixer recipe card as a finished-water snapshot', () => {
    const result = parseWaterMixerImportText(serializeWaterMixRecipeFile({
      name: 'Bright blend',
      sourceA: {
        name: 'Water A',
        sourceKind: 'saved-recipe',
        ions: { calcium: 30, magnesium: 5 },
      },
      sourceB: {
        name: 'Water B',
        sourceKind: 'manual',
        ions: { calcium: 10, bicarbonate: 40 },
      },
      volumeAMl: 300,
      volumeBMl: 200,
      finalIons: { calcium: 22, magnesium: 3, bicarbonate: 16 },
      finalMetadata: { tds: 44 },
    }));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.provenance).toBe('Mixer blend snapshot');
    expect(result.source.name).toBe('Bright blend');
    expect(result.source.ions).toMatchObject({ calcium: 22, magnesium: 3, bicarbonate: 16 });
    expect(result.source.metadata).toEqual({ tds: 44 });
  });

  it('repairs a legacy salt-only Mixer snapshot through the versioned registry', () => {
    const saltOnly = computeIonTotals({
      mgso4: 4.883476553307854,
      mgcl2: 11.2390986763469,
      nacl: 13,
    }, {}, 1);
    const result = parseWaterMixerImportText(serializeWaterMixRecipeFile({
      name: 'Magnesia (MgCl₂ MgSO₄ NaCl)',
      sourceA: {
        name: 'Water A',
        sourceKind: 'saved-recipe',
        ions: {},
      },
      sourceB: {
        name: 'Water B',
        sourceKind: 'manual',
        ions: {},
      },
      volumeAMl: 500,
      volumeBMl: 500,
      finalIons: saltOnly,
    }));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.provenance).toContain('Recovered legacy Magnesia baseline');
    expect(result.source.ions.calcium).toBeCloseTo(0.4284, 4);
    expect(result.source.ions.bicarbonate).toBeCloseTo(11.4, 4);
  });

  it('imports legacy salt-only recipes over a zero-mineral RO baseline', () => {
    const result = parseWaterMixerImportText(serializeRecipeFile({
      name: 'Salt only',
      salts: { mgso4: { target: '10', formIdx: 0 } },
    }));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.provenance).toBe('Legacy recipe · zero-mineral RO estimate');
    expect(result.source.name).toBe('Salt only');
    expect(result.source.ions).toEqual(computeIonTotals({ mgso4: 10 }, {}, 1));
    expect(result.source.metadata).toBeUndefined();
  });

  it('imports legacy recipe-card PNGs using the RO fallback', async () => {
    const text = serializeRecipeFile({
      name: 'Legacy packaged card',
      salts: {
        mgcl2: { target: '2.341478890905603', formIdx: 1 },
        nacl: { target: '12.000000000000004', formIdx: 0 },
      },
    });
    const packaged = embedWaterRecipeJsonInPng(ONE_PIXEL_PNG, text);
    const file = {
      name: 'legacy.WATER.png',
      type: 'image/png',
      arrayBuffer: async () => packaged.buffer,
    } as unknown as File;

    const result = await readWaterMixerImportFile(file);

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.provenance).toBe('Legacy recipe · zero-mineral RO estimate');
    expect(result.source.ions).toEqual(computeIonTotals({
      mgcl2: 2.341478890905603,
      nacl: 12.000000000000004,
    }, {}, 1));
  });

  it('recovers the published Magnesia baseline for its older salt-only card', () => {
    const result = parseWaterMixerImportText(JSON.stringify({
      kind: 'coffee-water-recipe',
      version: 1,
      name: 'Magnesia (MgCl₂ MgSO₄ NaCl)',
      salts: {
        mgso4: { target: '4.883476553307854', formIdx: 1 },
        mgcl2: { target: '11.2390986763469', formIdx: 1 },
        nacl: { target: '13.000000000000002', formIdx: 0 },
      },
    }));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.provenance).toContain('Recovered legacy Magnesia baseline');
    expect(result.source.ions.calcium).toBeCloseTo(0.4284, 4);
    expect(result.source.ions.magnesium).toBeCloseTo(5.91935, 4);
    expect(result.source.ions.sodium).toBeCloseTo(5.17653, 4);
    expect(result.source.ions.bicarbonate).toBeCloseTo(11.4, 4);
  });

  it('imports Watermancer profile payloads using their ion snapshot', () => {
    const result = parseWaterMixerImportText(JSON.stringify({
      kind: 'coffee-water-recipe',
      version: 1,
      name: 'Target profile',
      ions: { calcium: 40, magnesium: 8, bicarbonate: 22 },
      profile: { name: 'Safe', source: 'Watermancer', targets: { calcium: 40 } },
    }));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.provenance).toBe('Imported Watermancer profile snapshot');
    expect(result.source.ions).toMatchObject({ calcium: 40, magnesium: 8, bicarbonate: 22 });
  });

  it('rejects recipe-card PNGs without embedded readings', async () => {
    const file = {
      name: 'plain.png',
      type: 'image/avif',
      arrayBuffer: async () => ONE_PIXEL_PNG.buffer,
    } as unknown as File;

    const result = await readWaterMixerImportFile(file);

    expect(result).toEqual({
      kind: 'error',
      message: 'That PNG does not contain embedded recipe readings for the Mixer.',
    });
  });
});
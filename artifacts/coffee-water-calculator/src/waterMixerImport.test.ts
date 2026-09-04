import { describe, expect, it } from 'vitest';
import { embedWaterRecipeJsonInPng } from './waterRecipeImage';
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
      type: 'image/png',
      arrayBuffer: async () => ONE_PIXEL_PNG.buffer,
    } as unknown as File;

    const result = await readWaterMixerImportFile(file);

    expect(result).toEqual({
      kind: 'error',
      message: 'That PNG does not contain embedded recipe readings for the Mixer.',
    });
  });
});
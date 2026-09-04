import { describe, expect, it, beforeEach } from 'vitest';
import { ACTIVE_ION_IDS, computeIonTotals } from '@/waterData';
import {
  calculateWaterMix,
  createWaterMixRecipe,
  dedupeWaterMixSourceSnapshots,
  isValidWaterMixRecipe,
  loadImportedWaterMixSources,
  loadWaterMixRecipes,
  normalizeWaterMixSourceSnapshot,
  saveImportedWaterMixSources,
  saveWaterMixRecipes,
  serializeWaterMixRecipeFile,
  type WaterMixSourceSnapshot,
} from './waterMixer';

import { migrateLegacyWaterPayload } from './legacyWaterRecovery';
import legacyPlanFixture from './fixtures/legacy-water/coffee-water-plan-v1.json';
import legacyProfileFixture from './fixtures/legacy-water/watermancer-profile-v1.json';
import legacySourceFixture from './fixtures/legacy-water/coffee-water-mix-source-v1.json';
import legacyMixFixture from './fixtures/legacy-water/coffee-water-mix-v1.json';

const source = (name: string, values: Partial<Record<(typeof ACTIVE_ION_IDS)[number], number>>, sourceKind: WaterMixSourceSnapshot['sourceKind'] = 'manual'): WaterMixSourceSnapshot =>
  normalizeWaterMixSourceSnapshot({ name, sourceKind, ions: values });

describe('water mixer calculation', () => {
  it('averages each ion at equal volumes', () => {
    const result = calculateWaterMix({
      sourceA: source('A', { calcium: 10, magnesium: 4, bicarbonate: 20 }),
      sourceB: source('B', { calcium: 30, magnesium: 8, bicarbonate: 40 }),
      volumeAMl: 250,
      volumeBMl: 250,
    });
    expect(result.valid).toBe(true);
    expect(result.finalIons.calcium).toBe(20);
    expect(result.finalIons.magnesium).toBe(6);
    expect(result.finalIons.bicarbonate).toBe(30);
    expect(result.totalVolumeMl).toBe(500);
  });

  it('weights the result toward the larger source', () => {
    const result = calculateWaterMix({
      sourceA: source('A', { calcium: 0 }),
      sourceB: source('B', { calcium: 50 }),
      volumeAMl: 100,
      volumeBMl: 400,
    });
    expect(result.finalIons.calcium).toBe(40);
    expect(result.percentageB).toBe(80);
  });

  it('leaves the non-zero-volume source unchanged when the other is zero', () => {
    const result = calculateWaterMix({
      sourceA: source('A', { calcium: 44, bicarbonate: 12 }),
      sourceB: source('B', { calcium: 900, bicarbonate: 900 }),
      volumeAMl: 700,
      volumeBMl: 0,
    });
    expect(result.valid).toBe(true);
    expect(result.finalIons.calcium).toBe(44);
    expect(result.finalIons.bicarbonate).toBe(12);
  });

  it('keeps zero-valued ions meaningful and rejects zero total volume', () => {
    const result = calculateWaterMix({
      sourceA: source('A', { calcium: 0 }),
      sourceB: source('B', { calcium: 0 }),
      volumeAMl: 0,
      volumeBMl: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.finalIons.calcium).toBe(0);
    expect(result.errors.some(error => error.code === 'zero-total-volume')).toBe(true);
  });

  it('rejects negative, non-finite, and incomplete values without stale readings', () => {
    const result = calculateWaterMix({
      sourceA: source('A', { calcium: 20 }),
      sourceB: source('B', { calcium: 30 }),
      volumeAMl: -1,
      volumeBMl: Number.NaN,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map(error => error.code)).toEqual(expect.arrayContaining(['negative-volume', 'invalid-volume']));
  });

  it('derives GH, KH, modeled TDS, and keeps reported TDS distinct', () => {
    const result = calculateWaterMix({
      sourceA: { ...source('A', { calcium: 10, bicarbonate: 20 }), metadata: { tds: 40 } },
      sourceB: { ...source('B', { calcium: 30, bicarbonate: 40 }), metadata: { tds: 80 } },
      volumeAMl: 100,
      volumeBMl: 300,
    });
    expect(result.gh).toBeCloseTo(10 * 2.497 * 0.25 + 30 * 2.497 * 0.75);
    expect(result.kh).toBeCloseTo(20 * 0.82 * 0.25 + 40 * 0.82 * 0.75);
    expect(result.tds).toBe(60);
    expect(result.reportedTds).toBe(70);
    expect(result.finalMetadata?.tds).toBe(70);
  });

  it('derives the live GH:KH ratio from the final blended readings', () => {
    const result = calculateWaterMix({
      sourceA: source('A', { calcium: 10, bicarbonate: 20 }),
      sourceB: source('B', { calcium: 30, bicarbonate: 40 }),
      volumeAMl: 100,
      volumeBMl: 300,
    });

    expect(result.ghKhRatio).toBeCloseTo(result.gh / result.kh);
  });

  it('leaves the GH:KH ratio undefined when KH is zero', () => {
    const result = calculateWaterMix({
      sourceA: source('A', { calcium: 10 }),
      sourceB: source('B', { magnesium: 4 }),
      volumeAMl: 100,
      volumeBMl: 100,
    });

    expect(result.kh).toBe(0);
    expect(result.ghKhRatio).toBeNull();
  });

  it('adds final-batch salt ions after volume-weighting the sources', () => {
    const result = calculateWaterMix({
      sourceA: source('A', { calcium: 10 }),
      sourceB: source('B', { calcium: 30 }),
      volumeAMl: 100,
      volumeBMl: 300,
      saltTargets: { nacl: 10 },
    });

    expect(result.finalIons.calcium).toBe(25);
    expect(result.finalIons.sodium).toBeCloseTo(10 * (22.99 / 58.44));
    expect(result.finalIons.chloride).toBeCloseTo(10 * (35.45 / 58.44));
    expect(result.tds).toBeCloseTo(
      25 + 10 * ((22.99 + 35.45) / 58.44),
    );
  });
});

describe('water mixer persistence', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    });
  });

  it('round-trips a finished source snapshot and rejects blank names', () => {
    const input = {
      sourceA: source('Saved A', { calcium: 15 }, 'saved-recipe'),
      sourceB: source('Database B', { magnesium: 5 }, 'database'),
      volumeAMl: 200,
      volumeBMl: 300,
    };
    const recipe = createWaterMixRecipe('  Quiet blend  ', input);
    expect(recipe).not.toBeNull();
    expect(createWaterMixRecipe('   ', input)).toBeNull();
    saveWaterMixRecipes([recipe!]);
    const loaded = loadWaterMixRecipes();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].sourceA.sourceKind).toBe('saved-recipe');
    expect(loaded[0].sourceB.ions.magnesium).toBe(5);
    expect(isValidWaterMixRecipe(loaded[0])).toBe(true);
  });

  it('persists Mixer salt targets and hydration forms in saved recipes and exports', () => {
    const input = {
      sourceA: source('Saved A', { calcium: 15 }, 'saved-recipe'),
      sourceB: source('Database B', { magnesium: 5 }, 'database'),
      volumeAMl: 200,
      volumeBMl: 300,
      saltTargets: { mgso4: 12.5, nacl: 4 },
      formIdxBySaltId: { mgso4: 0, nacl: 0 },
    };
    const recipe = createWaterMixRecipe('Salt-tuned blend', input);
    expect(recipe?.saltTargets).toEqual(input.saltTargets);
    expect(recipe?.formIdxBySaltId).toEqual(input.formIdxBySaltId);
    saveWaterMixRecipes([recipe!]);
    const loaded = loadWaterMixRecipes()[0];
    expect(loaded.saltTargets).toEqual(input.saltTargets);
    expect(loaded.formIdxBySaltId).toEqual(input.formIdxBySaltId);

    const exported = JSON.parse(serializeWaterMixRecipeFile({
      name: recipe!.name,
      sourceA: recipe!.sourceA,
      sourceB: recipe!.sourceB,
      volumeAMl: recipe!.volumeAMl,
      volumeBMl: recipe!.volumeBMl,
      finalIons: recipe!.finalIons,
      saltTargets: recipe!.saltTargets,
      formIdxBySaltId: recipe!.formIdxBySaltId,
    })) as Record<string, unknown>;
    expect(exported.saltTargets).toEqual(input.saltTargets);
    expect(exported.formIdxBySaltId).toEqual(input.formIdxBySaltId);
  });

  it('skips malformed records', () => {
    localStorage.setItem('cwm.waterMixerRecipes', JSON.stringify([{ id: 'bad', name: '' }]));
    expect(loadWaterMixRecipes()).toEqual([]);
  });

  it('persists imported finished-water sources for future Mixer sessions', () => {
    const imported = {
      ...source('Imported mineral card', { calcium: 18 }, 'saved-recipe'),
      sourceId: 'imported-card-1',
      provenance: 'Mixer blend snapshot',
    };

    saveImportedWaterMixSources([imported]);

    expect(loadImportedWaterMixSources()).toEqual([imported]);
  });

  it('collapses repeated imports with different transient ids', () => {
    const first = {
      ...source('Magnesia (MgCl2 MgSO4 NaCl)', { calcium: 0.4, bicarbonate: 11.4 }, 'saved-recipe'),
      sourceId: 'imported-card-a',
    };
    const repeated = {
      ...first,
      sourceId: 'imported-card-b',
    };

    saveImportedWaterMixSources([first, repeated]);

    expect(loadImportedWaterMixSources()).toEqual([first]);
  });

  it('keeps same-name sources when their ion snapshots differ', () => {
    const low = source('Magnesia', { calcium: 0.4, bicarbonate: 11.4 }, 'saved-recipe');
    const high = source('Magnesia', { calcium: 35.7, bicarbonate: 950 }, 'database');

    expect(dedupeWaterMixSourceSnapshots([low, high])).toEqual([low, high]);
  });

  it('migrates an already-stored salt-only Magnesia snapshot on load', () => {
    const saltOnly = computeIonTotals({
      mgso4: 4.883476553307854,
      mgcl2: 11.2390986763469,
      nacl: 13,
    }, {}, 1);
    saveImportedWaterMixSources([
      {
        ...source('Magnesia (MgCl₂ MgSO₄ NaCl)', saltOnly, 'saved-recipe'),
        sourceId: 'legacy-magnesia',
      },
    ]);

    const migrated = loadImportedWaterMixSources();
    expect(migrated[0]?.ions.calcium).toBeCloseTo(0.4284, 4);
    expect(migrated[0]?.ions.bicarbonate).toBeCloseTo(11.4, 4);
  });

  it('recovers exact finished readings for saved plan and profile payloads', () => {
    const planMigration = migrateLegacyWaterPayload({
      kind: legacyPlanFixture.kind,
      version: legacyPlanFixture.version,
      name: legacyPlanFixture.name,
      saltTargets: legacyPlanFixture.saltTargets,
    });
    const profileMigration = migrateLegacyWaterPayload({
      kind: legacyProfileFixture.kind,
      version: legacyProfileFixture.version,
      name: legacyProfileFixture.name,
      ions: legacyProfileFixture.ions,
    });

    expect(planMigration?.ions).toEqual(legacyPlanFixture.expectedFinishedIons);
    expect(profileMigration?.ions).toEqual(legacyProfileFixture.expectedFinishedIons);
  });

  it('recovers exact finished readings for saved source and Mixer snapshots', () => {
    const sourceMigration = migrateLegacyWaterPayload({
      kind: legacySourceFixture.kind,
      version: legacySourceFixture.version,
      name: legacySourceFixture.name,
      ions: legacySourceFixture.ions,
    });
    const mixMigration = migrateLegacyWaterPayload({
      kind: legacyMixFixture.kind,
      version: legacyMixFixture.version,
      name: legacyMixFixture.name,
      ions: legacyMixFixture.finalIons,
    });

    expect(sourceMigration?.ions).toEqual(legacySourceFixture.expectedFinishedIons);
    expect(mixMigration?.ions).toEqual(legacyMixFixture.expectedFinishedIons);
  });

  it('migrates stored Mixer recipes, including their source snapshots', () => {
    const saltOnly = computeIonTotals({
      mgso4: 4.883476553307854,
      mgcl2: 11.2390986763469,
      nacl: 13,
    }, {}, 1);
    localStorage.setItem('cwm.waterMixerRecipes', JSON.stringify([{
      id: 'legacy-mixer-recipe',
      name: 'Magnesia (MgCl₂ MgSO₄ NaCl)',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      sourceA: source('Magnesia (MgCl₂ MgSO₄ NaCl)', saltOnly, 'saved-recipe'),
      sourceB: source('RO', {}, 'manual'),
      volumeAMl: 500,
      volumeBMl: 500,
      finalIons: saltOnly,
    }]));

    const migrated = loadWaterMixRecipes()[0];
    expect(migrated.finalIons.calcium).toBeCloseTo(0.4284, 4);
    expect(migrated.sourceA.ions.bicarbonate).toBeCloseTo(11.4, 4);
  });

  it('migrates the representative stored Mixer fixture without changing its shape', () => {
    localStorage.setItem('cwm.waterMixerRecipes', JSON.stringify([legacyMixFixture]));

    const migrated = loadWaterMixRecipes()[0];
    expect(migrated).toMatchObject({
      id: legacyMixFixture.id,
      name: legacyMixFixture.name,
      volumeAMl: legacyMixFixture.volumeAMl,
      volumeBMl: legacyMixFixture.volumeBMl,
    });
    expect(migrated.finalIons).toEqual(legacyMixFixture.expectedFinishedIons);
    expect(migrated.sourceA.ions).toEqual(legacyMixFixture.expectedFinishedIons);
  });

  it('does not repair a merely similar name or an unrelated ion snapshot', () => {
    const saltOnly = computeIonTotals({
      mgso4: 4.883476553307854,
      mgcl2: 11.2390986763469,
      nacl: 13,
    }, {}, 1);
    const similar = source('Magnesia custom', saltOnly, 'saved-recipe');

    saveImportedWaterMixSources([similar]);

    expect(loadImportedWaterMixSources()[0]).toEqual(similar);
  });
});
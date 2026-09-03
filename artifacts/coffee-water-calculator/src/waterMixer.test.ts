import { describe, expect, it, beforeEach } from 'vitest';
import { ACTIVE_ION_IDS } from '@/waterData';
import {
  calculateWaterMix,
  createWaterMixRecipe,
  isValidWaterMixRecipe,
  loadImportedWaterMixSources,
  loadWaterMixRecipes,
  normalizeWaterMixSourceSnapshot,
  saveImportedWaterMixSources,
  saveWaterMixRecipes,
  type WaterMixSourceSnapshot,
} from './waterMixer';

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
});
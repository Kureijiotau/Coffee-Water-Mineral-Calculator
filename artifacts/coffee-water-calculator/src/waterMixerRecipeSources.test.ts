import { describe, expect, it } from 'vitest';
import { saltRecipeToWaterMixerSource } from './waterMixerRecipeSources';
import type { SaltRecipe } from './waterData';

describe('salt recipe Mixer sources', () => {
  it('prefers saved finished-water readings when a recipe has them', () => {
    const recipe: SaltRecipe = {
      id: 'finished-example',
      name: 'Finished example',
      salts: {},
      finishedWaterIons: { calcium: 31 },
      sourceWaters: {
        liters: '1',
        volumeUnit: 'liters',
        mineralWaters: [{
          name: 'Base',
          ions: { calcium: '12' },
          metadata: {},
          volumeMl: '1000',
        }],
        additionWaters: [],
      },
    };

    const result = saltRecipeToWaterMixerSource(recipe, 'alchemist');

    expect(result.ions.calcium).toBe(31);
    expect(result.group).toBe('alchemist');
    expect(result.sourceKind).toBe('saved-recipe');
  });

  it('calculates ions from stored source waters and salt targets when no finished readings exist', () => {
    const recipe: SaltRecipe = {
      id: 'derived-example',
      name: 'Derived example',
      salts: { nahco3: { target: '10', formIdx: 0 } },
      sourceWaters: {
        liters: '1',
        volumeUnit: 'liters',
        mineralWaters: [{
          name: 'Base',
          ions: { calcium: '12' },
          metadata: {},
          volumeMl: '1000',
        }],
        additionWaters: [],
      },
    };

    const result = saltRecipeToWaterMixerSource(recipe, 'alchemist');

    expect(result.ions.calcium).toBe(12);
    expect(result.ions.sodium).toBeGreaterThan(0);
    expect(result.provenance).toContain('calculated from source waters and salts');
  });

  it('calculates salt-only recipes against a zero-mineral baseline', () => {
    const recipe: SaltRecipe = {
      id: 'salt-only-example',
      name: 'Salt-only example',
      salts: { nacl: { target: '10', formIdx: 0 } },
    };

    const result = saltRecipeToWaterMixerSource(recipe, 'built-in');

    expect(result.ions.sodium).toBeGreaterThan(0);
    expect(result.group).toBe('built-in');
    expect(result.provenance).toContain('zero-mineral baseline');
  });
});
import { describe, expect, it } from 'vitest';
import {
  positiveSaltIdsFromRows,
  restoreRecipeSaltRows,
} from './App';
import { recipeCardIonTargets, recipeCardSaltRecipe } from './recipeCardReader';
import { parseRecipeFile, serializeRecipeFile } from './recipes';
import { createWatermancerProfile } from './watermancerProfiles';
import { SALTS } from './waterData';

describe('Watermancer recipe-card imports', () => {
  it('restores source-water volumes, positive salt selection, targets, and hydration forms together', () => {
    const recipe = parseRecipeFile(serializeRecipeFile({
      name: 'Spring balance',
      salts: {
        mgso4: { target: '12.5', formIdx: 1 },
        nacl: { target: '4', formIdx: 0 },
        cacl2: { target: '0', formIdx: 0 },
      },
      finishedWaterIons: { calcium: 20, magnesium: 12 },
      sourceWaters: {
        liters: '1.25',
        volumeUnit: 'liters',
        mineralWaters: [{
          name: 'Spring source',
          ions: { calcium: '24', magnesium: '3' },
          metadata: { tds: '80' },
          volumeMl: '900',
        }],
        additionWaters: [{
          name: 'RO',
          ions: {},
          metadata: {},
          volumeMl: '350',
        }],
      },
    }));

    expect(recipe).not.toBeNull();
    if (!recipe) return;

    const rows = restoreRecipeSaltRows(recipe);

    expect(recipe.sourceWaters?.liters).toBe('1.25');
    expect(recipe.sourceWaters?.mineralWaters[0]?.volumeMl).toBe('900');
    expect(recipe.sourceWaters?.additionWaters[0]?.volumeMl).toBe('350');
    expect(positiveSaltIdsFromRows(rows)).toEqual(['mgso4', 'nacl']);
    expect(rows[SALTS.findIndex(salt => salt.id === 'mgso4')]).toEqual({
      target: '12.5',
      formIdx: 1,
    });
    expect(rows[SALTS.findIndex(salt => salt.id === 'nacl')]).toEqual({
      target: '4',
      formIdx: 0,
    });
    expect(rows[SALTS.findIndex(salt => salt.id === 'cacl2')]).toMatchObject({
      target: '0',
    });
  });

  it('applies explicit scan rows while a final-ion-only scan leaves salt inventory unchanged', () => {
    const initialUsedSaltIds = ['nacl', 'cacl2'];
    const explicitScan = {
      name: 'Scanned spring balance',
      finalIons: { calcium: 24, magnesium: 9, sodium: 4, chloride: 8 },
      salts: [
        { saltId: 'mgso4', targetPpm: 11, formLabel: 'Heptahydrate' },
        { saltId: 'nacl', targetPpm: 3.5, formLabel: 'Sodium chloride' },
      ],
    };
    const explicitRecipe = recipeCardSaltRecipe(explicitScan);

    expect(explicitRecipe).not.toBeNull();
    if (!explicitRecipe) return;
    expect(positiveSaltIdsFromRows(restoreRecipeSaltRows(explicitRecipe))).toEqual(['mgso4', 'nacl']);
    expect(explicitRecipe.salts).toMatchObject({
      mgso4: { target: '11', formIdx: 1 },
      nacl: { target: '3.5', formIdx: 0 },
    });

    const finalIonOnlyScan = {
      name: 'Final readings only',
      finalIons: { calcium: 31, magnesium: 7, sodium: 2, chloride: 5 },
    };
    const finalIonOnlyRecipe = recipeCardSaltRecipe(finalIonOnlyScan);

    expect(finalIonOnlyRecipe).toBeNull();
    expect(initialUsedSaltIds).toEqual(['nacl', 'cacl2']);
  });

  it('imports final ion readings as the Watermancer target profile without salt rows', () => {
    const finalIons = {
      calcium: 31,
      magnesium: 7,
      sodium: 2,
      chloride: 5,
      sulfate: 9,
      bicarbonate: 24,
    };
    const targets = recipeCardIonTargets(finalIons);
    const profile = createWatermancerProfile('Final readings only', targets);

    expect(targets).toEqual(finalIons);
    expect(profile.targets).toMatchObject(finalIons);
    expect(profile.targets).toMatchObject({
      potassium: 0,
      citrates: 0,
    });
  });
});
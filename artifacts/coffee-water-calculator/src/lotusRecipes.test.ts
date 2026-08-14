import { describe, expect, it } from 'vitest';
import { LOTUS_RECIPES, lotusIonTargets } from './lotusRecipes';

describe('Lotus Coffee Products recipes', () => {
  it('includes every named preset from the published instructions page', () => {
    expect(LOTUS_RECIPES.map(recipe => recipe.name)).toEqual([
      'Light and Bright',
      'Simple and Sweet',
      'Light and Bright (espresso)',
      'Simple and Sweet (espresso)',
      'Bright and Juicy',
      "Rao's Recipe",
      'Ultra Light',
    ]);
    expect(LOTUS_RECIPES.every(recipe => recipe.sourceUrl.includes('lotuscoffeeproducts.com/pages/product-instructions'))).toBe(true);
  });

  it('matches Lotus final-ion conversion for Simple and Sweet', () => {
    const targets = lotusIonTargets({
      magnesium: 30,
      calcium: 60,
      potassium: 15,
      sodium: 25,
    });

    expect(targets.magnesium).toBeCloseTo(7.2915, 6);
    expect(targets.calcium).toBeCloseTo(24.0468, 6);
    expect(targets.potassium).toBeCloseTo(11.72949, 6);
    expect(targets.sodium).toBeCloseTo(11.4945, 6);
    expect(targets.chloride).toBeCloseTo(63.8154, 6);
    expect(targets.bicarbonate).toBeCloseTo(48.8128, 6);
  });

  it('stores complete six-ion targets for every preset', () => {
    for (const recipe of LOTUS_RECIPES) {
      expect(Object.keys(recipe.ionTargets).sort()).toEqual([
        'bicarbonate',
        'calcium',
        'chloride',
        'magnesium',
        'potassium',
        'sodium',
      ]);
    }
  });
});
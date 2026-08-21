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

  it('matches Lotus rounded final-ion table for Simple and Sweet', () => {
    const targets = lotusIonTargets({
      magnesium: 30,
      calcium: 60,
      potassium: 15,
      sodium: 25,
    });

    expect(targets).toEqual({
      magnesium: 7,
      calcium: 24,
      potassium: 12,
      sodium: 11,
      chloride: 64,
      bicarbonate: 49,
    });
  });

  it("matches the published Rao's Recipe ion table", () => {
    const rao = LOTUS_RECIPES.find(recipe => recipe.id === 'lotus-raos-recipe');

    expect(rao?.ionTargets).toEqual({
      magnesium: 8,
      calcium: 16,
      potassium: 6,
      sodium: 6,
      chloride: 51,
      bicarbonate: 25,
    });
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
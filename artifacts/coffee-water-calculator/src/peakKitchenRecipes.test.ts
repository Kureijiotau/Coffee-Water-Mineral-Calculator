import { describe, expect, it } from 'vitest';
import { SALTS, computeSaltMg } from './waterData';
import {
  getPeakKitchenSilicaTargetPpm,
  PEAK_KITCHEN_RECIPE_PICKER_GROUP,
  PEAK_KITCHEN_SALT_RECIPES,
} from './peakKitchenRecipes';
import { watermancerSilicaDropsForTarget } from './watermancerSilica';

const expectedRecipeNames = ['Club Soda', 'Jelly', 'Lily', 'Conflate'];

const expectedSaltMasses: Record<string, Record<string, { mg: number; formIdx: number; shownTarget: number }>> = {
  'peak-kitchen-club-soda': {
    mgcl2: { mg: 3300, formIdx: 1, shownTarget: 1545 },
    cacl2: { mg: 770, formIdx: 1, shownTarget: 581 },
    nacl: { mg: 440, formIdx: 0, shownTarget: 440 },
    nahco3: { mg: 150, formIdx: 0, shownTarget: 150 },
    khco3: { mg: 110, formIdx: 0, shownTarget: 110 },
  },
  'peak-kitchen-jelly': {
    mgcl2: { mg: 1750, formIdx: 1, shownTarget: 820 },
    cacl2: { mg: 890, formIdx: 1, shownTarget: 672 },
    kcl: { mg: 560, formIdx: 0, shownTarget: 560 },
    khco3: { mg: 250, formIdx: 0, shownTarget: 250 },
    nahco3: { mg: 230, formIdx: 0, shownTarget: 230 },
  },
  'peak-kitchen-lily': {
    mgso4: { mg: 2200, formIdx: 1, shownTarget: 1074 },
    mgcl2: { mg: 1300, formIdx: 1, shownTarget: 609 },
    kcl: { mg: 630, formIdx: 0, shownTarget: 630 },
    khco3: { mg: 300, formIdx: 0, shownTarget: 300 },
    nahco3: { mg: 250, formIdx: 0, shownTarget: 250 },
    nacl: { mg: 100, formIdx: 0, shownTarget: 100 },
  },
  'peak-kitchen-conflate': {
    cacl2: { mg: 1050, formIdx: 1, shownTarget: 793 },
    kcl: { mg: 700, formIdx: 0, shownTarget: 700 },
    nacl: { mg: 600, formIdx: 0, shownTarget: 600 },
    khco3: { mg: 200, formIdx: 0, shownTarget: 200 },
    nahco3: { mg: 150, formIdx: 0, shownTarget: 150 },
  },
};

describe('PeakKitchen built-in recipes', () => {
  it('exposes the four renamed recipes in the requested order', () => {
    expect(PEAK_KITCHEN_SALT_RECIPES.map(recipe => recipe.name)).toEqual(expectedRecipeNames);
    expect(PEAK_KITCHEN_SALT_RECIPES.map(recipe => recipe.id)).toEqual(Object.keys(expectedSaltMasses));
  });

  it('loads the photographed forms and reproduces each physical salt mass at 1 L', () => {
    for (const recipe of PEAK_KITCHEN_SALT_RECIPES) {
      const expectedSalts = expectedSaltMasses[recipe.id];
      expect(Object.keys(recipe.salts).sort()).toEqual(Object.keys(expectedSalts).sort());

      for (const [saltId, expected] of Object.entries(expectedSalts)) {
        const salt = SALTS.find(item => item.id === saltId)!;
        const entry = recipe.salts[saltId];
        expect(entry.formIdx).toBe(expected.formIdx);
        expect(Number(entry.target)).toBeCloseTo(expected.shownTarget, 0);
        const selectedForm = salt.hydrationForms[entry.formIdx];
        const physicalMassMg = computeSaltMg(
          Number(entry.target),
          1,
          selectedForm.molarMass,
          salt.anhydrousMass,
        );
        expect(physicalMassMg).toBeCloseTo(expected.mg, 6);
      }
    }
  });

  it('exposes the exact four recipe options under PeakKitchen', () => {
    expect(PEAK_KITCHEN_RECIPE_PICKER_GROUP.label).toBe('PeakKitchen');
    expect(PEAK_KITCHEN_RECIPE_PICKER_GROUP.options).toEqual([
      { value: 'recipe:peak-kitchen-club-soda', label: 'Club Soda' },
      { value: 'recipe:peak-kitchen-jelly', label: 'Jelly' },
      { value: 'recipe:peak-kitchen-lily', label: 'Lily' },
      { value: 'recipe:peak-kitchen-conflate', label: 'Conflate' },
    ]);
  });

  it('sets only Conflate to 250 ppm silica and scales its drops by batch volume', () => {
    expect(getPeakKitchenSilicaTargetPpm('peak-kitchen-conflate')).toBe(250);
    expect(getPeakKitchenSilicaTargetPpm('peak-kitchen-club-soda')).toBeUndefined();
    expect(getPeakKitchenSilicaTargetPpm('peak-kitchen-jelly')).toBeUndefined();
    expect(getPeakKitchenSilicaTargetPpm('peak-kitchen-lily')).toBeUndefined();
    expect(watermancerSilicaDropsForTarget(250, 0.5)).toBe(10);
    expect(watermancerSilicaDropsForTarget(250, 1)).toBe(20);
  });
});

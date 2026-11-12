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
    mgcl2: { mg: 3288, formIdx: 1, shownTarget: 1540 },
    cacl2: { mg: 768, formIdx: 1, shownTarget: 580 },
    nacl: { mg: 400, formIdx: 0, shownTarget: 400 },
    nahco3: { mg: 200, formIdx: 0, shownTarget: 200 },
    khco3: { mg: 110, formIdx: 0, shownTarget: 110 },
  },
  'peak-kitchen-jelly': {
    mgcl2: { mg: 1751, formIdx: 1, shownTarget: 820 },
    cacl2: { mg: 888, formIdx: 1, shownTarget: 670 },
    kcl: { mg: 500, formIdx: 0, shownTarget: 500 },
    khco3: { mg: 350, formIdx: 0, shownTarget: 350 },
    nahco3: { mg: 230, formIdx: 0, shownTarget: 230 },
  },
  'peak-kitchen-lily': {
    mgso4: { mg: 2212, formIdx: 1, shownTarget: 1080 },
    mgcl2: { mg: 1281, formIdx: 1, shownTarget: 600 },
    kcl: { mg: 570, formIdx: 0, shownTarget: 570 },
    khco3: { mg: 380, formIdx: 0, shownTarget: 380 },
    nahco3: { mg: 250, formIdx: 0, shownTarget: 250 },
    nacl: { mg: 100, formIdx: 0, shownTarget: 100 },
  },
  'peak-kitchen-conflate': {
    cacl2: { mg: 1047, formIdx: 1, shownTarget: 790 },
    kcl: { mg: 600, formIdx: 0, shownTarget: 600 },
    nacl: { mg: 500, formIdx: 0, shownTarget: 500 },
    khco3: { mg: 350, formIdx: 0, shownTarget: 350 },
    nahco3: { mg: 300, formIdx: 0, shownTarget: 300 },
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
        expect(Math.abs(physicalMassMg - expected.mg)).toBeLessThan(1);
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

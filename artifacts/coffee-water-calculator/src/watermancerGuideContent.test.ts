import { describe, expect, it } from 'vitest';
import {
  WATERMANCER_GUIDE_REFERENCES,
  WATERMANCER_GUIDE_STEPS,
} from './watermancerGuideContent';
import * as guideContent from './watermancerGuideContent';
import { ACTIVE_ION_IDS, ION_CHEMISTRY, type IonId } from './waterData';
import { CHARGE_BALANCE_TOLERANCE_MEQ_PER_L } from './watermancerChargeBalance';

type GuideRecipe = {
  id: string;
  water: readonly { source: string; milliliters: number }[];
  saltDoses: readonly { salt: string; milligrams: number }[];
  finalProfile: Partial<Record<IonId, number>>;
  gh: number;
  kh: number;
  ghKhRatio: number;
};

describe('Watermancer Guide copy', () => {
  it('gives steps 6 and 7 concise content instead of blank workspaces', () => {
    const step6 = WATERMANCER_GUIDE_STEPS.find(step => step.id === 'read-dose-plan');
    const step7 = WATERMANCER_GUIDE_STEPS.find(step => step.id === 'make-and-taste');

    expect(step6).toMatchObject({
      title: 'Start with these ranges',
      summary: 'My light-roast starting points—not rules for every palate.',
    });
    expect(step7).toMatchObject({
      title: 'Try a 1 L example',
      summary: 'Open a recipe to see its water, salt dose, and final ion profile.',
    });
    expect(step6?.blankWorkspace).not.toBe(true);
    expect(step7?.blankWorkspace).not.toBe(true);
  });

  it('keeps the five supplied one-liter recipes and flags the label blend that exceeds charge tolerance', () => {
    const recipesValue = Reflect.get(guideContent, 'WATERMANCER_GUIDE_RECIPES');
    expect(recipesValue).toBeInstanceOf(Array);

    const recipes = (recipesValue ?? []) as GuideRecipe[];
    expect(recipes).toHaveLength(5);
    expect(recipes.map(recipe => recipe.id)).toEqual([
      'balanced-daily-driver',
      'all-chloride-zero-sulfate',
      'zero-calcium-brightness',
      'high-extraction-punch',
      'bottled-water-blend',
    ]);
    expect(recipes.map(recipe => recipe.water.reduce(
      (total, source) => total + source.milliliters,
      0,
    ))).toEqual([1000, 1000, 1000, 1000, 1000]);
    expect(recipes[0]?.saltDoses).toEqual([
      { salt: 'magnesium-sulfate-heptahydrate', milligrams: 13 },
      { salt: 'magnesium-chloride-hexahydrate', milligrams: 19 },
      { salt: 'sodium-chloride', milligrams: 4 },
      { salt: 'potassium-chloride', milligrams: 2 },
    ]);
    expect(recipes[4]?.water).toEqual([
      { source: 'ro-distilled', milliliters: 815 },
      { source: 'berain', milliliters: 170 },
      { source: 'san-pellegrino', milliliters: 15 },
    ]);
    expect(recipes[4]?.finalProfile).toEqual({
      calcium: 6.2,
      magnesium: 1.3,
      sodium: 3.4,
      potassium: 0.9,
      bicarbonate: 12.1,
      chloride: 6.7,
      sulfate: 7.6,
    });

    const chargeDifference = (profile: GuideRecipe['finalProfile']) =>
      ACTIVE_ION_IDS.reduce((difference, id) => {
        const { charge, molarMass } = ION_CHEMISTRY[id];
        return difference + (profile[id] ?? 0) * charge / molarMass;
      }, 0);
    const balancedRecipeGaps = recipes.slice(0, 4).map(recipe =>
      Math.abs(chargeDifference(recipe.finalProfile)),
    );

    expect(balancedRecipeGaps.every(
      difference => difference <= CHARGE_BALANCE_TOLERANCE_MEQ_PER_L,
    )).toBe(true);
    expect(chargeDifference(recipes[4]!.finalProfile)).toBeCloseTo(0.041742, 5);
    expect(Math.abs(chargeDifference(recipes[4]!.finalProfile)))
      .toBeGreaterThan(CHARGE_BALANCE_TOLERANCE_MEQ_PER_L);
  });

  it('distinguishes physical salt mass from finished-water ion readings', () => {
    const stepText = JSON.stringify(WATERMANCER_GUIDE_STEPS);
    const referenceText = JSON.stringify(WATERMANCER_GUIDE_REFERENCES);
    const allText = `${stepText} ${referenceText}`;

    expect(WATERMANCER_GUIDE_STEPS).toHaveLength(7);
    expect(WATERMANCER_GUIDE_REFERENCES).toHaveLength(8);
    expect(WATERMANCER_GUIDE_STEPS.map(step => step.id)).toEqual([
      'why-profile',
      'supplies',
      'calibrate',
      'prepare-stocks',
      'set-targets',
      'read-dose-plan',
      'make-and-taste',
    ]);
    expect(WATERMANCER_GUIDE_STEPS[1]?.title).toBe('Set up the supplies');
    expect(WATERMANCER_GUIDE_STEPS[1]?.details).toContain(
      'Gather the salts, separate droppers, and a scale suitable for small masses (0.001g is preferred).',
    );
    expect(WATERMANCER_GUIDE_STEPS[4]?.summary).toBe(
      'With all your 1 mg/drop solutions ready, you can now make very precise water recipes using Watermancer.',
    );
    expect(WATERMANCER_GUIDE_STEPS[1]?.details).not.toContain(
      'Label each bottle with the salt and the physical hydration form you weighed.',
    );

    expect(stepText).toMatch(/supplies/i);
    expect(stepText).toMatch(/count a known number of water drops.*weigh the water/i);
    expect(stepText).toMatch(/Each drop contains 1\.00 mg of its physical salt/i);
    expect(stepText).toMatch(/complete target set stays charge balanced/i);
    expect(stepText).toMatch(/mineral.water/i);
    expect(referenceText).toMatch(/calibration/i);
    expect(referenceText).toMatch(/hydration form/i);
    expect(referenceText).toMatch(/charge balance/i);
    expect(referenceText).toMatch(/mineral.water/i);
    expect(referenceText).toMatch(/final volume/i);
    expect(referenceText).toMatch(/dose.to.drop/i);
    expect(referenceText).toMatch(/taste/i);

    expect(allText).not.toMatch(/SodaStream|Magnesium Hydroxide|Calcium Carbonate/i);
    expect(allText).toMatch(/conductivity|TDS/i);
  });
});

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

type TestGuideSegment =
  | { kind: 'text' | 'emphasis'; text: string }
  | { kind: 'product'; productId: string };

type TestGuideDetail = string | { segments: readonly TestGuideSegment[] };

const PRODUCT_LABELS: Record<string, string> = {
  nigari: 'nigari',
  saltverk: 'Saltverk',
  'vera-salt': 'Vera Salt',
  'arm-and-hammer': 'Arm & Hammer',
};

function getTestDetails(details: readonly unknown[] | undefined): readonly TestGuideDetail[] {
  return (details ?? []) as readonly TestGuideDetail[];
}

function flattenGuideDetails(details: readonly unknown[] | undefined): string {
  return getTestDetails(details)
    .map(detail => (
      typeof detail === 'string'
        ? detail
        : detail.segments.map(segment => (
          segment.kind === 'product'
            ? PRODUCT_LABELS[segment.productId] ?? segment.productId
            : segment.text
        )).join('')
    ))
    .join(' ');
}

function getInlineSegments(details: readonly unknown[] | undefined): TestGuideSegment[] {
  return getTestDetails(details)
    .flatMap(detail => (typeof detail === 'string' ? [] : [...detail.segments]));
}

describe('Watermancer Guide copy', () => {
  it('gives steps 6 and 7 concise content instead of blank workspaces', () => {
    const step6 = WATERMANCER_GUIDE_STEPS.find(step => step.id === 'read-dose-plan');
    const step7 = WATERMANCER_GUIDE_STEPS.find(step => step.id === 'make-and-taste');

    expect(step6).toMatchObject({
      title: 'Start with these ranges',
      summary: 'My light-roast starting points—not rules for every palate.',
    });
    expect(step7).toMatchObject({
      title: 'Build, match, and save a water recipe',
      summary: 'Choose a recipe, set ion targets and batch volume, add mineral waters and salts, run a match, then review and save the finished recipe card.',
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

  it('recommends common hydrated forms and matching them in Watermancer', () => {
    const suppliesStep = WATERMANCER_GUIDE_STEPS.find(step => step.id === 'supplies');
    const copy = flattenGuideDetails(suppliesStep?.details);

    expect(copy).toMatch(/most hydrated/i);
    expect(copy).toMatch(/anhydrous/i);
    expect(copy).toMatch(/easier to dissolve/i);
    expect(copy).toMatch(/same form.*Watermancer|Watermancer.*same form/i);
  });

  it('makes natural salts optional and reassures readers that food-grade basics are enough', () => {
    const suppliesStep = WATERMANCER_GUIDE_STEPS.find(step => step.id === 'supplies');
    const copy = flattenGuideDetails(suppliesStep?.details);

    expect(copy).toMatch(/some people/i);
    expect(copy).toMatch(/optional/i);
    expect(copy).toMatch(/trace minerals/i);
    expect(copy).toMatch(/Zechstein/i);
    expect(copy).toMatch(/nigari/i);
    expect(copy).toMatch(/Saltverk/i);
    expect(copy).toMatch(/Vera Salt/i);
    expect(copy).toMatch(/magnesium sulfate heptahydrate/i);
    expect(copy).toMatch(/calcium chloride dihydrate/i);
    expect(copy).toMatch(/potassium chloride/i);
    expect(copy).toMatch(/Arm & Hammer/i);
    expect(copy).toMatch(/baking soda/i);
    expect(copy).toMatch(/food.grade/i);
    expect(copy).toMatch(/no need|don't need|do not need/i);
  });

  it('emphasizes the key buying guidance and previews only the selected product examples', () => {
    const suppliesStep = WATERMANCER_GUIDE_STEPS.find(step => step.id === 'supplies');
    const segments = getInlineSegments(suppliesStep?.details);
    const emphasizedPhrases = segments
      .filter((segment): segment is Extract<TestGuideSegment, { kind: 'emphasis' }> => segment.kind === 'emphasis')
      .map(segment => segment.text);
    const productIds = segments
      .filter((segment): segment is Extract<TestGuideSegment, { kind: 'product' }> => segment.kind === 'product')
      .map(segment => segment.productId);

    expect(emphasizedPhrases).toEqual(expect.arrayContaining([
      'most hydrated common food-grade form',
      'This is optional and taste is personal.',
      'Zechstein magnesium chloride flakes',
      'food-grade product',
      'Food grade is enough',
    ]));
    expect(productIds).toEqual(['nigari', 'saltverk', 'vera-salt', 'arm-and-hammer']);

    const genericSaltDetail = suppliesStep?.details.find(
      detail => typeof detail === 'string' && /magnesium sulfate heptahydrate/i.test(detail),
    );
    expect(typeof genericSaltDetail).toBe('string');
    expect(getInlineSegments([genericSaltDetail])).toEqual([]);
  });

  it('teaches vertical dropper handling and clarifies that the tip photos are not dispensing-angle examples', () => {
    const calibrationStep = WATERMANCER_GUIDE_STEPS.find(step => step.id === 'calibrate');
    const copy = `${calibrationStep?.summary ?? ''} ${flattenGuideDetails(calibrationStep?.details)}`;

    expect(copy).toContain('holding the dropper vertically');
    expect(copy).toContain('45°');
    expect(copy).toContain('15–20%');
    expect(copy).toMatch(/photos show tip shapes only.*not the dispensing angle/i);
  });

  it('describes stock strength from the working fill volume rather than bottle size', () => {
    const preparationStep = WATERMANCER_GUIDE_STEPS.find(step => step.id === 'prepare-stocks');

    expect(preparationStep?.summary).toContain('working fill volume');
    expect(preparationStep?.summary).not.toContain('bottle size');
  });
});

import {
  computeIonTotals,
  computeSaltIonPpmTotal,
  computeSaltMg,
  computeGH,
  computeKH,
  ION_MAP,
  SALTS,
  type IonId,
} from './waterData';
import {
  buildRecipeShareCardSvg,
  type RecipeShareCardInput,
} from './waterRecipeImage';
import { computeWatermancerMetricValues } from './watermancerMetricValues';

const CORE_ION_TARGETS = {
  magnesium: 10,
  calcium: 20,
  bicarbonate: 30,
} as const;

const COMPARISON_RECIPES = [
  {
    id: 'chloride-sodium',
    recipeName: 'Chloride + sodium example',
    imageAlt: 'Recipe steps image for magnesium chloride, calcium chloride, and sodium bicarbonate; same magnesium, calcium, and bicarbonate targets as the sulfate and potassium example.',
    salts: [
      { id: 'mgcl2', ion: 'magnesium', ionTarget: CORE_ION_TARGETS.magnesium, formIdx: 1 },
      { id: 'cacl2', ion: 'calcium', ionTarget: CORE_ION_TARGETS.calcium, formIdx: 1 },
      { id: 'nahco3', ion: 'bicarbonate', ionTarget: CORE_ION_TARGETS.bicarbonate, formIdx: 0 },
    ],
  },
  {
    id: 'sulfate-potassium',
    recipeName: 'Sulfate + potassium example',
    imageAlt: 'Recipe steps image for magnesium sulfate, calcium sulfate, and potassium bicarbonate; same magnesium, calcium, and bicarbonate targets as the chloride and sodium example.',
    salts: [
      { id: 'mgso4', ion: 'magnesium', ionTarget: CORE_ION_TARGETS.magnesium, formIdx: 1 },
      { id: 'caso4', ion: 'calcium', ionTarget: CORE_ION_TARGETS.calcium, formIdx: 1 },
      { id: 'khco3', ion: 'bicarbonate', ionTarget: CORE_ION_TARGETS.bicarbonate, formIdx: 0 },
    ],
  },
] as const;

const ANALYSIS_ION_IDS: readonly IonId[] = [
  'calcium',
  'magnesium',
  'sodium',
  'potassium',
  'bicarbonate',
  'chloride',
  'sulfate',
];

function buildRecipeCard(recipe: (typeof COMPARISON_RECIPES)[number]): RecipeShareCardInput {
  const saltTargets: Record<string, number> = {};
  const saltSteps: RecipeShareCardInput['saltSteps'] = [];

  for (const recipeSalt of recipe.salts) {
    const salt = SALTS.find(candidate => candidate.id === recipeSalt.id);
    if (!salt) throw new Error(`Unknown Watermancer Guide example salt: ${recipeSalt.id}`);
    const form = salt.hydrationForms[recipeSalt.formIdx];
    const ionFraction = salt.ions.find(ion => ion.ionId === recipeSalt.ion)?.fraction;
    if (!form || !ionFraction || ionFraction <= 0) {
      throw new Error(`Invalid Watermancer Guide example salt configuration: ${recipeSalt.id}`);
    }

    const saltEquivalentPpm = recipeSalt.ionTarget / ionFraction;
    saltTargets[salt.id] = saltEquivalentPpm;
    const physicalSaltMg = computeSaltMg(saltEquivalentPpm, 1, form.molarMass, salt.anhydrousMass);
    saltSteps.push({
      name: `${saltSteps.length + 1}. ${salt.name}`,
      formula: salt.formula,
      form: form.label,
      amount: `${physicalSaltMg.toFixed(1)} mg`,
      contributionPpm: computeSaltIonPpmTotal(salt.id, saltEquivalentPpm),
    });
  }

  const ions = computeIonTotals(saltTargets, {}, 1);
  const metrics = {
    gh: computeGH(ions),
    kh: computeKH(ions),
    tds: computeWatermancerMetricValues(ions).tds,
  };
  const model: RecipeShareCardInput = {
    recipeName: recipe.recipeName,
    batchLabel: '1 L final-water example · 0-TDS base',
    waterSteps: [
      { label: '0-TDS water', name: 'Start with 0-TDS water', amount: 'Top up to 1.00 L' },
    ],
    saltTitle: '02 · Add the minerals in order',
    saltIntro: 'Add one salt at a time and stir until fully dissolved before adding the next.',
    saltSteps,
    finalStep: 'Mix thoroughly, then compare the final ion readings. Different counterions can affect taste.',
    tdsTarget: metrics.tds,
    analysis: {
      source: 'final-mixture',
      ions: ANALYSIS_ION_IDS.map(id => ({
        id,
        name: ION_MAP[id].name,
        formula: ION_MAP[id].formula,
        value: ions[id],
        category: id === 'calcium' || id === 'magnesium' || id === 'sodium' || id === 'potassium'
          ? 'Cations'
          : 'Anions',
      })),
      ...metrics,
    },
  };

  return model;
}

function toSvgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const WATERMANCER_COUNTERION_EXAMPLES = COMPARISON_RECIPES.map(recipe => {
  const model = buildRecipeCard(recipe);
  const rendered = buildRecipeShareCardSvg(model);
  return {
    id: recipe.id,
    imageAlt: recipe.imageAlt,
    model,
    imageSrc: toSvgDataUrl(rendered.svg),
  };
});

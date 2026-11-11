import {
  SALTS,
  computeSaltTargetPpm,
  type SaltRecipe,
} from './waterData';

type PeakKitchenSaltMass = {
  physicalMg: number;
  formIdx: number;
};

type PeakKitchenRecipeSource = {
  id: string;
  name: string;
  salts: Record<string, PeakKitchenSaltMass>;
};

const RECIPE_SOURCES: PeakKitchenRecipeSource[] = [
  {
    id: 'peak-kitchen-club-soda',
    name: 'Club Soda',
    salts: {
      mgcl2: { physicalMg: 3300, formIdx: 1 },
      cacl2: { physicalMg: 770, formIdx: 1 },
      nacl: { physicalMg: 440, formIdx: 0 },
      nahco3: { physicalMg: 150, formIdx: 0 },
      khco3: { physicalMg: 110, formIdx: 0 },
    },
  },
  {
    id: 'peak-kitchen-jelly',
    name: 'Jelly',
    salts: {
      mgcl2: { physicalMg: 1750, formIdx: 1 },
      cacl2: { physicalMg: 890, formIdx: 1 },
      kcl: { physicalMg: 560, formIdx: 0 },
      khco3: { physicalMg: 250, formIdx: 0 },
      nahco3: { physicalMg: 230, formIdx: 0 },
    },
  },
  {
    id: 'peak-kitchen-lily',
    name: 'Lily',
    salts: {
      mgso4: { physicalMg: 2200, formIdx: 1 },
      mgcl2: { physicalMg: 1300, formIdx: 1 },
      kcl: { physicalMg: 630, formIdx: 0 },
      khco3: { physicalMg: 300, formIdx: 0 },
      nahco3: { physicalMg: 250, formIdx: 0 },
      nacl: { physicalMg: 100, formIdx: 0 },
    },
  },
  {
    id: 'peak-kitchen-conflate',
    name: 'Conflate',
    salts: {
      cacl2: { physicalMg: 1050, formIdx: 1 },
      kcl: { physicalMg: 700, formIdx: 0 },
      nacl: { physicalMg: 600, formIdx: 0 },
      khco3: { physicalMg: 200, formIdx: 0 },
      nahco3: { physicalMg: 150, formIdx: 0 },
    },
  },
];

export const PEAK_KITCHEN_SALT_RECIPES: SaltRecipe[] = RECIPE_SOURCES.map(recipe => ({
  id: recipe.id,
  name: recipe.name,
  source: 'PeakKitchen',
  salts: Object.fromEntries(
    Object.entries(recipe.salts).map(([saltId, mass]) => {
      const salt = SALTS.find(item => item.id === saltId);
      const form = salt?.hydrationForms[mass.formIdx];
      if (!salt || !form) {
        throw new Error(`PeakKitchen recipe "${recipe.name}" references unknown salt form "${saltId}".`);
      }
      return [saltId, {
        target: String(computeSaltTargetPpm(
          mass.physicalMg,
          1,
          form.molarMass,
          salt.anhydrousMass,
        )),
        formIdx: mass.formIdx,
      }];
    }),
  ),
}));

export const PEAK_KITCHEN_RECIPE_PICKER_GROUP = {
  label: 'PeakKitchen',
  options: PEAK_KITCHEN_SALT_RECIPES.map(recipe => ({
    value: `recipe:${recipe.id}`,
    label: recipe.name,
  })),
};

const PEAK_KITCHEN_SILICA_TARGETS_PPM: Record<string, number> = {
  'peak-kitchen-conflate': 250,
};

export function getPeakKitchenSilicaTargetPpm(recipeId: string): number | undefined {
  return PEAK_KITCHEN_SILICA_TARGETS_PPM[recipeId];
}

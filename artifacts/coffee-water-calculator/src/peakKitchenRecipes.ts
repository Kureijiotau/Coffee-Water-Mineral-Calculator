import {
  SALTS,
  type SaltRecipe,
} from './waterData';

type PeakKitchenSaltTarget = {
  targetPpm: number;
  formIdx: number;
};

type PeakKitchenRecipeSource = {
  id: string;
  name: string;
  salts: Record<string, PeakKitchenSaltTarget>;
};

const RECIPE_SOURCES: PeakKitchenRecipeSource[] = [
  {
    id: 'peak-kitchen-club-soda',
    name: 'Club Soda',
    salts: {
      mgcl2: { targetPpm: 1540, formIdx: 1 },
      cacl2: { targetPpm: 580, formIdx: 1 },
      nacl: { targetPpm: 400, formIdx: 0 },
      nahco3: { targetPpm: 200, formIdx: 0 },
      khco3: { targetPpm: 110, formIdx: 0 },
    },
  },
  {
    id: 'peak-kitchen-jelly',
    name: 'Jelly',
    salts: {
      mgcl2: { targetPpm: 820, formIdx: 1 },
      cacl2: { targetPpm: 670, formIdx: 1 },
      kcl: { targetPpm: 500, formIdx: 0 },
      khco3: { targetPpm: 350, formIdx: 0 },
      nahco3: { targetPpm: 230, formIdx: 0 },
    },
  },
  {
    id: 'peak-kitchen-lily',
    name: 'Lily',
    salts: {
      mgso4: { targetPpm: 1080, formIdx: 1 },
      mgcl2: { targetPpm: 600, formIdx: 1 },
      kcl: { targetPpm: 570, formIdx: 0 },
      khco3: { targetPpm: 380, formIdx: 0 },
      nahco3: { targetPpm: 250, formIdx: 0 },
      nacl: { targetPpm: 100, formIdx: 0 },
    },
  },
  {
    id: 'peak-kitchen-conflate',
    name: 'Conflate',
    salts: {
      cacl2: { targetPpm: 790, formIdx: 1 },
      kcl: { targetPpm: 600, formIdx: 0 },
      nacl: { targetPpm: 500, formIdx: 0 },
      khco3: { targetPpm: 350, formIdx: 0 },
      nahco3: { targetPpm: 300, formIdx: 0 },
    },
  },
];

export const PEAK_KITCHEN_SALT_RECIPES: SaltRecipe[] = RECIPE_SOURCES.map(recipe => ({
  id: recipe.id,
  name: recipe.name,
  source: 'PeakKitchen',
  salts: Object.fromEntries(
    Object.entries(recipe.salts).map(([saltId, target]) => {
      const salt = SALTS.find(item => item.id === saltId);
      const form = salt?.hydrationForms[target.formIdx];
      if (!salt || !form) {
        throw new Error(`PeakKitchen recipe "${recipe.name}" references unknown salt form "${saltId}".`);
      }
      return [saltId, {
        target: String(target.targetPpm),
        formIdx: target.formIdx,
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

import type { IonId } from '@/waterData';

export type LotusIonInput = {
  magnesium: number;
  calcium: number;
  potassium: number;
  sodium: number;
};

export type LotusIonTargetId =
  | 'magnesium'
  | 'calcium'
  | 'potassium'
  | 'sodium'
  | 'chloride'
  | 'bicarbonate';

export interface LotusRecipe {
  id: string;
  name: string;
  source: string;
  sourceUrl: string;
  publishedInputs: LotusIonInput;
  ionTargets: Record<LotusIonTargetId, number>;
  notes?: string;
}

const SOURCE = 'Lotus Coffee Products';
const SOURCE_URL = 'https://lotuscoffeeproducts.com/pages/product-instructions';

/**
 * Lotus publishes dropper recipe ppm inputs and derives the final ion profile
 * in its calculator. The published ion table rounds each final value to the
 * nearest whole mg/L, so preserve that presentation in Watermancer while
 * retaining the original inputs above for attribution and auditing.
 */
export function lotusIonTargets(input: LotusIonInput): Record<LotusIonTargetId, number> {
  return {
    magnesium: Math.round(input.magnesium * (24.305 / 100)),
    calcium: Math.round(input.calcium * (40.078 / 100)),
    potassium: Math.round(2 * input.potassium * (39.0983 / 100)),
    sodium: Math.round(2 * input.sodium * (22.989 / 100)),
    chloride: Math.round(2 * (input.magnesium + input.calcium) * (35.453 / 100)),
    bicarbonate: Math.round(2 * (input.sodium + input.potassium) * (61.016 / 100)),
  };
}

function lotusRecipe(
  id: string,
  name: string,
  publishedInputs: LotusIonInput,
  notes?: string,
): LotusRecipe {
  return {
    id,
    name,
    source: SOURCE,
    sourceUrl: SOURCE_URL,
    publishedInputs,
    ionTargets: lotusIonTargets(publishedInputs),
    notes,
  };
}

export const LOTUS_RECIPES: LotusRecipe[] = [
  lotusRecipe(
    'lotus-light-and-bright',
    'Light and Bright',
    { magnesium: 0, calcium: 60, potassium: 25, sodium: 0 },
    'Designed to highlight acidity and clarity, especially with lightly roasted coffee.',
  ),
  lotusRecipe(
    'lotus-simple-and-sweet',
    'Simple and Sweet',
    { magnesium: 30, calcium: 60, potassium: 15, sodium: 25 },
    'A balanced starting recipe intended to work across coffee styles.',
  ),
  lotusRecipe(
    'lotus-light-and-bright-espresso',
    'Light and Bright (espresso)',
    { magnesium: 20, calcium: 0, potassium: 45, sodium: 0 },
  ),
  lotusRecipe(
    'lotus-simple-and-sweet-espresso',
    'Simple and Sweet (espresso)',
    { magnesium: 20, calcium: 0, potassium: 0, sodium: 55 },
  ),
  lotusRecipe(
    'lotus-bright-and-juicy',
    'Bright and Juicy',
    { magnesium: 36, calcium: 36, potassium: 9, sodium: 9 },
    'A bright, balanced recipe with a juicy mouthfeel.',
  ),
  lotusRecipe(
    'lotus-raos-recipe',
    "Rao's Recipe",
    { magnesium: 32.1, calcium: 40.2, potassium: 8, sodium: 12.1 },
    'An updated, balanced recipe attributed to Scott Rao.',
  ),
  lotusRecipe(
    'lotus-ultra-light',
    'Ultra Light',
    { magnesium: 15, calcium: 20, potassium: 10, sodium: 0 },
  ),
];

export function lotusIonTargetsForWatermancer(
  recipe: LotusRecipe,
): Partial<Record<IonId, number>> {
  return recipe.ionTargets;
}
import { SALTS, type IonId } from './waterData';
import {
  LOTUS_RECIPES,
  lotusIonTargetsExact,
  type LotusRecipe,
} from './lotusRecipes';

export type LotusDropperStyle = 'round' | 'straight';
export type LotusDropperId = 'magnesium' | 'calcium' | 'potassium' | 'sodium';

export const LOTUS_BREW_VOLUME_ML = 450;
export const LOTUS_BOTTLE_VOLUME_ML = 59;
export const LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML = 20;
export const LOTUS_STYLE_FACTORS: Record<LotusDropperStyle, number> = {
  round: 0.56,
  straight: 1,
};

export const LOTUS_DROPPER_DEFINITIONS: Array<{
  id: LotusDropperId;
  label: string;
  saltId: string;
  ionId: IonId;
  inputKey: keyof LotusRecipe['publishedInputs'];
}> = [
  { id: 'magnesium', label: 'Magnesium', saltId: 'mgcl2', ionId: 'magnesium', inputKey: 'magnesium' },
  { id: 'calcium', label: 'Calcium', saltId: 'cacl2', ionId: 'calcium', inputKey: 'calcium' },
  { id: 'potassium', label: 'Potassium', saltId: 'khco3', ionId: 'potassium', inputKey: 'potassium' },
  { id: 'sodium', label: 'Sodium', saltId: 'nahco3', ionId: 'sodium', inputKey: 'sodium' },
];

function sourceInputMultiplier(dropperId: LotusDropperId): number {
  return dropperId === 'potassium' || dropperId === 'sodium' ? 2 : 1;
}

export function lotusStyleFactor(style: LotusDropperStyle): number {
  return LOTUS_STYLE_FACTORS[style];
}

export function lotusDropsPerMl(
  style: LotusDropperStyle,
  straightDropsPerMl = LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML,
): number {
  const safeStraightDropsPerMl = Number.isFinite(straightDropsPerMl) && straightDropsPerMl > 0
    ? straightDropsPerMl
    : LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML;
  return safeStraightDropsPerMl * lotusStyleFactor(style);
}

export function lotusPublishedDrops(
  recipe: LotusRecipe,
  style: LotusDropperStyle,
): Record<LotusDropperId, number> {
  const styleFactor = lotusStyleFactor(style);
  const volumeFactor = LOTUS_BREW_VOLUME_ML / 4500;
  return Object.fromEntries(
    LOTUS_DROPPER_DEFINITIONS.map(dropper => [
      dropper.id,
      Math.round(
        Number(recipe.publishedInputs[dropper.inputKey] ?? 0)
        * sourceInputMultiplier(dropper.id)
        * volumeFactor
        * styleFactor,
      ),
    ]),
  ) as Record<LotusDropperId, number>;
}

function hydrationIonFraction(saltId: string, ionId: IonId): number {
  const salt = SALTS.find(item => item.id === saltId);
  if (!salt) return 0;
  const form = salt.hydrationForms[salt.defaultFormIdx ?? 0] ?? salt.hydrationForms[0];
  const anhydrousFraction = salt.ions.find(contribution => contribution.ionId === ionId)?.fraction ?? 0;
  return anhydrousFraction * salt.anhydrousMass / form.molarMass;
}

export interface LotusStockPlan {
  id: LotusDropperId;
  label: string;
  saltId: string;
  saltName: string;
  saltFormula: string;
  hydrationForm: string;
  hydrationMolarMass: number;
  ionId: IonId;
  dropsPerMl: number;
  saltMgPerMl: number;
  stockVolumeMl: number;
  saltMassMg: number;
  saltMassG: number;
}

/**
 * Infer the stock strength required for the Lotus calculator's source model.
 * The style factor and style-specific drops/mL cancel when both are calibrated
 * from the same nominal straight-drop baseline, leaving one shared chemistry
 * strength per bottle.
 */
export function lotusStockPlan(
  dropper: typeof LOTUS_DROPPER_DEFINITIONS[number],
  style: LotusDropperStyle,
  stockVolumeMl = LOTUS_BOTTLE_VOLUME_ML,
  straightDropsPerMl = LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML,
): LotusStockPlan {
  const salt = SALTS.find(item => item.id === dropper.saltId) ?? SALTS[0];
  const form = salt.hydrationForms[salt.defaultFormIdx ?? 0] ?? salt.hydrationForms[0];
  const ionFraction = hydrationIonFraction(dropper.saltId, dropper.ionId);
  const sourceIonFactor = lotusIonTargetsExact({ magnesium: 1, calcium: 1, potassium: 1, sodium: 1 })[dropper.inputKey];
  const idealDrops = sourceInputMultiplier(dropper.id)
    * (LOTUS_BREW_VOLUME_ML / 4500)
    * lotusStyleFactor(style);
  const safeStockVolumeMl = Number.isFinite(stockVolumeMl) && stockVolumeMl > 0 ? stockVolumeMl : LOTUS_BOTTLE_VOLUME_ML;
  const dropsPerMl = lotusDropsPerMl(style, straightDropsPerMl);
  const ionMgPerDrop = idealDrops > 0
    ? sourceIonFactor * (LOTUS_BREW_VOLUME_ML / 1000) / idealDrops
    : 0;
  const saltMgPerDrop = ionFraction > 0 ? ionMgPerDrop / ionFraction : 0;
  const saltMgPerMl = saltMgPerDrop * dropsPerMl;
  const saltMassMg = saltMgPerMl * safeStockVolumeMl;

  return {
    id: dropper.id,
    label: dropper.label,
    saltId: dropper.saltId,
    saltName: salt.name,
    saltFormula: salt.formula,
    hydrationForm: form.label,
    hydrationMolarMass: form.molarMass,
    ionId: dropper.ionId,
    dropsPerMl,
    saltMgPerMl,
    stockVolumeMl: safeStockVolumeMl,
    saltMassMg,
    saltMassG: saltMassMg / 1000,
  };
}

export function lotusRecipeDosing(
  recipe: LotusRecipe,
  style: LotusDropperStyle,
): Record<LotusDropperId, number> {
  return lotusPublishedDrops(recipe, style);
}

export function lotusRecipeById(id: string): LotusRecipe {
  return LOTUS_RECIPES.find(recipe => recipe.id === id) ?? LOTUS_RECIPES[0];
}
import { ACTIVE_ION_IDS, type IonId, type SaltRecipe } from './waterData';
import { computeWatermancerFinalIons, type MineralWaterEntry } from './watermancerSolver';
import type { WaterMixerSourceGroupId } from './waterMixer';

export type WaterMixerRecipeSource = {
  id: string;
  sourceId: string;
  name: string;
  sourceKind: 'saved-recipe';
  provenance: string;
  group: WaterMixerSourceGroupId;
  ions: Record<IonId, number>;
};

function recipeSourceWaters(recipe: SaltRecipe): MineralWaterEntry[] {
  const sources = recipe.sourceWaters;
  if (!sources) return [];

  return [...sources.mineralWaters, ...sources.additionWaters].map((water, index) => ({
    id: water.sourceLocalId ?? `${recipe.id}:water:${index}`,
    name: water.name,
    ions: Object.fromEntries(
      ACTIVE_ION_IDS.map(ionId => [ionId, String(water.ions[ionId] ?? '0')]),
    ) as Record<IonId, string>,
    metadata: Object.fromEntries(
      Object.entries(water.metadata).map(([key, value]) => [key, String(value ?? '')]),
    ),
    volumeMl: String(water.volumeMl ?? '0'),
    sourceLocalId: water.sourceLocalId,
  }));
}

export function saltRecipeToWaterMixerSource(
  recipe: SaltRecipe,
  group: Extract<WaterMixerSourceGroupId, 'alchemist' | 'built-in'>,
): WaterMixerRecipeSource {
  const sourceWaters = recipeSourceWaters(recipe);
  const recipeLiters = recipe.sourceWaters
    ? recipe.sourceWaters.volumeUnit === 'gallons'
      ? Number(recipe.sourceWaters.liters) * 3.785411784
      : Number(recipe.sourceWaters.liters)
    : 1;
  const batchMl = Number.isFinite(recipeLiters) && recipeLiters > 0
    ? recipeLiters * 1000
    : 1000;
  const saltTargets = Object.fromEntries(
    Object.entries(recipe.salts).map(([saltId, entry]) => [
      saltId,
      Math.max(0, Number(entry.target) || 0),
    ]),
  );
  const ions = recipe.finishedWaterIons
    ? Object.fromEntries(
      ACTIVE_ION_IDS.map(ionId => [
        ionId,
        Math.max(0, Number(recipe.finishedWaterIons?.[ionId]) || 0),
      ]),
    ) as Record<IonId, number>
    : computeWatermancerFinalIons(sourceWaters, batchMl, saltTargets);
  const kindLabel = group === 'built-in' ? 'Built-in recipe' : 'Saved Alchemist recipe';
  const provenance = recipe.finishedWaterIons
    ? `${kindLabel} · saved finished-water readings`
    : sourceWaters.length > 0
      ? `${kindLabel} · calculated from source waters and salts`
      : `${kindLabel} · calculated from salts on a zero-mineral baseline`;
  const sourceId = `salt-recipe:${group}:${recipe.id}`;

  return {
    id: sourceId,
    sourceId,
    name: recipe.name,
    sourceKind: 'saved-recipe',
    provenance,
    group,
    ions,
  };
}
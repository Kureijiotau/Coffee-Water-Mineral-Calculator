import {
  ACTIVE_ION_IDS,
  computeGH,
  computeKH,
  ION_CHEMISTRY,
  IONS,
  type IonId,
} from './waterData';

export type WatermancerMetricValues = {
  gh: number;
  kh: number;
  tds: number;
};

export type WatermancerRecipeAnalysisSource = 'target-preview' | 'final-mixture';

export type WatermancerRecipeAnalysisDisplay = {
  source: WatermancerRecipeAnalysisSource;
  ions: Record<IonId, number>;
  metrics: WatermancerMetricValues;
};

function completeIons(ions: Partial<Record<IonId, number>>): Record<IonId, number> {
  return Object.fromEntries(
    IONS.map(({ id }) => [id, ions[id] ?? 0]),
  ) as Record<IonId, number>;
}

export function hasModeledWatermancerIons(ions: Partial<Record<IonId, number>>): boolean {
  return ACTIVE_ION_IDS.some(id => (ions[id] ?? 0) > 0);
}

/**
 * Calculate the same hardness and modeled ion-total metrics used by
 * Watermancer's Review match card.
 */
export function computeWatermancerMetricValues(
  ions: Partial<Record<IonId, number>>,
): WatermancerMetricValues {
  const completeIonMap = completeIons(ions);

  return {
    gh: computeGH(completeIonMap),
    kh: computeKH(completeIonMap),
    tds: Object.values(completeIonMap).reduce((total, ppm) => total + ppm, 0),
  };
}

/**
 * Estimate alkalinity as bicarbonate-equivalent mass. Citrate is treated as
 * carrying its modeled full 3− charge; real alkalinity depends on pH/speciation.
 */
export function computeHco3EquivalentPpm(
  ions: Partial<Record<IonId, number>>,
): number {
  const bicarbonatePpm = ions.bicarbonate ?? 0;
  const citratePpm = ions.citrates ?? 0;
  const safeBicarbonatePpm = Number.isFinite(bicarbonatePpm)
    ? Math.max(bicarbonatePpm, 0)
    : 0;
  const safeCitratePpm = Number.isFinite(citratePpm)
    ? Math.max(citratePpm, 0)
    : 0;
  const bicarbonateEquivalentPerCitratePpm = (
    Math.abs(ION_CHEMISTRY.citrates.charge) * ION_CHEMISTRY.bicarbonate.molarMass
  ) / ION_CHEMISTRY.citrates.molarMass;

  return safeBicarbonatePpm + safeCitratePpm * bicarbonateEquivalentPerCitratePpm;
}

/**
 * Select target readings only while Watermancer has no modeled final mixture.
 * Actual-mixture metrics are passed through unchanged to preserve the card's
 * existing finished-water calculation.
 */
export function resolveWatermancerRecipeAnalysis(
  finalIons: Partial<Record<IonId, number>>,
  targetIons: Partial<Record<IonId, number>>,
  finalMetrics: WatermancerMetricValues,
): WatermancerRecipeAnalysisDisplay {
  const showTargetPreview = !hasModeledWatermancerIons(finalIons);
  const ions = completeIons(showTargetPreview ? targetIons : finalIons);

  return {
    source: showTargetPreview ? 'target-preview' : 'final-mixture',
    ions,
    metrics: showTargetPreview ? computeWatermancerMetricValues(ions) : finalMetrics,
  };
}

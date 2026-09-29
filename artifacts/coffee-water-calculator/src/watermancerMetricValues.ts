import {
  computeGH,
  computeKH,
  IONS,
  type IonId,
} from './waterData';

export type WatermancerMetricValues = {
  gh: number;
  kh: number;
  tds: number;
};

/**
 * Calculate the same hardness and modeled ion-total metrics used by
 * Watermancer's Review match card.
 */
export function computeWatermancerMetricValues(
  ions: Partial<Record<IonId, number>>,
): WatermancerMetricValues {
  const completeIons = Object.fromEntries(
    IONS.map(({ id }) => [id, ions[id] ?? 0]),
  ) as Record<IonId, number>;

  return {
    gh: computeGH(completeIons),
    kh: computeKH(completeIons),
    tds: Object.values(completeIons).reduce((total, ppm) => total + ppm, 0),
  };
}
export const EIDON_SILICA_LABEL_BASIS = {
  servingDrops: 30,
  servingVolumeMl: 2,
  silicaMgPerServing: 375,
  silicaMgPerDrop: 12.5,
} as const;

export function normalizeWatermancerSilicaDrops(drops: number): number {
  return Number.isFinite(drops) && drops > 0 ? Math.floor(drops) : 0;
}

export function watermancerSilicaDoseMg(drops: number): number {
  return normalizeWatermancerSilicaDrops(drops) * EIDON_SILICA_LABEL_BASIS.silicaMgPerDrop;
}

export function watermancerSilicaPpm(drops: number, batchLiters: number): number {
  const doseMg = watermancerSilicaDoseMg(drops);
  return doseMg > 0 && Number.isFinite(batchLiters) && batchLiters > 0
    ? doseMg / batchLiters
    : 0;
}
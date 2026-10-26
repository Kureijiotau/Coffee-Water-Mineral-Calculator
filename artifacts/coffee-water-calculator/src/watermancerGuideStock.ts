export const WATERMANCER_GUIDE_STOCK_HEADROOM_ML = 5;

export type OneMgPerDropStockPlan = {
  workingFillVolumeMl: number;
  minimumBottleVolumeMl: number;
  stockVolumeMl: number;
  totalMixMassG: number;
  estimatedDropCount: number;
  saltMassMg: number;
  saltMassG: number;
  waterMassG: number;
};

/**
 * Mirrors the DIY concentrate mass calculation for a fixed 1 mg salt-per-drop
 * stock. The requested working fill volume in mL is treated as the approximate
 * total mix mass in grams. A bottle with at least 5 mL more capacity is
 * recommended for shaking room; headroom is not deducted from the fill volume.
 */
export function calculateOneMgPerDropStockPlan(
  workingFillVolumeMl: number,
  waterDropMassG: number,
): OneMgPerDropStockPlan | null {
  if (
    !Number.isFinite(workingFillVolumeMl)
    || workingFillVolumeMl <= 0
    || !Number.isFinite(waterDropMassG)
    || waterDropMassG <= 0
  ) {
    return null;
  }

  const stockVolumeMl = workingFillVolumeMl;
  const totalMixMassG = stockVolumeMl;
  const estimatedDropCount = totalMixMassG / waterDropMassG;
  const saltMassMg = estimatedDropCount;
  const saltMassG = saltMassMg / 1000;
  const waterMassG = totalMixMassG - saltMassG;

  if (
    !Number.isFinite(estimatedDropCount)
    || !Number.isFinite(saltMassMg)
    || !Number.isFinite(waterMassG)
    || estimatedDropCount <= 0
    || waterMassG <= 0
  ) {
    return null;
  }

  return {
    workingFillVolumeMl,
    minimumBottleVolumeMl: workingFillVolumeMl + WATERMANCER_GUIDE_STOCK_HEADROOM_ML,
    stockVolumeMl,
    totalMixMassG,
    estimatedDropCount,
    saltMassMg,
    saltMassG,
    waterMassG,
  };
}

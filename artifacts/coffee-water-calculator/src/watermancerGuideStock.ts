export const WATERMANCER_GUIDE_STOCK_HEADROOM_ML = 5;

export type OneMgPerDropStockPlan = {
  bottleVolumeMl: number;
  headroomMl: number;
  stockVolumeMl: number;
  totalMixMassG: number;
  estimatedDropCount: number;
  saltMassMg: number;
  saltMassG: number;
  waterMassG: number;
};

/**
 * Mirrors the DIY concentrate mass calculation for a fixed 1 mg salt-per-drop
 * stock. Bottle capacity in mL is treated as the approximate total mix mass in
 * grams, and the measured water-drop mass estimates how many drops that mass
 * will dispense.
 */
export function calculateOneMgPerDropStockPlan(
  bottleVolumeMl: number,
  waterDropMassG: number,
): OneMgPerDropStockPlan | null {
  if (
    !Number.isFinite(bottleVolumeMl)
    || bottleVolumeMl <= WATERMANCER_GUIDE_STOCK_HEADROOM_ML
    || !Number.isFinite(waterDropMassG)
    || waterDropMassG <= 0
  ) {
    return null;
  }

  const stockVolumeMl = bottleVolumeMl - WATERMANCER_GUIDE_STOCK_HEADROOM_ML;
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
    bottleVolumeMl,
    headroomMl: WATERMANCER_GUIDE_STOCK_HEADROOM_ML,
    stockVolumeMl,
    totalMixMassG,
    estimatedDropCount,
    saltMassMg,
    saltMassG,
    waterMassG,
  };
}

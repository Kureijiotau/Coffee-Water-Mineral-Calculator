export type StockDropCalibration = {
  basis: 'stock' | 'water-estimate';
  drops: number;
  massG: number;
  compositionKey: string;
  tipKey: string;
};
export type MassStockInput = { totalStockMassG: number; salts: Array<{ saltId: string; physicalMassMg: number }> };
const positive = (value: number) => Number.isFinite(value) && value > 0;
export function buildMassStockPlan({ totalStockMassG, salts }: MassStockInput) {
  if (!positive(totalStockMassG) || salts.some(s => !Number.isFinite(s.physicalMassMg) || s.physicalMassMg < 0))
    return { valid: false as const, reason: 'Enter a positive stock weight and nonnegative, finite salt masses.' };
  const totalSaltMassMg = salts.reduce((sum, salt) => sum + salt.physicalMassMg, 0);
  const waterMassG = totalStockMassG - totalSaltMassMg / 1000;
  if (!positive(waterMassG)) return { valid: false as const, reason: 'Salt mass must be less than total stock mass, leaving water to dissolve it.' };
  return { valid: true as const, totalStockMassG, totalSaltMassMg, waterMassG,
    initialWaterMinG: waterMassG * 0.2, initialWaterMaxG: waterMassG * 0.3,
    saltMgPerStockG: totalSaltMassMg / totalStockMassG, strengthPercentWw: totalSaltMassMg / totalStockMassG / 10 };
}
export function resolveStockDropCalibration(calibration: StockDropCalibration | null, compositionKey: string, tipKey: string) {
  if (!calibration || !positive(calibration.drops) || !positive(calibration.massG)
    || calibration.tipKey !== tipKey || (calibration.basis === 'stock' && calibration.compositionKey !== compositionKey))
    return { gramsPerDrop: null, basis: 'unavailable' as const };
  return { gramsPerDrop: calibration.massG / calibration.drops, basis: calibration.basis };
}
export function computeMassStockDose(input: {
  totalStockMassG: number; strength: number; finalLiters: number;
  calibration: StockDropCalibration | null; compositionKey: string; tipKey: string;
}) {
  if (![input.totalStockMassG, input.strength, input.finalLiters].every(positive))
    return { valid: false as const, reason: 'Stock mass, recipe strength, and brew volume must be positive finite numbers.' };
  const calibration = resolveStockDropCalibration(input.calibration, input.compositionKey, input.tipKey);
  const doseMassG = input.totalStockMassG * input.finalLiters / input.strength;
  return { valid: true as const, doseMassG, gramsPerDrop: calibration.gramsPerDrop,
    drops: calibration.gramsPerDrop ? doseMassG / calibration.gramsPerDrop : null, calibrationBasis: calibration.basis };
}

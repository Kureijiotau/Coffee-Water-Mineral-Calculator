import { buildMassStockPlan, type StockDropCalibration } from './concentrateMass';

/** Formulation target only: verify mg/drop using the actual prepared stock. */
export function calculateOneMgPerDropStockPlan(totalStockMassG: number, calibration: StockDropCalibration) {
  if (!calibration || ![totalStockMassG, calibration.massG, calibration.drops].every(v => Number.isFinite(v) && v > 0)) return null;
  const gramsPerDrop = calibration.massG / calibration.drops;
  const estimatedDropCount = totalStockMassG / gramsPerDrop;
  const saltMassMg = estimatedDropCount; // 1 physical mg per planning drop
  const plan = buildMassStockPlan({ totalStockMassG, salts: [{ saltId: 'physical-salt', physicalMassMg: saltMassMg }] });
  if (!plan.valid) return null;
  return { ...plan, saltMassMg, saltMassG: saltMassMg / 1000, estimatedDropCount, calibrationBasis: calibration.basis };
}

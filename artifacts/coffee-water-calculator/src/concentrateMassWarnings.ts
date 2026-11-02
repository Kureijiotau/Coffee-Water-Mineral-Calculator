import { checkConcentrate, getSaltSolubilityLimitGPer100Ml, SALTS, ALL_IN_ONE_CONCENTRATE_MAX_STRENGTH, ALL_IN_ONE_CONCENTRATE_SAFETY_FACTOR, type ConcentrateWarning } from './waterData';
import { buildMassStockPlan, recipeStockSaltMasses } from './concentrateMass';

export function checkMassConcentrate(input: {
  strength: number; saltTargets: Record<string, number>; formIdxBySaltId: Record<string, number>; totalStockMassG: number;
}): ConcentrateWarning[] {
  if (Object.entries(input.saltTargets).some(([id, target]) => target > 0 && ['mgoh2', 'caco3'].includes(id)))
    return [{ severity: 'error', saltNames: [], message: 'SodaStream bicarbonate salts require the separate carbonation workflow; do not prepare them as ordinary dropper stocks.' }];
  const salts = recipeStockSaltMasses(input.saltTargets, input.formIdxBySaltId, input.strength);
  const plan = buildMassStockPlan({ totalStockMassG: input.totalStockMassG, salts });
  if (!plan.valid) return [{ severity: 'error', saltNames: [], message: plan.reason }];
  // This is solvent-water volume only, NOT stock volume. Reactive-pair tests
  // conservatively use this as their disclosed approximate volume denominator.
  const estimatedSolventWaterMl = plan.waterMassG;
  const warnings = checkConcentrate(Math.max(input.strength, 1.000001), input.saltTargets, input.formIdxBySaltId, estimatedSolventWaterMl)
    .filter(w => !/Measurement|precision|mL.*dose|dosing/i.test(w.message));
  for (const row of salts) {
    const salt = SALTS.find(s => s.id === row.saltId)!;
    const formIdx = input.formIdxBySaltId[row.saltId] ?? salt.defaultFormIdx ?? 0;
    const limit = getSaltSolubilityLimitGPer100Ml(row.saltId, formIdx);
    if (limit !== null && row.physicalMassMg / 1000 / plan.waterMassG * 100 > limit)
      warnings.push({ severity: 'error', saltNames: [salt.name], message: `${salt.name} exceeds its estimated solubility per 100 g water. Reduce strength or increase target stock weight.` });
  }
  warnings.push({ severity: 'info', saltNames: [], message: 'Solubility uses calculated water mass (plain water ≈ 1 g/mL). Reactive-pair/precipitation checks use that solvent volume as a conservative estimate; finished-stock density is not measured.' });
  return warnings;
}
export function recommendMassConcentrateStrength(input: {
  saltTargets: Record<string, number>; formIdxBySaltId: Record<string, number>; totalStockMassG: number; gramsPerDrop: number;
}): number | null {
  if (![input.totalStockMassG, input.gramsPerDrop].every(v => Number.isFinite(v) && v > 0)) return null;
  const concern = (strength: number) => checkMassConcentrate({ ...input, strength }).some(w => w.severity !== 'info');
  if (concern(1)) return null;
  let low = 1;
  let high = Math.min(ALL_IN_ONE_CONCENTRATE_MAX_STRENGTH, Math.floor(input.totalStockMassG * 0.1 / input.gramsPerDrop));
  if (high < 1) return null;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (concern(mid)) high = mid - 1; else low = mid;
  }
  return Math.max(1, Math.floor(low * ALL_IN_ONE_CONCENTRATE_SAFETY_FACTOR));
}

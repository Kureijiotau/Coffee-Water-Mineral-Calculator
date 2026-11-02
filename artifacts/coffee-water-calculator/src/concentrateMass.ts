import { SALTS, type IonId } from './waterData';
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
  if (!positive(totalSaltMassMg)) return { valid: false as const, reason: 'Choose a positive salt amount for this stock.' };
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
export type RecipeMassStockInput = {
  saltTargets: Record<string, number>; formIdxBySaltId: Record<string, number>; strength: number;
  totalStockMassG: number; calibration: StockDropCalibration | null; finalLiters: number; compositionKey: string; tipKey: string;
};
export function recipeStockSaltMasses(saltTargets: Record<string, number>, forms: Record<string, number>, strength: number) {
  return Object.entries(saltTargets).map(([saltId, target]) => {
    const salt = SALTS.find(s => s.id === saltId);
    const form = salt?.hydrationForms[forms[saltId] ?? salt.defaultFormIdx ?? 0];
    return { saltId, physicalMassMg: salt && form && Number.isFinite(target) && target >= 0
      ? target * strength * form.molarMass / salt.anhydrousMass : NaN };
  });
}
export function stockCompositionKey(salts: MassStockInput['salts'], totalStockMassG: number, forms: Record<string, number> = {}) {
  return [...salts].sort((a, b) => a.saltId.localeCompare(b.saltId))
    .map(s => `${s.saltId}:${forms[s.saltId] ?? 0}:${(s.physicalMassMg / totalStockMassG).toPrecision(12)}`).join('|');
}
/** Scale preparation size, not mass fraction or the reference strength control. */
export function scaleMassStockForSaltEdit(stock: { totalStockMassG: number; batchScale?: number }, previousSaltMassG: number, nextSaltMassG: number) {
  if (![stock.totalStockMassG, previousSaltMassG, nextSaltMassG, stock.batchScale ?? 1].every(positive)) return null;
  const ratio = nextSaltMassG / previousSaltMassG;
  return { totalStockMassG: stock.totalStockMassG * ratio, batchScale: (stock.batchScale ?? 1) * ratio };
}
export function computeRecipeMassDropEquivalents(input: RecipeMassStockInput) {
  const salts = recipeStockSaltMasses(input.saltTargets, input.formIdxBySaltId, input.strength);
  const plan = buildMassStockPlan({ totalStockMassG: input.totalStockMassG, salts });
  if (!plan.valid) return plan;
  const dose = computeMassStockDose(input);
  if (!dose.valid) return dose;
  const perSalt = salts.map(s => ({ saltId: s.saltId, saltMgPerStockG: s.physicalMassMg / input.totalStockMassG,
    saltMgPerDrop: dose.gramsPerDrop ? s.physicalMassMg / input.totalStockMassG * dose.gramsPerDrop : null }));
  const ionPpmPerDrop: Partial<Record<IonId, number>> | null = dose.gramsPerDrop ? {} : null;
  if (ionPpmPerDrop && dose.gramsPerDrop) {
    for (const [id, target] of Object.entries(input.saltTargets)) {
      for (const ion of SALTS.find(s => s.id === id)?.ions ?? []) {
        ionPpmPerDrop[ion.ionId] = (ionPpmPerDrop[ion.ionId] ?? 0)
          + target * input.strength / input.totalStockMassG * dose.gramsPerDrop * ion.fraction / input.finalLiters;
      }
    }
  }
  const roundedDrops = dose.drops === null ? null : Math.round(dose.drops);
  const roundedDeliveredIons: Partial<Record<IonId, number>> | null = ionPpmPerDrop && roundedDrops !== null
    ? Object.fromEntries(Object.entries(ionPpmPerDrop).map(([id, ppm]) => [id, ppm * roundedDrops])) : null;
  return { ...plan, ...dose, perSalt, batchDrops: dose.drops, totalSaltMgPerStockG: plan.saltMgPerStockG,
    totalSaltMgPerDrop: dose.gramsPerDrop ? plan.saltMgPerStockG * dose.gramsPerDrop : null,
    ionPpmPerDrop, roundedDrops, roundedDeliveredIons };
}
export function computeRecipeMassStrengthForPhysicalSaltPpm(input: Omit<RecipeMassStockInput, 'strength'> & { physicalSaltPpmPerDrop: number }) {
  const calibration = resolveStockDropCalibration(input.calibration, input.compositionKey, input.tipKey);
  const physicalMass = recipeStockSaltMasses(input.saltTargets, input.formIdxBySaltId, 1).reduce((sum, salt) => sum + salt.physicalMassMg, 0);
  if (!positive(input.physicalSaltPpmPerDrop) || !positive(input.totalStockMassG) || !positive(input.finalLiters)
    || !positive(physicalMass) || !calibration.gramsPerDrop)
    return { valid: false as const, reason: 'A positive target, recipe, and drop-mass calibration are required.' };
  const strength = input.physicalSaltPpmPerDrop * input.finalLiters * input.totalStockMassG / (physicalMass * calibration.gramsPerDrop);
  const plan = buildMassStockPlan({ totalStockMassG: input.totalStockMassG, salts: recipeStockSaltMasses(input.saltTargets, input.formIdxBySaltId, strength) });
  if (!plan.valid) return plan;
  return { valid: true as const, strength, calibrationBasis: calibration.basis };
}

import { describe, expect, it } from 'vitest';
import { buildMassStockPlan, computeMassStockDose, resolveStockDropCalibration } from './concentrateMass';
import { computeRecipeMassDropEquivalents, computeRecipeMassStrengthForPhysicalSaltPpm, scaleMassStockForSaltEdit } from './concentrateMass';

describe('mass-based stock planning', () => {
  it('balances a 100 g 5% stock and starts with 20–30% of water', () => {
    expect(buildMassStockPlan({ totalStockMassG: 100, salts: [{ saltId: 'test', physicalMassMg: 5000 }] }))
      .toMatchObject({ valid: true, waterMassG: 95, initialWaterMinG: 19, initialWaterMaxG: 28.5,
        saltMgPerStockG: 50, strengthPercentWw: 5 });
  });
  it.each([0, -1, NaN, Infinity, 5])('rejects invalid or waterless stock mass %s', mass => {
    expect(buildMassStockPlan({ totalStockMassG: mass, salts: [{ saltId: 'test', physicalMassMg: 5000 }] }).valid).toBe(false);
  });
  it('rejects invalid salt masses', () => {
    expect(buildMassStockPlan({ totalStockMassG: 100, salts: [{ saltId: 'test', physicalMassMg: -1 }] }).valid).toBe(false);
  });
  const calibration = { basis: 'stock' as const, drops: 100, massG: 5, compositionKey: 'a', tipKey: 'straight' };
  it('doses stock in grams and derives drops from finished-stock mass', () => {
    expect(computeMassStockDose({ totalStockMassG: 100, strength: 20, finalLiters: 2, calibration, compositionKey: 'a', tipKey: 'straight' }))
      .toMatchObject({ valid: true, doseMassG: 10, gramsPerDrop: 0.05, drops: 200, calibrationBasis: 'stock' });
  });
  it('does not promote water estimates or other compositions/tips', () => {
    expect(resolveStockDropCalibration({ ...calibration, basis: 'water-estimate' }, 'b', 'straight').basis).toBe('water-estimate');
    expect(resolveStockDropCalibration(calibration, 'b', 'straight').basis).toBe('unavailable');
    expect(resolveStockDropCalibration(calibration, 'a', 'round').basis).toBe('unavailable');
    expect(resolveStockDropCalibration({ ...calibration, massG: NaN }, 'a', 'straight').basis).toBe('unavailable');
  });
});

it('preserves recipe salt and final ion delivery across stock masses and hydration forms', () => {
  for (const totalStockMassG of [50, 100, 250]) {
    const result = computeRecipeMassDropEquivalents({ saltTargets: { mgso4: 30 }, formIdxBySaltId: { mgso4: 1 }, strength: 20,
      totalStockMassG, finalLiters: 2, calibration: null, compositionKey: 'a', tipKey: 'straight' });
    expect(result.valid).toBe(true);
    if (!result.valid) continue;
    expect(result.doseMassG).toBe(totalStockMassG / 10);
    expect(result.perSalt[0].saltMgPerStockG * result.doseMassG).toBeCloseTo(60 * 246.47 / 120.37, 1);
    expect(result.batchDrops).toBeNull();
  }
});
it('solves physical mg/drop without converting stock grams to mL', () => {
  const result = computeRecipeMassStrengthForPhysicalSaltPpm({ saltTargets: { nacl: 10 }, formIdxBySaltId: {},
    totalStockMassG: 100, finalLiters: 1, calibration: { basis: 'water-estimate', drops: 100, massG: 5, compositionKey: '', tipKey: 'straight' },
    compositionKey: '', tipKey: 'straight', physicalSaltPpmPerDrop: 1 });
  expect(result).toMatchObject({ valid: true, strength: 200, calibrationBasis: 'water-estimate' });
});
it('anchors a separate salt edit without changing potency or another stock', () => {
  const otherStock = { totalStockMassG: 80, batchScale: 1 };
  const next = scaleMassStockForSaltEdit({ totalStockMassG: 100, batchScale: 1 }, 1, 2);
  expect(next).toEqual({ totalStockMassG: 200, batchScale: 2 });
  const args = { saltTargets: { nacl: 50 }, formIdxBySaltId: {}, finalLiters: 1, calibration: null, compositionKey: '', tipKey: 'straight' };
  const before = computeRecipeMassDropEquivalents({ ...args, totalStockMassG: 100, strength: 20 });
  const after = computeRecipeMassDropEquivalents({ ...args, totalStockMassG: 200, strength: 20 * next!.batchScale });
  if (!before.valid || !after.valid) throw new Error('Expected valid plans');
  expect(after.totalSaltMgPerStockG).toBe(before.totalSaltMgPerStockG);
  expect(after.doseMassG).toBe(before.doseMassG);
  expect(otherStock).toEqual({ totalStockMassG: 80, batchScale: 1 });
});

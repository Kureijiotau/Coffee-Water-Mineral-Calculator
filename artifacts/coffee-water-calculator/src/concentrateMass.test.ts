import { describe, expect, it } from 'vitest';
import { buildMassStockPlan, computeMassStockDose, resolveStockDropCalibration } from './concentrateMass';

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

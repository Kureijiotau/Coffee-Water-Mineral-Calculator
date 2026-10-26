import { describe, expect, it } from 'vitest';
import { calculateOneMgPerDropStockPlan } from './watermancerGuideStock';

describe('Watermancer Guide one-milligram stock preparation', () => {
  it('uses calibrated water-drop mass to calculate salt and water for the requested working fill volume', () => {
    const plan = calculateOneMgPerDropStockPlan(50, 0.05);

    expect(plan).toMatchObject({
      workingFillVolumeMl: 50,
      minimumBottleVolumeMl: 55,
      stockVolumeMl: 50,
      totalMixMassG: 50,
      estimatedDropCount: 1000,
      saltMassMg: 1000,
      saltMassG: 1,
      waterMassG: 49,
    });
  });

  it('changes the amount for a different calibrated drop size, not for the salt type', () => {
    const plan = calculateOneMgPerDropStockPlan(50, 5 / 60);

    expect(plan).toMatchObject({
      workingFillVolumeMl: 50,
      minimumBottleVolumeMl: 55,
      stockVolumeMl: 50,
      totalMixMassG: 50,
      estimatedDropCount: 600,
      saltMassMg: 600,
      saltMassG: 0.6,
      waterMassG: 49.4,
    });
  });

  it.each([
    [-1, 0.05],
    [0, 0.05],
    [30, 0],
    [Number.NaN, 0.05],
    [30, Number.NaN],
    [1, 0.0005],
  ])('returns no plan for unusable volume/drop mass (%s, %s)', (volumeMl, dropMassG) => {
    expect(calculateOneMgPerDropStockPlan(volumeMl, dropMassG)).toBeNull();
  });

  it('accepts a 5 mL working fill; headroom is supplied by the larger bottle, not deducted from the input', () => {
    expect(calculateOneMgPerDropStockPlan(5, 0.05)).toMatchObject({
      workingFillVolumeMl: 5,
      minimumBottleVolumeMl: 10,
      stockVolumeMl: 5,
      totalMixMassG: 5,
    });
  });
});

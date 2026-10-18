import { describe, expect, it } from 'vitest';
import { calculateOneMgPerDropStockPlan } from './watermancerGuideStock';

describe('Watermancer Guide one-milligram stock preparation', () => {
  it('uses calibrated water-drop mass to calculate salt and water in the target mix', () => {
    const plan = calculateOneMgPerDropStockPlan(30, 0.05);

    expect(plan).toMatchObject({
      bottleVolumeMl: 30,
      headroomMl: 5,
      stockVolumeMl: 25,
      totalMixMassG: 25,
      estimatedDropCount: 500,
      saltMassMg: 500,
      saltMassG: 0.5,
      waterMassG: 24.5,
    });
  });

  it('changes the amount for a different calibrated drop size, not for the salt type', () => {
    const plan = calculateOneMgPerDropStockPlan(30, 5 / 60);

    expect(plan).toMatchObject({
      bottleVolumeMl: 30,
      headroomMl: 5,
      stockVolumeMl: 25,
      totalMixMassG: 25,
      estimatedDropCount: 300,
      saltMassMg: 300,
      saltMassG: 0.3,
      waterMassG: 24.7,
    });
  });

  it.each([
    [0, 0.05],
    [30, 0],
    [Number.NaN, 0.05],
    [30, Number.NaN],
    [1, 0.0005],
    [5, 0.05],
  ])('returns no plan for unusable volume/drop mass (%s, %s)', (volumeMl, dropMassG) => {
    expect(calculateOneMgPerDropStockPlan(volumeMl, dropMassG)).toBeNull();
  });
});

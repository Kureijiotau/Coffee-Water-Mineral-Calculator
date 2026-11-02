import { expect, it } from 'vitest';
import { calculateOneMgPerDropStockPlan } from './watermancerGuideStock';
const waterEstimate = { basis: 'water-estimate' as const, massG: 5, drops: 100, compositionKey: '', tipKey: 'straight' };
it('uses target finished mass, with explicit estimate provenance and partial water', () => {
  const plan = calculateOneMgPerDropStockPlan(50, waterEstimate);
  expect(plan).toMatchObject({ totalStockMassG: 50, saltMassG: 1, waterMassG: 49,
    initialWaterMinG: 9.8, initialWaterMaxG: 14.7, calibrationBasis: 'water-estimate' });
  expect(plan).not.toHaveProperty('stockVolumeMl');
  expect(plan).not.toHaveProperty('minimumBottleVolumeMl');
});
it.each([0, -1, NaN, Infinity])('rejects invalid target %s', value => expect(calculateOneMgPerDropStockPlan(value, waterEstimate)).toBeNull());
it('rejects drop targets which leave no water', () => {
  expect(calculateOneMgPerDropStockPlan(50, { ...waterEstimate, massG: 0.0001 })).toBeNull();
});

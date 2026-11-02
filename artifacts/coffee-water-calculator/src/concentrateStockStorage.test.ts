import { expect, it } from 'vitest';
import { readConcentrateStockRecord } from './concentrateStockStorage';
it('round trips mass groups and preserves calibration provenance', () => {
  const plan = { version: 2, basis: 'mass', strategy: 'individual', finalLiters: 1, dropperStyle: 'round', groups: [
    { id: 'mgso4', totalStockMassG: 100, strength: 20, physicalSaltPpmPerDrop: 1, saltIds: ['mgso4'], calibration: null },
  ] };
  expect(readConcentrateStockRecord(JSON.parse(JSON.stringify(plan)))).toEqual({ kind: 'mass', plan });
});
it('preserves legacy volume records unchanged without assuming density', () => {
  const original = { strategy: 'all-in-one', groups: [{ volumeMl: 59, strength: 20 }] };
  const before = JSON.stringify(original);
  expect(readConcentrateStockRecord(original)).toEqual({ kind: 'legacy-volume', original });
  expect(JSON.stringify(original)).toBe(before);
});
it.each([
  null, {}, { version: 2, basis: 'mass', groups: [{ totalStockMassG: NaN }] },
  { version: 2, basis: 'mass', strategy: 'individual', finalLiters: 1, groups: [
    { id: 'x', totalStockMassG: 100, volumeMl: 100, strength: 20, saltIds: ['mgso4'], calibration: null },
  ] },
])('rejects invalid/mixed records', value => expect(readConcentrateStockRecord(value).kind).toBe('invalid'));

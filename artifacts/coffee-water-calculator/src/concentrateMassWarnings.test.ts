import { expect, it } from 'vitest';
import { checkMassConcentrate, recommendMassConcentrateStrength } from './concentrateMassWarnings';
it('rejects waterless stocks and warns for solvent-relative solubility', () => {
  expect(checkMassConcentrate({ strength: 1000, saltTargets: { nacl: 100 }, formIdxBySaltId: {}, totalStockMassG: 100 })
    .some(w => w.severity === 'error')).toBe(true);
  expect(checkMassConcentrate({ strength: 1, saltTargets: { nacl: 30000 }, formIdxBySaltId: {}, totalStockMassG: 100 })
    .some(w => w.severity === 'error' && w.message.includes('water'))).toBe(true);
});
it('recommends a conservative concern-free mass stock, not a volume-based limit', () => {
  const input = { saltTargets: { nacl: 30 }, formIdxBySaltId: {}, totalStockMassG: 100, gramsPerDrop: 0.05 };
  const recommended = recommendMassConcentrateStrength(input);
  expect(recommended).not.toBeNull();
  expect(checkMassConcentrate({ ...input, strength: recommended! }).some(w => w.severity !== 'info')).toBe(false);
  expect(recommended!).toBeLessThanOrEqual(200);
});
it('retains reactive pair checks with disclosed volume approximation', () => {
  const warnings = checkMassConcentrate({ strength: 500, saltTargets: { cacl2: 40, mgso4: 40 }, formIdxBySaltId: {}, totalStockMassG: 100 });
  expect(warnings.some(w => /calcium|gypsum/i.test(w.message))).toBe(true);
  expect(warnings.some(w => /estimate/i.test(w.message))).toBe(true);
});

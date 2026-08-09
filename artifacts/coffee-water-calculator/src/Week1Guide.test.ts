import { describe, expect, it } from 'vitest';
import { computeGH, computeIonTotals, computeKH } from './waterData';
import { equivalentSaltTarget } from './Week1Guide';

describe('Robert Asami Day 5 mineral swap', () => {
  it('preserves the magnesium GH contribution when swapping Epsom for magnesium chloride', () => {
    const swappedTarget = equivalentSaltTarget('mgso4', 'mgcl2', 'magnesium', 36.153);
    const originalGh = computeGH(computeIonTotals({ mgso4: 36.153 }, {}, 1));
    const swappedGh = computeGH(computeIonTotals({ mgcl2: swappedTarget }, {}, 1));

    expect(swappedTarget).toBeGreaterThan(0);
    expect(swappedGh).toBeCloseTo(originalGh, 5);
  });

  it('preserves the bicarbonate KH contribution when swapping sodium for potassium bicarbonate', () => {
    const swappedTarget = equivalentSaltTarget('nahco3', 'khco3', 'bicarbonate', 29.76);
    const originalKh = computeKH(computeIonTotals({ nahco3: 29.76 }, {}, 1));
    const swappedKh = computeKH(computeIonTotals({ khco3: swappedTarget }, {}, 1));

    expect(swappedTarget).toBeGreaterThan(0);
    expect(swappedKh).toBeCloseTo(originalKh, 5);
  });
});
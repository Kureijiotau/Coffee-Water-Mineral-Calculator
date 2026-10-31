import { describe, expect, it } from 'vitest';
import { computeGH, computeIonTotals, computeKH, SALTS } from './waterData';
import { DAYS, equivalentSaltTarget } from './Week1Guide';

describe('Robert Asami published Week 1 recipes', () => {
  const publishedMasses = [
    { mgso4: 148, nahco3: 25 },
    { cacl2: 44, nahco3: 25 },
    { mgso4: 100, cacl2: 22, nahco3: 25 },
    { mgso4: 50, cacl2: 44, nahco3: 25 },
    { mgso4: 74, cacl2: 33, khco3: 30 },
    { mgcl2: 30, mgso4: 37, cacl2: 17, nahco3: 17, khco3: 10, nacl: 15 },
    { mgso4: 37, cacl2: 17, nahco3: 8, khco3: 10, nacl: 20 },
  ];

  publishedMasses.forEach((masses, index) => {
    it(`preserves the published physical salt masses for Day ${index + 1}`, () => {
      const day = DAYS[index];
      expect(Object.keys(day.targets).sort()).toEqual(Object.keys(masses).sort());
      for (const [id, mass] of Object.entries(masses)) {
        const salt = SALTS.find(item => item.id === id)!;
        const form = salt.hydrationForms[day.formIdx[id]];
        expect(day.targets[id] * form.molarMass / salt.anhydrousMass).toBeCloseTo(mass!, 3);
      }
    });
  });

  it('keeps Day 5 on the published potassium buffer and labels Day 6 contributions correctly', () => {
    expect(DAYS[4].targets.nahco3).toBeUndefined();
    expect(DAYS[4].displayTargets.khco3).toBe('15 KH');
    expect(DAYS[5].displayTargets.mgcl2).toBe('15 GH');
    expect(DAYS[5].displayTargets.nahco3).toBe('10 KH');
  });
});

describe('Robert Asami Day 5 mineral swap', () => {
  it('preserves the magnesium GH contribution when swapping Epsom for magnesium chloride', () => {
    const swappedTarget = equivalentSaltTarget('mgso4', 'mgcl2', 'magnesium', 36.153);
    const originalGh = computeGH(computeIonTotals({ mgso4: 36.153 }, {}, 1));
    const swappedGh = computeGH(computeIonTotals({ mgcl2: swappedTarget }, {}, 1));

    expect(swappedTarget).toBeGreaterThan(0);
    expect(swappedGh).toBeCloseTo(originalGh, 5);
  });

  it('preserves the bicarbonate KH contribution when swapping sodium for potassium bicarbonate', () => {
    const swappedTarget = equivalentSaltTarget('nahco3', 'khco3', 'bicarbonate', 25);
    const originalKh = computeKH(computeIonTotals({ nahco3: 25 }, {}, 1));
    const swappedKh = computeKH(computeIonTotals({ khco3: swappedTarget }, {}, 1));

    expect(swappedTarget).toBeGreaterThan(0);
    expect(swappedKh).toBeCloseTo(originalKh, 5);
  });
});
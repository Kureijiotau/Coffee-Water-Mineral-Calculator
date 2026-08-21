import { describe, expect, it } from 'vitest';
import {
  ACTIVE_ION_IDS,
  SALTS,
  computeIonTotals,
  type IonId,
} from './waterData';
import { solveBoundedCoupledSaltTargets } from './watermancerSaltSolver';

function ionError(
  saltTargets: Record<string, number>,
  targetIons: Partial<Record<IonId, number>>,
): number {
  const actual = computeIonTotals(saltTargets, {}, 1);
  return ACTIVE_ION_IDS.reduce(
    (total, ionId) => total + Math.abs((actual[ionId] ?? 0) - (targetIons[ionId] ?? 0)),
    0,
  );
}

describe('solveBoundedCoupledSaltTargets', () => {
  it('reconstructs a target from multiple coupled salts', () => {
    const sourceTargets = { cacl2: 24, mgso4: 36 };
    const targetIons = computeIonTotals(sourceTargets, {}, 1);
    const allowedSalts = SALTS.filter(salt => Object.keys(sourceTargets).includes(salt.id));

    const result = solveBoundedCoupledSaltTargets({
      allowedSalts,
      fixedIonTotals: {},
      targetIons,
      ionWeights: Object.fromEntries(ACTIVE_ION_IDS.map(id => [id, 1])),
      scoreCandidate: candidate => ionError(candidate, targetIons),
    });

    expect(result).not.toBeNull();
    expect(result?.saltTargets.cacl2).toBeCloseTo(sourceTargets.cacl2, 4);
    expect(result?.saltTargets.mgso4).toBeCloseTo(sourceTargets.mgso4, 4);
    expect(result?.score).toBeLessThan(1e-5);
  });

  it('keeps an optional salt at zero when another salt avoids its counter-ion', () => {
    const mgso4 = SALTS.find(salt => salt.id === 'mgso4')!;
    const targetIons = computeIonTotals({ mgso4: 30 }, {}, 1);
    const result = solveBoundedCoupledSaltTargets({
      allowedSalts: SALTS.filter(salt => ['mgso4', 'mgcl2'].includes(salt.id)),
      fixedIonTotals: {},
      targetIons: { ...targetIons, chloride: 0 },
      ionWeights: Object.fromEntries(ACTIVE_ION_IDS.map(id => [id, 1])),
      scoreCandidate: candidate => ionError(candidate, { ...targetIons, chloride: 0 }),
    });

    expect(result).not.toBeNull();
    expect(result?.saltTargets.mgso4).toBeCloseTo(30, 4);
    expect(result?.saltTargets.mgcl2).toBe(0);
  });

  it('omits a sub-minimum dose when the practical floor worsens the match', () => {
    const kcl = SALTS.find(salt => salt.id === 'kcl')!;
    const targetIons = computeIonTotals({ kcl: 0.25 }, {}, 1);
    const result = solveBoundedCoupledSaltTargets({
      allowedSalts: [kcl],
      fixedIonTotals: {},
      targetIons,
      ionWeights: Object.fromEntries(ACTIVE_ION_IDS.map(id => [id, 1])),
      minimumDosePpmFor: () => 10,
      scoreCandidate: candidate => ionError(candidate, targetIons),
    });

    expect(result).not.toBeNull();
    expect(result?.saltTargets.kcl).toBe(0);
    expect(result?.score).toBeLessThan(1);
  });
});
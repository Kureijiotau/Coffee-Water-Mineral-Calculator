import { describe, expect, it } from 'vitest';
import { calculateSaltUnitsBreakdown } from './saltUnitsExplainer';

function contributionFor(
  breakdown: ReturnType<typeof calculateSaltUnitsBreakdown>,
  saltId: string,
) {
  return breakdown.contributions.find(contribution => contribution.saltId === saltId);
}

describe('calculateSaltUnitsBreakdown', () => {
  it('converts a hydrated magnesium chloride target into its physical mass and GH contribution', () => {
    const breakdown = calculateSaltUnitsBreakdown({
      saltTargets: { mgcl2: 40 },
      formIndexBySaltId: { mgcl2: 1 },
      liters: 1,
    });

    const magnesiumChloride = contributionFor(breakdown, 'mgcl2');

    expect(breakdown.available).toBe(true);
    expect(magnesiumChloride).toMatchObject({
      targetPpm: 40,
      hydrationFormLabel: 'Hexahydrate',
      weighedMassMg: expect.closeTo(85.4161, 3),
      ionPpm: {
        magnesium: expect.closeTo(10.21165, 4),
        chloride: expect.closeTo(29.78835, 4),
      },
      ghCaCo3Ppm: expect.closeTo(42.05157, 4),
      khCaCo3Ppm: 0,
    });
    expect(magnesiumChloride?.ghCaCo3Ppm).not.toBe(40);
  });

  it('attributes bicarbonate to KH and sodium chloride to neither hardness metric', () => {
    const breakdown = calculateSaltUnitsBreakdown({
      saltTargets: { nahco3: 25, nacl: 20 },
      formIndexBySaltId: {},
      liters: 1,
    });

    expect(contributionFor(breakdown, 'nahco3')).toMatchObject({
      ghCaCo3Ppm: 0,
      khCaCo3Ppm: expect.closeTo(14.88981, 4),
    });
    expect(contributionFor(breakdown, 'nacl')).toMatchObject({
      ghCaCo3Ppm: 0,
      khCaCo3Ppm: 0,
    });
    expect(breakdown.totalGhCaCo3Ppm).toBe(0);
    expect(breakdown.totalKhCaCo3Ppm).toBeCloseTo(14.88981, 4);
  });

  it('scales the physical weighed mass with batch volume but preserves concentrations', () => {
    const oneLiter = calculateSaltUnitsBreakdown({
      saltTargets: { mgcl2: 40 },
      formIndexBySaltId: { mgcl2: 1 },
      liters: 1,
    });
    const twoLiters = calculateSaltUnitsBreakdown({
      saltTargets: { mgcl2: 40 },
      formIndexBySaltId: { mgcl2: 1 },
      liters: 2,
    });

    expect(contributionFor(twoLiters, 'mgcl2')?.weighedMassMg).toBeCloseTo(
      (contributionFor(oneLiter, 'mgcl2')?.weighedMassMg ?? 0) * 2,
      8,
    );
    expect(contributionFor(twoLiters, 'mgcl2')?.ionPpm.magnesium).toBeCloseTo(
      contributionFor(oneLiter, 'mgcl2')?.ionPpm.magnesium ?? 0,
      8,
    );
    expect(twoLiters.totalGhCaCo3Ppm).toBeCloseTo(oneLiter.totalGhCaCo3Ppm, 8);
  });

  it('uses the salt default when a hydration-form index is invalid', () => {
    const breakdown = calculateSaltUnitsBreakdown({
      saltTargets: { mgcl2: 40 },
      formIndexBySaltId: { mgcl2: 99 },
      liters: 1,
    });

    expect(contributionFor(breakdown, 'mgcl2')?.weighedMassMg).toBeCloseTo(85.4161, 3);
  });

  it('returns an unavailable empty breakdown when there are no active salt targets', () => {
    expect(calculateSaltUnitsBreakdown({
      saltTargets: { mgcl2: 0, nahco3: Number.NaN },
      formIndexBySaltId: {},
      liters: 1,
    })).toEqual({
      available: false,
      contributions: [],
      totalGhCaCo3Ppm: 0,
      totalKhCaCo3Ppm: 0,
      totalTdsMgL: 0,
    });
  });

  it('returns an unavailable empty breakdown for a nonpositive or non-finite batch volume', () => {
    for (const liters of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(calculateSaltUnitsBreakdown({
        saltTargets: { mgcl2: 40 },
        formIndexBySaltId: { mgcl2: 1 },
        liters,
      }).available).toBe(false);
    }
  });
});

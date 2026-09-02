import { describe, expect, it } from 'vitest';
import { computeGH, computeKH } from './waterData';
import {
  compareWatermancerRatioEvaluations,
  evaluateWatermancerRatios,
} from './watermancerRatios';

describe('Watermancer ratio evaluator', () => {
  it('recognizes exact derived and direct relationships', () => {
    const target = {
      magnesium: 5,
      calcium: 10,
      bicarbonate: 12,
      chloride: 20,
      sulfate: 10,
      sodium: 4,
      potassium: 1,
      carbonate: 0,
    };
    const evaluation = evaluateWatermancerRatios(target, target);

    expect(evaluation.positiveFloorSatisfied).toBe(true);
    expect(evaluation.aggregateRatioError).toBe(0);
    expect(evaluation.relationships.every(relationship => relationship.status === 'on-ratio')).toBe(true);
    expect(evaluation.relationships.find(relationship => relationship.id === 'gh-kh')).toMatchObject({
      desiredFirst: computeGH(target),
      desiredSecond: computeKH(target),
      actualFirst: computeGH(target),
      actualSecond: computeKH(target),
      desiredRatio: computeGH(target) / computeKH(target),
      actualRatio: computeGH(target) / computeKH(target),
    });
  });

  it('uses symmetric relative log error for ratios on either side', () => {
    const desired = { 'mg-ca': { first: 2, second: 1 } };
    const lower = evaluateWatermancerRatios(
      { magnesium: 1, calcium: 1 },
      { magnesium: 2, calcium: 1 },
      desired,
    );
    const higher = evaluateWatermancerRatios(
      { magnesium: 4, calcium: 1 },
      { magnesium: 2, calcium: 1 },
      desired,
    );

    expect(lower.relationships.find(row => row.id === 'mg-ca')?.error)
      .toBeCloseTo(Math.log(2), 8);
    expect(higher.relationships.find(row => row.id === 'mg-ca')?.error)
      .toBeCloseTo(Math.log(2), 8);
  });

  it('reports positive floor satisfaction and deficits', () => {
    const evaluation = evaluateWatermancerRatios(
      { calcium: 8, magnesium: 5 },
      { calcium: 10, magnesium: 5, bicarbonate: 0 },
    );

    expect(evaluation.positiveFloorSatisfied).toBe(false);
    expect(evaluation.floorDeficits).toMatchObject({ calcium: 1.999999 });
    expect(evaluation.floorDeficitTotal).toBeCloseTo(1.999999, 6);
  });

  it('prefers lower modeled load after equal ratio quality', () => {
    const desired = { 'mg-ca': { first: 1, second: 1 } };
    const low = evaluateWatermancerRatios(
      { magnesium: 2, calcium: 2 },
      { magnesium: 1, calcium: 1 },
      desired,
    );
    const high = evaluateWatermancerRatios(
      { magnesium: 10, calcium: 10 },
      { magnesium: 1, calcium: 1 },
      desired,
    );

    expect(compareWatermancerRatioEvaluations(low, high)).toBeLessThan(0);
  });

  it('protects zero-target ions and labels undefined relationships unavailable', () => {
    const evaluation = evaluateWatermancerRatios(
      { calcium: 10, sulfate: 0, citrates: 2 },
      { calcium: 10, sulfate: 0, citrates: 0 },
      { 'cl-sulfate': { first: 10, second: 5 } },
    );

    expect(evaluation.zeroTargetProtectionSatisfied).toBe(false);
    expect(evaluation.zeroTargetViolations).toEqual([
      { id: 'citrates', actual: 2, excess: 1.999999 },
    ]);
    const chlorideSulfate = evaluation.relationships.find(row => row.id === 'cl-sulfate');
    expect(chlorideSulfate).toMatchObject({
      available: false,
      actualRatio: null,
      status: 'unavailable',
    });
    expect(chlorideSulfate?.reason).toContain('Actual relationship');
  });

  it('prioritizes a floor-satisfying candidate over a ratio-perfect partial candidate', () => {
    const partial = evaluateWatermancerRatios(
      { magnesium: 1, calcium: 1 },
      { magnesium: 2, calcium: 2 },
      { 'mg-ca': { first: 1, second: 1 } },
    );
    const matched = evaluateWatermancerRatios(
      { magnesium: 3, calcium: 3 },
      { magnesium: 2, calcium: 2 },
      { 'mg-ca': { first: 1, second: 1 } },
    );

    expect(partial.positiveFloorSatisfied).toBe(false);
    expect(matched.positiveFloorSatisfied).toBe(true);
    expect(compareWatermancerRatioEvaluations(matched, partial)).toBeLessThan(0);
  });

  it('keeps equal ranking data deterministic', () => {
    const first = evaluateWatermancerRatios(
      { magnesium: 5, calcium: 5 },
      { magnesium: 5, calcium: 5 },
      { 'mg-ca': { first: 1, second: 1 } },
    );
    const second = evaluateWatermancerRatios(
      { magnesium: 5, calcium: 5 },
      { magnesium: 5, calcium: 5 },
      { 'mg-ca': { first: 1, second: 1 } },
    );

    expect(first.rankingKey).toEqual(second.rankingKey);
    expect(compareWatermancerRatioEvaluations(first, second)).toBe(0);
  });
});
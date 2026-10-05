import { describe, expect, it } from 'vitest';
import { ACTIVE_ION_IDS, ION_CHEMISTRY } from '@/waterData';
import {
  CHARGE_BALANCE_PPM_STEP,
  CHARGE_BALANCE_TOLERANCE_MEQ_PER_L,
  applyChargeBalanceAlternative,
  analyzeWatermancerChargeBalance,
  hasHighRelativeChargeGap,
  getWatermancerTargetSignature,
} from './watermancerChargeBalance';

describe('Watermancer charge balance', () => {
  it('uses each targetable ion’s molar mass and charge magnitude', () => {
    for (const ionId of ACTIVE_ION_IDS) {
      const { molarMass, charge } = ION_CHEMISTRY[ionId];
      const analysis = analyzeWatermancerChargeBalance({ [ionId]: molarMass });
      const expectedMeq = Math.abs(charge);

      if (charge > 0) {
        expect(analysis.positiveMeqPerL).toBeCloseTo(expectedMeq, 12);
        expect(analysis.negativeMeqPerL).toBe(0);
      } else {
        expect(analysis.negativeMeqPerL).toBeCloseTo(expectedMeq, 12);
        expect(analysis.positiveMeqPerL).toBe(0);
      }
    }
  });

  it('reports an all-zero profile separately from balanced nonzero targets', () => {
    expect(analyzeWatermancerChargeBalance({}).status).toBe('no-targets');
    expect(analyzeWatermancerChargeBalance({ sodium: 22.989769, chloride: 35.45 }).status)
      .toBe('balanced');
  });

  it('flags a relative charge gap at 20%, even at small total charge', () => {
    expect(hasHighRelativeChargeGap({ sodium: 22.989769, chloride: 28.36 })).toBe(true);
    expect(hasHighRelativeChargeGap({ sodium: 22.989769, chloride: 28.7145 })).toBe(false);
    expect(hasHighRelativeChargeGap({ sodium: 0.01 })).toBe(true);
    expect(hasHighRelativeChargeGap({})).toBe(false);
    expect(hasHighRelativeChargeGap({ sodium: Number.NaN })).toBe(false);
  });

  it('offers one-ion fixes within 0.1 ppm precision for a positive imbalance', () => {
    const analysis = analyzeWatermancerChargeBalance({ sodium: 5 });

    expect(analysis.status).toBe('unbalanced');
    expect(analysis.differenceMeqPerL).toBeGreaterThan(0);

    for (const alternative of analysis.alternatives) {
      const changedTargets = {
        sodium: 5,
        [alternative.ionId]: alternative.proposedTargetPpm,
      };
      const updated = analyzeWatermancerChargeBalance(changedTargets);
      expect(['balanced', 'no-targets']).toContain(updated.status);
      expect(Math.abs(updated.differenceMeqPerL)).toBeLessThanOrEqual(CHARGE_BALANCE_TOLERANCE_MEQ_PER_L);
      expect(alternative.proposedTargetPpm / CHARGE_BALANCE_PPM_STEP)
        .toBeCloseTo(Math.round(alternative.proposedTargetPpm / CHARGE_BALANCE_PPM_STEP), 10);
    }

    const chloride = analysis.alternatives.find(item => item.ionId === 'chloride');
    expect(chloride).toMatchObject({
      direction: 'increase',
      currentTargetPpm: 0,
    });
    expect(chloride?.proposedTargetPpm).toBeGreaterThan(0);
    expect(analysis.alternatives.every(item => item.ionId !== 'sodium' || item.direction === 'decrease'))
      .toBe(true);
  });

  it('offers one-ion fixes within 0.1 ppm precision for a negative imbalance', () => {
    const analysis = analyzeWatermancerChargeBalance({ bicarbonate: 5.2 });

    expect(analysis.status).toBe('unbalanced');
    expect(analysis.differenceMeqPerL).toBeLessThan(0);

    for (const alternative of analysis.alternatives) {
      const updated = analyzeWatermancerChargeBalance({
        bicarbonate: 5.2,
        [alternative.ionId]: alternative.proposedTargetPpm,
      });
      expect(['balanced', 'no-targets']).toContain(updated.status);
      expect(Math.abs(updated.differenceMeqPerL)).toBeLessThanOrEqual(CHARGE_BALANCE_TOLERANCE_MEQ_PER_L);
    }

    const magnesium = analysis.alternatives.find(item => item.ionId === 'magnesium');
    expect(magnesium).toMatchObject({
      direction: 'increase',
      currentTargetPpm: 0,
    });
    expect(magnesium?.proposedTargetPpm).toBe(1);
    expect(analysis.alternatives.every(item => item.ionId !== 'bicarbonate' || item.direction === 'decrease'))
      .toBe(true);
  });

  it('omits decreases that would require a negative target', () => {
    const analysis = analyzeWatermancerChargeBalance({ bicarbonate: 5.2, calcium: 0.01 });

    expect(analysis.alternatives.some(item => (
      item.ionId === 'calcium' && item.direction === 'decrease'
    ))).toBe(false);
    expect(analysis.alternatives.every(item => item.proposedTargetPpm >= 0)).toBe(true);
  });

  it('applies an alternative to one ion and preserves every other active target', () => {
    const targets = { sodium: 12, bicarbonate: 30, calcium: 7 };
    const analysis = analyzeWatermancerChargeBalance(targets);
    const alternative = analysis.alternatives.find(item => item.ionId === 'chloride');
    expect(alternative).toBeDefined();

    const nextTargets = applyChargeBalanceAlternative(targets, alternative!);

    expect(nextTargets.chloride).toBe(alternative?.proposedTargetPpm);
    for (const ionId of ACTIVE_ION_IDS) {
      if (ionId === 'chloride') continue;
      expect(nextTargets[ionId]).toBe(targets[ionId] ?? 0);
    }
  });

  it('rejects non-finite and negative target values instead of silently balancing them', () => {
    expect(analyzeWatermancerChargeBalance({ sodium: Number.NaN }).status).toBe('invalid');
    expect(analyzeWatermancerChargeBalance({ sodium: -1 }).status).toBe('invalid');
  });

  it('includes the selected source and normalized active targets in freshness signatures', () => {
    expect(getWatermancerTargetSignature('profile:a', { sodium: 1 }))
      .toBe(getWatermancerTargetSignature('profile:a', { sodium: 1, chloride: 0 }));
    expect(getWatermancerTargetSignature('profile:a', { sodium: 1 }))
      .not.toBe(getWatermancerTargetSignature('profile:b', { sodium: 1 }));
    expect(getWatermancerTargetSignature('profile:a', { sodium: 1 }))
      .not.toBe(getWatermancerTargetSignature('profile:a', { sodium: 2 }));
  });
});
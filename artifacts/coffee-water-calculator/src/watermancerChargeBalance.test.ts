import { describe, expect, it } from 'vitest';
import { ACTIVE_ION_IDS, ION_CHEMISTRY, type IonId } from '@/waterData';
import {
  CHARGE_BALANCE_PPM_STEP,
  CHARGE_BALANCE_TOLERANCE_MEQ_PER_L,
  calculateBalancedIonPairTargets,
} from './watermancerChargeBalance';

function getChargeDifferenceMeqPerL(targets: Partial<Record<IonId, number>>): number {
  return ACTIVE_ION_IDS.reduce((difference, id) => {
    const { charge, molarMass } = ION_CHEMISTRY[id];
    return difference + (targets[id] ?? 0) * charge / molarMass;
  }, 0);
}

describe('Watermancer balanced ion-pair targets', () => {
  it('balances the complete target set while preserving all other ions', () => {
    const targets = {
      sodium: 8,
      magnesium: 12,
      chloride: 5,
      sulfate: 2,
      bicarbonate: 10,
    };
    const result = calculateBalancedIonPairTargets(targets, 'magnesium', 'sulfate', 40);

    expect(result.status).toBe('balanced');
    if (result.status !== 'balanced') return;

    expect(result.primaryTargetPpm).toBe(40);
    expect(result.counterionTargetPpm).toBeGreaterThan(2);
    expect(result.targets.magnesium).toBe(40);
    expect(result.targets.chloride).toBe(5);
    expect(result.targets.sodium).toBe(8);
    expect(Math.abs(getChargeDifferenceMeqPerL(result.targets)))
      .toBeLessThanOrEqual(CHARGE_BALANCE_TOLERANCE_MEQ_PER_L);
  });

  it('accounts for magnesium and chloride having different charge equivalents', () => {
    const result = calculateBalancedIonPairTargets(
      { magnesium: 10 },
      'magnesium',
      'chloride',
      20,
    );

    expect(result.status).toBe('balanced');
    if (result.status !== 'balanced') return;

    expect(result.counterionTargetPpm).toBeCloseTo(
      20 * 2 * ION_CHEMISTRY.chloride.molarMass / ION_CHEMISTRY.magnesium.molarMass,
      1,
    );
    expect(Math.abs(getChargeDifferenceMeqPerL(result.targets)))
      .toBeLessThanOrEqual(CHARGE_BALANCE_TOLERANCE_MEQ_PER_L);
  });

  it('accounts for a pre-existing charge gap outside the selected pair', () => {
    const result = calculateBalancedIonPairTargets(
      { sodium: 10, bicarbonate: 4 },
      'magnesium',
      'sulfate',
      5,
    );

    expect(result.status).toBe('balanced');
    if (result.status !== 'balanced') return;
    expect(Math.abs(getChargeDifferenceMeqPerL(result.targets)))
      .toBeLessThanOrEqual(CHARGE_BALANCE_TOLERANCE_MEQ_PER_L);
  });

  it('rounds the primary target to the configured 0.1 ppm precision', () => {
    const result = calculateBalancedIonPairTargets({}, 'magnesium', 'chloride', 20.07);

    expect(result.status).toBe('balanced');
    if (result.status !== 'balanced') return;
    expect(result.primaryTargetPpm).toBe(20.1);
    expect(result.primaryTargetPpm / CHARGE_BALANCE_PPM_STEP).toBeCloseTo(201, 10);
  });

  it('rejects incompatible, invalid, and impossible counter-ion combinations', () => {
    expect(calculateBalancedIonPairTargets({}, 'magnesium', 'calcium', 10).status)
      .toBe('same-charge');
    expect(calculateBalancedIonPairTargets({ bicarbonate: 100 }, 'magnesium', 'sulfate', 0).status)
      .toBe('negative-counterion-target');
    expect(calculateBalancedIonPairTargets({ sodium: Number.NaN }, 'magnesium', 'sulfate', 10).status)
      .toBe('invalid-targets');
    expect(calculateBalancedIonPairTargets({}, 'magnesium', 'sulfate', -1).status)
      .toBe('invalid-primary-target');
  });
});

import {
  ACTIVE_ION_IDS,
  ION_CHEMISTRY,
  type IonId,
} from '@/waterData';

export const CHARGE_BALANCE_PPM_STEP = 0.1;
export const CHARGE_BALANCE_TOLERANCE_MEQ_PER_L = Math.max(
  ...ACTIVE_ION_IDS.map(id => (
    CHARGE_BALANCE_PPM_STEP / 2
    * Math.abs(ION_CHEMISTRY[id].charge)
    / ION_CHEMISTRY[id].molarMass
  )),
);

export type BalancedIonPairFailure =
  | 'invalid-targets'
  | 'invalid-primary-target'
  | 'inactive-ion'
  | 'same-charge'
  | 'negative-counterion-target'
  | 'rounding-outside-tolerance';

export type BalancedIonPairResult =
  | {
      status: 'balanced';
      targets: Partial<Record<IonId, number>>;
      primaryTargetPpm: number;
      counterionTargetPpm: number;
      differenceMeqPerL: number;
    }
  | {
      status: BalancedIonPairFailure;
      invalidIonIds?: IonId[];
      differenceMeqPerL?: number;
    };

function roundTargetPpm(value: number): number {
  return Number((Math.round(value / CHARGE_BALANCE_PPM_STEP) * CHARGE_BALANCE_PPM_STEP).toFixed(1));
}

function getChargeDifferenceMeqPerL(targets: Partial<Record<IonId, number>>): number {
  return ACTIVE_ION_IDS.reduce((difference, id) => {
    const { charge, molarMass } = ION_CHEMISTRY[id];
    return difference + (targets[id] ?? 0) * charge / molarMass;
  }, 0);
}

/**
 * Proposes a primary-ion target and solves one opposite-charge ion target so
 * the complete active target set is charge-neutral at the app's 0.1 ppm precision.
 */
export function calculateBalancedIonPairTargets(
  targets: Partial<Record<IonId, number>>,
  primaryIonId: IonId,
  counterionId: IonId,
  proposedPrimaryTargetPpm: number,
): BalancedIonPairResult {
  const invalidIonIds = ACTIVE_ION_IDS.filter(id => {
    const value = targets[id];
    return value !== undefined && (!Number.isFinite(value) || value < 0);
  });
  if (invalidIonIds.length > 0) {
    return { status: 'invalid-targets', invalidIonIds };
  }
  if (!Number.isFinite(proposedPrimaryTargetPpm) || proposedPrimaryTargetPpm < 0) {
    return { status: 'invalid-primary-target' };
  }
  if (!ACTIVE_ION_IDS.includes(primaryIonId) || !ACTIVE_ION_IDS.includes(counterionId)) {
    return { status: 'inactive-ion' };
  }

  const primaryChemistry = ION_CHEMISTRY[primaryIonId];
  const counterionChemistry = ION_CHEMISTRY[counterionId];
  if (Math.sign(primaryChemistry.charge) === Math.sign(counterionChemistry.charge)) {
    return { status: 'same-charge' };
  }

  const primaryTargetPpm = roundTargetPpm(proposedPrimaryTargetPpm);
  const fixedDifferenceMeqPerL = ACTIVE_ION_IDS.reduce((difference, id) => {
    if (id === primaryIonId || id === counterionId) return difference;
    const { charge, molarMass } = ION_CHEMISTRY[id];
    return difference + (targets[id] ?? 0) * charge / molarMass;
  }, 0);
  const primaryDifferenceMeqPerL = (
    primaryTargetPpm * primaryChemistry.charge / primaryChemistry.molarMass
  );
  const requiredCounterionSignedMeqPerL = -(
    fixedDifferenceMeqPerL + primaryDifferenceMeqPerL
  );
  const requiredCounterionMeqPerL = (
    requiredCounterionSignedMeqPerL / Math.sign(counterionChemistry.charge)
  );
  if (requiredCounterionMeqPerL < -1e-12) {
    return { status: 'negative-counterion-target' };
  }

  const counterionTargetPpm = roundTargetPpm(
    Math.max(requiredCounterionMeqPerL, 0)
    * counterionChemistry.molarMass
    / Math.abs(counterionChemistry.charge),
  );
  const nextTargets = Object.fromEntries(
    ACTIVE_ION_IDS.map(id => [id, targets[id] ?? 0]),
  ) as Partial<Record<IonId, number>>;
  nextTargets[primaryIonId] = primaryTargetPpm;
  nextTargets[counterionId] = counterionTargetPpm;

  const differenceMeqPerL = getChargeDifferenceMeqPerL(nextTargets);
  if (Math.abs(differenceMeqPerL) > CHARGE_BALANCE_TOLERANCE_MEQ_PER_L) {
    return {
      status: 'rounding-outside-tolerance',
      differenceMeqPerL,
    };
  }

  return {
    status: 'balanced',
    targets: nextTargets,
    primaryTargetPpm,
    counterionTargetPpm,
    differenceMeqPerL,
  };
}

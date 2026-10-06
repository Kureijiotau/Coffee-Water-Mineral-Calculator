import {
  ACTIVE_ION_IDS,
  ION_CHEMISTRY,
  ION_MAP,
  computeIonMeqPerL,
  type IonId,
} from '@/waterData';

export const CHARGE_BALANCE_PPM_STEP = 0.1;
export const CHARGE_BALANCE_HIGH_RELATIVE_GAP = 0.2;
export const CHARGE_BALANCE_TOLERANCE_MEQ_PER_L = Math.max(
  ...ACTIVE_ION_IDS.map(id => (
    CHARGE_BALANCE_PPM_STEP / 2
    * Math.abs(ION_CHEMISTRY[id].charge)
    / ION_CHEMISTRY[id].molarMass
  )),
);

export interface ChargeBalanceAlternative {
  ionId: IonId;
  direction: 'increase' | 'decrease';
  currentTargetPpm: number;
  proposedTargetPpm: number;
}

export interface ChargeBalanceAnalysis {
  status: 'invalid' | 'no-targets' | 'balanced' | 'unbalanced';
  positiveMeqPerL: number;
  negativeMeqPerL: number;
  differenceMeqPerL: number;
  invalidIonIds: IonId[];
  alternatives: ChargeBalanceAlternative[];
}

function getChargeTotals(targets: Partial<Record<IonId, number>>) {
  const positiveMeqPerL = ACTIVE_ION_IDS.reduce((total, id) => (
    ION_CHEMISTRY[id].charge > 0
      ? total + computeIonMeqPerL(id, targets[id] ?? 0)
      : total
  ), 0);
  const negativeMeqPerL = ACTIVE_ION_IDS.reduce((total, id) => (
    ION_CHEMISTRY[id].charge < 0
      ? total + computeIonMeqPerL(id, targets[id] ?? 0)
      : total
  ), 0);

  return { positiveMeqPerL, negativeMeqPerL };
}

export function hasHighRelativeChargeGap(
  targets: Partial<Record<IonId, number>>,
): boolean {
  const hasInvalidTarget = ACTIVE_ION_IDS.some(id => {
    const value = targets[id];
    return value !== undefined && (!Number.isFinite(value) || value < 0);
  });
  if (hasInvalidTarget) return false;

  const { positiveMeqPerL, negativeMeqPerL } = getChargeTotals(targets);
  const largerChargeTotal = Math.max(positiveMeqPerL, negativeMeqPerL);
  return largerChargeTotal > 0
    && Math.abs(positiveMeqPerL - negativeMeqPerL) / largerChargeTotal
      >= CHARGE_BALANCE_HIGH_RELATIVE_GAP;
}

export function analyzeWatermancerChargeBalance(
  targets: Partial<Record<IonId, number>>,
): ChargeBalanceAnalysis {
  const invalidIonIds = ACTIVE_ION_IDS.filter(id => {
    const value = targets[id];
    return value !== undefined && (!Number.isFinite(value) || value < 0);
  });

  if (invalidIonIds.length > 0) {
    return {
      status: 'invalid',
      positiveMeqPerL: 0,
      negativeMeqPerL: 0,
      differenceMeqPerL: 0,
      invalidIonIds,
      alternatives: [],
    };
  }

  const targetValues = Object.fromEntries(
    ACTIVE_ION_IDS.map(id => [id, targets[id] ?? 0]),
  ) as Record<IonId, number>;
  const hasAnyTarget = ACTIVE_ION_IDS.some(id => targetValues[id] > 0);
  const { positiveMeqPerL, negativeMeqPerL } = getChargeTotals(targetValues);
  const differenceMeqPerL = positiveMeqPerL - negativeMeqPerL;

  if (!hasAnyTarget) {
    return {
      status: 'no-targets',
      positiveMeqPerL,
      negativeMeqPerL,
      differenceMeqPerL,
      invalidIonIds: [],
      alternatives: [],
    };
  }

  if (Math.abs(differenceMeqPerL) <= CHARGE_BALANCE_TOLERANCE_MEQ_PER_L) {
    return {
      status: 'balanced',
      positiveMeqPerL,
      negativeMeqPerL,
      differenceMeqPerL,
      invalidIonIds: [],
      alternatives: [],
    };
  }

  const excessMeqPerL = Math.abs(differenceMeqPerL);
  const alternatives: ChargeBalanceAlternative[] = [];

  for (const ionId of ACTIVE_ION_IDS) {
    const charge = ION_CHEMISTRY[ionId].charge;
    const currentTargetPpm = targetValues[ionId];
    const isOppositeCharge = differenceMeqPerL > 0 ? charge < 0 : charge > 0;
    const direction: ChargeBalanceAlternative['direction'] = isOppositeCharge
      ? 'increase'
      : 'decrease';
    const targetDeltaPpm = excessMeqPerL
      * ION_CHEMISTRY[ionId].molarMass
      / Math.abs(charge);
    const unroundedTargetPpm = direction === 'increase'
      ? currentTargetPpm + targetDeltaPpm
      : currentTargetPpm - targetDeltaPpm;

    // Do not offer a target decrease that would require a negative concentration.
    if (unroundedTargetPpm < -1e-12) continue;

    alternatives.push({
      ionId,
      direction,
      currentTargetPpm,
      proposedTargetPpm: Number((
        Math.round(Math.max(unroundedTargetPpm, 0) / CHARGE_BALANCE_PPM_STEP)
        * CHARGE_BALANCE_PPM_STEP
      ).toFixed(1)),
    });
  }

  return {
    status: 'unbalanced',
    positiveMeqPerL,
    negativeMeqPerL,
    differenceMeqPerL,
    invalidIonIds: [],
    alternatives,
  };
}

export function getChargeBalanceIonName(ionId: IonId): string {
  return ION_MAP[ionId].name;
}

export function getWatermancerTargetSignature(
  targetSource: string,
  targets: Partial<Record<IonId, number>>,
): string {
  return JSON.stringify([
    targetSource,
    ACTIVE_ION_IDS.map(id => {
      const value = targets[id];
      return [id, value === undefined ? 0 : Number.isFinite(value) && value >= 0 ? value : 'invalid'];
    }),
  ]);
}

export function applyChargeBalanceAlternative(
  targets: Partial<Record<IonId, number>>,
  alternative: ChargeBalanceAlternative,
): Partial<Record<IonId, number>> {
  const nextTargets = Object.fromEntries(
    ACTIVE_ION_IDS.map(id => [id, targets[id] ?? 0]),
  ) as Partial<Record<IonId, number>>;
  nextTargets[alternative.ionId] = alternative.proposedTargetPpm;
  return nextTargets;
}

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
    return difference + (
      (targets[id] ?? 0) * ION_CHEMISTRY[id].charge / ION_CHEMISTRY[id].molarMass
    );
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

  const analysis = analyzeWatermancerChargeBalance(nextTargets);
  if (
    analysis.status !== 'balanced'
    && analysis.status !== 'no-targets'
  ) {
    return {
      status: 'rounding-outside-tolerance',
      differenceMeqPerL: analysis.differenceMeqPerL,
    };
  }

  return {
    status: 'balanced',
    targets: nextTargets,
    primaryTargetPpm,
    counterionTargetPpm,
    differenceMeqPerL: analysis.differenceMeqPerL,
  };
}
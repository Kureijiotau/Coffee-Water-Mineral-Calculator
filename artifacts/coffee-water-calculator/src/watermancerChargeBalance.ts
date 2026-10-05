import {
  ACTIVE_ION_IDS,
  ION_CHEMISTRY,
  ION_MAP,
  computeIonMeqPerL,
  type IonId,
} from '@/waterData';

export const CHARGE_BALANCE_TOLERANCE_MEQ_PER_L = 1e-9;

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
  const positiveMeqPerL = ACTIVE_ION_IDS.reduce((total, id) => (
    ION_CHEMISTRY[id].charge > 0
      ? total + computeIonMeqPerL(id, targetValues[id])
      : total
  ), 0);
  const negativeMeqPerL = ACTIVE_ION_IDS.reduce((total, id) => (
    ION_CHEMISTRY[id].charge < 0
      ? total + computeIonMeqPerL(id, targetValues[id])
      : total
  ), 0);
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
    const proposedTargetPpm = direction === 'increase'
      ? currentTargetPpm + targetDeltaPpm
      : currentTargetPpm - targetDeltaPpm;

    // Do not offer a target decrease that would require a negative concentration.
    if (proposedTargetPpm < -1e-12) continue;

    alternatives.push({
      ionId,
      direction,
      currentTargetPpm,
      proposedTargetPpm: Math.max(proposedTargetPpm, 0),
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
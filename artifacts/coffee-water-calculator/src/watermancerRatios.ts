import { computeGH, computeKH, IONS, type IonId } from './waterData';
import { ION_RATIO_DEFINITIONS, type IonRatioId } from './ionRatios';

export type WatermancerRatioPair = {
  first: number;
  second: number;
};

export type WatermancerDesiredRelationships = Partial<
  Record<IonRatioId, WatermancerRatioPair>
>;

export type WatermancerRatioStatus = 'on-ratio' | 'close' | 'drifting' | 'unavailable';

export type WatermancerRatioRelationship = {
  id: IonRatioId;
  label: string;
  firstLabel: string;
  secondLabel: string;
  desiredFirst: number;
  desiredSecond: number;
  desiredRatio: number | null;
  actualFirst: number;
  actualSecond: number;
  actualRatio: number | null;
  error: number;
  available: boolean;
  status: WatermancerRatioStatus;
  reason: string | null;
};

export type WatermancerZeroTargetViolation = {
  id: IonId;
  actual: number;
  excess: number;
};

export type WatermancerRatioEvaluation = {
  positiveFloorSatisfied: boolean;
  floorDeficits: Partial<Record<IonId, number>>;
  floorDeficitTotal: number;
  zeroTargetProtectionSatisfied: boolean;
  zeroTargetViolations: WatermancerZeroTargetViolation[];
  zeroTargetViolationPpm: number;
  relationships: WatermancerRatioRelationship[];
  aggregateRatioError: number;
  unavailableRatioCount: number;
  modeledMineralLoad: number;
  positiveExcess: number;
  rankingKey: readonly number[];
};

export type WatermancerRatioEvaluationOptions = {
  /** Numeric noise below this threshold does not violate a floor or zero target. */
  tolerance?: number;
  /** Missing/undefined ratios receive this deterministic ranking penalty. */
  unavailableRatioPenalty?: number;
};

const DEFAULT_TOLERANCE = 0.000001;
const DEFAULT_UNAVAILABLE_RATIO_PENALTY = 10;
const ON_RATIO_ERROR = 0.05;
const CLOSE_RATIO_ERROR = 0.2;

function nonNegative(value: number | undefined): number {
  return Number.isFinite(value) && (value ?? 0) >= 0 ? value as number : 0;
}

function completeIonTotals(values: Partial<Record<IonId, number>>): Record<IonId, number> {
  return Object.fromEntries(
    IONS.map(ion => [ion.id, nonNegative(values[ion.id])]),
  ) as Record<IonId, number>;
}

function derivedRelationshipValues(
  values: Record<IonId, number>,
): Record<IonRatioId, WatermancerRatioPair> {
  return {
    'gh-kh': { first: computeGH(values), second: computeKH(values) },
    'mg-ca': { first: values.magnesium, second: values.calcium },
    'cl-sulfate': { first: values.chloride, second: values.sulfate },
    'na-k': { first: values.sodium, second: values.potassium },
  };
}

function relationshipStatus(error: number, available: boolean): WatermancerRatioStatus {
  if (!available) return 'unavailable';
  if (error <= ON_RATIO_ERROR) return 'on-ratio';
  if (error <= CLOSE_RATIO_ERROR) return 'close';
  return 'drifting';
}

function compareNumbers(left: number, right: number): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Evaluate a final Watermancer mixture against the active target floors and
 * relationships. This is intentionally pure: it does not know about routes,
 * salts, waters, or plan state.
 */
export function evaluateWatermancerRatios(
  actualValues: Partial<Record<IonId, number>>,
  targetValues: Partial<Record<IonId, number>>,
  desiredRelationships?: WatermancerDesiredRelationships,
  options?: WatermancerRatioEvaluationOptions,
): WatermancerRatioEvaluation {
  const actual = completeIonTotals(actualValues);
  const targets = completeIonTotals(targetValues);
  const tolerance = Math.max(0, options?.tolerance ?? DEFAULT_TOLERANCE);
  const unavailablePenalty = Math.max(
    0,
    options?.unavailableRatioPenalty ?? DEFAULT_UNAVAILABLE_RATIO_PENALTY,
  );
  const desired = {
    ...derivedRelationshipValues(targets),
    ...desiredRelationships,
  };

  const floorDeficits = Object.fromEntries(
    IONS
      .filter(ion => targets[ion.id] > 0)
      .map(ion => [ion.id, Math.max(targets[ion.id] - actual[ion.id] - tolerance, 0)]),
  ) as Partial<Record<IonId, number>>;
  const floorDeficitTotal = Object.values(floorDeficits)
    .reduce((total, deficit) => total + (deficit ?? 0), 0);
  const positiveFloorSatisfied = floorDeficitTotal <= tolerance;

  const zeroTargetViolations = IONS
    .map(ion => ({
      id: ion.id,
      actual: actual[ion.id],
      excess: Math.max(actual[ion.id] - tolerance, 0),
    }))
    .filter(violation => targets[violation.id] <= 0 && violation.excess > 0);
  const zeroTargetViolationPpm = zeroTargetViolations
    .reduce((total, violation) => total + violation.excess, 0);
  const zeroTargetProtectionSatisfied = zeroTargetViolations.length === 0;

  const relationships = ION_RATIO_DEFINITIONS.map(definition => {
    const desiredPair = desired[definition.id] ?? { first: 0, second: 0 };
    const actualPair = derivedRelationshipValues(actual)[definition.id];
    const desiredFirst = nonNegative(desiredPair.first);
    const desiredSecond = nonNegative(desiredPair.second);
    const actualFirst = nonNegative(actualPair.first);
    const actualSecond = nonNegative(actualPair.second);
    const desiredRatio = desiredFirst > 0 && desiredSecond > 0
      ? desiredFirst / desiredSecond
      : null;
    const actualRatio = actualFirst > 0 && actualSecond > 0
      ? actualFirst / actualSecond
      : null;
    const available = desiredRatio !== null && actualRatio !== null;
    const error = available
      ? Math.abs(Math.log(actualRatio / desiredRatio))
      : unavailablePenalty;
    const reason = available
      ? null
      : desiredRatio === null
        ? 'Desired relationship is unavailable because its denominator or numerator is zero.'
        : 'Actual relationship is unavailable because its denominator or numerator is zero.';

    return {
      id: definition.id,
      label: definition.label,
      firstLabel: definition.firstLabel,
      secondLabel: definition.secondLabel,
      desiredFirst,
      desiredSecond,
      desiredRatio,
      actualFirst,
      actualSecond,
      actualRatio,
      error,
      available,
      status: relationshipStatus(error, available),
      reason,
    };
  });

  const aggregateRatioError = relationships
    .reduce((total, relationship) => total + relationship.error, 0);
  const unavailableRatioCount = relationships
    .filter(relationship => !relationship.available).length;
  const modeledMineralLoad = IONS
    .reduce((total, ion) => total + actual[ion.id], 0);
  const positiveExcess = IONS
    .filter(ion => targets[ion.id] > 0)
    .reduce((total, ion) => total + Math.max(actual[ion.id] - targets[ion.id], 0), 0);

  return {
    positiveFloorSatisfied,
    floorDeficits,
    floorDeficitTotal,
    zeroTargetProtectionSatisfied,
    zeroTargetViolations,
    zeroTargetViolationPpm,
    relationships,
    aggregateRatioError,
    unavailableRatioCount,
    modeledMineralLoad,
    positiveExcess,
    rankingKey: [
      zeroTargetProtectionSatisfied ? 0 : 1,
      positiveFloorSatisfied ? 0 : 1,
      aggregateRatioError,
      modeledMineralLoad,
      positiveExcess,
      floorDeficitTotal,
      unavailableRatioCount,
    ],
  };
}

/**
 * Compare two ratio evaluations. A negative result means left ranks first.
 * The final values are already deterministic; candidate identity can be used
 * by callers as the final tie-breaker when two keys are equal.
 */
export function compareWatermancerRatioEvaluations(
  left: WatermancerRatioEvaluation,
  right: WatermancerRatioEvaluation,
): number {
  const length = Math.max(left.rankingKey.length, right.rankingKey.length);
  for (let index = 0; index < length; index += 1) {
    const comparison = compareNumbers(left.rankingKey[index] ?? 0, right.rankingKey[index] ?? 0);
    if (comparison !== 0) return comparison;
  }
  return 0;
}
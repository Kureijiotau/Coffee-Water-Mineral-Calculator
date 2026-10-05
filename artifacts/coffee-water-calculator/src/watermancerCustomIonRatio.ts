import type { IonId } from './waterData';

export const CUSTOM_ION_RATIO_CYCLE = [
  'sodium',
  'chloride',
  'magnesium',
  'potassium',
  'calcium',
  'sulfate',
  'bicarbonate',
  'citrates',
] as const satisfies readonly IonId[];

export type CustomIonRatioIonId = typeof CUSTOM_ION_RATIO_CYCLE[number];

export type CustomIonRatioPair = {
  left: CustomIonRatioIonId;
  right: CustomIonRatioIonId;
};

export type CustomIonRatioSide = keyof CustomIonRatioPair;

export const DEFAULT_CUSTOM_ION_RATIO_PAIR: CustomIonRatioPair = {
  left: 'sodium',
  right: 'potassium',
};

export function getNextCustomIonRatioIon(
  currentIon: CustomIonRatioIonId,
  otherIon: CustomIonRatioIonId,
): CustomIonRatioIonId {
  const currentIndex = CUSTOM_ION_RATIO_CYCLE.indexOf(currentIon);

  for (let offset = 1; offset <= CUSTOM_ION_RATIO_CYCLE.length; offset += 1) {
    const candidate = CUSTOM_ION_RATIO_CYCLE[
      (currentIndex + offset) % CUSTOM_ION_RATIO_CYCLE.length
    ];
    if (candidate !== otherIon) return candidate;
  }

  return currentIon;
}

export function advanceCustomIonRatioPair(
  pair: CustomIonRatioPair,
  side: CustomIonRatioSide,
): CustomIonRatioPair {
  const otherSide = side === 'left' ? 'right' : 'left';
  return {
    ...pair,
    [side]: getNextCustomIonRatioIon(pair[side], pair[otherSide]),
  };
}

export function formatCustomIonRatio(leftPpm: number, rightPpm: number): string {
  if (
    !Number.isFinite(leftPpm)
    || leftPpm < 0
    || !Number.isFinite(rightPpm)
    || rightPpm <= 0
  ) {
    return '—';
  }

  const ratio = leftPpm / rightPpm;
  return Number.isFinite(ratio) ? `${ratio.toFixed(1)}:1` : '—';
}
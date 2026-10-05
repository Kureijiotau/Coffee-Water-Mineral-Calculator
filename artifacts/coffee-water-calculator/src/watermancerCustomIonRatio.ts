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

export const CUSTOM_ION_RATIO_STORAGE_KEY = 'coffee-water-watermancer-custom-ion-ratio';

function isCustomIonRatioIonId(value: unknown): value is CustomIonRatioIonId {
  return typeof value === 'string'
    && (CUSTOM_ION_RATIO_CYCLE as readonly string[]).includes(value);
}

export function parseCustomIonRatioPair(value: string | null): CustomIonRatioPair {
  if (!value) return { ...DEFAULT_CUSTOM_ION_RATIO_PAIR };

  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ...DEFAULT_CUSTOM_ION_RATIO_PAIR };
    }

    const pair = parsed as { left?: unknown; right?: unknown };
    if (
      !isCustomIonRatioIonId(pair.left)
      || !isCustomIonRatioIonId(pair.right)
      || pair.left === pair.right
    ) {
      return { ...DEFAULT_CUSTOM_ION_RATIO_PAIR };
    }

    return { left: pair.left, right: pair.right };
  } catch {
    return { ...DEFAULT_CUSTOM_ION_RATIO_PAIR };
  }
}

export function loadCustomIonRatioPair(
  storage: Pick<Storage, 'getItem'>,
): CustomIonRatioPair {
  return parseCustomIonRatioPair(storage.getItem(CUSTOM_ION_RATIO_STORAGE_KEY));
}

export function saveCustomIonRatioPair(
  pair: CustomIonRatioPair,
  storage: Pick<Storage, 'setItem'>,
): void {
  storage.setItem(CUSTOM_ION_RATIO_STORAGE_KEY, JSON.stringify(pair));
}

export function getNextCustomIonRatioIon(
  currentIon: CustomIonRatioIonId,
  otherIon: CustomIonRatioIonId,
  citrateAvailable = true,
): CustomIonRatioIonId {
  const cycle: readonly CustomIonRatioIonId[] = citrateAvailable
    ? CUSTOM_ION_RATIO_CYCLE
    : CUSTOM_ION_RATIO_CYCLE.filter(ionId => ionId !== 'citrates');
  const currentIndex = cycle.indexOf(currentIon);

  for (let offset = 1; offset <= cycle.length; offset += 1) {
    const candidate = cycle[(currentIndex + offset + cycle.length) % cycle.length];
    if (candidate !== otherIon) return candidate;
  }

  return currentIon;
}

export function normalizeCustomIonRatioPair(
  pair: CustomIonRatioPair,
  citrateAvailable: boolean,
): CustomIonRatioPair {
  if (
    citrateAvailable
    || (pair.left !== 'citrates' && pair.right !== 'citrates')
  ) {
    return { ...pair };
  }
  return { ...DEFAULT_CUSTOM_ION_RATIO_PAIR };
}

export function advanceCustomIonRatioPair(
  pair: CustomIonRatioPair,
  side: CustomIonRatioSide,
  citrateAvailable = true,
): CustomIonRatioPair {
  const availablePair = normalizeCustomIonRatioPair(pair, citrateAvailable);
  const otherSide = side === 'left' ? 'right' : 'left';
  return {
    ...availablePair,
    [side]: getNextCustomIonRatioIon(
      availablePair[side],
      availablePair[otherSide],
      citrateAvailable,
    ),
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
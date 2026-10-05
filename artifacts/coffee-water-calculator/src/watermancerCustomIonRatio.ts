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
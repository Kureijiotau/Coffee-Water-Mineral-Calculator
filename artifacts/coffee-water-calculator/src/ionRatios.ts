import { CACO3_FACTOR, computeGH, computeKH, IONS, type IonId } from './waterData';

export type IonRatioId = 'gh-kh' | 'mg-ca' | 'cl-sulfate' | 'na-k';

export type IonRatioDraft = Record<IonRatioId, {
  first: string;
  second: string;
  swapped?: boolean;
}>;

export type IonRatioDefinition = {
  id: IonRatioId;
  label: string;
  firstLabel: string;
  secondLabel: string;
  firstIonId?: IonId;
  secondIonId?: IonId;
  unit: 'ppm' | 'mg/L';
  diagnosticOnly: boolean;
};

export type EvaluatedIonRatio = IonRatioDefinition & {
  firstValue: number | null;
  secondValue: number | null;
  ratioValue: number | null;
  error: string | null;
};

export const ION_RATIO_DEFINITIONS: IonRatioDefinition[] = [
  {
    id: 'gh-kh',
    label: 'Hardness / alkalinity',
    firstLabel: 'GH',
    secondLabel: 'KH',
    unit: 'ppm',
    diagnosticOnly: true,
  },
  {
    id: 'mg-ca',
    label: 'Magnesium / calcium',
    firstLabel: 'Mg',
    secondLabel: 'Ca',
    firstIonId: 'magnesium',
    secondIonId: 'calcium',
    unit: 'mg/L',
    diagnosticOnly: false,
  },
  {
    id: 'cl-sulfate',
    label: 'Chloride / sulfate',
    firstLabel: 'Cl',
    secondLabel: 'SO₄',
    firstIonId: 'chloride',
    secondIonId: 'sulfate',
    unit: 'mg/L',
    diagnosticOnly: false,
  },
  {
    id: 'na-k',
    label: 'Sodium / potassium',
    firstLabel: 'Na',
    secondLabel: 'K',
    firstIonId: 'sodium',
    secondIonId: 'potassium',
    unit: 'mg/L',
    diagnosticOnly: false,
  },
];

const ratio = (first: number, second: number): string => String(first / second);
const GH_MAGNESIUM_FACTOR = CACO3_FACTOR.magnesium ?? 4.118;
const GH_CALCIUM_FACTOR = CACO3_FACTOR.calcium ?? 2.497;
const KH_BICARBONATE_FACTOR = CACO3_FACTOR.bicarbonate ?? 0.820;
const MIN_HARDNESS_ION_PPM = 0.0001;

export const DEFAULT_ION_RATIO_DRAFT: IonRatioDraft = {
  'gh-kh': { first: '34', second: '9' },
  'mg-ca': {
    first: String((34 / (GH_MAGNESIUM_FACTOR * (3.2 / 2) + GH_CALCIUM_FACTOR)) * (3.2 / 2)),
    second: String(34 / (GH_MAGNESIUM_FACTOR * (3.2 / 2) + GH_CALCIUM_FACTOR)),
  },
  'cl-sulfate': { first: '16.3', second: '4.2' },
  'na-k': { first: '7.8', second: '1' },
};

function ratioDraftValue(value: number): string {
  return Number.isFinite(value) && value >= 0 ? String(value) : '0';
}

export function createIonRatioDraftFromTargets(
  targets: Partial<Record<IonId, number>>,
): IonRatioDraft {
  const completeTargets = Object.fromEntries(
    IONS.map(ion => [ion.id, Number.isFinite(targets[ion.id]) && (targets[ion.id] ?? 0) >= 0 ? targets[ion.id] : 0]),
  ) as Record<IonId, number>;

  return {
    'gh-kh': {
      first: ratioDraftValue(computeGH(completeTargets)),
      second: ratioDraftValue(computeKH(completeTargets)),
    },
    'mg-ca': {
      first: ratioDraftValue(completeTargets.magnesium),
      second: ratioDraftValue(completeTargets.calcium),
    },
    'cl-sulfate': {
      first: ratioDraftValue(completeTargets.chloride),
      second: ratioDraftValue(completeTargets.sulfate),
    },
    'na-k': {
      first: ratioDraftValue(completeTargets.sodium),
      second: ratioDraftValue(completeTargets.potassium),
    },
  };
}

export function cloneIonRatioDraft(draft: IonRatioDraft): IonRatioDraft {
  return Object.fromEntries(
    ION_RATIO_DEFINITIONS.map(definition => [
      definition.id,
      { ...draft[definition.id] },
    ]),
  ) as IonRatioDraft;
}

function logicalValue(
  row: IonRatioDraft[IonRatioId],
  logicalFirst: 'GH' | 'KH' | 'Mg' | 'Ca',
): string {
  const firstIsLogicalFirst = row.swapped !== true;
  if (logicalFirst === 'GH' || logicalFirst === 'Mg') {
    return firstIsLogicalFirst ? row.first : row.second;
  }
  return firstIsLogicalFirst ? row.second : row.first;
}

function rowFromLogicalValues(
  row: IonRatioDraft[IonRatioId],
  logicalFirst: string,
  logicalSecond: string,
): IonRatioDraft[IonRatioId] {
  return row.swapped === true
    ? { first: logicalSecond, second: logicalFirst, swapped: true }
    : { first: logicalFirst, second: logicalSecond };
}

export function solveGhAnchoredMagnesiumCalcium(
  gh: number,
  relationship: number,
  swapped = false,
): { magnesium: number; calcium: number } | null {
  if (!Number.isFinite(gh) || gh < 0 || !Number.isFinite(relationship) || relationship <= 0) {
    return null;
  }
  if (gh === 0) return { magnesium: 0, calcium: 0 };

  if (swapped) {
    const magnesium = gh / (GH_MAGNESIUM_FACTOR + GH_CALCIUM_FACTOR * relationship);
    return { magnesium, calcium: magnesium * relationship };
  }

  const calcium = gh / (GH_MAGNESIUM_FACTOR * relationship + GH_CALCIUM_FACTOR);
  return { magnesium: calcium * relationship, calcium };
}

export function updateGhKhByRelationship(
  row: IonRatioDraft['gh-kh'],
  relationship: string,
): IonRatioDraft['gh-kh'] | null {
  const ratioValue = parsePositive(relationship);
  const gh = Number(logicalValue(row, 'GH'));
  if (ratioValue === null || !Number.isFinite(gh) || gh < 0) return null;

  const kh = row.swapped === true ? gh * ratioValue : gh / ratioValue;
  return rowFromLogicalValues(row, String(gh), String(kh));
}

export function updateMgCaByGhRelationship(
  ghRow: IonRatioDraft['gh-kh'],
  mgCaRow: IonRatioDraft['mg-ca'],
  relationship: string,
): IonRatioDraft['mg-ca'] | null {
  const ratioValue = parsePositive(relationship);
  const gh = Number(logicalValue(ghRow, 'GH'));
  const solved = ratioValue === null
    ? null
    : solveGhAnchoredMagnesiumCalcium(gh, ratioValue, mgCaRow.swapped === true);
  if (!solved) return null;

  return rowFromLogicalValues(mgCaRow, String(solved.magnesium), String(solved.calcium));
}

export function updateMgCaValueForGh(
  ghRow: IonRatioDraft['gh-kh'],
  mgCaRow: IonRatioDraft['mg-ca'],
  field: 'first' | 'second',
  value: string,
): IonRatioDraft['mg-ca'] | null {
  const gh = Number(logicalValue(ghRow, 'GH'));
  const changedValue = parseNonNegative(value);
  if (!Number.isFinite(gh) || gh < 0 || changedValue === null) return null;
  if (gh === 0) return rowFromLogicalValues(mgCaRow, '0', '0');

  const changedLogicalIon = mgCaRow.swapped === true
    ? field === 'first' ? 'Ca' : 'Mg'
    : field === 'first' ? 'Mg' : 'Ca';
  if (changedLogicalIon === 'Mg') {
    const magnesium = Math.min(
      changedValue,
      Math.max(0, (gh - GH_CALCIUM_FACTOR * MIN_HARDNESS_ION_PPM) / GH_MAGNESIUM_FACTOR),
    );
    const calcium = Math.max(
      MIN_HARDNESS_ION_PPM,
      (gh - GH_MAGNESIUM_FACTOR * magnesium) / GH_CALCIUM_FACTOR,
    );
    return rowFromLogicalValues(mgCaRow, String(magnesium), String(calcium));
  }

  const calcium = Math.min(
    changedValue,
    Math.max(0, (gh - GH_MAGNESIUM_FACTOR * MIN_HARDNESS_ION_PPM) / GH_CALCIUM_FACTOR),
  );
  const magnesium = Math.max(
    MIN_HARDNESS_ION_PPM,
    (gh - GH_CALCIUM_FACTOR * calcium) / GH_MAGNESIUM_FACTOR,
  );
  return rowFromLogicalValues(mgCaRow, String(magnesium), String(calcium));
}

export function updateIonRatioDraftValue(
  draft: IonRatioDraft,
  id: IonRatioId,
  field: 'first' | 'second',
  value: string,
): IonRatioDraft {
  const nextDraft: IonRatioDraft = {
    ...draft,
    [id]: { ...draft[id], [field]: value },
  };

  if (id === 'gh-kh') {
    const ghField = draft[id].swapped === true ? 'second' : 'first';
    if (field === ghField && parseNonNegative(value) !== null) {
      const relationship = evaluateIonRatioDraft(draft).find(row => row.id === 'mg-ca')?.ratioValue;
      const mgCa = relationship === null || relationship === undefined
        ? null
        : solveGhAnchoredMagnesiumCalcium(Number(value), relationship, draft['mg-ca'].swapped === true);
      if (mgCa) {
        nextDraft['mg-ca'] = rowFromLogicalValues(
          draft['mg-ca'],
          String(mgCa.magnesium),
          String(mgCa.calcium),
        );
      }
    }
  }

  if (id === 'mg-ca') {
    const anchored = updateMgCaValueForGh(draft['gh-kh'], draft['mg-ca'], field, value);
    if (anchored) nextDraft['mg-ca'] = anchored;
  }

  return nextDraft;
}

export function anchorIonRatioDraftToGh(draft: IonRatioDraft): IonRatioDraft {
  const relationship = evaluateIonRatioDraft(draft).find(row => row.id === 'mg-ca')?.ratioValue;
  if (relationship === null || relationship === undefined) return draft;
  const mgCa = updateMgCaByGhRelationship(draft['gh-kh'], draft['mg-ca'], String(relationship));
  return mgCa ? { ...draft, 'mg-ca': mgCa } : draft;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseNonNegative(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parsePositive(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function evaluateIonRatio(
  definition: IonRatioDefinition,
  draft: IonRatioDraft[IonRatioId],
): EvaluatedIonRatio {
  const firstValue = parseNonNegative(draft.first);
  const secondValue = parseNonNegative(draft.second);
  let error: string | null = null;
  const swapped = draft.swapped === true;

  if (firstValue === null || secondValue === null) {
    error = 'Enter finite, non-negative values.';
  } else if (secondValue <= 0) {
    error = `Set ${definition.secondLabel} above zero to calculate the ratio.`;
  }

  return {
    ...definition,
    firstLabel: swapped ? definition.secondLabel : definition.firstLabel,
    secondLabel: swapped ? definition.firstLabel : definition.secondLabel,
    firstIonId: swapped ? definition.secondIonId : definition.firstIonId,
    secondIonId: swapped ? definition.firstIonId : definition.secondIonId,
    firstValue,
    secondValue,
    ratioValue: error ? null : (firstValue as number) / (secondValue as number),
    error,
  };
}

export function swapIonRatioDraftRow(
  draft: IonRatioDraft[IonRatioId],
): IonRatioDraft[IonRatioId] {
  return {
    first: draft.second,
    second: draft.first,
    swapped: draft.swapped !== true,
  };
}

export function updateIonRatioByRelationship(
  draft: IonRatioDraft[IonRatioId],
  relationship: string,
): IonRatioDraft[IonRatioId] | null {
  const firstValue = parseNonNegative(draft.first);
  const relationshipValue = parsePositive(relationship);
  if (firstValue === null || relationshipValue === null) return null;

  return {
    first: draft.first,
    second: String(firstValue / relationshipValue),
    ...(typeof draft.swapped === 'boolean' ? { swapped: draft.swapped } : {}),
  };
}

export function evaluateIonRatioDraft(draft: IonRatioDraft): EvaluatedIonRatio[] {
  return ION_RATIO_DEFINITIONS.map(definition => evaluateIonRatio(definition, draft[definition.id]));
}

export function isValidIonRatioDraft(draft: IonRatioDraft): boolean {
  return evaluateIonRatioDraft(draft).every(row => row.error === null);
}

export function normalizeIonRatioDraft(value: unknown): IonRatioDraft {
  if (!isRecord(value)) return { ...DEFAULT_ION_RATIO_DRAFT };

  const candidate = { ...DEFAULT_ION_RATIO_DRAFT };
  for (const definition of ION_RATIO_DEFINITIONS) {
    const row = value[definition.id];
    if (!isRecord(row)) {
      return { ...DEFAULT_ION_RATIO_DRAFT };
    }
    if (typeof row.first === 'string' && typeof row.second === 'string') {
      candidate[definition.id] = {
        first: row.first,
        second: row.second,
        swapped: row.swapped === true,
      };
      continue;
    }
    // Migrate the previous anchor/ratio shape without losing a user's values.
    if (typeof row.anchor === 'string' && typeof row.ratio === 'string') {
      const anchor = Number(row.anchor);
      const previousRatio = Number(row.ratio);
      if (Number.isFinite(anchor) && Number.isFinite(previousRatio)) {
        candidate[definition.id] = {
          first: String(anchor * previousRatio),
          second: row.anchor,
        };
        continue;
      }
    }
    return { ...DEFAULT_ION_RATIO_DRAFT };
  }

  return isValidIonRatioDraft(candidate) ? candidate : { ...DEFAULT_ION_RATIO_DRAFT };
}

export function extractDirectIonTargets(
  draft: IonRatioDraft,
): Partial<Record<IonId, number>> {
  const values: Partial<Record<IonId, number>> = {};
  const evaluatedRows = evaluateIonRatioDraft(draft);
  for (const row of evaluatedRows) {
    if (row.error || row.diagnosticOnly || !row.firstIonId || !row.secondIonId) continue;
    values[row.firstIonId] = row.firstValue ?? 0;
    values[row.secondIonId] = row.secondValue ?? 0;
  }
  const hardnessRow = evaluatedRows.find(row => row.id === 'gh-kh');
  if (hardnessRow && hardnessRow.error === null && hardnessRow.firstValue !== null && hardnessRow.secondValue !== null) {
    const kh = hardnessRow.firstLabel === 'KH' ? hardnessRow.firstValue : hardnessRow.secondValue;
    values.bicarbonate = kh / KH_BICARBONATE_FACTOR;
  }
  return values;
}

export function mergeDirectIonTargets(
  currentTargets: Partial<Record<IonId, number>>,
  ratioTargets: Partial<Record<IonId, number>>,
): Partial<Record<IonId, number>> {
  return { ...currentTargets, ...ratioTargets };
}

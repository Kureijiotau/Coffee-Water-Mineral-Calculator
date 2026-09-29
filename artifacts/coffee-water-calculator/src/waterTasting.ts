import type { IonId } from './waterData';

export const WATER_TASTING_STORAGE_KEY = 'cwm.waterTastings.v1';

export const WATER_TASTING_RATINGS = [
  {
    id: 'clarity',
    label: 'Clarity',
    prompt: 'How clearly do the coffee’s distinct qualities come through with this water?',
  },
  {
    id: 'flavorExpression',
    label: 'Flavor expression',
    prompt: 'How distinctly does this water support the coffee’s flavor character?',
  },
  {
    id: 'balance',
    label: 'Balance',
    prompt: 'How integrated are the cup’s flavors, acidity, sweetness, and body with this water?',
  },
  {
    id: 'mouthfeel',
    label: 'Mouthfeel',
    prompt: 'How does the water support the cup’s texture and tactile feel?',
  },
  {
    id: 'finish',
    label: 'Finish',
    prompt: 'How does the aftertaste carry and fade with this water?',
  },
] as const;

export type WaterTastingRatingId = typeof WATER_TASTING_RATINGS[number]['id'];
export type WaterTastingRatings = Partial<Record<WaterTastingRatingId, number>>;

export const WATER_TASTING_SPECTRUM = [
  {
    id: 'acidityFocus',
    historyLabel: 'Acidity',
    label: 'Acidity focus',
    leftLabel: 'Sharp / Articulate',
    rightLabel: 'Mellow / Rounded',
  },
  {
    id: 'bodyWeight',
    historyLabel: 'Body',
    label: 'Body / weight',
    leftLabel: 'Tea-like / Weightless',
    rightLabel: 'Heavy / Coating',
  },
  {
    id: 'structure',
    historyLabel: 'Structure',
    label: 'Structure',
    leftLabel: 'Isolated / Monotone',
    rightLabel: 'Complex / Layered',
  },
  {
    id: 'finish',
    historyLabel: 'Finish',
    label: 'Finish',
    leftLabel: 'Fast / Fleeting',
    rightLabel: 'Lingering / Long',
  },
] as const;

export type WaterTastingSpectrumId = typeof WATER_TASTING_SPECTRUM[number]['id'];
export type WaterTastingSpectrum = Record<WaterTastingSpectrumId, number>;

export function createNeutralWaterTastingSpectrum(): WaterTastingSpectrum {
  return Object.fromEntries(
    WATER_TASTING_SPECTRUM.map(({ id }) => [id, 0]),
  ) as WaterTastingSpectrum;
}

export const WATER_TASTING_DESCRIPTORS = [
  {
    id: 'fragrance-aroma',
    label: 'Fragrance / aroma',
    options: [
      { id: 'soft', label: 'Soft' },
      { id: 'mineral', label: 'Mineral' },
      { id: 'chalky', label: 'Chalky' },
      { id: 'metallic', label: 'Metallic' },
      { id: 'saline', label: 'Saline' },
      { id: 'earthy', label: 'Earthy' },
      { id: 'clean-neutral', label: 'Clean / neutral' },
    ],
  },
  {
    id: 'flavor',
    label: 'Flavor',
    options: [
      { id: 'muted', label: 'Muted' },
      { id: 'muddy', label: 'Muddy' },
      { id: 'flat', label: 'Flat' },
      { id: 'clean-finish', label: 'Clean finish' },
      { id: 'short-finish', label: 'Short finish' },
      { id: 'lingering-finish', label: 'Lingering finish' },
    ],
  },
  {
    id: 'main-tastes',
    label: 'Main tastes',
    options: [
      { id: 'crisp', label: 'Crisp' },
      { id: 'rounded', label: 'Rounded' },
      { id: 'sparkling', label: 'Sparkling' },
      { id: 'tart', label: 'Tart' },
      { id: 'jammy', label: 'Jammy' },
    ],
  },
  {
    id: 'mouthfeel',
    label: 'Mouthfeel',
    options: [
      { id: 'thin', label: 'Thin' },
      { id: 'full-coating', label: 'Full / coating' },
      { id: 'drying', label: 'Drying' },
      { id: 'hollow', label: 'Hollow' },
      { id: 'juicy', label: 'Juicy' },
      { id: 'syrupy', label: 'Syrupy' },
      { id: 'tannic-astringent', label: 'Tannic / astringent' },
    ],
  },
] as const;

export type WaterTastingDescriptorId =
  typeof WATER_TASTING_DESCRIPTORS[number]['options'][number]['id'];

export const WATER_TASTING_DESCRIPTIVE_ATTRIBUTES = [
  { id: 'fragrance', label: 'Fragrance intensity', cueLabel: 'fragrance' },
  { id: 'aroma', label: 'Aroma intensity', cueLabel: 'aroma' },
  { id: 'flavor', label: 'Flavor intensity', cueLabel: 'flavor' },
  { id: 'aftertaste', label: 'Aftertaste intensity', cueLabel: 'aftertaste' },
  { id: 'acidity', label: 'Acidity intensity', cueLabel: 'acidity' },
  { id: 'sweetness', label: 'Sweetness intensity', cueLabel: 'sweetness' },
  { id: 'mouthfeel', label: 'Mouthfeel intensity', cueLabel: 'mouthfeel' },
] as const;

export type WaterTastingDescriptiveId =
  typeof WATER_TASTING_DESCRIPTIVE_ATTRIBUTES[number]['id'];
export type WaterTastingDescriptiveScores =
  Partial<Record<WaterTastingDescriptiveId, number>>;

export const WATER_TASTING_AFFECTIVE_ATTRIBUTES = [
  { id: 'fragranceAroma', label: 'Fragrance / aroma' },
  { id: 'flavorAftertaste', label: 'Flavor / aftertaste' },
  { id: 'acidity', label: 'Acidity' },
  { id: 'mouthfeel', label: 'Mouthfeel' },
  { id: 'overall', label: 'Overall' },
] as const;

export type WaterTastingAffectiveId =
  typeof WATER_TASTING_AFFECTIVE_ATTRIBUTES[number]['id'];
export type WaterTastingAffectiveScores =
  Partial<Record<WaterTastingAffectiveId, number>>;

export const WATER_TASTING_AFFECTIVE_ANCHORS = [
  { value: 1, label: 'Extremely low' },
  { value: 2, label: 'Very low' },
  { value: 3, label: 'Moderately low' },
  { value: 4, label: 'Slightly low' },
  { value: 5, label: 'Neither high nor low' },
  { value: 6, label: 'Slightly high' },
  { value: 7, label: 'Moderately high' },
  { value: 8, label: 'Very high' },
  { value: 9, label: 'Extremely high' },
] as const;

const DESCRIPTIVE_INTENSITY_CUES = [
  'Not perceived',
  'Barely perceptible',
  'Extremely faint',
  'Very faint',
  'Faint',
  'Slight',
  'Slightly present',
  'Low',
  'Moderate',
  'Moderately pronounced',
  'Pronounced',
  'Strong',
  'Very strong',
  'Highly intense',
  'Extremely strong',
  'Extremely intense',
] as const;

const MOUTHFEEL_INTENSITY_CUES = [
  'No mouthfeel intensity perceived',
  'Almost water-light',
  'Barely more than water-light',
  'Very faint, tea-like weight',
  'Light, tea-like weight',
  'Slightly light weight',
  'Light-to-medium weight',
  'Moderate, balanced weight',
  'Clearly present, medium weight',
  'Medium-full weight',
  'Fuller, substantial weight',
  'Very full weight',
  'Strong, coating weight',
  'Very coating, syrupy weight',
  'Extremely coating, syrupy weight',
  'Maximally intense, syrupy coating',
] as const;

export function getWaterTastingDescriptiveCue(
  id: WaterTastingDescriptiveId,
  value: number,
): string | undefined {
  if (!Number.isInteger(value) || value < 0 || value > 15) return undefined;
  if (id === 'mouthfeel') return MOUTHFEEL_INTENSITY_CUES[value];
  const attribute = WATER_TASTING_DESCRIPTIVE_ATTRIBUTES.find(item => item.id === id);
  if (!attribute) return undefined;
  return `${DESCRIPTIVE_INTENSITY_CUES[value]} ${attribute.cueLabel}`;
}

export function getWaterTastingAffectiveCue(value: number): string | undefined {
  return WATER_TASTING_AFFECTIVE_ANCHORS.find(anchor => anchor.value === value)?.label;
}

export type WaterTastingProfileGroup = 'Alchemist' | 'Watermancer';

export interface WaterTastingProfileReadings {
  ions: Partial<Record<IonId, number>>;
  tds?: number;
  gh?: number;
  kh?: number;
}

export interface WaterTastingProfileSource {
  sourceId: string;
  name: string;
  readings: WaterTastingProfileReadings;
}

export interface WaterTastingProfileOption extends WaterTastingProfileSource {
  group: WaterTastingProfileGroup;
}

export interface WaterTastingCoffeeDetails {
  name?: string;
  roast?: string;
  origin?: string;
  brewMethod?: string;
}

interface WaterTastingDraftBase {
  profileSourceId: string;
  profileNameSnapshot: string;
  coffee: WaterTastingCoffeeDetails;
  descriptorIds: string[];
}

export interface WaterTastingLegacyDraft extends WaterTastingDraftBase {
  scoringVersion?: undefined;
  ratings: WaterTastingRatings;
  spectrum?: WaterTastingSpectrum;
}

export interface WaterTastingCvaDraft extends WaterTastingDraftBase {
  scoringVersion: 2;
  descriptive: WaterTastingDescriptiveScores;
  affective: WaterTastingAffectiveScores;
}

export type WaterTastingDraft = WaterTastingLegacyDraft | WaterTastingCvaDraft;

export interface WaterTastingEditorValues extends WaterTastingDraftBase {
  mode: 'legacy' | 'cva';
  ratings: WaterTastingRatings;
  spectrum: WaterTastingSpectrum;
  descriptive: WaterTastingDescriptiveScores;
  affective: WaterTastingAffectiveScores;
  legacySpectrumCaptured: boolean;
}

interface WaterTastingRecordBase extends WaterTastingDraftBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface WaterTastingLegacyRecord extends WaterTastingRecordBase {
  scoringVersion?: undefined;
  ratings: WaterTastingRatings;
  spectrum?: WaterTastingSpectrum;
}

export interface WaterTastingCvaRecord extends WaterTastingRecordBase {
  scoringVersion: 2;
  descriptive: WaterTastingDescriptiveScores;
  affective: WaterTastingAffectiveScores;
}

export type WaterTastingRecord = WaterTastingLegacyRecord | WaterTastingCvaRecord;

export function isCvaWaterTastingRecord(
  record: WaterTastingRecord,
): record is WaterTastingCvaRecord {
  return record.scoringVersion === 2;
}

export type WaterTastingStorageError =
  | 'unavailable'
  | 'invalid-data'
  | 'invalid-records'
  | 'changed-data'
  | 'write-failed';

export type WaterTastingLoadResult =
  | { ok: true; records: WaterTastingRecord[] }
  | { ok: false; error: WaterTastingStorageError };

export type WaterTastingSaveResult =
  | { ok: true }
  | { ok: false; error: WaterTastingStorageError };

export interface WaterTastingStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const RATING_IDS = new Set<string>(WATER_TASTING_RATINGS.map(rating => rating.id));
const DESCRIPTIVE_IDS = new Set<string>(
  WATER_TASTING_DESCRIPTIVE_ATTRIBUTES.map(attribute => attribute.id),
);
const AFFECTIVE_IDS = new Set<string>(
  WATER_TASTING_AFFECTIVE_ATTRIBUTES.map(attribute => attribute.id),
);
const DESCRIPTOR_IDS = new Set<string>(
  WATER_TASTING_DESCRIPTORS.reduce<string[]>((ids, group) => {
    ids.push(...group.options.map(option => option.id));
    return ids;
  }, []),
);
const SPECTRUM_IDS = new Set<string>(WATER_TASTING_SPECTRUM.map(axis => axis.id));
const COFFEE_FIELD_IDS = ['name', 'roast', 'origin', 'brewMethod'] as const;

function resolveStorage(storage?: WaterTastingStorage): WaterTastingStorage | null {
  if (storage) return storage;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidRatings(value: unknown): value is WaterTastingRatings {
  if (!isObject(value)) return false;
  return Object.entries(value).every(([key, score]) => (
    RATING_IDS.has(key)
    && typeof score === 'number'
    && Number.isInteger(score)
    && score >= 0
    && score <= 10
  ));
}

function isValidScoreMap(
  value: unknown,
  allowedIds: ReadonlySet<string>,
  min: number,
  max: number,
): value is Record<string, number> {
  if (!isObject(value)) return false;
  return Object.entries(value).every(([key, score]) => (
    allowedIds.has(key)
    && typeof score === 'number'
    && Number.isInteger(score)
    && score >= min
    && score <= max
  ));
}

function isValidSpectrum(value: unknown): value is WaterTastingSpectrum {
  if (!isObject(value)) return false;
  const entries = Object.entries(value);
  return entries.length === WATER_TASTING_SPECTRUM.length
    && entries.every(([key, score]) => (
      SPECTRUM_IDS.has(key)
      && typeof score === 'number'
      && Number.isInteger(score)
      && score >= -5
      && score <= 5
    ))
    && WATER_TASTING_SPECTRUM.every(({ id }) => (
      Object.prototype.hasOwnProperty.call(value, id)
    ));
}

function isValidCoffee(value: unknown): value is WaterTastingCoffeeDetails {
  if (!isObject(value)) return false;
  return Object.entries(value).every(([key, field]) => (
    COFFEE_FIELD_IDS.includes(key as typeof COFFEE_FIELD_IDS[number])
    && typeof field === 'string'
  ));
}

function isValidRecord(value: unknown): value is WaterTastingRecord {
  if (!isObject(value)) return false;
  if (
    typeof value.id !== 'string'
    || value.id.trim() === ''
    || typeof value.profileSourceId !== 'string'
    || value.profileSourceId.trim() === ''
    || typeof value.profileNameSnapshot !== 'string'
    || value.profileNameSnapshot.trim() === ''
    || typeof value.createdAt !== 'string'
    || !Number.isFinite(Date.parse(value.createdAt))
    || typeof value.updatedAt !== 'string'
    || !Number.isFinite(Date.parse(value.updatedAt))
    || !isValidCoffee(value.coffee)
    || !Array.isArray(value.descriptorIds)
    || !value.descriptorIds.every(id => typeof id === 'string' && DESCRIPTOR_IDS.has(id))
  ) {
    return false;
  }
  if (value.scoringVersion === 2) {
    return !Object.prototype.hasOwnProperty.call(value, 'ratings')
      && !Object.prototype.hasOwnProperty.call(value, 'spectrum')
      && isValidScoreMap(value.descriptive, DESCRIPTIVE_IDS, 0, 15)
      && isValidScoreMap(value.affective, AFFECTIVE_IDS, 1, 9);
  }
  return value.scoringVersion === undefined
    && isValidRatings(value.ratings)
    && (value.spectrum === undefined || isValidSpectrum(value.spectrum))
    && !Object.prototype.hasOwnProperty.call(value, 'descriptive')
    && !Object.prototype.hasOwnProperty.call(value, 'affective');
}

function isValidRecordList(value: unknown): value is WaterTastingRecord[] {
  if (!Array.isArray(value) || !value.every(isValidRecord)) return false;
  return new Set(value.map(record => record.id)).size === value.length;
}

function normalizeCoffee(coffee: WaterTastingCoffeeDetails): WaterTastingCoffeeDetails {
  return Object.fromEntries(
    COFFEE_FIELD_IDS.flatMap(id => {
      const value = coffee[id]?.trim();
      return value ? [[id, value]] : [];
    }),
  );
}

function createRecordId(): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `water-tasting-${uuid ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

export function calculateWaterTastingTotal(ratings: WaterTastingRatings): number | null {
  if (!WATER_TASTING_RATINGS.every(({ id }) => (
    Number.isInteger(ratings[id]) && Number(ratings[id]) >= 0 && Number(ratings[id]) <= 10
  ))) {
    return null;
  }
  return WATER_TASTING_RATINGS.reduce((total, { id }) => total + Number(ratings[id]), 0);
}

export function createWaterTastingRecord(
  draft: WaterTastingLegacyDraft,
  now?: Date,
  id?: string,
): WaterTastingLegacyRecord;
export function createWaterTastingRecord(
  draft: WaterTastingCvaDraft,
  now?: Date,
  id?: string,
): WaterTastingCvaRecord;
export function createWaterTastingRecord(
  draft: WaterTastingDraft,
  now = new Date(),
  id = createRecordId(),
): WaterTastingRecord {
  now ??= new Date();
  id ??= createRecordId();
  const timestamp = now.toISOString();
  const base = {
    profileSourceId: draft.profileSourceId,
    profileNameSnapshot: draft.profileNameSnapshot,
    coffee: normalizeCoffee(draft.coffee),
    descriptorIds: [...new Set(draft.descriptorIds)],
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (draft.scoringVersion === 2) {
    return {
      ...base,
      scoringVersion: 2,
      descriptive: { ...draft.descriptive },
      affective: { ...draft.affective },
    };
  }
  return {
    ...base,
    ratings: { ...draft.ratings },
    ...(draft.spectrum ? { spectrum: { ...draft.spectrum } } : {}),
  };
}

export function updateWaterTastingRecord(
  record: WaterTastingLegacyRecord,
  draft: WaterTastingLegacyDraft,
  now?: Date,
): WaterTastingLegacyRecord;
export function updateWaterTastingRecord(
  record: WaterTastingCvaRecord,
  draft: WaterTastingCvaDraft,
  now?: Date,
): WaterTastingCvaRecord;
export function updateWaterTastingRecord(
  record: WaterTastingRecord,
  draft: WaterTastingDraft,
  now = new Date(),
): WaterTastingRecord {
  if ((record.scoringVersion === 2) !== (draft.scoringVersion === 2)) {
    throw new Error('A tasting cannot be edited in a different scoring format.');
  }
  const common = {
    id: record.id,
    createdAt: record.createdAt,
    profileSourceId: draft.profileSourceId,
    profileNameSnapshot: draft.profileNameSnapshot,
    coffee: normalizeCoffee(draft.coffee),
    descriptorIds: [...new Set(draft.descriptorIds)],
    updatedAt: now.toISOString(),
  };
  if (draft.scoringVersion === 2 && record.scoringVersion === 2) {
    return {
      ...common,
      scoringVersion: 2,
      descriptive: { ...draft.descriptive },
      affective: { ...draft.affective },
    };
  }
  if (draft.scoringVersion === undefined && record.scoringVersion === undefined) {
    return {
      ...common,
      ratings: { ...draft.ratings },
      ...(draft.spectrum ? { spectrum: { ...draft.spectrum } } : {}),
    };
  }
  throw new Error('A tasting cannot be edited in a different scoring format.');
}

export function buildWaterTastingProfileOptions(
  alchemistSources: ReadonlyArray<WaterTastingProfileSource>,
  watermancerSources: ReadonlyArray<WaterTastingProfileSource>,
): WaterTastingProfileOption[] {
  const seenSourceIds = new Set<string>();
  const appendGroup = (
    sources: ReadonlyArray<WaterTastingProfileSource>,
    group: WaterTastingProfileGroup,
  ): WaterTastingProfileOption[] => sources.map(source => {
    if (!source.sourceId.trim() || !source.name.trim()) {
      throw new Error('Water Tasting profile sources need a source ID and name.');
    }
    if (seenSourceIds.has(source.sourceId)) {
      throw new Error(`Duplicate Water Tasting source ID: ${source.sourceId}`);
    }
    seenSourceIds.add(source.sourceId);
    return { ...source, group };
  });

  return [
    ...appendGroup(alchemistSources, 'Alchemist'),
    ...appendGroup(watermancerSources, 'Watermancer'),
  ];
}

export function sortWaterTastingsNewestFirst(
  records: readonly WaterTastingRecord[],
): WaterTastingRecord[] {
  return records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => Date.parse(b.record.createdAt) - Date.parse(a.record.createdAt) || a.index - b.index)
    .map(({ record }) => record);
}

export function loadWaterTastings(storage?: WaterTastingStorage): WaterTastingLoadResult {
  const target = resolveStorage(storage);
  if (!target) return { ok: false, error: 'unavailable' };

  let raw: string | null;
  try {
    raw = target.getItem(WATER_TASTING_STORAGE_KEY);
  } catch {
    return { ok: false, error: 'unavailable' };
  }

  if (raw === null) return { ok: true, records: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: 'invalid-data' };
  }

  if (!isValidRecordList(parsed)) return { ok: false, error: 'invalid-data' };
  return { ok: true, records: parsed };
}

export function saveWaterTastings(
  records: WaterTastingRecord[],
  expectedRecords: readonly WaterTastingRecord[],
  storage?: WaterTastingStorage,
): WaterTastingSaveResult {
  if (!isValidRecordList(records) || !isValidRecordList(expectedRecords)) {
    return { ok: false, error: 'invalid-records' };
  }
  const target = resolveStorage(storage);
  if (!target) return { ok: false, error: 'unavailable' };

  const current = loadWaterTastings(target);
  if (!current.ok) return current;
  if (JSON.stringify(current.records) !== JSON.stringify(expectedRecords)) {
    return { ok: false, error: 'changed-data' };
  }

  try {
    target.setItem(WATER_TASTING_STORAGE_KEY, JSON.stringify(records));
    return { ok: true };
  } catch {
    return { ok: false, error: 'write-failed' };
  }
}
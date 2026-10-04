import type { IonId } from './waterData';
import { getAccountSyncStorageKey, notifyAccountSyncLocalChange } from './accountSyncStorage';

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

const AFFECTIVE_CUES: Record<WaterTastingAffectiveId, readonly string[]> = {
  fragranceAroma: [
    'Barely perceptible', 'Very faint', 'Faint', 'Softly expressed',
    'Clearly present', 'Pronounced', 'Vividly aromatic',
    'Highly expressive', 'Intensely aromatic',
  ],
  flavorAftertaste: [
    'Barely expressed', 'Very faint', 'Faint', 'Softly expressed',
    'Clearly defined', 'Pronounced', 'Richly expressed',
    'Intense', 'Intensely expressed',
  ],
  acidity: [
    'Nearly absent', 'Very soft', 'Soft', 'Gentle',
    'Bright and clear', 'Lively', 'Markedly bright',
    'Sharp', 'Forcefully sharp',
  ],
  mouthfeel: [
    'Almost no tactile weight', 'Very light, near-weightless',
    'Light, tea-like texture', 'Soft, delicate texture',
    'Medium, rounded weight', 'Clearly full, smooth texture',
    'Full-bodied, plush texture', 'Dense, coating texture',
    'Very dense, syrupy coating',
  ],
  overall: [
    'Subtle water effect', 'Very mild effect', 'Mild effect',
    'Lightly expressed', 'Clearly present', 'Pronounced',
    'Strongly expressed', 'Very strong', 'Strong across the cup',
  ],
};

const AFFECTIVE_HUES: Record<WaterTastingAffectiveId, number> = {
  fragranceAroma: 278,
  flavorAftertaste: 16,
  acidity: 48,
  mouthfeel: 212,
  overall: 172,
};

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
  'No tactile weight perceived',
  'Almost no tactile weight',
  'Barely perceptible texture',
  'Very light, tea-like texture',
  'Light, delicate texture',
  'Light-to-medium weight',
  'Soft, rounded weight',
  'Moderate, smooth weight',
  'Clearly present, rounded body',
  'Medium-full, plush texture',
  'Full, supple texture',
  'Substantial, smooth coating',
  'Dense, coating texture',
  'Very dense, syrupy coating',
  'Extremely dense, lingering coating',
  'Maximum density, persistent coating',
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

export function getWaterTastingAffectiveCue(
  id: WaterTastingAffectiveId,
  value: number,
): string | undefined {
  if (!Number.isInteger(value) || value < 1 || value > 9) return undefined;
  return AFFECTIVE_CUES[id]?.[value - 1];
}

export function getWaterTastingAffectiveAnchors(
  id: WaterTastingAffectiveId,
): { value: 1 | 5 | 9; label: string }[] {
  return ([1, 5, 9] as const).map(value => ({
    value,
    label: getWaterTastingAffectiveCue(id, value) ?? '',
  }));
}

export function getWaterTastingAffectiveColor(
  id: WaterTastingAffectiveId,
  value: number,
): string {
  const position = Math.max(0, Math.min(1, (value - 1) / 8));
  const saturation = Math.round(22 + position * 68);
  const lightness = Math.round(72 - position * 13);
  return `hsl(${AFFECTIVE_HUES[id]} ${saturation}% ${lightness}%)`;
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
  notes?: string;
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
  notes: string;
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

export interface WaterTastingDeletionMarker {
  id: string;
  deletedAt: string;
}

export interface WaterTastingCollection {
  records: WaterTastingRecord[];
  deletions: WaterTastingDeletionMarker[];
}

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

const COLLECTION_VERSION = 2;

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
    if (typeof localStorage === 'undefined') return null;
    return {
      getItem: key => localStorage.getItem(getAccountSyncStorageKey(key)),
      setItem: (key, value) => localStorage.setItem(getAccountSyncStorageKey(key), value),
    };
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
    || (value.notes !== undefined
      && (typeof value.notes !== 'string' || value.notes.length > 2000))
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

function isValidDeletionMarkerList(value: unknown): value is WaterTastingDeletionMarker[] {
  if (!Array.isArray(value)) return false;
  if (!value.every(marker => (
    isObject(marker)
    && typeof marker.id === 'string'
    && marker.id.trim() !== ''
    && typeof marker.deletedAt === 'string'
    && Number.isFinite(Date.parse(marker.deletedAt))
  ))) return false;
  return new Set(value.map(marker => marker.id)).size === value.length;
}

function isValidCollection(value: unknown): value is WaterTastingCollection {
  return isObject(value)
    && isValidRecordList(value.records)
    && isValidDeletionMarkerList(value.deletions);
}

function normalizeNotes(value: string | undefined): string | undefined {
  const notes = value?.trim();
  return notes ? notes : undefined;
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
    ...(normalizeNotes(draft.notes) ? { notes: normalizeNotes(draft.notes) } : {}),
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
    ...(normalizeNotes(draft.notes === undefined ? record.notes : draft.notes)
      ? { notes: normalizeNotes(draft.notes === undefined ? record.notes : draft.notes) }
      : {}),
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

export function createWaterTastingDeletionMarker(
  record: WaterTastingRecord,
  now = new Date(),
  previous?: WaterTastingDeletionMarker,
): WaterTastingDeletionMarker {
  const recordTime = Date.parse(record.updatedAt);
  const previousDeletionTime = previous ? Date.parse(previous.deletedAt) : 0;
  const deletedAt = new Date(Math.max(
    now.getTime(),
    recordTime + 1,
    previousDeletionTime + 1,
  )).toISOString();
  return { id: record.id, deletedAt };
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

function waterTastingProfileSortName(name: string): string {
  return name.trim().replace(/^(?:Recipe|Profile) · /i, '').trim();
}

export function sortWaterTastingProfileOptionsByName(
  options: readonly WaterTastingProfileOption[],
): WaterTastingProfileOption[] {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const groupOrder = (group: WaterTastingProfileGroup) => group === 'Alchemist' ? 0 : 1;

  return options
    .map((option, index) => ({ option, index }))
    .sort((a, b) => (
      groupOrder(a.option.group) - groupOrder(b.option.group)
      || collator.compare(
        waterTastingProfileSortName(a.option.name),
        waterTastingProfileSortName(b.option.name),
      )
      || a.index - b.index
    ))
    .map(({ option }) => option);
}

export function sortWaterTastingsNewestFirst(
  records: readonly WaterTastingRecord[],
): WaterTastingRecord[] {
  return records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => Date.parse(b.record.createdAt) - Date.parse(a.record.createdAt) || a.index - b.index)
    .map(({ record }) => record);
}

export function sortWaterTastingsByName(
  records: readonly WaterTastingRecord[],
): WaterTastingRecord[] {
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  return records
    .map((record, index) => ({ record, index }))
    .sort((a, b) => collator.compare(a.record.profileNameSnapshot, b.record.profileNameSnapshot) || a.index - b.index)
    .map(({ record }) => record);
}

export type WaterTastingCollectionLoadResult =
  | { ok: true; collection: WaterTastingCollection }
  | { ok: false; error: WaterTastingStorageError };

export function loadWaterTastingCollection(
  storage?: WaterTastingStorage,
): WaterTastingCollectionLoadResult {
  const target = resolveStorage(storage);
  if (!target) return { ok: false, error: 'unavailable' };

  let raw: string | null;
  try {
    raw = target.getItem(WATER_TASTING_STORAGE_KEY);
  } catch {
    return { ok: false, error: 'unavailable' };
  }

  if (raw === null) return { ok: true, collection: { records: [], deletions: [] } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, error: 'invalid-data' };
  }

  if (Array.isArray(parsed)) {
    return isValidRecordList(parsed)
      ? { ok: true, collection: { records: parsed, deletions: [] } }
      : { ok: false, error: 'invalid-data' };
  }

  if (
    !isObject(parsed)
    || parsed.version !== COLLECTION_VERSION
    || !isValidCollection(parsed)
  ) {
    return { ok: false, error: 'invalid-data' };
  }
  return {
    ok: true,
    collection: { records: parsed.records, deletions: parsed.deletions },
  };
}

export function loadWaterTastings(storage?: WaterTastingStorage): WaterTastingLoadResult {
  const loaded = loadWaterTastingCollection(storage);
  return loaded.ok
    ? { ok: true, records: loaded.collection.records }
    : loaded;
}

export function saveWaterTastingCollection(
  collection: WaterTastingCollection,
  expectedCollection: WaterTastingCollection,
  storage?: WaterTastingStorage,
  notifyLocalChange = storage === undefined,
): WaterTastingSaveResult {
  if (!isValidCollection(collection) || !isValidCollection(expectedCollection)) {
    return { ok: false, error: 'invalid-records' };
  }
  const target = resolveStorage(storage);
  if (!target) return { ok: false, error: 'unavailable' };

  const current = loadWaterTastingCollection(target);
  if (!current.ok) return current;
  if (JSON.stringify(current.collection) !== JSON.stringify(expectedCollection)) {
    return { ok: false, error: 'changed-data' };
  }

  try {
    target.setItem(WATER_TASTING_STORAGE_KEY, JSON.stringify({
      version: COLLECTION_VERSION,
      records: collection.records,
      deletions: collection.deletions,
    }));
    if (notifyLocalChange) notifyAccountSyncLocalChange();
    return { ok: true };
  } catch {
    return { ok: false, error: 'write-failed' };
  }
}

export function replaceWaterTastingCollection(
  collection: WaterTastingCollection,
  storage?: WaterTastingStorage,
  notifyLocalChange = storage === undefined,
): WaterTastingSaveResult {
  const current = loadWaterTastingCollection(storage);
  if (!current.ok) return current;
  return saveWaterTastingCollection(
    collection,
    current.collection,
    storage,
    notifyLocalChange,
  );
}

export function saveWaterTastings(
  records: WaterTastingRecord[],
  expectedRecords: readonly WaterTastingRecord[],
  storage?: WaterTastingStorage,
): WaterTastingSaveResult {
  if (!isValidRecordList(records) || !isValidRecordList(expectedRecords)) {
    return { ok: false, error: 'invalid-records' };
  }
  const current = loadWaterTastingCollection(storage);
  if (!current.ok) return current;
  if (JSON.stringify(current.collection.records) !== JSON.stringify(expectedRecords)) {
    return { ok: false, error: 'changed-data' };
  }
  return saveWaterTastingCollection(
    { ...current.collection, records },
    current.collection,
    storage,
  );
}
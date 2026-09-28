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

export const WATER_TASTING_DESCRIPTORS = [
  {
    id: 'water-character',
    label: 'Water character',
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
    id: 'cup-effect',
    label: 'Cup effect',
    options: [
      { id: 'crisp', label: 'Crisp' },
      { id: 'rounded', label: 'Rounded' },
      { id: 'thin', label: 'Thin' },
      { id: 'full-coating', label: 'Full / coating' },
      { id: 'drying', label: 'Drying' },
      { id: 'muted', label: 'Muted' },
      { id: 'short-finish', label: 'Short finish' },
      { id: 'lingering-finish', label: 'Lingering finish' },
    ],
  },
] as const;

export type WaterTastingDescriptorId =
  typeof WATER_TASTING_DESCRIPTORS[number]['options'][number]['id'];
export type WaterTastingProfileGroup = 'Built-in' | 'Saved';

export interface WaterTastingProfileOption {
  sourceId: string;
  name: string;
  group: WaterTastingProfileGroup;
}

export interface WaterTastingCoffeeDetails {
  name?: string;
  roast?: string;
  origin?: string;
  brewMethod?: string;
}

export interface WaterTastingDraft {
  profileSourceId: string;
  profileNameSnapshot: string;
  coffee: WaterTastingCoffeeDetails;
  ratings: WaterTastingRatings;
  descriptorIds: string[];
}

export interface WaterTastingRecord extends WaterTastingDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
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
const DESCRIPTOR_IDS = new Set<string>(
  WATER_TASTING_DESCRIPTORS.reduce<string[]>((ids, group) => {
    ids.push(...group.options.map(option => option.id));
    return ids;
  }, []),
);
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
    || !isValidRatings(value.ratings)
    || !Array.isArray(value.descriptorIds)
    || !value.descriptorIds.every(id => typeof id === 'string' && DESCRIPTOR_IDS.has(id))
  ) {
    return false;
  }
  return true;
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
  draft: WaterTastingDraft,
  now = new Date(),
  id = createRecordId(),
): WaterTastingRecord {
  const timestamp = now.toISOString();
  return {
    ...draft,
    coffee: normalizeCoffee(draft.coffee),
    ratings: { ...draft.ratings },
    descriptorIds: [...new Set(draft.descriptorIds)],
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateWaterTastingRecord(
  record: WaterTastingRecord,
  draft: WaterTastingDraft,
  now = new Date(),
): WaterTastingRecord {
  return {
    ...record,
    ...draft,
    coffee: normalizeCoffee(draft.coffee),
    ratings: { ...draft.ratings },
    descriptorIds: [...new Set(draft.descriptorIds)],
    updatedAt: now.toISOString(),
  };
}

export function buildWaterTastingProfileOptions(
  savedProfiles: ReadonlyArray<{ id: string; name: string }>,
  aikiProfileName: string,
): WaterTastingProfileOption[] {
  return [
    {
      sourceId: 'safe-profile',
      name: `${aikiProfileName} safe profile`,
      group: 'Built-in',
    },
    {
      sourceId: 'salt-table',
      name: 'Current salt table',
      group: 'Built-in',
    },
    ...savedProfiles.map(profile => ({
      sourceId: `saved:${profile.id}`,
      name: profile.name,
      group: 'Saved' as const,
    })),
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
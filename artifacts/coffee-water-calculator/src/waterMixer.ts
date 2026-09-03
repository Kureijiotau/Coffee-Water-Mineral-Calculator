import { ACTIVE_ION_IDS, IONS, computeGH, computeKH, type IonId } from '@/waterData';
import type { WaterMetadata } from '@/localWaters';

export type WaterMixSourceKind = 'saved-recipe' | 'database' | 'manual';

export type WaterMixSourceSnapshot = {
  name: string;
  sourceKind: WaterMixSourceKind;
  sourceId?: string;
  provenance?: string;
  ions: Record<IonId, number>;
  metadata?: WaterMetadata;
};

export type WaterMixInput = {
  sourceA: WaterMixSourceSnapshot;
  sourceB: WaterMixSourceSnapshot;
  volumeAMl: number;
  volumeBMl: number;
};

export type WaterMixValidationCode =
  | 'missing-source'
  | 'invalid-reading'
  | 'negative-reading'
  | 'invalid-volume'
  | 'negative-volume'
  | 'zero-total-volume';

export type WaterMixValidationMessage = {
  code: WaterMixValidationCode;
  message: string;
};

export type WaterMixResult = {
  valid: boolean;
  totalVolumeMl: number;
  volumeAMl: number;
  volumeBMl: number;
  percentageA: number;
  percentageB: number;
  finalIons: Record<IonId, number>;
  gh: number;
  kh: number;
  /** GH divided by KH; null means the ratio is undefined because KH is zero. */
  ghKhRatio: number | null;
  /** Modeled TDS: the sum of normalized active ion readings, not a meter reading. */
  tds: number;
  /** Weighted reported TDS is kept separate from modeled TDS when both sources report it. */
  reportedTds?: number;
  finalMetadata?: WaterMetadata;
  errors: WaterMixValidationMessage[];
};

export type WaterMixRecipe = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sourceA: WaterMixSourceSnapshot;
  sourceB: WaterMixSourceSnapshot;
  volumeAMl: number;
  volumeBMl: number;
  finalIons: Record<IonId, number>;
  finalMetadata?: WaterMetadata;
};

export const WATER_MIXER_STORAGE_KEY = 'cwm.waterMixerRecipes';
export const WATER_MIX_FILE_KIND = 'coffee-water-mix';
export const WATER_MIX_FILE_VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const allIonIds = (): IonId[] => IONS.map(ion => ion.id);

function emptyIonMap(): Record<IonId, number> {
  return Object.fromEntries(allIonIds().map(id => [id, 0])) as Record<IonId, number>;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * Copy a source into the canonical shape used by the calculator. Missing ion
 * keys are intentionally zero; this is the same normalization boundary used
 * by finished-water readings elsewhere in the app.
 */
export function normalizeWaterMixSourceSnapshot(
  source: Partial<WaterMixSourceSnapshot> & { ions?: Partial<Record<IonId, number>> },
): WaterMixSourceSnapshot {
  const ions = emptyIonMap();
  for (const id of allIonIds()) {
    const value = source.ions?.[id];
    ions[id] = typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
  }
  return {
    name: typeof source.name === 'string' ? source.name.trim() : '',
    sourceKind: source.sourceKind === 'saved-recipe' || source.sourceKind === 'database' || source.sourceKind === 'manual'
      ? source.sourceKind
      : 'manual',
    ...(typeof source.sourceId === 'string' && source.sourceId ? { sourceId: source.sourceId } : {}),
    ...(typeof source.provenance === 'string' && source.provenance ? { provenance: source.provenance } : {}),
    ions,
    ...(source.metadata ? { metadata: normalizeMetadata(source.metadata) } : {}),
  };
}

function normalizeMetadata(metadata: WaterMetadata): WaterMetadata {
  const normalized: WaterMetadata = {};
  for (const key of ['silica', 'ph', 'tds', 'alkalinity'] as const) {
    const value = metadata[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) normalized[key] = value;
  }
  return normalized;
}

function validateSource(source: unknown, label: string): WaterMixValidationMessage[] {
  if (!source || !isRecord(source)) return [{ code: 'missing-source', message: `Choose ${label} to calculate a blend.` }];
  const candidate = source as Partial<WaterMixSourceSnapshot>;
  if (typeof candidate.name !== 'string' || !candidate.name.trim()) {
    return [{ code: 'missing-source', message: `Choose ${label} to calculate a blend.` }];
  }
  if (!candidate.ions || !isRecord(candidate.ions)) {
    return [{ code: 'missing-source', message: `Enter final readings for ${label}.` }];
  }
  const errors: WaterMixValidationMessage[] = [];
  for (const id of allIonIds()) {
    const value = candidate.ions[id];
    if (value !== undefined && typeof value !== 'number') {
      errors.push({ code: 'invalid-reading', message: `${label} has an invalid ${id} reading.` });
    } else if (typeof value === 'number' && !Number.isFinite(value)) {
      errors.push({ code: 'invalid-reading', message: `${label} has a non-finite reading.` });
    } else if (typeof value === 'number' && value < 0) {
      errors.push({ code: 'negative-reading', message: `${label} readings cannot be negative.` });
    }
  }
  return errors;
}

function weightedMetadata(
  sourceA: WaterMixSourceSnapshot,
  sourceB: WaterMixSourceSnapshot,
  volumeA: number,
  volumeB: number,
  total: number,
): WaterMetadata | undefined {
  const result: WaterMetadata = {};
  (['silica', 'ph', 'alkalinity'] as const).forEach(key => {
    const a = sourceA.metadata?.[key];
    const b = sourceB.metadata?.[key];
    if (typeof a === 'number' && typeof b === 'number') result[key] = (a * volumeA + b * volumeB) / total;
  });
  if (typeof sourceA.metadata?.tds === 'number' && typeof sourceB.metadata?.tds === 'number') {
    result.tds = (sourceA.metadata.tds * volumeA + sourceB.metadata.tds * volumeB) / total;
  }
  return Object.keys(result).length ? result : undefined;
}

export function calculateWaterMix(input: Partial<WaterMixInput>): WaterMixResult {
  const volumeA = input.volumeAMl;
  const volumeB = input.volumeBMl;
  const errors = [
    ...validateSource(input.sourceA, 'Water A'),
    ...validateSource(input.sourceB, 'Water B'),
  ];
  if (typeof volumeA !== 'number' || !Number.isFinite(volumeA)) {
    errors.push({ code: 'invalid-volume', message: 'Water A volume must be a finite number.' });
  } else if (volumeA < 0) {
    errors.push({ code: 'negative-volume', message: 'Water A volume cannot be negative.' });
  }
  if (typeof volumeB !== 'number' || !Number.isFinite(volumeB)) {
    errors.push({ code: 'invalid-volume', message: 'Water B volume must be a finite number.' });
  } else if (volumeB < 0) {
    errors.push({ code: 'negative-volume', message: 'Water B volume cannot be negative.' });
  }
  const safeA = typeof volumeA === 'number' && Number.isFinite(volumeA) && volumeA >= 0 ? volumeA : 0;
  const safeB = typeof volumeB === 'number' && Number.isFinite(volumeB) && volumeB >= 0 ? volumeB : 0;
  const total = safeA + safeB;
  if (total <= 0) errors.push({ code: 'zero-total-volume', message: 'Add a positive volume to calculate the final mixture.' });

  const finalIons = emptyIonMap();
  if (total > 0 && input.sourceA && input.sourceB) {
    for (const id of allIonIds()) {
      const a = input.sourceA.ions?.[id] ?? 0;
      const b = input.sourceB.ions?.[id] ?? 0;
      if (typeof a === 'number' && typeof b === 'number' && Number.isFinite(a) && Number.isFinite(b)) {
        finalIons[id] = (safeA * a + safeB * b) / total;
      }
    }
  }
  const tds = allIonIds().reduce((sum, id) => sum + finalIons[id], 0);
  const valid = errors.length === 0;
  const result: WaterMixResult = {
    valid,
    totalVolumeMl: total,
    volumeAMl: safeA,
    volumeBMl: safeB,
    percentageA: total > 0 ? safeA / total * 100 : 0,
    percentageB: total > 0 ? safeB / total * 100 : 0,
    finalIons,
    gh: computeGH(finalIons),
    kh: computeKH(finalIons),
    ghKhRatio: computeKH(finalIons) > 0 ? computeGH(finalIons) / computeKH(finalIons) : null,
    tds,
    errors,
  };
  if (valid && input.sourceA && input.sourceB) {
    result.finalMetadata = weightedMetadata(input.sourceA, input.sourceB, safeA, safeB, total);
    if (typeof result.finalMetadata?.tds === 'number') result.reportedTds = result.finalMetadata.tds;
  }
  return result;
}

export const computeWaterMix = calculateWaterMix;

export const WATER_MIXER_IMPORTED_SOURCES_STORAGE_KEY = 'cwm.waterMixerImportedSources';

export function loadImportedWaterMixSources(): WaterMixSourceSnapshot[] {
  try {
    const raw = localStorage.getItem(WATER_MIXER_IMPORTED_SOURCES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(isValidWaterMixSourceSnapshot).map(source => normalizeWaterMixSourceSnapshot(source))
      : [];
  } catch {
    return [];
  }
}

export function saveImportedWaterMixSources(sources: WaterMixSourceSnapshot[]): void {
  try {
    localStorage.setItem(
      WATER_MIXER_IMPORTED_SOURCES_STORAGE_KEY,
      JSON.stringify(sources.filter(isValidWaterMixSourceSnapshot).map(source => normalizeWaterMixSourceSnapshot(source))),
    );
  } catch {
    // Local storage is best effort in private browsing and embedded previews.
  }
}

export function newWaterMixRecipeId(): string {
  return `mix-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidWaterMixSourceSnapshot(value: unknown): value is WaterMixSourceSnapshot {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) return false;
  if (!['saved-recipe', 'database', 'manual'].includes(String(value.sourceKind))) return false;
  if (value.sourceId !== undefined && typeof value.sourceId !== 'string') return false;
  if (value.provenance !== undefined && typeof value.provenance !== 'string') return false;
  if (!isRecord(value.ions)) return false;
  const ions = value.ions;
  return allIonIds().every(id => finiteNonNegative(ions[id]));
}

export function isValidWaterMixRecipe(value: unknown): value is WaterMixRecipe {
  if (!isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.name !== 'string'
    || !value.name.trim()
    || typeof value.createdAt !== 'string'
    || typeof value.updatedAt !== 'string'
    || !isValidWaterMixSourceSnapshot(value.sourceA)
    || !isValidWaterMixSourceSnapshot(value.sourceB)
    || !finiteNonNegative(value.volumeAMl)
    || !finiteNonNegative(value.volumeBMl)
    || !isRecord(value.finalIons)) return false;
  const finalIons = value.finalIons;
  if (!allIonIds().every(id => finiteNonNegative(finalIons[id]))) return false;
  return !value.finalMetadata || (
    isRecord(value.finalMetadata)
    && Object.values(value.finalMetadata).every(item => typeof item === 'number' && Number.isFinite(item) && item >= 0)
  );
}

export function createWaterMixRecipe(
  name: string,
  input: WaterMixInput,
  result = calculateWaterMix(input),
  now = new Date().toISOString(),
): WaterMixRecipe | null {
  const cleanName = name.trim();
  if (!cleanName || !result.valid) return null;
  return {
    id: newWaterMixRecipeId(),
    name: cleanName,
    createdAt: now,
    updatedAt: now,
    sourceA: normalizeWaterMixSourceSnapshot(input.sourceA),
    sourceB: normalizeWaterMixSourceSnapshot(input.sourceB),
    volumeAMl: input.volumeAMl,
    volumeBMl: input.volumeBMl,
    finalIons: { ...result.finalIons },
    ...(result.finalMetadata ? { finalMetadata: { ...result.finalMetadata } } : {}),
  };
}

export function serializeWaterMixRecipeFile(input: {
  name: string;
  sourceA: WaterMixSourceSnapshot;
  sourceB: WaterMixSourceSnapshot;
  volumeAMl: number;
  volumeBMl: number;
  finalIons: Record<IonId, number>;
  finalMetadata?: WaterMetadata;
}): string {
  return JSON.stringify({
    kind: WATER_MIX_FILE_KIND,
    version: WATER_MIX_FILE_VERSION,
    name: input.name.trim() || 'Mixer blend',
    sourceA: normalizeWaterMixSourceSnapshot(input.sourceA),
    sourceB: normalizeWaterMixSourceSnapshot(input.sourceB),
    volumeAMl: input.volumeAMl,
    volumeBMl: input.volumeBMl,
    finalIons: { ...input.finalIons },
    ...(input.finalMetadata ? { finalMetadata: { ...input.finalMetadata } } : {}),
  }, null, 2);
}

export function loadWaterMixRecipes(): WaterMixRecipe[] {
  try {
    const raw = localStorage.getItem(WATER_MIXER_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidWaterMixRecipe) : [];
  } catch {
    return [];
  }
}

export function saveWaterMixRecipes(recipes: WaterMixRecipe[]): void {
  try {
    localStorage.setItem(WATER_MIXER_STORAGE_KEY, JSON.stringify(recipes.filter(isValidWaterMixRecipe)));
  } catch {
    // Local storage is best effort in private browsing and embedded previews.
  }
}

export function saveWaterMixRecipe(recipe: WaterMixRecipe): WaterMixRecipe[] {
  const recipes = loadWaterMixRecipes().filter(item => item.id !== recipe.id);
  const next = [recipe, ...recipes];
  saveWaterMixRecipes(next);
  return next;
}

// Descriptive aliases keep the persistence boundary easy to discover for the
// host App without introducing a second storage implementation.
export const loadSavedMixerRecipes = loadWaterMixRecipes;
export const saveSavedMixerRecipes = saveWaterMixRecipes;
export const newMixerRecipeId = newWaterMixRecipeId;
export const isValidMixerRecipe = isValidWaterMixRecipe;
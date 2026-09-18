import {
  SALTS,
  type RecipeWaterSource,
  type RecipeWaterSources,
  type SaltRecipe,
  type SaltRecipeEntry,
} from '@/waterData';

const STORAGE_KEY = 'cwc-saved-recipes';
export const RECIPE_FILE_KIND = 'coffee-water-recipe';

const SALT_IDS = new Set(SALTS.map(s => s.id));

export const newRecipeId = (): string =>
  `saved-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function recipeFilenameSlug(name: string, fallback = 'coffee-water-recipe'): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

export type FinishedWaterRecipeExtras = {
  finishedWaterIons?: Record<string, number>;
  finishedWaterMetadata?: Record<string, number>;
  sourceWaters?: RecipeWaterSources;
};

export function isValidRecipe(r: unknown): r is SaltRecipe {
  if (!r || typeof r !== 'object') return false;
  const o = r as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string' || !o.name.trim()) return false;
  if (!o.salts || typeof o.salts !== 'object' || Array.isArray(o.salts)) return false;
  const entries = Object.entries(o.salts as Record<string, unknown>);
  if (entries.length === 0) return false;
  for (const [saltId, v] of entries) {
    if (!SALT_IDS.has(saltId)) return false;
    if (!v || typeof v !== 'object') return false;
    const e = v as Record<string, unknown>;
    if (typeof e.target !== 'string' || typeof e.formIdx !== 'number' || !Number.isInteger(e.formIdx)) return false;
    const parsedTarget = Number(e.target);
    if (!Number.isFinite(parsedTarget) || parsedTarget < 0) return false;
    const salt = SALTS.find(s => s.id === saltId)!;
    if (e.formIdx < 0 || e.formIdx >= salt.hydrationForms.length) return false;
  }
  return true;
}

export function loadSavedRecipes(): SaltRecipe[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidRecipe);
  } catch {
    return [];
  }
}

export function saveSavedRecipes(recipes: SaltRecipe[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
  } catch {
    // storage full or unavailable — nothing we can do
  }
}

export interface SplitSettings {
  splitMode: boolean;
  splitStrengths: Record<string, number>;
  splitMls: Record<string, string>;
}

/** Serialize a recipe into a shareable JSON file body. */
export function serializeRecipeFile(
  recipe: { name: string; salts: Record<string, SaltRecipeEntry> }
    & Partial<SplitSettings>
    & FinishedWaterRecipeExtras,
): string {
  const payload: Record<string, unknown> = {
    kind: RECIPE_FILE_KIND,
    version: 1,
    name: recipe.name,
    salts: recipe.salts,
  };
  if (recipe.splitMode) {
    payload.splitMode = recipe.splitMode;
    payload.splitStrengths = recipe.splitStrengths;
    payload.splitMls = recipe.splitMls;
  }
  if (recipe.finishedWaterIons) {
    payload.finishedWaterIons = Object.fromEntries(
      Object.entries(recipe.finishedWaterIons)
        .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
    );
  }
  if (recipe.finishedWaterMetadata) {
    payload.finishedWaterMetadata = Object.fromEntries(
      Object.entries(recipe.finishedWaterMetadata)
        .filter(([, value]) => typeof value === 'number' && Number.isFinite(value) && value >= 0),
    );
  }
  if (recipe.sourceWaters) {
    payload.sourceWaters = recipe.sourceWaters;
  }
  return JSON.stringify(payload, null, 2);
}

/** Validate and coerce split settings from an unknown parsed value. */
function parseSplitSettings(o: Record<string, unknown>): Partial<SplitSettings> {
  if (!o.splitMode) return {};
  const splitStrengths: Record<string, number> = {};
  if (o.splitStrengths && typeof o.splitStrengths === 'object' && !Array.isArray(o.splitStrengths)) {
    for (const [k, v] of Object.entries(o.splitStrengths as Record<string, unknown>)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) splitStrengths[k] = v;
    }
  }
  const splitMls: Record<string, string> = {};
  if (o.splitMls && typeof o.splitMls === 'object' && !Array.isArray(o.splitMls)) {
    for (const [k, v] of Object.entries(o.splitMls as Record<string, unknown>)) {
      if (typeof v === 'string') splitMls[k] = v;
    }
  }
  return { splitMode: true, splitStrengths, splitMls };
}

function parseNumericRecord(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value)
    .filter(([, raw]) => typeof raw === 'number' && Number.isFinite(raw) && raw >= 0)
    .map(([key, raw]) => [key, raw as number] as const);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function parseRecipeWaterSource(value: unknown): RecipeWaterSource | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  if (
    typeof source.name !== 'string'
    || typeof source.volumeMl !== 'string'
    || !source.ions
    || typeof source.ions !== 'object'
    || Array.isArray(source.ions)
    || !source.metadata
    || typeof source.metadata !== 'object'
    || Array.isArray(source.metadata)
  ) {
    return null;
  }
  const ions = Object.fromEntries(
    Object.entries(source.ions)
      .filter(([, raw]) => typeof raw === 'string' && Number.isFinite(Number(raw)) && Number(raw) >= 0),
  ) as RecipeWaterSource['ions'];
  const metadata = Object.fromEntries(
    Object.entries(source.metadata)
      .filter(([, raw]) => typeof raw === 'string' && Number.isFinite(Number(raw)) && Number(raw) >= 0),
  ) as RecipeWaterSource['metadata'];
  if (source.sourceLocalId !== undefined && typeof source.sourceLocalId !== 'string') return null;
  return {
    name: source.name,
    ions,
    metadata,
    volumeMl: source.volumeMl,
    ...(typeof source.sourceLocalId === 'string' ? { sourceLocalId: source.sourceLocalId } : {}),
  };
}

function parseRecipeWaterSources(value: unknown): RecipeWaterSources | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const sources = value as Record<string, unknown>;
  if (
    typeof sources.liters !== 'string'
    || (sources.volumeUnit !== 'liters' && sources.volumeUnit !== 'gallons')
    || !Array.isArray(sources.mineralWaters)
    || !Array.isArray(sources.additionWaters)
  ) {
    return undefined;
  }
  const mineralWaters = sources.mineralWaters.map(parseRecipeWaterSource);
  const additionWaters = sources.additionWaters.map(parseRecipeWaterSource);
  if (mineralWaters.some(source => !source) || additionWaters.some(source => !source)) return undefined;
  return {
    liters: sources.liters,
    volumeUnit: sources.volumeUnit,
    mineralWaters: mineralWaters as RecipeWaterSource[],
    additionWaters: additionWaters as RecipeWaterSource[],
  };
}

/** Parse a shared recipe file. Returns null when the file is not a valid recipe. */
export function parseRecipeFile(text: string): SaltRecipe | null {
  try {
    const o = JSON.parse(text);
    if (!o || typeof o !== 'object' || o.kind !== RECIPE_FILE_KIND || o.version !== 1) return null;
    const object = o as Record<string, unknown>;
    const candidate: SaltRecipe = {
      id: newRecipeId(),
      name: String(object.name ?? '').trim(),
      salts: object.salts as SaltRecipe['salts'],
      ...parseSplitSettings(object),
      ...(parseNumericRecord(object.finishedWaterIons)
        ? { finishedWaterIons: parseNumericRecord(object.finishedWaterIons) }
        : {}),
      ...(parseNumericRecord(object.finishedWaterMetadata)
        ? { finishedWaterMetadata: parseNumericRecord(object.finishedWaterMetadata) }
        : {}),
      ...(parseRecipeWaterSources(object.sourceWaters)
        ? { sourceWaters: parseRecipeWaterSources(object.sourceWaters) }
        : {}),
    };
    return isValidRecipe(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

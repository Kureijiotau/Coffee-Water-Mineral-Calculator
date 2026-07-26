import { SALTS, type SaltRecipe, type SaltRecipeEntry } from '@/waterData';

const STORAGE_KEY = 'cwc-saved-recipes';
export const RECIPE_FILE_KIND = 'coffee-water-recipe';

const SALT_IDS = new Set(SALTS.map(s => s.id));

export const newRecipeId = (): string =>
  `saved-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

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
    if (typeof e.target !== 'string' || typeof e.formIdx !== 'number') return false;
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
  recipe: { name: string; salts: Record<string, SaltRecipeEntry> } & Partial<SplitSettings>,
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

/** Parse a shared recipe file. Returns null when the file is not a valid recipe. */
export function parseRecipeFile(text: string): SaltRecipe | null {
  try {
    const o = JSON.parse(text);
    if (!o || typeof o !== 'object' || o.kind !== RECIPE_FILE_KIND) return null;
    const candidate: SaltRecipe = {
      id: newRecipeId(),
      name: String(o.name ?? '').trim(),
      salts: o.salts,
      ...parseSplitSettings(o as Record<string, unknown>),
    };
    return isValidRecipe(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

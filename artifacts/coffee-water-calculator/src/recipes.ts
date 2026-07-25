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

/** Serialize a recipe into a shareable JSON file body. */
export function serializeRecipeFile(recipe: { name: string; salts: Record<string, SaltRecipeEntry> }): string {
  return JSON.stringify(
    { kind: RECIPE_FILE_KIND, version: 1, name: recipe.name, salts: recipe.salts },
    null,
    2,
  );
}

/** Parse a shared recipe file. Returns null when the file is not a valid recipe. */
export function parseRecipeFile(text: string): SaltRecipe | null {
  try {
    const o = JSON.parse(text);
    if (!o || typeof o !== 'object' || o.kind !== RECIPE_FILE_KIND) return null;
    const candidate: SaltRecipe = { id: newRecipeId(), name: String(o.name ?? '').trim(), salts: o.salts };
    return isValidRecipe(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

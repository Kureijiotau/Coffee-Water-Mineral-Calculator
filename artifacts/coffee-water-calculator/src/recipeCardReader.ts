import { ACTIVE_ION_IDS, SALTS, type IonId, type SaltRecipe, type SaltRecipeEntry } from './waterData';
import { newRecipeId } from './recipes';

export type RecipeCardScanIonMap = Record<string, number>;

export type RecipeCardScanResult = {
  name?: unknown;
  waters?: unknown;
  salts?: unknown;
  finalIons?: unknown;
  confidence?: unknown;
  warnings?: unknown;
  error?: unknown;
};

export function recipeCardRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function recipeCardIonTargets(value: unknown): Partial<Record<IonId, number>> {
  const record = recipeCardRecord(value);
  if (!record) return {};
  const targets: Partial<Record<IonId, number>> = {};
  for (const id of ACTIVE_ION_IDS) {
    const raw = record[id];
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) targets[id] = raw;
  }
  return targets;
}

export function recipeCardSaltRecipe(scan: RecipeCardScanResult): SaltRecipe | null {
  if (typeof scan.name !== 'string' || !scan.name.trim() || !Array.isArray(scan.salts)) return null;
  const salts: Record<string, SaltRecipeEntry> = {};
  for (const rawSalt of scan.salts) {
    const entry = recipeCardRecord(rawSalt);
    if (!entry || typeof entry.saltId !== 'string') continue;
    const salt = SALTS.find(item => item.id === entry.saltId);
    const target = typeof entry.targetPpm === 'number' ? entry.targetPpm : Number(entry.targetPpm);
    if (!salt || !Number.isFinite(target) || target < 0) continue;
    const formLabel = typeof entry.formLabel === 'string' ? entry.formLabel.trim().toLowerCase() : '';
    const formIdx = formLabel
      ? salt.hydrationForms.findIndex(form => form.label.toLowerCase() === formLabel || form.label.toLowerCase().includes(formLabel) || formLabel.includes(form.label.toLowerCase()))
      : -1;
    salts[salt.id] = {
      target: String(target),
      formIdx: formIdx >= 0 ? formIdx : salt.defaultFormIdx ?? 0,
    };
  }
  return Object.keys(salts).length > 0
    ? { id: newRecipeId(), name: scan.name.trim(), salts }
    : null;
}

const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Could not read the recipe-card image.'));
    reader.onerror = () => reject(new Error('Could not read the recipe-card image.'));
    reader.readAsDataURL(file);
  });
}

export async function scanRecipeCardImage(file: File): Promise<RecipeCardScanResult> {
  const response = await fetch(`${API_BASE}/api/scan-recipe-card`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: await fileAsDataUrl(file),
      mimeType: file.type || 'image/png',
    }),
  });

  const body = await response.json().catch(() => ({})) as RecipeCardScanResult;
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : 'Recipe-card reading failed.');
  }
  return body;
}
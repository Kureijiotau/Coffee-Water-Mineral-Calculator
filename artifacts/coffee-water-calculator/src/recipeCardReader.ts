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
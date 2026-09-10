import { describe, expect, it } from 'vitest';
import {
  createWaterRecipeSharePayload,
  createWaterRecipeShareUrl,
  decodeWaterRecipeSharePayload,
  encodeWaterRecipeSharePayload,
} from './waterRecipeShare';

describe('water recipe share links', () => {
  const snapshot = {
    liters: '1',
    volumeUnit: 'liters' as const,
    rows: [
      { target: '12.5', formIdx: 1 },
      { target: '', formIdx: 0 },
    ],
    mineralWaters: [{
      id: 'water-a',
      name: 'Source A',
      ions: { calcium: '10', magnesium: '2' },
      metadata: { tds: '20' },
      volumeMl: '700',
      sourceLocalId: 'database:water-a',
    }],
    additionWaters: [{
      id: 'water-b',
      name: 'Source B',
      ions: { calcium: '4' },
      metadata: {},
      volumeMl: '300',
    }],
    finishedIons: { calcium: 8.2, magnesium: 1.4 },
  };

  it('round-trips the exact share payload', () => {
    const payload = createWaterRecipeSharePayload(snapshot, 'Shared water');
    const encoded = encodeWaterRecipeSharePayload(payload);

    expect(decodeWaterRecipeSharePayload(encoded)).toEqual(payload);
  });

  it('creates an HTTPS share URL with the encoded recipe', () => {
    const payload = createWaterRecipeSharePayload(snapshot, 'Shared water');
    const url = new URL(createWaterRecipeShareUrl(payload, 'https://coffee.example'));

    expect(url.origin).toBe('https://coffee.example');
    expect(url.searchParams.get('waterRecipe')).toBeTruthy();
    expect(decodeWaterRecipeSharePayload(url.searchParams.get('waterRecipe')!)).toEqual(payload);
  });

  it('rejects unsupported or malformed payloads', () => {
    const payload = createWaterRecipeSharePayload(snapshot, 'Shared water');
    const encoded = encodeWaterRecipeSharePayload(payload);
    const decodedJson = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=')), char => char.charCodeAt(0)),
    )) as Record<string, unknown>;
    decodedJson.version = 99;
    const modified = btoa(JSON.stringify(decodedJson))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    expect(decodeWaterRecipeSharePayload(modified)).toBeNull();
    expect(decodeWaterRecipeSharePayload('not-a-recipe')).toBeNull();
  });
});
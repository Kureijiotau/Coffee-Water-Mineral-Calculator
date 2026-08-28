import { describe, expect, it } from 'vitest';
import {
  embedWaterRecipeJsonInPng,
  extractWaterRecipeJsonFromPng,
} from './waterRecipeImage';

const ONE_PIXEL_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
  character => character.charCodeAt(0),
);

describe('Watermancer image recipe metadata', () => {
  it('round-trips JSON inside a valid PNG container', () => {
    const json = JSON.stringify({
      kind: 'water-recipe',
      version: 1,
      name: 'Bright cup',
      ions: { calcium: 4.2, magnesium: 8.1 },
    });
    const output = embedWaterRecipeJsonInPng(ONE_PIXEL_PNG, json);

    expect(Array.from(output.slice(0, 8))).toEqual(Array.from(ONE_PIXEL_PNG.slice(0, 8)));
    expect(extractWaterRecipeJsonFromPng(output)).toBe(json);
  });

  it('returns null for non-PNG input', () => {
    expect(extractWaterRecipeJsonFromPng(new TextEncoder().encode('{}'))).toBeNull();
  });
});
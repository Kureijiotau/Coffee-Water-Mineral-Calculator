import { describe, expect, it } from 'vitest';
import { embedWaterRecipeJsonInPng } from './waterRecipeImage';
import { serializeRecipeFile } from './recipes';
import { computeIonTotals } from './waterData';
import {
  parseWaterMixerImportText,
  readWaterMixerImportFile,
} from './waterMixerImport';
import { serializeWaterMixRecipeFile } from './waterMixer';

const ONE_PIXEL_PNG = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='),
  character => character.charCodeAt(0),
);

describe('Mixer recipe imports', () => {
  it('imports legacy finished-water readings as a source snapshot', () => {
    const result = parseWaterMixerImportText(JSON.stringify({
      kind: 'coffee-water-recipe',
      version: 1,
      name: 'Legacy finished water',
      ions: { calcium: 42, magnesium: 8, bicarbonate: 30 },
    }));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.source.name).toBe('Legacy finished water');
    expect(result.source.sourceKind).toBe('saved-recipe');
    expect(result.source.ions.calcium).toBe(42);
    expect(result.source.ions.sulfate).toBe(0);
  });

  it('imports final readings embedded in a new recipe-card payload', () => {
    const text = serializeRecipeFile({
      name: 'Current recipe card',
      salts: { mgcl2: { target: '12', formIdx: 0 } },
      finishedWaterIons: { calcium: 35, magnesium: 11, chloride: 28 },
      finishedWaterMetadata: { tds: 91 },
    });

    const result = parseWaterMixerImportText(text);

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.source.ions.magnesium).toBe(11);
    expect(result.source.metadata).toEqual({ tds: 91 });
  });

  it('reads recipe-card PNG metadata before parsing the payload', async () => {
    const text = serializeRecipeFile({
      name: 'Packaged card',
      salts: { nahco3: { target: '5', formIdx: 0 } },
      finishedWaterIons: { bicarbonate: 22 },
    });
    const packaged = embedWaterRecipeJsonInPng(ONE_PIXEL_PNG, text);
    const file = {
      name: 'packaged.WATER.png',
      type: 'image/png',
      arrayBuffer: async () => packaged.buffer,
    } as unknown as File;

    const result = await readWaterMixerImportFile(file);

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.source.name).toBe('Packaged card');
    expect(result.source.ions.bicarbonate).toBe(22);
  });

  it('reopens a Mixer recipe card as a finished-water snapshot', () => {
    const result = parseWaterMixerImportText(serializeWaterMixRecipeFile({
      name: 'Bright blend',
      sourceA: {
        name: 'Water A',
        sourceKind: 'saved-recipe',
        ions: { calcium: 30, magnesium: 5 },
      },
      sourceB: {
        name: 'Water B',
        sourceKind: 'manual',
        ions: { calcium: 10, bicarbonate: 40 },
      },
      volumeAMl: 300,
      volumeBMl: 200,
      finalIons: { calcium: 22, magnesium: 3, bicarbonate: 16 },
      finalMetadata: { tds: 44 },
    }));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.provenance).toBe('Mixer blend snapshot');
    expect(result.source.name).toBe('Bright blend');
    expect(result.source.ions).toMatchObject({ calcium: 22, magnesium: 3, bicarbonate: 16 });
    expect(result.source.metadata).toEqual({ tds: 44 });
  });

  it('imports legacy salt-only recipes over a zero-mineral RO baseline', () => {
    const result = parseWaterMixerImportText(serializeRecipeFile({
      name: 'Salt only',
      salts: { mgso4: { target: '10', formIdx: 0 } },
    }));

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.provenance).toBe('Legacy recipe · zero-mineral RO estimate');
    expect(result.source.name).toBe('Salt only');
    expect(result.source.ions).toEqual(computeIonTotals({ mgso4: 10 }, {}, 1));
    expect(result.source.metadata).toBeUndefined();
  });

  it('imports legacy recipe-card PNGs using the RO fallback', async () => {
    const text = serializeRecipeFile({
      name: 'Legacy packaged card',
      salts: {
        mgcl2: { target: '2.341478890905603', formIdx: 1 },
        nacl: { target: '12.000000000000004', formIdx: 0 },
      },
    });
    const packaged = embedWaterRecipeJsonInPng(ONE_PIXEL_PNG, text);
    const file = {
      name: 'legacy.WATER.png',
      type: 'image/png',
      arrayBuffer: async () => packaged.buffer,
    } as unknown as File;

    const result = await readWaterMixerImportFile(file);

    expect(result.kind).toBe('source');
    if (result.kind !== 'source') return;
    expect(result.provenance).toBe('Legacy recipe · zero-mineral RO estimate');
    expect(result.source.ions).toEqual(computeIonTotals({
      mgcl2: 2.341478890905603,
      nacl: 12.000000000000004,
    }, {}, 1));
  });

  it('rejects target profiles so they cannot become Mixer water sources', () => {
    const result = parseWaterMixerImportText(JSON.stringify({
      kind: 'coffee-water-recipe',
      version: 1,
      name: 'Target profile',
      ions: { calcium: 40 },
      profile: { name: 'Safe', source: 'Watermancer', targets: { calcium: 40 } },
    }));

    expect(result.kind).toBe('error');
  });

  it('rejects recipe-card PNGs without embedded readings', async () => {
    const file = {
      name: 'plain.png',
      type: 'image/png',
      arrayBuffer: async () => ONE_PIXEL_PNG.buffer,
    } as unknown as File;

    const result = await readWaterMixerImportFile(file);

    expect(result).toEqual({
      kind: 'error',
      message: 'That PNG does not contain embedded recipe readings for the Mixer.',
    });
  });
});
import { describe, expect, it } from 'vitest';
import {
  buildRecipeShareCardSvg,
  createRecipeShareCardModel,
  embedWaterRecipeJsonInPng,
  extractWaterRecipeJsonFromPng,
  rasterizeRecipeShareCard,
  wrapRecipeShareCardText,
} from './waterRecipeImage';
import { parseRecipeFile, serializeRecipeFile } from './recipes';

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

  it('keeps recipe-card payloads importable after PNG packaging', () => {
    const recipeText = serializeRecipeFile({
      name: 'Bright cup',
      salts: {
        mgso4: { target: '12.5', formIdx: 0 },
        nahco3: { target: '4', formIdx: 0 },
      },
    });
    const packaged = embedWaterRecipeJsonInPng(ONE_PIXEL_PNG, recipeText);
    const imported = parseRecipeFile(extractWaterRecipeJsonFromPng(packaged) ?? '');

    expect(imported?.name).toBe('Bright cup');
    expect(imported?.salts).toEqual({
      mgso4: { target: '12.5', formIdx: 0 },
      nahco3: { target: '4', formIdx: 0 },
    });
  });

  it('returns null for non-PNG input', () => {
    expect(extractWaterRecipeJsonFromPng(new TextEncoder().encode('{}'))).toBeNull();
  });
});

const shareCardFixture = {
  recipeName: 'A long mineral recipe name that should remain completely visible',
  batchLabel: '2 L batch · Weighed salts',
  waterSteps: [
    { label: 'RO / distilled water', name: 'Add purified water', amount: '1.25 L' },
    { label: 'Base water', name: 'A very long named mineral water source', amount: '750 mL' },
  ],
  saltTitle: '02 · Add the minerals in order',
  saltIntro: 'Add one salt at a time. Stir until fully dissolved before adding the next.',
  saltSteps: [
    {
      name: '1. Magnesium chloride with an intentionally long product label',
      formula: 'MgCl₂',
      form: 'Hexahydrate',
      amount: '125.00 mg',
      contributionPpm: 36.2,
    },
    {
      name: '2. Baking soda',
      formula: 'NaHCO₃',
      form: 'Anhydrous',
      amount: '0.82 g',
      contributionPpm: 22,
      note: 'Last · add only after the other salts are clear',
    },
  ],
  mixingNote: 'Reserve 500 mL of the prepared water for the salt concentrate, then rinse the vessel into the batch.',
  finalStep: 'Check that the water is clear and all minerals are fully dissolved before brewing.',
  tdsTarget: 120,
  analysis: {
    ions: [
      { id: 'calcium', name: 'Calcium', formula: 'Ca²⁺', value: 12.3, category: 'Cations' as const },
      { id: 'magnesium', name: 'Magnesium', formula: 'Mg²⁺', value: 8.1, category: 'Cations' as const },
      { id: 'bicarbonate', name: 'Bicarbonate', formula: 'HCO₃⁻', value: 18.2, category: 'Anions' as const },
    ],
    tds: 98.6,
    gh: 54.3,
    kh: 14.9,
  },
  profile: {
    id: 'aiki-default',
    name: 'Aiki safe profile',
    source: 'Built-in safe profile',
    details: 'Published conservative ceilings for coffee water.',
    targets: [
      { id: 'calcium', name: 'Calcium', formula: 'Ca²⁺', value: 40 },
      { id: 'magnesium', name: 'Magnesium', formula: 'Mg²⁺', value: 12 },
    ],
  },
};

describe('Watermancer recipe share card', () => {
  it('wraps long words without truncating them', () => {
    expect(wrapRecipeShareCardText('Magnesium chloride', 10)).toEqual(['Magnesium', 'chloride']);
    expect(wrapRecipeShareCardText('Supercalifragilistic', 6)).toEqual(['Superc', 'alifra', 'gilist', 'ic']);
  });

  it('normalizes the serializable view model and grows for content', () => {
    const model = createRecipeShareCardModel({
      ...shareCardFixture,
      recipeName: '  ',
      saltSteps: [{ ...shareCardFixture.saltSteps[0], contributionPpm: Number.NaN }],
    });
    expect(model.recipeName).toBe('Mineral recipe');
    expect(model.saltSteps[0]?.contributionPpm).toBe(0);
    expect(model.profile?.name).toBe('Aiki safe profile');
    expect(model.profile?.targets[0]?.value).toBe(40);
    const short = buildRecipeShareCardSvg({
      ...shareCardFixture,
      saltSteps: [],
      mixingNote: undefined,
    });
    const long = buildRecipeShareCardSvg(shareCardFixture);
    expect(long.width).toBe(1200);
    expect(long.height).toBeGreaterThan(short.height);
    expect(long.svg).toContain('Magnesium chloride');
    expect(long.svg).not.toContain('TARGET PROFILE');
    expect(long.svg).not.toContain('Aiki safe profile');
    expect(long.svg).not.toContain('Published conservative ceilings');
    expect(long.svg).toContain('MIXING VESSEL');
    expect(long.svg).not.toContain('…');
  });

  it('uses the browser-only rasterization contract explicitly', async () => {
    await expect(rasterizeRecipeShareCard('<svg />', 1200, 800)).rejects.toThrow(
      'can only be created in a browser',
    );
  });
});
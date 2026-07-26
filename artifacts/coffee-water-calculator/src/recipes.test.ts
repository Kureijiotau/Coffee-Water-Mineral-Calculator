import { describe, it, expect, beforeEach } from 'vitest';
import { SALTS } from './waterData';

// ─── localStorage mock ────────────────────────────────────────────────────────
// vitest runs in 'node' environment — localStorage doesn't exist. Provide a
// minimal in-memory shim so recipes.ts can be imported and exercised.

const store: Record<string, string> = {};

const localStorageMock = {
  getItem(key: string): string | null {
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
  },
  setItem(key: string, value: string): void {
    store[key] = value;
  },
  removeItem(key: string): void {
    delete store[key];
  },
  clear(): void {
    for (const k of Object.keys(store)) delete store[k];
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

import {
  serializeRecipeFile,
  parseRecipeFile,
  RECIPE_FILE_KIND,
} from './recipes';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Returns a valid salt ID and its first formIdx from the real SALTS list. */
function firstSalt(): { id: string; formIdx: number } {
  const salt = SALTS[0];
  return { id: salt.id, formIdx: 0 };
}

/** Builds minimal valid salts record using real salt metadata. */
function makeSalts(): Record<string, { target: string; formIdx: number }> {
  const { id, formIdx } = firstSalt();
  return { [id]: { target: '10', formIdx } };
}

// ─── serializeRecipeFile ──────────────────────────────────────────────────────

describe('serializeRecipeFile', () => {
  it('produces valid JSON with the correct kind and version', () => {
    const json = serializeRecipeFile({ name: 'My Recipe', salts: makeSalts() });
    const parsed = JSON.parse(json);
    expect(parsed.kind).toBe(RECIPE_FILE_KIND);
    expect(parsed.version).toBe(1);
  });

  it('includes name and salts in the output', () => {
    const salts = makeSalts();
    const json = serializeRecipeFile({ name: 'Espresso Blend', salts });
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('Espresso Blend');
    expect(parsed.salts).toEqual(salts);
  });

  it('omits split fields when splitMode is false/undefined', () => {
    const json = serializeRecipeFile({ name: 'Simple', salts: makeSalts() });
    const parsed = JSON.parse(json);
    expect(parsed.splitMode).toBeUndefined();
    expect(parsed.splitStrengths).toBeUndefined();
    expect(parsed.splitMls).toBeUndefined();
  });

  it('omits split fields when splitMode is explicitly false', () => {
    const json = serializeRecipeFile({
      name: 'Simple',
      salts: makeSalts(),
      splitMode: false,
      splitStrengths: { brew: 70, bypass: 30 },
      splitMls: { brew: '300', bypass: '200' },
    });
    const parsed = JSON.parse(json);
    expect(parsed.splitMode).toBeUndefined();
    expect(parsed.splitStrengths).toBeUndefined();
    expect(parsed.splitMls).toBeUndefined();
  });

  it('includes split fields when splitMode is true', () => {
    const splitStrengths = { brew: 70, bypass: 30 };
    const splitMls = { brew: '300', bypass: '200' };
    const json = serializeRecipeFile({
      name: 'Split Recipe',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths,
      splitMls,
    });
    const parsed = JSON.parse(json);
    expect(parsed.splitMode).toBe(true);
    expect(parsed.splitStrengths).toEqual(splitStrengths);
    expect(parsed.splitMls).toEqual(splitMls);
  });

  it('preserves all split strength entries faithfully', () => {
    const splitStrengths = { brew: 65.5, bypass: 34.5 };
    const json = serializeRecipeFile({
      name: 'Precision',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths,
      splitMls: {},
    });
    const parsed = JSON.parse(json);
    expect(parsed.splitStrengths.brew).toBeCloseTo(65.5);
    expect(parsed.splitStrengths.bypass).toBeCloseTo(34.5);
  });

  it('preserves all split volume entries faithfully', () => {
    const splitMls = { brew: '350', bypass: '150' };
    const json = serializeRecipeFile({
      name: 'Volume Check',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths: {},
      splitMls,
    });
    const parsed = JSON.parse(json);
    expect(parsed.splitMls).toEqual(splitMls);
  });
});

// ─── parseRecipeFile ──────────────────────────────────────────────────────────

describe('parseRecipeFile', () => {
  it('returns null for invalid JSON', () => {
    expect(parseRecipeFile('{NOT_VALID_JSON')).toBeNull();
  });

  it('returns null when kind is missing', () => {
    const payload = JSON.stringify({ version: 1, name: 'X', salts: makeSalts() });
    expect(parseRecipeFile(payload)).toBeNull();
  });

  it('returns null when kind is wrong', () => {
    const payload = JSON.stringify({ kind: 'other-kind', version: 1, name: 'X', salts: makeSalts() });
    expect(parseRecipeFile(payload)).toBeNull();
  });

  it('returns null for an otherwise correct file with invalid salts', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Bad',
      salts: { 'not-a-real-salt': { target: '5', formIdx: 0 } },
    });
    expect(parseRecipeFile(payload)).toBeNull();
  });

  it('returns null when name is empty', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: '   ',
      salts: makeSalts(),
    });
    expect(parseRecipeFile(payload)).toBeNull();
  });

  it('parses a minimal valid recipe without split fields', () => {
    const salts = makeSalts();
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Plain Recipe',
      salts,
    });
    const result = parseRecipeFile(payload);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Plain Recipe');
    expect(result!.salts).toEqual(salts);
  });

  it('assigns a fresh id on parse (not the file id)', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Fresh',
      salts: makeSalts(),
    });
    const a = parseRecipeFile(payload);
    const b = parseRecipeFile(payload);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.id).not.toBe(b!.id);
  });
});

// ─── round-trip: split settings survive serialize → parse ─────────────────────

describe('serializeRecipeFile / parseRecipeFile round-trip with splitMode on', () => {
  beforeEach(() => localStorageMock.clear());

  it('round-trips splitMode=true through the file format', () => {
    const json = serializeRecipeFile({
      name: 'Split',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths: { brew: 70, bypass: 30 },
      splitMls: { brew: '300', bypass: '200' },
    });
    const result = parseRecipeFile(json);
    expect(result).not.toBeNull();
    expect(result!.splitMode).toBe(true);
  });

  it('round-trips splitStrengths values faithfully', () => {
    const splitStrengths = { brew: 65, bypass: 35 };
    const json = serializeRecipeFile({
      name: 'Split',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths,
      splitMls: { brew: '300', bypass: '200' },
    });
    const result = parseRecipeFile(json);
    expect(result!.splitStrengths).toEqual(splitStrengths);
  });

  it('round-trips splitMls values faithfully', () => {
    const splitMls = { brew: '350', bypass: '150' };
    const json = serializeRecipeFile({
      name: 'Split',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths: { brew: 70, bypass: 30 },
      splitMls,
    });
    const result = parseRecipeFile(json);
    expect(result!.splitMls).toEqual(splitMls);
  });

  it('round-trips name and salts alongside split settings', () => {
    const salts = makeSalts();
    const json = serializeRecipeFile({
      name: 'Full Recipe',
      salts,
      splitMode: true,
      splitStrengths: { brew: 80, bypass: 20 },
      splitMls: { brew: '400', bypass: '100' },
    });
    const result = parseRecipeFile(json);
    expect(result!.name).toBe('Full Recipe');
    expect(result!.salts).toEqual(salts);
  });

  it('preserves multiple split keys in strengths and volumes', () => {
    const splitStrengths = { brew: 60, bypass: 25, third: 15 };
    const splitMls = { brew: '300', bypass: '125', third: '75' };
    const json = serializeRecipeFile({
      name: 'Multi Split',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths,
      splitMls,
    });
    const result = parseRecipeFile(json);
    expect(result!.splitStrengths).toEqual(splitStrengths);
    expect(result!.splitMls).toEqual(splitMls);
  });
});

// ─── backward-compatibility: missing split fields default to off ───────────────

describe('backward-compatibility: missing split fields default to off', () => {
  it('returns splitMode=undefined when splitMode is absent from file', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Old Recipe',
      salts: makeSalts(),
    });
    const result = parseRecipeFile(payload);
    expect(result).not.toBeNull();
    expect(result!.splitMode).toBeUndefined();
  });

  it('returns splitStrengths=undefined when split fields are absent', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Old Recipe',
      salts: makeSalts(),
    });
    const result = parseRecipeFile(payload);
    expect(result!.splitStrengths).toBeUndefined();
  });

  it('returns splitMls=undefined when split fields are absent', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Old Recipe',
      salts: makeSalts(),
    });
    const result = parseRecipeFile(payload);
    expect(result!.splitMls).toBeUndefined();
  });

  it('ignores split fields when splitMode is false in the file', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Disabled Split',
      salts: makeSalts(),
      splitMode: false,
      splitStrengths: { brew: 70, bypass: 30 },
      splitMls: { brew: '300', bypass: '200' },
    });
    const result = parseRecipeFile(payload);
    expect(result).not.toBeNull();
    expect(result!.splitMode).toBeUndefined();
    expect(result!.splitStrengths).toBeUndefined();
    expect(result!.splitMls).toBeUndefined();
  });

  it('ignores split fields when splitMode is null in the file', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Null Split',
      salts: makeSalts(),
      splitMode: null,
      splitStrengths: { brew: 70 },
    });
    const result = parseRecipeFile(payload);
    expect(result).not.toBeNull();
    expect(result!.splitMode).toBeUndefined();
  });
});

// ─── parseSplitSettings robustness (exercised via parseRecipeFile) ────────────

describe('parseSplitSettings: coerces malformed split data gracefully', () => {
  it('drops non-numeric splitStrength entries', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Bad Strengths',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths: { brew: 'not-a-number', bypass: 30 },
      splitMls: { brew: '300', bypass: '200' },
    });
    const result = parseRecipeFile(payload);
    expect(result).not.toBeNull();
    // 'brew' has a non-numeric value and should be dropped
    expect(result!.splitStrengths!['brew']).toBeUndefined();
    // 'bypass' is valid and should survive
    expect(result!.splitStrengths!['bypass']).toBe(30);
  });

  it('drops zero and negative splitStrength entries', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Zero Strength',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths: { brew: 0, bypass: -5, valid: 50 },
      splitMls: {},
    });
    const result = parseRecipeFile(payload);
    expect(result!.splitStrengths!['brew']).toBeUndefined();
    expect(result!.splitStrengths!['bypass']).toBeUndefined();
    expect(result!.splitStrengths!['valid']).toBe(50);
  });

  it('drops non-string splitMls entries', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Bad Mls',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths: { brew: 70, bypass: 30 },
      splitMls: { brew: 300, bypass: '200' }, // brew is a number, not string
    });
    const result = parseRecipeFile(payload);
    expect(result).not.toBeNull();
    expect(result!.splitMls!['brew']).toBeUndefined();
    expect(result!.splitMls!['bypass']).toBe('200');
  });

  it('handles missing splitStrengths object gracefully (returns empty object)', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'No Strengths',
      salts: makeSalts(),
      splitMode: true,
      splitMls: { brew: '300' },
    });
    const result = parseRecipeFile(payload);
    expect(result).not.toBeNull();
    expect(result!.splitMode).toBe(true);
    expect(result!.splitStrengths).toEqual({});
  });

  it('handles missing splitMls object gracefully (returns empty object)', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'No Mls',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths: { brew: 70 },
    });
    const result = parseRecipeFile(payload);
    expect(result).not.toBeNull();
    expect(result!.splitMode).toBe(true);
    expect(result!.splitMls).toEqual({});
  });

  it('handles splitStrengths as an array (treats as absent, returns empty object)', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Array Strengths',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths: [70, 30],
      splitMls: {},
    });
    const result = parseRecipeFile(payload);
    expect(result).not.toBeNull();
    expect(result!.splitStrengths).toEqual({});
  });

  it('handles splitMls as an array (treats as absent, returns empty object)', () => {
    const payload = JSON.stringify({
      kind: RECIPE_FILE_KIND,
      version: 1,
      name: 'Array Mls',
      salts: makeSalts(),
      splitMode: true,
      splitStrengths: { brew: 70 },
      splitMls: ['300', '200'],
    });
    const result = parseRecipeFile(payload);
    expect(result).not.toBeNull();
    expect(result!.splitMls).toEqual({});
  });
});

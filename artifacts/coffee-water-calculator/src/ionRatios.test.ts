import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ION_RATIO_DRAFT,
  anchorIonRatioDraftToGh,
  cloneIonRatioDraft,
  createIonRatioDraftFromTargets,
  extractDirectIonTargets,
  evaluateIonRatio,
  evaluateIonRatioDraft,
  isValidIonRatioDraft,
  mergeDirectIonTargets,
  normalizeIonRatioDraft,
  swapIonRatioDraftRow,
  solveGhAnchoredMagnesiumCalcium,
  updateGhKhByRelationship,
  updateMgCaByGhRelationship,
  updateMgCaValueForGh,
  updateIonRatioDraftValue,
  updateIonRatioByRelationship,
} from './ionRatios';

describe('ion ratio model', () => {
  it('seeds ratio values and derived GH/KH from profile targets', () => {
    expect(createIonRatioDraftFromTargets({
      magnesium: 10,
      calcium: 4,
      chloride: 18,
      sulfate: 6,
      sodium: 2,
      potassium: 1,
      bicarbonate: 10,
      carbonate: 1,
    })).toEqual({
      'gh-kh': {
        first: String(10 * 4.118 + 4 * 2.497),
        second: String(10 * 0.82 + 1 * 1.667),
      },
      'mg-ca': { first: '10', second: '4' },
      'cl-sulfate': { first: '18', second: '6' },
      'na-k': { first: '2', second: '1' },
    });
  });

  it('seeds missing profile ions as zero', () => {
    expect(createIonRatioDraftFromTargets({ magnesium: 3 })).toMatchObject({
      'gh-kh': { first: String(3 * 4.118), second: '0' },
      'mg-ca': { first: '3', second: '0' },
      'cl-sulfate': { first: '0', second: '0' },
      'na-k': { first: '0', second: '0' },
    });
  });

  it('clones a profile seed as an independent reset baseline', () => {
    const profileSeed = createIonRatioDraftFromTargets({
      magnesium: 4,
      calcium: 4,
    });
    const resetBaseline = cloneIonRatioDraft(profileSeed);

    resetBaseline['mg-ca'].first = '8';

    expect(profileSeed['mg-ca']).toEqual({ first: '4', second: '4' });
  });

  it('keeps the accepted row order and defaults', () => {
    const rows = evaluateIonRatioDraft(DEFAULT_ION_RATIO_DRAFT);

    expect(rows.map(row => row.id)).toEqual(['gh-kh', 'mg-ca', 'cl-sulfate', 'na-k']);
    expect(rows.map(row => row.ratioValue)).toEqual([
      34 / 9,
      1.6,
      16.3 / 4.2,
      7.8,
    ]);
    expect(rows[0].diagnosticOnly).toBe(true);
  });

  it('solves Mg and Ca against a fixed GH budget', () => {
    const solved = solveGhAnchoredMagnesiumCalcium(34, 1.6);

    expect(solved?.magnesium).toBeCloseTo(5.9878, 3);
    expect(solved?.calcium).toBeCloseTo(3.7424, 3);
    expect((solved?.magnesium ?? 0) * 4.118 + (solved?.calcium ?? 0) * 2.497).toBeCloseTo(34, 8);
  });

  it('preserves the GH anchor when the Mg/Ca relationship changes', () => {
    const updated = updateMgCaByGhRelationship(
      DEFAULT_ION_RATIO_DRAFT['gh-kh'],
      DEFAULT_ION_RATIO_DRAFT['mg-ca'],
      '2',
    );
    const magnesium = Number(updated?.first);
    const calcium = Number(updated?.second);

    expect(magnesium / calcium).toBeCloseTo(2, 8);
    expect(magnesium * 4.118 + calcium * 2.497).toBeCloseTo(34, 8);
  });

  it('preserves the GH anchor when either Mg or Ca is edited', () => {
    const updated = updateMgCaValueForGh(
      DEFAULT_ION_RATIO_DRAFT['gh-kh'],
      DEFAULT_ION_RATIO_DRAFT['mg-ca'],
      'first',
      '8',
    );
    const magnesium = Number(updated?.first);
    const calcium = Number(updated?.second);

    expect(magnesium).toBe(8);
    expect(magnesium * 4.118 + calcium * 2.497).toBeCloseTo(34, 8);
  });

  it('uses GH as the anchor when the GH field changes', () => {
    const updated = updateIonRatioDraftValue(DEFAULT_ION_RATIO_DRAFT, 'gh-kh', 'first', '40');
    const magnesium = Number(updated['mg-ca'].first);
    const calcium = Number(updated['mg-ca'].second);

    expect(updated['gh-kh'].first).toBe('40');
    expect(magnesium / calcium).toBeCloseTo(1.6, 8);
    expect(magnesium * 4.118 + calcium * 2.497).toBeCloseTo(40, 8);
  });

  it('keeps the GH anchor when GH:KH is swapped', () => {
    const updated = updateGhKhByRelationship(
      { first: '9', second: '34', swapped: true },
      '0.25',
    );

    expect(updated).toEqual({ first: '8.5', second: '34', swapped: true });
  });

  it('calculates a relationship from two editable ion values', () => {
    const row = evaluateIonRatio(
      {
        id: 'mg-ca',
        label: 'Magnesium / calcium',
        firstLabel: 'Mg',
        secondLabel: 'Ca',
        firstIonId: 'magnesium',
        secondIonId: 'calcium',
        unit: 'mg/L',
        diagnosticOnly: false,
      },
      { first: '3.2', second: '2' },
    );

    expect(row.ratioValue).toBe(1.6);
    expect(row.error).toBeNull();
  });

  it('recalculates the second value when the relationship changes', () => {
    expect(updateIonRatioByRelationship(
      { first: '3.2', second: '2' },
      '2',
    )).toEqual({ first: '3.2', second: '1.6' });
    expect(updateIonRatioByRelationship(
      { first: '16.3', second: '4.2' },
      '3',
    )).toEqual({ first: '16.3', second: String(16.3 / 3) });
  });

  it('preserves swapped orientation when the relationship changes', () => {
    const updated = updateIonRatioByRelationship(
      { first: '2', second: '3.2', swapped: true },
      '0.5',
    );

    expect(updated).toEqual({
      first: '2',
      second: '4',
      swapped: true,
    });
    expect(evaluateIonRatioDraft({
      ...DEFAULT_ION_RATIO_DRAFT,
      'mg-ca': updated!,
    }).find(row => row.id === 'mg-ca')).toMatchObject({
      firstLabel: 'Ca',
      secondLabel: 'Mg',
      firstIonId: 'calcium',
      secondIonId: 'magnesium',
    });
  });

  it('swaps row orientation, values, and ion mapping', () => {
    const swapped = swapIonRatioDraftRow({
      first: '3.2',
      second: '2',
    });
    const row = evaluateIonRatioDraft({
      ...DEFAULT_ION_RATIO_DRAFT,
      'mg-ca': swapped,
    }).find(item => item.id === 'mg-ca');

    expect(swapped).toEqual({ first: '2', second: '3.2', swapped: true });
    expect(row?.firstLabel).toBe('Ca');
    expect(row?.secondLabel).toBe('Mg');
    expect(row?.firstIonId).toBe('calcium');
    expect(row?.secondIonId).toBe('magnesium');
    expect(row?.ratioValue).toBe(2 / 3.2);
  });

  it('imports swapped rows into the same underlying ion IDs', () => {
    expect(extractDirectIonTargets({
      ...DEFAULT_ION_RATIO_DRAFT,
      'mg-ca': { first: '2', second: '3.2', swapped: true },
    })).toMatchObject({
      magnesium: 3.2,
      calcium: 2,
    });
  });

  it('rejects invalid relationship edits without changing ion values', () => {
    expect(updateIonRatioByRelationship(
      { first: '3.2', second: '2' },
      '',
    )).toBeNull();
    expect(updateIonRatioByRelationship(
      { first: '3.2', second: '2' },
      '0',
    )).toBeNull();
  });

  it('rejects malformed, negative, and zero second values', () => {
    expect(isValidIonRatioDraft({
      ...DEFAULT_ION_RATIO_DRAFT,
      'mg-ca': { first: '', second: '2' },
    })).toBe(false);
    expect(isValidIonRatioDraft({
      ...DEFAULT_ION_RATIO_DRAFT,
      'mg-ca': { first: '-2', second: '2' },
    })).toBe(false);
    expect(isValidIonRatioDraft({
      ...DEFAULT_ION_RATIO_DRAFT,
      'mg-ca': { first: '0', second: '0' },
    })).toBe(false);
  });

  it('imports only the six direct ion values', () => {
    expect(extractDirectIonTargets(DEFAULT_ION_RATIO_DRAFT)).toEqual({
      magnesium: Number(DEFAULT_ION_RATIO_DRAFT['mg-ca'].first),
      calcium: Number(DEFAULT_ION_RATIO_DRAFT['mg-ca'].second),
      chloride: 16.3,
      sulfate: 4.2,
      sodium: 7.8,
      potassium: 1,
      bicarbonate: 9 / 0.82,
    });
  });

  it('imports KH as bicarbonate while preserving swapped orientation', () => {
    const targets = extractDirectIonTargets({
      ...DEFAULT_ION_RATIO_DRAFT,
      'gh-kh': { first: '9', second: '34', swapped: true },
    });

    expect(targets.bicarbonate).toBeCloseTo(9 / 0.82, 8);
  });

  it('anchors a persisted draft to its existing GH and Mg/Ca relationship', () => {
    const anchored = anchorIonRatioDraftToGh({
      ...DEFAULT_ION_RATIO_DRAFT,
      'mg-ca': { first: '3.2', second: '2' },
    });
    const magnesium = Number(anchored['mg-ca'].first);
    const calcium = Number(anchored['mg-ca'].second);

    expect(magnesium / calcium).toBeCloseTo(1.6, 8);
    expect(magnesium * 4.118 + calcium * 2.497).toBeCloseTo(34, 8);
  });

  it('preserves unrelated targets when merging imported values', () => {
    expect(mergeDirectIonTargets(
      { bicarbonate: 104, citrates: 0, calcium: 52 },
      { calcium: 2, magnesium: 3.2 },
    )).toEqual({
      bicarbonate: 104,
      citrates: 0,
      calcium: 2,
      magnesium: 3.2,
    });
  });

  it('normalizes invalid persisted drafts back to safe defaults', () => {
    expect(normalizeIonRatioDraft({
      ...DEFAULT_ION_RATIO_DRAFT,
      'na-k': { first: 'not-a-number', second: '1' },
    })).toEqual(DEFAULT_ION_RATIO_DRAFT);
    expect(normalizeIonRatioDraft(null)).toEqual(DEFAULT_ION_RATIO_DRAFT);
  });

  it('migrates the previous anchor/ratio draft shape', () => {
    expect(normalizeIonRatioDraft({
      ...DEFAULT_ION_RATIO_DRAFT,
      'mg-ca': { anchor: '2', ratio: '1.6' },
    })['mg-ca']).toEqual({ first: '3.2', second: '2' });
  });
});
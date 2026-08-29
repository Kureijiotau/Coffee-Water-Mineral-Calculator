import { describe, it, expect } from 'vitest';
import {
  computeSaltMg,
  computeSaltTargetPpm,
  computeIonTotals,
  computeSaltIonPpmTotal,
  computeNaClTargetForSodiumGap,
  findIonOvershoots,
  findIonUnderdoses,
  computeGH,
  computeKH,
  SALTS,
  IONS,
  ACTIVE_ION_IDS,
  computeSupplementalIonTotals,
  checkConcentrate,
  findWholeDropDosingStrengthCeiling,
  findStrongestSafeConcentrateStrength,
  findConcentrateLimitingConstraint,
  computeIonMmolPerL,
  computeIonMeqPerL,
  ION_CHEMISTRY,
  RECIPES,
  MAGNESIUM_GLYCINATE_LABEL,
} from './waterData';

describe('published Kimoi recipe conversions', () => {
  it('matches Kimoi Water GH, KH, and NaCl source values', () => {
    const recipe = RECIPES.find(item => item.id === 'kimoi')!;
    expect(recipe.salts.mgcl2.sourceTarget).toBe('10');
    expect(recipe.salts.mgso4.sourceTarget).toBe('5');
    expect(recipe.salts.cacl2.sourceTarget).toBe('10');
    expect(recipe.salts.nahco3.sourceTarget).toBe('10');
    expect(recipe.salts.nacl.sourceTarget).toBe('10');
    const targets = Object.fromEntries(
      Object.entries(recipe.salts).map(([saltId, entry]) => [saltId, Number(entry.target)]),
    );
    const ions = computeIonTotals(targets, {}, 1);

    expect(computeGH(ions)).toBeCloseTo(25, 1);
    expect(computeKH(ions)).toBeCloseTo(10, 1);
    expect(ions.sodium).toBeCloseTo(10 * (22.99 / 58.44) + 16.8 * (22.99 / 84.007), 3);
  });

  it('matches Terebat Water GH, KH, and NaCl source values', () => {
    const recipe = RECIPES.find(item => item.id === 'terebat')!;
    const targets = Object.fromEntries(
      Object.entries(recipe.salts).map(([saltId, entry]) => [saltId, Number(entry.target)]),
    );
    const ions = computeIonTotals(targets, {}, 1);

    expect(computeGH(ions)).toBeCloseTo(20, 1);
    expect(computeKH(ions)).toBeCloseTo(6, 1);
    expect(ions.sodium).toBeCloseTo(20 * (22.99 / 58.44) + 10.1 * (22.99 / 84.007), 3);
  });
});

// ─── computeSaltMg ────────────────────────────────────────────────────────────

describe('computeSaltMg', () => {
  it('returns correct mg for a normal input (MgSO4 anhydrous, 1 L, target 10 ppm)', () => {
    // anhydrous: hydrationMass === anhydrousMass → factor 1
    const result = computeSaltMg(10, 1, 120.365, 120.365);
    expect(result).toBeCloseTo(10, 5);
  });

  it('scales linearly with liters', () => {
    const one = computeSaltMg(10, 1, 120.365, 120.365);
    const two = computeSaltMg(10, 2, 120.365, 120.365);
    expect(two).toBeCloseTo(one * 2, 5);
  });

  it('applies hydration correction factor for Epsom salt (heptahydrate)', () => {
    // Epsom: anhydrousMass=120.365, heptahydrateMass=246.474
    // 10 ppm × 1 L × (246.474 / 120.365) ≈ 20.476 mg
    const result = computeSaltMg(10, 1, 246.474, 120.365);
    expect(result).toBeCloseTo(20.476, 2);
  });

  it('returns 0 when target ppm is 0', () => {
    expect(computeSaltMg(0, 1, 120.365, 120.365)).toBe(0);
  });

  it('returns 0 when liters is 0', () => {
    expect(computeSaltMg(10, 0, 120.365, 120.365)).toBe(0);
  });

  it('handles very large inputs without crashing', () => {
    const result = computeSaltMg(1e6, 1e4, 246.474, 120.365);
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThan(0);
  });
});

describe('computeSaltTargetPpm', () => {
  it('converts a direct hydrated-salt dose back to the target ppm', () => {
    const doseMg = computeSaltMg(10, 1, 246.474, 120.365);
    expect(computeSaltTargetPpm(doseMg, 1, 246.474, 120.365)).toBeCloseTo(10, 5);
  });

  it('returns zero when the batch volume is not usable', () => {
    expect(computeSaltTargetPpm(20, 0, 120.365, 120.365)).toBe(0);
    expect(computeSaltTargetPpm(20, 1, 0, 120.365)).toBe(0);
  });
});

describe('derived ion chemistry', () => {
  it('converts modeled mg/L to mmol/L and meq/L using shared exact metadata', () => {
    expect(computeIonMmolPerL('calcium', 13.631231)).toBeCloseTo(13.631231 / ION_CHEMISTRY.calcium.molarMass, 8);
    expect(computeIonMeqPerL('calcium', 13.631231)).toBeCloseTo(
      (13.631231 / ION_CHEMISTRY.calcium.molarMass) * 2,
      8,
    );
    expect(computeIonMeqPerL('bicarbonate', 18.158308)).toBeCloseTo(
      18.158308 / ION_CHEMISTRY.bicarbonate.molarMass,
      8,
    );
  });

  it('returns zero for invalid or non-positive concentrations', () => {
    expect(computeIonMmolPerL('magnesium', 0)).toBe(0);
    expect(computeIonMmolPerL('magnesium', Number.NaN)).toBe(0);
    expect(computeIonMeqPerL('sulfate', -1)).toBe(0);
  });
});

describe('shared sensory ion palette', () => {
  it('gives every modeled ion a stable formula and distinct visual identity', () => {
    const formulas = IONS.map(ion => ion.formula);
    const foregroundColors = IONS.map(ion => ion.color.foreground);
    const barColors = IONS.map(ion => ion.color.bar);

    expect(new Set(formulas).size).toBe(IONS.length);
    expect(new Set(foregroundColors).size).toBe(IONS.length);
    expect(new Set(barColors).size).toBe(IONS.length);
    expect(IONS.every(ion => ion.color.foreground.startsWith('#'))).toBe(true);
    expect(IONS.every(ion => ion.color.lightForeground.startsWith('#'))).toBe(true);
  });
});

describe('findStrongestSafeConcentrateStrength', () => {
  it('calculates a dosing ceiling from a minimum whole-drop batch dose', () => {
    expect(findWholeDropDosingStrengthCeiling({
      minimumFinalLiters: 0.1,
      dropsPerMl: 2,
      minimumDrops: 1,
    })).toBe(200);
    expect(findStrongestSafeConcentrateStrength(
      { nacl: 1 },
      5000,
      {},
      { minimumFinalLiters: 0.1, dropsPerMl: 2, minimumDrops: 1 },
    )).toBe(200);
  });

  it('does not lower the documented ×500 ceiling for normal 100 mL drop dosing', () => {
    expect(findStrongestSafeConcentrateStrength(
      { nacl: 1 },
      500,
      {},
      { minimumFinalLiters: 0.1, dropsPerMl: 20, minimumDrops: 1 },
    )).toBe(500);
  });

  it('explains when whole-drop dosing is the limiting constraint', () => {
    const limit = findConcentrateLimitingConstraint(
      { nacl: 1 },
      {},
      5000,
      { minimumFinalLiters: 0.1, dropsPerMl: 2, minimumDrops: 1 },
    );
    expect(limit.kind).toBe('dosing');
    expect(limit.maxSafeStrength).toBe(200);
  });

  it('returns the practical ceiling when the recipe has no modeled chemical limit', () => {
    expect(findStrongestSafeConcentrateStrength({ nacl: 1 })).toBe(500);
    expect(checkConcentrate(500, { nacl: 1 }).every(warning => warning.severity === 'info')).toBe(true);
  });

  it('uses only hard chemical errors for the ceiling', () => {
    const targets = { nahco3: 100, mgso4: 100 };
    expect(findStrongestSafeConcentrateStrength(targets)).toBe(500);
    const limit = findConcentrateLimitingConstraint(targets);
    expect(limit.kind).toBe('model-bound');
    expect(checkConcentrate(500, targets).some(warning => warning.severity === 'warning')).toBe(true);
  });

  it('can apply a selected hydration form to solubility checks', () => {
    const citrate = SALTS.find(salt => salt.id === 'cacit')!;
    const hydratedForm = citrate.hydrationForms.findIndex(form => form.molarMass > citrate.anhydrousMass);
    expect(hydratedForm).toBeGreaterThanOrEqual(0);
    const anhydrousLimit = findStrongestSafeConcentrateStrength({ cacit: 100 }, 500, { cacit: 0 });
    const hydratedLimit = findStrongestSafeConcentrateStrength({ cacit: 100 }, 500, { cacit: hydratedForm });
    expect(hydratedLimit).toBeLessThanOrEqual(anhydrousLimit);
  });

  it('caps a recipe at the first safe integer below a solubility limit', () => {
    expect(findStrongestSafeConcentrateStrength({ cacit: 100 })).toBe(8);
    expect(checkConcentrate(8, { cacit: 100 }).some(warning => warning.severity !== 'info')).toBe(false);
    expect(checkConcentrate(9, { cacit: 100 }).some(warning => warning.severity !== 'info')).toBe(true);
  });

  it('returns a deterministic 1× fallback for an empty recipe', () => {
    expect(findStrongestSafeConcentrateStrength({})).toBe(1);
    expect(findStrongestSafeConcentrateStrength({ nahco3: 0, mgcl2: Number.NaN })).toBe(1);
  });
});

// ─── computeIonTotals ─────────────────────────────────────────────────────────

describe('computeIonTotals', () => {
  it('returns all-zero totals when no salts and no base water', () => {
    const saltTargets: Record<string, number> = {};
    const baseIons = {};
    const totals = computeIonTotals(saltTargets, baseIons, 0);
    for (const ion of IONS) {
      expect(totals[ion.id]).toBe(0);
    }
  });

  it('adds salt contributions correctly for MgSO4 at 10 ppm', () => {
    const mgso4 = SALTS.find(s => s.id === 'mgso4')!;
    const saltTargets = { mgso4: 10 };
    const totals = computeIonTotals(saltTargets, {}, 0);

    const expectedMg = 10 * (24.305 / 120.365);
    const expectedSulfate = 10 * (96.06 / 120.365);
    expect(totals.magnesium).toBeCloseTo(expectedMg, 5);
    expect(totals.sulfate).toBeCloseTo(expectedSulfate, 5);
  });

  it('adds potassium chloride contributions to potassium and chloride', () => {
    const kcl = SALTS.find(s => s.id === 'kcl')!;
    const totals = computeIonTotals({ kcl: 10 }, {}, 0);

    expect(totals.potassium).toBeCloseTo(10 * (39.098 / 74.551), 5);
    expect(totals.chloride).toBeCloseTo(10 * (35.450 / 74.551), 5);
    expect(kcl.formula).toBe('KCl');
    expect(kcl.hydrationForms).toHaveLength(1);
  });

  it('adds base water ions scaled by dilution factor', () => {
    const totals = computeIonTotals({}, { magnesium: 20 }, 0.5);
    expect(totals.magnesium).toBeCloseTo(10, 5);
  });

  it('combines salt and diluted base water contributions', () => {
    const saltTargets = { nahco3: 5 }; // adds sodium + bicarbonate
    const baseIons = { magnesium: 10 };
    const totals = computeIonTotals(saltTargets, baseIons, 0.5);

    const nahco3 = SALTS.find(s => s.id === 'nahco3')!;
    const expectedNa = 5 * (22.990 / 84.007);
    const expectedHco3 = 5 * (61.017 / 84.007);
    expect(totals.sodium).toBeCloseTo(expectedNa, 5);
    expect(totals.bicarbonate).toBeCloseTo(expectedHco3, 5);
    expect(totals.magnesium).toBeCloseTo(5, 5); // 10 × 0.5
  });

  it('returns 0 for all ions when saltTargets values are 0 and dilution is 0', () => {
    const saltTargets = Object.fromEntries(SALTS.map(s => [s.id, 0]));
    const totals = computeIonTotals(saltTargets, {}, 0);
    for (const ion of IONS) {
      expect(totals[ion.id]).toBe(0);
    }
  });

  it('handles dilution factor of 1 (pure mineral water, no TDS top-up)', () => {
    const totals = computeIonTotals({}, { calcium: 30 }, 1);
    expect(totals.calcium).toBeCloseTo(30, 5);
  });

  it('clamps dilution contributions when dilution is 0 (no bottled water)', () => {
    const totals = computeIonTotals({}, { calcium: 99 }, 0);
    expect(totals.calcium).toBe(0);
  });

  it('models Calcium Lactate calcium without adding lactate to core ion totals', () => {
    const calciumLactate = SALTS.find(s => s.id === 'calact')!;
    const totals = computeIonTotals({ calact: 10 }, {}, 0);

    expect(SALTS[SALTS.findIndex(s => s.id === 'cacl2') + 1].id).toBe('calact');
    expect(calciumLactate.defaultFormIdx).toBe(1);
    expect(calciumLactate.hydrationForms[1].label).toBe('Pentahydrate');
    expect(totals.calcium).toBeCloseTo(10 * (40.078 / 218.22), 5);
    expect(Object.prototype.hasOwnProperty.call(totals, 'lactate')).toBe(false);
    expect(ACTIVE_ION_IDS.includes('lactate' as never)).toBe(false);
  });

  it('calculates Calcium Lactate lactate as a supplemental display-only ion', () => {
    const totals = computeSupplementalIonTotals({ calact: 10 });

    expect(totals.lactate).toBeCloseTo(10 * ((2 * 89.07) / 218.22), 5);
    expect(computeSupplementalIonTotals({ calact: 0 }).lactate).toBe(0);
  });

  it('calibrates Magnesium Glycinate to the uploaded 1.8 g / 210 mg label', () => {
    const magnesiumGlycinate = SALTS.find(s => s.id === 'mggly')!;
    const saltTarget = MAGNESIUM_GLYCINATE_LABEL.servingMassMg;
    const coreTotals = computeIonTotals({ mggly: saltTarget }, {}, 0);
    const supplementalTotals = computeSupplementalIonTotals({ mggly: saltTarget });

    expect(magnesiumGlycinate.hydrationForms).toHaveLength(1);
    expect(coreTotals.magnesium).toBeCloseTo(MAGNESIUM_GLYCINATE_LABEL.elementalMagnesiumMg, 8);
    expect(coreTotals.chloride).toBe(0);
    expect(coreTotals.sulfate).toBe(0);
    expect(coreTotals.bicarbonate).toBe(0);
    expect(supplementalTotals.glycinate).toBeCloseTo(MAGNESIUM_GLYCINATE_LABEL.glycinateCarrierMg, 8);
    expect(
      MAGNESIUM_GLYCINATE_LABEL.elementalMagnesiumMg
      + MAGNESIUM_GLYCINATE_LABEL.glycinateCarrierMg,
    ).toBe(MAGNESIUM_GLYCINATE_LABEL.servingMassMg);
  });
});

describe('computeSaltIonPpmTotal', () => {
  it('sums all modeled ion contributions for one salt', () => {
    const total = computeSaltIonPpmTotal('mgso4', 10);
    const expected = 10 * ((24.305 + 96.06) / 120.365);

    expect(total).toBeCloseTo(expected, 5);
  });

  it('returns zero for missing, zero, and invalid targets', () => {
    expect(computeSaltIonPpmTotal('mgso4', 0)).toBe(0);
    expect(computeSaltIonPpmTotal('missing-salt', 10)).toBe(0);
    expect(computeSaltIonPpmTotal('mgso4', Number.NaN)).toBe(0);
  });
});

describe('computeNaClTargetForSodiumGap', () => {
  it('returns enough NaCl to supply the requested sodium gap', () => {
    const target = computeNaClTargetForSodiumGap(4.3);
    const totals = computeIonTotals({ nacl: target }, {}, 0);

    expect(totals.sodium).toBeCloseTo(4.3, 5);
    expect(totals.chloride).toBeCloseTo(target * (35.45 / 58.44), 5);
  });

  it('returns zero when there is no sodium gap', () => {
    expect(computeNaClTargetForSodiumGap(0)).toBe(0);
    expect(computeNaClTargetForSodiumGap(-2)).toBe(0);
  });
});

// ─── findIonOvershoots ───────────────────────────────────────────────────────

describe('findIonOvershoots', () => {
  it('reports chloride even when the original recipe target is zero', () => {
    const overshoots = findIonOvershoots(
      { chloride: 8 },
      { chloride: 0 },
    );

    expect(overshoots).toEqual([{ id: 'chloride', amount: 8 }]);
  });

  it('reports every overshooting ion rather than only the first one', () => {
    const overshoots = findIonOvershoots(
      { chloride: 8, sulfate: 12, sodium: 4 },
      { chloride: 0, sulfate: 5, sodium: 5 },
    );

    expect(overshoots).toEqual([
      { id: 'sodium', amount: 0 },
      { id: 'chloride', amount: 8 },
      { id: 'sulfate', amount: 7 },
    ].filter(item => item.amount > 0));
  });

  it('ignores differences within the display tolerance', () => {
    expect(findIonOvershoots(
      { chloride: 0.05, sulfate: 1.04 },
      { chloride: 0, sulfate: 1 },
    )).toEqual([]);
  });
});

describe('findIonUnderdoses', () => {
  it('reports a positive-target ion that remains below target', () => {
    const underdoses = findIonUnderdoses(
      { chloride: 8 },
      { chloride: 20 },
    );

    expect(underdoses).toEqual([{ id: 'chloride', amount: 12 }]);
  });

  it('reports every underdosed ion and ignores zero-target ions', () => {
    const underdoses = findIonUnderdoses(
      { chloride: 8, sulfate: 4, sodium: 10 },
      { chloride: 20, sulfate: 10, sodium: 10, potassium: 0 },
    );

    expect(underdoses).toEqual([
      { id: 'chloride', amount: 12 },
      { id: 'sulfate', amount: 6 },
    ]);
  });

  it('ignores differences within the display tolerance', () => {
    expect(findIonUnderdoses(
      { chloride: 9.951 },
      { chloride: 10 },
    )).toEqual([]);
  });
});

// ─── computeGH ────────────────────────────────────────────────────────────────

describe('computeGH', () => {
  it('computes GH correctly from magnesium and calcium', () => {
    const totals = computeIonTotals({ mgso4: 10, cacl2: 10 }, {}, 0);
    const gh = computeGH(totals);
    const expectedMg = 10 * (24.305 / 120.365) * 4.118;
    const expectedCa = 10 * (40.078 / 110.978) * 2.497;
    expect(gh).toBeCloseTo(expectedMg + expectedCa, 3);
  });

  it('returns 0 GH when no hardness ions are present', () => {
    const totals = computeIonTotals({ nahco3: 10 }, {}, 0);
    expect(computeGH(totals)).toBeCloseTo(0, 5);
  });

  it('returns 0 GH for all-zero totals', () => {
    const totals = computeIonTotals({}, {}, 0);
    expect(computeGH(totals)).toBe(0);
  });
});

// ─── computeKH ────────────────────────────────────────────────────────────────

describe('computeKH', () => {
  it('computes KH correctly from bicarbonate (NaHCO3 contribution)', () => {
    const totals = computeIonTotals({ nahco3: 10 }, {}, 0);
    const kh = computeKH(totals);
    const expectedHco3 = 10 * (61.017 / 84.007);
    expect(kh).toBeCloseTo(expectedHco3 * 0.820, 4);
  });

  it('returns 0 KH when no bicarbonate is present', () => {
    const totals = computeIonTotals({ mgso4: 10 }, {}, 0);
    expect(computeKH(totals)).toBeCloseTo(0, 5);
  });

  it('returns 0 KH for all-zero totals', () => {
    const totals = computeIonTotals({}, {}, 0);
    expect(computeKH(totals)).toBe(0);
  });

  it('includes carbonate in KH as CaCO₃ equivalent', () => {
    const totals = computeIonTotals({ nahco3: 10 }, {}, 0);
    totals.carbonate = 10;
    expect(computeKH(totals)).toBeCloseTo(
      (10 * (61.017 / 84.007) * 0.820) + (10 * 1.667),
      4,
    );
  });
});

// ─── GH:KH ratio guard (mirrors App.tsx display logic) ───────────────────────

describe('GH:KH ratio guard', () => {
  /** Mirrors the condition used in App.tsx to decide whether to show the ratio */
  function ratioResult(gh: number, kh: number): string {
    if (kh > 0 && gh >= 0 && Number.isFinite(gh / kh)) {
      return (gh / kh).toFixed(1);
    }
    return '—';
  }

  it('shows a numeric ratio when both GH and KH are positive', () => {
    const totals = computeIonTotals({ nahco3: 50, mgso4: 30 }, {}, 0);
    const gh = computeGH(totals);
    const kh = computeKH(totals);
    expect(kh).toBeGreaterThan(0);
    expect(gh).toBeGreaterThan(0);
    expect(ratioResult(gh, kh)).not.toBe('—');
  });

  it('shows — when KH is 0 (division-by-zero guard)', () => {
    // Only MgSO4 → no bicarbonate → KH = 0
    const totals = computeIonTotals({ mgso4: 30 }, {}, 0);
    const gh = computeGH(totals);
    const kh = computeKH(totals);
    expect(kh).toBeCloseTo(0, 5);
    expect(ratioResult(gh, kh)).toBe('—');
  });

  it('shows — when GH and KH are both 0 (no salts, no base water)', () => {
    expect(ratioResult(0, 0)).toBe('—');
  });

  it('shows — when GH/KH is non-finite (Infinity)', () => {
    // Manually construct a non-finite case
    expect(ratioResult(Infinity, 5)).toBe('—');
  });

  it('shows — when GH is NaN', () => {
    expect(ratioResult(NaN, 5)).toBe('—');
  });

  it('shows — when KH is negative (guard: kh > 0)', () => {
    expect(ratioResult(10, -1)).toBe('—');
  });

  it('ratio is correct for a known GH/KH pair', () => {
    // GH=20, KH=10 → ratio 2.0
    expect(ratioResult(20, 10)).toBe('2.0');
  });
});

// ─── num() edge-case behaviour (inline, mirrors App.tsx logic) ────────────────

describe('num() helper edge cases', () => {
  /** Mirrors the num() helper in App.tsx */
  function num(s: string): number {
    const v = parseFloat(s);
    return !Number.isFinite(v) || v < 0 ? 0 : v;
  }

  it('parses a valid positive float', () => {
    expect(num('3.5')).toBeCloseTo(3.5);
  });

  it('returns 0 for empty string', () => {
    expect(num('')).toBe(0);
  });

  it('returns 0 for non-numeric string', () => {
    expect(num('abc')).toBe(0);
  });

  it('returns 0 for negative number string', () => {
    expect(num('-5')).toBe(0);
  });

  it('returns 0 for "Infinity"', () => {
    expect(num('Infinity')).toBe(0);
  });

  it('returns 0 for "NaN"', () => {
    expect(num('NaN')).toBe(0);
  });

  it('returns 0 for "0"', () => {
    expect(num('0')).toBe(0);
  });

  it('parses integer strings correctly', () => {
    expect(num('42')).toBe(42);
  });
});

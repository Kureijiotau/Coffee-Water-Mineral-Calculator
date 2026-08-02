import { describe, expect, it } from 'vitest';
import {
  autoFillWaterVolumes,
  autoCraftSaltTargets,
  computeWatermancerBottledIons,
  computeSaltGapOptionPpm,
  translateSaltTargetsToIonTargets,
  type MineralWaterEntry,
} from './App';
import { SALTS } from './waterData';

const water = (
  id: string,
  ions: Partial<Record<string, number>>,
): MineralWaterEntry => ({
  id,
  name: id,
  ions: Object.fromEntries(Object.entries(ions).map(([key, value]) => [key, String(value)])),
  metadata: {},
  volumeMl: '0',
});

describe('autoFillWaterVolumes', () => {
  it('caps every active ion at its safe target in no-recipe mode', () => {
    const entries = [
      water('calcium-rich', { calcium: 12, sulfate: 30 }),
      water('sulfate-rich', { sulfate: 20 }),
    ];

    const filled = autoFillWaterVolumes(
      entries,
      1000,
      { calcium: 10, sulfate: 15 },
      [],
      ['calcium', 'sulfate'],
      50,
      true,
    );

    const calciumRichMl = Number(filled[0].volumeMl);
    const sulfateRichMl = Number(filled[1].volumeMl);
    expect(calciumRichMl * 12 + sulfateRichMl * 0).toBeLessThanOrEqual(10_000);
    expect(calciumRichMl * 30 + sulfateRichMl * 20).toBeLessThanOrEqual(15_000);
  });

  it('does not add variable water when fixed water already exceeds a safe ceiling', () => {
    const fixed = water('fixed', { calcium: 20 });
    fixed.volumeMl = '1000';

    const filled = autoFillWaterVolumes(
      [water('candidate', { calcium: 10 })],
      1000,
      { calcium: 10 },
      [fixed],
      ['calcium'],
      0,
      true,
    );

    expect(filled[0].volumeMl).toBe('0');
  });

  it('keeps recipe-mode deviation behavior unchanged', () => {
    const filled = autoFillWaterVolumes(
      [water('candidate', { calcium: 10 })],
      1000,
      { calcium: 10 },
      [],
      ['calcium'],
      5,
      false,
    );

    expect(filled[0].volumeMl).toBe('1000');
  });

  it('lets recipe mode fill past non-target co-ions without overshooting recipe ions', () => {
    const filled = autoFillWaterVolumes(
      [water('candidate', { calcium: 10, sulfate: 30 })],
      1000,
      { calcium: 10, sulfate: 0 },
      [],
      ['calcium'],
      0,
      true,
      true,
    );

    expect(filled[0].volumeMl).toBe('1000');
  });

  it('uses finer volume precision for a tight Alchemist recipe fill', () => {
    const filled = autoFillWaterVolumes(
      [water('candidate', { calcium: 10, bicarbonate: 12.3 })],
      1000,
      { calcium: 10, bicarbonate: 12.2 },
      [],
      ['calcium', 'bicarbonate'],
      0,
      true,
      true,
      0.1,
    );

    expect(Number(filled[0].volumeMl)).toBeCloseTo(991.8, 5);
    expect(Number(filled[0].volumeMl) * 12.3).toBeLessThanOrEqual(12_200);
  });

  it('allows a small positive-target wiggle when it improves Alchemist coverage', () => {
    const filled = autoFillWaterVolumes(
      [water('candidate', { calcium: 100, bicarbonate: 12.3 })],
      1000,
      { calcium: 100, bicarbonate: 12.2 },
      [],
      ['calcium', 'bicarbonate'],
      0,
      true,
      true,
      0.1,
      0.5,
    );

    const volume = Number(filled[0].volumeMl);
    expect(volume).toBeCloseTo(1000, 5);
    expect(volume * 12.3 / 1000).toBeCloseTo(12.3, 4);
    expect(volume * 12.3 / 1000).toBeLessThanOrEqual(12.7);
  });
});

describe('Watermancer salt-to-ion helpers', () => {
  it('translates a salt recipe into its modeled ion target profile', () => {
    const targets = translateSaltTargetsToIonTargets({ mgso4: 10 });
    const mgso4 = SALTS.find(salt => salt.id === 'mgso4')!;

    expect(targets.magnesium).toBeCloseTo(10 * mgso4.ions[0].fraction, 5);
    expect(targets.sulfate).toBeCloseTo(10 * mgso4.ions[1].fraction, 5);
  });

  it('sizes a salt option from the tightest coupled-ion gap', () => {
    const mgso4 = SALTS.find(salt => salt.id === 'mgso4')!;
    const magnesiumGap = 5;
    const sulfateGap = 100;
    const expected = magnesiumGap / (mgso4.ions.find(c => c.ionId === 'magnesium')?.fraction ?? 1);

    expect(computeSaltGapOptionPpm(mgso4, { magnesium: magnesiumGap, sulfate: sulfateGap }))
      .toBeCloseTo(expected, 5);
    expect(computeSaltGapOptionPpm(mgso4, {})).toBe(0);
  });

  it('auto-crafts a selected salt to minimize its coupled ion deviation', () => {
    const mgso4 = SALTS.find(salt => salt.id === 'mgso4')!;
    const targets = autoCraftSaltTargets(
      ['mgso4'],
      {},
      { magnesium: 5, sulfate: 20 },
    );
    const crafted = targets.mgso4 ?? 0;
    const magnesium = crafted * (mgso4.ions.find(c => c.ionId === 'magnesium')?.fraction ?? 0);
    const sulfate = crafted * (mgso4.ions.find(c => c.ionId === 'sulfate')?.fraction ?? 0);
    expect(magnesium).toBeCloseTo(5.06, 1);
    expect(sulfate).toBeCloseTo(20, 1);
  });

  it('includes water and preserves fixed salt chemistry while crafting selected salts', () => {
    const targets = autoCraftSaltTargets(
      ['khco3'],
      { bicarbonate: 2 },
      { potassium: 3, bicarbonate: 10 },
      { nacl: 4 },
    );
    const khco3 = SALTS.find(salt => salt.id === 'khco3')!;
    expect(targets.khco3).toBeGreaterThan(0);
    expect((targets.khco3 ?? 0) * (khco3.ions.find(c => c.ionId === 'potassium')?.fraction ?? 0))
      .toBeCloseTo(5.1, 1);
    expect(targets.nacl).toBeUndefined();
  });

  it('auto-crafts potassium chloride against potassium and chloride targets', () => {
    const targets = autoCraftSaltTargets(
      ['kcl'],
      {},
      { potassium: 3, chloride: 10 },
    );
    const kcl = SALTS.find(salt => salt.id === 'kcl')!;
    const potassium = (targets.kcl ?? 0) * (kcl.ions.find(c => c.ionId === 'potassium')?.fraction ?? 0);
    const chloride = (targets.kcl ?? 0) * (kcl.ions.find(c => c.ionId === 'chloride')?.fraction ?? 0);

    expect(targets.kcl).toBeGreaterThan(0);
    expect(potassium).toBeCloseTo(3, 1);
    expect(chloride).toBeCloseTo(2.7, 1);
  });

  it('computes added-water ions using batch dilution and overfill scaling', () => {
    const filled = computeWatermancerBottledIons([
      water('source-a', { calcium: 20 }),
      water('source-b', { calcium: 10 }),
    ].map((entry, index) => ({ ...entry, volumeMl: index === 0 ? '750' : '750' })), 1000);

    expect(filled.calcium).toBeCloseTo(15, 5);
  });

  it('supports the GH:KH harmony preset without changing the selected salt boundary', () => {
    const targets = autoCraftSaltTargets(
      ['mgso4', 'nahco3'],
      {},
      { magnesium: 10, sulfate: 20, bicarbonate: 20 },
      {},
      'gh-kh-harmony',
    );

    expect((targets.mgso4 ?? 0) + (targets.nahco3 ?? 0)).toBeGreaterThan(0);
    expect(Object.keys(targets).sort()).toEqual(['mgso4', 'nahco3']);
  });
});
import { describe, expect, it } from 'vitest';
import {
  autoFillWaterVolumes,
  autoCraftSaltTargets,
  computeWatermancerBottledIons,
  computeSaltGapOptionPpm,
  translateSaltTargetsToIonTargets,
  solveWatermancerRoutes,
  selectWatermancerRouteCandidate,
  recalculateWatermancerRouteAtCurrentVolumes,
  type MineralWaterEntry,
  type WatermancerRouteCandidate,
} from './App';
import { computeIonTotals, findIonOvershoots, findIonUnderdoses, IONS, RECIPES, SALTS } from './waterData';
import { EMPIRICAL_WATERS } from './empiricalWaters';

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
  it('recalculates the selected route card from edited visible water volumes', () => {
    const source = water('source', { calcium: 10 });
    source.volumeMl = '500';
    const solved = solveWatermancerRoutes({
      plan: {
        targetIons: { calcium: 10 },
        selectedWaters: [source],
        selectedSalts: [],
        fixedWaterVolumes: { source: 500 },
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['calcium'],
      },
      batchMl: 1000,
      baseWaters: [source],
      additionWaters: [],
    });
    const selected = solved.alternatives.find(candidate => candidate.kind === 'use-more-salts')
      ?? solved.primaryPlan;
    const current = recalculateWatermancerRouteAtCurrentVolumes(
      {
        plan: selected.plan,
        batchMl: 1000,
        baseWaters: [source],
        additionWaters: [],
      },
      selected,
    );
    const editedSource = { ...source, volumeMl: '501' };
    const edited = recalculateWatermancerRouteAtCurrentVolumes(
      {
        plan: selected.plan,
        batchMl: 1000,
        baseWaters: [editedSource],
        additionWaters: [],
      },
      selected,
    );

    expect(current.finalIons.calcium).toBeCloseTo(5, 5);
    expect(edited.finalIons.calcium).toBeCloseTo(5.01, 5);
  });

  it('keeps the selected route kind when live reranking reuses the primary route ID', () => {
    const candidates = [
      {
        id: 'primary',
        kind: 'use-more-water' as const,
      },
      {
        id: 'balanced',
        kind: 'primary' as const,
      },
    ] as unknown as WatermancerRouteCandidate[];

    expect(selectWatermancerRouteCandidate(candidates, 'primary', 'primary')?.kind).toBe('primary');
  });

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

  it('allows only the configured amount of controlled overshoot', () => {
    const waterEntry = water('calcium-rich', { calcium: 12 });
    const strict = autoFillWaterVolumes(
      [waterEntry],
      1000,
      { calcium: 10 },
      [],
      ['calcium'],
      0,
      true,
    );
    const controlled = autoFillWaterVolumes(
      [waterEntry],
      1000,
      { calcium: 10 },
      [],
      ['calcium'],
      0,
      true,
      false,
      1,
      0,
      {
        enabled: true,
        allowedIons: ['calcium'],
        maxPpm: { calcium: 2 },
        priorityOrder: ['calcium'],
      },
    );

    expect(Number(strict[0].volumeMl)).toBeCloseTo(833, 0);
    expect(Number(controlled[0].volumeMl)).toBe(1000);
  });

  it('keeps unlisted ions as hard ceilings when controlled overshoot is enabled', () => {
    const filled = autoFillWaterVolumes(
      [water('calcium-and-sulfate', { calcium: 12, sulfate: 20 })],
      1000,
      { calcium: 10, sulfate: 10 },
      [],
      ['calcium', 'sulfate'],
      0,
      true,
      false,
      1,
      0,
      {
        enabled: true,
        allowedIons: ['calcium'],
        maxPpm: { calcium: 2 },
        priorityOrder: ['calcium', 'sulfate'],
      },
    );

    expect(Number(filled[0].volumeMl) * 20 / 1000).toBeLessThanOrEqual(10);
    expect(Number(filled[0].volumeMl) * 12 / 1000).toBeLessThanOrEqual(12);
  });
});

describe('Watermancer salt-to-ion helpers', () => {
  it('returns a primary route and real alternatives with complete result data', () => {
    const result = solveWatermancerRoutes({
      plan: {
        targetIons: { calcium: 10, magnesium: 8, sulfate: 20 },
        selectedWaters: [water('source', { calcium: 12, sulfate: 8 })],
        selectedSalts: ['mgso4', 'cacl2'],
        fixedWaterVolumes: { source: 400 },
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium', 'magnesium', 'sulfate'],
        allowOvershoot: false,
      allowedOvershootIons: [],
        overshootLimits: { calcium: 0, magnesium: 0, sulfate: 0 },
        overshootOrder: ['calcium', 'magnesium', 'sulfate'],
      },
      batchMl: 1000,
      baseWaters: [water('source', { calcium: 12, sulfate: 8 })],
      additionWaters: [],
    });

    expect(result.primaryPlan.id).toBe('primary');
    expect(result.primaryPlan.overshoots.length).toBe(
      Math.min(
        result.primaryPlan.overshoots.length,
        ...result.alternatives.map(route => route.overshoots.length),
      ),
    );
    expect(new Set([
      result.primaryPlan.id,
      ...result.alternatives.map(route => route.id),
    ]).size).toBe(4);
    expect(result.finalIons).toEqual(result.primaryPlan.finalIons);
    expect(result.deviations).toHaveLength(IONS.length);
    expect(result.overshoots).toEqual(result.primaryPlan.overshoots);
    const priorityRoute = [result.primaryPlan, ...result.alternatives]
      .find(route => route.kind === 'prioritize-ions');
    expect(priorityRoute?.plan.overshootOrder).toEqual(priorityRoute?.plan.ionPriority);
    expect(result.explanation).toContain('primary route');
  });

  it('keeps the priority route identity when it wins the primary ranking', () => {
    const result = solveWatermancerRoutes({
      plan: {
        targetIons: { calcium: 10, magnesium: 8, sulfate: 20 },
        selectedWaters: [],
        selectedSalts: ['mgso4', 'cacl2'],
        fixedWaterVolumes: {},
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['magnesium', 'sulfate', 'calcium'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['magnesium', 'sulfate', 'calcium'],
      },
      batchMl: 1000,
      baseWaters: [],
      additionWaters: [],
    });

    const priorityRoute = [result.primaryPlan, ...result.alternatives]
      .find(route => route.kind === 'prioritize-ions');
    expect(priorityRoute).toBeDefined();
    expect(priorityRoute?.plan.overshootOrder).toEqual(priorityRoute?.plan.ionPriority);
    expect(new Set([result.primaryPlan.id, ...result.alternatives.map(route => route.id)]).size).toBe(4);
  });

  it('removes an automatic salt target below the physical minimum instead of emitting a trace dose', () => {
    const kcl = SALTS.find(salt => salt.id === 'kcl')!;
    const minimumPpm = 10 * kcl.anhydrousMass / kcl.hydrationForms[0].molarMass;
    const result = solveWatermancerRoutes({
      plan: {
        targetIons: { potassium: 0.2, chloride: 0.2 },
        selectedWaters: [],
        selectedSalts: ['kcl'],
        fixedWaterVolumes: {},
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['potassium', 'chloride'],
        allowOvershoot: true,
        allowedOvershootIons: ['potassium', 'chloride'],
        overshootLimits: { potassium: 0.5, chloride: 0.5 },
        minimumSaltDosePpm: { kcl: minimumPpm },
        overshootOrder: ['potassium', 'chloride'],
      },
      batchMl: 1000,
      baseWaters: [],
      additionWaters: [],
    });

    for (const route of [result.primaryPlan, ...result.alternatives]) {
      expect(route.saltTargets.kcl ?? 0).toBe(0);
    }
  });

  it('keeps route alternatives independently actionable from the same source waters', () => {
    const source = water('source', { calcium: 12, magnesium: 6, sulfate: 18 });
    const result = solveWatermancerRoutes({
      plan: {
        targetIons: { calcium: 10, magnesium: 8, sulfate: 20 },
        selectedWaters: [source],
        selectedSalts: ['mgso4', 'cacl2'],
        fixedWaterVolumes: { source: 400 },
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium', 'magnesium', 'sulfate'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['calcium', 'magnesium', 'sulfate'],
      },
      batchMl: 1000,
      baseWaters: [source],
      additionWaters: [],
    });

    const waterLed = [result.primaryPlan, ...result.alternatives]
      .find(route => route.kind === 'use-more-water');
    const saltLed = [result.primaryPlan, ...result.alternatives]
      .find(route => route.kind === 'use-more-salts');

    expect(waterLed).toBeDefined();
    expect(saltLed).toBeDefined();
    expect(
      waterLed!.baseWaters.map(entry => entry.volumeMl),
    ).not.toEqual(saltLed!.baseWaters.map(entry => entry.volumeMl));
    expect(waterLed!.saltTargets).not.toEqual(saltLed!.saltTargets);
  });

  it('allocates added magnesium/sulfate-rich water before replacing it with MgSO4', () => {
    const baseWater = water('base', { calcium: 20 });
    const addedWater = water('s-pellegrino', {
      sodium: 31.2,
      potassium: 2.4,
      magnesium: 49.2,
      calcium: 169,
      chloride: 49.8,
      sulfate: 403,
      bicarbonate: 249,
    });
    const plan = {
      targetIons: {
        calcium: 40,
        magnesium: 20,
        sulfate: 100,
        sodium: 20,
        potassium: 2,
        chloride: 25,
        bicarbonate: 40,
      },
      selectedWaters: [baseWater, addedWater],
      selectedSalts: ['mgso4', 'mgcl2', 'cacl2', 'nacl', 'nahco3', 'kcl'],
      fixedWaterVolumes: {},
      fixedSaltDoses: {},
      strategy: 'closest-match' as const,
      saltObjective: 'balanced' as const,
      ionPriority: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate', 'bicarbonate', 'citrates'] as const,
      allowOvershoot: false,
      allowedOvershootIons: [],
      overshootLimits: {},
      overshootOrder: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate', 'bicarbonate', 'citrates'] as const,
    };
    const result = solveWatermancerRoutes({
      plan,
      batchMl: 1000,
      baseWaters: [baseWater],
      additionWaters: [addedWater],
    });
    const waterLed = [result.primaryPlan, ...result.alternatives]
      .find(route => route.kind === 'use-more-water')!;
    const saltLed = [result.primaryPlan, ...result.alternatives]
      .find(route => route.kind === 'use-more-salts')!;

    expect(Number(waterLed.additionWaters[0].volumeMl)).toBeGreaterThan(0);
    expect(waterLed.finalIons.magnesium).toBeGreaterThan(0);
    expect(waterLed.finalIons.sulfate).toBeGreaterThan(0);
    expect(waterLed.saltTargets.mgso4 ?? 0).toBeLessThan(saltLed.saltTargets.mgso4 ?? 0);
  });

  it('reports a blocked result when the plan cannot run', () => {
    const result = solveWatermancerRoutes({
      plan: {
        targetIons: { calcium: 10 },
        selectedWaters: [],
        selectedSalts: [],
        fixedWaterVolumes: {},
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['calcium'],
      },
      batchMl: 1000,
      baseWaters: [],
      additionWaters: [],
    });

    expect(result.status).toBe('blocked');
    expect(result.alternatives).toHaveLength(3);
  });

  it('can complete a target with water alone when no salts are selected', () => {
    const source = water('source', { calcium: 10 });
    source.volumeMl = '1000';
    const result = solveWatermancerRoutes({
      plan: {
        targetIons: { calcium: 10 },
        selectedWaters: [source],
        selectedSalts: [],
        fixedWaterVolumes: { source: 1000 },
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['calcium'],
      },
      batchMl: 1000,
      baseWaters: [source],
      additionWaters: [],
    });

    expect(result.status).toBe('matched');
    expect(result.primaryPlan.saltTargets).toEqual({});
    expect(result.primaryPlan.finalIons.calcium).toBeCloseTo(10, 5);
  });

  it('uses the declared ion priority when water choices compete', () => {
    const sharedWater = water('shared', { calcium: 20, sulfate: 20 });
    const sulfateWater = water('sulfate', { sulfate: 30 });
    const targets = { calcium: 10, sulfate: 10 };
    const first = autoFillWaterVolumes(
      [sharedWater, sulfateWater],
      1000,
      targets,
      [],
      ['calcium', 'sulfate'],
      0,
      true,
    );
    const second = autoFillWaterVolumes(
      [sharedWater, sulfateWater],
      1000,
      targets,
      [],
      ['sulfate', 'calcium'],
      0,
      true,
    );

    expect(first.map(entry => entry.volumeMl)).not.toEqual(second.map(entry => entry.volumeMl));
  });

  it('translates a salt recipe into its modeled ion target profile', () => {
    const targets = translateSaltTargetsToIonTargets({ mgso4: 10 });
    const mgso4 = SALTS.find(salt => salt.id === 'mgso4')!;

    expect(targets.magnesium).toBeCloseTo(10 * mgso4.ions[0].fraction, 5);
    expect(targets.sulfate).toBeCloseTo(10 * mgso4.ions[1].fraction, 5);
  });

  it('reconstructs the Kimoi salt-based ion profile without missing or excess ions', () => {
    const kimoi = RECIPES.find(recipe => recipe.id === 'kimoi')!;
    const saltTargets = Object.fromEntries(
      Object.entries(kimoi.salts).map(([saltId, entry]) => [saltId, Number(entry.target)]),
    );
    const ionTargets = translateSaltTargetsToIonTargets(saltTargets);
    const craftedSaltTargets = autoCraftSaltTargets(
      Object.keys(saltTargets),
      {},
      ionTargets,
      {},
      'closest-match',
      'balanced',
    );
    const finalIons = computeIonTotals(craftedSaltTargets, {}, 1);

    expect(findIonOvershoots(finalIons, ionTargets)).toEqual([]);
    expect(findIonUnderdoses(finalIons, ionTargets)).toEqual([]);
    expect(finalIons).toMatchObject(
      Object.fromEntries(
        Object.entries(ionTargets).map(([ionId, target]) => [ionId, expect.closeTo(target as number, 4)]),
      ),
    );
  });

  it('keeps the Kimoi salt-led route free of missing or excess target ions', () => {
    const kimoi = RECIPES.find(recipe => recipe.id === 'kimoi')!;
    const saltTargets = Object.fromEntries(
      Object.entries(kimoi.salts).map(([saltId, entry]) => [saltId, Number(entry.target)]),
    );
    const ionTargets = translateSaltTargetsToIonTargets(saltTargets);
    const result = solveWatermancerRoutes({
      plan: {
        targetIons: ionTargets,
        selectedWaters: [],
        selectedSalts: Object.keys(saltTargets),
        fixedWaterVolumes: {},
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate', 'bicarbonate', 'citrates'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate', 'bicarbonate', 'citrates'],
      },
      batchMl: 1000,
      baseWaters: [],
      additionWaters: [],
    });
    const saltLed = [result.primaryPlan, ...result.alternatives]
      .find(route => route.kind === 'use-more-salts')!;
    const finalIons = computeIonTotals(saltLed.saltTargets, {}, 1);

    expect(findIonOvershoots(finalIons, ionTargets)).toEqual([]);
    expect(findIonUnderdoses(finalIons, ionTargets)).toEqual([]);
  });

  it('runs every route against the Empirical Glacier profile for diagnosis', () => {
    const glacier = EMPIRICAL_WATERS.find(water => water.id === 'empirical-glacial')!;
    const targetIons = glacier.ions;
    const result = solveWatermancerRoutes({
      plan: {
        targetIons,
        selectedWaters: [],
        selectedSalts: SALTS.map(salt => salt.id),
        fixedWaterVolumes: {},
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate', 'bicarbonate', 'citrates'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate', 'bicarbonate', 'citrates'],
      },
      batchMl: 1000,
      baseWaters: [],
      additionWaters: [],
    });

    expect(result.primaryPlan).toBeDefined();
  });

  it('replicates the Empirical Glacier profile exactly when Glacier is selected as source water', () => {
    const glacier = EMPIRICAL_WATERS.find(water => water.id === 'empirical-glacial')!;
    const targetIons = glacier.ions;
    const sourceWater: MineralWaterEntry = {
      id: 'glacier-source',
      name: glacier.name,
      ions: Object.fromEntries(
        Object.entries(glacier.ions).map(([ionId, value]) => [ionId, String(value)]),
      ),
      metadata: { tds: String(glacier.metadata.tds) },
      volumeMl: '1000',
    };
    const result = solveWatermancerRoutes({
      plan: {
        targetIons,
        selectedWaters: [sourceWater],
        selectedSalts: SALTS.map(salt => salt.id),
        fixedWaterVolumes: { [sourceWater.id]: 1000 },
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate', 'bicarbonate', 'citrates'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate', 'bicarbonate', 'citrates'],
      },
      batchMl: 1000,
      baseWaters: [sourceWater],
      additionWaters: [],
    });
    const exactRoute = [result.primaryPlan, ...result.alternatives]
      .find(route => route.kind === 'use-more-salts')!;

    expect(findIonOvershoots(exactRoute.finalIons, targetIons)).toEqual([]);
    expect(findIonUnderdoses(exactRoute.finalIons, targetIons)).toEqual([]);
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

  it('treats selected salts as optional inventory and avoids a harmful coupled ion', () => {
    const targets = autoCraftSaltTargets(
      ['mgcl2', 'mgso4'],
      {},
      { magnesium: 10, sulfate: 20, chloride: 0 },
    );
    const epsom = SALTS.find(salt => salt.id === 'mgso4')!;
    const epsomMagnesium = (targets.mgso4 ?? 0)
      * (epsom.ions.find(contribution => contribution.ionId === 'magnesium')?.fraction ?? 0);

    expect(targets.mgcl2).toBe(0);
    expect(targets.mgso4).toBeGreaterThan(0);
    expect(epsomMagnesium).toBeGreaterThan(0);
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

  it('omits an impractical sub-10 mg physical salt dose', () => {
    const kcl = SALTS.find(salt => salt.id === 'kcl')!;
    const form = kcl.hydrationForms[kcl.defaultFormIdx ?? 0];
    const minimumPpm = 10 * kcl.anhydrousMass / form.molarMass;
    const targets = autoCraftSaltTargets(
      ['kcl'],
      {},
      { potassium: 0.2, chloride: 0.2 },
      {},
      'closest-match',
      'balanced',
      {
        enabled: true,
        allowedIons: ['potassium', 'chloride'],
        maxPpm: { potassium: 0.5, chloride: 0.5 },
        minimumSaltDosePpm: { kcl: minimumPpm },
        priorityOrder: ['potassium', 'chloride'],
      },
    );

    expect(targets.kcl).toBe(0);
  });

  it('protects primary ions instead of trading calcium coverage for chloride', () => {
    const result = autoCraftSaltTargets(
      ['cacl2'],
      {},
      { calcium: 10, chloride: 10 },
      {},
      'closest-match',
      'balanced',
      {
        enabled: true,
        allowedIons: ['calcium', 'chloride'],
        maxPpm: { calcium: 0.5, chloride: 0.5 },
        softDeficitIons: ['chloride'],
        softDeficitLimits: { chloride: 0.5 },
        priorityOrder: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate'],
      },
    );
    const cacl2 = SALTS.find(salt => salt.id === 'cacl2')!;
    const calcium = (result.cacl2 ?? 0)
      * (cacl2.ions.find(contribution => contribution.ionId === 'calcium')?.fraction ?? 0);

    expect(calcium).toBeGreaterThanOrEqual(9.5);
  });

  it('treats a small chloride deficit as within the controlled matching policy', () => {
    const source = water('source', { calcium: 10, chloride: 9.6 });
    source.volumeMl = '1000';
    const result = solveWatermancerRoutes({
      plan: {
        targetIons: { calcium: 10, chloride: 10 },
        selectedWaters: [source],
        selectedSalts: [],
        fixedWaterVolumes: { source: 1000 },
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate'],
        allowOvershoot: true,
        allowedOvershootIons: ['calcium', 'chloride'],
        overshootLimits: { calcium: 0.5, chloride: 0.5 },
        softDeficitIons: ['chloride', 'sulfate'],
        softDeficitLimits: { chloride: 0.5, sulfate: 0.5 },
        overshootOrder: ['calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate'],
      },
      batchMl: 1000,
      baseWaters: [source],
      additionWaters: [],
    });

    expect(result.status).toBe('matched');
    expect(result.primaryPlan.finalIons.chloride).toBeCloseTo(9.6, 5);
    expect(result.primaryPlan.finalIons.calcium).toBeCloseTo(10, 5);
  });

  it('treats chloride deficits as strict unless a positive deviation is explicitly configured', () => {
    const source = water('source', { calcium: 10, chloride: 9.6 });
    source.volumeMl = '1000';
    const strictResult = solveWatermancerRoutes({
      plan: {
        targetIons: { calcium: 10, chloride: 10 },
        selectedWaters: [source],
        selectedSalts: [],
        fixedWaterVolumes: { source: 1000 },
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium', 'chloride'],
        allowOvershoot: true,
        allowedOvershootIons: ['calcium', 'chloride'],
        overshootLimits: { calcium: 0, chloride: 0 },
        softDeficitIons: [],
        softDeficitLimits: {},
        overshootOrder: ['calcium', 'chloride'],
      },
      batchMl: 1000,
      baseWaters: [source],
      additionWaters: [],
    });

    expect(strictResult.status).toBe('partial');
    expect(strictResult.primaryPlan.deviations.find(item => item.id === 'chloride')?.delta).toBeCloseTo(-0.4, 5);
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
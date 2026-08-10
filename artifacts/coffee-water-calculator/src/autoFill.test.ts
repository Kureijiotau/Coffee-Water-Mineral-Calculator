import { describe, expect, it } from 'vitest';
import {
  autoFillWaterVolumes,
  autoCraftSaltTargets,
  buildWatermancerPrecisionRecommendation,
  computeConcentrateStockSaltMassMg,
  computeConcentrateSaltMgPerDrop,
  computeConcentrateDropsForSaltMass,
  computeWatermancerBottledIons,
  computeWatermancerFinalIons,
  computeSaltGapOptionPpm,
  craftGlacialStyleWatermancerMatch,
  translateSaltTargetsToIonTargets,
  solveWatermancerRoutes,
  applyWatermancerBestMatchDeviationMode,
  findBestWatermancerMatch,
  selectBestWatermancerMatchCandidate,
  selectWatermancerRouteCandidate,
  recalculateWatermancerRouteAtCurrentVolumes,
  totalWatermancerDeviation,
  totalWatermancerAbsoluteDeviation,
  executeWatermancerRouteCandidate,
  watermancerRouteWaterInputs,
  watermancerRouteMatchesCurrentInputs,
  isWatermancerActionSnapshotCurrent,
  watermancerBestMatchPreviewIsCurrent,
  mergeRecipeStepTargets,
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
  it('uses active recipe doses before suggested doses for preparation steps', () => {
    expect(mergeRecipeStepTargets(
      { calact: 8, nacl: 34 },
      { calact: 0, nacl: 0, mgso4: 58 },
    )).toMatchObject({
      calact: 8,
      nacl: 34,
      mgso4: 58,
    });
  });

  it('reports the policy-adjusted total final ion deviation', () => {
    const plan = {
      targetIons: { calcium: 10, chloride: 0 },
      allowOvershoot: false,
      allowedOvershootIons: [],
      overshootLimits: {},
      softDeficitIons: [],
      softDeficitLimits: {},
    } as unknown as WatermancerRouteCandidate['plan'];

    expect(totalWatermancerDeviation(
      { calcium: 8, chloride: 1 },
      plan.targetIons,
      plan,
    )).toBeCloseTo(3, 5);
  });

  it('reports both under-target and over-target gaps in the displayed total', () => {
    expect(totalWatermancerAbsoluteDeviation(
      { calcium: 8, chloride: 4 },
      { calcium: 10, chloride: 0 },
    )).toBeCloseTo(5.9, 5);
  });

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

  it('keeps the live final mixture aligned with edited water and salt inputs', () => {
    const source = water('source', { calcium: 10 });
    source.volumeMl = '500';
    const initial = computeWatermancerFinalIons(
      [source],
      1000,
      { cacl2: 2 },
    );
    const edited = computeWatermancerFinalIons(
      [{ ...source, volumeMl: '501' }],
      1000,
      { cacl2: 3 },
    );
    const calciumFromSalt = computeIonTotals({ cacl2: 1 }, {}, 1).calcium;

    expect(initial.calcium).toBeCloseTo(5 + calciumFromSalt * 2, 5);
    expect(edited.calcium).toBeCloseTo(5.01 + calciumFromSalt * 3, 5);
    expect(edited.calcium).toBeGreaterThan(initial.calcium);
  });

  it('never reduces sodium when calcium chloride is increased manually', () => {
    const source = water('source', { sodium: 8 });
    source.volumeMl = '500';
    const initial = computeWatermancerFinalIons([source], 1000, { cacl2: 2, nacl: 1 });
    const edited = computeWatermancerFinalIons([source], 1000, { cacl2: 3, nacl: 1 });

    expect(edited.sodium).toBeCloseTo(initial.sodium, 5);
    expect(edited.calcium).toBeGreaterThan(initial.calcium);
  });

  it('keeps every other salt dose fixed while manually editing one salt', () => {
    const source = water('source', { calcium: 10, sodium: 8 });
    source.volumeMl = '500';
    const route = solveWatermancerRoutes({
      plan: {
        targetIons: { calcium: 10, sodium: 10 },
        selectedWaters: [source],
        selectedSalts: ['cacl2', 'nacl'],
        fixedWaterVolumes: { source: 500 },
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium', 'sodium'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['calcium', 'sodium'],
      },
      batchMl: 1000,
      baseWaters: [source],
      additionWaters: [],
    }).primaryPlan;
    const edited = recalculateWatermancerRouteAtCurrentVolumes(
      {
        plan: route.plan,
        batchMl: 1000,
        baseWaters: [source],
        additionWaters: [],
      },
      route,
      { ...route.saltTargets, cacl2: (route.saltTargets.cacl2 ?? 0) + 1 },
    );

    const sodiumFromUnchangedSalt = computeIonTotals(
      { nacl: route.saltTargets.nacl ?? 0 },
      {},
      1,
    ).sodium;
    const sodiumFromVisibleWater = 8 * 500 / 1000;

    expect(edited.saltTargets.nacl).toBeCloseTo(route.saltTargets.nacl, 8);
    expect(edited.saltTargets.cacl2).toBeCloseTo((route.saltTargets.cacl2 ?? 0) + 1, 8);
    expect(edited.finalIons.sodium).toBeCloseTo(sodiumFromVisibleWater + sodiumFromUnchangedSalt, 5);
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

  it('switches routes from the stable water baseline instead of accumulating route fills', () => {
    const source = water('source', { calcium: 10 });
    const plan = {
      targetIons: { calcium: 10 },
      selectedWaters: [source],
      selectedSalts: [],
      fixedWaterVolumes: { source: 0 },
      fixedSaltDoses: {},
      strategy: 'closest-match' as const,
      saltObjective: 'balanced' as const,
      ionPriority: ['calcium' as const],
      allowOvershoot: false,
      allowedOvershootIons: [],
      overshootLimits: {},
      overshootOrder: ['calcium' as const],
    };
    const solved = solveWatermancerRoutes({
      plan,
      batchMl: 1000,
      baseWaters: [source],
      additionWaters: [],
    });
    const candidates = [solved.primaryPlan, ...solved.alternatives];
    const waterRoute = candidates.find(candidate => candidate.kind === 'use-more-water');
    const saltRoute = candidates.find(candidate => candidate.kind === 'use-more-salts');
    expect(waterRoute).toBeDefined();
    expect(saltRoute).toBeDefined();

    const baseline = watermancerRouteWaterInputs([source], [], null);
    const appliedWaterRoute = executeWatermancerRouteCandidate(
      { plan, batchMl: 1000, ...baseline },
      waterRoute!,
    );
    const appliedSaltRoute = executeWatermancerRouteCandidate(
      { plan, batchMl: 1000, ...watermancerRouteWaterInputs(
        appliedWaterRoute.baseWaters,
        appliedWaterRoute.additionWaters,
        {
          baseWaters: baseline.baseWaters,
          additionWaters: baseline.additionWaters,
        },
      ) },
      saltRoute!,
    );
    const appliedWaterRouteAgain = executeWatermancerRouteCandidate(
      { plan, batchMl: 1000, ...watermancerRouteWaterInputs(
        appliedSaltRoute.baseWaters,
        appliedSaltRoute.additionWaters,
        {
          baseWaters: baseline.baseWaters,
          additionWaters: baseline.additionWaters,
        },
      ) },
      waterRoute!,
    );

    expect(Number(appliedWaterRoute.baseWaters[0].volumeMl)).toBeGreaterThan(0);
    expect(Number(appliedSaltRoute.baseWaters[0].volumeMl)).toBe(0);
    expect(appliedWaterRouteAgain.baseWaters[0].volumeMl)
      .toBe(appliedWaterRoute.baseWaters[0].volumeMl);
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
  it('crafts a phased Glacial-style match with calcium-safe water and preferred salts', () => {
    const base = water('base', { calcium: 20, bicarbonate: 20 });
    const result = craftGlacialStyleWatermancerMatch({
      plan: {
        targetIons: {
          calcium: 10,
          magnesium: 5,
          sodium: 3,
          potassium: 0,
          bicarbonate: 10,
        },
        selectedWaters: [base],
        selectedSalts: ['cacl2', 'mgcl2', 'nacl'],
        fixedWaterVolumes: {},
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium', 'magnesium', 'sodium'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['calcium', 'magnesium', 'sodium'],
      },
      batchMl: 1000,
      baseWaters: [base],
      additionWaters: [],
    });

    expect(result).toBeDefined();
    expect(Number(result!.baseWaters[0].volumeMl)).toBe(500);
    expect(result!.finalIons.calcium).toBeCloseTo(10, 5);
    expect(result!.finalIons.bicarbonate).toBeLessThanOrEqual(10.000001);
    expect(result!.finalIons.magnesium).toBeGreaterThanOrEqual(4.999);
    expect(result!.finalIons.sodium).toBeGreaterThanOrEqual(2.999);
    expect(result!.saltTargets.mgcl2).toBeGreaterThan(0);
    expect(result!.saltTargets.nacl).toBeGreaterThan(0);
    expect(result!.explanation).toContain('calcium');
  });

  it('rejects best-match results when the action generation or inputs changed', () => {
    expect(isWatermancerActionSnapshotCurrent(4, 4, 'same', 'same')).toBe(true);
    expect(isWatermancerActionSnapshotCurrent(4, 5, 'same', 'same')).toBe(false);
    expect(isWatermancerActionSnapshotCurrent(4, 4, 'old', 'new')).toBe(false);
  });

  it('keeps review previews isolated from changed inputs', () => {
    expect(watermancerBestMatchPreviewIsCurrent({ inputSignature: 'same' }, 'same')).toBe(true);
    expect(watermancerBestMatchPreviewIsCurrent({ inputSignature: 'old' }, 'new')).toBe(false);
    expect(watermancerBestMatchPreviewIsCurrent(null, 'same')).toBe(false);
  });

  it('keeps the exact swept route identifiable after the winner is applied', () => {
    const base = water('base', { calcium: 10 });
    const winner = findBestWatermancerMatch({
      plan: {
        targetIons: { calcium: 10 },
        selectedWaters: [base],
        selectedSalts: ['cacl2'],
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
      baseWaters: [base],
      additionWaters: [],
    }).winner;

    expect(winner).toBeDefined();
    expect(watermancerRouteMatchesCurrentInputs(
      winner!.route,
      winner!.route.plan,
      winner!.route.baseWaters,
      winner!.route.additionWaters,
    )).toBe(true);
  });

  it('benchmarks every strategy with strict and permissive deviation modes', () => {
    const source = water('source', { calcium: 10, sulfate: 20 });
    const plan = {
      targetIons: { calcium: 10, sulfate: 20, chloride: 0 },
      selectedWaters: [source],
      selectedSalts: ['cacl2'],
      fixedWaterVolumes: { source: 500 },
      fixedSaltDoses: {},
      strategy: 'closest-match' as const,
      saltObjective: 'balanced' as const,
      ionPriority: ['calcium', 'sulfate', 'chloride'] as const,
      allowOvershoot: false,
      allowedOvershootIons: [],
      overshootLimits: {},
      overshootOrder: ['calcium', 'sulfate', 'chloride'] as const,
    };

    const sweep = findBestWatermancerMatch({
      plan,
      batchMl: 1000,
      baseWaters: [source],
      additionWaters: [],
    });

    expect(sweep.candidates).toHaveLength(48);
    expect(new Set(sweep.candidates.map(candidate => candidate.strategy))).toEqual(
      new Set(['closest-match', 'water-first', 'gh-kh-harmony', 'added-water-mineral-first']),
    );
    expect(new Set(sweep.candidates.map(candidate => candidate.deviationMode))).toEqual(
      new Set(['strict', 'permissive']),
    );
    expect(new Set(sweep.candidates.map(candidate => candidate.saltObjective))).toEqual(
      new Set(['balanced', 'coverage']),
    );
    expect(new Set(sweep.candidates.map(candidate => candidate.priorityPreset))).toEqual(
      new Set(['mineral-first', 'bicarbonate-first', 'balanced-gh-kh']),
    );
    expect(sweep.winner).toBeDefined();
  });

  it('fills only base waters while preserving added-water volumes for every best-match candidate', () => {
    const base = water('base', { calcium: 20 });
    const added = water('added', { magnesium: 10 });
    added.volumeMl = '250';
    const sweep = findBestWatermancerMatch({
      plan: {
        targetIons: { calcium: 10, magnesium: 5 },
        selectedWaters: [base, added],
        selectedSalts: ['cacl2', 'mgso4'],
        fixedWaterVolumes: {},
        fixedSaltDoses: {},
        strategy: 'closest-match',
        saltObjective: 'balanced',
        ionPriority: ['calcium', 'magnesium'],
        allowOvershoot: false,
        allowedOvershootIons: [],
        overshootLimits: {},
        overshootOrder: ['calcium', 'magnesium'],
      },
      batchMl: 1000,
      baseWaters: [base],
      additionWaters: [added],
    });

    expect(sweep.candidates).toHaveLength(48);
    expect(sweep.candidates
      .filter(candidate => candidate.strategy !== 'added-water-mineral-first')
      .every(candidate => candidate.route.additionWaters[0].volumeMl === '250')).toBe(true);
    expect(sweep.candidates.some(candidate => Number(candidate.route.baseWaters[0].volumeMl) > 0)).toBe(true);
  });

  it('adds selected Added water for the mineral-first strategy without crossing its water ceilings', () => {
    const added = water('added', {
      calcium: 20,
      magnesium: 10,
      bicarbonate: 10,
      sulfate: 20,
    });
    const base = water('base', { calcium: 2 });
    const plan = {
      targetIons: {
        calcium: 10,
        magnesium: 5,
        bicarbonate: 10,
        sulfate: 10,
        chloride: 0,
      },
      selectedWaters: [base, added],
      selectedSalts: [],
      fixedWaterVolumes: { base: 500, added: 0 },
      fixedSaltDoses: {},
      strategy: 'added-water-mineral-first' as const,
      saltObjective: 'balanced' as const,
      ionPriority: ['calcium', 'magnesium', 'bicarbonate', 'sulfate'] as const,
      allowOvershoot: false,
      allowedOvershootIons: [],
      overshootLimits: {},
      overshootOrder: ['calcium', 'magnesium', 'bicarbonate', 'sulfate'] as const,
    };

    const route = findBestWatermancerMatch({
      plan,
      batchMl: 1000,
      baseWaters: [base],
      additionWaters: [added],
    }).candidates.find(candidate => candidate.strategy === 'added-water-mineral-first')?.route;

    expect(route).toBeDefined();
    expect(Number(route!.additionWaters[0].volumeMl)).toBeGreaterThan(0);
    expect(route!.qualityValid).toBe(true);
    expect(route!.finalIons.bicarbonate).toBeLessThanOrEqual(10.000001);
    expect(route!.finalIons.chloride).toBeLessThanOrEqual(0.000001);
  });

  it('rejects Added-water mineral-first when the current Added water already violates a hard ceiling', () => {
    const added = water('added', { bicarbonate: 20 });
    added.volumeMl = '1000';
    const plan = {
      targetIons: { bicarbonate: 10 },
      selectedWaters: [added],
      selectedSalts: [],
      fixedWaterVolumes: { added: 1000 },
      fixedSaltDoses: {},
      strategy: 'added-water-mineral-first' as const,
      saltObjective: 'balanced' as const,
      ionPriority: ['bicarbonate'] as const,
      allowOvershoot: false,
      allowedOvershootIons: [],
      overshootLimits: {},
      overshootOrder: ['bicarbonate'] as const,
    };

    const sweep = findBestWatermancerMatch({
      plan,
      batchMl: 1000,
      baseWaters: [],
      additionWaters: [added],
    });
    const candidate = sweep.candidates.find(
      item => item.strategy === 'added-water-mineral-first',
    );

    expect(candidate?.route.qualityValid).toBe(false);
    expect(candidate?.result.status).toBe('blocked');
    expect(sweep.winner?.strategy).not.toBe('added-water-mineral-first');
  });

  it('uses zero tolerance for strict mode and target-scaled tolerance for permissive mode', () => {
    const plan = {
      targetIons: { calcium: 10, sulfate: 20, chloride: 0 },
      allowOvershoot: false,
      allowedOvershootIons: [],
      overshootLimits: {},
      softDeficitIons: ['chloride'],
      softDeficitLimits: { chloride: 50 },
    } as unknown as WatermancerRouteCandidate['plan'];

    const strict = applyWatermancerBestMatchDeviationMode(plan, 'strict');
    const permissive = applyWatermancerBestMatchDeviationMode(plan, 'permissive');

    expect(strict.allowOvershoot).toBe(false);
    expect(strict.softDeficitIons).toEqual([]);
    expect(strict.softDeficitLimits).toEqual({});
    expect(permissive.allowOvershoot).toBe(true);
    expect(permissive.softDeficitIons).toEqual(['calcium', 'sulfate']);
    expect(permissive.softDeficitLimits).toEqual({ calcium: 1, sulfate: 2 });
    expect(permissive.softDeficitIons).not.toContain('chloride');
  });

  it('prefers strict mode and then the current strategy for equal sweep scores', () => {
    const route = {} as WatermancerRouteCandidate;
    const matched = { status: 'matched' } as WatermancerSolverResult;
    const candidates = [
      {
        strategy: 'water-first' as const,
        deviationMode: 'permissive' as const,
        result: matched,
        route,
        totalDeviation: 2,
      },
      {
        strategy: 'closest-match' as const,
        deviationMode: 'strict' as const,
        result: matched,
        route,
        totalDeviation: 2,
      },
      {
        strategy: 'gh-kh-harmony' as const,
        deviationMode: 'strict' as const,
        result: matched,
        route,
        totalDeviation: 2,
      },
    ];

    expect(selectBestWatermancerMatchCandidate(candidates, 'gh-kh-harmony')?.strategy)
      .toBe('gh-kh-harmony');
    expect(selectBestWatermancerMatchCandidate(candidates, 'closest-match')?.strategy)
      .toBe('closest-match');
  });

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

  it('keeps a water-only ion out of automatic salt contributions', () => {
    const targets = autoCraftSaltTargets(
      ['cacl2'],
      {},
      { calcium: 10, chloride: 15 },
      {},
      'closest-match',
      'balanced',
      {
        enabled: false,
        allowedIons: [],
        maxPpm: {},
        priorityOrder: ['calcium', 'chloride'],
        ionSourcePreferences: { calcium: 'water-only' },
      },
    );

    expect(targets.cacl2 ?? 0).toBe(0);
  });

  it('keeps a salt-only ion out of automatic water filling', () => {
    const source = water('calcium-water', { calcium: 20 });
    const filled = autoFillWaterVolumes(
      [source],
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
        enabled: false,
        allowedIons: [],
        maxPpm: {},
        priorityOrder: ['calcium'],
        ionSourcePreferences: { calcium: 'salt-only' },
      },
    );

    expect(filled[0].volumeMl).toBe('0');
  });

  it('allows water-then-salt to use water before salt finishing', () => {
    const source = water('calcium-water', { calcium: 20 });
    const filled = autoFillWaterVolumes(
      [source],
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
        enabled: false,
        allowedIons: [],
        maxPpm: {},
        priorityOrder: ['calcium'],
        ionSourcePreferences: { calcium: 'water-then-salt' },
      },
    );

    expect(Number(filled[0].volumeMl)).toBeGreaterThan(0);
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

  it('keeps a fixed salt dose out of the optimizer', () => {
    const targets = autoCraftSaltTargets(
      ['mgso4', 'mgcl2'],
      {},
      { magnesium: 20, sulfate: 20, chloride: 20 },
      { mgso4: 10 },
    );

    expect(targets).not.toHaveProperty('mgso4');
    expect(targets.mgcl2).toBeGreaterThanOrEqual(0);
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

describe('buildWatermancerPrecisionRecommendation', () => {
  it('recommends the smallest half-liter batch that brings the smallest dose above 100 mg', () => {
    const recommendation = buildWatermancerPrecisionRecommendation(
      { mgso4: 10, nahco3: 4 },
      [
        { target: '', formIdx: 0 },
        { target: '', formIdx: 0 },
      ],
      1,
      20,
    );

    expect(recommendation?.status).toBe('needs-volume');
    expect(recommendation?.currentMinimumMassMg).toBeCloseTo(4, 5);
    expect(recommendation?.recommendedBatchLiters).toBe(25);
    expect(recommendation?.recommendedMinimumMassMg).toBeCloseTo(100, 5);
  });

  it('keeps a measurable recipe at its current volume and calculates the 500x stock dose', () => {
    const recommendation = buildWatermancerPrecisionRecommendation(
      { nahco3: 120 },
      [{ target: '', formIdx: 0 }],
      1,
      20,
    );

    expect(recommendation?.status).toBe('ready');
    expect(recommendation?.recommendedBatchLiters).toBe(1);
    expect(recommendation?.stockDoseMlPerLiter).toBe(2);
    expect(recommendation?.stockDropsPerLiter).toBe(40);
    expect(recommendation?.stockMasses[0].stockMassMg).toBeCloseTo(30_000, 5);
  });
});

describe('concentrate calculations', () => {
  it('calculates the salt mass for any percentage and total stock weight', () => {
    expect(computeConcentrateStockSaltMassMg(1, 50)).toBeCloseTo(500, 5);
    expect(computeConcentrateStockSaltMassMg(5, 50)).toBeCloseTo(2500, 5);
    expect(computeConcentrateStockSaltMassMg(10, 100)).toBeCloseTo(10000, 5);
  });

  it('calculates salt delivered by a weighed group of calibrated drops', () => {
    expect(computeConcentrateSaltMgPerDrop(5, 100, 5)).toBeCloseTo(2.5, 5);
    expect(computeConcentrateSaltMgPerDrop(1, 25, 1)).toBeCloseTo(0.4, 5);
    expect(computeConcentrateSaltMgPerDrop(5, 0, 1)).toBe(0);
  });

  it('converts a target salt mass into drops', () => {
    expect(computeConcentrateDropsForSaltMass(40, 0.5)).toBeCloseTo(80, 5);
    expect(computeConcentrateDropsForSaltMass(17.61, 0.55)).toBeCloseTo(32.018, 3);
    expect(computeConcentrateDropsForSaltMass(40, 0)).toBe(0);
  });
});
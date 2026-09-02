urrentAfterStrictFill < target - 1e-8
            && extraPpm >= 0.5;
        });
      if (earnsMeaningfulCoverage) amount = wiggleAmount;
    }
    if (amount <= 0.01) continue;
    volumes[index] = Number((
      Math.floor((amount + 1e-9) / safeVolumeStepMl) * safeVolumeStepMl
    ).toFixed(volumePrecision));
    if (volumes[index] <= 0) continue;
    remainingVolume -= volumes[index];
    for (const id of ACTIVE_ION_IDS) {
      covered[id] += num(entry.ions[id] ?? '') * volumes[index];
    }
  }

  return entries.map((entry, index) => ({
    ...entry,
    volumeMl: volumes[index].toFixed(volumePrecision),
  }));
}
function watermancerPlanComparisonSignature(plan: WatermancerPlan): string {
  return JSON.stringify({
    targetIons: plan.targetIons,
    selectedSalts: plan.selectedSalts,
    fixedSaltDoses: plan.fixedSaltDoses,
    strategy: plan.strategy,
    saltObjective: plan.saltObjective,
    ionPriority: plan.ionPriority,
    allowOvershoot: plan.allowOvershoot,
    allowedOvershootIons: plan.allowedOvershootIons,
    overshootLimits: plan.overshootLimits,
    softDeficitIons: plan.softDeficitIons,
    softDeficitLimits: plan.softDeficitLimits,
    minimumSaltDosePpm: plan.minimumSaltDosePpm,
    overshootOrder: plan.overshootOrder,
    ionSourcePreferences: normalizeWatermancerIonSourcePreferences(plan.ionSourcePreferences),
  });
}

function watermancerWaterComparisonSignature(entries: MineralWaterEntry[]): string {
  return JSON.stringify(entries.map(entry => ({
    id: entry.id,
    volumeMl: entry.volumeMl,
  })));
}

export function watermancerRouteMatchesCurrentInputs(
  route: WatermancerRouteCandidate,
  plan: WatermancerPlan,
  baseWaters: MineralWaterEntry[],
  additionWaters: MineralWaterEntry[],
): boolean {
  return watermancerPlanComparisonSignature(route.plan) === watermancerPlanComparisonSignature(plan)
    && watermancerWaterComparisonSignature(route.baseWaters) === watermancerWaterComparisonSignature(baseWaters)
    && watermancerWaterComparisonSignature(route.additionWaters) === watermancerWaterComparisonSignature(additionWaters);
}

export function isWatermancerActionSnapshotCurrent(
  actionGeneration: number,
  currentGeneration: number,
  snapshotSignature: string,
  currentSignature: string,
): boolean {
  return actionGeneration === currentGeneration && snapshotSignature === currentSignature;
}

type WatermancerRouteDefinition = {
  id: string;
  kind: WatermancerRouteCandidate['kind'];
  label: string;
  explanation: string;
  fillWater: boolean;
  fillBaseOnly?: boolean;
  priority: IonId[];
  saltObjective: WatermancerSaltObjective;
  strategy: AutoCraftPreset;
};

type WatermancerRouteWaterBaseline = {
  baseWaters: MineralWaterEntry[];
  additionWaters: MineralWaterEntry[];
};

export function cloneWatermancerWaters(entries: MineralWaterEntry[]): MineralWaterEntry[] {
  return entries.map(entry => ({
    ...entry,
    ions: { ...entry.ions },
    metadata: { ...entry.metadata },
  }));
}

export function cloneWatermancerPlan(plan: WatermancerPlan): WatermancerPlan {
  return {
    ...plan,
    matchingMode: plan.matchingMode ?? 'target-values',
    targetIons: { ...plan.targetIons },
    selectedWaters: cloneWatermancerWaters(plan.selectedWaters),
    selectedSalts: [...plan.selectedSalts],
    fixedWaterVolumes: { ...plan.fixedWaterVolumes },
    fixedSaltDoses: { ...plan.fixedSaltDoses },
    ionPriority: [...plan.ionPriority],
    allowedOvershootIons: [...plan.allowedOvershootIons],
    overshootLimits: { ...plan.overshootLimits },
    softDeficitIons: plan.softDeficitIons ? [...plan.softDeficitIons] : undefined,
    softDeficitLimits: plan.softDeficitLimits ? { ...plan.softDeficitLimits } : undefined,
    minimumSaltDosePpm: plan.minimumSaltDosePpm ? { ...plan.minimumSaltDosePpm } : undefined,
    overshootOrder: [...plan.overshootOrder],
    ionSourcePreferences: normalizeWatermancerIonSourcePreferences(plan.ionSourcePreferences),
  };
}

export function cloneWatermancerRouteCandidate(route: WatermancerRouteCandidate): WatermancerRouteCandidate {
  return {
    ...route,
    plan: cloneWatermancerPlan(route.plan),
    baseWaters: cloneWatermancerWaters(route.baseWaters),
    additionWaters: cloneWatermancerWaters(route.additionWaters),
    saltTargets: { ...route.saltTargets },
    finalIons: { ...route.finalIons },
    deviations: route.deviations.map(deviation => ({ ...deviation })),
    overshoots: route.overshoots.map(overshoot => ({ ...overshoot })),
    ratioEvaluation: route.ratioEvaluation
      ? {
        ...route.ratioEvaluation,
        floorDeficits: { ...route.ratioEvaluation.floorDeficits },
        zeroTargetViolations: route.ratioEvaluation.zeroTargetViolations.map(violation => ({ ...violation })),
        relationships: route.ratioEvaluation.relationships.map(relationship => ({ ...relationship })),
        rankingKey: [...route.ratioEvaluation.rankingKey],
      }
      : undefined,
  };
}

export function watermancerRouteWaterInputs(
  currentBaseWaters: MineralWaterEntry[],
  currentAdditionWaters: MineralWaterEntry[],
  baseline: WatermancerRouteWaterBaseline | null,
): Pick<WatermancerRouteInputs, 'baseWaters' | 'additionWaters'> {
  return baseline
    ? {
      baseWaters: cloneWatermancerWaters(baseline.baseWaters),
      additionWaters: cloneWatermancerWaters(baseline.additionWaters),
    }
    : {
      baseWaters: cloneWatermancerWaters(currentBaseWaters),
      additionWaters: cloneWatermancerWaters(currentAdditionWaters),
    };
}

export function selectWatermancerRouteCandidate(
  candidates: WatermancerRouteCandidate[],
  activeRouteId?: string,
  activeRouteKind?: WatermancerRouteCandidate['kind'],
): WatermancerRouteCandidate | undefined {
  // Retained for solver regression tests and non-UI callers. The product
  // surface always uses the solver's primaryPlan directly.
  return (
    (activeRouteKind ? candidates.find(candidate => candidate.kind === activeRouteKind) : undefined)
    ?? (activeRouteId ? candidates.find(candidate => candidate.id === activeRouteId) : undefined)
    ?? candidates[0]
  );
}

export function executeWatermancerRouteCandidate(
  inputs: WatermancerRouteInputs,
  candidate: WatermancerRouteCandidate,
): WatermancerRouteCandidate {
  return executeWatermancerRoute(inputs, {
    id: candidate.id,
    kind: candidate.kind,
    label: candidate.label,
    explanation: candidate.explanation,
    fillWater: candidate.kind === 'use-more-water'
      || candidate.kind === 'prioritize-ions'
      || (candidate.kind === 'primary' && candidate.plan.strategy === 'water-first'),
    priority: candidate.plan.ionPriority,
    saltObjective: candidate.plan.saltObjective,
    strategy: candidate.plan.strategy,
  });
}

const ADDED_WATER_MINERAL_OVERSHOOT_RATIO = 0.3;
const ADDED_WATER_SALT_OVERSHOOT_RATIO = 0.1;
const ADDED_WATER_VOLUME_STEP_ML = 1;

type AddedWaterCandidateScore = {
  calciumCoverage: number;
  magnesiumCoverage: number;
  totalCoverage: number;
  totalExcess: number;
  totalVolume: number;
};

function scoreAddedWaterMineralCandidate(
  ions: Record<IonId, number>,
  target: Partial<Record<IonId, number>>,
  waters: MineralWaterEntry[],
): AddedWaterCandidateScore {
  const coverageFor = (id: IonId): number => {
    const targetValue = Math.max(target[id] ?? 0, 0);
    return targetValue > 0
      ? Math.min(Math.max(ions[id] ?? 0, 0) / targetValue, 1)
      : 0;
  };
  const totalCoverage = ACTIVE_ION_IDS.reduce(
    (total, id) => total + coverageFor(id),
    0,
  );
  const totalExcess = ACTIVE_ION_IDS.reduce((total, id) => (
    total + Math.max((ions[id] ?? 0) - Math.max(target[id] ?? 0, 0), 0)
  ), 0);
  return {
    calciumCoverage: coverageFor('calcium'),
    magnesiumCoverage: coverageFor('magnesium'),
    totalCoverage,
    totalExcess,
    totalVolume: waters.reduce((total, water) => total + num(water.volumeMl), 0),
  };
}

function compareAddedWaterMineralCandidates(
  left: AddedWaterCandidateScore,
  right: AddedWaterCandidateScore,
): number {
  return (
    right.calciumCoverage - left.calciumCoverage
    || right.magnesiumCoverage - left.magnesiumCoverage
    || right.totalCoverage - left.totalCoverage
    || left.totalExcess - right.totalExcess
    || left.totalVolume - right.totalVolume
  );
}

function addedWaterPhaseLimit(
  id: IonId,
  target: Partial<Record<IonId, number>>,
  ionSourcePreferences?: Partial<Record<IonId, WatermancerIonSourcePreference>>,
): number {
  if ((ionSourcePreferences?.[id] ?? 'dont-care') === 'salt-only') return 0;
  const targetValue = Math.max(target[id] ?? 0, 0);
  if (id === 'bicarbonate' || targetValue === 0) return targetValue;
  return targetValue * (1 + ADDED_WATER_MINERAL_OVERSHOOT_RATIO);
}

function addedWaterPhaseIsValid(
  ions: Record<IonId, number>,
  target: Partial<Record<IonId, number>>,
  ionSourcePreferences?: Partial<Record<IonId, WatermancerIonSourcePreference>>,
): boolean {
  return ACTIVE_ION_IDS.every(id => {
    const actual = ions[id] ?? 0;
    return actual <= addedWaterPhaseLimit(id, target, ionSourcePreferences) + 1e-7;
  });
}

function addedWaterSaltPolicy(
  target: Partial<Record<IonId, number>>,
  deviationMode: WatermancerBestMatchDeviationMode | undefined,
  ionSourcePreferences?: Partial<Record<IonId, WatermancerIonSourcePreference>>,
): WatermancerOvershootPolicy {
  const spectatorIons = ACTIVE_ION_IDS.filter(id => (
    id !== 'bicarbonate'
    && (target[id] ?? 0) > 0
  ));
  const softDeficitIons = deviationMode === 'permissive'
    ? ACTIVE_ION_IDS.filter(id => (target[id] ?? 0) > 0)
    : [];
  return {
    enabled: true,
    allowedIons: spectatorIons,
    maxPpm: Object.fromEntries(
      spectatorIons.map(id => [
        id,
        (target[id] ?? 0) * ADDED_WATER_SALT_OVERSHOOT_RATIO,
      ]),
    ),
    softDeficitIons,
    softDeficitLimits: Object.fromEntries(
      softDeficitIons.map(id => [id, (target[id] ?? 0) * 0.1]),
    ),
    priorityOrder: [...ACTIVE_ION_IDS],
    ionSourcePreferences: normalizeWatermancerIonSourcePreferences(ionSourcePreferences),
  };
}

function addedWaterFinalResultIsValid(
  finalIons: Record<IonId, number>,
  waterIons: Record<IonId, number>,
  target: Partial<Record<IonId, number>>,
  saltPolicy: WatermancerOvershootPolicy,
): boolean {
  return ACTIVE_ION_IDS.every(id => {
    const targetValue = Math.max(target[id] ?? 0, 0);
    const saltPhaseLimit = id === 'bicarbonate'
      ? targetValue
      : targetValue > 0
        ? targetValue + Math.max(saltPolicy.maxPpm[id] ?? 0, 0)
        : 0;
    const allowedLimit = Math.max(
      addedWaterPhaseLimit(id, target, saltPolicy.ionSourcePreferences),
      saltPhaseLimit,
      waterIons[id] ?? 0,
    );
    return (finalIons[id] ?? 0) <= allowedLimit + 1e-7;
  });
}

function executeAddedWaterMineralFirstRoute(
  inputs: WatermancerRouteInputs,
  definition: WatermancerRouteDefinition,
): WatermancerRouteCandidate {
  const { plan, batchMl, baseWaters, additionWaters } = inputs;
  const startingAdditions = cloneWatermancerWaters(additionWaters);
  const target = plan.targetIons;
  let workingAdditions = startingAdditions;
  let waterOnlyIons = computeWatermancerBottledIons(
    [...baseWaters, ...workingAdditions],
    batchMl,
  );
  let waterPhaseValid = addedWaterPhaseIsValid(
    waterOnlyIons,
    target,
    plan.ionSourcePreferences,
  );

  for (let index = 0; index < workingAdditions.length && waterPhaseValid; index += 1) {
    const currentVolume = num(workingAdditions[index].volumeMl);
    const otherVolume = baseWaters.reduce((total, water) => total + num(water.volumeMl), 0)
      + workingAdditions.reduce(
        (total, water, otherIndex) => otherIndex === index ? total : total + num(water.volumeMl),
        0,
      );
    const availableVolume = Math.max(batchMl - otherVolume, currentVolume);
    const maximumVolume = Math.max(
      currentVolume,
      Math.min(plan.maxWaterVolumeMl ?? AUTO_FILL_MAX_ML, availableVolume),
    );
    let bestCandidate = workingAdditions;
    let bestScore = scoreAddedWaterMineralCandidate(waterOnlyIons, target, workingAdditions);

    for (
      let candidateVolume = currentVolume + ADDED_WATER_VOLUME_STEP_ML;
      candidateVolume <= maximumVolume + 1e-7;
      candidateVolume += ADDED_WATER_VOLUME_STEP_ML
    ) {
      const candidateAdditions = workingAdditions.map((water, candidateIndex) => (
        candidateIndex === index
          ? { ...water, volumeMl: String(candidateVolume) }
          : { ...water }
      ));
      const candidateIons = computeWatermancerBottledIons(
        [...baseWaters, ...candidateAdditions],
        batchMl,
      );
       if (!addedWaterPhaseIsValid(candidateIons, target, plan.ionSourcePreferences)) continue;
      const candidateScore = scoreAddedWaterMineralCandidate(
        candidateIons,
        target,
        candidateAdditions,
      );
      if (compareAddedWaterMineralCandidates(candidateScore, bestScore) < 0) {
        bestCandidate = candidateAdditions;
        bestScore = candidateScore;
      }
    }
    workingAdditions = bestCandidate;
    waterOnlyIons = computeWatermancerBottledIons(
      [...baseWaters, ...workingAdditions],
      batchMl,
    );
    waterPhaseValid = addedWaterPhaseIsValid(waterOnlyIons, target);
  }

  const saltPolicy: WatermancerOvershootPolicy = {
    ...addedWaterSaltPolicy(
      target,
      plan.softDeficitIons && plan.softDeficitIons.length > 0 ? 'permissive' : 'strict',
      plan.ionSourcePreferences,
    ),
    matchingMode: plan.matchingMode,
  };
  const routePlan: WatermancerPlan = {
    ...cloneWatermancerPlan(plan),
    strategy: 'added-water-mineral-first',
    saltObjective: definition.saltObjective,
    ionPriority: [...definition.priority],
    overshootOrder: [...definition.priority],
    allowOvershoot: true,
    allowedOvershootIons: [...saltPolicy.allowedIons],
    overshootLimits: { ...saltPolicy.maxPpm },
    softDeficitIons: [...(saltPolicy.softDeficitIons ?? [])],
    softDeficitLimits: { ...(saltPolicy.softDeficitLimits ?? {}) },
  };
  const saltTargets = autoCraftSaltTargets(
    routePlan.selectedSalts,
    waterOnlyIons,
    routePlan.targetIons,
    routePlan.fixedSaltDoses,
    'closest-match',
    routePlan.saltObjective,
    saltPolicy,
  );
  const allSaltTargets = {
    ...routePlan.fixedSaltDoses,
    ...saltTargets,
  };
  const selectedWaters = [...baseWaters, ...workingAdditions];
  const finalIons = computeIonTotals(allSaltTargets, waterOnlyIons, 1);
  const deviations = watermancerRouteDeviations(finalIons, routePlan.targetIons);
  const overshoots = findIonOvershoots(finalIons, routePlan.targetIons);
  const qualityValid = waterPhaseValid && addedWaterFinalResultIsValid(
    finalIons,
    waterOnlyIons,
    routePlan.targetIons,
    saltPolicy,
  );
  const percentileDeviation = totalWatermancerDeviation(
    finalIons,
    routePlan.targetIons,
    routePlan,
  );
  const ghKhBalanceDeviation = watermancerGhKhBalanceDeviation(
    finalIons,
    routePlan.targetIons,
  );
  const practicalDeviation = watermancerPracticalIonDeviation(
    finalIons,
    routePlan.targetIons,
    routePlan.ionSourcePreferences,
  );
  const score = routePlan.matchingMode === 'ratios'
    ? percentileDeviation
    : percentileDeviation * 1_000_000
      + ghKhBalanceDeviation * WATERMANCER_GH_KH_SCORE_WEIGHT
      + practicalDeviation * WATERMANCER_PRACTICAL_SCORE_WEIGHT;
  const qualityPenalty = qualityValid ? 0 : 1_000_000_000_000;
  const candidatePlan: WatermancerPlan = {
    ...routePlan,
    selectedWaters,
    fixedWaterVolumes: Object.fromEntries(
      selectedWaters.map(entry => [entry.id, num(entry.volumeMl)]),
    ),
  };
  const ratioEvaluation: WatermancerRatioEvaluation | undefined = candidatePlan.matchingMode === 'ratios'
    ? evaluateWatermancerRatios(finalIons, candidatePlan.targetIons)
    : undefined;

  return {
    id: definition.id,
    kind: definition.kind,
    label: WATERMANCER_STRATEGY_LABELS['added-water-mineral-first'],
    explanation: 'Added waters maximize calcium and magnesium first while protecting bicarbonate; salts finish the remaining gaps with tighter spectator-ion limits.',
    plan: candidatePlan,
    baseWaters: baseWaters.map(entry => ({ ...entry })),
    additionWaters: workingAdditions,
    saltTargets: allSaltTargets,
    finalIons,
    deviations,
    overshoots,
    score: score + qualityPenalty,
    percentileDeviation,
    ghKhBalanceDeviation,
    practicalDeviation,
    ratioEvaluation,
    diagnostics: watermancerRouteDiagnostics({
      plan: candidatePlan,
      saltTargets: allSaltTargets,
      finalIons,
      deviations,
      score: score + qualityPenalty,
    }),
    qualityValid,
  };
}

function fillWatermancerRoute(
  inputs: WatermancerRouteInputs,
  fillWater: boolean,
  priority: IonId[],
  fillBaseOnly = false,
): { baseWaters: MineralWaterEntry[]; additionWaters: MineralWaterEntry[] } {
  if (!fillWater || inputs.batchMl <= 0) {
    return {
      baseWaters: inputs.baseWaters.map(entry => ({ ...entry })),
      additionWaters: inputs.additionWaters.map(entry => ({ ...entry })),
    };
  }

  if (fillBaseOnly) {
    const filledBaseWaters = autoFillWaterVolumes(
      inputs.baseWaters.map(entry => ({ ...entry })),
      inputs.batchMl,
      inputs.plan.targetIons,
      inputs.additionWaters.map(entry => ({ ...entry })),
      priority,
      0,
      true,
      false,
      1,
      0,
      {
        enabled: inputs.plan.matchingMode === 'ratios' || inputs.plan.allowOvershoot,
        matchingMode: inputs.plan.matchingMode,
        allowedIons: inputs.plan.matchingMode === 'ratios'
          ? ACTIVE_ION_IDS.filter(id => (inputs.plan.targetIons[id] ?? 0) > 0)
          : inputs.plan.allowedOvershootIons,
        maxPpm: inputs.plan.matchingMode === 'ratios'
          ? Object.fromEntries(
            ACTIVE_ION_IDS.map(id => [id, Math.max((inputs.plan.targetIons[id] ?? 0) * 4, 10)]),
          )
          : inputs.plan.overshootLimits,
        softDeficitIons: inputs.plan.softDeficitIons,
        softDeficitLimits: inputs.plan.softDeficitLimits,
        priorityOrder: inputs.plan.overshootOrder,
        ionSourcePreferences: inputs.plan.ionSourcePreferences,
      },
      inputs.plan.maxWaterVolumeMl,
    );
    return {
      baseWaters: filledBaseWaters,
      additionWaters: inputs.additionWaters.map(entry => ({ ...entry })),
    };
  }

  // Base and added waters are interchangeable source choices in Watermancer.
  // Filling them in two passes makes the first group consume the useful
  // mineral budget before the second group is considered. That is especially
  // harmful for waters such as S.Pellegrino, whose magnesium/sulfate profile
  // can replace a large amount of MgSO4. Allocate the combined inventory in a
  // single pass, then restore the original UI grouping.
  const allEntries = [
    ...inputs.baseWaters.map((entry, index) => ({ entry, group: 'base' as const, index })),
    ...inputs.additionWaters.map((entry, index) => ({ entry, group: 'addition' as const, index })),
  ];
  if (allEntries.length === 0) {
    return { baseWaters: [], additionWaters: [] };
  }

  const filledEntries = autoFillWaterVolumes(
    allEntries.map(({ entry }) => ({ ...entry })),
    inputs.batchMl,
    inputs.plan.targetIons,
    [],
    priority,
    0,
    true,
    false,
    1,
    0,
    {
      enabled: inputs.plan.matchingMode === 'ratios' || inputs.plan.allowOvershoot,
      matchingMode: inputs.plan.matchingMode,
      allowedIons: inputs.plan.matchingMode === 'ratios'
        ? ACTIVE_ION_IDS.filter(id => (inputs.plan.targetIons[id] ?? 0) > 0)
        : inputs.plan.allowedOvershootIons,
      maxPpm: inputs.plan.matchingMode === 'ratios'
        ? Object.fromEntries(
          ACTIVE_ION_IDS.map(id => [id, Math.max((inputs.plan.targetIons[id] ?? 0) * 4, 10)]),
        )
        : inputs.plan.overshootLimits,
      softDeficitIons: inputs.plan.softDeficitIons,
      softDeficitLimits: inputs.plan.softDeficitLimits,
      priorityOrder: inputs.plan.overshootOrder,
      ionSourcePreferences: inputs.plan.ionSourcePreferences,
    },
    inputs.plan.maxWaterVolumeMl,
  );

  return {
    baseWaters: filledEntries
      .filter((_, index) => allEntries[index].group === 'base')
      .map(entry => ({ ...entry })),
    additionWaters: filledEntries
      .filter((_, index) => allEntries[index].group === 'addition')
      .map(entry => ({ ...entry })),
  };
}

function executeWatermancerRoute(
  inputs: WatermancerRouteInputs,
  definition: WatermancerRouteDefinition,
): WatermancerRouteCandidate {
  if (definition.strategy === 'added-water-mineral-first') {
    return executeAddedWaterMineralFirstRoute(inputs, definition);
  }
  const routePlan: WatermancerPlan = {
    ...inputs.plan,
    strategy: definition.strategy,
    saltObjective: definition.saltObjective,
    ionPriority: definition.priority,
    overshootOrder: definition.kind === 'prioritize-ions'
      ? definition.priority
      : inputs.plan.overshootOrder,
  };
  const waters = fillWatermancerRoute(
    inputs,
    definition.fillWater,
    definition.priority,
    definition.fillBaseOnly,
  );
  const selectedWaters = [...waters.baseWaters, ...waters.additionWaters];
  const bottledIons = computeWatermancerBottledIons(selectedWaters, inputs.batchMl);
  const saltTargets = autoCraftSaltTargets(
    routePlan.selectedSalts,
    bottledIons,
    routePlan.targetIons,
    routePlan.fixedSaltDoses,
    routePlan.strategy,
    routePlan.saltObjective,
    {
      enabled: routePlan.matchingMode === 'ratios' || routePlan.allowOvershoot,
      matchingMode: routePlan.matchingMode,
      allowedIons: routePlan.matchingMode === 'ratios'
        ? ACTIVE_ION_IDS.filter(id => (routePlan.targetIons[id] ?? 0) > 0)
        : routePlan.allowedOvershootIons,
      maxPpm: routePlan.matchingMode === 'ratios'
        ? Object.fromEntries(
          ACTIVE_ION_IDS.map(id => [id, Math.max((routePlan.targetIons[id] ?? 0) * 4, 10)]),
        )
        : routePlan.overshootLimits,
      softDeficitIons: routePlan.softDeficitIons,
      softDeficitLimits: routePlan.softDeficitLimits,
      minimumSaltDosePpm: routePlan.minimumSaltDosePpm,
      priorityOrder: routePlan.overshootOrder,
      ionSourcePreferences: routePlan.ionSourcePreferences,
    },
  );
  const allSaltTargets = {
    ...routePlan.fixedSaltDoses,
    ...saltTargets,
  };
  const finalIons = computeIonTotals(
    allSaltTargets,
    bottledIons,
    1,
  );
  const deviations = watermancerRouteDeviations(finalIons, routePlan.targetIons);
  const overshoots = findIonOvershoots(finalIons, routePlan.targetIons);
  const overshootRank = new Map(
    normalizeWatermancerIonOrder(routePlan.overshootOrder).map((id, index) => [id, index]),
  );
  const policyScore = deviations.reduce((total, deviation) => {
    if (routePlan.ionSourcePreferences?.[deviation.id] === 'dont-care') {
      return total + optimizedIonDeviation(deviation.actual, deviation.target);
    }
    const allowance = routePlan.allowOvershoot
      && routePlan.allowedOvershootIons.includes(deviation.id)
      && (routePlan.targetIons[deviation.id] ?? 0) > 0
      ? Math.max(0, routePlan.overshootLimits[deviation.id] ?? 0)
      : 0;
    const excessBeyondAllowance = Math.max(deviation.delta - allowance, 0);
    const softDeficitAllowance = routePlan.allowOvershoot
      && routePlan.softDeficitIons?.includes(deviation.id)
      ? Math.max(0, routePlan.softDeficitLimits?.[deviation.id] ?? 0)
      : 0;
    const shortfall = Math.max(-deviation.delta - softDeficitAllowance, 0);
    const priorityWeight = IONS.length - (overshootRank.get(deviation.id) ?? IONS.length);
    const deficitWeight = routePlan.softDeficitIons?.includes(deviation.id) ? 2 : 12;
    return total + shortfall * (deficitWeight + priorityWeight / IONS.length)
      + excessBeyondAllowance * (4 + priorityWeight / IONS.length);
  }, 0);
  const targetGh = computeGH(completeIonTotals(routePlan.targetIons));
  const targetKh = computeKH(completeIonTotals(routePlan.targetIons));
  const finalGh = computeGH(finalIons);
  const finalKh = computeKH(finalIons);
  const percentileDeviation = totalWatermancerDeviation(
    finalIons,
    routePlan.targetIons,
    routePlan,
  );
  const ghKhBalanceDeviation = watermancerGhKhBalanceDeviation(
    finalIons,
    routePlan.targetIons,
  );
  const practicalDeviation = watermancerPracticalIonDeviation(
    finalIons,
    routePlan.targetIons,
    routePlan.ionSourcePreferences,
  );
  const score = routePlan.matchingMode === 'ratios'
    ? policyScore + (
      Math.abs(finalGh - targetGh) + Math.abs(finalKh - targetKh)
    ) * 1.5
    : percentileDeviation * 1_000_000
      + ghKhBalanceDeviation * WATERMANCER_GH_KH_SCORE_WEIGHT
      + practicalDeviation * WATERMANCER_PRACTICAL_SCORE_WEIGHT;
  const candidatePlan: WatermancerPlan = {
    ...routePlan,
    selectedWaters,
    fixedWaterVolumes: Object.fromEntries(
      selectedWaters.map(entry => [entry.id, num(entry.volumeMl)]),
    ),
  };
  const ratioEvaluation: WatermancerRatioEvaluation | undefined = candidatePlan.matchingMode === 'ratios'
    ? evaluateWatermancerRatios(finalIons, candidatePlan.targetIons)
    : undefined;
  return {
    id: definition.id,
    kind: definition.kind,
    label: definition.label,
    explanation: definition.explanation,
    plan: candidatePlan,
    baseWaters: waters.baseWaters,
    additionWaters: waters.additionWaters,
    saltTargets: allSaltTargets,
    finalIons,
    deviations,
    overshoots,
    score,
    percentileDeviation,
    ghKhBalanceDeviation,
    practicalDeviation,
    ratioEvaluation,
    diagnostics: watermancerRouteDiagnostics({
      plan: candidatePlan,
      saltTargets: allSaltTargets,
      finalIons,
      deviations,
      score,
    }),
  };
}

const GLACIAL_WATER_PRIORITY: IonId[] = [
  'calcium',
  'bicarbonate',
  'magnesium',
  'sodium',
  'potassium',
  'chloride',
  'sulfate',
  'citrates',
];

const GLACIAL_WATER_OVERSHOOT_POLICY: WatermancerOvershootPolicy = {
  enabled: true,
  allowedIons: ['potassium', 'chloride', 'sulfate'],
  // These are deliberately generous for the two ions the user is
  // disregarding. Potassium is limited to 3 ppm beyond its target.
  maxPpm: { potassium: 3, chloride: 100, sulfate: 100 },
  priorityOrder: GLACIAL_WATER_PRIORITY,
};

function saltIonFraction(saltId: string, ionId: IonId): number {
  return SALTS.find(salt => salt.id === saltId)
    ?.ions.find(contribution => contribution.ionId === ionId)
    ?.fraction ?? 0;
}

function glacialPracticalSaltDose(
  saltId: string,
  desiredPpm: number,
  plan: WatermancerPlan,
): number {
  if (!Number.isFinite(desiredPpm) || desiredPpm <= 0) return 0;
  const minimum = Math.max(0, Number(plan.minimumSaltDosePpm?.[saltId] ?? 0));
  return Number(Math.max(desiredPpm, minimum).toFixed(6));
}

function glacialSaltOrder(
  selectedSaltIds: string[],
  preferredIds: string[],
  ionId: IonId,
): string[] {
  return preferredIds
    .filter(id => selectedSaltIds.includes(id) && saltIonFraction(id, ionId) > 0);
}

function glacialAddSaltForIon(
  saltTargets: Record<string, number>,
  saltIds: string[],
  ionId: IonId,
  targetIons: Partial<Record<IonId, number>>,
  bottledIons: Record<IonId, number>,
  plan: WatermancerPlan,
  extraCeiling?: (saltId: string, dose: number, currentIons: Record<IonId, number>) => boolean,
): void {
  const currentIons = computeIonTotals(saltTargets, bottledIons, 1);
  const gap = Math.max((targetIons[ionId] ?? 0) - (currentIons[ionId] ?? 0), 0);
  if (gap <= 0.000001) return;

  for (const saltId of saltIds) {
    if (Object.prototype.hasOwnProperty.call(plan.fixedSaltDoses, saltId)) continue;
    const fraction = saltIonFraction(saltId, ionId);
    if (fraction <= 0) continue;
    const dose = glacialPracticalSaltDose(saltId, gap / fraction, plan);
    if (dose <= 0 || extraCeiling && !extraCeiling(saltId, dose, currentIons)) continue;
    saltTargets[saltId] = dose;
    return;
  }
}

function glacialCandidateScore(
  finalIons: Record<IonId, number>,
  targetIons: Partial<Record<IonId, number>>,
): number {
  const target = (id: IonId) => Math.max(targetIons[id] ?? 0, 0);
  const deficit = (id: IonId) => Math.max(target(id) - (finalIons[id] ?? 0), 0);
  const excess = (id: IonId) => Math.max((finalIons[id] ?? 0) - target(id), 0);
  const potassiumBeyondAllowance = Math.max(excess('potassium') - 3, 0);
  const sodiumBeyondAllowance = Math.max(excess('sodium') - 2, 0);

  // The weights encode the user's stop order: calcium and bicarbonate first,
  // then magnesium, then sodium. Sulfate and chloride intentionally have no
  // penalty; potassium only matters above the requested 3 ppm allowance.
  return deficit('calcium') * 10000
    + excess('bicarbonate') * 10000
    + potassiumBeyondAllowance * 10000
    + deficit('magnesium') * 1000
    + deficit('sodium') * 100
    + sodiumBeyondAllowance * 100
    + deficit('potassium') * 5
    + deficit('sulfate') * 0.25
    + deficit('chloride') * 0.1
    + deficit('bicarbonate') * 0.5;
}

export function craftGlacialStyleWatermancerMatch(
  inputs: WatermancerRouteInputs,
): WatermancerRouteCandidate | undefined {
  const { plan, batchMl, baseWaters, additionWaters } = inputs;
  if (batchMl <= 0 || (baseWaters.length === 0 && additionWaters.length === 0 && plan.selectedSalts.length === 0)) {
    return undefined;
  }

  const priorityVariants: IonId[][] = [
    GLACIAL_WATER_PRIORITY,
    ['calcium', 'bicarbonate', 'sodium', 'magnesium', 'potassium', 'chloride', 'sulfate', 'citrates'],
    ['calcium', 'magnesium', 'bicarbonate', 'sodium', 'potassium', 'chloride', 'sulfate', 'citrates'],
  ];
  const seenWaterSignatures = new Set<string>();
  const candidates: WatermancerRouteCandidate[] = [];

  for (const priority of priorityVariants) {
    const filledBaseWaters = autoFillWaterVolumes(
      baseWaters.map(entry => ({ ...entry })),
      batchMl,
      plan.targetIons,
      additionWaters.map(entry => ({ ...entry })),
      priority,
      0,
      true,
      false,
      1,
      0,
      GLACIAL_WATER_OVERSHOOT_POLICY,
    );
    const waterSignature = watermancerWaterComparisonSignature(filledBaseWaters);
    if (seenWaterSignatures.has(waterSignature)) continue;
    seenWaterSignatures.add(waterSignature);

    const selectedWaters = [...filledBaseWaters, ...additionWaters.map(entry => ({ ...entry }))];
    const bottledIons = computeWatermancerBottledIons(selectedWaters, batchMl);
    const saltTargets = { ...plan.fixedSaltDoses };

    // Phase 1: close calcium using the preferred calcium salts. Calcium
    // chloride is first because chloride overshoot is explicitly acceptable.
    glacialAddSaltForIon(
      saltTargets,
      glacialSaltOrder(plan.selectedSalts, ['cacl2', 'calact', 'cacit'], 'calcium'),
      'calcium',
      plan.targetIons,
      bottledIons,
      plan,
    );

    // Phase 2: finish magnesium with MgCl2 first, accepting its chloride.
    glacialAddSaltForIon(
      saltTargets,
      glacialSaltOrder(plan.selectedSalts, ['mgcl2', 'mgso4', 'mgcit'], 'magnesium'),
      'magnesium',
      plan.targetIons,
      bottledIons,
      plan,
    );

    // Phase 3: close sodium with NaCl. Sodium bicarbonate is only a fallback
    // when NaCl is not allowed and it cannot push bicarbonate above target.
    glacialAddSaltForIon(
      saltTargets,
      glacialSaltOrder(plan.selectedSalts, ['nacl', 'nahco3'], 'sodium'),
      'sodium',
      plan.targetIons,
      bottledIons,
      plan,
      (saltId, dose, currentIons) => saltId !== 'nahco3'
        || currentIons.bicarbonate + dose * saltIonFraction('nahco3', 'bicarbonate')
          <= (plan.targetIons.bicarbonate ?? 0) + 0.000001,
    );

    const finalIons = computeIonTotals(saltTargets, bottledIons, 1);
    const routePlan: WatermancerPlan = {
      ...cloneWatermancerPlan(plan),
      selectedWaters,
      fixedWaterVolumes: Object.fromEntries(
        selectedWaters.map(entry => [entry.id, num(entry.volumeMl)]),
      ),
    };
    const deviations = watermancerRouteDeviations(finalIons, routePlan.targetIons);
    candidates.push({
      id: 'glacial-style',
      kind: 'primary',
      label: 'Glacial-style match',
      explanation: 'Phased match: calcium was covered while protecting bicarbonate, then magnesium with MgCl₂, then sodium with NaCl. Sulfate and chloride excess are disregarded; potassium is allowed up to 3 ppm beyond target.',
      plan: routePlan,
      baseWaters: filledBaseWaters,
      additionWaters: additionWaters.map(entry => ({ ...entry })),
      saltTargets,
      finalIons,
      deviations,
      overshoots: findIonOvershoots(finalIons, routePlan.targetIons),
      score: glacialCandidateScore(finalIons, routePlan.targetIons),
    });
  }

  return [...candidates].sort((a, b) => a.score - b.score)[0];
}

export function recalculateWatermancerRouteAtCurrentVolumes(
  inputs: WatermancerRouteInputs,
  selectedCandidate: WatermancerRouteCandidate,
  selectedSaltTargets = selectedCandidate.saltTargets,
): WatermancerRouteCandidate {
  // Route application may fill water, but subsequent edits to the visible
  // volume controls must be treated as the user's current source volumes.
  // Keep the automatic match's salt dose fixed for this live preview so a
  // 1 mL water adjustment cannot be hidden by an automatic salt re-solve.
  const selectedWaters = [...inputs.baseWaters, ...inputs.additionWaters];
  const bottledIons = computeWatermancerBottledIons(selectedWaters, inputs.batchMl);
  const finalIons = computeIonTotals(selectedSaltTargets, bottledIons, 1);
  const deviations = watermancerRouteDeviations(finalIons, selectedCandidate.plan.targetIons);
  const routePlan: WatermancerPlan = {
    ...selectedCandidate.plan,
    selectedWaters,
    fixedWaterVolumes: Object.fromEntries(
      selectedWaters.map(entry => [entry.id, num(entry.volumeMl)]),
    ),
  };
  const ratioEvaluation: WatermancerRatioEvaluation | undefined = routePlan.matchingMode === 'ratios'
    ? evaluateWatermancerRatios(finalIons, routePlan.targetIons)
    : undefined;
  return {
    ...selectedCandidate,
    plan: routePlan,
    baseWaters: inputs.baseWaters.map(entry => ({ ...entry })),
    additionWaters: inputs.additionWaters.map(entry => ({ ...entry })),
    saltTargets: { ...selectedSaltTargets },
    finalIons,
    deviations,
    overshoots: findIonOvershoots(finalIons, selectedCandidate.plan.targetIons),
    ratioEvaluation,
  };
}

export function watermancerRouteDeviations(
  actual: Record<IonId, number>,
  target: Partial<Record<IonId, number>>,
): WatermancerIonDeviation[] {
  return IONS.map(({ id }) => {
    const actualValue = actual[id] ?? 0;
    const targetValue = target[id] ?? 0;
    return {
      id,
      actual: actualValue,
      target: targetValue,
      delta: actualValue - targetValue,
    };
  });
}

export function watermancerDeviationBeyondPolicy(
  deviation: WatermancerIonDeviation,
  plan: WatermancerPlan,
): number {
  const allowance = plan.allowOvershoot
    && plan.allowedOvershootIons.includes(deviation.id)
    && deviation.target > 0
    ? Math.max(0, plan.overshootLimits[deviation.id] ?? 0)
    : 0;
  if (deviation.delta >= 0) return Math.max(deviation.delta - allowance, 0);
  const softDeficitAllowance = plan.allowOvershoot
    && plan.softDeficitIons?.includes(deviation.id)
    ? Math.max(0, plan.softDeficitLimits?.[deviation.id] ?? 0)
    : 0;
  return Math.min(deviation.delta + softDeficitAllowance, 0);
}

function watermancerPolicyAllowanceFor(
  deviation: WatermancerIonDeviation,
  plan: WatermancerPlan,
): number {
  if (deviation.delta >= 0) {
    return plan.allowOvershoot
      && plan.allowedOvershootIons.includes(deviation.id)
      && deviation.target > 0
      ? Math.max(0, plan.overshootLimits[deviation.id] ?? 0)
      : 0;
  }
  return plan.allowOvershoot && plan.softDeficitIons?.includes(deviation.id)
    ? Math.max(0, plan.softDeficitLimits?.[deviation.id] ?? 0)
    : 0;
}

function watermancerConflictSeverity(outsidePolicyPpm: number): WatermancerIonConflict['severity'] {
  if (outsidePolicyPpm >= 10) return 'critical';
  if (outsidePolicyPpm >= 1) return 'warning';
  return 'notice';
}

function watermancerConflictSource(
  ionId: IonId,
  waterIons: Partial<Record<IonId, number>>,
  saltIons: Partial<Record<IonId, number>>,
): WatermancerIonConflict['source'] {
  const waterContribution = Math.max(0, waterIons[ionId] ?? 0);
  const saltContribution = Math.max(0, saltIons[ionId] ?? 0);
  if (waterContribution > 0.05 && saltContribution > 0.05) return 'mixed';
  if (waterContribution > 0.05) return 'water';
  return 'salts';
}

function watermancerConflictRecommendations(
  conflicts: WatermancerIonConflict[],
  plan: WatermancerPlan,
  saltTargets: Record<string, number>,
): WatermancerMatchRecommendation[] {
  const fixedSaltIds = new Set(Object.keys(plan.fixedSaltDoses));
  const selectedSaltIds = plan.selectedSalts.filter(id => !fixedSaltIds.has(id));
  const recommendations: WatermancerMatchRecommendation[] = [];
  const addRecommendation = (recommendation: WatermancerMatchRecommendation): void => {
    if (recommendations.some(existing => (
      existing.kind === recommendation.kind
      && existing.ionIds.join(',') === recommendation.ionIds.join(',')
    ))) return;
    if (recommendations.length < 4) recommendations.push(recommendation);
  };

  conflicts.forEach(conflict => {
    const ionName = ION_MAP[conflict.id].name;
    const preference = plan.ionSourcePreferences?.[conflict.id] ?? 'dont-care';
    const contributingFixedSalts = Object.keys(plan.fixedSaltDoses)
      .filter(saltId => (saltTargets[saltId] ?? 0) > 0 && saltIonFraction(saltId, conflict.id) > 0)
      .map(saltId => SALTS.find(salt => salt.id === saltId)?.name ?? saltId);
    const availableSalts = selectedSaltIds.filter(saltId => (
      saltIonFraction(saltId, conflict.id) > 0
      && (saltTargets[saltId] ?? 0) <= 0.000001
    ));

    if (conflict.direction === 'deficit') {
      if (preference === 'water-only' || preference === 'salt-only') {
        addRecommendation({
          kind: 'relax-source-preference',
          ionIds: [conflict.id],
          label: `Relax the ${ionName} source preference`,
          rationale: `The current ${preference} rule limits how Watermancer can cover the ${ionName} deficit.`,
          action: {
            type: 'relax-source-preference',
            ionId: conflict.id,
          },
        });
      } else if (availableSalts.length > 0) {
        const saltId = availableSalts[0];
        const saltName = SALTS.find(salt => salt.id === saltId)?.name ?? saltId;
        addRecommendation({
          kind: 'enable-salt',
          ionIds: [conflict.id],
          label: `Enable ${saltName} for ${ionName}`,
          rationale: 'An optional selected salt can cover this gap without changing the target automatically.',
          action: {
            type: 'enable-salt',
            saltId,
          },
        });
      } else if (!plan.allowOvershoot || !plan.softDeficitIons?.includes(conflict.id)) {
        const limitPpm = Math.max(1, Math.min(10, Math.ceil(conflict.outsidePolicyPpm)));
        addRecommendation({
          kind: 'allow-policy-room',
          ionIds: [conflict.id],
          label: `Allow a small ${ionName} deficit`,
          rationale: `Allowing up to ${limitPpm} ppm of controlled policy room could reduce the remaining ${ionName} gap while preserving the coupled match.`,
          action: {
            type: 'allow-policy-room',
            ionId: conflict.id,
            limitPpm,
          },
        });
      } else {
        addRecommendation({
          kind: 'add-source',
          ionIds: [conflict.id],
          label: `Add a source with more ${ionName}`,
          rationale: `The selected sources cannot provide enough ${ionName} for this target.`,
          action: {
            type: 'review-controls',
            focus: 'waters',
          },
        });
      }
    } else if (contributingFixedSalts.length > 0) {
      addRecommendation({
        kind: 'fixed-dose-constraint',
        ionIds: [conflict.id],
        label: `Review the fixed salt dose adding ${ionName}`,
        rationale: `A fixed dose of ${contributingFixedSalts.join(', ')} contributes to this excess and is not available to the matcher.`,
        action: {
          type: 'review-controls',
          focus: 'salts',
        },
      });
    } else {
      addRecommendation({
        kind: 'reduce-source',
        ionIds: [conflict.id],
        label: `Reduce the source adding excess ${ionName}`,
        rationale: `The current water and salt combination contributes more ${ionName} than the target allows.`,
        action: {
          type: 'review-controls',
          focus: 'waters',
        },
      });
    }
  });

  return recommendations;
}

function watermancerRouteDiagnostics(
  route: Pick<WatermancerRouteCandidate, 'plan' | 'saltTargets' | 'finalIons' | 'deviations' | 'score'>,
): WatermancerMatchDiagnostics {
  const { plan, deviations, saltTargets, finalIons, score } = route;
  const policyAllowancePpm = deviations.reduce((total, deviation) => {
    return total + watermancerPolicyAllowanceFor(deviation, plan);
  }, 0);
  const policyViolations = deviations
    .map(deviation => watermancerDeviationBeyondPolicy(deviation, plan))
    .filter(value => Math.abs(value) > 0.05);
  const fixedSaltIds = Object.keys(plan.fixedSaltDoses);
  const optionalSaltIds = plan.selectedSalts.filter(id => !fixedSaltIds.includes(id));
  const omittedOptionalSaltIds = optionalSaltIds.filter(id => (saltTargets[id] ?? 0) <= 0.000001);
  const saltIons = computeIonTotals(saltTargets, {}, 1);
  const waterIons = computeWatermancerBottledIons(
    [...route.plan.selectedWaters],
    route.plan.selectedWaters.reduce((total, water) => total + num(water.volumeMl), 0),
  );
  const conflicts = deviations
    .map((deviation): WatermancerIonConflict => {
      const allowedDelta = watermancerPolicyAllowanceFor(deviation, plan);
      const outsidePolicyPpm = Math.abs(watermancerDeviationBeyondPolicy(deviation, plan));
      return {
        id: deviation.id,
        actual: finalIons[deviation.id] ?? deviation.actual,
        target: Math.max(0, deviation.target),
        delta: deviation.delta,
        allowedDelta,
        outsidePolicyPpm,
        direction: deviation.delta < 0 ? 'deficit' : 'excess',
        severity: watermancerConflictSeverity(outsidePolicyPpm),
        source: watermancerConflictSource(deviation.id, waterIons, saltIons),
      };
    })
    .filter(conflict => conflict.outsidePolicyPpm > 0.05)
    .sort((a, b) => (
      b.outsidePolicyPpm - a.outsidePolicyPpm
      || ACTIVE_ION_IDS.indexOf(a.id) - ACTIVE_ION_IDS.indexOf(b.id)
    ))
    .slice(0, 6);
  const honoredSourcePreferenceIons = ACTIVE_ION_IDS.filter(id => {
    const preference = plan.ionSourcePreferences?.[id] ?? 'dont-care';
    const saltContribution = saltIons[id] ?? 0;
    const waterContribution = waterIons[id] ?? 0;
    const target = Math.max(plan.targetIons[id] ?? 0, 0);
    if (preference === 'water-only') return saltContribution <= 0.05;
    if (preference === 'salt-only') return waterContribution <= 0.05;
    if (preference === 'water-then-salt') {
      return saltContribution <= Math.max(target - waterContribution, 0) + 0.05;
    }
    return false;
  });
  return {
    targetDeviationPpm: deviations.reduce((total, deviation) => total + Math.abs(deviation.delta), 0),
    policyAllowancePpm,
    policyViolationPpm: policyViolations.reduce((total, value) => total + Math.abs(value), 0),
    policyViolationCount: policyViolations.length,
    fixedSaltIds,
    optionalSaltIds,
    omittedOptionalSaltIds,
    honoredSourcePreferenceIons,
    solverScore: score,
    conflicts,
    recommendations: watermancerConflictRecommendations(conflicts, plan, saltTargets),
  };
}

function watermancerPrimaryExplanation(
  primary: WatermancerRouteCandidate,
  alternatives: WatermancerRouteCandidate[],
): string {
  const diagnostics = primary.diagnostics;
  if (!diagnostics) return primary.explanation;
  const reasons: string[] = [];
  if (primary.plan.matchingMode === 'ratios' && primary.ratioEvaluation) {
    const ratio = primary.ratioEvaluation;
    if (ratio.zeroTargetProtectionSatisfied) reasons.push('protects every zero-target ion');
    else reasons.push(`exceeds ${ratio.zeroTargetViolations.length} zero-target ion${ratio.zeroTargetViolations.length === 1 ? '' : 's'}`);
    if (ratio.positiveFloorSatisfied) reasons.push('reaches every positive-ion minimum');
    else reasons.push(`leaves ${ratio.floorDeficitTotal.toFixed(1)} ppm of positive-ion minimums unmet`);
    reasons.push(`balances the requested relationships with ${ratio.aggregateRatioError.toFixed(2)} aggregate ratio error`);
    return `The ratio-mode route wins because it ${reasons.join(', ')}.`;
  }
  const bestAlternative = alternatives
    .filter(candidate => candidate.diagnostics)
    .sort((a, b) => (a.diagnostics!.policyViolationCount - b.diagnostics!.policyViolationCount)
      || (a.score - b.score))[0];
  if (diagnostics.policyViolationCount === 0) reasons.push('keeps every gap and overshoot within policy');
  else reasons.push(`leaves ${diagnostics.policyViolationCount} ion ${diagnostics.policyViolationCount === 1 ? 'deviation' : 'deviations'} outside policy`);
  if (diagnostics.honoredSourcePreferenceIons.length > 0) {
    reasons.push(`honors ${diagnostics.honoredSourcePreferenceIons.length} source preference${diagnostics.honoredSourcePreferenceIons.length === 1 ? '' : 's'}`);
  }
  if (diagnostics.fixedSaltIds.length > 0) {
    reasons.push(`holds ${diagnostics.fixedSaltIds.length} fixed dose${diagnostics.fixedSaltIds.length === 1 ? '' : 's'}`);
  }
  if (diagnostics.omittedOptionalSaltIds.length > 0) {
    reasons.push(`omits ${diagnostics.omittedOptionalSaltIds.length} optional salt${diagnostics.omittedOptionalSaltIds.length === 1 ? '' : 's'} that would add a worse counter-ion`);
  }
  if (bestAlternative && bestAlternative !== primary
    && bestAlternative.diagnostics!.policyViolationCount > diagnostics.policyViolationCount) {
    reasons.push('outperforms the other routes on policy violations');
  }
  return `The primary route wins because it ${reasons.join(', ')}.`;
}

export function totalWatermancerDeviation(
  actual: Partial<Record<IonId, number>>,
  target: Partial<Record<IonId, number>>,
  plan: WatermancerPlan,
): number {
  return watermancerRouteDeviations(
    Object.fromEntries(
      IONS.map(({ id }) => [id, actual[id] ?? 0]),
    ) as Record<IonId, number>,
    target,
  ).reduce(
    (total, deviation) => (
      total + (
        plan.ionSourcePreferences?.[deviation.id] === 'dont-care'
          ? optimizedIonDeviation(deviation.actual, deviation.target)
          : Math.abs(watermancerDeviationBeyondPolicy(deviation, plan))
      )
    ),
    0,
  );
}

export function totalWatermancerAbsoluteDeviation(
  actual: Partial<Record<IonId, number>>,
  target: Partial<Record<IonId, number>>,
  tolerance = 0.05,
): number {
  const displayTolerance = Math.max(0, tolerance);
  return watermancerRouteDeviations(
    Object.fromEntries(
      IONS.map(({ id }) => [id, actual[id] ?? 0]),
    ) as Record<IonId, number>,
    target,
  ).reduce(
    (total, deviation) => total + Math.max(Math.abs(deviation.delta) - displayTolerance, 0),
    0,
  );
}

export function applyWatermancerBestMatchDeviationMode(
  plan: WatermancerPlan,
  mode: WatermancerBestMatchDeviationMode,
): WatermancerPlan {
  const targetIonIds = IONS
    .filter(({ id }) => (plan.targetIons[id] ?? 0) > 0)
    .map(({ id }) => id);
  const configuredOvershootEnabled = plan.allowOvershoot === true;
  const configuredAllowedOvershootIons = configuredOvershootEnabled
    ? [...plan.allowedOvershootIons]
    : [];
  const configuredOvershootLimits = configuredOvershootEnabled
    ? { ...plan.overshootLimits }
    : {};

  return {
    ...plan,
    // Permissive deficit tolerance needs the policy path enabled, but it must
    // not turn on positive overshoot when the user's overshoot policy is off.
    allowOvershoot: configuredOvershootEnabled || mode === 'permissive',
    allowedOvershootIons: configuredAllowedOvershootIons,
    overshootLimits: configuredOvershootLimits,
    softDeficitIons: mode === 'permissive' ? targetIonIds : [],
    softDeficitLimits: mode === 'permissive'
      ? Object.fromEntries(targetIonIds.map(id => [id, Math.max(plan.targetIons[id] ?? 0, 0) * 0.1]))
      : {},
  };
}

export type WatermancerBestMatchCandidate = {
  strategy: WatermancerStrategy;
  deviationMode: WatermancerBestMatchDeviationMode;
  saltObjective: WatermancerSaltObjective;
  priorityPreset: Exclude<AutoFillPriorityPreset, 'custom'>;
  priority: IonId[];
  result: WatermancerSolverResult;
  route: WatermancerRouteCandidate;
  totalDeviation: number;
  percentileDeviation?: number;
  ghKhBalanceDeviation?: number;
  practicalDeviation?: number;
};

const WATERMANCER_BEST_MATCH_STRATEGIES: WatermancerStrategy[] = [
  'closest-match',
  'water-first',
  'gh-kh-harmony',
  'added-water-mineral-first',
];

const WATERMANCER_BEST_MATCH_DEVIATION_MODES: WatermancerBestMatchDeviationMode[] = [
  'strict',
  'permissive',
];

const WATERMANCER_BEST_MATCH_SALT_OBJECTIVES: WatermancerSaltObjective[] = [
  'balanced',
  'coverage',
];

const WATERMANCER_BEST_MATCH_PRIORITY_PRESETS: Array<Exclude<AutoFillPriorityPreset, 'custom'>> = [
  'mineral-first',
  'bicarbonate-first',
  'balanced-gh-kh',
];

function watermancerSolverStatusRank(status: WatermancerSolverResult['status']): number {
  return status === 'matched' ? 0 : status === 'partial' ? 1 : 2;
}

export function selectBestWatermancerMatchCandidate(
  candidates: WatermancerBestMatchCandidate[],
  currentStrategy: WatermancerStrategy,
  currentSaltObjective: WatermancerSaltObjective = 'balanced',
  currentPriorityPreset: Exclude<AutoFillPriorityPreset, 'custom'> = 'mineral-first',
): WatermancerBestMatchCandidate | undefined {
  return candidates
    .filter(candidate => candidate.route.qualityValid !== false)
    .sort((a, b) => {
    const ratioMode = a.route.plan?.matchingMode === 'ratios'
      || b.route.plan?.matchingMode === 'ratios';
    if (ratioMode && a.route.ratioEvaluation && b.route.ratioEvaluation) {
      const ratioDifference = compareWatermancerRatioEvaluations(
        a.route.ratioEvaluation,
        b.route.ratioEvaluation,
      );
      if (ratioDifference !== 0) return ratioDifference;
    } else {
      const percentileDifference = (
        (a.percentileDeviation ?? a.totalDeviation)
        - (b.percentileDeviation ?? b.totalDeviation)
      );
      if (Math.abs(percentileDifference) > WATERMANCER_PERCENTILE_TIE_EPSILON) {
        return percentileDifference;
      }
      const ghKhDifference = (
        (a.ghKhBalanceDeviation ?? a.route.ghKhBalanceDeviation ?? 0)
        - (b.ghKhBalanceDeviation ?? b.route.ghKhBalanceDeviation ?? 0)
      );
      if (Math.abs(ghKhDifference) > WATERMANCER_GH_KH_TIE_EPSILON) {
        return ghKhDifference;
      }
      const practicalDifference = (
        (a.practicalDeviation ?? a.route.practicalDeviation ?? 0)
        - (b.practicalDeviation ?? b.route.practicalDeviation ?? 0)
      );
      if (Math.abs(practicalDifference) > 1e-7) return practicalDifference;
    }

    const statusDifference = watermancerSolverStatusRank(a.result.status)
      - watermancerSolverStatusRank(b.result.status);
    if (statusDifference !== 0) return statusDifference;

    if (a.deviationMode !== b.deviationMode) {
      return a.deviationMode === 'strict' ? -1 : 1;
    }

    const currentDifference = Number(b.strategy === currentStrategy) - Number(a.strategy === currentStrategy);
    if (currentDifference !== 0) return currentDifference;

    const objectiveDifference = Number(b.saltObjective === currentSaltObjective)
      - Number(a.saltObjective === currentSaltObjective);
    if (objectiveDifference !== 0) return objectiveDifference;

    const priorityDifference = Number(b.priorityPreset === currentPriorityPreset)
      - Number(a.priorityPreset === currentPriorityPreset);
    if (priorityDifference !== 0) return priorityDifference;

    return (
      WATERMANCER_BEST_MATCH_STRATEGIES.indexOf(a.strategy)
      - WATERMANCER_BEST_MATCH_STRATEGIES.indexOf(b.strategy)
    ) || (
      WATERMANCER_BEST_MATCH_SALT_OBJECTIVES.indexOf(a.saltObjective)
      - WATERMANCER_BEST_MATCH_SALT_OBJECTIVES.indexOf(b.saltObjective)
    ) || (
      WATERMANCER_BEST_MATCH_PRIORITY_PRESETS.indexOf(a.priorityPreset)
      - WATERMANCER_BEST_MATCH_PRIORITY_PRESETS.indexOf(b.priorityPreset)
    );
    })[0];
}

export function findBestWatermancerMatch({
  plan,
  batchMl,
  baseWaters,
  additionWaters,
}: WatermancerRouteInputs): {
  candidates: WatermancerBestMatchCandidate[];
  winner?: WatermancerBestMatchCandidate;
} {
  const candidates = WATERMANCER_BEST_MATCH_STRATEGIES.flatMap(strategy => (
    WATERMANCER_BEST_MATCH_SALT_OBJECTIVES.flatMap(saltObjective => (
      WATERMANCER_BEST_MATCH_PRIORITY_PRESETS.flatMap(priorityPreset => (
        WATERMANCER_BEST_MATCH_DEVIATION_MODES.map(deviationMode => {
          const priority = AUTO_FILL_PRIORITY_PRESETS[priorityPreset].ions;
          const candidatePlan = applyWatermancerBestMatchDeviationMode(
            {
              ...plan,
              strategy,
              saltObjective,
              ionPriority: [...priority],
              overshootOrder: [...priority],
            },
            deviationMode,
          );
          const route = executeWatermancerRoute(
            {
              plan: candidatePlan,
              batchMl,
              baseWaters,
              additionWaters,
            },
            {
              id: 'best-match',
              kind: 'primary',
              label: 'Closest match',
              explanation: 'Evaluate this complete matching configuration with added waters fixed and base waters filled automatically.',
              fillWater: true,
              fillBaseOnly: true,
              priority,
              saltObjective,
              strategy,
            },
          );
          const meaningfulDeviations = route.deviations.filter(deviation => (
            Math.abs(watermancerDeviationBeyondPolicy(deviation, route.plan)) > 0.05
          ));
          const status: WatermancerSolverResult['status'] = batchMl <= 0
            || (candidatePlan.selectedWaters.length === 0 && candidatePlan.selectedSalts.length === 0)
            || route.qualityValid === false
            ? 'blocked'
            : candidatePlan.matchingMode === 'ratios'
              ? route.ratioEvaluation?.positiveFloorSatisfied
                && route.ratioEvaluation.zeroTargetProtectionSatisfied
                ? 'matched'
                : 'partial'
              : meaningfulDeviations.length === 0
                ? 'matched'
                : 'partial';
          const result: WatermancerSolverResult = {
            primaryPlan: route,
            alternatives: [],
            status,
            finalIons: route.finalIons,
            deviations: route.deviations,
            overshoots: route.overshoots,
            explanation: status === 'matched'
              ? 'The complete matching configuration reaches the requested ionic targets within tolerance.'
              : 'This complete matching configuration is the best available result for its selected settings.',
          };
          return {
            strategy,
            saltObjective,
            priorityPreset,
            priority: [...priority],
            deviationMode,
            result,
            route,
            totalDeviation: totalWatermancerDeviation(
              route.finalIons,
              candidatePlan.targetIons,
              route.plan,
            ),
             percentileDeviation: route.percentileDeviation,
             ghKhBalanceDeviation: route.ghKhBalanceDeviation,
             practicalDeviation: route.practicalDeviation,
          };
        })
      ))
    ))
  ));

  const currentPriorityPreset = WATERMANCER_BEST_MATCH_PRIORITY_PRESETS.find(preset => (
    AUTO_FILL_PRIORITY_PRESETS[preset].ions.every((id, index) => plan.ionPriority[index] === id)
    && plan.ionPriority.length === AUTO_FILL_PRIORITY_PRESETS[preset].ions.length
  )) ?? 'mineral-first';
  const winner = selectBestWatermancerMatchCandidate(
    candidates,
    plan.strategy,
    plan.saltObjective,
    currentPriorityPreset,
  );
  return {
    candidates,
    winner: winner && winner.result.status !== 'blocked' ? winner : undefined,
  };
}

export function solveWatermancerRoutes({
  plan,
  batchMl,
  baseWaters,
  additionWaters,
}: WatermancerRouteInputs): WatermancerSolverResult {
  const currentPriority = [...plan.ionPriority];
  const currentBottledIons = computeWatermancerBottledIons(
    [...baseWaters, ...additionWaters],
    batchMl,
  );
  const shortfallPriority = [...ACTIVE_ION_IDS].sort((a, b) => {
    const shortfallA = Math.max((plan.targetIons[a] ?? 0) - (currentBottledIons[a] ?? 0), 0);
    const shortfallB = Math.max((plan.targetIons[b] ?? 0) - (currentBottledIons[b] ?? 0), 0);
    return shortfallB - shortfallA || currentPriority.indexOf(a) - currentPriority.indexOf(b);
  });
  const routeDefinitions: WatermancerRouteDefinition[] = [
    {
      id: 'primary',
      kind: 'primary',
      label: 'Primary match',
      explanation: 'Use the selected matching strategy with the current water and salt boundaries.',
      fillWater: plan.strategy === 'water-first',
      priority: currentPriority,
      saltObjective: plan.saltObjective,
      strategy: plan.strategy,
    },
    {
      id: 'use-more-water',
      kind: 'use-more-water',
      label: 'Use more water',
      explanation: 'Increase selected water coverage first, then use salts to close the remaining ionic gaps.',
      fillWater: true,
      priority: currentPriority,
      saltObjective: 'balanced',
      strategy: 'water-first',
    },
    {
      id: 'use-more-salts',
      kind: 'use-more-salts',
      label: 'Use more salts',
      explanation: 'Keep the current water volumes and balance salt doses against the complete ionic target, including coupled-ion limits.',
      fillWater: false,
      priority: currentPriority,
      // Salt-led is already distinguished by not adding more source water.
      // Use the balanced objective here so a coverage preference cannot trade
      // a missing target ion for a discounted coupled-ion overshoot.
      saltObjective: 'balanced',
      strategy: plan.strategy,
    },
    {
      id: 'prioritize-ions',
      kind: 'prioritize-ions',
      label: 'Prioritize ions',
      explanation: 'Use water first, ordering source selection around the ions with the largest current shortfalls.',
      fillWater: true,
      priority: shortfallPriority,
      saltObjective: 'coverage',
      strategy: 'water-first',
    },
  ];

  const candidates = routeDefinitions.map(definition => executeWatermancerRoute(
    { plan, batchMl, baseWaters, additionWaters },
    definition,
  ));

  const policyViolationCount = (candidate: WatermancerRouteCandidate): number => (
    candidate.deviations.filter(deviation => (
      Math.abs(watermancerDeviationBeyondPolicy(deviation, candidate.plan)) > 0.05
    )).length
  );
  const primaryCandidate = plan.matchingMode === 'ratios'
    ? [...candidates]
      .filter(candidate => candidate.qualityValid !== false)
      .sort((a, b) => (
        a.ratioEvaluation && b.ratioEvaluation
          ? compareWatermancerRatioEvaluations(a.ratioEvaluation, b.ratioEvaluation)
          : a.score - b.score
      ))[0] ?? candidates[0]
    : [...candidates].sort((a, b) => (
      policyViolationCount(a) - policyViolationCount(b) || a.score - b.score
    ))[0];
  const primaryPlan: WatermancerRouteCandidate = {
    ...primaryCandidate,
    id: 'primary',
    label: 'Primary match',
  };
  const alternatives = candidates
    .filter(candidate => candidate.id !== primaryCandidate.id)
    .map(candidate => candidate.id === 'primary'
      ? {
        ...candidate,
        id: 'balanced',
        label: 'Balanced match',
        explanation: 'Use the selected matching strategy with the current water and salt boundaries.',
      }
      : candidate);
  const meaningfulDeviations = primaryPlan.deviations
    .filter(item => Math.abs(watermancerDeviationBeyondPolicy(item, primaryPlan.plan)) > 0.05);
   const status: WatermancerSolverResult['status'] = batchMl <= 0
     || (plan.selectedWaters.length === 0 && plan.selectedSalts.length === 0)
     ? 'blocked'
     : plan.matchingMode === 'ratios'
       ? primaryPlan.ratioEvaluation?.positiveFloorSatisfied
         && primaryPlan.ratioEvaluation.zeroTargetProtectionSatisfied
         ? 'matched'
         : 'partial'
       : meaningfulDeviations.length === 0
         ? 'matched'
         : 'partial';

  return {
    primaryPlan,
    alternatives,
    status,
    finalIons: primaryPlan.finalIons,
    deviations: primaryPlan.deviations,
    overshoots: primaryPlan.overshoots,
    explanation: watermancerPrimaryExplanation(primaryPlan, alternatives),
  };
}

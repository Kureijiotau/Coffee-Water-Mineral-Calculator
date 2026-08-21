import { ACTIVE_ION_IDS, IONS, type IonId } from './waterData';
import type {
  WatermancerIonConflict,
  WatermancerMatchRecommendation,
  WatermancerRouteCandidate,
} from './watermancerPlan';

/** Sensory and practical priorities for the independent Gemini ranking lane. */
export type GeminiChemistryPolicy = {
  /** A hard-feasibility violation is multiplied by this value. */
  hardViolationWeight: number;
  bicarbonateWeight: number;
  ghBalanceWeight: number;
  counterIonWeight: number;
  sulfateHarshnessWeight: number;
  sodiumCostWeight: number;
  sodiumHeadroomPpm: number;
  practicalMinimumDosePpm: Partial<Record<string, number>>;
  sourcePreferences: Partial<Record<IonId, 'water-only' | 'water-then-salt' | 'salt-only' | 'dont-care'>>;
  preferFixedDoses: boolean;
  preferSourceWater: boolean;
};

export const DEFAULT_GEMINI_CHEMISTRY_POLICY: GeminiChemistryPolicy = {
  hardViolationWeight: 1000,
  bicarbonateWeight: 4,
  ghBalanceWeight: 2,
  counterIonWeight: 1,
  sulfateHarshnessWeight: 4,
  sodiumCostWeight: 2,
  sodiumHeadroomPpm: 10,
  practicalMinimumDosePpm: {},
  sourcePreferences: {},
  preferFixedDoses: true,
  preferSourceWater: true,
};

function policyWithDefaults(policy?: Partial<GeminiChemistryPolicy>): GeminiChemistryPolicy {
  return { ...DEFAULT_GEMINI_CHEMISTRY_POLICY, ...policy,
    practicalMinimumDosePpm: { ...DEFAULT_GEMINI_CHEMISTRY_POLICY.practicalMinimumDosePpm, ...(policy?.practicalMinimumDosePpm ?? {}) },
    sourcePreferences: { ...DEFAULT_GEMINI_CHEMISTRY_POLICY.sourcePreferences, ...(policy?.sourcePreferences ?? {}) },
  };
}

const n = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;
const target = (route: WatermancerRouteCandidate, id: IonId): number => Math.max(0, n(route.plan.targetIons[id]));

function deviation(route: WatermancerRouteCandidate, id: IonId): number {
  return n(route.finalIons[id]) - target(route, id);
}

function allowed(route: WatermancerRouteCandidate, id: IonId): number {
  const plan = route.plan;
  if (deviation(route, id) >= 0 && plan.allowOvershoot && plan.allowedOvershootIons.includes(id)) {
    return Math.max(0, n(plan.overshootLimits[id]));
  }
  if (deviation(route, id) < 0 && plan.allowOvershoot && plan.softDeficitIons?.includes(id)) {
    return Math.max(0, n(plan.softDeficitLimits?.[id]));
  }
  return 0;
}

/**
 * Score without executing a route. Lower is better. Every modeled ion is
 * compared, including co-ions whose target is zero.
 */
export function scoreGeminiWatermancerCandidate(
  candidate: WatermancerRouteCandidate,
  suppliedPolicy: Partial<GeminiChemistryPolicy> = {},
): number {
  const policy = policyWithDefaults(suppliedPolicy);
  let hard = 0;
  let score = 0;
  for (const id of IONS.map(ion => ion.id)) {
    const delta = deviation(candidate, id);
    const outside = Math.max(Math.abs(delta) - allowed(candidate, id), 0);
    const weight = id === 'bicarbonate' ? policy.bicarbonateWeight : 1;
    score += outside * weight;
    if (outside > 0.05) hard += outside;
    // Sulfate becomes disproportionately unpleasant beyond the green range.
    if (id === 'sulfate') {
      const excess = Math.max(n(candidate.finalIons[id]) - 15, 0);
      score += policy.sulfateHarshnessWeight * excess * excess / 15;
    }
  }
  // Magnesium/calcium balance is a useful sensory proxy for GH quality.
  const mg = n(candidate.finalIons.magnesium);
  const ca = n(candidate.finalIons.calcium);
  const mgTarget = target(candidate, 'magnesium');
  const caTarget = target(candidate, 'calcium');
  score += policy.ghBalanceWeight * Math.abs((mg - ca) - (mgTarget - caTarget)) / 2;

  const sodium = n(candidate.finalIons.sodium);
  const sodiumHeadroom = target(candidate, 'sodium') + policy.sodiumHeadroomPpm;
  score += policy.sodiumCostWeight * Math.max(sodium - sodiumHeadroom, 0);

  // NaHCO3 is welcome when it materially closes KH, but sodium remains a cost.
  const nahco3 = n(candidate.saltTargets.nahco3);
  if (nahco3 > 0) {
    const hco3Gap = Math.max(target(candidate, 'bicarbonate') - n(candidate.finalIons.bicarbonate) + nahco3 * 0.726, 0);
    if (hco3Gap < 1) score += policy.sodiumCostWeight * nahco3 * 0.05;
  }

  const fixed = new Set(Object.keys(candidate.plan.fixedSaltDoses));
  for (const [salt, dose] of Object.entries(candidate.saltTargets)) {
    const minimum = Math.max(0, n(policy.practicalMinimumDosePpm[salt] ?? candidate.plan.minimumSaltDosePpm?.[salt]));
    if (dose > 0 && dose < minimum) score += policy.hardViolationWeight * (minimum - dose);
    if (fixed.has(salt) && policy.preferFixedDoses) score -= 0.01;
  }
  const diagnostics = candidate.diagnostics;
  if (diagnostics) {
    score += policy.hardViolationWeight * diagnostics.policyViolationPpm;
    score -= diagnostics.honoredSourcePreferenceIons.length * 0.1;
    score += diagnostics.omittedOptionalSaltIds.length * 0.01;
  }
  for (const id of ACTIVE_ION_IDS) {
    const preference = policy.sourcePreferences[id];
    if (!preference) continue;
    const honored = candidate.diagnostics?.honoredSourcePreferenceIons.includes(id);
    if (!honored) score += policy.hardViolationWeight * 0.1;
  }
  if (policy.preferSourceWater) score += Math.max(0, candidate.additionWaters.length - candidate.baseWaters.length) * 0.001;
  return Number((score + hard * policy.hardViolationWeight).toFixed(8));
}

export function rankGeminiWatermancerCandidates(
  candidates: WatermancerRouteCandidate[],
  policy: Partial<GeminiChemistryPolicy> = {},
): WatermancerRouteCandidate[] {
  return candidates
    .map((candidate, index) => ({ candidate, index, score: scoreGeminiWatermancerCandidate(candidate, policy) }))
    .sort((a, b) => a.score - b.score || a.candidate.id.localeCompare(b.candidate.id) || a.index - b.index)
    .map(item => item.candidate);
}

/** Rank explanations separately, retaining the solver's structured conflicts. */
export function rankGeminiRecommendations(
  recommendations: WatermancerMatchRecommendation[],
  conflicts: WatermancerIonConflict[] = [],
  policy: Partial<GeminiChemistryPolicy> = {},
): WatermancerMatchRecommendation[] {
  const configured = policyWithDefaults(policy);
  const severity: Record<WatermancerIonConflict['severity'], number> = { critical: 3, warning: 2, notice: 1 };
  const conflictScore = (item: WatermancerMatchRecommendation): number => item.ionIds.reduce(
    (sum, id) => sum + Math.max(...conflicts.filter(c => c.id === id).map(c => severity[c.severity]), 0), 0,
  );
  return [...recommendations].sort((a, b) => conflictScore(b) - conflictScore(a)
    || Number(b.kind === 'fixed-dose-constraint' && configured.preferFixedDoses)
      - Number(a.kind === 'fixed-dose-constraint' && configured.preferFixedDoses)
    || a.label.localeCompare(b.label));
}
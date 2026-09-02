import { ACTIVE_ION_IDS, type IonId, type IonOvershoot } from './waterData';
import type { MineralWaterEntry } from './watermancerSolver';

export type WatermancerStrategy = 'closest-match' | 'water-first' | 'gh-kh-harmony' | 'added-water-mineral-first';
export type WatermancerSaltObjective = 'balanced' | 'coverage';
export type WatermancerMatchingMode = 'target-values' | 'ratios';
export type WatermancerIonSourcePreference =
  | 'water-only'
  | 'water-then-salt'
  | 'salt-only'
  | 'dont-care';
export type WatermancerOvershootPolicy = {
  enabled: boolean;
  matchingMode?: WatermancerMatchingMode;
  allowedIons: IonId[];
  maxPpm: Partial<Record<IonId, number>>;
  /** Lower-impact ions may remain slightly below target when chemistry is coupled. */
  softDeficitIons?: IonId[];
  softDeficitLimits?: Partial<Record<IonId, number>>;
  /** A salt is either omitted or dosed at/above this ppm floor. */
  minimumSaltDosePpm?: Partial<Record<string, number>>;
  priorityOrder: IonId[];
  ionSourcePreferences?: Partial<Record<IonId, WatermancerIonSourcePreference>>;
};

export type WatermancerPlan = {
  targetIons: Partial<Record<IonId, number>>;
  selectedWaters: MineralWaterEntry[];
  /** Salt inventory the matcher may use; individual salts may receive zero dose. */
  selectedSalts: string[];
  fixedWaterVolumes: Record<string, number>;
  fixedSaltDoses: Record<string, number>;
  strategy: WatermancerStrategy;
  saltObjective: WatermancerSaltObjective;
  /** Optional so callers can still pass version-1 plans; missing means target-values. */
  matchingMode?: WatermancerMatchingMode;
  ionPriority: IonId[];
  allowOvershoot: boolean;
  allowedOvershootIons: IonId[];
  overshootLimits: Partial<Record<IonId, number>>;
  softDeficitIons?: IonId[];
  softDeficitLimits?: Partial<Record<IonId, number>>;
  minimumSaltDosePpm?: Partial<Record<string, number>>;
  overshootOrder: IonId[];
  ionSourcePreferences?: Partial<Record<IonId, WatermancerIonSourcePreference>>;
  /** Optional solver-only cap for each automatically allocated water entry. */
  maxWaterVolumeMl?: number;
};

export function normalizeWatermancerMatchingMode(value: unknown): WatermancerMatchingMode {
  return value === 'ratios' ? 'ratios' : 'target-values';
}

export type WatermancerRouteKind =
  | 'primary'
  | 'use-more-water'
  | 'use-more-salts'
  | 'prioritize-ions';

export type WatermancerIonDeviation = {
  id: IonId;
  actual: number;
  target: number;
  delta: number;
};

export type WatermancerIonConflict = {
  id: IonId;
  actual: number;
  target: number;
  delta: number;
  allowedDelta: number;
  outsidePolicyPpm: number;
  direction: 'deficit' | 'excess';
  severity: 'notice' | 'warning' | 'critical';
  source: 'water' | 'salts' | 'mixed';
};

export type WatermancerMatchRecommendationAction =
  | {
      type: 'enable-salt';
      saltId: string;
    }
  | {
      type: 'relax-source-preference';
      ionId: IonId;
    }
  | {
      type: 'allow-policy-room';
      ionId: IonId;
      limitPpm: number;
    }
  | {
      type: 'review-controls';
      focus: 'waters' | 'salts';
    };

export type WatermancerMatchRecommendation = {
  kind:
    | 'add-source'
    | 'allow-policy-room'
    | 'enable-salt'
    | 'reduce-source'
    | 'relax-source-preference'
    | 'fixed-dose-constraint';
  ionIds: IonId[];
  label: string;
  rationale: string;
  action: WatermancerMatchRecommendationAction;
};

export type WatermancerMatchDiagnostics = {
  /** Sum of displayed final-ion distance before policy allowances. */
  targetDeviationPpm: number;
  /** Sum of explicit overshoot and soft-deficit room used by this route. */
  policyAllowancePpm: number;
  /** Sum of deviation that remains outside the route's policy. */
  policyViolationPpm: number;
  policyViolationCount: number;
  fixedSaltIds: string[];
  optionalSaltIds: string[];
  omittedOptionalSaltIds: string[];
  honoredSourcePreferenceIons: IonId[];
  /** Stable comparison score supplied by the route solver. */
  solverScore: number;
  conflicts: WatermancerIonConflict[];
  recommendations: WatermancerMatchRecommendation[];
};

export type WatermancerRouteCandidate = {
  id: string;
  kind: WatermancerRouteKind;
  label: string;
  explanation: string;
  plan: WatermancerPlan;
  baseWaters: MineralWaterEntry[];
  additionWaters: MineralWaterEntry[];
  saltTargets: Record<string, number>;
  finalIons: Record<IonId, number>;
  deviations: WatermancerIonDeviation[];
  overshoots: IonOvershoot[];
  score: number;
  /** Primary target-coverage score used before GH/KH and practical tie-breakers. */
  percentileDeviation?: number;
  /** Secondary balance score for the final modeled GH and KH. */
  ghKhBalanceDeviation?: number;
  /** Final score for positive-target deviations outside the practical margin. */
  practicalDeviation?: number;
  ratioEvaluation?: import('./watermancerRatios').WatermancerRatioEvaluation;
  diagnostics?: WatermancerMatchDiagnostics;
  /** Set only by quality-gated routes, such as Added-water mineral-first. */
  qualityValid?: boolean;
};

export type WatermancerSolverStatus = 'matched' | 'partial' | 'blocked';

export type WatermancerSolverResult = {
  primaryPlan: WatermancerRouteCandidate;
  alternatives: WatermancerRouteCandidate[];
  status: WatermancerSolverStatus;
  finalIons: Record<IonId, number>;
  deviations: WatermancerIonDeviation[];
  overshoots: IonOvershoot[];
  explanation: string;
};

const round = (value: number): number => Number(value.toFixed(6));

export function normalizeWatermancerIonOrder(order: IonId[]): IonId[] {
  return [
    ...new Set([
      ...order.filter(id => ACTIVE_ION_IDS.includes(id)),
      ...ACTIVE_ION_IDS,
    ]),
  ];
}

export function normalizeWatermancerIonSourcePreferences(
  preferences?: Partial<Record<IonId, WatermancerIonSourcePreference>>,
): Record<IonId, WatermancerIonSourcePreference> {
  const validValues: WatermancerIonSourcePreference[] = [
    'water-only',
    'water-then-salt',
    'salt-only',
    'dont-care',
  ];
  return Object.fromEntries(
    ACTIVE_ION_IDS.map(id => [
      id,
      preferences?.[id] && validValues.includes(preferences[id]!)
        ? preferences[id]
        : 'dont-care',
    ]),
  ) as Record<IonId, WatermancerIonSourcePreference>;
}

export function createWatermancerPlanSignature(plan: WatermancerPlan): string {
  return JSON.stringify({
    targetIons: Object.fromEntries(
      Object.entries(plan.targetIons)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, value]) => [id, round(value ?? 0)]),
    ),
    selectedWaters: plan.selectedWaters.map(water => ({
      id: water.id,
      ions: Object.fromEntries(
        Object.entries(water.ions)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id, value]) => [id, round(Number(value) || 0)]),
      ),
      volumeMl: round(Number(water.volumeMl) || 0),
    })),
    selectedSalts: [...plan.selectedSalts].sort(),
    fixedWaterVolumes: Object.fromEntries(
      Object.entries(plan.fixedWaterVolumes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, value]) => [id, round(value)]),
    ),
    fixedSaltDoses: Object.fromEntries(
      Object.entries(plan.fixedSaltDoses)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, value]) => [id, round(value)]),
    ),
    strategy: plan.strategy,
    saltObjective: plan.saltObjective,
    matchingMode: normalizeWatermancerMatchingMode(plan.matchingMode),
    ionPriority: normalizeWatermancerIonOrder(plan.ionPriority),
    allowOvershoot: plan.allowOvershoot === true,
    allowedOvershootIons: [...new Set(plan.allowedOvershootIons ?? [])].sort(),
    overshootLimits: Object.fromEntries(
      Object.entries(plan.overshootLimits)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, value]) => [id, round(value ?? 0)]),
    ),
    softDeficitIons: [...new Set(plan.softDeficitIons ?? [])].sort(),
    softDeficitLimits: Object.fromEntries(
      Object.entries(plan.softDeficitLimits ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, value]) => [id, round(value ?? 0)]),
    ),
    minimumSaltDosePpm: Object.fromEntries(
      Object.entries(plan.minimumSaltDosePpm ?? {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, value]) => [id, round(value ?? 0)]),
    ),
    overshootOrder: normalizeWatermancerIonOrder(plan.overshootOrder ?? []),
    ionSourcePreferences: normalizeWatermancerIonSourcePreferences(plan.ionSourcePreferences),
  });
}

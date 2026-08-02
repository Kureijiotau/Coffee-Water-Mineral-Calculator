import { ACTIVE_ION_IDS, type IonId, type IonOvershoot } from './waterData';
import type { MineralWaterEntry } from './App';

export type WatermancerStrategy = 'closest-match' | 'water-first' | 'gh-kh-harmony';
export type WatermancerSaltObjective = 'balanced' | 'coverage';
export type WatermancerOvershootPolicy = {
  enabled: boolean;
  allowedIons: IonId[];
  maxPpm: Partial<Record<IonId, number>>;
  /** Lower-impact ions may remain slightly below target when chemistry is coupled. */
  softDeficitIons?: IonId[];
  softDeficitLimits?: Partial<Record<IonId, number>>;
  priorityOrder: IonId[];
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
  ionPriority: IonId[];
  allowOvershoot: boolean;
  allowedOvershootIons: IonId[];
  overshootLimits: Partial<Record<IonId, number>>;
  softDeficitIons?: IonId[];
  softDeficitLimits?: Partial<Record<IonId, number>>;
  overshootOrder: IonId[];
};

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
    overshootOrder: normalizeWatermancerIonOrder(plan.overshootOrder ?? []),
  });
}

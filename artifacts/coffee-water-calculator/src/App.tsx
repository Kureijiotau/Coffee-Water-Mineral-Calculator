import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import TasteProfileCard from './TasteProfileCard';
import TastePreferenceModal from './TastePreferenceModal';
import type { TasteInference } from './tastePreference';
import pepeImage from '@assets/ez_1785735003821.png';
import { Calculator, Droplet, FlaskConical, Gauge, Info, AlertTriangle, Download, Check, Save, Share2, Upload, Trash2, Layers, X, RotateCcw, Plus, Minus, ListChecks, Sparkles, Pin, PinOff } from 'lucide-react';
import { GiSaltShaker } from 'react-icons/gi';
import {
  SALTS, IONS, ACTIVE_ION_IDS, ION_MAP, AIKI_DEFAULT_PROFILE, RECIPES, CACO3_FACTOR, classifyIon, computeSaltMg,
  computeIonTotals, computeSupplementalIonTotals, computeNaClTargetForSodiumGap, findIonOvershoots, findIonUnderdoses, computeGH, computeKH, checkConcentrate, splitIntoStockGroups,
  SUPPLEMENTAL_ION_MAP, type IonId, type SupplementalIonId, type TrafficLevel, type WaterProfile, type RangeSet,
  type SaltRecipe, type SaltRecipeEntry, type ConcentrateWarning, type StockGroup,
} from '@/waterData';
import {
  loadSavedRecipes, saveSavedRecipes, serializeRecipeFile, parseRecipeFile, newRecipeId,
} from '@/recipes';
import LabelScanner from '@/LabelScanner';
import { loadLocalWaters, saveLocalWaters, newLocalWaterId, type LocalWater, type WaterMetadata } from '@/localWaters';
import Week1Guide, { type Week1Recipe } from './Week1Guide';
import {
  loadProfiles, saveProfiles, loadActiveProfileId, saveActiveProfileId,
  loadNerdLevel, saveNerdLevel, createProfile,
  type NerdLevel,
} from '@/profiles';
import {
  createWatermancerProfile, loadWatermancerProfiles, saveWatermancerProfiles,
  type IonicTargetValues, type WatermancerProfile,
} from './watermancerProfiles';
import { ROBERT_ASAMI_RECIPES, type ExternalRecipe } from './externalRecipes';
import { EMPIRICAL_WATERS } from './empiricalWaters';
import {
  normalizeWatermancerIonOrder,
  normalizeWatermancerIonSourcePreferences,
  type WatermancerIonDeviation,
  type WatermancerIonSourcePreference,
  type WatermancerRouteCandidate,
  type WatermancerStrategy,
  type WatermancerSaltObjective,
  type WatermancerOvershootPolicy,
  type WatermancerSolverResult,
  type WatermancerPlan,
} from './watermancerPlan';

export type SaltRow = { target: string; formIdx: number };
type BrewerFlavorInput = {
  brightness: number;
  body: number;
  juiciness: number;
  sweetness: number;
};
type MagnesiumPreference = 'original' | 'chlorides' | 'sulfates';
type WatermancerTargetSourceId = 'safe-profile' | 'salt-table' | `profile:${string}` | `saved:${string}` | `recipe:${string}` | `external:${string}` | `reference:${string}`;
type AppTab = 'calculator' | 'concentrate';
export type AutoCraftPreset = 'closest-match' | 'water-first' | 'gh-kh-harmony' | 'added-water-mineral-first';
type AutoCraftObjective = WatermancerSaltObjective;
export type WatermancerBestMatchDeviationMode = 'strict' | 'permissive';
export type WatermancerBestMatchPreview = {
  route: WatermancerRouteCandidate;
  strategy: WatermancerStrategy;
  saltObjective: WatermancerSaltObjective;
  priorityPreset: Exclude<AutoFillPriorityPreset, 'custom'>;
  deviationMode: WatermancerBestMatchDeviationMode;
  totalDeviation: number;
  status: 'matched' | 'partial';
  explanation: string;
  inputSignature: string;
};

export function watermancerBestMatchPreviewIsCurrent(
  preview: Pick<WatermancerBestMatchPreview, 'inputSignature'> | null,
  currentInputSignature: string,
): boolean {
  return Boolean(preview && preview.inputSignature === currentInputSignature);
}

const WATERMANCER_STRATEGY_LABELS: Record<WatermancerStrategy, string> = {
  'closest-match': 'Closest match',
  'water-first': 'Water-first',
  'gh-kh-harmony': 'GH / KH harmony',
  'added-water-mineral-first': 'Added-water mineral-first',
};
type OvershootSettings = {
  enabled: boolean;
  allowedIons: IonId[];
  limits: Partial<Record<IonId, number>>;
};

const WATERMANCER_ION_SOURCE_STORAGE_KEY = 'coffee-water-watermancer-ion-source-preferences';
const WATERMANCER_ION_SOURCE_OPTIONS: Array<{
  value: WatermancerIonSourcePreference;
  label: string;
}> = [
  { value: 'water-only', label: 'Water only' },
  { value: 'water-then-salt', label: 'Water then salt' },
  { value: 'salt-only', label: 'Salt only' },
  { value: 'dont-care', label: 'Optimized' },
];

function loadWatermancerIonSourcePreferences(): Record<IonId, WatermancerIonSourcePreference> {
  try {
    const stored = JSON.parse(
      localStorage.getItem(WATERMANCER_ION_SOURCE_STORAGE_KEY) ?? 'null',
    ) as Partial<Record<IonId, WatermancerIonSourcePreference>> | null;
    return normalizeWatermancerIonSourcePreferences(stored ?? undefined);
  } catch {
    return normalizeWatermancerIonSourcePreferences();
  }
}

function watermancerSourcePreferencePenalty(
  plan: WatermancerPlan,
  waterIons: Partial<Record<IonId, number>>,
  saltTargets: Record<string, number>,
): number {
  const saltIons = computeIonTotals(saltTargets, {}, 1);
  return ACTIVE_ION_IDS.reduce((total, id) => {
    const preference = plan.ionSourcePreferences?.[id] ?? 'dont-care';
    const water = Math.max(waterIons[id] ?? 0, 0);
    const salt = Math.max(saltIons[id] ?? 0, 0);
    const target = Math.max(plan.targetIons[id] ?? 0, 0);
    if (preference === 'water-only') return total + salt * 1000;
    if (preference === 'salt-only') return total + water * 1000;
    if (preference === 'water-then-salt') {
      return total + Math.max(salt - Math.max(target - water, 0), 0) * 20;
    }
    return total;
  }, 0);
}

function HoldStepperButton({
  onStep,
  disabled,
  label,
  children,
  className,
}: {
  onStep: () => void;
  disabled: boolean;
  label: string;
  children: ReactNode;
  className: string;
}) {
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const onStepRef = useRef(onStep);

  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const clearHold = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => clearHold, [clearHold]);

  const startHold = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    suppressClickRef.current = true;
    onStepRef.current();
    clearHold();
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => onStepRef.current(), 90);
    }, 350);
  };

  const finishHold = (event?: React.PointerEvent<HTMLButtonElement>) => {
    clearHold();
    if (
      event
      && event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <button
      type="button"
      onPointerDown={startHold}
      onPointerUp={finishHold}
      onPointerCancel={event => {
        finishHold(event);
        suppressClickRef.current = false;
      }}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        onStep();
      }}
      disabled={disabled}
      className={className}
      aria-label={label}
    >
      {children}
    </button>
  );
}

const DEFAULT_BREWER_FLAVOR: BrewerFlavorInput = {
  brightness: 70,
  body: 35,
  juiciness: 65,
  sweetness: 55,
};

function brewerRangeValue(value: number, greenMax: number, yellowMax: number): number {
  const clamped = Math.max(0, Math.min(100, value));
  if (clamped <= 60) return greenMax * 0.98 * (clamped / 60);
  if (clamped <= 75) {
    return greenMax + (yellowMax - greenMax) * ((clamped - 60) / 15);
  }
  return yellowMax + Math.max(0.01, yellowMax * 0.31 * ((clamped - 75) / 25));
}

function brewerSliderStatus(value: number): { label: string; className: string } {
  if (value <= 60) return { label: 'Safe', className: 'text-emerald-300' };
  if (value <= 75) return { label: 'Elevated', className: 'text-amber-300' };
  return { label: 'Out of range', className: 'text-rose-300' };
}

function ionTotalsForSaltRecipe(recipe: SaltRecipe): Record<IonId, number> {
  const saltTargets = Object.fromEntries(
    Object.entries(recipe.salts).map(([saltId, entry]) => [saltId, num(entry.target)]),
  );
  return computeIonTotals(saltTargets, {}, 1);
}

const BREWER_SALT_IDS = new Set(['mgso4', 'cacl2', 'nahco3', 'kcl', 'nacl']);
const WATERMANCER_SALT_IDS = new Set(['mgcit', 'cacit']);

function nerdLevelForRecipe(recipe: SaltRecipe): NerdLevel {
  const activeSaltIds = Object.entries(recipe.salts)
    .filter(([, entry]) => num(entry.target) > 0)
    .map(([saltId]) => saltId);
  if (activeSaltIds.every(saltId => BREWER_SALT_IDS.has(saltId))) return 'brewer';
  if (activeSaltIds.some(saltId => WATERMANCER_SALT_IDS.has(saltId))) return 'watermancer';
  return 'alchemist';
}

function shouldEscalateNerdLevel(current: NerdLevel, required: NerdLevel): boolean {
  const rank: Record<NerdLevel, number> = {
    brewer: 1,
    alchemist: 2,
    watermancer: 3,
  };
  return rank[required] > rank[current];
}

function brewerSliderFromIon(value: number, greenMax: number, yellowMax: number): number {
  const safeMax = greenMax * 0.98;
  if (value <= safeMax) return Math.max(0, Math.min(60, (value / safeMax) * 60));
  if (value <= yellowMax) {
    return 60 + ((value - safeMax) / (yellowMax - safeMax)) * 15;
  }
  return Math.min(100, 75 + ((value - yellowMax) / Math.max(yellowMax * 0.31, 0.01)) * 25);
}

function brewerFlavorFromRecipe(recipe: SaltRecipe): BrewerFlavorInput | null {
  const activeSaltIds = Object.entries(recipe.salts)
    .filter(([, entry]) => num(entry.target) > 0)
    .map(([saltId]) => saltId);
  if (activeSaltIds.length === 0 || !activeSaltIds.every(saltId => BREWER_SALT_IDS.has(saltId))) return null;

  const targets = Object.fromEntries(
    activeSaltIds.map(saltId => [saltId, num(recipe.salts[saltId].target)]),
  );
  const ions = computeIonTotals(targets, {}, 1);
  return {
    brightness: Math.round(brewerSliderFromIon(ions.sulfate, ION_MAP.sulfate.greenMax, ION_MAP.sulfate.yellowMax)),
    body: Math.round(brewerSliderFromIon(ions.calcium, ION_MAP.calcium.greenMax, ION_MAP.calcium.yellowMax)),
    juiciness: Math.round(brewerSliderFromIon(ions.magnesium, ION_MAP.magnesium.greenMax, ION_MAP.magnesium.yellowMax)),
    sweetness: Math.round(brewerSliderFromIon(ions.bicarbonate, ION_MAP.bicarbonate.greenMax, ION_MAP.bicarbonate.yellowMax)),
  };
}

function brewerSaltSuggestion(flavor: BrewerFlavorInput): Record<string, number> {
  // Each Brewer control is normalized against Aiki's actual ion ranges:
  // 0–60 = green band, 60–75 = yellow band, 75–100 = beyond yellow.
  // Epsom and calcium chloride are constrained by both ions they contribute.
  const magnesium = brewerRangeValue(flavor.juiciness, ION_MAP.magnesium.greenMax, ION_MAP.magnesium.yellowMax);
  const sulfate = brewerRangeValue(flavor.brightness, ION_MAP.sulfate.greenMax, ION_MAP.sulfate.yellowMax);
  const calcium = brewerRangeValue(flavor.body, ION_MAP.calcium.greenMax, ION_MAP.calcium.yellowMax);
  const bicarbonate = brewerRangeValue(flavor.sweetness, ION_MAP.bicarbonate.greenMax, ION_MAP.bicarbonate.yellowMax);
  const chloride = brewerRangeValue(
    Math.max(flavor.body, flavor.sweetness * 0.7),
    ION_MAP.chloride.greenMax,
    ION_MAP.chloride.yellowMax,
  );
  const mgso4Fraction = 24.305 / 120.365;
  const sulfateFraction = 96.06 / 120.365;
  const calciumFraction = 40.078 / 110.978;
  const calciumChlorideFraction = 70.90 / 110.978;
  const epsomTarget = Math.min(
    magnesium / mgso4Fraction,
    sulfate / sulfateFraction,
  );
  const calciumChlorideTarget = Math.min(
    calcium / calciumFraction,
    chloride / calciumChlorideFraction,
  );

  return {
    mgso4: Number(epsomTarget.toFixed(2)),
    cacl2: Number(calciumChlorideTarget.toFixed(2)),
    nahco3: Number((bicarbonate / (61.017 / 84.007)).toFixed(2)),
    nacl: Number(Math.max(0, (chloride - calciumChlorideTarget * calciumChlorideFraction) / (35.45 / 58.44)).toFixed(2)),
  };
}

function defaultBrewerRows(): SaltRow[] {
  const defaultTargets = brewerSaltSuggestion(DEFAULT_BREWER_FLAVOR);
  return SALTS.map(salt => ({
    target: defaultTargets[salt.id] ? String(defaultTargets[salt.id]) : '',
    formIdx: salt.defaultFormIdx ?? 0,
  }));
}

export type MineralWaterEntry = {
  id: string;
  name: string;
  ions: Partial<Record<IonId, string>>;
  metadata: Partial<Record<keyof WaterMetadata, string>>;
  volumeMl: string;
  sourceLocalId?: string;
};
let _mwId = 0;
const newMwId = () => `mw_${++_mwId}_${Date.now()}`;

const TRAFFIC_STYLES: Record<TrafficLevel, { dot: string; text: string; border: string; bg: string; label: string }> = {
  green:  { dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', label: 'In range' },
  yellow: { dot: 'bg-amber-400',   text: 'text-amber-300',   border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   label: 'Elevated' },
  red:    { dot: 'bg-rose-400',    text: 'text-rose-300',    border: 'border-rose-500/40',    bg: 'bg-rose-500/10',    label: 'Too high' },
};

const formatIonThreshold = (value: number): string =>
  value.toFixed(2).replace(/\.?0+$/, '');

const num = (s: string): number => {
  const v = parseFloat(s);
  return !Number.isFinite(v) || v < 0 ? 0 : v;
};

export function translateSaltTargetsToIonTargets(
  saltTargets: Record<string, number>,
): Partial<Record<IonId, number>> {
  return computeIonTotals(saltTargets, {}, 1);
}

export function computeSaltGapOptionPpm(
  salt: typeof SALTS[number],
  ionGaps: Partial<Record<IonId, number>>,
): number {
  const relevantContributions = salt.ions.filter(
    contribution => (ionGaps[contribution.ionId] ?? 0) > 0,
  );
  if (relevantContributions.length === 0) return 0;
  const targetPpm = Math.min(...relevantContributions.map(contribution => {
    const gap = ionGaps[contribution.ionId] ?? 0;
    return contribution.fraction > 0 ? gap / contribution.fraction : 0;
  }));
  return Number.isFinite(targetPpm) ? Math.max(targetPpm, 0) : 0;
}

const completeIonTotals = (values: Partial<Record<IonId, number>>): Record<IonId, number> => (
  Object.fromEntries(
    IONS.map(ion => [ion.id, values[ion.id] ?? 0]),
  ) as Record<IonId, number>
);

const PRECISION_DRY_SALT_THRESHOLD_MG = 100;
const PRECISION_STOCK_STRENGTH = 500;
const PRECISION_STOCK_VOLUME_ML = 500;

type WatermancerPrecisionSalt = {
  id: string;
  name: string;
  massMg: number;
  stockMassMg: number;
};

export type WatermancerPrecisionRecommendation = {
  status: 'needs-volume' | 'ready';
  activeSalts: WatermancerPrecisionSalt[];
  currentMinimumMassMg: number;
  recommendedBatchLiters: number;
  recommendedMinimumMassMg: number;
  stockDoseMlPerLiter: number;
  stockDropsPerLiter: number;
  stockMasses: WatermancerPrecisionSalt[];
};

export function buildWatermancerPrecisionRecommendation(
  saltTargets: Record<string, number>,
  recipeRows: SaltRow[],
  liters: number,
  dropsPerMl: number,
): WatermancerPrecisionRecommendation | null {
  if (!Number.isFinite(liters) || liters <= 0) return null;
  const activeSalts = SALTS.map((salt, index) => {
    const target = Math.max(0, Number(saltTargets[salt.id] ?? 0));
    if (target <= 0) return null;
    const form = salt.hydrationForms[
      recipeRows[index]?.formIdx ?? salt.defaultFormIdx ?? 0
    ] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
    const massMg = computeSaltMg(target, liters, form.molarMass, salt.anhydrousMass);
    const stockMassMg = computeSaltMg(
      target,
      PRECISION_STOCK_VOLUME_ML / 1000,
      form.molarMass,
      salt.anhydrousMass,
    ) * PRECISION_STOCK_STRENGTH;
    return {
      id: salt.id,
      name: salt.name,
      massMg,
      stockMassMg,
    };
  }).filter((salt): salt is WatermancerPrecisionSalt => salt !== null && salt.massMg > 0);
  if (activeSalts.length === 0) return null;

  const currentMinimumMassMg = Math.min(...activeSalts.map(salt => salt.massMg));
  const multiplier = Math.max(
    1,
    Math.ceil((PRECISION_DRY_SALT_THRESHOLD_MG / currentMinimumMassMg) - 1e-9),
  );
  const recommendedBatchLiters = multiplier === 1
    ? liters
    : Math.max(liters, Math.ceil(liters * multiplier * 2 - 1e-9) / 2);
  const recommendedMinimumMassMg = currentMinimumMassMg * (recommendedBatchLiters / liters);
  const stockDoseMlPerLiter = 1000 / PRECISION_STOCK_STRENGTH;
  const safeDropsPerMl = Number.isFinite(dropsPerMl) && dropsPerMl > 0 ? dropsPerMl : 20;

  return {
    status: currentMinimumMassMg < PRECISION_DRY_SALT_THRESHOLD_MG ? 'needs-volume' : 'ready',
    activeSalts,
    currentMinimumMassMg,
    recommendedBatchLiters,
    recommendedMinimumMassMg,
    stockDoseMlPerLiter,
    stockDropsPerLiter: Math.max(1, Math.round(stockDoseMlPerLiter * safeDropsPerMl)),
    stockMasses: activeSalts.map(salt => ({ ...salt })),
  };
}

export function computeConcentrateStockSaltMassMg(
  strengthPercent: number,
  totalStockMassG: number,
): number {
  if (!Number.isFinite(strengthPercent) || !Number.isFinite(totalStockMassG)) return 0;
  return Math.max(0, strengthPercent) * 10 * Math.max(0, totalStockMassG);
}

export function computeConcentrateSaltMgPerDrop(
  strengthPercent: number,
  measuredDrops: number,
  measuredStockMassG: number,
): number {
  const saltMgPerG = Math.max(0, strengthPercent) * 10;
  return saltMgPerG > 0
    && Number.isFinite(measuredDrops) && measuredDrops > 0
    && Number.isFinite(measuredStockMassG) && measuredStockMassG > 0
    ? saltMgPerG * measuredStockMassG / measuredDrops
    : 0;
}

export function computeConcentrateDropsForSaltMass(
  saltMassMg: number,
  saltMgPerDrop: number,
): number {
  return Number.isFinite(saltMassMg)
    && Number.isFinite(saltMgPerDrop)
    && saltMassMg > 0
    && saltMgPerDrop > 0
    ? saltMassMg / saltMgPerDrop
    : 0;
}

export function computeWatermancerBottledIons(
  entries: MineralWaterEntry[],
  batchMl: number,
): Record<IonId, number> {
  const rawVolume = entries.reduce((total, entry) => total + num(entry.volumeMl), 0);
  const sourceScale = batchMl > 0 ? Math.min(1, batchMl / rawVolume || 0) : 0;
  return Object.fromEntries(
    IONS.map(ion => [
      ion.id,
      batchMl > 0
        ? entries.reduce(
          (total, entry) => total + (num(entry.ions[ion.id] ?? '') * num(entry.volumeMl) * sourceScale) / batchMl,
          0,
        )
        : 0,
    ]),
  ) as Record<IonId, number>;
}

export function autoCraftSaltTargets(
  allowedSaltIds: string[],
  waterIons: Partial<Record<IonId, number>>,
  targetIons: Partial<Record<IonId, number>>,
  fixedSaltTargets: Record<string, number> = {},
  preset: AutoCraftPreset = 'closest-match',
  objective: AutoCraftObjective = 'balanced',
  overshootPolicy?: WatermancerOvershootPolicy,
): Record<string, number> {
  // These salts are an allowed inventory, not a required recipe. Fixed doses
  // are user-owned overrides and are excluded from the optimizer; the
  // coordinate descent below always includes zero for the remaining salts.
  const allowedSalts = SALTS.filter(salt => (
    allowedSaltIds.includes(salt.id)
    && !Object.prototype.hasOwnProperty.call(fixedSaltTargets, salt.id)
    && !salt.ions.some(contribution => (
      (overshootPolicy?.ionSourcePreferences?.[contribution.ionId] ?? 'dont-care') === 'water-only'
      && contribution.fraction > 0
    ))
  ));
  if (allowedSalts.length === 0) return {};

  const targets = Object.fromEntries(
    allowedSalts.map(salt => [salt.id, 0]),
  ) as Record<string, number>;
  if (preset === 'gh-kh-harmony') {
    Object.assign(
      targets,
       autoCraftSaltTargets(
          allowedSaltIds,
         waterIons,
         targetIons,
         fixedSaltTargets,
         'closest-match',
         objective,
         overshootPolicy,
       ),
    );
  }
  const fixedIonTotals = computeIonTotals(fixedSaltTargets, waterIons, 1);
  const completeTargets = completeIonTotals(targetIons);
  const targetGh = computeGH(completeTargets);
  const targetKh = computeKH(completeTargets);
  const harmonyWeight = preset === 'gh-kh-harmony' ? 8 : 0;
  const normalizedOvershootOrder = normalizeWatermancerIonOrder(
    overshootPolicy?.priorityOrder ?? AUTO_FILL_SOURCE_PRIORITY,
  );
  const controlledOvershootEnabled = overshootPolicy?.enabled === true;
  const minimumDosePpmFor = (saltId: string): number => {
    const value = Number(overshootPolicy?.minimumSaltDosePpm?.[saltId] ?? 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };
  const practicalSaltDose = (saltId: string, candidate: number): number => {
    if (!Number.isFinite(candidate) || candidate <= 1e-8) return 0;
    return Math.max(candidate, minimumDosePpmFor(saltId));
  };
  const overshootAllowanceFor = (ionId: IonId): number => {
    if (
      !overshootPolicy?.enabled
      || !overshootPolicy.allowedIons.includes(ionId)
      || (targetIons[ionId] ?? 0) <= 0
    ) return 0;
    const value = Number(overshootPolicy.maxPpm[ionId] ?? 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };
  const sourcePreferenceFor = (ionId: IonId): WatermancerIonSourcePreference => (
    overshootPolicy?.ionSourcePreferences?.[ionId] ?? 'dont-care'
  );
  const softDeficitAllowanceFor = (ionId: IonId): number => {
    if (!controlledOvershootEnabled || !overshootPolicy?.softDeficitIons?.includes(ionId)) return 0;
    const value = Number(overshootPolicy.softDeficitLimits?.[ionId] ?? 0);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };
  const weightedDeviation = (ionId: IonId, actual: number, target: number): number => {
    const delta = actual - target;
    if (!controlledOvershootEnabled) {
      return objective === 'coverage'
        ? delta < 0 ? Math.abs(delta) * 2 : Math.abs(delta) * 0.35
        : Math.abs(delta);
    }
    const allowance = overshootAllowanceFor(ionId);
    const excessBeyondPolicy = Math.max(delta - allowance, 0);
    const deficit = Math.max(-delta - softDeficitAllowanceFor(ionId), 0);
    const priorityIndex = normalizedOvershootOrder.indexOf(ionId);
    const priorityWeight = normalizedOvershootOrder.length - Math.max(priorityIndex, 0);
    const softDeficitIon = Boolean(overshootPolicy?.softDeficitIons?.includes(ionId));
    const deficitWeight = softDeficitIon ? 2 : 12;
    return objective === 'coverage'
      ? deficit * (deficitWeight + priorityWeight / normalizedOvershootOrder.length)
        + excessBeyondPolicy * (4 + priorityWeight / normalizedOvershootOrder.length)
      : deficit * (deficitWeight + priorityWeight / normalizedOvershootOrder.length)
        + excessBeyondPolicy * (4 + priorityWeight / normalizedOvershootOrder.length);
  };
  const sourcePreferencePenalty = (saltTargets: Record<string, number>): number => {
    const saltIons = computeIonTotals(saltTargets, {}, 1);
    return ACTIVE_ION_IDS.reduce((total, ionId) => {
      const preference = sourcePreferenceFor(ionId);
      const saltContribution = Math.max(saltIons[ionId] ?? 0, 0);
      const waterContribution = Math.max(waterIons[ionId] ?? 0, 0);
      const target = Math.max(targetIons[ionId] ?? 0, 0);
      if (preference === 'water-only') return total + saltContribution * 1000;
      if (preference === 'salt-only') return total + waterContribution * 1000;
      if (preference === 'water-then-salt') {
        return total + Math.max(saltContribution - Math.max(target - waterContribution, 0), 0) * 20;
      }
      return total;
    }, 0);
  };
  const ionValueWithoutSalt = (salt: typeof SALTS[number], ionId: IonId): number => {
    let value = fixedIonTotals[ionId] ?? 0;
    for (const otherSalt of allowedSalts) {
      if (otherSalt.id === salt.id) continue;
      value += (targets[otherSalt.id] ?? 0)
        * (otherSalt.ions.find(item => item.ionId === ionId)?.fraction ?? 0);
    }
    return value;
  };
  const saltIonTotals = (salt: typeof SALTS[number]): Record<IonId, number> => (
    Object.fromEntries(
      IONS.map(ion => [
        ion.id,
        salt.ions.find(contribution => contribution.ionId === ion.id)?.fraction ?? 0,
      ]),
    ) as Record<IonId, number>
  );
  const residualFor = (salt: typeof SALTS[number], candidate: number): number => {
    const actualIons = { ...fixedIonTotals } as Record<IonId, number>;
    let score = 0;
    for (const ion of IONS) {
      const saltContribution = salt.ions.find(contribution => contribution.ionId === ion.id)?.fraction ?? 0;
      const actual = ionValueWithoutSalt(salt, ion.id) + candidate * saltContribution;
      actualIons[ion.id] = actual;
       score += weightedDeviation(ion.id, actual, targetIons[ion.id] ?? 0);
    }
    if (harmonyWeight > 0 && targetGh > 0 && targetKh > 0) {
      const actualGh = computeGH(actualIons);
      const actualKh = computeKH(actualIons);
      const ghFraction = actualGh / targetGh;
      const khFraction = actualKh / targetKh;
      const hardnessFraction = (actualGh + actualKh) / (targetGh + targetKh);
      score += harmonyWeight
        * (
          Math.abs(ghFraction - khFraction)
          + 0.5 * Math.abs(1 - hardnessFraction)
        )
        * ((targetGh + targetKh) / 2);
    }
    return score + sourcePreferencePenalty({ ...targets, [salt.id]: candidate });
  };

  const scoreForSaltTargets = (saltTargets: Record<string, number>): number => {
    const actualIons = computeIonTotals(saltTargets, fixedIonTotals, 1);
    let score = 0;
    for (const ion of IONS) {
      score += weightedDeviation(ion.id, actualIons[ion.id] ?? 0, targetIons[ion.id] ?? 0);
    }
    if (harmonyWeight > 0 && targetGh > 0 && targetKh > 0) {
      const actualGh = computeGH(actualIons);
      const actualKh = computeKH(actualIons);
      const ghFraction = actualGh / targetGh;
      const khFraction = actualKh / targetKh;
      const hardnessFraction = (actualGh + actualKh) / (targetGh + targetKh);
      score += harmonyWeight
        * (
          Math.abs(ghFraction - khFraction)
          + 0.5 * Math.abs(1 - hardnessFraction)
        )
        * ((targetGh + targetKh) / 2);
    }
    return score + sourcePreferencePenalty(saltTargets);
  };

  const solveLinearSystem = (matrix: number[][], vector: number[]): number[] | null => {
    const size = vector.length;
    const augmented = matrix.map((row, rowIndex) => [...row, vector[rowIndex]]);
    for (let column = 0; column < size; column += 1) {
      let pivot = column;
      for (let row = column + 1; row < size; row += 1) {
        if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
          pivot = row;
        }
      }
      if (Math.abs(augmented[pivot][column]) < 1e-10) return null;
      [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
      const divisor = augmented[column][column];
      for (let index = column; index <= size; index += 1) {
        augmented[column][index] /= divisor;
      }
      for (let row = 0; row < size; row += 1) {
        if (row === column) continue;
        const factor = augmented[row][column];
        if (Math.abs(factor) < 1e-12) continue;
        for (let index = column; index <= size; index += 1) {
          augmented[row][index] -= factor * augmented[column][index];
        }
      }
    }
    return augmented.map(row => row[size]);
  };

  const solveGlobalSaltTargets = (): Record<string, number> | null => {
    // The allowed salt inventory is small in practice. Enumerating active
    // sets lets the solver replace several coupled salts together instead of
    // getting trapped by coordinate descent at a harmful local choice.
    if (allowedSalts.length > 15) return null;
    const columns = allowedSalts.map(salt => IONS.map(ion => (
      salt.ions.find(item => item.ionId === ion.id)?.fraction ?? 0
    )));
    const weights = IONS.map(ion => {
      const target = targetIons[ion.id] ?? 0;
      if (target <= 0) return 4;
      return overshootPolicy?.softDeficitIons?.includes(ion.id) ? 2 : 12;
    });
    let best: Record<string, number> | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let mask = 0; mask < (1 << allowedSalts.length); mask += 1) {
      const activeIndexes = allowedSalts
        .map((_, index) => index)
        .filter(index => (mask & (1 << index)) !== 0);
      const candidateTargets = Object.fromEntries(
        allowedSalts.map(salt => [salt.id, 0]),
      ) as Record<string, number>;

      if (activeIndexes.length > 0) {
        const normal = activeIndexes.map(leftIndex => activeIndexes.map(rightIndex => (
          columns[leftIndex].reduce(
            (sum, value, ionIndex) => (
              sum + weights[ionIndex] * value * columns[rightIndex][ionIndex]
            ),
            0,
          )
        )));
        const rhs = activeIndexes.map(leftIndex => columns[leftIndex].reduce(
          (sum, value, ionIndex) => (
            sum + weights[ionIndex] * value * (
              (targetIons[IONS[ionIndex].id] ?? 0)
              - (fixedIonTotals[IONS[ionIndex].id] ?? 0)
            )
          ),
          0,
        ));
        // A tiny ridge makes rank-deficient active sets deterministic.
        normal.forEach((row, index) => { row[index] += 1e-9; });
        const solution = solveLinearSystem(normal, rhs);
        if (!solution || solution.some(value => value < -1e-7 || value > 5000)) continue;
        activeIndexes.forEach((saltIndex, index) => {
          candidateTargets[allowedSalts[saltIndex].id] = practicalSaltDose(
            allowedSalts[saltIndex].id,
            solution[index],
          );
        });
      }

      const score = scoreForSaltTargets(candidateTargets);
      if (score < bestScore - 1e-7) {
        bestScore = score;
        best = candidateTargets;
      }
    }
    return best;
  };

  // Coordinate descent over an L1 objective. For each salt, the optimum lies
  // at zero or where one of its coupled ions reaches its target; checking
  // those breakpoints keeps the result deterministic without adding a solver.
  for (let pass = 0; pass < 80; pass += 1) {
    let largestChange = 0;
    for (const salt of allowedSalts) {
      const previous = targets[salt.id] ?? 0;
      const candidates = [0, minimumDosePpmFor(salt.id)];
      for (const contribution of salt.ions) {
        if (contribution.fraction <= 0) continue;
        let actualWithoutSalt = fixedIonTotals[contribution.ionId] ?? 0;
        for (const otherSalt of allowedSalts) {
          if (otherSalt.id === salt.id) continue;
          actualWithoutSalt += (targets[otherSalt.id] ?? 0)
            * (otherSalt.ions.find(item => item.ionId === contribution.ionId)?.fraction ?? 0);
        }
          candidates.push(practicalSaltDose(salt.id, Math.min(
            5000,
            (
              (targetIons[contribution.ionId] ?? 0)
              + overshootAllowanceFor(contribution.ionId)
              - actualWithoutSalt
            ) / contribution.fraction,
          )));
      }
      if (harmonyWeight > 0 && targetGh > 0 && targetKh > 0) {
        const ionsWithoutSalt = Object.fromEntries(IONS.map(ion => [
          ion.id,
          ionValueWithoutSalt(salt, ion.id),
        ])) as Record<IonId, number>;
        const ghWithoutSalt = computeGH(ionsWithoutSalt);
        const khWithoutSalt = computeKH(ionsWithoutSalt);
        const saltIons = saltIonTotals(salt);
        const ghContribution = computeGH(saltIons);
        const khContribution = computeKH(saltIons);
        const ratioDenominator = ghContribution / targetGh - khContribution / targetKh;
        if (Math.abs(ratioDenominator) > 1e-10) {
          candidates.push(practicalSaltDose(salt.id, Math.min(
            5000,
            (khWithoutSalt / targetKh - ghWithoutSalt / targetGh) / ratioDenominator,
          )));
        }
      }
      const next = candidates.reduce((best, candidate) => {
        const bestScore = residualFor(salt, best);
        const candidateScore = residualFor(salt, candidate);
        return candidateScore < bestScore - 1e-8
          || (Math.abs(candidateScore - bestScore) <= 1e-8 && candidate < best)
          ? candidate
          : best;
      }, 0);
       targets[salt.id] = Number(practicalSaltDose(salt.id, next).toFixed(6));
      largestChange = Math.max(largestChange, Math.abs(next - previous));
    }
    if (largestChange < 1e-7) break;
  }

  const globalTargets = solveGlobalSaltTargets();
  if (globalTargets && scoreForSaltTargets(globalTargets) < scoreForSaltTargets(targets) - 1e-7) {
    Object.assign(targets, globalTargets);
  }

  return targets;
}

const normalizeSaltTarget = (value: string | number): string => {
  const raw = String(value);
  if (!raw.trim()) return '';
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed)) return '';
  return String(Math.max(0, parsed));
};

const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

const AUTO_FILL_MAX_ML = 2000;
const DEFAULT_AUTO_FILL_DEVIATION_PPM = 1;
const AUTO_FILL_SOURCE_PRIORITY: IonId[] = [
  'calcium',
  'magnesium',
  'sodium',
  'potassium',
  'chloride',
  'sulfate',
  'citrates',
  'bicarbonate',
];
type AutoFillPriorityPreset = 'mineral-first' | 'bicarbonate-first' | 'balanced-gh-kh' | 'custom';

const AUTO_FILL_PRIORITY_PRESETS: Record<Exclude<AutoFillPriorityPreset, 'custom'>, { label: string; ions: IonId[] }> = {
  'mineral-first': {
    label: 'Mineral-first',
    ions: AUTO_FILL_SOURCE_PRIORITY,
  },
  'bicarbonate-first': {
    label: 'Bicarbonate-first',
    ions: ['bicarbonate', 'calcium', 'magnesium', 'sodium', 'potassium', 'chloride', 'sulfate', 'citrates'],
  },
  'balanced-gh-kh': {
    label: 'Balanced GH / KH',
    ions: ['calcium', 'magnesium', 'bicarbonate', 'sodium', 'potassium', 'chloride', 'sulfate', 'citrates'],
  },
};
const AUTO_FILL_SETTINGS_STORAGE_KEY = 'coffee-water-auto-fill-settings';
const WATERMANCER_OVERSHOOT_STORAGE_KEY = 'coffee-water-watermancer-overshoot-policy';
const DROPPER_CALIBRATION_STORAGE_KEY = 'coffee-water-dropper-calibration';
const DROPPER_CALIBRATION_ACKNOWLEDGED_KEY = 'coffee-water-dropper-calibration-acknowledged';
const DEFAULT_DROPS_PER_ML = 20;
/** Smallest practical physical salt dose shown by Watermancer. */
const WATERMANCER_MIN_SALT_MG = 10;
const DEFAULT_OVERSHOOT_SETTINGS: OvershootSettings = {
  enabled: true,
  allowedIons: [...ACTIVE_ION_IDS],
  limits: Object.fromEntries(ACTIVE_ION_IDS.map(id => [id, 0])),
};

function loadDropsPerMl(): number {
  try {
    const parsed = Number(localStorage.getItem(DROPPER_CALIBRATION_STORAGE_KEY));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DROPS_PER_ML;
  } catch {
    return DEFAULT_DROPS_PER_ML;
  }
}

function loadDropperCalibrationAcknowledged(): boolean {
  try {
    return localStorage.getItem(DROPPER_CALIBRATION_ACKNOWLEDGED_KEY) === 'true';
  } catch {
    return false;
  }
}
function normalizeAutoFillPriority(priority: unknown): IonId[] {
  const valid = Array.isArray(priority)
    ? priority.filter((id): id is IonId => typeof id === 'string' && ACTIVE_ION_IDS.includes(id as IonId))
    : [];
  return [...new Set([...valid, ...AUTO_FILL_SOURCE_PRIORITY])];
}

function normalizeOvershootAllowedIons(value: unknown): IonId[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is IonId => typeof id === 'string' && ACTIVE_ION_IDS.includes(id as IonId)))]
    : [];
}

function normalizeOvershootLimits(value: unknown): Partial<Record<IonId, number>> {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([id]) => ACTIVE_ION_IDS.includes(id as IonId))
      .map(([id, raw]) => {
        const parsed = Number(raw);
        return [id, Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0];
      }),
  ) as Partial<Record<IonId, number>>;
}

function loadOvershootSettings(): OvershootSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(WATERMANCER_OVERSHOOT_STORAGE_KEY) ?? 'null') as Partial<{
      enabled: boolean;
      allowedIons: unknown;
      limits: unknown;
    }> | null;
    if (!stored) return DEFAULT_OVERSHOOT_SETTINGS;
    const storedLimits = normalizeOvershootLimits(stored.limits);
    const storedAllowed = normalizeOvershootAllowedIons(stored.allowedIons);
    const isLegacyDefault = stored.enabled === false
      && storedAllowed.length === 0
      && Object.keys(storedLimits).length === 0;
    const isLockedHalfPpmDefault = stored.enabled === true
      && storedAllowed.length === ACTIVE_ION_IDS.length
      && ACTIVE_ION_IDS.every(id => storedLimits[id] === 0.5);
    if (isLegacyDefault || isLockedHalfPpmDefault) return DEFAULT_OVERSHOOT_SETTINGS;
    return {
      enabled: stored.enabled === true,
      allowedIons: storedAllowed,
      limits: storedLimits,
    };
  } catch {
    return DEFAULT_OVERSHOOT_SETTINGS;
  }
}

function loadAutoFillSettings(): {
  preset: AutoFillPriorityPreset;
  customPriority: IonId[];
  deviationPpm: number;
} {
  const fallback = {
    preset: 'mineral-first' as AutoFillPriorityPreset,
    customPriority: [...AUTO_FILL_SOURCE_PRIORITY],
    deviationPpm: DEFAULT_AUTO_FILL_DEVIATION_PPM,
  };
  try {
    const stored = JSON.parse(localStorage.getItem(AUTO_FILL_SETTINGS_STORAGE_KEY) ?? 'null') as Partial<typeof fallback> | null;
    if (!stored) return fallback;
    const preset = stored.preset === 'bicarbonate-first' || stored.preset === 'balanced-gh-kh' || stored.preset === 'custom'
      ? stored.preset
      : fallback.preset;
    const parsedDeviation = Number(stored.deviationPpm);
    return {
      preset,
      customPriority: normalizeAutoFillPriority(stored.customPriority),
      deviationPpm: Number.isFinite(parsedDeviation) ? Math.max(0, Math.min(100, Math.round(parsedDeviation))) : fallback.deviationPpm,
    };
  } catch {
    return fallback;
  }
}

export function autoFillWaterVolumes(
  entries: MineralWaterEntry[],
  batchMl: number,
  targets: Partial<Record<IonId, number>>,
  fixedEntries: MineralWaterEntry[] = [],
  sourcePriority: IonId[] = AUTO_FILL_SOURCE_PRIORITY,
  deviationPpm = DEFAULT_AUTO_FILL_DEVIATION_PPM,
  enforceAllIonCeilings = false,
  ignoreZeroTargetCeilings = false,
  volumeStepMl = 1,
  positiveTargetWigglePpm = 0,
  overshootPolicy?: WatermancerOvershootPolicy,
): MineralWaterEntry[] {
  if (batchMl <= 0 || entries.length === 0) return entries;

  const targetAmounts = Object.fromEntries(
    ACTIVE_ION_IDS.map(id => [id, Math.max(targets[id] ?? 0, 0) * batchMl]),
  ) as Record<IonId, number>;
  const bicarbonateTarget = targetAmounts.bicarbonate ?? 0;
  const deviationAmount = enforceAllIonCeilings ? 0 : Math.max(0, deviationPpm) * batchMl;
  const bicarbonateLimit = bicarbonateTarget + deviationAmount;
  const priorityIonIds: IonId[] = ['calcium', 'magnesium', 'sodium'];
  const safePositiveTargetWigglePpm = Number.isFinite(positiveTargetWigglePpm)
    ? Math.max(0, positiveTargetWigglePpm)
    : 0;
  const positiveTargetWiggleAmount = safePositiveTargetWigglePpm * batchMl;
  const overshootAllowanceAmount = (id: IonId): number => {
    if (!overshootPolicy?.enabled || !overshootPolicy.allowedIons.includes(id)) return 0;
    const limit = Number(overshootPolicy.maxPpm[id] ?? 0);
    return Number.isFinite(limit) ? Math.max(0, limit) * batchMl : 0;
  };
  const sourcePreferenceFor = (id: IonId): WatermancerIonSourcePreference => (
    overshootPolicy?.ionSourcePreferences?.[id] ?? 'dont-care'
  );
  const fixedVolume = fixedEntries.reduce((total, entry) => total + num(entry.volumeMl), 0);
  const variableVolumeLimit = Math.max(batchMl - fixedVolume, 0);
  const fixedContributions = Object.fromEntries(
    ACTIVE_ION_IDS.map(id => [
      id,
      fixedEntries.reduce((total, entry) => total + num(entry.ions[id] ?? '') * num(entry.volumeMl), 0),
    ]),
  ) as Record<IonId, number>;
  const ceilingIonIds = enforceAllIonCeilings
    ? ignoreZeroTargetCeilings
      ? ACTIVE_ION_IDS.filter(id => (targetAmounts[id] ?? 0) > 0)
      : ACTIVE_ION_IDS
    : ['bicarbonate' as IonId];
  const waterCeilingIonIds = enforceAllIonCeilings
    ? ceilingIonIds
    : ceilingIonIds;
  const waterOnlyIonIds = ACTIVE_ION_IDS.filter(id => sourcePreferenceFor(id) === 'salt-only');
  const effectiveWaterCeilingIonIds = [...new Set([...waterCeilingIonIds, ...waterOnlyIonIds])];
  const fixedWaterAlreadyExceedsLimit = effectiveWaterCeilingIonIds
    .some(id => fixedContributions[id] > (
      enforceAllIonCeilings
        ? sourcePreferenceFor(id) === 'salt-only'
          ? 0
          : (targetAmounts[id] ?? 0) + ((targetAmounts[id] ?? 0) > 0 ? positiveTargetWiggleAmount : 0)
        + overshootAllowanceAmount(id)
        : bicarbonateLimit
    ) + 1e-8);
  if (variableVolumeLimit <= 0 || fixedWaterAlreadyExceedsLimit) {
    return entries.map(entry => ({ ...entry, volumeMl: '0' }));
  }

  const sortedEntries = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const sourcePreferenceScore = (entry: MineralWaterEntry): number => (
        ACTIVE_ION_IDS.reduce((total, id) => {
          const concentration = num(entry.ions[id] ?? '');
          const target = Math.max(targets[id] ?? 0, 0);
          const preference = sourcePreferenceFor(id);
          const weight = preference === 'water-only'
            ? 100
            : preference === 'water-then-salt'
              ? 25
              : preference === 'salt-only'
                ? -100
                : 0;
          return total + concentration * Math.max(target, 1) * weight;
        }, 0)
      );
      const preferenceDifference = sourcePreferenceScore(b.entry) - sourcePreferenceScore(a.entry);
      if (Math.abs(preferenceDifference) > 1e-8) return preferenceDifference > 0 ? -1 : 1;
      for (const id of sourcePriority) {
        const difference = num(b.entry.ions[id] ?? '') - num(a.entry.ions[id] ?? '');
        if (Math.abs(difference) > 1e-8) return difference;
      }
      return a.index - b.index;
    });
  const volumes = entries.map(() => 0);
  const covered = { ...fixedContributions };
  let remainingVolume = variableVolumeLimit;
  const safeVolumeStepMl = Number.isFinite(volumeStepMl) && volumeStepMl > 0 ? volumeStepMl : 1;
  const volumePrecision = safeVolumeStepMl < 1
    ? Math.ceil(-Math.log10(safeVolumeStepMl))
    : 0;

  // Deterministic priority fill: prefer source waters by the requested ion
  // order. Recipe mode protects bicarbonate and the three GH mineral
  // priorities; no-recipe mode protects every active ion at its safe ceiling.
  for (const { entry, index } of sortedEntries) {
    if (remainingVolume <= 0.01) break;
      const limitingIds: IonId[] = enforceAllIonCeilings
        ? effectiveWaterCeilingIonIds
      : ['bicarbonate', ...priorityIonIds];
    const availableAmount = Math.min(AUTO_FILL_MAX_ML, remainingVolume);
    const amountToCeiling = (allowPositiveTargetWiggle: boolean): number => {
      let candidateAmount = availableAmount;
      for (const id of limitingIds) {
        const concentration = num(entry.ions[id] ?? '');
        if (concentration <= 0) continue;
        const target = targetAmounts[id] ?? 0;
        const ceiling = enforceAllIonCeilings
          ? sourcePreferenceFor(id) === 'salt-only'
            ? 0
            : target + (
                allowPositiveTargetWiggle && target > 0
                  ? positiveTargetWiggleAmount
                  : 0
              ) + overshootAllowanceAmount(id)
          : id === 'bicarbonate'
            ? bicarbonateLimit
            : target + deviationAmount;
        const remaining = Math.max(ceiling - covered[id], 0);
        candidateAmount = Math.min(candidateAmount, remaining / concentration);
      }
      return candidateAmount;
    };

    const strictAmount = amountToCeiling(false);
    let amount = strictAmount;
    if (enforceAllIonCeilings && positiveTargetWiggleAmount > 0) {
      const wiggleAmount = amountToCeiling(true);
      const extraVolume = wiggleAmount - strictAmount;
      const earnsMeaningfulCoverage = extraVolume > 0.01
        && ceilingIonIds.some(id => {
          const concentration = num(entry.ions[id] ?? '');
          const target = targetAmounts[id] ?? 0;
          const currentAfterStrictFill = covered[id] + strictAmount * concentration;
          const extraPpm = extraVolume * concentration / batchMl;
          return target > 0
            && currentAfterStrictFill < target - 1e-8
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

export type WatermancerRouteInputs = {
  plan: WatermancerPlan;
  batchMl: number;
  baseWaters: MineralWaterEntry[];
  additionWaters: MineralWaterEntry[];
};

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

function cloneWatermancerWaters(entries: MineralWaterEntry[]): MineralWaterEntry[] {
  return entries.map(entry => ({
    ...entry,
    ions: { ...entry.ions },
    metadata: { ...entry.metadata },
  }));
}

function cloneWatermancerPlan(plan: WatermancerPlan): WatermancerPlan {
  return {
    ...plan,
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

function cloneWatermancerRouteCandidate(route: WatermancerRouteCandidate): WatermancerRouteCandidate {
  return {
    ...route,
    plan: cloneWatermancerPlan(route.plan),
    baseWaters: cloneWatermancerWaters(route.baseWaters),
    additionWaters: cloneWatermancerWaters(route.additionWaters),
    saltTargets: { ...route.saltTargets },
    finalIons: { ...route.finalIons },
    deviations: route.deviations.map(deviation => ({ ...deviation })),
    overshoots: route.overshoots.map(overshoot => ({ ...overshoot })),
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
      Math.min(AUTO_FILL_MAX_ML, availableVolume),
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

  const saltPolicy = addedWaterSaltPolicy(
    target,
    plan.softDeficitIons && plan.softDeficitIons.length > 0 ? 'permissive' : 'strict',
    plan.ionSourcePreferences,
  );
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
  const score = totalWatermancerDeviation(
    finalIons,
    routePlan.targetIons,
    routePlan,
  ) + (qualityValid ? 0 : 1_000_000);

  return {
    id: definition.id,
    kind: definition.kind,
    label: WATERMANCER_STRATEGY_LABELS['added-water-mineral-first'],
    explanation: 'Added waters maximize calcium and magnesium first while protecting bicarbonate; salts finish the remaining gaps with tighter spectator-ion limits.',
    plan: {
      ...routePlan,
      selectedWaters,
      fixedWaterVolumes: Object.fromEntries(
        selectedWaters.map(entry => [entry.id, num(entry.volumeMl)]),
      ),
    },
    baseWaters: baseWaters.map(entry => ({ ...entry })),
    additionWaters: workingAdditions,
    saltTargets: allSaltTargets,
    finalIons,
    deviations,
    overshoots,
    score,
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
        enabled: inputs.plan.allowOvershoot,
        allowedIons: inputs.plan.allowedOvershootIons,
        maxPpm: inputs.plan.overshootLimits,
        softDeficitIons: inputs.plan.softDeficitIons,
        softDeficitLimits: inputs.plan.softDeficitLimits,
        priorityOrder: inputs.plan.overshootOrder,
        ionSourcePreferences: inputs.plan.ionSourcePreferences,
      },
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
      enabled: inputs.plan.allowOvershoot,
      allowedIons: inputs.plan.allowedOvershootIons,
      maxPpm: inputs.plan.overshootLimits,
      softDeficitIons: inputs.plan.softDeficitIons,
      softDeficitLimits: inputs.plan.softDeficitLimits,
      priorityOrder: inputs.plan.overshootOrder,
      ionSourcePreferences: inputs.plan.ionSourcePreferences,
    },
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
      enabled: routePlan.allowOvershoot,
      allowedIons: routePlan.allowedOvershootIons,
      maxPpm: routePlan.overshootLimits,
      softDeficitIons: routePlan.softDeficitIons,
      softDeficitLimits: routePlan.softDeficitLimits,
      minimumSaltDosePpm: routePlan.minimumSaltDosePpm,
      priorityOrder: routePlan.overshootOrder,
      ionSourcePreferences: routePlan.ionSourcePreferences,
    },
  );
  const allSaltTargets = { ...routePlan.fixedSaltDoses, ...saltTargets };
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
  const score = deviations.reduce((total, deviation) => {
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
  const hardnessPenalty = (
    Math.abs(finalGh - targetGh) + Math.abs(finalKh - targetKh)
  ) * 1.5;
  const candidatePlan: WatermancerPlan = {
    ...routePlan,
    selectedWaters,
    fixedWaterVolumes: Object.fromEntries(
      selectedWaters.map(entry => [entry.id, num(entry.volumeMl)]),
    ),
  };
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
    score: score + hardnessPenalty,
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
  return {
    ...selectedCandidate,
    plan: routePlan,
    baseWaters: inputs.baseWaters.map(entry => ({ ...entry })),
    additionWaters: inputs.additionWaters.map(entry => ({ ...entry })),
    saltTargets: { ...selectedSaltTargets },
    finalIons,
    deviations,
    overshoots: findIonOvershoots(finalIons, selectedCandidate.plan.targetIons),
  };
}

function watermancerRouteDeviations(
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

function watermancerDeviationBeyondPolicy(
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
    (total, deviation) => total + Math.abs(watermancerDeviationBeyondPolicy(deviation, plan)),
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
    const scoreDifference = a.totalDeviation - b.totalDeviation;
    if (Math.abs(scoreDifference) > 1e-7) return scoreDifference;

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
  const primaryCandidate = [...candidates].sort((a, b) => (
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
    explanation: status === 'matched'
      ? 'The automatic match reaches the requested ionic targets within tolerance.'
      : 'The automatic match is the best available primary route; internal alternatives trade water coverage, salt coverage, and ion priority differently.',
  };
}

const WATER_METADATA_FIELDS: { key: keyof WaterMetadata; label: string; unit: string }[] = [
  { key: 'silica', label: 'Silica (SiO₂)', unit: 'mg/L' },
  { key: 'ph', label: 'pH', unit: '' },
  { key: 'tds', label: 'TDS', unit: 'mg/L' },
  { key: 'alkalinity', label: 'Alkalinity', unit: 'mg/L as CaCO₃' },
];

function metadataToStrings(metadata?: WaterMetadata): Partial<Record<keyof WaterMetadata, string>> {
  if (!metadata) return {};
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
      .map(([key, value]) => [key, String(value)]),
  ) as Partial<Record<keyof WaterMetadata, string>>;
}

function WaterVolumeStepper({
  value,
  onChange,
  accent = 'sky',
}: {
  value: string;
  onChange: (value: string) => void;
  accent?: 'sky' | 'indigo';
}) {
  const repeatTimeoutRef = useRef<number | null>(null);
  const repeatIntervalRef = useRef<number | null>(null);
  const currentValue = Math.max(0, Math.round(num(value)));
  const currentValueRef = useRef(currentValue);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    currentValueRef.current = currentValue;
  }, [currentValue]);

  const stopRepeating = useCallback(() => {
    if (repeatTimeoutRef.current !== null) window.clearTimeout(repeatTimeoutRef.current);
    if (repeatIntervalRef.current !== null) window.clearInterval(repeatIntervalRef.current);
    repeatTimeoutRef.current = null;
    repeatIntervalRef.current = null;
  }, []);

  const adjust = useCallback((delta: number) => {
    const nextValue = Math.max(0, currentValueRef.current + delta);
    currentValueRef.current = nextValue;
    onChangeRef.current(String(nextValue));
  }, []);

  const startRepeating = useCallback((delta: number) => {
    stopRepeating();
    adjust(delta);
    repeatTimeoutRef.current = window.setTimeout(() => {
      repeatIntervalRef.current = window.setInterval(() => adjust(delta), 100);
    }, 350);
  }, [adjust, stopRepeating]);

  useEffect(() => stopRepeating, [stopRepeating]);

  const buttonTone = accent === 'indigo'
    ? 'border-indigo-400/40 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/25'
    : 'border-sky-400/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/25';

  return (
    <div className="flex items-center gap-2" aria-label="Water volume adjustment">
      <button
        type="button"
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId);
          startRepeating(-1);
        }}
        onPointerUp={stopRepeating}
        onPointerCancel={stopRepeating}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-lg font-semibold leading-none transition ${buttonTone}`}
        aria-label="Decrease water volume by 1 mL"
        title="Decrease by 1 mL (hold to repeat)"
      >
        −
      </button>
      <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-slate-300">{fmt(currentValue)} mL</span>
      <button
        type="button"
        onPointerDown={event => {
          event.currentTarget.setPointerCapture(event.pointerId);
          startRepeating(1);
        }}
        onPointerUp={stopRepeating}
        onPointerCancel={stopRepeating}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-lg font-semibold leading-none transition ${buttonTone}`}
        aria-label="Increase water volume by 1 mL"
        title="Increase by 1 mL (hold to repeat)"
      >
        +
      </button>
    </div>
  );
}

function metadataToNumbers(metadata: Partial<Record<keyof WaterMetadata, string>>): WaterMetadata | undefined {
  const values: WaterMetadata = {};
  for (const [key, rawValue] of Object.entries(metadata) as [keyof WaterMetadata, string | undefined][]) {
    const value = parseFloat(rawValue ?? '');
    if (Number.isFinite(value) && value >= 0) values[key] = value;
  }
  return Object.keys(values).length > 0 ? values : undefined;
}

interface CommunityWater {
  id: number;
  name: string;
  ions: Record<string, number>;
  shared: string;
  metadata?: WaterMetadata;
}

type WaterComparisonSource = {
  key: string;
  name: string;
  ions: Record<string, number>;
  databaseId?: number;
  metadata?: WaterMetadata;
};

const COMPARISON_ION_IDS: IonId[] = [
  'sodium', 'potassium', 'magnesium', 'calcium', 'chloride', 'sulfate', 'bicarbonate',
];

const COMPARISON_ION_LABELS: Record<IonId, string> = {
  sodium: 'Na',
  potassium: 'K',
  magnesium: 'Mg',
  calcium: 'Ca',
  chloride: 'Cl',
  sulfate: 'SO₄',
  bicarbonate: 'HCO₃',
  carbonate: 'CO₃',
  citrates: 'Cit',
  bicitrates: 'BiCit',
  biphosphates: 'BiPO₄',
  phosphates: 'PO₄',
};

function numericIons(ions: Record<string, number | string | undefined>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(ions).flatMap(([id, value]) => {
      const parsed = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? [[id, parsed]] : [];
    }),
  );
}

function waterIonSignature(ions: Record<string, number>): string {
  return COMPARISON_ION_IDS
    .map(id => `${id}:${(ions[id] ?? 0).toFixed(4)}`)
    .join('|');
}

function waterIonDistance(source: Record<string, number>, candidate: Record<string, number>): number {
  const distances = COMPARISON_ION_IDS.map(id => {
    const sourceValue = source[id] ?? 0;
    const candidateValue = candidate[id] ?? 0;
    // Normalize each ion independently so sodium/bicarbonate do not dominate
    // the comparison merely because their concentrations are larger.
    return Math.abs(candidateValue - sourceValue) / Math.max(sourceValue, candidateValue, 10);
  });
  return distances.reduce((sum, value) => sum + value, 0) / distances.length;
}

function formatIonDeviation(value: number): string {
  const rounded = Math.abs(value) >= 10 ? Math.round(Math.abs(value)) : Number(Math.abs(value).toFixed(1));
  if (rounded === 0) return '0';
  return `${value > 0 ? '+' : '−'}${rounded}`;
}

function formatLiveIonPpm(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(4).replace(/\.?0+$/, '');
}

function createInactiveWatermancerResult(plan: WatermancerPlan): WatermancerSolverResult {
  const finalIons = completeIonTotals({});
  const primaryPlan: WatermancerRouteCandidate = {
    id: 'inactive',
    kind: 'primary',
    label: 'Watermancer inactive',
    explanation: 'Watermancer calculations are paused outside Watermancer mode.',
    plan,
    baseWaters: [],
    additionWaters: [],
    saltTargets: {},
    finalIons,
    deviations: watermancerRouteDeviations(finalIons, plan.targetIons),
    overshoots: [],
    score: 0,
  };
  return {
    primaryPlan,
    alternatives: [],
    status: 'blocked',
    finalIons,
    deviations: primaryPlan.deviations,
    overshoots: [],
    explanation: 'Watermancer calculations are paused outside Watermancer mode.',
  };
}

function App() {
  const [liters, setLiters] = useState('1');
  const [rows, setRows] = useState<SaltRow[]>(
    SALTS.map(s => ({ target: '', formIdx: s.defaultFormIdx ?? 0 })),
  );
  // Keep calculations/rendering safe across hot reloads and older in-memory
  // state when a new salt is added to the shared catalog.
  const safeRows = useMemo(
    () => SALTS.map((salt, index) => rows[index] ?? {
      target: '',
      formIdx: salt.defaultFormIdx ?? 0,
    }),
    [rows],
  );
  const [mineralWaters, setMineralWaters] = useState<MineralWaterEntry[]>([]);
  const [additionWaters, setAdditionWaters] = useState<MineralWaterEntry[]>([]);
  const [magnesiumPreference, setMagnesiumPreference] = useState<MagnesiumPreference>('original');
  const [autoFillPriorityPreset, setAutoFillPriorityPreset] = useState<AutoFillPriorityPreset>(() => loadAutoFillSettings().preset);
  const [autoFillCustomPriority, setAutoFillCustomPriority] = useState<IonId[]>(() => loadAutoFillSettings().customPriority);
  const [autoFillDeviationPpm, setAutoFillDeviationPpm] = useState(() => loadAutoFillSettings().deviationPpm);
  const [fillWaterNudgeSeen, setFillWaterNudgeSeen] = useState(false);
  const [overshootSettings, setOvershootSettings] = useState<OvershootSettings>(() => loadOvershootSettings());
  const [brewerDropsPerMl, setBrewerDropsPerMl] = useState(() => loadDropsPerMl());
  const [brewerFlavor, setBrewerFlavor] = useState<BrewerFlavorInput>(DEFAULT_BREWER_FLAVOR);
  const [brewerRecipeOverride, setBrewerRecipeOverride] = useState<Week1Recipe | null>(null);
  const [brewerRecipeHandoffToken, setBrewerRecipeHandoffToken] = useState(0);
  const [externalRecipeId, setExternalRecipeId] = useState('custom');
  const addMineralWater = (partial?: { name?: string; ions?: Partial<Record<IonId, string>>; metadata?: Partial<Record<keyof WaterMetadata, string>>; volumeMl?: string; sourceLocalId?: string }) => {
    const entry: MineralWaterEntry = {
      id: newMwId(),
      name: partial?.name ?? '',
      ions: partial?.ions ?? {},
      metadata: partial?.metadata ?? {},
      volumeMl: partial?.volumeMl ?? '0',
      sourceLocalId: partial?.sourceLocalId,
    };
    setMineralWaters(prev => {
      const duplicateSourceWater = entry.sourceLocalId && prev.some(existing =>
        existing.sourceLocalId === entry.sourceLocalId
        || (
          existing.name.trim() === entry.name.trim()
          && ACTIVE_ION_IDS.every(id => Math.abs(num(existing.ions[id] ?? '') - num(entry.ions[id] ?? '')) < 0.5)
        )
      );
      if (duplicateSourceWater) {
        return prev;
      }
      return [...prev, entry];
    });
    return entry;
  };
  const addReferenceWater = (water: typeof EMPIRICAL_WATERS[number]) => {
    const ions: Partial<Record<IonId, string>> = {};
    for (const [id, value] of Object.entries(water.ions)) {
      if (value > 0) ions[id as IonId] = String(value);
    }
    addMineralWater({
      name: water.name,
      ions,
      metadata: { tds: String(water.metadata.tds ?? '') },
      sourceLocalId: `reference:${water.id}`,
    });
  };
  const updateMineralWater = (id: string, patch: Partial<MineralWaterEntry>) => {
    setMineralWaters(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };
  const removeMineralWater = (id: string) => {
    setMineralWaters(prev => prev.filter(e => e.id !== id));
  };
  useEffect(() => {
    if (mineralWaters.some(entry => num(entry.volumeMl) > 0)) {
      setFillWaterNudgeSeen(true);
    }
  }, [mineralWaters]);
  const addAdditionWater = (partial?: { name?: string; ions?: Partial<Record<IonId, string>>; metadata?: Partial<Record<keyof WaterMetadata, string>>; volumeMl?: string }) => {
    const entry: MineralWaterEntry = {
      id: newMwId(),
      name: partial?.name ?? '',
      ions: partial?.ions ?? {},
      metadata: partial?.metadata ?? {},
      volumeMl: partial?.volumeMl ?? '0',
    };
    setAdditionWaters(prev => [...prev, entry]);
    return entry;
  };
  const updateAdditionWater = (id: string, patch: Partial<MineralWaterEntry>) => {
    setAdditionWaters(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };
  const removeAdditionWater = (id: string) => {
    setAdditionWaters(prev => prev.filter(e => e.id !== id));
  };
  useEffect(() => {
    localStorage.setItem(AUTO_FILL_SETTINGS_STORAGE_KEY, JSON.stringify({
      preset: autoFillPriorityPreset,
      customPriority: autoFillCustomPriority,
      deviationPpm: autoFillDeviationPpm,
    }));
  }, [autoFillPriorityPreset, autoFillCustomPriority, autoFillDeviationPpm]);
  useEffect(() => {
    localStorage.setItem(WATERMANCER_OVERSHOOT_STORAGE_KEY, JSON.stringify(overshootSettings));
  }, [overshootSettings]);
  useEffect(() => {
    localStorage.setItem(DROPPER_CALIBRATION_STORAGE_KEY, String(brewerDropsPerMl));
  }, [brewerDropsPerMl]);

  // ── Local waters (curated by user, stored in localStorage) ──
  const [localWaters, setLocalWaters] = useState<LocalWater[]>(() => loadLocalWaters());
  const saveWaters = useCallback((waters: LocalWater[]) => {
    setLocalWaters(waters);
    saveLocalWaters(waters);
  }, []);

  // ── Community waters browser (on-demand from API) ──
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const [communityWaters, setCommunityWaters] = useState<CommunityWater[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityWatersLoaded, setCommunityWatersLoaded] = useState(false);
  const [communityShareStatus, setCommunityShareStatus] = useState<Record<string, 'sharing' | 'shared' | 'error'>>({});
  const [waterComparisonOpen, setWaterComparisonOpen] = useState(false);
  const [selectedWaterComparisonKey, setSelectedWaterComparisonKey] = useState('');
  const loadCommunityWaters = async () => {
    setCommunityLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/waters`);
      if (resp.ok) {
        const data = await resp.json();
        setCommunityWaters(data.waters ?? []);
      }
    } catch { /* server may be down */ }
    setCommunityWatersLoaded(true);
    setCommunityLoading(false);
  };
  const openCommunityModal = async () => {
    setCommunityModalOpen(true);
    if (!communityWatersLoaded) await loadCommunityWaters();
  };

  // Profile + settings state
  const [profiles, setProfiles] = useState<WaterProfile[]>(() => loadProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => loadActiveProfileId());
  const [showTastePreference, setShowTastePreference] = useState(false);
  const [showBrewerSteps, setShowBrewerSteps] = useState<'dry' | 'dropper' | null>(null);
  const [appTab, setAppTab] = useState<AppTab>('calculator');
  const [nerdLevel, setNerdLevel] = useState<NerdLevel>(() => loadNerdLevel());
  const [watermancerTargetSource, setWatermancerTargetSource] = useState<WatermancerTargetSourceId>('safe-profile');
  const [watermancerUsedSaltIds, setWatermancerUsedSaltIds] = useState<string[]>([]);
  const [autoCraftPreset, setAutoCraftPreset] = useState<AutoCraftPreset>('closest-match');
  const [watermancerSaltObjective, setWatermancerSaltObjective] = useState<AutoCraftObjective>('balanced');
  const [watermancerRecalculationNonce, setWatermancerRecalculationNonce] = useState(0);
  const [watermancerBestMatchDeviationMode, setWatermancerBestMatchDeviationMode] = useState<WatermancerBestMatchDeviationMode | null>(null);
  const [watermancerIonSourcePreferences, setWatermancerIonSourcePreferences] = useState<Record<IonId, WatermancerIonSourcePreference>>(
    () => loadWatermancerIonSourcePreferences(),
  );
  useEffect(() => {
    localStorage.setItem(
      WATERMANCER_ION_SOURCE_STORAGE_KEY,
      JSON.stringify(watermancerIonSourcePreferences),
    );
  }, [watermancerIonSourcePreferences]);
  const [watermancerBestMatchPreview, setWatermancerBestMatchPreview] = useState<WatermancerBestMatchPreview | null>(null);
  const [watermancerAppliedBestMatchRoute, setWatermancerAppliedBestMatchRoute] = useState<WatermancerRouteCandidate | null>(null);
  const [watermancerBestMatchMessage, setWatermancerBestMatchMessage] = useState<string | null>(null);
  const [watermancerBestMatchRunning, setWatermancerBestMatchRunning] = useState(false);
  const [watermancerActionRunning, setWatermancerActionRunning] = useState(false);
  const [watermancerActionMessage, setWatermancerActionMessage] = useState<string | null>(null);
  const [watermancerPrecisionOpen, setWatermancerPrecisionOpen] = useState(false);
  const [watermancerPrecisionPlan, setWatermancerPrecisionPlan] = useState<'dry' | 'concentrate' | 'dropper'>('dry');
  const watermancerActionBusyRef = useRef(false);
  const watermancerActionGenerationRef = useRef(0);
   const [watermancerDoseOverridesMg, setWatermancerDoseOverridesMg] = useState<Record<string, number>>({});
  const [watermancerResultSticky, setWatermancerResultSticky] = useState(false);
  const [sodiumCorrectionOn, setSodiumCorrectionOn] = useState(false);
  const [wmProfiles, setWmProfiles] = useState<WatermancerProfile[]>(() => loadWatermancerProfiles());
  const [activeRecipeId, setActiveRecipeId] = useState<string>('custom');
  const [savedRecipes, setSavedRecipes] = useState<SaltRecipe[]>(() => loadSavedRecipes());
  useEffect(() => { saveSavedRecipes(savedRecipes); }, [savedRecipes]);

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? AIKI_DEFAULT_PROFILE;
  const activeRanges: RangeSet = activeProfile.ranges;
  const showAlchemist = nerdLevel === 'alchemist';
  const showWatermancer = nerdLevel === 'watermancer';
  const effectiveAutoFillPreset: AutoFillPriorityPreset = showAlchemist
    ? 'balanced-gh-kh'
    : autoFillPriorityPreset;
  const activeAutoFillPriority = effectiveAutoFillPreset === 'custom'
    ? autoFillCustomPriority
    : AUTO_FILL_PRIORITY_PRESETS[effectiveAutoFillPreset].ions;
  const effectiveAutoFillDeviationPpm = showAlchemist ? 0 : autoFillDeviationPpm;
  const modeAccent = nerdLevel === 'alchemist'
    ? 'from-emerald-600 to-teal-500'
    : nerdLevel === 'watermancer'
      ? 'from-indigo-600 to-cyan-500'
      : 'from-sky-600 to-cyan-500';
  const modeGuide = nerdLevel === 'alchemist'
    ? {
        eyebrow: 'Recipe lab',
        title: 'Build a clean mineral recipe',
        description: 'Start from 0-TDS water, tune the salt recipe, and prepare a reliable concentrate without source-water noise.',
        tags: ['Salts first', 'GH / KH', 'Concentrate safety'],
        tone: 'border-emerald-400/25 bg-emerald-500/[0.06] text-emerald-200',
      }
    : nerdLevel === 'watermancer'
      ? {
          eyebrow: 'Ionic target studio',
          title: 'Craft water around your ionic targets',
          description: 'Set the ions you want in the finished water, then use mineral waters for coverage and addition salts to close the remaining gaps.',
          tags: ['Set ion targets', 'Mineral waters', 'Addition salts'],
          tone: 'border-indigo-400/25 bg-indigo-500/[0.07] text-indigo-200',
        }
      : {
          eyebrow: 'Flavor builder',
          title: 'Choose a starting direction',
          description: 'Shape the cup with a simple flavor-first recipe using RO / distilled 0 TDS water.',
          tags: ['Flavor first', 'Concentrate drops', 'Simple dosing'],
          tone: 'border-sky-400/25 bg-sky-500/[0.06] text-sky-200',
        };
  const waterComparisonSources = useMemo<WaterComparisonSource[]>(() => {
    const seenProfiles = new Set<string>();
    const sources: WaterComparisonSource[] = [];
    const addUnique = (source: WaterComparisonSource) => {
      const signature = waterIonSignature(source.ions);
      if (seenProfiles.has(signature)) return;
      seenProfiles.add(signature);
      sources.push(source);
    };

    // Prefer the water currently in the base, then saved waters, then the
    // database catalog. This keeps adding a water from creating duplicate
    // selector options for the same modeled ion profile.
    mineralWaters.forEach(entry => addUnique({
      key: `current:${entry.id}`,
      name: entry.name.trim() || 'Current base water',
      ions: numericIons(entry.ions),
      metadata: metadataToNumbers(entry.metadata),
    }));
    localWaters.forEach(water => addUnique({
      key: `saved:${water.id}`,
      name: water.name || 'Saved water',
      ions: numericIons(water.ions),
      databaseId: water.sourceId,
      metadata: water.metadata,
    }));
    communityWaters
      .filter(water => water.shared === 'yes')
      .forEach(water => addUnique({
        key: `database:${water.id}`,
        name: water.name || `Water #${water.id}`,
        ions: numericIons(water.ions),
        databaseId: water.id,
        metadata: water.metadata,
      }));

    return sources;
  }, [mineralWaters, localWaters, communityWaters]);
  const selectedWaterComparisonSource = useMemo(
    () => waterComparisonSources.find(source => source.key === selectedWaterComparisonKey) ?? waterComparisonSources[0],
    [selectedWaterComparisonKey, waterComparisonSources],
  );
  const closestWaterMatch = useMemo(() => {
    if (!selectedWaterComparisonSource) return undefined;
    const selectedSignature = waterIonSignature(selectedWaterComparisonSource.ions);
    return communityWaters
      .filter(water => water.shared === 'yes' && water.id !== selectedWaterComparisonSource.databaseId)
      .map(water => {
        const ions = numericIons(water.ions);
        return {
          water,
          ions,
          distance: waterIonDistance(selectedWaterComparisonSource.ions, ions),
        };
      })
      .filter(match => waterIonSignature(match.ions) !== selectedSignature)
      .sort((a, b) => a.distance - b.distance)[0];
  }, [communityWaters, selectedWaterComparisonSource]);
  const handleNerdLevelChange = (level: NerdLevel) => {
    if (nerdLevel === 'watermancer' && level !== 'watermancer') {
      // Invalidate any deferred best-match callback before leaving the
      // Watermancer workspace so it cannot write results into another mode.
      watermancerActionGenerationRef.current += 1;
      watermancerActionBusyRef.current = false;
      setWatermancerBestMatchRunning(false);
      setWatermancerActionRunning(false);
      setWatermancerActionMessage(null);
    }
    if (nerdLevel === 'alchemist' && level !== 'alchemist') {
      // Concentrate controls belong to the Alchemist recipe lab. Do not let
      // their hidden state change Watermancer or Brewer salt amounts/labels.
      setConcentrateOn(false);
      setSplitMode(false);
    }
    if (level === 'brewer' && nerdLevel !== 'brewer') {
      // Brewer is a lightweight flavor-first workspace. Do not carry the
      // active Watermancer recipe and source-water graph into it: that keeps
      // hidden calculations alive and makes the builder feel sluggish.
      setBrewerFlavor(DEFAULT_BREWER_FLAVOR);
      setBrewerRecipeOverride(null);
      setRows(defaultBrewerRows());
      setMineralWaters([]);
      setAdditionWaters([]);
      setLiters('1');
      setActiveRecipeId('custom');
      setExternalRecipeId('custom');
      setMagnesiumPreference('original');
      setWatermancerTargetSource('safe-profile');
      setWatermancerUsedSaltIds([]);
      setAutoCraftPreset('closest-match');
      setWatermancerSaltObjective('balanced');
      setWatermancerBestMatchDeviationMode(null);
      setWatermancerBestMatchPreview(null);
      setWatermancerAppliedBestMatchRoute(null);
      setWatermancerBestMatchMessage(null);
      setWatermancerBestMatchRunning(false);
      setWatermancerActionRunning(false);
      setWatermancerActionMessage(null);
      setWatermancerRecalculationNonce(0);
      setWatermancerDoseOverridesMg({});
      setWatermancerResultSticky(false);
      setSodiumCorrectionOn(false);
      setFillWaterNudgeSeen(false);
    }
    setNerdLevel(level);
  };

  // Persist on changes
  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => { saveActiveProfileId(activeProfileId); }, [activeProfileId]);
  useEffect(() => { saveNerdLevel(nerdLevel); }, [nerdLevel]);
  useEffect(() => { saveWatermancerProfiles(wmProfiles); }, [wmProfiles]);

  const handleSelectProfile = (id: string) => setActiveProfileId(id);
  const handleSaveProfile = (profile: WaterProfile) => {
    setProfiles(prev => {
      const existing = prev.find(p => p.id === profile.id);
      if (existing) return prev.map(p => p.id === profile.id ? profile : p);
      return [...prev, profile];
    });
    setActiveProfileId(profile.id);
  };
  const handleDeleteProfile = (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) setActiveProfileId(AIKI_DEFAULT_PROFILE.id);
  };
  const handleSaveWmProfile = (profile: WatermancerProfile) => {
    setWmProfiles(prev => {
      const existing = prev.find(p => p.id === profile.id);
      if (existing) return prev.map(p => p.id === profile.id ? profile : p);
      return [...prev, profile];
    });
  };

  const handleApplyTasteInference = (inference: TasteInference) => {
    setActiveRecipeId('custom');
    setExternalRecipeId('custom');
    setBrewerRecipeOverride({
      id: inference.recipe.id,
      targets: Object.fromEntries(
        Object.entries(inference.recipe.salts).map(([id, entry]) => [id, num(entry.target)]),
      ),
      formIdx: Object.fromEntries(
        Object.entries(inference.recipe.salts).map(([id, entry]) => [id, entry.formIdx]),
      ),
    });
    setRows(SALTS.map(salt => {
      const entry = inference.recipe.salts[salt.id];
      return entry
        ? { target: normalizeSaltTarget(entry.target), formIdx: entry.formIdx }
        : { target: '', formIdx: salt.defaultFormIdx ?? 0 };
    }));
    setShowTastePreference(false);
  };

  const L = num(liters);
  const batchMl = L * 1000;

  // Combined mineral-water state. Both base and addition sources contribute to
  // the final batch; sourceScale keeps overfilled entries physically possible.
  const rawAdditionMl = additionWaters.reduce((s, e) => s + num(e.volumeMl), 0);
  const rawBaseMl = mineralWaters.reduce((s, e) => s + num(e.volumeMl), 0);
  const rawSourceMl = rawBaseMl + rawAdditionMl;
  // If sources exceed the final batch, normalize their proportions so the
  // displayed and calculated water still totals exactly one batch.
  const sourceScale = batchMl > 0 ? Math.min(1, batchMl / rawSourceMl || 0) : 0;
  const totalMineralMl = rawAdditionMl * sourceScale;
  const totalBaseMl = rawBaseMl * sourceScale;
  const tdsMl = Math.max(batchMl - totalMineralMl - totalBaseMl, 0);
  const overfill = rawSourceMl > batchMl && batchMl > 0;
  const dil = batchMl > 0 ? (totalMineralMl + totalBaseMl) / batchMl : 0;

  const saltTargets = useMemo(() => {
    const m: Record<string, number> = {};
    SALTS.forEach((s, i) => { m[s.id] = num(safeRows[i].target); });
    return m;
  }, [safeRows]);

  const brewerSuggestedSaltTargets = useMemo(
    () => brewerSaltSuggestion(brewerFlavor),
    [brewerFlavor],
  );
  const brewerSuggestedIons = useMemo(
    () => computeIonTotals(brewerSuggestedSaltTargets, {}, 1),
    [brewerSuggestedSaltTargets],
  );
  const applyBrewerFlavor = (flavor: BrewerFlavorInput) => {
    const suggestedSaltTargets = brewerSaltSuggestion(flavor);
    setBrewerRecipeOverride(null);
    setActiveRecipeId('custom');
    setExternalRecipeId('custom');
    setRows(SALTS.map(salt => ({
      target: suggestedSaltTargets[salt.id]
        ? String(suggestedSaltTargets[salt.id])
        : '',
      formIdx: salt.defaultFormIdx ?? 0,
    })));
  };
  const handleBrewerFlavorChange = (flavor: BrewerFlavorInput) => {
    setBrewerFlavor(flavor);
    applyBrewerFlavor(flavor);
  };
  const handleApplyWeek1Recipe = (recipe: Week1Recipe) => {
    setBrewerRecipeOverride(recipe);
    setActiveRecipeId('custom');
    setExternalRecipeId('custom');
    setBrewerRecipeHandoffToken(token => token + 1);
    setRows(SALTS.map(salt => ({
      target: recipe.targets[salt.id] ? String(recipe.targets[salt.id]) : '',
      formIdx: recipe.formIdx[salt.id] ?? salt.defaultFormIdx ?? 0,
    })));
  };
  const scrollToWeek1Guide = () => {
    const guide = document.getElementById('brewer-week1-guide');
    if (!guide) return;
    guide.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => guide.focus({ preventScroll: true }), 450);
  };

  // Weighted-average concentrations across all bottled water sources. Base
  // water and addition water are both part of the final batch composition.
  const combinedBottledIons = useMemo(() => {
    const m = {} as Partial<Record<IonId, number>>;
    if (!showAlchemist && !showWatermancer) {
      for (const id of ACTIVE_ION_IDS) m[id] = 0;
      return m;
    }
    for (const id of ACTIVE_ION_IDS) {
      let weighted = 0, totalVol = 0;
      for (const entry of [...mineralWaters, ...additionWaters]) {
        const vol = num(entry.volumeMl);
        if (vol > 0) {
          weighted += (num(entry.ions[id] ?? '') * vol);
          totalVol += vol;
        }
      }
      m[id] = totalVol > 0 ? weighted / totalVol : 0;
    }
    return m;
  }, [mineralWaters, additionWaters, showAlchemist, showWatermancer]);

  const ionTotals = useMemo(
    () => computeIonTotals(saltTargets, combinedBottledIons, showAlchemist || showWatermancer ? dil : 1),
    [saltTargets, combinedBottledIons, dil, showAlchemist, showWatermancer],
  );
  // Brewer is intentionally a simple RO / distilled water workflow. Keep its
  // flavor-generated recipe independent from the advanced water-aware targets
  // used by Alchemist and Watermancer.
  const brewerActiveSaltTargets = useMemo(
    () => brewerRecipeOverride?.targets ?? brewerSuggestedSaltTargets,
    [brewerRecipeOverride, brewerSuggestedSaltTargets],
  );
  const brewerActiveIons = useMemo(
    () => computeIonTotals(brewerActiveSaltTargets, {}, 1),
    [brewerActiveSaltTargets],
  );
  const brewerModeSaltTargets = nerdLevel === 'brewer' ? brewerActiveSaltTargets : saltTargets;
  const brewerModeIonTotals = nerdLevel === 'brewer' ? brewerActiveIons : ionTotals;
  const brewerModeGh = computeGH(brewerModeIonTotals);
  const brewerModeKh = computeKH(brewerModeIonTotals);
  const brewerModeTds = Object.values(brewerModeIonTotals).reduce((total, ppm) => total + ppm, 0);

  const hasMineralWater = useMemo(
    () => (showAlchemist || showWatermancer) && [...mineralWaters, ...additionWaters].some(entry => num(entry.volumeMl) > 0),
    [showAlchemist, showWatermancer, mineralWaters, additionWaters],
  );

  // Full recipe contribution without base/addition water. These are the
  // targets that mineral-water coverage must replace.
  const saltOnlyIons = useMemo(
    () => computeIonTotals(saltTargets, {}, 1),
    [saltTargets],
  );
  const allRecipesForWatermancer = [...RECIPES, ...savedRecipes];
  const watermancerIonTargets = useMemo<Partial<Record<IonId, number>>>(() => {
    if (watermancerTargetSource === 'salt-table') return saltOnlyIons;
    if (watermancerTargetSource.startsWith('profile:')) {
      const pId = watermancerTargetSource.slice('profile:'.length);
      const p = profiles.find(item => item.id === pId);
      if (p) return Object.fromEntries(
        ACTIVE_ION_IDS.map(id => [id, p.ranges[id].greenMax]),
      ) as Partial<Record<IonId, number>>;
    }
    if (watermancerTargetSource.startsWith('recipe:')) {
      const recipeId = watermancerTargetSource.slice('recipe:'.length);
      const recipe = allRecipesForWatermancer.find(item => item.id === recipeId);
      return recipe ? ionTotalsForSaltRecipe(recipe) : {};
    }
    if (watermancerTargetSource.startsWith('external:')) {
      const recipeId = watermancerTargetSource.slice('external:'.length);
      const recipe = ROBERT_ASAMI_RECIPES.find(item => item.id === recipeId);
      return recipe ? ionTotalsForSaltRecipe(recipe) : {};
    }
    if (watermancerTargetSource.startsWith('reference:')) {
      const referenceId = watermancerTargetSource.slice('reference:'.length);
      return EMPIRICAL_WATERS.find(item => item.id === referenceId)?.ions ?? {};
    }
    if (watermancerTargetSource.startsWith('saved:')) {
      const pId = watermancerTargetSource.slice('saved:'.length);
      const p = wmProfiles.find(item => item.id === pId);
      if (p) return p.targets;
    }
    return Object.fromEntries(
      ACTIVE_ION_IDS.map(id => [id, activeRanges[id].greenMax]),
    ) as Partial<Record<IonId, number>>;
  }, [activeRanges, allRecipesForWatermancer, profiles, saltOnlyIons, watermancerTargetSource, wmProfiles]);
  // Combined contribution from all bottled waters (base + addition, already diluted)
  const bottledIons = useMemo(() => {
    const m = {} as Record<IonId, number>;
    for (const ion of IONS) {
      let total = 0;
      for (const entry of [...mineralWaters, ...additionWaters]) {
        const vol = num(entry.volumeMl) * sourceScale;
        if (vol > 0 && batchMl > 0) {
          total += (num(entry.ions[ion.id] ?? '') * vol) / batchMl;
        }
      }
      m[ion.id] = total;
    }
    return m;
  }, [mineralWaters, additionWaters, batchMl, sourceScale]);
  const watermancerIonGaps = Object.fromEntries(
    ACTIVE_ION_IDS.map(id => [
      id,
      Math.max((watermancerIonTargets[id] ?? 0) - (bottledIons[id] ?? 0), 0),
    ]),
  ) as Partial<Record<IonId, number>>;
  const watermancerSaltOptions = useMemo(() => SALTS.map((salt, index) => {
    const form = salt.hydrationForms[rows[index]?.formIdx ?? salt.defaultFormIdx ?? 0];
    const targetPpm = computeSaltGapOptionPpm(salt, watermancerIonGaps);
    return {
      salt,
      form,
      targetPpm: Number.isFinite(targetPpm) ? Math.max(targetPpm, 0) : 0,
      mg: Number.isFinite(targetPpm) && targetPpm > 0
        ? computeSaltMg(targetPpm, L, form.molarMass, salt.anhydrousMass)
        : 0,
    };
  }), [L, rows, watermancerIonGaps]);
  const watermancerFixedSaltDoses = useMemo(() => {
    const fixedDoses: Record<string, number> = {};
    SALTS.forEach((salt, index) => {
      const overrideMg = watermancerDoseOverridesMg[salt.id];
      const form = salt.hydrationForms[rows[index]?.formIdx ?? salt.defaultFormIdx ?? 0];
      if (
        watermancerUsedSaltIds.includes(salt.id)
        && Object.prototype.hasOwnProperty.call(watermancerDoseOverridesMg, salt.id)
        && L > 0
      ) {
        fixedDoses[salt.id] = Math.max(0, Number(overrideMg) || 0) * salt.anhydrousMass / (L * form.molarMass);
      }
    });
    return fixedDoses;
  }, [L, rows, watermancerDoseOverridesMg, watermancerUsedSaltIds]);
  const watermancerPlan = useMemo<WatermancerPlan>(() => ({
    targetIons: watermancerIonTargets,
    selectedWaters: [...mineralWaters, ...additionWaters],
    selectedSalts: [...watermancerUsedSaltIds],
    fixedWaterVolumes: Object.fromEntries(
      [...mineralWaters, ...additionWaters].map(entry => [entry.id, num(entry.volumeMl)]),
    ),
    fixedSaltDoses: watermancerFixedSaltDoses,
    strategy: autoCraftPreset,
    saltObjective: watermancerSaltObjective,
    ionPriority: [...activeAutoFillPriority],
    allowOvershoot: overshootSettings.enabled || watermancerBestMatchDeviationMode === 'permissive',
    allowedOvershootIons: overshootSettings.enabled ? [...overshootSettings.allowedIons] : [],
    overshootLimits: overshootSettings.enabled ? { ...overshootSettings.limits } : {},
    // Deficits are strict by default. A user-entered deviation in the
    // per-ion policy box is the only source of a soft deficit allowance.
    softDeficitIons: watermancerBestMatchDeviationMode
      ? watermancerBestMatchDeviationMode === 'permissive'
        ? ACTIVE_ION_IDS.filter(id => (watermancerIonTargets[id] ?? 0) > 0)
        : []
      : overshootSettings.enabled
        ? overshootSettings.allowedIons.filter(id => (overshootSettings.limits[id] ?? 0) > 0)
        : [],
    softDeficitLimits: watermancerBestMatchDeviationMode
      ? watermancerBestMatchDeviationMode === 'permissive'
        ? Object.fromEntries(
          ACTIVE_ION_IDS
            .filter(id => (watermancerIonTargets[id] ?? 0) > 0)
            .map(id => [id, Math.max(watermancerIonTargets[id] ?? 0, 0) * 0.1]),
        )
        : {}
      : overshootSettings.enabled
        ? Object.fromEntries(
          overshootSettings.allowedIons
            .filter(id => (overshootSettings.limits[id] ?? 0) > 0)
            .map(id => [id, overshootSettings.limits[id] ?? 0]),
        )
        : {},
    minimumSaltDosePpm: Object.fromEntries(
      SALTS.map((salt, index) => {
        const form = salt.hydrationForms[rows[index]?.formIdx ?? salt.defaultFormIdx ?? 0];
        const dosePpm = L > 0
          ? WATERMANCER_MIN_SALT_MG * salt.anhydrousMass / (L * form.molarMass)
          : 0;
        return [salt.id, dosePpm];
      }),
    ),
    overshootOrder: [...activeAutoFillPriority],
    ionSourcePreferences: { ...watermancerIonSourcePreferences },
  }), [
    activeAutoFillPriority,
    additionWaters,
    autoCraftPreset,
    mineralWaters,
    overshootSettings,
    rows,
    L,
    watermancerSaltObjective,
    watermancerIonTargets,
    watermancerUsedSaltIds,
    watermancerBestMatchDeviationMode,
    watermancerFixedSaltDoses,
    watermancerIonSourcePreferences,
  ]);
  const watermancerInputSignature = useMemo(
    () => JSON.stringify({
      plan: watermancerPlan,
      batchMl,
      baseWaters: mineralWaters,
      additionWaters,
    }),
    [additionWaters, batchMl, mineralWaters, watermancerPlan],
  );
  const watermancerInputSignatureRef = useRef(watermancerInputSignature);
  watermancerInputSignatureRef.current = watermancerInputSignature;
  const watermancerLiveResult = useMemo(
    () => showWatermancer
      ? solveWatermancerRoutes({
        plan: watermancerPlan,
        batchMl,
        baseWaters: mineralWaters,
        additionWaters,
      })
      : createInactiveWatermancerResult(watermancerPlan),
    [additionWaters, batchMl, mineralWaters, showWatermancer, watermancerPlan, watermancerRecalculationNonce],
  );
  const beginWatermancerAction = () => {
    if (watermancerActionBusyRef.current) return false;
    watermancerActionBusyRef.current = true;
    setWatermancerActionRunning(true);
    setWatermancerActionMessage(null);
    return true;
  };
  const finishWatermancerAction = () => {
    watermancerActionBusyRef.current = false;
    setWatermancerActionRunning(false);
  };
  const finishWatermancerActionAfterPaint = () => {
    window.setTimeout(finishWatermancerAction, 0);
  };
  const handleFillBaseWaters = () => {
    if (!beginWatermancerAction()) return;
    setFillWaterNudgeSeen(true);
    setMineralWaters(prev => autoFillWaterVolumes(
      prev,
      batchMl,
      autoFillTargets,
      additionWaters,
      activeAutoFillPriority,
      effectiveAutoFillDeviationPpm,
      showAlchemist || noRecipeSelected,
      autoFillUsesRecipeTargets,
      showAlchemist ? 0.1 : 1,
      showAlchemist ? 0.5 : 0,
      {
        enabled: showWatermancer && overshootSettings.enabled,
        allowedIons: overshootSettings.allowedIons,
        maxPpm: overshootSettings.limits,
        softDeficitIons: showWatermancer && overshootSettings.enabled
          ? overshootSettings.allowedIons.filter(id => (overshootSettings.limits[id] ?? 0) > 0)
          : [],
        softDeficitLimits: showWatermancer && overshootSettings.enabled
          ? Object.fromEntries(
            overshootSettings.allowedIons
              .filter(id => (overshootSettings.limits[id] ?? 0) > 0)
              .map(id => [id, overshootSettings.limits[id] ?? 0]),
          )
          : {},
        priorityOrder: activeAutoFillPriority,
      },
    ));
    setWatermancerActionMessage('Base waters filled toward the current target.');
    finishWatermancerActionAfterPaint();
  };
  const handleFindBestWatermancerMatch = () => {
    if (!beginWatermancerAction()) return;
    setWatermancerBestMatchRunning(true);
    setWatermancerBestMatchMessage(null);
    const actionGeneration = watermancerActionGenerationRef.current;
    const snapshot = {
      plan: cloneWatermancerPlan(watermancerPlan),
      batchMl,
      baseWaters: cloneWatermancerWaters(mineralWaters),
      additionWaters: cloneWatermancerWaters(additionWaters),
      inputSignature: watermancerInputSignature,
    };
    const runSweep = () => {
      try {
        const isSnapshotCurrent = () => (
          isWatermancerActionSnapshotCurrent(
            actionGeneration,
            watermancerActionGenerationRef.current,
            snapshot.inputSignature,
            watermancerInputSignatureRef.current,
          )
        );
        if (!isSnapshotCurrent()) {
          if (actionGeneration === watermancerActionGenerationRef.current) {
            setWatermancerBestMatchMessage('Matching inputs changed before the sweep finished. Nothing was applied.');
          }
          return;
        }
        const sweep = findBestWatermancerMatch(snapshot);
        if (!isSnapshotCurrent()) {
          if (actionGeneration === watermancerActionGenerationRef.current) {
            setWatermancerBestMatchMessage('Matching inputs changed during the sweep. Nothing was applied.');
          }
          return;
        }
        const winner = sweep.winner;
        if (!winner) {
          setWatermancerBestMatchPreview(null);
          setWatermancerBestMatchMessage('No usable match was found with the current waters, salts, and target settings.');
          return;
        }
        setWatermancerBestMatchPreview({
          route: cloneWatermancerRouteCandidate(winner.route),
          strategy: winner.strategy,
          saltObjective: winner.saltObjective,
          priorityPreset: winner.priorityPreset,
          deviationMode: winner.deviationMode,
          totalDeviation: winner.totalDeviation,
          status: winner.result.status === 'matched' ? 'matched' : 'partial',
          explanation: winner.result.explanation,
          inputSignature: snapshot.inputSignature,
        });
        setWatermancerBestMatchMessage(null);
      } catch {
        setWatermancerBestMatchPreview(null);
        setWatermancerBestMatchMessage('The best-match search could not finish. Please try again.');
      } finally {
        setWatermancerBestMatchRunning(false);
        finishWatermancerActionAfterPaint();
      }
    };
    // Give touch browsers one paint to show the busy state before the
    // synchronous 48-route sweep starts.
    window.requestAnimationFrame(() => window.setTimeout(runSweep, 0));
  };
  const handleUseWatermancerBestMatch = () => {
    const preview = watermancerBestMatchPreview;
    if (!watermancerBestMatchPreviewIsCurrent(preview, watermancerInputSignature)) {
      setWatermancerBestMatchPreview(null);
      setWatermancerBestMatchMessage('This recommendation is out of date. Find a new best match.');
      return;
    }
    if (!preview) return;
    const route = cloneWatermancerRouteCandidate(preview.route);
    setAutoCraftPreset(preview.strategy);
    setWatermancerSaltObjective(preview.saltObjective);
    setAutoFillPriorityPreset(preview.priorityPreset);
    setAutoFillCustomPriority([...route.plan.ionPriority]);
    setWatermancerBestMatchDeviationMode(preview.deviationMode);
    setWatermancerUsedSaltIds([...route.plan.selectedSalts]);
    setRows(currentRows => SALTS.map((salt, index) => ({
      target: (route.saltTargets[salt.id] ?? 0) > 0.000001
        ? String(Number(route.saltTargets[salt.id].toFixed(4)))
        : '',
      formIdx: currentRows[index]?.formIdx ?? salt.defaultFormIdx ?? 0,
    })));
    setWatermancerDoseOverridesMg(Object.fromEntries(
      Object.entries(route.plan.fixedSaltDoses).map(([saltId, dosePpm]) => {
        const saltIndex = SALTS.findIndex(salt => salt.id === saltId);
        const salt = SALTS[saltIndex];
        const formIdx = saltIndex >= 0
          ? rows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
          : 0;
        const form = salt?.hydrationForms[formIdx] ?? salt?.hydrationForms[salt.defaultFormIdx ?? 0];
        const massMg = salt && form && L > 0
          ? dosePpm * L * form.molarMass / salt.anhydrousMass
          : 0;
        return [saltId, massMg];
      }).filter(([, massMg]) => Number(massMg) > 0),
    ));
    setActiveRecipeId('custom');
    setExternalRecipeId('custom');
    setMineralWaters(cloneWatermancerWaters(route.baseWaters));
    setAdditionWaters(cloneWatermancerWaters(route.additionWaters));
    setWatermancerAppliedBestMatchRoute(route);
    setWatermancerBestMatchPreview(null);
    setWatermancerBestMatchMessage(null);
    setWatermancerActionMessage('Recommended match applied.');
    setWatermancerRecalculationNonce(current => current + 1);
  };
  const handleDismissWatermancerBestMatch = () => {
    setWatermancerBestMatchPreview(null);
    setWatermancerBestMatchMessage(null);
  };
  useEffect(() => {
    if (
      !watermancerBestMatchPreviewIsCurrent(watermancerBestMatchPreview, watermancerInputSignature)
    ) {
      setWatermancerBestMatchPreview(null);
    }
  }, [watermancerBestMatchPreview, watermancerInputSignature]);
  const appliedBestMatchRoute = watermancerAppliedBestMatchRoute
    && watermancerRouteMatchesCurrentInputs(
      watermancerAppliedBestMatchRoute,
      watermancerPlan,
      mineralWaters,
      additionWaters,
    )
    ? watermancerAppliedBestMatchRoute
    : null;
  const activeWatermancerRoute = useMemo(
    () => showWatermancer
      ? recalculateWatermancerRouteAtCurrentVolumes(
        {
          plan: watermancerPlan,
          batchMl,
          baseWaters: mineralWaters,
          additionWaters,
        },
        appliedBestMatchRoute ?? watermancerLiveResult.primaryPlan,
        (appliedBestMatchRoute ?? watermancerLiveResult.primaryPlan).saltTargets,
      )
      : watermancerLiveResult.primaryPlan,
    [
      additionWaters,
      appliedBestMatchRoute,
      batchMl,
      mineralWaters,
      showWatermancer,
      watermancerPlan,
      watermancerLiveResult,
    ],
  );
  const activeWatermancerSaltTargets = activeWatermancerRoute.saltTargets;
  const watermancerPrecisionRecommendation = useMemo(
    () => showWatermancer
      ? buildWatermancerPrecisionRecommendation(
        activeWatermancerRoute.saltTargets,
        rows,
        L,
        brewerDropsPerMl,
      )
      : null,
    [
      activeWatermancerRoute.saltTargets,
      brewerDropsPerMl,
      L,
      rows,
      showWatermancer,
    ],
  );
  const adjustWatermancerDose = (saltId: string, currentMg: number, deltaMg: number) => {
    setWatermancerDoseOverridesMg(current => ({
      ...current,
      [saltId]: Math.max(0, currentMg + deltaMg),
    }));
  };
    // Build the salt recommendation shown below the calculator. The sulfate /
    // chloride preference is a real source selection for magnesium, not merely
    // a sort order. Keep the user's actual recipe rows unchanged until they
    // choose to edit or apply the recommendation.
   const buildSuggestedSaltTargets = (currentBottledIons: Record<IonId, number>, waterIsPresent = hasMineralWater) => {
    const targets: Record<string, number> = {};
     SALTS.forEach((salt, i) => { targets[salt.id] = num(safeRows[i].target); });

    // Mineral water is part of the final batch, so reduce salts whose primary
    // ions are already supplied by that water. Co-ions remain visible in the
    // final-mixture totals and overshoot warning because they cannot be
    // removed independently from a real salt.
    const reduceForIon = (saltId: string, ionId: IonId) => {
      const salt = SALTS.find(item => item.id === saltId);
      const fraction = salt?.ions.find(contribution => contribution.ionId === ionId)?.fraction ?? 0;
      if (fraction <= 0) return;
      const originalTarget = targets[saltId] ?? 0;
      const originalIon = originalTarget * fraction;
       targets[saltId] = Math.max(originalIon - (currentBottledIons[ionId] ?? 0), 0) / fraction;
    };

     if (waterIsPresent) {
      reduceForIon('cacl2', 'calcium');
      reduceForIon('nahco3', 'bicarbonate');
      reduceForIon('khco3', 'potassium');
      reduceForIon('nacl', 'sodium');
    }

    const magnesiumSulfate = SALTS.find(s => s.id === 'mgso4');
    const magnesiumChloride = SALTS.find(s => s.id === 'mgcl2');
    if (waterIsPresent && magnesiumSulfate && magnesiumChloride) {
      const sulfateFraction = magnesiumSulfate.ions.find(c => c.ionId === 'magnesium')?.fraction ?? 0;
      const chlorideFraction = magnesiumChloride.ions.find(c => c.ionId === 'magnesium')?.fraction ?? 0;
      const originalSulfateTarget = num(rows[SALTS.findIndex(s => s.id === 'mgso4')]?.target);
      const originalChlorideTarget = num(rows[SALTS.findIndex(s => s.id === 'mgcl2')]?.target);
      const originalSulfateMg = originalSulfateTarget * sulfateFraction;
      const originalChlorideMg = originalChlorideTarget * chlorideFraction;
      const originalMgTotal = originalSulfateMg + originalChlorideMg;
      const remainingMagnesium = Math.max(
        (saltOnlyIons?.magnesium ?? 0) - (currentBottledIons?.magnesium ?? 0),
        0,
      );

      if (originalMgTotal > 0 && sulfateFraction > 0 && chlorideFraction > 0) {
        const originalSulfateShare = originalSulfateMg / originalMgTotal;
        const preferredSulfateShare = magnesiumPreference === 'sulfates' ? 1
          : magnesiumPreference === 'chlorides' ? 0
            : originalSulfateShare;
        // Preference is intentionally soft: keep 25% of the original
        // sulfate/chloride balance instead of replacing one form entirely.
        const sulfateShare = originalSulfateShare * 0.25 + preferredSulfateShare * 0.75;
        targets.mgso4 = (remainingMagnesium * sulfateShare) / sulfateFraction;
        targets.mgcl2 = (remainingMagnesium * (1 - sulfateShare)) / chlorideFraction;
      } else if (remainingMagnesium > 0) {
        const useSulfate = magnesiumPreference !== 'chlorides';
        targets.mgso4 = useSulfate && sulfateFraction > 0 ? remainingMagnesium / sulfateFraction : 0;
        targets.mgcl2 = !useSulfate && chlorideFraction > 0 ? remainingMagnesium / chlorideFraction : 0;
      } else {
        targets.mgso4 = 0;
        targets.mgcl2 = 0;
      }
    }

    // Bicarbonate is a hard ceiling, not a co-ion that may overshoot. Both
    // bicarbonate salts contribute to the same KH target, so cap their
    // combined contribution after the individual source-water adjustments
    // above. Preserve the remaining NaHCO3/KHCO3 ratio when scaling.
     if (waterIsPresent) {
      const bicarbonateContributions = ['nahco3', 'khco3'].map(saltId => {
        const salt = SALTS.find(item => item.id === saltId);
        const fraction = salt?.ions.find(contribution => contribution.ionId === 'bicarbonate')?.fraction ?? 0;
        return { saltId, fraction, contribution: (targets[saltId] ?? 0) * fraction };
      });
      const saltBicarbonate = bicarbonateContributions.reduce((total, item) => total + item.contribution, 0);
      const remainingBicarbonate = Math.max(
         (saltOnlyIons.bicarbonate ?? 0) - (currentBottledIons.bicarbonate ?? 0),
        0,
      );

      if (saltBicarbonate > remainingBicarbonate + 0.0001) {
        const scale = saltBicarbonate > 0 ? remainingBicarbonate / saltBicarbonate : 0;
        for (const item of bicarbonateContributions) {
          targets[item.saltId] = item.fraction > 0
            ? (item.contribution * scale) / item.fraction
            : 0;
        }
      }
    }
    return targets;
   };
   const suggestedSaltTargets = useMemo(
     () => buildSuggestedSaltTargets(bottledIons),
     [rows, magnesiumPreference, saltOnlyIons, bottledIons, hasMineralWater],
   );

   // Watermancer's selected route is the source of truth for dosing.
  const selectedSuggestedSaltTargets = useMemo(() => {
    if (!showWatermancer) {
      return suggestedSaltTargets;
    }
     return activeWatermancerRoute.saltTargets;
   }, [activeWatermancerRoute, showWatermancer, suggestedSaltTargets]);
  const finalMixtureTargetIons = showWatermancer ? watermancerIonTargets : saltOnlyIons;

  const suggestedIonTotalsBeforeSodiumCorrection = useMemo(
    () => computeIonTotals(selectedSuggestedSaltTargets, combinedBottledIons, dil),
    [selectedSuggestedSaltTargets, combinedBottledIons, dil],
  );
  const sodiumCorrectionGap = Math.max(
    (finalMixtureTargetIons.sodium ?? 0) - (suggestedIonTotalsBeforeSodiumCorrection.sodium ?? 0),
    0,
  );
  const sodiumCorrectionAllowed = !showWatermancer
    || watermancerUsedSaltIds.includes('nacl');
  const sodiumCorrectionTarget = hasMineralWater && sodiumCorrectionAllowed && (showAlchemist || sodiumCorrectionOn)
    ? computeNaClTargetForSodiumGap(sodiumCorrectionGap)
    : 0;
  const practicalSodiumCorrectionTarget = showWatermancer
    && sodiumCorrectionTarget > 0
    && sodiumCorrectionTarget < (activeWatermancerRoute.plan.minimumSaltDosePpm?.nacl ?? 0)
    ? 0
    : sodiumCorrectionTarget;
  const effectiveSuggestedSaltTargets = useMemo<Record<string, number>>(() => ({
    ...selectedSuggestedSaltTargets,
    nacl: (selectedSuggestedSaltTargets.nacl ?? 0) + practicalSodiumCorrectionTarget,
  }), [practicalSodiumCorrectionTarget, selectedSuggestedSaltTargets]);

  // One dosing target map for every user-facing preparation surface. With
  // source water, this is the final salt contribution still needed after
  // water coverage, the bicarbonate ceiling, and any optional sodium correction.
  const dosingSaltTargets = (hasMineralWater || showWatermancer)
    ? effectiveSuggestedSaltTargets
    : saltTargets;

  const suggestedIonTotals = useMemo(
    () => computeIonTotals(effectiveSuggestedSaltTargets, combinedBottledIons, dil),
    [effectiveSuggestedSaltTargets, combinedBottledIons, dil],
  );
  const supplementalIonTotals = useMemo(
    () => computeSupplementalIonTotals(effectiveSuggestedSaltTargets),
    [effectiveSuggestedSaltTargets],
  );
  const finalMixtureOvershoots = useMemo(
    () => findIonOvershoots(suggestedIonTotals, finalMixtureTargetIons),
    [finalMixtureTargetIons, suggestedIonTotals],
  );
  const finalMixtureUnderdoses = useMemo(
    () => findIonUnderdoses(suggestedIonTotals, finalMixtureTargetIons),
    [finalMixtureTargetIons, suggestedIonTotals],
  );
  const ionProfileIons = suggestedIonTotals;
  const preferredMagnesiumSaltId = magnesiumPreference === 'sulfates'
    ? 'mgso4'
    : magnesiumPreference === 'chlorides'
      ? 'mgcl2'
      : null;
  const gh = computeGH(ionTotals);
  const kh = computeKH(ionTotals);
  const baseSaltGh = computeGH(saltOnlyIons);
  const baseSaltKh = computeKH(saltOnlyIons);
  const ghBottled = computeGH(bottledIons);
  const khBottled = computeKH(bottledIons);
  const ghSalt = baseSaltGh;
  const khSalt = baseSaltKh;
  const tdsSalt = useMemo(() => {
    // Recipe targets are ion concentrations. Sum only the salt-derived ions;
    // hydration water is not part of TDS.
    const recipeIons = computeIonTotals(saltTargets, {}, 1);
    return Object.values(recipeIons).reduce((total, ppm) => total + ppm, 0);
  }, [saltTargets]);
  const tdsMineral = useMemo(() => {
    // Use the same modeled ion contribution as the rest of the calculator.
    // Metadata TDS can include unmodeled substances and must not be added to
    // the ion-derived final result a second time.
    return hasMineralWater
      ? Object.values(bottledIons).reduce((total, ppm) => total + ppm, 0)
      : 0;
  }, [hasMineralWater, bottledIons]);
  const tds = tdsSalt;
  const finalGh = computeGH(suggestedIonTotals);
  const finalKh = computeKH(suggestedIonTotals);
  const finalTds = Object.values(suggestedIonTotals).reduce((total, ppm) => total + ppm, 0);
  const finalSaltIons = useMemo(
    () => computeIonTotals(effectiveSuggestedSaltTargets, {}, 1),
    [effectiveSuggestedSaltTargets],
  );
  const finalSaltGh = computeGH(finalSaltIons);
  const finalSaltKh = computeKH(finalSaltIons);
  const finalSaltTds = Object.values(finalSaltIons).reduce((total, ppm) => total + ppm, 0);
  const reviewFinalIons = activeWatermancerRoute?.finalIons ?? suggestedIonTotals;
  const reviewSaltIons = activeWatermancerRoute
    ? computeIonTotals(activeWatermancerRoute.saltTargets, {}, 1)
    : finalSaltIons;
  const reviewWaterIons = Object.fromEntries(
    IONS.map(({ id }) => [id, Math.max((reviewFinalIons[id] ?? 0) - (reviewSaltIons[id] ?? 0), 0)]),
  ) as Record<IonId, number>;
  const reviewFinalGh = computeGH(reviewFinalIons);
  const reviewFinalKh = computeKH(reviewFinalIons);
  const reviewFinalTds = Object.values(reviewFinalIons).reduce((total, ppm) => total + ppm, 0);
  const reviewSaltGh = computeGH(reviewSaltIons);
  const reviewSaltKh = computeKH(reviewSaltIons);
  const reviewSaltTds = Object.values(reviewSaltIons).reduce((total, ppm) => total + ppm, 0);
  const reviewWaterGh = computeGH(reviewWaterIons);
  const reviewWaterKh = computeKH(reviewWaterIons);
  const reviewWaterTds = Object.values(reviewWaterIons).reduce((total, ppm) => total + ppm, 0);
  const reviewTotalDeviation = activeWatermancerRoute
    ? totalWatermancerDeviation(
      reviewFinalIons,
      watermancerIonTargets,
      activeWatermancerRoute.plan,
    )
    : 0;
  const reviewDeviationCount = activeWatermancerRoute
    ? activeWatermancerRoute.deviations.filter(deviation => (
      Math.abs(watermancerDeviationBeyondPolicy(
        deviation,
        activeWatermancerRoute.plan,
      )) > 0.05
    )).length
    : 0;
  const completeWatermancerTargets = completeIonTotals(watermancerIonTargets);
  const originalTargetGh = computeGH(completeWatermancerTargets);
  const originalTargetKh = computeKH(completeWatermancerTargets);
  const originalTargetTds = IONS.reduce(
    (total, { id }) => total + completeWatermancerTargets[id],
    0,
  );
  const bicarbonateTarget = finalMixtureTargetIons.bicarbonate ?? 0;
  const bicarbonateFromWater = bottledIons.bicarbonate ?? 0;
  const bicarbonateWaterOvershoot = hasMineralWater
    && bicarbonateFromWater > bicarbonateTarget + 0.05;
  const tdsForRecipeSteps = useMemo(() => {
    const finalIons = computeIonTotals(
      hasMineralWater ? effectiveSuggestedSaltTargets : saltTargets,
      hasMineralWater ? combinedBottledIons : {},
      hasMineralWater ? dil : 1,
    );
    return Object.values(finalIons).reduce((total, ppm) => total + ppm, 0);
  }, [hasMineralWater, saltTargets, effectiveSuggestedSaltTargets, combinedBottledIons, dil]);
  const waterChemistry = useMemo(() => {
    let pHWeighted = 0;
    let pHVolume = 0;
    let alkalinityWeighted = 0;
    let alkalinityVolume = 0;
    for (const entry of [...mineralWaters, ...additionWaters]) {
      const volume = num(entry.volumeMl) * sourceScale;
      if (volume <= 0) continue;
      const pH = num(entry.metadata.ph ?? '');
      const alkalinity = num(entry.metadata.alkalinity ?? '');
      if (pH > 0) {
        pHWeighted += pH * volume;
        pHVolume += volume;
      }
      if (alkalinity > 0) {
        alkalinityWeighted += alkalinity * volume;
        alkalinityVolume += volume;
      }
    }
    const basePH = pHVolume > 0 ? pHWeighted / pHVolume : undefined;
    const baseAlkalinity = alkalinityVolume > 0 ? alkalinityWeighted / alkalinityVolume : undefined;
    const saltAlkalinity = Math.max(
      (saltOnlyIons.bicarbonate ?? 0) + 2 * (saltOnlyIons.carbonate ?? 0),
      0,
    ) * 50 / 61;
    const saltCitrate = Math.max(saltOnlyIons.citrates ?? 0, 0);
    const estimate = basePH !== undefined && baseAlkalinity !== undefined
      ? Math.max(4, Math.min(10, basePH
        + 0.12 * Math.log10(1 + saltAlkalinity / Math.max(baseAlkalinity, 1))
        - 0.08 * Math.log10(1 + saltCitrate / Math.max(baseAlkalinity, 1))))
      : undefined;
    return { basePH, baseAlkalinity, estimate };
  }, [mineralWaters, additionWaters, sourceScale, saltOnlyIons]);

  // ── Concentrate state ──────────────────────────────
  const [concentrateOn, setConcentrateOn] = useState(false);
  const [concentrateStrength, setConcentrateStrength] = useState(100);
  const [concentrateMl, setConcentrateMl] = useState('500');

  // ── Split stocks state ──────────────────────────────
  const [splitMode, setSplitMode] = useState(false);
  const [splitStrengths, setSplitStrengths] = useState<Record<string, number>>({
    hardness: 100, alkalinity: 100, citrate: 50,
  });
  const [splitMls, setSplitMls] = useState<Record<string, string>>({
    hardness: '500', alkalinity: '500', citrate: '500',
  });

  const concL = num(concentrateMl) / 1000;
  const concSaltTargets = useMemo(() => {
    const m: Record<string, number> = {};
    for (const salt of SALTS) {
      m[salt.id] = dosingSaltTargets[salt.id] ?? 0;
    }
    return m;
  }, [dosingSaltTargets]);

  const concWarnings: ConcentrateWarning[] = useMemo(
    () => concentrateOn ? checkConcentrate(concentrateStrength, concSaltTargets) : [],
    [concentrateOn, concentrateStrength, concSaltTargets],
  );

  const concFeasibility: { level: 'green' | 'amber' | 'red'; label: string } = useMemo(() => {
    const hasError = concWarnings.some(w => w.severity === 'error');
    const hasWarning = concWarnings.some(w => w.severity === 'warning');
    if (hasError) return { level: 'red', label: 'Split required' };
    if (hasWarning) return { level: 'amber', label: 'Split recommended' };
    return { level: 'green', label: 'Single stock OK' };
  }, [concWarnings]);

  // ── Reset state ────────────────────────────────────
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showWatermancerResetConfirm, setShowWatermancerResetConfirm] = useState(false);
  const handleReset = () => {
    setRows(SALTS.map(s => ({ target: '', formIdx: s.defaultFormIdx ?? 0 })));
    setBrewerFlavor(DEFAULT_BREWER_FLAVOR);
    setBrewerRecipeOverride(null);
    setMineralWaters([]);
    setAdditionWaters([]);
    setLiters('1');
    setActiveRecipeId('custom');
    setExternalRecipeId('custom');
    setConcentrateOn(false);
    setConcentrateStrength(100);
    setConcentrateMl('500');
    setSplitMode(false);
    setSplitStrengths({ hardness: 100, alkalinity: 100, citrate: 50 });
    setSplitMls({ hardness: '500', alkalinity: '500', citrate: '500' });
    setMagnesiumPreference('original');
    setWatermancerUsedSaltIds([]);
    setAutoCraftPreset('closest-match');
    setWatermancerBestMatchDeviationMode(null);
    setWatermancerBestMatchPreview(null);
    setWatermancerAppliedBestMatchRoute(null);
    setWatermancerBestMatchMessage(null);
    setWatermancerBestMatchRunning(false);
    setWatermancerRecalculationNonce(0);
    setWatermancerDoseOverridesMg({});
    setWatermancerResultSticky(false);
    setSodiumCorrectionOn(false);
    setShowResetConfirm(false);
  };
  const handleResetWatermancer = () => {
    // Invalidate deferred solver work before clearing the workspace so an
    // in-flight match cannot write stale results back into the reset state.
    watermancerActionGenerationRef.current += 1;
    watermancerActionBusyRef.current = false;
    setRows(SALTS.map(s => ({ target: '', formIdx: s.defaultFormIdx ?? 0 })));
    setMineralWaters([]);
    setAdditionWaters([]);
    setLiters('1');
    setActiveRecipeId('custom');
    setExternalRecipeId('custom');
    setMagnesiumPreference('original');
    setWatermancerTargetSource('safe-profile');
    setWatermancerUsedSaltIds([]);
    setAutoCraftPreset('closest-match');
    setWatermancerSaltObjective('balanced');
    setWatermancerBestMatchDeviationMode(null);
    setWatermancerBestMatchPreview(null);
    setWatermancerAppliedBestMatchRoute(null);
    setWatermancerBestMatchMessage(null);
    setWatermancerBestMatchRunning(false);
    setWatermancerActionRunning(false);
    setWatermancerActionMessage(null);
    setWatermancerPrecisionOpen(false);
    setWatermancerPrecisionPlan('dry');
    setWatermancerRecalculationNonce(0);
    setWatermancerDoseOverridesMg({});
    setWatermancerResultSticky(false);
    setSodiumCorrectionOn(false);
    setWaterComparisonOpen(false);
    setSelectedWaterComparisonKey('');
    setFillWaterNudgeSeen(false);
    setShowWatermancerResetConfirm(false);
  };

  // ── Split stocks derived state ──────────────────────
  const stockGroups = useMemo(
    () => (splitMode && concentrateOn) ? splitIntoStockGroups(concSaltTargets) : [],
    [splitMode, concentrateOn, concSaltTargets],
  );

  const splitGroupWarnings = useMemo(() => {
    const result: Record<string, ConcentrateWarning[]> = {};
    for (const group of stockGroups) {
      const groupTargets: Record<string, number> = {};
      for (const saltId of group.saltIds) groupTargets[saltId] = concSaltTargets[saltId] ?? 0;
      result[group.id] = checkConcentrate(splitStrengths[group.id] ?? 100, groupTargets);
    }
    return result;
  }, [stockGroups, splitStrengths, concSaltTargets]);

  const splitFeasibility: { level: 'green' | 'amber' | 'red'; label: string } = useMemo(() => {
    if (!splitMode || stockGroups.length === 0) return { level: 'green', label: 'Split OK' };
    const all = Object.values(splitGroupWarnings).flat();
    if (all.some(w => w.severity === 'error'))   return { level: 'red',   label: 'Still issues' };
    if (all.some(w => w.severity === 'warning')) return { level: 'amber', label: 'Check stocks' };
    return { level: 'green', label: 'Split OK' };
  }, [splitMode, stockGroups, splitGroupWarnings]);

  const concDoseMlPerLiter = concentrateOn && concentrateStrength > 0 ? 1000 / concentrateStrength : 0;
  const concDoseMlPerBatch = concDoseMlPerLiter * L;

  const allRecipes = [...RECIPES, ...savedRecipes];
  const activeRecipe = allRecipes.find(r => r.id === activeRecipeId);
  const isSavedRecipeActive = savedRecipes.some(r => r.id === activeRecipeId);
  const selectedExternalRecipe: ExternalRecipe | undefined = ROBERT_ASAMI_RECIPES.find(
    r => r.id === externalRecipeId,
  );
  const noRecipeSelected = activeRecipeId === 'custom' && externalRecipeId === 'custom';
  const hasSaltRecipeTargets = Object.values(saltTargets).some(target => target > 0);
  const selectedSourceRecipe = selectedExternalRecipe ?? (
    activeRecipe?.sourceUrl ? activeRecipe : undefined
  );
  const displayedRecipeName = selectedSourceRecipe?.name ?? activeRecipe?.name ?? 'Custom';
  const autoFillTargets = showAlchemist && hasSaltRecipeTargets
    ? saltOnlyIons
    : noRecipeSelected
    ? Object.fromEntries(
        ACTIVE_ION_IDS.map(id => [id, activeRanges[id].greenMax]),
      ) as Partial<Record<IonId, number>>
    : saltOnlyIons;
  const autoFillUsesRecipeTargets = showAlchemist && hasSaltRecipeTargets;
  const watermancerTargetSourceLabel = useMemo(() => {
    if (watermancerTargetSource === 'safe-profile') return `${activeProfile.name} safe profile`;
    if (watermancerTargetSource === 'salt-table') return 'Current salt table';
    if (watermancerTargetSource.startsWith('profile:')) {
      return profiles.find(p => p.id === watermancerTargetSource.slice('profile:'.length))?.name ?? '';
    }
    if (watermancerTargetSource.startsWith('saved:')) {
      return wmProfiles.find(p => p.id === watermancerTargetSource.slice('saved:'.length))?.name ?? '';
    }
    if (watermancerTargetSource.startsWith('recipe:')) {
      return allRecipes.find(item => item.id === watermancerTargetSource.slice('recipe:'.length))?.name ?? 'Selected recipe';
    }
    if (watermancerTargetSource.startsWith('reference:')) {
      return EMPIRICAL_WATERS.find(item => item.id === watermancerTargetSource.slice('reference:'.length))?.name ?? 'Reference water';
    }
    return ROBERT_ASAMI_RECIPES.find(item => item.id === watermancerTargetSource.slice('external:'.length))?.name ?? 'Watering Hole recipe';
  }, [activeProfile.name, allRecipes, watermancerTargetSource, profiles, wmProfiles]);
  const applyRecipeObject = (recipe: SaltRecipe) => {
    setBrewerRecipeOverride(null);
    setActiveRecipeId(recipe.id);
    const requiredNerdLevel = nerdLevelForRecipe(recipe);
    if (shouldEscalateNerdLevel(nerdLevel, requiredNerdLevel)) {
      setNerdLevel(requiredNerdLevel);
    }
    const brewerFlavor = brewerFlavorFromRecipe(recipe);
    if (brewerFlavor) setBrewerFlavor(brewerFlavor);
    setRows(SALTS.map(salt => {
      const entry = recipe.salts[salt.id];
      if (entry) return { target: normalizeSaltTarget(entry.target), formIdx: entry.formIdx };
      return { target: '', formIdx: salt.defaultFormIdx ?? 0 };
    }));
    // Restore split stocks state — missing fields default to off/100/'500'
    setSplitMode(recipe.splitMode ?? false);
    if (recipe.splitStrengths) setSplitStrengths(prev => ({ ...prev, ...recipe.splitStrengths }));
    if (recipe.splitMls) setSplitMls(prev => ({ ...prev, ...recipe.splitMls }));
  };

  const applyRecipe = (recipeId: string) => {
    setExternalRecipeId('custom');
    if (recipeId === 'custom') {
      setBrewerRecipeOverride(null);
      setActiveRecipeId('custom');
      return;
    }
    const recipe = allRecipes.find(r => r.id === recipeId);
    if (recipe) applyRecipeObject(recipe);
  };

  const applyExternalRecipe = (recipeId: string) => {
    setBrewerRecipeOverride(null);
    setExternalRecipeId(recipeId);
    if (recipeId === 'custom') return;
    const recipe = ROBERT_ASAMI_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return;
    setActiveRecipeId('custom');
    const requiredNerdLevel = nerdLevelForRecipe(recipe);
    if (shouldEscalateNerdLevel(nerdLevel, requiredNerdLevel)) {
      setNerdLevel(requiredNerdLevel);
    }
    const brewerFlavor = brewerFlavorFromRecipe(recipe);
    if (brewerFlavor) setBrewerFlavor(brewerFlavor);
    setRows(SALTS.map(salt => {
      const entry = recipe.salts[salt.id];
      return entry
        ? { target: normalizeSaltTarget(entry.target), formIdx: entry.formIdx }
        : { target: '', formIdx: salt.defaultFormIdx ?? 0 };
    }));
  };

  const buildCurrentSalts = (): Record<string, SaltRecipeEntry> => {
    const m: Record<string, SaltRecipeEntry> = {};
    SALTS.forEach((s, i) => {
      if (num(safeRows[i].target) > 0) m[s.id] = { target: safeRows[i].target, formIdx: safeRows[i].formIdx };
    });
    return m;
  };

  const handleSaveRecipe = () => {
    const salts = buildCurrentSalts();
    if (Object.keys(salts).length === 0) {
      window.alert('Enter at least one salt target before saving a recipe.');
      return;
    }
    const name = window.prompt('Name this recipe:')?.trim();
    if (!name) return;
    const recipe: SaltRecipe = {
      id: newRecipeId(),
      name,
      salts,
      ...(splitMode && {
        splitMode: true,
        splitStrengths: { ...splitStrengths },
        splitMls: { ...splitMls },
      }),
    };
    setSavedRecipes(prev => [...prev, recipe]);
    setActiveRecipeId(recipe.id);
  };

  const handleDeleteRecipe = () => {
    const recipe = savedRecipes.find(r => r.id === activeRecipeId);
    if (!recipe) return;
    if (!window.confirm(`Delete saved recipe "${recipe.name}"? This cannot be undone.`)) return;
    setSavedRecipes(prev => prev.filter(r => r.id !== recipe.id));
    setActiveRecipeId('custom');
    setExternalRecipeId('custom');
  };

  const handleExportRecipe = () => {
    const salts = buildCurrentSalts();
    if (Object.keys(salts).length === 0) {
      window.alert('Enter at least one salt target before exporting a recipe.');
      return;
    }
    let name = activeRecipe?.name;
    if (!name) {
      name = window.prompt('Name this recipe for sharing:')?.trim() || '';
      if (!name) return;
    }
    const text = serializeRecipeFile({
      name,
      salts,
      ...(splitMode && {
        splitMode: true,
        splitStrengths: { ...splitStrengths },
        splitMls: { ...splitMls },
      }),
    });
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'recipe';
    a.download = `${slug}.coffeewater.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const recipe = parseRecipeFile(text);
    if (!recipe) {
      window.alert("Couldn't read that file — it doesn't look like a valid coffee water recipe.");
      return;
    }
    setSavedRecipes(prev => [...prev, recipe]);
    if (showWatermancer) {
      setWatermancerTargetSource(`recipe:${recipe.id}`);
      setActiveRecipeId('custom');
      setExternalRecipeId('custom');
      return;
    }
    applyRecipeObject(recipe);
  };

  const updateRow = (i: number, patch: Partial<SaltRow>) => {
    setBrewerRecipeOverride(null);
    setActiveRecipeId('custom');
    setExternalRecipeId('custom');
    const safePatch = patch.target === undefined
      ? patch
      : { ...patch, target: normalizeSaltTarget(patch.target) };
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...safePatch } : r)));
  };

  // Export recipe card
  const [exportCopied, setExportCopied] = useState(false);
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildRecipeText = (): string => {
    const lines: string[] = [];
    const line = (s: string) => lines.push(s);
    const divider = (char = '─', len = 44) => lines.push(char.repeat(len));

    line('╔════════════════════════════════════════════╗');
    line('║   Coffee Water Mineral Recipe Card         ║');
    line('╚════════════════════════════════════════════╝');
    line('');
    line(`Profile : ${activeProfile.name}`);
    line(`Volume  : ${liters} L`);
    if (concentrateOn) {
      if (splitMode && stockGroups.length > 0) {
        line('Mode    : Split stock concentrate');
      } else {
        line(`Mode    : Single stock concentrate  (×${concentrateStrength}  ${concentrateMl} mL stock)`);
      }
    }
    line('');

    divider();
    line('MINERAL SALTS  (per-batch direct amounts)');
    divider();
    const saltLines = SALTS.map((salt, i) => {
      const row = safeRows[i];
      const form = salt.hydrationForms[row.formIdx];
      const target = dosingSaltTargets[salt.id] ?? 0;
      if (target === 0) return null;
      const mg = L > 0
        ? computeSaltMg(target, L, form.molarMass, salt.anhydrousMass)
        : 0;
      const saltLabel = `${salt.name}${salt.hydrationForms.length > 1 ? ` (${form.label})` : ''}`;
      return `  ${saltLabel.padEnd(32)} ${mg.toFixed(2).padStart(7)} mg  (${target} ppm target)`;
    }).filter(Boolean);
    if (saltLines.length === 0) {
      line('  (no salts entered)');
    } else {
      saltLines.forEach(l => line(l!));
    }

    // ── Concentrate instructions ──────────────────────────────────────
    if (concentrateOn && !splitMode) {
      // Single stock
      const stockL = num(concentrateMl) / 1000;
      const dosePerLiter = concentrateStrength > 0 ? 1000 / concentrateStrength : 0;
      const dosePerBatch = dosePerLiter * L;
      line('');
      divider();
      line('SINGLE STOCK CONCENTRATE');
      divider();
      line(`  Strength : ×${concentrateStrength}`);
      line(`  Volume   : ${concentrateMl} mL`);
      line('');
      line('  Weigh into stock:');
      const concSaltLines = SALTS.map((salt, i) => {
        const row = safeRows[i];
        const form = salt.hydrationForms[row.formIdx];
        const target = dosingSaltTargets[salt.id] ?? 0;
        if (target === 0) return null;
        const mg = concentrateStrength > 0 && stockL > 0
          ? computeSaltMg(target, stockL, form.molarMass, salt.anhydrousMass) * concentrateStrength
          : 0;
        const massLabel = mg >= 1000 ? `${(mg / 1000).toFixed(3)} g ` : `${mg.toFixed(2)} mg`;
        const saltLabel = `${salt.name}${salt.hydrationForms.length > 1 ? ` (${form.label})` : ''}`;
        return `    ${saltLabel.padEnd(30)} ${massLabel.padStart(10)}`;
      }).filter(Boolean);
      if (concSaltLines.length === 0) {
        line('    (no salts entered)');
      } else {
        concSaltLines.forEach(l => line(l!));
      }
      if (concentrateStrength > 0 && stockL > 0) {
        line('');
        line('  Dosing:');
        line(`    ${dosePerLiter.toFixed(1)} mL of stock per liter of brew water`);
        if (L > 0) line(`    ${dosePerBatch.toFixed(1)} mL per batch  (${liters} L)`);
      }
      } else if (concentrateOn && splitMode) {
      // Split stocks — one section per group
        const exportStockGroups = splitIntoStockGroups(dosingSaltTargets);
      line('');
      divider();
      line('SPLIT STOCKS');
      divider();
        for (const group of exportStockGroups) {
        const strength = splitStrengths[group.id] ?? 100;
        const volumeMl = splitMls[group.id] ?? '500';
        const stockL = num(volumeMl) / 1000;
        const dosePerLiter = strength > 0 ? 1000 / strength : 0;
        const dosePerBatch = dosePerLiter * L;
        line('');
        line(`  ── ${group.name} ${'─'.repeat(Math.max(0, 38 - group.name.length))}`);
        line(`  Strength : ×${strength}  |  Volume: ${volumeMl} mL`);
        line('');
        line('  Weigh into stock:');
        for (const saltId of group.saltIds) {
          const salt = SALTS.find(s => s.id === saltId);
          if (!salt) continue;
          const saltIdx = SALTS.indexOf(salt);
          const row = rows[saltIdx] ?? {
            target: '',
            formIdx: salt.defaultFormIdx ?? 0,
          };
          const form = salt.hydrationForms[row.formIdx];
           const target = dosingSaltTargets[saltId] ?? 0;
          if (target === 0) continue;
          const mg = strength > 0 && stockL > 0
            ? computeSaltMg(target, stockL, form.molarMass, salt.anhydrousMass) * strength
            : 0;
          const massLabel = mg >= 1000 ? `${(mg / 1000).toFixed(3)} g ` : `${mg.toFixed(2)} mg`;
          const saltLabel = `${salt.name}${salt.hydrationForms.length > 1 ? ` (${form.label})` : ''}`;
          line(`    ${saltLabel.padEnd(30)} ${massLabel.padStart(10)}`);
        }
        if (strength > 0 && stockL > 0) {
          line('');
          line('  Dosing:');
          line(`    ${dosePerLiter.toFixed(1)} mL of stock per liter of brew water`);
          if (L > 0) line(`    ${dosePerBatch.toFixed(1)} mL per batch  (${liters} L)`);
        }
      }
    }

    line('');
    divider();
    line('ION TOTALS  (mg/L)');
    divider();
    const guideIonTotals = nerdLevel === 'brewer' ? brewerModeIonTotals : ionTotals;
    for (const id of ACTIVE_ION_IDS) {
      const ion = ION_MAP[id];
      const ppm = guideIonTotals[id];
      const level = classifyIon(ppm, activeRanges[id]);
      const flag = level === 'green' ? '✓' : level === 'yellow' ? '△' : '✗';
      line(`  ${flag} ${ion.name.padEnd(16)} ${ppm.toFixed(1).padStart(6)} ppm`);
    }

    line('');
    divider();
    line('HARDNESS  (ppm as CaCO₃)');
    divider();
    const guideGh = computeGH(guideIonTotals);
    const guideKh = computeKH(guideIonTotals);
    line(`  GH (General)   : ${guideGh.toFixed(1)} ppm  (salts: ${guideGh.toFixed(1)}, mineral: ${nerdLevel === 'brewer' ? '0.0' : ghBottled.toFixed(1)})`);
    line(`  KH (Carbonate) : ${guideKh.toFixed(1)} ppm  (salts: ${guideKh.toFixed(1)}, mineral: ${nerdLevel === 'brewer' ? '0.0' : khBottled.toFixed(1)})`);
    if (guideKh > 0) line(`  GH:KH ratio    : ${(guideGh / guideKh).toFixed(2)} : 1`);

    if (additionWaters.length > 0 && totalMineralMl > 0) {
      line('');
      divider();
      line('MINERAL WATER ADDITION');
      divider();
      line(`  Total volume: ${totalMineralMl} mL of ${L * 1000} mL batch`);
      for (const entry of additionWaters) {
        const vol = num(entry.volumeMl) * sourceScale;
        if (vol > 0) {
          const name = entry.name || 'Unnamed';
          line(`  ${name}: ${fmt(vol)} mL`);
        }
      }
    }
    if (mineralWaters.length > 0 && totalBaseMl > 0) {
      line('');
      divider();
      line('BASE WATER');
      divider();
      line(`  Total volume: ${totalBaseMl} mL`);
      for (const entry of mineralWaters) {
        const vol = num(entry.volumeMl) * sourceScale;
        if (vol > 0) {
          const name = entry.name || 'Unnamed';
          line(`  ${name}: ${fmt(vol)} mL`);
        }
      }
    }

    line('');
    line(`Generated: ${new Date().toLocaleString()}`);

    return lines.join('\n');
  };

  const handleExport = () => {
    const text = buildRecipeText();

    // Download .txt file
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coffee-water-recipe-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    // Copy to clipboard
    navigator.clipboard.writeText(text).catch(() => {});

    // Show confirmation briefly
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
    setExportCopied(true);
    exportTimerRef.current = setTimeout(() => setExportCopied(false), 2000);
  };

  const handleBrewGuideExport = () => {
    const l = L;
    const bMl = batchMl;
    const roMl = Math.max(bMl - totalMineralMl - totalBaseMl, 0);
    const isLargeBatch = bMl > 1000;

    const lines: string[] = [];
    const line = (s: string) => lines.push(s);
    const div = () => lines.push('─'.repeat(44));

    const rName = activeRecipe?.name ?? 'Custom';
    line(`╔════════════════════════════════════════════╗`);
    line(`║         Brew Guide — ${rName.padEnd(19)}║`);
    line(`╚════════════════════════════════════════════╝`);
    line('');
    line(`${'Recipe:'.padEnd(18)} ${rName}`);
    line(`${'Batch:'.padEnd(18)} ${bMl} mL  (${liters} L)`);
    line(`${'RO / distilled water:'.padEnd(18)} ${roMl} mL`);
    if (totalBaseMl > 0) line(`${'Base mineral water:'.padEnd(18)} ${totalBaseMl} mL`);
    if (totalMineralMl > 0) line(`${'Addition water:'.padEnd(18)} ${totalMineralMl} mL`);
    line('');

    div();
    line('  1.  PREPARE YOUR WATER');
    div();
    line('');
    if (roMl > 0) line(`    • Start with ${roMl} mL of RO / distilled water.`);
    for (const w of mineralWaters) {
      const vol = num(w.volumeMl) * sourceScale;
      if (vol <= 0) continue;
      const ions = ACTIVE_ION_IDS.filter(id => num(w.ions[id] ?? '') > 0).map(id => `${ION_MAP[id].name} ${w.ions[id]} ppm`).join(', ');
      line(`    • Add ${vol} mL of ${w.name || 'base water'}${ions ? `  (${ions})` : ''}.`);
    }
    for (const w of additionWaters) {
      const vol = num(w.volumeMl) * sourceScale;
      if (vol <= 0) continue;
      const ions = ACTIVE_ION_IDS.filter(id => num(w.ions[id] ?? '') > 0).map(id => `${ION_MAP[id].name} ${w.ions[id]} ppm`).join(', ');
      line(`    • Add ${vol} mL of ${w.name || 'addition water'}${ions ? `  (${ions})` : ''}.`);
    }
    if (isLargeBatch) {
      line('');
      line(`    Reserve ~500 mL of the water in a separate container —`);
      line(`    this will be your mixing vessel for dissolving minerals.`);
      line(`    Set aside the remaining ${Math.max(bMl - 500, 0)} mL as dilution water.`);
    }
    line('');

    // The guide must describe what will actually be weighed for the final
    // batch. When source water is configured, suggestedSaltTargets removes
    // ions already supplied by that water and applies the bicarbonate ceiling.
    const guideSaltTargets = nerdLevel === 'brewer' ? brewerModeSaltTargets : dosingSaltTargets;
    const activeSalts = SALTS.map((s, i) => {
      const tgt = guideSaltTargets[s.id] ?? 0;
      if (tgt <= 0) return null;
      const form = s.hydrationForms[safeRows[i].formIdx];
      const mg = l > 0 ? computeSaltMg(tgt, l, form.molarMass, s.anhydrousMass) : 0;
      const isBicarbonate = s.formula.includes('HCO₃') || s.formula.includes('CO₃');
      const isSulfate = s.formula.includes('SO₄');
      const isChloride = s.formula.includes('Cl');
      return { name: s.name, formula: s.formula, mg, hydrate: form.label, isSulfate, isChloride, isBicarbonate };
    }).filter(Boolean) as { name: string; formula: string; mg: number; hydrate: string; isSulfate: boolean; isChloride: boolean; isBicarbonate: boolean }[];

    if (activeSalts.length > 0) {
      div();
      line(isLargeBatch ? '  2.  DISSOLVE MINERALS IN MIXING VESSEL' : '  2.  ADD MINERALS');
      div();
      line('');
      line('    Safe addition order (prevents CaCO₃ precipitation):');
      line('    1) Sulfates  — dissolve slowly, add first');
      line('    2) Chlorides — dissolve readily');
      line('    3) Bicarbonates / Carbonates — last, avoid CaCO₃ binding');
      line('');

      // Order: sulfates → chlorides → bicarbonates/carbonates
      const ordered = [
        ...activeSalts.filter(s => s.isSulfate),
        ...activeSalts.filter(s => s.isChloride && !s.isSulfate),
        ...activeSalts.filter(s => s.isBicarbonate),
      ];

      if (ordered.length < activeSalts.length) {
        // Any remaining salts not captured by the groups (e.g. Mg citrate)
        const remaining = activeSalts.filter(s => !s.isSulfate && !s.isChloride && !s.isBicarbonate);
        ordered.push(...remaining);
      }

      ordered.forEach((s, i) => {
        const prefix = s.isSulfate ? '  [Sulfate]' : s.isChloride ? ' [Chloride]' : s.isBicarbonate ? '     [KH/碱]' : '          ';
        line(`    ${i + 1}.${prefix}  ${s.name.padEnd(22)} ${s.mg.toFixed(2).padStart(7)} mg  (${s.hydrate})`);
      });
      line('');
      line('    Weigh each salt on a 0.01 g precision scale.');
      if (isLargeBatch) {
        line('    Add salts one at a time to the 500 mL mixing vessel.');
        line('    Stir until fully dissolved before adding the next salt.');
      } else {
        line('    Add to the water and stir until fully dissolved before adding the next salt.');
      }
      line('');
    }

    if (isLargeBatch) {
      div();
      line('  3.  COMBINE & TOP UP');
      div();
      line('');
      line('    • Pour the mineral concentrate from the mixing vessel');
      line('      into the main batch of dilution water.');
      line('    • Stir thoroughly to homogenize.');
      line('    • The water is now ready for brewing.');
      line('');
    }

    div();
    line(`  ${isLargeBatch ? '4' : activeSalts.length > 0 ? '3' : '2'}.  VERIFY & BREW`);
    div();
    line('');
    line('    • Check that all minerals are fully dissolved (the water should be clear).');
    line('    • Proceed with your brew method as usual.');
    line('    • Adjust extraction parameters to taste.');
    line('');
    line('── End of Brew Guide ──────────────────────────');
    line('');

    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brew-guide-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const appHeader = (
    <div className="app-header overflow-hidden rounded-2xl border border-white/10 bg-slate-800/70 shadow-2xl backdrop-blur-xl">
      <div className={`app-header__bar flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-gradient-to-r px-4 py-4 sm:px-6 ${appTab === 'concentrate' ? 'from-violet-700 to-fuchsia-500' : modeAccent}`}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Calculator className="w-6 h-6 text-white" />
          <h1 className="truncate text-base sm:text-lg font-semibold text-white tracking-tight">Coffee Water Mineral Calculator</h1>
        </div>
        <div className="order-3 flex w-full items-center justify-between gap-2 sm:order-none sm:w-auto">
            <div role="tablist" aria-label="App workspace" className="app-header__tabs flex rounded-lg border border-white/20 bg-black/15 p-0.5">
            <button
              type="button"
              role="tab"
              aria-selected={appTab === 'calculator'}
              onClick={() => setAppTab('calculator')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${appTab === 'calculator' ? 'bg-white/25 text-white shadow-lg shadow-black/10' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              Calculator
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={appTab === 'concentrate'}
              onClick={() => setAppTab('concentrate')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${appTab === 'concentrate' ? 'bg-white/25 text-white shadow-lg shadow-black/10' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              Concentrate
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (appTab === 'concentrate') {
    return (
      <div className="app-shell min-h-screen bg-slate-900 font-sans text-slate-100">
        <div className="flex min-h-screen items-start justify-center p-4 sm:p-6">
        <div className="app-page-stack flex w-full max-w-5xl flex-col">
          {appHeader}
          <ConcentrateWorkspace
          />
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen bg-slate-900 font-sans text-slate-100">
      <div className="flex min-h-screen items-start justify-center p-4 sm:p-6">
      <div className="app-page-stack flex w-full max-w-5xl flex-col">
        {/* Header */}
        {appHeader}

        {/* Experience level */}
         <div className="app-panel app-panel--quiet app-card rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">Detail level</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {nerdLevel === 'alchemist'
                    ? 'A focused salt and concentrate workspace built from 0-TDS water.'
                    : nerdLevel === 'watermancer'
                      ? 'A source-water and ion-balance workspace for refining the final mixture.'
                      : 'Choose how much detail to show. Brewer mode keeps the focus on simple salt recipes.'}
                </div>
              </div>
            </div>
            <div className="mode-switcher grid grid-cols-3 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
              {([
                ['brewer', 'Brewer', 'Flavor-first recipe'],
                ['alchemist', 'Alchemist', 'Salt & concentrate lab'],
                ['watermancer', 'Watermancer', 'Source water & ions'],
              ] as const).map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleNerdLevelChange(value)}
                  aria-pressed={nerdLevel === value}
                  title={description}
                  className={`mode-switcher__button rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    nerdLevel === value
                      ? value === 'alchemist'
                        ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40 shadow-sm'
                        : value === 'watermancer'
                          ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 shadow-sm'
                          : 'bg-sky-500/20 text-sky-200 border border-sky-400/40 shadow-sm'
                      : 'border border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

         {/* Mode guide */}
          <div className={`mode-guide app-card rounded-2xl border px-4 py-3 shadow-md backdrop-blur-xl ${modeGuide.tone}`}>
           <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
             <div className="min-w-0">
               <div className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-75">{modeGuide.eyebrow}</div>
               <div className="mt-1 text-sm font-semibold text-slate-100">{modeGuide.title}</div>
               <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">{modeGuide.description}</p>
             </div>
             <div className="flex shrink-0 flex-wrap gap-1.5">
               {modeGuide.tags.map(tag => (
                 <span key={tag} className="rounded-full border border-white/10 bg-slate-950/20 px-2.5 py-1 text-[10px] font-medium text-slate-300">
                   {tag}
                 </span>
               ))}
             </div>
           </div>
         </div>

          {nerdLevel === 'brewer' && (
            <section className="relative overflow-hidden rounded-2xl border border-teal-300/25 bg-gradient-to-br from-teal-950/80 via-slate-900/80 to-indigo-950/70 px-5 py-5 shadow-xl shadow-teal-950/15 sm:px-6">
              <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-teal-300/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-indigo-400/10 blur-3xl" />
              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200/75">
                    <FlaskConical className="h-4 w-4 text-teal-300" />
                    New to water?
                  </div>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    Hey, new to water? Start here <span aria-hidden="true">👉</span>
                  </h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300">
                    Robert Asami&apos;s one-week crash course turns mineral choices into seven small, easy-to-taste experiments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={scrollToWeek1Guide}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-teal-200/35 bg-teal-300/15 px-4 py-3 text-sm font-semibold text-teal-100 transition hover:-translate-y-0.5 hover:border-teal-200/65 hover:bg-teal-300/25 hover:shadow-lg hover:shadow-teal-950/25 focus:outline-none focus:ring-2 focus:ring-teal-200/70 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  Start the 7-day crash course
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </section>
          )}

          {showWatermancer && (
            <nav
              aria-label="Watermancer workflow"
              className="workflow-rail rounded-2xl border border-indigo-400/20 bg-slate-950/35 px-3 py-3 shadow-sm"
            >
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  { number: '1', label: 'Set target', complete: true },
                  { number: '2', label: 'Add waters', complete: mineralWaters.length + additionWaters.length > 0 },
                  { number: '3', label: 'Add salts', complete: watermancerUsedSaltIds.length > 0 },
                  { number: '4', label: 'Choose route', complete: batchMl > 0 },
                  { number: '5', label: 'Review result', complete: batchMl > 0 },
                ].map(step => (
                  <li
                    key={step.number}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-[11px] ${
                      step.complete
                        ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-100'
                        : 'border-slate-700/60 bg-slate-900/35 text-slate-500'
                    }`}
                  >
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      step.complete ? 'bg-indigo-400/20 text-indigo-200' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {step.number}
                    </span>
                    <span className="truncate">{step.label}</span>
                  </li>
                ))}
              </ol>
            </nav>
          )}

         {showWatermancer && (
          <div className="order-1" data-watermancer-stage="target">
            <WatermancerIonProfileCard
              ions={ionProfileIons}
              supplementalIons={supplementalIonTotals}
              targetIons={watermancerIonTargets}
              profiles={profiles}
              activeProfileId={activeProfileId}
              wmProfiles={wmProfiles}
              allRecipes={allRecipes}
              externalRecipes={ROBERT_ASAMI_RECIPES}
              referenceWaters={EMPIRICAL_WATERS}
              watermancerTargetSource={watermancerTargetSource}
              onSelectProfile={handleSelectProfile}
              onTargetSourceChange={setWatermancerTargetSource}
              onSaveWmProfile={handleSaveWmProfile}
               onReset={() => setShowResetConfirm(true)}
            />
          </div>
         )}
         {/* Mineral Table */}
           {showAlchemist && <div className="app-card app-panel-surface order-1 bg-slate-800/70 backdrop-blur rounded-2xl shadow-2xl shadow-emerald-950/20 border border-emerald-400/25 overflow-hidden">
            <div className="app-section-header flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 border-b border-slate-700/40 bg-gradient-to-r from-sky-500/10 via-transparent to-indigo-500/10 text-slate-300">
            <div className="flex items-center gap-2">
                <SaltSieveIcon />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-100">
                  {showAlchemist ? 'Mineral Recipe' : 'Target Mineral Profile'}
                </h2>
               <span className="text-xs text-sky-200/70 font-normal normal-case">
                 — {displayedRecipeName}
              </span>
              {concentrateOn && (() => {
                const pill = splitMode ? splitFeasibility : concFeasibility;
                return (
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    pill.level === 'green'
                      ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                      : pill.level === 'amber'
                      ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                      : 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                  }`}>
                    {pill.label}
                  </span>
                );
              })()}
            </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
              <select
                value={activeRecipeId}
                onChange={e => applyRecipe(e.target.value)}
                 className="bg-sky-950/40 border border-sky-400/30 rounded-lg px-2.5 py-1.5 text-xs text-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
              >
                <option value="custom">Custom</option>
                <optgroup label="Built-in">
                  {RECIPES.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </optgroup>
                {savedRecipes.length > 0 && (
                  <optgroup label="My recipes">
                    {savedRecipes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
               <select
                 value={externalRecipeId}
                 onChange={e => applyExternalRecipe(e.target.value)}
                 aria-label="Robert Asami Watering Hole recipes"
                 className="max-w-[220px] bg-slate-700/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-amber-400 transition"
               >
                 <option value="custom">Watering Hole recipes</option>
                 <optgroup label="Robert Asami’s Watering Hole">
                   {ROBERT_ASAMI_RECIPES.map(r => (
                     <option key={r.id} value={r.id}>{r.name}</option>
                   ))}
                 </optgroup>
               </select>
              {activeRecipeId === 'custom' && (
                <button
                  onClick={handleSaveRecipe}
                   className="flex items-center gap-1.5 text-xs text-violet-200 hover:text-violet-100 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-400/25 hover:border-violet-300/45 rounded-lg px-2.5 py-1.5 transition"
                  title="Save the current salts as a named recipe on this device"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              )}
              {isSavedRecipeActive && (
                <button
                  onClick={handleDeleteRecipe}
                   className="flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/25 hover:border-rose-300/45 rounded-lg px-2.5 py-1.5 transition"
                  title="Delete this saved recipe"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleExportRecipe}
                 className="flex items-center gap-1.5 text-xs text-emerald-200 hover:text-emerald-100 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/25 hover:border-emerald-300/45 rounded-lg px-2.5 py-1.5 transition"
                title="Export this recipe as a shareable file"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                 className="flex items-center gap-1.5 text-xs text-sky-200 hover:text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/25 hover:border-sky-300/45 rounded-lg px-2.5 py-1.5 transition"
                title="Import a shared recipe file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={() => setShowResetConfirm(true)}
                 className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/25 hover:border-amber-300/45 rounded-lg px-2.5 py-1.5 transition"
                title="Reset all inputs to defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
            <>
            <div className="border-b border-emerald-400/10 bg-emerald-500/[0.03] px-4 py-3 text-[11px] leading-relaxed text-slate-400 sm:px-6">
               Build the recipe from 0-TDS water. Choose hydrated forms, then use the batch panel to prepare a safe concentrate.
            </div>
           {selectedSourceRecipe && (
             <div className="border-b border-slate-700/40 bg-amber-500/5 px-4 sm:px-6 py-3">
               <div className="flex flex-wrap items-start justify-between gap-3">
                 <div className="min-w-0">
                   <div className="flex flex-wrap items-center gap-2">
                     <span className="text-xs font-semibold uppercase tracking-wider text-amber-300">
                       Source recipe
                     </span>
                     <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        selectedSourceRecipe.conversion === 'exact'
                         ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                         : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                     }`}>
                        {selectedSourceRecipe.conversion === 'exact' ? 'Direct conversion' : 'Approximation'}
                     </span>
                   </div>
                   <p className="mt-1 text-xs text-slate-300">
                      {selectedSourceRecipe.attribution} · {selectedSourceRecipe.method}
                   </p>
                   <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-400">
                      {selectedSourceRecipe.notes}
                   </p>
                 </div>
                 <a
                   href={selectedSourceRecipe.sourceUrl}
                   target="_blank"
                   rel="noreferrer"
                   className="shrink-0 text-xs font-medium text-amber-300 underline decoration-amber-300/40 underline-offset-2 hover:text-amber-100"
                 >
                   View original source
                 </a>
               </div>
             </div>
           )}
         <>
          <div className="hidden sm:grid grid-cols-[1.3fr_1fr_1.2fr_1fr] gap-3 px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700/40">
            <span>Salt</span>
            <span>Target (ppm)</span>
            <span>Hydrated Form</span>
            <span>{concentrateOn ? 'Amount' : 'Amount (mg)'}</span>
          </div>
          {SALTS.map((salt, i) => {
            const row = safeRows[i];
            const form = salt.hydrationForms[row.formIdx];
            const target = dosingSaltTargets[salt.id] ?? 0;
            const mg = L > 0 && target > 0
              ? computeSaltMg(target, L, form.molarMass, salt.anhydrousMass)
              : 0;
            const concMg = concentrateOn && target > 0 && concL > 0
              ? computeSaltMg(target, concL, form.molarMass, salt.anhydrousMass) * concentrateStrength
              : 0;
            const displayMass = concentrateOn ? concMg : mg;
            const massLabel = concentrateOn && displayMass >= 1000
              ? `${(displayMass / 1000).toFixed(2)} g`
              : `${displayMass.toFixed(2)} mg`;
            return (
              <div key={salt.id} className="grid grid-cols-2 sm:grid-cols-[1.3fr_1fr_1.2fr_1fr] gap-x-3 gap-y-2 px-4 sm:px-6 py-3 sm:py-3 sm:items-center border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors">
                <div className="col-span-2 sm:col-span-1 flex flex-row items-baseline gap-2 sm:flex-col sm:items-start sm:gap-0">
                  <span className="text-sm font-medium text-slate-200">{salt.name}</span>
                  <span className="text-xs text-slate-500">{salt.formula}</span>
                </div>
                <div>
                  <label htmlFor={`salt-target-${salt.id}`} className="sm:hidden block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Target (ppm)</label>
                  <input
                    id={`salt-target-${salt.id}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    aria-label={`${salt.name} target ppm`}
                    value={row.target}
                    onChange={e => updateRow(i, { target: e.target.value })}
                    onKeyDown={e => {
                      if (e.key === '-') e.preventDefault();
                    }}
                    placeholder="0"
                    className="w-full bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                  />
                </div>
                <div>
                  <label htmlFor={salt.hydrationForms.length > 1 ? `salt-form-${salt.id}` : undefined} className="sm:hidden block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Hydrated Form</label>
                  {salt.hydrationForms.length > 1 ? (
                    <select
                      id={`salt-form-${salt.id}`}
                      aria-label={`${salt.name} hydrated form`}
                      value={row.formIdx}
                      onChange={e => updateRow(i, { formIdx: parseInt(e.target.value) })}
                      className="w-full bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                    >
                      {salt.hydrationForms.map((f, fi) => (
                        <option key={fi} value={fi}>{f.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="block px-0 sm:px-3 py-2 text-sm text-slate-500">{salt.hydrationForms[0].label}</span>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-baseline gap-2 sm:block">
                  <span className="sm:hidden text-[10px] uppercase tracking-wider text-slate-500">{concentrateOn ? 'Amount' : 'Amount (mg)'}</span>
                  <span className="text-sm font-mono text-emerald-300">
                    {displayMass > 0 ? massLabel : '—'}
                  </span>
                </div>
              </div>
            );
         })}
          </>
            {showAlchemist && <IonWatchDisclosure ions={saltOnlyIons} />}
            </>
           </div>}
         {nerdLevel === 'brewer' && (
           <>
              <BrewerFlavorPanel
               flavor={brewerFlavor}
                suggestedIons={brewerActiveIons}
               onChange={handleBrewerFlavorChange}
                onOpenStartingRecipe={() => setShowTastePreference(true)}
             />
              <Week1Guide onApplyRecipe={handleApplyWeek1Recipe} />
             <BrewerSimpleRecipeCard
                recipeHandoffToken={brewerRecipeHandoffToken}
                 guideRecipe={brewerRecipeOverride}
                saltTargets={brewerActiveSaltTargets}
               recipeRows={rows}
               liters={L}
               volumeInput={liters}
               onVolumeChange={value => setLiters(value)}
               concentrateOn={concentrateOn}
               concentrateLiters={concL}
               concentrateStrength={concentrateStrength}
                dropsPerMl={brewerDropsPerMl}
               onOpenSteps={method => setShowBrewerSteps(method)}
             />
           </>
         )}

         {/* Water amount + Concentrate */}
             {(showAlchemist || showWatermancer) && <div data-watermancer-stage={showWatermancer ? 'waters' : undefined} className={`app-card app-panel-surface order-2 relative overflow-hidden rounded-2xl border ${showAlchemist ? 'border-emerald-400/25 shadow-emerald-950/15' : 'border-indigo-400/25 shadow-indigo-950/15'} bg-slate-800/75 shadow-xl backdrop-blur`}>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/[0.08] via-sky-500/[0.025] to-blue-500/[0.08]" />
           <div className="relative z-10">
           <SectionHeader
             icon={<Droplet className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.6)]" />}
               title={showAlchemist ? 'Batch & Concentrate' : '2. Add waters — Batch volume'}
             after={
               <div className="flex items-center gap-2">
                {showAlchemist ? <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                 <span className={`transition-colors ${concentrateOn ? 'text-cyan-200' : 'text-slate-400'}`}>Concentrate</span>
                 <div className={`relative w-9 h-5 rounded-full transition-colors ${concentrateOn ? 'bg-cyan-500 shadow-[0_0_10px_-2px_rgba(34,211,238,0.8)]' : 'bg-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={concentrateOn}
                    onChange={e => setConcentrateOn(e.target.checked)}
                    className="sr-only"
           />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${concentrateOn ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
               </label> : undefined}
               </div>
            }
          />
               <div className="app-card-body relative space-y-4 bg-transparent">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="text-sm font-semibold text-cyan-100">Final batch volume:</label>
              <input
                type="number"
                inputMode="decimal"
                value={liters}
                onChange={e => setLiters(e.target.value)}
                placeholder="Liters"
                  className="w-32 bg-cyan-950/25 border border-cyan-300/35 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-cyan-200 transition"
              />
                <span className="text-sm text-cyan-200/80">liters</span>
            </div>

            {showWatermancer && (
              <div className="rounded-xl border border-cyan-400/20 bg-slate-950/25">
                <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3 sm:px-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-100">
                      <Gauge className="h-3.5 w-3.5 text-cyan-300" />
                      Precision check
                    </div>
                    {watermancerPrecisionRecommendation ? (
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                        Smallest dry-salt dose:{' '}
                        <span className={`font-semibold ${
                          watermancerPrecisionRecommendation.status === 'needs-volume'
                            ? 'text-amber-200'
                            : 'text-emerald-300'
                        }`}>
                          {watermancerPrecisionRecommendation.currentMinimumMassMg.toFixed(0)} mg
                        </span>
                        {watermancerPrecisionRecommendation.status === 'needs-volume'
                          ? ' — small doses can be difficult to weigh reliably.'
                          : ' — dry-salt dosing is comfortably measurable.'}
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        Select at least one salt below to check dosing precision.
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!watermancerPrecisionRecommendation}
                    onClick={() => setWatermancerPrecisionOpen(open => !open)}
                    className="shrink-0 rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-[11px] font-semibold text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:border-slate-700/60 disabled:bg-slate-900/30 disabled:text-slate-600"
                  >
                    {watermancerPrecisionOpen ? 'Hide precision plan' : 'Improve dosing precision'}
                  </button>
                </div>

                {watermancerPrecisionOpen && watermancerPrecisionRecommendation && (
                  <div className="border-t border-cyan-400/15 px-3.5 py-3.5 sm:px-4">
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-slate-200">Precision-first options</div>
                      <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
                        The calculator keeps your target profile, waters, salts, and hydration forms unchanged.
                        Choose an option below only if you want to change how you prepare the recipe.
                      </p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-3">
                      {([
                        ['dry', 'Dry salt', 'Scale up the final batch', 'border-emerald-400/25 bg-emerald-500/[0.06]'],
                        ['concentrate', 'Concentrate', 'Keep the final batch size', 'border-sky-400/25 bg-sky-500/[0.06]'],
                        ['dropper', 'Dropper', 'Dose the concentrate by drops', 'border-violet-400/25 bg-violet-500/[0.06]'],
                      ] as const).map(([id, label, description, tone]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setWatermancerPrecisionPlan(id)}
                          className={`rounded-xl border p-3 text-left transition ${
                            watermancerPrecisionPlan === id
                              ? `${tone} ring-1 ring-cyan-300/50`
                              : 'border-slate-700/60 bg-slate-900/35 hover:border-slate-500/70'
                          }`}
                          aria-pressed={watermancerPrecisionPlan === id}
                        >
                          <div className="text-xs font-semibold text-slate-100">{label}</div>
                          <div className="mt-1 text-[10px] leading-relaxed text-slate-500">{description}</div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 rounded-lg border border-slate-700/60 bg-slate-900/45 px-3 py-3">
                      {watermancerPrecisionPlan === 'dry' && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                              Recommended dry batch
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-100">
                              {watermancerPrecisionRecommendation.recommendedBatchLiters.toFixed(1)} L
                              <span className="ml-2 text-[11px] font-normal text-slate-500">
                                smallest dose ≈ {watermancerPrecisionRecommendation.recommendedMinimumMassMg.toFixed(0)} mg
                              </span>
                            </div>
                            <p className="mt-1 text-[10px] text-slate-500">
                              Uses a conservative 100 mg minimum for practical weighing.
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={watermancerPrecisionRecommendation.recommendedBatchLiters <= L}
                            onClick={() => {
                              setLiters(String(watermancerPrecisionRecommendation.recommendedBatchLiters));
                              setWatermancerActionMessage(`Final batch set to ${watermancerPrecisionRecommendation.recommendedBatchLiters.toFixed(1)} L for easier weighing.`);
                            }}
                            className="rounded-lg border border-emerald-300/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-default disabled:border-slate-700/60 disabled:bg-slate-900/30 disabled:text-slate-600"
                          >
                            {watermancerPrecisionRecommendation.recommendedBatchLiters <= L ? 'Already at target' : `Use ${watermancerPrecisionRecommendation.recommendedBatchLiters.toFixed(1)} L`}
                          </button>
                        </div>
                      )}

                      {watermancerPrecisionPlan === 'concentrate' && (
                        <div>
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                                Precision-first concentrate
                              </div>
                              <div className="mt-1 text-sm font-semibold text-slate-100">
                                500 mL stock · ×{PRECISION_STOCK_STRENGTH}
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-sky-200">
                              2 mL per final liter
                            </span>
                          </div>
                          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                            {watermancerPrecisionRecommendation.stockMasses.map(salt => (
                              <div key={salt.id} className="flex items-center justify-between gap-3 text-[11px]">
                                <span className="text-slate-400">{salt.name}</span>
                                <span className="font-mono text-sky-200">{salt.stockMassMg >= 1000 ? `${(salt.stockMassMg / 1000).toFixed(2)} g` : `${salt.stockMassMg.toFixed(0)} mg`}</span>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                            This is a preparation plan only. Review solubility and use the existing concentrate workflow before making stock.
                          </p>
                        </div>
                      )}

                      {watermancerPrecisionPlan === 'dropper' && (
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                              Dropper fallback
                            </div>
                            <div className="mt-1 text-sm font-semibold text-slate-100">
                              Approximately {watermancerPrecisionRecommendation.stockDropsPerLiter} drops per final liter
                            </div>
                            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                              Based on the calibrated {brewerDropsPerMl} drops/mL assumption; whole-drop dosing is convenient but less precise than measured volume.
                            </p>
                          </div>
                          <span className="rounded-full border border-violet-300/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold text-violet-200">
                            500× stock
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

             {showAlchemist && concentrateOn && !splitMode && (
               <div className="space-y-3 border border-teal-500/30 bg-teal-500/5 rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-300">Stock strength:</label>
                    <select
                      value={STRENGTH_OPTIONS.includes(concentrateStrength) ? concentrateStrength : 0}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setConcentrateStrength(v === 0 ? concentrateStrength : v);
                      }}
                       className="bg-teal-950/20 border border-teal-400/30 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-300 transition"
                    >
                      {STRENGTH_OPTIONS.map(v => <option key={v} value={v}>×{v}</option>)}
                      <option value={0}>Custom</option>
                    </select>
                    {!STRENGTH_OPTIONS.includes(concentrateStrength) && (
                      <input
                        type="number"
                        inputMode="numeric"
                        min={2}
                        value={concentrateStrength || ''}
                        onChange={e => setConcentrateStrength(Number(e.target.value) || 0)}
                        placeholder="×"
                         className="w-20 bg-teal-950/20 border border-teal-400/30 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-300 transition"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-300">Stock volume:</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={concentrateMl}
                      onChange={e => setConcentrateMl(e.target.value)}
                      placeholder="500"
                       className="w-24 bg-teal-950/20 border border-teal-400/30 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-300 transition"
                    />
                    <span className="text-xs text-slate-400">mL</span>
            </div>
                </div>

                {concentrateStrength > 0 && concL > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sky-200 bg-sky-500/10 rounded-lg px-3 py-2 border border-sky-500/20">
                    <span>Add <strong>{concDoseMlPerLiter.toFixed(1)} mL</strong> of stock per liter of brew water</span>
                    {L > 0 && (
                      <span className="text-sky-300">· <strong>{concDoseMlPerBatch.toFixed(1)} mL</strong> per batch</span>
                    )}
                    <span className="text-slate-400">· Weigh the amounts shown in the salts table</span>
                  </div>
                )}

                {/* Warnings — ERROR and WARNING level get bold banners */}
                {concWarnings.length > 0 && (
                  <div className="space-y-2">
                    {/* Count badge */}
                    {(() => {
                      const errCount = concWarnings.filter(w => w.severity === 'error').length;
                      const warnCount = concWarnings.filter(w => w.severity === 'warning').length;
                      if (errCount === 0 && warnCount === 0) return null;
                      const label = errCount > 0
                        ? `${errCount} precipitation risk${errCount > 1 ? 's' : ''} — do not mix this concentrate as-is`
                        : `${warnCount} concern${warnCount > 1 ? 's' : ''} to review`;
                      return (
                        <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold border ${
                          errCount > 0
                            ? 'text-rose-100 bg-rose-600/25 border-rose-500/60 shadow-[0_0_12px_-2px_rgba(244,63,94,0.3)]'
                            : 'text-amber-100 bg-amber-600/20 border-amber-500/50'
                        }`}>
                          <AlertTriangle className={`w-5 h-5 shrink-0 ${
                            errCount > 0 ? 'text-rose-300' : 'text-amber-300'
                          }`} />
                          <span>{label}</span>
                        </div>
                      );
                    })()}
                    {concWarnings.map((w, wi) => (
                      <div
                        key={wi}
                        className={`flex items-start gap-3 rounded-lg ${
                          w.severity === 'error'
                            ? 'bg-rose-950/60 border border-rose-600/50 text-rose-200 px-4 py-3 shadow-[0_0_10px_-1px_rgba(244,63,94,0.15)]'
                            : w.severity === 'warning'
                            ? 'bg-amber-950/40 border border-amber-600/40 text-amber-200 px-3.5 py-2.5'
                            : 'bg-slate-800/60 border border-slate-600/40 text-slate-300 px-3.5 py-2.5'
                        }`}
                      >
                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                          w.severity === 'error' ? 'text-rose-400' : w.severity === 'warning' ? 'text-amber-400' : 'text-slate-400'
                        }`} />
                        <div className="space-y-0.5">
                          <span className="text-xs">{w.message}</span>
                          {w.severity === 'error' && w.maxSafeStrength && (
                            <div className="text-[11px] text-rose-300/70 mt-1 font-medium">
                              Try ×{w.maxSafeStrength} or lower, or keep the conflicting salts in separate stocks.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Split into stocks button */}
                {concFeasibility.level !== 'green' && (
                  <button
                    onClick={() => setSplitMode(true)}
                    className="flex items-center gap-2 text-xs font-medium text-sky-300 hover:text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/50 rounded-lg px-3 py-2 transition w-full justify-center"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Split into stocks
                  </button>
                )}
              </div>
            )}

            {/* ── Split stocks panels ── */}
             {showAlchemist && concentrateOn && splitMode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Split stocks mode
                  </span>
                  <button
                    onClick={() => setSplitMode(false)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition"
                  >
                    <X className="w-3.5 h-3.5" /> Exit split
                  </button>
                </div>
                {stockGroups.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Add salts to the recipe to see stocks.</p>
                ) : (
                  stockGroups.map(group => (
                    <SplitStockCard
                      key={group.id}
                      group={group}
                      saltTargets={concSaltTargets}
                      rows={rows}
                      strength={splitStrengths[group.id] ?? 100}
                      volumeMl={splitMls[group.id] ?? '500'}
                      batchL={L}
                      warnings={splitGroupWarnings[group.id] ?? []}
                      onStrengthChange={v => setSplitStrengths(prev => ({ ...prev, [group.id]: v }))}
                      onVolumeChange={v => setSplitMls(prev => ({ ...prev, [group.id]: v }))}
                    />
                  ))
                )}
              </div>
            )}
          </div>
           </div>
           </div>}

        {/* GH / KH Summary */}
        {showAlchemist && <div className="app-card app-panel-surface order-4 bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader
            icon={<HardnessBalanceScale gh={baseSaltGh} kh={baseSaltKh} />}
            title="Base Salt Recipe Summary (as CaCO₃)"
          />
           <div className="app-card-body grid grid-cols-1 sm:grid-cols-3 gap-4">
             <SimpleMetricCard label="General Hardness (GH)" value={baseSaltGh} unit="ppm CaCO₃" tone="hardness" />
             <SimpleMetricCard label="Carbonate Hardness (KH)" value={baseSaltKh} unit="ppm CaCO₃" tone="buffer" />
             <SimpleMetricCard label="Total Dissolved Solids (TDS)" value={tdsSalt} unit="mg/L" tone="tds" />
            <div className="sm:col-span-3 flex items-center justify-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">GH : KH Ratio</span>
              <span className="h-4 w-px bg-slate-700" />
              {baseSaltKh > 0 && baseSaltGh >= 0 && Number.isFinite(baseSaltGh / baseSaltKh) ? (
                <span className="text-lg font-semibold text-sky-300 tabular-nums">
                  {(baseSaltGh / baseSaltKh).toFixed(1)}<span className="text-slate-400 font-normal text-sm mx-1">:</span>1
                </span>
              ) : (
                <span className="text-lg font-semibold text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>}

        {showWatermancer && (
          <div className="order-7">
             <WaterChemistryCard
              estimate={waterChemistry.estimate}
              basePH={waterChemistry.basePH}
              baseAlkalinity={waterChemistry.baseAlkalinity}
            />
          </div>
        )}

        {nerdLevel === 'brewer' && (
          <div className="order-8">
            <BrewerDropperCalibrationCard
              dropsPerMl={brewerDropsPerMl}
              onCalibrate={setBrewerDropsPerMl}
            />
          </div>
        )}

        {/* Taste Profile */}
        <div className="order-9">
          <TasteProfileCard
            ionTotals={nerdLevel === 'brewer' ? brewerModeIonTotals : ionTotals}
            gh={nerdLevel === 'brewer' ? brewerModeGh : gh}
            kh={nerdLevel === 'brewer' ? brewerModeKh : kh}
            collapsed={showAlchemist || showWatermancer}
          />
        </div>

        {/* Mineral Water Base */}
          {(showAlchemist || showWatermancer) && <div data-watermancer-stage={showWatermancer ? 'waters' : undefined} className={`app-card app-panel-surface ${showAlchemist ? 'order-3' : 'order-2'} ${showAlchemist ? 'border-emerald-400/25' : 'border-indigo-400/25'} bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl overflow-hidden`}>
          <SectionHeader
            icon={<MineralWaterBeaker active={hasMineralWater} />}
             title={showWatermancer ? '2. Add waters — Base water' : 'Mineral Water Base'}
            after={<div className="flex items-center gap-2">
             {showWatermancer && (
               <button
                 onClick={() => {
                   setWaterComparisonOpen(open => !open);
                   if (!communityWatersLoaded && !communityLoading) void loadCommunityWaters();
                 }}
                 className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                   waterComparisonOpen
                     ? 'text-cyan-200 bg-cyan-500/15 border border-cyan-400/40'
                     : 'text-slate-400 bg-slate-700/40 hover:bg-cyan-500/10 hover:text-cyan-200 border border-slate-600/50'
                 }`}
                 title="Find the closest database water by ion profile"
               >
                 <Gauge className="w-3.5 h-3.5" />
                 Compare ions
               </button>
             )}
              <LabelScanner onExtracted={vals => {
              // Silently use existing local water if ionic profile matches
              const match = localWaters.find(w => {
                for (const [k, raw] of Object.entries(vals)) {
                  const v = parseFloat(raw ?? '0');
                  if (!Number.isFinite(v) || v <= 0) continue;
                  const existing = w.ions[k] ?? 0;
                  const tolerance = Math.max(v * 0.10, 2);
                  if (Math.abs(existing - v) > tolerance) return false;
                }
                return true;
              });
              if (match) {
                const existing: Partial<Record<IonId, string>> = {};
                for (const [k, v] of Object.entries(match.ions)) {
                  if (v > 0) existing[k as IonId] = String(v);
                }
                addMineralWater({
                  name: match.name || undefined,
                  ions: existing,
                  metadata: match.metadata ? metadataToStrings(match.metadata) : undefined,
                });
              } else {
                addMineralWater({ ions: vals });
                const name = window.prompt("Name this water (so you can find it later):");
                if (name && name.trim()) {
                  saveWaters([...localWaters, { id: newLocalWaterId(), name: name.trim(), ions: vals as Record<string, number> }]);
                  const share = window.confirm("Also share this profile with the community?");
                  if (share) {
                    fetch(`${API_BASE}/api/waters`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: name.trim(), ions: vals, shared: 'yes' }),
                    }).catch(() => {});
                  }
                }
              }
            }} />
            </div>}
          />
           <div className="app-card-body space-y-4">
            {showWatermancer && waterComparisonOpen && (
               <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/10 p-3 sm:p-4 space-y-3">
                 <div className="flex flex-wrap items-center justify-between gap-2">
                   <div>
                     <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Closest database water</p>
                     <p className="mt-0.5 text-[11px] text-slate-500">Compare modeled ions without changing your current base.</p>
                   </div>
                   {communityLoading && <span className="text-[11px] text-slate-500">Loading catalog…</span>}
                 </div>

                 {waterComparisonSources.length === 0 ? (
                   <p className="rounded-lg border border-slate-700/50 bg-slate-900/30 px-3 py-2 text-xs text-slate-500 italic">
                     Add or save a water first, then compare its ion profile with the database.
                   </p>
                 ) : (
                   <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:items-start">
                     <label className="block">
                       <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Selected water</span>
                       <select
                         value={selectedWaterComparisonSource?.key ?? ''}
                         onChange={e => setSelectedWaterComparisonKey(e.target.value)}
                         className="w-full rounded-lg border border-slate-600/60 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                       >
                         {waterComparisonSources.map(source => (
                           <option key={source.key} value={source.key}>{source.name}</option>
                         ))}
                       </select>
                       {selectedWaterComparisonSource && (
                         <p className="mt-1.5 text-[10px] text-slate-500">
                           {COMPARISON_ION_IDS.map(id => `${COMPARISON_ION_LABELS[id]} ${fmt(selectedWaterComparisonSource.ions[id] ?? 0)}`).join(' · ')}
                         </p>
                       )}
                     </label>

                     <div className="min-w-0 rounded-lg border border-slate-700/50 bg-slate-900/45 p-3">
                       {!communityLoading && !closestWaterMatch ? (
                         <p className="text-xs text-slate-500 italic">No database waters are available to compare yet.</p>
                       ) : closestWaterMatch ? (
                         <>
                           <div className="flex flex-wrap items-start justify-between gap-2">
                             <div className="min-w-0">
                               <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Closest match</p>
                               <p className="truncate text-sm font-medium text-slate-100">{closestWaterMatch.water.name || `Water #${closestWaterMatch.water.id}`}</p>
                             </div>
                             <button
                               onClick={() => {
                                 const vals: Partial<Record<IonId, string>> = {};
                                 for (const [id, value] of Object.entries(closestWaterMatch.ions)) {
                                   if (value > 0 && ACTIVE_ION_IDS.includes(id as IonId)) vals[id as IonId] = String(value);
                                 }
                                 addMineralWater({
                                   name: closestWaterMatch.water.name || `Water #${closestWaterMatch.water.id}`,
                                   ions: vals,
                                   metadata: closestWaterMatch.water.metadata ? metadataToStrings(closestWaterMatch.water.metadata) : undefined,
                                 });
                               }}
                               className="shrink-0 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] font-medium text-cyan-200 transition hover:bg-cyan-500/20"
                             >
                               Use this water
                             </button>
                           </div>
                           <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">Match minus selected · mg/L</p>
                           <div className="mt-1.5 flex flex-wrap gap-1.5">
                             {COMPARISON_ION_IDS.map(id => {
                               const deviation = (closestWaterMatch.ions[id] ?? 0) - (selectedWaterComparisonSource?.ions[id] ?? 0);
                               const color = deviation > 0.05
                                 ? 'text-amber-300 bg-amber-500/10 border-amber-500/20'
                                 : deviation < -0.05
                                   ? 'text-sky-300 bg-sky-500/10 border-sky-500/20'
                                   : 'text-slate-400 bg-slate-700/30 border-slate-600/40';
                               return (
                                 <span key={id} className={`rounded-md border px-1.5 py-1 text-[11px] tabular-nums ${color}`}>
                                   {formatIonDeviation(deviation)} mg {COMPARISON_ION_LABELS[id]}
                                 </span>
                               );
                             })}
                           </div>
                         </>
                       ) : (
                         <p className="text-xs text-slate-500 italic">Finding the closest ion profile…</p>
                       )}
                     </div>
                   </div>
                 )}
               </div>
             )}

            {/* My waters picker (local) */}
            <div>
              <details className="group" open>
                <summary className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-200 transition select-none">
                  <Droplet className="w-3.5 h-3.5" />
                  My waters ({localWaters.length})
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); openCommunityModal(); }}
                    className="ml-1 flex items-center gap-0.5 text-[11px] text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg px-2 py-0.5 transition shrink-0"
                    title="Browse community waters"
                  >
                    <Plus className="w-3 h-3" />
                    Community
                  </button>
                  <span className="text-slate-600 group-open:rotate-90 transition-transform ml-auto">▶</span>
                </summary>
                {localWaters.length === 0 ? (
                  <div className="mt-2 text-xs text-slate-500 italic">No saved waters yet. Scan a label or browse the community.</div>
                ) : (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {localWaters.map(w => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between gap-2 bg-slate-900/40 border border-slate-700/50 rounded-lg px-3 py-2 hover:bg-sky-500/10 hover:border-sky-500/40 transition cursor-pointer group/water"
                        onClick={() => {
                          const vals: Partial<Record<IonId, string>> = {};
                          for (const [k, v] of Object.entries(w.ions)) {
                            if (v > 0) vals[k as IonId] = String(v);
                          }
                           addMineralWater({
                             name: w.name || undefined,
                             ions: vals,
                             metadata: w.metadata ? metadataToStrings(w.metadata) : undefined,
                             sourceLocalId: String(w.id),
                           });
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-slate-200 group-hover/water:text-sky-200 transition truncate block">
                            {w.name || 'Unnamed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-600">{Object.keys(w.ions).length} ions</span>
                          <button
                            onClick={e => { e.stopPropagation(); saveWaters(localWaters.filter(x => x.id !== w.id)); }}
                            className="text-slate-600 hover:text-rose-300 transition p-0.5"
                            title="Remove from my waters"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            </div>

             {/* Add button */}
             <div className={`grid gap-2 ${showWatermancer ? 'sm:grid-cols-2' : ''}`}>
               <button
                 type="button"
                 onClick={() => addMineralWater()}
                 className="flex items-center justify-center gap-2 text-sm text-sky-300 hover:text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/50 rounded-xl px-4 py-3 transition w-full"
               >
                 <Droplet className="w-4 h-4" />
                 Add water source
               </button>
               {showWatermancer && (
                 <button
                   type="button"
                   onClick={() => setShowWatermancerResetConfirm(true)}
                   className="flex items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 transition hover:border-rose-300/45 hover:bg-rose-500/20 hover:text-rose-100"
                   title="Reset the active Watermancer workspace"
                 >
                   <RotateCcw className="h-4 w-4" />
                   Reset Watermancer
                 </button>
               )}
             </div>

            {/* Built-in reference waters */}
            <div>
              <details className="group">
                <summary className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-200 transition select-none">
                  <Droplet className="w-3.5 h-3.5" />
                  Reference waters
                  <span className="text-slate-600 group-open:rotate-90 transition-transform ml-auto">▶</span>
                </summary>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  {EMPIRICAL_WATERS.map(water => {
                    const alreadyAdded = mineralWaters.some(entry => entry.sourceLocalId === `reference:${water.id}`);
                    return (
                      <div
                        key={water.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-sm text-slate-200">{water.name}</span>
                            <span className="text-[10px] text-slate-500">{water.hardnessAlkalinity} · TDS {water.metadata.tds} mg/L</span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-slate-500">{water.description}</p>
                          <a
                            href={water.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-[10px] text-sky-400 hover:text-sky-300"
                          >
                            View published composition
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!alreadyAdded) addReferenceWater(water);
                          }}
                          disabled={alreadyAdded}
                          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                            alreadyAdded
                              ? 'cursor-default bg-emerald-500/10 text-emerald-400'
                              : 'border border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                          }`}
                        >
                          {alreadyAdded ? 'Added' : 'Add to base'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>

            {mineralWaters.length === 0 && (
              <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                No mineral waters added yet. Scan a label, pick a saved one, or add manually.
              </p>
            )}

            {/* Entry list */}
            {mineralWaters.map(entry => (
              <div key={entry.id} className="border border-slate-700/50 rounded-xl bg-slate-900/30 p-4 space-y-3">
                {/* Entry header: name + volume + remove */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="text"
                      value={entry.name}
                      onChange={e => updateMineralWater(entry.id, { name: e.target.value })}
                      placeholder="Water name (e.g. Solán de Cabras)"
                      className="flex-1 min-w-0 bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={entry.volumeMl}
                        onChange={e => updateMineralWater(entry.id, { volumeMl: e.target.value })}
                        placeholder="0"
                        className="w-20 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                      />
                      <span className="text-xs text-slate-400 shrink-0">mL</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMineralWater(entry.id)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-300 bg-slate-700/40 hover:bg-rose-500/20 rounded-lg px-2 py-1.5 transition shrink-0"
                    title="Remove this water source"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Precise volume stepper */}
                <div className="flex items-center gap-3">
                  <WaterVolumeStepper
                    value={entry.volumeMl}
                    onChange={volumeMl => updateMineralWater(entry.id, { volumeMl })}
                  />
                </div>
                {/* Ion inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {ACTIVE_ION_IDS.map(id => (
                    <div key={id}>
                      <label className="block text-[10px] text-slate-500 mb-0.5">{ION_MAP[id].formula}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={entry.ions[id] ?? ''}
                        onChange={e => updateMineralWater(entry.id, {
                          ions: { ...entry.ions, [id]: e.target.value }
                        })}
                        placeholder="0"
                        className="w-full bg-slate-900/60 border border-slate-600/60 rounded-lg px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                      />
                    </div>
                  ))}
                </div>
                <WaterMetadataFields
                  metadata={entry.metadata}
                  onChange={metadata => updateMineralWater(entry.id, { metadata })}
                />
                {/* Save + Share buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      const hasName = entry.name.trim().length > 0;
                      const hasIons = Object.values(entry.ions).some(v => parseFloat(v || '0') > 0);
                      if (!hasName || !hasIons) return;
                      const alreadySaved = localWaters.some(l =>
                        l.name === entry.name.trim() &&
                        Object.entries(entry.ions).every(([k, v]) => Math.abs((l.ions[k] ?? 0) - parseFloat(v || '0')) < 0.5)
                      );
                      if (alreadySaved) return;
                  saveWaters([...localWaters, {
                        id: newLocalWaterId(),
                        name: entry.name.trim(),
                    metadata: metadataToNumbers(entry.metadata),
                        ions: Object.fromEntries(
                          Object.entries(entry.ions)
                            .filter(([, v]) => parseFloat(v || '0') > 0)
                            .map(([k, v]) => [k, parseFloat(v || '0')])
                        ) as Record<string, number>,
                      }]);
                    }}
                    className={`text-xs font-medium rounded-lg px-3 py-1.5 transition shrink-0 ${
                      (!entry.name.trim() || !Object.values(entry.ions).some(v => parseFloat(v || '0') > 0))
                        ? 'text-slate-600 bg-slate-700/20 cursor-not-allowed'
                        : localWaters.some(l =>
                            l.name === entry.name.trim() &&
                            Object.entries(entry.ions).every(([k, v]) => Math.abs((l.ions[k] ?? 0) - parseFloat(v || '0')) < 0.5)
                          )
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 cursor-default'
                        : 'text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30'
                    }`}
                  >
                    {localWaters.some(l =>
                      l.name === entry.name.trim() &&
                      Object.entries(entry.ions).every(([k, v]) => Math.abs((l.ions[k] ?? 0) - parseFloat(v || '0')) < 0.5)
                    ) && entry.name.trim() ? (
                      <><Check className="w-3 h-3 inline mr-1" />Saved</>
                    ) : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const hasName = entry.name.trim().length > 0;
                      const hasIons = Object.values(entry.ions).some(v => parseFloat(v || '0') > 0);
                      if (!hasName || !hasIons) return;
                      if (communityShareStatus[entry.id] === 'sharing') return;
                      if (!window.confirm(`Share "${entry.name.trim()}" with the community? Other users will be able to find and use this water profile.`)) return;

                      const vals: Record<string, number> = Object.fromEntries(
                        Object.entries(entry.ions)
                          .filter(([, v]) => parseFloat(v || '0') > 0)
                          .map(([k, v]) => [k, parseFloat(v || '0')])
                      );
                      setCommunityShareStatus(current => ({ ...current, [entry.id]: 'sharing' }));
                      try {
                        const response = await fetch(`${API_BASE}/api/waters`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: entry.name.trim(),
                            ions: vals,
                            metadata: metadataToNumbers(entry.metadata),
                            shared: 'yes',
                          }),
                        });
                        if (!response.ok) {
                          throw new Error(`Share request failed with status ${response.status}`);
                        }
                        setCommunityShareStatus(current => ({ ...current, [entry.id]: 'shared' }));
                        void loadCommunityWaters();
                      } catch (error) {
                        console.error('Error sharing water with the community:', error);
                        setCommunityShareStatus(current => ({ ...current, [entry.id]: 'error' }));
                      }
                    }}
                    disabled={communityShareStatus[entry.id] === 'sharing'}
                    className={`text-xs font-medium rounded-lg px-3 py-1.5 transition shrink-0 ${
                      communityShareStatus[entry.id] === 'sharing'
                        ? 'cursor-wait text-violet-200/60 bg-violet-500/10 border border-violet-500/20'
                        : communityShareStatus[entry.id] === 'shared'
                          ? 'cursor-default text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                          : communityShareStatus[entry.id] === 'error'
                            ? 'text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30'
                            :
                      (!entry.name.trim() || !Object.values(entry.ions).some(v => parseFloat(v || '0') > 0))
                        ? 'text-slate-600 bg-slate-700/20 cursor-not-allowed'
                        : 'text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30'
                    }`}
                  >
                    {communityShareStatus[entry.id] === 'sharing'
                      ? 'Sharing…'
                      : communityShareStatus[entry.id] === 'shared'
                        ? <><Check className="w-3 h-3 inline mr-1" />Shared</>
                        : communityShareStatus[entry.id] === 'error'
                          ? 'Retry share'
                          : <><Share2 className="w-3 h-3 inline mr-1" />Share</>}
                  </button>
                </div>
              </div>
            ))}

             {/* Coverage bars — recipe targets or active profile safe limits */}
            {batchMl > 0 && (
              <div className="border-t border-slate-700/40 pt-4 space-y-2.5">
                 <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                   {noRecipeSelected
                     ? `Mineral water coverage of ${activeProfile.name} safe limits`
                     : `Mineral water coverage of ${activeRecipe?.name ?? 'Custom'}`}
                 </span>
                {ACTIVE_ION_IDS.map(id => {
                  const ion = ION_MAP[id];
                   const target = autoFillTargets[id] ?? 0;
                  const covered = bottledIons[id] ?? 0;
                  const pct = target > 0 ? Math.min((covered / target) * 100, 100) : 0;
                  // Coverage is displayed to one decimal place, so classify
                  // against that same precision instead of exposing tiny
                  // floating-point differences (e.g. 3.9999 / 4.0) as partial.
                  const coverageTolerance = 0.05;
                  const overshoot = target > 0 && covered > target + coverageTolerance;
                  const level: 'none' | 'partial' | 'full' | 'overshoot' =
                    overshoot ? 'overshoot' :
                    target > 0 && covered >= target - coverageTolerance ? 'full' :
                    covered > 0 ? 'partial' : 'none';
                  const barColor = level === 'overshoot' ? 'bg-rose-500' : level === 'full' ? 'bg-emerald-500' : level === 'partial' ? 'bg-sky-400' : 'bg-slate-600';
                  const textColor = level === 'overshoot' ? 'text-rose-300' : level === 'full' ? 'text-emerald-300' : level === 'partial' ? 'text-sky-300' : 'text-slate-500';
                  const label = level === 'overshoot'
                    ? `Mineral water overshoots by ${(covered - target).toFixed(1)} ppm`
                    : level === 'full'
                     ? `${covered.toFixed(1)} ppm — ${noRecipeSelected ? 'safe limit' : 'salt target'} of ${target.toFixed(1)} reached`
                    : level === 'partial'
                     ? `${covered.toFixed(1)} ppm of ${target.toFixed(1)} ${noRecipeSelected ? 'safe limit' : 'target'} covered from mineral water`
                    : target > 0
                     ? noRecipeSelected
                       ? `Safe limit: ${target.toFixed(1)} ppm — none from mineral water`
                       : `Needs ${target.toFixed(1)} ppm from salts — none from mineral water`
                     : noRecipeSelected ? 'No safe limit set' : 'No salt target set';
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-slate-400 shrink-0">{ion.name}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-xs font-medium tabular-nums ${textColor} w-12 text-right shrink-0`}>
                            {covered.toFixed(1)}
                          </span>
                          <span className="text-xs text-slate-500 shrink-0">/ {target.toFixed(1)} ppm</span>
                        </div>
                        <div className={`text-[11px] mt-0.5 ${textColor}`}>
                          {label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {mineralWaters.length > 0 && batchMl <= 0 && (
              <div className="border-t border-slate-700/40 pt-4">
                <p className="text-xs text-slate-500 italic">Set a batch volume above to see coverage.</p>
              </div>
            )}

             {/* Alchemist recommendation — simple recipe completion view */}
             {showAlchemist && batchMl > 0 && (
               <div className="border-t border-slate-700/40 pt-4">
                 <div className="flex flex-wrap items-center justify-between gap-2">
                   <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                     Still needed from salts
                   </span>
                   <span className="text-[10px] text-slate-500">
                     {activeProfile.name} safe limits
                   </span>
                 </div>
                 <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                   {ACTIVE_ION_IDS.map(id => {
                     const target = saltOnlyIons[id] ?? 0;
                     const covered = bottledIons[id] ?? 0;
                     const remaining = Math.max(target - covered, 0);
                     if (target <= 0) return null;
                     return (
                       <div key={id} className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2">
                         <span className="block text-[10px] text-slate-500">{ION_MAP[id].formula}</span>
                         {covered >= target - 0.01 ? (
                           <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-emerald-300">
                             <Check className="h-3.5 w-3.5" /> Covered
                           </span>
                         ) : (
                           <span className="text-sm font-semibold tabular-nums text-amber-300">
                             {remaining.toFixed(1)} ppm
                           </span>
                         )}
                       </div>
                     );
                   })}
                 </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Salts needed to finish the recipe</span>
                    <div className="flex flex-wrap items-center gap-1.5" aria-label="Magnesium salt preference">
                      {([
                        {
                          value: 'sulfates' as const,
                          label: 'Sulfate leaning',
                          explanation: 'Favor magnesium sulfate to add more sulfate and a brighter, crisper mineral balance.',
                        },
                        {
                          value: 'chlorides' as const,
                          label: 'Chloride leaning',
                          explanation: 'Favor magnesium chloride to add more chloride and a rounder, fuller mineral balance.',
                        },
                        {
                          value: 'original' as const,
                          label: 'Original',
                          explanation: 'Keep the original sulfate-to-chloride balance from this recipe.',
                        },
                      ]).map(option => {
                        const selected = magnesiumPreference === option.value;
                        return (
                          <span key={option.value} className="group relative">
                            <button
                              type="button"
                              onClick={() => setMagnesiumPreference(option.value)}
                              aria-pressed={selected}
                              className={`rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-all ${
                                selected
                                  ? 'border-violet-400/70 bg-violet-500/20 text-violet-100 shadow-[0_0_12px_rgba(139,92,246,0.55)]'
                                  : 'border-slate-700/70 bg-slate-900/40 text-slate-400 hover:border-violet-400/45 hover:bg-violet-500/10 hover:text-violet-200'
                              }`}
                            >
                              {option.label}
                            </button>
                            <span
                              role="tooltip"
                              className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden w-56 rounded-md border border-violet-400/25 bg-slate-950 px-2.5 py-2 text-left text-[10px] leading-relaxed text-slate-300 shadow-xl group-hover:block group-focus-within:hidden group-focus-visible:block"
                            >
                              {option.explanation}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                 </div>
                 <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                   {SALTS.map((salt, index) => {
                     const target = dosingSaltTargets[salt.id] ?? 0;
                     if (target <= 0) return null;
                      const form = salt.hydrationForms[safeRows[index].formIdx];
                     const mg = computeSaltMg(target, L, form.molarMass, salt.anhydrousMass);
                     const affectsGH = salt.ions.some(contribution => contribution.ionId === 'calcium' || contribution.ionId === 'magnesium');
                     const affectsKH = salt.ions.some(contribution => contribution.ionId === 'bicarbonate');
                     const role = affectsGH && affectsKH ? 'GH + KH' : affectsGH ? 'GH' : affectsKH ? 'KH' : 'Neutral';
                     return (
                       <div key={salt.id} className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2">
                         <div className="flex items-center justify-between gap-2">
                           <span className="text-[10px] text-slate-500">{salt.formula} · {form.label}</span>
                           <span className={`text-[10px] font-medium ${
                             role === 'Neutral' ? 'text-emerald-400' : 'text-slate-500'
                           }`}>
                             {role}
                           </span>
                         </div>
                         <span className="text-sm font-semibold tabular-nums text-sky-300">
                           {mg.toFixed(1)} mg
                         </span>
                       </div>
                     );
                   })}
                 </div>
                  <IonDeviationDisclosure
                    actual={suggestedIonTotals}
                    target={saltOnlyIons}
                  />
               </div>
             )}
          </div>
        </div>}

          {showWatermancer && activeWatermancerRoute && (
            <div className="order-5" data-watermancer-stage="results">
             <WatermancerIonCoverageBars
               actualIons={activeWatermancerRoute.finalIons}
              supplementalIons={computeSupplementalIonTotals(activeWatermancerRoute.saltTargets)}
              targetIons={watermancerIonTargets}
              targetLabel={watermancerTargetSourceLabel}
               sticky={watermancerResultSticky}
               onToggleSticky={() => setWatermancerResultSticky(current => !current)}
            />
          </div>
        )}

         {showWatermancer && activeWatermancerRoute && (
            <div className="app-card app-panel-surface order-5 bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-indigo-400/25 overflow-hidden" data-watermancer-stage="results">
              <SectionHeader icon={<Droplet className="w-4 h-4" />} title="4. Review match — Final mixture" />
            <div className="border-b border-slate-700/40 px-4 pt-3 text-xs text-slate-400 sm:px-6">
               The automatic match's modeled final mixture at the selected batch volume.
            </div>
             <div className="app-card-body">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3 lg:grid lg:grid-rows-[auto_repeat(3,minmax(0,1fr))_auto] lg:gap-3 lg:space-y-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
                     {watermancerTargetSourceLabel} ion targets
                  </div>
                  <div className="grid gap-3 lg:contents">
                     <SimpleMetricCard label={`${watermancerTargetSourceLabel} GH target`} value={originalTargetGh} unit="ppm CaCO₃" tone="hardness" />
                     <SimpleMetricCard label={`${watermancerTargetSourceLabel} KH target`} value={originalTargetKh} unit="ppm CaCO₃" tone="buffer" />
                     <SimpleMetricCard label={`${watermancerTargetSourceLabel} TDS target`} value={originalTargetTds} unit="mg/L" tone="tds" />
                  </div>
                  <div className="flex items-center justify-center gap-3 rounded-xl border border-indigo-400/20 bg-indigo-500/5 px-4 py-3">
                     <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{watermancerTargetSourceLabel} GH : KH ratio</span>
                    <span className="h-4 w-px bg-slate-700" />
                    {originalTargetKh > 0 && originalTargetGh >= 0 && Number.isFinite(originalTargetGh / originalTargetKh) ? (
                      <span className="text-lg font-semibold text-indigo-300 tabular-nums">
                        {(originalTargetGh / originalTargetKh).toFixed(1)}<span className="text-slate-400 font-normal text-sm mx-1">:</span>1
                      </span>
                    ) : (
                      <span className="text-lg font-semibold text-slate-500">—</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3 lg:grid lg:grid-rows-[auto_repeat(3,minmax(0,1fr))_auto] lg:gap-3 lg:space-y-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                    Selected water + salts
                  </div>
                  <div className="grid gap-3 lg:contents">
                    <HardnessCard label="General Hardness (GH)" value={reviewFinalGh} saltValue={reviewSaltGh} bottledValue={reviewWaterGh} />
                    <HardnessCard label="Carbonate Hardness (KH)" value={reviewFinalKh} saltValue={reviewSaltKh} bottledValue={reviewWaterKh} />
                    <TdsCard value={reviewFinalTds} saltValue={reviewSaltTds} bottledValue={reviewWaterTds} />
                  </div>
                  <div className="flex items-center justify-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Final GH : KH ratio</span>
                    <span className="h-4 w-px bg-slate-700" />
                    {reviewFinalKh > 0 && reviewFinalGh >= 0 && Number.isFinite(reviewFinalGh / reviewFinalKh) ? (
                      <span className="text-lg font-semibold text-emerald-300 tabular-nums">
                        {(reviewFinalGh / reviewFinalKh).toFixed(1)}<span className="text-slate-400 font-normal text-sm mx-1">:</span>1
                      </span>
                    ) : (
                      <span className="text-lg font-semibold text-slate-500">—</span>
                    )}
                  </div>
                </div>
              </div>
               <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                 reviewTotalDeviation <= 0.05
                   ? 'border-emerald-400/20 bg-emerald-500/5'
                   : 'border-amber-400/20 bg-amber-500/5'
               }`}>
                 <div>
                   <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                     Final total deviation
                   </div>
                   <div className="mt-1 text-[10px] text-slate-500">
                     Sum of absolute ion gaps after configured tolerances
                   </div>
                 </div>
                 <div className="flex items-baseline gap-2 text-right">
                   <span className={`text-xl font-semibold tabular-nums ${
                     reviewTotalDeviation <= 0.05 ? 'text-emerald-300' : 'text-amber-300'
                   }`}>
                     {reviewTotalDeviation.toFixed(2)}
                   </span>
                   <span className="text-xs text-slate-400">ppm</span>
                   <span className="text-[10px] text-slate-500">
                     {reviewDeviationCount === 0
                       ? 'within tolerance'
                       : `${reviewDeviationCount} ion${reviewDeviationCount === 1 ? '' : 's'} beyond tolerance`}
                   </span>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Mineral Water Addition */}
        {showWatermancer && batchMl > 0 && (
          <div className="app-card app-panel-surface order-3 bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-indigo-400/25 overflow-hidden" data-watermancer-stage="salts">
            <SectionHeader
              icon={<GiSaltShaker className="w-4 h-4" />}
             title="3. Choose salts"
            />
             <div className="app-card-body space-y-4">

                <div className="watermancer-salt-table mt-2 overflow-hidden rounded-xl border border-slate-700/60">
                   <div className="watermancer-salt-table__header hidden bg-slate-950/50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:grid">
                    <span>Salt</span>
                    <span>Hydration form</span>
                    <span>Dose</span>
                    <span>Use</span>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                    {SALTS.map((salt, index) => {
                      const option = watermancerSaltOptions[index];
                      const used = watermancerUsedSaltIds.includes(salt.id);
                       const doseIsAdjusted = Object.prototype.hasOwnProperty.call(watermancerDoseOverridesMg, salt.id);
                       const activePpm = used ? Math.max(0, Number(activeWatermancerRoute.saltTargets[salt.id] ?? 0)) : 0;
                       const activeMg = activePpm > 0
                         ? computeSaltMg(activePpm, L, option.form.molarMass, salt.anhydrousMass)
                        : 0;
                      return (
                         <div key={salt.id} className="watermancer-salt-table__row bg-slate-900/25">
                           <div className="watermancer-salt-table__salt">
                             <div className="watermancer-salt-table__salt-name text-xs font-semibold text-slate-200">{salt.name}</div>
                             <div className="watermancer-salt-table__salt-formula mt-0.5 text-[10px] text-slate-500">{salt.formula}</div>
                          </div>
                           <label className="watermancer-salt-table__hydration flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:hidden">Hydration form</span>
                            <select
                              value={rows[index]?.formIdx ?? salt.defaultFormIdx ?? 0}
                              onChange={event => {
                                const formIdx = Number(event.target.value);
                                setRows(current => current.map((row, rowIndex) => (
                                  rowIndex === index ? { ...row, formIdx } : row
                                )));
                              }}
                              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-indigo-300/60"
                              aria-label={`${salt.name} hydration form`}
                            >
                              {salt.hydrationForms.map((form, formIdx) => (
                                <option key={`${salt.id}-${formIdx}`} value={formIdx}>{form.label}</option>
                              ))}
                            </select>
                          </label>
                            <div className="watermancer-salt-table__dose">
                             <span className="watermancer-salt-table__dose-label text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:hidden">Dose</span>
                             <div className="watermancer-salt-table__dose-controls">
                            <HoldStepperButton
                              onStep={() => adjustWatermancerDose(salt.id, activeMg, -1)}
                              disabled={!used || activeMg <= 0}
                              label={`Decrease ${salt.name} dose by 1 mg`}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-950/60 text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </HoldStepperButton>
                            <div className="watermancer-salt-table__dose-value">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={used ? activeMg.toFixed(1) : '0.0'}
                                onChange={event => {
                                  const value = Math.max(0, Number(event.target.value) || 0);
                                  setWatermancerDoseOverridesMg(current => ({ ...current, [salt.id]: value }));
                                }}
                                disabled={!used}
                                className="min-w-0 w-16 rounded-md border border-cyan-400/25 bg-slate-950/70 px-1.5 py-1 text-center text-xs font-semibold tabular-nums text-cyan-100 outline-none focus:border-cyan-300/70 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`${salt.name} dose in milligrams`}
                              />
                              <span className={`watermancer-salt-table__dose-status text-[9px] font-semibold uppercase tracking-wider ${doseIsAdjusted ? 'text-amber-300' : 'text-slate-600'}`}>
                                {used ? (doseIsAdjusted ? 'Adjusted' : 'Suggested') : ''}
                              </span>
                            </div>
                             <span className="watermancer-salt-table__dose-unit text-[10px] text-slate-500">mg</span>
                            <HoldStepperButton
                              onStep={() => adjustWatermancerDose(salt.id, activeMg, 1)}
                              disabled={!used}
                              label={`Increase ${salt.name} dose by 1 mg`}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-400/35 bg-cyan-500/10 text-cyan-200 transition hover:bg-cyan-500/20"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </HoldStepperButton>
                             </div>
                          </div>
                           <div className="watermancer-salt-table__use">
                           <button
                            type="button"
                            onClick={() => {
                              setWatermancerUsedSaltIds(current => used
                                ? current.filter(id => id !== salt.id)
                                : [...current, salt.id]);
                            }}
                            aria-pressed={used}
                            className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${
                              used
                                ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                                : 'border-slate-700 bg-slate-950/40 text-slate-500 hover:border-indigo-300/50 hover:bg-indigo-500/10 hover:text-indigo-200'
                            }`}
                          >
                             {used ? 'Use' : 'Not used'}
                          </button>
                           </div>
                        </div>
                      );
                    })}
                  </div>
                 <p className="border-t border-slate-700/50 px-3 py-2 text-[10px] leading-relaxed text-slate-500">
                    The calculator uses its suggested dose until you edit it. After that, your Dose value is held fixed while Watermancer adjusts the other selected salts around it.
                 </p>
                </div>
            </div>
          </div>
        )}

         {showWatermancer && watermancerLiveResult && (
           <div className="app-card app-panel-surface order-4 bg-slate-800/70 backdrop-blur rounded-2xl border border-cyan-400/35 shadow-2xl shadow-cyan-950/20 overflow-hidden" data-watermancer-stage="match">
             <SectionHeader
               icon={<Sparkles className="h-4 w-4 text-cyan-300" />}
                title="Find your best match"
             />
              <div className="app-card-body">
                <div className="flex flex-wrap items-start justify-between gap-3">
                 <div>
                    <p className="text-xs font-semibold text-cyan-100">Search your selected waters and salts for a safe, useful match.</p>
                   <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-400">
                        The calculator compares the available options behind the scenes, then lets you review the recommendation before using it.
                   </p>
                 </div>
                   <div className="flex shrink-0 flex-col items-stretch gap-2">
                     <div className="flex items-center justify-end gap-2">
                       <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                         watermancerLiveResult.status === 'matched'
                           ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                           : watermancerLiveResult.status === 'partial'
                             ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                             : 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                       }`}>
                         {watermancerLiveResult.status === 'matched'
                           ? 'Matched'
                           : watermancerLiveResult.status === 'partial'
                             ? 'Partial match'
                             : 'Needs inputs'}
                       </span>
                     </div>
                   </div>
               </div>
                <details className="mt-3 rounded-xl border border-indigo-400/25 bg-indigo-950/15" open>
                  <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold text-indigo-100">
                    Guide the match
                    <span className="ml-2 text-[10px] font-normal text-slate-400">
                      Tell Watermancer where each ion should come from.
                    </span>
                  </summary>
                  <div className="border-t border-indigo-400/15 px-3 py-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ACTIVE_ION_IDS.map(id => {
                        const preference = watermancerIonSourcePreferences[id] ?? 'dont-care';
                        return (
                          <div
                            key={id}
                            className="rounded-lg border border-slate-700/60 bg-slate-950/25 px-2.5 py-2"
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-slate-200">
                                Where should {ION_MAP[id].name} come from?
                              </span>
                              <span className="shrink-0 text-[10px] text-slate-500">{ION_MAP[id].formula}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                              {WATERMANCER_ION_SOURCE_OPTIONS.map(option => {
                                const selected = preference === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => {
                                      setWatermancerIonSourcePreferences(current => ({
                                        ...current,
                                        [id]: option.value,
                                      }));
                                      setWatermancerBestMatchMessage(null);
                                    }}
                                    className={`rounded-md border px-1.5 py-1.5 text-[10px] font-medium leading-tight transition ${
                                      selected
                                        ? 'border-cyan-300/70 bg-cyan-400/15 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.16)]'
                                        : 'border-slate-700/70 bg-slate-900/40 text-slate-500 hover:border-cyan-400/40 hover:text-cyan-200'
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                      Water only avoids salt contribution where possible. Salt only keeps the selected water out of that ion’s target. Coupled ions may still be reported as gaps or overshoots.
                    </p>
                  </div>
                </details>
                  <div className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-950/15 p-3 shadow-[0_0_24px_rgba(34,211,238,0.06)] sm:p-4">
                  <button
                    type="button"
                     onClick={handleFindBestWatermancerMatch}
                     disabled={watermancerActionRunning}
                     className="watermancer-best-match-button group relative isolate flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:opacity-70"
                     title="Search your selected waters and salts for the best safe match."
                  >
                      <img
                        src={pepeImage}
                        alt=""
                        aria-hidden="true"
                        className="h-8 w-8 object-contain"
                      />
                      <span aria-hidden="true" className="text-base leading-none">👉</span>
                     <span aria-live="polite">
                       {watermancerActionRunning ? 'Searching your water and salt options…' : 'Find the best match'}
                     </span>
                  </button>
                </div>
                {watermancerBestMatchPreview && (
                  <div className="mt-3 rounded-xl border border-violet-400/30 bg-violet-500/[0.08] p-4 text-violet-100">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/80">
                          Review your recommended match
                        </div>
                        <p className="mt-1 text-xs font-semibold text-violet-50">
                          This match prioritizes useful mineral coverage while keeping bicarbonate within its limit.
                        </p>
                      </div>
                      <span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                         {watermancerBestMatchPreview.status === 'matched' ? 'Matched' : 'Partial match'}
                      </span>
                    </div>
                     <p className="mt-2 max-w-3xl text-[11px] leading-relaxed text-violet-100/80">
                       {watermancerBestMatchPreview.explanation}
                     </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-violet-300/15 bg-slate-950/20 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-violet-200/60">Recommended water</div>
                        <div className="mt-1 text-sm font-semibold tabular-nums">
                          {[...watermancerBestMatchPreview.route.baseWaters, ...watermancerBestMatchPreview.route.additionWaters]
                            .reduce((total, water) => total + num(water.volumeMl), 0)
                            .toFixed(0)} mL
                        </div>
                      </div>
                      <div className="rounded-lg border border-violet-300/15 bg-slate-950/20 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-violet-200/60">Salt doses</div>
                        <div className="mt-1 text-sm font-semibold">
                          {Object.values(watermancerBestMatchPreview.route.saltTargets).filter(target => target > 0.000001).length} selected
                        </div>
                      </div>
                      <div className="rounded-lg border border-violet-300/15 bg-slate-950/20 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-violet-200/60">Final deviation</div>
                        <div className="mt-1 text-sm font-semibold tabular-nums">
                          {watermancerBestMatchPreview.totalDeviation.toFixed(2)} ppm
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-lg border border-violet-300/15 bg-slate-950/20 px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/60">Recommended waters</div>
                        <div className="mt-2 space-y-1.5">
                          {[...watermancerBestMatchPreview.route.baseWaters, ...watermancerBestMatchPreview.route.additionWaters].length > 0 ? (
                            [...watermancerBestMatchPreview.route.baseWaters, ...watermancerBestMatchPreview.route.additionWaters].map(water => (
                              <div key={water.id} className="flex items-center justify-between gap-3 text-[11px]">
                                <span className="min-w-0 truncate text-slate-200">
                                  {water.name || 'Unnamed water'}
                                  {watermancerBestMatchPreview.route.additionWaters.some(entry => entry.id === water.id) && (
                                    <span className="ml-1 text-[9px] uppercase tracking-wider text-cyan-300/70">added</span>
                                  )}
                                </span>
                                <span className="shrink-0 font-semibold tabular-nums text-violet-100">{num(water.volumeMl).toFixed(0)} mL</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-[11px] text-slate-500">No mineral water selected.</div>
                          )}
                        </div>
                      </div>
                      <div className="rounded-lg border border-violet-300/15 bg-slate-950/20 px-3 py-3">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/60">Recommended salts</div>
                        <div className="mt-2 space-y-1.5">
                          {SALTS.some(salt => (watermancerBestMatchPreview.route.saltTargets[salt.id] ?? 0) > 0.000001) ? (
                            SALTS.map((salt, index) => {
                              const targetPpm = watermancerBestMatchPreview.route.saltTargets[salt.id] ?? 0;
                              if (targetPpm <= 0.000001) return null;
                              const form = salt.hydrationForms[rows[index]?.formIdx ?? salt.defaultFormIdx ?? 0] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
                              const massMg = form && L > 0
                                ? computeSaltMg(targetPpm, L, form.molarMass, salt.anhydrousMass)
                                : 0;
                              return (
                                <div key={salt.id} className="flex items-center justify-between gap-3 text-[11px]">
                                  <span className="min-w-0 truncate text-slate-200">{salt.name}<span className="ml-1 text-[9px] text-slate-500">{form?.label ?? ''}</span></span>
                                  <span className="shrink-0 font-semibold tabular-nums text-violet-100">{massMg.toFixed(1)} mg</span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-[11px] text-slate-500">No salt dose needed.</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg border border-violet-300/15 bg-slate-950/20 px-3 py-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-200/60">Final ions versus target</div>
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                        {watermancerBestMatchPreview.route.deviations
                          .filter(deviation => deviation.target > 0 || deviation.actual > 0.05)
                          .map(deviation => (
                            <div key={deviation.id} className="flex items-center justify-between gap-2 text-[10px]">
                              <span className="truncate text-slate-400">{ION_MAP[deviation.id].name}</span>
                              <span className={`shrink-0 tabular-nums ${
                                Math.abs(deviation.delta) <= 0.05 ? 'text-emerald-300' : deviation.delta > 0 ? 'text-amber-300' : 'text-rose-300'
                              }`}>
                                {deviation.actual.toFixed(1)} / {deviation.target.toFixed(1)}
                              </span>
                            </div>
                          ))}
                      </div>
                      <div className="mt-3 grid gap-3 border-t border-violet-300/10 pt-3 sm:grid-cols-2">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-200/70">Remaining gaps</div>
                          <div className="mt-1 space-y-1">
                            {watermancerBestMatchPreview.route.deviations.filter(deviation => deviation.delta < -0.05).length > 0 ? (
                              watermancerBestMatchPreview.route.deviations.filter(deviation => deviation.delta < -0.05).map(deviation => (
                                <div key={deviation.id} className="text-[10px] text-rose-200">
                                  {ION_MAP[deviation.id].name}: {Math.abs(deviation.delta).toFixed(1)} ppm below
                                </div>
                              ))
                            ) : (
                              <div className="text-[10px] text-slate-500">No meaningful gaps.</div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-200/70">Overshoots</div>
                          <div className="mt-1 space-y-1">
                            {watermancerBestMatchPreview.route.overshoots.length > 0 ? (
                              watermancerBestMatchPreview.route.overshoots.map(overshoot => (
                                <div key={overshoot.id} className="text-[10px] text-amber-200">
                                  {ION_MAP[overshoot.id].name}: {overshoot.amount.toFixed(1)} ppm over
                                </div>
                              ))
                            ) : (
                              <div className="text-[10px] text-slate-500">No meaningful overshoots.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleDismissWatermancerBestMatch}
                        className="rounded-lg border border-violet-300/25 px-3 py-2 text-xs font-semibold text-violet-200 transition hover:bg-violet-300/10"
                      >
                        Keep current plan
                      </button>
                      <button
                        type="button"
                        onClick={handleUseWatermancerBestMatch}
                        className="rounded-lg border border-violet-200/50 bg-violet-300/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-300/30"
                      >
                        Use this match
                      </button>
                    </div>
                  </div>
                )}
                {watermancerBestMatchMessage && (
                  <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/[0.08] px-3 py-2 text-[10px] text-amber-100">
                    {watermancerBestMatchMessage}
                  </div>
                )}
               <div className="mt-3 grid gap-2 sm:grid-cols-3">
                 <div className="rounded-lg border border-slate-700/60 bg-slate-900/35 px-3 py-2">
                   <div className="text-[10px] uppercase tracking-wider text-slate-500">Automatic plan</div>
                   <div className="mt-1 text-xs font-semibold text-slate-200">Primary match</div>
                 </div>
                 <div className="rounded-lg border border-slate-700/60 bg-slate-900/35 px-3 py-2">
                   <div className="text-[10px] uppercase tracking-wider text-slate-500">Water volume</div>
                   <div className="mt-1 text-xs font-semibold tabular-nums text-slate-200">
                     {[...mineralWaters, ...additionWaters].reduce((total, water) => total + num(water.volumeMl), 0).toFixed(0)} mL
                   </div>
                 </div>
                 <div className="rounded-lg border border-slate-700/60 bg-slate-900/35 px-3 py-2">
                   <div className="text-[10px] uppercase tracking-wider text-slate-500">Automatic salts</div>
                   <div className="mt-1 text-xs font-semibold text-slate-200">
                     {Object.values(activeWatermancerSaltTargets).filter(target => target > 0.000001).length} selected
                   </div>
                 </div>
               </div>
             </div>
           </div>
         )}
      </div>
      {(showAlchemist || showWatermancer || nerdLevel === 'brewer') && (
        <button
          type="button"
          onClick={() => setShowBrewerSteps('dry')}
          className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur transition hover:-translate-y-0.5 active:translate-y-0 ${
            showAlchemist
              ? 'border-emerald-300/45 bg-emerald-500/90 text-white shadow-emerald-950/40 hover:bg-emerald-400'
              : showWatermancer
                ? 'border-cyan-300/45 bg-indigo-600/90 text-white shadow-indigo-950/40 hover:bg-indigo-500'
                : 'border-sky-300/45 bg-sky-600/90 text-white shadow-sky-950/40 hover:bg-sky-500'
          }`}
          aria-label="Open recipe steps"
          title="Open the current recipe steps"
        >
          <ListChecks className="h-4 w-4" />
          <span>Recipe steps</span>
        </button>
      )}
      {/* Reset confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 border border-slate-600/60 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-100">Reset everything?</h3>
            <p className="text-sm text-slate-400">
              This will clear all salt targets, mineral water values, and volume back to defaults. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-sm text-slate-400 hover:text-slate-200 bg-slate-700/40 hover:bg-slate-700/60 rounded-lg px-4 py-2 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg px-4 py-2 transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
      {showWatermancerResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={() => setShowWatermancerResetConfirm(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-600/60 bg-slate-800 p-6 shadow-2xl"
            onClick={event => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="watermancer-reset-title"
          >
            <div className="flex items-start gap-3">
              <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              <div>
                <h3 id="watermancer-reset-title" className="text-base font-semibold text-slate-100">Reset Watermancer?</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  This clears the active waters, salt choices, target inputs, and match results. Saved waters, profiles, and preferences will stay available.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowWatermancerResetConfirm(false)}
                className="rounded-lg bg-slate-700/40 px-4 py-2 text-sm text-slate-400 transition hover:bg-slate-700/60 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetWatermancer}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500"
              >
                Reset workspace
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
        {showTastePreference && (
        <TastePreferenceModal
          onClose={() => setShowTastePreference(false)}
          onApply={handleApplyTasteInference}
        />
      )}
      {showBrewerSteps && (
        <BrewerRecipeStepsModal
          saltTargets={nerdLevel === 'brewer' ? brewerModeSaltTargets : saltTargets}
          recipeRows={rows}
          liters={L}
          concentrateOn={concentrateOn}
          concentrateLiters={concL}
          concentrateStrength={concentrateStrength}
          baseWaters={nerdLevel === 'brewer' ? [] : mineralWaters}
          additionWaters={nerdLevel === 'brewer' ? [] : additionWaters}
          baseWaterScale={sourceScale}
          batchMl={batchMl}
          saltOnlyIons={nerdLevel === 'brewer' ? brewerModeIonTotals : saltOnlyIons}
          bottledIons={nerdLevel === 'brewer' ? {} as Record<IonId, number> : bottledIons}
          suggestedSaltTargets={nerdLevel === 'brewer' ? brewerModeSaltTargets : effectiveSuggestedSaltTargets}
          bicarbonateWaterOvershoot={nerdLevel === 'brewer' ? false : bicarbonateWaterOvershoot}
          nerdLevel={nerdLevel}
          tdsTarget={nerdLevel === 'brewer' ? brewerModeTds : tdsForRecipeSteps}
           dropsPerMl={brewerDropsPerMl}
          dosingMethod={showBrewerSteps}
          onClose={() => setShowBrewerSteps(null)}
        />
      )}
      {/* ── Community waters modal ── */}
      {communityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCommunityModalOpen(false)}>
          <div className="w-full max-w-2xl max-h-[80vh] bg-slate-800 rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 shrink-0">
              <h2 className="text-sm font-semibold text-slate-200">Community waters</h2>
              <button onClick={() => setCommunityModalOpen(false)} className="text-slate-500 hover:text-slate-200 transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {communityLoading ? (
                <p className="text-xs text-slate-500 italic text-center py-8">Loading community waters…</p>
              ) : communityWaters.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-8">No community waters found yet.</p>
              ) : (
                communityWaters
                  .filter(w => w.shared === 'yes')
                  .map(w => {
                    const alreadyAdded = localWaters.some(l => l.sourceId === w.id);
                    return (
                      <div key={w.id} className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-700/50 rounded-lg px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-slate-200 block truncate">{w.name || `Water #${w.id}`}</span>
                          <span className="text-[10px] text-slate-500">{Object.keys(w.ions).length} ions</span>
                        </div>
                        <button
                          onClick={() => {
                            if (alreadyAdded) return;
                            const nw: LocalWater = {
                              id: newLocalWaterId(),
                              name: w.name || `Water #${w.id}`,
                              ions: w.ions,
                              metadata: w.metadata,
                              sourceId: w.id,
                            };
                            saveWaters([...localWaters, nw]);
                            const vals: Partial<Record<IonId, string>> = {};
                            for (const [k, v] of Object.entries(w.ions)) {
                              if (v > 0) vals[k as IonId] = String(v);
                            }
                           addMineralWater({
                             name: w.name || undefined,
                             ions: vals,
                             metadata: w.metadata ? metadataToStrings(w.metadata) : undefined,
                             sourceLocalId: String(w.id),
                           });
                          }}
                          disabled={alreadyAdded}
                          className={`text-xs font-medium rounded-lg px-3 py-1.5 transition shrink-0 ${
                            alreadyAdded
                              ? 'text-slate-500 bg-slate-700/30 cursor-default'
                              : 'text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30'
                          }`}
                        >
                          {alreadyAdded ? 'Added' : 'Add to my waters'}
                        </button>
                      </div>
                    );
                  })
              )}
              {!communityLoading && communityWaters.filter(w => w.shared === 'yes').length === 0 && communityWaters.length > 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">No publicly shared waters available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConcentrateWorkspace() {
  const [saltId, setSaltId] = useState('mgso4');
  const [formIdx, setFormIdx] = useState(
    SALTS.find(salt => salt.id === 'mgso4')?.defaultFormIdx ?? 0,
  );
  const [strengthInput, setStrengthInput] = useState('5');
  const [totalStockMassInput, setTotalStockMassInput] = useState('50');
  const [calibrationDrops, setCalibrationDrops] = useState('100');
  const [calibrationStockMass, setCalibrationStockMass] = useState('5');
  const [targetSaltMass, setTargetSaltMass] = useState('40');
  const [doseDrops, setDoseDrops] = useState('1');
  const [doseLiters, setDoseLiters] = useState('1');
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  const salt = SALTS.find(item => item.id === saltId) ?? SALTS[0];
  const safeFormIdx = Math.min(formIdx, Math.max(0, salt.hydrationForms.length - 1));
  const form = salt.hydrationForms[safeFormIdx] ?? salt.hydrationForms[0];
  const strengthPercent = Math.max(0, Number(strengthInput) || 0);
  const totalStockMassG = Math.max(0, Number(totalStockMassInput) || 0);
  const saltMassG = computeConcentrateStockSaltMassMg(strengthPercent, totalStockMassG) / 1000;
  const waterMassG = Math.max(0, totalStockMassG - saltMassG);
  const saltMassLabel = saltMassG >= 1 ? `${saltMassG.toFixed(2)} g` : `${(saltMassG * 1000).toFixed(0)} mg`;
  const saltMgPerStockG = strengthPercent * 10;
  const measuredDrops = Number(calibrationDrops);
  const measuredStockMassG = Number(calibrationStockMass);
  const measuredGramsPerDrop = measuredDrops > 0 && measuredStockMassG > 0
    ? measuredStockMassG / measuredDrops
    : 0;
  const mgPerDrop = computeConcentrateSaltMgPerDrop(strengthPercent, measuredDrops, measuredStockMassG);
  const targetSaltMassMg = Math.max(0, Number(targetSaltMass) || 0);
  const exactDropsForTarget = computeConcentrateDropsForSaltMass(targetSaltMassMg, mgPerDrop);
  const recommendedDrops = exactDropsForTarget > 0 ? Math.max(1, Math.round(exactDropsForTarget)) : 0;
  const recommendedSaltMassMg = recommendedDrops * mgPerDrop;
  const finalDrops = Math.max(0, Number(doseDrops) || 0);
  const finalLiters = Math.max(0, Number(doseLiters) || 0);
  const resultingPpm = finalLiters > 0 ? finalDrops * mgPerDrop / finalLiters : 0;
  const warnings = useMemo(
    () => strengthPercent > 0
      ? checkConcentrate(1000, { [salt.id]: saltMgPerStockG })
      : [],
    [salt.id, saltMgPerStockG, strengthPercent],
  );
  const hasError = warnings.some(warning => warning.severity === 'error');
  const toggleStep = (step: number) => {
    setCompletedSteps(prev => ({ ...prev, [step]: !prev[step] }));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/10 via-slate-800/70 to-violet-500/10 p-5 shadow-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-fuchsia-100">
              <FlaskConical className="h-4 w-4 text-fuchsia-300" />
              Make one mineral stock
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              Make a repeatable mineral stock by weight, then use calibrated drops in your brew water.
            </p>
          </div>
          <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-200">
            Step-by-step
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 shadow-xl sm:p-6">
        <StepHeading number="1" title="Choose the mineral" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Salt</span>
            <select
              value={saltId}
              onChange={event => {
                const nextSalt = SALTS.find(item => item.id === event.target.value) ?? SALTS[0];
                setSaltId(nextSalt.id);
                setFormIdx(nextSalt.defaultFormIdx ?? 0);
                setCompletedSteps({});
              }}
              className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-100 outline-none"
              aria-label="Concentrate salt"
            >
              {SALTS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hydration form</span>
            <select
              value={safeFormIdx}
              onChange={event => setFormIdx(Number(event.target.value))}
              className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-100 outline-none"
              aria-label="Concentrate hydration form"
            >
              {salt.hydrationForms.map((hydration, index) => (
                <option key={`${salt.id}-${hydration.label}`} value={index}>{hydration.label}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Selected: {salt.formula} · {form.label} · {form.molarMass.toFixed(3)} g/mol
        </p>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 shadow-xl sm:p-6">
        <StepHeading number="2" title="Choose concentration and batch weight" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Concentration</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="0.1"
                value={strengthInput}
                onChange={event => setStrengthInput(event.target.value)}
                className="w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
                aria-label="Concentrate strength percentage"
              />
              <span className="text-sm text-slate-400">%</span>
            </div>
          </label>
          <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total stock weight</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                value={totalStockMassInput}
                onChange={event => setTotalStockMassInput(event.target.value)}
                className="w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
                aria-label="Total concentrate stock weight in grams"
              />
              <span className="text-sm text-slate-400">g</span>
            </div>
          </label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <SummaryMetric label="Salt to weigh" value={saltMassLabel} detail={salt.name} tone="fuchsia" />
          <SummaryMetric label="Water to weigh" value={`${waterMassG.toFixed(2)} g`} detail="distilled or RO water" tone="slate" />
          <SummaryMetric label="Salt per stock gram" value={`${saltMgPerStockG.toFixed(1)} mg`} detail={salt.name} tone="slate" />
        </div>
        {warnings.length > 0 && (
          <div className={`mt-3 rounded-xl border px-3 py-3 text-[11px] leading-relaxed ${hasError ? 'border-rose-400/30 bg-rose-500/[0.08] text-rose-200' : 'border-amber-400/30 bg-amber-500/[0.08] text-amber-200'}`}>
            <div className="font-semibold">{hasError ? 'Check this strength before mixing' : 'Mixing note'}</div>
            {warnings.map(warning => <p key={warning.message} className="mt-1">{warning.message}</p>)}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 shadow-xl sm:p-6">
        <StepHeading number="3" title="Weigh, mix, and label" />
        <div className="mt-4 space-y-2">
          {[
            `Weigh ${saltMassLabel} of ${salt.name} (${form.label}).`,
            `Add ${waterMassG.toFixed(2)} g of distilled or RO water.`,
            `Combine until the total stock weighs ${totalStockMassG.toFixed(2)} g.`,
            `Shake until clear, then label: ${salt.name} · ${strengthPercent || 0}% w/w · ${totalStockMassG.toFixed(2)} g total.`,
          ].map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => toggleStep(index)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${completedSteps[index] ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-slate-700/60 bg-slate-950/25 hover:border-fuchsia-400/30'}`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${completedSteps[index] ? 'border-emerald-300 bg-emerald-400 text-slate-950' : 'border-slate-600 text-transparent'}`}>
                <Check className="h-3 w-3" />
              </span>
              <span className={`text-xs ${completedSteps[index] ? 'text-emerald-100 line-through' : 'text-slate-300'}`}>{step}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-400/25 bg-slate-800/70 p-4 shadow-xl sm:p-6">
        <StepHeading number="4" title="Calibrate this dropper" />
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          Tare a small container, dispense a known number of drops, then weigh the drops.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <CalibrationInput label="Drops dispensed" value={calibrationDrops} onChange={setCalibrationDrops} ariaLabel="Calibration drops dispensed" />
          <CalibrationInput label="Drops weight (g)" value={calibrationStockMass} onChange={setCalibrationStockMass} ariaLabel="Calibration drops weight in grams" />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <SummaryMetric label="Weight per drop" value={`${measuredGramsPerDrop.toFixed(4)} g`} detail="this dropper" tone="sky" />
          <SummaryMetric label="Salt per drop" value={`${mgPerDrop.toFixed(2)} mg`} detail={salt.name} tone="sky" />
          <SummaryMetric label="Drops per gram" value={measuredGramsPerDrop > 0 ? `${(1 / measuredGramsPerDrop).toFixed(1)}` : '—'} detail="this stock" tone="sky" />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
          This weight calibration applies to this stock. Recalibrate whenever you change the bottle, dropper, or technique.
        </p>
      </section>

      <section className="rounded-2xl border border-emerald-400/25 bg-slate-800/70 p-4 shadow-xl sm:p-6">
        <StepHeading number="5" title="Calculate your dose" />
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Dose a target mineral amount</div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Enter the salt mass you want to add. The recommendation rounds to a whole drop using this stock calibration.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <CalibrationInput
              label={`Target ${salt.name} (mg)`}
              value={targetSaltMass}
              onChange={setTargetSaltMass}
              ariaLabel={`Target ${salt.name} amount in milligrams`}
            />
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2">
              <span className="block text-[10px] text-slate-500">Recommended dose</span>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <strong className="text-xl tabular-nums text-emerald-200">
                  {recommendedDrops > 0 ? `${recommendedDrops} drops` : '—'}
                </strong>
                {recommendedDrops > 0 && (
                  <span className="text-[11px] text-slate-400">
                    delivers {recommendedSaltMassMg.toFixed(2)} mg
                    {exactDropsForTarget > 0 ? ` · exact math: ${exactDropsForTarget.toFixed(1)} drops` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <CalibrationInput label="Drops added" value={doseDrops} onChange={setDoseDrops} ariaLabel="Drops added to final water" />
          <CalibrationInput label="Final water (L)" value={doseLiters} onChange={setDoseLiters} ariaLabel="Final water volume for drop contribution" />
        </div>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3">
          <span className="text-xs text-slate-400">{finalDrops} drops × {mgPerDrop.toFixed(2)} mg/drop of {salt.name}</span>
          <strong className="text-xl tabular-nums text-emerald-200">{resultingPpm.toFixed(2)} mg/L</strong>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
          Keep each mineral stock in its own bottle. Add individual stocks to the final water, especially for calcium, sulfate, bicarbonate, and citrate salts.
        </p>
      </section>
    </div>
  );
}

function StepHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-700/50 pb-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-400/15 text-xs font-bold text-fuchsia-200">{number}</span>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">{title}</h2>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'fuchsia' | 'sky' | 'slate';
}) {
  const toneClass = tone === 'fuchsia'
    ? 'border-fuchsia-400/20 bg-fuchsia-500/[0.06] text-fuchsia-200'
    : tone === 'sky'
      ? 'border-sky-400/20 bg-sky-500/[0.06] text-sky-200'
      : 'border-slate-700/60 bg-slate-950/25 text-slate-100';
  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] text-slate-500">{detail}</div>
    </div>
  );
}

function CalibrationInput({
  label,
  value,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2">
      <span className="block text-[10px] text-slate-500">{label}</span>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-1 w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
        aria-label={ariaLabel}
      />
    </label>
  );
}

function WatermancerIonProfileCard({
  ions,
  supplementalIons,
  targetIons,
  profiles,
  activeProfileId,
  wmProfiles,
  allRecipes,
  externalRecipes,
  referenceWaters,
  watermancerTargetSource,
  onSelectProfile,
  onTargetSourceChange,
  onSaveWmProfile,
  onReset,
}: {
  ions: Partial<Record<IonId, number>>;
  supplementalIons: Partial<Record<SupplementalIonId, number>>;
  targetIons: Partial<Record<IonId, number>>;
  profiles: WaterProfile[];
  activeProfileId: string;
  wmProfiles: WatermancerProfile[];
  allRecipes: SaltRecipe[];
  externalRecipes: ExternalRecipe[];
  referenceWaters: typeof EMPIRICAL_WATERS;
  watermancerTargetSource: WatermancerTargetSourceId;
  onSelectProfile: (id: string) => void;
  onTargetSourceChange: (source: WatermancerTargetSourceId) => void;
  onSaveWmProfile: (profile: WatermancerProfile) => void;
  onReset: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftTargets, setDraftTargets] = useState<Partial<Record<IonId, string>>>({});
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');

  const currentDropdownValue = watermancerTargetSource === 'safe-profile'
    ? `profile:${activeProfileId}`
    : watermancerTargetSource;

  const selectedTargetSourceUrl = (() => {
    if (currentDropdownValue.startsWith('profile:')) {
      const profileId = currentDropdownValue.slice('profile:'.length);
      const referenceWater = referenceWaters.find(
        water => `${water.id}-ionic-profile` === profileId,
      );
      return referenceWater?.sourceUrl;
    }
    if (currentDropdownValue.startsWith('recipe:')) {
      return allRecipes.find(
        recipe => recipe.id === currentDropdownValue.slice('recipe:'.length),
      )?.sourceUrl;
    }
    if (currentDropdownValue.startsWith('external:')) {
      return externalRecipes.find(
        recipe => recipe.id === currentDropdownValue.slice('external:'.length),
      )?.sourceUrl;
    }
    return undefined;
  })();

  const selectedTargetSourceName = (() => {
    if (currentDropdownValue.startsWith('profile:')) {
      return profiles.find(
        profile => profile.id === currentDropdownValue.slice('profile:'.length),
      )?.name ?? 'selected Empirical Water profile';
    }
    if (currentDropdownValue.startsWith('recipe:')) {
      return allRecipes.find(
        recipe => recipe.id === currentDropdownValue.slice('recipe:'.length),
      )?.name ?? 'selected recipe';
    }
    return externalRecipes.find(
      recipe => recipe.id === currentDropdownValue.slice('external:'.length),
    )?.name ?? 'selected Watering Hole recipe';
  })();

  const handleDropdownChange = (value: string) => {
    if (value.startsWith('profile:')) {
      const profileId = value.slice('profile:'.length);
      onSelectProfile(profileId);
      onTargetSourceChange('safe-profile');
    } else {
      onTargetSourceChange(value as WatermancerTargetSourceId);
    }
  };

  const startEditing = () => {
    setDraftTargets(
      Object.fromEntries(
        ACTIVE_ION_IDS.map(id => [id, String(targetIons[id] ?? 0)]),
      ) as Partial<Record<IonId, string>>,
    );
    setEditing(true);
    setNaming(false);
    setNewName('');
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraftTargets({});
    setNaming(false);
    setNewName('');
  };

  const handleSave = () => {
    if (!newName.trim()) return;
    const targets = Object.fromEntries(
      ACTIVE_ION_IDS.map(id => {
        const val = parseFloat(draftTargets[id] ?? '0');
        return [id, Number.isFinite(val) && val >= 0 ? val : 0];
      }),
    ) as IonicTargetValues;
    const profile = createWatermancerProfile(newName.trim(), targets);
    onSaveWmProfile(profile);
    onTargetSourceChange(`saved:${profile.id}` as WatermancerTargetSourceId);
    setEditing(false);
    setNaming(false);
    setNewName('');
    setDraftTargets({});
  };

  const updateDraft = (id: IonId, value: string) => {
    setDraftTargets(prev => ({ ...prev, [id]: value }));
  };

  return (
    <div className="app-card app-panel-surface bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-indigo-400/30 overflow-hidden">
      {/* Header */}
      <div className="app-section-header flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 border-b border-indigo-400/15 text-slate-300">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-indigo-300" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">1. Set your target water</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
           <div className="flex items-start gap-1">
             {selectedTargetSourceUrl && (
               <a
                 href={selectedTargetSourceUrl}
                 target="_blank"
                 rel="noreferrer"
                 aria-label={`Open source page for ${selectedTargetSourceName}`}
                 title={`Open source page for ${selectedTargetSourceName}`}
                 className="mt-[6px] flex h-4 w-4 items-center justify-center rounded-full border border-indigo-300/35 bg-indigo-500/15 text-[9px] font-bold leading-none text-indigo-100 transition hover:border-indigo-200/70 hover:bg-indigo-500/30 hover:text-white"
               >
                 ?
               </a>
             )}
             <div className="flex flex-col items-start gap-1">
             <select
               value={currentDropdownValue}
               onChange={e => handleDropdownChange(e.target.value)}
               aria-label="Select target water profile"
               className="max-w-[240px] rounded-lg border border-indigo-400/30 bg-indigo-950/30 px-2.5 py-1.5 text-[11px] text-indigo-100 transition focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
             >
            <optgroup label="Empirical Water Profiles">
              {profiles.filter(p => p.id !== AIKI_DEFAULT_PROFILE.id).map(p => (
                <option key={`profile:${p.id}`} value={`profile:${p.id}`}>
                  {p.name
                    .replace(/^Empirical Water — /, '')
                    .replace(/ ionic profile$/, '')}
                </option>
              ))}
            </optgroup>
            {wmProfiles.length > 0 && (
              <optgroup label="My saved profiles">
                {wmProfiles.map(p => (
                  <option key={`saved:${p.id}`} value={`saved:${p.id}`}>{p.name}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Kimoi.coffee Recipes">
              {allRecipes.map(r => (
                 <option key={`recipe:${r.id}`} value={`recipe:${r.id}`}>
                   {r.id === 'kimoi' ? '⭐ ' : ''}{r.name}
                 </option>
              ))}
            </optgroup>
            <optgroup label="Watering Hole · Filter">
              {externalRecipes.filter(r => r.method === 'Filter').map(r => (
                <option key={`external:${r.id}`} value={`external:${r.id}`}>
                  {r.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Watering Hole · Espresso">
              {externalRecipes.filter(r => r.method === 'Espresso').map(r => (
                <option key={`external:${r.id}`} value={`external:${r.id}`}>
                  {r.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Watering Hole · Tap-water proxy">
              {externalRecipes.filter(r => r.method.includes('tap-water')).map(r => (
                <option key={`external:${r.id}`} value={`external:${r.id}`}>
                  {r.name}
                </option>
              ))}
            </optgroup>
             </select>
             </div>
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200 transition hover:border-amber-300/45 hover:bg-amber-500/20 hover:text-amber-100"
                title="Reset all inputs to defaults"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
           </div>
          {!editing ? (
            <button
              type="button"
              onClick={startEditing}
              className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] text-white transition hover:bg-sky-500"
            >
              <Plus className="w-3.5 h-3.5" />
              Add new
            </button>
          ) : (
             <div className="flex items-center gap-2">
               <button
                 type="button"
                 onClick={() => setNaming(true)}
                 className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] text-white transition hover:bg-emerald-500"
               >
                 <Save className="w-3.5 h-3.5" />
                 Save
               </button>
               <button
                 type="button"
                 onClick={cancelEditing}
                 className="flex items-center gap-1.5 rounded-lg border border-slate-600/60 bg-slate-700/50 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:bg-slate-700/80 hover:text-white"
               >
                 <X className="w-3.5 h-3.5" />
                 Cancel
               </button>
             </div>
          )}
        </div>
      </div>

      {/* Ion cards */}
      <div className="app-card-body grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ACTIVE_ION_IDS.map((id, idx) => {
          const ion = ION_MAP[id];
          const ppm = ions[id] ?? 0;
          const target = editing
            ? parseFloat(draftTargets[id] ?? '0')
            : (targetIons[id] ?? 0);
          const gap = Math.max(target - ppm, 0);
          const aboveTarget = ppm > target + 0.05;
          const tooltipAbove = idx >= Math.ceil(ACTIVE_ION_IDS.length / 2);

          return (
            <div
              key={id}
              className={`group/ion relative rounded-xl border px-4 py-3 ${aboveTarget ? 'border-amber-500/40 bg-amber-500/10' : 'border-emerald-500/40 bg-emerald-500/10'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-200 cursor-help">{ion.name}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${aboveTarget ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-lg font-bold ${aboveTarget ? 'text-amber-300' : 'text-emerald-300'}`}>{ppm.toFixed(1)}</span>
                <span className="text-xs text-slate-400">ppm</span>
              </div>
              {editing ? (
                <div className="mt-1.5">
                  <label className="text-[10px] text-slate-500 block mb-0.5">Ceiling</label>
                  <input
                    type="number"
                    value={draftTargets[id] ?? '0'}
                    onChange={e => updateDraft(id, e.target.value)}
                    min="0"
                    step="0.1"
                    className="w-full bg-slate-900/60 border border-indigo-500/40 rounded-lg px-2 py-1 text-sm text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              ) : (
                <>
                  <div className={`text-xs ${aboveTarget ? 'text-amber-300' : 'text-emerald-300'} mt-0.5`}>
                    Ceiling: {target.toFixed(1)} ppm
                  </div>
                  <div className="mt-1 text-[10px] text-slate-500">
                    {gap > 0.05 ? `${gap.toFixed(1)} ppm still needed` : 'Target covered'}
                  </div>
                </>
              )}
              <span className={`pointer-events-none absolute left-0 w-56 z-10 rounded-lg bg-slate-900 border border-slate-600/60 px-3 py-2 text-xs text-slate-300 opacity-0 group-hover/ion:opacity-100 transition-opacity shadow-xl ${tooltipAbove ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                {ion.tasteNote}
              </span>
            </div>
          );
        })}
        {(() => {
          const lactatePpm = supplementalIons.lactate ?? 0;
          return lactatePpm > 0 && (
          <div
            key="supplemental-lactate"
            className="group/ion relative rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-3"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="cursor-help text-sm font-medium text-slate-200">
                {SUPPLEMENTAL_ION_MAP.lactate.name}
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-violet-300">
                {lactatePpm.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">ppm</span>
            </div>
            <div className="mt-0.5 text-[10px] text-violet-200/70">
              {SUPPLEMENTAL_ION_MAP.lactate.formula}
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              From Calcium Lactate · display only
            </div>
            <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-56 rounded-lg border border-slate-600/60 bg-slate-900 px-3 py-2 text-xs text-slate-300 opacity-0 shadow-xl transition-opacity group-hover/ion:opacity-100">
              {SUPPLEMENTAL_ION_MAP.lactate.note}
            </span>
          </div>
          );
        })()}
      </div>

      {/* Naming dialog */}
      {editing && naming && (
        <div className="border-t border-indigo-400/10 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Name your profile"
              autoFocus
              className="flex-1 bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition"
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') cancelEditing();
              }}
            />
            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="flex items-center justify-center w-9 h-9 text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={cancelEditing}
              className="flex items-center justify-center w-9 h-9 text-slate-400 bg-slate-700/40 border border-slate-600/40 rounded-lg hover:bg-slate-700/60 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WatermancerIonCoverageBars({
  actualIons,
  supplementalIons,
  targetIons,
  targetLabel,
  sticky,
  onToggleSticky,
}: {
  actualIons: Partial<Record<IonId, number>>;
  supplementalIons: Partial<Record<SupplementalIonId, number>>;
  targetIons: Partial<Record<IonId, number>>;
  targetLabel: string;
  sticky: boolean;
  onToggleSticky: () => void;
}) {
  return (
    <div
      className={`${sticky
        ? 'fixed inset-x-3 top-3 sm:left-1/2 sm:right-auto sm:w-[calc(100%-3rem)] sm:max-w-5xl sm:-translate-x-1/2'
        : 'relative'} app-card z-50 flex flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-900/95 shadow-2xl shadow-slate-950/40 backdrop-blur-md`}
    >
      <div className="app-section-header flex shrink-0 items-center justify-between gap-3 border-b border-cyan-400/15 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent px-4 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-100">
               Closest match result
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
               Final mineral contribution from the closest Watermancer match.
            </p>
          </div>
          <span className="text-right text-[10px] uppercase tracking-wider text-slate-500">
            {targetLabel} ion targets
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleSticky}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${
            sticky
              ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/65 hover:bg-emerald-500/20'
              : 'border-cyan-300/25 bg-slate-950/30 text-cyan-100 hover:border-cyan-300/55 hover:bg-cyan-500/10'
          }`}
          aria-pressed={sticky}
           aria-label={sticky ? 'Stop following the automatic match result' : 'Keep the automatic match result visible while scrolling'}
          title={sticky ? 'Stop following while scrolling' : 'Keep visible while scrolling'}
        >
          {sticky ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">{sticky ? 'Following screen' : 'Follow screen'}</span>
        </button>
      </div>
      <div className="app-card-body min-h-0 flex-1 space-y-3 overflow-y-auto">
        {ACTIVE_ION_IDS.map(id => {
          const ion = ION_MAP[id];
          const actual = actualIons[id] ?? 0;
          const target = Math.max(targetIons[id] ?? 0, 0);
          const tolerance = 0.05;
          const overshoot = target > 0
            ? actual > target + tolerance
            : actual > tolerance;
          const covered = target > 0 && actual >= target - tolerance;
          const percentage = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
          const coveragePercent = target > 0 ? (actual / target) * 100 : null;
          const coverageLabel = coveragePercent === null
            ? '—'
            : `${Math.round(coveragePercent).toLocaleString()}%`;
          const barColor = overshoot
            ? 'bg-rose-400'
            : covered
              ? 'bg-emerald-400'
              : actual > 0
                ? 'bg-cyan-400'
                : 'bg-slate-700';
          const valueColor = overshoot
            ? 'text-rose-300'
            : covered
              ? 'text-emerald-300'
              : actual > 0
                ? 'text-cyan-300'
                : 'text-slate-500';
          const status = target <= 0
            ? actual > tolerance ? 'above target' : 'no target set'
            : overshoot
              ? `${formatLiveIonPpm(actual - target)} ppm above target`
              : covered
                ? `${formatLiveIonPpm(actual)} ppm — target reached`
                : `${formatLiveIonPpm(actual)} ppm of ${formatLiveIonPpm(target)} ppm covered`;

          return (
            <div key={id} className="grid grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center gap-x-3 gap-y-1 sm:grid-cols-[6rem_minmax(0,1fr)_6.5rem]">
              <span className="truncate text-xs text-slate-300" title={ion.name}>{ion.name}</span>
              <div className="min-w-0">
                <div
                  className="relative h-4 overflow-hidden rounded-full bg-slate-700/70"
                  aria-label={coveragePercent === null
                    ? `${ion.name}: no target set`
                    : `${ion.name}: ${coverageLabel} of target`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                    style={{ width: `${percentage}%` }}
                  />
                  <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums leading-none ${
                    covered || overshoot ? 'text-slate-950/80' : 'text-slate-300'
                  }`}>
                    {coverageLabel}
                  </span>
                </div>
                <div className={`mt-1 text-[10px] ${valueColor}`}>
                  {status}
                </div>
              </div>
              <span className={`text-right text-xs font-semibold tabular-nums ${valueColor}`}>
                {formatLiveIonPpm(actual)}
                <span className="font-normal text-slate-500"> / {formatLiveIonPpm(target)}</span>
              </span>
            </div>
          );
        })}
        {(() => {
          const lactatePpm = supplementalIons.lactate ?? 0;
          if (lactatePpm <= 0) return null;
          return (
            <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center gap-x-3 gap-y-1 sm:grid-cols-[6rem_minmax(0,1fr)_6.5rem]">
              <span className="truncate text-xs text-violet-200" title="Lactate">Lactate</span>
              <div className="min-w-0">
                <div
                  className="relative h-4 overflow-hidden rounded-full bg-slate-700/70"
                  aria-label={`Lactate: ${formatLiveIonPpm(lactatePpm)} ppm, display only`}
                >
                  <div
                    className="h-full rounded-full bg-violet-400/80 transition-all duration-300"
                    style={{ width: '100%' }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold leading-none text-slate-950/80">
                    display only
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-violet-200">
                  {formatLiveIonPpm(lactatePpm)} ppm · no target set
                </div>
              </div>
              <span className="text-right text-xs font-semibold tabular-nums text-violet-200">
                {formatLiveIonPpm(lactatePpm)}
                <span className="font-normal text-slate-500"> ppm</span>
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, after }: { icon: React.ReactNode; title: string; after?: React.ReactNode }) {
  return (
    <div className="app-section-header flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 border-b border-slate-700/40 text-slate-300">
      <div className="app-section-header__title flex min-w-0 items-center gap-2">
        {icon}
        <h2 className="truncate text-sm font-semibold uppercase tracking-wider">{title}</h2>
      </div>
      {after && <div className="app-section-header__after flex max-w-full flex-wrap items-center justify-end gap-2">{after}</div>}
    </div>
  );
}

function HardnessBalanceScale({ gh, kh }: { gh: number; kh: number }) {
  const totalHardness = gh + kh;
  const khShare = totalHardness > 0 ? kh / totalHardness : 0.4;
  const angle = Math.max(-12, Math.min(12, (khShare - 0.4) * 45));
  const balanceLabel = angle < -1
    ? 'GH-heavy balance, tipped left'
    : angle > 1
      ? 'KH-heavy balance, tipped right'
      : 'Balanced around a 60% GH and 40% KH mix';

  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center text-indigo-300"
      title={balanceLabel}
      aria-label={balanceLabel}
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
        <path d="M10 5.5v10" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        <path d="M7.25 17h5.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        <path
          d="M10 15.5 8.2 17.8h3.6L10 15.5Z"
          fill="currentColor"
          fillOpacity="0.28"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />
        <g
          style={{
            transformOrigin: '10px 5px',
            transform: `rotate(${angle}deg)`,
            transition: 'transform 500ms ease-out',
          }}
        >
          <path d="M3 5h14" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M3.8 5.5 2.4 10.5M16.2 5.5l1.4 5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          <path d="M1.4 10.5h3.2M15.4 10.5h3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M1.4 10.5c.35 1.25 1.05 1.8 1.6 1.8s1.25-.55 1.6-1.8M15.4 10.5c.35 1.25 1.05 1.8 1.6 1.8s1.25-.55 1.6-1.8" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round" />
        </g>
        <circle cx="10" cy="5" r="1.35" fill="currentColor" />
      </svg>
    </span>
  );
}

function MineralWaterBeaker({ active }: { active: boolean }) {
  return (
    <span
      className={`mineral-water-beaker inline-flex h-4 w-4 items-center justify-center ${active ? 'is-active' : ''}`}
      title={active ? 'Mineral water is contributing to this recipe' : 'No mineral water added yet'}
      aria-label={active ? 'Mineral water is contributing to this recipe' : 'No mineral water added yet'}
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
        <path d="M7 2.5h6M8 2.5v3.1L4.5 14a2.5 2.5 0 0 0 2.25 3.5h6.5A2.5 2.5 0 0 0 15.5 14L12 5.6V2.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.55 12.25h8.9l1.05 2.1a2.15 2.15 0 0 1-1.93 3.15H6.43A2.15 2.15 0 0 1 4.5 14.35l1.05-2.1Z" fill="currentColor" fillOpacity={active ? 0.26 : 0.08} />
        <path className="mineral-water-liquid" d="M5.7 12.35c1.2-.65 2.1.65 3.25 0s2.05.65 3.25 0 2.05.65 3.15 0l.85 1.9a2.05 2.05 0 0 1-1.85 3H6.65a2.05 2.05 0 0 1-1.85-3l.9-1.9Z" fill="currentColor" fillOpacity={active ? 0.55 : 0.16} />
        <path d="M5.7 12.35c1.2-.65 2.1.65 3.25 0s2.05.65 3.25 0 2.05.65 3.15 0" stroke="currentColor" strokeOpacity={active ? 0.9 : 0.35} strokeWidth="0.85" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function PouringCarafeIcon() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center text-sky-300" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 scale-[1.3] -rotate-[18deg]">
        <path
          d="M4.1 6.5 2.2 4.8c-.35-.32-.16-.9.31-.95l4.02-.43"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 5.6h4.15l2.3 9.3H5.35L7 5.6Z"
          fill="currentColor"
          fillOpacity="0.18"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <path d="M7.35 5.6V3.1h3.25v2.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M11.4 7.4c2.75-.65 4.55.7 4.55 2.8 0 1.35-.75 2.45-1.95 2.95"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
        />
        <path d="M5.7 11.2h6.95" stroke="currentColor" strokeOpacity="0.8" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M2.15 3.35 1.25 2.55" stroke="currentColor" strokeOpacity="0.65" strokeWidth="0.9" strokeLinecap="round" />
        <path d="M1.25 4.7 0.15 4.6" stroke="currentColor" strokeOpacity="0.65" strokeWidth="0.9" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function SaltSieveIcon() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center text-cyan-300" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <path
          d="M2.1 8.6C4.9 5.5 7.55 2.45 10 2.45s5.1 3.05 7.9 6.15c-2.65 2.25-5.25 3.35-7.9 3.35S4.75 10.85 2.1 8.6Z"
          fill="currentColor"
          fillOpacity="0.1"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="6.1" cy="7.7" r="0.75" fill="currentColor" />
        <circle cx="8.6" cy="5.7" r="0.75" fill="currentColor" />
        <circle cx="11.6" cy="5.65" r="0.75" fill="currentColor" />
        <circle cx="14.1" cy="7.55" r="0.75" fill="currentColor" />
        <circle cx="8.15" cy="8.65" r="0.7" fill="currentColor" />
        <circle cx="10.45" cy="7.9" r="0.7" fill="currentColor" />
        <circle cx="12.15" cy="9.15" r="0.7" fill="currentColor" />
        <circle cx="4.2" cy="12.75" r="0.65" fill="currentColor" />
        <circle cx="6.55" cy="14.55" r="0.7" fill="currentColor" />
        <circle cx="8.95" cy="13.1" r="0.55" fill="currentColor" />
      </svg>
    </span>
  );
}

function BrewerDropperCalibrationCard({
  dropsPerMl,
  onCalibrate,
}: {
  dropsPerMl: number;
  onCalibrate: (value: number) => void;
}) {
  const [dropCount, setDropCount] = useState('20');
  const [measuredVolume, setMeasuredVolume] = useState('1');
  const [stockConcentration, setStockConcentration] = useState('50');
  const [doseDrops, setDoseDrops] = useState('20');
  const [doseVolumeLiters, setDoseVolumeLiters] = useState('1');
  const [acknowledged, setAcknowledged] = useState(() => loadDropperCalibrationAcknowledged());
  const [collapsed, setCollapsed] = useState(false);
  const parsedDrops = Number(dropCount);
  const parsedVolume = Number(measuredVolume);
  const measuredDropsPerMl = parsedDrops > 0 && parsedVolume > 0
    ? parsedDrops / parsedVolume
    : 0;
  const canCalibrate = Number.isFinite(measuredDropsPerMl) && measuredDropsPerMl > 0;
  const effectiveDropsPerMl = canCalibrate ? measuredDropsPerMl : dropsPerMl;
  const stockMgPerMl = Number(stockConcentration);
  const finalDoseDrops = Number(doseDrops);
  const finalVolumeLiters = Number(doseVolumeLiters);
  const mgPerDrop = stockMgPerMl > 0 && effectiveDropsPerMl > 0
    ? stockMgPerMl / effectiveDropsPerMl
    : 0;
  const resultingMgPerLiter = mgPerDrop > 0 && finalDoseDrops > 0 && finalVolumeLiters > 0
    ? (finalDoseDrops * mgPerDrop) / finalVolumeLiters
    : 0;
  const acknowledge = () => {
    if (acknowledged) return;
    setAcknowledged(true);
    try {
      localStorage.setItem(DROPPER_CALIBRATION_ACKNOWLEDGED_KEY, 'true');
    } catch {
      // The calibration still works if local storage is unavailable.
    }
  };

  return (
    <div
      className={`dropper-calibration-card overflow-hidden rounded-2xl border border-sky-400/25 bg-slate-800/75 shadow-xl backdrop-blur ${!acknowledged ? 'dropper-calibration-card--attention' : ''}`}
      onPointerDownCapture={acknowledge}
      onClickCapture={acknowledge}
    >
      <button
        type="button"
        onClick={() => {
          acknowledge();
          if (collapsed) setCollapsed(false);
        }}
        className="flex w-full items-start gap-3 border-b border-sky-400/15 bg-gradient-to-r from-sky-500/10 via-cyan-500/[0.04] to-transparent px-4 py-3 text-left sm:px-6"
        aria-label="Acknowledge dropper calibration"
        aria-expanded={!collapsed}
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-300/30 bg-sky-400/10 text-sky-200">
          <FlaskConical className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-sky-100">Calibrate dropper</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {collapsed
              ? `${dropsPerMl.toFixed(1)} drops/mL · Click to review calibration`
              : 'Turn drops into a reliable mg/L dose for your brew water.'}
          </p>
        </div>
      </button>
      {!collapsed && <div className="space-y-3 px-4 py-4 sm:px-6">
        <div className="rounded-xl border border-sky-400/20 bg-sky-500/[0.06] px-3 py-3 text-[11px] leading-relaxed text-slate-300">
          <div className="font-semibold text-sky-200">Measure once, dose with confidence</div>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-slate-400">
            <li>Shake the stock bottle, then fill the dropper the same way you normally do.</li>
            <li>Dispense a known number of drops into a 1 mL syringe or graduated cylinder.</li>
            <li>Enter the measurement below. Then use the dose converter to see drops → mg/L.</li>
          </ol>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Drops dispensed</span>
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={dropCount}
              onChange={event => setDropCount(event.target.value)}
              className="mt-1 w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
              aria-label="Number of drops dispensed"
            />
          </label>
          <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Measured volume (mL)</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={measuredVolume}
              onChange={event => setMeasuredVolume(event.target.value)}
              className="mt-1 w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
              aria-label="Measured drop volume in milliliters"
            />
          </label>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Current calibration</div>
            <div className="mt-1 text-sm font-semibold text-cyan-200">
              {dropsPerMl.toFixed(1)} drops/mL
              <span className="ml-2 text-[10px] font-normal text-slate-500">({(1 / dropsPerMl).toFixed(3)} mL/drop)</span>
            </div>
            {canCalibrate && (
              <div className="mt-1 text-[10px] text-slate-500">
                New result: {measuredDropsPerMl.toFixed(1)} drops/mL
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onCalibrate(measuredDropsPerMl);
              setCollapsed(true);
            }}
            disabled={!canCalibrate}
             className="group flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-300/45 bg-cyan-500/15 px-3.5 py-2.5 text-xs font-semibold text-cyan-50 transition hover:border-cyan-200/70 hover:bg-cyan-500/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
             <Check className="h-3.5 w-3.5 transition-transform group-hover:scale-105" />
             <span>Use this calibration</span>
          </button>
        </div>
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/[0.05] px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200">Drops → mg/L converter</div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            Enter the salt concentration in the stock and the final brew volume. This shows exactly what a number of drops contributes.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <label className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2">
              <span className="block text-[10px] text-slate-500">Stock concentration (mg/mL)</span>
              <input
                type="number"
                min="0.01"
                step="0.1"
                inputMode="decimal"
                value={stockConcentration}
                onChange={event => setStockConcentration(event.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-semibold tabular-nums text-slate-100 outline-none"
                aria-label="Stock concentration in milligrams per milliliter"
              />
            </label>
            <label className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2">
              <span className="block text-[10px] text-slate-500">Drops</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={doseDrops}
                onChange={event => setDoseDrops(event.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-semibold tabular-nums text-slate-100 outline-none"
                aria-label="Number of drops to convert"
              />
            </label>
            <label className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2">
              <span className="block text-[10px] text-slate-500">Final water (L)</span>
              <input
                type="number"
                min="0.01"
                step="0.1"
                inputMode="decimal"
                value={doseVolumeLiters}
                onChange={event => setDoseVolumeLiters(event.target.value)}
                className="mt-1 w-full bg-transparent text-sm font-semibold tabular-nums text-slate-100 outline-none"
                aria-label="Final water volume in liters"
              />
            </label>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2">
            <span className="text-[11px] text-slate-400">
              {finalDoseDrops || 0} drops × {mgPerDrop > 0 ? mgPerDrop.toFixed(2) : '—'} mg/drop
            </span>
            <strong className="text-base tabular-nums text-cyan-200">
              {resultingMgPerLiter > 0 ? `${resultingMgPerLiter.toFixed(2)} mg/L` : '—'}
            </strong>
          </div>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">
          The default stock is 50 mg/mL (a 5% solution). Change it when a stock has a different concentration. Recheck if you change droppers or technique.
        </p>
      </div>}
    </div>
  );
}

function BrewerSimpleRecipeCard({
  recipeHandoffToken,
  guideRecipe,
  saltTargets,
  recipeRows,
  liters,
  volumeInput,
  onVolumeChange,
  concentrateOn,
  concentrateLiters,
  concentrateStrength,
  dropsPerMl,
  onOpenSteps,
}: {
  recipeHandoffToken: number;
  guideRecipe: Week1Recipe | null;
  saltTargets: Record<string, number>;
  recipeRows: SaltRow[];
  liters: number;
  volumeInput: string;
  onVolumeChange: (value: string) => void;
  concentrateOn: boolean;
  concentrateLiters: number;
  concentrateStrength: number;
  dropsPerMl: number;
  onOpenSteps: (method: 'dry' | 'dropper') => void;
}) {
  const UNIVERSAL_STOCK_PERCENT = 5;
  const UNIVERSAL_STOCK_MG_PER_ML = UNIVERSAL_STOCK_PERCENT * 10;
  const UNIVERSAL_STOCK_MG_PER_DROP = UNIVERSAL_STOCK_MG_PER_ML / dropsPerMl;
  type BrewerPrepMethod = 'dry' | 'dropper';
  const [prepMethod, setPrepMethod] = useState<BrewerPrepMethod>('dropper');
  const [stocksReady, setStocksReady] = useState(false);
  const [makeWaterOpen, setMakeWaterOpen] = useState(false);
  const [makeWaterStage, setMakeWaterStage] = useState<'choice' | 'prep' | 'dose'>('choice');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [pantryBottleMl, setPantryBottleMl] = useState('60');
  const [pantryCustomMl, setPantryCustomMl] = useState('150');
  const [calciumAvailable, setCalciumAvailable] = useState(true);
  const guideSaltLabels: Record<string, string> = {
    mgso4: 'Epsom salt',
    mgcl2: 'Magnesium chloride',
    cacl2: 'Calcium chloride',
    nahco3: 'Sodium bicarbonate',
    khco3: 'Potassium bicarbonate',
    nacl: 'Sodium chloride',
  };
  const simpleSalts = [
    { id: 'mgso4', label: 'Epsom salt', note: 'brightness & fruit' },
    { id: 'nahco3', label: guideRecipe ? guideSaltLabels.nahco3 : 'Baking soda', note: 'softens acidity' },
    { id: 'nacl', label: guideRecipe ? guideSaltLabels.nacl : 'Table salt', note: 'sweetness & balance' },
    { id: 'kcl', label: 'Potassium chloride', note: 'potassium & structure' },
  ];
  const calciumTarget = saltTargets.cacl2 ?? 0;
  const effectiveSaltTargets = (() => {
    if (calciumAvailable || calciumTarget <= 0.05) return saltTargets;

    const calciumSalt = SALTS.find(salt => salt.id === 'cacl2');
    const epsomSalt = SALTS.find(salt => salt.id === 'mgso4');
    const calciumFraction = calciumSalt?.ions.find(ion => ion.ionId === 'calcium')?.fraction ?? 0;
    const magnesiumFraction = epsomSalt?.ions.find(ion => ion.ionId === 'magnesium')?.fraction ?? 0;
    const calciumHardness = calciumTarget * calciumFraction * (CACO3_FACTOR.calcium ?? 0);
    const epsomTargetForSameGh = magnesiumFraction > 0
      ? calciumHardness / ((CACO3_FACTOR.magnesium ?? 0) * magnesiumFraction)
      : 0;

    return {
      ...saltTargets,
      mgso4: (saltTargets.mgso4 ?? 0) + epsomTargetForSameGh,
      cacl2: 0,
    };
  })();
  if (calciumTarget > 0.05) {
    simpleSalts.push({ id: 'cacl2', label: guideRecipe ? guideSaltLabels.cacl2 : 'Calcium chloride', note: 'optional extra body' });
  }
  const guideOnlySalts = [
    { id: 'mgcl2', label: guideSaltLabels.mgcl2, note: 'magnesium & structure' },
    { id: 'khco3', label: guideSaltLabels.khco3, note: 'alternate buffer' },
  ];

  const getMassLabel = (id: string) => {
    const salt = SALTS.find(item => item.id === id);
    const target = effectiveSaltTargets[id] ?? 0;
    if (!salt || target <= 0 || liters <= 0) return '—';
    const saltIndex = SALTS.findIndex(item => item.id === id);
    const formIndex = saltIndex >= 0
      ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
      : salt.defaultFormIdx ?? 0;
    const form = salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
    const mass = concentrateOn && concentrateLiters > 0
      ? computeSaltMg(target, concentrateLiters, form.molarMass, salt.anhydrousMass) * concentrateStrength
      : computeSaltMg(target, liters, form.molarMass, salt.anhydrousMass);
    return mass >= 1000 ? `${(mass / 1000).toFixed(2)} g` : `${mass.toFixed(2)} mg`;
  };
  const getUniversalDrops = (id: string) => {
    const target = effectiveSaltTargets[id] ?? 0;
    if (target <= 0 || liters <= 0) return 0;
    const salt = SALTS.find(item => item.id === id);
    if (!salt) return 0;
    const saltIndex = SALTS.findIndex(item => item.id === id);
    const formIndex = saltIndex >= 0
      ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
      : salt.defaultFormIdx ?? 0;
    const form = salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
    const physicalSaltMg = computeSaltMg(target, liters, form.molarMass, salt.anhydrousMass);
    return Math.max(1, Math.round(physicalSaltMg / UNIVERSAL_STOCK_MG_PER_DROP));
  };
  const universalStockMassLabel = () => {
    const mass = Math.max(0, num(pantryBottleMl)) * UNIVERSAL_STOCK_MG_PER_ML / 1000;
    return mass >= 1000 ? `${(mass / 1000).toFixed(2)} kg` : `${mass.toFixed(1)} g`;
  };
  const universalStockMassPerMlLabel = (saltLabel: string) =>
    `1 mL = ${UNIVERSAL_STOCK_MG_PER_ML.toFixed(0)} mg ${saltLabel}`;
  const activeSimpleSalts = simpleSalts.filter(salt => (effectiveSaltTargets[salt.id] ?? 0) > 0);
  const activeGuideOnlySalts = guideRecipe
    ? guideOnlySalts.filter(salt => (effectiveSaltTargets[salt.id] ?? 0) > 0)
    : [];
  const pantrySalts = [
    { id: 'mgso4', label: 'Epsom salt', note: 'brightness & fruit' },
    { id: 'nahco3', label: guideRecipe ? guideSaltLabels.nahco3 : 'Baking soda', note: 'buffer & sweetness' },
    { id: 'nacl', label: guideRecipe ? guideSaltLabels.nacl : 'Table salt', note: 'roundness & balance' },
    { id: 'kcl', label: 'Potassium chloride', note: 'potassium & structure' },
    { id: 'cacl2', label: guideRecipe ? guideSaltLabels.cacl2 : 'Calcium chloride', note: 'body & structure' },
  ];
  const recipeSalts = [...activeSimpleSalts, ...activeGuideOnlySalts]
    .filter(salt => calciumAvailable || salt.id !== 'cacl2');
  const visiblePantrySalts = guideRecipe
    ? [...pantrySalts, ...guideOnlySalts]
      .filter(salt => (effectiveSaltTargets[salt.id] ?? 0) > 0)
    : pantrySalts;
  const completedRecipeSaltCount = recipeSalts.filter(salt => completedSteps[salt.id]).length;
  const waterReady = recipeSalts.length > 0
    && completedRecipeSaltCount === recipeSalts.length
    && (prepMethod !== 'dropper' || stocksReady);
  const triggerChecklistAttention = () => {
    setMakeWaterChecklistFlash(false);
    window.requestAnimationFrame(() => setMakeWaterChecklistFlash(true));
    window.setTimeout(() => setMakeWaterChecklistFlash(false), 1200);
  };
  const openMakeWaterChecklist = () => {
    setMakeWaterAttention(false);
    setCompletedSteps({});
    setMakeWaterOpen(true);
    setMakeWaterStage(prepMethod === 'dropper' && !stocksReady ? 'choice' : 'dose');
    triggerChecklistAttention();
  };
  const [makeWaterAttention, setMakeWaterAttention] = useState(false);
  const [makeWaterChecklistFlash, setMakeWaterChecklistFlash] = useState(false);

  useEffect(() => {
    if (recipeHandoffToken === 0) return;
    const recipeCard = document.getElementById('brewer-mineral-recipe');
    if (!recipeCard) return;
    recipeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setMakeWaterAttention(true);
  }, [recipeHandoffToken]);

  return (
    <div className="border-b border-slate-700/40 bg-emerald-500/5 px-4 py-4 sm:px-6">
      <div className="rounded-xl border border-sky-400/20 bg-slate-900/30 p-2">
        <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
          Choose how you’ll measure minerals
        </div>
        <div role="tablist" aria-label="Recipe dosing method" className="grid gap-1 sm:grid-cols-2">
          {([
            ['dry', 'Weigh dry salts', 'Weigh the recipe on a scale'],
            ['dropper', 'Use concentrate drops', 'Make stocks once, then dose by drops'],
          ] as const).map(([method, label, description]) => (
            <button
              key={method}
              type="button"
              role="tab"
              aria-selected={prepMethod === method}
              onClick={() => {
                setPrepMethod(method);
                if (method === 'dry' && makeWaterOpen) setMakeWaterStage('dose');
                if (method === 'dropper' && makeWaterOpen && !stocksReady) setMakeWaterStage('choice');
              }}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                prepMethod === method
                  ? 'border-sky-400/50 bg-sky-500/15 text-sky-100 shadow-sm'
                  : 'border-transparent text-slate-400 hover:border-slate-600/60 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-semibold">{label}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">{description}</div>
            </button>
          ))}
        </div>
      </div>
      <div id="brewer-mineral-recipe" className="mt-3 scroll-mt-6 rounded-2xl border border-emerald-300/35 bg-gradient-to-br from-emerald-500/15 via-slate-900/25 to-violet-500/10 p-4 shadow-[0_0_30px_-10px_rgba(52,211,153,0.55)] ring-1 ring-emerald-300/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Your mineral recipe
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {liters || 1} L batch · RO / distilled 0 TDS · {prepMethod === 'dropper' ? 'Concentrate drops' : 'Weighed salts'}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <span className="sr-only">Batch volume</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={volumeInput}
              onChange={event => onVolumeChange(event.target.value)}
              placeholder="1"
              className="w-20 rounded-lg border border-slate-600/60 bg-slate-900/60 px-2.5 py-1.5 text-right text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              aria-label="Final batch volume in liters"
            />
            <span>liters</span>
          </label>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
            Live result
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {recipeSalts.map(salt => (
            <div key={`cockpit-${salt.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/25 px-3 py-2.5">
              <span className="text-xs font-medium text-slate-200">
                {prepMethod === 'dropper' ? `${salt.label} stock` : salt.label}
              </span>
              <span className={`shrink-0 font-mono text-sm font-semibold ${prepMethod === 'dropper' ? 'text-violet-200' : 'text-emerald-200'}`}>
                {prepMethod === 'dropper' ? `${getUniversalDrops(salt.id)} drops` : getMassLabel(salt.id)}
              </span>
            </div>
          ))}
        </div>
        {!calciumAvailable && calciumTarget > 0.05 && (
          <p className="mt-2 text-[10px] text-amber-200/75">
            Calcium chloride skipped — Epsom is increased to preserve GH, with a more magnesium-forward balance.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={openMakeWaterChecklist}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-400/20 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/30 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-[0.99] ${
              makeWaterAttention
                ? 'brewer-make-water-attention ring-4 ring-emerald-200/80 shadow-[0_0_32px_rgba(110,231,183,0.75)]'
                : ''
            }`}
          >
            <Check className="h-4 w-4" />
            Make this water
          </button>
          <button
            type="button"
            onClick={() => onOpenSteps(prepMethod)}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-600/60 bg-slate-800/50 px-4 py-3 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-700/60 hover:text-slate-100"
            title="View step-by-step recipe instructions"
          >
            <ListChecks className="h-4 w-4" />
            Recipe steps
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Make this water opens a quick dosing checklist. Start with RO / distilled 0 TDS water.
        </p>
      </div>
      {makeWaterOpen && (
        <div className={`mt-3 rounded-xl border border-emerald-400/25 bg-slate-950/25 p-3 ${
          makeWaterChecklistFlash ? 'brewer-make-water-checklist-flash' : ''
        }`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                {waterReady
                  ? 'Water ready — let’s brew'
                  : makeWaterStage === 'choice'
                    ? 'One quick question'
                    : makeWaterStage === 'prep'
                      ? 'Build your pantry once'
                      : prepMethod === 'dry'
                        ? 'Add your salts'
                        : 'Add your drops'}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {waterReady
                  ? 'Everything is in. Your water is ready for brewing.'
                  : makeWaterStage === 'choice'
                    ? 'These reusable bottles work for every recipe you make here.'
                    : makeWaterStage === 'prep'
                      ? 'Use the same simple recipe for each bottle, then come back to dose your water.'
                      : prepMethod === 'dry'
                        ? 'Check off each salt as you add it to your measured water.'
                        : 'Check off each stock as you add it to your measured water.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMakeWaterOpen(false)}
              className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
            >
              Hide
            </button>
          </div>
          {makeWaterStage === 'choice' && prepMethod === 'dropper' && !stocksReady && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setStocksReady(true);
                  setMakeWaterStage('dose');
                }}
                className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3 text-left transition hover:bg-emerald-500/20"
              >
                <div className="text-xs font-semibold text-emerald-100">I already have them</div>
                <div className="mt-1 text-[10px] text-slate-400">Go straight to this recipe.</div>
              </button>
              <button
                type="button"
                onClick={() => setMakeWaterStage('prep')}
                className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-3 text-left transition hover:bg-violet-500/20"
              >
                <div className="text-xs font-semibold text-violet-100">Help me make them</div>
                <div className="mt-1 text-[10px] text-slate-400">One 5-minute pantry setup.</div>
              </button>
            </div>
          )}
          {makeWaterStage === 'prep' && prepMethod === 'dropper' && (
            <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-950/20 px-3 py-2">
                <span className="text-[11px] text-slate-300">Your bottle size</span>
                <div className="flex gap-1 rounded-lg border border-slate-700/60 bg-slate-900/50 p-1">
                  {['60', '100'].map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setPantryBottleMl(size)}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                        pantryBottleMl === size
                          ? 'bg-violet-400/25 text-violet-100'
                          : 'text-slate-500 hover:text-slate-200'
                      }`}
                    >
                      {size} mL
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPantryBottleMl(pantryCustomMl || '150')}
                    className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                      !['60', '100'].includes(pantryBottleMl)
                        ? 'bg-violet-400/25 text-violet-100'
                        : 'text-slate-500 hover:text-slate-200'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>
              {!['60', '100'].includes(pantryBottleMl) && (
                <label className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-violet-400/20 bg-slate-950/20 px-3 py-2">
                  <span className="text-[11px] text-slate-400">Capacity</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="5000"
                      step="1"
                      value={pantryBottleMl}
                      onChange={event => {
                        setPantryCustomMl(event.target.value);
                        setPantryBottleMl(event.target.value);
                      }}
                      placeholder="150"
                      aria-label="Custom bottle capacity in milliliters"
                      className="w-24 rounded-md border border-violet-400/30 bg-slate-900/70 px-2 py-1 text-right text-xs text-slate-100 placeholder-slate-600 focus:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400/50"
                    />
                    <span className="text-[11px] text-slate-500">mL</span>
                  </div>
                </label>
              )}
              <div className="grid gap-1.5 sm:grid-cols-2">
                {visiblePantrySalts
                  .filter(salt => calciumAvailable || salt.id !== 'cacl2')
                  .map(salt => (
                  <div key={`prep-${salt.id}`} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/25 px-3 py-2">
                    <div className="min-w-0">
                      <span className="block text-xs text-slate-200">{salt.label}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-500">
                        {universalStockMassPerMlLabel(salt.label)}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-violet-200">{universalStockMassLabel()}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                Put <strong className="text-slate-200">{universalStockMassLabel()}</strong> of each listed salt into its own bottle, then fill each to <strong className="text-slate-200">{pantryBottleMl} mL</strong> with distilled or RO water. Cap and shake.
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                 Label each bottle with the salt, {pantryBottleMl} mL, 50 mg of that salt per mL, and the date. For consistent dosing, calibrate your dropper to about {dropsPerMl.toFixed(1)} drops per mL.
              </p>
              {!guideRecipe && calciumTarget > 0.05 && (
                <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-700/50 bg-slate-950/20 px-3 py-2 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={!calciumAvailable}
                    onChange={event => setCalciumAvailable(!event.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-violet-400"
                  />
                  <span>
                    I don’t have calcium chloride 😔
                    <span className="mt-0.5 block text-[10px] text-slate-500">Skip it and make a lighter-bodied version.</span>
                  </span>
                </label>
              )}
              <button
                type="button"
                onClick={() => {
                  setStocksReady(true);
                  setMakeWaterStage('dose');
                }}
                className="mt-3 w-full rounded-xl border border-violet-300/40 bg-violet-400/20 px-3 py-2.5 text-xs font-semibold text-violet-50 transition hover:bg-violet-400/30"
              >
                I’ve prepared my pantry
              </button>
            </div>
          )}
          {makeWaterStage === 'dose' && (stocksReady || prepMethod === 'dry') ? (
            <div className="mt-3 space-y-2">
              {recipeSalts.map(salt => {
                const isComplete = Boolean(completedSteps[salt.id]);
                return (
                  <button
                    key={`checklist-${salt.id}`}
                    type="button"
                    onClick={() => setCompletedSteps(prev => ({ ...prev, [salt.id]: !prev[salt.id] }))}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                      isComplete
                        ? 'border-emerald-400/30 bg-emerald-500/10'
                        : 'border-slate-700/60 bg-slate-900/35 hover:border-emerald-400/30 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        isComplete
                          ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                          : 'border-slate-600 text-transparent'
                      }`}>
                        <Check className="h-3 w-3" />
                      </span>
                      <span className={`text-xs ${isComplete ? 'text-emerald-100 line-through' : 'text-slate-200'}`}>
                        Add {prepMethod === 'dropper' ? `${salt.label} stock` : salt.label}
                      </span>
                    </span>
                    <span className={`text-right font-mono text-xs font-semibold ${isComplete ? 'text-emerald-300' : 'text-violet-200'}`}>
                      {prepMethod === 'dropper' ? (
                        <>
                          <span className="block">{getUniversalDrops(salt.id)} drops</span>
                          <span className="block text-[10px] font-normal text-slate-500">
                            {universalStockMassPerMlLabel(salt.label)}
                          </span>
                        </>
                      ) : getMassLabel(salt.id)}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {waterReady && (
            <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Everything is in for {liters || 1} L — brew away.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BrewerRecipeStepsModal({
  saltTargets,
  recipeRows,
  liters,
  concentrateOn,
  concentrateLiters,
  concentrateStrength,
  baseWaters,
  additionWaters,
  baseWaterScale,
  batchMl,
  saltOnlyIons,
  bottledIons,
  suggestedSaltTargets,
  bicarbonateWaterOvershoot,
  nerdLevel,
  tdsTarget,
  dropsPerMl,
  dosingMethod,
  onClose,
}: {
  saltTargets: Record<string, number>;
  recipeRows: SaltRow[];
  liters: number;
  concentrateOn: boolean;
  concentrateLiters: number;
  concentrateStrength: number;
  baseWaters: MineralWaterEntry[];
  additionWaters: MineralWaterEntry[];
  baseWaterScale: number;
  batchMl: number;
  saltOnlyIons: Record<IonId, number>;
  bottledIons: Record<IonId, number>;
  suggestedSaltTargets: Record<string, number>;
  bicarbonateWaterOvershoot: boolean;
  nerdLevel: NerdLevel;
  tdsTarget: number;
  dropsPerMl: number;
  dosingMethod: 'dry' | 'dropper';
  onClose: () => void;
}) {
  const configuredBaseWaters = baseWaters
    .map(water => ({
      ...water,
      volume: num(water.volumeMl) * baseWaterScale,
    }))
    .filter(water => water.volume > 0);
  const hasBaseWater = configuredBaseWaters.length > 0 && batchMl > 0;
  const configuredAdditionWaters = additionWaters
    .map(water => ({
      ...water,
      volume: num(water.volumeMl) * baseWaterScale,
    }))
    .filter(water => water.volume > 0);
  const recipeSalts = SALTS.filter(salt => (saltTargets[salt.id] ?? 0) > 0);
  const suggestedSalts = SALTS.filter(salt => (suggestedSaltTargets[salt.id] ?? 0) > 0);
  const simpleSaltNames: Record<string, string> = {
    mgso4: 'Epsom salt',
    mgcl2: 'Magnesium chloride',
    mgcit: 'Magnesium citrate',
    cacl2: 'Calcium chloride',
    cacit: 'Calcium citrate',
    nahco3: 'Baking soda',
    khco3: 'Potassium bicarbonate',
    kcl: 'Potassium chloride',
    nacl: 'Table salt',
  };
  const amount = (salt: typeof SALTS[number], targets = saltTargets) => {
    const target = targets[salt.id] ?? 0;
    if (target <= 0) return 'None needed';
    const saltIndex = SALTS.findIndex(item => item.id === salt.id);
    const formIndex = saltIndex >= 0
      ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
      : salt.defaultFormIdx ?? 0;
    const form = salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
    const volume = concentrateOn && concentrateLiters > 0 ? concentrateLiters : liters;
    const mass = computeSaltMg(target, volume || 1, form.molarMass, salt.anhydrousMass)
      * (concentrateOn ? concentrateStrength : 1);
    return mass >= 1000 ? `${(mass / 1000).toFixed(2)} g` : `${mass.toFixed(2)} mg`;
  };
  const amountLabel = (salt: typeof SALTS[number], targets = saltTargets) => {
    const target = targets[salt.id] ?? 0;
    if (target <= 0) return 'None needed';
    if (dosingMethod === 'dry') return amount(salt, targets);
    const saltIndex = SALTS.findIndex(item => item.id === salt.id);
    const formIndex = saltIndex >= 0
      ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
      : salt.defaultFormIdx ?? 0;
    const form = salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
    const physicalSaltMg = computeSaltMg(target, liters || 1, form.molarMass, salt.anhydrousMass);
    const universalStockMgPerDrop = 50 / dropsPerMl;
    const drops = Math.max(1, Math.round(physicalSaltMg / universalStockMgPerDrop));
    return `${drops} drops`;
  };
  const volumeLabel = concentrateOn
    ? `${concentrateLiters || 0} L stock`
    : `${liters || 1} L water`;
  const formatWaterVolume = (volumeMl: number) =>
    volumeMl >= 1000 ? `${(volumeMl / 1000).toFixed(2)} L` : `${volumeMl.toFixed(0)} mL`;
  const remainingWaterMl = Math.max(
    batchMl
      - configuredBaseWaters.reduce((sum, water) => sum + water.volume, 0)
      - configuredAdditionWaters.reduce((sum, water) => sum + water.volume, 0),
    0,
  );
  const bicarbonateTarget = saltOnlyIons.bicarbonate ?? 0;
  const bicarbonateFromWater = bottledIons.bicarbonate ?? 0;
  // Keep salts from the selected recipe visible even when source water covers
  // their remaining dose. Also include salts introduced by an adjusted route
  // (for example, an optional sodium correction) so the instructions never
  // omit a mineral that the active dose map actually requires.
  const stepSalts = SALTS.filter(salt => (
    (saltTargets[salt.id] ?? 0) > 0
    || (suggestedSaltTargets[salt.id] ?? 0) > 0
  ));
  const stepSaltTargets = suggestedSaltTargets;
  const dosedStepSaltCount = stepSalts.filter(salt => (stepSaltTargets[salt.id] ?? 0) > 0).length;
  const orderedRecipeSalts = [
    ...stepSalts.filter(salt => salt.formula.includes('SO₄')),
    ...stepSalts.filter(salt => salt.formula.includes('Cl') && !salt.formula.includes('SO₄')),
    ...stepSalts.filter(salt => salt.formula.includes('HCO₃') || salt.formula.includes('CO₃')),
    ...stepSalts.filter(salt =>
      !salt.formula.includes('SO₄')
      && !salt.formula.includes('Cl')
      && !salt.formula.includes('HCO₃')
      && !salt.formula.includes('CO₃'),
    ),
  ];
  const saltGroup = (salt: typeof SALTS[number]) =>
    salt.formula.includes('SO₄') ? 'Sulfate'
      : salt.formula.includes('Cl') ? 'Chloride'
        : salt.formula.includes('HCO₃') || salt.formula.includes('CO₃') ? 'Bicarbonate / carbonate'
          : 'Other mineral';
  const useMixingVessel = batchMl > 1000 && dosedStepSaltCount > 0;
  const mixingVesselMl = useMixingVessel ? Math.min(500, batchMl) : batchMl;
  const dosingLabel = dosingMethod === 'dry' ? 'Weighed salts' : 'Concentrate drops';
  const recipeCardRef = useRef<HTMLDivElement>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveImageError, setSaveImageError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSaveImage = async () => {
    const source = recipeCardRef.current;
    if (!source || isSavingImage) return;

    setIsSavingImage(true);
    setSaveImageError(false);
    let clone: HTMLDivElement | null = null;
    let imageUrl: string | null = null;
    let svgUrl: string | null = null;
    const downloadUrl = (url: string, filename: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
    };
    const downloadBlob = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      downloadUrl(url, filename);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    try {
      clone = source.cloneNode(true) as HTMLDivElement;
      const copyComputedStyles = (sourceNode: Element, targetNode: Element) => {
        const sourceStyle = window.getComputedStyle(sourceNode);
        const targetStyle = (targetNode as HTMLElement).style;
        for (let index = 0; index < sourceStyle.length; index += 1) {
          const property = sourceStyle.item(index);
          if (property) targetStyle.setProperty(property, sourceStyle.getPropertyValue(property));
        }
        const sourceChildren = Array.from(sourceNode.children);
        const targetChildren = Array.from(targetNode.children);
        sourceChildren.forEach((child, index) => {
          const targetChild = targetChildren[index];
          if (targetChild) copyComputedStyles(child, targetChild);
        });
      };

      document.body.appendChild(clone);
      copyComputedStyles(source, clone);
      clone.style.position = 'fixed';
      clone.style.left = '-100000px';
      clone.style.top = '0';
      clone.style.width = `${Math.ceil(source.getBoundingClientRect().width)}px`;
      clone.style.maxHeight = 'none';
      clone.style.height = 'auto';
      clone.style.overflow = 'visible';
      clone.querySelectorAll<HTMLElement>('[data-recipe-steps-scroll]').forEach(element => {
        element.style.maxHeight = 'none';
        element.style.overflow = 'visible';
        element.style.flex = 'none';
      });
      clone.querySelectorAll('[data-export-ignore]').forEach(element => element.remove());

      const width = Math.ceil(clone.getBoundingClientRect().width);
      const height = Math.ceil(clone.scrollHeight);
      const serialized = new XMLSerializer().serializeToString(clone);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      svgUrl = URL.createObjectURL(svgBlob);
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error('Recipe card image could not be created.'));
          image.src = svgUrl ?? '';
        });

        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable.');
        context.scale(scale, scale);
        context.drawImage(image, 0, 0, width, height);
        const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!png) throw new Error('Recipe card image could not be exported.');

        imageUrl = URL.createObjectURL(png);
        downloadUrl(imageUrl, 'coffee-water-recipe-steps.png');
      } catch {
        // Some browsers block SVG foreignObject rasterization. The SVG itself
        // is still a complete, readable export, so save it instead of failing
        // silently.
        if (!svgUrl) throw new Error('Recipe card SVG could not be exported.');
        downloadUrl(svgUrl, 'coffee-water-recipe-steps.svg');
      }
    } catch {
      try {
        const text = source.innerText.trim();
        if (!text) throw new Error('Recipe steps are empty.');
        downloadBlob(
          new Blob([text], { type: 'text/plain;charset=utf-8' }),
          'coffee-water-recipe-steps.txt',
        );
      } catch {
        setSaveImageError(true);
      }
    } finally {
      clone?.remove();
      if (svgUrl) URL.revokeObjectURL(svgUrl);
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setIsSavingImage(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 backdrop-blur-sm sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={recipeCardRef}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-sky-400/25 bg-slate-800 shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-steps-title"
        aria-describedby="recipe-steps-description"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-700/50 bg-gradient-to-r from-sky-500/15 to-emerald-500/10 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sky-200">
              <ListChecks className="h-5 w-5" />
              <h2 id="recipe-steps-title" className="text-base font-semibold">Your recipe steps</h2>
            </div>
            <p id="recipe-steps-description" className="mt-1 text-xs text-slate-400">A simple guide for the recipe currently selected above.</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium text-slate-300">
              <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2 py-1">{liters || 1} L final batch</span>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1">{dosingLabel}</span>
              <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2 py-1">{orderedRecipeSalts.length} mineral{orderedRecipeSalts.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5" data-export-ignore>
            <button
              type="button"
              onClick={handleSaveImage}
              disabled={isSavingImage}
              className="flex items-center gap-1.5 rounded-lg border border-sky-300/25 bg-sky-400/10 px-2.5 py-1.5 text-[10px] font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-400/20 disabled:cursor-wait disabled:opacity-60"
              title="Download this recipe card as an image"
            >
              <Download className="h-3.5 w-3.5" />
              {isSavingImage ? 'Saving…' : 'Save recipe'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-slate-100" aria-label="Close recipe steps">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" data-recipe-steps-scroll>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="rounded-xl border border-sky-400/20 bg-sky-500/[0.06] px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">Preparation flow</div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Prepare the water, add each mineral in order, then confirm everything is dissolved before brewing.
              </p>
            </div>
            {hasBaseWater && (
              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Minerals still needed</div>
                  <span className="text-[10px] text-emerald-200/70">After starting water</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ACTIVE_ION_IDS.map(id => {
                    const target = saltOnlyIons[id] ?? 0;
                    if (target <= 0) return null;
                    const remaining = Math.max(target - (bottledIons[id] ?? 0), 0);
                    const covered = remaining <= 0.01;
                    const bicarbonateBlocked = id === 'bicarbonate' && bicarbonateWaterOvershoot;
                    return (
                      <div key={id} className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2">
                        <span className="block text-[10px] text-slate-500">{ION_MAP[id].formula}</span>
                        <span className={`text-sm font-semibold tabular-nums ${bicarbonateBlocked ? 'text-rose-300' : covered ? 'text-emerald-300' : 'text-amber-300'}`}>
                          {bicarbonateBlocked
                            ? `Blocked: ${bicarbonateFromWater.toFixed(1)} ppm`
                            : covered ? 'Covered' : `${remaining.toFixed(1)} ppm`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Minerals to add</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {stepSalts.map(salt => {
                    const saltIndex = SALTS.findIndex(item => item.id === salt.id);
                    const formIndex = saltIndex >= 0
                      ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
                      : salt.defaultFormIdx ?? 0;
                    const form = salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
                    return (
                      <div key={salt.id} className="rounded-lg bg-slate-900/45 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-200">
                            {nerdLevel === 'brewer' ? simpleSaltNames[salt.id] ?? salt.name : salt.name}
                          </span>
                           <span className="font-mono text-xs text-emerald-300">{amountLabel(salt, stepSaltTargets)}</span>
                        </div>
                        {nerdLevel !== 'brewer' && (
                          <div className="mt-0.5 text-[11px] text-slate-500">{salt.formula} · {form.label}</div>
              )}
                      </div>
                    );
                  })}
                </div>
                 <div className="mt-3 flex items-center justify-between border-t border-emerald-400/15 pt-3">
                   <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Modeled mineral total</span>
                   <span className="font-mono text-sm font-semibold text-emerald-200">{tdsTarget.toFixed(0)} ppm</span>
                 </div>
              </div>
             )}
            {bicarbonateWaterOvershoot && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-300">Stop before adding bicarbonate</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">
                  The selected source water already exceeds the recipe’s bicarbonate target
                  ({bicarbonateFromWater.toFixed(1)} ppm HCO₃⁻ supplied vs {bicarbonateTarget.toFixed(1)} ppm allowed).
                  Do not add baking soda or potassium bicarbonate. Reduce the source-water volume or choose a lower-alkalinity water.
                </p>
              </div>
            )}
            {configuredBaseWaters.length > 0 && (
              <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">Starting water</div>
                <div className="mt-2 space-y-2">
                  {configuredBaseWaters.map(water => (
                    <div key={water.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/45 px-3 py-2">
                      <span className="min-w-0 truncate text-xs text-slate-200">{water.name || 'Unnamed base water'}</span>
                      <span className="shrink-0 font-mono text-xs text-sky-300">{formatWaterVolume(water.volume)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Step-by-step</div>
            <div className="text-[10px] text-slate-500">{orderedRecipeSalts.length + (useMixingVessel ? 3 : 2)} actions</div>
          </div>
          <ol className="space-y-2.5">
            <li className="flex gap-3 rounded-xl border border-sky-400/15 bg-slate-900/35 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-xs font-bold text-sky-100 ring-1 ring-sky-300/20">1</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200">Prepare the water</div>
                <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  {remainingWaterMl > 0
                    ? `Measure ${formatWaterVolume(remainingWaterMl)} of RO / distilled water.`
                    : `Prepare ${volumeLabel} of water.`}
                </div>
                <div className="mt-1 space-y-0.5 text-xs leading-relaxed text-slate-400">
                  {configuredBaseWaters.map(water => (
                    <div key={`step-base-${water.id}`}>• Add {formatWaterVolume(water.volume)} of {water.name || 'base water'}.</div>
                  ))}
                  {configuredAdditionWaters.map(water => (
                    <div key={`step-addition-${water.id}`}>• Add {formatWaterVolume(water.volume)} of {water.name || 'addition water'}.</div>
                  ))}
                </div>
              </div>
            </li>
            {orderedRecipeSalts.length > 0 && (
              <li className="flex gap-3 rounded-xl border border-sky-400/15 bg-slate-900/35 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-xs font-bold text-sky-100 ring-1 ring-sky-300/20">2</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200">Add the minerals in order</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    Add one salt at a time. Stir until fully dissolved before adding the next.
                  </div>
                  <div className="mt-2 space-y-2">
                    {orderedRecipeSalts.map((salt, index) => {
                      const saltIndex = SALTS.findIndex(item => item.id === salt.id);
                      const formIndex = saltIndex >= 0
                        ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
                        : salt.defaultFormIdx ?? 0;
                      const form = salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
                      return (
                         <div key={`step-salt-${salt.id}`} className="rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-200">
                                {index + 1}. {nerdLevel === 'brewer' ? simpleSaltNames[salt.id] ?? salt.name : salt.name}
                              </div>
                              <div className="mt-0.5 text-[11px] text-slate-500">
                                {nerdLevel === 'brewer' ? saltGroup(salt) : `${salt.formula} · ${form.label}`}
                              </div>
                            </div>
                             <span className="shrink-0 font-mono text-xs text-emerald-300">{amountLabel(salt, stepSaltTargets)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </li>
            )}
            {useMixingVessel && (
            <li className="flex gap-3 rounded-xl border border-sky-400/15 bg-slate-900/35 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-xs font-bold text-sky-100 ring-1 ring-sky-300/20">3</span>
              <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200">Combine and top up</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    Dissolve the salts in {formatWaterVolume(mixingVesselMl)} first, then add the mineral concentrate to the remaining water and stir thoroughly.
                  </div>
                </div>
              </li>
            )}
            <li className="flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/20">{useMixingVessel ? 4 : orderedRecipeSalts.length > 0 ? 3 : 2}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200">Verify and brew</div>
                <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  Check for approximately {tdsTarget.toFixed(0)} ppm TDS. The water should be clear and all minerals fully dissolved. Proceed with your brew method and adjust extraction to taste.
                </div>
              </div>
            </li>
          </ol>
           {saveImageError && (
             <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[10px] leading-relaxed text-amber-100" role="status">
               This browser could not create the image. You can still use the recipe steps on screen.
             </p>
           )}
           <p className="border-t border-slate-700/50 pt-3 text-[10px] leading-relaxed text-slate-500">
            Small amounts are difficult to weigh accurately. For better consistency, multiply the recipe for a larger batch or use a concentrate.
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrewStationMode({
  saltTargets,
  recipeRows,
  liters,
  concentrateOn,
  concentrateLiters,
  concentrateStrength,
  onClose,
}: {
  saltTargets: Record<string, number>;
  recipeRows: SaltRow[];
  liters: number;
  concentrateOn: boolean;
  concentrateLiters: number;
  concentrateStrength: number;
  onClose: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [scaleReading, setScaleReading] = useState('');
  const [wakeLockActive, setWakeLockActive] = useState(false);

  useEffect(() => {
    type ScreenWakeLock = {
      release: () => Promise<void>;
      addEventListener?: (type: 'release', listener: () => void) => void;
    };
    let wakeLock: ScreenWakeLock | null = null;
    let cancelled = false;
    const requestWakeLock = async () => {
      const wakeLockApi = (navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<ScreenWakeLock> };
      }).wakeLock;
      if (!wakeLockApi) return;
      try {
        wakeLock = await wakeLockApi.request('screen');
        if (!cancelled) setWakeLockActive(true);
        wakeLock.addEventListener?.('release', () => {
          if (!cancelled) setWakeLockActive(false);
        });
      } catch {
        setWakeLockActive(false);
      }
    };
    void requestWakeLock();
    return () => {
      cancelled = true;
      if (wakeLock) void wakeLock.release();
    };
  }, []);

  const steps = [
    { id: 'mgso4', label: 'Epsom Salt' },
    { id: 'nahco3', label: 'Baking Soda' },
    { id: 'nacl', label: 'Table Salt' },
    ...(saltTargets.kcl > 0.05 ? [{ id: 'kcl', label: 'Potassium Chloride' }] : []),
    ...(saltTargets.cacl2 > 0.05 ? [{ id: 'cacl2', label: 'Calcium Chloride' }] : []),
  ].map(step => {
    const salt = SALTS.find(item => item.id === step.id);
    const target = saltTargets[step.id] ?? 0;
    const volume = concentrateOn && concentrateLiters > 0 ? concentrateLiters : liters;
    const saltIndex = salt ? SALTS.findIndex(item => item.id === salt.id) : -1;
    const formIndex = salt && saltIndex >= 0
      ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
      : salt?.defaultFormIdx ?? 0;
    const form = salt
      ? salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0]
      : undefined;
    const massMg = salt && target > 0
      ? computeSaltMg(target, volume || 1, form!.molarMass, salt.anhydrousMass)
        * (concentrateOn ? concentrateStrength : 1)
      : 0;
    return { ...step, grams: massMg / 1000 };
  }).filter(step => step.grams > 0);

  const safeIndex = Math.min(stepIndex, Math.max(0, steps.length - 1));
  const currentStep = steps[safeIndex];
  const rawReading = parseFloat(scaleReading);
  // The field represents the net running weight shown by the scale. Tare is a
  // physical scale action, so it must not also be subtracted from this value.
  const actualTotal = Number.isFinite(rawReading) ? Math.max(0, rawReading) : 0;
  // Use the rounded values shown in the step cards so the running target agrees
  // with the numbers the brewer can actually read and dose.
  const roundedGrams = (value: number) => Math.round(value * 1000) / 1000;
  const currentTarget = currentStep ? roundedGrams(currentStep.grams) : 0;
  const cumulativeTarget = steps.slice(0, safeIndex + 1).reduce((sum, step) => sum + roundedGrams(step.grams), 0);
  const targetDifference = actualTotal - cumulativeTarget;
  const tolerance = Math.max(0.005, currentTarget * 0.02);
  const isOnTarget = Boolean(currentStep) && Math.abs(targetDifference) <= tolerance;
  const isFinished = steps.length > 0 && safeIndex === steps.length - 1 && isOnTarget;
  const formatted = (value: number) => value.toFixed(3);
  const targetLow = Math.max(0, currentTarget - tolerance);
  const targetHigh = currentTarget + tolerance;
  const gaugePosition = Math.max(0, Math.min(100, 50 + (targetDifference / Math.max(currentTarget * 0.1, 0.01)) * 50));
  const gaugeTone = isOnTarget
    ? 'bg-emerald-400'
    : Math.abs(targetDifference) <= Math.max(currentTarget * 0.1, 0.01)
      ? 'bg-amber-300'
      : 'bg-rose-400';

  const tare = () => {
    setScaleReading('0');
  };

  if (steps.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black p-6 text-white">
        <div className="text-center">
          <p className="text-2xl font-bold">No minerals to weigh</p>
          <button type="button" onClick={onClose} className="mt-6 rounded-xl bg-white px-6 py-3 font-bold text-black">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-4 sm:px-8 sm:py-5">
        <header className="flex min-h-8 items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="text-sm font-black uppercase tracking-wider text-zinc-300 sm:text-lg">
            Step {safeIndex + 1} of {steps.length}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-600 transition hover:bg-zinc-900 hover:text-zinc-200" aria-label="Close brew station">
            ← Exit
          </button>
        </header>

        <main className="flex flex-1 flex-col pt-1 pb-10 sm:pt-0 sm:pb-12">
          <div className="text-center">
            <div className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Current ingredient</div>
            <h1 className="mt-3 text-5xl font-black tracking-tight sm:mt-4 sm:text-8xl">{currentStep.label}</h1>
            <div className="mt-9 text-base font-bold uppercase tracking-[0.22em] text-zinc-500 sm:mt-11 sm:text-xl">Add this much</div>
            <div className="mt-1 font-mono text-7xl font-black tracking-tight text-emerald-300 sm:text-9xl">{formatted(currentStep.grams)}<span className="ml-2 text-3xl sm:text-5xl">g</span></div>
            <div className="mt-3 text-sm font-bold text-zinc-500">
              Acceptable running total: {formatted(cumulativeTarget - tolerance)}–{formatted(cumulativeTarget + tolerance)} g
            </div>
          </div>

          <div className="mx-auto mt-12 w-full max-w-4xl rounded-[2rem] border-2 border-zinc-700 bg-zinc-950 p-5 sm:mt-16 sm:p-10">
            <label className="block text-center text-base font-bold uppercase tracking-wider text-zinc-400 sm:text-xl" htmlFor="brew-station-scale">
              Scale reading · running total
            </label>
            <div className="mt-5 flex items-center gap-3 sm:mt-6 sm:gap-5">
              <input
                id="brew-station-scale"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.001"
                value={scaleReading}
                onChange={event => setScaleReading(event.target.value)}
                placeholder="0.000"
                className="min-w-0 flex-1 rounded-3xl border-2 border-zinc-600 bg-black px-4 py-5 text-center font-mono text-5xl font-black text-white outline-none focus:border-emerald-400 sm:px-6 sm:py-7 sm:text-7xl"
                autoFocus
              />
              <span className="text-4xl font-black text-zinc-400 sm:text-6xl">g</span>
            </div>
            <div className="mt-5">
              <div className="relative h-4 rounded-full bg-zinc-800">
                <div className="absolute inset-y-0 left-1/2 w-1/5 -translate-x-1/2 rounded-full bg-emerald-400/35" aria-hidden="true" />
                <div
                  className={`absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-black shadow-lg ${gaugeTone}`}
                  style={{ left: `${gaugePosition}%` }}
                  aria-hidden="true"
                />
                <div className="absolute inset-x-0 top-7 flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                  <span>-10%</span><span>Perfect</span><span>+10%</span>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-center sm:mt-6 sm:gap-5">
              <div className="rounded-3xl bg-zinc-900 p-4 sm:p-6">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 sm:text-base">Actual total</div>
                <div className="mt-2 font-mono text-2xl font-bold text-white sm:text-4xl">{formatted(actualTotal)} g</div>
              </div>
              <div className="rounded-3xl bg-zinc-900 p-4 sm:p-6">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 sm:text-base">Target after this step</div>
                <div className="mt-2 font-mono text-2xl font-bold text-white sm:text-4xl">{formatted(cumulativeTarget)} g</div>
              </div>
            </div>
            <div className={`mt-3 rounded-3xl p-4 text-center sm:p-5 ${isOnTarget ? 'bg-emerald-500/20' : 'bg-zinc-900'}`}>
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 sm:text-base">Difference from target</div>
              <div className={`mt-2 font-mono text-2xl font-bold ${isOnTarget ? 'text-emerald-300' : targetDifference > 0 ? 'text-rose-300' : 'text-amber-300'} sm:text-4xl`}>
                {targetDifference >= 0 ? '+' : ''}{formatted(targetDifference)} g
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {isOnTarget ? 'on cumulative target' : targetDifference < 0 ? 'under cumulative target' : 'over cumulative target'}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:mt-6">
              <button type="button" onClick={tare} className="rounded-2xl border border-zinc-600 px-5 py-4 text-base font-bold text-zinc-200 hover:bg-zinc-800 sm:px-6 sm:text-lg">
                Tare / zero scale
              </button>
              <span className="text-xs text-zinc-500 sm:text-sm">
                {wakeLockActive ? 'Screen staying awake' : 'Screen wake lock unavailable'} · scale is net weight
              </span>
            </div>
          </div>

          <div className={`mx-auto mt-7 w-full max-w-4xl rounded-2xl px-5 py-5 text-center text-xl font-black sm:text-2xl ${isOnTarget ? 'bg-emerald-400 text-black' : 'bg-zinc-900 text-zinc-400'}`}>
            {isOnTarget ? 'Check — on target' : targetDifference < 0 ? `Add ${formatted(Math.abs(targetDifference))} g to reach the cumulative target` : `Remove ${formatted(targetDifference)} g to reach the cumulative target`}
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              disabled={safeIndex === 0}
              onClick={() => setStepIndex(index => Math.max(0, index - 1))}
              className="min-h-14 flex-1 rounded-2xl border border-zinc-700 px-4 py-4 text-lg font-bold text-zinc-300 disabled:opacity-30"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setStepIndex(index => Math.min(steps.length - 1, index + 1))}
              className="min-h-14 flex-[2] rounded-2xl bg-emerald-400 px-4 py-4 text-lg font-black text-black"
            >
            {isFinished ? 'Finished — mix minerals' : isOnTarget ? 'Next mineral' : 'Next anyway'}
            </button>
          </div>
          <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">
            Keep the container on the scale. Enter the running net weight after each addition; the target total includes every mineral already added.
          </p>
        </main>
      </div>
    </div>
  );
}

function BrewerFlavorPanel({
  flavor,
  suggestedIons,
  onChange,
  onOpenStartingRecipe,
}: {
  flavor: BrewerFlavorInput;
  suggestedIons: Record<IonId, number>;
  onChange: (flavor: BrewerFlavorInput) => void;
  onOpenStartingRecipe: () => void;
}) {
  const gh = computeGH(suggestedIons);
  const kh = computeKH(suggestedIons);
  const direction = flavor.brightness >= 65
    ? flavor.juiciness >= 60 ? 'Bright, juicy, and clear' : 'Bright and crisp'
    : flavor.body >= 60
      ? 'Round, full, and structured'
      : 'Balanced and approachable';
  const magnesium = suggestedIons.magnesium ?? 0;
  const calcium = suggestedIons.calcium ?? 0;
  const hardnessTotal = magnesium + calcium;
  const magnesiumShare = hardnessTotal > 0 ? Math.round((magnesium / hardnessTotal) * 100) : 0;
  const calciumShare = hardnessTotal > 0 ? 100 - magnesiumShare : 0;
  const bufferCue = suggestedIons.bicarbonate < 35
    ? 'Light buffer keeps acidity vivid'
    : suggestedIons.bicarbonate > 60
      ? 'More buffer rounds sharp acidity'
      : 'Balanced buffer for a versatile cup';

  return (
    <div className="border-b border-slate-700/40 bg-sky-500/5 px-4 py-4 sm:px-6">
       <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">Build your water by flavor</div>
          <p className="mt-1 text-xs text-slate-400">
            Start with RO / distilled water, then click the pyramid or drag the star. Your mineral recipe updates instantly.
          </p>
        </div>
         <button
           type="button"
           onClick={onOpenStartingRecipe}
           className="flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-300/35 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-100 transition hover:border-violet-200/65 hover:bg-violet-500/20 hover:shadow-lg hover:shadow-violet-950/20"
           title="Answer coffee preference questions to create a tunable starting mineral recipe"
         >
           <Sparkles className="h-3.5 w-3.5" />
           Build from my coffee
         </button>
      </div>
      <BrewerFlavorPyramid flavor={flavor} onChange={onChange} />
      <BrewerFlavorRadar flavor={flavor} suggestedIons={suggestedIons} />
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {([
          ['brightness', 'Brightness / acidity', 'Soft', 'Bright'],
          ['juiciness', 'Fruit character', 'Balanced', 'Juicy'],
          ['sweetness', 'Sweetness / clarity', 'Crisp', 'Round'],
          ['body', 'Body / mouthfeel', 'Light', 'Full'],
        ] as const).map(([key, label, low, high]) => {
          const status = brewerSliderStatus(flavor[key]);
          return (
            <div key={key} className="rounded-lg border border-slate-700/50 bg-slate-900/30 px-2.5 py-2">
              <div className="truncate text-[10px] text-slate-500">{label}</div>
              <div className="mt-1 flex items-baseline justify-between gap-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${status.className}`}>{status.label}</span>
                <span className="font-mono text-xs text-sky-300">{flavor[key]}</span>
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-slate-600"><span>{low}</span><span>{high}</span></div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2 rounded-xl border border-slate-700/50 bg-slate-900/35 px-3 py-3 sm:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Suggested flavor direction</div>
          <div className="mt-1 text-sm font-medium text-slate-200">{direction}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">GH</div>
          <div className="mt-1 font-mono text-sm text-cyan-300">{gh.toFixed(0)} ppm</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">KH</div>
          <div className="mt-1 font-mono text-sm text-cyan-300">{kh.toFixed(0)} ppm</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Hardness balance</div>
          <div className="mt-1 font-mono text-xs text-slate-300">
            Mg:Ca {magnesiumShare}:{calciumShare}
          </div>
          <div className="mt-0.5 text-[9px] text-slate-600">{magnesium.toFixed(0)} · {calcium.toFixed(0)} ppm</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-900/25 px-3 py-2 text-[10px]">
        <span className="font-semibold uppercase tracking-wider text-slate-500">Water read</span>
        <span className="text-sky-200">{bufferCue}</span>
        <span className="text-slate-600">·</span>
        <span className="text-slate-400">Mg pulls intensity; Ca adds focus and roundness</span>
      </div>
      <p className="mt-2 text-[10px] text-slate-500">
        0–60 stays within Aiki’s safe band · 60–75 is elevated · 75–100 is out of range. Use the steps button for a simple preparation guide.
      </p>
    </div>
  );
}

function BrewerFlavorPyramid({
  flavor,
  onChange,
}: {
  flavor: BrewerFlavorInput;
  onChange: (flavor: BrewerFlavorInput) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingRef = useRef(false);
  const apex = { x: 320, y: 42 };
  const left = { x: 72, y: 290 };
  const right = { x: 568, y: 290 };
  const weights = {
    apex: (flavor.brightness + flavor.juiciness) / 200,
    left: flavor.sweetness / 100,
    right: flavor.body / 100,
  };
  const weightTotal = weights.apex + weights.left + weights.right;
  const point = {
    x: weightTotal > 0
      ? (apex.x * weights.apex + left.x * weights.left + right.x * weights.right) / weightTotal
      : (apex.x + left.x + right.x) / 3,
    y: weightTotal > 0
      ? (apex.y * weights.apex + left.y * weights.left + right.y * weights.right) / weightTotal
      : (apex.y + left.y + right.y) / 3,
  };

  const flavorFromPoint = (x: number, y: number): BrewerFlavorInput => {
    const denominator =
      (left.y - right.y) * (apex.x - right.x) + (right.x - left.x) * (apex.y - right.y);
    let apexWeight =
      ((left.y - right.y) * (x - right.x) + (right.x - left.x) * (y - right.y)) / denominator;
    let leftWeight =
      ((right.y - apex.y) * (x - right.x) + (apex.x - right.x) * (y - right.y)) / denominator;
    let rightWeight = 1 - apexWeight - leftWeight;
    const positiveWeights = {
      apex: Math.max(0, apexWeight),
      left: Math.max(0, leftWeight),
      right: Math.max(0, rightWeight),
    };
    const total = positiveWeights.apex + positiveWeights.left + positiveWeights.right || 1;
    apexWeight = positiveWeights.apex / total;
    leftWeight = positiveWeights.left / total;
    rightWeight = positiveWeights.right / total;
    return {
      brightness: Math.round(apexWeight * 100),
      juiciness: Math.round(apexWeight * 100),
      sweetness: Math.round(leftWeight * 100),
      body: Math.round(rightWeight * 100),
    };
  };

  const pointIsInsidePyramid = (x: number, y: number) => {
    const denominator =
      (left.y - right.y) * (apex.x - right.x) + (right.x - left.x) * (apex.y - right.y);
    const apexWeight =
      ((left.y - right.y) * (x - right.x) + (right.x - left.x) * (y - right.y)) / denominator;
    const leftWeight =
      ((right.y - apex.y) * (x - right.x) + (apex.x - right.x) * (y - right.y)) / denominator;
    const rightWeight = 1 - apexWeight - leftWeight;
    return apexWeight >= 0 && leftWeight >= 0 && rightWeight >= 0;
  };

  const getPointerPosition = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 640,
      y: ((event.clientY - rect.top) / rect.height) * 340,
    };
  };

  const updateFromPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const position = getPointerPosition(event);
    if (position) onChange(flavorFromPoint(position.x, position.y));
  };

  const moveByKeyboard = (event: React.KeyboardEvent<SVGCircleElement>) => {
    const amount = event.shiftKey ? 10 : 5;
    let x = point.x;
    let y = point.y;
    if (event.key === 'ArrowLeft') x -= amount;
    else if (event.key === 'ArrowRight') x += amount;
    else if (event.key === 'ArrowUp') y -= amount;
    else if (event.key === 'ArrowDown') y += amount;
    else return;
    event.preventDefault();
    onChange(flavorFromPoint(x, y));
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/35 px-2 py-3 sm:px-4">
      <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Drag the star to shape your cup
      </div>
      <div className="flex justify-center">
        <svg
          ref={svgRef}
          viewBox="0 0 640 340"
          className="h-auto w-full max-w-[640px] touch-none select-none"
          role="img"
          aria-label="Interactive taste pyramid. Drag the star between brightness and fruit acidity, sweetness and clarity, and body and mouthfeel."
           onPointerDown={event => {
             const position = getPointerPosition(event);
             if (!position || !pointIsInsidePyramid(position.x, position.y)) return;
             draggingRef.current = true;
             event.currentTarget.setPointerCapture(event.pointerId);
             updateFromPointer(event);
           }}
           onPointerMove={event => {
             if (draggingRef.current) updateFromPointer(event);
           }}
           onPointerUp={event => {
             draggingRef.current = false;
             if (event.currentTarget.hasPointerCapture(event.pointerId)) {
               event.currentTarget.releasePointerCapture(event.pointerId);
             }
           }}
           onPointerCancel={() => { draggingRef.current = false; }}
           style={{ cursor: 'crosshair' }}
        >
          <defs>
            <linearGradient id="brewer-pyramid-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <polygon points={`${apex.x},${apex.y} ${left.x},${left.y} ${right.x},${right.y}`} fill="url(#brewer-pyramid-fill)" stroke="rgb(125 211 252 / 0.65)" strokeWidth="2" />
          <line x1={apex.x} y1={apex.y} x2={point.x} y2={point.y} stroke="rgb(125 211 252 / 0.22)" strokeDasharray="5 5" />
          <line x1={left.x} y1={left.y} x2={point.x} y2={point.y} stroke="rgb(125 211 252 / 0.22)" strokeDasharray="5 5" />
          <line x1={right.x} y1={right.y} x2={point.x} y2={point.y} stroke="rgb(125 211 252 / 0.22)" strokeDasharray="5 5" />
          <text x={apex.x} y="22" textAnchor="middle" fill="rgb(226 232 240)" fontSize="14" fontWeight="600">Brightness / Fruit Acidity</text>
          <text x="64" y="318" textAnchor="start" fill="rgb(226 232 240)" fontSize="14" fontWeight="600">Sweetness &amp; Clarity</text>
          <text x="576" y="318" textAnchor="end" fill="rgb(226 232 240)" fontSize="14" fontWeight="600">Body &amp; Mouthfeel</text>
          <circle cx={point.x} cy={point.y} r="19" fill="rgb(14 165 233 / 0.16)" />
          <circle
            cx={point.x}
            cy={point.y}
            r="12"
            fill="#f8fafc"
            stroke="#38bdf8"
            strokeWidth="3"
            tabIndex={0}
            role="slider"
            aria-label="Taste profile position"
            aria-valuetext={`${flavor.brightness} brightness, ${flavor.juiciness} fruit, ${flavor.sweetness} sweetness, ${flavor.body} body`}
            onKeyDown={moveByKeyboard}
            style={{ cursor: 'grab' }}
          />
          <text x={point.x} y={point.y + 5} textAnchor="middle" fill="#0284c7" fontSize="15" fontWeight="700">★</text>
        </svg>
      </div>
    </div>
  );
}

function BrewerFlavorRadar({
  flavor,
  suggestedIons,
}: {
  flavor: BrewerFlavorInput;
  suggestedIons: Record<IonId, number>;
}) {
  const clampRadar = (value: number) => Math.max(12, Math.min(96, value));
  const scores = [
    clampRadar(flavor.brightness * 0.72 + Math.min(suggestedIons.sulfate, 30) * 0.8 + 8),
    clampRadar(flavor.body * 0.72 + Math.min(suggestedIons.calcium, 45) * 0.38 + 8),
    clampRadar(flavor.sweetness * 0.58 + flavor.juiciness * 0.22 + Math.min(suggestedIons.chloride, 35) * 0.45 + 10),
    clampRadar((100 - Math.min(suggestedIons.bicarbonate, 90)) * 0.4 + flavor.brightness * 0.3 + flavor.juiciness * 0.2 + 12),
  ];
  const labels = [
    { text: 'Brightness / Fruit Acidity', x: 140, y: 10, anchor: 'middle' as const },
    { text: 'Body / Mouthfeel', x: 270, y: 116, anchor: 'start' as const },
    { text: 'Sweetness', x: 140, y: 230, anchor: 'middle' as const },
    { text: 'Clarity', x: 10, y: 116, anchor: 'end' as const },
  ];
  const center = { x: 140, y: 112 };
  const radius = 75;
  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + index * (Math.PI / 2);
    const distance = radius * (value / 100);
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance,
    };
  };
  const polygon = scores.map((score, index) => {
    const p = point(index, score);
    return `${p.x},${p.y}`;
  }).join(' ');
  const gridPolygon = (scale: number) => [0, 1, 2, 3].map(index => {
    const p = point(index, scale);
    return `${p.x},${p.y}`;
  }).join(' ');

  return (
    <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/35 px-3 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Predicted flavor profile
      </div>
      <div className="flex justify-center overflow-x-auto">
        <svg
          viewBox="0 0 280 242"
          className="h-56 w-full max-w-[360px] min-w-[280px]"
          role="img"
          aria-label="Live predicted flavor profile radar"
        >
          {[25, 50, 75, 100].map(scale => (
            <polygon
              key={scale}
              points={gridPolygon(scale)}
              fill="none"
              stroke="rgb(71 85 105 / 0.45)"
              strokeWidth="1"
            />
          ))}
          {[0, 1, 2, 3].map(index => {
            const end = point(index, 100);
            return (
              <line
                key={index}
                x1={center.x}
                y1={center.y}
                x2={end.x}
                y2={end.y}
                stroke="rgb(71 85 105 / 0.5)"
                strokeWidth="1"
              />
            );
          })}
          <polygon
            points={polygon}
            fill="rgb(14 165 233 / 0.28)"
            stroke="rgb(56 189 248)"
            strokeWidth="2"
            className="transition-all duration-300"
          />
          {scores.map((score, index) => {
            const p = point(index, score);
            return <circle key={index} cx={p.x} cy={p.y} r="3.5" fill="rgb(125 211 252)" />;
          })}
          {labels.map(label => (
            <text
              key={label.text}
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              fill="rgb(148 163 184)"
              fontSize="9"
            >
              {label.text}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function WaterMetadataFields({
  metadata,
  onChange,
}: {
  metadata: Partial<Record<keyof WaterMetadata, string>>;
  onChange: (metadata: Partial<Record<keyof WaterMetadata, string>>) => void;
}) {
  return (
    <details className="rounded-lg border border-slate-700/50 bg-slate-900/25">
      <summary className="cursor-pointer select-none px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300">
        Reported water metadata
      </summary>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-700/40 p-3 sm:grid-cols-4">
        {WATER_METADATA_FIELDS.map(field => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-[10px] text-slate-500">
              {field.label}{field.unit ? ` (${field.unit})` : ''}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step={field.key === 'ph' ? '0.01' : 'any'}
              value={metadata[field.key] ?? ''}
              onChange={e => onChange({ ...metadata, [field.key]: e.target.value })}
              placeholder="—"
              className="w-full rounded-lg border border-slate-600/60 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-100 placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60"
            />
          </label>
        ))}
      </div>
    </details>
  );
}

function IonWatchDisclosure({ ions }: { ions: Partial<Record<IonId, number>> }) {
  const flaggedIons = ACTIVE_ION_IDS
    .map(id => {
      const ion = ION_MAP[id];
      const ppm = ions[id] ?? 0;
      const level = classifyIon(ppm, AIKI_DEFAULT_PROFILE.ranges[id]);
      return { id, ion, ppm, level };
    })
    .filter(item => item.level !== 'green');
  const watchLevel: TrafficLevel = flaggedIons.some(item => item.level === 'red')
    ? 'red'
    : flaggedIons.some(item => item.level === 'yellow')
      ? 'yellow'
      : 'green';

  return (
    <details className="group border-t border-indigo-400/15 bg-indigo-500/[0.035]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-xs text-slate-300 hover:bg-indigo-500/[0.06] sm:px-6 [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full border border-indigo-400/35 bg-indigo-500/10"
          aria-label={`Ion status: ${TRAFFIC_STYLES[watchLevel].label}`}
          title={`Ion status: ${TRAFFIC_STYLES[watchLevel].label}`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              watchLevel === 'green'
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.95)]'
                : watchLevel === 'yellow'
                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.95)]'
                  : 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.95)]'
            }`}
          />
        </span>
        <span className="font-semibold">Aiki&apos;s ion check</span>
        <span className="text-slate-500">
          {flaggedIons.length === 0
            ? 'All monitored ions in range'
            : `${flaggedIons.length} ion${flaggedIons.length === 1 ? '' : 's'} to review`}
        </span>
        <span className="ml-auto text-slate-500 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-2 border-t border-indigo-400/10 px-4 py-3 sm:px-6">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Based on the final source-water-plus-salts mixture and Aiki&apos;s light-roast pourover ranges.{' '}
          <a
            href="https://discord.com/channels/1194136643637096508/1423022322465505380/1504865270882373775"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-indigo-300 underline decoration-indigo-300/40 underline-offset-2 transition hover:text-indigo-200"
          >
            View Aiki&apos;s original Discord post
          </a>
        </p>
        {flaggedIons.length === 0 ? (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[11px] text-emerald-200">
            No elevated or out-of-range ions detected.
          </p>
        ) : (
          flaggedIons.map(({ id, ion, ppm, level }) => {
            const style = TRAFFIC_STYLES[level];
            const range = AIKI_DEFAULT_PROFILE.ranges[id];
            return (
              <div key={id} className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2.5`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className={`text-xs font-semibold ${style.text}`}>
                    {ion.name} · {style.label}
                  </span>
                  <span className={`font-mono text-[11px] ${style.text}`}>
                    {ppm.toFixed(1)} ppm · preferred &lt;{range.greenMax}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  {ion.flagNotes[level]}
                </p>
              </div>
            );
          })
        )}
    </div>
    </details>
  );
}

function IonDeviationDisclosure({
  actual,
  target,
}: {
  actual: Partial<Record<IonId, number>>;
  target: Partial<Record<IonId, number>>;
}) {
  const deviations = IONS
    .map(({ id }) => ({
      id,
      actual: actual[id] ?? 0,
      target: target[id] ?? 0,
      delta: (actual[id] ?? 0) - (target[id] ?? 0),
    }))
    .filter(item => Math.abs(item.delta) > 0.05);
  const overshoots = deviations.filter(item => item.delta > 0);
  const underdoses = deviations.filter(item => item.delta < 0);
  const status: TrafficLevel = overshoots.length > 0
    ? 'red'
    : underdoses.length > 0
      ? 'yellow'
      : 'green';

  return (
    <details className="group mt-3 border-t border-indigo-400/15 bg-indigo-500/[0.035]">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-xs text-slate-300 hover:bg-indigo-500/[0.06] [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full border border-indigo-400/35 bg-indigo-500/10"
          aria-label={`Ion deviation status: ${TRAFFIC_STYLES[status].label}`}
          title={`Ion deviation status: ${TRAFFIC_STYLES[status].label}`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === 'green'
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.95)]'
                : status === 'yellow'
                  ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.95)]'
                  : 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.95)]'
            }`}
          />
        </span>
        <span className="font-semibold">Ion deviation from original recipe</span>
        <span className="text-slate-500">
          {deviations.length === 0
            ? 'No meaningful deviation'
            : `${overshoots.length} over · ${underdoses.length} under`}
        </span>
        <span className="ml-auto text-slate-500 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-2 border-t border-indigo-400/10 px-3 py-3">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Final source-water-plus-salts mixture compared with the original salt-only recipe. Small differences are hidden.
        </p>
        {deviations.length === 0 ? (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[11px] text-emerald-200">
            No meaningful ion deviation detected.
          </p>
        ) : (
          deviations.map(({ id, actual: actualPpm, target: targetPpm, delta }) => {
            const over = delta > 0;
            const style = over ? TRAFFIC_STYLES.red : TRAFFIC_STYLES.yellow;
            return (
              <div key={id} className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2.5`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className={`text-xs font-semibold ${style.text}`}>
                    {ION_MAP[id].name} · {over ? 'Over target' : 'Under target'}
                  </span>
                  <span className={`font-mono text-[11px] ${style.text}`}>
                    {over ? '+' : '−'}{Math.abs(delta).toFixed(1)} ppm
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                  Final {actualPpm.toFixed(1)} ppm vs original {targetPpm.toFixed(1)} ppm.
                </p>
              </div>
            );
          })
        )}
      </div>
    </details>
  );
}

const STRENGTH_OPTIONS = [10, 25, 50, 100, 150, 200, 500];

const STOCK_COLOR_CLASSES = {
  sky:    { border: 'border-sky-500/30',    bg: 'bg-sky-500/5',    heading: 'text-sky-300',    doseBg: 'bg-sky-500/10 border-sky-500/20',    doseText: 'text-sky-200' },
  violet: { border: 'border-violet-500/30', bg: 'bg-violet-500/5', heading: 'text-violet-300', doseBg: 'bg-violet-500/10 border-violet-500/20', doseText: 'text-violet-200' },
  amber:  { border: 'border-amber-500/30',  bg: 'bg-amber-500/5',  heading: 'text-amber-300',  doseBg: 'bg-amber-500/10 border-amber-500/20',  doseText: 'text-amber-200' },
};

function SplitStockCard({
  group, saltTargets, rows, strength, volumeMl, batchL, warnings,
  onStrengthChange, onVolumeChange,
}: {
  group: StockGroup;
  saltTargets: Record<string, number>;
  rows: SaltRow[];
  strength: number;
  volumeMl: string;
  batchL: number;
  warnings: ConcentrateWarning[];
  onStrengthChange: (v: number) => void;
  onVolumeChange: (v: string) => void;
}) {
  const cls = STOCK_COLOR_CLASSES[group.color];
  const stockL = num(volumeMl) / 1000;
  const dosePerLiter = strength > 0 ? 1000 / strength : 0;
  const dosePerBatch = dosePerLiter * batchL;

  return (
    <div className={`rounded-xl border ${cls.border} ${cls.bg} px-4 py-3 space-y-3`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className={`w-3.5 h-3.5 ${cls.heading}`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${cls.heading}`}>{group.name}</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300">Strength:</label>
          <select
            value={STRENGTH_OPTIONS.includes(strength) ? strength : 0}
            onChange={e => {
              const v = Number(e.target.value);
              onStrengthChange(v === 0 ? strength : v);
            }}
            className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
          >
            {STRENGTH_OPTIONS.map(v => <option key={v} value={v}>×{v}</option>)}
            <option value={0}>Custom</option>
          </select>
          {!STRENGTH_OPTIONS.includes(strength) && (
            <input
              type="number"
              inputMode="numeric"
              min={2}
              value={strength || ''}
              onChange={e => onStrengthChange(Number(e.target.value) || 0)}
              placeholder="×"
              className="w-20 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300">Volume:</label>
          <input
            type="number"
            inputMode="decimal"
            value={volumeMl}
            onChange={e => onVolumeChange(e.target.value)}
            placeholder="500"
            className="w-24 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
          />
          <span className="text-xs text-slate-400">mL</span>
        </div>
      </div>

      {/* Dosing info */}
      {strength > 0 && stockL > 0 && (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${cls.doseText} ${cls.doseBg} rounded-lg px-3 py-2 border`}>
          <span>Add <strong>{dosePerLiter.toFixed(1)} mL</strong> per liter of brew water</span>
          {batchL > 0 && <span>· <strong>{dosePerBatch.toFixed(1)} mL</strong> per batch</span>}
        </div>
      )}

      {/* Salt masses */}
      <div className="space-y-1">
        {group.saltIds.map(saltId => {
          const salt = SALTS.find(s => s.id === saltId)!;
          const saltIdx = SALTS.indexOf(salt);
           const row = rows[saltIdx] ?? {
             target: '',
             formIdx: salt.defaultFormIdx ?? 0,
           };
          const form = salt.hydrationForms[row.formIdx];
          const target = saltTargets[saltId] ?? 0;
          const mg = strength > 0 && stockL > 0 && target > 0
            ? computeSaltMg(target, stockL, form.molarMass, salt.anhydrousMass) * strength
            : 0;
          const massLabel = mg >= 1000 ? `${(mg / 1000).toFixed(3)} g` : `${mg.toFixed(2)} mg`;
          const formLabel = salt.hydrationForms.length > 1 ? ` (${form.label})` : '';
          return (
            <div key={saltId} className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-300">{salt.name}{formLabel}</span>
              <span className="text-xs font-mono text-emerald-300 shrink-0">{mg > 0 ? massLabel : '—'}</span>
            </div>
          );
        })}
      </div>

      {/* Warnings for this group */}
      {warnings.filter(w => w.severity !== 'info').length > 0 && (
        <div className="space-y-1.5">
          {warnings.filter(w => w.severity !== 'info').map((w, wi) => (
            <div
              key={wi}
              className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                w.severity === 'error'
                  ? 'text-rose-200 bg-rose-500/10 border border-rose-500/25'
                  : 'text-amber-200 bg-amber-500/10 border border-amber-500/25'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${w.severity === 'error' ? 'text-rose-400' : 'text-amber-400'}`} />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      </div>
  );
}

function HardnessCard({ label, value, saltValue, bottledValue }: {
  label: string; value: number; saltValue: number; bottledValue: number;
}) {
  return (
    <div className="app-data-card flex flex-col bg-slate-900/40 rounded-xl border border-slate-700/40 px-4 py-3">
      <div className="min-h-8 text-xs leading-relaxed text-slate-400">{label}</div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-cyan-300">{value.toFixed(1)}</span>
        <span className="text-sm text-slate-400">ppm CaCO₃</span>
      </div>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Salts:</span>
          <span className="font-mono text-emerald-300">{saltValue.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="text-slate-400">Mineral:</span>
          <span className="font-mono text-sky-300">{bottledValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

function SimpleMetricCard({ label, value, unit, tone = 'tds' }: {
  label: string;
  value: number;
  unit: string;
  tone?: 'hardness' | 'buffer' | 'tds';
}) {
  const valueTone = {
    hardness: 'text-indigo-300',
    buffer: 'text-amber-300',
    tds: 'text-cyan-300',
  }[tone];

  return (
    <div className="app-data-card flex flex-col bg-slate-900/40 rounded-xl border border-slate-700/40 px-4 py-3">
      <div className="min-h-8 text-xs leading-relaxed text-slate-400">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${valueTone}`}>{value.toFixed(1)}</span>
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

function TdsCard({ value, saltValue, bottledValue }: {
  value: number; saltValue: number; bottledValue: number;
}) {
  return (
    <div className="app-data-card flex flex-col bg-slate-900/40 rounded-xl border border-slate-700/40 px-4 py-3">
      <div className="min-h-8 text-xs leading-relaxed text-slate-400">Total Dissolved Solids (TDS)</div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-cyan-300">{value.toFixed(1)}</span>
        <span className="text-sm text-slate-400">mg/L</span>
      </div>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Salts:</span>
          <span className="font-mono text-emerald-300">{saltValue.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="text-slate-400">Reported water:</span>
          <span className="font-mono text-sky-300">{bottledValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

function WaterChemistryCard({
  estimate,
  basePH,
  baseAlkalinity,
}: {
  estimate?: number;
  basePH?: number;
  baseAlkalinity?: number;
}) {
  const hasEstimate = estimate !== undefined;
  const status = hasEstimate
    ? `Estimated pH: ${estimate.toFixed(2)}`
    : basePH === undefined
      ? 'Add base-water pH to estimate'
      : 'Add base-water alkalinity to estimate';

  return (
    <details className="app-card app-panel-surface group bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
      <summary className="app-section-header flex cursor-pointer list-none items-center justify-between gap-3 px-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-sky-300" />
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">Water Chemistry</span>
          <span className="hidden truncate text-xs text-slate-500 sm:inline">pH and buffering estimate</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-xs ${hasEstimate ? 'text-sky-300' : 'text-slate-500'}`}>{status}</span>
          <span className="text-slate-500 transition-transform group-open:rotate-180">⌄</span>
        </div>
      </summary>
      <div className="app-card-body border-t border-slate-700/40">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="app-data-card rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
            <div className="min-h-8 text-xs leading-relaxed text-slate-400">Estimated final pH</div>
            <div className="mt-1 text-2xl font-bold text-cyan-300">
              {hasEstimate ? estimate.toFixed(2) : '—'}
            </div>
          </div>
          <div className="app-data-card rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
            <div className="min-h-8 text-xs leading-relaxed text-slate-400">Base-water pH</div>
            <div className="mt-1 text-2xl font-bold text-slate-200">
              {basePH !== undefined ? basePH.toFixed(2) : '—'}
            </div>
          </div>
          <div className="app-data-card rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
            <div className="min-h-8 text-xs leading-relaxed text-slate-400">Base alkalinity</div>
            <div className="mt-1 text-2xl font-bold text-slate-200">
              {baseAlkalinity !== undefined ? baseAlkalinity.toFixed(1) : '—'}
              <span className="ml-1 text-sm font-normal text-slate-500">mg/L CaCO₃</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {hasEstimate
            ? 'Estimated from reported base-water pH and alkalinity plus the recipe’s carbonate and citrate balance. Verify with a calibrated pH meter.'
            : 'Select a mineral-water source above that includes both reported pH and alkalinity to estimate the final pH. Ion concentrations alone are not enough to determine pH reliably.'}
        </p>
      </div>
    </details>
  );
}

export default App;

import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DependencyList, type ReactNode, type SVGProps } from 'react';
import { createPortal } from 'react-dom';
import pepeImage from '@assets/ez_1785735003821.png';
import roundedDropperImage from '@assets/rounded_1786763676557.jpg';
import straightDropperImage from '@assets/straight_1786763676557.jpg';
import watermancerMarkImage from '@assets/image_1787373159788.png';
import kappMemeGif from '@assets/Kapp_1787058386404.gif';
import kappMemeLastFrame from '@assets/Kapp_1787058386404_last.png';
import { Droplet, FlaskConical, Gauge, Info, AlertTriangle, Download, Check, Save, Share2, Upload, Import, Trash2, Layers, X, RotateCcw, Plus, Minus, ListChecks, Sparkles, Gem, Pin, PinOff, BottleWine, Beaker, Ruler, Calculator as CalculatorIcon, ChevronDown, ChevronLeft } from 'lucide-react';
import { GiSaltShaker } from 'react-icons/gi';
import { SiDiscord } from 'react-icons/si';
import {
  SALTS, IONS, ACTIVE_ION_IDS, ION_MAP, AIKI_DEFAULT_PROFILE, WATERMANCER_SENSORY_PROFILE, RECIPES, CACO3_FACTOR, classifyIon, computeSaltMg, computeSaltTargetPpm,
  computeIonTotals, computeSaltIonPpmTotal, computeSupplementalIonTotals, computeNaClTargetForSodiumGap, findIonOvershoots, findIonUnderdoses, computeGH, computeKH, checkConcentrate, findStrongestSafeConcentrateStrength, findConcentrateLimitingConstraint, splitIntoStockGroups, getSaltColorTokens, CONCENTRATE_MINIMUM_DOSE_LITERS, CONCENTRATE_MINIMUM_WHOLE_DROPS,
  SUPPLEMENTAL_ION_MAP, type IonId, type SupplementalIonId, type TrafficLevel, type WaterProfile, type RangeSet,
  type SaltRecipe, type SaltRecipeEntry, type ConcentrateWarning, type StockGroup,
} from '@/waterData';
import {
  loadSavedRecipes, saveSavedRecipes, serializeRecipeFile, parseRecipeFile, newRecipeId,
} from '@/recipes';
import { loadLocalWaters, saveLocalWaters, newLocalWaterId, type LocalWater, type WaterMetadata } from '@/localWaters';
import type { Week1Recipe } from './Week1Guide';
import BrewerPrepMethodSelector, { type BrewerPrepMethod } from './BrewerPrepMethodSelector';
import { SectionHeader as SharedSectionHeader } from './components/SectionHeader';
import {
  HardnessCard as SharedHardnessCard,
  SimpleMetricCard as SharedSimpleMetricCard,
  TdsCard as SharedTdsCard,
  WaterChemistryCard as SharedWaterChemistryCard,
} from './components/MetricCards';
import {
  loadProfiles, saveProfiles, saveActiveProfileId,
  loadNerdLevel, saveNerdLevel, createProfile,
  type NerdLevel,
} from '@/profiles';
import {
  createWaterPlan,
  isAutoSavedWaterPlan,
  isValidWaterPlan,
  loadWaterPlans,
  parseWaterRecipeFile,
  parseWaterPlanFile,
  saveWaterPlans,
  serializeWaterRecipeFile,
  serializeWaterPlanFile,
  type WaterPlan,
  type WaterPlanConcentrateSnapshot,
  type WaterPlanSnapshot,
  WATER_PLAN_AUTOSAVE_NAME,
} from './waterPlans';
import {
  createWatermancerProfile, loadWatermancerProfiles, saveWatermancerProfiles,
  type IonicTargetValues, type WatermancerProfile,
} from './watermancerProfiles';
import {
  embedWaterRecipeJsonInPng,
  extractWaterRecipeJsonFromPng,
  buildRecipeShareCardSvg,
  createRecipeShareCardModel,
  rasterizeRecipeShareCard,
} from './waterRecipeImage';
import { ROBERT_ASAMI_RECIPES, type ExternalRecipe } from './externalRecipes';
import { LOTUS_RECIPES, type LotusRecipe, lotusIonTargetsForWatermancer } from './lotusRecipes';
import {
  LOTUS_BOTTLE_VOLUME_ML,
  LOTUS_DROPPER_DEFINITIONS,
  LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML,
  lotusDropsPerMl,
  lotusStockPlan,
  type LotusDropperStyle,
} from './lotusConcentrate';
import { EMPIRICAL_WATERS } from './empiricalWaters';
import {
  normalizeWatermancerIonOrder,
  normalizeWatermancerIonSourcePreferences,
  type WatermancerIonDeviation,
  type WatermancerIonConflict,
  type WatermancerIonSourcePreference,
  type WatermancerMatchRecommendationAction,
  type WatermancerMatchRecommendation,
  type WatermancerMatchDiagnostics,
  type WatermancerRouteCandidate,
  type WatermancerStrategy,
  type WatermancerSaltObjective,
  type WatermancerOvershootPolicy,
  type WatermancerSolverResult,
  type WatermancerPlan,
} from './watermancerPlan';
import { solveBoundedCoupledSaltTargets } from './watermancerSaltSolver';
import {
  createWatermancerWorkerClient,
  isLatestWatermancerWorkerRequest,
  type WatermancerWorkerClient,
} from './watermancerWorkerClient';

const Week1Guide = lazy(() => import('./Week1Guide'));
const WATER_RECIPE_IMAGE_SIZE = 256;

async function createWaterRecipePreviewPng(sourceUrl: string, title: string): Promise<Uint8Array<ArrayBuffer>> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new Error('Could not load the Watermancer image.');
  const sourceBlob = await response.blob();
  const sourceUrlObject = URL.createObjectURL(sourceBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Could not decode the Watermancer image.'));
      element.src = sourceUrlObject;
    });
    const canvas = document.createElement('canvas');
    canvas.width = WATER_RECIPE_IMAGE_SIZE;
    canvas.height = WATER_RECIPE_IMAGE_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create the profile image canvas.');

    context.drawImage(image, 0, 0, WATER_RECIPE_IMAGE_SIZE, WATER_RECIPE_IMAGE_SIZE);

    const words = title.trim().split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let currentLine = '';
    const maxTextWidth = WATER_RECIPE_IMAGE_SIZE - 20;
    const maxLines = 3;
    const lineHeight = 25;
    context.font = '700 20px system-ui, sans-serif';
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (currentLine && context.measureText(candidate).width > maxTextWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
      if (lines.length === maxLines - 1) break;
    }
    if (lines.length < maxLines && currentLine) lines.push(currentLine);
    if (lines.length === 0) lines.push('Water recipe');
    if (lines.length > maxLines) lines.length = maxLines;
    const lastLine = lines[lines.length - 1] ?? '';
    if (words.length > 0 && !lastLine.endsWith('…')) {
      const displayedWords = lines.join(' ').split(/\s+/).length;
      if (displayedWords < words.length) {
        let shortened = lastLine;
        while (shortened.length > 1 && context.measureText(`${shortened}…`).width > maxTextWidth) {
          shortened = shortened.slice(0, -1);
        }
        lines[lines.length - 1] = `${shortened}…`;
      }
    }

    const bandHeight = Math.max(54, lines.length * lineHeight + 14);
    context.fillStyle = 'rgba(2, 6, 23, 0.82)';
    context.fillRect(0, 0, WATER_RECIPE_IMAGE_SIZE, bandHeight);
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'top';
    lines.forEach((line, index) => {
      context.fillText(line, WATER_RECIPE_IMAGE_SIZE / 2, 7 + index * lineHeight);
    });

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode the profile image.'));
      }, 'image/png');
    });
    return new Uint8Array(await pngBlob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(sourceUrlObject);
  }
}

export type SaltRow = { target: string; formIdx: number };
const MEME_SALT_IDS = new Set(['calact', 'mggly']);
const WATERMANCER_SALT_ORDER = [
  'mgcl2',
  'cacl2',
  'nacl',
  'kcl',
  'mgso4',
  'nahco3',
  'khco3',
  'calact',
  'mggly',
  'mgcit',
  'cacit',
] as const;
export type ConcentrateRecipeHandoff = {
  name: string;
  salts: Record<string, SaltRecipeEntry>;
  finalLiters: number;
};
type ConcentrateStrategy = 'gh-kh' | 'all-in-one' | 'individual';
type ConcentratePlanSnapshot = {
  strategy: ConcentrateStrategy;
  strategyLabel: string;
  strength: number;
  maxSafeStrength: number | null;
  dropperStyle: LotusDropperStyle;
  straightDropsPerMl: number;
  measuredDropsPerMl: number | null;
  activeDropsPerMl: number;
  finalLiters: number;
  totalSaltMgPerMl: number;
  totalSaltMgPerDrop: number;
  saltEquivalentPpmPerDrop: number;
  dropsPerLiter: number;
  batchDrops: number;
  groups: Array<{
    id: string;
    name: string;
    volumeMl: number;
    strength: number;
    maxSafeStrength: number;
    saltIds: string[];
  }>;
};

const ION_TOOLTIP_KEYWORDS = /\b(acid(?:ity|ic)?|sweet(?:ness)?|dull|bitter|dry|smooth(?:er)?|full(?:er)?|sour|metallic|salty|brackish|chalky|harsh|clear|bright|flavor)\b/gi;

function renderIonTooltipText(text: string): ReactNode {
  return text.split(ION_TOOLTIP_KEYWORDS).map((part, index) =>
    index % 2 === 1
      ? <strong key={`${part}-${index}`} className="font-semibold text-cyan-200">{part}</strong>
      : part,
  );
}

export function computeRecipeStockSaltMassMg(
  targetPpm: number,
  stockVolumeMl: number,
  strength: number,
  hydrationMass: number,
  anhydrousMass: number,
): number {
  if (
    !Number.isFinite(targetPpm) || targetPpm <= 0
    || !Number.isFinite(stockVolumeMl) || stockVolumeMl <= 0
    || !Number.isFinite(strength) || strength <= 0
  ) {
    return 0;
  }
  return computeSaltMg(targetPpm, stockVolumeMl / 1000, hydrationMass, anhydrousMass) * strength;
}

export type RecipeConcentrateSaltDropContribution = {
  saltId: string;
  saltName: string;
  targetPpm: number;
  formLabel: string;
  saltMgPerMl: number;
  saltMgPerDrop: number;
  ionPpmPerDrop: Partial<Record<IonId, number>>;
};

export type RecipeConcentrateDropEquivalents = {
  valid: boolean;
  totalSaltMgPerMl: number;
  totalSaltEquivalentMgPerMl: number;
  totalSaltMgPerDrop: number;
  saltEquivalentPpmPerDrop: number;
  dropsPerLiter: number;
  batchDrops: number;
  ionPpmPerDrop: Partial<Record<IonId, number>>;
  perSalt: RecipeConcentrateSaltDropContribution[];
};

/**
 * Convert a recipe's canonical salt targets into physical drop equivalents.
 * Salt mass includes the selected hydration form; ion mass remains based on
 * the canonical anhydrous-equivalent target so recipe proportions are kept.
 */
export function computeRecipeConcentrateDropEquivalents({
  saltTargets,
  formIdxBySaltId = {},
  strength,
  dropsPerMl,
  finalLiters,
}: {
  saltTargets: Record<string, number>;
  formIdxBySaltId?: Record<string, number>;
  strength: number;
  dropsPerMl: number;
  finalLiters: number;
}): RecipeConcentrateDropEquivalents {
  const validInputs = Number.isFinite(strength) && strength > 0
    && Number.isFinite(dropsPerMl) && dropsPerMl > 0
    && Number.isFinite(finalLiters) && finalLiters > 0;
  const activeSalts = SALTS.flatMap(salt => {
    const target = Number(saltTargets[salt.id] ?? 0);
    if (!Number.isFinite(target) || target <= 0) return [];
    const requestedFormIdx = formIdxBySaltId[salt.id];
    const formIdx = Number.isInteger(requestedFormIdx)
      ? requestedFormIdx
      : salt.defaultFormIdx ?? 0;
    const form = salt.hydrationForms[formIdx] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0] ?? salt.hydrationForms[0];
    if (!form) return [];
    return [{ salt, target, form }];
  });
  if (!validInputs || activeSalts.length === 0) {
    return {
      valid: false,
      totalSaltMgPerMl: 0,
      totalSaltEquivalentMgPerMl: 0,
      totalSaltMgPerDrop: 0,
      saltEquivalentPpmPerDrop: 0,
      dropsPerLiter: 0,
      batchDrops: 0,
      ionPpmPerDrop: {},
      perSalt: [],
    };
  }

  const perSalt = activeSalts.map(({ salt, target, form }) => {
    const saltMgPerMl = target * strength * form.molarMass / salt.anhydrousMass / 1000;
    const saltMgPerDrop = saltMgPerMl / dropsPerMl;
    const ionPpmPerDrop = Object.fromEntries(
      salt.ions.map(contribution => [
        contribution.ionId,
        target * strength * contribution.fraction / 1000 / dropsPerMl / finalLiters,
      ]),
    ) as Partial<Record<IonId, number>>;
    return {
      saltId: salt.id,
      saltName: salt.name,
      targetPpm: target,
      formLabel: form.label,
      saltMgPerMl,
      saltMgPerDrop,
      ionPpmPerDrop,
    };
  });
  const totalSaltMgPerMl = perSalt.reduce((total, row) => total + row.saltMgPerMl, 0);
  const totalSaltEquivalentMgPerMl = activeSalts.reduce(
    (total, { target }) => total + target * strength / 1000,
    0,
  );
  const totalSaltMgPerDrop = totalSaltMgPerMl / dropsPerMl;
  const saltEquivalentMgPerDrop = totalSaltEquivalentMgPerMl / dropsPerMl;
  const ionPpmPerDrop = Object.fromEntries(
    IONS.map(ion => [
      ion.id,
      perSalt.reduce((total, row) => total + (row.ionPpmPerDrop[ion.id] ?? 0), 0),
    ]),
  ) as Partial<Record<IonId, number>>;

  return {
    valid: true,
    totalSaltMgPerMl,
    totalSaltEquivalentMgPerMl,
    totalSaltMgPerDrop,
    saltEquivalentPpmPerDrop: saltEquivalentMgPerDrop / finalLiters,
    dropsPerLiter: 1000 / strength * dropsPerMl,
    batchDrops: 1000 / strength * dropsPerMl * finalLiters,
    ionPpmPerDrop,
    perSalt,
  };
}

export function mergeRecipeStepTargets(
  activeTargets: Record<string, number>,
  suggestedTargets: Record<string, number>,
): Record<string, number> {
  return Object.fromEntries(
    SALTS.map(salt => {
      const activeTarget = Number(activeTargets[salt.id] ?? 0);
      const suggestedTarget = Number(suggestedTargets[salt.id] ?? 0);
      return [salt.id, activeTarget > 0 ? activeTarget : Math.max(suggestedTarget, 0)];
    }),
  );
}

export function selectRecipePreparationTargets(
  mode: NerdLevel,
  brewerTargets: Record<string, number>,
  alchemistTargets: Record<string, number>,
  watermancerTargets: Record<string, number>,
): Record<string, number> {
  if (mode === 'brewer') return brewerTargets;
  if (mode === 'watermancer') return watermancerTargets;
  return alchemistTargets;
}
type BrewerFlavorInput = {
  brightness: number;
  body: number;
  juiciness: number;
  sweetness: number;
};
type MagnesiumPreference = 'original' | 'chlorides' | 'sulfates';
type WatermancerTargetSourceId = 'safe-profile' | 'salt-table' | `profile:${string}` | `saved:${string}` | `recipe:${string}` | `external:${string}` | `lotus:${string}` | `reference:${string}`;
type WatermancerComparisonProfile = {
  id: string;
  name: string;
  targets: Partial<Record<IonId, number>>;
};
type AppTab = 'calculator' | 'guide' | 'concentrate';
type ConcentrateMode = 'builder' | 'lotus';

const DEFAULT_WATER_PLAN_CONCENTRATE: WaterPlanConcentrateSnapshot = {
  mode: 'builder',
  saltId: 'mgso4',
  formIdx: 0,
  strengthInput: '5',
  totalStockMassInput: '50',
  calibrationDrops: '100',
  calibrationStockMass: '5',
  targetSaltMass: '40',
  doseDrops: '1',
  doseLiters: '1',
  dropperStyle: 'straight',
  straightDropsPerMlInput: String(LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML),
  recipeConcentratePlan: null,
};

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
const WATERMANCER_TARGET_SOURCE_STORAGE_KEY = 'coffee-water-watermancer-target-source';
const WATERMANCER_FEEDBACK_ENABLED_STORAGE_KEY = 'coffee-water-watermancer-ion-feedback-enabled';
const WATERMANCER_FOLLOW_ENABLED_STORAGE_KEY = 'coffee-water-watermancer-follow-enabled';
const WATERMANCER_FEEDBACK_BEFORE_FOLLOW_STORAGE_KEY = 'coffee-water-watermancer-feedback-before-follow';
const WATERMANCER_ION_SOURCE_OPTIONS: Array<{
  value: WatermancerIonSourcePreference;
  label: string;
}> = [
  { value: 'water-only', label: 'Water only' },
  { value: 'water-then-salt', label: 'Water then salt' },
  { value: 'salt-only', label: 'Salt only' },
  { value: 'dont-care', label: 'Optimized' },
];

function loadWatermancerTargetSource(): WatermancerTargetSourceId {
  try {
    const stored = localStorage.getItem(WATERMANCER_TARGET_SOURCE_STORAGE_KEY);
    if (
      stored === 'safe-profile'
      || stored === 'salt-table'
      || stored?.startsWith('profile:')
      || stored?.startsWith('saved:')
      || stored?.startsWith('recipe:')
      || stored?.startsWith('external:')
      || stored?.startsWith('lotus:')
      || stored?.startsWith('reference:')
    ) {
      return stored as WatermancerTargetSourceId;
    }
  } catch {
    // Use the default source when localStorage is unavailable.
  }
  return 'safe-profile';
}

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

function loadWatermancerBooleanPreference(key: string, fallback: boolean): boolean {
  try {
    const stored = localStorage.getItem(key);
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch {
    // Use the default when localStorage is unavailable.
  }
  return fallback;
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
      className={`volume-input ${className}`}
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

export type VolumeUnit = 'liters' | 'gallons';
export const US_GALLON_IN_LITERS = 3.785411784;

export function volumeToLiters(value: string | number, unit: VolumeUnit): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return unit === 'gallons' ? parsed * US_GALLON_IN_LITERS : parsed;
}

export function litersToVolumeInput(liters: string | number, unit: VolumeUnit): string {
  const parsed = typeof liters === 'number' ? liters : parseFloat(liters);
  if (!Number.isFinite(parsed) || parsed < 0) return '';
  if (unit === 'liters') return String(liters);
  return String(parsed / US_GALLON_IN_LITERS);
}

function volumeUnitLabel(unit: VolumeUnit): string {
  return unit === 'gallons' ? 'gallons' : 'liters';
}

function volumeUnitShortLabel(unit: VolumeUnit): string {
  return unit === 'gallons' ? 'gal' : 'L';
}

function formatVolumeValue(liters: number, unit: VolumeUnit): string {
  const value = unit === 'gallons' ? liters / US_GALLON_IN_LITERS : liters;
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function VolumeUnitToggle({
  unit,
  onToggle,
  className = '',
}: {
  unit: VolumeUnit;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-md border border-cyan-300/25 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-200 transition hover:border-cyan-200/50 hover:bg-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 ${className}`}
      aria-label={`Switch volume units to ${unit === 'liters' ? 'gallons' : 'liters'}`}
      title={`Switch to ${unit === 'liters' ? 'gallons' : 'liters'}`}
    >
      {volumeUnitLabel(unit)}
    </button>
  );
}

function VolumeInput({
  liters,
  unit,
  onChangeLiters,
  ariaLabel,
  placeholder,
  className,
  showStepper = false,
}: {
  liters: number;
  unit: VolumeUnit;
  onChangeLiters: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className: string;
  showStepper?: boolean;
}) {
  const [inputValue, setInputValue] = useState(() => litersToVolumeInput(liters, unit));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current === document.activeElement) return;
    setInputValue(litersToVolumeInput(liters, unit));
  }, [liters, unit]);

  const stepValue = (direction: -1 | 1) => {
    const currentValue = Number(litersToVolumeInput(liters, unit)) || 0;
    const nextValue = Math.max(0, Number((currentValue + direction * 0.1).toFixed(2)));
    const nextInput = String(nextValue);
    setInputValue(nextInput);
    onChangeLiters(String(volumeToLiters(nextInput, unit)));
  };

  const input = (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      min="0"
      step="0.1"
      value={inputValue}
      onChange={event => {
        const nextValue = event.target.value;
        setInputValue(nextValue);
        if (!nextValue.trim()) {
          onChangeLiters('');
          return;
        }
        if (!nextValue.endsWith('.') && Number.isFinite(Number(nextValue))) {
          onChangeLiters(String(volumeToLiters(nextValue, unit)));
        }
      }}
      onKeyDown={event => {
        if (event.key === 'e' || event.key === 'E' || event.key === '+' || event.key === '-') {
          event.preventDefault();
          return;
        }
        if (!showStepper) return;
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault();
          stepValue(event.key === 'ArrowUp' ? 1 : -1);
        }
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={`volume-input ${className}`}
    />
  );

  if (!showStepper) return input;

  return (
    <div className="grid grid-cols-[2rem_minmax(0,4.5rem)_2rem] items-center gap-1">
      <button
        type="button"
        onClick={() => stepValue(-1)}
        disabled={liters <= 0}
        aria-label={`Decrease ${ariaLabel}`}
        title="Decrease by 0.1"
        className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/20 bg-slate-950/40 text-cyan-200/70 transition-all hover:border-cyan-200/60 hover:bg-cyan-400/15 hover:text-cyan-100 active:scale-90 active:bg-cyan-300/25 disabled:cursor-not-allowed disabled:opacity-25 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
      >
        <Minus className="h-3.5 w-3.5 transition-transform group-active:scale-75" aria-hidden="true" />
      </button>
      {input}
      <button
        type="button"
        onClick={() => stepValue(1)}
        aria-label={`Increase ${ariaLabel}`}
        title="Increase by 0.1"
        className="group flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/35 bg-cyan-400/10 text-cyan-100 transition-all hover:border-cyan-200/70 hover:bg-cyan-400/25 hover:shadow-[0_0_16px_rgba(34,211,238,0.18)] active:scale-90 active:bg-cyan-300/30 focus:outline-none focus:ring-2 focus:ring-cyan-300/60"
      >
        <Plus className="h-3.5 w-3.5 transition-transform group-active:scale-75" aria-hidden="true" />
      </button>
    </div>
  );
}

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

export function computeWatermancerFinalIons(
  entries: MineralWaterEntry[],
  batchMl: number,
  saltTargets: Record<string, number>,
): Record<IonId, number> {
  return computeIonTotals(
    saltTargets,
    computeWatermancerBottledIons(entries, batchMl),
    1,
  );
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

  const solveGlobalSaltTargets = (): Record<string, number> | null => {
    const weights = IONS.map(ion => {
      const target = targetIons[ion.id] ?? 0;
      if (target <= 0) return 4;
      return overshootPolicy?.softDeficitIons?.includes(ion.id) ? 2 : 12;
    });
    return solveBoundedCoupledSaltTargets({
      allowedSalts,
      fixedIonTotals,
      targetIons,
      ionWeights: Object.fromEntries(IONS.map((ion, index) => [ion.id, weights[index]])),
      scoreCandidate: scoreForSaltTargets,
      minimumDosePpmFor,
      maxDosePpm: 5000,
    })?.saltTargets ?? null;
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

function loadHasSavedDropperCalibration(): boolean {
  try {
    return localStorage.getItem(DROPPER_CALIBRATION_STORAGE_KEY) !== null;
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
    diagnostics: watermancerRouteDiagnostics({
      plan: {
        ...routePlan,
        selectedWaters,
        fixedWaterVolumes: Object.fromEntries(
          selectedWaters.map(entry => [entry.id, num(entry.volumeMl)]),
        ),
      },
      saltTargets: allSaltTargets,
      finalIons,
      deviations,
      score,
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
    diagnostics: watermancerRouteDiagnostics({
      plan: candidatePlan,
      saltTargets: allSaltTargets,
      finalIons,
      deviations,
      score: score + hardnessPenalty,
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
    (total, deviation) => total + Math.abs(watermancerDeviationBeyondPolicy(deviation, plan)),
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
    explanation: watermancerPrimaryExplanation(primaryPlan, alternatives),
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

const COMMUNITY_BROWSER_ION_IDS: IonId[] = [
  'magnesium', 'bicarbonate', 'sodium', 'calcium', 'sulfate', 'chloride', 'potassium',
];

const communityBrowserIonLabel = (id: IonId): string => ION_MAP[id]?.formula ?? id;

function communityBrowserNote(water: CommunityWater): { text: string; ionIds: IonId[] } {
  const ranked = COMMUNITY_BROWSER_ION_IDS
    .map(id => ({ id, value: Number(water.ions[id] ?? 0) }))
    .sort((a, b) => b.value - a.value);
  const top = ranked[0];
  const second = ranked[1];
  if (!top || top.value <= 0) return { text: 'low mineral canvas', ionIds: ['bicarbonate'] };
  if (top.id === 'bicarbonate' && second?.id === 'magnesium') return { text: 'high Mg + buffer', ionIds: ['magnesium', 'bicarbonate'] };
  if (top.id === 'sodium' && second?.id === 'chloride') return { text: 'high sodium + chloride', ionIds: ['sodium', 'chloride'] };
  if (top.id === 'sulfate' && second?.id === 'calcium') return { text: 'sulfate + body', ionIds: ['sulfate', 'calcium'] };
  if (top.id === 'calcium' && second?.id === 'sulfate') return { text: 'calcium + sulfate', ionIds: ['calcium', 'sulfate'] };
  return {
    text: `high ${ION_MAP[top.id].name.toLowerCase()}`,
    ionIds: second && second.value > 0 ? [top.id, second.id] : [top.id],
  };
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

const COMPARISON_ION_LABELS = Object.fromEntries(
  IONS.map(ion => [ion.id, ion.formula]),
) as Record<IonId, string>;

type IonVisualStyle = CSSProperties & Record<`--ion-${string}`, string>;

function ionVisualStyle(id: IonId): IonVisualStyle {
  const color = ION_MAP[id].color;
  return {
    '--ion-fg': color.foreground,
    '--ion-light-fg': color.lightForeground,
    '--ion-soft': color.soft,
    '--ion-border': color.border,
    '--ion-bar': color.bar,
    '--ion-shadow': color.shadow,
  };
}

function saltVisualStyle(salt: typeof SALTS[number]): CSSProperties {
  const color = getSaltColorTokens(salt);
  return {
    borderColor: color.border,
    backgroundImage: `linear-gradient(135deg, ${color.primarySoft}, ${color.secondarySoft})`,
    boxShadow: `inset 3px 0 0 ${color.primary}, inset -3px 0 0 ${color.secondary}`,
  };
}

function SaltIonBadges({
  salt,
  className = '',
}: {
  salt: typeof SALTS[number];
  className?: string;
}) {
  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${className}`} aria-label={`Ions in ${salt.name}`}>
      {salt.ions.map(({ ionId }, index) => (
        <span key={ionId} className="inline-flex items-center gap-1" title={ION_MAP[ionId].name}>
          {index > 0 && <span className="text-slate-600">+</span>}
          <span className="font-semibold text-[color:var(--ion-fg)]" style={ionVisualStyle(ionId)}>
            {ION_MAP[ionId].formula}
          </span>
        </span>
      ))}
    </span>
  );
}

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

function WaterPlanManager({
  plans,
  open,
  onOpen,
  onClose,
  onSave,
  onRestore,
  onDuplicate,
  onRename,
  onDelete,
  onImport,
}: {
  plans: WaterPlan[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSave: (name: string) => WaterPlan | null;
  onRestore: (plan: WaterPlan) => void;
  onDuplicate: (plan: WaterPlan) => WaterPlan;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onImport: (plan: WaterPlan) => void;
}) {
  const [name, setName] = useState('');
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [importError, setImportError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const plan = onSave(name);
    if (plan) setName('');
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const imported = parseWaterPlanFile(await file.text());
    if (!imported) {
      setImportError(true);
      return;
    }
    setImportError(false);
    onImport(imported);
  };

  const handleExport = (plan: WaterPlan) => {
    const blob = new Blob([serializeWaterPlanFile(plan)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'water-plan'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-white/20 bg-black/15 px-2.5 py-2 text-xs font-semibold text-white/85 transition hover:border-white/40 hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-transparent sm:min-h-0 sm:py-1.5"
        aria-label={`Open saved calculator sessions${plans.length ? `, ${plans.length} saved` : ''}`}
        title="Save and restore the entire calculator session"
      >
        <Save className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Sessions</span>
        {plans.length > 0 && (
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] tabular-nums text-white/80">
            {plans.length}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/75 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="presentation"
          onClick={onClose}
        >
          <section
            className="my-2 flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-900 shadow-2xl shadow-slate-950/70 sm:my-0 sm:max-h-[calc(100dvh-3rem)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="water-plans-title"
            onClick={event => event.stopPropagation()}
          >
            <header className="flex items-start justify-between gap-3 border-b border-cyan-300/15 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent px-4 py-4 sm:px-5">
              <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">Reusable sessions</div>
              <h2 id="water-plans-title" className="mt-1 text-lg font-semibold text-white">Saved calculator sessions</h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
                Save the entire calculator session — workspace, recipe, waters, targets, salts, and settings — as a reusable snapshot.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700/70 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label="Close saved water plans"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <div className="space-y-3 overflow-y-auto p-4 sm:p-5">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200/80">Save current session as a new snapshot</div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') handleSave();
                    }}
                    placeholder="e.g. Bright washed coffee session"
                    className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-700/70 bg-slate-950/50 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-emerald-300/60 focus:ring-2 focus:ring-emerald-300/30"
                    aria-label="New calculator session name"
                  />
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!name.trim()}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    Save session
                  </button>
                </div>
              </div>

              {importError && (
                <div className="rounded-lg border border-rose-400/25 bg-rose-500/[0.08] px-3 py-2 text-[11px] text-rose-200">
                  That file is not a valid Coffee Water plan.
                </div>
              )}

              {plans.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-950/25 px-4 py-8 text-center">
                  <div className="text-sm font-semibold text-slate-300">No saved sessions yet</div>
                  <p className="mt-1 text-xs text-slate-500">Name the current session above to keep it as a reusable snapshot.</p>
                </div>
              ) : (
                <div className="space-y-2">
                   {plans.map(plan => {
                     const autoSaved = isAutoSavedWaterPlan(plan);
                     return (
                     <article
                       key={plan.id}
                       className={`water-plan-card rounded-xl border p-3 ${
                         autoSaved
                           ? 'water-plan-card--autosaved border-sky-300/35 bg-sky-500/[0.07]'
                           : 'border-slate-700/70 bg-slate-950/35'
                       }`}
                     >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                         <div className="flex min-w-0 items-start gap-2.5">
                           <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                             autoSaved
                               ? 'border-sky-300/35 bg-sky-400/15 text-sky-200'
                               : 'border-indigo-300/25 bg-indigo-400/10 text-indigo-200'
                           }`}>
                             <Save className="h-3.5 w-3.5" aria-hidden="true" />
                           </div>
                           <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-semibold text-slate-100">{plan.name}</div>
                             {autoSaved && (
                              <span className="shrink-0 rounded-full border border-sky-300/30 bg-sky-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sky-200">
                                 Live draft
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                             {autoSaved ? 'Continuously saved' : `${plan.snapshot.nerdLevel} · Reusable snapshot`} · Updated {new Date(plan.updatedAt).toLocaleDateString()}
                          </div>
                           </div>
                        </div>
                         <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                          {renameId === plan.id ? (
                            <>
                              <input
                                type="text"
                                value={renameName}
                                onChange={event => setRenameName(event.target.value)}
                                onKeyDown={event => {
                                  if (event.key === 'Enter' && renameName.trim()) {
                                    onRename(plan.id, renameName);
                                    setRenameId(null);
                                  }
                                }}
                                className="min-h-9 w-40 rounded-lg border border-sky-300/40 bg-slate-950/70 px-2.5 text-[11px] text-slate-100 outline-none focus:ring-2 focus:ring-sky-300/30"
                                aria-label={`Rename ${plan.name}`}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (!renameName.trim()) return;
                                  onRename(plan.id, renameName);
                                  setRenameId(null);
                                }}
                                disabled={!renameName.trim()}
                                className="inline-flex min-h-9 items-center rounded-lg bg-sky-500/20 px-2.5 text-[11px] font-semibold text-sky-100 ring-1 ring-sky-300/30 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setRenameId(null)}
                                className="inline-flex min-h-9 items-center rounded-lg border border-slate-700/70 px-2.5 text-[11px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
                              >
                                Cancel
                              </button>
                            </>
                          ) : restoreId === plan.id ? (
                            <>
                              <span className="mr-1 text-[10px] text-amber-200">Replace current setup?</span>
                              <button
                                type="button"
                                onClick={() => onRestore(plan)}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-amber-500/20 px-2.5 text-[11px] font-semibold text-amber-100 ring-1 ring-amber-300/30 transition hover:bg-amber-500/30"
                              >
                                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => setRestoreId(null)}
                                className="inline-flex min-h-9 items-center rounded-lg border border-slate-700/70 px-2.5 text-[11px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
                              >
                                Cancel
                              </button>
                            </>
                          ) : deleteId === plan.id ? (
                            <>
                              <span className="mr-1 text-[10px] text-rose-200">Delete this plan?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDelete(plan.id);
                                  setDeleteId(null);
                                }}
                                className="inline-flex min-h-9 items-center rounded-lg bg-rose-500/20 px-2.5 text-[11px] font-semibold text-rose-100 ring-1 ring-rose-300/30 transition hover:bg-rose-500/30"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteId(null)}
                                className="inline-flex min-h-9 items-center rounded-lg border border-slate-700/70 px-2.5 text-[11px] text-slate-400 transition hover:bg-slate-800 hover:text-white"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setRestoreId(plan.id)}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-cyan-500/15 px-2.5 text-[11px] font-semibold text-cyan-100 ring-1 ring-cyan-300/25 transition hover:bg-cyan-500/25"
                              >
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => onDuplicate(plan)}
                                className="inline-flex min-h-9 items-center rounded-lg border border-slate-700/70 px-2.5 text-[11px] text-slate-300 transition hover:bg-slate-800 hover:text-white"
                              >
                                Duplicate
                              </button>
                               {!autoSaved && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRenameId(plan.id);
                                    setRenameName(plan.name);
                                    setRestoreId(null);
                                    setDeleteId(null);
                                  }}
                                  className="inline-flex min-h-9 items-center rounded-lg border border-slate-700/70 px-2.5 text-[11px] text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                >
                                  Rename
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleExport(plan)}
                                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-700/70 px-2.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                                aria-label={`Export ${plan.name}`}
                                title="Export plan"
                              >
                                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                               {!autoSaved && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteId(plan.id)}
                                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-700/70 px-2.5 text-slate-400 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
                                  aria-label={`Delete ${plan.name}`}
                                  title="Delete plan"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                     </article>
                     );
                   })}
                </div>
              )}
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/60 px-4 py-3 sm:px-5">
              <span className="text-[10px] text-slate-500">Plans stay in this browser unless exported.</span>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleImport}
                  className="hidden"
                  aria-label="Import a water plan file"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700/70 px-2.5 text-[11px] font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Import plan
                </button>
              </div>
            </footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

type RecipePickerOption = {
  value: string;
  label: string;
};

type RecipePickerGroup = {
  label: string;
  options: RecipePickerOption[];
  accent: 'cyan' | 'violet' | 'emerald' | 'amber';
};

function MineralRecipePicker({
  value,
  groups,
  onChange,
}: {
  value: string;
  groups: RecipePickerGroup[];
  onChange: (value: string) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 240,
    maxHeight: 360,
    openAbove: false,
  });
  const options = useMemo(() => groups.flatMap(group => group.options), [groups]);
  const selectedOption = options.find(option => option.value === value) ?? options[0];

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const belowSpace = window.innerHeight - rect.bottom - 12;
    const aboveSpace = rect.top - 12;
    const openAbove = belowSpace < 240 && aboveSpace > belowSpace;
    const maxHeight = Math.max(180, Math.min(360, openAbove ? aboveSpace : belowSpace));
    setMenuPosition({
      top: openAbove ? rect.top - maxHeight - 6 : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 260),
      maxHeight,
      openAbove,
    });
  };

  useEffect(() => {
    const selectedIndex = Math.max(0, options.findIndex(option => option.value === value));
    setActiveIndex(selectedIndex);
  }, [value, options.length]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleViewportChange = () => updatePosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const selectOption = (option: RecipePickerOption) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
        ? options.length - 1
        : Math.min(options.length - 1, Math.max(0, activeIndex + delta));
      setActiveIndex(nextIndex);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        const option = options[activeIndex];
        if (option) selectOption(option);
      }
    }
  };

  const accentStyles = {
    cyan: 'text-cyan-200',
    violet: 'text-violet-200',
    emerald: 'text-emerald-200',
    amber: 'text-amber-200',
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select mineral recipe"
        onClick={() => setOpen(previous => !previous)}
        onKeyDown={handleKeyDown}
        className={`inline-flex h-10 max-w-[260px] items-center gap-2 rounded-xl border px-3 text-left text-[11px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-indigo-300/70 ${
          open
            ? 'border-cyan-300/70 bg-indigo-900/80 text-white shadow-lg shadow-cyan-950/30'
            : 'border-indigo-300/35 bg-gradient-to-r from-indigo-950/80 via-slate-900/80 to-cyan-950/70 text-indigo-100 hover:border-cyan-300/60 hover:text-white'
        }`}
      >
        <FlaskConical className="h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label ?? 'Custom'}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-cyan-300 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Mineral recipes"
          className="fixed z-[100] overflow-y-auto rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-1.5 shadow-2xl shadow-indigo-950/60 ring-1 ring-white/10 backdrop-blur-xl"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
            maxHeight: menuPosition.maxHeight,
          }}
        >
          {groups.map(group => (
            <div key={group.label} role="group" aria-label={group.label} className="mb-1.5 last:mb-0">
              <div className={`flex items-center gap-2 px-2.5 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[0.18em] ${accentStyles[group.accent]}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" aria-hidden="true" />
                {group.label}
              </div>
              {group.options.map(option => {
                const optionIndex = options.findIndex(item => item.value === option.value);
                const selected = option.value === value;
                const active = optionIndex === activeIndex;
                return (
                  <button
                    key={option.value}
                    ref={element => { optionRefs.current[optionIndex] = element; }}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(optionIndex)}
                    onClick={() => selectOption(option)}
                    className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[11px] transition ${
                      selected
                        ? 'bg-cyan-400/15 text-cyan-50 ring-1 ring-cyan-300/35'
                        : active
                        ? 'bg-indigo-400/15 text-indigo-50'
                        : 'text-slate-300 hover:bg-indigo-400/10 hover:text-white'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${selected ? 'bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]' : 'bg-slate-700'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {selected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

function useDebouncedPersistence(
  persist: () => void,
  dependencies: DependencyList,
  delayMs = 250,
) {
  const persistRef = useRef(persist);
  const timerRef = useRef<number | null>(null);
  persistRef.current = persist;

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    persistRef.current();
  }, []);

  useEffect(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(flush, delayMs);
  }, dependencies);

  useEffect(() => {
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);
}

function DeferredMount({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setMounted(true);
      observer.disconnect();
    }, { rootMargin: '240px 0px' });
    observer.observe(host);
    return () => observer.disconnect();
  }, [mounted]);

  return <div ref={hostRef}>{mounted ? children : fallback}</div>;
}

function App() {
  const [liters, setLiters] = useState('1');
  const [rows, setRows] = useState<SaltRow[]>(
    SALTS.map(s => ({ target: '', formIdx: s.defaultFormIdx ?? 0 })),
  );
  const [targetInputDrafts, setTargetInputDrafts] = useState<Record<string, string>>({});
  const [directDoseInputDrafts, setDirectDoseInputDrafts] = useState<Record<string, string>>({});
  const directDoseInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [showAdvancedHydrationForms, setShowAdvancedHydrationForms] = useState(false);
  const [showMemeSalts, setShowMemeSalts] = useState(false);
  const [memeSaltFlashNonce, setMemeSaltFlashNonce] = useState(0);
  // Keep calculations/rendering safe across hot reloads and older in-memory
  // state when a new salt is added to the shared catalog.
  const safeRows = useMemo(
    () => SALTS.map((salt, index) => rows[index] ?? {
      target: '',
      formIdx: salt.defaultFormIdx ?? 0,
    }),
    [rows],
  );
  const concentrateDiySaltForms = useMemo(
    () => Object.fromEntries(SALTS.map((salt, index) => [salt.id, safeRows[index].formIdx])),
    [safeRows],
  );
  const [mineralWaters, setMineralWaters] = useState<MineralWaterEntry[]>([]);
  const [additionWaters, setAdditionWaters] = useState<MineralWaterEntry[]>([]);
  const [watermancerFollowEnabled, setWatermancerFollowEnabled] = useState(
    () => loadWatermancerBooleanPreference(WATERMANCER_FOLLOW_ENABLED_STORAGE_KEY, false),
  );
  const [watermancerResultDock, setWatermancerResultDock] = useState<'center' | 'left' | 'right'>('center');
  const [watermancerFeedbackEnabled, setWatermancerFeedbackEnabled] = useState(
    () => watermancerFollowEnabled
      ? false
      : loadWatermancerBooleanPreference(WATERMANCER_FEEDBACK_ENABLED_STORAGE_KEY, true),
  );
  const watermancerFeedbackBeforeFollowRef = useRef<boolean | null>(
    watermancerFollowEnabled
      ? loadWatermancerBooleanPreference(WATERMANCER_FEEDBACK_BEFORE_FOLLOW_STORAGE_KEY, false)
      : null,
  );
  const [watermancerSpotlightIonIds, setWatermancerSpotlightIonIds] = useState<IonId[]>([]);
  const watermancerSpotlightTimerRef = useRef<number | null>(null);
  const clearWatermancerFeedback = useCallback(() => {
    if (watermancerSpotlightTimerRef.current !== null) {
      window.clearTimeout(watermancerSpotlightTimerRef.current);
      watermancerSpotlightTimerRef.current = null;
    }
    setWatermancerSpotlightIonIds([]);
  }, []);
  const spotlightWatermancerIons = useCallback((ionIds: IonId[]) => {
    if (!watermancerFeedbackEnabled) return;
    const nextIonIds = ACTIVE_ION_IDS.filter(id => ionIds.includes(id));
    if (nextIonIds.length === 0) return;
    if (watermancerSpotlightTimerRef.current !== null) {
      window.clearTimeout(watermancerSpotlightTimerRef.current);
    }
    setWatermancerSpotlightIonIds(nextIonIds);
    watermancerSpotlightTimerRef.current = window.setTimeout(() => {
      setWatermancerSpotlightIonIds([]);
      watermancerSpotlightTimerRef.current = null;
    }, 3200);
  }, [watermancerFeedbackEnabled]);
  useEffect(() => () => {
    if (watermancerSpotlightTimerRef.current !== null) {
      window.clearTimeout(watermancerSpotlightTimerRef.current);
    }
  }, []);
  const toggleWatermancerFeedback = () => {
    if (watermancerFollowEnabled) return;
    const next = !watermancerFeedbackEnabled;
    setWatermancerFeedbackEnabled(next);
    if (!next) {
      clearWatermancerFeedback();
    }
  };
  const toggleWatermancerFollow = () => {
    const next = !watermancerFollowEnabled;
    setWatermancerFollowEnabled(next);
    if (next) {
      watermancerFeedbackBeforeFollowRef.current = watermancerFeedbackEnabled;
      setWatermancerFeedbackEnabled(false);
      clearWatermancerFeedback();
    } else {
      const previousFeedbackEnabled = watermancerFeedbackBeforeFollowRef.current;
      watermancerFeedbackBeforeFollowRef.current = null;
      if (previousFeedbackEnabled !== null) {
        setWatermancerFeedbackEnabled(previousFeedbackEnabled);
      }
    }
  };
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
  const [watermancerMatchMode, setWatermancerMatchMode] = useState<'automatic' | 'manual'>('automatic');
  const [watermancerManualRoute, setWatermancerManualRoute] = useState<WatermancerRouteCandidate | null>(null);
  const watermancerMatchModeRef = useRef<'automatic' | 'manual'>('automatic');
  const watermancerAutomaticRouteRef = useRef<WatermancerRouteCandidate | null>(null);
  function enterWatermancerManualMode() {
    if (nerdLevel !== 'watermancer' || watermancerMatchModeRef.current === 'manual') return;
    const route = watermancerAutomaticRouteRef.current;
    if (route) setWatermancerManualRoute(cloneWatermancerRouteCandidate(route));
    watermancerMatchModeRef.current = 'manual';
    setWatermancerMatchMode('manual');
    setWatermancerAppliedBestMatchRoute(null);
    setWatermancerBestMatchPreview(null);
    setWatermancerBestMatchMessage(null);
  }
  const addMineralWater = (partial?: { name?: string; ions?: Partial<Record<IonId, string>>; metadata?: Partial<Record<keyof WaterMetadata, string>>; volumeMl?: string; sourceLocalId?: string }) => {
    enterWatermancerManualMode();
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
    enterWatermancerManualMode();
    setMineralWaters(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };
  const removeMineralWater = (id: string) => {
    enterWatermancerManualMode();
    setMineralWaters(prev => prev.filter(e => e.id !== id));
  };
  useEffect(() => {
    if (mineralWaters.some(entry => num(entry.volumeMl) > 0)) {
      setFillWaterNudgeSeen(true);
    }
  }, [mineralWaters]);
  const addAdditionWater = (partial?: { name?: string; ions?: Partial<Record<IonId, string>>; metadata?: Partial<Record<keyof WaterMetadata, string>>; volumeMl?: string }) => {
    enterWatermancerManualMode();
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
    enterWatermancerManualMode();
    setAdditionWaters(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };
  const removeAdditionWater = (id: string) => {
    enterWatermancerManualMode();
    setAdditionWaters(prev => prev.filter(e => e.id !== id));
  };
  const watermancerWaterVolumeBaselineRef = useRef(
    new Map<string, { volume: number; ionValues: Record<IonId, number> }>(),
  );
  useEffect(() => {
    const entries = [...mineralWaters, ...additionWaters];
    const nextBaseline = new Map(
      entries.map(entry => [
        entry.id,
        {
          volume: Math.max(0, num(entry.volumeMl)),
          ionValues: Object.fromEntries(
            ACTIVE_ION_IDS.map(id => [id, num(entry.ions[id] ?? '')]),
          ) as Record<IonId, number>,
        },
      ] as const),
    );
    const adjustedIonIds = new Set<IonId>();
    for (const [id, next] of nextBaseline) {
      const previous = watermancerWaterVolumeBaselineRef.current.get(id);
      if (previous) {
        if (next.volume !== previous.volume) {
          ACTIVE_ION_IDS.forEach(ionId => {
            if (previous.ionValues[ionId] > 0 || next.ionValues[ionId] > 0) {
              adjustedIonIds.add(ionId);
            }
          });
        }
        if (next.volume > 0) {
          ACTIVE_ION_IDS.forEach(ionId => {
            if (next.ionValues[ionId] !== previous.ionValues[ionId]) {
              adjustedIonIds.add(ionId);
            }
          });
        }
      } else if (next.volume > 0) {
        ACTIVE_ION_IDS.forEach(ionId => {
          if (next.ionValues[ionId] > 0) adjustedIonIds.add(ionId);
        });
      }
    }
    watermancerWaterVolumeBaselineRef.current = nextBaseline;
    if (adjustedIonIds.size > 0) {
      spotlightWatermancerIons([...adjustedIonIds]);
    }
  }, [additionWaters, mineralWaters, spotlightWatermancerIons]);
  useDebouncedPersistence(() => {
    localStorage.setItem(AUTO_FILL_SETTINGS_STORAGE_KEY, JSON.stringify({
      preset: autoFillPriorityPreset,
      customPriority: autoFillCustomPriority,
      deviationPpm: autoFillDeviationPpm,
    }));
  }, [autoFillPriorityPreset, autoFillCustomPriority, autoFillDeviationPpm]);
  useDebouncedPersistence(() => {
    localStorage.setItem(WATERMANCER_OVERSHOOT_STORAGE_KEY, JSON.stringify(overshootSettings));
  }, [overshootSettings]);
  useDebouncedPersistence(() => {
    localStorage.setItem(DROPPER_CALIBRATION_STORAGE_KEY, String(brewerDropsPerMl));
  }, [brewerDropsPerMl]);
  useDebouncedPersistence(() => {
    localStorage.setItem(WATERMANCER_FEEDBACK_ENABLED_STORAGE_KEY, String(watermancerFeedbackEnabled));
    localStorage.setItem(WATERMANCER_FOLLOW_ENABLED_STORAGE_KEY, String(watermancerFollowEnabled));
    if (watermancerFollowEnabled && watermancerFeedbackBeforeFollowRef.current !== null) {
      localStorage.setItem(
        WATERMANCER_FEEDBACK_BEFORE_FOLLOW_STORAGE_KEY,
        String(watermancerFeedbackBeforeFollowRef.current),
      );
    } else {
      localStorage.removeItem(WATERMANCER_FEEDBACK_BEFORE_FOLLOW_STORAGE_KEY);
    }
  }, [watermancerFeedbackEnabled, watermancerFollowEnabled]);

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
  const communityWatersRequestRef = useRef<Promise<void> | null>(null);
  const [communityShareStatus, setCommunityShareStatus] = useState<Record<string, 'sharing' | 'shared' | 'error'>>({});
  const [communitySearch, setCommunitySearch] = useState('');
  const [communitySortIon, setCommunitySortIon] = useState<IonId | 'name'>('magnesium');
  const [communitySortDescending, setCommunitySortDescending] = useState(true);
  const [waterComparisonOpen, setWaterComparisonOpen] = useState(false);
  const [alchemistMineralWaterOpen, setAlchemistMineralWaterOpen] = useState(false);
  const [selectedWaterComparisonKey, setSelectedWaterComparisonKey] = useState('');
  const loadCommunityWaters = useCallback(() => {
    if (communityWatersRequestRef.current) return communityWatersRequestRef.current;
    const request = (async () => {
      setCommunityLoading(true);
      try {
        const resp = await fetch(`${API_BASE}/api/waters`);
        if (resp.ok) {
          const data = await resp.json();
          setCommunityWaters(data.waters ?? []);
        }
      } catch { /* server may be down */ }
      finally {
        setCommunityWatersLoaded(true);
        setCommunityLoading(false);
      }
    })();
    communityWatersRequestRef.current = request;
    void request.finally(() => {
      if (communityWatersRequestRef.current === request) {
        communityWatersRequestRef.current = null;
      }
    });
    return request;
  }, []);
  const openCommunityModal = async () => {
    setCommunityModalOpen(true);
    if (!communityWatersLoaded) await loadCommunityWaters();
  };
  const communityVisibleWaters = useMemo(() => {
    const query = communitySearch.trim().toLowerCase();
    return communityWaters
      .filter(w => w.shared === 'yes')
      .filter(w => !query || w.name.toLowerCase().includes(query))
      .slice()
      .sort((a, b) => {
        if (communitySortIon === 'name') return (communitySortDescending ? 1 : -1) * a.name.localeCompare(b.name);
        const delta = Number(b.ions[communitySortIon] ?? 0) - Number(a.ions[communitySortIon] ?? 0);
        return delta === 0
          ? a.name.localeCompare(b.name)
          : (communitySortDescending ? 1 : -1) * delta;
      });
  }, [communityWaters, communitySearch, communitySortIon, communitySortDescending]);

  // Profile + settings state
  const [profiles, setProfiles] = useState<WaterProfile[]>(() => loadProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(AIKI_DEFAULT_PROFILE.id);
  const [showBrewerSteps, setShowBrewerSteps] = useState<'dry' | 'dropper' | null>(null);
  const [recipeStepsPromptDismissed, setRecipeStepsPromptDismissed] = useState(false);
  const [appTab, setAppTab] = useState<AppTab>('calculator');
  const [prepMethod, setPrepMethod] = useState<BrewerPrepMethod>('dropper');
  const [savedPlans, setSavedPlans] = useState<WaterPlan[]>(() => loadWaterPlans());
  const [plansOpen, setPlansOpen] = useState(false);
  const [concentrateRecipeHandoff, setConcentrateRecipeHandoff] = useState<ConcentrateRecipeHandoff | null>(null);
  const [concentrateSnapshot, setConcentrateSnapshot] = useState<WaterPlanConcentrateSnapshot>(DEFAULT_WATER_PLAN_CONCENTRATE);
  const [pendingConcentrateRestore, setPendingConcentrateRestore] = useState<WaterPlanConcentrateSnapshot | null>(null);
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>('liters');
  const [nerdLevel, setNerdLevel] = useState<NerdLevel>(() => (
    loadNerdLevel() === 'watermancer' ? 'watermancer' : 'alchemist'
  ));
  const [watermancerTargetSource, setWatermancerTargetSource] = useState<WatermancerTargetSourceId>(
    () => loadWatermancerTargetSource(),
  );
  const [watermancerTargetOverride, setWatermancerTargetOverride] = useState<IonicTargetValues | null>(null);
  const [watermancerImportedRecipeName, setWatermancerImportedRecipeName] = useState<string | null>(null);
  const [watermancerUsedSaltIds, setWatermancerUsedSaltIds] = useState<string[]>([]);
  const [showWatermancerMemeSalts, setShowWatermancerMemeSalts] = useState(false);
  const [watermancerMemeSaltFlashNonce, setWatermancerMemeSaltFlashNonce] = useState(0);
  const [autoCraftPreset, setAutoCraftPreset] = useState<AutoCraftPreset>('closest-match');
  const [watermancerSaltObjective, setWatermancerSaltObjective] = useState<AutoCraftObjective>('balanced');
  const [watermancerRecalculationNonce, setWatermancerRecalculationNonce] = useState(0);
  const [watermancerBestMatchDeviationMode, setWatermancerBestMatchDeviationMode] = useState<WatermancerBestMatchDeviationMode | null>(null);
  const [watermancerIonSourcePreferences, setWatermancerIonSourcePreferences] = useState<Record<IonId, WatermancerIonSourcePreference>>(
    () => loadWatermancerIonSourcePreferences(),
  );
  useDebouncedPersistence(() => {
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
  const watermancerActionBusyRef = useRef(false);
  const watermancerActionGenerationRef = useRef(0);
   const [watermancerDoseOverridesMg, setWatermancerDoseOverridesMg] = useState<Record<string, number>>({});
   const [watermancerDoseInputDrafts, setWatermancerDoseInputDrafts] = useState<Record<string, string>>({});
   const watermancerDoseInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [watermancerShareStatus, setWatermancerShareStatus] = useState<'idle' | 'downloaded' | 'shared' | 'error'>('idle');
  const [watermancerWorkflowRailPinned, setWatermancerWorkflowRailPinned] = useState(false);
  const watermancerWorkflowRailRef = useRef<HTMLDivElement>(null);
  const watermancerWorkflowRailPinnedRef = useRef(false);
  const watermancerWorkflowRailHeightRef = useRef(0);
  const watermancerWorkflowRailTriggerRef = useRef<number | null>(null);
  const [sodiumCorrectionOn, setSodiumCorrectionOn] = useState(false);
  const [wmProfiles, setWmProfiles] = useState<WatermancerProfile[]>(() => loadWatermancerProfiles());
  const [activeRecipeId, setActiveRecipeId] = useState<string>('custom');
  const [savedRecipes, setSavedRecipes] = useState<SaltRecipe[]>(() => loadSavedRecipes());
  useDebouncedPersistence(() => saveSavedRecipes(savedRecipes), [savedRecipes]);
  useDebouncedPersistence(() => saveWaterPlans(savedPlans), [savedPlans]);
  const sessionBaselineRef = useRef<string | null>(null);
  const lastAutoSavedSignatureRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

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
    if (level === 'brewer') return;
    if (nerdLevel === 'watermancer' && level !== 'watermancer') {
      // Invalidate any deferred best-match callback before leaving the
      // Watermancer workspace so it cannot write results into another mode.
      watermancerActionGenerationRef.current += 1;
      watermancerActionBusyRef.current = false;
      setWatermancerBestMatchRunning(false);
      setWatermancerActionRunning(false);
      setWatermancerActionMessage(null);
      setWatermancerTargetOverride(null);
      watermancerMatchModeRef.current = 'automatic';
      setWatermancerMatchMode('automatic');
      setWatermancerManualRoute(null);
      setWatermancerAppliedBestMatchRoute(null);
    }
    if (nerdLevel === 'alchemist' && level !== 'alchemist') {
      // Concentrate controls belong to the Alchemist recipe lab. Do not let
      // their hidden state change Watermancer or Brewer salt amounts/labels.
      setConcentrateOn(false);
      setSplitMode(false);
    }
    setNerdLevel(level);
  };

  // Persist on changes
  useDebouncedPersistence(() => saveProfiles(profiles), [profiles]);
  useDebouncedPersistence(() => saveActiveProfileId(activeProfileId), [activeProfileId]);
  useDebouncedPersistence(() => saveNerdLevel(nerdLevel), [nerdLevel]);
  useDebouncedPersistence(() => saveWatermancerProfiles(wmProfiles), [wmProfiles]);
  useDebouncedPersistence(() => {
    localStorage.setItem(WATERMANCER_TARGET_SOURCE_STORAGE_KEY, watermancerTargetSource);
  }, [watermancerTargetSource]);

  useEffect(() => {
    if (
      watermancerTargetSource.startsWith('saved:')
      && !wmProfiles.some(profile => profile.id === watermancerTargetSource.slice('saved:'.length))
    ) {
      setWatermancerTargetSource('safe-profile');
    }
  }, [watermancerTargetSource, wmProfiles]);

  const handleWatermancerTargetSourceChange = (source: WatermancerTargetSourceId) => {
    enterWatermancerManualMode();
    setWatermancerTargetOverride(null);
    setWatermancerImportedRecipeName(null);
    setWatermancerTargetSource(source);
  };
  const handleWatermancerTargetOverrideChange = (targets: IonicTargetValues | null) => {
    enterWatermancerManualMode();
    setWatermancerTargetOverride(targets);
    setWatermancerImportedRecipeName(null);
  };

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
  const handleDeleteWmProfile = (id: string) => {
    if (!wmProfiles.some(profile => profile.id === id)) return;
    setWmProfiles(prev => prev.filter(profile => profile.id !== id));
    if (watermancerTargetSource === `saved:${id}`) {
      setWatermancerTargetSource('safe-profile');
      setWatermancerTargetOverride(null);
    }
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
  const applyBrewerFlavor = useCallback((flavor: BrewerFlavorInput) => {
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
  }, []);
  const handleBrewerFlavorChange = useCallback((flavor: BrewerFlavorInput) => {
    setBrewerFlavor(flavor);
    applyBrewerFlavor(flavor);
  }, [applyBrewerFlavor]);
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
  const scrollToWatermancerStage = (
    stage: 'target' | 'waters' | 'salts' | 'match' | 'closest-match' | 'final-mixture',
  ) => {
    const section = document.querySelector<HTMLElement>(`[data-watermancer-stage="${stage}"]`);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => section.focus({ preventScroll: true }), 450);
  };
  useEffect(() => {
    const rail = watermancerWorkflowRailRef.current;
    if (!showWatermancer || !rail) {
      watermancerWorkflowRailPinnedRef.current = false;
      setWatermancerWorkflowRailPinned(false);
      watermancerWorkflowRailHeightRef.current = 0;
      watermancerWorkflowRailTriggerRef.current = null;
      return;
    }

    let frame = 0;
    const updateRailPosition = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const isWideScreen = window.matchMedia('(min-width: 1280px)').matches;
        if (!isWideScreen) {
          watermancerWorkflowRailPinnedRef.current = false;
          watermancerWorkflowRailTriggerRef.current = null;
          watermancerWorkflowRailHeightRef.current = 0;
          setWatermancerWorkflowRailPinned(false);
          return;
        }

        const rect = rail.getBoundingClientRect();
        if (!watermancerWorkflowRailPinnedRef.current && rect.height > 0) {
          watermancerWorkflowRailHeightRef.current = rect.height;
          watermancerWorkflowRailTriggerRef.current = window.scrollY + rect.bottom;
        }
        const shouldPin = watermancerWorkflowRailPinnedRef.current
          ? window.scrollY >= (watermancerWorkflowRailTriggerRef.current ?? window.scrollY)
          : rect.bottom <= 0;
        if (watermancerWorkflowRailPinnedRef.current !== shouldPin) {
          watermancerWorkflowRailPinnedRef.current = shouldPin;
          setWatermancerWorkflowRailPinned(shouldPin);
        }
      });
    };

    updateRailPosition();
    window.addEventListener('scroll', updateRailPosition, { passive: true });
    window.addEventListener('resize', updateRailPosition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', updateRailPosition);
      window.removeEventListener('resize', updateRailPosition);
    };
  }, [showWatermancer]);

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
  const allRecipesForWatermancer = useMemo(
    () => [...RECIPES, ...savedRecipes],
    [savedRecipes],
  );
  const watermancerIonTargets = useMemo<Partial<Record<IonId, number>>>(() => {
    if (watermancerTargetOverride) return watermancerTargetOverride;
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
    if (watermancerTargetSource.startsWith('lotus:')) {
      const recipeId = watermancerTargetSource.slice('lotus:'.length);
      const recipe = LOTUS_RECIPES.find(item => item.id === recipeId);
      return recipe ? lotusIonTargetsForWatermancer(recipe) : {};
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
      ACTIVE_ION_IDS.map(id => [id, AIKI_DEFAULT_PROFILE.ranges[id].greenMax]),
    ) as Partial<Record<IonId, number>>;
  }, [allRecipesForWatermancer, profiles, saltOnlyIons, watermancerTargetOverride, watermancerTargetSource, wmProfiles]);
  const watermancerComparisonProfiles = useMemo<WatermancerComparisonProfile[]>(() => [
    ...profiles
      .filter(profile => profile.id !== AIKI_DEFAULT_PROFILE.id
        && profile.id !== WATERMANCER_SENSORY_PROFILE.id)
      .map(profile => ({
        id: `profile:${profile.id}`,
        name: profile.name
          .replace(/^Empirical Water — /, '')
          .replace(/ ionic profile$/, ''),
        targets: Object.fromEntries(
          ACTIVE_ION_IDS.map(id => [id, profile.ranges[id].greenMax]),
        ) as Partial<Record<IonId, number>>,
      })),
    ...wmProfiles.map(profile => ({
      id: `saved:${profile.id}`,
      name: profile.name,
      targets: profile.targets,
    })),
    ...allRecipesForWatermancer.map(recipe => ({
      id: `recipe:${recipe.id}`,
      name: recipe.name,
      targets: ionTotalsForSaltRecipe(recipe),
    })),
    ...ROBERT_ASAMI_RECIPES.map(recipe => ({
      id: `external:${recipe.id}`,
      name: recipe.name,
      targets: ionTotalsForSaltRecipe(recipe),
    })),
    ...LOTUS_RECIPES.map(recipe => ({
      id: `lotus:${recipe.id}`,
      name: recipe.name,
      targets: lotusIonTargetsForWatermancer(recipe),
    })),
  ], [activeProfileId, allRecipesForWatermancer, profiles, wmProfiles]);
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
  const watermancerSaltRows = useMemo(
    () => WATERMANCER_SALT_ORDER.map(saltId => {
      const index = SALTS.findIndex(salt => salt.id === saltId);
      return {
        salt: SALTS[index],
        index,
        option: watermancerSaltOptions[index],
      };
    }),
    [watermancerSaltOptions],
  );
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
  const watermancerWorkerRef = useRef<WatermancerWorkerClient | null>(null);
  const watermancerWorkerLatestRequestRef = useRef(0);
  const watermancerWorkerFailedRef = useRef(false);
  const [watermancerWorkerResult, setWatermancerWorkerResult] = useState<{
    inputSignature: string;
    result: WatermancerSolverResult;
  } | null>(null);
  const [watermancerWorkerGeneration, setWatermancerWorkerGeneration] = useState(0);

  useEffect(() => {
    if (!showWatermancer || watermancerMatchMode !== 'automatic') return;
    // Vite injects React Refresh into App.tsx during development. Because the
    // worker imports the computation export from this large legacy module,
    // that refresh runtime would execute without `window` inside the worker.
    // Keep development stable with the synchronous fallback until the solver
    // is extracted into a React-free engine module.
    if (!import.meta.env.PROD) {
      watermancerWorkerFailedRef.current = true;
      setWatermancerWorkerGeneration(generation => generation + 1);
      return;
    }
    if (!watermancerWorkerRef.current) {
      try {
        watermancerWorkerRef.current = createWatermancerWorkerClient(() => {
          watermancerWorkerFailedRef.current = true;
          setWatermancerWorkerGeneration(generation => generation + 1);
        });
      } catch {
        watermancerWorkerFailedRef.current = true;
        setWatermancerWorkerGeneration(generation => generation + 1);
      }
    }
    const workerClient = watermancerWorkerRef.current;
    if (!workerClient || watermancerWorkerFailedRef.current) return;

    const requestId = watermancerWorkerLatestRequestRef.current + 1;
    watermancerWorkerLatestRequestRef.current = requestId;
    const requestSignature = watermancerInputSignature;
    const requestStartedAt = performance.now();
    void workerClient.solve({
      plan: cloneWatermancerPlan(watermancerPlan),
      batchMl,
      baseWaters: cloneWatermancerWaters(mineralWaters),
      additionWaters: cloneWatermancerWaters(additionWaters),
    }).then(({ requestId: completedRequestId, elapsedMs, result }) => {
      if (!isLatestWatermancerWorkerRequest(
        completedRequestId,
        watermancerWorkerLatestRequestRef.current,
      )) return;
      if (requestSignature !== watermancerInputSignatureRef.current) return;
      setWatermancerWorkerResult({ inputSignature: requestSignature, result });
      if (import.meta.env.DEV) {
        console.debug('[watermancer] worker solve', {
          requestId: completedRequestId,
          elapsedMs: Number(elapsedMs.toFixed(2)),
          inputToResultMs: Number((performance.now() - requestStartedAt).toFixed(2)),
        });
      }
    }).catch(error => {
      if (error instanceof Error && error.message === 'Watermancer solve superseded.') return;
      if (requestSignature !== watermancerInputSignatureRef.current) return;
      watermancerWorkerFailedRef.current = true;
      setWatermancerWorkerGeneration(generation => generation + 1);
    });
  }, [
    additionWaters,
    batchMl,
    mineralWaters,
    showWatermancer,
    watermancerInputSignature,
    watermancerMatchMode,
    watermancerPlan,
    watermancerRecalculationNonce,
  ]);

  useEffect(() => () => {
    watermancerWorkerRef.current?.dispose();
    watermancerWorkerRef.current = null;
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const startedAt = performance.now();
    const memory = (performance as Performance & {
      memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
    }).memory;
    const longTaskObserver = typeof PerformanceObserver === 'undefined'
      ? null
      : new PerformanceObserver(list => {
        const durationMs = list.getEntries().reduce((total, entry) => total + entry.duration, 0);
        console.debug('[watermancer] long-task baseline', {
          count: list.getEntries().length,
          durationMs: Number(durationMs.toFixed(2)),
        });
      });
    longTaskObserver?.observe({ entryTypes: ['longtask'] });
    const frameId = window.requestAnimationFrame(() => {
      console.debug('[watermancer] startup baseline', {
        firstFrameMs: Number((performance.now() - startedAt).toFixed(2)),
        usedHeapMb: memory ? Number((memory.usedJSHeapSize / 1_000_000).toFixed(2)) : null,
        heapLimitMb: memory ? Number((memory.jsHeapSizeLimit / 1_000_000).toFixed(2)) : null,
      });
    });
    return () => {
      window.cancelAnimationFrame(frameId);
      longTaskObserver?.disconnect();
    };
  }, []);

  const watermancerSynchronousFallback = useMemo(
    () => watermancerWorkerFailedRef.current && showWatermancer && watermancerMatchMode === 'automatic'
      ? solveWatermancerRoutes({
        plan: watermancerPlan,
        batchMl,
        baseWaters: mineralWaters,
        additionWaters,
      })
      : null,
    [
      additionWaters,
      batchMl,
      mineralWaters,
      showWatermancer,
      watermancerMatchMode,
      watermancerPlan,
      watermancerWorkerGeneration,
    ],
  );
  const watermancerLiveResult = useMemo(() => {
    if (!showWatermancer || watermancerMatchMode !== 'automatic') {
      return createInactiveWatermancerResult(watermancerPlan);
    }
    if (watermancerSynchronousFallback) return watermancerSynchronousFallback;
    if (watermancerWorkerResult?.inputSignature === watermancerInputSignature) {
      return watermancerWorkerResult.result;
    }
    return watermancerWorkerResult?.result ?? createInactiveWatermancerResult(watermancerPlan);
  }, [
    showWatermancer,
    watermancerInputSignature,
    watermancerMatchMode,
    watermancerPlan,
    watermancerSynchronousFallback,
    watermancerWorkerResult,
  ]);
  const beginWatermancerAction = () => {
    // A deferred best-match callback can finish after a mode transition and
    // leave the ref behind even though the UI is no longer busy. Never let an
    // invisible stale lock make the recommendation buttons no-ops.
    if (watermancerActionBusyRef.current && !watermancerActionRunning) {
      watermancerActionBusyRef.current = false;
    }
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
    enterWatermancerManualMode();
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
  const handleApplyWatermancerRecommendation = (recommendation: WatermancerMatchRecommendation) => {
    if (!beginWatermancerAction()) return;
    setWatermancerBestMatchMessage(null);
    const action = recommendation.action;
    if (action.type === 'enable-salt') {
      setWatermancerUsedSaltIds(current => current.includes(action.saltId)
        ? current
        : [...current, action.saltId]);
      setWatermancerActionMessage(`${recommendation.label} applied. Recalculating the match.`);
    } else if (action.type === 'relax-source-preference') {
      setWatermancerIonSourcePreferences(current => ({
        ...current,
        [action.ionId]: 'dont-care',
      }));
      setWatermancerActionMessage(`${recommendation.label} applied. Recalculating the match.`);
    } else if (action.type === 'allow-policy-room') {
      setOvershootSettings(current => ({
        enabled: true,
        allowedIons: current.allowedIons.includes(action.ionId)
          ? current.allowedIons
          : [...current.allowedIons, action.ionId],
        limits: {
          ...current.limits,
          [action.ionId]: Math.max(current.limits[action.ionId] ?? 0, action.limitPpm),
        },
      }));
      setWatermancerActionMessage(`${recommendation.label} applied. Recalculating the match.`);
    } else {
      const stage = document.querySelector<HTMLElement>(`[data-watermancer-stage="${action.focus}"]`);
      stage?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      stage?.focus({ preventScroll: true });
      setWatermancerActionMessage(`Review the ${action.focus} controls to adjust this constraint.`);
    }
    finishWatermancerActionAfterPaint();
  };
  const handleFindBestWatermancerMatch = () => {
    if (!beginWatermancerAction()) return;
    watermancerMatchModeRef.current = 'automatic';
    setWatermancerMatchMode('automatic');
    setWatermancerManualRoute(null);
    setWatermancerAppliedBestMatchRoute(null);
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
        const bestMatchPreview: WatermancerBestMatchPreview = {
          route: cloneWatermancerRouteCandidate(winner.route),
          strategy: winner.strategy,
          saltObjective: winner.saltObjective,
          priorityPreset: winner.priorityPreset,
          deviationMode: winner.deviationMode,
          totalDeviation: totalWatermancerAbsoluteDeviation(
            winner.route.finalIons,
            winner.route.plan.targetIons,
          ),
          status: winner.result.status === 'matched' ? 'matched' : 'partial',
          explanation: winner.result.explanation,
          inputSignature: snapshot.inputSignature,
        };
        handleUseWatermancerBestMatch(bestMatchPreview);
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
  const handleUseWatermancerBestMatch = (
    previewOverride?: WatermancerBestMatchPreview,
  ) => {
    const preview = previewOverride ?? watermancerBestMatchPreview;
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
    watermancerAutomaticRouteRef.current = route;
    watermancerMatchModeRef.current = 'automatic';
    setWatermancerMatchMode('automatic');
    setWatermancerManualRoute(null);
    setWatermancerBestMatchPreview(null);
    setWatermancerBestMatchMessage(
      preview.status === 'matched'
        ? 'Best match found and applied automatically.'
        : 'Best available partial match found and applied automatically.',
    );
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
  const automaticWatermancerRoute = appliedBestMatchRoute ?? watermancerLiveResult.primaryPlan;
  watermancerAutomaticRouteRef.current = automaticWatermancerRoute;
  const selectedWatermancerRouteCandidate = useMemo(
    () => watermancerMatchMode === 'manual' && watermancerManualRoute
      ? { ...watermancerManualRoute, plan: watermancerPlan }
      : automaticWatermancerRoute,
    [
      automaticWatermancerRoute,
      watermancerManualRoute,
      watermancerMatchMode,
      watermancerPlan,
    ],
  );
  const activeWatermancerRouteBaseline = useMemo(
    () => showWatermancer
      ? recalculateWatermancerRouteAtCurrentVolumes(
        {
          plan: watermancerPlan,
          batchMl,
          baseWaters: mineralWaters,
          additionWaters,
        },
        selectedWatermancerRouteCandidate,
        selectedWatermancerRouteCandidate.saltTargets,
      )
      : watermancerLiveResult.primaryPlan,
    [
      additionWaters,
      batchMl,
      mineralWaters,
      selectedWatermancerRouteCandidate,
      showWatermancer,
      watermancerLiveResult,
      watermancerPlan,
    ],
  );
  const activeWatermancerSaltTargets = useMemo(() => {
    const targets: Record<string, number> = {};
    SALTS.forEach((salt, index) => {
      if (!watermancerUsedSaltIds.includes(salt.id)) {
        targets[salt.id] = 0;
        return;
      }
      const form = salt.hydrationForms[
        rows[index]?.formIdx ?? salt.defaultFormIdx ?? 0
      ] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
      const overrideMg = watermancerDoseOverridesMg[salt.id];
      if (
        Object.prototype.hasOwnProperty.call(watermancerDoseOverridesMg, salt.id)
        && L > 0
        && form
      ) {
        targets[salt.id] = Math.max(0, Number(overrideMg) || 0)
          * salt.anhydrousMass
          / (L * form.molarMass);
        return;
      }
      targets[salt.id] = Math.max(0, Number(activeWatermancerRouteBaseline.saltTargets[salt.id] ?? 0));
    });
    return targets;
  }, [
    L,
    activeWatermancerRouteBaseline.saltTargets,
    rows,
    watermancerDoseOverridesMg,
    watermancerUsedSaltIds,
  ]);
  // This is the single route used by Watermancer result cards, ion coverage,
  // Recipe steps, and exports. The baseline route keeps
  // the selected candidate's doses; the final pass materializes visible salt
  // selection and physical-dose overrides into the route itself.
  const activeWatermancerRoute = useMemo(
    () => showWatermancer
      ? recalculateWatermancerRouteAtCurrentVolumes(
        {
          plan: watermancerPlan,
          batchMl,
          baseWaters: mineralWaters,
          additionWaters,
        },
        activeWatermancerRouteBaseline,
        activeWatermancerSaltTargets,
      )
      : activeWatermancerRouteBaseline,
    [
      activeWatermancerRouteBaseline,
      activeWatermancerSaltTargets,
      additionWaters,
      batchMl,
      mineralWaters,
      showWatermancer,
      watermancerPlan,
    ],
  );
  const watermancerCurrentWaterIons = useMemo(
    () => computeWatermancerBottledIons(
      [...mineralWaters, ...additionWaters],
      batchMl,
    ),
    [additionWaters, batchMl, mineralWaters],
  );
  const watermancerCurrentFinalIons = useMemo(
    () => activeWatermancerRoute.finalIons,
    [activeWatermancerRoute],
  );
  const watermancerCurrentDeviations = useMemo(
    () => activeWatermancerRoute.deviations,
    [activeWatermancerRoute],
  );
  const watermancerCurrentStatus: WatermancerSolverResult['status'] = batchMl <= 0
    || ([...mineralWaters, ...additionWaters].length === 0 && watermancerUsedSaltIds.length === 0)
    ? 'blocked'
    : watermancerCurrentDeviations.every(deviation => (
      Math.abs(watermancerDeviationBeyondPolicy(deviation, watermancerPlan)) <= 0.05
    ))
      ? 'matched'
      : 'partial';
  const watermancerStatusLabel = watermancerCurrentStatus === 'matched'
    ? 'Matched'
    : watermancerCurrentStatus === 'partial'
      ? 'Partial match'
      : 'Ready to match';
  const watermancerStatusDescription = watermancerCurrentStatus === 'matched'
    ? 'Your current water and salt route is within the active ion tolerances.'
    : watermancerCurrentStatus === 'partial'
      ? 'The route is usable, but one or more ions are still outside the active tolerances.'
      : 'Choose a water source or enable a salt to start comparing the route with your target.';
  const watermancerStatusTone = watermancerCurrentStatus === 'matched'
    ? {
        border: 'border-emerald-300/35',
        background: 'bg-emerald-500/[0.08]',
        dot: 'bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]',
        label: 'text-emerald-200',
        value: 'text-emerald-100',
      }
    : watermancerCurrentStatus === 'partial'
      ? {
          border: 'border-amber-300/35',
          background: 'bg-amber-500/[0.08]',
          dot: 'bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.85)]',
          label: 'text-amber-200',
          value: 'text-amber-100',
        }
      : {
          border: 'border-cyan-300/25',
          background: 'bg-cyan-500/[0.045]',
          dot: 'bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.65)]',
          label: 'text-cyan-200/80',
          value: 'text-slate-100',
        };
  const adjustWatermancerDose = (saltId: string, currentMg: number, deltaMg: number) => {
    enterWatermancerManualMode();
    if (deltaMg !== 0) {
      spotlightWatermancerIons(
        SALTS.find(salt => salt.id === saltId)?.ions.map(contribution => contribution.ionId) ?? [],
      );
    }
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

    // Watermancer's visible salt controls are the source of truth for dosing.
  const selectedSuggestedSaltTargets = useMemo(() => {
    if (!showWatermancer) {
      return suggestedSaltTargets;
    }
      return activeWatermancerSaltTargets;
    }, [activeWatermancerSaltTargets, showWatermancer, suggestedSaltTargets]);
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
  const reviewFinalIons = showWatermancer ? watermancerCurrentFinalIons : suggestedIonTotals;
  const reviewSaltIons = showWatermancer
    ? computeIonTotals(activeWatermancerSaltTargets, {}, 1)
    : finalSaltIons;
  const reviewWaterIons = showWatermancer
    ? watermancerCurrentWaterIons
    : Object.fromEntries(
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
  const reviewTotalDeviation = showWatermancer
    ? totalWatermancerAbsoluteDeviation(
      reviewFinalIons,
      watermancerIonTargets,
    )
    : 0;
  const reviewDeviationCount = showWatermancer
    ? watermancerCurrentDeviations.filter(deviation => (
      Math.abs(watermancerDeviationBeyondPolicy(
        deviation,
         watermancerPlan,
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
    const finalAlkalinity = Math.max(
      (reviewFinalIons.bicarbonate ?? 0) + 2 * (reviewFinalIons.carbonate ?? 0),
      0,
    ) * 50 / 61;
    const waterAlkalinity = Math.max(
      (reviewWaterIons.bicarbonate ?? 0) + 2 * (reviewWaterIons.carbonate ?? 0),
      0,
    ) * 50 / 61;
    const recipeAlkalinity = Math.max(finalAlkalinity - waterAlkalinity, 0);
    const finalCitrate = Math.max(reviewFinalIons.citrates ?? 0, 0);
    const finalBiphosphate = Math.max(reviewFinalIons.biphosphates ?? 0, 0);
    const finalPhosphate = Math.max(reviewFinalIons.phosphates ?? 0, 0);
    const finalBaseAlkalinity = Math.max((baseAlkalinity ?? 0) * Math.max(0, Math.min(1, dil)), 1);
    const estimate = basePH !== undefined && baseAlkalinity !== undefined
      ? Math.max(4, Math.min(10, basePH
        + 0.12 * Math.log10(1 + recipeAlkalinity / finalBaseAlkalinity)
        - 0.08 * Math.log10(1 + finalCitrate / finalBaseAlkalinity)
        - 0.04 * Math.log10(1 + (finalBiphosphate + finalPhosphate) / finalBaseAlkalinity)))
      : undefined;
    return { basePH, baseAlkalinity, estimate };
  }, [
    additionWaters,
    dil,
    mineralWaters,
    reviewFinalIons,
    reviewWaterIons,
    sourceScale,
  ]);

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

  const handleAllInOneConcentrateToggle = (enabled: boolean) => {
    setConcentrateOn(enabled);
    if (!enabled) return;
    setConcentrateMl('100');
    setConcentrateStrength(findStrongestSafeConcentrateStrength(concSaltTargets));
    setSplitMode(false);
  };

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
    watermancerMatchModeRef.current = 'automatic';
    setWatermancerMatchMode('automatic');
    setWatermancerManualRoute(null);
    setWatermancerBestMatchMessage(null);
    setWatermancerBestMatchRunning(false);
    setWatermancerRecalculationNonce(0);
    setWatermancerDoseOverridesMg({});
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
     setWatermancerTargetOverride(null);
     setWatermancerTargetSource('safe-profile');
    setWatermancerUsedSaltIds([]);
    setAutoCraftPreset('closest-match');
    setWatermancerSaltObjective('balanced');
    setWatermancerBestMatchDeviationMode(null);
    setWatermancerBestMatchPreview(null);
    setWatermancerAppliedBestMatchRoute(null);
    watermancerMatchModeRef.current = 'automatic';
    setWatermancerMatchMode('automatic');
    setWatermancerManualRoute(null);
    setWatermancerBestMatchMessage(null);
    setWatermancerBestMatchRunning(false);
    setWatermancerActionRunning(false);
    setWatermancerActionMessage(null);
    setWatermancerRecalculationNonce(0);
    setWatermancerDoseOverridesMg({});
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
  const mineralRecipeSelectorValue = activeRecipeId !== 'custom'
    ? `recipe:${activeRecipeId}`
    : externalRecipeId !== 'custom'
    ? `external:${externalRecipeId}`
    : 'custom';
  const mineralRecipePickerGroups: RecipePickerGroup[] = [
    {
      label: 'Current setup',
      accent: 'emerald',
      options: [{ value: 'custom', label: 'Custom' }],
    },
    {
      label: 'Built-in',
      accent: 'cyan',
      options: RECIPES.map(recipe => ({
        value: `recipe:${recipe.id}`,
        label: `${recipe.id === 'kimoi' ? '⭐ ' : ''}${recipe.name}`,
      })),
    },
    ...(savedRecipes.length > 0
      ? [{
          label: 'My recipes',
          accent: 'violet' as const,
          options: savedRecipes.map(recipe => ({
            value: `recipe:${recipe.id}`,
            label: `${recipe.id === 'kimoi' ? '⭐ ' : ''}${recipe.name}`,
          })),
        }]
      : []),
    {
      label: 'Watering Hole · Filter',
      accent: 'amber',
      options: ROBERT_ASAMI_RECIPES
        .filter(recipe => recipe.method === 'Filter')
        .map(recipe => ({ value: `external:${recipe.id}`, label: recipe.name })),
    },
    {
      label: 'Watering Hole · Espresso',
      accent: 'amber',
      options: ROBERT_ASAMI_RECIPES
        .filter(recipe => recipe.method === 'Espresso')
        .map(recipe => ({ value: `external:${recipe.id}`, label: recipe.name })),
    },
    {
      label: 'Watering Hole · Tap-water proxy',
      accent: 'amber',
      options: ROBERT_ASAMI_RECIPES
        .filter(recipe => recipe.method.includes('tap-water'))
        .map(recipe => ({ value: `external:${recipe.id}`, label: recipe.name })),
    },
  ];
  const noRecipeSelected = activeRecipeId === 'custom' && externalRecipeId === 'custom';
  const hasSaltRecipeTargets = Object.values(saltTargets).some(target => target > 0);
  useEffect(() => {
    if (!hasSaltRecipeTargets) setRecipeStepsPromptDismissed(false);
  }, [hasSaltRecipeTargets]);
  const selectedSourceRecipe = selectedExternalRecipe ?? (
    activeRecipe?.sourceUrl ? activeRecipe : undefined
  );
  const publishedTargetRecipe = showAlchemist
    && selectedSourceRecipe
    && activeRecipe?.id === selectedSourceRecipe.id
    && Object.values(activeRecipe.salts).some(entry => entry.sourceTarget !== undefined)
    ? activeRecipe
    : undefined;
  const publishedTargetLabel = publishedTargetRecipe ? 'Published target' : 'Salt target (ppm)';
  const displayedRecipeName = selectedSourceRecipe?.name ?? activeRecipe?.name ?? 'Custom';
  const autoFillTargets = showAlchemist && hasSaltRecipeTargets
    ? saltOnlyIons
    : noRecipeSelected
    ? Object.fromEntries(
        ACTIVE_ION_IDS.map(id => [id, AIKI_DEFAULT_PROFILE.ranges[id].greenMax]),
      ) as Partial<Record<IonId, number>>
    : saltOnlyIons;
  const autoFillUsesRecipeTargets = showAlchemist && hasSaltRecipeTargets;
  const watermancerTargetSourceLabel = useMemo(() => {
    if (watermancerImportedRecipeName) return watermancerImportedRecipeName;
    if (watermancerTargetSource === 'safe-profile') return `${AIKI_DEFAULT_PROFILE.name} safe profile`;
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
    if (watermancerTargetSource.startsWith('lotus:')) {
      return LOTUS_RECIPES.find(item => item.id === watermancerTargetSource.slice('lotus:'.length))?.name ?? 'Lotus recipe';
    }
    return ROBERT_ASAMI_RECIPES.find(item => item.id === watermancerTargetSource.slice('external:'.length))?.name ?? 'Watering Hole recipe';
  }, [allRecipes, watermancerImportedRecipeName, watermancerTargetSource, profiles, wmProfiles]);
  const recipeStepsProfileName = showWatermancer
    ? watermancerTargetSource === 'safe-profile'
      ? AIKI_DEFAULT_PROFILE.name
      : watermancerTargetSourceLabel
    : displayedRecipeName;
  // Recipe steps must describe the same salts the active tab will actually
  // prepare. Alchemist uses the source-water-adjusted dosing map (not the
  // untouched recipe rows); Watermancer uses its live route and dose
  // overrides; Brewer stays on its flavor/lesson recipe map.
  const recipeStepsSaltTargets = selectRecipePreparationTargets(
    nerdLevel,
    brewerModeSaltTargets,
    dosingSaltTargets,
    effectiveSuggestedSaltTargets,
  );
  const recipeStepsSuggestedSaltTargets = recipeStepsSaltTargets;
  const applyRecipeObject = (recipe: SaltRecipe) => {
    setBrewerRecipeOverride(null);
    setActiveRecipeId(recipe.id);
    const requiredNerdLevel = nerdLevelForRecipe(recipe);
    if (shouldEscalateNerdLevel(nerdLevel, requiredNerdLevel)) {
      setNerdLevel(requiredNerdLevel === 'watermancer' ? 'watermancer' : 'alchemist');
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
      setNerdLevel(requiredNerdLevel === 'watermancer' ? 'watermancer' : 'alchemist');
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

  const handleMineralRecipeChange = (value: string) => {
    if (value.startsWith('external:')) {
      applyExternalRecipe(value.slice('external:'.length));
      return;
    }
    applyRecipe(value.startsWith('recipe:') ? value.slice('recipe:'.length) : value);
  };

  const buildCurrentSalts = (): Record<string, SaltRecipeEntry> => {
    const m: Record<string, SaltRecipeEntry> = {};
    SALTS.forEach((s, i) => {
      if (num(safeRows[i].target) > 0) m[s.id] = { target: safeRows[i].target, formIdx: safeRows[i].formIdx };
    });
    return m;
  };

  const handleSendRecipeToConcentrate = () => {
    const salts = buildCurrentSalts();
    if (Object.keys(salts).length === 0) {
      window.alert('Enter at least one salt target before sending a recipe to Concentrate.');
      return;
    }
    setConcentrateRecipeHandoff({
      name: displayedRecipeName === 'Custom' ? 'Current recipe' : displayedRecipeName,
      salts,
      finalLiters: L > 0 ? L : 1,
    });
    setConcentrateSnapshot(previous => ({
      ...previous,
      recipeConcentratePlan: null,
    }));
    setAppTab('concentrate');
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
    const name = activeRecipe?.name?.trim() || 'Alchemist water recipe';
    const text = serializeRecipeFile({
      name,
      salts,
      ...(splitMode && {
        splitMode: true,
        splitStrengths: { ...splitStrengths },
        splitMls: { ...splitMls },
      }),
    });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'recipe';
    const fileName = `${slug}.WATER.png`;
    const downloadFile = (file: File) => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    };
    void (async () => {
      try {
        const pngBytes = await createWaterRecipePreviewPng(watermancerMarkImage, name);
        const packagedPng = embedWaterRecipeJsonInPng(pngBytes, text);
        downloadFile(new File([packagedPng], fileName, { type: 'image/png' }));
      } catch {
        downloadFile(new File([text], `${slug}.WATER`, { type: 'application/json' }));
        window.alert('The image preview could not be packaged, so a JSON .WATER file was exported instead.');
      }
    })();
  };

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const handleImportFile = async (file: File) => {
    const fileBytes = await file.arrayBuffer();
    const text = extractWaterRecipeJsonFromPng(fileBytes)
      ?? new TextDecoder().decode(fileBytes);
    const waterRecipe = parseWaterRecipeFile(text);
    if (waterRecipe) {
      if (!showWatermancer) {
        window.alert('Switch to Watermancer before importing an ion recipe.');
        return;
      }
      const importedProfileName = file.name
        .replace(/(?:\.WATER)?\.png$/i, '')
        .replace(/\.WATER$/i, '')
        .replace(/\.json$/i, '')
        .trim() || waterRecipe.name;
      const importedProfile = createWatermancerProfile(
        importedProfileName,
        waterRecipe.ions as IonicTargetValues,
      );
      setWmProfiles(prev => [...prev, importedProfile]);
      setWatermancerTargetOverride(waterRecipe.ions as IonicTargetValues);
      setWatermancerImportedRecipeName(importedProfile.name);
      setWatermancerTargetSource(`saved:${importedProfile.id}`);
      return;
    }
    const recipe = parseRecipeFile(text);
    if (!recipe) {
      window.alert("Couldn't read that file — it doesn't look like a valid coffee water recipe.");
      return;
    }
    setSavedRecipes(prev => [...prev, recipe]);
    if (showWatermancer) {
       setWatermancerTargetOverride(null);
       setWatermancerTargetSource(`recipe:${recipe.id}`);
      setActiveRecipeId('custom');
      setExternalRecipeId('custom');
      return;
    }
    applyRecipeObject(recipe);
  };

  const updateRow = (i: number, patch: Partial<SaltRow>) => {
    enterWatermancerManualMode();
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
    line(`Volume  : ${formatVolumeValue(L, volumeUnit)} ${volumeUnitShortLabel(volumeUnit)}`);
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
        if (L > 0) line(`    ${dosePerBatch.toFixed(1)} mL per batch  (${formatVolumeValue(L, volumeUnit)} ${volumeUnitShortLabel(volumeUnit)})`);
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
          if (L > 0) line(`    ${dosePerBatch.toFixed(1)} mL per batch  (${formatVolumeValue(L, volumeUnit)} ${volumeUnitShortLabel(volumeUnit)})`);
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
    line(`${'Batch:'.padEnd(18)} ${bMl} mL  (${formatVolumeValue(L, volumeUnit)} ${volumeUnitShortLabel(volumeUnit)})`);
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

  const captureWaterPlanSnapshot = (): WaterPlanSnapshot => ({
    version: 1,
    appTab: appTab === 'concentrate' ? 'concentrate' : 'calculator',
    nerdLevel,
    liters,
    volumeUnit,
    rows: safeRows.map(row => ({ target: row.target, formIdx: row.formIdx })),
    mineralWaters: mineralWaters.map(entry => ({
      id: entry.id,
      name: entry.name,
      ions: Object.fromEntries(Object.entries(entry.ions).map(([id, value]) => [id, String(value ?? '')])),
      metadata: Object.fromEntries(Object.entries(entry.metadata).map(([key, value]) => [key, String(value ?? '')])),
      volumeMl: entry.volumeMl,
      sourceLocalId: entry.sourceLocalId,
    })),
    additionWaters: additionWaters.map(entry => ({
      id: entry.id,
      name: entry.name,
      ions: Object.fromEntries(Object.entries(entry.ions).map(([id, value]) => [id, String(value ?? '')])),
      metadata: Object.fromEntries(Object.entries(entry.metadata).map(([key, value]) => [key, String(value ?? '')])),
      volumeMl: entry.volumeMl,
      sourceLocalId: entry.sourceLocalId,
    })),
    magnesiumPreference,
    autoFillPriorityPreset,
    autoFillCustomPriority: [...autoFillCustomPriority],
    autoFillDeviationPpm,
    overshootSettings: {
      enabled: overshootSettings.enabled,
      allowedIons: [...overshootSettings.allowedIons],
      limits: Object.fromEntries(Object.entries(overshootSettings.limits).map(([id, value]) => [id, Number(value)])),
    },
    brewerDropsPerMl,
    brewerFlavor: { ...brewerFlavor },
    brewerRecipeOverride,
    externalRecipeId,
    activeRecipeId,
    activeProfileId,
    watermancerTargetSource,
    watermancerTargetOverride: watermancerTargetOverride ? { ...watermancerTargetOverride } : null,
    watermancerUsedSaltIds: [...watermancerUsedSaltIds],
    autoCraftPreset,
    watermancerSaltObjective,
    watermancerBestMatchDeviationMode,
    watermancerIonSourcePreferences: Object.fromEntries(Object.entries(watermancerIonSourcePreferences)),
    watermancerDoseOverridesMg: { ...watermancerDoseOverridesMg },
    sodiumCorrectionOn,
    concentrateRecipeHandoff: concentrateRecipeHandoff
      ? {
          name: concentrateRecipeHandoff.name,
          salts: { ...concentrateRecipeHandoff.salts },
          finalLiters: concentrateRecipeHandoff.finalLiters,
        }
      : null,
    concentrate: {
      ...concentrateSnapshot,
    },
  });

  const sessionSignature = (snapshot: WaterPlanSnapshot) => JSON.stringify(snapshot);
  const commitSessionBaseline = (snapshot: WaterPlanSnapshot) => {
    sessionBaselineRef.current = sessionSignature(snapshot);
  };

  const handleShareWatermancerPlan = async () => {
    const recipeName = watermancerTargetSourceLabel || 'Custom recipe';
    const slug = recipeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'water-recipe';
    const fileName = `${slug}.WATER.png`;
    const json = serializeWaterRecipeFile(recipeName, watermancerIonTargets);
    const showShareStatus = (status: 'downloaded' | 'shared' | 'error') => {
      setWatermancerShareStatus(status);
      window.setTimeout(() => setWatermancerShareStatus('idle'), 2800);
    };
    const downloadRecipeFile = (file: File) => {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    try {
      const pngBytes = await createWaterRecipePreviewPng(watermancerMarkImage, recipeName);
      const file = new File([embedWaterRecipeJsonInPng(pngBytes, json)], fileName, { type: 'image/png' });
      downloadRecipeFile(file);
      showShareStatus('downloaded');
    } catch {
      try {
        downloadRecipeFile(new File([json], `${slug}.WATER`, { type: 'application/json' }));
        showShareStatus('downloaded');
        window.alert('The image preview could not be packaged, so a JSON .WATER file was exported instead.');
      } catch {
        showShareStatus('error');
      }
    }
  };

  const handleSaveWaterPlan = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return null;
    const snapshot = captureWaterPlanSnapshot();
    const plan = createWaterPlan(trimmedName, snapshot);
    setSavedPlans(previous => [plan, ...previous]);
    commitSessionBaseline(snapshot);
    return plan;
  };

  const handleDuplicateWaterPlan = (plan: WaterPlan) => {
    const duplicate = createWaterPlan(`${plan.name} copy`, plan.snapshot);
    setSavedPlans(previous => [duplicate, ...previous]);
    return duplicate;
  };

  const handleRenameWaterPlan = (id: string, name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const existing = savedPlans.find(plan => plan.id === id);
    if (existing && isAutoSavedWaterPlan(existing)) return;
    setSavedPlans(previous => previous.map(plan => plan.id === id
      ? { ...plan, name: trimmedName, updatedAt: new Date().toISOString() }
      : plan));
  };

  const handleImportWaterPlan = (plan: WaterPlan) => {
    if (!isValidWaterPlan(plan)) return;
    setSavedPlans(previous => [plan, ...previous.filter(existing => existing.id !== plan.id)]);
  };

  const handleDeleteWaterPlan = (id: string) => {
    const existing = savedPlans.find(plan => plan.id === id);
    if (existing && isAutoSavedWaterPlan(existing)) return;
    setSavedPlans(previous => previous.filter(plan => plan.id !== id));
  };

  const restoreWaterPlan = (plan: WaterPlan) => {
    const snapshot = plan.snapshot;
    watermancerActionGenerationRef.current += 1;
    watermancerActionBusyRef.current = false;
    setWatermancerBestMatchRunning(false);
    setWatermancerActionRunning(false);
    setWatermancerActionMessage(null);
    setWatermancerBestMatchMessage(null);
    setWatermancerBestMatchPreview(null);
    setWatermancerAppliedBestMatchRoute(null);
    setWatermancerManualRoute(null);
    watermancerMatchModeRef.current = 'automatic';

    setNerdLevel(snapshot.nerdLevel === 'watermancer' ? 'watermancer' : 'alchemist');
    setLiters(snapshot.liters);
    setVolumeUnit(snapshot.volumeUnit);
    setRows(snapshot.rows.map(row => ({ target: row.target, formIdx: row.formIdx })));
    setMineralWaters(snapshot.mineralWaters.map(entry => ({
      ...entry,
      ions: entry.ions,
      metadata: entry.metadata,
    })));
    setAdditionWaters(snapshot.additionWaters.map(entry => ({
      ...entry,
      ions: entry.ions,
      metadata: entry.metadata,
    })));
    setMagnesiumPreference(snapshot.magnesiumPreference);
    setAutoFillPriorityPreset(snapshot.autoFillPriorityPreset as AutoFillPriorityPreset);
    setAutoFillCustomPriority(snapshot.autoFillCustomPriority as IonId[]);
    setAutoFillDeviationPpm(snapshot.autoFillDeviationPpm);
    setOvershootSettings({
      enabled: snapshot.overshootSettings.enabled,
      allowedIons: snapshot.overshootSettings.allowedIons as IonId[],
      limits: snapshot.overshootSettings.limits as Partial<Record<IonId, number>>,
    });
    setBrewerDropsPerMl(snapshot.brewerDropsPerMl);
    setBrewerFlavor({ ...snapshot.brewerFlavor });
    setBrewerRecipeOverride(snapshot.brewerRecipeOverride as Week1Recipe | null);
    setExternalRecipeId(snapshot.externalRecipeId);
    setActiveRecipeId(snapshot.activeRecipeId);
    setActiveProfileId(profiles.some(profile => profile.id === snapshot.activeProfileId)
      ? snapshot.activeProfileId
      : AIKI_DEFAULT_PROFILE.id);
    setWatermancerTargetSource(snapshot.watermancerTargetSource as WatermancerTargetSourceId);
    setWatermancerTargetOverride(snapshot.watermancerTargetOverride ? { ...snapshot.watermancerTargetOverride } : null);
    setWatermancerUsedSaltIds([...snapshot.watermancerUsedSaltIds]);
    setAutoCraftPreset(snapshot.autoCraftPreset as AutoCraftPreset);
    setWatermancerSaltObjective(snapshot.watermancerSaltObjective as AutoCraftObjective);
    setWatermancerBestMatchDeviationMode(snapshot.watermancerBestMatchDeviationMode);
    setWatermancerIonSourcePreferences(snapshot.watermancerIonSourcePreferences as Record<IonId, WatermancerIonSourcePreference>);
    setWatermancerDoseOverridesMg({ ...snapshot.watermancerDoseOverridesMg });
    setSodiumCorrectionOn(snapshot.sodiumCorrectionOn);
    setWatermancerMatchMode('automatic');
    setConcentrateRecipeHandoff(snapshot.concentrateRecipeHandoff);
    setPendingConcentrateRestore({ ...snapshot.concentrate });
    setConcentrateSnapshot({ ...snapshot.concentrate });
    setAppTab(snapshot.appTab);
    setPlansOpen(false);
    commitSessionBaseline(snapshot);
  };

  useEffect(() => {
    const snapshot = captureWaterPlanSnapshot();
    const signature = sessionSignature(snapshot);

    if (sessionBaselineRef.current === null) {
      sessionBaselineRef.current = signature;
      return;
    }

    const dirty = signature !== sessionBaselineRef.current;
    if (!dirty || signature === lastAutoSavedSignatureRef.current) return;

    if (autoSaveTimerRef.current !== null) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      const now = new Date().toISOString();
      lastAutoSavedSignatureRef.current = signature;
      setSavedPlans(previous => {
        const existing = previous.find(isAutoSavedWaterPlan);
        if (existing) {
          return previous.map(plan => plan.id === existing.id
            ? { ...plan, snapshot, updatedAt: now }
            : plan);
        }
        return [createWaterPlan(WATER_PLAN_AUTOSAVE_NAME, snapshot, now), ...previous];
      });
      autoSaveTimerRef.current = null;
    }, 900);

    return () => {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  });

  const appHeader = (
    <div className="app-header overflow-hidden rounded-2xl border border-white/10 bg-slate-800/70 shadow-2xl backdrop-blur-xl">
      <div className={`app-header__bar flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-gradient-to-r py-0 pr-4 sm:pr-6 ${appTab === 'concentrate' ? 'from-violet-950 via-fuchsia-950/80 to-slate-950' : appTab === 'guide' ? 'from-emerald-950 via-cyan-950/80 to-slate-950' : 'from-slate-950 via-cyan-950/80 to-indigo-950'}`}>
        <div className="app-header__brand flex min-w-0 flex-1 items-center gap-3.5">
          <img
            src={watermancerMarkImage}
            alt=""
            aria-hidden="true"
            className="watermancer-header__mark h-20 w-20 shrink-0 object-cover sm:h-24 sm:w-24"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold uppercase tracking-[0.08em] text-white sm:text-xl">Watermancer</h1>
            <p className="text-[11px] leading-relaxed text-slate-300/75">Min-Max Your Coffee Water Chemistry</p>
          </div>
        </div>
        <div className="app-header__controls order-3 flex w-full items-center justify-between gap-2 sm:order-none sm:w-auto">
          <a
            href="https://discord.com/users/361929925449482240"
            target="_blank"
            rel="noreferrer"
            aria-label="Send app feedback on Discord"
            title="Send app feedback on Discord"
            className="app-header__discord inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-black/15 text-white/80 transition hover:border-white/40 hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-transparent sm:h-8 sm:w-8"
          >
            <SiDiscord className="h-4 w-4" aria-hidden="true" />
          </a>
          <WaterPlanManager
            plans={savedPlans}
            open={plansOpen}
            onOpen={() => setPlansOpen(true)}
            onClose={() => setPlansOpen(false)}
            onSave={handleSaveWaterPlan}
            onRestore={restoreWaterPlan}
            onDuplicate={handleDuplicateWaterPlan}
            onRename={handleRenameWaterPlan}
            onDelete={handleDeleteWaterPlan}
            onImport={handleImportWaterPlan}
          />
            <div role="tablist" aria-label="App workspace" className="app-header__tabs flex shrink-0 rounded-lg border border-white/20 bg-black/15 p-0.5">
            <button
              type="button"
              role="tab"
              aria-selected={appTab === 'calculator'}
              onClick={() => setAppTab('calculator')}
              className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition sm:min-h-0 sm:py-1.5 ${appTab === 'calculator' ? 'bg-white/25 text-white shadow-lg shadow-black/10' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              <CalculatorIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Calculator
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={appTab === 'concentrate'}
              onClick={() => setAppTab('concentrate')}
              className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition sm:min-h-0 sm:py-1.5 ${appTab === 'concentrate' ? 'bg-white/25 text-white shadow-lg shadow-black/10' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              <BottleWine className="h-3.5 w-3.5" aria-hidden="true" />
              Concentrate
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={appTab === 'guide'}
              onClick={() => setAppTab('guide')}
              className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition sm:min-h-0 sm:py-1.5 ${appTab === 'guide' ? 'bg-white/25 text-white shadow-lg shadow-black/10' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
            >
              <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
              Guide
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
            volumeUnit={volumeUnit}
            onToggleVolumeUnit={() => setVolumeUnit(unit => unit === 'liters' ? 'gallons' : 'liters')}
            recipeHandoff={concentrateRecipeHandoff}
            onClearRecipeHandoff={() => setConcentrateRecipeHandoff(null)}
            dropsPerMl={brewerDropsPerMl}
            diySaltTargets={dosingSaltTargets}
            diySaltForms={concentrateDiySaltForms}
            diyFinalLiters={L > 0 ? L : 1}
            restoredRecipePlan={concentrateSnapshot.recipeConcentratePlan as ConcentratePlanSnapshot | null}
            restoreSnapshot={pendingConcentrateRestore}
            onRestoreSnapshotConsumed={() => setPendingConcentrateRestore(null)}
            onSnapshotChange={setConcentrateSnapshot}
          />
        </div>
        </div>
      </div>
    );
  }

  if (appTab === 'guide') {
    return (
      <div className="app-shell min-h-screen bg-slate-900 font-sans text-slate-100">
        <div className="flex min-h-screen items-start justify-center p-4 sm:p-6">
          <div className="app-page-stack flex w-full max-w-6xl flex-col">
            {appHeader}
            <main className="app-card overflow-hidden rounded-2xl border border-emerald-300/20 shadow-2xl shadow-emerald-950/20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200/10 bg-slate-950/35 px-4 py-3 sm:px-6">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/75">Guided tasting</div>
                  <h1 className="mt-1 text-lg font-semibold text-white">Robert Asami&apos;s 7-day water crash course</h1>
                </div>
                <button
                  type="button"
                  onClick={() => setAppTab('calculator')}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-200/45 hover:bg-emerald-300/10 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200/70"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Back to Calculator
                </button>
              </div>
              <Suspense fallback={<div className="p-6 text-center text-sm text-emerald-100/80">Loading the guide…</div>}>
                <Week1Guide
                  onApplyRecipe={handleApplyWeek1Recipe}
                />
              </Suspense>
              <div className="border-t border-emerald-200/10 bg-slate-950/20">
                <BrewerSimpleRecipeCard
                  prepMethod={prepMethod}
                  onPrepMethodChange={setPrepMethod}
                  recipeHandoffToken={brewerRecipeHandoffToken}
                  guideRecipe={brewerRecipeOverride}
                  saltTargets={brewerActiveSaltTargets}
                  recipeRows={rows}
                  liters={L}
                  volumeInput={liters}
                  volumeUnit={volumeUnit}
                  onToggleVolumeUnit={() => setVolumeUnit(unit => unit === 'liters' ? 'gallons' : 'liters')}
                  onVolumeChange={value => setLiters(value)}
                  concentrateOn={concentrateOn}
                  concentrateLiters={concL}
                  concentrateStrength={concentrateStrength}
                  dropsPerMl={brewerDropsPerMl}
                  onOpenSteps={method => setShowBrewerSteps(method)}
                />
              </div>
            </main>
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
                    ? 'Use mineral salts to craft your recipe. Pick, save, share, or import recipes. Make all in one, separate GH KH or separate salt concentrates.'
                    : nerdLevel === 'watermancer'
                      ? 'A source-water and ion-balance workspace for refining the final mixture.'
                      : 'Choose how much detail to show for your water recipe.'}
                </div>
              </div>
            </div>
            <div className="mode-switcher grid w-full grid-cols-2 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1 sm:w-auto">
              {([
                ['alchemist', 'Alchemist', 'Salt & concentrate lab'],
                ['watermancer', 'Watermancer', 'Source water & ions'],
              ] as const).map(([value, label, description]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleNerdLevelChange(value)}
                  aria-pressed={nerdLevel === value}
                  title={description}
                  className={`mode-switcher__button inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition sm:min-h-0 sm:py-1.5 ${
                    nerdLevel === value
                      ? value === 'alchemist'
                        ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/40 shadow-sm'
                      : 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 shadow-sm'
                      : 'border border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                  }`}
                >
                  {value === 'alchemist' && (
                    <AlchemistMark
                      className={nerdLevel === value ? 'text-emerald-200' : 'text-slate-500'}
                      aria-hidden="true"
                    />
                  )}
                  {value === 'watermancer' && (
                    <WatermancerMark
                      className={nerdLevel === value ? 'text-indigo-200' : 'text-slate-500'}
                      aria-hidden="true"
                    />
                  )}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

          {showWatermancer && (
            <div
              ref={watermancerWorkflowRailRef}
              className="relative"
              style={{
                minHeight: watermancerWorkflowRailPinned && watermancerWorkflowRailHeightRef.current > 0
                  ? `${watermancerWorkflowRailHeightRef.current}px`
                  : undefined,
              }}
            >
              <nav
                aria-label="Watermancer workflow"
                className={`workflow-rail rounded-2xl border border-indigo-400/20 bg-slate-950/90 px-3 py-3 shadow-sm backdrop-blur-xl ${
                  watermancerWorkflowRailPinned
                    ? 'xl:fixed xl:right-5 xl:top-1/2 xl:z-40 xl:w-48 xl:-translate-y-1/2'
                    : ''
                }`}
              >
                <ol className={`grid grid-cols-2 gap-2 sm:grid-cols-6 ${watermancerWorkflowRailPinned ? 'xl:grid-cols-1' : ''}`}>
                  {[
                    { number: '1', label: 'Set target', stage: 'target' as const, complete: true },
                    { number: '2', label: 'Add waters', stage: 'waters' as const, complete: mineralWaters.length + additionWaters.length > 0 },
                    { number: '3', label: 'Add salts', stage: 'salts' as const, complete: watermancerUsedSaltIds.length > 0 },
                    { number: '4', label: 'Choose route', stage: 'match' as const, complete: batchMl > 0 },
                    { number: '5', label: 'Closest match', stage: 'closest-match' as const, complete: batchMl > 0 },
                    { number: '6', label: 'Final mixture', stage: 'final-mixture' as const, complete: batchMl > 0 },
                  ].map(step => (
                    <li
                      key={step.number}
                      className={`rounded-xl border text-[11px] ${
                        step.complete
                          ? 'border-indigo-400/30 bg-indigo-500/10 text-indigo-100'
                          : 'border-slate-700/60 bg-slate-900/35 text-slate-500'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => scrollToWatermancerStage(step.stage)}
                         className="flex min-h-10 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition hover:bg-indigo-500/10 focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
                        aria-label={`Go to Watermancer step ${step.number}: ${step.label}`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          step.complete ? 'bg-indigo-400/20 text-indigo-200' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {step.number}
                        </span>
                        <span className="truncate">{step.label}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          )}

         {showWatermancer && (
           <div className="order-1 scroll-mt-4 outline-none" data-watermancer-stage="target" tabIndex={-1}>
            <WatermancerIonProfileCard
              ions={ionProfileIons}
              supplementalIons={supplementalIonTotals}
              targetIons={watermancerIonTargets}
              profiles={profiles}
              activeProfileId={activeProfileId}
              wmProfiles={wmProfiles}
               currentFinalIons={watermancerCurrentFinalIons}
              allRecipes={allRecipes}
              externalRecipes={ROBERT_ASAMI_RECIPES}
              lotusRecipes={LOTUS_RECIPES}
              referenceWaters={EMPIRICAL_WATERS}
               comparisonProfiles={watermancerComparisonProfiles}
              watermancerTargetSource={watermancerTargetSource}
              onTargetSourceChange={handleWatermancerTargetSourceChange}
              onTargetOverrideChange={handleWatermancerTargetOverrideChange}
              onSaveWmProfile={handleSaveWmProfile}
              onDeleteWmProfile={handleDeleteWmProfile}
               hasSaltRecipeTargets={hasSaltRecipeTargets}
               onSendRecipeToConcentrate={handleSendRecipeToConcentrate}
               onShareRecipe={handleShareWatermancerPlan}
               shareStatus={watermancerShareStatus}
               onImportRecipeFile={handleImportFile}
               onReset={() => setShowResetConfirm(true)}
            />
          </div>
         )}
         {/* Mineral Table */}
           {showAlchemist && <div className="app-card app-panel-surface order-2 bg-slate-800/70 backdrop-blur rounded-2xl shadow-2xl shadow-emerald-950/20 border border-emerald-400/25 overflow-hidden">
            <div className="app-section-header flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 border-b border-slate-700/40 bg-gradient-to-r from-sky-500/10 via-transparent to-indigo-500/10 text-slate-300">
            <div className="flex items-center gap-2">
                <GiSaltShaker className="h-4 w-4 text-cyan-300" aria-hidden="true" />
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
               <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-2">
              {selectedSourceRecipe?.sourceUrl && (
                <a
                  href={selectedSourceRecipe.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open source page for ${selectedSourceRecipe.name}`}
                  title={`Open source page for ${selectedSourceRecipe.name}`}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-indigo-300/45 bg-indigo-500/15 px-2 text-[10px] font-semibold leading-none text-indigo-100 transition hover:border-indigo-200/80 hover:bg-indigo-500/30 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
                >
                  <span>Source</span>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-indigo-200/55 text-[10px] font-bold" aria-hidden="true">?</span>
                </a>
              )}
              <MineralRecipePicker
                value={mineralRecipeSelectorValue}
                groups={mineralRecipePickerGroups}
                onChange={handleMineralRecipeChange}
              />
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
                 title="Download the current profile"
              >
                 <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
              {showAlchemist && hasSaltRecipeTargets && (
                <button
                  type="button"
                  onClick={handleSendRecipeToConcentrate}
                  className="flex items-center gap-1.5 rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/10 px-2.5 py-1.5 text-xs text-fuchsia-200 transition hover:border-fuchsia-300/45 hover:bg-fuchsia-500/20 hover:text-fuchsia-100"
                  title="Open this recipe in the Concentrate workspace"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Use in Concentrate</span>
                </button>
              )}
              <button
                onClick={() => importInputRef.current?.click()}
                 className="flex items-center gap-1.5 text-xs text-sky-200 hover:text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/25 hover:border-sky-300/45 rounded-lg px-2.5 py-1.5 transition"
                title="Import water profile"
              >
                 <Import className="w-3.5 h-3.5" />
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
                accept=".WATER,.water,.WATER.png,.water.png,.json,.png,image/png,application/json"
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-400/10 bg-emerald-500/[0.03] px-4 py-3 text-[11px] leading-relaxed text-slate-400 sm:px-6">
               <span>Enter salt amounts in PPM or milligrams; Direct dose shows the amount to add for the selected final batch volume.</span>
               <button
                 type="button"
                 onClick={() => setShowAdvancedHydrationForms(value => !value)}
                 aria-expanded={showAdvancedHydrationForms}
                 className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-600/60 bg-slate-950/30 px-2 py-1 text-[10px] font-semibold text-slate-400 transition hover:border-emerald-300/40 hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-300/60"
               >
                 <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvancedHydrationForms ? 'rotate-180' : ''}`} aria-hidden="true" />
                 Advanced: hydration forms
               </button>
            </div>
         <>
          <div className="hidden sm:grid grid-cols-[1.7fr_1fr_1fr] gap-3 px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700/40">
            <span>Salt</span>
            <span>
              {publishedTargetLabel === 'Salt target (ppm)' ? (
                <>
                  Salt target{' '}
                  <span className="cursor-help" title="ppm as CaCO₃">
                    (ppm)
                  </span>
                </>
              ) : publishedTargetLabel}
            </span>
              <span>{showAlchemist ? 'Direct dose (mg)' : 'Dose'}</span>
          </div>
           {SALTS.map((salt, i) => {
             const isMemeSalt = MEME_SALT_IDS.has(salt.id);
             if (isMemeSalt && !showMemeSalts) return null;
            const row = safeRows[i];
            const form = salt.hydrationForms[row.formIdx];
            const target = dosingSaltTargets[salt.id] ?? 0;
            const recipeTarget = saltTargets[salt.id] ?? 0;
            const publishedTargetEntry = publishedTargetRecipe?.salts[salt.id];
            const displayedRecipeTarget = publishedTargetEntry?.sourceTarget ?? recipeTarget;
            const displayedRecipeTargetValue = Number(displayedRecipeTarget);
             const targetInputValue = Object.prototype.hasOwnProperty.call(targetInputDrafts, salt.id)
               ? targetInputDrafts[salt.id]
               : (displayedRecipeTargetValue > 0 ? String(displayedRecipeTarget) : '');
            const updateTargetValue = (value: string) => {
               setTargetInputDrafts(current => ({ ...current, [salt.id]: value }));
              if (
                value.trim() === ''
                || !publishedTargetEntry?.sourceTarget
                || !activeRecipe?.salts[salt.id]?.target
              ) {
                updateRow(i, { target: value });
                return;
              }
              const sourceValue = Number(value);
              const sourceBase = Number(publishedTargetEntry.sourceTarget);
              const internalBase = Number(activeRecipe.salts[salt.id].target);
              const internalValue = sourceBase > 0
                ? sourceValue * internalBase / sourceBase
                : sourceValue;
              updateRow(i, { target: Number.isFinite(internalValue) ? String(internalValue) : '' });
            };
            const mg = L > 0 && target > 0
              ? computeSaltMg(target, L, form.molarMass, salt.anhydrousMass)
              : 0;
            const recipeMass = L > 0 && recipeTarget > 0
              ? computeSaltMg(recipeTarget, L, form.molarMass, salt.anhydrousMass)
              : 0;
            const concMg = concentrateOn && target > 0 && concL > 0
              ? computeSaltMg(target, concL, form.molarMass, salt.anhydrousMass) * concentrateStrength
              : 0;
            const displayMass = concentrateOn ? concMg : mg;
            const massLabel = concentrateOn && displayMass >= 1000
              ? `${(displayMass / 1000).toFixed(2)} g`
              : `${displayMass.toFixed(2)} mg`;
            const directDoseValue = recipeMass > 0 ? recipeMass.toFixed(2) : '';
             const directDoseInputValue = Object.prototype.hasOwnProperty.call(directDoseInputDrafts, salt.id)
               ? directDoseInputDrafts[salt.id]
               : directDoseValue;
             const updateDirectDose = (
               value: string,
               selectionStart: number | null,
               selectionEnd: number | null,
             ) => {
               setDirectDoseInputDrafts(current => ({ ...current, [salt.id]: value }));
              if (value.trim() === '') {
                updateRow(i, { target: '' });
                return;
              }
              const massMg = Number(value);
              const targetPpm = computeSaltTargetPpm(
                massMg,
                L,
                form.molarMass,
                salt.anhydrousMass,
              );
              updateRow(i, { target: Number.isFinite(targetPpm) ? String(targetPpm) : '' });
               if (selectionStart !== null && selectionEnd !== null) {
                 window.requestAnimationFrame(() => {
                   const input = directDoseInputRefs.current[salt.id];
                   if (!input || input.value !== value) return;
                   input.setSelectionRange(selectionStart, selectionEnd);
                 });
               }
            };
             return (
               <div
                 key={`${salt.id}-${isMemeSalt ? memeSaltFlashNonce : 0}`}
                 className={`grid grid-cols-2 sm:grid-cols-[1.7fr_1fr_1fr] gap-x-3 gap-y-2 px-4 sm:px-6 py-3 sm:py-3 sm:items-center border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors ${
                   isMemeSalt && memeSaltFlashNonce > 0 ? 'meme-salt-row-flash' : ''
                 }`}
               >
                <div className="col-span-2 sm:col-span-1 flex min-w-0 flex-col items-start gap-1">
                    <span className="text-sm font-semibold text-slate-100">
                     {salt.name}
                   </span>
                   <SaltIonBadges salt={salt} className="text-xs" />
                   {showAdvancedHydrationForms ? (
                     <label className="mt-1 flex max-w-full flex-col gap-1 text-[10px] uppercase tracking-wider text-slate-500">
                       Hydration form
                       <select
                         id={`salt-form-${salt.id}`}
                         aria-label={`${salt.name} hydration form`}
                         value={row.formIdx}
                         onChange={e => updateRow(i, { formIdx: parseInt(e.target.value) })}
                         className="max-w-full rounded-lg border border-emerald-400/30 bg-slate-900/60 px-2.5 py-1.5 text-xs normal-case tracking-normal text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 transition"
                       >
                         {salt.hydrationForms.map((f, fi) => (
                           <option key={fi} value={fi}>{f.label}</option>
                         ))}
                       </select>
                     </label>
                   ) : (
                     <span className="max-w-full truncate text-[10px] text-slate-500" title="Selected hydration form">
                       {form.label}
                     </span>
                   )}
                </div>
                <div>
                  <label htmlFor={`salt-target-${salt.id}`} className="sm:hidden block text-[10px] uppercase tracking-wider text-slate-500 mb-1">{publishedTargetLabel}</label>
                  <input
                    id={`salt-target-${salt.id}`}
                     type="text"
                    inputMode="decimal"
                    min="0"
                    aria-label={`${salt.name} target ppm`}
                     value={targetInputValue}
                     onFocus={() => setTargetInputDrafts(current => ({
                       ...current,
                       [salt.id]: targetInputValue,
                     }))}
                     onBlur={() => setTargetInputDrafts(current => {
                       const next = { ...current };
                       delete next[salt.id];
                       return next;
                     })}
                    onChange={e => updateTargetValue(e.target.value)}
                    onKeyDown={e => {
                       if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') e.preventDefault();
                    }}
                    placeholder="0"
                    className="w-full bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-baseline gap-2 sm:block">
                  <span className="sm:hidden text-[10px] uppercase tracking-wider text-slate-500">Dose</span>
                  {showAlchemist ? (
                    <div className="flex items-center gap-2">
                      <input
                         ref={input => { directDoseInputRefs.current[salt.id] = input; }}
                         type="text"
                         inputMode="decimal"
                        min="0"
                        step="0.01"
                        aria-label={`${salt.name} direct dose in milligrams`}
                         value={directDoseInputValue}
                         onFocus={() => setDirectDoseInputDrafts(current => ({
                           ...current,
                           [salt.id]: directDoseInputValue,
                         }))}
                         onBlur={() => setDirectDoseInputDrafts(current => {
                           const next = { ...current };
                           delete next[salt.id];
                           return next;
                         })}
                         onChange={e => updateDirectDose(
                           e.target.value,
                           e.target.selectionStart,
                           e.target.selectionEnd,
                         )}
                        onKeyDown={e => {
                           if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') e.preventDefault();
                        }}
                        placeholder="0"
                        className="min-w-0 w-full bg-slate-900/60 border border-emerald-400/30 rounded-lg px-3 py-2 text-sm font-mono text-emerald-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400 transition"
                      />
                      <span className="shrink-0 text-[10px] text-slate-500">mg</span>
                    </div>
                  ) : (
                    <span className="text-sm font-mono text-emerald-300">
                      {displayMass > 0 ? massLabel : '—'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          </>
             {showAlchemist && (
               <IonWatchDisclosure
                 ions={saltOnlyIons}
                 activeProfile={activeProfile}
               />
             )}
             <div className="flex items-center justify-start">
               <MemeSaltToggle
                 showMemeSalts={showMemeSalts}
                 onToggle={() => {
                   if (!showMemeSalts) setMemeSaltFlashNonce(value => value + 1);
                   setShowMemeSalts(value => !value);
                 }}
               />
             </div>
            </>
           </div>}
         {/* Water amount + Concentrate */}
              {(showAlchemist || showWatermancer) && <div data-watermancer-stage={showWatermancer ? 'waters' : undefined} tabIndex={showWatermancer ? -1 : undefined} className={`app-card app-panel-surface ${showAlchemist ? 'order-1' : 'order-2'} relative scroll-mt-4 overflow-hidden rounded-2xl border outline-none ${showAlchemist ? 'border-emerald-400/25 shadow-emerald-950/15' : 'border-indigo-400/25 shadow-indigo-950/15'} bg-slate-800/75 shadow-xl backdrop-blur`}>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/[0.08] via-sky-500/[0.025] to-blue-500/[0.08]" />
           <div className="relative z-10">
           <SharedSectionHeader
             icon={<Droplet className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.6)]" />}
               title={showAlchemist ? '1. Batch volume' : '2. Add waters — Batch volume'}
             after={
               <div className="flex items-center gap-2">
                 {showAlchemist ? <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                  <span className={`transition-colors ${concentrateOn ? 'text-cyan-200' : 'text-slate-400'}`}>All-in-one concentrate</span>
                 <div className={`relative w-9 h-5 rounded-full transition-colors ${concentrateOn ? 'bg-cyan-500 shadow-[0_0_10px_-2px_rgba(34,211,238,0.8)]' : 'bg-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={concentrateOn}
                     onChange={e => handleAllInOneConcentrateToggle(e.target.checked)}
                     aria-label="Use all-in-one concentrate"
                    className="sr-only"
           />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${concentrateOn ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
               </label> : undefined}
               </div>
            }
          />
               <div className="app-card-body relative space-y-4 bg-transparent">
             <div className="flex flex-wrap items-center gap-3">
               <label className="flex flex-col gap-0.5 text-sm font-semibold text-cyan-100">
                 <span>Final batch volume</span>
                 <span className="text-[10px] font-normal uppercase tracking-[0.16em] text-cyan-200/45">Recipe output</span>
               </label>
      <div className="flex h-11 items-center gap-1.5 rounded-xl border border-cyan-300/35 bg-gradient-to-r from-cyan-950/70 to-slate-950/70 px-1.5 shadow-inner shadow-cyan-950/30 transition focus-within:border-cyan-200/80 focus-within:ring-2 focus-within:ring-cyan-400/30">
                  <Droplet className="ml-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                 <VolumeInput
                   liters={L}
                   unit={volumeUnit}
                    showStepper
                   onChangeLiters={value => {
                     if (showWatermancer) enterWatermancerManualMode();
                     setLiters(value);
                   }}
                   placeholder={volumeUnitLabel(volumeUnit)}
                   ariaLabel={`Final batch volume in ${volumeUnitLabel(volumeUnit)}`}
                    className="w-full border-0 bg-transparent px-0 py-2 text-center text-base font-semibold tabular-nums text-slate-100 placeholder:text-cyan-100/30 focus:outline-none focus:ring-0"
                 />
                  <span className="w-5 text-center text-xs font-semibold uppercase tracking-wider text-cyan-200/65">
                   {volumeUnitShortLabel(volumeUnit)}
                 </span>
               </div>
               <VolumeUnitToggle
                 unit={volumeUnit}
                 onToggle={() => setVolumeUnit(unit => unit === 'liters' ? 'gallons' : 'liters')}
                 className="h-11 min-w-[76px] justify-center rounded-xl border-cyan-300/35 bg-cyan-400/10 px-3 text-[11px] uppercase tracking-wider shadow-sm shadow-cyan-950/30"
               />
            </div>

             {showAlchemist && concentrateOn && !splitMode && (
               <div className="space-y-3 border border-teal-500/30 bg-teal-500/5 rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-300">Stock strength:</label>
                      <select
                        value={STRENGTH_OPTIONS.includes(concentrateStrength) ? String(concentrateStrength) : 'custom'}
                        onChange={e => {
                          setConcentrateStrength(e.target.value === 'custom' ? 0 : Number(e.target.value));
                        }}
                        className="bg-teal-950/20 border border-teal-400/30 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-300 transition"
                      >
                        {STRENGTH_OPTIONS.map(v => <option key={v} value={v}>×{v}</option>)}
                        <option value="custom">Custom</option>
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
                          aria-label="Custom stock strength multiplier"
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
                  <button
                    type="button"
                    disabled={!Object.values(concSaltTargets).some(target => Number.isFinite(target) && target > 0)}
                    onClick={() => setConcentrateStrength(findStrongestSafeConcentrateStrength(concSaltTargets))}
                    className="ml-auto rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:border-slate-700/60 disabled:bg-slate-900/30 disabled:text-slate-600"
                  >
                    Max safe strength
                  </button>
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

                 {concFeasibility.level !== 'green' && (
                   <button
                     type="button"
                     onClick={handleSendRecipeToConcentrate}
                     className="flex items-center gap-2 text-xs font-semibold text-fuchsia-200 hover:text-white bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-400/35 hover:border-fuchsia-300/60 rounded-lg px-3 py-2 transition w-full justify-center"
                   >
                     <FlaskConical className="w-3.5 h-3.5" />
                     Open Concentrate workspace
                   </button>
                 )}

                 {/* Split into stocks button */}
                {concFeasibility.level !== 'green' && (
                  <button
                     type="button"
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
          <SharedSectionHeader
            icon={<HardnessBalanceScale gh={baseSaltGh} kh={baseSaltKh} />}
            title="Base Salt Recipe Summary (as CaCO₃)"
          />
           <div className="app-card-body grid grid-cols-1 sm:grid-cols-3 gap-4">
             <SharedSimpleMetricCard label="General Hardness (GH)" value={baseSaltGh} unit="ppm CaCO₃" tone="hardness" />
             <SharedSimpleMetricCard label="Carbonate Hardness (KH)" value={baseSaltKh} unit="ppm CaCO₃" tone="buffer" />
             <SharedSimpleMetricCard label="Total Dissolved Solids (TDS)" value={tdsSalt} unit="mg/L" tone="tds" />
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
             <SharedWaterChemistryCard
              estimate={waterChemistry.estimate}
              basePH={waterChemistry.basePH}
              baseAlkalinity={waterChemistry.baseAlkalinity}
            />
          </div>
        )}

        {/* Mineral Water Base */}
          {(showAlchemist || showWatermancer) && <div data-watermancer-stage={showWatermancer ? 'waters' : undefined} tabIndex={showWatermancer ? -1 : undefined} className={`app-card app-panel-surface scroll-mt-4 outline-none ${showAlchemist ? 'order-3' : 'order-2'} ${showAlchemist ? 'border-emerald-400/25' : 'border-indigo-400/25'} bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl overflow-hidden`}>
          <SharedSectionHeader
            icon={<MineralWaterBeaker active={hasMineralWater} />}
            title={showWatermancer ? '2. Add waters — Mineral water base' : 'Craft with mineral water as a base.'}
            after={<div className="flex items-center gap-2">
              {showAlchemist && (
                <button
                  type="button"
                  onClick={() => setAlchemistMineralWaterOpen(open => !open)}
                  aria-expanded={alchemistMineralWaterOpen}
                  aria-controls="alchemist-mineral-water-content"
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-300/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-200 transition hover:border-emerald-200/50 hover:bg-emerald-500/20"
                >
                  <span className={`transition-transform ${alchemistMineralWaterOpen ? 'rotate-90' : ''}`}>▶</span>
                  {alchemistMineralWaterOpen ? 'Hide waters' : 'Show waters'}
                </button>
              )}
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
            </div>}
           />
           {(!showAlchemist || alchemistMineralWaterOpen) && (
            <div id="alchemist-mineral-water-content" className="app-card-body space-y-4">
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
                  Browse waters
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
                      <button
                        type="button"
                        onClick={() => updateMineralWater(entry.id, { volumeMl: '0' })}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/70 bg-slate-800/70 text-slate-500 transition hover:border-sky-400/50 hover:bg-sky-500/10 hover:text-sky-300"
                        aria-label="Reset water volume to 0 mL"
                        title="Reset volume to 0 mL"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
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
                     <div key={id} style={ionVisualStyle(id)}>
                       <label className="mb-0.5 block text-[10px] font-semibold text-[color:var(--ion-fg)]" title={ION_MAP[id].name}>{ION_MAP[id].formula}</label>
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
              <details className="group/coverage border-t border-slate-700/40 pt-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:text-slate-200 [&::-webkit-details-marker]:hidden">
                  <span className="text-slate-600 transition-transform group-open/coverage:rotate-90">▶</span>
                  <span>
                    {noRecipeSelected
                      ? `Mineral water coverage of ${activeProfile.name} safe limits`
                      : `Mineral water coverage of ${activeRecipe?.name ?? 'Custom'}`}
                  </span>
                </summary>
                <div className="mt-2.5 space-y-2.5">
                {ACTIVE_ION_IDS.map(id => {
                  const ion = ION_MAP[id];
                   const target = autoFillTargets[id] ?? 0;
                  const covered = bottledIons[id] ?? 0;
                  const pct = target > 0 ? Math.min((covered / target) * 100, 100) : 0;
                   const profileRange = activeProfile.ranges[id];
                   const profileGreenMax = profileRange.greenMax;
                   const profileYellowPercent = profileGreenMax > 0
                     ? (profileRange.yellowMax / profileGreenMax) * 100
                     : 100;
                   const profilePercent = profileGreenMax > 0
                     ? (covered / profileGreenMax) * 100
                     : 0;
                   // Keep enough track beyond the green ceiling to show
                   // over-100% values while preserving both profile markers.
                   const profileScalePercent = Math.max(100, profileYellowPercent, profilePercent);
                   const profileFillPercent = profileScalePercent > 0
                     ? Math.min((profilePercent / profileScalePercent) * 100, 100)
                     : 0;
                   const profileGreenMarkerPercent = profileScalePercent > 0
                     ? Math.min((100 / profileScalePercent) * 100, 100)
                     : 100;
                   const profileYellowMarkerPercent = profileScalePercent > 0
                     ? Math.min((profileYellowPercent / profileScalePercent) * 100, 100)
                     : 100;
                  // Coverage is displayed to one decimal place, so classify
                  // against that same precision instead of exposing tiny
                  // floating-point differences (e.g. 3.9999 / 4.0) as partial.
                  const coverageTolerance = 0.05;
                  const overshoot = target > 0 && covered > target + coverageTolerance;
                  const level: 'none' | 'partial' | 'full' | 'overshoot' =
                    overshoot ? 'overshoot' :
                    target > 0 && covered >= target - coverageTolerance ? 'full' :
                    covered > 0 ? 'partial' : 'none';
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
                     <div
                       key={id}
                       className="flex items-center gap-3"
                        style={ionVisualStyle(id)}
                     >
                       <span className="w-20 shrink-0 text-xs font-semibold text-[color:var(--ion-fg)]" title={ion.name}>{ion.formula}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <div
                            className="group/profile-coverage-bar relative min-w-0 flex-1 cursor-help outline-none"
                             tabIndex={0}
                             role="img"
                            aria-label={`${ion.name}: hover comparison with ${activeProfile.name} range`}
                            title={`Hover to compare ${ion.name} with ${activeProfile.name} range`}
                           >
                            <div className="h-2 overflow-hidden rounded-full bg-slate-700/60 transition-opacity group-hover/profile-coverage-bar:hidden group-focus/profile-coverage-bar:hidden">
                               <div
                                 className="h-full rounded-full transition-all"
                                 style={{ width: `${pct}%`, backgroundColor: 'var(--ion-bar)', boxShadow: '0 0 10px var(--ion-shadow)' }}
                               />
                             </div>
                             <div
                               className="relative hidden h-3 overflow-hidden rounded-full bg-slate-700/60 ring-1 ring-indigo-300/20 group-hover/profile-coverage-bar:block group-focus/profile-coverage-bar:block"
                               aria-hidden="true"
                             >
                               <div
                                 className="relative h-full rounded-full bg-emerald-400 transition-all"
                                 style={{ width: `${profileFillPercent}%` }}
                               />
                               <div
                                 className="absolute inset-y-0 w-[2px] bg-emerald-100 shadow-[0_0_7px_1px_rgba(167,243,208,0.95)]"
                                 style={{ left: `${profileGreenMarkerPercent}%` }}
                               />
                               <div
                                 className="absolute inset-y-0 w-[2px] bg-rose-200 shadow-[0_0_7px_1px_rgba(253,164,175,0.95)]"
                                 style={{ left: `${profileYellowMarkerPercent}%` }}
                               />
                               <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-slate-950">
                                 {Math.round(profilePercent)}%
                               </span>
                             </div>
                          </div>
                           <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums text-slate-100">
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
              </details>
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
                      Salt contribution
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
                        <div
                          key={id}
                          className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2"
                          style={{ ...ionVisualStyle(id), boxShadow: 'inset 3px 0 0 var(--ion-border)' }}
                        >
                          <span className="block text-[10px] font-semibold text-[color:var(--ion-fg)]" title={ION_MAP[id].name}>{ION_MAP[id].formula}</span>
                         {covered >= target - 0.01 ? (
                           <span className="flex items-center gap-1 text-sm font-semibold tabular-nums text-emerald-300">
                             <Check className="h-3.5 w-3.5" /> Covered
                           </span>
                         ) : (
                            <span className="text-sm font-semibold tabular-nums text-[color:var(--ion-fg)]">
                             {remaining.toFixed(1)} ppm
                           </span>
                         )}
                       </div>
                     );
                   })}
                 </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">3. Choose salts</span>
                    <div className="flex flex-wrap items-center gap-1.5" aria-label="Magnesium salt preference">
                      {([
                        {
                          value: 'sulfates' as const,
                          label: 'Prefer sulfate',
                          explanation: 'Favor magnesium sulfate to add more sulfate and a brighter, crisper mineral balance.',
                        },
                        {
                          value: 'chlorides' as const,
                          label: 'Prefer chloride',
                          explanation: 'Favor magnesium chloride to add more chloride and a rounder, fuller mineral balance.',
                        },
                        {
                          value: 'original' as const,
                          label: 'Don’t care',
                          explanation: 'No preference between sulfate and chloride.',
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
           )}
        </div>}

          {showWatermancer && activeWatermancerRoute && (
             <div className="order-5 scroll-mt-4 outline-none" data-watermancer-stage="closest-match" tabIndex={-1}>
             <WatermancerIonCoverageBars
                actualIons={watermancerCurrentFinalIons}
               supplementalIons={computeSupplementalIonTotals(activeWatermancerSaltTargets)}
              targetIons={watermancerIonTargets}
              targetLabel={watermancerTargetSourceLabel}
              activeProfile={activeProfile}
               spotlightIonIds={watermancerSpotlightIonIds}
               feedbackEnabled={watermancerFeedbackEnabled}
               followEnabled={watermancerFollowEnabled}
               dockPosition={watermancerResultDock}
               onDockPositionChange={setWatermancerResultDock}
               onToggleFeedback={toggleWatermancerFeedback}
               onToggleFollow={toggleWatermancerFollow}
            />
          </div>
        )}

         {showWatermancer && activeWatermancerRoute && (
             <div className="app-card app-panel-surface order-5 scroll-mt-4 outline-none bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-indigo-400/25 overflow-hidden" data-watermancer-stage="final-mixture" tabIndex={-1}>
              <SharedSectionHeader icon={<Droplet className="w-4 h-4" />} title="4. Review match — Final mixture" />
            <div className="border-b border-slate-700/40 px-4 pt-3 text-xs text-slate-400 sm:px-6">
               The active route's modeled final mixture at the selected batch volume, including visible dose overrides.
            </div>
             <div className="app-card-body">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3 lg:grid lg:grid-rows-[auto_repeat(3,minmax(0,1fr))_auto] lg:gap-3 lg:space-y-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
                     {watermancerTargetSourceLabel} ion targets
                  </div>
                  <div className="grid gap-3 lg:contents">
                     <SharedSimpleMetricCard label={`${watermancerTargetSourceLabel} GH target`} value={originalTargetGh} unit="ppm CaCO₃" tone="hardness" />
                     <SharedSimpleMetricCard label={`${watermancerTargetSourceLabel} KH target`} value={originalTargetKh} unit="ppm CaCO₃" tone="buffer" />
                     <SharedSimpleMetricCard label={`${watermancerTargetSourceLabel} TDS target`} value={originalTargetTds} unit="mg/L" tone="tds" />
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
                    <SharedHardnessCard label="General Hardness (GH)" value={reviewFinalGh} saltValue={reviewSaltGh} bottledValue={reviewWaterGh} />
                    <SharedHardnessCard label="Carbonate Hardness (KH)" value={reviewFinalKh} saltValue={reviewSaltKh} bottledValue={reviewWaterKh} />
                    <SharedTdsCard value={reviewFinalTds} saltValue={reviewSaltTds} bottledValue={reviewWaterTds} />
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
           <div className="app-card app-panel-surface order-3 scroll-mt-4 outline-none bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-indigo-400/25 overflow-hidden" data-watermancer-stage="salts" tabIndex={-1}>
            <SharedSectionHeader
              icon={<GiSaltShaker className="w-4 h-4" />}
             title="3. Choose salts"
            />
             <div className="app-card-body space-y-4">

                <div className="watermancer-salt-table mt-2 overflow-hidden rounded-xl border border-slate-700/60">
                   <div className="watermancer-salt-table__header hidden bg-slate-950/50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:grid">
                     <span className="text-left">Salt</span>
                     <span>Hydration form</span>
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Dose</span>
                        <button
                          type="button"
                          onClick={() => {
                            enterWatermancerManualMode();
                            setWatermancerDoseOverridesMg({});
                          }}
                          className="rounded border border-slate-600/70 bg-slate-900/60 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-slate-400 transition hover:border-indigo-300/50 hover:bg-indigo-500/15 hover:text-indigo-200"
                          aria-label="Reset salt doses"
                          title="Reset salt dose adjustments while keeping Used salts"
                        >
                          Reset
                        </button>
                      </div>
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Use</span>
                      <button
                        type="button"
                         onClick={() => {
                          enterWatermancerManualMode();
                            const enabledSalts = SALTS.filter(
                              salt => showWatermancerMemeSalts || !MEME_SALT_IDS.has(salt.id),
                            );
                            setWatermancerUsedSaltIds(enabledSalts.map(salt => salt.id));
                        }}
                        className="rounded border border-indigo-300/25 bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-indigo-200 transition hover:border-indigo-200/50 hover:bg-indigo-500/20 hover:text-indigo-100"
                        aria-label="Use all salts"
                        title="Enable all salts"
                      >
                        All
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-slate-700/50">
                     {watermancerSaltRows.map(({ salt, index, option }) => {
                       if (MEME_SALT_IDS.has(salt.id) && !showWatermancerMemeSalts) return null;
                      const used = watermancerUsedSaltIds.includes(salt.id);
                       const doseIsAdjusted = Object.prototype.hasOwnProperty.call(watermancerDoseOverridesMg, salt.id);
                        const activePpm = used ? Math.max(0, Number(activeWatermancerSaltTargets[salt.id] ?? 0)) : 0;
                       const activeMg = activePpm > 0
                         ? computeSaltMg(activePpm, L, option.form.molarMass, salt.anhydrousMass)
                        : 0;
                       const doseInputValue = Object.prototype.hasOwnProperty.call(watermancerDoseInputDrafts, salt.id)
                         ? watermancerDoseInputDrafts[salt.id]
                         : (used ? activeMg.toFixed(1) : '0.0');
                       const updateDoseInput = (
                         value: string,
                         selectionStart: number | null,
                         selectionEnd: number | null,
                       ) => {
                         setWatermancerDoseInputDrafts(current => ({ ...current, [salt.id]: value }));
                         enterWatermancerManualMode();
                         const parsed = Number(value);
                          const previous = Number(doseInputValue);
                           if (Number.isFinite(parsed) && Number.isFinite(previous) && parsed !== previous) {
                            spotlightWatermancerIons(
                              salt.ions.map(contribution => contribution.ionId),
                            );
                          }
                         setWatermancerDoseOverridesMg(current => ({
                           ...current,
                           [salt.id]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
                         }));
                         if (selectionStart !== null && selectionEnd !== null) {
                           window.requestAnimationFrame(() => {
                             const input = watermancerDoseInputRefs.current[salt.id];
                             if (!input || input.value !== value) return;
                             input.setSelectionRange(selectionStart, selectionEnd);
                           });
                         }
                       };
                      return (
                             <div
                               key={`${salt.id}-${MEME_SALT_IDS.has(salt.id) ? watermancerMemeSaltFlashNonce : 0}`}
                                className={`watermancer-salt-table__row bg-slate-900/25 ${
                                  used ? 'watermancer-salt-table__row--used' : ''
                                } ${
                                 MEME_SALT_IDS.has(salt.id) && watermancerMemeSaltFlashNonce > 0 ? 'meme-salt-row-flash' : ''
                               }`}
                             >
                            <div className="watermancer-salt-table__salt flex items-center gap-2 text-left sm:justify-start">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full transition ${
                                  used
                                    ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]'
                                    : 'bg-slate-700'
                                }`}
                                aria-hidden="true"
                              />
                              <div className="min-w-0">
                              <div
                                 className="watermancer-salt-table__salt-name text-xs font-semibold text-slate-100"
                              >
                                {salt.name}
                              </div>
                              <SaltIonBadges salt={salt} className="mt-0.5 text-[10px]" />
                              </div>
                          </div>
                           <label className="watermancer-salt-table__hydration flex items-center gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:hidden">Hydration form</span>
                            <select
                              value={rows[index]?.formIdx ?? salt.defaultFormIdx ?? 0}
                              onChange={event => {
                                enterWatermancerManualMode();
                                const formIdx = Number(event.target.value);
                                setRows(current => current.map((row, rowIndex) => (
                                  rowIndex === index ? { ...row, formIdx } : row
                                )));
                              }}
                               className="min-w-0 flex-1 cursor-pointer rounded-lg border border-cyan-300/20 bg-slate-950/70 px-2 py-1.5 text-[11px] font-medium text-slate-200 outline-none transition hover:border-cyan-300/45 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-400/20"
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
                               className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/60 text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-500/10 active:scale-90 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </HoldStepperButton>
                            <div className="watermancer-salt-table__dose-value">
                              <input
                                ref={input => { watermancerDoseInputRefs.current[salt.id] = input; }}
                                type="text"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                value={doseInputValue}
                                onFocus={() => setWatermancerDoseInputDrafts(current => ({
                                  ...current,
                                  [salt.id]: doseInputValue,
                                }))}
                                onBlur={() => setWatermancerDoseInputDrafts(current => {
                                  const next = { ...current };
                                  delete next[salt.id];
                                  return next;
                                })}
                                onChange={event => updateDoseInput(
                                  event.target.value,
                                  event.target.selectionStart,
                                  event.target.selectionEnd,
                                )}
                                onKeyDown={event => {
                                  if (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E') {
                                    event.preventDefault();
                                  }
                                }}
                                disabled={!used}
                                placeholder="0"
                                className="min-w-0 w-16 rounded-lg border border-cyan-400/30 bg-slate-950/70 px-1.5 py-1.5 text-center text-xs font-semibold tabular-nums text-cyan-100 outline-none transition focus:border-cyan-300/80 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`${salt.name} dose in milligrams`}
                              />
                              <span className={`watermancer-salt-table__dose-status text-[9px] font-semibold uppercase tracking-wider ${doseIsAdjusted ? 'text-amber-300' : 'text-slate-600'}`}>
                                {used ? (doseIsAdjusted ? 'Adjusted' : 'Suggested') : ''}
                              </span>
                            </div>
                              <span className="watermancer-salt-table__dose-unit text-[10px] font-semibold uppercase tracking-wider text-slate-500">mg</span>
                            <HoldStepperButton
                              onStep={() => adjustWatermancerDose(salt.id, activeMg, 1)}
                              disabled={!used}
                              label={`Increase ${salt.name} dose by 1 mg`}
                               className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/10 text-cyan-200 transition hover:border-cyan-200/60 hover:bg-cyan-500/20 active:scale-90"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </HoldStepperButton>
                             </div>
                          </div>
                           <div className="watermancer-salt-table__use">
                           <button
                            type="button"
                            onClick={() => {
                              enterWatermancerManualMode();
                              setWatermancerUsedSaltIds(current => used
                                ? current.filter(id => id !== salt.id)
                                : [...current, salt.id]);
                            }}
                            aria-pressed={used}
                             className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold shadow-sm transition active:scale-95 ${
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
                 <div className="flex items-center justify-start">
                   <MemeSaltToggle
                     showMemeSalts={showWatermancerMemeSalts}
                     onToggle={() => {
                       if (!showWatermancerMemeSalts) setWatermancerMemeSaltFlashNonce(value => value + 1);
                       setShowWatermancerMemeSalts(value => !value);
                     }}
                   />
                 </div>
            </div>
          </div>
        )}

         {showWatermancer && watermancerLiveResult && (
            <div className="precision-match-card app-card app-panel-surface order-4 scroll-mt-4 outline-none overflow-hidden rounded-2xl border bg-slate-800/70 backdrop-blur" data-watermancer-stage="match" tabIndex={-1}>
             <SharedSectionHeader
                icon={<Sparkles className="h-4 w-4 text-cyan-300" />}
                 after={(
                   <span className="precision-match-card__badge">
                     <Sparkles className="h-3 w-3" aria-hidden="true" />
                     Advanced engine
                   </span>
                 )}
                 title="Precision Auto-match"
             />
              <div className="app-card-body">
                <div className="flex flex-wrap items-start justify-between gap-3">
                 <div>
                     <p className="text-xs font-semibold text-cyan-100">A refined mineral match, tuned across your selected waters and salts.</p>
                    <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-400">
                          Run the precision match, then open the details only when you want to tune the result.
                   </p>
                 </div>
                   <div className="flex shrink-0 flex-col items-stretch gap-2">
                     <div className="flex items-center justify-end gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                           watermancerCurrentStatus === 'matched'
                            ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                             : watermancerCurrentStatus === 'partial'
                              ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                              : 'border-rose-400/30 bg-rose-500/10 text-rose-300'
                        }`}>
                           {watermancerStatusLabel}
                       </span>
                     </div>
                   </div>
               </div>
                <div className={`watermancer-result-summary mt-4 rounded-2xl border ${watermancerStatusTone.border} ${watermancerStatusTone.background} p-3.5 sm:p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${watermancerStatusTone.dot}`} aria-hidden="true" />
                      <div className="min-w-0">
                        <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${watermancerStatusTone.label}`}>
                          Current route
                        </div>
                        <div className={`mt-1 text-xl font-semibold tracking-tight ${watermancerStatusTone.value}`}>
                          {watermancerStatusLabel}
                        </div>
                        <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-slate-300/75">
                          {watermancerStatusDescription}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                 {false && (<details
                   className="mt-3 rounded-xl border border-slate-700/70 bg-slate-950/20"
                   open={false}
                 >
                     <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-semibold text-slate-200">
                     <span>Show match details</span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                   </summary>
                   <div className="border-t border-slate-700/60 px-3 py-3">
                  {watermancerLiveResult.primaryPlan.diagnostics && (
                   <div className="mt-3 rounded-xl border border-cyan-300/20 bg-slate-950/20 px-3 py-3">
                     <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/75">
                       Why this match wins
                     </div>
                     <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
                       {watermancerLiveResult.explanation}
                     </p>
                     <div className="mt-2 grid gap-2 sm:grid-cols-4">
                       <div>
                         <div className="text-[9px] uppercase tracking-wider text-slate-500">Target deviation</div>
                         <div className="mt-0.5 text-xs font-semibold tabular-nums text-slate-200">
                            {watermancerLiveResult.primaryPlan.diagnostics!.targetDeviationPpm.toFixed(2)} ppm
                         </div>
                       </div>
                       <div>
                         <div className="text-[9px] uppercase tracking-wider text-slate-500">Policy allowance</div>
                         <div className="mt-0.5 text-xs font-semibold tabular-nums text-amber-200">
                            {watermancerLiveResult.primaryPlan.diagnostics!.policyAllowancePpm.toFixed(2)} ppm
                         </div>
                       </div>
                       <div>
                         <div className="text-[9px] uppercase tracking-wider text-slate-500">Outside policy</div>
                         <div className="mt-0.5 text-xs font-semibold tabular-nums text-rose-200">
                            {watermancerLiveResult.primaryPlan.diagnostics!.policyViolationPpm.toFixed(2)} ppm
                         </div>
                       </div>
                       <div>
                         <div className="text-[9px] uppercase tracking-wider text-slate-500">Salt choice</div>
                         <div className="mt-0.5 text-xs font-semibold text-slate-200">
                            {watermancerLiveResult.primaryPlan.diagnostics!.optionalSaltIds.length
                              - watermancerLiveResult.primaryPlan.diagnostics!.omittedOptionalSaltIds.length} used
                           <span className="font-normal text-slate-500">
                              {' '}· {watermancerLiveResult.primaryPlan.diagnostics!.fixedSaltIds.length} fixed
                           </span>
                         </div>
                       </div>
                     </div>
                       {watermancerLiveResult.primaryPlan.diagnostics!.conflicts.length > 0 && (
                        <div className="mt-3 border-t border-cyan-300/10 pt-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200/80">
                            What is still conflicting
                          </div>
                          <ul className="mt-2 space-y-2" aria-label="Watermancer ion conflicts">
                            {watermancerLiveResult.primaryPlan.diagnostics!.conflicts.map(conflict => (
                              <li
                                 key={conflict.id}
                                 className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300/10 bg-amber-950/10 px-2.5 py-2"
                                 style={ionVisualStyle(conflict.id)}
                               >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                                     <span className="text-[color:var(--ion-fg)]" title={ION_MAP[conflict.id].name}>{ION_MAP[conflict.id].formula}</span>
                                    <span className={`rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                                      conflict.direction === 'deficit'
                                        ? 'bg-amber-400/10 text-amber-200'
                                        : 'bg-rose-400/10 text-rose-200'
                                    }`}>
                                      {conflict.direction}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 text-[10px] text-slate-400">
                                    {conflict.source === 'water' ? 'Water contribution' : conflict.source === 'salts' ? 'Salt contribution' : 'Water + salt contribution'}
                                  </div>
                                </div>
                                <div className="shrink-0 text-right text-[10px] tabular-nums">
                                  <div className="text-slate-300">
                                    {conflict.actual.toFixed(2)} actual <span className="text-slate-500">/</span> {conflict.target.toFixed(2)} target ppm
                                  </div>
                                  <div className="mt-0.5 font-semibold text-amber-200">
                                    {conflict.outsidePolicyPpm.toFixed(2)} ppm outside policy
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {watermancerLiveResult.primaryPlan.diagnostics!.recommendations.length > 0 && (
                        <div className="mt-3 border-t border-cyan-300/10 pt-3">
                           <div className="flex flex-wrap items-center justify-between gap-2">
                             <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200/80">
                               Ways to improve it
                             </div>
                              {watermancerLiveResult.primaryPlan.diagnostics!.recommendations.some(
                               recommendation => recommendation.action.type !== 'review-controls',
                             ) && (
                               <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-200">
                                 One-click fixes available
                               </span>
                             )}
                           </div>
                          <p className="mt-1 text-[10px] text-slate-500">
                             Apply a safe adjustment directly, or review the controls for changes that need your judgment.
                          </p>
                           {(() => {
                                const nextFix = watermancerLiveResult.primaryPlan.diagnostics!.recommendations.find(
                                 recommendation => recommendation.action.type !== 'review-controls',
                              );
                             return nextFix ? (
                               <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300/20 bg-gradient-to-r from-emerald-500/[0.1] via-cyan-500/[0.06] to-transparent px-3 py-2.5">
                                 <div className="min-w-0">
                                   <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-200/75">Recommended next move</div>
                                    <div className="mt-0.5 text-[11px] font-semibold text-emerald-50">{nextFix?.label}</div>
                                 </div>
                                 <button
                                   type="button"
                                      onClick={() => nextFix && handleApplyWatermancerRecommendation(nextFix)}
                                    disabled={watermancerActionRunning}
                                   className="shrink-0 rounded-lg border border-emerald-300/35 bg-emerald-400/15 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-100 transition hover:border-emerald-200/60 hover:bg-emerald-400/25 disabled:cursor-wait disabled:opacity-60"
                                 >
                                   Apply fix
                                 </button>
                               </div>
                             ) : null;
                           })()}
                          <ul className="mt-2 space-y-1.5" aria-label="Watermancer improvement suggestions">
                            {watermancerLiveResult.primaryPlan.diagnostics!.recommendations.map(recommendation => (
                               <li key={`${recommendation.kind}-${recommendation.ionIds.join('-')}`} className="rounded-lg border border-emerald-300/10 bg-emerald-950/10 px-2.5 py-2">
                                 <div className="flex flex-wrap items-start justify-between gap-2">
                                   <div className="min-w-0">
                                     <div className="text-[11px] font-semibold text-emerald-100">{recommendation.label}</div>
                                     <div className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{recommendation.rationale}</div>
                                   </div>
                                   <button
                                     type="button"
                                      onClick={() => handleApplyWatermancerRecommendation(recommendation)}
                                      disabled={watermancerActionRunning}
                                     className="shrink-0 rounded-md border border-emerald-300/20 bg-emerald-400/[0.08] px-2 py-1 text-[9px] font-semibold text-emerald-200 transition hover:border-emerald-200/50 hover:bg-emerald-400/15 disabled:cursor-wait disabled:opacity-60"
                                   >
                                     {recommendation.action.type === 'review-controls' ? 'Review controls' : 'Apply'}
                                   </button>
                                 </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                   </div>
                 )}
                    </div>
                  </details>)}
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
                            style={{ ...ionVisualStyle(id), boxShadow: 'inset 3px 0 0 var(--ion-border)' }}
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-slate-200">
                                Where should <span className="text-[color:var(--ion-fg)]" title={ION_MAP[id].name}>{ION_MAP[id].formula}</span> come from?
                              </span>
                              <span className="sr-only">{ION_MAP[id].name}</span>
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
                   <div className="grid gap-2 sm:grid-cols-2">
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
                                <div key={salt.id} className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1" style={saltVisualStyle(salt)}>
                                  <span className="min-w-0">
                                    <span className="block truncate text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(salt).primary } as CSSProperties}>{salt.name}</span>
                                    <span className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-slate-500">
                                      <span>{form?.label ?? ''} ·</span>
                                      <SaltIonBadges salt={salt} />
                                    </span>
                                  </span>
                                  <span className="shrink-0 font-semibold tabular-nums text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(salt).primary } as CSSProperties}>{massMg.toFixed(1)} mg</span>
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
                            <div key={deviation.id} className="flex items-center justify-between gap-2 text-[10px]" style={ionVisualStyle(deviation.id)}>
                              <span className="truncate font-semibold text-[color:var(--ion-fg)]" title={ION_MAP[deviation.id].name}>{ION_MAP[deviation.id].formula}</span>
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
                        onClick={() => handleUseWatermancerBestMatch()}
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
                   <div className="text-[10px] uppercase tracking-wider text-slate-500">Active plan</div>
                   <div className="mt-1 text-xs font-semibold text-slate-200">Primary match</div>
                 </div>
                 <div className="rounded-lg border border-slate-700/60 bg-slate-900/35 px-3 py-2">
                   <div className="text-[10px] uppercase tracking-wider text-slate-500">Water volume</div>
                   <div className="mt-1 text-xs font-semibold tabular-nums text-slate-200">
                     {[...mineralWaters, ...additionWaters].reduce((total, water) => total + num(water.volumeMl), 0).toFixed(0)} mL
                   </div>
                 </div>
                 <div className="rounded-lg border border-slate-700/60 bg-slate-900/35 px-3 py-2">
                   <div className="text-[10px] uppercase tracking-wider text-slate-500">Active salts</div>
                   <div className="mt-1 text-xs font-semibold text-slate-200">
                     {Object.values(activeWatermancerSaltTargets).filter(target => target > 0.000001).length} selected
                   </div>
                 </div>
                </div>
              </div>
            </div>
          )}
       </div>
      {(showAlchemist || showWatermancer) && (
        <button
          type="button"
          onClick={() => {
            setRecipeStepsPromptDismissed(true);
            setShowBrewerSteps('dry');
          }}
          className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur transition hover:-translate-y-0.5 active:translate-y-0 ${
            showAlchemist && hasSaltRecipeTargets && !recipeStepsPromptDismissed
              ? 'max-w-[calc(100vw-2rem)] border-emerald-200/70 bg-emerald-400 text-slate-950 shadow-emerald-950/60 ring-2 ring-emerald-200/25 ring-offset-2 ring-offset-slate-950 hover:bg-emerald-300'
              : showAlchemist
                ? 'border-emerald-300/45 bg-emerald-500/90 text-white shadow-emerald-950/40 hover:bg-emerald-400'
                : showWatermancer
                  ? 'border-cyan-300/45 bg-indigo-600/90 text-white shadow-indigo-950/40 hover:bg-indigo-500'
                  : 'border-sky-300/45 bg-sky-600/90 text-white shadow-sky-950/40 hover:bg-sky-500'
          }`}
          aria-label={showAlchemist && hasSaltRecipeTargets ? 'See how to make this recipe and save it as an image' : 'Open recipe steps'}
          title={showAlchemist && hasSaltRecipeTargets ? 'See how to make this recipe and save it as an image' : 'Open the current recipe steps'}
        >
          <ListChecks className="h-4 w-4 shrink-0" />
          {showAlchemist && hasSaltRecipeTargets && !recipeStepsPromptDismissed ? (
            <span className="min-w-0 text-left">
              <span className="block truncate">Get recipe card</span>
              <span className="mt-0.5 block text-[10px] font-medium text-slate-800/75">Exact steps · Save as image</span>
            </span>
          ) : (
            <span>Recipe steps</span>
          )}
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
      {showBrewerSteps && (
        <BrewerRecipeStepsModal
          recipeName={recipeStepsProfileName}
          saltTargets={recipeStepsSaltTargets}
          recipeRows={rows}
          liters={L}
           volumeUnit={volumeUnit}
          concentrateOn={concentrateOn}
           allInOneConcentrate={showAlchemist && concentrateOn}
          concentrateLiters={concL}
          concentrateStrength={concentrateStrength}
          baseWaters={nerdLevel === 'brewer' ? [] : mineralWaters}
          additionWaters={nerdLevel === 'brewer' ? [] : additionWaters}
          baseWaterScale={sourceScale}
          batchMl={batchMl}
          suggestedSaltTargets={recipeStepsSuggestedSaltTargets}
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
          <div className="w-full max-w-6xl max-h-[86vh] bg-slate-800 rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 shrink-0">
              <h2 className="text-sm font-semibold text-slate-200">Community waters</h2>
              <button onClick={() => setCommunityModalOpen(false)} className="text-slate-500 hover:text-slate-200 transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body */}
            <div className="min-w-0 flex-1 overflow-y-auto p-4">
              {communityLoading ? (
                <p className="text-xs text-slate-500 italic text-center py-8">Loading community waters…</p>
              ) : communityWaters.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-8">No community waters found yet.</p>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <label className="flex min-w-[190px] flex-1 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sky-300">
                      <span className="text-base leading-none">⌕</span>
                      <input
                        value={communitySearch}
                        onChange={event => setCommunitySearch(event.target.value)}
                        placeholder="Search water or country…"
                        aria-label="Search community waters"
                        className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
                      />
                    </label>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Sort</span>
                    <select
                      value={communitySortIon}
                      onChange={event => {
                        const value = event.target.value;
                        if (value === 'name' || COMMUNITY_BROWSER_ION_IDS.includes(value as IonId)) setCommunitySortIon(value as IonId | 'name');
                      }}
                      aria-label="Sort community waters"
                      className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs text-slate-300 outline-none"
                    >
                      <option value="name">Name</option>
                      {COMMUNITY_BROWSER_ION_IDS.map(id => <option key={id} value={id}>{communityBrowserIonLabel(id)}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setCommunitySortDescending(value => !value)}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300 transition hover:border-sky-400/50 hover:text-sky-200"
                      aria-label={`Sort ${communitySortDescending ? 'ascending' : 'descending'}`}
                      title={`Sort ${communitySortDescending ? 'ascending' : 'descending'}`}
                    >
                      {communitySortDescending ? '↓ High' : '↑ Low'}
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/30">
                    <div>
                      <div className="hidden grid-cols-[minmax(220px,2fr)_repeat(7,minmax(48px,0.78fr))_minmax(105px,0.95fr)] items-center gap-3 bg-slate-900/80 px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:grid">
                        <span>Water / focus</span>
                        {COMMUNITY_BROWSER_ION_IDS.map(id => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              if (communitySortIon === id) setCommunitySortDescending(value => !value);
                              else {
                                setCommunitySortIon(id);
                                setCommunitySortDescending(true);
                              }
                            }}
                             className="text-left text-[color:var(--ion-fg)] transition hover:brightness-125"
                             style={ionVisualStyle(id)}
                            aria-label={`Sort by ${ION_MAP[id].name}`}
                          >
                            {communityBrowserIonLabel(id)}
                          </button>
                        ))}
                        <span>Action</span>
                      </div>
                      {communityVisibleWaters.map(w => {
                    const alreadyAdded = localWaters.some(l => l.sourceId === w.id);
                    const note = communityBrowserNote(w);
                    const strongestNoteIon = note.ionIds.reduce((strongest, id) =>
                      Number(w.ions[id] ?? 0) > Number(w.ions[strongest] ?? 0) ? id : strongest,
                    note.ionIds[0]);
                    const circleIon = communitySortIon === 'name' ? strongestNoteIon : communitySortIon;
                    const circleValue = Number(w.ions[circleIon] ?? 0);
                    const circleColor = ION_MAP[strongestNoteIon].color.bar;
                    const maxIon = (id: IonId) => Math.max(1, ...communityWaters.map(water => Number(water.ions[id] ?? 0)));
                    return (
                      <div key={w.id} className="grid grid-cols-2 items-center gap-x-4 gap-y-3 border-t border-slate-800 px-4 py-3 transition hover:bg-sky-950/20 sm:grid-cols-[minmax(220px,2fr)_repeat(7,minmax(48px,0.78fr))_minmax(105px,0.95fr)] sm:gap-3">
                        <div className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border-2 bg-slate-950/70 leading-none" style={{ borderColor: circleColor, boxShadow: `0 0 16px ${circleColor}22` }}>
                            <b className="text-[11px] tabular-nums tracking-tight">{circleValue.toLocaleString(undefined, { maximumFractionDigits: 1 })}</b>
                            <small className="mt-1 text-[7px] leading-none text-slate-500">mg/L</small>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold leading-tight" style={{ color: circleColor }}>
                              <span className="flex shrink-0 gap-0.5">{note.ionIds.map(id => <i key={id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: ION_MAP[id].color.bar }} />)}</span>
                              <span className="truncate">{note.text}</span>
                            </div>
                            <span className="mt-1 block truncate text-xs font-medium text-slate-200">{w.name || `Water #${w.id}`}</span>
                            <span className="mt-1 block truncate text-[10px] text-slate-500">{Object.keys(w.ions).length} ions in profile</span>
                          </div>
                        </div>
                        {COMMUNITY_BROWSER_ION_IDS.map(id => {
                          const value = Number(w.ions[id] ?? 0);
                          return (
                            <div key={id}>
                              <div className="mb-1 h-1 rounded-full bg-slate-800">
                                <div className="h-full rounded-full" style={{ width: `${Math.max(value > 0 ? 4 : 0, value / maxIon(id) * 100)}%`, backgroundColor: ION_MAP[id].color.bar }} />
                              </div>
                              <span className="text-xs tabular-nums" style={{ color: ION_MAP[id].color.foreground }}>{value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                            </div>
                          );
                        })}
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
                          className={`col-span-2 text-xs font-medium rounded-lg px-3 py-1.5 transition sm:col-span-1 ${
                            alreadyAdded
                              ? 'text-slate-500 bg-slate-700/30 cursor-default'
                              : 'text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30'
                          }`}
                        >
                          {alreadyAdded ? 'Added' : 'Add to my waters'}
                        </button>
                      </div>
                    );
                  })}
                    </div>
                  </div>
                  <p className="mt-3 text-[10px] text-slate-500">{communityVisibleWaters.length} public source profiles · click an ion header to sort</p>
                </>
              )}
              {!communityLoading && communityWaters.filter(w => w.shared === 'yes').length === 0 && communityWaters.length > 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">No publicly shared waters available.</p>
              )}
              {!communityLoading && communityWaters.filter(w => w.shared === 'yes').length > 0 && communityVisibleWaters.length === 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">No waters match that search.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiySingleSaltConcentrateBuilder({
  volumeUnit,
  onToggleVolumeUnit,
  dropsPerMl,
  dropperStyle,
  onDropperStyleChange,
  straightDropsPerMl,
  diySaltTargets,
  diySaltForms,
  diyFinalLiters,
  onPlanChange,
}: {
  volumeUnit: VolumeUnit;
  onToggleVolumeUnit: () => void;
  dropsPerMl: number;
  dropperStyle: LotusDropperStyle;
  onDropperStyleChange: (style: LotusDropperStyle) => void;
  straightDropsPerMl: number;
  diySaltTargets: Record<string, number>;
  diySaltForms: Record<string, number>;
  diyFinalLiters: number;
  onPlanChange: (plan: ConcentratePlanSnapshot) => void;
}) {
  const activeSaltIds = useMemo(
    () => SALTS
      .filter(salt => (diySaltTargets[salt.id] ?? 0) > 0)
      .map(salt => salt.id),
    [diySaltTargets],
  );
  const [saltId, setSaltId] = useState(() => activeSaltIds[0] ?? 'mgso4');
  const selectedSalt = SALTS.find(salt => salt.id === saltId) ?? SALTS[0];
  const safeFormIdx = Math.min(
    Math.max(0, diySaltForms[saltId] ?? selectedSalt.defaultFormIdx ?? 0),
    Math.max(0, selectedSalt.hydrationForms.length - 1),
  );
  const targetFromCalculator = Number(diySaltTargets[saltId] ?? 0);
  const target = targetFromCalculator > 0 ? targetFromCalculator : 40;
  const handoff = useMemo<ConcentrateRecipeHandoff>(() => ({
    name: 'DIY single-salt concentrate',
    salts: {
      [saltId]: {
        target: String(target),
        formIdx: safeFormIdx,
      },
    },
    finalLiters: diyFinalLiters > 0 ? diyFinalLiters : 1,
  }), [diyFinalLiters, safeFormIdx, saltId, target]);

  useEffect(() => {
    if (activeSaltIds.length > 0 && !activeSaltIds.includes(saltId)) {
      setSaltId(activeSaltIds[0]);
    }
  }, [activeSaltIds, saltId]);

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/10 via-slate-800/70 to-violet-500/10 p-4 shadow-xl sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-fuchsia-100">
              <FlaskConical className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
              DIY single-salt concentrate
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              Use the same bottle-card workflow as recipe concentrates, with one selected mineral per bottle.
              The target below follows the current Calculator setup when that salt is active.
            </p>
          </div>
          <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-200">
            One bottle
          </span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Mineral</span>
            <select
              value={saltId}
              onChange={event => setSaltId(event.target.value)}
              className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-100 outline-none"
              aria-label="DIY concentrate mineral"
            >
              {SALTS.map(salt => (
                <option key={salt.id} value={salt.id}>{salt.name}</option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hydration form</span>
            <div className="mt-1 text-sm font-semibold text-slate-100">
              {selectedSalt.hydrationForms[safeFormIdx]?.label ?? 'Default form'}
            </div>
            <span className="mt-1 block text-[9px] text-slate-600">Uses the form selected in Calculator</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-300/20 bg-cyan-400/[0.06] px-3 py-2 text-[10px]">
          <span className="text-slate-400">Calculator target</span>
          <strong className="tabular-nums text-cyan-100">
            {targetFromCalculator > 0 ? `${recipeConcentrateNumber(targetFromCalculator, 1)} ppm/L` : 'No active target · using 40 ppm/L starter'}
          </strong>
        </div>
      </section>
      <RecipeConcentrateBuilder
        handoff={handoff}
        volumeUnit={volumeUnit}
        dropsPerMl={dropsPerMl}
        dropperStyle={dropperStyle}
        onDropperStyleChange={onDropperStyleChange}
        straightDropsPerMl={straightDropsPerMl}
        restoredPlan={null}
        onToggleVolumeUnit={onToggleVolumeUnit}
        onClear={() => undefined}
        onPlanChange={onPlanChange}
        singleSaltOnly
      />
    </div>
  );
}

function ConcentrateWorkspace({
  volumeUnit,
  onToggleVolumeUnit,
  recipeHandoff,
  onClearRecipeHandoff,
  dropsPerMl,
  diySaltTargets,
  diySaltForms,
  diyFinalLiters,
  restoredRecipePlan,
  restoreSnapshot,
  onRestoreSnapshotConsumed,
  onSnapshotChange,
}: {
  volumeUnit: VolumeUnit;
  onToggleVolumeUnit: () => void;
  recipeHandoff: ConcentrateRecipeHandoff | null;
  onClearRecipeHandoff: () => void;
  dropsPerMl: number;
  diySaltTargets: Record<string, number>;
  diySaltForms: Record<string, number>;
  diyFinalLiters: number;
  restoredRecipePlan: ConcentratePlanSnapshot | null;
  restoreSnapshot: WaterPlanConcentrateSnapshot | null;
  onRestoreSnapshotConsumed: () => void;
  onSnapshotChange: (snapshot: WaterPlanConcentrateSnapshot) => void;
}) {
  const [concentrateMode, setConcentrateMode] = useState<ConcentrateMode>('builder');
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
  const [showConcentrateSteps, setShowConcentrateSteps] = useState(false);
  const [recipeConcentratePlan, setRecipeConcentratePlan] = useState<ConcentratePlanSnapshot | null>(null);
  const [dropperStyle, setDropperStyle] = useState<LotusDropperStyle>('straight');
  const [straightDropsPerMlInput, setStraightDropsPerMlInput] = useState(String(LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML));

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
  const finalLiters = volumeToLiters(doseLiters, 'liters');
  const resultingPpm = finalLiters > 0 ? finalDrops * mgPerDrop / finalLiters : 0;
  const warnings = useMemo(
    () => strengthPercent > 0
      ? checkConcentrate(1000, { [salt.id]: saltMgPerStockG })
      : [],
    [salt.id, saltMgPerStockG, strengthPercent],
  );
  const hasError = warnings.some(warning => warning.severity === 'error');
  const straightBaselineDropsPerMl = Math.max(
    0.1,
    Number(straightDropsPerMlInput) || LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML,
  );
  const dropperReferenceDropsPerMl = lotusDropsPerMl(dropperStyle, straightBaselineDropsPerMl);
  const toggleStep = (step: number) => {
    setCompletedSteps(prev => ({ ...prev, [step]: !prev[step] }));
  };

  useEffect(() => {
    if (recipeHandoff) setConcentrateMode('builder');
  }, [recipeHandoff]);

  useEffect(() => {
    if (!restoreSnapshot) return;
    setConcentrateMode(restoreSnapshot.mode);
    setSaltId(restoreSnapshot.saltId);
    setFormIdx(restoreSnapshot.formIdx);
    setStrengthInput(restoreSnapshot.strengthInput);
    setTotalStockMassInput(restoreSnapshot.totalStockMassInput);
    setCalibrationDrops(restoreSnapshot.calibrationDrops);
    setCalibrationStockMass(restoreSnapshot.calibrationStockMass);
    setTargetSaltMass(restoreSnapshot.targetSaltMass);
    setDoseDrops(restoreSnapshot.doseDrops);
    setDoseLiters(restoreSnapshot.doseLiters);
    setDropperStyle(restoreSnapshot.dropperStyle);
    setStraightDropsPerMlInput(restoreSnapshot.straightDropsPerMlInput);
    setRecipeConcentratePlan(restoreSnapshot.recipeConcentratePlan as ConcentratePlanSnapshot | null);
    setCompletedSteps({});
    setShowConcentrateSteps(false);
    onRestoreSnapshotConsumed();
  }, [onRestoreSnapshotConsumed, restoreSnapshot]);

  useEffect(() => {
    onSnapshotChange({
      mode: concentrateMode,
      saltId,
      formIdx,
      strengthInput,
      totalStockMassInput,
      calibrationDrops,
      calibrationStockMass,
      targetSaltMass,
      doseDrops,
      doseLiters,
      dropperStyle,
      straightDropsPerMlInput,
      recipeConcentratePlan,
    });
  }, [
    calibrationDrops,
    calibrationStockMass,
    concentrateMode,
    doseDrops,
    doseLiters,
    dropperStyle,
    formIdx,
    onSnapshotChange,
    recipeConcentratePlan,
    saltId,
    straightDropsPerMlInput,
    strengthInput,
    targetSaltMass,
    totalStockMassInput,
  ]);

  if (!recipeHandoff && concentrateMode === 'builder') {
    return (
      <div className="concentrate-workspace space-y-4">
        <div className="app-panel app-panel--quiet app-card rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">Concentrate workspace</div>
                <div className="mt-0.5 text-xs text-slate-500">Prepare one DIY mineral concentrate using the same bottle-card workflow as recipe concentrates.</div>
              </div>
            </div>
            <div role="tablist" aria-label="Concentrate workspace" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
              <button
                type="button"
                role="tab"
                aria-selected
                onClick={() => setConcentrateMode('builder')}
                className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-1.5 text-xs font-semibold text-fuchsia-200 shadow-sm"
              >
                Stock builder
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={false}
                onClick={() => setConcentrateMode('lotus')}
                className="rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition hover:bg-slate-700/50 hover:text-slate-200"
              >
                DIY Lotus Drops
              </button>
            </div>
          </div>
        </div>
        <DiySingleSaltConcentrateBuilder
          volumeUnit={volumeUnit}
          onToggleVolumeUnit={onToggleVolumeUnit}
          dropsPerMl={dropsPerMl}
          dropperStyle={dropperStyle}
          onDropperStyleChange={setDropperStyle}
          straightDropsPerMl={straightBaselineDropsPerMl}
          diySaltTargets={diySaltTargets}
          diySaltForms={diySaltForms}
          diyFinalLiters={diyFinalLiters}
          onPlanChange={setRecipeConcentratePlan}
        />
        <button
          type="button"
          onClick={() => setShowConcentrateSteps(true)}
          className="recipe-steps-fab fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border border-fuchsia-300/45 bg-fuchsia-600/90 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-fuchsia-950/40 backdrop-blur transition hover:-translate-y-0.5 hover:bg-fuchsia-500 active:translate-y-0"
          aria-label="Open concentrate recipe steps"
          title="Open concentrate preparation and dosing steps"
        >
          <ListChecks className="h-4 w-4" aria-hidden="true" />
          <span>Recipe steps</span>
        </button>
        {showConcentrateSteps && (
          <ConcentrateRecipeStepsModal
            recipeHandoff={null}
            plan={recipeConcentratePlan}
            volumeUnit={volumeUnit}
            dropsPerMl={dropsPerMl}
            dropperStyle={dropperStyle}
            dropperReferenceDropsPerMl={dropperReferenceDropsPerMl}
            onClose={() => setShowConcentrateSteps(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="concentrate-workspace space-y-4">
      <div className="app-panel app-panel--quiet app-card rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">Concentrate workspace</div>
              <div className="mt-0.5 text-xs text-slate-500">
                {concentrateMode === 'lotus'
                  ? 'Craft four independent mineral droppers for your own brewing setup.'
                  : 'Build and calibrate a single-mineral concentrate by weight.'}
              </div>
            </div>
          </div>
          <div role="tablist" aria-label="Concentrate workspace" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
            {([
              ['builder', 'Stock builder', 'Build one concentrate'],
              ['lotus', 'DIY Lotus Drops', 'Four independent dropper concentrates'],
            ] as const).map(([value, label, description]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={concentrateMode === value}
                onClick={() => setConcentrateMode(value)}
                title={description}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  concentrateMode === value
                    ? value === 'lotus'
                      ? 'border border-rose-400/40 bg-rose-500/15 text-rose-200 shadow-sm'
                      : 'border border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200 shadow-sm'
                    : 'border border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {concentrateMode === 'lotus' ? (
        <LotusDropsSection
          style={dropperStyle}
          onStyleChange={setDropperStyle}
          straightDropsPerMlInput={straightDropsPerMlInput}
          onStraightDropsPerMlChange={setStraightDropsPerMlInput}
        />
      ) : recipeHandoff ? (
        <RecipeConcentrateBuilder
          handoff={recipeHandoff}
          volumeUnit={volumeUnit}
          dropsPerMl={dropsPerMl}
          dropperStyle={dropperStyle}
          onDropperStyleChange={setDropperStyle}
          straightDropsPerMl={straightBaselineDropsPerMl}
           restoredPlan={restoredRecipePlan}
          onToggleVolumeUnit={onToggleVolumeUnit}
          onClear={onClearRecipeHandoff}
          onPlanChange={setRecipeConcentratePlan}
        />
      ) : (
        <>
      <section className="rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/10 via-slate-800/70 to-violet-500/10 p-5 shadow-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-fuchsia-100">
              <FlaskConical className="h-4 w-4 text-fuchsia-300" />
              Build one concentrate
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              Make a repeatable mineral concentrate by weight, then use calibrated drops in your brew water.
            </p>
          </div>
          <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-200">
            Step-by-step
          </span>
        </div>
      </section>

       <section className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 shadow-xl sm:p-6" style={saltVisualStyle(salt)}>
        <StepHeading number="1" title="Choose the mineral" icon={<GiSaltShaker className="h-3.5 w-3.5" aria-hidden="true" />} />
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
         <p className="mt-3 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
           <span>Selected:</span>
           <span className="font-semibold text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(salt).primary } as CSSProperties}>{salt.name}</span>
           <span>·</span>
           <SaltIonBadges salt={salt} />
           <span>· {form.label} · {form.molarMass.toFixed(3)} g/mol</span>
         </p>
      </section>

      <section className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 shadow-xl sm:p-6">
        <StepHeading number="2" title="Choose concentrate strength and batch weight" icon={<Gauge className="h-3.5 w-3.5" aria-hidden="true" />} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Concentrate strength</span>
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
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total concentrate weight</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                value={totalStockMassInput}
                onChange={event => setTotalStockMassInput(event.target.value)}
                className="w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
                aria-label="Total concentrate weight in grams"
              />
              <span className="text-sm text-slate-400">g</span>
            </div>
          </label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <SummaryMetric label="Salt to weigh" value={saltMassLabel} detail={salt.name} tone="fuchsia" />
          <SummaryMetric label="Water to weigh" value={`${waterMassG.toFixed(2)} g`} detail="distilled or RO water" tone="slate" />
          <SummaryMetric label="Salt per concentrate gram" value={`${saltMgPerStockG.toFixed(1)} mg`} detail={salt.name} tone="slate" />
        </div>
        {warnings.length > 0 && (
          <div className={`mt-3 rounded-xl border px-3 py-3 text-[11px] leading-relaxed ${hasError ? 'border-rose-400/30 bg-rose-500/[0.08] text-rose-200' : 'border-amber-400/30 bg-amber-500/[0.08] text-amber-200'}`}>
            <div className="font-semibold">{hasError ? 'Check this strength before mixing' : 'Mixing note'}</div>
            {warnings.map(warning => <p key={warning.message} className="mt-1">{warning.message}</p>)}
          </div>
        )}
      </section>

      <DropperReferenceCard
        referenceStyle={dropperStyle}
        onStyleChange={setDropperStyle}
        straightDropsPerMl={straightBaselineDropsPerMl}
        authoritativeDropsPerMl={dropsPerMl}
      />

      <section className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 shadow-xl sm:p-6">
        <StepHeading number="3" title="Preparation" icon={<Layers className="h-3.5 w-3.5" aria-hidden="true" />} />
        <div className="mt-4 space-y-2">
           {[
             <>Weigh <strong className="text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(salt).primary } as CSSProperties}>{saltMassLabel} of {salt.name}</strong> ({form.label}).</>,
             <>Add <strong>{waterMassG.toFixed(2)} g</strong> of distilled or RO water.</>,
             <>Combine until the total concentrate weighs <strong>{totalStockMassG.toFixed(2)} g</strong>.</>,
             <>Shake until clear, then label: <strong className="text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(salt).primary } as CSSProperties}>{salt.name}</strong> · {strengthPercent || 0}% w/w · {totalStockMassG.toFixed(2)} g total.</>,
           ].map((step, index) => (
            <button
               key={`${salt.id}-preparation-${index}`}
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
        <StepHeading number="4" title="Calibration" icon={<Droplet className="h-3.5 w-3.5" aria-hidden="true" />} />
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
          <SummaryMetric label="Drops per gram" value={measuredGramsPerDrop > 0 ? `${(1 / measuredGramsPerDrop).toFixed(1)}` : '—'} detail="this concentrate" tone="sky" />
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
          This weight calibration applies to this concentrate. Recalibrate whenever you change the bottle, dropper, or technique.
        </p>
      </section>

      <section className="rounded-2xl border border-emerald-400/25 bg-slate-800/70 p-4 shadow-xl sm:p-6">
        <StepHeading number="5" title="Dose" icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />} />
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Dose a target mineral amount</div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Enter the salt mass you want to add. The recommendation rounds to a whole drop using this concentrate calibration.
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
          <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2">
            <span className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
              Final water ({volumeUnitShortLabel(volumeUnit)})
              <VolumeUnitToggle unit={volumeUnit} onToggle={onToggleVolumeUnit} />
            </span>
            <VolumeInput
              liters={finalLiters}
              unit={volumeUnit}
              onChangeLiters={setDoseLiters}
              ariaLabel={`Final water volume in ${volumeUnitLabel(volumeUnit)}`}
              className="mt-1 w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3">
           <span className="text-xs text-slate-400">
             {finalDrops} drops × {mgPerDrop.toFixed(2)} mg/drop of{' '}
             <strong className="text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(salt).primary } as CSSProperties}>{salt.name}</strong>
           </span>
          <strong className="text-xl tabular-nums text-emerald-200">{resultingPpm.toFixed(2)} mg/L</strong>
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
          Keep each mineral concentrate in its own bottle. Add individual concentrates to the final water, especially for calcium, sulfate, bicarbonate, and citrate salts.
        </p>
      </section>
        </>
      )}
      <button
        type="button"
        onClick={() => setShowConcentrateSteps(true)}
        className="recipe-steps-fab fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border border-fuchsia-300/45 bg-fuchsia-600/90 px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-fuchsia-950/40 backdrop-blur transition hover:-translate-y-0.5 hover:bg-fuchsia-500 active:translate-y-0"
        aria-label="Open concentrate recipe steps"
        title="Open concentrate preparation and dosing steps"
      >
        <ListChecks className="h-4 w-4" aria-hidden="true" />
        <span>Recipe steps</span>
      </button>
      {showConcentrateSteps && (
        <ConcentrateRecipeStepsModal
          recipeHandoff={recipeHandoff}
          plan={recipeConcentratePlan}
          volumeUnit={volumeUnit}
          dropsPerMl={dropsPerMl}
          dropperStyle={dropperStyle}
          dropperReferenceDropsPerMl={dropperReferenceDropsPerMl}
          onClose={() => setShowConcentrateSteps(false)}
        />
      )}
    </div>
  );
}

function LotusDropsSection({
  style,
  onStyleChange,
  straightDropsPerMlInput,
  onStraightDropsPerMlChange,
}: {
  style: LotusDropperStyle;
  onStyleChange: (style: LotusDropperStyle) => void;
  straightDropsPerMlInput: string;
  onStraightDropsPerMlChange: (value: string) => void;
}) {
  const [stockVolumeInput, setStockVolumeInput] = useState(String(LOTUS_BOTTLE_VOLUME_ML));

  const stockVolumeMl = Math.max(1, Number(stockVolumeInput) || LOTUS_BOTTLE_VOLUME_ML);
  const straightBaselineDropsPerMl = Math.max(0.1, Number(straightDropsPerMlInput) || LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML);
  const activeDropsPerMl = lotusDropsPerMl(style, straightBaselineDropsPerMl);
  const roundDropsPerMl = lotusDropsPerMl('round', straightBaselineDropsPerMl);
  const straightModelDropsPerMl = lotusDropsPerMl('straight', straightBaselineDropsPerMl);
  const stockPlans = LOTUS_DROPPER_DEFINITIONS.map(dropper => (
    lotusStockPlan(dropper, style, stockVolumeMl, straightBaselineDropsPerMl)
  ));

  return (
    <section className="space-y-4 rounded-2xl border border-rose-400/25 bg-gradient-to-br from-rose-500/[0.08] via-slate-800/80 to-amber-500/[0.06] p-4 shadow-xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-100">
            <FlaskConical className="h-4 w-4 text-rose-300" />
            DIY Lotus Drops
          </div>
           <h2 className="mt-2 text-xl font-semibold text-white">Build an independent four-concentrate mineral system</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-400">
             Prepare your own four independent concentrates using public ingredient identities and recipe inputs.
             Choose the recipe you prefer from the official instructions, then use its drop counts with
             your finished droppers. This independent model is not affiliated with or endorsed by Lotus
             Coffee Products, and does not claim to reproduce any proprietary manufacturing formula.
          </p>
        </div>
        <span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-200">
          Independent model
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-amber-300/20 bg-amber-400/[0.06] px-3 py-3 text-[11px] leading-relaxed text-amber-100/80">
          <div className="font-semibold text-amber-200">What this independent model means</div>
          <p className="mt-1">
            The public Lotus recipe calculator lists 450 mL recipe inputs, rounded drops, a 0.56
            Round/1.00 Straight style factor, and a 59 mL bottle size—but not a proprietary batch
            formula or guaranteed drop volume. The default model uses {LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML}
            Straight drops/mL and derives Round at 0.56×. Measure each finished concentrate and replace
            that baseline here. Once your droppers are prepared, use the official recipe instructions
            to select the drop counts for your brew.
          </p>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/25 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Dropper style</div>
              <div className="mt-1 grid grid-cols-2 gap-1 rounded-lg border border-slate-700/60 bg-slate-900/60 p-1">
                {(['round', 'straight'] as LotusDropperStyle[]).map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onStyleChange(option)}
                    aria-pressed={style === option}
                    aria-label={`${option === 'round' ? 'Round' : 'Straight'} dropper style`}
                    className={`group relative rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${
                      style === option
                        ? 'bg-rose-400/15 text-rose-200 ring-1 ring-rose-300/30'
                        : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                    }`}
                  >
                    {option === 'round' ? 'Round' : 'Straight'}
                    <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-36 -translate-x-1/2 translate-y-1 overflow-hidden rounded-xl border border-rose-200/30 bg-white p-1 opacity-0 shadow-2xl shadow-slate-950/60 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                      <img
                        src={option === 'round' ? roundedDropperImage : straightDropperImage}
                        alt={`${option === 'round' ? 'Round' : 'Straight'} dropper`}
                        className="h-28 w-full object-contain"
                      />
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <label>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Concentrate volume</span>
              <span className="mt-1 flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2 py-1.5">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stockVolumeInput}
                  onChange={event => setStockVolumeInput(event.target.value)}
                  className="w-full bg-transparent text-right text-sm font-semibold tabular-nums text-slate-100 outline-none"
                  aria-label="Four-mineral concentrate volume in milliliters"
                />
                <span className="text-xs text-slate-500">mL</span>
              </span>
            </label>
            <label>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Straight drops/mL</span>
              <span className="mt-1 flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-900/60 px-2 py-1.5">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={straightDropsPerMlInput}
                   onChange={event => onStraightDropsPerMlChange(event.target.value)}
                  className="w-full bg-transparent text-right text-sm font-semibold tabular-nums text-slate-100 outline-none"
                  aria-label="Straight dropper calibration in drops per milliliter"
                />
                <span className="text-xs text-slate-500">drops/mL</span>
              </span>
            </label>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <SummaryMetric label="Active style" value={style === 'round' ? 'Round' : 'Straight'} detail={`${activeDropsPerMl.toFixed(1)} drops/mL`} tone="fuchsia" />
            <SummaryMetric label="Round model" value={`${roundDropsPerMl.toFixed(1)}`} detail="drops/mL" tone="slate" />
            <SummaryMetric label="Straight model" value={`${straightModelDropsPerMl.toFixed(1)}`} detail="drops/mL" tone="slate" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <h2 className="text-base font-semibold text-slate-100">Concentrates</h2>
        <span className="text-[11px] text-slate-500">4 independent droppers</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {stockPlans.map(plan => {
          const salt = SALTS.find(item => item.id === plan.saltId);
          const saltColors = salt ? getSaltColorTokens(salt) : null;
          return (
            <article
              key={plan.id}
              className="rounded-xl border border-slate-700/60 bg-slate-950/25 p-4"
              style={salt ? saltVisualStyle(salt) : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[color:var(--salt-primary)]"
                    style={saltColors ? {
                      '--salt-primary': saltColors.primary,
                      borderColor: saltColors.border,
                      backgroundColor: saltColors.primarySoft,
                    } as CSSProperties : undefined}
                  >
                    <Droplet className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--salt-primary)]" style={saltColors ? { '--salt-primary': saltColors.primary } as CSSProperties : undefined}>{plan.label} Dropper</div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                      <span>{plan.saltName} ·</span>
                      {salt ? <SaltIonBadges salt={salt} /> : <span>{plan.saltFormula}</span>}
                      <span>· {plan.hydrationForm}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <SummaryMetric label="Concentrate strength" value={`${plan.saltMgPerMl.toFixed(1)} mg/mL`} detail={plan.saltName} tone="fuchsia" />
                <SummaryMetric label="Salt to weigh" value={`${plan.saltMassG.toFixed(2)} g`} detail={`for ${stockVolumeMl.toFixed(1)} g water`} tone="sky" />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                <strong className="text-slate-200">Tare the bottle and weigh {stockVolumeMl.toFixed(1)} g of distilled/RO water.</strong>
                Add <strong className="text-slate-200">{plan.saltMassG.toFixed(2)} g</strong> of {plan.hydrationForm} {plan.saltName}, then dissolve completely.
                The water number is a mass target—not {stockVolumeMl.toFixed(1)} mL of water and not the total solution weight.
                The selected {style} model contributes about {plan.dropsPerMl.toFixed(1)} drops/mL;
                calibrate the finished concentrate dropper before relying on whole-drop dosing.
              </p>
              <div className="mt-2 text-[10px] text-slate-600">
                Weight-first preparation uses approximately 1 g water ≈ 1 mL; dissolved salt changes final volume slightly, so calibration matters.
              </div>
            </article>
          );
        })}
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">
        Sources:{' '}
        <a className="text-rose-300 underline decoration-rose-300/40 underline-offset-2 hover:text-rose-200" href="https://lotuscoffeeproducts.com/pages/product-instructions" target="_blank" rel="noreferrer">
          Public recipe calculator source
        </a>
        {' · '}
        <a className="text-rose-300 underline decoration-rose-300/40 underline-offset-2 hover:text-rose-200" href="https://lotuscoffeeproducts.com/products/lotus-water-1" target="_blank" rel="noreferrer">
          Ingredient source
        </a>
        {' · '}
        <a className="text-rose-300 underline decoration-rose-300/40 underline-offset-2 hover:text-rose-200" href="https://lotuscoffeeproducts.com/blogs/lotus-blog/precision-brewing-an-exploration-of-dropper-variability-in-making-water-for-coffee" target="_blank" rel="noreferrer">
          Dropper calibration reference
        </a>
      </p>
    </section>
  );
}

function DropperReferenceCard({
  referenceStyle,
  onStyleChange,
  straightDropsPerMl,
  authoritativeDropsPerMl,
}: {
  referenceStyle: LotusDropperStyle;
  onStyleChange: (style: LotusDropperStyle) => void;
  straightDropsPerMl: number;
  authoritativeDropsPerMl: number;
}) {
  const straightReferenceDropsPerMl = lotusDropsPerMl('straight', straightDropsPerMl);
  const roundReferenceDropsPerMl = lotusDropsPerMl('round', straightDropsPerMl);
  const activeDropsPerMl = lotusDropsPerMl(referenceStyle, straightDropsPerMl);
  const safeAuthoritativeDropsPerMl = Number.isFinite(authoritativeDropsPerMl) && authoritativeDropsPerMl > 0
    ? authoritativeDropsPerMl
    : straightReferenceDropsPerMl;

  return (
    <section
      className="rounded-2xl border border-cyan-300/20 bg-slate-800/70 p-4 shadow-xl sm:p-5"
      aria-labelledby="dropper-reference-title"
      data-testid="card-dropper-reference"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-400/[0.08] text-cyan-200">
            <Droplet className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 id="dropper-reference-title" className="text-sm font-semibold text-slate-100">Dropper reference</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">Choose the shape of your dropper tip.</p>
          </div>
        </div>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200/80">
          Informational
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-xl border border-slate-700/60 bg-slate-950/25 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Dropper style</div>
          <div
            className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-slate-700/60 bg-slate-900/60 p-1"
            role="group"
            aria-label="Dropper reference style"
          >
            {(['round', 'straight'] as LotusDropperStyle[]).map(option => (
              <button
                key={option}
                type="button"
                onClick={() => onStyleChange(option)}
                aria-label={`${option === 'round' ? 'Round' : 'Straight'} dropper reference`}
                aria-pressed={referenceStyle === option}
                data-testid={`button-dropper-reference-${option}`}
                className={`group relative rounded-md px-2 py-1.5 text-[10px] font-semibold transition ${
                  referenceStyle === option
                    ? 'bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-300/30'
                    : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
                }`}
              >
                {option === 'round' ? 'Round' : 'Straight'}
                <span className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-36 -translate-x-1/2 translate-y-1 overflow-hidden rounded-xl border border-cyan-200/30 bg-white p-1 opacity-0 shadow-2xl shadow-slate-950/60 transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                  <img
                    src={option === 'round' ? roundedDropperImage : straightDropperImage}
                    alt={`${option === 'round' ? 'Round' : 'Straight'} dropper`}
                    className="h-28 w-full object-contain"
                  />
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-cyan-300/20 bg-cyan-400/[0.05] px-3 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-200/70">Active measurement</div>
          <div className="mt-1 flex items-baseline gap-2" data-testid="text-dropper-reference-active-measurement">
            <strong className="text-lg font-semibold tabular-nums text-cyan-100">
              {referenceStyle === 'round' ? 'Round' : 'Straight'}
            </strong>
            <span className="text-sm font-semibold tabular-nums text-cyan-200">{activeDropsPerMl.toFixed(1)} drops/mL</span>
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
            Reference only; the current calibrated dose remains {safeAuthoritativeDropsPerMl.toFixed(1)} drops/mL.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <SummaryMetric label="Round reference" value={roundReferenceDropsPerMl.toFixed(1)} detail="drops/mL" tone="slate" />
        <SummaryMetric label="Straight reference" value={straightReferenceDropsPerMl.toFixed(1)} detail="drops/mL" tone="sky" />
      </div>
    </section>
  );
}

function LegacyRecipeConcentrateBuilder({
  handoff,
  volumeUnit,
  dropsPerMl,
  dropperStyle,
  onDropperStyleChange,
  straightDropsPerMl,
  restoredPlan,
  onToggleVolumeUnit,
  onClear,
  onPlanChange,
}: {
  handoff: ConcentrateRecipeHandoff;
  volumeUnit: VolumeUnit;
  dropsPerMl: number;
  dropperStyle: LotusDropperStyle;
  onDropperStyleChange: (style: LotusDropperStyle) => void;
  straightDropsPerMl: number;
  restoredPlan: ConcentratePlanSnapshot | null;
  onToggleVolumeUnit: () => void;
  onClear: () => void;
  onPlanChange: (plan: ConcentratePlanSnapshot) => void;
}) {
  const [strengthInput, setStrengthInput] = useState('500');
  const [stockStrategy, setStockStrategy] = useState<'gh-kh' | 'all-in-one' | 'individual'>('gh-kh');
  const [stockStrengthInputs, setStockStrengthInputs] = useState<Record<string, string>>({
    hardness: '500',
    alkalinity: '500',
    citrate: '500',
    'all-in-one': '500',
  });
  const [stockVolumeInputs, setStockVolumeInputs] = useState<Record<string, string>>({
    hardness: '100',
    alkalinity: '100',
    citrate: '100',
    'all-in-one': '100',
  });
  const [measuredDropsPerMlInput, setMeasuredDropsPerMlInput] = useState('');
  const [finalVolumeInput, setFinalVolumeInput] = useState(String(handoff.finalLiters));

  const strength = Math.max(0, Number(strengthInput) || 0);
  const saltTargets = Object.fromEntries(
    Object.entries(handoff.salts).map(([saltId, entry]) => [saltId, num(entry.target)]),
  );
  const formIdxBySaltId = Object.fromEntries(
    Object.entries(handoff.salts).map(([saltId, entry]) => [saltId, entry.formIdx]),
  );
  const compatibleStockGroups = splitIntoStockGroups(saltTargets);
  const activeSaltIds = Object.entries(saltTargets)
    .filter(([, target]) => target > 0)
    .map(([saltId]) => saltId);
  const individualStockGroups = compatibleStockGroups.flatMap(group =>
    group.saltIds.map(saltId => {
      const salt = SALTS.find(item => item.id === saltId);
      return {
        ...group,
        id: `salt:${saltId}`,
        name: `${salt?.name ?? 'Salt'} Stock`,
        saltIds: [saltId],
      };
    }),
  );
  const allInOneStockGroups = activeSaltIds.length > 0
    ? [{
        id: 'all-in-one',
        name: 'All-in-one Stock',
        saltIds: activeSaltIds,
        color: 'violet' as const,
      }]
    : [];
  const stockGroups = stockStrategy === 'all-in-one'
    ? allInOneStockGroups
    : stockStrategy === 'individual'
    ? individualStockGroups
    : compatibleStockGroups;
  const groupTargetsFor = (group: { saltIds: string[] }) => Object.fromEntries(
    group.saltIds.map(saltId => [saltId, saltTargets[saltId] ?? 0]),
  );
  const groupFormsFor = (group: { saltIds: string[] }) => Object.fromEntries(
    group.saltIds.map(saltId => [saltId, formIdxBySaltId[saltId] ?? 0]),
  );
  const maxSafeStrengthFor = (groups: Array<{ saltIds: string[] }>) =>
    groups.length > 0
      ? Math.min(...groups.map(group => findStrongestSafeConcentrateStrength(
        groupTargetsFor(group),
        undefined,
        groupFormsFor(group),
      )))
      : null;
  const maxSafeStrengthByStrategy = {
    'gh-kh': maxSafeStrengthFor(compatibleStockGroups),
    'all-in-one': maxSafeStrengthFor(allInOneStockGroups),
    individual: maxSafeStrengthFor(individualStockGroups),
  };
  const maxSafeStrength = maxSafeStrengthByStrategy[stockStrategy];
  const groupStrengthFor = (group: { id: string }) => stockStrategy === 'all-in-one'
    ? strength
    : Math.max(0, Number(stockStrengthInputs[group.id] ?? '500') || 0);
  const groupMaxSafeStrengthFor = (group: { saltIds: string[] }) =>
    findStrongestSafeConcentrateStrength(groupTargetsFor(group), undefined, groupFormsFor(group));
  const limitingConstraint = findConcentrateLimitingConstraint(
    saltTargets,
    formIdxBySaltId,
  );
  const finalLiters = volumeToLiters(finalVolumeInput, volumeUnit);
  const measuredDropsPerMl = Number(measuredDropsPerMlInput);
  const hasMeasuredDropsPerMl = Number.isFinite(measuredDropsPerMl) && measuredDropsPerMl > 0;
  const assumedDropsPerMl = lotusDropsPerMl(dropperStyle, straightDropsPerMl);
  const activeDropsPerMl = hasMeasuredDropsPerMl ? measuredDropsPerMl : assumedDropsPerMl;
  const allInOneStrengthIsSafe = (
    stockStrategy !== 'all-in-one'
    || (strength > 0 && strength <= (maxSafeStrengthByStrategy['all-in-one'] ?? 0))
  );
  const dropEquivalents = computeRecipeConcentrateDropEquivalents({
    saltTargets,
    formIdxBySaltId,
    strength: allInOneStrengthIsSafe && stockStrategy === 'all-in-one' ? strength : 0,
    dropsPerMl: activeDropsPerMl,
    finalLiters,
  });
  const allInOneWarnings = stockStrategy === 'all-in-one' && strength > 0
    ? checkConcentrate(strength, saltTargets, formIdxBySaltId)
    : [];
  const doseReferenceLiters = volumeUnit === 'gallons' ? US_GALLON_IN_LITERS : 1;
  const doseReferenceLabel = volumeUnit === 'gallons' ? '1 US gallon' : '1 L';
  const doseMlPerLiter = strength > 0 ? 1000 / strength : 0;
  const doseMlPerReference = doseMlPerLiter * doseReferenceLiters;
  const stockStrategyDetails = stockStrategy === 'all-in-one'
    ? {
        label: 'All-in-one',
        helper: 'Every active salt shares one bottle.',
      }
    : stockStrategy === 'individual'
    ? {
        label: 'Separate salts',
        helper: 'One bottle per active salt.',
      }
    : {
        label: 'GH + KH',
        helper: 'Use separate bottles for compatible groups.',
      };
  const planGroupSignature = stockGroups
    .map(group => `${group.id}:${group.saltIds.join(',')}`)
    .join('|');
  const planVolumeSignature = Object.entries(stockVolumeInputs)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupId, volume]) => `${groupId}:${volume}`)
    .join('|');
  const planStrengthSignature = Object.entries(stockStrengthInputs)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([groupId, groupStrength]) => `${groupId}:${groupStrength}`)
    .join('|');
  const planFormSignature = Object.entries(formIdxBySaltId)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([saltId, formIndex]) => `${saltId}:${formIndex}`)
    .join('|');

  useEffect(() => {
    const initialAllInOneStrength = allInOneStockGroups.length > 0
      ? findStrongestSafeConcentrateStrength(
        groupTargetsFor(allInOneStockGroups[0]),
        undefined,
        groupFormsFor(allInOneStockGroups[0]),
      )
      : 1;
    const initialStockStrengths = Object.fromEntries(
      compatibleStockGroups.map(group => [
        group.id,
        String(findStrongestSafeConcentrateStrength(
          groupTargetsFor(group),
          undefined,
          groupFormsFor(group),
        )),
      ]),
    );
    const restored = restoredPlan && restoredPlan.strategy
      ? restoredPlan
      : null;
    setStrengthInput(restored ? String(restored.strength) : String(initialAllInOneStrength));
    setStockStrategy(restored?.strategy ?? 'gh-kh');
    setStockStrengthInputs(restored
      ? Object.fromEntries(restored.groups.map(group => [group.id, String(group.strength)]))
      : {
          hardness: initialStockStrengths.hardness ?? '1',
          alkalinity: initialStockStrengths.alkalinity ?? '1',
          citrate: initialStockStrengths.citrate ?? '1',
          'all-in-one': String(initialAllInOneStrength),
        });
    setStockVolumeInputs(restored
      ? Object.fromEntries(restored.groups.map(group => [group.id, String(group.volumeMl)]))
      : {
          hardness: '100',
          alkalinity: '100',
          citrate: '100',
          'all-in-one': '100',
        });
    setMeasuredDropsPerMlInput(
      restored?.measuredDropsPerMl != null ? String(restored.measuredDropsPerMl) : '',
    );
    setFinalVolumeInput(
      restored?.finalLiters && restored.finalLiters > 0
        ? String(volumeUnit === 'gallons' ? restored.finalLiters / US_GALLON_IN_LITERS : restored.finalLiters)
        : String(volumeUnit === 'gallons' ? handoff.finalLiters / US_GALLON_IN_LITERS : handoff.finalLiters),
    );
  }, [handoff]);

  useEffect(() => {
    onPlanChange({
      strategy: stockStrategy,
      strategyLabel: stockStrategyDetails.label,
      strength,
      maxSafeStrength,
        dropperStyle,
        straightDropsPerMl,
        measuredDropsPerMl: hasMeasuredDropsPerMl ? measuredDropsPerMl : null,
        activeDropsPerMl,
        finalLiters,
        totalSaltMgPerMl: dropEquivalents.totalSaltMgPerMl,
        totalSaltMgPerDrop: dropEquivalents.totalSaltMgPerDrop,
        saltEquivalentPpmPerDrop: dropEquivalents.saltEquivalentPpmPerDrop,
        dropsPerLiter: dropEquivalents.dropsPerLiter,
        batchDrops: dropEquivalents.batchDrops,
      groups: stockGroups.map(group => ({
        id: group.id,
        name: group.name.replace(/ Stock$/, ' Concentrate'),
        volumeMl: Math.max(0, Number(stockVolumeInputs[group.id] ?? '100') || 0),
        strength: groupStrengthFor(group),
        maxSafeStrength: groupMaxSafeStrengthFor(group),
        saltIds: [...group.saltIds],
      })),
    });
  }, [
    maxSafeStrength,
    activeDropsPerMl,
    dropperStyle,
    finalLiters,
    hasMeasuredDropsPerMl,
    measuredDropsPerMl,
    onPlanChange,
    planGroupSignature,
    planVolumeSignature,
    planStrengthSignature,
    planFormSignature,
    dropEquivalents.batchDrops,
    dropEquivalents.dropsPerLiter,
    dropEquivalents.saltEquivalentPpmPerDrop,
    dropEquivalents.totalSaltMgPerDrop,
    dropEquivalents.totalSaltMgPerMl,
    stockStrategy,
    stockStrategyDetails.label,
    strength,
    straightDropsPerMl,
  ]);

  const groupTone: Record<StockGroup['color'], {
    border: string;
    badge: string;
    accent: string;
  }> = {
    sky: {
      border: 'border-sky-400/25',
      badge: 'border-sky-300/25 bg-sky-400/10 text-sky-200',
      accent: 'text-sky-200',
    },
    violet: {
      border: 'border-violet-400/25',
      badge: 'border-violet-300/25 bg-violet-400/10 text-violet-200',
      accent: 'text-violet-200',
    },
    amber: {
      border: 'border-amber-400/25',
      badge: 'border-amber-300/25 bg-amber-400/10 text-amber-200',
      accent: 'text-amber-200',
    },
  };

  return (
    <>
      <section className="rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/10 via-slate-800/70 to-violet-500/10 p-5 shadow-xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-200/70">Plan</div>
            <h2 className="truncate text-lg font-semibold text-white">{handoff.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-600/70 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
          >
            Clear imported recipe
          </button>
        </div>
      </section>
      <section className="rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/[0.08] via-slate-800/80 to-indigo-500/[0.08] p-4 shadow-xl sm:p-6">
        <StepHeading number="1" title="Plan" icon={<FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />} />
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {[
            {
              value: 'gh-kh' as const,
              label: 'GH + KH',
              badge: 'Recommended',
              maxSafeStrength: maxSafeStrengthByStrategy['gh-kh'],
              glyph: <Gauge className="h-5 w-5" aria-hidden="true" />,
              activeClass: 'border-sky-300/60 bg-sky-400/[0.12] ring-1 ring-sky-300/30',
              glyphClass: 'border-sky-300/30 bg-sky-400/15 text-sky-200',
              badgeClass: 'border-sky-300/25 bg-sky-400/10 text-sky-200',
            },
            {
              value: 'all-in-one' as const,
              label: 'All-in-one',
              badge: 'Easy',
              maxSafeStrength: maxSafeStrengthByStrategy['all-in-one'],
              glyph: <FlaskConical className="h-5 w-5" aria-hidden="true" />,
              activeClass: 'border-violet-300/60 bg-violet-400/[0.12] ring-1 ring-violet-300/30',
              glyphClass: 'border-violet-300/30 bg-violet-400/15 text-violet-200',
              badgeClass: 'border-violet-300/25 bg-violet-400/10 text-violet-200',
            },
            {
              value: 'individual' as const,
              label: 'Separate salts',
              badge: 'Advanced',
              maxSafeStrength: maxSafeStrengthByStrategy.individual,
              glyph: <Layers className="h-5 w-5" aria-hidden="true" />,
              activeClass: 'border-amber-300/60 bg-amber-400/[0.12] ring-1 ring-amber-300/30',
              glyphClass: 'border-amber-300/30 bg-amber-400/15 text-amber-200',
              badgeClass: 'border-amber-300/25 bg-amber-400/10 text-amber-200',
            },
          ].map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setStockStrategy(option.value);
                if (option.value === 'all-in-one' && maxSafeStrengthByStrategy['all-in-one'] != null) {
                  setStrengthInput(String(maxSafeStrengthByStrategy['all-in-one']));
                }
              }}
              aria-pressed={stockStrategy === option.value}
              className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:border-slate-500/80 ${
                stockStrategy === option.value
                  ? option.activeClass
                  : 'border-slate-700/60 bg-slate-950/25 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${option.glyphClass}`}>
                  {option.glyph}
                </span>
                <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] ${option.badgeClass}`}>
                  {option.badge}
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold text-slate-100">{option.label}</div>
              {option.maxSafeStrength != null && (
                <div className="mt-2 text-[10px] font-semibold tabular-nums text-emerald-300/80">
                  Max ×{option.maxSafeStrength}
                </div>
              )}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {stockStrategy === 'all-in-one' ? (
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md border border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200">
                      <BottleWine className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <label htmlFor="recipe-stock-strength">Concentrate strength</label>
                  </span>
                  {maxSafeStrength != null && (
                    <button
                      type="button"
                      onClick={() => setStrengthInput(String(maxSafeStrength))}
                      className={`rounded-md px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition focus:outline-none focus:ring-2 focus:ring-emerald-300/50 ${
                        strength > maxSafeStrength
                          ? 'text-rose-300 hover:bg-rose-400/10 hover:text-rose-200'
                          : 'text-emerald-300/80 hover:bg-emerald-400/10 hover:text-emerald-200'
                      }`}
                      aria-label={`Apply max safe concentrate strength of ${maxSafeStrength} times`}
                      title={`Apply max safe concentrate strength ×${maxSafeStrength}`}
                    >
                      Max ×{maxSafeStrength}
                    </button>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="recipe-stock-strength"
                    type="number"
                    min="1"
                    step="10"
                    value={strengthInput}
                    onChange={event => setStrengthInput(event.target.value)}
                    className="w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
                    aria-label="Recipe concentrate strength multiplier"
                  />
                  <span className="text-sm text-slate-400">×</span>
                </div>
              </div>
            ) : (
              stockGroups.map(group => {
                const groupName = group.name.replace(/ Stock$/, ' Concentrate');
                const groupMaxSafeStrength = groupMaxSafeStrengthFor(group);
                const groupStrength = groupStrengthFor(group);
                return (
                  <div key={group.id} className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-200">
                          <BottleWine className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <label htmlFor={`recipe-stock-strength-${group.id}`}>{groupName} strength</label>
                      </span>
                      <button
                        type="button"
                        onClick={() => setStockStrengthInputs(prev => ({ ...prev, [group.id]: String(groupMaxSafeStrength) }))}
                        className={`rounded-md px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition focus:outline-none focus:ring-2 focus:ring-emerald-300/50 ${
                          groupStrength > groupMaxSafeStrength
                            ? 'text-rose-300 hover:bg-rose-400/10 hover:text-rose-200'
                            : 'text-emerald-300/80 hover:bg-emerald-400/10 hover:text-emerald-200'
                        }`}
                        aria-label={`Apply max safe ${groupName} strength of ${groupMaxSafeStrength} times`}
                        title={`Apply max safe ${groupName} strength ×${groupMaxSafeStrength}`}
                      >
                        Max ×{groupMaxSafeStrength}
                      </button>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        id={`recipe-stock-strength-${group.id}`}
                        type="number"
                        min="1"
                        step="10"
                        value={stockStrengthInputs[group.id] ?? '500'}
                        onChange={event => setStockStrengthInputs(prev => ({ ...prev, [group.id]: event.target.value }))}
                        className="w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
                        aria-label={`${groupName} strength multiplier`}
                      />
                      <span className="text-sm text-slate-400">×</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="mt-3 rounded-xl border border-sky-300/25 bg-slate-950/25 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-sky-300/25 bg-sky-400/10 text-sky-200">
                  <Droplet className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>Concentrate volume</span>
              </span>
              <span className="text-[10px] text-slate-500">mL</span>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {stockGroups.map(group => {
                const groupName = group.name.replace(/ Stock$/, ' Concentrate');
                const stockVolumeInput = stockVolumeInputs[group.id] ?? '100';
                return (
                  <label key={group.id} className="rounded-lg border border-slate-700/60 bg-slate-950/25 px-3 py-2">
                    <span className="block truncate text-[10px] font-semibold text-slate-300">{groupName}</span>
                    <span className="mt-1 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        step="10"
                        value={stockVolumeInput}
                        onChange={event => setStockVolumeInputs(prev => ({
                          ...prev,
                          [group.id]: event.target.value,
                        }))}
                        className="w-full border-b border-slate-600/70 bg-transparent py-1 text-right text-sm font-semibold tabular-nums text-slate-100 outline-none transition focus:border-sky-300/70"
                        aria-label={`${groupName} volume in milliliters`}
                      />
                      <span className="text-xs text-slate-400">mL</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-indigo-300/25 bg-gradient-to-br from-indigo-400/[0.10] via-slate-950/30 to-sky-400/[0.08] px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-100/70">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-300/30 bg-indigo-400/15 text-indigo-200">
                  <CalculatorIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>Dose per {doseReferenceLabel}</span>
              </span>
              <button
                type="button"
                onClick={onToggleVolumeUnit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300/30 bg-indigo-400/10 px-2.5 py-1.5 text-[10px] font-semibold normal-case tracking-normal text-indigo-100 transition hover:border-indigo-200/60 hover:bg-indigo-400/20"
                aria-label={`Switch dose reference to ${volumeUnit === 'liters' ? '1 US gallon' : '1 liter'}`}
                title={`Switch to ${volumeUnit === 'liters' ? '1 US gallon' : '1 liter'}`}
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                {volumeUnit === 'liters' ? '1 L' : '1 US gal'}
              </button>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums tracking-tight text-white">
                {doseMlPerReference.toFixed(2)} mL
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-200/60">calculated dose</span>
            </div>
          </div>
        </div>
        {((stockStrategy === 'all-in-one') || (maxSafeStrength != null && strength > maxSafeStrength)) && (
          <div className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] ${
            maxSafeStrength != null && strength > maxSafeStrength
              ? 'border-rose-400/30 bg-rose-500/[0.08] text-rose-200'
              : 'border-amber-400/25 bg-amber-500/[0.08] text-amber-100/80'
          }`}>
            {maxSafeStrength != null && strength > maxSafeStrength
              ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
              : <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />}
            <span>
              {maxSafeStrength != null && strength > maxSafeStrength
                ? `Lower strength below ×${maxSafeStrength}.`
                : stockStrategyDetails.helper}
            </span>
          </div>
        )}
      </section>
      <DropperReferenceCard
        referenceStyle={dropperStyle}
        onStyleChange={onDropperStyleChange}
        straightDropsPerMl={straightDropsPerMl}
        authoritativeDropsPerMl={activeDropsPerMl}
      />
      {stockStrategy === 'all-in-one' && (
        <>
          <section className="rounded-2xl border border-cyan-400/25 bg-slate-800/70 p-4 shadow-xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <Droplet className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                  Finished-bottle drop equivalents
                </div>
                <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-400">
                  These numbers describe one finished all-in-one bottle. Straight and rounded rates are
                  assumptions until you measure this bottle; the measured value below overrides the assumption.
                </p>
              </div>
              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
                {hasMeasuredDropsPerMl ? 'Measured rate' : 'Modeled rate'}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
                <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <span>Measured finished-bottle rate</span>
                  <span className="normal-case tracking-normal">optional</span>
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={measuredDropsPerMlInput}
                    onChange={event => setMeasuredDropsPerMlInput(event.target.value)}
                    placeholder={`${assumedDropsPerMl.toFixed(1)} assumed`}
                    className="w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
                    aria-label="Measured finished bottle drops per milliliter"
                  />
                  <span className="text-sm text-slate-400">drops/mL</span>
                </div>
              </label>
              <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
                <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <span>Selected final water volume</span>
                  <VolumeUnitToggle
                    unit={volumeUnit}
                    onToggle={() => {
                      const liters = volumeToLiters(finalVolumeInput, volumeUnit);
                      setFinalVolumeInput(String(volumeUnit === 'liters'
                        ? liters / US_GALLON_IN_LITERS
                        : liters));
                      onToggleVolumeUnit();
                    }}
                  />
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    min="0.001"
                    step="0.1"
                    value={finalVolumeInput}
                    onChange={event => setFinalVolumeInput(event.target.value)}
                    className="w-full bg-transparent text-lg font-semibold tabular-nums text-slate-100 outline-none"
                    aria-label={`Selected final water volume in ${volumeUnitLabel(volumeUnit)}`}
                  />
                  <span className="text-sm text-slate-400">{volumeUnitShortLabel(volumeUnit)}</span>
                </div>
              </label>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryMetric
                label="Total salt per drop"
                value={dropEquivalents.valid ? `${dropEquivalents.totalSaltMgPerDrop.toFixed(2)} mg` : '—'}
                detail="physical salt mass"
                tone="sky"
              />
              <SummaryMetric
                label="Salt-equivalent per drop"
                value={dropEquivalents.valid ? `${dropEquivalents.saltEquivalentPpmPerDrop.toFixed(2)} ppm` : '—'}
                detail={`in ${finalLiters > 0 ? finalLiters.toFixed(3) : '—'} L`}
                tone="fuchsia"
              />
              <SummaryMetric
                label="Drops per liter"
                value={dropEquivalents.valid ? dropEquivalents.dropsPerLiter.toFixed(1) : '—'}
                detail="same finished bottle"
                tone="sky"
              />
              <SummaryMetric
                label="Batch drops"
                value={dropEquivalents.valid ? dropEquivalents.batchDrops.toFixed(1) : '—'}
                detail={`${finalLiters > 0 ? finalLiters.toFixed(3) : '—'} L final water`}
                tone="sky"
              />
            </div>
            {!dropEquivalents.valid && (
              <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-3 py-2 text-[11px] text-rose-200">
                Enter a positive strength, finished-bottle drop rate, final volume, and at least one active salt
                before drop equivalents can be calculated.
              </p>
            )}
          </section>

          <section className={`rounded-2xl border p-4 shadow-xl sm:p-6 ${
            allInOneStrengthIsSafe
              ? 'border-emerald-400/25 bg-slate-800/70'
              : 'border-rose-400/35 bg-rose-950/20'
          }`}>
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                allInOneStrengthIsSafe
                  ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200'
                  : 'border-rose-300/30 bg-rose-400/10 text-rose-200'
              }`}>
                {allInOneStrengthIsSafe ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <h3 className={`text-sm font-semibold ${allInOneStrengthIsSafe ? 'text-emerald-100' : 'text-rose-100'}`}>
                  {allInOneStrengthIsSafe ? 'All-in-one safety boundary' : 'Strength is above the modeled chemical ceiling'}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  {limitingConstraint.kind === 'chemical'
                    ? <>Limiting constraint: <strong className="text-slate-200">{limitingConstraint.saltNames.join(', ') || 'modeled reaction'}</strong>. {limitingConstraint.message}</>
                    : limitingConstraint.message}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.06] px-3 py-2.5 text-[11px] text-emerald-100/80">
                <div className="font-semibold text-emerald-200">Hard chemical limit</div>
                <p className="mt-1">The maximum above is based only on modeled precipitation or solubility errors. It is approximate, not a laboratory guarantee.</p>
              </div>
              <div className="rounded-xl border border-amber-300/20 bg-amber-400/[0.06] px-3 py-2.5 text-[11px] text-amber-100/80">
                <div className="font-semibold text-amber-200">Practical handling notes</div>
                <p className="mt-1">Mixing time, clarity, TDS, and drop measurement can still be reasons to use separate stocks; they do not silently lower this chemical ceiling.</p>
              </div>
            </div>
            {allInOneWarnings.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-300/20 bg-amber-400/[0.06] px-3 py-2.5 text-[11px] text-amber-100/80">
                <div className="font-semibold text-amber-200">At the entered strength</div>
                {allInOneWarnings.map(warning => (
                  <p key={`${warning.severity}-${warning.message}`} className="mt-1">
                    <span className="font-semibold">{warning.severity === 'error' ? 'Chemical limit' : 'Handling note'}:</span> {warning.message}
                  </p>
                ))}
              </div>
            )}
            {limitingConstraint.maxSafeStrength < 10 && (
              <p className="mt-3 text-[11px] font-semibold text-amber-200">
                This ceiling is low enough that separate stocks are recommended for easier measuring and mixing.
              </p>
            )}
          </section>

          {dropEquivalents.valid && (
            <section className="rounded-2xl border border-violet-400/25 bg-slate-800/70 p-4 shadow-xl sm:p-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-violet-100">
                <Layers className="h-4 w-4 text-violet-300" />
                Per-salt and ion contributions
              </div>
              <div className="mt-3 space-y-2">
                 {dropEquivalents.perSalt.map(row => {
                   const salt = SALTS.find(item => item.id === row.saltId);
                   return (
                   <div key={row.saltId} className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5" style={salt ? saltVisualStyle(salt) : undefined}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                         <span
                           className="text-xs font-semibold text-[color:var(--salt-primary)]"
                           style={salt ? { '--salt-primary': getSaltColorTokens(salt).primary } as CSSProperties : undefined}
                         >
                           {row.saltName}
                         </span>
                         <span className="ml-2 text-[10px] text-slate-500">{row.formLabel}</span>
                         {salt && <SaltIonBadges salt={salt} className="ml-2 text-[10px]" />}
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-violet-200">{row.saltMgPerDrop.toFixed(2)} mg/drop</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                       {Object.entries(row.ionPpmPerDrop).map(([ionId, value]) => (
                         <span key={ionId}>
                           <span className="font-semibold text-[color:var(--ion-fg)]" style={ionVisualStyle(ionId as IonId)}>
                             {COMPARISON_ION_LABELS[ionId as IonId] ?? ionId}
                           </span>: {Number(value).toFixed(3)} ppm/drop
                         </span>
                      ))}
                    </div>
                  </div>
                   );
                 })}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                Salt-equivalent ppm is the recipe salt basis. It is not summed-ion ppm and should not be treated as a TDS-meter reading.
              </p>
            </section>
          )}
        </>
      )}
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <h2 className="text-base font-semibold text-slate-100">Concentrates</h2>
          <span className="text-[11px] text-slate-500">
            {stockStrategy === 'all-in-one' ? `×${strength || 0}` : 'Individual strengths'} · {stockGroups.length} {stockGroups.length === 1 ? 'bottle' : 'bottles'}
          </span>
        </div>
        {stockGroups.map(group => {
          const tone = groupTone[group.color];
          const groupName = group.name.replace(/ Stock$/, ' Concentrate');
          const stockVolumeInput = stockVolumeInputs[group.id] ?? '100';
          const stockVolumeMl = Math.max(0, Number(stockVolumeInput) || 0);
          const groupTargets = groupTargetsFor(group);
          const groupStrength = groupStrengthFor(group);
          const warnings = groupStrength > 0 ? checkConcentrate(groupStrength, groupTargets) : [];
          const groupMaxSafeStrength = findStrongestSafeConcentrateStrength(groupTargets);
          const stockRows = group.saltIds.map(saltId => {
            const salt = SALTS.find(item => item.id === saltId);
            const entry = handoff.salts[saltId];
            if (!salt || !entry) return null;
            const form = salt.hydrationForms[entry.formIdx] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
            const target = num(entry.target);
            const massMg = computeRecipeStockSaltMassMg(
              target,
              stockVolumeMl,
              groupStrength,
              form.molarMass,
              salt.anhydrousMass,
            );
            return { salt, form, target, massMg };
          }).filter((row): row is {
            salt: typeof SALTS[number];
            form: typeof SALTS[number]['hydrationForms'][number];
            target: number;
            massMg: number;
          } => row !== null);
          const totalSaltMassG = stockRows.reduce((sum, row) => sum + row.massMg, 0) / 1000;

          return (
            <article key={group.id} className={`rounded-2xl border ${tone.border} bg-slate-800/70 p-4 shadow-xl sm:p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${tone.badge}`}>
                    {groupName}
                  </span>
                </div>
                <div className="flex flex-wrap items-end justify-end gap-3">
                  <div className="text-right">
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Vol</span>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{stockVolumeMl.toFixed(0)} mL</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Max</div>
                    <div className={`mt-1 text-lg font-semibold tabular-nums ${
                       groupStrength > groupMaxSafeStrength ? 'text-rose-300' : 'text-emerald-300/90'
                     }`}>×{groupMaxSafeStrength}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Dose</div>
                     <div className={`mt-1 text-lg font-semibold tabular-nums ${tone.accent}`}>{(groupStrength > 0 ? 1000 / groupStrength * doseReferenceLiters : 0).toFixed(2)} mL</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/60">
                <table className="w-full min-w-[580px] text-left text-xs">
                  <thead className="bg-slate-950/35 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">Salt</th>
                      <th className="px-3 py-2.5">Form</th>
                      <th className="px-3 py-2.5 text-right">Target</th>
                      <th className="px-3 py-2.5 text-right">Mass</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {stockRows.map(row => (
                      <tr key={row.salt.id} className="text-slate-300" style={saltVisualStyle(row.salt)}>
                        <td className="px-3 py-3">
                          <div className="font-semibold text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(row.salt).primary } as CSSProperties}>{row.salt.name}</div>
                          <SaltIonBadges salt={row.salt} className="mt-1 text-[10px]" />
                        </td>
                        <td className="px-3 py-3 text-slate-400">{row.form.label}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{row.target.toFixed(2)} ppm</td>
                        <td className={`px-3 py-3 text-right font-semibold tabular-nums ${tone.accent}`}>
                          {row.massMg >= 1000 ? `${(row.massMg / 1000).toFixed(2)} g` : `${row.massMg.toFixed(1)} mg`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>Total <strong className="text-slate-300">{totalSaltMassG.toFixed(2)} g</strong></span>
              </div>

              {warnings.length > 0 && (
                <div className={`mt-3 rounded-xl border px-3 py-3 text-[11px] leading-relaxed ${
                  warnings.some(warning => warning.severity === 'error')
                    ? 'border-rose-400/30 bg-rose-500/[0.08] text-rose-200'
                    : 'border-amber-400/30 bg-amber-500/[0.08] text-amber-200'
                }`}>
                  <div className="font-semibold">
                    {warnings.some(warning => warning.severity === 'error') ? 'Check strength' : 'Note'}
                  </div>
                  {warnings.map(warning => <p key={warning.message} className="mt-1">{warning.message}</p>)}
                </div>
              )}
            </article>
          );
        })}
      </section>
      <section className="rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.06] px-4 py-3 shadow-xl sm:px-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
          <Info className="h-4 w-4 shrink-0 text-emerald-300" />
          {doseMlPerReference.toFixed(2)} mL each → {doseReferenceLabel}
        </div>
      </section>
    </>
  );
}

type RecipeBottleGroup = {
  id: string;
  name: string;
  saltIds: string[];
  color: StockGroup['color'] | 'cyan';
};

function recipeConcentrateNumber(value: number, digits = 2): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits).replace(/\.?0+$/, '');
}

function RecipeConcentrateBottleCard({
  group,
  handoff,
  strengthInput,
  volumeInput,
  finalVolumeInput,
  finalLiters,
  volumeUnit,
  dropperStyle,
  straightDropsPerMl,
  measuredDropsPerMlInput,
  onStrengthChange,
  onVolumeChange,
  onFinalVolumeChange,
  onToggleVolumeUnit,
  onDropperStyleChange,
  onMeasuredDropsPerMlChange,
}: {
  group: RecipeBottleGroup;
  handoff: ConcentrateRecipeHandoff;
  strengthInput: string;
  volumeInput: string;
  finalVolumeInput: string;
  finalLiters: number;
  volumeUnit: VolumeUnit;
  dropperStyle: LotusDropperStyle;
  straightDropsPerMl: number;
  measuredDropsPerMlInput: string;
  onStrengthChange: (value: string) => void;
  onVolumeChange: (value: string) => void;
  onFinalVolumeChange: (value: string) => void;
  onToggleVolumeUnit: () => void;
  onDropperStyleChange: (style: LotusDropperStyle) => void;
  onMeasuredDropsPerMlChange: (value: string) => void;
}) {
  const saltTargets = Object.fromEntries(
    group.saltIds.map(saltId => [saltId, num(handoff.salts[saltId]?.target)]),
  );
  const formIdxBySaltId = Object.fromEntries(
    group.saltIds.map(saltId => [saltId, handoff.salts[saltId]?.formIdx ?? 0]),
  );
  const strength = Math.max(0, Number(strengthInput) || 0);
  const stockVolumeMl = Math.max(0, Number(volumeInput) || 0);
  const warnings = strength > 0
    ? checkConcentrate(strength, saltTargets, formIdxBySaltId)
    : [];
  const assumedDropsPerMl = lotusDropsPerMl(dropperStyle, straightDropsPerMl);
  const measuredDropsPerMl = Number(measuredDropsPerMlInput);
  const hasMeasuredDropsPerMl = Number.isFinite(measuredDropsPerMl) && measuredDropsPerMl > 0;
  const activeDropsPerMl = hasMeasuredDropsPerMl ? measuredDropsPerMl : assumedDropsPerMl;
  const maxSafeStrength = findStrongestSafeConcentrateStrength(
    saltTargets,
    undefined,
    formIdxBySaltId,
    {
      minimumFinalLiters: CONCENTRATE_MINIMUM_DOSE_LITERS,
      minimumDrops: CONCENTRATE_MINIMUM_WHOLE_DROPS,
      dropsPerMl: activeDropsPerMl,
    },
  );
  const safeFinalLiters = Math.max(0, finalLiters);
  const doseMl = strength > 0 ? 1000 / strength * safeFinalLiters : 0;
  const doseDrops = doseMl * activeDropsPerMl;
  const stockRows = group.saltIds.map(saltId => {
    const salt = SALTS.find(item => item.id === saltId);
    const entry = handoff.salts[saltId];
    if (!salt || !entry) return null;
    const form = salt.hydrationForms[entry.formIdx] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
    if (!form) return null;
    const target = num(entry.target);
    const massMg = computeRecipeStockSaltMassMg(
      target,
      stockVolumeMl,
      strength,
      form.molarMass,
      salt.anhydrousMass,
    );
    return { salt, form, target, massMg };
  }).filter((row): row is {
    salt: typeof SALTS[number];
    form: typeof SALTS[number]['hydrationForms'][number];
    target: number;
    massMg: number;
  } => row !== null);
  const totalSaltMassG = stockRows.reduce((total, row) => total + row.massMg, 0) / 1000;
  const waterToAddG = Math.max(0, stockVolumeMl - totalSaltMassG);
  const saltMgPerMl = stockVolumeMl > 0
    ? stockRows.reduce((total, row) => total + row.massMg, 0) / stockVolumeMl
    : 0;
  const saltMgPerDrop = activeDropsPerMl > 0 ? saltMgPerMl / activeDropsPerMl : 0;
  const ppmPerDrop = safeFinalLiters > 0 ? saltMgPerDrop / safeFinalLiters : 0;
  const tone: Record<RecipeBottleGroup['color'], {
    border: string;
    badge: string;
    accent: string;
    soft: string;
  }> = {
    sky: {
      border: 'border-sky-400/25',
      badge: 'border-sky-300/25 bg-sky-400/10 text-sky-200',
      accent: 'text-sky-200',
      soft: 'bg-sky-400/[0.08]',
    },
    violet: {
      border: 'border-violet-400/25',
      badge: 'border-violet-300/25 bg-violet-400/10 text-violet-200',
      accent: 'text-violet-200',
      soft: 'bg-violet-400/[0.08]',
    },
    amber: {
      border: 'border-amber-400/25',
      badge: 'border-amber-300/25 bg-amber-400/10 text-amber-200',
      accent: 'text-amber-200',
      soft: 'bg-amber-400/[0.08]',
    },
    cyan: {
      border: 'border-cyan-400/25',
      badge: 'border-cyan-300/25 bg-cyan-400/10 text-cyan-200',
      accent: 'text-cyan-200',
      soft: 'bg-cyan-400/[0.08]',
    },
  };
  const colors = tone[group.color];
  const helper = group.id === 'hardness'
    ? 'Calcium, magnesium, and chloride support.'
    : group.id === 'alkalinity'
      ? 'Bicarbonate buffer for the finished water.'
      : group.id === 'citrate'
        ? 'Keep citrate minerals in their own stock.'
        : group.id === 'all-in-one'
          ? 'Every active salt shares one bottle.'
          : 'One bottle for this salt.';
  const cardName = group.name.replace(/ Stock$/, ' Concentrate');
  const unitLabel = volumeUnitShortLabel(volumeUnit);
  const finalVolumeLabel = volumeUnitLabel(volumeUnit);
  const calibratedLabel = hasMeasuredDropsPerMl
    ? `${recipeConcentrateNumber(activeDropsPerMl, 1)} measured drops/mL`
    : `${recipeConcentrateNumber(assumedDropsPerMl, 1)} ${dropperStyle} drops/mL assumption`;

  return (
    <article className={`recipe-concentrate-bottle aio-bottle-card rounded-2xl border p-3 sm:p-4 ${colors.border} ${colors.soft}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colors.border} ${colors.soft} ${colors.accent}`}>
            <Beaker className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className={`text-[9px] font-bold uppercase tracking-[0.18em] ${colors.accent}`}>{cardName}</div>
            <div className="mt-0.5 text-[10px] text-slate-500">{helper}</div>
          </div>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${colors.badge}`}>one bottle</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <section>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <label className="block">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Stock strength</div>
              <div className="mt-1 flex items-baseline gap-2">
                <input
                  value={strengthInput}
                  onChange={event => onStrengthChange(event.target.value)}
                  type="number"
                  min="1"
                  max={maxSafeStrength}
                  step="1"
                  aria-label={`${cardName} stock strength`}
                  className="recipe-concentrate-input w-full min-w-0 bg-transparent text-4xl font-semibold tracking-tight text-white outline-none"
                />
                <span className="text-lg text-slate-500">×</span>
              </div>
              <div className="mt-1 text-[9px] text-slate-600">recipe target multiplier</div>
            </label>
            <label className="block">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Bottle volume</div>
              <div className="mt-1 flex items-baseline gap-2">
                <input
                  value={volumeInput}
                  onChange={event => onVolumeChange(event.target.value)}
                  type="number"
                  min="1"
                  step="10"
                  aria-label={`${cardName} bottle volume in milliliters`}
                  className="recipe-concentrate-input w-full min-w-0 bg-transparent text-4xl font-semibold tracking-tight text-white outline-none"
                />
                <span className="text-lg text-slate-500">mL</span>
              </div>
              <div className="mt-1 text-[9px] text-slate-600">how much to make</div>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-[10px] text-slate-500">
            <span>safe ceiling ×{maxSafeStrength}</span>
            <button
              type="button"
              onClick={() => onStrengthChange(String(maxSafeStrength))}
              className="font-semibold tabular-nums text-emerald-300 transition hover:text-emerald-200"
            >
              Apply maximum
            </button>
          </div>
          <input
            className="recipe-concentrate-range mt-3 h-1.5 w-full cursor-pointer"
            type="range"
            min="1"
            max={Math.max(1, maxSafeStrength)}
            value={Math.min(Math.max(1, strength || 1), Math.max(1, maxSafeStrength))}
            onChange={event => onStrengthChange(event.target.value)}
            aria-label={`Adjust ${cardName} strength`}
          />
          <div className="mt-2 flex justify-between text-[9px] tabular-nums text-slate-600">
            <span>×1</span>
            <span>lower strength = more drops</span>
            <span>×{maxSafeStrength}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className={`rounded-lg border px-3 py-2.5 ${colors.border} ${colors.soft} ${colors.accent}`}>
              <div className="text-[9px] font-bold uppercase tracking-[0.16em]">Salt to weigh</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{recipeConcentrateNumber(totalSaltMassG, 2)} g</div>
              <div className="mt-0.5 text-[9px] opacity-60">for this bottle</div>
            </div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Water to add</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{recipeConcentrateNumber(waterToAddG, 1)} g</div>
              <div className="mt-0.5 text-[9px] text-slate-500">distilled or RO</div>
            </div>
          </div>

          <div className="recipe-concentrate-dropper mt-4 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-3.5 w-3.5 text-amber-200/75" aria-hidden="true" />
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-100/70">Dropper setup</span>
              </div>
              <span className="text-right text-[9px] text-slate-500">{calibratedLabel}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-slate-700/60 bg-slate-950/40 p-1" role="group" aria-label={`${cardName} dropper style`}>
              {(['straight', 'round'] as LotusDropperStyle[]).map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onDropperStyleChange(style)}
                  aria-pressed={dropperStyle === style}
                  data-active={dropperStyle === style}
                  className="recipe-concentrate-dropper-segment rounded-md px-2 py-1.5 text-[10px] font-semibold capitalize transition"
                >
                  {style} tip · {recipeConcentrateNumber(lotusDropsPerMl(style, straightDropsPerMl), 1)}/mL
                </button>
              ))}
            </div>
            <label className="mt-2 block rounded-lg border border-slate-700/60 bg-slate-950/35 px-2.5 py-2">
              <span className="flex items-center justify-between gap-2 text-[9px] text-slate-500">
                <span>Measured calibration</span>
                <span>optional</span>
              </span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={measuredDropsPerMlInput}
                  onChange={event => onMeasuredDropsPerMlChange(event.target.value)}
                  placeholder={`${recipeConcentrateNumber(assumedDropsPerMl, 1)} assumed`}
                  aria-label={`${cardName} measured drops per milliliter`}
                  className="recipe-concentrate-input w-full bg-transparent text-sm font-semibold tabular-nums text-white outline-none"
                />
                <span className="text-[10px] text-slate-500">drops/mL</span>
              </span>
            </label>
            <div className="mt-2 flex items-center gap-2 text-[9px] leading-relaxed text-slate-500">
              <Info className="h-3.5 w-3.5 shrink-0 text-amber-200/70" aria-hidden="true" />
              Calibration changes drop size only, not recipe chemistry.
            </div>
          </div>
        </section>

        <section className="recipe-concentrate-dose rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className={`flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] ${colors.accent}`}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Dose the final water
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-2">
                <strong className="text-5xl font-semibold tracking-[-0.05em] text-white">{Math.round(doseDrops)}</strong>
                <span className="text-sm font-medium">drops / {recipeConcentrateNumber(doseMl, 2)} mL</span>
              </div>
              <div className="mt-1 text-[11px]">for {recipeConcentrateNumber(finalLiters > 0 ? Number(finalVolumeInput) : 0, 2)} {unitLabel} final water</div>
            </div>
            <div className={`recipe-concentrate-dose-metric rounded-lg border px-2.5 py-2 text-right ${colors.border} ${colors.soft}`}>
              <div className="text-[9px] font-bold uppercase tracking-[0.16em]">1 drop adds</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{recipeConcentrateNumber(ppmPerDrop, 2)}</div>
              <div className="text-[9px]">physical salt ppm</div>
            </div>
          </div>
          <label className="mt-4 block">
            <span className={`flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.16em] ${colors.accent}`}>
              <span>Final water ({unitLabel})</span>
              <button
                type="button"
                onClick={onToggleVolumeUnit}
                className="recipe-concentrate-volume-toggle"
                aria-label={`Switch volume units to ${volumeUnit === 'liters' ? 'gallons' : 'liters'}`}
              >
                {finalVolumeLabel}
              </button>
            </span>
            <span className={`mt-1.5 flex items-center gap-2 rounded-lg border px-3 py-2 ${colors.border} bg-slate-950/30`}>
              <input
                type="number"
                min={volumeUnit === 'gallons' ? '0.01' : '0.1'}
                step={volumeUnit === 'gallons' ? '0.01' : '0.1'}
                value={finalVolumeInput}
                onChange={event => onFinalVolumeChange(event.target.value)}
                aria-label={`Final water volume in ${finalVolumeLabel}`}
                className="recipe-concentrate-input w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none"
              />
              <span className="text-xs font-semibold">{unitLabel}</span>
            </span>
          </label>
        </section>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {stockRows.map(row => (
          <div key={row.salt.id} className="recipe-concentrate-salt-row rounded-lg px-3 py-2.5" style={saltVisualStyle(row.salt)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className="recipe-concentrate-salt-dot mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: getSaltColorTokens(row.salt).primary }} aria-hidden="true" />
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(row.salt).primary } as CSSProperties}>{row.salt.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-slate-500">
                    <span>{row.form.label} ·</span>
                    <SaltIonBadges salt={row.salt} />
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-[10px] font-semibold tabular-nums ${colors.accent}`}>{recipeConcentrateNumber(row.target, 1)} ppm/L</div>
                <div className="mt-0.5 text-[9px] tabular-nums text-slate-500">{recipeConcentrateNumber(row.massMg, 1)} mg</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className={`mt-3 rounded-xl border px-3 py-3 text-[11px] leading-relaxed ${
          warnings.some(warning => warning.severity === 'error')
            ? 'border-rose-400/30 bg-rose-500/[0.08] text-rose-200'
            : 'border-amber-400/30 bg-amber-500/[0.08] text-amber-200'
        }`}>
          <div className="font-semibold">
            {warnings.some(warning => warning.severity === 'error') ? 'Check strength' : 'Mixing note'}
          </div>
          {warnings.map(warning => <p key={`${warning.severity}-${warning.message}`} className="mt-1">{warning.message}</p>)}
        </div>
      )}
    </article>
  );
}

function RecipeConcentrateBuilder({
  handoff,
  volumeUnit,
  dropsPerMl,
  dropperStyle,
  onDropperStyleChange,
  straightDropsPerMl,
  restoredPlan,
  onToggleVolumeUnit,
  onClear,
  onPlanChange,
  singleSaltOnly = false,
}: {
  handoff: ConcentrateRecipeHandoff;
  volumeUnit: VolumeUnit;
  dropsPerMl: number;
  dropperStyle: LotusDropperStyle;
  onDropperStyleChange: (style: LotusDropperStyle) => void;
  straightDropsPerMl: number;
  restoredPlan: ConcentratePlanSnapshot | null;
  onToggleVolumeUnit: () => void;
  onClear: () => void;
  onPlanChange: (plan: ConcentratePlanSnapshot) => void;
  singleSaltOnly?: boolean;
}) {
  const [strengthInput, setStrengthInput] = useState('500');
  const [stockStrategy, setStockStrategy] = useState<ConcentrateStrategy>(
    singleSaltOnly ? 'all-in-one' : 'gh-kh',
  );
  const [stockStrengthInputs, setStockStrengthInputs] = useState<Record<string, string>>({
    hardness: '500',
    alkalinity: '500',
    citrate: '500',
    'all-in-one': '500',
  });
  const [stockVolumeInputs, setStockVolumeInputs] = useState<Record<string, string>>({
    hardness: '100',
    alkalinity: '100',
    citrate: '100',
    'all-in-one': '100',
  });
  const [measuredDropsPerMlInput, setMeasuredDropsPerMlInput] = useState('');
  const [finalVolumeInput, setFinalVolumeInput] = useState(String(handoff.finalLiters));

  const saltTargets = Object.fromEntries(
    Object.entries(handoff.salts).map(([saltId, entry]) => [saltId, num(entry.target)]),
  );
  const formIdxBySaltId = Object.fromEntries(
    Object.entries(handoff.salts).map(([saltId, entry]) => [saltId, entry.formIdx]),
  );
  const compatibleStockGroups = splitIntoStockGroups(saltTargets);
  const activeSaltIds = Object.entries(saltTargets)
    .filter(([, target]) => target > 0)
    .map(([saltId]) => saltId);
  const individualStockGroups: RecipeBottleGroup[] = compatibleStockGroups.flatMap(group =>
    group.saltIds.map(saltId => {
      const salt = SALTS.find(item => item.id === saltId);
      const individualColor: Record<string, RecipeBottleGroup['color']> = {
        mgso4: 'cyan',
        mgcl2: 'sky',
        cacl2: 'violet',
        nahco3: 'amber',
        khco3: 'violet',
        nacl: 'cyan',
        kcl: 'sky',
        mgcit: 'amber',
        cacit: 'violet',
        calact: 'amber',
        mggly: 'sky',
      };
      return {
        ...group,
        id: `salt:${saltId}`,
        name: `${salt?.name ?? 'Salt'} Stock`,
        saltIds: [saltId],
        color: individualColor[saltId] ?? group.color,
      };
    }),
  );
  const allInOneStockGroups: RecipeBottleGroup[] = activeSaltIds.length > 0
    ? [{
        id: 'all-in-one',
        name: 'All-in-one Stock',
        saltIds: activeSaltIds,
        color: 'violet',
      }]
    : [];
  const stockGroups: RecipeBottleGroup[] = stockStrategy === 'all-in-one'
    ? allInOneStockGroups
    : stockStrategy === 'individual'
      ? individualStockGroups
      : compatibleStockGroups;
  const groupTargetsFor = (group: { saltIds: string[] }) => Object.fromEntries(
    group.saltIds.map(saltId => [saltId, saltTargets[saltId] ?? 0]),
  );
  const groupFormsFor = (group: { saltIds: string[] }) => Object.fromEntries(
    group.saltIds.map(saltId => [saltId, formIdxBySaltId[saltId] ?? 0]),
  );
  const strength = Math.max(0, Number(strengthInput) || 0);
  const finalLiters = volumeToLiters(finalVolumeInput, volumeUnit);
  const measuredDropsPerMl = Number(measuredDropsPerMlInput);
  const hasMeasuredDropsPerMl = Number.isFinite(measuredDropsPerMl) && measuredDropsPerMl > 0;
  const activeDropsPerMl = hasMeasuredDropsPerMl
    ? measuredDropsPerMl
    : lotusDropsPerMl(dropperStyle, straightDropsPerMl);
  const dropDosingOptions = {
    minimumFinalLiters: 0.1,
    minimumDrops: 1,
    dropsPerMl: activeDropsPerMl,
  };
  const groupMaxSafeStrengthFor = (group: { saltIds: string[] }) =>
    findStrongestSafeConcentrateStrength(
      groupTargetsFor(group),
      undefined,
      groupFormsFor(group),
      dropDosingOptions,
    );
  const maxSafeStrengthByStrategy = {
    'gh-kh': compatibleStockGroups.length > 0
      ? Math.min(...compatibleStockGroups.map(groupMaxSafeStrengthFor))
      : null,
    'all-in-one': allInOneStockGroups.length > 0
      ? groupMaxSafeStrengthFor(allInOneStockGroups[0])
      : null,
    individual: individualStockGroups.length > 0
      ? Math.min(...individualStockGroups.map(groupMaxSafeStrengthFor))
      : null,
  };
  const maxSafeStrength = maxSafeStrengthByStrategy[stockStrategy];
  const stockStrategyDetails = stockStrategy === 'all-in-one'
    ? { label: 'All-in-one', helper: 'Every active salt shares one bottle.' }
    : stockStrategy === 'individual'
      ? { label: 'Separate salts', helper: 'One bottle per active salt.' }
      : { label: 'GH + KH', helper: 'Use separate bottles for compatible groups.' };
  const planGroupSignature = stockGroups.map(group => `${group.id}:${group.saltIds.join(',')}`).join('|');
  const planVolumeSignature = Object.entries(stockVolumeInputs).sort(([a], [b]) => a.localeCompare(b)).map(([id, value]) => `${id}:${value}`).join('|');
  const planStrengthSignature = Object.entries(stockStrengthInputs).sort(([a], [b]) => a.localeCompare(b)).map(([id, value]) => `${id}:${value}`).join('|');
  const planFormSignature = Object.entries(formIdxBySaltId).sort(([a], [b]) => a.localeCompare(b)).map(([id, value]) => `${id}:${value}`).join('|');
  const dropEquivalents = computeRecipeConcentrateDropEquivalents({
    saltTargets,
    formIdxBySaltId,
    strength: stockStrategy === 'all-in-one' && maxSafeStrength != null && strength <= maxSafeStrength ? strength : 0,
    dropsPerMl: activeDropsPerMl,
    finalLiters,
  });
  const allInOneWarnings = stockStrategy === 'all-in-one' && strength > 0
    ? checkConcentrate(strength, saltTargets, formIdxBySaltId)
    : [];
  const doseReferenceLabel = volumeUnit === 'gallons' ? '1 US gallon' : '1 L';
  const doseReferenceLiters = volumeUnit === 'gallons' ? US_GALLON_IN_LITERS : 1;
  const doseMlPerReference = stockStrategy === 'all-in-one' && strength > 0
    ? 1000 / strength * doseReferenceLiters
    : 0;
  const allInOneStrengthIsSafe = stockStrategy !== 'all-in-one'
    || (maxSafeStrength != null && strength > 0 && strength <= maxSafeStrength);
  const limitingConstraint = findConcentrateLimitingConstraint(
    saltTargets,
    formIdxBySaltId,
    undefined,
    dropDosingOptions,
  );

  useEffect(() => {
    const initialAllInOneStrength = allInOneStockGroups.length > 0
      ? groupMaxSafeStrengthFor(allInOneStockGroups[0])
      : 1;
    const initialStockStrengths = Object.fromEntries(
      compatibleStockGroups.map(group => [group.id, String(groupMaxSafeStrengthFor(group))]),
    );
    const restored = restoredPlan && restoredPlan.strategy ? restoredPlan : null;
    setStrengthInput(restored && !singleSaltOnly ? String(restored.strength) : String(initialAllInOneStrength));
    setStockStrategy(singleSaltOnly ? 'all-in-one' : restored?.strategy ?? 'gh-kh');
    setStockStrengthInputs(restored
      && !singleSaltOnly
      ? Object.fromEntries(restored.groups.map(group => [group.id, String(group.strength)]))
      : {
          hardness: initialStockStrengths.hardness ?? '1',
          alkalinity: initialStockStrengths.alkalinity ?? '1',
          citrate: initialStockStrengths.citrate ?? '1',
          'all-in-one': String(initialAllInOneStrength),
        });
    setStockVolumeInputs(restored
      && !singleSaltOnly
      ? Object.fromEntries(restored.groups.map(group => [group.id, String(group.volumeMl)]))
      : {
          hardness: '100',
          alkalinity: '100',
          citrate: '100',
          'all-in-one': '100',
        });
    setMeasuredDropsPerMlInput(
      restored?.measuredDropsPerMl != null ? String(restored.measuredDropsPerMl) : '',
    );
    setFinalVolumeInput(
      restored?.finalLiters && restored.finalLiters > 0
        ? String(volumeUnit === 'gallons' ? restored.finalLiters / US_GALLON_IN_LITERS : restored.finalLiters)
        : String(volumeUnit === 'gallons' ? handoff.finalLiters / US_GALLON_IN_LITERS : handoff.finalLiters),
    );
  }, [handoff, singleSaltOnly]);

  useEffect(() => {
    onPlanChange({
      strategy: stockStrategy,
      strategyLabel: stockStrategyDetails.label,
      strength,
      maxSafeStrength,
      dropperStyle,
      straightDropsPerMl,
      measuredDropsPerMl: hasMeasuredDropsPerMl ? measuredDropsPerMl : null,
      activeDropsPerMl,
      finalLiters,
      totalSaltMgPerMl: dropEquivalents.totalSaltMgPerMl,
      totalSaltMgPerDrop: dropEquivalents.totalSaltMgPerDrop,
      saltEquivalentPpmPerDrop: dropEquivalents.saltEquivalentPpmPerDrop,
      dropsPerLiter: dropEquivalents.dropsPerLiter,
      batchDrops: dropEquivalents.batchDrops,
      groups: stockGroups.map(group => ({
        id: group.id,
        name: group.name.replace(/ Stock$/, ' Concentrate'),
        volumeMl: Math.max(0, Number(stockVolumeInputs[group.id] ?? '100') || 0),
        strength: stockStrategy === 'all-in-one' ? strength : Math.max(0, Number(stockStrengthInputs[group.id] ?? '0') || 0),
        maxSafeStrength: groupMaxSafeStrengthFor(group),
        saltIds: [...group.saltIds],
      })),
    });
  }, [
    activeDropsPerMl,
    dropEquivalents.batchDrops,
    dropEquivalents.dropsPerLiter,
    dropEquivalents.saltEquivalentPpmPerDrop,
    dropEquivalents.totalSaltMgPerDrop,
    dropEquivalents.totalSaltMgPerMl,
    finalLiters,
    hasMeasuredDropsPerMl,
    maxSafeStrength,
    measuredDropsPerMl,
    onPlanChange,
    planFormSignature,
    planGroupSignature,
    planStrengthSignature,
    planVolumeSignature,
    stockStrategy,
    stockStrategyDetails.label,
    strength,
    straightDropsPerMl,
    dropperStyle,
  ]);

  const updateFinalVolume = (value: string) => setFinalVolumeInput(value);
  const modeHeader = stockStrategy === 'gh-kh'
    ? { badge: 'GH + KH', description: 'compatible minerals stay in separate bottles', heading: 'Two bottles. One balanced water.', intro: 'Prepare each compatible stock, then add both to the finished water.' }
    : stockStrategy === 'individual'
      ? { badge: 'Separate salts', description: 'one bottle per active salt', heading: 'One bottle per salt.', intro: 'Tune each stock independently, then dose every bottle into the finished water.' }
      : { badge: 'All-in-one', description: 'recipe proportions stay locked', heading: 'One bottle. One answer.', intro: 'Set the stock strength once, then dose the finished water in drops.' };

  return (
    <main className="recipe-concentrate-shell space-y-3">
      <section className="recipe-concentrate-header rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/10 via-slate-800/70 to-violet-500/10 p-4 shadow-xl sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-fuchsia-200">{modeHeader.badge}</span>
              <span className="text-[10px] text-slate-500">{modeHeader.description}</span>
            </div>
             <h2 className="mt-2 truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">{singleSaltOnly ? 'DIY single-salt concentrate' : handoff.name}</h2>
             <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
               {singleSaltOnly
                 ? 'Prepare one selected mineral in a calibrated bottle, then dose it into your finished water.'
                 : `${modeHeader.heading} ${modeHeader.intro}`}
             </p>
          </div>
           {!singleSaltOnly && (
             <button
               type="button"
               onClick={onClear}
               className="rounded-lg border border-slate-600/70 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
             >
               Clear imported recipe
             </button>
           )}
        </div>
      </section>

       {!singleSaltOnly && <div className="recipe-concentrate-tabs flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-950/45 p-1 shadow-xl" role="tablist" aria-label="Concentrate recipe mode">
        {([
          ['all-in-one', 'All-in-one', 'Every active salt shares one bottle'],
          ['gh-kh', 'GH + KH', 'Separate compatible groups'],
          ['individual', 'Separate salts', 'One bottle per active salt'],
        ] as const).map(([value, label, description]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={stockStrategy === value}
            title={description}
            onClick={() => {
              setStockStrategy(value);
              if (value === 'all-in-one' && maxSafeStrengthByStrategy['all-in-one'] != null) {
                setStrengthInput(String(maxSafeStrengthByStrategy['all-in-one']));
              }
            }}
            className={`flex-1 rounded-lg px-2 py-2 text-[10px] font-semibold transition sm:text-xs ${
              stockStrategy === value
                ? 'bg-fuchsia-400/15 text-fuchsia-100 ring-1 ring-fuchsia-300/25'
                : 'text-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
       </div>}

       <section className="recipe-concentrate-panel overflow-hidden rounded-2xl border border-slate-700/60">
        <div className="border-b border-slate-700/50 bg-gradient-to-r from-fuchsia-500/[0.12] via-transparent to-cyan-400/[0.08] px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-fuchsia-200/65">Concentrate workflow</div>
              <p className="mt-1 text-xs text-slate-400">{stockStrategyDetails.helper} Each card prepares one bottle and doses the same final-water amount.</p>
            </div>
            <div className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] px-3 py-2 text-right">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300/75">
                {maxSafeStrength != null && strength > maxSafeStrength ? 'Above safe ceiling' : 'Modeled ceiling'}
              </div>
              <div className="mt-1 text-sm font-semibold tabular-nums text-emerald-100">Max ×{maxSafeStrength ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-3 sm:p-4">
          {stockGroups.length > 0 ? stockGroups.map(group => (
            <RecipeConcentrateBottleCard
              key={group.id}
              group={group}
              handoff={handoff}
              strengthInput={stockStrategy === 'all-in-one' ? strengthInput : stockStrengthInputs[group.id] ?? '1'}
              volumeInput={stockVolumeInputs[group.id] ?? '100'}
              finalVolumeInput={finalVolumeInput}
              finalLiters={finalLiters}
              volumeUnit={volumeUnit}
              dropperStyle={dropperStyle}
              straightDropsPerMl={straightDropsPerMl}
              measuredDropsPerMlInput={measuredDropsPerMlInput}
              onStrengthChange={value => stockStrategy === 'all-in-one'
                ? setStrengthInput(value)
                : setStockStrengthInputs(previous => ({ ...previous, [group.id]: value }))}
              onVolumeChange={value => setStockVolumeInputs(previous => ({ ...previous, [group.id]: value }))}
              onFinalVolumeChange={updateFinalVolume}
              onToggleVolumeUnit={() => {
                const liters = volumeToLiters(finalVolumeInput, volumeUnit);
                setFinalVolumeInput(litersToVolumeInput(liters, volumeUnit === 'liters' ? 'gallons' : 'liters'));
                onToggleVolumeUnit();
              }}
              onDropperStyleChange={onDropperStyleChange}
              onMeasuredDropsPerMlChange={setMeasuredDropsPerMlInput}
            />
          )) : (
            <div className="rounded-xl border border-amber-300/20 bg-amber-400/[0.06] px-4 py-5 text-sm text-amber-100/80">
              This recipe has no active salts to prepare.
            </div>
          )}
        </div>
      </section>

      {stockStrategy === 'all-in-one' && (
        <>
          <section className="recipe-concentrate-blend rounded-2xl border border-cyan-400/20 bg-slate-800/70 p-4 shadow-xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-xs font-semibold text-slate-100">Recipe blend</div>
                  <div className="mt-0.5 text-[10px] text-slate-500">{Object.keys(saltTargets).filter(id => saltTargets[id] > 0).length} active salts · ratios stay fixed</div>
                </div>
              </div>
              <div className="rounded-full border border-cyan-300/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[9px] font-semibold tabular-nums text-cyan-100/75">
                {dropEquivalents.valid ? recipeConcentrateNumber(dropEquivalents.totalSaltMgPerDrop, 2) : '—'} mg physical salt / drop
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
               {dropEquivalents.perSalt.map(row => {
                 const salt = SALTS.find(item => item.id === row.saltId);
                 return (
                 <div key={row.saltId} className="recipe-concentrate-salt-row rounded-lg px-3 py-2.5" style={salt ? saltVisualStyle(salt) : undefined}>
                  <div className="flex items-baseline justify-between gap-2">
                     <span
                       className="text-[11px] font-semibold text-[color:var(--salt-primary)]"
                       style={salt ? { '--salt-primary': getSaltColorTokens(salt).primary } as CSSProperties : undefined}
                     >
                       {row.saltName}
                     </span>
                    <span className="text-[10px] font-semibold tabular-nums text-cyan-200">{recipeConcentrateNumber(row.saltMgPerDrop, 2)} mg/drop</span>
                  </div>
                   <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-slate-500">
                     <span>{row.formLabel} ·</span>
                     {salt && <SaltIonBadges salt={salt} />}
                     <span>· {recipeConcentrateNumber(row.targetPpm, 1)} ppm target</span>
                   </div>
                </div>
                 );
               })}
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500">Physical salt mass includes the selected hydration form. Salt-equivalent ppm remains the recipe basis and is not a TDS-meter reading.</p>
          </section>

          <details className="recipe-concentrate-safety rounded-xl border border-amber-300/20 bg-amber-400/[0.06]">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-200" aria-hidden="true" />
                <span>
                  <span className="block text-xs font-semibold text-amber-100">
                    {allInOneStrengthIsSafe ? `Why ×${maxSafeStrength ?? 0}?` : 'Strength is above the modeled chemical ceiling'}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-amber-100/55">Modeled ceiling · not a laboratory guarantee</span>
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-amber-100/50" aria-hidden="true" />
            </summary>
            <div className="border-t border-amber-200/15 px-4 pb-3 pt-2 text-[10px] leading-relaxed text-amber-100/65">
              {limitingConstraint.kind === 'chemical'
                ? <>Limiting constraint: <strong className="text-amber-100">{limitingConstraint.saltNames.join(', ') || 'modeled reaction'}</strong>. {limitingConstraint.message}</>
                : limitingConstraint.message}
              {allInOneWarnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {allInOneWarnings.map(warning => <p key={`${warning.severity}-${warning.message}`}>{warning.message}</p>)}
                </div>
              )}
            </div>
          </details>
        </>
      )}

      <section className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] px-4 py-3 shadow-xl sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-emerald-100">
          <span className="flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0 text-emerald-300" />
            {stockStrategy === 'all-in-one'
              ? `${doseMlPerReference.toFixed(2)} mL → ${doseReferenceLabel}`
              : `${stockGroups.length} bottle doses → ${doseReferenceLabel}`}
          </span>
          <span className="text-[10px] font-normal text-emerald-100/60">{hasMeasuredDropsPerMl ? `${recipeConcentrateNumber(activeDropsPerMl, 1)} measured drops/mL` : 'dropper assumption'} · final water is shared</span>
        </div>
      </section>
    </main>
  );
}

function StepHeading({ number, title, icon }: { number: string; title: string; icon?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-700/50 pb-3">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-fuchsia-400/15 text-xs font-bold text-fuchsia-200">{number}</span>
      {icon && (
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-fuchsia-300/20 bg-fuchsia-400/[0.08] text-fuchsia-200">
          {icon}
        </span>
      )}
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
  currentFinalIons,
  supplementalIons,
  targetIons,
  profiles,
  activeProfileId,
  wmProfiles,
  allRecipes,
  externalRecipes,
  lotusRecipes,
  referenceWaters,
  comparisonProfiles,
  watermancerTargetSource,
  onTargetSourceChange,
  onTargetOverrideChange,
  onSaveWmProfile,
  onDeleteWmProfile,
  hasSaltRecipeTargets,
  onSendRecipeToConcentrate,
  onShareRecipe,
  shareStatus,
  onImportRecipeFile,
  onReset,
}: {
  ions: Partial<Record<IonId, number>>;
  currentFinalIons: Partial<Record<IonId, number>>;
  supplementalIons: Partial<Record<SupplementalIonId, number>>;
  targetIons: Partial<Record<IonId, number>>;
  profiles: WaterProfile[];
  activeProfileId: string;
  wmProfiles: WatermancerProfile[];
  allRecipes: SaltRecipe[];
  externalRecipes: ExternalRecipe[];
  lotusRecipes: LotusRecipe[];
  referenceWaters: typeof EMPIRICAL_WATERS;
  comparisonProfiles: WatermancerComparisonProfile[];
  watermancerTargetSource: WatermancerTargetSourceId;
  onTargetSourceChange: (source: WatermancerTargetSourceId) => void;
  onTargetOverrideChange: (targets: IonicTargetValues | null) => void;
  onSaveWmProfile: (profile: WatermancerProfile) => void;
  onDeleteWmProfile: (id: string) => void;
  hasSaltRecipeTargets: boolean;
  onSendRecipeToConcentrate: () => void;
  onShareRecipe: () => void;
  shareStatus: 'idle' | 'downloaded' | 'shared' | 'error';
  onImportRecipeFile: (file: File) => void;
  onReset: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editingIonId, setEditingIonId] = useState<IonId | null>(null);
  const [draftTargets, setDraftTargets] = useState<Partial<Record<IonId, string>>>({});
  const [namingMode, setNamingMode] = useState<'new' | null>(null);
  const [newName, setNewName] = useState('');
  const importRecipeInputRef = useRef<HTMLInputElement>(null);
  const [compareProfilesOpen, setCompareProfilesOpen] = useState(false);
  const [comparisonLeftId, setComparisonLeftId] = useState(comparisonProfiles[0]?.id ?? '');
  const [comparisonRightId, setComparisonRightId] = useState(comparisonProfiles[1]?.id ?? comparisonProfiles[0]?.id ?? '');

  useEffect(() => {
    if (!comparisonProfiles.some(profile => profile.id === comparisonLeftId)) {
      setComparisonLeftId(comparisonProfiles[0]?.id ?? '');
    }
    if (!comparisonProfiles.some(profile => profile.id === comparisonRightId)) {
      setComparisonRightId(comparisonProfiles[1]?.id ?? comparisonProfiles[0]?.id ?? '');
    }
  }, [comparisonLeftId, comparisonProfiles, comparisonRightId]);

  const comparisonLeft = comparisonProfiles.find(profile => profile.id === comparisonLeftId);
  const comparisonRight = comparisonProfiles.find(profile => profile.id === comparisonRightId);
  const comparisonPickerGroups = useMemo<RecipePickerGroup[]>(() => [{
    label: 'Watermancer profiles',
    accent: 'cyan',
    options: comparisonProfiles.map(profile => ({
      value: profile.id,
      label: profile.name,
    })),
  }], [comparisonProfiles]);

  const currentDropdownValue = watermancerTargetSource === 'safe-profile'
    ? `profile:${AIKI_DEFAULT_PROFILE.id}`
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
    if (currentDropdownValue.startsWith('lotus:')) {
      return lotusRecipes.find(
        recipe => recipe.id === currentDropdownValue.slice('lotus:'.length),
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
    if (currentDropdownValue.startsWith('saved:')) {
      return wmProfiles.find(
        profile => profile.id === currentDropdownValue.slice('saved:'.length),
      )?.name ?? 'selected saved profile';
    }
    if (currentDropdownValue.startsWith('recipe:')) {
      return allRecipes.find(
        recipe => recipe.id === currentDropdownValue.slice('recipe:'.length),
      )?.name ?? 'selected recipe';
    }
    if (currentDropdownValue.startsWith('lotus:')) {
      return lotusRecipes.find(
        recipe => recipe.id === currentDropdownValue.slice('lotus:'.length),
      )?.name ?? 'selected Lotus recipe';
    }
    return externalRecipes.find(
      recipe => recipe.id === currentDropdownValue.slice('external:'.length),
    )?.name ?? 'selected Watering Hole recipe';
  })();

  const handleDropdownChange = (value: string) => {
    cancelEditing();
    if (value.startsWith('profile:')) {
      onTargetSourceChange(value as WatermancerTargetSourceId);
    } else {
      onTargetSourceChange(value as WatermancerTargetSourceId);
    }
  };

  const startEditing = () => {
    setDraftTargets(
      Object.fromEntries(
        ACTIVE_ION_IDS.map(id => [id, String(currentFinalIons[id] ?? 0)]),
      ) as Partial<Record<IonId, string>>,
    );
    setEditing(true);
    setEditingIonId(null);
    setNamingMode(null);
    setNewName('');
  };

  const startIonEditing = (id: IonId) => {
    if (editing || editingIonId !== null) {
      setEditing(false);
      setEditingIonId(id);
      setNamingMode(null);
      return;
    }
    setDraftTargets(
      Object.fromEntries(
        ACTIVE_ION_IDS.map(targetId => [targetId, String(targetIons[targetId] ?? 0)]),
      ) as Partial<Record<IonId, string>>,
    );
    setEditing(false);
    setEditingIonId(id);
    setNamingMode(null);
    setNewName('');
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditingIonId(null);
    setDraftTargets({});
    setNamingMode(null);
    setNewName('');
    onTargetOverrideChange(null);
  };

  const draftAsTargets = (): IonicTargetValues => Object.fromEntries(
    ACTIVE_ION_IDS.map(id => {
      const val = parseFloat(draftTargets[id] ?? '0');
      return [id, Number.isFinite(val) && val >= 0 ? val : 0];
    }),
  ) as IonicTargetValues;

  const handleSaveAsNew = () => {
    if (!newName.trim()) return;
    const targets = draftAsTargets();
    const profile = createWatermancerProfile(newName.trim(), targets);
    onSaveWmProfile(profile);
    onTargetSourceChange(`saved:${profile.id}` as WatermancerTargetSourceId);
    finishEditing();
  };

  const selectedSavedProfile = currentDropdownValue.startsWith('saved:')
    ? wmProfiles.find(profile => profile.id === currentDropdownValue.slice('saved:'.length))
    : undefined;

  const handleDeleteSelectedProfile = () => {
    if (!selectedSavedProfile) return;
    if (!window.confirm(`Delete saved profile “${selectedSavedProfile.name}”?`)) return;
    onDeleteWmProfile(selectedSavedProfile.id);
    finishEditing();
  };

  const handleOverwrite = () => {
    if (!selectedSavedProfile) return;
    onSaveWmProfile({
      ...selectedSavedProfile,
      targets: draftAsTargets(),
    });
    finishEditing();
  };

  const finishEditing = () => {
    setEditing(false);
    setEditingIonId(null);
    setNamingMode(null);
    setNewName('');
    setDraftTargets({});
    onTargetOverrideChange(null);
  };

  const updateDraft = (id: IonId, value: string) => {
    const nextDraft = { ...draftTargets, [id]: value };
    setDraftTargets(nextDraft);
    onTargetOverrideChange(Object.fromEntries(
      ACTIVE_ION_IDS.map(targetId => {
        const parsed = parseFloat(nextDraft[targetId] ?? '0');
        return [targetId, Number.isFinite(parsed) && parsed >= 0 ? parsed : 0];
      }),
    ) as IonicTargetValues);
  };

  const isEditingAny = editing || editingIonId !== null;
  const canOverwrite = Boolean(selectedSavedProfile);
  const targetSourcePickerGroups = useMemo<RecipePickerGroup[]>(() => [
    {
      label: 'Empirical Water Profiles',
      accent: 'cyan',
      options: profiles
        .filter(profile => profile.id !== AIKI_DEFAULT_PROFILE.id
          && profile.id !== WATERMANCER_SENSORY_PROFILE.id)
        .map(profile => ({
          value: `profile:${profile.id}`,
          label: profile.name
            .replace(/^Empirical Water — /, '')
            .replace(/ ionic profile$/, ''),
        })),
    },
    ...(wmProfiles.length > 0
      ? [{
          label: 'My saved profiles',
          accent: 'violet' as const,
          options: wmProfiles.map(profile => ({
            value: `saved:${profile.id}`,
            label: profile.name,
          })),
        }]
      : []),
    {
      label: 'Kimoi.coffee Recipes',
      accent: 'emerald',
      options: allRecipes.map(recipe => ({
        value: `recipe:${recipe.id}`,
        label: `${recipe.id === 'kimoi' ? '⭐ ' : ''}${recipe.name}`,
      })),
    },
    {
      label: 'Watering Hole · Filter',
      accent: 'amber',
      options: externalRecipes
        .filter(recipe => recipe.method === 'Filter')
        .map(recipe => ({ value: `external:${recipe.id}`, label: recipe.name })),
    },
    {
      label: 'Watering Hole · Espresso',
      accent: 'amber',
      options: externalRecipes
        .filter(recipe => recipe.method === 'Espresso')
        .map(recipe => ({ value: `external:${recipe.id}`, label: recipe.name })),
    },
    {
      label: 'Watering Hole · Tap-water proxy',
      accent: 'amber',
      options: externalRecipes
        .filter(recipe => recipe.method.includes('tap-water'))
        .map(recipe => ({ value: `external:${recipe.id}`, label: recipe.name })),
    },
    {
      label: 'Lotus Coffee Products',
      accent: 'violet',
      options: lotusRecipes.map(recipe => ({
        value: `lotus:${recipe.id}`,
        label: recipe.name,
      })),
    },
  ], [activeProfileId, allRecipes, externalRecipes, lotusRecipes, profiles, wmProfiles]);

  return (
    <div className="app-card app-panel-surface bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-indigo-400/30 overflow-hidden">
      {/* Header */}
      <div className="app-section-header flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 border-b border-indigo-400/15 text-slate-300">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-indigo-300" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">1. Set your target water</h2>
        </div>
         <div className="flex min-w-0 flex-1 flex-wrap items-center justify-start gap-2">
           {selectedTargetSourceUrl && (
             <a
               href={selectedTargetSourceUrl}
               target="_blank"
               rel="noreferrer"
               aria-label={`Open source page for ${selectedTargetSourceName}`}
               title={`Open source page for ${selectedTargetSourceName}`}
               className="flex h-5 w-5 items-center justify-center rounded-full border border-indigo-300/35 bg-indigo-500/15 text-[10px] font-bold leading-none text-indigo-100 transition hover:border-indigo-200/70 hover:bg-indigo-500/30 hover:text-white"
             >
               ?
             </a>
           )}
           <MineralRecipePicker
             value={currentDropdownValue}
             groups={targetSourcePickerGroups}
             onChange={handleDropdownChange}
           />
           <div className="flex items-center gap-2">
             {!isEditingAny ? (
               <button
                 type="button"
                 onClick={startEditing}
                 className="flex items-center gap-1.5 text-xs text-violet-200 hover:text-violet-100 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-400/25 hover:border-violet-300/45 rounded-lg px-2.5 py-1.5 transition"
                 title="Edit this Watermancer profile before saving"
               >
                 <Save className="h-3.5 w-3.5" />
                 <span className="hidden sm:inline">Save</span>
               </button>
             ) : (
               <>
                 <button
                   type="button"
                   onClick={() => setNamingMode('new')}
                   className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] text-white transition hover:bg-emerald-500"
                 >
                   <Save className="h-3.5 w-3.5" />
                   <span className="hidden sm:inline">Save as new</span>
                 </button>
                 {canOverwrite && (
                   <button
                     type="button"
                     onClick={handleOverwrite}
                     className="flex items-center gap-1.5 rounded-lg border border-indigo-400/40 bg-indigo-500/15 px-2.5 py-1.5 text-[11px] text-indigo-100 transition hover:border-indigo-300/60 hover:bg-indigo-500/25"
                   >
                     <Save className="h-3.5 w-3.5" />
                     <span className="hidden sm:inline">Overwrite selected</span>
                   </button>
                 )}
                 <button
                   type="button"
                   onClick={cancelEditing}
                   className="flex items-center gap-1.5 rounded-lg border border-slate-600/60 bg-slate-700/50 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:bg-slate-700/80 hover:text-white"
                 >
                   <X className="h-3.5 w-3.5" />
                   <span className="hidden sm:inline">Cancel</span>
                 </button>
               </>
             )}
           </div>
            {selectedSavedProfile && (
              <button
                type="button"
                onClick={handleDeleteSelectedProfile}
                className="flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200 transition hover:border-rose-300/50 hover:bg-rose-500/20 hover:text-rose-100"
                aria-label={`Delete saved profile ${selectedSavedProfile.name}`}
                title="Delete this saved profile"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
           <button
             type="button"
             onClick={onShareRecipe}
             className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition ${
               shareStatus === 'error'
                 ? 'text-rose-200 bg-rose-500/10 border border-rose-400/40 hover:border-rose-300/60 hover:bg-rose-500/20'
                 : shareStatus !== 'idle'
                   ? 'text-emerald-200 bg-emerald-500/10 border border-emerald-400/40'
                   : 'text-emerald-200 hover:text-emerald-100 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/25 hover:border-emerald-300/45'
             }`}
             aria-live="polite"
             title="Download the current profile"
           >
             <Download className="h-3.5 w-3.5" aria-hidden="true" />
             <span className="hidden sm:inline">
               {shareStatus === 'downloaded'
                 ? 'Profile downloaded'
                 : shareStatus === 'error'
                   ? 'Download failed'
                   : 'Share'}
             </span>
           </button>
           {hasSaltRecipeTargets && (
             <button
               type="button"
               onClick={onSendRecipeToConcentrate}
                className="flex items-center gap-1.5 rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/10 px-2.5 py-1.5 text-xs text-fuchsia-200 transition hover:border-fuchsia-300/45 hover:bg-fuchsia-500/20 hover:text-fuchsia-100"
               title="Open this recipe in the Concentrate workspace"
             >
               <FlaskConical className="h-3.5 w-3.5" />
               <span className="hidden sm:inline">Use in Concentrate</span>
             </button>
           )}
           <button
             type="button"
             onClick={() => importRecipeInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-sky-200 hover:text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/25 hover:border-sky-300/45 rounded-lg px-2.5 py-1.5 transition"
             title="Import water profile"
           >
             <Import className="h-3.5 w-3.5" aria-hidden="true" />
             <span className="hidden sm:inline">Import</span>
           </button>
           <button
             type="button"
             onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-amber-200 hover:text-amber-100 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/25 hover:border-amber-300/45 rounded-lg px-2.5 py-1.5 transition"
             title="Reset all inputs to defaults"
           >
             <RotateCcw className="h-3.5 w-3.5" />
             <span className="hidden sm:inline">Reset</span>
           </button>
           <input
             ref={importRecipeInputRef}
             type="file"
             accept=".WATER,.water,.WATER.png,.water.png,.json,.png,image/png,application/json"
             className="hidden"
             onChange={event => {
               const file = event.target.files?.[0];
               if (file) onImportRecipeFile(file);
               event.target.value = '';
             }}
           />
        </div>
      </div>
      <div className="border-b border-indigo-400/15 px-4 py-3 sm:px-6">
        <button
          type="button"
          aria-expanded={compareProfilesOpen}
          onClick={() => setCompareProfilesOpen(open => !open)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            compareProfilesOpen
              ? 'border-cyan-300/60 bg-cyan-400/15 text-cyan-100'
              : 'border-slate-600/70 bg-slate-900/35 text-slate-300 hover:border-cyan-300/45 hover:bg-cyan-500/10 hover:text-cyan-100'
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-current/30 bg-black/10 text-[10px]">↔</span>
          Compare profiles
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${compareProfilesOpen ? 'rotate-180' : ''}`} />
        </button>
        {compareProfilesOpen && (
          <div className="mt-3 rounded-xl border border-cyan-400/25 bg-cyan-950/15 p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Profile comparison</div>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  Compare target values side by side. Differences are calculated as <span className="font-semibold text-slate-300">Profile B − Profile A</span>.
                </p>
              </div>
              <span className="rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-200/70">
                Informational
              </span>
            </div>
            {comparisonProfiles.length >= 2 ? (
              <>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-2.5">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Profile A</div>
                    <MineralRecipePicker
                      value={comparisonLeftId}
                      groups={comparisonPickerGroups}
                      onChange={setComparisonLeftId}
                    />
                  </div>
                  <div className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-2.5">
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Profile B</div>
                    <MineralRecipePicker
                      value={comparisonRightId}
                      groups={comparisonPickerGroups}
                      onChange={setComparisonRightId}
                    />
                  </div>
                </div>
                {comparisonLeft && comparisonRight && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-950/25">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(5.5rem,0.7fr)_minmax(5.5rem,0.7fr)_minmax(5.5rem,0.7fr)] border-b border-slate-700/60 px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(6rem,0.7fr))]">
                      <span>Ion</span>
                      <span className="text-right">Profile A</span>
                      <span className="text-right">Profile B</span>
                      <span className="text-right">Difference</span>
                    </div>
                    <div className="divide-y divide-slate-800/80">
                      {ACTIVE_ION_IDS.map(id => {
                        const leftValue = Number(comparisonLeft.targets[id] ?? 0);
                        const rightValue = Number(comparisonRight.targets[id] ?? 0);
                        const difference = rightValue - leftValue;
                        const differenceTone = Math.abs(difference) <= 0.05
                          ? 'text-slate-500'
                          : difference > 0
                            ? 'text-emerald-300'
                            : 'text-amber-300';
                        return (
                          <div
                            key={id}
                            className="grid grid-cols-[minmax(0,1fr)_minmax(5.5rem,0.7fr)_minmax(5.5rem,0.7fr)_minmax(5.5rem,0.7fr)] items-center gap-2 px-3 py-2 text-[11px] sm:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(6rem,0.7fr))]"
                            style={{ ...ionVisualStyle(id), boxShadow: 'inset 3px 0 0 var(--ion-border)' }}
                          >
                            <span className="truncate font-semibold text-[color:var(--ion-fg)]" title={ION_MAP[id].name}>{ION_MAP[id].formula}</span>
                            <span className="text-right tabular-nums text-slate-400">{leftValue.toFixed(1)} ppm</span>
                            <span className="text-right tabular-nums text-slate-200">{rightValue.toFixed(1)} ppm</span>
                            <span className={`text-right font-semibold tabular-nums ${differenceTone}`}>
                              {difference > 0.05 ? '+' : ''}{difference.toFixed(1)} ppm
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/[0.06] px-3 py-2 text-[11px] text-amber-100">
                Add at least two profiles to compare them.
              </p>
            )}
          </div>
        )}
      </div>
      {/* Ion cards */}
      <div className="app-card-body grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
         {ACTIVE_ION_IDS.map((id, idx) => {
          const ion = ION_MAP[id];
          const ppm = ions[id] ?? 0;
           const cardEditing = editing || editingIonId === id;
           const target = cardEditing
            ? parseFloat(draftTargets[id] ?? '0')
            : (targetIons[id] ?? 0);
          const gap = Math.max(target - ppm, 0);
          const aboveTarget = ppm > target + 0.05;
          const tooltipAbove = idx >= Math.ceil(ACTIVE_ION_IDS.length / 2);

          return (
              <div
              key={id}
                 className={`group/ion relative rounded-xl border px-4 py-3 transition ${aboveTarget ? 'border-amber-500/40 bg-amber-500/10' : 'border-emerald-500/40 bg-emerald-500/10'} ${!editing ? 'cursor-pointer hover:border-indigo-300/60 hover:bg-indigo-500/10' : ''}`}
                 style={{ ...ionVisualStyle(id), boxShadow: 'inset 3px 0 0 var(--ion-border)' }}
                role={!editing ? 'button' : undefined}
                tabIndex={!editing ? 0 : -1}
                onClick={!editing ? () => startIonEditing(id) : undefined}
                onKeyDown={!editing ? event => {
                 if (event.key === 'Enter' || event.key === ' ') {
                   event.preventDefault();
                   startIonEditing(id);
                 }
               } : undefined}
                aria-label={!editing ? `Edit ${ion.name} target` : undefined}
            >
              <div className="flex items-center justify-between mb-1">
                 <span className="cursor-help text-sm font-semibold text-[color:var(--ion-fg)]" title={ion.name}>{ion.formula}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${aboveTarget ? 'bg-amber-400' : 'bg-emerald-400'}`} />
              </div>
               <div className="flex items-baseline gap-2">
                 <span className="text-lg font-bold text-[color:var(--ion-fg)]">{ppm.toFixed(1)}</span>
                <span className="text-xs text-slate-400">ppm</span>
              </div>
               {cardEditing ? (
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
                {renderIonTooltipText(ion.tasteNote)}
              </span>
            </div>
          );
        })}
        {(Object.keys(SUPPLEMENTAL_ION_MAP) as SupplementalIonId[]).map(id => {
          const supplemental = SUPPLEMENTAL_ION_MAP[id];
          const ppm = supplementalIons[id] ?? 0;
          if (ppm <= 0) return null;
          return (
            <div
              key={`supplemental-${id}`}
              className="group/ion relative rounded-xl border border-violet-400/40 bg-violet-500/10 px-4 py-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="cursor-help text-sm font-medium text-slate-200">
                  {supplemental.name}
                </span>
                <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold text-violet-300">
                  {ppm.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400">ppm</span>
              </div>
              <div className="mt-0.5 text-[10px] text-violet-200/70">
                {supplemental.formula}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Supplemental component · display only
              </div>
              <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 w-56 rounded-lg border border-slate-600/60 bg-slate-900 px-3 py-2 text-xs text-slate-300 opacity-0 shadow-xl transition-opacity group-hover/ion:opacity-100">
                {supplemental.note}
              </span>
            </div>
          );
        })}
      </div>
      {/* Naming dialog */}
      {isEditingAny && namingMode === 'new' && (
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
                if (e.key === 'Enter') handleSaveAsNew();
               if (e.key === 'Escape') cancelEditing();
             }}
           />
           <button
             onClick={handleSaveAsNew}
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

function WatermancerIonReadingRow({
  id,
  actualIons,
  targetIons,
  activeProfile,
  compact = false,
}: {
  id: IonId;
  actualIons: Partial<Record<IonId, number>>;
  targetIons: Partial<Record<IonId, number>>;
  activeProfile: WaterProfile;
  compact?: boolean;
}) {
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
  const profileRange = activeProfile.ranges[id];
  const profileGreenMax = profileRange.greenMax;
  const profileYellowPercent = profileGreenMax > 0
    ? (profileRange.yellowMax / profileGreenMax) * 100
    : 100;
  const profilePercent = profileGreenMax > 0
    ? (actual / profileGreenMax) * 100
    : 0;
  const profileScalePercent = Math.max(100, profileYellowPercent, profilePercent);
  const profileFillPercent = profileScalePercent > 0
    ? Math.min((profilePercent / profileScalePercent) * 100, 100)
    : 0;
  const profileGreenMarkerPercent = profileScalePercent > 0
    ? Math.min((100 / profileScalePercent) * 100, 100)
    : 100;
  const profileYellowMarkerPercent = profileScalePercent > 0
    ? Math.min((profileYellowPercent / profileScalePercent) * 100, 100)
    : 100;
  const rowGridClass = compact
    ? 'grid-cols-[6rem_minmax(0,1fr)_9rem] sm:grid-cols-[7rem_minmax(0,1fr)_10rem]'
    : 'grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] sm:grid-cols-[6rem_minmax(0,1fr)_6.5rem]';
  const barHeightClass = compact ? 'h-3' : 'h-4';
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
    <div
      data-watermancer-ion-row={id}
      className={`grid ${rowGridClass} items-center gap-x-3 gap-y-1`}
      style={ionVisualStyle(id)}
    >
      <span className="truncate text-xs font-semibold text-[color:var(--ion-fg)]" title={ion.name}>{ion.formula}</span>
      <div className="min-w-0">
        <div
          className="group/profile-result-bar relative min-w-0 cursor-help outline-none"
          tabIndex={0}
          role="img"
          aria-label={coveragePercent === null
             ? `${ion.name} (${ion.formula}): no target set; hover to compare with ${activeProfile.name} range`
             : `${ion.name} (${ion.formula}): ${coverageLabel} of target; hover to compare with ${activeProfile.name} range`}
          title={`Hover to compare ${ion.name} with ${activeProfile.name} range`}
        >
          <div className={`relative ${barHeightClass} overflow-hidden rounded-full bg-slate-700/70 transition-opacity group-hover/profile-result-bar:hidden group-focus/profile-result-bar:hidden`}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${percentage}%`, backgroundColor: 'var(--ion-bar)', boxShadow: '0 0 10px var(--ion-shadow)' }}
            />
            <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums leading-none ${
              covered || overshoot ? 'text-slate-950/80' : 'text-slate-300'
            }`}>
              {coverageLabel}
            </span>
          </div>
          <div
            className={`relative hidden ${barHeightClass} overflow-hidden rounded-full bg-slate-700/70 ring-1 ring-indigo-300/20 group-hover/profile-result-bar:block group-focus/profile-result-bar:block`}
            aria-hidden="true"
          >
            <div
              className="relative h-full rounded-full transition-all duration-300"
              style={{ width: `${profileFillPercent}%`, backgroundColor: 'var(--ion-bar)' }}
            />
            <div
              className="absolute inset-y-0 w-[2px] bg-emerald-100 shadow-[0_0_7px_1px_rgba(167,243,208,0.95)]"
              style={{ left: `${profileGreenMarkerPercent}%` }}
            />
            <div
              className="absolute inset-y-0 w-[2px] bg-rose-200 shadow-[0_0_7px_1px_rgba(253,164,175,0.95)]"
              style={{ left: `${profileYellowMarkerPercent}%` }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums text-slate-950">
              {Math.round(profilePercent)}%
            </span>
          </div>
        </div>
        <div className={`mt-1 truncate text-[10px] ${valueColor}`}>
          {status}
        </div>
      </div>
      <span className={`whitespace-nowrap text-right ${compact ? 'text-sm' : 'text-xs'} font-semibold tabular-nums text-slate-100`}>
        {formatLiveIonPpm(actual)}
        <span className="font-normal text-slate-500"> / {formatLiveIonPpm(target)}</span>
      </span>
    </div>
  );
}

function WatermancerIonCoverageBars({
  actualIons,
  supplementalIons,
  targetIons,
  targetLabel,
  activeProfile,
  spotlightIonIds,
  feedbackEnabled,
  followEnabled,
  dockPosition,
  onDockPositionChange,
  onToggleFeedback,
  onToggleFollow,
}: {
  actualIons: Partial<Record<IonId, number>>;
  supplementalIons: Partial<Record<SupplementalIonId, number>>;
  targetIons: Partial<Record<IonId, number>>;
  targetLabel: string;
  activeProfile: WaterProfile;
  spotlightIonIds: IonId[];
  feedbackEnabled: boolean;
  followEnabled: boolean;
  dockPosition: 'center' | 'left' | 'right';
  onDockPositionChange: (position: 'center' | 'left' | 'right') => void;
  onToggleFeedback: () => void;
  onToggleFollow: () => void;
}) {
  const [isScrolling, setIsScrolling] = useState(false);
  const completeActualIons = completeIonTotals(actualIons);
  const finalGh = computeGH(completeActualIons);
  const finalKh = computeKH(completeActualIons);
  const finalTds = Object.values(actualIons).reduce((total, ppm) => total + (ppm ?? 0), 0);
  const finalGhKhRatio = finalKh > 0 && Number.isFinite(finalGh / finalKh)
    ? `${(finalGh / finalKh).toFixed(1)}:1`
    : '—';
  useEffect(() => {
    if (!followEnabled) {
      setIsScrolling(false);
      return;
    }
    let scrollEndTimer: number | null = null;
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollEndTimer !== null) window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(() => {
        setIsScrolling(false);
        scrollEndTimer = null;
      }, 180);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollEndTimer !== null) window.clearTimeout(scrollEndTimer);
    };
  }, [followEnabled]);
  const compact = followEnabled && isScrolling;
  const followPositionClass = dockPosition === 'left'
    ? 'fixed inset-x-3 top-3 sm:left-3 sm:right-auto sm:w-[calc(100%-3rem)] sm:max-w-xl sm:translate-x-0'
    : dockPosition === 'right'
      ? 'fixed inset-x-3 top-3 sm:left-auto sm:right-3 sm:w-[calc(100%-3rem)] sm:max-w-xl sm:translate-x-0'
      : 'fixed inset-x-3 bottom-3 top-auto sm:left-1/2 sm:right-auto sm:w-[calc(100%-3rem)] sm:max-w-5xl sm:-translate-x-1/2';
  const compactPositionClass = dockPosition === 'left'
    ? 'fixed bottom-3 left-3 right-auto w-[calc(100%-1.5rem)] max-w-sm translate-x-0'
    : dockPosition === 'right'
      ? 'fixed bottom-3 left-auto right-3 w-[calc(100%-1.5rem)] max-w-sm translate-x-0'
      : 'fixed bottom-3 left-1/2 right-auto w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2';
  const positionClass = compact
    ? compactPositionClass
    : followEnabled
      ? followPositionClass
      : 'relative';
  const followHeightClass = followEnabled && !compact && dockPosition === 'center'
    ? 'max-h-[42vh] sm:max-h-[min(56vh,34rem)]'
    : '';
  return (
    <>
      <div
        className={`${positionClass} ${followHeightClass} app-card z-50 flex flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-900/95 shadow-2xl shadow-slate-950/40 backdrop-blur-md transition-[width,max-height] duration-200`}
      >
      <div className="app-section-header flex shrink-0 items-center justify-between gap-3 border-b border-cyan-400/15 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent px-4 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-100">Current ion readings</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
               Final mineral contribution from the current waters and salt doses.
            </p>
          </div>
          <span className="text-right text-[10px] uppercase tracking-wider text-slate-500">
            {targetLabel} ion targets
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleFeedback}
            disabled={followEnabled}
            aria-pressed={feedbackEnabled}
            aria-label={feedbackEnabled ? 'Disable updated ion feedback' : 'Enable updated ion feedback'}
            title={followEnabled
              ? 'Follow screen temporarily turns feedback off'
              : 'Show a temporary tray after ion adjustments'}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${
              feedbackEnabled
                ? 'border-cyan-300/40 bg-cyan-500/15 text-cyan-100 hover:border-cyan-200/65 hover:bg-cyan-500/25'
                : 'border-slate-700/70 bg-slate-950/30 text-slate-500 hover:border-cyan-300/40 hover:bg-cyan-500/10 hover:text-cyan-200'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Feedback {feedbackEnabled ? 'on' : 'off'}</span>
          </button>
          <button
            type="button"
            onClick={onToggleFollow}
            aria-pressed={followEnabled}
            aria-label={followEnabled ? 'Stop following the ion readings card while scrolling' : 'Keep the ion readings card visible while scrolling'}
            title={followEnabled ? 'Stop following while scrolling' : 'Keep visible while scrolling'}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${
              followEnabled
                ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100 hover:border-emerald-300/65 hover:bg-emerald-500/20'
                : 'border-cyan-300/25 bg-slate-950/30 text-cyan-100 hover:border-cyan-300/55 hover:bg-cyan-500/10'
            }`}
          >
            {followEnabled ? <PinOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Pin className="h-3.5 w-3.5" aria-hidden="true" />}
            <span className="hidden sm:inline">{followEnabled ? 'Following' : 'Follow'}</span>
          </button>
          {followEnabled && (
            <div className="flex items-center gap-1 rounded-lg border border-cyan-300/15 bg-slate-950/25 p-0.5" role="group" aria-label="Follow screen position">
              {([
                ['left', 'Left'],
                ['center', 'Center'],
                ['right', 'Right'],
              ] as const).map(([position, label]) => (
                <button
                  key={position}
                  type="button"
                  onClick={() => onDockPositionChange(position)}
                  aria-pressed={dockPosition === position}
                  className={`rounded-md px-1.5 py-1 text-[9px] font-semibold transition ${
                    dockPosition === position
                      ? 'bg-cyan-500/20 text-cyan-100'
                      : 'text-slate-500 hover:bg-cyan-500/10 hover:text-cyan-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <span className="rounded-full border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-cyan-200/70">
            Live
          </span>
        </div>
      </div>
         <div className={`${compact ? 'hidden' : ''} app-card-body min-h-0 flex-1 space-y-3 ${followEnabled && !compact ? 'overflow-y-auto overscroll-contain' : ''}`}>
        {ACTIVE_ION_IDS.map(id => (
          <WatermancerIonReadingRow
            key={id}
            id={id}
            actualIons={actualIons}
            targetIons={targetIons}
            activeProfile={activeProfile}
          />
        ))}
       {(Object.keys(SUPPLEMENTAL_ION_MAP) as SupplementalIonId[]).map(id => {
         const supplemental = SUPPLEMENTAL_ION_MAP[id];
         const ppm = supplementalIons[id] ?? 0;
         if (ppm <= 0) return null;
         return (
           <div key={`supplemental-${id}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center gap-x-3 gap-y-1 sm:grid-cols-[6rem_minmax(0,1fr)_6.5rem]">
             <span className="truncate text-xs text-violet-200" title={supplemental.name}>{supplemental.name}</span>
             <div className="min-w-0">
               <div
                 className="relative h-4 overflow-hidden rounded-full bg-slate-700/70"
                 aria-label={`${supplemental.name}: ${formatLiveIonPpm(ppm)} ppm, display only`}
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
                 {formatLiveIonPpm(ppm)} ppm · no target set
               </div>
             </div>
             <span className="text-right text-xs font-semibold tabular-nums text-violet-200">
               {formatLiveIonPpm(ppm)}
               <span className="font-normal text-slate-500"> ppm</span>
             </span>
           </div>
         );
       })}
      </div>
      {compact && (
        <div className="grid grid-cols-4 divide-x divide-cyan-400/15 border-t border-cyan-400/15 bg-slate-950/45 px-2 py-2" aria-label="Final mixture summary">
          {[
            ['GH', finalGh.toFixed(1), 'ppm as CaCO₃', 'text-indigo-200/70', 'text-indigo-200'],
            ['KH', finalKh.toFixed(1), 'ppm as CaCO₃', 'text-amber-200/70', 'text-amber-200'],
            ['GH:KH', finalGhKhRatio, 'ratio', 'text-emerald-200/70', 'text-emerald-200'],
            ['TDS', finalTds.toFixed(1), 'mg/L', 'text-cyan-200/70', 'text-cyan-200'],
          ].map(([label, value, unit, labelClass, valueClass]) => (
            <div key={label} className="min-w-0 px-1 text-center">
              <div className={`text-[9px] font-semibold uppercase tracking-wider ${labelClass}`}>{label}</div>
              <div className={`mt-0.5 text-xs font-semibold tabular-nums ${valueClass}`}>{value}</div>
              <div className="text-[9px] text-slate-500">{unit}</div>
            </div>
          ))}
        </div>
      )}
      </div>
      {feedbackEnabled && spotlightIonIds.length > 0 && createPortal(
        <div
          className="pointer-events-auto fixed bottom-3 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 rounded-2xl border border-cyan-300/35 bg-slate-900/95 p-2.5 shadow-2xl shadow-slate-950/50 backdrop-blur-md sm:p-3"
          aria-label="Recently changed ion readings"
          aria-live="polite"
        >
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/80">
              Updated readings
            </span>
            <span className="text-[10px] text-slate-500">Final mixture</span>
          </div>
          <div className="grid gap-1.5">
            {spotlightIonIds.map(id => (
              <WatermancerIonReadingRow
                key={`spotlight-${id}`}
                id={id}
                actualIons={actualIons}
                targetIons={targetIons}
                activeProfile={activeProfile}
                compact
              />
            ))}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

function MemeSaltToggle({ showMemeSalts, onToggle }: { showMemeSalts: boolean; onToggle: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [previewRun, setPreviewRun] = useState(0);
  const timerRef = useRef<number | null>(null);

  const playPreview = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setIsPlaying(true);
    setPreviewRun(run => run + 1);
    timerRef.current = window.setTimeout(() => {
      setIsPlaying(false);
      timerRef.current = null;
    }, 3200);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <button
      type="button"
      onClick={onToggle}
      onPointerEnter={event => {
        if (event.pointerType === 'mouse') playPreview();
      }}
      title="Display meme salts"
      aria-label="Display meme salts"
      aria-pressed={showMemeSalts}
      className="group relative inline-flex h-5 w-5 items-center justify-center overflow-hidden text-slate-500 transition hover:text-fuchsia-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-300/70 focus:ring-offset-1 focus:ring-offset-slate-900"
    >
      <img
        key={isPlaying ? `meme-${previewRun}` : 'meme-last-frame'}
        src={isPlaying ? kappMemeGif : kappMemeLastFrame}
        alt=""
        aria-hidden="true"
        className="h-5 w-auto max-w-full object-contain"
      />
    </button>
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

function WatermancerMageMark({
  className = '',
  ...props
}: {
  className?: string;
} & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 56 56" fill="none" className={className} {...props}>
      <path
        d="M28 7 40 19h-7c3.4 4.7 5.2 10.3 5.2 16.7L33.8 42H22.2l-4.4-6.3c0-6.4 1.8-12 5.2-16.7h-7L28 7Z"
        fill="#020617"
        fillOpacity=".88"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M23 27.8 26.6 26l1.4 1.6-3.7 1.3L23 27.8ZM33 27.8 31.6 29l-3.7-1.3 1.5-1.6 3.6 1.8Z" fill="#fb7185" />
      <path d="M26.2 32.5c1.2.8 2.4.8 3.6 0" stroke="currentColor" strokeOpacity=".7" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M36.5 32.5c4-1.8 5.9-4.3 6.7-7.2M43.2 25.3l2-2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 41c6.2-5.2 11.7 4.2 18.2-.6 6.2-4.6 11.2-4 19.8.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M44.5 37.3c1.6-1.7 2.7-3.1 3-4.5 1.2 2.2.8 4.2-1 5.5" fill="currentColor" fillOpacity=".45" />
    </svg>
  );
}

function BrewerMark({
  className = '',
  size = 18,
  ...props
}: {
  className?: string;
  size?: number;
} & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      className={className}
      {...props}
    >
      <path d="M6.5 11.5h13v6.2a3.8 3.8 0 0 1-3.8 3.8h-5.4a3.8 3.8 0 0 1-3.8-3.8v-6.2Z" fill="currentColor" fillOpacity=".14" stroke="currentColor" strokeWidth="1.35" />
      <path d="M19.5 13h1.8a2.7 2.7 0 0 1 0 5.4h-1.8M5 23h16" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      <path d="M10 8.7c-1.2-1.1.8-1.8-.2-3M14 8.7c-1.2-1.1.8-1.8-.2-3M18 8.7c-1.2-1.1.8-1.8-.2-3" stroke="currentColor" strokeOpacity=".72" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function AlchemistMark({
  className = '',
  size = 18,
  ...props
}: {
  className?: string;
  size?: number;
} & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      className={className}
      {...props}
    >
      <path d="M10.75 3.5h6.5M13 3.5v6.2L7 19.05a3.1 3.1 0 0 0 2.6 4.7h8.8a3.1 3.1 0 0 0 2.6-4.7L15 9.7V3.5" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M9.2 17.5h9.6" stroke="currentColor" strokeOpacity=".72" strokeWidth="1.1" strokeLinecap="round" />
      <path d="m21.5 5.2.65 1.8 1.85.65-1.85.65-.65 1.8-.65-1.8L19 7.65l1.85-.65.65-1.8Z" fill="currentColor" />
      <circle cx="12.3" cy="20.1" r=".8" fill="currentColor" />
    </svg>
  );
}

function WatermancerMark({
  className = '',
  size = 18,
  ...props
}: {
  className?: string;
  size?: number;
} & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 28 28"
      width={size}
      height={size}
      fill="none"
      className={className}
      {...props}
    >
      <path
        d="M14 2.75C14 2.75 6.25 10.1 6.25 16.15a7.75 7.75 0 0 0 15.5 0C21.75 10.1 14 2.75 14 2.75Z"
        fill="currentColor"
        fillOpacity=".14"
        stroke="currentColor"
        strokeWidth="1.35"
      />
      <ellipse
        cx="14"
        cy="14"
        rx="8.35"
        ry="3.35"
        stroke="currentColor"
        strokeOpacity=".72"
        strokeWidth="1"
        transform="rotate(-28 14 14)"
      />
      <ellipse
        cx="14"
        cy="14"
        rx="7"
        ry="2.75"
        stroke="currentColor"
        strokeOpacity=".45"
        strokeWidth="1"
        transform="rotate(42 14 14)"
      />
      <path
        d="m14 8.2 2.25 4-2.25 4-2.25-4 2.25-4Z"
        fill="currentColor"
        fillOpacity=".85"
      />
      <circle cx="14" cy="12.2" r="1.1" fill="#0f172a" />
      <circle cx="8.8" cy="18.2" r=".75" fill="currentColor" />
      <circle cx="19.2" cy="18.2" r=".75" fill="currentColor" />
    </svg>
  );
}

function BrewerDropperCalibrationCard({
  dropsPerMl,
  onCalibrate,
  volumeUnit,
  onToggleVolumeUnit,
}: {
  dropsPerMl: number;
  onCalibrate: (value: number) => void;
  volumeUnit: VolumeUnit;
  onToggleVolumeUnit: () => void;
}) {
  const [dropCount, setDropCount] = useState('20');
  const [measuredVolume, setMeasuredVolume] = useState('1');
  const [stockConcentration, setStockConcentration] = useState('50');
  const [doseDrops, setDoseDrops] = useState('20');
  const [doseVolumeLiters, setDoseVolumeLiters] = useState('1');
  const [acknowledged, setAcknowledged] = useState(() => loadDropperCalibrationAcknowledged());
  const [hasSavedCalibration, setHasSavedCalibration] = useState(() => loadHasSavedDropperCalibration());
  const [collapsed, setCollapsed] = useState(true);
  const parsedDrops = Number(dropCount);
  const parsedVolume = Number(measuredVolume);
  const measuredDropsPerMl = parsedDrops > 0 && parsedVolume > 0
    ? parsedDrops / parsedVolume
    : 0;
  const canCalibrate = Number.isFinite(measuredDropsPerMl) && measuredDropsPerMl > 0;
  const effectiveDropsPerMl = canCalibrate ? measuredDropsPerMl : dropsPerMl;
  const stockMgPerMl = Number(stockConcentration);
  const finalDoseDrops = Number(doseDrops);
  const finalVolumeLiters = volumeToLiters(doseVolumeLiters, 'liters');
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
          setCollapsed(open => !open);
        }}
        className={`group flex w-full items-start gap-3 bg-gradient-to-r from-sky-500/10 via-cyan-500/[0.05] to-transparent px-4 py-3 text-left transition hover:from-sky-500/15 hover:via-cyan-500/[0.08] sm:px-6 ${!collapsed ? 'border-b border-sky-400/15' : ''}`}
        aria-label={`${collapsed ? 'Open' : 'Collapse'} dropper calibration`}
        aria-expanded={!collapsed}
        aria-controls="brewer-dropper-calibration-content"
      >
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-300/30 bg-sky-400/10 text-sky-200">
          <FlaskConical className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-sky-100">Calibrate your dropper</h2>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
              hasSavedCalibration
                ? 'border-cyan-300/25 bg-cyan-400/10 text-cyan-200'
                : 'border-amber-300/25 bg-amber-400/10 text-amber-200'
            }`}>
              {hasSavedCalibration ? `${dropsPerMl.toFixed(1)} drops/mL` : 'Not calibrated'}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {collapsed
              ? 'One quick measurement turns drops into reliable mg/L dosing.'
              : 'Turn drops into a reliable mg/L dose for your brew water.'}
          </p>
          {collapsed && (
            <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium text-slate-400">
              {['Measure', 'Convert', 'Dose'].map((step, index) => (
                <span key={step} className="inline-flex items-center gap-1.5 rounded-full border border-sky-300/15 bg-slate-950/20 px-2 py-1">
                  <span className="text-sky-300/80">{index + 1}</span>
                  {step}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-sky-200/80">
          <span className="hidden sm:inline">{collapsed ? 'Open calibration' : 'Collapse'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
        </div>
      </button>
      {!collapsed && <div id="brewer-dropper-calibration-content" className="space-y-3 px-4 py-4 sm:px-6">
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
              setHasSavedCalibration(true);
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
              <span className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                Final water ({volumeUnitShortLabel(volumeUnit)})
                <VolumeUnitToggle unit={volumeUnit} onToggle={onToggleVolumeUnit} />
              </span>
              <VolumeInput
                liters={finalVolumeLiters}
                unit={volumeUnit}
                onChangeLiters={setDoseVolumeLiters}
                ariaLabel={`Final water volume in ${volumeUnitLabel(volumeUnit)}`}
                className="mt-1 w-full bg-transparent text-sm font-semibold tabular-nums text-slate-100 outline-none"
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
  prepMethod,
  onPrepMethodChange,
  recipeHandoffToken,
  guideRecipe,
  saltTargets,
  recipeRows,
  liters,
  volumeUnit,
  onToggleVolumeUnit,
  volumeInput,
  onVolumeChange,
  concentrateOn,
  concentrateLiters,
  concentrateStrength,
  dropsPerMl,
  onOpenSteps,
}: {
  prepMethod: BrewerPrepMethod;
  onPrepMethodChange: (method: BrewerPrepMethod) => void;
  recipeHandoffToken: number;
  guideRecipe: Week1Recipe | null;
  saltTargets: Record<string, number>;
  recipeRows: SaltRow[];
  liters: number;
  volumeUnit: VolumeUnit;
  onToggleVolumeUnit: () => void;
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
       <BrewerPrepMethodSelector
         value={prepMethod}
         onChange={method => {
           onPrepMethodChange(method);
           if (method === 'dry' && makeWaterOpen) setMakeWaterStage('dose');
           if (method === 'dropper' && makeWaterOpen && !stocksReady) setMakeWaterStage('choice');
         }}
       />
      <div id="brewer-mineral-recipe" className="mt-3 scroll-mt-6 rounded-2xl border border-emerald-300/35 bg-gradient-to-br from-emerald-500/15 via-slate-900/25 to-violet-500/10 p-4 shadow-[0_0_30px_-10px_rgba(52,211,153,0.55)] ring-1 ring-emerald-300/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <FlaskConical className="h-4 w-4 text-emerald-300" />
              Your mineral recipe
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {formatVolumeValue(liters || 1, volumeUnit)} {volumeUnitShortLabel(volumeUnit)} batch · RO / distilled 0 TDS · {prepMethod === 'dropper' ? 'Concentrate drops' : 'Weighed salts'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="sr-only">Batch volume</span>
            <VolumeInput
              liters={liters}
              unit={volumeUnit}
              onChangeLiters={onVolumeChange}
              placeholder="1"
              ariaLabel={`Final batch volume in ${volumeUnitLabel(volumeUnit)}`}
              className="w-20 rounded-lg border border-slate-600/60 bg-slate-900/60 px-2.5 py-1.5 text-right text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <VolumeUnitToggle unit={volumeUnit} onToggle={onToggleVolumeUnit} />
          </div>
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
            <Droplet className="h-4 w-4" />
            Make this water
          </button>
          <button
            type="button"
            onClick={() => onOpenSteps(prepMethod)}
            className="flex items-center justify-center gap-2 rounded-xl border border-violet-300/40 bg-violet-400/15 px-4 py-3 text-xs font-semibold text-violet-100 transition hover:border-violet-200/70 hover:bg-violet-400/25 hover:text-white hover:shadow-lg hover:shadow-violet-950/25"
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
               Everything is in for {formatVolumeValue(liters || 1, volumeUnit)} {volumeUnitShortLabel(volumeUnit)} — brew away.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const MINERAL_LABEL_CATION_IDS: IonId[] = ['calcium', 'magnesium', 'sodium', 'potassium'];
const MINERAL_LABEL_ANION_IDS: IonId[] = ['bicarbonate', 'chloride', 'sulfate'];

function MineralAnalysisIonRow({
  id,
  value,
}: {
  id: IonId;
  value: number;
}) {
  const ion = ION_MAP[id];
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#0d6170]/15 py-2.5 last:border-b-0"
      style={{ ...ionVisualStyle(id), borderBottomColor: 'var(--ion-border)' }}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-[13px] font-bold tracking-tight text-[color:var(--ion-light-fg)]" title={ion.name}>{ion.formula}</span>
          <span className="truncate text-[11px] font-semibold tracking-tight text-[#173f49]">{ion.name}</span>
        </div>
        <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#47737a]/80">final concentration</div>
      </div>
      <div className="text-right">
        <div className="font-mono text-lg font-bold leading-none tabular-nums text-[color:var(--ion-light-fg)]">
          {value.toFixed(1)}
        </div>
        <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-[#47737a]">mg/L</div>
      </div>
    </div>
  );
}

function MineralAnalysisLabel({
  recipeName,
  finalIons,
  tds,
  gh,
  kh,
}: {
  recipeName: string;
  finalIons: Record<IonId, number>;
  tds: number;
  gh: number;
  kh: number;
}) {
  const displayRecipeName = recipeName.trim() && recipeName !== 'Custom'
    ? recipeName
    : 'Mineral recipe';
  const additionalIonIds = ACTIVE_ION_IDS.filter(id => (
    !MINERAL_LABEL_CATION_IDS.includes(id)
    && !MINERAL_LABEL_ANION_IDS.includes(id)
    && (finalIons[id] ?? 0) > 0.05
  ));
  const summary = [
    ['TDS', tds, 'ppm'],
    ['GH', gh, 'ppm'],
    ['KH', kh, 'ppm'],
  ] as const;
  const ghKhRatio = kh > 0 ? `${(gh / kh).toFixed(2)}:1` : '—';

  return (
    <aside
      className="relative overflow-hidden rounded-[1.35rem] border border-[#7cc3c5] bg-[#e9f3ee] text-[#173f49] shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)]"
      aria-label="Final mineral contribution"
    >
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 7px, rgba(13,97,112,0.12) 8px), repeating-linear-gradient(90deg, transparent 0, transparent 7px, rgba(13,97,112,0.08) 8px)',
        }}
      />
      <div className="relative p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b-2 border-[#0d6170] pb-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#47737a]">Water profile</div>
            <h2 className="font-['Georgia'] text-lg font-bold tracking-tight text-[#173f49]">Mineral analysis</h2>
          </div>
          <div className="text-right">
            <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#0d6170]">Current mix</div>
            <div className="mt-0.5 text-[9px] text-[#47737a]">final contribution</div>
          </div>
        </div>

        <div className="border-b border-[#0d6170]/35 py-3 text-center">
          <div className="mx-auto max-w-full truncate font-['Georgia'] text-2xl font-bold tracking-tight text-[#0d6170]" title={displayRecipeName}>
            {displayRecipeName}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-[9px] text-[#47737a]">
            <span className="h-px w-6 bg-[#0d6170]/35" />
            <span>per litre of finished water</span>
            <span className="h-px w-6 bg-[#0d6170]/35" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-5 border-b border-[#0d6170]/35 py-3.5">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#47737a]">
              <span>Cations</span>
              <span className="h-px flex-1 bg-[#0d6170]/20" />
            </div>
            {MINERAL_LABEL_CATION_IDS.map(id => (
              <MineralAnalysisIonRow key={id} id={id} value={finalIons[id] ?? 0} />
            ))}
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#47737a]">
              <span>Anions</span>
              <span className="h-px flex-1 bg-[#0d6170]/20" />
            </div>
            {MINERAL_LABEL_ANION_IDS.map(id => (
              <MineralAnalysisIonRow key={id} id={id} value={finalIons[id] ?? 0} />
            ))}
          </div>
        </div>

        {additionalIonIds.length > 0 && (
          <div className="border-b border-[#0d6170]/35 py-3">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#47737a]">Other modeled ions</div>
            {additionalIonIds.map(id => (
              <MineralAnalysisIonRow key={id} id={id} value={finalIons[id] ?? 0} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 border-b border-[#0d6170]/35 py-3 text-center">
          {summary.map(([label, value, unit]) => (
            <div
              key={label}
              className="rounded-lg border border-[#0d6170]/20 bg-white/40 px-2 py-2"
            >
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#47737a]">
                {label === 'TDS' ? 'Approx. TDS' : label}
              </div>
              <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-[#0d6170]">{value.toFixed(0)}</div>
              <div className="text-[8px] uppercase tracking-wider text-[#47737a]">{unit}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 text-[9px] text-[#47737a]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold uppercase tracking-[0.12em]">Estimated final TDS: <span className="font-mono text-sm tabular-nums text-[#0d6170]">{tds.toFixed(0)}</span> ppm</span>
            <span className="font-semibold uppercase tracking-[0.12em]">
              GH:KH ratio: <span className="font-mono text-sm tabular-nums text-[#0d6170]">{ghKhRatio}</span>
            </span>
          </div>
          <span className="font-mono font-bold uppercase tracking-[0.12em]">mg/L = ppm</span>
        </div>
      </div>
    </aside>
  );
}

function ConcentrateRecipeStepsModal({
  recipeHandoff,
  plan,
  volumeUnit,
  dropsPerMl,
  dropperStyle,
  dropperReferenceDropsPerMl,
  onClose,
}: {
  recipeHandoff: ConcentrateRecipeHandoff | null;
  plan: ConcentratePlanSnapshot | null;
  volumeUnit: VolumeUnit;
  dropsPerMl: number;
  dropperStyle: LotusDropperStyle;
  dropperReferenceDropsPerMl: number;
  onClose: () => void;
}) {
  const exportCardRef = useRef<HTMLDivElement>(null);
  const [isSavingJpg, setIsSavingJpg] = useState(false);
  const [saveJpgStatus, setSaveJpgStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const activeSaltRows = recipeHandoff
    ? Object.entries(recipeHandoff.salts)
        .map(([saltId, entry]) => {
          const salt = SALTS.find(item => item.id === saltId);
          if (!salt || num(entry.target) <= 0) return null;
          const form = salt.hydrationForms[entry.formIdx] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
          return {
            salt,
            form,
            target: num(entry.target),
          };
        })
        .filter((row): row is {
          salt: typeof SALTS[number];
          form: typeof SALTS[number]['hydrationForms'][number];
          target: number;
        } => row !== null)
    : [];
  const planGroups = plan?.groups ?? [];
  const isAllInOnePlan = plan?.strategy === 'all-in-one';
  const safeDropsPerMl = plan?.activeDropsPerMl && plan.activeDropsPerMl > 0
    ? plan.activeDropsPerMl
    : Number.isFinite(dropsPerMl) && dropsPerMl > 0
      ? dropsPerMl
      : 20;
  const finalWaterLiters = plan?.finalLiters && plan.finalLiters > 0
    ? plan.finalLiters
    : recipeHandoff?.finalLiters ?? 0;
  const dropperStyleLabel = dropperStyle === 'round' ? 'Round' : 'Straight';
  const saltMixGroup = (salt: typeof SALTS[number]) =>
    salt.formula.includes('SO₄') ? 0
      : salt.formula.includes('Cl') ? 1
        : salt.formula.includes('HCO₃') || salt.formula.includes('CO₃') ? 3
          : 2;
  const orderedActiveSaltRows = [...activeSaltRows].sort((a, b) =>
    saltMixGroup(a.salt) - saltMixGroup(b.salt)
    || a.salt.name.localeCompare(b.salt.name),
  );
  const activeSaltRowsById = new Map(activeSaltRows.map(row => [row.salt.id, row]));
  const stockGroupSaltRows = (group: ConcentratePlanSnapshot['groups'][number]) =>
    group.saltIds
      .map(saltId => activeSaltRowsById.get(saltId))
      .filter((row): row is NonNullable<typeof row> => row !== undefined)
      .sort((a, b) => saltMixGroup(a.salt) - saltMixGroup(b.salt) || a.salt.name.localeCompare(b.salt.name));
  const stockGroupDetails = (group: ConcentratePlanSnapshot['groups'][number]) => {
    const rows = stockGroupSaltRows(group);
    const saltMasses = rows.map(row => ({
      ...row,
      massMg: computeRecipeStockSaltMassMg(
        row.target,
        group.volumeMl,
        group.strength,
        row.form.molarMass,
        row.salt.anhydrousMass,
      ),
    }));
    const totalSaltMassG = saltMasses.reduce((total, row) => total + row.massMg, 0) / 1000;
    return {
      rows: saltMasses,
      totalSaltMassG,
      waterToAddMl: Math.max(group.volumeMl - totalSaltMassG, 0),
    };
  };
  const doseForGroup = (group: ConcentratePlanSnapshot['groups'][number], liters: number) => {
    const milliliters = group.strength > 0 ? 1000 / group.strength * liters : 0;
    return {
      milliliters,
      drops: milliliters * safeDropsPerMl,
    };
  };
  const formatStockSaltMass = (massMg: number) =>
    massMg >= 1000 ? `${(massMg / 1000).toFixed(3)} g` : `${massMg.toFixed(1)} mg`;
  const doseRows = [
    { label: 'Current final water', liters: finalWaterLiters },
    { label: '1 L reference', liters: 1 },
    { label: '1 US gallon', liters: 3.78541 },
  ]
    .filter(row => row.liters > 0)
    .map(row => ({ ...row, groups: planGroups.map(group => ({ group, dose: doseForGroup(group, row.liters) })) }));
  const handleSaveJpg = async () => {
    const source = exportCardRef.current;
    if (!source || isSavingJpg) return;
    setIsSavingJpg(true);
    setSaveJpgStatus('idle');
    let clone: HTMLDivElement | null = null;
    let imageUrl: string | null = null;
    const downloadUrl = (url: string, filename: string) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
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
        Array.from(sourceNode.children).forEach((child, index) => {
          const targetChild = targetNode.children[index];
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
      clone.style.display = 'block';
      clone.querySelectorAll<HTMLElement>('[data-concentrate-export-content]').forEach(element => {
        element.style.height = 'auto';
        element.style.maxHeight = 'none';
        element.style.overflow = 'visible';
        element.style.flex = 'none';
      });
      clone.querySelectorAll<HTMLElement>('[data-html2canvas-ignore]').forEach(element => element.remove());
      clone.querySelectorAll<HTMLElement>('*').forEach(element => {
        const computed = window.getComputedStyle(element);
        const fontSize = parseFloat(computed.fontSize);
        element.style.overflow = 'visible';
        element.style.textOverflow = 'clip';
        if (Number.isFinite(fontSize) && fontSize > 0) {
          element.style.lineHeight = `${Math.ceil(fontSize * 1.25)}px`;
        }
      });

      const width = Math.ceil(clone.getBoundingClientRect().width);
      const height = Math.ceil(Math.max(clone.scrollHeight, clone.getBoundingClientRect().height));
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(clone, {
        backgroundColor: '#0f172a',
        width,
        height,
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: width,
        windowHeight: height,
      });
      const jpg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!jpg) throw new Error('Concentrate guide JPEG could not be exported.');
      const recipeSlug = (recipeHandoff?.name || 'concentrate-recipe-steps')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'concentrate-recipe-steps';
      imageUrl = URL.createObjectURL(jpg);
      downloadUrl(imageUrl, `${recipeSlug}-steps.jpg`);
      const downloadedImageUrl = imageUrl;
      imageUrl = null;
      window.setTimeout(() => URL.revokeObjectURL(downloadedImageUrl), 1000);
      setSaveJpgStatus('saved');
      window.setTimeout(() => setSaveJpgStatus('idle'), 2200);
    } catch {
      setSaveJpgStatus('error');
    } finally {
      clone?.remove();
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      setIsSavingJpg(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-slate-900 shadow-2xl shadow-fuchsia-950/40"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="concentrate-recipe-steps-title"
        ref={exportCardRef}
        data-concentrate-export-card
      >
        <div className="flex items-start justify-between gap-3 border-b border-fuchsia-400/20 bg-gradient-to-r from-fuchsia-500/15 via-slate-900/60 to-violet-500/10 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-200">
              <BottleWine className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="concentrate-recipe-steps-title" className="mt-1 text-base font-semibold text-white">
                {recipeHandoff ? recipeHandoff.name : 'Concentrate steps'}
              </h2>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2" data-html2canvas-ignore="true">
            <button
              type="button"
              onClick={handleSaveJpg}
              disabled={isSavingJpg}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${
                saveJpgStatus === 'error'
                  ? 'border-rose-300/35 bg-rose-400/10 text-rose-200'
                  : saveJpgStatus === 'saved'
                  ? 'border-emerald-300/35 bg-emerald-400/10 text-emerald-200'
                  : 'border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-100 hover:border-fuchsia-200/60 hover:bg-fuchsia-400/20'
              } disabled:cursor-wait disabled:opacity-70`}
              aria-label="Save concentrate recipe steps as JPG"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {isSavingJpg ? 'Saving…' : saveJpgStatus === 'saved' ? 'Saved JPG' : saveJpgStatus === 'error' ? 'Try again' : 'Save JPG'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close concentrate recipe steps"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto p-4 sm:p-5" data-concentrate-export-content>
          {recipeHandoff && plan ? (
            <>
              <section className="rounded-xl border border-slate-700/60 bg-slate-950/25 p-3.5">
                <div className="text-xs font-semibold text-slate-100">Plan</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-violet-300/20 bg-violet-400/[0.08] px-3 py-2.5">
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-violet-200/70">Plan</div>
                    <div className="mt-1 text-sm font-semibold text-violet-100">{plan.strategyLabel}</div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {planGroups.length} prepared {planGroups.length === 1 ? 'bottle' : 'bottles'} · selected hydration forms retained
                    </div>
                  </div>
                  <div className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-400/[0.08] px-3 py-2.5">
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-fuchsia-200/70">
                      {isAllInOnePlan ? 'Concentrate strength' : 'Bottle strengths'}
                    </div>
                    <div className="mt-1 space-y-0.5 text-sm font-semibold tabular-nums text-fuchsia-100">
                      {planGroups.map(group => (
                        <div key={group.id}>{group.name.replace(/ Concentrate$/, '')} ×{group.strength}</div>
                      ))}
                    </div>
                    {isAllInOnePlan && plan.maxSafeStrength != null && (
                      <div className={`mt-1 text-[10px] tabular-nums ${plan.strength > plan.maxSafeStrength ? 'text-rose-300' : 'text-emerald-300/80'}`}>
                        Max ×{plan.maxSafeStrength} · whole-drop rule included
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-2 rounded-lg border border-sky-300/20 bg-sky-400/[0.06] px-3 py-2.5">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-sky-200/70">Bottle volumes</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {planGroups.map(group => (
                      <div key={group.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-slate-900/50 px-3 py-2">
                        <div className="min-w-0">
                          <div className="truncate text-[11px] font-semibold text-slate-200">{group.name}</div>
                          <div className="mt-0.5 text-[9px] text-slate-500">stock strength ×{group.strength}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold tabular-nums text-sky-100">{group.volumeMl.toFixed(0)} mL</div>
                          <div className="text-[9px] text-sky-200/65">per bottle</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-700/60 bg-slate-950/25 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-100">Prepare each bottle</div>
                    <div className="mt-1 text-[10px] leading-relaxed text-slate-400">
                      Weigh the hydrated salt amounts below, add the listed water, and dissolve each stock completely. Keep bottles separate whenever the selected plan calls for it.
                    </div>
                  </div>
                  <div className="shrink-0 rounded-md border border-fuchsia-300/20 bg-fuchsia-400/[0.08] px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-fuchsia-200/75">
                    {orderedActiveSaltRows.length} salts
                  </div>
                </div>
                <div className="mt-3 space-y-3">
                  {planGroups.map(group => {
                    const details = stockGroupDetails(group);
                    return (
                      <article key={group.id} className="rounded-xl border border-white/[0.08] bg-slate-900/35 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-semibold text-fuchsia-100">{group.name}</div>
                            <div className="mt-0.5 text-[10px] text-slate-400">
                              Make {group.volumeMl.toFixed(0)} mL at ×{group.strength}.
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-right">
                            <div className="rounded-md border border-fuchsia-300/20 bg-fuchsia-400/[0.08] px-2 py-1">
                              <div className="text-[8px] font-semibold uppercase tracking-wider text-fuchsia-200/70">Salt to weigh</div>
                              <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-fuchsia-100">{details.totalSaltMassG >= 1 ? `${details.totalSaltMassG.toFixed(2)} g` : `${(details.totalSaltMassG * 1000).toFixed(1)} mg`}</div>
                            </div>
                            <div className="rounded-md border border-sky-300/20 bg-sky-400/[0.08] px-2 py-1">
                              <div className="text-[8px] font-semibold uppercase tracking-wider text-sky-200/70">Water to add</div>
                              <div className="mt-0.5 font-mono text-xs font-bold tabular-nums text-sky-100">{details.waterToAddMl.toFixed(1)} mL</div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 space-y-2">
                          {details.rows.map((row, index) => {
                            const isCarbonate = saltMixGroup(row.salt) === 3;
                            return (
                               <div key={row.salt.id} className={`rounded-lg border px-3 py-2.5 ${
                                isCarbonate
                                  ? 'border-amber-300/35 bg-amber-500/[0.08]'
                                  : 'border-white/[0.08] bg-slate-900/50'
                               }`} style={saltVisualStyle(row.salt)}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-start gap-2.5">
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                      isCarbonate
                                        ? 'bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/25'
                                        : 'bg-violet-400/15 text-violet-100 ring-1 ring-violet-300/20'
                                    }`}>
                                      {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                       <div className="text-[11px] font-semibold text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(row.salt).primary } as CSSProperties}>{row.salt.name}</div>
                                       <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                                         <span>{row.form.label} ·</span>
                                         <SaltIonBadges salt={row.salt} />
                                       </div>
                                      {isCarbonate && (
                                        <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                                          Add last — reduce precipitation risk
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="shrink-0 rounded-md border border-fuchsia-300/25 bg-fuchsia-400/10 px-2 py-1 text-right">
                                    <div className="text-[9px] font-semibold uppercase tracking-wider text-fuchsia-200/70">Weigh</div>
                                    <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-fuchsia-100">{formatStockSaltMass(row.massMg)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-xl border border-amber-400/25 bg-amber-500/[0.07] p-3.5">
              <div className="text-xs font-semibold text-amber-100">
                {recipeHandoff ? 'Loading…' : 'No recipe'}
              </div>
            </section>
          )}

          <section className="rounded-xl border border-violet-400/25 bg-violet-500/[0.07] p-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-100">
              <Droplet className="h-4 w-4 text-violet-300" aria-hidden="true" />
              Dose
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-300/20 bg-violet-400/[0.08] px-3 py-2">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-wider text-violet-200/70">Dropper style</div>
                <div className="mt-1 text-sm font-semibold text-violet-100">{dropperStyleLabel}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-violet-200/70">Reference</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-violet-100">{dropperReferenceDropsPerMl.toFixed(1)} drops/mL</div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              Dose drops below use the current calibrated setting of {safeDropsPerMl.toFixed(1)} drops/mL.
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {doseRows.map(row => (
                <article key={row.label} className="rounded-xl border border-violet-300/20 bg-slate-950/30 px-3.5 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-100">{row.label}</div>
                    <div className="text-[9px] tabular-nums text-slate-500">
                      {formatVolumeValue(row.liters, volumeUnit)} {volumeUnitShortLabel(volumeUnit)}
                    </div>
                  </div>
                  {recipeHandoff && plan && planGroups.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {row.groups.map(({ group, dose }) => (
                        <div key={group.id} className="flex items-center justify-between gap-3 rounded-lg border border-violet-300/15 bg-violet-400/10 px-2.5 py-2">
                          <div className="min-w-0">
                            <div className="text-[10px] font-semibold text-violet-100">{group.name}</div>
                            <div className="mt-0.5 text-[9px] text-slate-400">Dose this bottle · ×{group.strength}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="text-sm font-semibold tabular-nums text-violet-100">{dose.milliliters.toFixed(2)} mL</div>
                            <div className="text-[10px] font-semibold tabular-nums text-fuchsia-200">
                              {dose.drops < 1 ? '<1' : Math.round(dose.drops)} drops
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-3 text-[11px] text-slate-500">
                      No recipe.
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function BrewerRecipeStepsModal({
  recipeName,
  saltTargets,
  recipeRows,
  liters,
  volumeUnit,
  concentrateOn,
  allInOneConcentrate,
  concentrateLiters,
  concentrateStrength,
  baseWaters,
  additionWaters,
  baseWaterScale,
  batchMl,
  suggestedSaltTargets,
  nerdLevel,
  tdsTarget,
  dropsPerMl,
  dosingMethod,
  onClose,
}: {
  recipeName: string;
  saltTargets: Record<string, number>;
  recipeRows: SaltRow[];
  liters: number;
  volumeUnit: VolumeUnit;
  concentrateOn: boolean;
  allInOneConcentrate: boolean;
  concentrateLiters: number;
  concentrateStrength: number;
  baseWaters: MineralWaterEntry[];
  additionWaters: MineralWaterEntry[];
  baseWaterScale: number;
  batchMl: number;
  suggestedSaltTargets: Record<string, number>;
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
  const configuredAdditionWaters = additionWaters
    .map(water => ({
      ...water,
      volume: num(water.volumeMl) * baseWaterScale,
    }))
    .filter(water => water.volume > 0);
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
    ? `${formatVolumeValue(concentrateLiters || 0, volumeUnit)} ${volumeUnitShortLabel(volumeUnit)} stock`
    : `${formatVolumeValue(liters || 1, volumeUnit)} ${volumeUnitShortLabel(volumeUnit)} water`;
  const formatWaterVolume = (volumeMl: number) =>
    volumeMl >= 1000 ? `${(volumeMl / 1000).toFixed(2)} L` : `${volumeMl.toFixed(0)} mL`;
  const concentrateWaterVolume = concentrateLiters > 0
    ? formatWaterVolume(concentrateLiters * 1000)
    : 'the selected amount of water';
  const remainingWaterMl = Math.max(
    batchMl
      - configuredBaseWaters.reduce((sum, water) => sum + water.volume, 0)
      - configuredAdditionWaters.reduce((sum, water) => sum + water.volume, 0),
    0,
  );
  // Prefer the active recipe dose so the preparation card reflects what the
  // user actually selected. Fall back to the suggested dose for salts supplied
  // by the current water or matching route.
  const stepSaltTargets = mergeRecipeStepTargets(saltTargets, suggestedSaltTargets);
  const stepSalts = SALTS.filter(salt => (stepSaltTargets[salt.id] ?? 0) > 0);
  const dosedStepSaltCount = stepSalts.filter(salt => (stepSaltTargets[salt.id] ?? 0) > 0).length;
  const sulfateSalts = stepSalts.filter(salt => salt.formula.includes('SO₄'));
  const chlorideSalts = stepSalts.filter(salt => salt.formula.includes('Cl') && !salt.formula.includes('SO₄'));
  const alkalinitySalts = stepSalts.filter(salt => salt.formula.includes('HCO₃') || salt.formula.includes('CO₃'));
  const otherSalts = stepSalts.filter(salt =>
    !salt.formula.includes('SO₄')
    && !salt.formula.includes('Cl')
    && !salt.formula.includes('HCO₃')
    && !salt.formula.includes('CO₃'),
  );
  const orderedRecipeSalts = allInOneConcentrate
    ? [...sulfateSalts, ...chlorideSalts, ...otherSalts, ...alkalinitySalts]
    : [...sulfateSalts, ...chlorideSalts, ...alkalinitySalts, ...otherSalts];
  const finalProfileWaterIons = computeWatermancerBottledIons(
    [...configuredBaseWaters, ...configuredAdditionWaters].map(water => ({
      ...water,
      volumeMl: String(water.volume),
    })),
    batchMl,
  );
  const finalProfileIons = computeIonTotals(stepSaltTargets, finalProfileWaterIons, 1);
  const finalProfileTds = Object.values(finalProfileIons).reduce((total, ppm) => total + ppm, 0);
  const finalProfileGh = computeGH(finalProfileIons);
  const finalProfileKh = computeKH(finalProfileIons);
  const saltGroup = (salt: typeof SALTS[number]) =>
    salt.formula.includes('SO₄') ? 'Sulfate'
      : salt.formula.includes('Cl') ? 'Chloride'
        : salt.formula.includes('HCO₃') || salt.formula.includes('CO₃') ? 'Bicarbonate / carbonate'
          : 'Other mineral';
  const useMixingVessel = !concentrateOn && batchMl > 1000 && dosedStepSaltCount > 0;
  const mixingVesselMl = useMixingVessel ? Math.min(500, batchMl) : batchMl;
  const concentrateDoseMlPerLiter = concentrateOn && concentrateStrength > 0
    ? 1000 / concentrateStrength
    : 0;
  const concentrateDoseMlPerGallon = concentrateDoseMlPerLiter * US_GALLON_IN_LITERS;
  const concentrateDropsPerLiter = concentrateDoseMlPerLiter > 0 && dropsPerMl > 0
    ? Math.max(1, Math.round(concentrateDoseMlPerLiter * dropsPerMl))
    : 0;
  const concentrateDropsPerGallon = concentrateDropsPerLiter > 0
    ? Math.max(1, Math.round(concentrateDoseMlPerGallon * dropsPerMl))
    : 0;
  const shareCardModel = createRecipeShareCardModel({
    recipeName: recipeName !== 'Custom' ? recipeName : 'Mineral recipe',
    batchLabel: `${formatVolumeValue(liters || 1, volumeUnit)} ${volumeUnitShortLabel(volumeUnit)} batch · ${concentrateOn ? 'Concentrate dosing' : 'Weighed salts'}`,
    waterSteps: [
      ...(remainingWaterMl > 0
        ? [{ label: 'RO / distilled water', name: 'Add purified water', amount: formatWaterVolume(remainingWaterMl) }]
        : [{ label: 'Prepared water', name: 'Prepare the selected water', amount: volumeLabel }]),
      ...configuredBaseWaters.map(water => ({
        label: 'Base water',
        name: water.name || 'Unnamed base water',
        amount: formatWaterVolume(water.volume),
      })),
      ...configuredAdditionWaters.map(water => ({
        label: 'Addition water',
        name: water.name || 'Unnamed addition water',
        amount: formatWaterVolume(water.volume),
      })),
    ],
    saltTitle: allInOneConcentrate ? '02 · Mix the all-in-one concentrate' : '02 · Add the minerals in order',
    saltIntro: allInOneConcentrate
      ? `Start with ${concentrateWaterVolume} for the concentrate. Add one salt at a time and stir until fully dissolved before adding the next.`
      : 'Add one salt at a time. Stir until fully dissolved before adding the next.',
    saltSteps: orderedRecipeSalts.map((salt, index) => {
      const saltIndex = SALTS.findIndex(item => item.id === salt.id);
      const formIndex = saltIndex >= 0
        ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
        : salt.defaultFormIdx ?? 0;
      const form = salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
      const isAlkalinitySalt = salt.formula.includes('HCO₃') || salt.formula.includes('CO₃');
      return {
        name: `${index + 1}. ${nerdLevel === 'brewer' ? simpleSaltNames[salt.id] ?? salt.name : salt.name}`,
        formula: salt.formula,
        form: nerdLevel === 'brewer' ? saltGroup(salt) : form.label,
        amount: amountLabel(salt, stepSaltTargets),
        contributionPpm: computeSaltIonPpmTotal(salt.id, stepSaltTargets[salt.id] ?? 0),
        note: allInOneConcentrate && isAlkalinitySalt
          ? 'Last · add only after the other salts are clear'
          : undefined,
      };
    }),
    mixingNote: useMixingVessel
      ? `Reserve ${formatWaterVolume(mixingVesselMl)} of the prepared water for the salt concentrate. Dissolve the salts completely, then add the concentrate to the remaining water, rinse the vessel into the batch, and stir thoroughly.`
      : undefined,
    finalStep: 'Check that the water is clear and all minerals are fully dissolved. Proceed with your brew method and adjust extraction to taste.',
    tdsTarget,
    analysis: {
      ions: [
        ...(['calcium', 'magnesium', 'sodium', 'potassium'] as IonId[]).map(id => ({
          id,
          name: ION_MAP[id].name,
          formula: ION_MAP[id].formula,
          value: finalProfileIons[id] ?? 0,
          category: 'Cations' as const,
        })),
        ...(['bicarbonate', 'chloride', 'sulfate'] as IonId[]).map(id => ({
          id,
          name: ION_MAP[id].name,
          formula: ION_MAP[id].formula,
          value: finalProfileIons[id] ?? 0,
          category: 'Anions' as const,
        })),
        ...ACTIVE_ION_IDS
          .filter(id => !['calcium', 'magnesium', 'sodium', 'potassium', 'bicarbonate', 'chloride', 'sulfate'].includes(id))
          .filter(id => (finalProfileIons[id] ?? 0) > 0.05)
          .map(id => ({
            id,
            name: ION_MAP[id].name,
            formula: ION_MAP[id].formula,
            value: finalProfileIons[id] ?? 0,
            category: 'Other modeled ions' as const,
          })),
      ],
      tds: finalProfileTds,
      gh: finalProfileGh,
      kh: finalProfileKh,
    },
    concentrateGuide: concentrateOn && concentrateDoseMlPerLiter > 0 && concentrateLiters > 0
      ? {
        stockLabel: `Stock · ${formatWaterVolume(concentrateLiters * 1000)}`,
        doses: [
          { label: '1 L', milliliters: concentrateDoseMlPerLiter, drops: concentrateDropsPerLiter },
          { label: '1 US gal', milliliters: concentrateDoseMlPerGallon, drops: concentrateDropsPerGallon },
        ],
        dropsPerMl,
      }
      : undefined,
  });
  const waterStepStyles = [
    'border-cyan-300/35 bg-cyan-400/[0.08] text-cyan-100',
    'border-sky-300/35 bg-sky-400/[0.08] text-sky-100',
    'border-teal-300/35 bg-teal-400/[0.08] text-teal-100',
    'border-blue-300/35 bg-blue-400/[0.08] text-blue-100',
    'border-indigo-300/35 bg-indigo-400/[0.08] text-indigo-100',
    'border-emerald-300/35 bg-emerald-400/[0.08] text-emerald-100',
  ];
  const waterStepValueStyles = [
    'border-cyan-300/30 bg-cyan-400/15 text-cyan-100',
    'border-sky-300/30 bg-sky-400/15 text-sky-100',
    'border-teal-300/30 bg-teal-400/15 text-teal-100',
    'border-blue-300/30 bg-blue-400/15 text-blue-100',
    'border-indigo-300/30 bg-indigo-400/15 text-indigo-100',
    'border-emerald-300/30 bg-emerald-400/15 text-emerald-100',
  ];
  const saltStepStyles = [
    'border-violet-300/35 bg-violet-400/[0.08] text-violet-100',
    'border-fuchsia-300/35 bg-fuchsia-400/[0.08] text-fuchsia-100',
    'border-amber-300/35 bg-amber-400/[0.08] text-amber-100',
    'border-rose-300/35 bg-rose-400/[0.08] text-rose-100',
    'border-lime-300/35 bg-lime-400/[0.08] text-lime-100',
    'border-orange-300/35 bg-orange-400/[0.08] text-orange-100',
  ];
  const saltStepValueStyles = [
    'border-violet-300/30 bg-violet-400/15 text-violet-100',
    'border-fuchsia-300/30 bg-fuchsia-400/15 text-fuchsia-100',
    'border-amber-300/30 bg-amber-400/15 text-amber-100',
    'border-rose-300/30 bg-rose-400/15 text-rose-100',
    'border-lime-300/30 bg-lime-400/15 text-lime-100',
    'border-orange-300/30 bg-orange-400/15 text-orange-100',
  ];
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
    if (isSavingImage) return;

    setIsSavingImage(true);
    setSaveImageError(false);
    const downloadBlob = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    };
    try {
      const rendered = buildRecipeShareCardSvg(shareCardModel);
      const blob = await rasterizeRecipeShareCard(rendered.svg, rendered.width, rendered.height, 'png', 2);
      downloadBlob(blob, 'coffee-water-recipe.png');
    } catch {
      setSaveImageError(true);
    } finally {
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
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-sky-400/25 bg-slate-800 shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 justify-end border-b border-slate-700/50 bg-gradient-to-r from-sky-500/15 to-emerald-500/10 px-4 py-2.5 sm:px-5">
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-slate-100" aria-label="Close recipe steps">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Step-by-step</div>
            <div className="text-[10px] text-slate-500">{orderedRecipeSalts.length + (useMixingVessel ? 3 : 2)} actions</div>
          </div>
           <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.72fr)]">
           <div className="min-w-0">
          <ol className="space-y-2.5">
            <li className="flex gap-3 rounded-xl border border-sky-400/15 bg-slate-900/35 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-xs font-bold text-sky-100 ring-1 ring-sky-300/20">1</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200">Prepare the water</div>
                {remainingWaterMl > 0 ? (
                  <div className={`mt-3 flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${waterStepStyles[0]}`}>
                    <div className="min-w-0">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-70">RO / distilled water</div>
                      <div className="mt-0.5 text-xs font-semibold sm:text-sm">Add purified water</div>
                    </div>
                    <span className={`shrink-0 rounded-md border px-2 py-1 font-mono text-base font-bold leading-none tabular-nums sm:text-lg ${waterStepValueStyles[0]}`}>
                      {formatWaterVolume(remainingWaterMl)}
                    </span>
                  </div>
                ) : (
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    Prepare {volumeLabel} of water.
                  </div>
                )}
                <div className="mt-2 space-y-1.5">
                  {configuredBaseWaters.map((water, index) => {
                    const styleIndex = (index + 1) % waterStepStyles.length;
                    return (
                    <div
                      key={`step-base-${water.id}`}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${waterStepStyles[styleIndex]}`}
                    >
                      <div className="min-w-0">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-70">Base water</div>
                        <div className="mt-0.5 truncate text-xs font-semibold sm:text-sm">{water.name || 'Unnamed base water'}</div>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-1 font-mono text-base font-bold leading-none tabular-nums sm:text-lg ${waterStepValueStyles[styleIndex]}`}>
                        {formatWaterVolume(water.volume)}
                      </span>
                    </div>
                    );
                  })}
                  {configuredAdditionWaters.map((water, index) => {
                    const styleIndex = (configuredBaseWaters.length + index + 1) % waterStepStyles.length;
                    return (
                    <div
                      key={`step-addition-${water.id}`}
                      className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${waterStepStyles[styleIndex]}`}
                    >
                      <div className="min-w-0">
                        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] opacity-70">Addition water</div>
                        <div className="mt-0.5 truncate text-xs font-semibold sm:text-sm">{water.name || 'Unnamed addition water'}</div>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-1 font-mono text-base font-bold leading-none tabular-nums sm:text-lg ${waterStepValueStyles[styleIndex]}`}>
                        {formatWaterVolume(water.volume)}
                      </span>
                    </div>
                    );
                  })}
                </div>
              </div>
            </li>
            {orderedRecipeSalts.length > 0 && (
             <li className={`flex gap-3 rounded-xl p-3 ${
               allInOneConcentrate
                 ? 'border-amber-300/55 bg-amber-500/[0.12] ring-1 ring-amber-200/30 shadow-[0_0_18px_-6px_rgba(251,191,36,0.65)]'
                 : 'border-sky-400/15 bg-slate-900/35'
             }`}>
               <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${
                 allInOneConcentrate
                   ? 'bg-amber-400/25 text-amber-50 ring-amber-200/35'
                   : 'bg-sky-400/20 text-sky-100 ring-sky-300/20'
               }`}>2</span>
                <div className="min-w-0">
                  <div className={`text-sm font-semibold ${allInOneConcentrate ? 'text-amber-50' : 'text-slate-200'}`}>
                    {allInOneConcentrate ? 'Mix the all-in-one concentrate in order' : 'Add the minerals in order'}
                  </div>
                  <div className={`mt-0.5 text-xs leading-relaxed ${allInOneConcentrate ? 'text-amber-100/80' : 'text-slate-400'}`}>
                    {allInOneConcentrate
                      ? `Start with ${concentrateWaterVolume} for the concentrate. Add one salt at a time and stir until fully dissolved before adding the next.`
                      : 'Add one salt at a time. Stir until fully dissolved before adding the next.'}
                  </div>
                  {allInOneConcentrate && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200/35 bg-amber-950/35 px-3 py-2.5 text-[11px] leading-relaxed text-amber-50">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                      <div>
                        <strong>Mixing order matters.</strong> Keep the solution moving, dissolve each salt completely, and add the final water only after all salts are clear. Bicarbonate/carbonate salts come last to reduce local precipitation risk.
                      </div>
                    </div>
                  )}
                  <div className="mt-2 space-y-2">
                    {orderedRecipeSalts.map((salt, index) => {
                      const saltIndex = SALTS.findIndex(item => item.id === salt.id);
                      const formIndex = saltIndex >= 0
                        ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
                        : salt.defaultFormIdx ?? 0;
                      const form = salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
                       const saltContributionPpm = computeSaltIonPpmTotal(
                         salt.id,
                         stepSaltTargets[salt.id] ?? 0,
                       );
                       const isAlkalinitySalt = salt.formula.includes('HCO₃') || salt.formula.includes('CO₃');
                       const saltStyle = allInOneConcentrate && isAlkalinitySalt
                         ? 'border-rose-300/60 bg-rose-500/[0.14] text-rose-50 ring-1 ring-rose-200/30'
                         : saltStepStyles[index % saltStepStyles.length];
                       const saltValueStyle = allInOneConcentrate && isAlkalinitySalt
                         ? 'border-rose-200/40 bg-rose-400/20 text-rose-50'
                         : saltStepValueStyles[index % saltStepValueStyles.length];
                      return (
                          <div key={`step-salt-${salt.id}`} className={`rounded-lg border px-2 py-1.5 ${saltStyle}`} style={saltVisualStyle(salt)}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div
                                  className="text-xs font-semibold text-[color:var(--salt-primary)] sm:text-sm"
                                  style={{ '--salt-primary': getSaltColorTokens(salt).primary } as CSSProperties}
                                >
                                {index + 1}. {nerdLevel === 'brewer' ? simpleSaltNames[salt.id] ?? salt.name : salt.name}
                              </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-300/65">
                                 {nerdLevel === 'brewer' ? (
                                   <><span>{saltGroup(salt)} ·</span><SaltIonBadges salt={salt} /></>
                                 ) : (
                                   <><span>{form.label} ·</span><SaltIonBadges salt={salt} /></>
                                 )}
                              </div>
                               {allInOneConcentrate && isAlkalinitySalt && (
                                 <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-rose-100">
                                   Last — add only after the other salts are clear
                                 </div>
                               )}
                            </div>
                              <div className="shrink-0 text-right">
                                <span className={`inline-block rounded-md border px-2 py-1 font-mono text-base font-bold leading-none tabular-nums sm:text-lg ${saltValueStyle}`}>
                                  {amountLabel(salt, stepSaltTargets)}
                                </span>
                                {saltContributionPpm > 0 && (
                                  <div className="mt-1 text-[10px] font-medium tabular-nums text-cyan-200/80">
                                    {saltContributionPpm.toFixed(1)} ppm total
                                  </div>
                                )}
                              </div>
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
                  <div className="text-sm font-medium text-slate-200">Combine the salt concentrate</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    Reserve {formatWaterVolume(mixingVesselMl)} of the prepared water for the salt concentrate. Dissolve the salts completely, then add the concentrate to the remaining water, rinse the vessel into the batch, and stir thoroughly.
                  </div>
                </div>
              </li>
            )}
            <li className="flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/20">{useMixingVessel ? 4 : orderedRecipeSalts.length > 0 ? 3 : 2}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-200">Verify and brew</div>
                <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  Check for approximately <span className="inline-flex rounded-md border border-emerald-300/45 bg-emerald-400/20 px-1.5 py-0.5 font-mono font-bold tabular-nums text-emerald-100">{tdsTarget.toFixed(0)} ppm TDS</span>. The water should be clear and all minerals fully dissolved. Proceed with your brew method and adjust extraction to taste.
                </div>
              </div>
            </li>
          </ol>
           {saveImageError && (
             <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[10px] leading-relaxed text-amber-100" role="status">
                Couldn’t create the share-card image in this browser. Try again, or use the recipe steps on screen.
             </p>
           )}
           <p className="border-t border-slate-700/50 pt-3 text-[10px] leading-relaxed text-slate-500">
            Small amounts are difficult to weigh accurately. For better consistency, multiply the recipe for a larger batch or use a concentrate.
          </p>
           </div>
           <div className="min-w-0">
             <MineralAnalysisLabel
               recipeName={recipeName}
               finalIons={finalProfileIons}
               tds={finalProfileTds}
               gh={finalProfileGh}
               kh={finalProfileKh}
             />
             <div className="mt-3">
               <button
                 type="button"
                 onClick={handleSaveImage}
                 disabled={isSavingImage}
                 className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-200/70 bg-sky-400 px-4 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:cursor-wait disabled:opacity-60"
                  title="Download a clean share-card image of this recipe"
               >
                 <Download className="h-5 w-5" aria-hidden="true" />
                  <span>{isSavingImage ? 'Saving share card…' : 'Save Recipe Image'}</span>
               </button>
               <p className="mt-1.5 text-center text-[10px] text-slate-500">
                  Download a clean PNG share card with the recipe steps and mineral analysis.
               </p>
             </div>
           {concentrateOn && concentrateDoseMlPerLiter > 0 && concentrateLiters > 0 && (
             <aside
               className="relative mt-3 overflow-hidden rounded-[1.35rem] border border-[#7cc3c5] bg-[#e9f3ee] text-[#173f49] shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)]"
               aria-label="Concentrate dosing reference"
             >
               <div
                 className="absolute inset-0 opacity-30"
                 style={{
                   backgroundImage: 'repeating-linear-gradient(0deg, transparent 0, transparent 7px, rgba(13,97,112,0.12) 8px), repeating-linear-gradient(90deg, transparent 0, transparent 7px, rgba(13,97,112,0.08) 8px)',
                 }}
               />
               <div className="relative p-4 sm:p-5">
                 <div className="flex items-center justify-between gap-3 border-b-2 border-[#0d6170] pb-3">
                   <div>
                     <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#47737a]">Concentrate guide</div>
                     <h2 className="font-['Georgia'] text-lg font-bold tracking-tight text-[#173f49]">Dosing reference</h2>
                   </div>
                   <div className="text-right">
                     <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#0d6170]">Stock</div>
                     <div className="mt-0.5 text-[9px] text-[#47737a]">{formatWaterVolume(concentrateLiters * 1000)}</div>
                   </div>
                 </div>
                 <div className="mt-3 grid grid-cols-2 gap-2">
                 {[
                   {
                     label: '1 L',
                     milliliters: concentrateDoseMlPerLiter,
                     drops: concentrateDropsPerLiter,
                   },
                   {
                     label: '1 US gal',
                     milliliters: concentrateDoseMlPerGallon,
                     drops: concentrateDropsPerGallon,
                   },
                  ].map(dose => (
                    <div key={dose.label} className="rounded-lg border border-[#0d6170]/20 bg-white/40 px-2.5 py-2.5">
                     <div className="font-bold uppercase tracking-[0.16em] text-[#47737a] text-[18px]">{dose.label}</div>
                     <div className="mt-1.5 font-mono text-base font-bold tabular-nums text-[#0d6170]">{dose.milliliters.toFixed(1)} mL</div>
                     <div className="mt-0.5 flex items-center gap-1 text-[#47737a] text-[16px]">
                       <Droplet className="h-3.5 w-3.5 shrink-0 text-[#0d6170]" aria-hidden="true" />
                       <span>≈ {dose.drops.toLocaleString()} drops</span>
                     </div>
                      </div>
                  ))}
                 </div>
                 <div className="mt-3 border-t border-[#0d6170]/35 pt-3 text-[9px] leading-relaxed text-[#47737a]">
                   Drops use your calibrated setting of <span className="font-mono font-bold text-[#0d6170]">{dropsPerMl.toFixed(1)}</span> drops per mL.
                 </div>
               </div>
             </aside>
           )}
           </div>
           </div>
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
  const currentSalt = currentStep ? SALTS.find(salt => salt.id === currentStep.id) : undefined;
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
             <h1
               className="mt-3 text-5xl font-black tracking-tight text-[color:var(--salt-primary)] sm:mt-4 sm:text-8xl"
               style={currentSalt ? { '--salt-primary': getSaltColorTokens(currentSalt).primary } as CSSProperties : undefined}
             >
               {currentStep.label}
             </h1>
             {currentSalt && (
               <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-400">
                 <span className="font-semibold text-[color:var(--salt-primary)]" style={{ '--salt-primary': getSaltColorTokens(currentSalt).primary } as CSSProperties}>{currentSalt.formula}</span>
                 <span aria-hidden="true">·</span>
                 <SaltIonBadges salt={currentSalt} className="text-sm" />
               </div>
             )}
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

const BrewerFlavorPanel = memo(function BrewerFlavorPanel({
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
              <BrewerFlavorBar
                value={flavor[key]}
                label={label}
                onChange={value => onChange({ ...flavor, [key]: value })}
              />
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
});

function BrewerFlavorBar({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const draggingRef = useRef(false);

  const setFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextValue = Math.round(((event.clientX - rect.left) / rect.width) * 100);
    onChange(Math.max(0, Math.min(100, nextValue)));
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value} out of 100`}
      onPointerDown={event => {
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setFromPointer(event);
      }}
      onPointerMove={event => {
        if (draggingRef.current) setFromPointer(event);
      }}
      onPointerUp={event => {
        draggingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onPointerCancel={event => {
        draggingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onKeyDown={event => {
        const amount = event.shiftKey ? 10 : 5;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          onChange(Math.max(0, value - amount));
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          onChange(Math.min(100, value + amount));
        } else if (event.key === 'Home') {
          event.preventDefault();
          onChange(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          onChange(100);
        }
      }}
      className="group mt-2 cursor-grab select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 active:cursor-grabbing"
      style={{ touchAction: 'none' }}
      title={`Click or drag to set ${label}`}
    >
      <div className="relative h-2 overflow-hidden rounded-full bg-slate-700/70 transition group-hover:bg-slate-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500/70 to-cyan-300 transition-[width]"
          style={{ width: `${value}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-100 bg-sky-300 shadow-[0_0_8px_rgb(56_189_248_/_0.7)] transition-[left]"
          style={{ left: `${value}%` }}
        />
      </div>
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
  const pointerFrameRef = useRef<number | null>(null);
  const pendingPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
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

  const flushPendingPointerUpdate = () => {
    const position = pendingPointerPositionRef.current;
    pendingPointerPositionRef.current = null;
    if (position) onChange(flavorFromPoint(position.x, position.y));
  };

  const updateFromPointer = (
    event: React.PointerEvent<SVGSVGElement>,
    immediate = false,
  ) => {
    const position = getPointerPosition(event);
    if (!position) return;
    pendingPointerPositionRef.current = position;
    if (immediate) {
      if (pointerFrameRef.current !== null) {
        cancelAnimationFrame(pointerFrameRef.current);
        pointerFrameRef.current = null;
      }
      flushPendingPointerUpdate();
      return;
    }
    if (pointerFrameRef.current !== null) return;
    pointerFrameRef.current = requestAnimationFrame(() => {
      pointerFrameRef.current = null;
      flushPendingPointerUpdate();
    });
  };

  useEffect(() => () => {
    if (pointerFrameRef.current !== null) cancelAnimationFrame(pointerFrameRef.current);
  }, []);

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
    <div className={`mt-4 rounded-xl border px-2 py-3 transition sm:px-4 ${
      isDragging ? 'border-sky-300/45 bg-sky-500/[0.05]' : 'border-slate-700/50 bg-slate-900/35'
    }`}>
      <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {isDragging ? 'Release to lock in this balance' : 'Drag the star to shape your cup'}
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
             setIsDragging(true);
             event.currentTarget.setPointerCapture(event.pointerId);
              updateFromPointer(event, true);
           }}
           onPointerMove={event => {
             if (draggingRef.current) updateFromPointer(event);
           }}
           onPointerUp={event => {
              updateFromPointer(event, true);
             draggingRef.current = false;
             setIsDragging(false);
             if (event.currentTarget.hasPointerCapture(event.pointerId)) {
               event.currentTarget.releasePointerCapture(event.pointerId);
             }
           }}
            onPointerCancel={() => {
              if (pointerFrameRef.current !== null) {
                cancelAnimationFrame(pointerFrameRef.current);
                pointerFrameRef.current = null;
              }
              flushPendingPointerUpdate();
              draggingRef.current = false;
              setIsDragging(false);
            }}
           onPointerEnter={() => setIsHovering(true)}
           onPointerLeave={() => setIsHovering(false)}
           style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
        >
          <defs>
            <linearGradient id="brewer-pyramid-fill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.04" />
            </linearGradient>
          </defs>
          <polygon
            points={`${apex.x},${apex.y} ${left.x},${left.y} ${right.x},${right.y}`}
            fill="url(#brewer-pyramid-fill)"
            stroke={isDragging || isHovering ? 'rgb(125 211 252 / 0.9)' : 'rgb(125 211 252 / 0.65)'}
            strokeWidth="2"
            style={{ transition: 'stroke 160ms ease' }}
          />
          {[apex, left, right].map((vertex, index) => (
            <circle key={index} cx={vertex.x} cy={vertex.y} r="3.5" fill="rgb(125 211 252 / 0.75)" />
          ))}
          <text x={apex.x} y="22" textAnchor="middle" fill="rgb(226 232 240)" fontSize="14" fontWeight="600">Brightness / Fruit Acidity</text>
          <text x="64" y="318" textAnchor="start" fill="rgb(226 232 240)" fontSize="14" fontWeight="600">Sweetness &amp; Clarity</text>
          <text x="576" y="318" textAnchor="end" fill="rgb(226 232 240)" fontSize="14" fontWeight="600">Body &amp; Mouthfeel</text>
          <circle
            cx={point.x}
            cy={point.y}
            r={isDragging ? 26 : 19}
            fill="rgb(14 165 233 / 0.16)"
            style={{ transition: 'r 160ms ease' }}
          />
          {isDragging && (
            <circle cx={point.x} cy={point.y} r="19" fill="none" stroke="rgb(56 189 248 / 0.45)" strokeWidth="2">
              <animate attributeName="r" values="14;30" dur="0.9s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0" dur="0.9s" repeatCount="indefinite" />
            </circle>
          )}
          <circle
            cx={point.x}
            cy={point.y}
            r={isDragging ? 14 : 12}
            fill="#f8fafc"
            stroke="#38bdf8"
            strokeWidth={isDragging ? 4 : 3}
            tabIndex={0}
            role="slider"
            aria-label="Taste profile position"
            aria-valuetext={`${flavor.brightness} brightness, ${flavor.juiciness} fruit, ${flavor.sweetness} sweetness, ${flavor.body} body`}
            onKeyDown={moveByKeyboard}
            onFocus={() => setIsHovering(true)}
            onBlur={() => setIsHovering(false)}
            style={{ cursor: isDragging ? 'grabbing' : 'grab', transition: 'r 160ms ease, stroke-width 160ms ease' }}
          />
          <text
            x={point.x}
            y={point.y + 5}
            textAnchor="middle"
            fill="#0284c7"
            fontSize={isDragging ? 17 : 15}
            fontWeight="700"
            style={{ pointerEvents: 'none', transition: 'font-size 160ms ease' }}
          >
            ★
          </text>
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

function IonWatchDisclosure({
  ions,
  activeProfile,
}: {
  ions: Partial<Record<IonId, number>>;
  activeProfile: WaterProfile;
}) {
  const flaggedIons = ACTIVE_ION_IDS
    .map(id => {
      const ion = ION_MAP[id];
      const ppm = ions[id] ?? 0;
      const level = classifyIon(ppm, activeProfile.ranges[id]);
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
        <span className="font-semibold">{activeProfile.name} ion check</span>
        <span className="text-slate-500">
          {flaggedIons.length === 0
            ? 'All monitored ions in range'
            : `${flaggedIons.length} ion${flaggedIons.length === 1 ? '' : 's'} to review`}
        </span>
        <span className="ml-auto text-slate-500 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-2 border-t border-indigo-400/10 px-4 py-3 sm:px-6">
        <p className="text-[11px] leading-relaxed text-slate-500">
          Based on the final source-water-plus-salts mixture and {activeProfile.name} guidance.{' '}
          {activeProfile.id === AIKI_DEFAULT_PROFILE.id && (
            <a
              href="https://discord.com/channels/1194136643637096508/1423022322465505380/1504865270882373775"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-300 underline decoration-indigo-300/40 underline-offset-2 transition hover:text-indigo-200"
            >
              View Aiki&apos;s original Discord post
            </a>
          )}
        </p>
        {flaggedIons.length === 0 ? (
          <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[11px] text-emerald-200">
            No elevated or out-of-range ions detected.
          </p>
        ) : (
          flaggedIons.map(({ id, ion, ppm, level }) => {
            const style = TRAFFIC_STYLES[level];
            const range = activeProfile.ranges[id];
            return (
              <div
                key={id}
                className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2.5`}
                style={{ ...ionVisualStyle(id), boxShadow: 'inset 3px 0 0 var(--ion-border)' }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className={`text-xs font-semibold ${style.text}`}>
                    <span className="text-[color:var(--ion-fg)]" title={ion.name}>{ion.formula}</span> · {style.label}
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
              <div
                key={id}
                className={`rounded-lg border ${style.border} ${style.bg} px-3 py-2.5`}
                style={{ ...ionVisualStyle(id), boxShadow: 'inset 3px 0 0 var(--ion-border)' }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className={`text-xs font-semibold ${style.text}`}>
                    <span className="text-[color:var(--ion-fg)]" title={ION_MAP[id].name}>{ION_MAP[id].formula}</span> · {over ? 'Over target' : 'Under target'}
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
            value={STRENGTH_OPTIONS.includes(strength) ? String(strength) : 'custom'}
            onChange={e => {
              onStrengthChange(e.target.value === 'custom' ? 0 : Number(e.target.value));
            }}
            className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
          >
            {STRENGTH_OPTIONS.map(v => <option key={v} value={v}>×{v}</option>)}
            <option value="custom">Custom</option>
          </select>
          {!STRENGTH_OPTIONS.includes(strength) && (
            <input
              type="number"
              inputMode="numeric"
              min={2}
              value={strength || ''}
              onChange={e => onStrengthChange(Number(e.target.value) || 0)}
              placeholder="×"
              aria-label={`${group.name} custom stock strength multiplier`}
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

export default App;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TasteProfileCard from './TasteProfileCard';
import TastePreferenceModal from './TastePreferenceModal';
import type { TasteInference } from './tastePreference';
import { Calculator, Droplet, FlaskConical, Gauge, Info, AlertTriangle, Download, Check, Save, Share2, Upload, Trash2, Layers, X, RotateCcw, Plus, ListChecks, Sparkles } from 'lucide-react';
import { GiSaltShaker } from 'react-icons/gi';
import {
  SALTS, IONS, ACTIVE_ION_IDS, ION_MAP, AIKI_DEFAULT_PROFILE, RECIPES, CACO3_FACTOR, classifyIon, computeSaltMg,
  computeIonTotals, computeNaClTargetForSodiumGap, findIonOvershoots, findIonUnderdoses, computeGH, computeKH, checkConcentrate, splitIntoStockGroups,
  type IonId, type TrafficLevel, type WaterProfile, type RangeSet,
  type SaltRecipe, type SaltRecipeEntry, type ConcentrateWarning, type StockGroup,
} from '@/waterData';
import {
  loadSavedRecipes, saveSavedRecipes, serializeRecipeFile, parseRecipeFile, newRecipeId,
} from '@/recipes';
import { SettingsModal } from '@/SettingsModal';
import LabelScanner from '@/LabelScanner';
import { loadLocalWaters, saveLocalWaters, newLocalWaterId, type LocalWater, type WaterMetadata } from '@/localWaters';
import {
  loadProfiles, saveProfiles, loadActiveProfileId, saveActiveProfileId,
  loadNerdLevel, saveNerdLevel, createProfile,
  type NerdLevel,
} from '@/profiles';
import { ROBERT_ASAMI_RECIPES, type ExternalRecipe } from './externalRecipes';
import { EMPIRICAL_WATERS } from './empiricalWaters';

export type SaltRow = { target: string; formIdx: number };
type BrewerFlavorInput = {
  brightness: number;
  body: number;
  juiciness: number;
  sweetness: number;
};
type MagnesiumPreference = 'original' | 'chlorides' | 'sulfates';
type WatermancerTargetSourceId = 'safe-profile' | 'salt-table' | `recipe:${string}` | `external:${string}`;

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

const BREWER_SALT_IDS = new Set(['mgso4', 'cacl2', 'nahco3', 'nacl']);
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

function normalizeAutoFillPriority(priority: unknown): IonId[] {
  const valid = Array.isArray(priority)
    ? priority.filter((id): id is IonId => typeof id === 'string' && ACTIVE_ION_IDS.includes(id as IonId))
    : [];
  return [...new Set([...valid, ...AUTO_FILL_SOURCE_PRIORITY])];
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
  const fixedWaterAlreadyExceedsLimit = ceilingIonIds
    .some(id => fixedContributions[id] > (
      enforceAllIonCeilings
        ? (targetAmounts[id] ?? 0) + ((targetAmounts[id] ?? 0) > 0 ? positiveTargetWiggleAmount : 0)
        : bicarbonateLimit
    ) + 1e-8);
  if (variableVolumeLimit <= 0 || fixedWaterAlreadyExceedsLimit) {
    return entries.map(entry => ({ ...entry, volumeMl: '0' }));
  }

  const sortedEntries = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      for (const id of sourcePriority) {
        const difference = num(b.entry.ions[id] ?? '') - num(a.entry.ions[id] ?? '');
        if (Math.abs(difference) > 1e-8) return difference;
      }
      return 0;
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
      ? ceilingIonIds
      : ['bicarbonate', ...priorityIonIds];
    const availableAmount = Math.min(AUTO_FILL_MAX_ML, remainingVolume);
    const amountToCeiling = (allowPositiveTargetWiggle: boolean): number => {
      let candidateAmount = availableAmount;
      for (const id of limitingIds) {
        const concentration = num(entry.ions[id] ?? '');
        if (concentration <= 0) continue;
        const target = targetAmounts[id] ?? 0;
        const ceiling = enforceAllIonCeilings
          ? target + (
            allowPositiveTargetWiggle && target > 0
              ? positiveTargetWiggleAmount
              : 0
          )
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
    onChange(String(nextValue));
  }, [onChange]);

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

function App() {
  const [liters, setLiters] = useState('1');
  const [rows, setRows] = useState<SaltRow[]>(
    SALTS.map(s => ({ target: '', formIdx: s.defaultFormIdx ?? 0 })),
  );
  const [mineralWaters, setMineralWaters] = useState<MineralWaterEntry[]>([]);
  const [additionWaters, setAdditionWaters] = useState<MineralWaterEntry[]>([]);
  const [magnesiumPreference, setMagnesiumPreference] = useState<MagnesiumPreference>('original');
  const [autoFillPriorityPreset, setAutoFillPriorityPreset] = useState<AutoFillPriorityPreset>(() => loadAutoFillSettings().preset);
  const [autoFillCustomPriority, setAutoFillCustomPriority] = useState<IonId[]>(() => loadAutoFillSettings().customPriority);
  const [autoFillDeviationPpm, setAutoFillDeviationPpm] = useState(() => loadAutoFillSettings().deviationPpm);
  const [autoFillDraggedIndex, setAutoFillDraggedIndex] = useState<number | null>(null);
  const [brewerFlavor, setBrewerFlavor] = useState<BrewerFlavorInput>(DEFAULT_BREWER_FLAVOR);
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
  const [nerdLevel, setNerdLevel] = useState<NerdLevel>(() => loadNerdLevel());
  const [watermancerTargetSource, setWatermancerTargetSource] = useState<WatermancerTargetSourceId>('safe-profile');
  const [watermancerUsedSaltIds, setWatermancerUsedSaltIds] = useState<string[]>([]);
  const [sodiumCorrectionOn, setSodiumCorrectionOn] = useState(false);

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
          tags: ['Flavor first', 'Dropper stocks', 'Simple dosing'],
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
    if (nerdLevel === 'alchemist' && level !== 'alchemist') {
      // Concentrate controls belong to the Alchemist recipe lab. Do not let
      // their hidden state change Watermancer or Brewer salt amounts/labels.
      setConcentrateOn(false);
      setSplitMode(false);
    }
    if (level === 'brewer' && nerdLevel !== 'brewer') {
      const currentRecipe: SaltRecipe = {
        id: 'current',
        name: 'Current recipe',
        salts: Object.fromEntries(
          SALTS.flatMap((salt, index) => num(rows[index]?.target) > 0
            ? [[salt.id, { target: rows[index].target, formIdx: rows[index].formIdx }]]
            : []),
        ),
      };
      const currentFlavor = brewerFlavorFromRecipe(currentRecipe);
      if (currentFlavor) {
        setBrewerFlavor(currentFlavor);
      } else {
        const defaultTargets = brewerSaltSuggestion(DEFAULT_BREWER_FLAVOR);
        setBrewerFlavor(DEFAULT_BREWER_FLAVOR);
        setActiveRecipeId('custom');
        setExternalRecipeId('custom');
        setRows(SALTS.map(salt => ({
          target: defaultTargets[salt.id] ? String(defaultTargets[salt.id]) : '',
          formIdx: salt.defaultFormIdx ?? 0,
        })));
      }
    }
    setNerdLevel(level);
  };

  // Persist on changes
  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => { saveActiveProfileId(activeProfileId); }, [activeProfileId]);
  useEffect(() => { saveNerdLevel(nerdLevel); }, [nerdLevel]);

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

  const handleApplyTasteInference = (inference: TasteInference) => {
    setActiveRecipeId('custom');
    setExternalRecipeId('custom');
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
    SALTS.forEach((s, i) => { m[s.id] = num(rows[i].target); });
    return m;
  }, [rows]);

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
  const brewerModeSaltTargets = nerdLevel === 'brewer' ? brewerSuggestedSaltTargets : saltTargets;
  const brewerModeIonTotals = nerdLevel === 'brewer' ? brewerSuggestedIons : ionTotals;
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

  // Build the salt recommendation shown below the calculator. The sulfate /
  // chloride preference is a real source selection for magnesium, not merely
  // a sort order. Keep the user's actual recipe rows unchanged until they
  // choose to edit or apply the recommendation.
  const suggestedSaltTargets = useMemo(() => {
    const targets: Record<string, number> = {};
    SALTS.forEach((salt, i) => { targets[salt.id] = num(rows[i].target); });

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
      targets[saltId] = Math.max(originalIon - (bottledIons[ionId] ?? 0), 0) / fraction;
    };

    if (hasMineralWater) {
      reduceForIon('cacl2', 'calcium');
      reduceForIon('nahco3', 'bicarbonate');
      reduceForIon('khco3', 'potassium');
      reduceForIon('nacl', 'sodium');
    }

    const magnesiumSulfate = SALTS.find(s => s.id === 'mgso4');
    const magnesiumChloride = SALTS.find(s => s.id === 'mgcl2');
    if (hasMineralWater && magnesiumSulfate && magnesiumChloride) {
      const sulfateFraction = magnesiumSulfate.ions.find(c => c.ionId === 'magnesium')?.fraction ?? 0;
      const chlorideFraction = magnesiumChloride.ions.find(c => c.ionId === 'magnesium')?.fraction ?? 0;
      const originalSulfateTarget = num(rows[SALTS.findIndex(s => s.id === 'mgso4')]?.target);
      const originalChlorideTarget = num(rows[SALTS.findIndex(s => s.id === 'mgcl2')]?.target);
      const originalSulfateMg = originalSulfateTarget * sulfateFraction;
      const originalChlorideMg = originalChlorideTarget * chlorideFraction;
      const originalMgTotal = originalSulfateMg + originalChlorideMg;
      const remainingMagnesium = Math.max(
        (saltOnlyIons?.magnesium ?? 0) - (bottledIons?.magnesium ?? 0),
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
    if (hasMineralWater) {
      const bicarbonateContributions = ['nahco3', 'khco3'].map(saltId => {
        const salt = SALTS.find(item => item.id === saltId);
        const fraction = salt?.ions.find(contribution => contribution.ionId === 'bicarbonate')?.fraction ?? 0;
        return { saltId, fraction, contribution: (targets[saltId] ?? 0) * fraction };
      });
      const saltBicarbonate = bicarbonateContributions.reduce((total, item) => total + item.contribution, 0);
      const remainingBicarbonate = Math.max(
        (saltOnlyIons.bicarbonate ?? 0) - (bottledIons.bicarbonate ?? 0),
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
  }, [rows, magnesiumPreference, saltOnlyIons, bottledIons, hasMineralWater]);

  const suggestedIonTotalsBeforeSodiumCorrection = useMemo(
    () => computeIonTotals(suggestedSaltTargets, combinedBottledIons, dil),
    [suggestedSaltTargets, combinedBottledIons, dil],
  );
  const sodiumCorrectionGap = Math.max(
    (saltOnlyIons.sodium ?? 0) - (suggestedIonTotalsBeforeSodiumCorrection.sodium ?? 0),
    0,
  );
  const sodiumCorrectionTarget = hasMineralWater && (showAlchemist || sodiumCorrectionOn)
    ? computeNaClTargetForSodiumGap(sodiumCorrectionGap)
    : 0;
  const effectiveSuggestedSaltTargets = useMemo<Record<string, number>>(() => ({
    ...suggestedSaltTargets,
    nacl: (suggestedSaltTargets.nacl ?? 0) + sodiumCorrectionTarget,
  }), [suggestedSaltTargets, sodiumCorrectionTarget]);

  // One dosing target map for every user-facing preparation surface. With
  // source water, this is the final salt contribution still needed after
  // water coverage, the bicarbonate ceiling, and any optional sodium correction.
  const dosingSaltTargets = hasMineralWater ? effectiveSuggestedSaltTargets : saltTargets;

  const suggestedIonTotals = useMemo(
    () => computeIonTotals(effectiveSuggestedSaltTargets, combinedBottledIons, dil),
    [effectiveSuggestedSaltTargets, combinedBottledIons, dil],
  );
  const finalRecipeOvershoots = useMemo(
    () => findIonOvershoots(suggestedIonTotals, saltOnlyIons),
    [suggestedIonTotals, saltOnlyIons],
  );
  const finalRecipeUnderdoses = useMemo(
    () => findIonUnderdoses(suggestedIonTotals, saltOnlyIons),
    [suggestedIonTotals, saltOnlyIons],
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
  const bicarbonateTarget = saltOnlyIons.bicarbonate ?? 0;
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
  const handleReset = () => {
    setRows(SALTS.map(s => ({ target: '', formIdx: s.defaultFormIdx ?? 0 })));
    setBrewerFlavor(DEFAULT_BREWER_FLAVOR);
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
    setShowResetConfirm(false);
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

  // Recipe state
  const [activeRecipeId, setActiveRecipeId] = useState<string>('custom');
  const [savedRecipes, setSavedRecipes] = useState<SaltRecipe[]>(() => loadSavedRecipes());
  useEffect(() => { saveSavedRecipes(savedRecipes); }, [savedRecipes]);

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
  const watermancerIonTargets = useMemo<Partial<Record<IonId, number>>>(() => {
    if (watermancerTargetSource === 'salt-table') return saltOnlyIons;
    if (watermancerTargetSource.startsWith('recipe:')) {
      const recipeId = watermancerTargetSource.slice('recipe:'.length);
      const recipe = allRecipes.find(item => item.id === recipeId);
      return recipe ? ionTotalsForSaltRecipe(recipe) : {};
    }
    if (watermancerTargetSource.startsWith('external:')) {
      const recipeId = watermancerTargetSource.slice('external:'.length);
      const recipe = ROBERT_ASAMI_RECIPES.find(item => item.id === recipeId);
      return recipe ? ionTotalsForSaltRecipe(recipe) : {};
    }
    return Object.fromEntries(
      ACTIVE_ION_IDS.map(id => [id, activeRanges[id].greenMax]),
    ) as Partial<Record<IonId, number>>;
  }, [activeRanges, allRecipes, saltOnlyIons, watermancerTargetSource]);
  const watermancerTargetSourceLabel = useMemo(() => {
    if (watermancerTargetSource === 'safe-profile') return `${activeProfile.name} safe profile`;
    if (watermancerTargetSource === 'salt-table') return 'Current salt table';
    if (watermancerTargetSource.startsWith('recipe:')) {
      return allRecipes.find(item => item.id === watermancerTargetSource.slice('recipe:'.length))?.name ?? 'Selected recipe';
    }
    return ROBERT_ASAMI_RECIPES.find(item => item.id === watermancerTargetSource.slice('external:'.length))?.name ?? 'Watering Hole recipe';
  }, [activeProfile.name, allRecipes, watermancerTargetSource]);
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

  const applyRecipeObject = (recipe: SaltRecipe) => {
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
    if (recipeId === 'custom') { setActiveRecipeId('custom'); return; }
    const recipe = allRecipes.find(r => r.id === recipeId);
    if (recipe) applyRecipeObject(recipe);
  };

  const applyExternalRecipe = (recipeId: string) => {
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
      if (num(rows[i].target) > 0) m[s.id] = { target: rows[i].target, formIdx: rows[i].formIdx };
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
      const row = rows[i];
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
        const row = rows[i];
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
          const row = rows[saltIdx];
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
      const form = s.hydrationForms[rows[i].formIdx];
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-start justify-center p-4 sm:p-6 font-sans">
      <div className="flex w-full max-w-5xl flex-col space-y-4">
        {/* Header */}
         <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden">
          <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 sm:px-6 py-4 bg-gradient-to-r ${modeAccent}`}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Calculator className="w-6 h-6 text-white" />
              <h1 className="truncate text-base sm:text-lg font-semibold text-white tracking-tight">Coffee Water Mineral Calculator</h1>
            </div>
            <div className="order-3 flex w-full items-center justify-end gap-2 sm:order-none sm:w-auto">
              <button
                onClick={() => setShowTastePreference(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-white bg-violet-600/90 hover:bg-violet-500 border border-violet-400/40 rounded-lg px-3 py-1.5 transition-all shadow-lg hover:shadow-violet-500/20 hover:scale-105 active:scale-95"
                title="Answer a few questions to find your ideal water profile"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">Find My Water</span>
              </button>
            </div>
          </div>
        </div>

        {/* Experience level */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 px-4 sm:px-6 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">Experience Level</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  {nerdLevel === 'alchemist'
                    ? 'A focused salt and concentrate workspace built from 0-TDS water.'
                    : nerdLevel === 'watermancer'
                      ? 'A source-water and ion-balance workspace for refining the final mixture.'
                      : 'Choose how much calculator detail to show. Brewer mode uses salts only.'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
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
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
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
         <div className={`rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${modeGuide.tone}`}>
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

         {showWatermancer && (
            <>
              <WatermancerIonProfileCard
                activeProfile={activeProfile}
                activeRanges={activeRanges}
                ions={ionProfileIons}
                targetIons={watermancerIonTargets}
                targetSource={watermancerTargetSource}
                targetSourceLabel={watermancerTargetSourceLabel}
              />
              <SettingsModal
                profiles={profiles}
                activeProfileId={activeProfileId}
                inline
                onClose={() => undefined}
                onSelectProfile={handleSelectProfile}
                onSaveProfile={handleSaveProfile}
                onDeleteProfile={handleDeleteProfile}
              />
            </>
         )}

         {/* Mineral Table */}
           {showAlchemist && <div className="order-1 bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-emerald-400/20 overflow-hidden">
           <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-700/40 bg-gradient-to-r from-sky-500/10 via-transparent to-indigo-500/10 text-slate-300">
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
            <div className="border-b border-emerald-400/10 bg-emerald-500/[0.03] px-4 py-2.5 text-[11px] leading-relaxed text-slate-400 sm:px-6">
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
         <div className="hidden sm:grid grid-cols-[1.3fr_1fr_1.2fr_1fr] gap-3 px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-400 border-b border-slate-700/40">
            <span>Salt</span>
            <span>Target (ppm)</span>
            <span>Hydrated Form</span>
            <span>{concentrateOn ? 'Amount' : 'Amount (mg)'}</span>
          </div>
          {SALTS.map((salt, i) => {
            const row = rows[i];
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
              <div key={salt.id} className="grid grid-cols-2 sm:grid-cols-[1.3fr_1fr_1.2fr_1fr] gap-x-3 gap-y-2 px-4 sm:px-6 py-3 sm:py-2.5 sm:items-center border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors">
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
               suggestedIons={brewerSuggestedIons}
               onChange={handleBrewerFlavorChange}
             />
             <BrewerSimpleRecipeCard
               saltTargets={brewerSuggestedSaltTargets}
               recipeRows={rows}
               liters={L}
               volumeInput={liters}
               onVolumeChange={value => setLiters(value)}
               concentrateOn={concentrateOn}
               concentrateLiters={concL}
               concentrateStrength={concentrateStrength}
               onOpenSteps={method => setShowBrewerSteps(method)}
             />
           </>
         )}

         {/* Water amount + Concentrate */}
            {(showAlchemist || showWatermancer) && <div className={`order-2 relative overflow-hidden rounded-2xl border ${showAlchemist ? 'border-emerald-400/25 shadow-emerald-950/15' : 'border-indigo-400/25 shadow-indigo-950/15'} bg-slate-800/75 shadow-xl backdrop-blur`}>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/[0.08] via-sky-500/[0.025] to-blue-500/[0.08]" />
           <div className="relative z-10">
           <SectionHeader
             icon={<Droplet className="w-4 h-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.6)]" />}
              title={showAlchemist ? 'Batch & Concentrate' : 'Final Batch Volume'}
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
              <div className="relative px-4 sm:px-6 py-4 space-y-4 bg-transparent">
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
        {showAlchemist && <div className="order-4 bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader
            icon={<HardnessBalanceScale gh={baseSaltGh} kh={baseSaltKh} />}
            title="Base Salt Recipe Summary (as CaCO₃)"
          />
          <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="order-4">
            <WaterChemistryCard
              estimate={waterChemistry.estimate}
              basePH={waterChemistry.basePH}
              baseAlkalinity={waterChemistry.baseAlkalinity}
            />
          </div>
        )}

        {/* Taste Profile */}
        <div className="order-5">
          <TasteProfileCard
            ionTotals={nerdLevel === 'brewer' ? brewerModeIonTotals : ionTotals}
            gh={nerdLevel === 'brewer' ? brewerModeGh : gh}
            kh={nerdLevel === 'brewer' ? brewerModeKh : kh}
            collapsed={showAlchemist || showWatermancer}
          />
        </div>

        {/* Mineral Water Base */}
        {(showAlchemist || showWatermancer) && <div className={`${showAlchemist ? 'order-3 border-emerald-400/25' : 'order-6 border-indigo-400/25'} bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl overflow-hidden`}>
          <SectionHeader
            icon={<MineralWaterBeaker active={hasMineralWater} />}
            title="Mineral Water Base"
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
          <div className="px-6 py-4 space-y-4">
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
                    onClick={() => {
                      const hasName = entry.name.trim().length > 0;
                      const hasIons = Object.values(entry.ions).some(v => parseFloat(v || '0') > 0);
                      if (!hasName || !hasIons) return;
                      if (window.confirm(`Share "${entry.name.trim()}" with the community? Other users will be able to find and use this water profile.`)) {
                        const vals: Record<string, number> = Object.fromEntries(
                          Object.entries(entry.ions)
                            .filter(([, v]) => parseFloat(v || '0') > 0)
                            .map(([k, v]) => [k, parseFloat(v || '0')])
                        );
                        fetch(`${API_BASE}/api/waters`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: entry.name.trim(), ions: vals, metadata: metadataToNumbers(entry.metadata), shared: 'yes' }),
                        }).catch(() => {});
                      }
                    }}
                    className={`text-xs font-medium rounded-lg px-3 py-1.5 transition shrink-0 ${
                      (!entry.name.trim() || !Object.values(entry.ions).some(v => parseFloat(v || '0') > 0))
                        ? 'text-slate-600 bg-slate-700/20 cursor-not-allowed'
                        : 'text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30'
                    }`}
                  >
                    <Share2 className="w-3 h-3 inline mr-1" />Share
                  </button>
                </div>
              </div>
            ))}

             {mineralWaters.length > 0 && batchMl > 0 && (
               <button
                 type="button"
                    onClick={() => setMineralWaters(prev => autoFillWaterVolumes(
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
                    ))}
                 className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
                  title={showAlchemist
                    ? 'Fill from the base water to cover as many ions in the original recipe as possible without overshooting any target.'
                    : noRecipeSelected
                    ? 'Fill base waters up to the active ion profile safe limits'
                    : "Use all base waters to cover as much of the recipe's ion targets as possible"}
               >
                 Auto-fill all base waters
               </button>
             )}

             {/* Add button */}
            <button
              onClick={() => addMineralWater()}
              className="flex items-center justify-center gap-2 text-sm text-sky-300 hover:text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/50 rounded-xl px-4 py-3 transition w-full"
            >
              <Droplet className="w-4 h-4" />
              Add water source
            </button>

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
                    ? `⚠ Mineral water overshoots by ${(covered - target).toFixed(1)} ppm`
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
                           <span className="text-sm font-semibold tabular-nums text-emerald-300">✓ Covered</span>
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
                     const form = salt.hydrationForms[rows[index].formIdx];
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

             {/* Remaining gaps — what the active Watermancer target still needs */}
             {showWatermancer && batchMl > 0 && (
              <div className="border-t border-slate-700/40 pt-4">
                 <div className="flex flex-wrap items-center justify-between gap-2">
                   <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                     Still needed from salts
                   </span>
                   <span className="text-[10px] text-slate-500">
                      Using {watermancerTargetSourceLabel} as the ion target source
                   </span>
                 </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACTIVE_ION_IDS.map(id => {
                     const target = watermancerIonTargets[id] ?? 0;
                    const covered = bottledIons[id] ?? 0;
                    const remaining = Math.max(target - covered, 0);
                     const coveredTarget = covered >= target - 0.01;
                     if (target <= 0 && covered <= 0) return null;
                    return (
                      <div key={id} className="bg-slate-900/40 border border-slate-700/50 rounded-lg px-3 py-2">
                        <span className="block text-[10px] text-slate-500">{ION_MAP[id].formula}</span>
                         {coveredTarget ? (
                           <span className="text-sm font-semibold tabular-nums text-emerald-300">✓ Covered</span>
                         ) : remaining > 0 ? (
                          <span className="text-sm font-semibold tabular-nums text-amber-300">
                            {remaining.toFixed(1)} ppm
                          </span>
                        ) : (
                          <span className="text-sm font-semibold tabular-nums text-emerald-300">✓ Covered</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                 {/* Every gap gets every compatible salt option. Selection is
                     intentionally presentation-only; recipe rows and forms stay
                     unchanged until the user edits the recipe above. */}
                 <div className="mt-3 space-y-3">
                   <div className="flex flex-wrap items-center justify-between gap-2">
                     <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Salt options</span>
                      <div className="flex flex-wrap items-center gap-2">
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
                       <span className="text-[10px] text-slate-500">
                         Click an option to mark it used
                       </span>
                     </div>
                   </div>
                   {ACTIVE_ION_IDS.map(id => {
                     const gap = watermancerIonGaps[id] ?? 0;
                     if (gap <= 0.05) return null;
                     const options = watermancerSaltOptions.filter(option =>
                       option.targetPpm > 0 && option.salt.ions.some(contribution => contribution.ionId === id),
                     );
                     if (options.length === 0) return null;
                     return (
                       <div key={id} className="rounded-xl border border-slate-700/50 bg-slate-900/25 p-3">
                         <div className="mb-2 flex items-center justify-between gap-2">
                           <span className="text-xs font-semibold text-amber-200">
                             {ION_MAP[id].name} gap · {gap.toFixed(1)} ppm
                           </span>
                           <span className="text-[10px] text-slate-500">{options.length} option{options.length === 1 ? '' : 's'}</span>
                         </div>
                         <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                           {options.map(option => {
                             const used = watermancerUsedSaltIds.includes(option.salt.id);
                             const toggleUsed = () => setWatermancerUsedSaltIds(current =>
                               used ? current.filter(id => id !== option.salt.id) : [...current, option.salt.id],
                             );
                             return (
                               <button
                                 key={option.salt.id}
                                 type="button"
                                 onClick={toggleUsed}
                                 aria-pressed={used}
                                 className={`rounded-lg border px-3 py-2 text-left transition ${
                                   used
                                     ? 'border-emerald-400/60 bg-emerald-500/15 shadow-[0_0_12px_-4px_rgba(52,211,153,0.65)]'
                                     : 'border-slate-700/50 bg-slate-950/30 opacity-55 hover:border-sky-400/40 hover:bg-sky-500/10 hover:opacity-100'
                                 }`}
                               >
                                 <div className="flex items-center justify-between gap-2">
                                   <span className={`text-xs font-semibold ${used ? 'text-emerald-200' : 'text-slate-400'}`}>
                                     {option.salt.name}
                                   </span>
                                   <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                                     used ? 'bg-emerald-400/20 text-emerald-200' : 'bg-slate-700/60 text-slate-500'
                                   }`}>
                                     {used ? 'Used' : 'Unused'}
                                   </span>
                                 </div>
                                 <div className="mt-1 text-[10px] text-slate-500">
                                   {option.salt.formula} · {option.form.label}
                                 </div>
                                 <div className={`mt-1 text-sm font-semibold tabular-nums ${used ? 'text-emerald-300' : 'text-slate-500'}`}>
                                   {option.mg.toFixed(1)} mg
                                 </div>
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     );
                   })}
                 </div>
                 {(finalRecipeOvershoots.length > 0
                   || finalRecipeUnderdoses.length > 0
                   || (hasMineralWater && sodiumCorrectionGap > 0.05)
                   || sodiumCorrectionOn) && (
                     <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5">
                       <div className="flex items-start justify-between gap-3">
                         <div>
                           <span className="block text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                             Final recipe deviation
                           </span>
                           <p className="mt-1 text-[11px] text-slate-400">
                              Mineral water and suggested salts can leave some ions above or below the recipe target.
                           </p>
                         </div>
                         {hasMineralWater && sodiumCorrectionGap > 0.05 && (
                           <button
                             type="button"
                             onClick={() => setSodiumCorrectionOn(current => !current)}
                             aria-pressed={sodiumCorrectionOn}
                             aria-label={sodiumCorrectionOn
                               ? 'Turn off sodium chloride correction'
                               : 'Add sodium chloride to close the sodium gap'}
                             title={sodiumCorrectionOn
                               ? 'Turn off sodium chloride correction'
                               : `Add NaCl to close the ${sodiumCorrectionGap.toFixed(1)} ppm sodium gap`}
                             className={`salt-shaker-toggle flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                               sodiumCorrectionOn ? 'is-on' : 'is-off'
                             } ${
                               sodiumCorrectionOn
                                 ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                                 : 'border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                             }`}
                           >
                             <span className="salt-shaker-icon relative h-5 w-5" aria-hidden="true">
                               <GiSaltShaker className="salt-shaker-visual h-5 w-5" />
                               <span className="salt-grains">
                                 <span className="salt-grain salt-grain-one" />
                                 <span className="salt-grain salt-grain-two" />
                                 <span className="salt-grain salt-grain-three" />
                               </span>
                             </span>
                             <span className="hidden sm:inline">{sodiumCorrectionOn ? 'Salt added' : 'Add salt'}</span>
                           </button>
                         )}
                       </div>
                       <div className="mt-2 flex flex-wrap gap-2">
                         {finalRecipeOvershoots.map(({ id, amount }) => (
                           <span
                             key={id}
                             className="rounded-md border border-rose-500/30 bg-slate-900/30 px-2 py-1 text-xs font-semibold tabular-nums text-rose-200"
                           >
                             {ION_MAP[id].formula} +{amount.toFixed(1)} ppm
                           </span>
                         ))}
                         {finalRecipeUnderdoses.map(({ id, amount }) => (
                           <span
                             key={id}
                             className="rounded-md border border-amber-500/30 bg-slate-900/30 px-2 py-1 text-xs font-semibold tabular-nums text-amber-200"
                           >
                             {ION_MAP[id].formula} −{amount.toFixed(1)} ppm
                           </span>
                         ))}
                       </div>
                       {sodiumCorrectionOn && sodiumCorrectionTarget > 0 && (
                         <p className="mt-2 text-[11px] text-emerald-200/80">
                           Adding {sodiumCorrectionTarget.toFixed(1)} ppm NaCl closes the sodium gap and includes its chloride contribution.
                         </p>
                       )}
                     </div>
                 )}
                  {bicarbonateWaterOvershoot && (
                    <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-amber-300">
                        Bicarbonate source-water stop
                      </span>
                      <p className="mt-1 text-[11px] text-slate-300">
                        This water alone provides {bicarbonateFromWater.toFixed(1)} ppm HCO₃⁻,
                        above the {bicarbonateTarget.toFixed(1)} ppm recipe target. No bicarbonate
                        salts will be recommended; use less of this water or choose a lower-alkalinity source.
                      </p>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>}

        {showWatermancer && hasMineralWater && (
          <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-indigo-400/25 overflow-hidden">
            <SectionHeader icon={<Droplet className="w-4 h-4" />} title="Final Mixture Summary" />
            <div className="border-b border-slate-700/40 px-4 pt-3 text-xs text-slate-400 sm:px-6">
              Configured mineral/addition water plus suggested salts, diluted to the selected batch volume.
            </div>
            <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <HardnessCard label="General Hardness (GH)" value={finalGh} saltValue={finalSaltGh} bottledValue={ghBottled} />
              <HardnessCard label="Carbonate Hardness (KH)" value={finalKh} saltValue={finalSaltKh} bottledValue={khBottled} />
              <TdsCard value={finalTds} saltValue={finalSaltTds} bottledValue={tdsMineral} />
              <div className="sm:col-span-3 flex items-center justify-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Final GH : KH Ratio</span>
                <span className="h-4 w-px bg-slate-700" />
                {finalKh > 0 && finalGh >= 0 && Number.isFinite(finalGh / finalKh) ? (
                  <span className="text-lg font-semibold text-emerald-300 tabular-nums">
                    {(finalGh / finalKh).toFixed(1)}<span className="text-slate-400 font-normal text-sm mx-1">:</span>1
                  </span>
                ) : (
                  <span className="text-lg font-semibold text-slate-500">—</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mineral Water Addition */}
        {showWatermancer && <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-indigo-400/25 overflow-hidden">
          <SectionHeader
            icon={<PouringCarafeIcon />}
            title="Mineral Water Addition"
            after={<div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {additionWaters.length} water{additionWaters.length !== 1 ? 's' : ''}
              </span>
            </div>}
          />
          <div className="px-6 py-4 space-y-4">
            {/* Volume breakdown — prominent */}
            {batchMl > 0 && (() => {
              const totalMineral = totalBaseMl + totalMineralMl;
              const remaining0Tds = Math.max(batchMl - totalMineral, 0);
              const pctMineral = batchMl > 0 ? Math.round((totalMineral / batchMl) * 100) : 0;
              return (
                <div className="bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-emerald-500/10 border border-sky-500/30 rounded-xl px-4 py-3 shadow-lg shadow-sky-500/5">
                  {overfill && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Source water exceeds the batch volume — volumes are normalized proportionally to fit the batch.
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    {totalBaseMl > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Base water</span>
                        <span className="text-sm font-semibold text-slate-300 tabular-nums">{fmt(totalBaseMl)} mL</span>
                      </div>
                    )}
                    {totalMineralMl > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Addition water</span>
                        <span className="text-sm font-semibold text-slate-300 tabular-nums">{fmt(totalMineralMl)} mL</span>
                      </div>
                    )}
                    {(totalBaseMl > 0 || totalMineralMl > 0) && (
                      <div className="border-t border-sky-500/20 my-1" />
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        {overfill ? 'Mineral water (all)' : 'Mineral water'}
                      </span>
                      <span className="text-lg font-bold text-sky-300 tabular-nums">
                        {overfill ? fmt(batchMl) : fmt(totalMineral)} mL
                      </span>
                    </div>
                    {!overfill && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">0 TDS water</span>
                          <span className="text-lg font-bold text-amber-300 tabular-nums">{fmt(remaining0Tds)} mL</span>
                        </div>
                        {/* Visual bar */}
                        <div className="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full transition-all"
                            style={{ width: `${pctMineral}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>{pctMineral}% mineral</span>
                          <span>{100 - pctMineral}% 0 TDS</span>
                        </div>
                      </>
                    )}
                    <div className="border-t border-sky-500/20 mt-1 pt-1 flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total batch</span>
                      <span className="text-base font-bold text-white tabular-nums">{fmt(batchMl)} mL</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Addition entry list */}
            {additionWaters.length === 0 ? (
              <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                No addition waters yet. These stack on top of your salt recipe to fine-tune the profile.
              </p>
            ) : (
              additionWaters.map(entry => (
                <div key={entry.id} className="border border-slate-700/50 rounded-xl bg-slate-900/30 p-4 space-y-3">
                  {/* Entry header: name + volume + remove */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="text"
                        value={entry.name}
                        onChange={e => updateAdditionWater(entry.id, { name: e.target.value })}
                        placeholder="Water name"
                        className="flex-1 min-w-0 bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={entry.volumeMl}
                          onChange={e => updateAdditionWater(entry.id, { volumeMl: e.target.value })}
                          placeholder="0"
                          className="w-20 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                        />
                        <span className="text-xs text-slate-400 shrink-0">mL</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeAdditionWater(entry.id)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-300 bg-slate-700/40 hover:bg-rose-500/20 rounded-lg px-2 py-1.5 transition shrink-0"
                      title="Remove this addition water"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Precise volume stepper */}
                  <div className="flex items-center gap-3">
                    <WaterVolumeStepper
                      value={entry.volumeMl}
                      onChange={volumeMl => updateAdditionWater(entry.id, { volumeMl })}
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
                          onChange={e => updateAdditionWater(entry.id, {
                            ions: { ...entry.ions, [id]: e.target.value }
                          })}
                          placeholder="0"
                          className="w-full bg-slate-900/60 border border-slate-600/60 rounded-lg px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                        />
                      </div>
                    ))}
                  </div>
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
                      onClick={() => {
                        const hasName = entry.name.trim().length > 0;
                        const hasIons = Object.values(entry.ions).some(v => parseFloat(v || '0') > 0);
                        if (!hasName || !hasIons) return;
                        if (window.confirm(`Share "${entry.name.trim()}" with the community? Other users will be able to find and use this water profile.`)) {
                          const vals: Record<string, number> = Object.fromEntries(
                            Object.entries(entry.ions)
                              .filter(([, v]) => parseFloat(v || '0') > 0)
                              .map(([k, v]) => [k, parseFloat(v || '0')])
                          );
                          fetch(`${API_BASE}/api/waters`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: entry.name.trim(), ions: vals, metadata: metadataToNumbers(entry.metadata), shared: 'yes' }),
                          }).catch(() => {});
                        }
                      }}
                      className={`text-xs font-medium rounded-lg px-3 py-1.5 transition shrink-0 ${
                        (!entry.name.trim() || !Object.values(entry.ions).some(v => parseFloat(v || '0') > 0))
                          ? 'text-slate-600 bg-slate-700/20 cursor-not-allowed'
                          : 'text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30'
                      }`}
                    >
                      <Share2 className="w-3 h-3 inline mr-1" />Share
                    </button>
                  </div>
                </div>
              ))
            )}
             {additionWaters.length > 0 && batchMl > 0 && (
               <button
                 type="button"
                  onClick={() => setAdditionWaters(prev => autoFillWaterVolumes(
                    prev,
                    batchMl,
                     showAlchemist ? saltOnlyIons : autoFillTargets,
                    mineralWaters,
                    activeAutoFillPriority,
                     effectiveAutoFillDeviationPpm,
                     showAlchemist || noRecipeSelected,
                     autoFillUsesRecipeTargets,
                     showAlchemist ? 0.1 : 1,
                     showAlchemist ? 0.5 : 0,
                  ))}
                 className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
                  title={showAlchemist
                    ? 'Fill from the base water to cover as many ions in the original recipe as possible without overshooting any target.'
                    : noRecipeSelected
                    ? 'Fill addition waters up to the active ion profile safe limits'
                    : "Use all addition waters to cover as much of the recipe's ion targets as possible"}
               >
                 Auto-fill all addition waters
               </button>
             )}

             {/* Addition add button */}
            <button
              onClick={() => addAdditionWater()}
              className="flex items-center justify-center gap-2 text-sm text-sky-300 hover:text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/50 rounded-xl px-4 py-3 transition w-full"
            >
              <Droplet className="w-4 h-4" />
              Add addition water
            </button>
          </div>
        </div>}

      </div>
      {(showAlchemist || showWatermancer) && (
        <button
          type="button"
          onClick={() => setShowBrewerSteps('dry')}
          className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur transition hover:-translate-y-0.5 active:translate-y-0 ${
            showAlchemist
              ? 'border-emerald-300/45 bg-emerald-500/90 text-white shadow-emerald-950/40 hover:bg-emerald-400'
              : 'border-cyan-300/45 bg-indigo-600/90 text-white shadow-indigo-950/40 hover:bg-indigo-500'
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

function WatermancerIonProfileCard({
  activeProfile,
  activeRanges,
  ions,
  targetIons,
  targetSource,
  targetSourceLabel,
}: {
  activeProfile: WaterProfile;
  activeRanges: RangeSet;
  ions: Partial<Record<IonId, number>>;
  targetIons: Partial<Record<IonId, number>>;
  targetSource: WatermancerTargetSourceId;
  targetSourceLabel: string;
}) {
  return (
    <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-indigo-400/30 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-indigo-400/15 text-slate-300">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-indigo-300" />
          <h2 className="text-sm font-semibold uppercase tracking-wider">Ion Profile</h2>
          <span className="text-xs text-slate-400 font-normal normal-case">— {activeProfile.name}</span>
        </div>
      </div>
      <div className="border-b border-indigo-400/10 bg-indigo-500/[0.035] px-4 py-2.5 text-[11px] leading-relaxed text-slate-400 sm:px-6">
        {targetSource === 'safe-profile'
          ? `Using ${targetSourceLabel}. Ionic targets will guide the mineral-water and addition-salt recommendations below.`
          : `Using ${targetSourceLabel}: salt chemistry is translated into ion targets without changing the salt table.`}
      </div>
      <div className="px-4 sm:px-6 py-4 grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {ACTIVE_ION_IDS.map((id, idx) => {
          const ion = ION_MAP[id];
          const ppm = ions[id] ?? 0;
          const level = classifyIon(ppm, activeRanges[id]);
          const s = TRAFFIC_STYLES[level];
          const r = activeRanges[id];
          const target = targetIons[id] ?? 0;
          const gap = Math.max(target - ppm, 0);
          const tooltipAbove = idx >= Math.ceil(ACTIVE_ION_IDS.length / 2);
          return (
            <div key={id} className={`group/ion relative rounded-xl border ${s.border} ${s.bg} px-4 py-3`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-200 cursor-help">{ion.name}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-lg font-bold ${s.text}`}>{ppm.toFixed(1)}</span>
                <span className="text-xs text-slate-400">ppm</span>
              </div>
              <div className={`text-xs ${s.text} mt-0.5`}>
                {s.label} · &lt;{formatIonThreshold(r.greenMax)} / {formatIonThreshold(r.greenMax)}–{formatIonThreshold(r.yellowMax)} / &gt;{formatIonThreshold(r.yellowMax)}
              </div>
              <div className="mt-1 text-[10px] text-slate-500">
                Target {target.toFixed(1)} · {gap > 0.05 ? `${gap.toFixed(1)} needed` : 'covered'}
              </div>
              <span className={`pointer-events-none absolute left-0 w-56 z-10 rounded-lg bg-slate-900 border border-slate-600/60 px-3 py-2 text-xs text-slate-300 opacity-0 group-hover/ion:opacity-100 transition-opacity shadow-xl ${tooltipAbove ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                {ion.tasteNote}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, after }: { icon: React.ReactNode; title: string; after?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-700/40 text-slate-300">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
      </div>
      {after}
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

function BrewerSimpleRecipeCard({
  saltTargets,
  recipeRows,
  liters,
  volumeInput,
  onVolumeChange,
  concentrateOn,
  concentrateLiters,
  concentrateStrength,
  onOpenSteps,
}: {
  saltTargets: Record<string, number>;
  recipeRows: SaltRow[];
  liters: number;
  volumeInput: string;
  onVolumeChange: (value: string) => void;
  concentrateOn: boolean;
  concentrateLiters: number;
  concentrateStrength: number;
  onOpenSteps: (method: 'dry' | 'dropper') => void;
}) {
  const DROPS_PER_ML = 20;
  const UNIVERSAL_STOCK_PERCENT = 5;
  const UNIVERSAL_STOCK_MG_PER_ML = UNIVERSAL_STOCK_PERCENT * 10;
  const UNIVERSAL_STOCK_MG_PER_DROP = UNIVERSAL_STOCK_MG_PER_ML / DROPS_PER_ML;
  type BrewerPrepMethod = 'dry' | 'dropper';
  const [prepMethod, setPrepMethod] = useState<BrewerPrepMethod>('dropper');
  const [stocksReady, setStocksReady] = useState(false);
  const [makeWaterOpen, setMakeWaterOpen] = useState(false);
  const [makeWaterStage, setMakeWaterStage] = useState<'choice' | 'prep' | 'dose'>('choice');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [pantryBottleMl, setPantryBottleMl] = useState('60');
  const [pantryCustomMl, setPantryCustomMl] = useState('150');
  const [calciumAvailable, setCalciumAvailable] = useState(true);
  const simpleSalts = [
    { id: 'mgso4', label: 'Epsom salt', note: 'brightness & fruit' },
    { id: 'nahco3', label: 'Baking soda', note: 'softens acidity' },
    { id: 'nacl', label: 'Table salt', note: 'sweetness & balance' },
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
    simpleSalts.push({ id: 'cacl2', label: 'Calcium chloride', note: 'optional extra body' });
  }

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
  const activeSimpleSalts = simpleSalts.filter(salt => (effectiveSaltTargets[salt.id] ?? 0) > 0);
  const pantrySalts = [
    { id: 'mgso4', label: 'Epsom salt', note: 'brightness & fruit' },
    { id: 'nahco3', label: 'Baking soda', note: 'buffer & sweetness' },
    { id: 'nacl', label: 'Table salt', note: 'roundness & balance' },
    { id: 'cacl2', label: 'Calcium chloride', note: 'body & structure' },
  ];
  const recipeSalts = activeSimpleSalts.filter(salt => calciumAvailable || salt.id !== 'cacl2');
  const completedRecipeSaltCount = recipeSalts.filter(salt => completedSteps[salt.id]).length;
  const waterReady = recipeSalts.length > 0
    && completedRecipeSaltCount === recipeSalts.length
    && (prepMethod !== 'dropper' || stocksReady);
  const openMakeWaterChecklist = () => {
    setCompletedSteps({});
    setMakeWaterOpen(true);
    setMakeWaterStage(prepMethod === 'dropper' && !stocksReady ? 'choice' : 'dose');
  };

  return (
    <div className="border-b border-slate-700/40 bg-emerald-500/5 px-4 py-4 sm:px-6">
      <div className="rounded-xl border border-sky-400/20 bg-slate-900/30 p-2">
        <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
          Choose your dosing method
        </div>
        <div role="tablist" aria-label="Recipe dosing method" className="grid gap-1 sm:grid-cols-2">
          {([
            ['dry', 'Dry salt direct', 'Measure the recipe with a scale'],
            ['dropper', 'Dropper stocks', 'Craft once, then dose by drops'],
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
      <div className="mt-3 rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/15 via-slate-900/25 to-violet-500/10 p-4 shadow-[0_0_24px_-12px_rgba(52,211,153,0.5)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Your starting recipe
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {liters || 1} L batch · RO / distilled 0 TDS · {prepMethod === 'dropper' ? 'Dropper stocks' : 'Dry salt direct'}
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-400/20 px-4 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-400/30 hover:shadow-lg hover:shadow-emerald-500/10 active:scale-[0.99]"
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
        <div className="mt-3 rounded-xl border border-emerald-400/25 bg-slate-950/25 p-3">
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
                {pantrySalts.filter(salt => calciumAvailable || salt.id !== 'cacl2').map(salt => (
                  <div key={`prep-${salt.id}`} className="flex items-center justify-between rounded-lg bg-slate-950/25 px-3 py-2">
                    <span className="text-xs text-slate-200">{salt.label}</span>
                    <span className="font-mono text-xs font-semibold text-violet-200">{universalStockMassLabel()}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
                Put <strong className="text-slate-200">{universalStockMassLabel()}</strong> of each listed salt into its own bottle, then fill each to <strong className="text-slate-200">{pantryBottleMl} mL</strong> with distilled or RO water. Cap and shake.
              </p>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                Label each bottle with the salt, {pantryBottleMl} mL, and the date. For consistent dosing, verify that your dropper delivers about 20 drops per mL.
              </p>
              {calciumTarget > 0.05 && (
                <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-700/50 bg-slate-950/20 px-3 py-2 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={!calciumAvailable}
                    onChange={event => setCalciumAvailable(!event.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 accent-violet-400"
                  />
                  <span>
                    I don’t have calcium chloride
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
                    <span className={`font-mono text-xs font-semibold ${isComplete ? 'text-emerald-300' : 'text-violet-200'}`}>
                      {prepMethod === 'dropper' ? `${getUniversalDrops(salt.id)} drops` : getMassLabel(salt.id)}
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
    nacl: 'Table salt',
  };
  const amount = (salt: typeof SALTS[number], targets = saltTargets) => {
    const target = targets[salt.id] ?? 0;
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
    if (dosingMethod === 'dry') return amount(salt, targets);
    const target = targets[salt.id] ?? 0;
    const saltIndex = SALTS.findIndex(item => item.id === salt.id);
    const formIndex = saltIndex >= 0
      ? recipeRows[saltIndex]?.formIdx ?? salt.defaultFormIdx ?? 0
      : salt.defaultFormIdx ?? 0;
    const form = salt.hydrationForms[formIndex] ?? salt.hydrationForms[salt.defaultFormIdx ?? 0];
    const physicalSaltMg = computeSaltMg(target, liters || 1, form.molarMass, salt.anhydrousMass);
    const drops = Math.max(1, Math.round(physicalSaltMg / 2.5));
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
  const stepSalts = hasBaseWater ? suggestedSalts : recipeSalts;
  const stepSaltTargets = hasBaseWater ? suggestedSaltTargets : saltTargets;
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
  const useMixingVessel = batchMl > 1000 && orderedRecipeSalts.length > 0;
  const mixingVesselMl = useMixingVessel ? Math.min(500, batchMl) : batchMl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-sky-400/25 bg-slate-800 shadow-2xl sm:max-h-[calc(100dvh-2rem)]"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-700/50 bg-gradient-to-r from-sky-500/15 to-emerald-500/10 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <div className="flex items-center gap-2 text-sky-200">
              <ListChecks className="h-5 w-5" />
              <h2 className="text-base font-semibold">Your recipe steps</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">A simple guide for the recipe currently selected above.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-slate-100" aria-label="Close recipe steps">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="space-y-4 p-4 sm:p-5">
            {hasBaseWater ? (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Missing ions</div>
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
                            : covered ? '✓ Covered' : `${remaining.toFixed(1)} ppm`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Suggested salts</div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {suggestedSalts.map(salt => {
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
                           <span className="font-mono text-xs text-emerald-300">{amountLabel(salt, suggestedSaltTargets)}</span>
                        </div>
                        {nerdLevel !== 'brewer' && (
                          <div className="mt-0.5 text-[11px] text-slate-500">{salt.formula} · {form.label}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                 <div className="mt-3 flex items-center justify-between border-t border-emerald-400/15 pt-3">
                   <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Expected final TDS</span>
                   <span className="font-mono text-sm font-semibold text-emerald-200">{tdsTarget.toFixed(0)} ppm</span>
                 </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Add to {volumeLabel}</div>
                <div className="mt-2 space-y-2">
                  {recipeSalts.map(salt => {
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
                           <span className="font-mono text-xs text-emerald-300">{amountLabel(salt)}</span>
                        </div>
                        {nerdLevel !== 'brewer' && (
                          <div className="mt-0.5 text-[11px] text-slate-500">{salt.formula} · {form.label}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                 <div className="mt-3 flex items-center justify-between border-t border-emerald-400/15 pt-3">
                   <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Expected final TDS</span>
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
                <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">Base water used</div>
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
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-200">1</span>
              <div>
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
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-200">2</span>
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
                        <div key={`step-salt-${salt.id}`} className="rounded-lg bg-slate-900/45 px-3 py-2">
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
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-200">3</span>
                <div>
                  <div className="text-sm font-medium text-slate-200">Combine and top up</div>
                  <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                    Dissolve the salts in {formatWaterVolume(mixingVesselMl)} first, then add the mineral concentrate to the remaining water and stir thoroughly.
                  </div>
                </div>
              </li>
            )}
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-xs font-semibold text-sky-200">{useMixingVessel ? 4 : orderedRecipeSalts.length > 0 ? 3 : 2}</span>
              <div>
                <div className="text-sm font-medium text-slate-200">Verify and brew</div>
                <div className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  Check for approximately {tdsTarget.toFixed(0)} ppm TDS. The water should be clear and all minerals fully dissolved. Proceed with your brew method and adjust extraction to taste.
                </div>
              </div>
            </li>
          </ol>
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
            {isOnTarget ? '✓ Check — on target' : targetDifference < 0 ? `Add ${formatted(Math.abs(targetDifference))} g to reach the cumulative target` : `Remove ${formatted(targetDifference)} g to reach the cumulative target`}
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
}: {
  flavor: BrewerFlavorInput;
  suggestedIons: Record<IonId, number>;
  onChange: (flavor: BrewerFlavorInput) => void;
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
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-300">Build by flavor</div>
          <p className="mt-1 text-xs text-slate-400">
            RO / distilled 0 TDS water · Click anywhere in the pyramid or drag the star. Your starting recipe updates instantly.
          </p>
        </div>
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
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Suggested direction</div>
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
          Based on the final source-water-plus-salts mixture and Aiki&apos;s light-roast pourover ranges.
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
          const row = rows[saltIdx];
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
    <div className="bg-slate-900/40 rounded-xl border border-slate-700/40 px-4 py-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-cyan-300">{value.toFixed(1)}</span>
        <span className="text-sm text-slate-400">ppm CaCO₃</span>
      </div>
      <div className="flex gap-4 text-xs">
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
    <div className="bg-slate-900/40 rounded-xl border border-slate-700/40 px-4 py-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
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
    <div className="bg-slate-900/40 rounded-xl border border-slate-700/40 px-4 py-3">
      <div className="text-xs text-slate-400 mb-1">Total Dissolved Solids (TDS)</div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-cyan-300">{value.toFixed(1)}</span>
        <span className="text-sm text-slate-400">mg/L</span>
      </div>
      <div className="flex gap-4 text-xs">
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
    <details className="group bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
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
      <div className="border-t border-slate-700/40 px-4 py-4 sm:px-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
            <div className="text-xs text-slate-400">Estimated final pH</div>
            <div className="mt-1 text-2xl font-bold text-cyan-300">
              {hasEstimate ? estimate.toFixed(2) : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
            <div className="text-xs text-slate-400">Base-water pH</div>
            <div className="mt-1 text-2xl font-bold text-slate-200">
              {basePH !== undefined ? basePH.toFixed(2) : '—'}
            </div>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
            <div className="text-xs text-slate-400">Base alkalinity</div>
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

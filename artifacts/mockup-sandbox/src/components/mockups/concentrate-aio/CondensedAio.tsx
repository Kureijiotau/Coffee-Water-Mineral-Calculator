import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Beaker,
  ChevronDown,
  CircleCheck,
  FlaskConical,
  Info,
  Layers3,
  Ruler,
  Scale,
  Sparkles,
} from 'lucide-react';
import './_group.css';
import './CondensedAio.css';

type DropperStyle = 'straight' | 'round';
type VolumeUnit = 'liters' | 'gallons';
type RecipeMode = 'GH + KH' | 'All-in-one' | 'Separate salts';
type SaltColor = 'cyan' | 'violet' | 'amber' | 'sky';

type RecipeSalt = {
  name: string;
  formula: string;
  form: string;
  target: number;
  color: SaltColor;
};

type ConcentrateGroup = {
  id: string;
  name: string;
  helper: string;
  color: SaltColor;
  salts: RecipeSalt[];
};

const recipeSalts: RecipeSalt[] = [
  { name: 'Magnesium sulfate', formula: 'MgSO₄', form: 'Epsom salt · heptahydrate', target: 9.2, color: 'cyan' },
  { name: 'Calcium chloride', formula: 'CaCl₂', form: 'Dihydrate', target: 6.8, color: 'violet' },
  { name: 'Sodium bicarbonate', formula: 'NaHCO₃', form: 'Anhydrous', target: 20, color: 'amber' },
  { name: 'Sodium chloride', formula: 'NaCl', form: 'Fine grain', target: 3.5, color: 'sky' },
];

const MAX_SAFE_STRENGTH = 500;
const US_GALLON_IN_LITERS = 3.785411784;

function number(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compact(value: number, digits = 1) {
  return value.toFixed(digits).replace(/\.0+$/, '');
}

function volumeToLiters(value: string, unit: VolumeUnit) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return unit === 'gallons' ? parsed * US_GALLON_IN_LITERS : parsed;
}

function litersToVolumeValue(liters: number, unit: VolumeUnit) {
  const value = unit === 'gallons' ? liters / US_GALLON_IN_LITERS : liters;
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function volumeUnitLabel(unit: VolumeUnit) {
  return unit === 'gallons' ? 'gallons' : 'liters';
}

function volumeUnitShortLabel(unit: VolumeUnit) {
  return unit === 'gallons' ? 'gal' : 'L';
}

function modeGroupsFor(mode: RecipeMode): ConcentrateGroup[] {
  if (mode === 'GH + KH') {
    return [
      {
        id: 'hardness',
        name: 'Hardness stock',
        helper: 'Calcium, magnesium, and chloride support.',
        color: 'sky',
        salts: recipeSalts.filter(salt => salt.name !== 'Sodium bicarbonate'),
      },
      {
        id: 'alkalinity',
        name: 'Alkalinity stock',
        helper: 'Bicarbonate buffer for the finished water.',
        color: 'violet',
        salts: recipeSalts.filter(salt => salt.name === 'Sodium bicarbonate'),
      },
    ];
  }

  if (mode === 'Separate salts') {
    return recipeSalts.map(salt => ({
      id: `salt-${salt.name.toLowerCase().replaceAll(' ', '-')}`,
      name: `${salt.name} stock`,
      helper: `${salt.form} · one bottle for this salt.`,
      color: salt.color,
      salts: [salt],
    }));
  }

  return [{
    id: 'all-in-one',
    name: 'All-in-one stock',
    helper: 'Every active salt shares one bottle.',
    color: 'violet',
    salts: recipeSalts,
  }];
}

function groupTone(group: ConcentrateGroup) {
  return `aio-tone-${group.color}`;
}

function groupMaxSafeStrength(_group: ConcentrateGroup) {
  return MAX_SAFE_STRENGTH;
}

function ConcentrateBottleCard({
  group,
  strengthInput,
  volumeInput,
  waterInputValue,
  waterLiters,
  displayedWaterVolume,
  volumeUnit,
  dropperStyle,
  calibrationMode,
  measuredDropsInput,
  measuredMlInput,
  onStrengthChange,
  onVolumeChange,
  onWaterVolumeChange,
  onToggleVolumeUnit,
  onDropperStyleChange,
  onCalibrationToggle,
  onMeasuredDropsChange,
  onMeasuredMlChange,
}: {
  group: ConcentrateGroup;
  strengthInput: string;
  volumeInput: string;
  waterInputValue: string;
  waterLiters: number;
  displayedWaterVolume: number;
  volumeUnit: VolumeUnit;
  dropperStyle: DropperStyle;
  calibrationMode: 'assumed' | 'measured';
  measuredDropsInput: string;
  measuredMlInput: string;
  onStrengthChange: (value: string) => void;
  onVolumeChange: (value: string) => void;
  onWaterVolumeChange: (value: string) => void;
  onToggleVolumeUnit: () => void;
  onDropperStyleChange: (style: DropperStyle) => void;
  onCalibrationToggle: () => void;
  onMeasuredDropsChange: (value: string) => void;
  onMeasuredMlChange: (value: string) => void;
}) {
  const maxSafeStrength = groupMaxSafeStrength(group);
  const strength = Math.min(maxSafeStrength, Math.max(1, number(strengthInput, maxSafeStrength)));
  const stockVolumeMl = Math.max(1, number(volumeInput, 100));
  const assumedDropsPerMl = dropperStyle === 'straight' ? 20 : 11.2;
  const measuredDropsPerMl = Math.max(
    0.1,
    number(measuredDropsInput, assumedDropsPerMl) / Math.max(0.01, number(measuredMlInput, 1)),
  );
  const dropsPerMl = calibrationMode === 'measured' ? measuredDropsPerMl : assumedDropsPerMl;
  const totalTarget = group.salts.reduce((sum, salt) => sum + salt.target, 0);
  const stockSaltMgPerMl = totalTarget * strength / 1000;
  const stockSaltMassG = stockSaltMgPerMl * stockVolumeMl / 1000;
  const stockWaterMassG = Math.max(0, stockVolumeMl - stockSaltMassG);
  const saltMgPerDrop = stockSaltMgPerMl / dropsPerMl;
  const batchDrops = 1000 / strength * dropsPerMl * waterLiters;
  const stockDoseMl = 1000 / strength * waterLiters;
  const calibrationLabel = calibrationMode === 'measured'
    ? `${compact(dropsPerMl, 1)} measured drops/mL`
    : `${compact(assumedDropsPerMl, 1)} ${dropperStyle} drops/mL assumption`;
  const tone = groupTone(group);

  return (
    <article className={`aio-bottle-card aio-card rounded-xl p-3 sm:p-4 ${tone}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="aio-bottle-icon flex h-8 w-8 items-center justify-center rounded-lg border">
            <Beaker className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <div className="aio-bottle-heading text-[9px] font-bold uppercase tracking-[0.18em]">{group.name}</div>
            <div className="mt-0.5 text-[10px] text-slate-500">{group.helper}</div>
          </div>
        </div>
        <span className="aio-bottle-badge rounded-full border px-2 py-1 text-[9px] font-semibold">one bottle</span>
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
                  aria-label={`${group.name} stock strength`}
                  className="aio-input w-full min-w-0 bg-transparent text-4xl font-semibold tracking-tight text-white outline-none"
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
                  aria-label={`${group.name} bottle volume in milliliters`}
                  className="aio-input w-full min-w-0 bg-transparent text-4xl font-semibold tracking-tight text-white outline-none"
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
            className="aio-range mt-3 h-1.5 w-full cursor-pointer"
            type="range"
            min="1"
            max={maxSafeStrength}
            value={strength}
            onChange={event => onStrengthChange(event.target.value)}
            aria-label={`Adjust ${group.name} strength`}
          />
          <div className="mt-2 flex justify-between text-[9px] tabular-nums text-slate-600">
            <span>×1</span>
            <span>lower strength = more drops</span>
            <span>×{maxSafeStrength}</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="aio-bottle-metric-primary rounded-lg border px-3 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em]">Salt to weigh</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{compact(stockSaltMassG, 2)} g</div>
              <div className="mt-0.5 text-[9px]">for this bottle</div>
            </div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Water to add</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{compact(stockWaterMassG, 1)} g</div>
              <div className="mt-0.5 text-[9px] text-slate-500">distilled or RO</div>
            </div>
          </div>

          <div className="aio-dropper-panel mt-4 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Ruler className="h-3.5 w-3.5 text-amber-200/75" aria-hidden="true" />
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-100/70">Dropper setup</span>
              </div>
              <span className="text-[9px] text-slate-500">{calibrationLabel}</span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-slate-700/60 bg-slate-950/40 p-1">
              {(['straight', 'round'] as DropperStyle[]).map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => onDropperStyleChange(style)}
                  aria-pressed={dropperStyle === style}
                  data-active={dropperStyle === style}
                  className="aio-dropper-segment rounded-md px-2 py-1.5 text-[10px] font-semibold capitalize transition"
                >
                  {style} tip · {style === 'straight' ? '20' : '11.2'}/mL
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-[10px]">
              <span className="text-slate-500">Use measured calibration</span>
              <button
                type="button"
                onClick={onCalibrationToggle}
                aria-pressed={calibrationMode === 'measured'}
                data-active={calibrationMode === 'measured'}
                className="aio-calibration-toggle rounded-full px-2 py-1 font-semibold transition"
              >
                {calibrationMode === 'measured' ? 'On' : 'Optional'}
              </button>
            </div>
            {calibrationMode === 'measured' && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-2.5 py-2">
                  <span className="block text-[9px] text-slate-500">Drops counted</span>
                  <input
                    type="number"
                    min="1"
                    value={measuredDropsInput}
                    onChange={event => onMeasuredDropsChange(event.target.value)}
                    className="aio-input mt-1 w-full bg-transparent text-sm font-semibold tabular-nums text-white outline-none"
                    aria-label={`${group.name} measured drops counted`}
                  />
                </label>
                <label className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-2.5 py-2">
                  <span className="block text-[9px] text-slate-500">Measured volume</span>
                  <span className="mt-1 flex items-center gap-1">
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={measuredMlInput}
                      onChange={event => onMeasuredMlChange(event.target.value)}
                      className="aio-input w-full bg-transparent text-sm font-semibold tabular-nums text-white outline-none"
                      aria-label={`${group.name} measured calibration volume in milliliters`}
                    />
                    <span className="text-[10px] text-slate-500">mL</span>
                  </span>
                </label>
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 text-[9px] leading-relaxed text-slate-500">
              <Info className="h-3.5 w-3.5 shrink-0 text-amber-200/70" aria-hidden="true" />
              Calibration changes drop size only, not recipe chemistry.
            </div>
          </div>
        </section>

        <section className="aio-bottle-dose rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em]">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Dose the final water
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <strong className="text-5xl font-semibold tracking-[-0.05em] text-white">{Math.round(batchDrops)}</strong>
                <span className="text-sm font-medium">drops / {compact(stockDoseMl, 2)} mL</span>
              </div>
              <div className="mt-1 text-[11px]">for {compact(displayedWaterVolume, 2)} {volumeUnitShortLabel(volumeUnit)} final water</div>
            </div>
            <div className="aio-bottle-dose-metric rounded-lg border px-2.5 py-2 text-right">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em]">1 drop adds</div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{compact(saltMgPerDrop / waterLiters, 2)}</div>
              <div className="text-[9px]">salt ppm</div>
            </div>
          </div>
          <label className="mt-4 block">
            <span className="flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.16em]">
              <span>Final water ({volumeUnitShortLabel(volumeUnit)})</span>
              <button
                type="button"
                onClick={onToggleVolumeUnit}
                className="aio-volume-toggle"
                aria-label={`Switch volume units to ${volumeUnit === 'liters' ? 'gallons' : 'liters'}`}
              >
                {volumeUnitLabel(volumeUnit)}
              </button>
            </span>
            <span className="mt-1.5 flex items-center gap-2 rounded-lg border px-3 py-2">
              <input
                type="number"
                min={volumeUnit === 'gallons' ? '0.01' : '0.1'}
                step={volumeUnit === 'gallons' ? '0.01' : '0.1'}
                value={waterInputValue}
                onChange={event => onWaterVolumeChange(event.target.value)}
                aria-label={`${group.name} final water volume in ${volumeUnitLabel(volumeUnit)}`}
                className="aio-input w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none"
              />
              <span className="text-xs font-semibold">{volumeUnitShortLabel(volumeUnit)}</span>
            </span>
          </label>
        </section>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {group.salts.map(salt => (
          <div key={salt.name} className={`aio-salt-row aio-salt-${salt.color} rounded-lg px-3 py-2.5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <span className="aio-salt-dot mt-1.5 h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold text-slate-100">{salt.name}</div>
                  <div className="mt-0.5 truncate text-[9px] text-slate-500">{salt.form} · {salt.formula}</div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="aio-salt-accent text-[10px] font-semibold tabular-nums">{compact(salt.target, 1)} ppm/L</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

export function CondensedAio() {
  const [strengthInput, setStrengthInput] = useState(String(MAX_SAFE_STRENGTH));
  const [stockVolumeInput, setStockVolumeInput] = useState('100');
  const [waterLitersInput, setWaterLitersInput] = useState('1');
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>('liters');
  const [dropperStyle, setDropperStyle] = useState<DropperStyle>('straight');
  const [calibrationMode, setCalibrationMode] = useState<'assumed' | 'measured'>('assumed');
  const [measuredDropsInput, setMeasuredDropsInput] = useState('20');
  const [measuredMlInput, setMeasuredMlInput] = useState('1');
  const [recipeMode, setRecipeMode] = useState<RecipeMode>('All-in-one');
  const [modeStrengthInputs, setModeStrengthInputs] = useState<Record<string, string>>({});
  const [modeVolumeInputs, setModeVolumeInputs] = useState<Record<string, string>>({});
  const [modeDropperStyles, setModeDropperStyles] = useState<Record<string, DropperStyle>>({});
  const [modeCalibrationModes, setModeCalibrationModes] = useState<Record<string, 'assumed' | 'measured'>>({});
  const [modeMeasuredDropsInputs, setModeMeasuredDropsInputs] = useState<Record<string, string>>({});
  const [modeMeasuredMlInputs, setModeMeasuredMlInputs] = useState<Record<string, string>>({});
  const [safetyOpen, setSafetyOpen] = useState(false);

  const modeGroups = useMemo(() => modeGroupsFor(recipeMode), [recipeMode]);
  const strength = Math.min(MAX_SAFE_STRENGTH, Math.max(1, number(strengthInput, MAX_SAFE_STRENGTH)));
  const stockVolumeMl = Math.max(1, number(stockVolumeInput, 100));
  const waterLiters = Math.max(0.01, volumeToLiters(waterLitersInput, volumeUnit));
  const displayedWaterVolume = waterLiters / (volumeUnit === 'gallons' ? US_GALLON_IN_LITERS : 1);
  const assumedDropsPerMl = dropperStyle === 'straight' ? 20 : 11.2;
  const measuredDropsPerMl = Math.max(
    0.1,
    number(measuredDropsInput, assumedDropsPerMl) / Math.max(0.01, number(measuredMlInput, 1)),
  );
  const dropsPerMl = calibrationMode === 'measured' ? measuredDropsPerMl : assumedDropsPerMl;
  const totalRecipeTarget = recipeSalts.reduce((sum, salt) => sum + salt.target, 0);
  const stockSaltMgPerMl = totalRecipeTarget * strength / 1000;
  const stockSaltMassG = stockSaltMgPerMl * stockVolumeMl / 1000;
  const stockWaterMassG = Math.max(0, stockVolumeMl - stockSaltMassG);
  const saltMgPerDrop = stockSaltMgPerMl / dropsPerMl;
  const dropsPerLiter = 1000 / strength * dropsPerMl;
  const batchDrops = dropsPerLiter * waterLiters;
  const ppmPerDrop = saltMgPerDrop / waterLiters;
  const stockDoseMl = 1000 / strength * waterLiters;

  const maxStatus = strength === MAX_SAFE_STRENGTH
    ? 'At modeled ceiling'
    : `${compact(MAX_SAFE_STRENGTH - strength)}× room below ceiling`;
  const calibrationLabel = calibrationMode === 'measured'
    ? `${compact(dropsPerMl, 1)} measured drops/mL`
    : `${compact(assumedDropsPerMl, 1)} ${dropperStyle} drops/mL assumption`;

  const saltRows = useMemo(
    () => recipeSalts.map(salt => ({
      ...salt,
      mgPerMl: salt.target * strength / 1000,
      mgPerDrop: salt.target * strength / 1000 / dropsPerMl,
    })),
    [dropsPerMl, strength],
  );

  const setStrength = (value: string) => {
    const next = Math.min(MAX_SAFE_STRENGTH, Math.max(1, number(value, 1)));
    setStrengthInput(String(next));
  };

  const setModeStrength = (groupId: string, value: string) => {
    const next = Math.min(MAX_SAFE_STRENGTH, Math.max(1, number(value, 1)));
    setModeStrengthInputs(previous => ({ ...previous, [groupId]: String(next) }));
  };

  const toggleVolumeUnit = () => {
    const nextUnit = volumeUnit === 'liters' ? 'gallons' : 'liters';
    setWaterLitersInput(litersToVolumeValue(waterLiters, nextUnit));
    setVolumeUnit(nextUnit);
  };

  const modeHeader = recipeMode === 'GH + KH'
    ? {
        badge: 'GH + KH',
        description: 'compatible minerals stay in separate bottles',
        heading: 'Two bottles. One balanced water.',
        intro: 'Prepare each compatible stock, then add both to the finished water.',
      }
    : recipeMode === 'Separate salts'
    ? {
        badge: 'Separate salts',
        description: 'one bottle per active salt',
        heading: 'One bottle per salt.',
        intro: 'Tune each stock independently, then dose every bottle into the finished water.',
      }
    : {
        badge: 'All-in-one',
        description: 'recipe proportions stay locked',
        heading: 'One bottle. One answer.',
        intro: 'Set the stock strength once, then dose the finished water in drops.',
      };

  return (
    <main className="aio-shell aio-grid min-h-screen p-3 text-slate-100 sm:p-5">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-200 shadow-lg shadow-fuchsia-950/20">
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-fuchsia-200/65">Concentrate / {recipeMode}</div>
              <h1 className="truncate text-base font-semibold text-white sm:text-lg">Balanced pourover recipe</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/[0.08] px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {modeGroups.length} {modeGroups.length === 1 ? 'bottle' : 'bottles'}
          </div>
        </header>

        <div className="mb-4 flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-950/45 p-1 shadow-xl">
          {([
            ['All-in-one', 'Every active salt shares one bottle'],
            ['GH + KH', 'Separate compatible groups'],
            ['Separate salts', 'One bottle per active salt'],
          ] as Array<[RecipeMode, string]>).map(([label, description]) => (
            <button
              key={label}
              type="button"
               onClick={() => setRecipeMode(label)}
               aria-pressed={label === recipeMode}
              title={description}
              className={`flex-1 rounded-lg px-2 py-2 text-[10px] font-semibold transition sm:text-xs ${
                 label === recipeMode
                  ? 'bg-fuchsia-400/15 text-fuchsia-100 ring-1 ring-fuchsia-300/25'
                  : 'text-slate-500 hover:bg-slate-800/70 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="aio-glass overflow-hidden rounded-2xl">
          <div className="border-b border-slate-700/50 bg-gradient-to-r from-fuchsia-500/[0.12] via-transparent to-cyan-400/[0.08] px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-fuchsia-200">{modeHeader.badge}</span>
                  <span className="text-[10px] text-slate-500">{modeHeader.description}</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{modeHeader.heading}</h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
                  {modeHeader.intro}
                </p>
              </div>
              <div className="min-w-[150px] rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] px-3 py-2.5 text-right">
                <div className="flex items-center justify-end gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300/75">
                  <CircleCheck className="h-3 w-3" aria-hidden="true" />
                  {maxStatus}
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-emerald-100">Max ×{MAX_SAFE_STRENGTH}</div>
              </div>
            </div>
          </div>

          {recipeMode === 'All-in-one' ? (
          <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="aio-card aio-prepare-card rounded-xl p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="aio-prepare-icon flex h-8 w-8 items-center justify-center rounded-lg border">
                    <Beaker className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="aio-prepare-heading text-[9px] font-bold uppercase tracking-[0.18em]">Prepare concentrate</div>
                    <div className="mt-0.5 text-[10px] text-slate-500">Weigh the blend, then fill this bottle.</div>
                  </div>
                </div>
                <span className="rounded-full border border-amber-200/15 bg-amber-300/[0.07] px-2 py-1 text-[9px] font-semibold text-amber-100/65">bottle recipe</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Stock strength</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <input
                      value={strengthInput}
                      onChange={event => setStrength(event.target.value)}
                      type="number"
                      min="1"
                      max={MAX_SAFE_STRENGTH}
                      step="1"
                      aria-label="All-in-one stock strength"
                      className="aio-input w-full min-w-0 bg-transparent text-4xl font-semibold tracking-tight text-white outline-none"
                    />
                    <span className="text-lg text-slate-500">×</span>
                  </div>
                  <div className="mt-1 text-[9px] text-slate-600">recipe target multiplier</div>
                </div>
                <label className="block">
                  <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Bottle volume</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <input
                      value={stockVolumeInput}
                      onChange={event => setStockVolumeInput(event.target.value)}
                      type="number"
                      min="1"
                      step="10"
                      aria-label="All-in-one bottle volume in milliliters"
                      className="aio-input w-full min-w-0 bg-transparent text-4xl font-semibold tracking-tight text-white outline-none"
                    />
                    <span className="text-lg text-slate-500">mL</span>
                  </div>
                  <div className="mt-1 text-[9px] text-slate-600">how much to make</div>
                </label>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-[10px] text-slate-500">
                <span>safe ceiling ×{MAX_SAFE_STRENGTH}</span>
                <button
                  type="button"
                  onClick={() => setStrengthInput(String(MAX_SAFE_STRENGTH))}
                  className="font-semibold tabular-nums text-emerald-300 transition hover:text-emerald-200"
                >
                  Apply maximum
                </button>
              </div>
              <input
                className="aio-range mt-3 h-1.5 w-full cursor-pointer"
                type="range"
                min="1"
                max={MAX_SAFE_STRENGTH}
                value={strength}
                onChange={event => setStrength(event.target.value)}
                aria-label="Adjust stock strength"
              />
              <div className="mt-2 flex justify-between text-[9px] tabular-nums text-slate-600">
                <span>×1</span>
                <span>lower strength = more drops</span>
                <span>×{MAX_SAFE_STRENGTH}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-fuchsia-300/15 bg-fuchsia-400/[0.07] px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-fuchsia-200/65">Salt to weigh</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-fuchsia-100">{compact(stockSaltMassG, 2)} g</div>
                  <div className="mt-0.5 text-[9px] text-fuchsia-100/45">for this bottle</div>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Water to add</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{compact(stockWaterMassG, 1)} g</div>
                  <div className="mt-0.5 text-[9px] text-slate-500">distilled or RO</div>
                </div>
              </div>
              <div className="aio-dropper-panel mt-4 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-3.5 w-3.5 text-amber-200/75" aria-hidden="true" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-100/70">Dropper setup</span>
                  </div>
                  <span className="text-[9px] text-slate-500">{calibrationLabel}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg border border-slate-700/60 bg-slate-950/40 p-1">
                  {(['straight', 'round'] as DropperStyle[]).map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setDropperStyle(style)}
                      aria-pressed={dropperStyle === style}
                      data-active={dropperStyle === style}
                      className="aio-dropper-segment rounded-md px-2 py-1.5 text-[10px] font-semibold capitalize transition"
                    >
                      {style} tip · {style === 'straight' ? '20' : '11.2'}/mL
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-[10px]">
                  <span className="text-slate-500">Use measured calibration</span>
                  <button
                    type="button"
                    onClick={() => setCalibrationMode(mode => mode === 'assumed' ? 'measured' : 'assumed')}
                    aria-pressed={calibrationMode === 'measured'}
                    data-active={calibrationMode === 'measured'}
                    className="aio-calibration-toggle rounded-full px-2 py-1 font-semibold transition"
                  >
                    {calibrationMode === 'measured' ? 'On' : 'Optional'}
                  </button>
                </div>
                {calibrationMode === 'measured' && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-2.5 py-2">
                      <span className="block text-[9px] text-slate-500">Drops counted</span>
                      <input
                        type="number"
                        min="1"
                        value={measuredDropsInput}
                        onChange={event => setMeasuredDropsInput(event.target.value)}
                        className="aio-input mt-1 w-full bg-transparent text-sm font-semibold tabular-nums text-white outline-none"
                        aria-label="Measured drops counted"
                      />
                    </label>
                    <label className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-2.5 py-2">
                      <span className="block text-[9px] text-slate-500">Measured volume</span>
                      <span className="mt-1 flex items-center gap-1">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={measuredMlInput}
                          onChange={event => setMeasuredMlInput(event.target.value)}
                          className="aio-input w-full bg-transparent text-sm font-semibold tabular-nums text-white outline-none"
                          aria-label="Measured calibration volume in milliliters"
                        />
                        <span className="text-[10px] text-slate-500">mL</span>
                      </span>
                    </label>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 text-[9px] leading-relaxed text-slate-500">
                  <Info className="h-3.5 w-3.5 shrink-0 text-amber-200/70" aria-hidden="true" />
                  Calibration changes drop size only, not recipe chemistry.
                </div>
              </div>
            </section>

            <section className="aio-pulse rounded-xl border border-emerald-300/30 bg-gradient-to-br from-emerald-400/[0.15] via-cyan-400/[0.08] to-slate-950/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                     <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200/80">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Dose the final water
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <strong className="text-5xl font-semibold tracking-[-0.05em] text-white">{Math.round(batchDrops)}</strong>
                       <span className="text-sm font-medium text-emerald-100/75">drops / {compact(stockDoseMl, 2)} mL</span>
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-100/65">
                       for {compact(displayedWaterVolume, 2)} {volumeUnitShortLabel(volumeUnit)} final water
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-2.5 py-2 text-right">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200/65">1 drop adds</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-emerald-50">{compact(ppmPerDrop, 2)}</div>
                  <div className="text-[9px] text-emerald-100/60">salt ppm</div>
                </div>
              </div>
              <label className="mt-4 block">
                 <span className="flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-100/60">
                   <span>Final water ({volumeUnitShortLabel(volumeUnit)})</span>
                   <button
                     type="button"
                      onClick={toggleVolumeUnit}
                     className="aio-volume-toggle"
                     aria-label={`Switch volume units to ${volumeUnit === 'liters' ? 'gallons' : 'liters'}`}
                     title={`Switch to ${volumeUnit === 'liters' ? 'gallons' : 'liters'}`}
                   >
                     {volumeUnitLabel(volumeUnit)}
                   </button>
                 </span>
                <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-emerald-200/20 bg-slate-950/30 px-3 py-2">
                  <input
                    type="number"
                     min={volumeUnit === 'gallons' ? '0.01' : '0.1'}
                     step={volumeUnit === 'gallons' ? '0.01' : '0.1'}
                    value={waterLitersInput}
                    onChange={event => setWaterLitersInput(event.target.value)}
                     aria-label={`Final water volume in ${volumeUnitLabel(volumeUnit)}`}
                    className="aio-input w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none"
                  />
                   <span className="text-xs font-semibold text-emerald-100/60">{volumeUnitShortLabel(volumeUnit)}</span>
                </span>
              </label>
            </section>
          </div>
          ) : (
            <div className="grid gap-3 p-3 sm:p-4">
              <div className="aio-mode-summary rounded-xl border border-slate-700/60 bg-slate-950/25 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                      <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-100">
                        {recipeMode === 'GH + KH' ? 'Compatible stock bottles' : 'Independent salt bottles'}
                      </div>
                      <div className="mt-0.5 text-[10px] text-slate-500">
                        {modeGroups.length} bottles · each dose uses the same final-water amount
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold tabular-nums text-cyan-100/75">
                    {compact(displayedWaterVolume, 2)} {volumeUnitShortLabel(volumeUnit)} final water
                  </div>
                </div>
              </div>

              {modeGroups.map(group => (
                <ConcentrateBottleCard
                  key={group.id}
                  group={group}
                  strengthInput={modeStrengthInputs[group.id] ?? String(MAX_SAFE_STRENGTH)}
                  volumeInput={modeVolumeInputs[group.id] ?? '100'}
                  waterInputValue={waterLitersInput}
                  waterLiters={waterLiters}
                  displayedWaterVolume={displayedWaterVolume}
                  volumeUnit={volumeUnit}
                  dropperStyle={modeDropperStyles[group.id] ?? 'straight'}
                  calibrationMode={modeCalibrationModes[group.id] ?? 'assumed'}
                  measuredDropsInput={modeMeasuredDropsInputs[group.id] ?? '20'}
                  measuredMlInput={modeMeasuredMlInputs[group.id] ?? '1'}
                  onStrengthChange={value => setModeStrength(group.id, value)}
                  onVolumeChange={value => setModeVolumeInputs(previous => ({ ...previous, [group.id]: value }))}
                  onWaterVolumeChange={setWaterLitersInput}
                  onToggleVolumeUnit={toggleVolumeUnit}
                  onDropperStyleChange={style => setModeDropperStyles(previous => ({ ...previous, [group.id]: style }))}
                  onCalibrationToggle={() => setModeCalibrationModes(previous => ({
                    ...previous,
                    [group.id]: previous[group.id] === 'measured' ? 'assumed' : 'measured',
                  }))}
                  onMeasuredDropsChange={value => setModeMeasuredDropsInputs(previous => ({ ...previous, [group.id]: value }))}
                  onMeasuredMlChange={value => setModeMeasuredMlInputs(previous => ({ ...previous, [group.id]: value }))}
                />
              ))}
            </div>
          )}
        </section>

        <section className="aio-recipe-panel aio-glass mt-3 overflow-hidden rounded-xl">
          <div className="aio-recipe-header flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <div>
                <div className="text-xs font-semibold text-slate-100">Recipe blend</div>
                <div className="mt-0.5 text-[10px] text-slate-500">{recipeSalts.length} salts · ratios stay fixed</div>
              </div>
            </div>
            <div className="rounded-full border border-cyan-300/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[9px] font-semibold tabular-nums text-cyan-100/75">
              {compact(saltMgPerDrop, 2)} mg total salt / drop
            </div>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4">
            {saltRows.map(salt => (
              <div key={salt.name} className={`aio-salt-row aio-salt-${salt.color} rounded-lg px-3 py-2.5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <span className="aio-salt-dot mt-1.5 h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-slate-100">{salt.name}</div>
                      <div className="mt-0.5 truncate text-[9px] text-slate-500">{salt.form} · {salt.formula}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="aio-salt-accent text-[10px] font-semibold tabular-nums">{compact(salt.target, 1)} ppm/L</div>
                    <div className="mt-0.5 text-[9px] tabular-nums text-slate-500">{compact(salt.mgPerDrop, 2)} mg/drop</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <details open={safetyOpen} onToggle={event => setSafetyOpen(event.currentTarget.open)} className="aio-details mt-3 rounded-xl border border-amber-300/20 bg-amber-400/[0.06]">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
            <span className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-200" aria-hidden="true" />
              <span>
                <span className="block text-xs font-semibold text-amber-100">Why ×{MAX_SAFE_STRENGTH}?</span>
                <span className="mt-0.5 block text-[10px] text-amber-100/55">Modeled ceiling · not a laboratory guarantee</span>
              </span>
            </span>
            <ChevronDown className="aio-chevron h-4 w-4 text-amber-100/50 transition-transform" aria-hidden="true" />
          </summary>
          {safetyOpen && (
            <div className="border-t border-amber-200/15 px-4 pb-3 pt-2 text-[10px] leading-relaxed text-amber-100/65">
              The current recipe reaches the search ceiling without a modeled solubility or reactive-pair failure. Keep the stock clear, add salts one at a time, and use separate stocks if cloudiness or crystals appear.
            </div>
          )}
        </details>

        <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] text-slate-600">
          <span className="flex items-center gap-1.5"><Beaker className="h-3 w-3" aria-hidden="true" /> {compact(dropsPerMl, 1)} drops/mL · {compact(saltMgPerDrop, 2)} mg total salt/drop</span>
          <span className="flex items-center gap-1.5"><Scale className="h-3 w-3" aria-hidden="true" /> salt-equivalent ppm, not TDS</span>
        </footer>
      </div>
    </main>
  );
}
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
  WandSparkles,
} from 'lucide-react';
import './_group.css';

type DropperStyle = 'straight' | 'round';

const recipeSalts = [
  { name: 'Magnesium sulfate', formula: 'MgSO₄', form: 'Epsom salt · heptahydrate', target: 9.2, color: 'cyan' },
  { name: 'Calcium chloride', formula: 'CaCl₂', form: 'Dihydrate', target: 6.8, color: 'violet' },
  { name: 'Sodium bicarbonate', formula: 'NaHCO₃', form: 'Anhydrous', target: 20, color: 'amber' },
  { name: 'Sodium chloride', formula: 'NaCl', form: 'Fine grain', target: 3.5, color: 'sky' },
];

const MAX_SAFE_STRENGTH = 500;

function number(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compact(value: number, digits = 1) {
  return value.toFixed(digits).replace(/\.0+$/, '');
}

export function CondensedAio() {
  const [strengthInput, setStrengthInput] = useState(String(MAX_SAFE_STRENGTH));
  const [waterLitersInput, setWaterLitersInput] = useState('1');
  const [dropperStyle, setDropperStyle] = useState<DropperStyle>('straight');
  const [calibrationMode, setCalibrationMode] = useState<'assumed' | 'measured'>('assumed');
  const [measuredDropsInput, setMeasuredDropsInput] = useState('20');
  const [measuredMlInput, setMeasuredMlInput] = useState('1');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [safetyOpen, setSafetyOpen] = useState(false);

  const strength = Math.min(MAX_SAFE_STRENGTH, Math.max(1, number(strengthInput, MAX_SAFE_STRENGTH)));
  const waterLiters = Math.max(0.01, number(waterLitersInput, 1));
  const assumedDropsPerMl = dropperStyle === 'straight' ? 20 : 11.2;
  const measuredDropsPerMl = Math.max(
    0.1,
    number(measuredDropsInput, assumedDropsPerMl) / Math.max(0.01, number(measuredMlInput, 1)),
  );
  const dropsPerMl = calibrationMode === 'measured' ? measuredDropsPerMl : assumedDropsPerMl;
  const totalRecipeTarget = recipeSalts.reduce((sum, salt) => sum + salt.target, 0);
  const stockSaltMgPerMl = totalRecipeTarget * strength / 1000;
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

  return (
    <main className="aio-shell aio-grid min-h-screen p-3 text-slate-100 sm:p-5">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-200 shadow-lg shadow-fuchsia-950/20">
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-fuchsia-200/65">Concentrate / AIO</div>
              <h1 className="truncate text-base font-semibold text-white sm:text-lg">Balanced pourover recipe</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/[0.08] px-2.5 py-1.5 text-[10px] font-semibold text-emerald-200">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            1 bottle
          </div>
        </header>

        <div className="mb-4 flex items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-950/45 p-1 shadow-xl">
          {[
            ['GH + KH', 'Separate compatible groups'],
            ['All-in-one', 'Every active salt shares one bottle'],
            ['Separate salts', 'One bottle per active salt'],
          ].map(([label, description]) => (
            <button
              key={label}
              type="button"
              aria-pressed={label === 'All-in-one'}
              title={description}
              className={`flex-1 rounded-lg px-2 py-2 text-[10px] font-semibold transition sm:text-xs ${
                label === 'All-in-one'
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
                  <span className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-fuchsia-200">All-in-one</span>
                  <span className="text-[10px] text-slate-500">recipe proportions stay locked</span>
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">One bottle. One answer.</h2>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
                  Set the stock strength once, then dose the finished water in drops.
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

          <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="aio-card rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
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
                      className="aio-input w-28 bg-transparent text-4xl font-semibold tracking-tight text-white outline-none"
                    />
                    <span className="text-lg text-slate-500">×</span>
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <div>safe ceiling</div>
                  <button
                    type="button"
                    onClick={() => setStrengthInput(String(MAX_SAFE_STRENGTH))}
                    className="mt-1 font-semibold tabular-nums text-emerald-300 transition hover:text-emerald-200"
                  >
                    Apply ×{MAX_SAFE_STRENGTH}
                  </button>
                </div>
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
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-fuchsia-200/65">Salt / mL</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-fuchsia-100">{compact(stockSaltMgPerMl, 2)} mg</div>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Total recipe salt</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-slate-100">{compact(totalRecipeTarget, 1)} ppm/L</div>
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
                    <span className="text-sm font-medium text-emerald-100/75">drops</span>
                  </div>
                  <div className="mt-1 text-[11px] text-emerald-100/65">
                    for {compact(waterLiters, 2)} L · {compact(stockDoseMl, 2)} mL stock
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-200/20 bg-emerald-300/10 px-2.5 py-2 text-right">
                  <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200/65">1 drop adds</div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-emerald-50">{compact(ppmPerDrop, 2)}</div>
                  <div className="text-[9px] text-emerald-100/60">salt ppm</div>
                </div>
              </div>
              <label className="mt-4 block">
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-100/60">Final water volume</span>
                <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-emerald-200/20 bg-slate-950/30 px-3 py-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={waterLitersInput}
                    onChange={event => setWaterLitersInput(event.target.value)}
                    aria-label="Final water volume in liters"
                    className="aio-input w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none"
                  />
                  <span className="text-xs font-semibold text-emerald-100/60">L</span>
                </span>
              </label>
            </section>
          </div>
        </section>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <details open={detailsOpen} onToggle={event => setDetailsOpen(event.currentTarget.open)} className="aio-details aio-glass rounded-xl">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
                  <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-xs font-semibold text-slate-100">Recipe blend</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">{recipeSalts.length} salts · ratios stay fixed</span>
                </span>
              </span>
              <ChevronDown className="aio-chevron h-4 w-4 text-slate-500 transition-transform" aria-hidden="true" />
            </summary>
            {detailsOpen && (
              <div className="border-t border-slate-700/50 px-4 pb-3 pt-2">
                {saltRows.map(salt => (
                  <div key={salt.name} className="flex items-center justify-between gap-3 border-b border-slate-800/80 py-2.5 last:border-0">
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-semibold text-slate-200">{salt.name}</div>
                      <div className="mt-0.5 truncate text-[9px] text-slate-500">{salt.form} · {salt.formula}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-semibold tabular-nums text-cyan-100">{compact(salt.target, 1)} ppm/L</div>
                      <div className="mt-0.5 text-[9px] tabular-nums text-slate-500">{compact(salt.mgPerDrop, 2)} mg/drop</div>
                    </div>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between rounded-lg border border-cyan-300/15 bg-cyan-400/[0.06] px-3 py-2 text-[10px]">
                  <span className="text-slate-500">Total dry salt per drop</span>
                  <strong className="tabular-nums text-cyan-100">{compact(saltMgPerDrop, 2)} mg</strong>
                </div>
              </div>
            )}
          </details>

          <details open={calibrationOpen} onToggle={event => setCalibrationOpen(event.currentTarget.open)} className="aio-details aio-glass rounded-xl">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
              <span className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-300/20 bg-violet-400/10 text-violet-200">
                  <Ruler className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-xs font-semibold text-slate-100">Dropper calibration</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">{calibrationLabel}</span>
                </span>
              </span>
              <ChevronDown className="aio-chevron h-4 w-4 text-slate-500 transition-transform" aria-hidden="true" />
            </summary>
            {calibrationOpen && (
              <div className="border-t border-slate-700/50 px-4 pb-3 pt-3">
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-700/60 bg-slate-950/40 p-1">
                  {(['straight', 'round'] as DropperStyle[]).map(style => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setDropperStyle(style)}
                      aria-pressed={dropperStyle === style}
                      className={`rounded-md px-2 py-1.5 text-[10px] font-semibold capitalize transition ${
                        dropperStyle === style ? 'bg-violet-400/15 text-violet-100 ring-1 ring-violet-300/25' : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {style} tip
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-[10px]">
                  <span className="text-slate-500">Use measured calibration</span>
                  <button
                    type="button"
                    onClick={() => setCalibrationMode(mode => mode === 'assumed' ? 'measured' : 'assumed')}
                    aria-pressed={calibrationMode === 'measured'}
                    className={`rounded-full border px-2 py-1 font-semibold transition ${
                      calibrationMode === 'measured'
                        ? 'border-violet-300/35 bg-violet-400/15 text-violet-100'
                        : 'border-slate-700 bg-slate-900 text-slate-500'
                    }`}
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
                  <Info className="h-3.5 w-3.5 shrink-0 text-violet-300/70" aria-hidden="true" />
                  Default assumes the selected tip style. Calibration only changes drop size, not recipe chemistry.
                </div>
              </div>
            )}
          </details>
        </div>

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
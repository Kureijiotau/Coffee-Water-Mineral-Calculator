import {
  Beaker,
  Check,
  ChevronDown,
  CircleHelp,
  Coffee,
  Download,
  FlaskConical,
  Gauge,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Waves,
  Droplet,
} from 'lucide-react';
import { WorkflowShell } from './_shared/WorkflowShell';

const salts = [
  { name: 'Magnesium Chloride', formula: 'MgCl₂', hydration: 'Hexahydrate', color: '#fde047', ions: [{ formula: 'Mg²⁺', color: '#fde047' }, { formula: 'Cl⁻', color: '#60a5fa' }] },
  { name: 'Calcium Chloride', formula: 'CaCl₂', hydration: 'Dihydrate', color: '#fb923c', ions: [{ formula: 'Ca²⁺', color: '#fb923c' }, { formula: 'Cl⁻', color: '#60a5fa' }] },
  { name: 'Sodium Chloride', formula: 'NaCl', hydration: 'Anhydrous', color: '#fb7185', ions: [{ formula: 'Na⁺', color: '#fb7185' }, { formula: 'Cl⁻', color: '#60a5fa' }] },
  { name: 'Potassium Chloride', formula: 'KCl', hydration: 'Anhydrous', color: '#c084fc', ions: [{ formula: 'K⁺', color: '#c084fc' }, { formula: 'Cl⁻', color: '#60a5fa' }] },
  { name: 'Magnesium Sulfate', formula: 'MgSO₄', hydration: 'Heptahydrate (Epsom)', color: '#fde047', ions: [{ formula: 'Mg²⁺', color: '#fde047' }, { formula: 'SO₄²⁻', color: '#818cf8' }] },
  { name: 'Calcium Sulfate', formula: 'CaSO₄', hydration: 'Dihydrate (Gypsum)', color: '#fb923c', ions: [{ formula: 'Ca²⁺', color: '#fb923c' }, { formula: 'SO₄²⁻', color: '#818cf8' }] },
  { name: 'Sodium Bicarbonate', formula: 'NaHCO₃', hydration: 'Anhydrous', color: '#fb7185', ions: [{ formula: 'Na⁺', color: '#fb7185' }, { formula: 'HCO₃⁻', color: '#5eead4' }] },
  { name: 'Potassium Bicarbonate', formula: 'KHCO₃', hydration: 'Anhydrous', color: '#c084fc', ions: [{ formula: 'K⁺', color: '#c084fc' }, { formula: 'HCO₃⁻', color: '#5eead4' }] },
  { name: 'Magnesium Citrate', formula: 'Mg₃(C₆H₅O₇)₂', hydration: 'Nonahydrate', color: '#fde047', ions: [{ formula: 'Mg²⁺', color: '#fde047' }, { formula: 'C₆H₅O₇³⁻', color: '#bef264' }] },
  { name: 'Calcium Citrate', formula: 'Ca₃(C₆H₅O₇)₂', hydration: 'Tetrahydrate', color: '#fb923c', ions: [{ formula: 'Ca²⁺', color: '#fb923c' }, { formula: 'C₆H₅O₇³⁻', color: '#bef264' }] },
];

const metrics = [
  { label: 'General Hardness', short: 'GH', value: '0.0', unit: 'ppm CaCO₃', tone: 'text-indigo-200', marker: 'bg-indigo-300' },
  { label: 'Carbonate Hardness', short: 'KH', value: '0.0', unit: 'ppm CaCO₃', tone: 'text-amber-200', marker: 'bg-amber-300' },
  { label: 'Total Dissolved Solids', short: 'TDS', value: '0.0', unit: 'mg/L', tone: 'text-cyan-200', marker: 'bg-cyan-300' },
];

function Help({ label, children }: { label: string; children: string }) {
  return (
    <details className="group relative">
      <summary aria-label={label} title={label} className="grid h-7 w-7 cursor-pointer list-none place-items-center rounded-full border border-slate-600/70 bg-slate-950/40 text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-200 [&::-webkit-details-marker]:hidden">
        <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 top-9 z-30 w-64 rounded-xl border border-slate-600/80 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300 shadow-2xl shadow-slate-950/60">
        {children}
      </div>
    </details>
  );
}

export function DraftCalculator() {
  return (
    <WorkflowShell active="calculator">
      <div className="space-y-4 pb-8">
        <section className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/75 shadow-xl shadow-slate-950/30">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-400/[0.08] text-cyan-200">
                <Gauge className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">Calculator mode</p>
                <p className="mt-0.5 text-xs text-slate-500">Mineral recipe</p>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-slate-700/70 bg-slate-950/55 p-1 sm:w-auto">
              <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200">
                <Coffee className="h-3.5 w-3.5" aria-hidden="true" /> Brewer
              </button>
              <button type="button" aria-pressed="true" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-3 text-xs font-semibold text-emerald-100 shadow-sm">
                <FlaskConical className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" /> Alchemist
              </button>
              <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200">
                <Waves className="h-3.5 w-3.5" aria-hidden="true" /> Watermancer
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-950/45 to-slate-900/75 px-4 py-3.5 shadow-lg shadow-slate-950/20 sm:px-5">
            <div className="mr-auto">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/65">Batch volume</p>
              <p className="mt-1 text-sm font-semibold text-cyan-50">Final water</p>
            </div>
            <div className="flex h-11 items-center gap-1.5 rounded-xl border border-cyan-300/30 bg-slate-950/55 px-2 shadow-inner shadow-slate-950/40">
              <Droplet className="ml-0.5 h-4 w-4 text-cyan-300" aria-hidden="true" />
              <button type="button" aria-label="Decrease batch volume" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><Minus className="h-3 w-3" /></button>
              <span className="w-7 text-center font-mono text-base font-semibold tabular-nums text-slate-100">1</span>
              <button type="button" aria-label="Increase batch volume" className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><Plus className="h-3 w-3" /></button>
              <span className="pr-1 text-xs font-semibold uppercase tracking-wider text-cyan-200/70">L</span>
            </div>
            <button type="button" className="h-11 rounded-xl border border-cyan-300/25 bg-cyan-400/[0.08] px-3 text-[11px] font-semibold uppercase tracking-wider text-cyan-100">Liters</button>
          </div>

          <details className="group rounded-2xl border border-amber-300/20 bg-amber-950/20 shadow-lg shadow-slate-950/20">
            <summary className="flex min-h-full cursor-pointer list-none items-center gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-200"><Beaker className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-amber-50">Craft with mineral water as a base</span>
              </span>
              <ChevronDown className="h-4 w-4 text-amber-200/60 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-amber-200/10 px-4 pb-4 pt-3 text-xs leading-relaxed text-slate-300">
              Add a mineral-water profile to include its ion contributions in the recipe.
            </div>
          </details>
        </section>

        <section className="overflow-hidden rounded-2xl border border-emerald-300/25 bg-slate-900/80 shadow-2xl shadow-emerald-950/20">
          <header className="flex flex-col gap-3 border-b border-slate-700/60 bg-gradient-to-r from-emerald-400/[0.07] via-cyan-400/[0.035] to-transparent px-4 py-4 sm:flex-row sm:items-center sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-400/[0.08] text-emerald-200"><FlaskConical className="h-4 w-4" /></span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <h1 className="text-sm font-bold uppercase tracking-[0.13em] text-emerald-50">Mineral recipe</h1>
                  <span className="text-xs text-slate-500">/</span>
                  <span className="text-xs text-emerald-100/75">Custom</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">Set a mineral target or enter a direct dose.</p>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
              <label className="sr-only" htmlFor="draft-recipe-select">Select recipe</label>
              <select id="draft-recipe-select" defaultValue="custom" className="min-h-9 min-w-32 rounded-lg border border-slate-600/70 bg-slate-950/70 px-2.5 text-xs text-slate-100">
                <option value="custom">Custom recipe</option>
                <option value="aiki">Aiki&apos;s (Light Roast Pourover)</option>
              </select>
              <button type="button" title="Save recipe" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-violet-300/25 bg-violet-400/[0.08] px-2.5 text-xs font-medium text-violet-100"><Save className="h-3.5 w-3.5" /> Save</button>
              <button type="button" title="Share recipe" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-300/25 bg-emerald-400/[0.08] px-2.5 text-xs font-medium text-emerald-100"><Share2 className="h-3.5 w-3.5" /> Share</button>
              <button type="button" title="Import recipe" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-sky-300/25 bg-sky-400/[0.08] px-2.5 text-xs font-medium text-sky-100"><Download className="h-3.5 w-3.5" /> Import</button>
              <button type="button" title="Reset recipe" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-300/25 bg-amber-400/[0.08] px-2.5 text-xs font-medium text-amber-100"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
            </div>
          </header>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/40 bg-slate-950/20 px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-200">Salt targets</span>
              <span className="hidden text-slate-600 sm:inline">·</span>
              <span className="hidden sm:inline">ppm contribution for this 1 L batch</span>
              <Help label="Target and dose help">Enter a mineral contribution in ppm, or enter the salt mass directly in milligrams. These are independent fields in this visual draft; no calculation is performed.</Help>
            </div>
            <details className="group">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-slate-600/60 bg-slate-950/35 px-2.5 py-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 [&::-webkit-details-marker]:hidden">
                Hydration forms <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 max-w-md rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-xs leading-relaxed text-slate-400">
                The hydration label identifies the listed salt form used for the recipe. The current form labels remain visible beside every salt.
              </p>
            </details>
          </div>

          <div className="hidden grid-cols-[minmax(220px,1.55fr)_minmax(120px,0.8fr)_minmax(130px,0.8fr)] gap-4 border-b border-slate-700/60 bg-slate-950/35 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:grid">
            <span>Salt · ion contribution</span>
            <span className="text-center">Mineral target</span>
            <span className="text-center">Direct dose</span>
          </div>

          <div className="divide-y divide-slate-700/35">
            {salts.map((salt, index) => (
              <div key={salt.name} className="grid gap-x-4 gap-y-2.5 px-4 py-3 transition-colors hover:bg-white/[0.018] sm:grid-cols-[minmax(220px,1.55fr)_minmax(120px,0.8fr)_minmax(130px,0.8fr)] sm:items-center sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-slate-950/45 font-mono text-[10px] text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold" style={{ color: salt.color }}>{salt.name}<span className="ml-2 font-mono text-xs font-medium text-slate-500">{salt.formula}</span></div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-[11px] text-slate-500">{salt.hydration}</span>
                      <span className="text-slate-700">·</span>
                      <span className="flex flex-wrap gap-x-1.5 text-[11px] font-medium">
                        {salt.ions.map(ion => <span key={ion.formula} style={{ color: ion.color }}>{ion.formula}</span>)}
                      </span>
                    </div>
                  </div>
                </div>
                <label className="grid grid-cols-[minmax(72px,1fr)_auto] items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:hidden">Target (ppm)</span>
                  <span className="relative sm:col-span-full">
                    <input aria-label={`${salt.name} mineral target in ppm`} className="min-h-10 w-full rounded-lg border border-slate-700/80 bg-slate-950/55 px-3 pr-12 font-mono text-sm tabular-nums text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/45 focus:ring-2 focus:ring-cyan-400/10" placeholder="0.0000" value="" readOnly />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">ppm</span>
                  </span>
                </label>
                <label className="grid grid-cols-[minmax(72px,1fr)_auto] items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:hidden">Direct dose</span>
                  <span className="relative sm:col-span-full">
                    <input aria-label={`${salt.name} direct dose in milligrams`} className="min-h-10 w-full rounded-lg border border-emerald-300/20 bg-emerald-950/15 px-3 pr-12 font-mono text-sm tabular-nums text-emerald-100 outline-none placeholder:text-slate-600 focus:border-emerald-300/45 focus:ring-2 focus:ring-emerald-400/10" placeholder="0.00" value="" readOnly />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">mg</span>
                  </span>
                </label>
              </div>
            ))}
          </div>

          <details className="group border-t border-cyan-300/15 bg-cyan-950/15">
            <summary className="flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-xs sm:px-5 [&::-webkit-details-marker]:hidden">
              <span className="grid h-5 w-5 place-items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 text-emerald-200"><Check className="h-3 w-3" /></span>
              <strong className="font-semibold text-slate-200">Aiki&apos;s (Light Roast Pourover) ion check</strong>
              <span className="text-slate-500">All monitored ions in range</span>
              <ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-500 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-cyan-300/10 px-4 py-3 text-xs leading-relaxed text-slate-400 sm:px-5">
              Aiki&apos;s ion check is available as a reference disclosure. Sample values show no target inputs and no calculated ion breakdown.
            </div>
          </details>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/75 shadow-xl shadow-slate-950/20">
          <header className="flex flex-wrap items-center gap-2 border-b border-slate-700/50 bg-slate-950/25 px-4 py-3 sm:px-5">
            <Gauge className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">Recipe summary</h2>
            <span className="text-xs text-slate-500">as CaCO₃</span>
            <Help label="Recipe summary help">Summary values are shown for the current sample recipe. No calculation is performed in this visual draft.</Help>
          </header>
          <div className="grid gap-0 sm:grid-cols-[repeat(3,minmax(0,1fr))_minmax(150px,0.8fr)]">
            {metrics.map((metric, index) => (
              <article key={metric.short} className={`relative flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5 ${index !== 0 ? 'border-t border-slate-700/40 sm:border-l sm:border-t-0' : ''}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${metric.marker}`} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{metric.short}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">{metric.label}</p>
                </div>
                <p className={`shrink-0 font-mono text-xl font-semibold tabular-nums ${metric.tone}`}>{metric.value}<span className="ml-1.5 text-[10px] font-normal text-slate-500">{metric.unit}</span></p>
              </article>
            ))}
            <article className="flex items-center justify-between gap-3 border-t border-slate-700/40 bg-slate-950/20 px-4 py-3.5 sm:border-l sm:border-t-0 sm:px-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">GH : KH ratio</p>
                <p className="mt-1 text-xs text-slate-500">Hardness balance</p>
              </div>
              <span className="font-mono text-xl font-semibold text-slate-500">—</span>
            </article>
          </div>
        </section>
      </div>
    </WorkflowShell>
  );
}

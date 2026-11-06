import {
  Beaker,
  BookOpen,
  Calculator,
  ChevronDown,
  Coffee,
  Download,
  FlaskConical,
  Gauge,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Droplet,
  Pipette,
  Waves,
} from 'lucide-react';
import './_group.css';

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

function AppHeader() {
  return (
    <header className="current-water-header rounded-2xl border border-white/10 bg-slate-800/70 backdrop-blur-xl">
      <div className="current-water-header__bar flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-gradient-to-r from-slate-950 via-cyan-950/80 to-indigo-950 py-0 pr-4 sm:pr-6">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <img src="/__mockup/images/watermancer-header.webp" alt="" aria-hidden="true" className="h-20 w-20 shrink-0 object-cover sm:h-24 sm:w-24" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold uppercase tracking-[0.08em] text-white sm:text-xl">Watermancer</h1>
              <p className="text-[11px] leading-relaxed text-slate-300/75">Coffee water, made precise</p>
          </div>
        </div>
          <button type="button" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-slate-950/30 px-3 text-xs font-medium text-slate-200">
            <Layers className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" /> Sessions <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">1</span>
          </button>
          <nav className="grid w-full max-w-full shrink-0 grid-cols-3 gap-1 sm:w-auto" aria-label="App workspace">
            <button type="button" aria-current="page" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white sm:min-h-0 sm:py-1.5">
            <Calculator className="h-3.5 w-3.5 text-cyan-300" /> Calculator
          </button>
          <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-white/70 sm:min-h-0 sm:py-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-fuchsia-300" /> Concentrates
          </button>
          <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-white/70 sm:min-h-0 sm:py-1.5">
            <Beaker className="h-3.5 w-3.5 text-amber-300" /> Mixer
          </button>
            <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-white/70 sm:min-h-0 sm:py-1.5">
              <Coffee className="h-3.5 w-3.5 text-amber-200" /> Water grading
            </button>
            <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-white/70 sm:min-h-0 sm:py-1.5">
              <BookOpen className="h-3.5 w-3.5 text-sky-200" /> R. Asami Guide
            </button>
            <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-white/70 sm:min-h-0 sm:py-1.5">
              <Pipette className="h-3.5 w-3.5 text-violet-200" /> Watermancer Guide
            </button>
        </nav>
      </div>
    </header>
  );
}

export function CurrentCalculator() {
  return (
    <main className="current-water-shell relative min-h-screen font-sans">
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col p-4 sm:p-6 current-water-stack">
        <AppHeader />
        <section className="current-water-quiet rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">Calculator mode</div>
                <p className="mt-0.5 text-xs text-slate-500">Use <strong className="font-semibold text-white">mineral salts</strong> to craft your recipe. Pick, save, share, or import recipes. Make all in one, separate GH KH or separate salt concentrates.</p>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1 sm:w-auto">
              <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400"><Coffee className="h-3.5 w-3.5" /> Brewer</button>
              <button type="button" aria-pressed="true" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-200 shadow-sm"><FlaskConical className="h-3.5 w-3.5" /> Alchemist</button>
              <button type="button" className="inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400"><Waves className="h-3.5 w-3.5" /> Watermancer</button>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl border border-emerald-400/25 bg-slate-800/75 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 border-b border-slate-700/40 bg-gradient-to-r from-cyan-500/[0.07] to-indigo-500/[0.05] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-cyan-100">
            <Droplet className="h-4 w-4 text-cyan-300" /> Batch volume
          </div>
          <div className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
            <label className="flex flex-col gap-0.5 text-sm font-semibold text-cyan-100"><span>Final batch volume</span><span className="text-[10px] font-normal uppercase tracking-[0.16em] text-cyan-200/45">Recipe output</span></label>
            <div className="flex h-11 items-center gap-1.5 rounded-xl border border-cyan-300/35 bg-gradient-to-r from-cyan-950/70 to-slate-950/70 px-1.5 shadow-inner shadow-cyan-950/30">
              <Droplet className="ml-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              <button type="button" aria-label="Decrease batch volume" className="rounded-md p-1 text-slate-400"><Minus className="h-3 w-3" /></button>
              <input className="w-10 bg-transparent text-center text-base font-semibold tabular-nums text-slate-100 outline-none" value="1" readOnly />
              <button type="button" aria-label="Increase batch volume" className="rounded-md p-1 text-slate-400"><Plus className="h-3 w-3" /></button>
              <span className="w-5 text-center text-xs font-semibold uppercase tracking-wider text-cyan-200/65">L</span>
            </div>
            <button type="button" className="h-11 min-w-[76px] rounded-xl border border-cyan-300/35 bg-cyan-400/10 px-3 text-[11px] uppercase tracking-wider text-cyan-100">Liters</button>
          </div>
        </section>

        <details className="current-water-details overflow-hidden rounded-2xl border border-emerald-400/25 bg-slate-800/70 shadow-xl">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-emerald-100">
            <FlaskConical className="h-4 w-4 text-emerald-300" /> Craft with mineral water as a base
            <ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-500" />
          </summary>
        </details>

        <section className="overflow-hidden rounded-2xl border border-emerald-400/25 bg-slate-800/70 shadow-2xl shadow-emerald-950/20 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/40 bg-gradient-to-r from-sky-500/10 via-transparent to-indigo-500/10 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-cyan-300" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-100">Mineral Recipe</h2>
              <span className="text-xs font-normal normal-case text-sky-200/70">— Custom</span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="current-recipe">Recipe</label>
              <select id="current-recipe" className="current-water-select rounded-lg border border-slate-600/70 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-100" defaultValue="custom">
                <option value="custom">Custom</option>
              </select>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-400/25 bg-violet-500/10 px-2.5 py-1.5 text-xs text-violet-200"><Save className="h-3.5 w-3.5" /> Save</button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-200"><Share2 className="h-3.5 w-3.5" /> Share</button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-500/10 px-2.5 py-1.5 text-xs text-sky-200"><Download className="h-3.5 w-3.5" /> Import</button>
              <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200"><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
            </div>
          </div>
          <div className="current-mineral-table">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-400/10 bg-gradient-to-r from-emerald-500/[0.045] via-transparent to-sky-500/[0.035] px-4 py-3 text-[11px] leading-relaxed sm:px-6">
              <span>Enter mineral targets in PPM or milligrams; Direct dose shows the amount to add for the selected final batch volume.</span>
              <button type="button" className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-600/60 bg-slate-950/30 px-2 py-1 text-[10px] font-semibold text-slate-400"><ChevronDown className="h-3.5 w-3.5" /> Advanced: hydration forms</button>
            </div>
            <div className="hidden grid-cols-[1.7fr_1fr_1fr] gap-3 border-b border-slate-700/30 bg-slate-900/40 px-6 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300 sm:grid">
              <span className="font-bold text-white">Salt</span><span className="font-bold text-white">Mineral target (ppm)</span><span className="font-bold text-white">Direct dose (mg)</span>
            </div>
            {salts.map((salt) => (
              <div key={salt.name} className="current-mineral-row grid grid-cols-2 gap-x-3 gap-y-2 border-b px-4 py-3 sm:grid-cols-[1.7fr_1fr_1fr] sm:items-center sm:px-6">
                <div className="col-span-2 flex min-w-0 flex-col items-center gap-1 text-center sm:col-span-1">
                  <span className="text-sm font-semibold" style={{ color: salt.color }}>{salt.name}</span>
                  <span className="flex flex-wrap justify-center gap-x-1 text-xs">
                    {salt.ions.map((ion) => <span key={ion.formula} style={{ color: ion.color }}>{ion.formula}</span>)}
                  </span>
                  <span className="max-w-full truncate text-[10px] text-slate-500">{salt.hydration}</span>
                </div>
                <label className="text-[10px] uppercase tracking-wider text-slate-500 sm:text-center">
                  <span className="mb-1 block sm:hidden">Mineral target (ppm)</span>
                  <span className="relative block"><input className="current-mineral-input w-full rounded-lg px-3 py-2 pr-12 text-sm text-slate-100 placeholder:text-slate-500" value="" placeholder="0.0000" readOnly /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">ppm</span></span>
                </label>
                <label className="col-span-2 flex items-center justify-center gap-2 sm:col-span-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 sm:hidden">Direct dose (mg)</span>
                  <span className="relative block w-full max-w-60"><input className="current-mineral-input current-mineral-dose w-full rounded-lg px-3 py-2 pr-12 font-mono text-sm text-emerald-200 placeholder:text-slate-500" value="" placeholder="0.00" readOnly /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">mg</span></span>
                </label>
              </div>
            ))}
            <details className="current-water-details border-t border-indigo-400/15 bg-indigo-500/[0.035]">
              <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-xs text-slate-300 sm:px-6">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.95)]" />
                <strong className="font-semibold">Aiki&apos;s (Light Roast Pourover) ion check</strong>
                <span className="text-slate-500">All monitored ions in range</span>
                <ChevronDown className="ml-auto h-3.5 w-3.5 text-slate-500" />
              </summary>
            </details>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/70 shadow-xl">
          <div className="flex items-center gap-2 border-b border-slate-700/40 bg-gradient-to-r from-cyan-500/[0.07] to-indigo-500/[0.05] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Gauge className="h-4 w-4 text-cyan-300" /> Base Salt Recipe Summary (as CaCO₃)
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
            {[
              ['General Hardness (GH)', '0.0', 'ppm CaCO₃', 'text-indigo-200'],
              ['Carbonate Hardness (KH)', '0.0', 'ppm CaCO₃', 'text-amber-200'],
              ['Total Dissolved Solids (TDS)', '0.0', 'mg/L', 'text-cyan-200'],
            ].map(([label, value, unit, tone]) => (
              <article key={label} className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
                <div className="text-[10px] font-semibold text-slate-400">{label}</div>
                <div className={`mt-2 text-lg font-semibold tabular-nums ${tone}`}>{value}<span className="ml-1 text-[10px] font-normal text-slate-400">{unit}</span></div>
              </article>
            ))}
            <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-3 sm:col-span-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">GH : KH Ratio</span>
              <span className="h-4 w-px bg-slate-700" />
              <span className="text-lg font-semibold text-slate-500">—</span>
            </div>
          </div>
        </section>
        <p className="text-center text-[10px] text-slate-500">Current reference · static visual sample</p>
      </div>
    </main>
  );
}

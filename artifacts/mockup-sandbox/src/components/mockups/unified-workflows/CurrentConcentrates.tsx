import {
  Beaker,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  Coffee,
  Droplet,
  FlaskConical,
  Gauge,
  Layers,
  Pipette,
} from 'lucide-react';
import './_group.css';

function AppHeader() {
  return (
    <header className="current-water-header rounded-2xl border border-white/10 bg-slate-800/70 backdrop-blur-xl">
      <div className="current-water-header__bar flex flex-wrap items-center justify-between gap-x-3 gap-y-2 bg-gradient-to-r from-violet-950 via-fuchsia-950/80 to-slate-950 py-0 pr-4 sm:pr-6">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <img src="/__mockup/images/watermancer-header.webp" alt="" aria-hidden="true" className="h-20 w-20 shrink-0 object-cover sm:h-24 sm:w-24" />
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold uppercase tracking-[0.08em] text-white sm:text-xl">Watermancer</h1>
              <p className="text-[11px] leading-relaxed text-slate-300/75">Coffee water, made precise</p>
          </div>
        </div>
          <button type="button" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-slate-950/30 px-3 text-xs font-medium text-slate-200">
            <Layers className="h-3.5 w-3.5 text-fuchsia-200" aria-hidden="true" /> Sessions <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">1</span>
          </button>
        <nav className="grid w-full max-w-full shrink-0 grid-cols-3 gap-1 sm:w-auto" aria-label="App workspace">
            <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-white/70 sm:min-h-0 sm:py-1.5"><Calculator className="h-3.5 w-3.5 text-cyan-300" /> Calculator</button>
          <button type="button" aria-current="page" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/30 bg-white/10 px-3 py-2 text-xs font-semibold text-white sm:min-h-0 sm:py-1.5"><FlaskConical className="h-3.5 w-3.5 text-fuchsia-300" /> Concentrates</button>
            <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-white/70 sm:min-h-0 sm:py-1.5"><Beaker className="h-3.5 w-3.5 text-amber-300" /> Mixer</button>
            <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-white/70 sm:min-h-0 sm:py-1.5"><Coffee className="h-3.5 w-3.5 text-amber-200" /> Water grading</button>
            <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-white/70 sm:min-h-0 sm:py-1.5"><BookOpen className="h-3.5 w-3.5 text-sky-200" /> R. Asami Guide</button>
            <button type="button" className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/20 bg-black/15 px-3 py-2 text-xs font-semibold text-white/70 sm:min-h-0 sm:py-1.5"><Pipette className="h-3.5 w-3.5 text-violet-200" /> Watermancer Guide</button>
        </nav>
      </div>
    </header>
  );
}

const fieldClass = 'current-water-input mt-1 w-full text-sm';

export function CurrentConcentrates() {
  return (
    <main className="current-water-shell relative min-h-screen font-sans">
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col p-4 sm:p-6 current-water-stack">
        <AppHeader />

        <section className="current-water-quiet rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl sm:px-6">
          <div className="flex items-start gap-2">
            <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">Concentrates</div>
              <p className="mt-0.5 text-xs text-slate-500">Prepare recipe-based or DIY mineral concentrates.</p>
            </div>
          </div>
        </section>

        <div role="tablist" aria-label="Concentrate workspace" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
          <button type="button" role="tab" aria-selected="false" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-400"><FlaskConical className="h-4 w-4" /> Recipe Concentrate</button>
          <button type="button" role="tab" aria-selected="true" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-2 text-xs font-semibold text-fuchsia-200 shadow-sm"><FlaskConical className="h-4 w-4" /> DIY Concentrate</button>
        </div>

        <div className="space-y-4">
          <section className="current-water-quiet rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">DIY concentrate workspace</div>
                  <p className="mt-0.5 text-xs text-slate-500">Build a single-mineral concentrate by weight.</p>
                </div>
              </div>
              <div role="tablist" aria-label="DIY concentrate workspace" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
                <button type="button" role="tab" aria-selected="true" className="rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-1.5 text-xs font-semibold text-fuchsia-200 shadow-sm">Stock builder</button>
                <button type="button" role="tab" aria-selected="false" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400">DIY Lotus Drops</button>
              </div>
              <div className="flex items-center gap-2"><button type="button" className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-100">Save</button></div>
            </div>
          </section>

          <section className="rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/10 via-slate-800/70 to-violet-500/10 p-4 shadow-xl sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-fuchsia-100"><FlaskConical className="h-4 w-4 text-fuchsia-300" /> DIY single-salt concentrate</h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">Use the same bottle-card workflow as recipe concentrates, with one selected mineral per bottle. The target follows the current Calculator setup when that salt is active.</p>
              </div>
              <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-200">One bottle</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5 text-xs text-sky-300">
                <span className="block text-[10px] font-semibold uppercase tracking-wider">Mineral</span>
                <select className={`${fieldClass} current-water-select pointer-events-none bg-transparent font-semibold text-sky-200`} defaultValue="mgso4" aria-disabled="true" tabIndex={-1}>
                  <option value="mgso4">Magnesium Sulfate</option>
                </select>
              </label>
              <label className="rounded-xl border border-emerald-300/25 bg-slate-950/25 px-3 py-2.5 text-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Hydration form</span>
                <select className={`${fieldClass} current-water-select pointer-events-none bg-transparent font-semibold text-emerald-100`} defaultValue="heptahydrate" aria-disabled="true" tabIndex={-1}><option value="heptahydrate">Heptahydrate (Epsom)</option></select>
                <span className="mt-1 block text-[9px] text-slate-500">Controls the salt mass to weigh</span>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-sky-300/30 bg-gradient-to-br from-sky-400/[0.08] via-slate-800/80 to-blue-500/[0.06] p-4 shadow-xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-sky-100"><Pipette className="h-4 w-4 text-sky-200" /> Dropper calibration</span>
              <span className="rounded-full border border-slate-500/40 bg-slate-950/30 px-2.5 py-1 text-[10px] font-semibold text-slate-400">Not calibrated</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" aria-label="Dropper calibration explanation" className="grid h-5 w-5 place-items-center rounded-full border border-slate-400/50 bg-slate-950/80 text-[11px] font-bold text-slate-200">?</button>
              <p className="text-xs text-slate-400">Measure each tip separately.</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { tip: 'Straight', rate: '20.0 drops/mL estimated' },
                { tip: 'Round', rate: '11.2 drops/mL estimated' },
              ].map((calibration) => (
                <fieldset key={calibration.tip} className="rounded-xl border border-sky-200/20 bg-slate-950/25 px-3 py-2.5">
                  <legend className="px-1 text-xs font-semibold text-sky-100">{calibration.tip} tip</legend>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{calibration.tip} tip measured drops<input className="mt-1 min-h-10 w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none placeholder:text-slate-500" placeholder="e.g. 100" value="" readOnly /></label>
                  <label className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{calibration.tip} tip water weight in grams<span className="mt-1 flex items-center gap-2"><input className="min-h-10 w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none placeholder:text-slate-500" placeholder="e.g. 5" value="" readOnly /><span className="text-sm text-slate-400">g</span></span></label>
                  <p className="mt-2 text-xs text-slate-400">{calibration.rate}</p>
                </fieldset>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-sky-300/25 bg-slate-900/55 p-4 shadow-lg" data-testid="mass-dosing-tip-selection">
            <label className="block text-xs font-semibold text-sky-100">
              Stock dropper tip
              <select className={`${fieldClass} current-water-select pointer-events-none bg-slate-950/60 text-slate-100`} defaultValue="straight" aria-disabled="true" tabIndex={-1}>
                <option value="straight">Straight tip</option>
                <option value="round">Round tip</option>
              </select>
            </label>
            <p className="mt-2 text-xs text-slate-400">20.0 drops/mL · Estimated</p>
          </section>

          <section className="space-y-3">
            <section className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 shadow-xl sm:p-5">
              <div className="flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/70"><span className="flex items-center gap-2"><FlaskConical className="h-4 w-4 text-cyan-300/80" /> Concentrate weight and batch volume</span><button type="button" aria-label="Water weighing explanation" className="grid h-5 w-5 place-items-center rounded-full border border-slate-400/50 bg-slate-950/80 text-[11px] font-bold">?</button></div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5"><span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Concentrate weight</span><span className="mt-1 flex items-center gap-2"><input className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none" value="100" readOnly /><span className="text-sm text-slate-400">g</span></span></label>
                <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5"><span className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500"><span>Batch volume</span><span className="text-cyan-300">liters</span></span><span className="mt-1 flex items-center gap-2"><input className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none" value="1.0" readOnly /><span className="text-sm text-slate-400">L</span></span></label>
              </div>
            </section>

            <details className="current-water-details rounded-xl border border-slate-700/60 bg-slate-950/20 p-3">
              <summary className="cursor-pointer text-sm text-sky-100">Calibrate this finished stock by weight <ChevronDown className="inline h-3.5 w-3.5" /></summary>
              <p className="mt-2 text-xs text-slate-400">Tare a receiving cup. Hold the dropper vertically and weigh counted drops of this actual finished stock. Use the same tip. This calibration is saved to this stock separately from the shared water calibration.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs">Counted stock drops<input className={fieldClass} value="20" readOnly /></label><label className="text-xs">Measured stock weight (g)<input className={fieldClass} value="1.06" readOnly /></label></div>
              <button type="button" className="mt-3 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-100">Use measured stock calibration</button>
            </details>

            <section className="rounded-2xl border border-cyan-300/25 bg-slate-800/70 p-4 shadow-xl sm:p-5">
              <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/70"><Droplet className="h-4 w-4 text-cyan-300/80" /><span>Desired dose</span><button type="button" aria-label="Dose target explanation" className="grid h-5 w-5 place-items-center rounded-full border border-slate-400/50 bg-slate-950/80 text-[11px] font-bold">?</button></div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">Choose whether the per-drop target is expressed as CaCO₃-equivalent ppm or physical salt mg/L. The planned strength uses your stock weight and water calibration; verify drops with the finished stock before relying on them.</p>
              <div role="group" aria-label="Drop target basis" className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-cyan-200/15 bg-slate-950/30 p-1">
                <button type="button" aria-pressed="true" className="rounded-md bg-cyan-400/15 px-2 py-1.5 text-[11px] font-semibold text-cyan-100">ppm as CaCO₃</button>
                <button type="button" aria-pressed="false" className="rounded-md px-2 py-1.5 text-[11px] font-semibold text-slate-500">mg/L salt per drop</button>
              </div>
              <label className="mt-3 block rounded-xl border border-cyan-200/20 bg-slate-950/25 px-3 py-2.5"><span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Desired ppm as CaCO₃ per drop</span><span className="mt-1 flex items-center gap-2"><input className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none" value="5" readOnly /><span className="text-sm text-slate-400">ppm</span></span></label>
              <button type="button" className="mt-3 rounded-lg border border-cyan-200/25 bg-slate-950/25 px-3 py-2 text-xs font-semibold text-cyan-100">Set strength from drop target</button>
              <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] p-3 text-sm text-emerald-50">
                <p>Dose <strong className="text-lg text-emerald-200">5 g stock</strong> for 1 L brewing water.</p>
                <p className="mt-2 text-xs">Water-based planning estimate — not measured finished stock.</p>
                <details className="current-water-details mt-2 rounded-lg border border-emerald-200/15 bg-slate-950/20 px-3 py-2"><summary className="cursor-pointer text-xs text-emerald-100/80">Dose details <ChevronDown className="inline h-3.5 w-3.5" /></summary><p className="mt-2 text-xs">This is a water-based planning estimate. Verify drop behavior with the prepared finished stock before relying on measured drops.</p><p className="mt-1 text-xs text-slate-300">DIY spreadsheet CaCO₃-equivalent is a planning reference, not an additional ion or independent GH/KH target.</p></details>
              </div>
            </section>

            <section className="rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/[0.08] via-slate-800/75 to-slate-800/70 p-4 shadow-xl sm:p-5">
              <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200/75"><Beaker className="h-4 w-4 text-emerald-200/80" /> Preparation</div><button type="button" className="rounded-lg border border-emerald-200/25 bg-slate-950/25 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-100">Save JPG</button></div>
              <h2 className="mt-1 text-base font-semibold text-white">Make this concentrate</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
                <li>Place the bottle on the scale and tare it once.</li>
                <li>Add 1.229 g Magnesium Sulfate to the bottle.</li>
                <li>If you weigh the salt on parchment, use a splash of your measured water to rinse any clinging crystals into the bottle.</li>
                <li>Add water until the total contents weigh 100 g (salt + water; bottle excluded).</li>
                <li>Leave enough headspace for shaking.</li>
                <li>Cap the bottle and shake/mix until the salt dissolves.</li>
              </ol>
              <p className="mt-3 text-xs text-slate-400">For plain water at room temperature, 1 mL ≈ 1 g, so you can weigh your water. This approximation does not apply to finished concentrate.</p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-300/25 bg-emerald-400/[0.08] px-3 py-3 text-emerald-50">
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-300" /> Dissolves at this concentration</span>
                <strong className="text-right text-[10px] tabular-nums">1.24 / 71.67 g per 100 mL</strong>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-slate-500">Solubility uses calculated water mass (plain water ≈ 1 g/mL). Reactive-pair/precipitation checks use that solvent volume as a conservative estimate; finished-stock density is not measured.</p>
              <button type="button" className="mt-3 rounded-lg border border-emerald-200/25 bg-slate-950/25 px-3 py-2 text-xs font-semibold text-emerald-100">Download preparation text</button>
            </section>
            <details className="current-water-details rounded-2xl border border-slate-700/60 bg-slate-900/45 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">Advanced stock strength and safety <ChevronDown className="inline h-3.5 w-3.5" /></summary>
              <div className="mt-3 space-y-3">
                <label className="block text-xs">Recipe strength (× one-liter equivalents)<input className={fieldClass} value="20" readOnly /></label>
                <p className="text-xs text-slate-400">Uses the existing safety margin and ×500 model cap, plus at least one planning drop for 0.1 L. This is an estimate, not a stability guarantee.</p>
              </div>
            </details>
          </section>
        </div>
        <div className="text-center text-[10px] text-slate-500">Static visual reference · sample values only</div>
      </div>
    </main>
  );
}

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
                  <p className="mt-0.5 text-xs text-slate-500">Choose a dropper, calibrate its tip, and prepare stock by weight.</p>
                </div>
              </div>
              <div role="tablist" aria-label="DIY concentrate workspace" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
                <button type="button" role="tab" aria-selected="false" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400">Stock builder</button>
                <button type="button" role="tab" aria-selected="true" className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-2.5 py-1.5 text-xs font-semibold text-rose-200 shadow-sm">DIY Lotus Drops</button>
              </div>
              <div className="flex items-center gap-2"><button type="button" className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-100">Save</button></div>
            </div>
          </section>

          <section className="rounded-2xl border border-rose-400/25 bg-gradient-to-br from-rose-500/[0.08] via-slate-800/70 to-amber-500/[0.06] p-4 shadow-xl sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-100"><FlaskConical className="h-4 w-4 text-rose-300" /> Lotus-style mineral dropper</h2>
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">Select one mineral dropper, then prepare its stock using the same clear card workflow as DIY concentrate.</p>
              </div>
              <span className="rounded-full border border-rose-300/25 bg-rose-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-200">Independent model</span>
            </div>
            <div className="mt-4 grid items-stretch gap-3 sm:grid-cols-2">
              <label className="rounded-xl border border-rose-200/15 bg-slate-950/25 px-3 py-2.5 text-xs text-rose-100">
                <span className="block text-[10px] font-semibold uppercase tracking-wider">Dropper to prepare</span>
                <select className={`${fieldClass} current-water-select pointer-events-none bg-transparent font-semibold text-slate-100`} defaultValue="magnesium" aria-disabled="true" tabIndex={-1}>
                  <option value="magnesium">Magnesium</option>
                </select>
              </label>
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5 text-xs">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Selected mineral</span>
                <strong className="mt-1 block text-sm text-yellow-200">Magnesium Chloride</strong>
                <span className="text-[10px] text-slate-400">MgCl₂ · Hexahydrate</span>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-slate-700/60 bg-slate-950/30 p-1" role="group" aria-label="Lotus dropper tip style">
              <span className="min-h-10 rounded-md bg-cyan-400/10 px-3 py-2 text-center text-xs font-semibold text-cyan-100 ring-1 ring-cyan-200/20">Straight</span>
              <span className="min-h-10 rounded-md px-3 py-2 text-center text-xs font-semibold text-slate-400">Round</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300/15 bg-amber-400/[0.035] px-3 py-2">
              <span className="flex items-center gap-2 text-xs font-medium text-amber-100">
                <span aria-hidden="true" className="h-4 w-4 rounded border border-amber-200/50 bg-slate-950/50" />
                Add bonus Epsom
              </span>
              <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-amber-200">Optional · not Lotus</span>
            </div>
          </section>

          <details className="current-water-details rounded-2xl border border-sky-300/25 bg-gradient-to-br from-sky-400/[0.06] via-slate-800/75 to-blue-500/[0.04] p-4 shadow-xl sm:p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-sky-100">
              <span className="flex items-center gap-2"><Pipette className="h-4 w-4 text-sky-200" /> Dropper calibration</span>
              <span className="flex items-center gap-2">
                <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200"><Check className="mr-1 inline h-3.5 w-3.5" />Straight calibrated</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </span>
            </summary>
            <div className="mt-3">
              <p className="text-xs text-slate-400">Calibrate each tip once. Its saved measurement is shared by every Lotus dropper using that style.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { tip: 'Straight', drops: '100', water: '4', rate: '25.0 drops/mL · calibrated' },
                { tip: 'Round', drops: '', water: '', rate: '11.2 drops/mL · estimate' },
              ].map((calibration) => (
                <fieldset key={calibration.tip} className="rounded-xl border border-sky-200/20 bg-slate-950/25 px-3 py-2.5">
                  <legend className="px-1 text-xs font-semibold text-sky-100">{calibration.tip} tip</legend>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{calibration.tip} tip measured drops<input className="mt-1 min-h-10 w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none placeholder:text-slate-500" placeholder="e.g. 100" value={calibration.drops} readOnly /></label>
                  <label className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{calibration.tip} tip water weight in grams<span className="mt-1 flex items-center gap-2"><input className="min-h-10 w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none placeholder:text-slate-500" placeholder="e.g. 5" value={calibration.water} readOnly /><span className="text-sm text-slate-400">g</span></span></label>
                  <p className="mt-2 text-xs text-slate-400">{calibration.rate}</p>
                </fieldset>
              ))}
              </div>
            </div>
          </details>

          <section className="rounded-2xl border border-cyan-300/25 bg-slate-800/70 p-4 shadow-xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100"><Droplet className="h-4 w-4 text-cyan-300" /> Brew-water volume</div>
              <strong className="text-sm tabular-nums text-cyan-100">450 mL</strong>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-700/70 bg-slate-950/35 p-1" role="group" aria-label="Lotus brew volume units">
                <span className="rounded-md bg-cyan-300/20 px-3 py-1.5 text-[10px] font-semibold text-cyan-100 ring-1 ring-cyan-200/30">mL</span>
                <span className="rounded-md px-3 py-1.5 text-[10px] font-semibold text-slate-400">Liter</span>
                <span className="rounded-md px-3 py-1.5 text-[10px] font-semibold text-slate-400">Gal</span>
              </div>
              <span className="rounded-lg border border-cyan-200/20 bg-slate-950/30 px-3 py-1.5 text-[10px] font-semibold text-cyan-100">Reset to 450 mL</span>
            </div>
            <div className="mt-4 px-1">
              <div className="relative h-2 rounded-full bg-slate-950/70 ring-1 ring-white/5">
                <div className="h-full w-[21%] rounded-full bg-cyan-300/70" />
                <span className="absolute left-[21%] top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-slate-900 bg-cyan-200 shadow" />
              </div>
              <div className="mt-2 flex justify-between text-[9px] tabular-nums text-slate-500"><span>50 mL</span><span>2 L</span></div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Lotus source reference</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-slate-100">+2.431 ppm Mg / drop</div>
                <div className="mt-0.5 text-[9px] text-slate-500">Published source model · 450 mL final water</div>
              </div>
              <div className="rounded-xl border border-cyan-300/25 bg-cyan-400/[0.06] p-3">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-cyan-200/75">Your straight dropper · calibrated</div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-cyan-100">+3.147 ppm Mg / drop</div>
                <div className="mt-0.5 text-[9px] text-slate-500">25.0 drops/mL · 450 mL final water</div>
              </div>
            </div>
            <details className="current-water-details mt-3 rounded-lg border border-cyan-200/15 bg-slate-950/20 px-3 py-2">
              <summary className="cursor-pointer text-xs text-cyan-100/80">How volume and calibration affect these values <ChevronDown className="inline h-3.5 w-3.5" /></summary>
              <p className="mt-2 text-xs text-slate-400">Changing brew-water volume scales the ppm-per-drop references. Calibration changes your dropper result, not the fixed Lotus source reference.</p>
            </details>
          </section>

          <section className="rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/[0.08] via-slate-800/75 to-slate-800/70 p-4 shadow-xl sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200/75"><Beaker className="h-4 w-4 text-emerald-200/80" /> Preparation</div>
                <h2 className="mt-1 text-base font-semibold text-white">Make this stock</h2>
              </div>
              <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-amber-200">Public-data estimate</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Finished stock mass</span>
                <span className="mt-1 flex items-center gap-2"><input className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none" value="100" readOnly /><span className="text-sm text-slate-400">g</span></span>
              </label>
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Salt to weigh</span>
                <strong className="mt-1 block text-xl font-semibold tabular-nums text-white">22.844 g</strong>
                <span className="text-[9px] text-slate-500">Magnesium Chloride · Hexahydrate</span>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Water to add</span>
                <strong className="mt-1 block text-xl font-semibold tabular-nums text-white">77.156 g</strong>
                <span className="text-[9px] text-slate-500">Plain water · bottle excluded</span>
              </div>
            </div>
            <ol className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
              <li className="rounded-lg border border-emerald-200/10 bg-slate-950/20 p-2.5"><span className="mr-1.5 font-bold text-emerald-200">1</span>Tare the empty bottle on the scale.</li>
              <li className="rounded-lg border border-emerald-200/10 bg-slate-950/20 p-2.5"><span className="mr-1.5 font-bold text-emerald-200">2</span>Add salt, then water to the target mass.</li>
              <li className="rounded-lg border border-emerald-200/10 bg-slate-950/20 p-2.5"><span className="mr-1.5 font-bold text-emerald-200">3</span>Leave headspace; cap and shake to dissolve.</li>
            </ol>
            <details className="current-water-details mt-3 rounded-lg border border-emerald-200/15 bg-slate-950/20 px-3 py-2">
              <summary className="cursor-pointer text-xs text-emerald-100/80">About this preparation estimate <ChevronDown className="inline h-3.5 w-3.5" /></summary>
              <p className="mt-2 text-xs text-slate-400">Lotus publishes recipe inputs and average drop weights, not its stock ratios or hydrate forms. This salt-to-water estimate is independent, and calibration changes per-drop readings—not the salt mass.</p>
              <p className="mt-1 text-xs text-slate-400">For plain water, 1 mL is approximately 1 g. All stock calculations remain weight-based.</p>
            </details>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-500">Illustrative layout values · final amounts follow the selected dropper.</span>
              <button type="button" className="shrink-0 rounded-lg border border-emerald-200/25 bg-slate-950/25 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-100">Save JPG</button>
            </div>
          </section>
        </div>
        <div className="text-center text-[10px] text-slate-500">Static visual reference · the live app retains its existing Lotus calculations and saved calibration.</div>
      </div>
    </main>
  );
}

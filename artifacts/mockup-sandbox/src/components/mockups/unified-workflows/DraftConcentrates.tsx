import {
  Beaker,
  Check,
  ChevronDown,
  CircleHelp,
  Droplet,
  FlaskConical,
  Pipette,
  Save,
  Scale,
} from 'lucide-react';
import { WorkflowShell } from './_shared/WorkflowShell';

const fieldClass =
  'mt-1 min-h-11 w-full rounded-lg border border-slate-700/80 bg-slate-950/55 px-3 py-2 text-base font-semibold tabular-nums text-slate-100 outline-none';

function HelpDisclosure({ label, children }: { label: string; children: string }) {
  return (
    <details className="group relative">
      <summary
        aria-label={label}
        className="grid h-8 w-8 cursor-pointer list-none place-items-center rounded-full border border-slate-600/80 bg-slate-950/55 text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 [&::-webkit-details-marker]:hidden"
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-600/80 bg-slate-950 p-3 text-xs leading-relaxed text-slate-300 shadow-2xl sm:w-72">
        {children}
      </div>
    </details>
  );
}

function ReadonlyField({
  label,
  value,
  unit,
  accent = 'text-slate-100',
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}) {
  return (
    <label className="block rounded-xl border border-slate-700/70 bg-slate-950/30 px-3 py-2.5">
      <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">{label}</span>
      <span className="mt-1 flex items-baseline gap-2">
        <input aria-label={label} className={`min-w-0 flex-1 bg-transparent text-xl font-semibold tabular-nums outline-none ${accent}`} value={value} readOnly />
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </span>
    </label>
  );
}

export function DraftConcentrates() {
  return (
    <WorkflowShell active="concentrates">
      <section className="rounded-2xl border border-fuchsia-300/20 bg-slate-900/65 px-4 py-4 shadow-[0_18px_40px_-28px_rgba(2,6,23,0.95)] sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-fuchsia-300/20 bg-fuchsia-400/10 text-fuchsia-200">
              <FlaskConical className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-fuchsia-200/75">Concentrates / DIY stock</p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-50 sm:text-xl">Build a single-salt stock</h1>
            </div>
          </div>
          <div className="flex rounded-xl border border-slate-700/70 bg-slate-950/45 p-1" role="tablist" aria-label="Concentrate type">
            <div role="tab" aria-selected="false" className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-400">Recipe Concentrate</div>
            <div role="tab" aria-selected="true" className="rounded-lg border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 py-2 text-xs font-semibold text-fuchsia-100">DIY Concentrate</div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
          <div className="flex rounded-xl border border-slate-700/70 bg-slate-950/45 p-1" role="tablist" aria-label="DIY concentrate workspace">
            <button type="button" role="tab" aria-selected="true" className="min-h-9 rounded-lg border border-fuchsia-300/25 bg-fuchsia-400/10 px-3 text-xs font-semibold text-fuchsia-100">Stock builder</button>
            <button type="button" role="tab" aria-selected="false" className="min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-400">DIY Lotus Drops</button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs text-slate-400">One mineral · weighed by mass</p>
            <button type="button" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-fuchsia-300/25 bg-fuchsia-400/[0.08] px-3 text-xs font-semibold text-fuchsia-100">
              <Save className="h-3.5 w-3.5" aria-hidden="true" /> Save
            </button>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(390px,0.94fr)]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-sky-300/20 bg-slate-900/65 p-4 shadow-xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Beaker className="h-4 w-4 text-sky-300" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-100">Stock composition</h2>
              </div>
              <span className="rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200">Selected</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="rounded-xl border border-sky-300/20 bg-slate-950/30 px-3 py-2.5 text-xs text-sky-200">
                <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-sky-200/75">Mineral</span>
                <select className={`${fieldClass} border-sky-300/15 text-sky-100`} defaultValue="mgso4" aria-label="Mineral" tabIndex={-1}>
                  <option value="mgso4">Magnesium Sulfate</option>
                </select>
              </label>
              <label className="rounded-xl border border-emerald-300/20 bg-slate-950/30 px-3 py-2.5 text-xs text-emerald-100">
                <span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-emerald-200/75">Hydration form</span>
                <select className={`${fieldClass} border-emerald-300/15 text-emerald-100`} defaultValue="heptahydrate" aria-label="Hydration form" tabIndex={-1}>
                  <option value="heptahydrate">Heptahydrate (Epsom)</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-cyan-400/[0.08] via-slate-900/75 to-blue-500/[0.04] p-4 shadow-xl sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Pipette className="h-4 w-4 text-cyan-200" aria-hidden="true" />
                  <h2 className="text-sm font-semibold text-slate-100">Dropper calibration</h2>
                </div>
                <p className="mt-1 text-xs text-slate-400">Measure each tip separately.</p>
              </div>
              <div className="flex items-center gap-2">
                <HelpDisclosure label="Water calibration help">
                  Measure each water dropper tip separately. These readings estimate water delivered per drop; calibration of the finished stock is a separate measurement.
                </HelpDisclosure>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-2.5 py-1 text-[10px] font-semibold text-amber-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Not calibrated
                </span>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { tip: 'Straight', rate: '20.0 drops/mL · Estimated' },
                { tip: 'Round', rate: '11.2 drops/mL · Estimated' },
              ].map(({ tip, rate }) => (
                <fieldset key={tip} className="rounded-xl border border-sky-200/15 bg-slate-950/30 p-3">
                  <legend className="px-1 text-xs font-semibold text-sky-100">{tip} tip</legend>
                  <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Measured drops
                    <input className={fieldClass} placeholder="Enter count" value="" readOnly aria-label={`${tip} tip measured drops`} />
                  </label>
                  <label className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Water weight
                    <span className="relative block">
                      <input className={`${fieldClass} pr-9`} placeholder="Enter grams" value="" readOnly aria-label={`${tip} tip water weight in grams`} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">g</span>
                    </span>
                  </label>
                  <p className="mt-2 text-xs text-slate-500">{rate}</p>
                </fieldset>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300/15 bg-slate-950/35 px-3 py-2.5">
              <span className="text-xs font-semibold text-sky-100">Stock dropper tip</span>
              <div className="rounded-lg border border-cyan-200/20 bg-cyan-300/[0.08] px-3 py-1.5 text-xs font-semibold text-cyan-100">Straight tip</div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700/70 bg-slate-900/65 p-4 shadow-xl sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-cyan-300" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-100">Stock weight and batch volume</h2>
              </div>
              <HelpDisclosure label="Water weighing help">
                For plain water at room temperature, 1 mL ≈ 1 g. The batch volume is the brewing-water amount used to plan this stock dose. The approximation does not apply to finished concentrate.
              </HelpDisclosure>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ReadonlyField label="Concentrate weight" value="100" unit="g" />
              <ReadonlyField label="Batch volume" value="1.0" unit="L" accent="text-cyan-100" />
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-300/25 bg-slate-900/65 p-4 shadow-xl sm:p-5">
            <div className="flex items-center gap-2">
              <Droplet className="h-4 w-4 text-cyan-300" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-100">Desired dose</h2>
              <HelpDisclosure label="Dose target help">
                This target is expressed as CaCO₃-equivalent ppm per drop. The result below is a water-based planning estimate, not measured finished stock; verify drop behavior after preparation.
              </HelpDisclosure>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-cyan-200/15 bg-slate-950/35 p-1" role="group" aria-label="Drop target basis">
              <div aria-pressed="true" className="rounded-md bg-cyan-300/[0.13] px-2 py-2 text-center text-xs font-semibold text-cyan-100">ppm as CaCO₃</div>
              <div aria-pressed="false" className="rounded-md px-2 py-2 text-center text-xs font-semibold text-slate-500">mg/L salt per drop</div>
            </div>
            <ReadonlyField label="Desired ppm as CaCO₃ per drop" value="5" unit="ppm" accent="text-cyan-100" />
            <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-emerald-300/25 bg-emerald-400/[0.08] px-4 py-3">
              <p className="text-sm text-emerald-50">Dose <strong className="text-xl text-emerald-200">5 g stock</strong> for 1 L brewing water.</p>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-100/70">Planning estimate</span>
              <p className="w-full text-xs text-emerald-100/70">Water-based planning estimate — not measured finished stock.</p>
            </div>
            <details className="group mt-3 rounded-lg border border-emerald-200/15 bg-slate-950/20 px-3 py-2">
              <summary className="cursor-pointer list-none text-xs font-semibold text-emerald-100/85 [&::-webkit-details-marker]:hidden">
                Dose details <ChevronDown className="ml-1 inline h-3.5 w-3.5 transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">DIY spreadsheet CaCO₃-equivalent is a planning reference, not an additional ion or independent GH/KH target. Verify the newly prepared stock before relying on drops.</p>
            </details>
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <section className="overflow-hidden rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/[0.09] via-slate-900/80 to-slate-900/75 shadow-xl">
            <div className="border-b border-emerald-200/10 px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Beaker className="h-4 w-4 text-emerald-200" aria-hidden="true" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200/75">Preparation</p>
                </div>
                <span className="rounded-full border border-emerald-200/15 bg-emerald-300/[0.06] px-2 py-1 text-[10px] font-medium text-emerald-100/70">100 g finished stock</span>
              </div>
              <h2 className="mt-2 text-lg font-semibold text-slate-50">Make this concentrate</h2>
              <p className="mt-1 text-xs text-slate-400">A weighed sequence for one bottle.</p>
            </div>
            <div className="p-4 sm:p-5">
              <ol className="space-y-3.5">
                <li className="flex gap-3 text-sm leading-relaxed text-slate-200">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-emerald-200/15 bg-slate-950/30 text-[10px] font-bold tabular-nums text-emerald-200">1</span>
                  <span>Place the bottle on the scale and tare it once.</span>
                </li>
                <li className="flex gap-3 text-sm leading-relaxed text-slate-200">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-emerald-200/15 bg-slate-950/30 text-[10px] font-bold tabular-nums text-emerald-200">2</span>
                  <span>Add <strong className="font-semibold text-emerald-100">1.229 g Magnesium Sulfate</strong> to the bottle.</span>
                </li>
                <li className="flex gap-3 text-sm leading-relaxed text-slate-200">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-emerald-200/15 bg-slate-950/30 text-[10px] font-bold tabular-nums text-emerald-200">3</span>
                  <span>Rinse any clinging crystals from the weighing surface into the bottle with a splash of measured water.</span>
                </li>
                <li className="flex gap-3 text-sm leading-relaxed text-slate-200">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-emerald-200/15 bg-slate-950/30 text-[10px] font-bold tabular-nums text-emerald-200">4</span>
                  <span>Add water until the <strong className="font-semibold text-emerald-100">total finished stock weighs 100 g</strong> (salt + water; bottle excluded).</span>
                </li>
                <li className="flex gap-3 text-sm leading-relaxed text-slate-200">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-emerald-200/15 bg-slate-950/30 text-[10px] font-bold tabular-nums text-emerald-200">5</span>
                  <span>Leave enough headspace for shaking.</span>
                </li>
                <li className="flex gap-3 text-sm leading-relaxed text-slate-200">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-emerald-200/15 bg-slate-950/30 text-[10px] font-bold tabular-nums text-emerald-200">6</span>
                  <span>Cap the bottle and shake until the salt dissolves.</span>
                </li>
              </ol>
              <p className="mt-4 rounded-xl border border-cyan-200/15 bg-cyan-300/[0.05] p-3 text-xs leading-relaxed text-cyan-50/90">
                <strong className="font-semibold text-cyan-100">Water only:</strong> plain water at room temperature is about 1 mL ≈ 1 g. This does not apply to finished concentrate.
              </p>
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300/25 bg-emerald-400/[0.08] px-3 py-3 text-emerald-50">
                <span className="flex items-center gap-2 text-sm font-medium"><Check className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" /> Dissolves at this concentration</span>
                <strong className="text-right text-[10px] tabular-nums text-emerald-100">1.24 / 71.67 g<br />per 100 mL</strong>
              </div>
              <details className="group mt-3 rounded-xl border border-slate-700/70 bg-slate-950/25 p-3">
                <summary className="cursor-pointer list-none text-xs font-semibold text-slate-200 [&::-webkit-details-marker]:hidden">
                  Solubility basis <ChevronDown className="ml-1 inline h-3.5 w-3.5 transition group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">Solubility uses calculated water mass (plain water ≈ 1 g/mL). Reactive-pair and precipitation checks use that solvent volume as a conservative estimate; finished-stock density is not measured.</p>
              </details>
            </div>
          </section>

          <details className="group rounded-2xl border border-sky-300/20 bg-slate-900/55 p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-sky-100 [&::-webkit-details-marker]:hidden">
              Calibrate this finished stock by weight
              <ChevronDown className="ml-1 inline h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
              <span className="mt-1 block text-xs font-normal text-slate-400">Separate from water-tip calibration</span>
            </summary>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">Tare a receiving cup. Hold the dropper vertically and weigh counted drops of this actual finished stock. Use the same tip.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-300">Counted stock drops<input className={fieldClass} value="" placeholder="Enter count" readOnly /></label>
              <label className="text-xs text-slate-300">Measured stock weight (g)<input className={fieldClass} value="" placeholder="Enter grams" readOnly /></label>
            </div>
            <p className="mt-3 text-xs text-amber-100/80">No finished-stock calibration entered.</p>
          </details>

          <details className="group rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-200 [&::-webkit-details-marker]:hidden">
              Advanced stock strength and safety
              <ChevronDown className="ml-1 inline h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-3 space-y-3">
              <ReadonlyField label="Recipe strength (× one-liter equivalents)" value="20" unit="×" />
              <p className="text-xs leading-relaxed text-slate-400">Uses the existing safety margin and ×500 model cap, plus at least one planning drop for 0.1 L. This is an estimate, not a stability guarantee.</p>
            </div>
          </details>
        </div>
      </div>
    </WorkflowShell>
  );
}

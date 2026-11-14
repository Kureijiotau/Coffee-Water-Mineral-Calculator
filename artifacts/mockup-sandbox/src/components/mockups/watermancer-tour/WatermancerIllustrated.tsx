import './_group.css';
import { useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Droplets,
  FlaskConical,
  HelpCircle,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';

const ions = [
  ['Calcium', 'Ca²⁺', '35', 'cyan'],
  ['Magnesium', 'Mg²⁺', '12', 'indigo'],
  ['Sodium', 'Na⁺', '10', 'slate'],
  ['Chloride', 'Cl⁻', '30', 'emerald'],
  ['Sulfate', 'SO₄²⁻', '45', 'cyan'],
  ['Bicarbonate', 'HCO₃⁻', '25', 'indigo'],
];

function IonCard({ name, symbol, value, tint }: { name: string; symbol: string; value: string; tint: string }) {
  const colors: Record<string, string> = {
    cyan: 'border-cyan-300/15 bg-cyan-300/[0.045]',
    indigo: 'border-indigo-300/15 bg-indigo-300/[0.045]',
    slate: 'border-slate-600/60 bg-slate-800/40',
    emerald: 'border-emerald-300/15 bg-emerald-300/[0.045]',
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${colors[tint]}`}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-300">{name}</span>
        <span className="font-mono text-[10px] text-slate-500">{symbol}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="font-mono text-lg font-semibold tracking-tight text-slate-100">{value}</span>
        <span className="text-[10px] text-slate-500">ppm</span>
      </div>
    </div>
  );
}

export function WatermancerIllustrated() {
  const [tourOpen, setTourOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [activeStart, setActiveStart] = useState<'profile' | 'direct'>('profile');
  const [profileSaved, setProfileSaved] = useState(false);
  const dismiss = () => setTourOpen(false);

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#080d19] p-4 text-slate-100 sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#29354c_0.7px,transparent_0.7px)] [background-size:19px_19px]" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-36 h-[28rem] w-[28rem] rounded-full bg-indigo-500/[0.08] blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-700/70 bg-[#101827]/95 px-5 py-4 shadow-[0_16px_48px_rgba(0,0,0,.22)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] text-cyan-200">
              <Droplets size={19} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/70">Watermancer</p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight">Match your water</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-400 sm:inline-flex">Precision Auto-match</span>
            <button type="button" onClick={() => { setStep(0); setTourOpen(true); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.08] px-3.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">
              <HelpCircle size={15} /> How it works
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.28fr_.72fr]">
          <section data-testid="watermancer-ion-targets" className={`rounded-2xl border bg-[#101827]/95 p-4 shadow-[0_18px_48px_rgba(0,0,0,.22)] transition-all sm:p-5 ${tourOpen ? 'border-cyan-200/50 ring-1 ring-cyan-300/20' : 'border-slate-700/70'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={15} className="text-cyan-200" />
                  <h2 className="text-sm font-semibold text-slate-100">Ion targets</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">Set the profile Watermancer should match.</p>
              </div>
              <button type="button" onClick={() => setProfileSaved(value => !value)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-900/70 px-3 text-xs font-medium text-slate-300 hover:border-cyan-200/30 hover:text-cyan-100">
                {profileSaved ? <Check size={13} /> : <Sparkles size={13} />}
                {profileSaved ? 'Profile saved' : 'Save as profile'}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setActiveStart('profile')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition ${activeStart === 'profile' ? 'border-cyan-200/35 bg-cyan-300/[0.12] text-cyan-100' : 'border-slate-700 bg-slate-900/55 text-slate-400 hover:text-slate-200'}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Aiki profile <ChevronDown size={13} />
              </button>
              <button type="button" onClick={() => setActiveStart('direct')} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition ${activeStart === 'direct' ? 'border-indigo-200/35 bg-indigo-300/[0.1] text-indigo-100' : 'border-slate-700 bg-slate-900/55 text-slate-400 hover:text-slate-200'}`}>
                <SlidersHorizontal size={13} /> Set targets
              </button>
              <span className="ml-auto hidden text-[10px] uppercase tracking-[0.16em] text-slate-600 sm:inline">mg/L · ppm</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {ions.map(([name, symbol, value, tint]) => <IonCard key={name} name={name} symbol={symbol} value={value} tint={tint} />)}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-[11px]">
              <span className="text-slate-500">Targets can be saved for another brew.</span>
              <button type="button" onClick={() => setProfileSaved(true)} className="font-medium text-cyan-200 hover:text-cyan-100">{profileSaved ? 'Saved to profiles' : 'Save targets'}</button>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section data-testid="watermancer-batch-volume" className="rounded-2xl border border-slate-700/70 bg-[#101827]/95 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Batch volume</p>
                <span className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-500">Finished</span>
              </div>
              <p className="mt-3 font-mono text-2xl font-semibold tracking-tight">1.0 <span className="text-base text-slate-400">L</span></p>
              <div className="mt-3 h-1 rounded-full bg-slate-800"><div className="h-1 w-[42%] rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300" /></div>
            </section>
            <section data-testid="watermancer-water-sources" className="rounded-2xl border border-slate-700/70 bg-[#101827]/95 p-4">
              <div className="flex items-center gap-2">
                <Droplets size={15} className="text-cyan-200/80" />
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Source waters</p>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-slate-700 bg-slate-900/45 px-3 py-3">
                <span className="text-xs text-slate-500">No source water selected</span>
                <button type="button" className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 hover:border-cyan-300/30">Add water</button>
              </div>
            </section>
            <section data-testid="watermancer-salts" className="rounded-2xl border border-slate-700/70 bg-[#101827]/95 p-4">
              <div className="flex items-center gap-2">
                <FlaskConical size={15} className="text-indigo-200/80" />
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Available salts</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Calcium chloride', 'Magnesium sulfate', 'Sodium chloride'].map(salt => <span key={salt} className="rounded-lg border border-slate-700 bg-slate-900/65 px-2.5 py-1.5 text-[10px] text-slate-300">{salt}</span>)}
              </div>
            </section>
            <section data-testid="watermancer-auto-match" className="rounded-2xl border border-indigo-300/15 bg-gradient-to-br from-indigo-400/[0.08] to-cyan-300/[0.04] p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-200">Precision Auto-match</p>
                <span className="text-[10px] text-emerald-300">Ready when you are</span>
              </div>
              <button type="button" className="mt-3 w-full rounded-xl border border-cyan-200/20 bg-gradient-to-r from-indigo-500/80 to-cyan-500/80 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-cyan-950/20 hover:brightness-110">Find the best match <ArrowRight className="ml-1 inline" size={14} /></button>
            </section>
          </aside>
          <section data-testid="watermancer-final-mixture" className="rounded-2xl border border-slate-700/70 bg-[#101827]/95 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Final mixture</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div><p className="text-sm font-medium">Match preview</p><p className="mt-1 text-xs text-slate-500">Your final ion levels will appear here.</p></div>
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-200"><Check size={17} /></div>
            </div>
          </section>
          <section data-testid="watermancer-recipe-steps" className="rounded-2xl border border-slate-700/70 bg-[#101827]/95 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-slate-400">Recipe steps</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Water and salt amounts, with preparation steps, appear after matching.</p>
          </section>
        </div>
      </div>

      {tourOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[#050914]/80 p-3 backdrop-blur-[3px] sm:p-6">
          <section role="dialog" aria-modal="true" aria-labelledby="wm-tour-title" className="relative my-auto w-full max-w-[780px] overflow-hidden rounded-[22px] border border-cyan-200/20 bg-[#0e1727] shadow-[0_28px_100px_rgba(0,0,0,.7)]">
            <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
            <header className="flex items-start justify-between gap-4 border-b border-slate-700/70 px-5 py-4 sm:px-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200/75">Watermancer · Guided tour</p>
                <h2 id="wm-tour-title" className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{step === 0 ? 'Choose your ion targets' : 'Your match starts here'}</h2>
              </div>
              <button type="button" aria-label="Skip tour" onClick={dismiss} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={16} /></button>
            </header>
            <div className="grid gap-5 p-5 sm:grid-cols-[1fr_1.03fr] sm:gap-6 sm:p-7">
              <div className="flex flex-col justify-center">
                <p className="max-w-sm text-sm leading-relaxed text-slate-300">
                  Begin with a <strong className="font-semibold text-cyan-100">saved profile</strong>, or set ion goals directly. Already have a mix? Add waters and salts, then save its targets as a new profile.
                </p>
                <div className="mt-5 grid gap-2.5">
                  <div className="flex gap-3 rounded-xl border border-cyan-200/20 bg-cyan-300/[0.055] p-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-cyan-300/10 font-mono text-[11px] font-semibold text-cyan-100">A</span>
                    <div><p className="text-xs font-semibold text-slate-100">Targets first</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">Choose a profile or define your ion goals.</p></div>
                  </div>
                  <div className="flex gap-3 rounded-xl border border-slate-700/80 bg-slate-900/45 p-3">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-indigo-300/10 font-mono text-[11px] font-semibold text-indigo-100">B</span>
                    <div><p className="text-xs font-semibold text-slate-100">Mix first</p><p className="mt-1 text-[11px] leading-relaxed text-slate-400">Add waters and salts; save the resulting targets to a new profile.</p></div>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="h-px w-8 bg-cyan-300/40" />
                  <span>Either route leads to the same target table.</span>
                </div>
              </div>

              <div className="relative rounded-2xl border border-slate-700/80 bg-[#0a1220] p-3.5 sm:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-200"><SlidersHorizontal size={14} className="text-cyan-200" /> Ion target panel</div>
                  <span className="rounded-md border border-cyan-300/15 bg-cyan-300/[0.06] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-100/70">Focus</span>
                </div>
                <div className="rounded-xl border border-cyan-200/45 bg-[#111d2d] p-3 shadow-[0_0_0_3px_rgba(103,232,249,.06)]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-200">Target profile</span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200/25 bg-cyan-300/[0.08] px-2.5 py-1.5 text-[10px] font-semibold text-cyan-100"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Aiki profile <ChevronDown size={11} /></span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                    {ions.slice(0, 4).map(([name, symbol, value], index) => (
                      <div key={name} className={`flex items-center justify-between rounded-lg border px-2 py-1.5 ${index === 0 || index === 3 ? 'border-cyan-200/15 bg-cyan-300/[0.05]' : 'border-slate-700/70 bg-slate-900/55'}`}>
                        <span className="text-[9px] text-slate-400">{name}<span className="ml-1 text-slate-600">{symbol}</span></span>
                        <span className="font-mono text-[10px] font-medium text-slate-200">{value}<span className="ml-0.5 text-[8px] text-slate-500">ppm</span></span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200/20 bg-indigo-300/[0.055] px-2.5 py-2 text-[9px] text-indigo-100/90"><SlidersHorizontal size={11} /> Or set goals directly</div>
                  <ArrowUpRight size={18} className="text-cyan-200/70" />
                  <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-2.5 py-2 text-[9px] text-slate-400">Ion values</div>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-900/45 px-2.5 py-2">
                  <Droplets size={12} className="text-cyan-200/70" />
                  <span className="text-[9px] text-slate-400">Water + salts first</span>
                  <ArrowRight size={12} className="ml-auto text-slate-600" />
                  <span className="text-[9px] font-medium text-emerald-200/90">Save new profile</span>
                </div>
                <ArrowDownRight aria-hidden="true" className="absolute -left-1 bottom-2 hidden text-cyan-200/70 sm:block" size={22} />
                <p className="mt-2 text-center text-[9px] text-slate-600">Targets shown in ppm (mg/L)</p>
              </div>
            </div>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/70 px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <button type="button" onClick={dismiss} className="min-h-10 rounded-lg px-3 text-xs font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white">Skip tour</button>
                <div className="flex items-center gap-1.5" aria-label="Step progress">
                  {[0, 1, 2, 3, 4, 5, 6].map((item) => <span key={item} className={`h-1.5 rounded-full transition-all ${item === step ? 'w-6 bg-cyan-200' : item < step ? 'w-1.5 bg-cyan-200/45' : 'w-1.5 bg-slate-700'}`} />)}
                  <span className="ml-1.5 text-[10px] tabular-nums text-slate-500">{step + 1} / 7</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setStep(index => Math.max(0, index - 1))} disabled={step === 0} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={14} /> Back</button>
                <button type="button" onClick={() => setStep(index => (index + 1) % 7)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-cyan-200/25 bg-cyan-300/[0.12] px-4 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-300/[0.2]">{step === 6 ? 'Finish' : 'Next'}{step === 6 ? <Check size={14} /> : <ArrowRight size={14} />}</button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

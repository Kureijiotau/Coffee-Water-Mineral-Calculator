import type { ReactNode } from 'react';
import {
  Beaker,
  BookOpen,
  Calculator,
  Coffee,
  FlaskConical,
  Pipette,
  Waves,
} from 'lucide-react';
import '../_group.css';

type WorkflowShellProps = {
  active: 'calculator' | 'concentrates';
  children: ReactNode;
};

const navigation = [
  { label: 'Calculator', icon: Calculator, key: 'calculator' },
  { label: 'Concentrates', icon: FlaskConical, key: 'concentrates' },
  { label: 'Mixer', icon: Beaker, key: 'mixer' },
  { label: 'Water grading', icon: Coffee, key: 'grading' },
  { label: 'R. Asami Guide', icon: BookOpen, key: 'asami' },
  { label: 'Watermancer Guide', icon: Pipette, key: 'guide' },
] as const;

export function WorkflowShell({ active, children }: WorkflowShellProps) {
  return (
    <main className="current-water-shell relative min-h-screen px-3 py-4 font-sans text-slate-100 sm:px-6 sm:py-6">
      <div className="relative z-10 mx-auto w-full max-w-6xl space-y-4">
        <header className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/85 shadow-[0_22px_60px_-34px_rgba(2,6,23,0.95)] backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-gradient-to-r from-slate-950 via-cyan-950/55 to-indigo-950/70 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <img
                src="/__mockup/images/watermancer-header.webp"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 shrink-0 object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-[0.16em] text-white">WATERMANCER</p>
                <p className="text-xs text-slate-400">Coffee water, made precise</p>
              </div>
            </div>
            <span className="rounded-full border border-slate-500/30 bg-slate-950/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Design draft · sample values
            </span>
          </div>

          <nav aria-label="Main workspace" className="overflow-x-auto px-2 py-2 sm:px-3">
            <div className="flex min-w-max gap-1">
              {navigation.map(({ label, icon: Icon, key }) => {
                const selected = key === active;
                const accent = key === 'concentrates' ? 'fuchsia' : 'cyan';
                return (
                  <button
                    key={key}
                    type="button"
                    aria-current={selected ? 'page' : undefined}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
                      selected
                        ? accent === 'fuchsia'
                          ? 'border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-100'
                          : 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'
                        : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${selected ? accent === 'fuchsia' ? 'text-fuchsia-300' : 'text-cyan-300' : 'text-slate-500'}`} aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}

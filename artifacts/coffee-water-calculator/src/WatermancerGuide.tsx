import { useState } from 'react';
import { ChevronLeft, ChevronRight, FlaskConical, Pipette } from 'lucide-react';
import {
  WATERMANCER_GUIDE_STEPS,
  type WatermancerGuideEntry,
} from './watermancerGuideContent';

type WatermancerGuideProps = {
  onOpenDiyConcentrate: () => void;
  onOpenWatermancer: () => void;
};

const DIY_STEP_IDS = new Set(['calibrate', 'prepare-stocks']);
const WATERMANCER_STEP_IDS = new Set(['set-targets', 'read-dose-plan', 'make-and-taste']);

function EntryDetails({ entry }: { entry: WatermancerGuideEntry }) {
  return (
    <ul className="mt-3 space-y-2">
      {entry.details.map((detail, index) => (
        <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-slate-300 break-words">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
          <span className="min-w-0">{detail}</span>
        </li>
      ))}
    </ul>
  );
}

const actionClass = 'app-control inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors';

export default function WatermancerGuide({ onOpenDiyConcentrate, onOpenWatermancer }: WatermancerGuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const total = WATERMANCER_GUIDE_STEPS.length;
  const step = WATERMANCER_GUIDE_STEPS[stepIndex];

  const diyButton = (
    <button type="button" onClick={onOpenDiyConcentrate} data-testid="button-open-diy-concentrate"
      className={`${actionClass} border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20`}>
      <Pipette className="h-4 w-4" aria-hidden="true" />Open DIY Concentrate
    </button>
  );
  const wmButton = (
    <button type="button" onClick={onOpenWatermancer} data-testid="button-open-watermancer"
      className={`${actionClass} border-violet-400/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20`}>
      <FlaskConical className="h-4 w-4" aria-hidden="true" />Open Watermancer
    </button>
  );

  return (
    <div className="app-page-stack mx-auto flex w-full max-w-5xl min-w-0 flex-col" data-testid="watermancer-guide">
      <section aria-labelledby="wg-steps-heading" className="app-panel--quiet app-card min-w-0 overflow-hidden border">
          <div className="app-section-header flex items-center justify-between gap-3 border-b border-slate-700/50 px-4 sm:px-6">
            <h2 id="wg-steps-heading" className="app-section-header__title text-xs font-bold uppercase tracking-[0.14em] text-slate-200">Guided path</h2>
            <span className="text-xs font-semibold text-cyan-200" aria-live="polite" data-testid="text-current-step">
              Step {stepIndex + 1} of {total}
            </span>
          </div>

          <ol className="flex gap-1.5 px-4 pt-4 sm:px-6" aria-label="Guide steps">
            {WATERMANCER_GUIDE_STEPS.map((s, i) => (
              <li key={s.id} className="min-w-0 flex-1">
                <button type="button" onClick={() => setStepIndex(i)}
                  aria-current={i === stepIndex ? 'step' : undefined}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  data-testid={`button-step-${s.id}`}
                  className={`flex h-9 w-full items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                    i === stepIndex
                      ? 'border-cyan-300/60 bg-cyan-400/20 text-cyan-100'
                      : i < stepIndex
                        ? 'border-slate-600/60 bg-slate-700/40 text-slate-300'
                        : 'border-slate-700/60 bg-slate-900/30 text-slate-500 hover:text-slate-300'
                  }`}>
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>

          <article className="app-card-body min-w-0" aria-labelledby={`wg-step-${step.id}`} data-testid={`step-${step.id}`}>
            <div className="flex items-start gap-3">
              <span className="app-section-header__step mt-0.5 shrink-0" aria-hidden="true">{stepIndex + 1}</span>
              <div className="min-w-0">
                <h3 id={`wg-step-${step.id}`} className="text-lg font-semibold text-slate-100">{step.title}</h3>
                <p className="mt-1 text-sm font-medium text-cyan-100/80">{step.summary}</p>
              </div>
            </div>
            <EntryDetails entry={step} />

            {(DIY_STEP_IDS.has(step.id) || WATERMANCER_STEP_IDS.has(step.id)) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {DIY_STEP_IDS.has(step.id) && diyButton}
                {WATERMANCER_STEP_IDS.has(step.id) && wmButton}
              </div>
            )}

            <nav className="mt-6 flex items-center justify-between gap-2 border-t border-slate-700/50 pt-4" aria-label="Step navigation">
              <button type="button" onClick={() => setStepIndex(i => Math.max(0, i - 1))} disabled={stepIndex === 0}
                data-testid="button-previous-step"
                className={`${actionClass} border-slate-600/60 bg-slate-800/50 text-slate-200 hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40`}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous step
              </button>
              <button type="button" onClick={() => setStepIndex(i => Math.min(total - 1, i + 1))} disabled={stepIndex === total - 1}
                data-testid="button-next-step"
                className={`${actionClass} border-cyan-400/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40`}>
                Next step<ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          </article>
      </section>
    </div>
  );
}

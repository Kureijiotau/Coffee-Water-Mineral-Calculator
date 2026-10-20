import { Check, FlaskConical } from 'lucide-react';
import type { ReactElement } from 'react';
import { WatermancerGuideScreenshotFrame } from './WatermancerGuideScreenshotFrame';
import { WorkflowScene } from './WatermancerGuideWorkflowPrimitives';

export function WatermancerGuideWorkflowMatchingScene(): ReactElement {
  return (
    <WorkflowScene
      number={4}
      title="Choose salts and match"
      summary="Enable the salts you want Watermancer to use, choose hydration forms, and run a match against the selected ion targets."
    >
      <WatermancerGuideScreenshotFrame
        title="Choose and enable salts"
        description="Salt rows use Use or Not used, show the selected hydration form, and display a suggested milligram dose. Only enabled salts are available to matching."
        testId="watermancer-guide-screen-salt-choices"
      >
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 px-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]">
            <span>Salt</span>
            <span>Hydration form</span>
            <span className="hidden sm:block">Dose</span>
            <span className="hidden sm:block">Use</span>
          </div>
          {[
            { name: 'Magnesium sulfate', form: 'Heptahydrate', dose: '13 mg', active: true },
            { name: 'Magnesium chloride', form: 'Hexahydrate', dose: '19 mg', active: true },
            { name: 'Sodium chloride', form: 'Anhydrous', dose: '4 mg', active: true },
            { name: 'Potassium chloride', form: 'Anhydrous', dose: '2 mg', active: true },
            { name: 'Calcium Chloride', form: 'Dihydrate', dose: '— mg', active: false },
          ].map(salt => (
            <div
              key={salt.name}
              className="grid min-w-0 grid-cols-2 items-center gap-x-2 gap-y-1.5 rounded-lg border border-slate-800/90 bg-slate-900/45 px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
            >
              <span className="min-w-0 break-words text-[10px] font-medium text-slate-200">{salt.name}</span>
              <span className="min-w-0 truncate text-[9px] text-slate-400">{salt.form}</span>
              <span className="text-[10px] font-semibold tabular-nums text-cyan-100 sm:text-right">{salt.dose}</span>
              <span
                className={`inline-flex min-w-0 max-w-full items-center justify-center rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold leading-tight ${
                  salt.active
                    ? 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100'
                    : 'border-slate-600/70 bg-slate-800/70 text-slate-200'
                }`}
              >
                {salt.active ? 'Use' : 'Not used'}
              </span>
            </div>
          ))}
          <p className="pt-1 text-[9px] leading-relaxed text-slate-500">
            Suggested doses update when the targets, selected waters, or hydration form change.
          </p>
        </div>
      </WatermancerGuideScreenshotFrame>

      <WatermancerGuideScreenshotFrame
        title="Find the best match"
        description="Choose Target values or Ratios under Matching mode, then Find the best match. Watermancer searches the selected waters and salts for the best safe match."
        testId="watermancer-guide-screen-matching"
      >
        <div className="space-y-3">
          <div className="min-w-0 rounded-xl border border-indigo-300/25 bg-indigo-400/[0.05] p-3">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-indigo-100">
                  Matching mode
                </span>
                <span className="mt-1 block break-words text-[9px] leading-relaxed text-slate-400">
                  Match each selected ion target directly.
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-lg border border-indigo-300/20 bg-slate-950/50 p-1">
                <span className="rounded-md bg-indigo-300/20 px-2 py-1 text-[9px] font-semibold text-indigo-100">
                  Target values
                </span>
                <span className="px-2 py-1 text-[9px] text-slate-500">Ratios</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-300/25 bg-cyan-400/[0.04] p-3">
            <div className="flex min-w-0 items-center gap-2">
              <FlaskConical className="h-4 w-4 shrink-0 text-cyan-200" aria-hidden="true" />
              <span className="min-w-0 text-[10px] leading-relaxed text-slate-300">
                Search your selected waters and salts for the best safe match.
              </span>
            </div>
            <div className="mt-3 flex min-w-0 items-center justify-center gap-2 rounded-xl border border-cyan-200/40 bg-cyan-300/15 px-3 py-2.5 text-center text-[11px] font-semibold text-cyan-50 shadow-lg shadow-cyan-950/20">
              <span aria-hidden="true">✦</span>
              Find the best match
            </div>
          </div>

          <div className="flex min-w-0 items-start gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.05] px-3 py-2.5">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
            <div className="min-w-0">
              <span className="block text-[10px] font-semibold text-emerald-100">
                Best match found and applied automatically.
              </span>
              <span className="mt-1 block text-[9px] text-slate-400">Review the final mixture next.</span>
            </div>
          </div>
        </div>
      </WatermancerGuideScreenshotFrame>
    </WorkflowScene>
  );
}

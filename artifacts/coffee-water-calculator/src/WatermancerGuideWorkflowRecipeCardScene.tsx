import { Download } from 'lucide-react';
import type { ReactElement } from 'react';
import { WatermancerGuideScreenshotFrame } from './WatermancerGuideScreenshotFrame';
import { EXAMPLE_IONS, IonReading, WorkflowScene } from './WatermancerGuideWorkflowPrimitives';

export function WatermancerGuideWorkflowRecipeCardScene(): ReactElement {
  return (
    <WorkflowScene
      number={5}
      title="Review and save"
      summary="Check the finished batch, its water sources and salt doses, then save a clean image of the recipe card."
    >
      <div className="min-w-0 sm:col-span-2">
        <WatermancerGuideScreenshotFrame
          title="View and save the finished recipe card"
          description="The finished example card shows batch volume, source-water amounts, physical salt doses, and final ion readings, with a Save Recipe Image action for a shareable PNG."
          testId="watermancer-guide-screen-recipe-card"
        >
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/70">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-slate-700/70 bg-gradient-to-r from-cyan-950/50 via-slate-900/70 to-indigo-950/40 px-3 py-3 sm:px-4">
              <div className="min-w-0">
                <span className="block text-[8px] font-bold uppercase tracking-[0.2em] text-cyan-200/65">
                  Finished water recipe
                </span>
                <span className="mt-1 block break-words text-sm font-semibold text-slate-50">
                  Example filter recipe
                </span>
              </div>
              <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-2.5 py-1.5 text-[9px] font-semibold tabular-nums text-cyan-100">
                1.00 L batch
              </span>
            </div>

            <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-2 sm:p-4">
              <div className="min-w-0 rounded-lg border border-slate-700/60 bg-slate-950/35 p-3">
                <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Water mix
                </span>
                <div className="mt-2 space-y-2">
                  {[
                    ['RO / distilled', '942 mL'],
                    ['Magnesium bicarbonate base', '36 mL'],
                    ['Calcium bicarbonate base', '22 mL'],
                  ].map(([name, volume]) => (
                    <div key={name} className="flex min-w-0 items-baseline justify-between gap-2 text-[10px]">
                      <span className="min-w-0 break-words text-slate-300">{name}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-slate-100">{volume}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0 rounded-lg border border-slate-700/60 bg-slate-950/35 p-3">
                <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                  Salt dose
                </span>
                <div className="mt-2 space-y-2">
                  {[
                    ['Magnesium sulfate · heptahydrate', '13 mg'],
                    ['Magnesium chloride · hexahydrate', '19 mg'],
                    ['Sodium chloride', '4 mg'],
                    ['Potassium chloride', '2 mg'],
                  ].map(([name, dose]) => (
                    <div key={name} className="flex min-w-0 items-baseline justify-between gap-2 text-[10px]">
                      <span className="min-w-0 break-words text-slate-300">{name}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-cyan-100">{dose}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0 sm:col-span-2">
                <div className="flex min-w-0 flex-wrap items-end justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
                    Final ion readings
                  </span>
                  <span className="text-[8px] text-slate-500">Example values · ppm</span>
                </div>
                <div className="mt-2 grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-4">
                  {EXAMPLE_IONS.map(ion => (
                    <IonReading key={ion.id} id={ion.id} value={ion.final} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-sky-300/20 bg-sky-400/[0.06] px-2 py-1 text-[9px] text-sky-100">
                    GH 24 ppm as CaCO₃
                  </span>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/[0.06] px-2 py-1 text-[9px] text-emerald-100">
                    KH 10 ppm as CaCO₃
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700/70 bg-slate-950/40 p-3 sm:px-4">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-200/40 bg-sky-300 px-3 py-2.5 text-slate-950 shadow-lg shadow-sky-950/25">
                <span className="flex min-w-0 items-center gap-2 text-[11px] font-bold">
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Save Recipe Image
                </span>
                <span className="text-[9px] font-medium text-slate-800">PNG · shareable + importable</span>
              </div>
            </div>
          </div>
        </WatermancerGuideScreenshotFrame>
      </div>
    </WorkflowScene>
  );
}

import { Check, Plus, Save, Search, Share2 } from 'lucide-react';
import type { ReactElement } from 'react';
import { ION_MAP } from './waterData';
import { WatermancerGuideScreenshotFrame } from './WatermancerGuideScreenshotFrame';
import {
  EXAMPLE_LABEL_IONS,
  ExampleField,
  IonReading,
  StaticAction,
  WorkflowScene,
} from './WatermancerGuideWorkflowPrimitives';

export function WatermancerGuideWorkflowWaterScene(): ReactElement {
  return (
    <WorkflowScene
      number={3}
      title="Add waters"
      summary="Enter a new mineral-water label, add a public Community profile to your plan, or share one of your own saved waters."
    >
      <WatermancerGuideScreenshotFrame
        title="Add a new water source"
        description="Add water source opens a new entry for its name, batch volume, and mineral label readings in mg/L. Save it to My waters or share it with the Community."
        testId="watermancer-guide-screen-add-water"
      >
        <div className="space-y-3">
          <StaticAction label="Add water source" icon={<Plus className="h-3.5 w-3.5" />} tone="cyan" />
          <div className="grid min-w-0 gap-2 sm:grid-cols-2">
            <ExampleField label="Water name" value="Example spring water" />
            <ExampleField label="Amount in batch" value="250" unit="mL" />
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              Mineral label · mg/L
            </span>
            <span className="text-[8px] uppercase tracking-wider text-slate-600">Example values</span>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-1.5">
            {EXAMPLE_LABEL_IONS.map(ion => (
              <IonReading key={ion.id} id={ion.id} value={ion.value} unit="mg/L" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
            <StaticAction label="Save" icon={<Save className="h-3.5 w-3.5" />} tone="emerald" />
            <StaticAction label="Share" icon={<Share2 className="h-3.5 w-3.5" />} tone="violet" />
          </div>
        </div>
      </WatermancerGuideScreenshotFrame>

      <WatermancerGuideScreenshotFrame
        title="Find and use a Community water"
        description="Browse waters opens the Community waters catalog. Search for a public profile and choose Add to my waters to save it and add it to the active plan."
        testId="watermancer-guide-screen-community-water"
      >
        <div className="space-y-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              My waters (0)
            </span>
            <StaticAction label="Browse waters" icon={<Plus className="h-3.5 w-3.5" />} tone="cyan" />
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/55">
            <div className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-800 px-3 py-2.5">
              <span className="text-[11px] font-semibold text-slate-200">Community waters</span>
              <span className="text-[8px] uppercase tracking-wider text-slate-500">Public profiles</span>
            </div>
            <div className="flex min-w-0 items-center gap-2 border-b border-slate-800/80 px-3 py-2">
              <Search className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden="true" />
              <span className="min-w-0 truncate text-[10px] text-slate-500">Search water or country…</span>
            </div>
            <div className="space-y-2 p-2.5">
              <div className="min-w-0 rounded-lg border border-sky-300/20 bg-sky-400/[0.04] p-2.5">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block truncate text-[11px] font-semibold text-slate-100">
                      Community spring · Example
                    </span>
                    <span className="mt-1 block text-[9px] text-slate-500">7 ions in profile</span>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-400/[0.06] px-2 py-1 text-[8px] text-emerald-100/80">
                    PUBLIC
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {EXAMPLE_LABEL_IONS.slice(0, 4).map(ion => (
                    <span
                      key={ion.id}
                      className="min-w-0 rounded-md bg-slate-950/60 px-1.5 py-1 text-center text-[8px] tabular-nums text-slate-300"
                    >
                      {ION_MAP[ion.id].formula} {ion.value}
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <StaticAction label="Add to my waters" icon={<Plus className="h-3.5 w-3.5" />} tone="cyan" />
                  <span className="text-[9px] text-emerald-300">Added</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                <Check className="h-3 w-3 text-emerald-300" aria-hidden="true" />
                Saved to My waters and added to the active plan
              </div>
            </div>
          </div>
        </div>
      </WatermancerGuideScreenshotFrame>

      <div className="min-w-0 sm:col-span-2">
        <WatermancerGuideScreenshotFrame
          title="Share with the community"
          description="A saved personal water has a Share action. Confirming it publishes the water profile so other users can find and use it."
          testId="watermancer-guide-screen-share-water"
        >
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-900/55 p-3">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    My waters
                  </span>
                  <span className="mt-1 block truncate text-xs font-semibold text-slate-100">
                    Example spring water
                  </span>
                  <span className="mt-1 block text-[9px] text-slate-500">Saved water profile</span>
                </div>
                <StaticAction label="Share" icon={<Share2 className="h-3.5 w-3.5" />} tone="violet" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-slate-950/60 px-2 py-1 text-[9px] text-slate-400">Ca 45 mg/L</span>
                <span className="rounded-md bg-slate-950/60 px-2 py-1 text-[9px] text-slate-400">Mg 7 mg/L</span>
                <span className="rounded-md bg-slate-950/60 px-2 py-1 text-[9px] text-slate-400">HCO₃ 120 mg/L</span>
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-violet-300/25 bg-violet-400/[0.05] p-3">
              <div className="flex min-w-0 items-start gap-2">
                <Share2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-200" aria-hidden="true" />
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-slate-100">
                    Share “Example spring water” with the community?
                  </span>
                  <p className="mt-1 break-words text-[10px] leading-relaxed text-slate-400">
                    Other users will be able to find and use this water profile.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <StaticAction label="Cancel" />
                <StaticAction label="Shared" icon={<Check className="h-3.5 w-3.5" />} tone="emerald" />
              </div>
            </div>
          </div>
        </WatermancerGuideScreenshotFrame>
      </div>
    </WorkflowScene>
  );
}

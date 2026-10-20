import {
  Check,
  ChevronDown,
  Download,
  Import,
  Pencil,
  Plus,
  RotateCcw,
  Save,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { WatermancerGuideScreenshotFrame } from './WatermancerGuideScreenshotFrame';
import {
  EXAMPLE_IONS,
  IonReading,
  StaticAction,
  WorkflowScene,
} from './WatermancerGuideWorkflowPrimitives';

export function WatermancerGuideWorkflowRecipeSetupScenes(): ReactElement {
  return (
    <>
      <WorkflowScene
        number={1}
        title="Choose and manage a recipe"
        summary="Pick a saved profile or recipe, then create, edit, download, import, or reset your Watermancer workspace."
      >
        <WatermancerGuideScreenshotFrame
          title="Select a recipe"
          description="The target picker separates My saved profiles from built-in recipe groups. Selecting a saved recipe loads its ion target profile."
          testId="watermancer-guide-screen-recipe-picker"
        >
          <div className="space-y-3">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-indigo-200/75">
                  Set your target water
                </span>
                <span className="mt-1 block text-[10px] text-slate-500">Choose a target source</span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            </div>

            <div className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-900/60 p-2.5">
              <span className="block text-[9px] font-bold uppercase tracking-[0.15em] text-violet-200/75">
                My saved profiles
              </span>
              <div className="mt-2 flex min-w-0 items-center justify-between gap-2 rounded-lg border border-violet-300/30 bg-violet-400/[0.08] px-2.5 py-2">
                <span className="min-w-0 break-words text-[11px] font-semibold text-slate-100">
                  Recipe · Example recipe
                </span>
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                <span className="rounded-md border border-slate-700/70 bg-slate-950/40 px-2 py-1 text-[9px] text-slate-400">
                  Profile · Example profile
                </span>
                <span className="rounded-md border border-emerald-300/20 bg-emerald-400/[0.05] px-2 py-1 text-[9px] text-emerald-100/80">
                  Kimoi.coffee Recipes
                </span>
                <span className="rounded-md border border-cyan-300/20 bg-cyan-400/[0.05] px-2 py-1 text-[9px] text-cyan-100/80">
                  Empirical Water Profiles
                </span>
              </div>
            </div>
          </div>
        </WatermancerGuideScreenshotFrame>

        <div className="min-w-0 sm:col-span-2">
          <WatermancerGuideScreenshotFrame
            title="Create, edit, download, import, and reset"
            description="Example profile controls show New, Edit, Save as new, Overwrite selected, Download, Import, and Reset. Reset clears active waters, salt choices, target inputs, and match results; saved waters, profiles, and preferences stay available."
            testId="watermancer-guide-screen-recipe-actions"
          >
            <div className="space-y-3">
              <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
                <StaticAction label="New" icon={<Plus className="h-3.5 w-3.5" />} tone="emerald" />
                <StaticAction label="Edit" icon={<Pencil className="h-3.5 w-3.5" />} />
                <StaticAction label="Save as new" icon={<Save className="h-3.5 w-3.5" />} tone="emerald" />
                <StaticAction label="Overwrite selected" icon={<Save className="h-3.5 w-3.5" />} tone="indigo" />
                <StaticAction label="Download" icon={<Download className="h-3.5 w-3.5" />} />
                <StaticAction label="Import" icon={<Import className="h-3.5 w-3.5" />} />
                <StaticAction label="Reset" icon={<RotateCcw className="h-3.5 w-3.5" />} tone="rose" />
              </div>

              <div className="grid min-w-0 gap-2 rounded-xl border border-slate-700/60 bg-slate-900/50 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Recipe name
                  </span>
                  <span className="mt-1 block truncate rounded-md border border-slate-700/70 bg-slate-950/60 px-2.5 py-1.5 text-[11px] text-slate-100">
                    Example recipe
                  </span>
                </div>
                <StaticAction label="Rename recipe" icon={<Pencil className="h-3.5 w-3.5" />} />
                <p className="break-words text-[10px] leading-relaxed text-slate-400 sm:col-span-2">
                  New starts a zero-target profile. Edit targets, then save as new or overwrite the selected profile.
                  Import water profile and Download current profile move a saved setup between files.
                </p>
              </div>

              <div className="min-w-0 rounded-xl border border-rose-300/20 bg-rose-400/[0.04] p-3">
                <div className="flex min-w-0 items-start gap-2">
                  <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-200" aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-100">Reset Watermancer?</span>
                    <p className="mt-1 break-words text-[10px] leading-relaxed text-slate-400">
                      This clears the active waters, salt choices, target inputs, and match results. Saved waters,
                      profiles, and preferences will stay available.
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <StaticAction label="Cancel" />
                  <StaticAction label="Reset workspace" tone="rose" />
                </div>
              </div>
            </div>
          </WatermancerGuideScreenshotFrame>
        </div>
      </WorkflowScene>

      <WorkflowScene
        number={2}
        title="Set the plan"
        summary="Choose the ion profile you want to reach and set the final batch volume for the water you are preparing."
      >
        <WatermancerGuideScreenshotFrame
          title="Set ion targets"
          description="The Set your target water screen shows the selected example recipe and its seven ion targets in ppm. Edit opens the target controls."
          testId="watermancer-guide-screen-ion-targets"
        >
          <div className="space-y-3">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-300/20 bg-indigo-400/[0.05] px-3 py-2.5">
              <div className="min-w-0">
                <span className="block text-[9px] font-semibold uppercase tracking-[0.15em] text-indigo-200/75">
                  Set your target water
                </span>
                <span className="mt-1 block truncate text-[11px] font-semibold text-slate-100">
                  Recipe · Example recipe
                </span>
              </div>
              <StaticAction label="Edit" icon={<Pencil className="h-3.5 w-3.5" />} />
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-1.5">
              {EXAMPLE_IONS.map(ion => (
                <IonReading key={ion.id} id={ion.id} value={ion.target} />
              ))}
            </div>
            <p className="text-[9px] leading-relaxed text-slate-500">Target values · mg/L (ppm)</p>
          </div>
        </WatermancerGuideScreenshotFrame>

        <WatermancerGuideScreenshotFrame
          title="Set final batch volume"
          description="The Final batch volume control sets the size of the finished batch. This example shows one liter with a liters and US gallons unit toggle."
          testId="watermancer-guide-screen-batch-volume"
        >
          <div className="space-y-3">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="block text-xs font-semibold text-slate-100">Final batch volume</span>
                <span className="mt-1 block text-[9px] uppercase tracking-[0.15em] text-cyan-200/50">
                  Recipe output
                </span>
              </div>
              <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-400/[0.06] px-2 py-1 text-[8px] font-semibold uppercase tracking-wider text-cyan-100/70">
                Example
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-cyan-300/35 bg-gradient-to-r from-cyan-950/70 to-slate-950/70 p-2 shadow-inner shadow-cyan-950/30">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200">
                <span className="text-[10px] font-bold">−</span>
              </span>
              <span className="min-w-0 flex-1 text-center text-2xl font-semibold tabular-nums text-slate-100">
                1.00 <span className="text-sm font-medium text-cyan-200">L</span>
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-200">
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500">Volume units</span>
              <div className="flex items-center gap-1 rounded-lg border border-slate-700/70 bg-slate-900/70 p-1">
                <span className="rounded-md bg-cyan-400/15 px-2.5 py-1 text-[9px] font-semibold text-cyan-100">L</span>
                <span className="px-2 py-1 text-[9px] text-slate-500">US gal</span>
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-slate-400">
              Set the final amount you plan to brew; the water volumes and dose calculations follow that batch size.
            </p>
          </div>
        </WatermancerGuideScreenshotFrame>
      </WorkflowScene>
    </>
  );
}

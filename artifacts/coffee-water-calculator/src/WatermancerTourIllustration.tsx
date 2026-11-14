import {
  ArrowDown,
  ArrowRight,
  Beaker,
  Check,
  Droplets,
  FlaskConical,
  Gauge,
  ListChecks,
  LockKeyhole,
  Scale,
  Sparkles,
  Target,
} from 'lucide-react';
import type { WatermancerTourIllustrationKey } from './guidedTour';

type Props = {
  illustrationKey: WatermancerTourIllustrationKey;
};

const smallCard = 'rounded-lg border border-cyan-200/15 bg-slate-950/65 px-2.5 py-2';
const label = 'text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400';
const iconClass = 'h-4 w-4 shrink-0 text-cyan-200';

function IonTargetsDiagram() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className={`${smallCard} flex min-h-[86px] flex-col items-center justify-center text-center`}>
        <span className={label}>Targets first</span>
        <span className="mt-1 text-[10px] text-slate-200">Choose profile or enter goals</span>
        <ArrowDown className="mt-1 h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-cyan-100">Ion target table</span>
      </div>
      <div className={`${smallCard} flex min-h-[86px] flex-col items-center justify-center text-center`}>
        <span className={label}>Mix first</span>
        <span className="mt-1 text-[10px] text-slate-200">Add source water + salts</span>
        <ArrowDown className="mt-1 h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-indigo-100">Save ions as profile</span>
      </div>
      <div className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-cyan-200/25 bg-cyan-300/[0.07] px-2 py-2 text-[10px] font-semibold text-cyan-100">
        <Target className="h-4 w-4" aria-hidden="true" />
        Both paths use ion targets
      </div>
    </div>
  );
}

function BatchVolumeDiagram() {
  return (
    <div className="space-y-2">
      <div className={`${smallCard} flex items-center justify-between gap-2`}>
        <span className="text-[10px] font-medium text-slate-200">Finished batch</span>
        <span className="rounded-md border border-cyan-200/30 bg-cyan-300/10 px-2 py-1 text-[10px] font-semibold text-cyan-100">Set volume</span>
      </div>
      <div className="flex items-center justify-center gap-2 text-center">
        <div className="flex items-center gap-1 text-[10px] text-slate-300">
          <Droplets className={iconClass} aria-hidden="true" /> Water
        </div>
        <span className="text-slate-500">+</span>
        <div className="flex items-center gap-1 text-[10px] text-slate-300">
          <FlaskConical className={iconClass} aria-hidden="true" /> Salts
        </div>
        <ArrowRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        <div className="rounded-lg border border-cyan-200/25 bg-cyan-300/[0.07] px-2 py-2 text-[10px] font-semibold text-cyan-100">Finished water</div>
      </div>
      <p className="text-center text-[9px] text-slate-500">One batch size guides each amount</p>
    </div>
  );
}

function SourceWatersDiagram() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`${smallCard} flex min-h-[82px] flex-col items-center justify-center gap-1`}>
        <Droplets className="h-5 w-5 text-sky-300" aria-hidden="true" />
        <span className="text-[10px] font-medium text-slate-200">Source water</span>
        <span className="text-[9px] text-slate-500">Optional</span>
      </div>
      <ArrowRight className="h-5 w-5 text-cyan-300" aria-hidden="true" />
      <div className={`${smallCard} flex min-h-[82px] flex-col items-center justify-center gap-1`}>
        <Beaker className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <span className="text-[10px] font-medium text-slate-200">Final mixture</span>
        <span className="rounded-full border border-sky-200/20 bg-sky-300/10 px-1.5 py-0.5 text-[9px] text-sky-100">ions count</span>
      </div>
    </div>
  );
}

function SaltsDiagram() {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-cyan-200/20 bg-cyan-300/[0.06] px-2 py-1.5">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-200"><Check className="h-3 w-3 text-cyan-300" aria-hidden="true" /> Selected salt</span>
        <span className="text-[9px] font-semibold text-cyan-100">May use</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-amber-200/20 bg-amber-300/[0.05] px-2 py-1.5">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-200"><LockKeyhole className="h-3 w-3 text-amber-200" aria-hidden="true" /> Edited dose</span>
        <span className="text-[9px] font-semibold text-amber-100">Held fixed</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-indigo-200/20 bg-indigo-300/[0.05] px-2 py-1.5">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-200"><Gauge className="h-3 w-3 text-indigo-200" aria-hidden="true" /> Other selected salts</span>
        <span className="text-[9px] font-semibold text-indigo-100">Match adjusts</span>
      </div>
    </div>
  );
}

function AutoMatchDiagram() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-1.5">
        <div className={`${smallCard} flex-1 text-center`}>
          <Target className="mx-auto h-4 w-4 text-cyan-200" aria-hidden="true" />
          <span className="mt-1 block text-[9px] text-slate-300">Ion targets</span>
        </div>
        <span className="text-[10px] text-slate-500">+</span>
        <div className={`${smallCard} flex-1 text-center`}>
          <FlaskConical className="mx-auto h-4 w-4 text-indigo-200" aria-hidden="true" />
          <span className="mt-1 block text-[9px] text-slate-300">Waters + salts</span>
        </div>
        <ArrowRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
      </div>
      <div className="flex items-center justify-center gap-2 rounded-lg border border-cyan-200/25 bg-cyan-300/[0.07] px-2 py-2">
        <Sparkles className="h-4 w-4 text-cyan-200" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-cyan-100">Find the best match</span>
        <ArrowRight className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
        <span className="text-[10px] font-semibold text-white">Plan applied</span>
      </div>
    </div>
  );
}

function FinalMixtureDiagram() {
  return (
    <div className={`${smallCard} space-y-2`}>
      <div className="flex items-center justify-between">
        <span className={label}>Illustrative comparison</span>
        <Scale className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
      </div>
      {[
        { name: 'Calcium', target: 'w-4/5', final: 'w-3/5' },
        { name: 'Magnesium', target: 'w-2/3', final: 'w-3/4' },
      ].map(row => (
        <div key={row.name} className="grid grid-cols-[52px_1fr] items-center gap-2">
          <span className="text-[9px] text-slate-300">{row.name}</span>
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-slate-800"><div className={`h-full rounded-full bg-cyan-300 ${row.target}`} /></div>
            <div className="h-1.5 rounded-full bg-slate-800"><div className={`h-full rounded-full bg-indigo-300 ${row.final}`} /></div>
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-3 text-[9px] text-slate-400">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />Target</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />Final</span>
      </div>
    </div>
  );
}

function RecipeStepsDiagram() {
  return (
    <div className="space-y-1.5">
      {[
        { icon: Droplets, text: 'Measure the water' },
        { icon: FlaskConical, text: 'Weigh selected salts' },
        { icon: ListChecks, text: 'Mix and follow the steps' },
      ].map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.text} className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/65 px-2 py-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cyan-200/25 bg-cyan-300/[0.08] text-[9px] font-semibold text-cyan-100">{index + 1}</span>
            <Icon className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
            <span className="text-[10px] text-slate-200">{step.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export function WatermancerTourIllustration({ illustrationKey }: Props) {
  return (
    <>
      {illustrationKey === 'ion-targets' && <IonTargetsDiagram />}
      {illustrationKey === 'batch-volume' && <BatchVolumeDiagram />}
      {illustrationKey === 'source-waters' && <SourceWatersDiagram />}
      {illustrationKey === 'salts' && <SaltsDiagram />}
      {illustrationKey === 'auto-match' && <AutoMatchDiagram />}
      {illustrationKey === 'final-mixture' && <FinalMixtureDiagram />}
      {illustrationKey === 'recipe-steps' && <RecipeStepsDiagram />}
    </>
  );
}

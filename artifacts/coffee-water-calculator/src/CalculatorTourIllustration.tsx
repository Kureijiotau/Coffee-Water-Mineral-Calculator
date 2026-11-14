import {
  Activity,
  ArrowDown,
  ArrowRight,
  Beaker,
  Check,
  ClipboardList,
  Droplets,
  FlaskConical,
  Layers3,
  ListChecks,
  Scale,
} from 'lucide-react';
import type { CalculatorTourIllustrationKey } from './guidedTour';

type Props = {
  illustrationKey: CalculatorTourIllustrationKey;
};

const card = 'rounded-lg border border-cyan-200/15 bg-slate-950/65 px-2.5 py-2';
const label = 'text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400';
const icon = 'h-4 w-4 shrink-0 text-cyan-200';

function Flow({ first, second, result }: { first: string; second: string; result: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <div className={`${card} flex-1 text-center text-[10px] text-slate-200`}>{first}</div>
      <span className="text-xs text-slate-500">+</span>
      <div className={`${card} flex-1 text-center text-[10px] text-slate-200`}>{second}</div>
      <ArrowRight className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
      <div className="rounded-lg border border-cyan-200/25 bg-cyan-300/[0.08] px-2 py-2 text-center text-[10px] font-semibold text-cyan-100">{result}</div>
    </div>
  );
}

function BatchVolumeDiagram() {
  return (
    <div className="space-y-2">
      <div className={`${card} flex items-center justify-between`}>
        <span className="flex items-center gap-2 text-[10px] text-slate-200"><Droplets className={icon} aria-hidden="true" />Finished batch</span>
        <span className="rounded-md border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 text-[9px] font-semibold text-cyan-100">Volume</span>
      </div>
      <Flow first="Water" second="Recipe doses" result="Brew water" />
    </div>
  );
}

function MineralRecipeDiagram() {
  return (
    <div className="space-y-2">
      <div className={`${card} flex items-center gap-2`}>
        <Layers3 className={icon} aria-hidden="true" />
        <span className="text-[10px] font-semibold text-slate-200">Mineral targets</span>
        <ArrowDown className="ml-auto h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className={`${card} text-center`}><span className={label}>Hardness</span><p className="mt-1 text-[10px] text-slate-200">GH contributors</p></div>
        <div className={`${card} text-center`}><span className={label}>Alkalinity</span><p className="mt-1 text-[10px] text-slate-200">KH contributors</p></div>
      </div>
      <p className="text-center text-[9px] text-slate-500">Targets translate to direct salt doses</p>
    </div>
  );
}

function SummaryDiagram({ saltOnly = false }: { saltOnly?: boolean }) {
  const metrics = saltOnly ? ['Salt GH', 'Salt KH', 'Salt TDS'] : ['GH', 'KH', 'TDS', 'Ratio'];
  return (
    <div className="space-y-2">
      <div className={`${card} flex items-center justify-between`}>
        <span className={label}>{saltOnly ? 'Salt contribution' : 'Recipe overview'}</span>
        <Scale className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
      </div>
      <div className={`grid ${saltOnly ? 'grid-cols-3' : 'grid-cols-4'} gap-1.5`}>
        {metrics.map(metric => (
          <div key={metric} className="rounded-md border border-white/10 bg-slate-900/80 px-1 py-2 text-center">
            <span className="block text-[9px] text-slate-400">{metric}</span>
            <span className="mt-1 block text-sm font-semibold text-cyan-100">—</span>
          </div>
        ))}
      </div>
      {saltOnly && <p className="text-center text-[9px] text-slate-500">Source water is separate</p>}
    </div>
  );
}

function RecipeStepsDiagram() {
  return (
    <div className="space-y-1.5">
      {[
        { icon: Droplets, text: 'Measure the water' },
        { icon: FlaskConical, text: 'Weigh or dose minerals' },
        { icon: ListChecks, text: 'Mix and check off steps' },
      ].map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={item.text} className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/65 px-2 py-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-200/25 text-[9px] font-semibold text-cyan-100">{index + 1}</span>
            <Icon className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
            <span className="text-[10px] text-slate-200">{item.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function MineralWaterBaseDiagram() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`${card} flex flex-1 flex-col items-center gap-1 text-center`}>
        <Droplets className="h-5 w-5 text-sky-300" aria-hidden="true" />
        <span className="text-[10px] text-slate-200">Optional mineral water</span>
      </div>
      <ArrowRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
      <div className={`${card} flex flex-1 flex-col items-center gap-1 text-center`}>
        <Beaker className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <span className="text-[10px] text-slate-200">Recipe contribution</span>
      </div>
    </div>
  );
}

function RecipeSelectionDiagram() {
  return (
    <div className="space-y-1.5">
      <div className={`${card} flex items-center justify-between`}>
        <span className="flex items-center gap-2 text-[10px] text-slate-200"><ClipboardList className={icon} aria-hidden="true" />Choose or import</span>
        <Check className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {['Select', 'Adjust', 'Save'].map(item => (
          <div key={item} className="rounded-md border border-white/10 bg-slate-900/80 px-1 py-2 text-center text-[9px] font-medium text-slate-300">{item}</div>
        ))}
      </div>
      <p className="text-center text-[9px] text-slate-500">Recipe controls stay in one place</p>
    </div>
  );
}

function IonWatchDiagram() {
  return (
    <div className={`${card} space-y-2`}>
      <div className="flex items-center justify-between">
        <span className={label}>Profile range check</span>
        <Activity className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
      </div>
      {['Calcium', 'Magnesium', 'Bicarbonate'].map((name, index) => (
        <div key={name} className="grid grid-cols-[68px_1fr_auto] items-center gap-2">
          <span className="text-[9px] text-slate-300">{name}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className={`h-full rounded-full ${index === 1 ? 'w-1/2 bg-amber-300' : 'w-3/4 bg-cyan-300'}`} />
          </div>
          {index === 1 ? <span className="text-[8px] text-amber-200">Review</span> : <Check className="h-3 w-3 text-cyan-300" aria-hidden="true" />}
        </div>
      ))}
      <p className="text-right text-[9px] text-slate-500">Check only · recipe unchanged</p>
    </div>
  );
}

export function CalculatorTourIllustration({ illustrationKey }: Props) {
  switch (illustrationKey) {
    case 'brewer-batch-volume':
    case 'alchemist-batch-volume':
      return <BatchVolumeDiagram />;
    case 'brewer-mineral-recipe':
      return <MineralRecipeDiagram />;
    case 'brewer-salt-summary':
      return <SummaryDiagram />;
    case 'brewer-recipe-steps':
    case 'alchemist-recipe-steps':
      return <RecipeStepsDiagram />;
    case 'alchemist-mineral-water-base':
      return <MineralWaterBaseDiagram />;
    case 'alchemist-mineral-recipe':
      return <RecipeSelectionDiagram />;
    case 'alchemist-ion-watch':
      return <IonWatchDiagram />;
    case 'alchemist-salt-summary':
      return <SummaryDiagram saltOnly />;
  }
}

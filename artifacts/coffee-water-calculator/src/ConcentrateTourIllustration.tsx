import {
  ArrowDown,
  ArrowRight,
  Beaker,
  Check,
  Droplet,
  Droplets,
  FlaskConical,
  Gauge,
  Layers3,
  Pipette,
  Scale,
  Target,
} from 'lucide-react';
import type { ConcentrateTourIllustrationKey } from './guidedTour';

type Props = {
  illustrationKey: ConcentrateTourIllustrationKey;
};

const card = 'rounded-lg border border-cyan-200/15 bg-slate-950/65 px-2.5 py-2';
const label = 'text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400';
const icon = 'h-4 w-4 shrink-0 text-cyan-200';

function EmptyRecipeDiagram() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`${card} flex flex-col items-center gap-1 text-center`}>
        <FlaskConical className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <span className="text-[10px] text-slate-200">Calculator recipe</span>
      </div>
      <ArrowRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
      <div className={`${card} flex flex-col items-center gap-1 text-center`}>
        <Beaker className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <span className="text-[10px] text-slate-200">Concentrate plan</span>
      </div>
    </div>
  );
}

function RecipeOverviewDiagram() {
  return (
    <div className="space-y-2">
      <div className={`${card} flex items-center justify-between`}>
        <span className="flex items-center gap-2 text-[10px] text-slate-200"><FlaskConical className={icon} aria-hidden="true" />Calculator recipe</span>
        <span className="rounded-full border border-cyan-200/20 px-2 py-0.5 text-[9px] text-cyan-100">Imported</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className={`${card} text-center`}><Droplets className="mx-auto h-4 w-4 text-sky-300" aria-hidden="true" /><span className="mt-1 block text-[9px] text-slate-300">Brew amount</span></div>
        <div className={`${card} text-center`}><Layers3 className="mx-auto h-4 w-4 text-cyan-200" aria-hidden="true" /><span className="mt-1 block text-[9px] text-slate-300">Stock plan</span></div>
      </div>
    </div>
  );
}

function StockArrangementDiagram() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[
        { title: 'Separate', detail: 'One stock per salt', width: 'w-1/3' },
        { title: 'Grouped', detail: 'Compatible salts', width: 'w-2/3' },
        { title: 'All-in-one', detail: 'Shared proportions', width: 'w-full' },
      ].map(option => (
        <div key={option.title} className={`${card} min-w-0 text-center`}>
          <span className="text-[9px] font-semibold text-slate-200">{option.title}</span>
          <div className="my-2 flex h-4 items-end justify-center gap-0.5">
            {Array.from({ length: option.title === 'Separate' ? 3 : option.title === 'Grouped' ? 2 : 1 }).map((_, index) => (
              <span key={index} className={`h-4 ${option.width} min-w-2 rounded-t border border-cyan-200/30 bg-cyan-300/15`} />
            ))}
          </div>
          <span className="block text-[8px] leading-tight text-slate-400">{option.detail}</span>
        </div>
      ))}
    </div>
  );
}

function StockWeightDiagram() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`${card} flex flex-1 flex-col items-center gap-1 text-center`}>
        <Scale className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <span className={label}>Finished stock mass</span>
      </div>
      <span className="text-sm text-slate-500">≠</span>
      <div className={`${card} flex flex-1 flex-col items-center gap-1 text-center`}>
        <Beaker className="h-5 w-5 text-indigo-200" aria-hidden="true" />
        <span className="text-[9px] text-slate-300">Bottle mass</span>
      </div>
    </div>
  );
}

function DoseDiagram() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-1.5">
        <div className={`${card} flex-1 text-center`}><span className={label}>Stock</span><Pipette className="mx-auto mt-1 h-4 w-4 text-cyan-200" aria-hidden="true" /></div>
        <span className="text-[10px] text-slate-500">+</span>
        <div className={`${card} flex-1 text-center`}><span className={label}>Brew size</span><Droplets className="mx-auto mt-1 h-4 w-4 text-sky-300" aria-hidden="true" /></div>
        <ArrowRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        <div className="rounded-lg border border-cyan-200/25 bg-cyan-300/[0.08] px-2 py-2 text-center text-[9px] font-semibold text-cyan-100">Dose</div>
      </div>
      <p className="text-center text-[9px] text-slate-500">A plan amount, not a live reading</p>
    </div>
  );
}

function PreparationDiagram({ singleSalt = false }: { singleSalt?: boolean }) {
  return (
    <div className="space-y-1.5">
      {[
        { title: 'Tare the bottle', icon: Scale },
        { title: singleSalt ? 'Add selected salt' : 'Add recipe salts', icon: FlaskConical },
        { title: 'Add water to finish', icon: Droplet },
      ].map((step, index) => {
        const Icon = step.icon;
        return (
          <div key={step.title} className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/65 px-2 py-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-200/25 text-[9px] font-semibold text-cyan-100">{index + 1}</span>
            <Icon className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
            <span className="text-[10px] text-slate-200">{step.title}</span>
            {index === 2 && <span className="ml-auto text-[8px] text-slate-500">Leave headspace</span>}
          </div>
        );
      })}
    </div>
  );
}

function MineralSelectionDiagram() {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className={`${card} flex flex-col items-center gap-1 text-center`}>
        <Beaker className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <span className={label}>Mineral</span>
        <span className="text-[10px] text-slate-200">Select one salt</span>
      </div>
      <div className={`${card} flex flex-col items-center gap-1 text-center`}>
        <Layers3 className="h-5 w-5 text-indigo-200" aria-hidden="true" />
        <span className={label}>Hydration</span>
        <span className="text-[10px] text-slate-200">Choose a form</span>
      </div>
    </div>
  );
}

function StockBuilderCalibrationDiagram() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <span className={label}>Measure plain water</span>
        <Pipette className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
      </div>
      {['Straight tip', 'Round tip'].map((tip, index) => (
        <div key={tip} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${index === 0 ? 'border-cyan-200/25 bg-cyan-300/[0.07]' : 'border-white/10 bg-slate-950/50'}`}>
          <span className="text-[9px] text-slate-200">{tip}</span>
          <span className="ml-auto text-[8px] text-slate-400">drops</span>
          <span className="text-[8px] text-slate-500">+</span>
          <span className="text-[8px] text-slate-400">water weight</span>
          {index === 0 && <Check className="h-3 w-3 text-cyan-300" aria-hidden="true" />}
        </div>
      ))}
    </div>
  );
}

function LotusCalibrationDiagram() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`${card} flex flex-1 flex-col items-center gap-1 text-center`}>
        <Pipette className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <span className="text-[9px] text-slate-300">Selected tip</span>
      </div>
      <ArrowRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
      <div className={`${card} flex flex-1 flex-col items-center gap-1 text-center`}>
        <Scale className="h-5 w-5 text-indigo-200" aria-hidden="true" />
        <span className="text-[9px] text-slate-300">Drops + water mass</span>
      </div>
      <ArrowRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
      <div className="rounded-lg border border-cyan-200/25 bg-cyan-300/[0.08] px-2 py-2 text-[9px] font-semibold text-cyan-100">Rate</div>
    </div>
  );
}

function StockSetupDiagram() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className={`${card} text-center`}><Scale className="mx-auto h-4 w-4 text-cyan-200" aria-hidden="true" /><span className="mt-1 block text-[9px] text-slate-300">Stock weight</span></div>
        <div className={`${card} text-center`}><Droplets className="mx-auto h-4 w-4 text-sky-300" aria-hidden="true" /><span className="mt-1 block text-[9px] text-slate-300">Brew volume</span></div>
      </div>
      <p className="text-center text-[9px] text-slate-500">Stock size is planned for a water amount</p>
    </div>
  );
}

function StockBuilderDoseDiagram() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className={`${card} flex items-center gap-1.5`}><Target className="h-4 w-4 text-cyan-200" aria-hidden="true" /><span className="text-[9px] text-slate-200">CaCO₃ equivalent</span></div>
        <div className={`${card} flex items-center gap-1.5`}><Gauge className="h-4 w-4 text-indigo-200" aria-hidden="true" /><span className="text-[9px] text-slate-200">Physical salt</span></div>
      </div>
      <ArrowDown className="mx-auto h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
      <div className="rounded-md border border-cyan-200/25 bg-cyan-300/[0.08] px-2 py-1.5 text-center text-[10px] font-semibold text-cyan-100">Target shapes stock strength</div>
    </div>
  );
}

function LotusDropperDiagram() {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`${card} flex flex-1 items-center gap-2`}>
        <Pipette className={icon} aria-hidden="true" />
        <span className="text-[10px] text-slate-200">Choose stock</span>
      </div>
      <ArrowRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
      <div className={`${card} flex flex-1 items-center gap-2`}>
        <Beaker className={icon} aria-hidden="true" />
        <span className="text-[10px] text-slate-200">Mineral + form</span>
      </div>
    </div>
  );
}

function LotusVolumeDiagram() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <div className={`${card} flex items-center gap-2`}><Pipette className={icon} aria-hidden="true" /><span className="text-[10px] text-slate-200">One drop</span></div>
        <ArrowRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        <div className={`${card} flex items-center gap-2`}><Droplets className={icon} aria-hidden="true" /><span className="text-[10px] text-slate-200">Brew water</span></div>
      </div>
      <p className="text-center text-[9px] text-slate-500">Volume changes the contribution per drop</p>
    </div>
  );
}

function LotusPerDropDiagram() {
  return (
    <div className="space-y-2">
      <span className={`${label} block text-center`}>Illustrative comparison</span>
      {[
        { name: 'Lotus reference', width: 'w-2/3', color: 'bg-cyan-300' },
        { name: 'Calibrated estimate', width: 'w-1/2', color: 'bg-indigo-300' },
      ].map(row => (
        <div key={row.name} className="grid grid-cols-[92px_1fr] items-center gap-2">
          <span className="text-[9px] text-slate-300">{row.name}</span>
          <div className="h-2 rounded-full bg-slate-800"><div className={`h-full rounded-full ${row.color} ${row.width}`} /></div>
        </div>
      ))}
      <p className="text-right text-[8px] text-slate-500">Compare; do not assume equal</p>
    </div>
  );
}

function LotusStockPreparationDiagram() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-1.5">
        <div className={`${card} flex-1 text-center`}><FlaskConical className="mx-auto h-4 w-4 text-cyan-200" aria-hidden="true" /><span className="mt-1 block text-[9px] text-slate-300">Salt</span></div>
        <span className="text-[10px] text-slate-500">+</span>
        <div className={`${card} flex-1 text-center`}><Droplet className="mx-auto h-4 w-4 text-sky-300" aria-hidden="true" /><span className="mt-1 block text-[9px] text-slate-300">Water</span></div>
        <ArrowRight className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        <div className={`${card} flex-1 text-center`}><Beaker className="mx-auto h-4 w-4 text-indigo-200" aria-hidden="true" /><span className="mt-1 block text-[9px] text-slate-300">Stock</span></div>
      </div>
      <p className="text-center text-[9px] text-slate-500">Finished mass includes salt and water</p>
    </div>
  );
}

export function ConcentrateTourIllustration({ illustrationKey }: Props) {
  switch (illustrationKey) {
    case 'recipe-concentrate-empty':
      return <EmptyRecipeDiagram />;
    case 'recipe-concentrate-overview':
      return <RecipeOverviewDiagram />;
    case 'recipe-stock-arrangement':
      return <StockArrangementDiagram />;
    case 'recipe-stock-weight':
      return <StockWeightDiagram />;
    case 'recipe-dose-result':
      return <DoseDiagram />;
    case 'recipe-preparation':
      return <PreparationDiagram />;
    case 'stock-builder-mineral':
      return <MineralSelectionDiagram />;
    case 'stock-builder-calibration':
      return <StockBuilderCalibrationDiagram />;
    case 'stock-builder-setup':
      return <StockSetupDiagram />;
    case 'stock-builder-dose':
      return <StockBuilderDoseDiagram />;
    case 'stock-builder-preparation':
      return <PreparationDiagram singleSalt />;
    case 'lotus-dropper':
      return <LotusDropperDiagram />;
    case 'lotus-calibration':
      return <LotusCalibrationDiagram />;
    case 'lotus-volume':
      return <LotusVolumeDiagram />;
    case 'lotus-per-drop':
      return <LotusPerDropDiagram />;
    case 'lotus-stock-preparation':
      return <LotusStockPreparationDiagram />;
  }
}

import { Droplets, Scale } from 'lucide-react';

export type BrewerPrepMethod = 'dry' | 'dropper';

type BrewerPrepMethodSelectorProps = {
  value: BrewerPrepMethod;
  onChange: (value: BrewerPrepMethod) => void;
};

export default function BrewerPrepMethodSelector({ value, onChange }: BrewerPrepMethodSelectorProps) {
  return (
    <div className="rounded-xl border border-sky-400/20 bg-slate-900/30 p-2">
      <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
        Choose how you’ll measure minerals
      </div>
      <div role="tablist" aria-label="Recipe dosing method" className="grid gap-1 sm:grid-cols-2">
        {([
          ['dry', 'Weigh dry salts', 'Weigh the recipe on a scale', Scale],
          ['dropper', 'Use concentrate drops', 'Make stocks once, then dose by drops', Droplets],
        ] as const).map(([method, label, description]) => (
          <button
            key={method}
            type="button"
            role="tab"
            aria-selected={value === method}
            onClick={() => onChange(method)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              value === method
                ? 'border-sky-400/50 bg-sky-500/15 text-sky-100 shadow-sm'
                : 'border-transparent text-slate-400 hover:border-slate-600/60 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="text-sky-300" aria-hidden="true">
                {method === 'dry' ? <Scale className="h-3.5 w-3.5" /> : <Droplets className="h-3.5 w-3.5" />}
              </span>
              {label}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-500">{description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
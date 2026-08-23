import { Info } from 'lucide-react';

export function HardnessCard({
  label,
  value,
  saltValue,
  bottledValue,
}: {
  label: string;
  value: number;
  saltValue: number;
  bottledValue: number;
}) {
  return (
    <div className="app-data-card flex flex-col rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-3">
      <div className="min-h-8 text-xs leading-relaxed text-slate-400">{label}</div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-cyan-300">{value.toFixed(1)}</span>
        <span className="text-sm text-slate-400">ppm CaCO₃</span>
      </div>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Salts:</span>
          <span className="font-mono text-emerald-300">{saltValue.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span className="text-slate-400">Mineral:</span>
          <span className="font-mono text-sky-300">{bottledValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

export function SimpleMetricCard({
  label,
  value,
  unit,
  tone = 'tds',
}: {
  label: string;
  value: number;
  unit: string;
  tone?: 'hardness' | 'buffer' | 'tds';
}) {
  const valueTone = {
    hardness: 'text-indigo-300',
    buffer: 'text-amber-300',
    tds: 'text-cyan-300',
  }[tone];

  return (
    <div className="app-data-card flex flex-col rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-3">
      <div className="min-h-8 text-xs leading-relaxed text-slate-400">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${valueTone}`}>{value.toFixed(1)}</span>
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

export function TdsCard({
  value,
  saltValue,
  bottledValue,
}: {
  value: number;
  saltValue: number;
  bottledValue: number;
}) {
  return (
    <div className="app-data-card flex flex-col rounded-xl border border-slate-700/40 bg-slate-900/40 px-4 py-3">
      <div className="min-h-8 text-xs leading-relaxed text-slate-400">Total Dissolved Solids (TDS)</div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-cyan-300">{value.toFixed(1)}</span>
        <span className="text-sm text-slate-400">mg/L</span>
      </div>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Salts:</span>
          <span className="font-mono text-emerald-300">{saltValue.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span className="text-slate-400">Reported water:</span>
          <span className="font-mono text-sky-300">{bottledValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

export function WaterChemistryCard({
  estimate,
  basePH,
  baseAlkalinity,
}: {
  estimate?: number;
  basePH?: number;
  baseAlkalinity?: number;
}) {
  const hasEstimate = estimate !== undefined;
  const status = hasEstimate
    ? `Estimated pH: ${estimate.toFixed(2)}`
    : basePH === undefined
      ? 'Add base-water pH to estimate'
      : 'Add base-water alkalinity to estimate';

  return (
    <details className="app-card app-panel-surface group overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-800/70 shadow-xl backdrop-blur">
      <summary className="app-section-header flex cursor-pointer list-none items-center justify-between gap-3 px-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-sky-300" />
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-300">Water Chemistry</span>
          <span className="hidden truncate text-xs text-slate-500 sm:inline">pH and buffering estimate</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`text-xs ${hasEstimate ? 'text-sky-300' : 'text-slate-500'}`}>{status}</span>
          <span className="text-slate-500 transition-transform group-open:rotate-180">⌄</span>
        </div>
      </summary>
      <div className="app-card-body border-t border-slate-700/40">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="app-data-card rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
            <div className="min-h-8 text-xs leading-relaxed text-slate-400">Estimated final pH</div>
            <div className="mt-1 text-2xl font-bold text-cyan-300">
              {hasEstimate ? estimate.toFixed(2) : '—'}
            </div>
          </div>
          <div className="app-data-card rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
            <div className="min-h-8 text-xs leading-relaxed text-slate-400">Base-water pH</div>
            <div className="mt-1 text-2xl font-bold text-slate-200">
              {basePH !== undefined ? basePH.toFixed(2) : '—'}
            </div>
          </div>
          <div className="app-data-card rounded-xl border border-slate-700/50 bg-slate-900/40 px-4 py-3">
            <div className="min-h-8 text-xs leading-relaxed text-slate-400">Base alkalinity</div>
            <div className="mt-1 text-2xl font-bold text-slate-200">
              {baseAlkalinity !== undefined ? baseAlkalinity.toFixed(1) : '—'}
              <span className="ml-1 text-sm font-normal text-slate-500">mg/L CaCO₃</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {hasEstimate
            ? 'Predicted from the reported source-water pH and alkalinity, final water blend, batch dilution, and the recipe’s full modeled carbonate, citrate, and phosphate balance. Verify with a calibrated pH meter.'
            : 'Select a mineral-water source above that includes both reported pH and alkalinity to estimate the final pH. Ion concentrations alone are not enough to determine pH reliably.'}
        </p>
      </div>
    </details>
  );
}
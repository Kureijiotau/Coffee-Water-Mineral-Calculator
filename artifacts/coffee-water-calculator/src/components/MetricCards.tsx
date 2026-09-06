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

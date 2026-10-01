import { ION_MAP } from './waterData';

type IonRelationshipDisplayProps = {
  view: 'combined' | 'pairwise';
  onViewChange: (view: 'combined' | 'pairwise') => void;
  potassium: number;
  magnesium: number;
  sodium: number;
  calcium: number;
  combined: {
    value: string;
    total: number;
    severity: 'normal' | 'warning' | 'high';
  };
  compact?: boolean;
};

function formatPercent(numerator: number, denominator: number): string {
  if (!(denominator > 0) || !Number.isFinite(numerator / denominator)) return '—';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatPpm(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(4).replace(/\.?0+$/, '');
}

export function WatermancerIonRelationshipDisplay({
  view,
  onViewChange,
  potassium,
  magnesium,
  sodium,
  calcium,
  combined,
  compact = false,
}: IonRelationshipDisplayProps) {
  const combinedSeverityClass = combined.severity === 'high'
    ? 'text-rose-300'
    : combined.severity === 'warning'
      ? 'text-amber-200'
      : 'text-slate-200';

  return (
    <div
      data-testid="watermancer-ion-relationship"
      data-view={view}
      className={`flex ${compact ? 'min-h-8 shrink-0' : 'min-h-9'} items-center gap-1 rounded-md px-1.5 text-[10px] tabular-nums`}
    >
      <div
        role="group"
        aria-label="Ion relationship display"
        className="inline-flex shrink-0 items-center gap-0.5 rounded border border-cyan-300/15 bg-slate-950/50 p-0.5"
      >
        {([
          ['combined', 'Combined'],
          ['pairwise', 'Pairwise'],
        ] as const).map(([option, label]) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => onViewChange(option)}
            className={`min-h-7 rounded px-1.5 text-[9px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 ${
              view === option
                ? 'bg-cyan-500/20 text-cyan-100'
                : 'text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === 'pairwise' ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span data-testid="watermancer-ratio-k-mg" className="whitespace-nowrap">
            <span className="font-semibold text-slate-400">K ÷ Mg</span>
            <span className="ml-1 font-semibold text-slate-100">{formatPercent(potassium, magnesium)}</span>
          </span>
          <span data-testid="watermancer-ratio-na-ca" className="whitespace-nowrap">
            <span className="font-semibold text-slate-400">Na ÷ Ca</span>
            <span className="ml-1 font-semibold text-slate-100">{formatPercent(sodium, calcium)}</span>
          </span>
        </div>
      ) : (
        <span className="whitespace-nowrap">
          {compact ? (
            <span className="font-semibold uppercase tracking-wide text-slate-500">Na+K/Mg+Ca</span>
          ) : (
            <>
              <span style={{ color: ION_MAP.sodium.color.foreground }}>Na</span>
              <span className="text-slate-500"> + </span>
              <span style={{ color: ION_MAP.potassium.color.foreground }}>K</span>
              <span className="mx-1 text-slate-500">relative to</span>
              <span style={{ color: ION_MAP.magnesium.color.foreground }}>Mg</span>
              <span className="text-slate-500"> + </span>
              <span style={{ color: ION_MAP.calcium.color.foreground }}>Ca</span>
            </>
          )}
          <span className={`ml-1 font-semibold ${combinedSeverityClass}`}>{combined.value}</span>
          <span className="ml-1 text-slate-500">({formatPpm(combined.total)} ppm)</span>
        </span>
      )}
    </div>
  );
}
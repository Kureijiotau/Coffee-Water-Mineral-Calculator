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
    <button
      type="button"
      data-testid="watermancer-ion-relationship"
      data-view={view}
      aria-label={`Switch to ${view === 'combined' ? 'pairwise' : 'combined'} ion ratios`}
      title={`Click to show ${view === 'combined' ? 'pairwise' : 'combined'} ion ratios`}
      onClick={() => onViewChange(view === 'combined' ? 'pairwise' : 'combined')}
      className={`inline-flex ${compact ? 'min-h-8 shrink-0' : 'min-h-9'} items-center gap-2 rounded-md px-1.5 text-left text-[10px] tabular-nums transition-colors hover:bg-cyan-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200`}
    >
      {view === 'pairwise' ? (
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span data-testid="watermancer-ratio-k-mg" className="whitespace-nowrap">
            <span className="font-semibold decoration-dotted underline decoration-slate-500/60 underline-offset-2">
              <span style={{ color: ION_MAP.potassium.color.foreground }}>K</span>
              <span className="mx-1 text-slate-500">÷</span>
              <span style={{ color: ION_MAP.magnesium.color.foreground }}>Mg</span>
            </span>
            <span className="ml-1 font-semibold text-slate-100">{formatPercent(potassium, magnesium)}</span>
          </span>
          <span data-testid="watermancer-ratio-na-ca" className="whitespace-nowrap">
            <span className="font-semibold decoration-dotted underline decoration-slate-500/60 underline-offset-2">
              <span style={{ color: ION_MAP.sodium.color.foreground }}>Na</span>
              <span className="mx-1 text-slate-500">÷</span>
              <span style={{ color: ION_MAP.calcium.color.foreground }}>Ca</span>
            </span>
            <span className="ml-1 font-semibold text-slate-100">{formatPercent(sodium, calcium)}</span>
          </span>
        </span>
      ) : (
        <span className="whitespace-nowrap">
          <span className="font-semibold decoration-dotted underline decoration-slate-500/60 underline-offset-2">
            <span style={{ color: ION_MAP.sodium.color.foreground }}>Na</span>
            <span className="text-slate-500"> + </span>
            <span style={{ color: ION_MAP.potassium.color.foreground }}>K</span>
            {compact ? (
              <>
                <span className="mx-1 text-slate-500">/</span>
                <span style={{ color: ION_MAP.magnesium.color.foreground }}>Mg</span>
                <span className="text-slate-500"> + </span>
                <span style={{ color: ION_MAP.calcium.color.foreground }}>Ca</span>
              </>
            ) : (
              <>
                <span className="mx-1 text-slate-500">relative to</span>
                <span style={{ color: ION_MAP.magnesium.color.foreground }}>Mg</span>
                <span className="text-slate-500"> + </span>
                <span style={{ color: ION_MAP.calcium.color.foreground }}>Ca</span>
              </>
            )}
          </span>
          <span className={`ml-1 font-semibold ${combinedSeverityClass}`}>{combined.value}</span>
          <span className="ml-1 text-slate-500">({formatPpm(combined.total)} ppm)</span>
        </span>
      )}
    </button>
  );
}
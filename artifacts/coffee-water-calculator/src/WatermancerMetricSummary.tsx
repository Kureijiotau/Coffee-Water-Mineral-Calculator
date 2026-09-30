import type { WatermancerMetricValues } from './watermancerMetricValues';

export type WatermancerMetricSource = 'targets' | 'final-mixture';

function formatMetricValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(1).replace(/\.0$/, '');
}

export function WatermancerMetricSummary({
  targetMetrics,
  finalMetrics,
  source,
  preview,
  targetLabel,
  onSourceChange,
  compact = false,
  inline = false,
}: {
  targetMetrics: WatermancerMetricValues;
  finalMetrics: WatermancerMetricValues;
  source: WatermancerMetricSource;
  preview: boolean;
  targetLabel: string;
  onSourceChange: (source: WatermancerMetricSource) => void;
  compact?: boolean;
  inline?: boolean;
}) {
  const activeSource = preview ? 'targets' : source;
  const metrics = activeSource === 'final-mixture' ? finalMetrics : targetMetrics;
  const entries = [
    {
      id: 'gh',
      label: compact || inline ? 'GH' : 'General Hardness (GH)',
      value: metrics.gh,
      unit: 'ppm CaCO₃',
      accessibleLabel: 'GH',
    },
    {
      id: 'kh',
      label: compact || inline ? 'KH' : 'Carbonate Hardness (KH)',
      value: metrics.kh,
      unit: 'ppm CaCO₃',
      accessibleLabel: 'KH',
    },
    {
      id: 'tds',
      label: compact ? 'Modeled TDS' : 'Modeled TDS',
      value: metrics.tds,
      unit: 'mg/L',
      accessibleLabel: 'Modeled TDS',
    },
  ] as const;

  return (
    <div
      data-watermancer-metric-summary
      data-testid={inline ? 'watermancer-classic-metric-summary' : undefined}
      data-source={activeSource}
      role="group"
      aria-label="GH, KH, and modeled TDS summary"
      className={inline
        ? 'flex w-full min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-cyan-400/15 pt-2 text-xs font-semibold tabular-nums'
        : compact
          ? 'flex h-8 shrink-0 items-center gap-1.5 border-r border-cyan-300/20 pr-2'
          : 'space-y-2 rounded-xl border border-cyan-300/15 bg-slate-950/25 p-3'}
    >
      {!compact && !inline && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-100">
            {preview ? `${targetLabel} targets · Preview` : 'Mineral summary'}
          </span>
          {!preview && (
            <div
              role="group"
              aria-label="Metric source"
              className="inline-flex items-center gap-0.5 rounded-lg border border-cyan-300/15 bg-slate-950/50 p-0.5"
            >
              <button
                type="button"
                onClick={() => onSourceChange('targets')}
                aria-pressed={activeSource === 'targets'}
                className={`min-h-8 rounded-md px-2.5 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-200 ${
                  activeSource === 'targets'
                    ? 'bg-cyan-500/20 text-cyan-100'
                    : 'text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-100'
                }`}
              >
                Targets
              </button>
              <button
                type="button"
                onClick={() => onSourceChange('final-mixture')}
                aria-pressed={activeSource === 'final-mixture'}
                className={`min-h-8 rounded-md px-2.5 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-200 ${
                  activeSource === 'final-mixture'
                    ? 'bg-emerald-500/15 text-emerald-100'
                    : 'text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-100'
                }`}
              >
                Final mixture
              </button>
            </div>
          )}
        </div>
      )}

      {inline && (
        <span
          data-testid="text-watermancer-metric-context"
          className="text-[10px] font-semibold uppercase tracking-wider text-cyan-100"
        >
          {preview ? `${targetLabel} targets · Preview` : 'Mineral summary'}
        </span>
      )}

      {inline && !preview && (
        <div
          role="group"
          aria-label="Metric source"
          className="inline-flex items-center gap-0.5 rounded-lg border border-cyan-300/15 bg-slate-950/50 p-0.5"
        >
          <button
            type="button"
            onClick={() => onSourceChange('targets')}
            aria-pressed={activeSource === 'targets'}
            className={`min-h-8 rounded-md px-2.5 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-200 ${
              activeSource === 'targets'
                ? 'bg-cyan-500/20 text-cyan-100'
                : 'text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-100'
            }`}
          >
            Targets
          </button>
          <button
            type="button"
            onClick={() => onSourceChange('final-mixture')}
            aria-pressed={activeSource === 'final-mixture'}
            className={`min-h-8 rounded-md px-2.5 text-[10px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-200 ${
              activeSource === 'final-mixture'
                ? 'bg-emerald-500/15 text-emerald-100'
                : 'text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-100'
            }`}
          >
            Final mixture
          </button>
        </div>
      )}

      <div className={inline ? 'contents' : compact ? 'flex items-center gap-1.5' : 'grid grid-cols-3 gap-2'}>
        {entries.map(entry => {
          const value = formatMetricValue(entry.value);
          return (
            <div
              key={entry.id}
              data-watermancer-metric={entry.id}
              role="group"
              aria-label={`${entry.accessibleLabel}: ${value} ${entry.unit}`}
              title={entry.id === 'tds' ? 'Modeled ion total, not a meter reading' : undefined}
              className={inline
                ? 'flex shrink-0 items-center gap-1 rounded-md px-1 text-[10px] tabular-nums'
                : compact
                  ? 'flex h-8 shrink-0 items-center gap-1 rounded-md px-1 text-[9px] tabular-nums'
                  : 'flex min-w-0 flex-col justify-center rounded-lg border border-slate-700/50 bg-slate-900/60 px-2 py-2'}
            >
              <span className={`font-semibold ${entry.id === 'tds' ? 'text-indigo-200' : 'text-slate-400'}`}>
                {entry.label}
              </span>
              <span className={`font-semibold tabular-nums ${compact || inline ? 'text-slate-100' : 'mt-0.5 text-sm text-slate-100'}`}>
                {value}
              </span>
              <span className={`text-slate-500 ${inline ? 'text-[9px]' : ''}`}>{entry.unit}</span>
            </div>
          );
        })}
      </div>

      {compact && (
        preview
          ? <span className="max-w-24 shrink-0 truncate text-[9px] font-semibold text-indigo-200" title={`${targetLabel} target preview`}>Preview</span>
          : (
            <div role="group" aria-label="Metric source" className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => onSourceChange('targets')}
                aria-label="Show target metrics"
                aria-pressed={activeSource === 'targets'}
                className={`h-7 rounded px-1.5 text-[9px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 ${
                  activeSource === 'targets' ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-500 hover:bg-cyan-500/10 hover:text-cyan-100'
                }`}
              >
                Targets
              </button>
              <button
                type="button"
                onClick={() => onSourceChange('final-mixture')}
                aria-label="Show final mixture metrics"
                aria-pressed={activeSource === 'final-mixture'}
                className={`h-7 rounded px-1.5 text-[9px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 ${
                  activeSource === 'final-mixture' ? 'bg-emerald-500/15 text-emerald-100' : 'text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-100'
                }`}
              >
                Final
              </button>
            </div>
          )
      )}
    </div>
  );
}
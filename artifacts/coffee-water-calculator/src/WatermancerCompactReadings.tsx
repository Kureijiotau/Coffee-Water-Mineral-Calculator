import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ACTIVE_ION_IDS, ION_MAP, type IonId } from './waterData';

type RatioSummary = {
  id: 'gh-kh' | 'mg-ca' | 'cl-so4';
  label: string;
  value: string;
  detail?: string;
};

function formatPpm(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(4).replace(/\.?0+$/, '');
}

export function WatermancerCompactReadings({
  actualIons,
  targetIons,
  targetLabel,
  previewRatios,
  ratios,
  monovalentRatio,
  onSwapRatio,
  expanded,
  onToggleExpanded,
}: {
  actualIons: Partial<Record<IonId, number>>;
  targetIons: Partial<Record<IonId, number>>;
  targetLabel: string;
  previewRatios: boolean;
  ratios: RatioSummary[];
  monovalentRatio: { value: string; total: number; severity: 'normal' | 'warning' | 'high' };
  onSwapRatio: (key: RatioSummary['id']) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const [changedIonIds, setChangedIonIds] = useState<IonId[]>([]);
  const previousIonsRef = useRef(actualIons);
  const changeTimerRef = useRef<number | null>(null);
  const visibleIonIds = ACTIVE_ION_IDS.filter(id => id !== 'citrates' || (actualIons[id] ?? 0) > 0);

  useEffect(() => {
    const changed = visibleIonIds.filter(id => (
      Math.abs((actualIons[id] ?? 0) - (previousIonsRef.current[id] ?? 0)) > 0.00005
    ));
    previousIonsRef.current = actualIons;
    if (changed.length === 0) return;
    setChangedIonIds(changed);
    if (changeTimerRef.current !== null) window.clearTimeout(changeTimerRef.current);
    changeTimerRef.current = window.setTimeout(() => {
      setChangedIonIds([]);
      changeTimerRef.current = null;
    }, 1800);
  }, [actualIons]);

  useEffect(() => () => {
    if (changeTimerRef.current !== null) window.clearTimeout(changeTimerRef.current);
  }, []);

  return (
    <section
      aria-label="Current ion readings"
      className="app-card overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-900/95 shadow-xl shadow-slate-950/30"
    >
      <div className="flex items-center justify-between gap-3 border-b border-cyan-300/10 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
            Current ion readings <span className="ml-1 text-cyan-300/60">· live</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Final mix · mg/L · {targetLabel} ion targets</p>
        </div>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="watermancer-ion-breakdown"
          onClick={onToggleExpanded}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
        >
          {expanded ? 'Less detail' : 'Full breakdown'}
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>

      <div className={`grid grid-cols-4 gap-px bg-cyan-300/10 ${visibleIonIds.length % 4 === 3 ? 'sm:[&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-2' : ''} xl:grid-cols-8`}>
        {visibleIonIds.map(id => {
          const ion = ION_MAP[id];
          const actual = Math.max(actualIons[id] ?? 0, 0);
          const target = Math.max(targetIons[id] ?? 0, 0);
          const overshoot = target > 0 ? actual > target + 0.05 : actual > 0.05;
          const changed = changedIonIds.includes(id);
          const changeDescription = changed ? 'Updated. ' : '';
          return (
            <div
              key={id}
              role="group"
              aria-label={`${changeDescription}${ion.name}: ${formatPpm(actual)} milligrams per liter, target ${formatPpm(target)} milligrams per liter${overshoot ? ', above target' : ''}`}
              className={`min-w-0 bg-slate-900/95 px-2 py-3 text-center transition-colors duration-300 ${changed ? 'bg-cyan-500/15' : ''}`}
            >
              <div className="text-[11px] font-semibold leading-tight" style={{ color: ion.color.foreground }}>{ion.formula}</div>
              <div className={`mt-1 text-base font-semibold tabular-nums tracking-tight ${overshoot ? 'text-rose-300' : 'text-slate-100'}`}>
                {formatPpm(actual)}
              </div>
              <div className="mt-0.5 truncate text-[9px] text-slate-500">/ {formatPpm(target)} target</div>
              {changed && <span className="sr-only">Updated</span>}
            </div>
          );
        })}
      </div>

      <div className="border-t border-cyan-300/10 bg-slate-950/20">
        <div className="px-3 pt-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">
          {previewRatios ? 'Ratio preview · based on selected ion targets' : 'Ratios · current mixture'}
        </div>
        <div className="flex flex-wrap items-stretch divide-x divide-cyan-300/10">
          {ratios.map(ratio => (
            <button
              key={ratio.id}
              type="button"
              onClick={() => onSwapRatio(ratio.id)}
              aria-label={`${ratio.label} ratio ${ratio.value}${ratio.detail ? `, ${ratio.detail}` : ''}. Activate to reverse the ratio order.`}
              title={`Reverse ${ratio.label} order · current value ${ratio.value}`}
              className="min-h-12 flex-1 basis-1/3 px-2 py-2 text-center transition hover:bg-cyan-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-cyan-200"
            >
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">{ratio.label}</span>
              <span className="mt-0.5 block text-xs font-semibold tabular-nums text-slate-100">{ratio.value}</span>
              {ratio.detail && <span className="block text-[9px] tabular-nums text-slate-500">{ratio.detail}</span>}
            </button>
          ))}
          <div className="min-h-12 flex-1 basis-full px-3 py-2 text-center text-[10px] text-slate-400 sm:basis-1/4">
            <span className="font-semibold uppercase tracking-wide text-slate-500">Na + K / Mg + Ca</span>
            <span className={`ml-2 font-semibold tabular-nums ${monovalentRatio.severity === 'high' ? 'text-rose-300' : monovalentRatio.severity === 'warning' ? 'text-amber-200' : 'text-slate-200'}`}>
              {monovalentRatio.value}
            </span>
            <span className="ml-1 text-slate-500">({formatPpm(monovalentRatio.total)} ppm Na + K)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
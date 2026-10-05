import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Pin, PinOff } from 'lucide-react';
import { ACTIVE_ION_IDS, ION_MAP, type IonId } from './waterData';
import { WatermancerMetricSummary, type WatermancerMetricSource } from './WatermancerMetricSummary';
import { WatermancerIonRelationshipDisplay } from './WatermancerIonRelationshipDisplay';
import { WatermancerCustomIonRatio } from './WatermancerCustomIonRatio';
import type { WatermancerMetricValues } from './watermancerMetricValues';
import type { CustomIonRatioPair, CustomIonRatioSide } from './watermancerCustomIonRatio';

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
  targetMetrics,
  finalMetrics,
  metricSource,
  onMetricSourceChange,
  targetLabel,
  previewRatios,
  followEnabled,
  onToggleFollow,
  ratios,
  monovalentRatio,
  ionRelationshipView,
  onIonRelationshipViewChange,
  pairwiseIonRatios,
  customIonRatioPair,
  customIonRatioValues,
  onCycleCustomIonRatioSide,
  onSwapRatio,
  expanded,
  onToggleExpanded,
}: {
  actualIons: Partial<Record<IonId, number>>;
  targetIons: Partial<Record<IonId, number>>;
  targetMetrics: WatermancerMetricValues;
  finalMetrics: WatermancerMetricValues;
  metricSource: WatermancerMetricSource;
  onMetricSourceChange: (source: WatermancerMetricSource) => void;
  targetLabel: string;
  previewRatios: boolean;
  followEnabled: boolean;
  onToggleFollow: () => void;
  ratios: RatioSummary[];
  monovalentRatio: { value: string; total: number; severity: 'normal' | 'warning' | 'high' };
  ionRelationshipView: 'combined' | 'pairwise';
  onIonRelationshipViewChange: (view: 'combined' | 'pairwise') => void;
  pairwiseIonRatios: { potassium: number; magnesium: number; sodium: number; calcium: number };
  customIonRatioPair: CustomIonRatioPair;
  customIonRatioValues: Partial<Record<IonId, number>>;
  onCycleCustomIonRatioSide: (side: CustomIonRatioSide) => void;
  onSwapRatio: (key: RatioSummary['id']) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const [changedIonIds, setChangedIonIds] = useState<IonId[]>([]);
  const [changedRatioIds, setChangedRatioIds] = useState<RatioSummary['id'][]>([]);
  const previousReadingsRef = useRef({ actualIons, targetIons, ratios });
  const changeTimerRef = useRef<number | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const visibleIonIds = ACTIVE_ION_IDS.filter(id => (
    id !== 'citrates' || (actualIons[id] ?? 0) > 0 || (targetIons[id] ?? 0) > 0
  ));

  useEffect(() => {
    const previous = previousReadingsRef.current;
    const changed = visibleIonIds.filter(id => (
      Math.abs((actualIons[id] ?? 0) - (previous.actualIons[id] ?? 0)) > 0.00005
      || Math.abs((targetIons[id] ?? 0) - (previous.targetIons[id] ?? 0)) > 0.00005
    ));
    const changedRatios = ratios
      .filter(ratio => {
        const old = previous.ratios.find(previousRatio => previousRatio.id === ratio.id);
        return !old || old.label !== ratio.label || old.value !== ratio.value || old.detail !== ratio.detail;
      })
      .map(ratio => ratio.id);
    previousReadingsRef.current = { actualIons, targetIons, ratios };
    if (changed.length === 0 && changedRatios.length === 0) return;
    setChangedIonIds(changed);
    setChangedRatioIds(changedRatios);
    if (changeTimerRef.current !== null) window.clearTimeout(changeTimerRef.current);
    changeTimerRef.current = window.setTimeout(() => {
      setChangedIonIds([]);
      setChangedRatioIds([]);
      changeTimerRef.current = null;
    }, 1800);
  }, [actualIons, targetIons, ratios]);

  useEffect(() => {
    const firstChangedIon = changedIonIds[0];
    const rail = railRef.current;
    const item = firstChangedIon
      ? rail?.querySelector<HTMLElement>(`[data-watermancer-ion="${firstChangedIon}"]`)
      : null;
    if (!rail || !item) return;
    const itemLeft = item.offsetLeft - rail.offsetLeft;
    rail.scrollTo({
      left: Math.max(0, itemLeft - (rail.clientWidth - item.clientWidth) / 2),
      behavior: 'smooth',
    });
  }, [changedIonIds]);

  useEffect(() => () => {
    if (changeTimerRef.current !== null) window.clearTimeout(changeTimerRef.current);
  }, []);

  const updateSummary = changedIonIds.length > 0
    ? `Updated ${changedIonIds.map(id => `${ION_MAP[id].formula} ${formatPpm(actualIons[id] ?? 0)}/${formatPpm(targetIons[id] ?? 0)}`).join(' · ')}`
    : changedRatioIds.length > 0 ? 'Ratios updated' : 'Live';

  return (
    <section
      aria-label="Current ion readings"
      className={`${followEnabled
        ? 'fixed inset-x-3 bottom-3 z-[65] mx-auto w-[calc(100%-1.5rem)] max-w-[1500px] shadow-2xl shadow-slate-950/50'
        : 'relative'
      } app-card rounded-2xl border border-cyan-300/25 bg-slate-900/95 shadow-xl shadow-slate-950/30`}
    >
      <div className="flex min-h-10 items-center justify-between gap-2 px-2.5 py-1.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
            <span className="sm:hidden">Ions</span>
            <span className="hidden sm:inline">Current ion readings</span>
          </div>
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={`max-w-[34vw] shrink-0 truncate text-[9px] font-semibold uppercase tracking-wider sm:max-w-[20rem] ${updateSummary === 'Live' ? 'text-emerald-300/80' : 'text-cyan-200'}`}
          >
            {updateSummary}
          </span>
          <span className="hidden truncate text-[9px] text-slate-500 lg:inline">Final mix · mg/L · {targetLabel} targets</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onToggleFollow}
            aria-pressed={followEnabled}
            aria-label={followEnabled ? 'Unpin compact ion readings from the screen' : 'Keep compact ion readings visible while scrolling'}
            title={followEnabled ? 'Unpin readings' : 'Keep readings visible while scrolling'}
            className={`inline-flex h-8 w-9 items-center justify-center rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 sm:w-auto sm:gap-1.5 sm:px-2 ${
              followEnabled
                ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25'
                : 'border-cyan-300/20 bg-slate-950/30 text-cyan-100 hover:bg-cyan-500/10'
            }`}
          >
            {followEnabled ? <PinOff className="h-4 w-4" aria-hidden="true" /> : <Pin className="h-4 w-4" aria-hidden="true" />}
            <span className="hidden text-[10px] font-semibold sm:inline">{followEnabled ? 'Pinned' : 'Pin'}</span>
          </button>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="watermancer-ion-breakdown"
            onClick={onToggleExpanded}
            aria-label={expanded ? 'Hide full ion breakdown' : 'Show full ion breakdown'}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-2 text-[10px] font-semibold text-cyan-100 transition hover:bg-cyan-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            <span className="hidden sm:inline">{expanded ? 'Less detail' : 'Full breakdown'}</span>
            <span className="sm:hidden">{expanded ? 'Close' : 'Details'}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="overflow-x-auto border-t border-cyan-300/10 px-2 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={previewRatios ? 'Live ions and ratio preview based on selected targets' : 'Live ions and current mixture ratios'}
      >
        <div className="flex w-max min-w-full items-center gap-1.5">
          <WatermancerMetricSummary
            targetMetrics={targetMetrics}
            finalMetrics={finalMetrics}
            source={metricSource}
            preview={previewRatios}
            targetLabel={targetLabel}
            onSourceChange={onMetricSourceChange}
            compact
          />
          {visibleIonIds.map(id => {
            const ion = ION_MAP[id];
            const actual = Math.max(actualIons[id] ?? 0, 0);
            const target = Math.max(targetIons[id] ?? 0, 0);
            const overshoot = target > 0 ? actual > target + 0.05 : actual > 0.05;
            const changed = changedIonIds.includes(id);
            return (
              <div
                key={id}
                data-watermancer-ion={id}
                role="group"
                aria-label={`${changed ? 'Updated. ' : ''}${ion.name}: ${formatPpm(actual)} milligrams per liter, target ${formatPpm(target)} milligrams per liter${overshoot ? ', above target' : ''}`}
                className={`flex h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] tabular-nums transition-colors duration-300 ${changed ? 'bg-cyan-500/20 ring-1 ring-cyan-300/30' : 'hover:bg-slate-800/80'}`}
              >
                <span className="font-semibold" style={{ color: ion.color.foreground }}>{ion.formula}</span>
                <span className={`font-semibold ${overshoot ? 'text-rose-300' : 'text-slate-100'}`}>{formatPpm(actual)}</span>
                <span className="text-slate-500">/{formatPpm(target)}</span>
              </div>
            );
          })}
          <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-cyan-300/20" />
          <span className="shrink-0 px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            {previewRatios ? 'Preview' : 'Ratios'}
          </span>
          {ratios.map(ratio => (
            <button
              key={ratio.id}
              type="button"
              data-watermancer-ratio={ratio.id}
              onClick={() => onSwapRatio(ratio.id)}
              aria-label={`${ratio.label} ratio ${ratio.value}${ratio.detail ? `, ${ratio.detail}` : ''}. Activate to reverse the ratio order.`}
              title={`Reverse ${ratio.label} order · current value ${ratio.value}`}
              className={`flex h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] tabular-nums transition-colors hover:bg-cyan-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-cyan-200 ${changedRatioIds.includes(ratio.id) ? 'bg-cyan-500/20 ring-1 ring-cyan-300/30' : ''}`}
            >
              <span className="font-semibold uppercase tracking-wide text-slate-500">{ratio.label}</span>
              <span className="font-semibold text-slate-100">{ratio.value}</span>
            </button>
          ))}
          <WatermancerIonRelationshipDisplay
            compact
            view={ionRelationshipView}
            onViewChange={onIonRelationshipViewChange}
            {...pairwiseIonRatios}
            combined={monovalentRatio}
          />
          <WatermancerCustomIonRatio
            pair={customIonRatioPair}
            ionValues={customIonRatioValues}
            onCycleSide={onCycleCustomIonRatioSide}
          />
        </div>
      </div>
    </section>
  );
}
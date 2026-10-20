import { ION_MAP, type IonId } from './waterData';
import { computeHco3EquivalentPpm } from './watermancerMetricValues';

function formatPpm(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(3).replace(/\.?0+$/, '');
}

export function WatermancerBicarbonateEquivalent({
  ions,
  compact = false,
}: {
  ions: Partial<Record<IonId, number>>;
  compact?: boolean;
}) {
  const citratePpm = ions.citrates ?? 0;
  if (!Number.isFinite(citratePpm) || citratePpm <= 0) return null;

  const equivalentPpm = computeHco3EquivalentPpm(ions);
  const formattedPpm = formatPpm(equivalentPpm);

  return (
    <div
      data-testid="watermancer-hco3-equivalent"
      role="group"
      aria-label={`Estimated HCO3 equivalent alkalinity: ${formattedPpm} milligrams per liter`}
      title="Estimated charge-based alkalinity in bicarbonate equivalents. Citrate uses its modeled 3− charge; actual alkalinity depends on pH and speciation."
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 ${
        compact
          ? 'border-t border-slate-700/70 bg-slate-950/25 px-2.5 py-2 sm:px-4'
          : 'rounded-xl border border-cyan-300/15 bg-slate-950/25 px-3 py-2'
      }`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-xs font-semibold" style={{ color: ION_MAP.bicarbonate.color.foreground }}>
          HCO₃⁻ Equiv
        </span>
        <span className="text-[10px] text-slate-500">estimated · includes</span>
        <span className="text-[10px] font-semibold" style={{ color: ION_MAP.citrates.color.foreground }}>
          Citrates
        </span>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums" style={{ color: ION_MAP.bicarbonate.color.foreground }}>
        {formattedPpm} ppm
      </span>
    </div>
  );
}

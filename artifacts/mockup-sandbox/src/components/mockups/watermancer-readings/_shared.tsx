// Extracted from WatermancerIonReadingRow and the ion palette in the main app.
// Only the calculation props are replaced with a representative local snapshot.
export const ions = [
  { id: 'sodium', name: 'Sodium', formula: 'Na⁺', color: '#fb7185', actual: 0.3, target: 0 },
  { id: 'potassium', name: 'Potassium', formula: 'K⁺', color: '#c084fc', actual: 0, target: 0 },
  { id: 'magnesium', name: 'Magnesium', formula: 'Mg²⁺', color: '#fde047', actual: 7, target: 8 },
  { id: 'calcium', name: 'Calcium', formula: 'Ca²⁺', color: '#fb923c', actual: 3.4, target: 4 },
  { id: 'chloride', name: 'Chloride', formula: 'Cl⁻', color: '#60a5fa', actual: 10.1, target: 10 },
  { id: 'sulfate', name: 'Sulfate', formula: 'SO₄²⁻', color: '#818cf8', actual: 10.3, target: 11 },
  { id: 'bicarbonate', name: 'Bicarbonate', formula: 'HCO₃⁻', color: '#5eead4', actual: 15.1, target: 16 },
] as const;

export type Ion = Omit<typeof ions[number], 'actual'> & { actual: number };

export function formatPpm(value: number) {
  return value.toFixed(4).replace(/\.?0+$/, '');
}

export function IonRow({ ion, actual = ion.actual }: { ion: Ion; actual?: number }) {
  const target = ion.target;
  const overshoot = target > 0 ? actual > target + 0.05 : actual > 0.05;
  const covered = target > 0 && actual >= target - 0.05;
  const percent = target > 0 ? Math.round(actual / target * 100) : null;
  const status = target <= 0
    ? actual > 0.05 ? 'above target' : 'no target set'
    : overshoot ? `${formatPpm(actual - target)} ppm above target`
      : covered ? `${formatPpm(actual)} ppm — target reached`
        : `${formatPpm(actual)} ppm of ${formatPpm(target)} ppm covered`;
  return (
    <div data-watermancer-ion-row={ion.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center gap-x-3 gap-y-1 sm:grid-cols-[6rem_minmax(0,1fr)_6.5rem]">
      <span className="truncate text-xs font-semibold" style={{ color: ion.color }} title={ion.name}>{ion.formula}</span>
      <div className="min-w-0">
        <div className="relative min-w-0 cursor-help outline-none" tabIndex={0} role="img"
          aria-label={`${ion.name} (${ion.formula}): ${percent == null ? 'no target set' : `${percent}% of target`}`}>
          <div className="relative h-4 overflow-hidden rounded-full bg-slate-700/70">
            <div className="h-full origin-left rounded-full transition-transform duration-150 ease-out"
              style={{ width: '100%', transform: `scaleX(${target > 0 ? Math.min(actual / target, 1) : 0})`, backgroundColor: ion.color, boxShadow: `0 0 10px ${ion.color}40` }} />
            <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums leading-none ${covered || overshoot ? 'text-slate-950/80' : 'text-slate-300'}`}>
              {percent == null ? '—' : `${percent}%`}
            </span>
          </div>
        </div>
        <div className={`mt-1 truncate text-[10px] ${overshoot ? 'text-rose-300' : covered ? 'text-emerald-300' : actual > 0 ? 'text-cyan-300' : 'text-slate-500'}`}>{status}</div>
      </div>
      <span className="whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-100">
        {formatPpm(actual)}<span className="font-normal text-slate-500"> / {formatPpm(target)}</span>
      </span>
    </div>
  );
}

export function PreviewContext({ children }: { children: React.ReactNode }) {
  return (
    <main className="watermancer-readings min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-cyan-300/10 pb-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Watermancer / match result</div>
            <div className="mt-1 text-xl font-semibold tracking-tight text-slate-100">Review your mineral mix</div>
          </div>
          <div className="rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-[10px] uppercase tracking-widest text-cyan-200">Live</div>
        </div>
        {children}
      </div>
    </main>
  );
}
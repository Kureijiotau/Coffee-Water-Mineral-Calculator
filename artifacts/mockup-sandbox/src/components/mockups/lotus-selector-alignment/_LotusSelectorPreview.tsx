import { useState } from 'react';
import { Check, Pipette } from 'lucide-react';

const droppers = [
  { id: 'magnesium', label: 'Magnesium', mineral: 'Magnesium Chloride', formula: 'MgCl₂', form: 'Hexahydrate', color: '#fde047' },
  { id: 'calcium', label: 'Calcium', mineral: 'Calcium Chloride', formula: 'CaCl₂', form: 'Dihydrate', color: '#fb923c' },
  { id: 'potassium', label: 'Potassium', mineral: 'Potassium Bicarbonate', formula: 'KHCO₃', form: 'Anhydrous', color: '#c084fc' },
  { id: 'sodium', label: 'Sodium', mineral: 'Sodium Bicarbonate', formula: 'NaHCO₃', form: 'Anhydrous', color: '#fb7185' },
  { id: 'bonus-epsom', label: 'Bonus Epsom', mineral: 'Magnesium Sulfate', formula: 'MgSO₄', form: 'Heptahydrate (Epsom)', color: '#fde047', isBonus: true },
];

const inputClass = 'mt-1 w-full rounded-lg border border-slate-600/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-fuchsia-300';

function CalibrationSummary() {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="rounded-2xl border border-sky-300/30 bg-gradient-to-br from-sky-400/[0.08] via-slate-800/80 to-blue-500/[0.06] p-4 shadow-xl sm:p-5"
      open={open}
      onToggle={event => setOpen(event.currentTarget.open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-sky-100 marker:hidden">
        <span className="flex items-center gap-2">
          <Pipette className="h-4 w-4 text-sky-200" aria-hidden="true" />
          Dropper calibration
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          round calibrated
        </span>
      </summary>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(['Straight', 'Round']).map(style => (
            <fieldset key={style} className="rounded-xl border border-sky-200/20 bg-slate-950/25 px-3 py-2.5">
              <legend className="px-1 text-xs font-semibold text-sky-100">{style} tip</legend>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {style} tip measured drops
                <input className="mt-1 min-h-11 w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none" value={style === 'Round' ? '80' : '100'} readOnly />
              </label>
              <label className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {style} tip water weight in grams
                <input className="mt-1 min-h-11 w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none" value={style === 'Round' ? '4' : '3'} readOnly />
              </label>
            </fieldset>
          ))}
        </div>
      )}
    </details>
  );
}

export function LotusSelectorPreview({ aligned }: { aligned: boolean }) {
  const [dropperId, setDropperId] = useState('magnesium');
  const [style, setStyle] = useState<'straight' | 'round'>('round');
  const dropper = droppers.find(item => item.id === dropperId) ?? droppers[0];
  const calibrated = true;

  return (
    <main className="app-shell min-h-screen p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-3">
        <section className="rounded-2xl border border-amber-300/25 bg-slate-900/60 p-4 shadow-xl sm:p-5" data-testid="lotus-selected-dropper">
          <div className={aligned ? 'grid items-stretch gap-3 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-2'}>
            <label className="block text-xs font-semibold text-amber-100">
              {aligned && <span className="block min-h-4">Dropper to prepare</span>}
              {!aligned && 'Dropper to prepare'}
              <select
                aria-label="Dropper to prepare"
                className={`${inputClass} ${aligned ? 'min-h-14' : 'min-h-11'}`}
                value={dropperId}
                onChange={event => setDropperId(event.target.value)}
              >
                {droppers.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.label}{item.isBonus ? ' · optional, not Lotus' : ''}
                  </option>
                ))}
              </select>
            </label>
            {aligned ? (
              <div className="min-w-0">
                <span className="block min-h-4 text-xs font-semibold text-amber-100">Selected mineral</span>
                <div
                  className="mt-1 flex min-h-14 items-center justify-between gap-3 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-xs"
                  data-testid="lotus-selected-mineral"
                >
                  <span className="min-w-0">
                    <strong className="block text-sm" style={{ color: dropper.color }}>{dropper.mineral}</strong>
                    <span className="text-[10px] text-slate-400">{dropper.formula} · {dropper.form}</span>
                  </span>
                  {dropper.isBonus && (
                    <span className="shrink-0 rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                      Bonus · not Lotus
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-2">
                <span className="flex-1 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-xs" data-testid="lotus-selected-mineral">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">Selected mineral</span>
                  <strong className="mt-1 block text-sm" style={{ color: dropper.color }}>{dropper.mineral}</strong>
                  <span className="text-[10px] text-slate-400">{dropper.formula} · {dropper.form}</span>
                  {dropper.isBonus && (
                    <span className="mt-1 inline-flex rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                      Bonus · not Lotus
                    </span>
                  )}
                </span>
                {calibrated && (
                  <span className="mb-1 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-200" data-testid="lotus-selected-calibration-status">
                    {style} calibrated
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-slate-700/60 bg-slate-950/30 p-1" role="group" aria-label="Lotus dropper tip style">
            {(['straight', 'round'] as const).map(item => (
              <button
                key={item}
                type="button"
                aria-pressed={style === item}
                onClick={() => setStyle(item)}
                className={`min-h-11 rounded-md px-3 py-2 text-xs font-semibold capitalize transition ${
                  style === item
                    ? 'bg-cyan-400/15 text-cyan-100 shadow-sm ring-1 ring-cyan-200/25'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {item === 'straight' ? 'Straight' : 'Round'}
              </button>
            ))}
          </div>
        </section>
        <CalibrationSummary />
      </div>
    </main>
  );
}

import { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { IonRow, ions, formatPpm, PreviewContext } from './_shared';
import './_group.css';

export function Compact() {
  const [open, setOpen] = useState(false);
  const [dose, setDose] = useState(25);
  const [changed, setChanged] = useState(false);
  const readings = ions.map(ion => ({
    ...ion,
    actual: ion.id === 'magnesium' ? +(ion.actual + (dose - 25) * 0.1).toFixed(1)
      : ion.id === 'sulfate' ? +(ion.actual + (dose - 25) * 0.15).toFixed(1)
        : ion.actual,
  }));
  return (
    <PreviewContext>
      <section aria-label="Current ion readings" className="app-card overflow-hidden rounded-2xl border border-cyan-300/25 bg-slate-900/95 shadow-xl shadow-slate-950/30">
        <div className="flex items-center justify-between gap-3 border-b border-cyan-300/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">Current ion readings <span className="ml-1 text-cyan-300/60">· live</span></div>
            <p className="mt-1 text-[11px] text-slate-400">Final mix · mg/L · Custom ion targets</p>
          </div>
          <button type="button" aria-expanded={open} aria-controls="ion-detail" onClick={() => setOpen(!open)}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-cyan-300/20 bg-cyan-500/10 px-3 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/20">
            {open ? 'Less detail' : 'Full breakdown'} <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-px bg-cyan-300/10 sm:grid-cols-7">
          {readings.map(ion => {
            const active = changed && (ion.id === 'magnesium' || ion.id === 'sulfate');
            return <div key={ion.id} className={`min-w-0 bg-slate-900/95 px-2 py-3 text-center transition-colors duration-300 ${ion.id === 'bicarbonate' ? 'col-span-2 sm:col-span-1' : ''} ${active ? 'bg-cyan-500/15' : ''}`} aria-label={`${ion.name}: ${formatPpm(ion.actual)} milligrams per liter`}>
              <div className="text-[11px] font-semibold leading-tight" style={{ color: ion.color }}>{ion.formula}</div>
              <div className="mt-1 text-base font-semibold tabular-nums tracking-tight text-slate-100">{formatPpm(ion.actual)}</div>
              <div className="mt-0.5 text-[9px] text-slate-500">/{formatPpm(ion.target)} target</div>
            </div>;
          })}
        </div>
        {open && (
          <div id="ion-detail" className="border-t border-cyan-300/15 px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500"><span>Actual / target</span><span>ppm = mg/L</span></div>
            <div className="space-y-3">{readings.map(ion => <IonRow key={ion.id} ion={ion} actual={ion.actual} />)}</div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-cyan-400/15 pt-3 text-xs text-slate-400">
              <span>GH:KH <strong className="text-cyan-100">3.1:1</strong></span>
              <span>Mg:Ca <strong className="text-cyan-100">2.1:1</strong></span>
              <span>Cl:SO₄ <strong className="text-cyan-100">1.0:1</strong></span>
            </div>
          </div>
        )}
      </section>

      <section className="mt-5 rounded-2xl border border-slate-700/60 bg-slate-800/50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><SlidersHorizontal className="h-4 w-4 text-cyan-300" aria-hidden="true" /> Dose · Magnesium sulfate</div>
        <p className="mt-1 text-[11px] text-slate-400">Try changing this dose. Only the affected readings update above; no overlay follows you.</p>
        <label htmlFor="dose-preview" className="mt-4 flex justify-between text-xs text-slate-300"><span>Heptahydrate (Epsom)</span><span className="font-semibold tabular-nums text-cyan-200">{dose} mg</span></label>
        <input id="dose-preview" type="range" min="0" max="50" value={dose} onChange={e => { setDose(Number(e.target.value)); setChanged(true); }}
          className="mt-3 w-full accent-cyan-400" />
      </section>
      <p className="mt-3 text-[11px] text-slate-500">Isolated design prototype · no changes to your live Watermancer workflow.</p>
    </PreviewContext>
  );
}
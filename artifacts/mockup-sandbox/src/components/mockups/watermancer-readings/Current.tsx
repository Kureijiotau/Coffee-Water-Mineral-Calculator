import { useState } from 'react';
import { Pin, PinOff, Sparkles } from 'lucide-react';
import { IonRow, ions, PreviewContext } from './_shared';
import './_group.css';

export function Current() {
  const [follow, setFollow] = useState(false);
  const [feedback, setFeedback] = useState(true);
  return (
    <PreviewContext>
      <section className="app-card flex flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-900/95 shadow-2xl shadow-slate-950/40">
        <div className="app-section-header flex shrink-0 items-center justify-between gap-3 border-b border-cyan-400/15 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-transparent px-4 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-cyan-100">Current ion readings</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">Final mineral contribution from the current waters and salt doses.</p>
            </div>
            <span className="text-right text-[10px] uppercase tracking-wider text-slate-500">Custom ion targets</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={() => setFeedback(!feedback)} disabled={follow} aria-pressed={feedback}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${feedback ? 'border-cyan-300/40 bg-cyan-500/15 text-cyan-100' : 'border-slate-700/70 bg-slate-950/30 text-slate-500'} disabled:opacity-60`}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /><span className="hidden sm:inline">Feedback {feedback ? 'on' : 'off'}</span>
            </button>
            <button type="button" onClick={() => setFollow(!follow)} aria-pressed={follow}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition ${follow ? 'border-emerald-300/40 bg-emerald-500/15 text-emerald-100' : 'border-cyan-300/25 bg-slate-950/30 text-cyan-100'}`}>
              {follow ? <PinOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Pin className="h-3.5 w-3.5" aria-hidden="true" />}
              <span className="hidden sm:inline">{follow ? 'Following' : 'Follow'}</span>
            </button>
          </div>
        </div>
        <div className="app-card-body min-h-0 flex-1 space-y-3">
          {ions.map(ion => <IonRow key={ion.id} ion={ion} />)}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-cyan-400/15 pt-3 text-xs font-semibold tabular-nums">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ratios</span>
            <span className="text-slate-300">GH:KH <strong className="text-cyan-100">3.1:1</strong></span>
            <span className="text-slate-300">Mg:Ca <strong className="text-cyan-100">2.1:1</strong></span>
            <span className="text-slate-300">Cl:SO₄ <strong className="text-cyan-100">1.0:1</strong></span>
          </div>
        </div>
      </section>
      <p className="mt-3 text-[11px] text-slate-500">Existing design, extracted from the Watermancer readings card. Representative readings shown.</p>
    </PreviewContext>
  );
}
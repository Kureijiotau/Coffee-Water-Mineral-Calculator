import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Camera, Download, X } from 'lucide-react';
import { ACTIVE_ION_IDS, ION_MAP, SALTS } from '@/waterData';
import type { IonId } from '@/waterData';
import type { WatermancerRouteCandidate } from './watermancerPlan';

type Props = {
  route: WatermancerRouteCandidate;
  recipeName: string;
  volumeLiters: number;
};

const safeFilePart = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'watermancer';

export function IonicTelemetryCard({ route, recipeName, volumeLiters }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportCard = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#07111f',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `telemetry-${safeFilePart(recipeName)}-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-2 text-xs text-fuchsia-200 transition hover:border-fuchsia-300/60 hover:bg-fuchsia-500/20"
        title="Create a shareable ionic telemetry card"
      >
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Telemetry card</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Ionic telemetry card"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-fuchsia-400/25 bg-slate-950 p-4 shadow-2xl shadow-fuchsia-950/30 sm:p-6"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fuchsia-300">Shareable readout</div>
                <h2 className="mt-1 text-base font-semibold text-slate-100">Ionic telemetry card</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100" aria-label="Close telemetry card">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={cardRef} className="rounded-2xl border-2 border-indigo-400/25 bg-[#07111f] p-5 text-slate-200 shadow-xl sm:p-7">
              <div className="border-b border-indigo-400/25 pb-4">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-300">Watermancer // ionic signature</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-white">{recipeName}</div>
                <div className="mt-1 text-xs text-slate-400">Batch {volumeLiters.toFixed(2)} L · {route.label}</div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.05] p-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">Ion telemetry</div>
                  <div className="mt-3 space-y-3">
                    {ACTIVE_ION_IDS.map((id: IonId) => {
                      const actual = route.finalIons[id] ?? 0;
                      const target = route.plan.targetIons[id] ?? 0;
                      const max = Math.max(actual, target, 1);
                      const delta = actual - target;
                      return (
                        <div key={id}>
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-300">{ION_MAP[id].name}</span>
                            <span className={Math.abs(delta) <= 0.05 ? 'text-emerald-300' : delta > 0 ? 'text-amber-300' : 'text-rose-300'}>
                              {actual.toFixed(1)} / {target.toFixed(1)} ppm
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400" style={{ width: `${Math.min(100, actual / max * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Salt targets</div>
                    <div className="mt-3 space-y-2">
                      {SALTS.some(salt => (route.saltTargets[salt.id] ?? 0) > 0.000001) ? SALTS.map(salt => {
                        const target = route.saltTargets[salt.id] ?? 0;
                        if (target <= 0.000001) return null;
                        return <div key={salt.id} className="flex justify-between gap-3 text-[11px]"><span className="text-slate-300">{salt.name}</span><span className="font-semibold tabular-nums text-emerald-200">{target.toFixed(2)} ppm</span></div>;
                      }) : <div className="text-[11px] text-slate-500">No addition salts.</div>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.05] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-300">Water route</div>
                    <div className="mt-3 space-y-2">
                      {[...route.baseWaters, ...route.additionWaters].map(water => (
                        <div key={`${water.id}-${water.volumeMl}`} className="flex justify-between gap-3 text-[11px]">
                          <span className="truncate text-slate-300">{water.name || 'Unnamed water'}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-violet-200">{Number(water.volumeMl).toFixed(0)} mL</span>
                        </div>
                      ))}
                      {[...route.baseWaters, ...route.additionWaters].length === 0 && <div className="text-[11px] text-slate-500">No mineral water selected.</div>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 border-t border-indigo-400/20 pt-3 text-[10px] uppercase tracking-wider text-slate-500">Generated by Watermancer · values are modeled final mixture readings</div>
            </div>

            <button
              type="button"
              onClick={exportCard}
              disabled={exporting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-500 disabled:cursor-wait disabled:opacity-60"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {exporting ? 'Capturing telemetry…' : 'Download PNG'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
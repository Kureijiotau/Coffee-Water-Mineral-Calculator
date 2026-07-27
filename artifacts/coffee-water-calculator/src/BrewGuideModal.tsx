import { createPortal } from 'react-dom';
import { X, ListChecks } from 'lucide-react';
import { SALTS, ION_MAP, computeSaltMg } from '@/waterData';

const num = (s: string): number => {
  const v = parseFloat(s);
  return !Number.isFinite(v) || v < 0 ? 0 : v;
};

const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

type MineralWaterEntry = {
  id: string;
  name: string;
  ions: Partial<Record<string, string>>;
  volumeMl: string;
};

interface BrewGuideModalProps {
  show: boolean;
  onClose: () => void;
  rows: { target: string; formIdx: number }[];
  batchMl: number;
  liters: string;
  totalBaseMl: number;
  totalMineralMl: number;
  mineralWaters: MineralWaterEntry[];
  additionWaters: MineralWaterEntry[];
  activeRecipe?: { name: string };
  sulfateFirst: boolean;
}

export default function BrewGuideModal({
  show,
  onClose,
  rows,
  batchMl,
  liters,
  totalBaseMl,
  totalMineralMl,
  mineralWaters,
  additionWaters,
  activeRecipe,
  sulfateFirst,
}: BrewGuideModalProps) {
  if (!show) return null;

  const activeSalts = SALTS
    .map((s, i) => ({ salt: s, target: num(rows[i].target), formIdx: rows[i].formIdx }))
    .filter(s => s.target > 0);
  const hasBase = totalBaseMl > 0;
  const hasAddition = totalMineralMl > 0;
  const totalMineral = totalBaseMl + totalMineralMl;
  const remaining0Tds = Math.max(batchMl - totalMineral, 0);
  const dissolveMin = Math.min(200, remaining0Tds);
  const finalTopUp = remaining0Tds - dissolveMin;
  const L = num(liters);

  const steps: { icon: string; text: string; detail?: string }[] = [];

  if (hasBase) {
    const names = mineralWaters.filter(e => num(e.volumeMl) > 0).map(e => e.name || 'Unnamed').join(', ');
    steps.push({ icon: '💧', text: 'Add your base water', detail: `${fmt(totalBaseMl)} mL of ${names || 'base water'} to your brewing container.` });
  }
  if (dissolveMin > 0) {
    steps.push({ icon: '💧', text: 'Add 0 TDS water for dissolving salts', detail: `Add at least ${fmt(dissolveMin)} mL of 0 TDS (distilled/RO) water${hasBase ? ' to the base water' : ' to your clean brewing container'}. This ensures the salts dissolve completely before topping up.` });
  }
  const preferredFirst = sulfateFirst ? 'sulfate' : 'chloride';
  const sorted = [...activeSalts].sort((a, b) => {
    const aHasPreferred = a.salt.ions.some(c => c.ionId === preferredFirst);
    const bHasPreferred = b.salt.ions.some(c => c.ionId === preferredFirst);
    if (aHasPreferred && !bHasPreferred) return -1;
    if (!aHasPreferred && bHasPreferred) return 1;
    const aIsBicarb = a.salt.ions.some(c => c.ionId === 'bicarbonate' || c.ionId === 'carbonate');
    const bIsBicarb = b.salt.ions.some(c => c.ionId === 'bicarbonate' || c.ionId === 'carbonate');
    if (aIsBicarb && !bIsBicarb) return 1;
    if (!aIsBicarb && bIsBicarb) return -1;
    return 0;
  });
  for (const { salt, target, formIdx } of sorted) {
    const form = salt.hydrationForms[formIdx];
    const mg = computeSaltMg(target, L, form.molarMass, salt.anhydrousMass);
    const massDisplay = mg >= 1000 ? `${(mg / 1000).toFixed(2)} g` : `${Math.round(mg)} mg`;
    const ionNames = salt.ions.map(c => ION_MAP[c.ionId]?.formula || c.ionId).join(', ');
    steps.push({ icon: '🧂', text: `Add ${salt.name}`, detail: `Weigh out ${massDisplay} (${form.label}) and add to the water. Stir until fully dissolved. (Provides ${ionNames})` });
  }
  if (finalTopUp > 0) {
    steps.push({ icon: '💧', text: 'Top up with remaining 0 TDS water', detail: `Add the remaining ${fmt(finalTopUp)} mL of 0 TDS water to reach the final batch volume of ${fmt(batchMl)} mL.` });
  }
  steps.push({ icon: '⏳', text: 'Final stir and rest', detail: 'Stir thoroughly for 30–60 seconds, then let the water rest for 15–30 minutes. This ensures all salts are fully dissolved and the water is homogeneous before brewing.' });
  if (hasAddition) {
    const names = additionWaters.filter(e => num(e.volumeMl) > 0).map(e => e.name || 'Unnamed').join(', ');
    steps.push({ icon: '✅', text: 'Ready to brew', detail: `Your addition water${additionWaters.filter(e => num(e.volumeMl) > 0).length > 1 ? 's are' : ' is'} already accounted for: ${names}. The water is ready.` });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-12 sm:pt-16 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-500">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-white" />
            <h2 className="text-base font-semibold text-white tracking-tight">Brew Guide</h2>
          </div>
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg px-2.5 py-1.5 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 bg-slate-900/50 border-b border-slate-700/40">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <span>Recipe: <span className="text-slate-200 font-medium">{activeRecipe?.name ?? 'Custom'}</span></span>
            <span>Batch: <span className="text-slate-200 font-medium">{fmt(batchMl)} mL</span></span>
            {hasBase && <span>Base: <span className="text-slate-200 font-medium">{fmt(totalBaseMl)} mL</span></span>}
            {hasAddition && <span>Addition: <span className="text-slate-200 font-medium">{fmt(totalMineralMl)} mL</span></span>}
          </div>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-sm">{step.icon}</div>
                {i < steps.length - 1 && <div className="w-px flex-1 bg-slate-700 my-1" />}
              </div>
              <div className="pb-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">{i + 1}</span>
                  <span className="text-sm font-semibold text-slate-100">{step.text}</span>
                </div>
                {step.detail && <p className="mt-1 text-xs text-slate-400 leading-relaxed ml-7">{step.detail}</p>}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-slate-900/50 border-t border-slate-700/40 flex items-center justify-between">
          <span className="text-[10px] text-slate-500">{steps.length} step{steps.length !== 1 ? 's' : ''}</span>
          <button onClick={onClose} className="text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-1.5 transition">Got it</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

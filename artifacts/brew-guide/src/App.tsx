import { useState } from 'react';
import { FlaskConical, Droplet, ListChecks, X, RotateCcw, Calculator } from 'lucide-react';

/* ─── Salt data (subset of the calculator's data) ─── */
interface IonInfo { id: string; formula: string; name: string; }
const ION_MAP: Record<string, IonInfo> = {
  sulfate:     { id: 'sulfate',     formula: 'SO₄²⁻',  name: 'Sulfate' },
  chloride:    { id: 'chloride',    formula: 'Cl⁻',     name: 'Chloride' },
  sodium:      { id: 'sodium',      formula: 'Na⁺',     name: 'Sodium' },
  magnesium:   { id: 'magnesium',   formula: 'Mg²⁺',    name: 'Magnesium' },
  calcium:     { id: 'calcium',     formula: 'Ca²⁺',    name: 'Calcium' },
  bicarbonate: { id: 'bicarbonate', formula: 'HCO₃⁻',   name: 'Bicarbonate' },
  carbonate:   { id: 'carbonate',   formula: 'CO₃²⁻',   name: 'Carbonate' },
  potassium:   { id: 'potassium',   formula: 'K⁺',      name: 'Potassium' },
};

interface HydrationForm { label: string; molarMass: number; }
interface SaltCation { ionId: string; charge: number; }
interface SaltInfo {
  id: string; name: string; formula: string;
  hydrationForms: HydrationForm[];
  anhydrousMass: number;
  cations: SaltCation[];
  anions: { ionId: string; charge: number }[];
  ions: { ionId: string }[];
}

const SALTS: SaltInfo[] = [
  { id: 'mgso4', name: 'Magnesium Sulfate', formula: 'MgSO₄', anhydrousMass: 120.366,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 120.366 },
      { label: 'Heptahydrate (Epsom)', molarMass: 246.474 },
    ],
    cations: [{ ionId: 'magnesium', charge: 2 }], anions: [{ ionId: 'sulfate', charge: 2 }],
    ions: [{ ionId: 'magnesium' }, { ionId: 'sulfate' }] },
  { id: 'mgcl2', name: 'Magnesium Chloride', formula: 'MgCl₂', anhydrousMass: 95.211,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 95.211 },
      { label: 'Hexahydrate', molarMass: 203.302 },
    ],
    cations: [{ ionId: 'magnesium', charge: 2 }], anions: [{ ionId: 'chloride', charge: 1 }],
    ions: [{ ionId: 'magnesium' }, { ionId: 'chloride' }] },
  { id: 'mg3c6h5o7', name: 'Magnesium Citrate', formula: 'Mg₃(C₆H₅O₇)₂', anhydrousMass: 451.114,
    hydrationForms: [{ label: 'Nonahydrate', molarMass: 595.318 }],
    cations: [{ ionId: 'magnesium', charge: 2 }],
    anions: [{ ionId: 'citrate', charge: 3 }],
    ions: [{ ionId: 'magnesium' }] },
  { id: 'cacl2', name: 'Calcium Chloride', formula: 'CaCl₂', anhydrousMass: 110.984,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 110.984 },
      { label: 'Dihydrate', molarMass: 147.014 },
    ],
    cations: [{ ionId: 'calcium', charge: 2 }], anions: [{ ionId: 'chloride', charge: 1 }],
    ions: [{ ionId: 'calcium' }, { ionId: 'chloride' }] },
  { id: 'caso4', name: 'Calcium Sulfate', formula: 'CaSO₄', anhydrousMass: 136.14,
    hydrationForms: [
      { label: 'Anhydrous', molarMass: 136.14 },
      { label: 'Dihydrate (Gypsum)', molarMass: 172.171 },
    ],
    cations: [{ ionId: 'calcium', charge: 2 }], anions: [{ ionId: 'sulfate', charge: 2 }],
    ions: [{ ionId: 'calcium' }, { ionId: 'sulfate' }] },
  { id: 'nahco3', name: 'Sodium Bicarbonate', formula: 'NaHCO₃', anhydrousMass: 84.006,
    hydrationForms: [{ label: 'Anhydrous', molarMass: 84.006 }],
    cations: [{ ionId: 'sodium', charge: 1 }], anions: [{ ionId: 'bicarbonate', charge: 1 }],
    ions: [{ ionId: 'sodium' }, { ionId: 'bicarbonate' }] },
  { id: 'k2co3', name: 'Potassium Carbonate', formula: 'K₂CO₃', anhydrousMass: 138.205,
    hydrationForms: [{ label: 'Anhydrous', molarMass: 138.205 }],
    cations: [{ ionId: 'potassium', charge: 1 }], anions: [{ ionId: 'carbonate', charge: 2 }],
    ions: [{ ionId: 'potassium' }, { ionId: 'carbonate' }] },
  { id: 'nacl', name: 'Sodium Chloride', formula: 'NaCl', anhydrousMass: 58.44,
    hydrationForms: [{ label: 'Anhydrous', molarMass: 58.44 }],
    cations: [{ ionId: 'sodium', charge: 1 }], anions: [{ ionId: 'chloride', charge: 1 }],
    ions: [{ ionId: 'sodium' }, { ionId: 'chloride' }] },
];

const computeSaltMg = (target: number, L: number, molarMass: number, anhydrousMass: number): number => {
  if (L <= 0 || target <= 0) return 0;
  return (target * L * molarMass) / anhydrousMass;
};

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
const num = (s: string): number => { const v = parseFloat(s); return !Number.isFinite(v) || v < 0 ? 0 : v; };

/* ─── Salt row component ─── */
interface SaltRowData { target: string; formIdx: number; }
type SaltRowProps = { salt: SaltInfo; row: SaltRowData; onChange: (patch: Partial<SaltRowData>) => void; batchMl: number; };

function SaltRow({ salt, row, onChange, batchMl }: SaltRowProps) {
  const L = batchMl / 1000;
  const form = salt.hydrationForms[row.formIdx];
  const mg = computeSaltMg(num(row.target), L, form.molarMass, salt.anhydrousMass);
  const massDisplay = mg >= 1000 ? `${(mg / 1000).toFixed(2)} g` : `${Math.round(mg)} mg`;
  const ionNames = salt.ions.map(c => ION_MAP[c.ionId]?.formula || c.ionId).join(', ');

  return (
    <div className="flex flex-wrap items-center gap-2 bg-slate-800/40 rounded-lg px-3 py-2 border border-slate-700/50">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-200">{salt.name}</div>
        <div className="text-[10px] text-slate-500">{ionNames}</div>
      </div>
      <input
        type="number" min="0" step="5" value={row.target}
        onChange={e => onChange({ target: e.target.value })}
        placeholder="ppm"
        className="w-20 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2 py-1 text-xs text-slate-200 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
      />
      <select
        value={row.formIdx} onChange={e => onChange({ formIdx: Number(e.target.value) })}
        className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-1.5 py-1 text-[10px] text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 max-w-28 truncate"
      >
        {salt.hydrationForms.map((f, i) => (
          <option key={i} value={i}>{f.label}</option>
        ))}
      </select>
      {batchMl > 0 && num(row.target) > 0 && (
        <span className="text-xs text-slate-400 tabular-nums w-14 text-right">{massDisplay}</span>
      )}
    </div>
  );
}

/* ─── Brew Guide Modal ─── */
type Step = { icon: string; text: string; detail?: string };

function BrewGuide({ rows, batchMl, onClose }: {
  rows: SaltRowData[];
  batchMl: number;
  onClose: () => void;
}) {
  const L = batchMl / 1000;
  const activeSalts = SALTS
    .map((s, i) => ({ salt: s, target: num(rows[i].target), formIdx: rows[i].formIdx }))
    .filter(s => s.target > 0);
  if (activeSalts.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-slate-800 rounded-2xl p-6 border border-slate-700/60 max-w-sm text-center">
          <p className="text-sm text-slate-300">Set at least one salt target first.</p>
          <button onClick={onClose} className="mt-4 text-xs font-medium text-white bg-emerald-600 rounded-lg px-4 py-2">Got it</button>
        </div>
      </div>
    );
  }

  const steps: Step[] = [];
  const dissolveMin = Math.min(200, batchMl);
  const finalTopUp = batchMl - dissolveMin;

  if (dissolveMin > 0) {
    steps.push({ icon: '💧', text: 'Prepare 0 TDS water', detail: `Add at least ${fmt(dissolveMin)} mL of distilled/RO water to your clean brewing container. This ensures the salts dissolve completely.` });
  }
  const preferredFirst = 'sulfate';
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
    steps.push({
      icon: '🧂',
      text: `Add ${salt.name}`,
      detail: `Weigh out ${massDisplay} (${form.label}) and add to the water. Stir until fully dissolved. (Provides ${ionNames})`,
    });
  }

  if (finalTopUp > 0) {
    steps.push({ icon: '💧', text: 'Top up with 0 TDS water', detail: `Add the remaining ${fmt(finalTopUp)} mL of 0 TDS water to reach the final batch volume of ${fmt(batchMl)} mL.` });
  }
  steps.push({ icon: '⏳', text: 'Final stir and rest', detail: 'Stir thoroughly for 30–60 seconds, then let the water rest for 15–30 minutes. This ensures all salts are fully dissolved and the water is homogeneous before brewing.' });

  return (
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
            <span>Batch: <span className="text-slate-200 font-medium">{fmt(batchMl)} mL</span></span>
            <span>Salts: <span className="text-slate-200 font-medium">{activeSalts.length}</span></span>
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
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [batchMl, setBatchMl] = useState(1000);
  const [rows, setRows] = useState<SaltRowData[]>(() => SALTS.map(() => ({ target: '', formIdx: 0 })));
  const [showGuide, setShowGuide] = useState(false);

  const updateRow = (i: number, patch: Partial<SaltRowData>) => {
    setRows(prev => prev.map((r, j) => j === i ? { ...r, ...patch } : r));
  };

  const reset = () => {
    setBatchMl(1000);
    setRows(SALTS.map(() => ({ target: '', formIdx: 0 })));
  };

  const hasSalts = SALTS.some((_, i) => num(rows[i].target) > 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-start justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-3xl space-y-4">
        {/* Header */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-500">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-white" />
              <h1 className="text-lg font-semibold text-white tracking-tight">Brew Guide</h1>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg px-2.5 py-1.5 transition"
              title="Reset all values"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* Batch volume */}
          <div className="px-6 py-4 border-b border-slate-700/40">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              <Droplet className="w-3.5 h-3.5" />
              Batch Volume
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min="100" max="5000" step="50"
                value={batchMl}
                onChange={e => setBatchMl(Number(e.target.value))}
                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-700/60 accent-emerald-400"
              />
              <span className="text-sm font-semibold text-slate-200 tabular-nums w-16 text-right">{fmt(batchMl)} mL</span>
            </div>
          </div>
        </div>

        {/* Salt targets */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700/40">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Salt Targets</h2>
            </div>
            {hasSalts && batchMl > 0 && (
              <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2 py-0.5">
                {SALTS.filter((_, i) => num(rows[i].target) > 0).length} active
              </span>
            )}
          </div>
          <div className="px-6 py-4 space-y-2">
            {SALTS.map((salt, i) => (
              <SaltRow key={salt.id} salt={salt} row={rows[i]} onChange={p => updateRow(i, p)} batchMl={batchMl} />
            ))}
          </div>
        </div>

        {/* Generate button */}
        {hasSalts && batchMl > 0 && (
          <button
            onClick={() => setShowGuide(true)}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 border border-emerald-400/50 rounded-xl px-4 py-3 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
          >
            <ListChecks className="w-5 h-5" />
            Generate Brew Guide
          </button>
        )}

        {!hasSalts && (
          <div className="text-center py-8">
            <FlaskConical className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Set at least one salt target to generate a brew guide.</p>
          </div>
        )}
      </div>

      {showGuide && (
        <BrewGuide rows={rows} batchMl={batchMl} onClose={() => setShowGuide(false)} />
      )}
    </div>
  );
}

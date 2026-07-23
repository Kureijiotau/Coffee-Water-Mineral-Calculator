import { useMemo, useState } from 'react';
import { Calculator, Droplet, FlaskConical, Gauge, Info, AlertTriangle } from 'lucide-react';
import {
  SALTS, IONS, ACTIVE_ION_IDS, ION_MAP, classifyIon, computeSaltMg,
  computeIonTotals, computeGH, computeKH,
  type IonId, type TrafficLevel,
} from '@/waterData';

type SaltRow = { target: string; formIdx: number };
type BaseWater = Partial<Record<IonId, string>>;

const TRAFFIC_STYLES: Record<TrafficLevel, { dot: string; text: string; border: string; bg: string; label: string }> = {
  green:  { dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', label: 'In range' },
  yellow: { dot: 'bg-amber-400',   text: 'text-amber-300',   border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   label: 'Elevated' },
  red:    { dot: 'bg-rose-400',    text: 'text-rose-300',    border: 'border-rose-500/40',    bg: 'bg-rose-500/10',    label: 'Too high' },
};

const num = (s: string): number => {
  const v = parseFloat(s);
  return isNaN(v) || v < 0 ? 0 : v;
};

const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

function App() {
  const [liters, setLiters] = useState('1');
  const [rows, setRows] = useState<SaltRow[]>(
    SALTS.map(() => ({ target: '', formIdx: 0 })),
  );
  const [baseWater, setBaseWater] = useState<BaseWater>({});
  const [bottledMl, setBottledMl] = useState('0');

  const L = num(liters);
  const batchMl = L * 1000;
  const bottled = num(bottledMl);
  const overfill = bottled > batchMl && batchMl > 0;
  const dil = batchMl > 0 ? Math.min(bottled / batchMl, 1) : 0;
  const tdsMl = Math.max(batchMl - Math.min(bottled, batchMl), 0);

  const saltTargets = useMemo(() => {
    const m: Record<string, number> = {};
    SALTS.forEach((s, i) => { m[s.id] = num(rows[i].target); });
    return m;
  }, [rows]);

  const baseIons = useMemo(() => {
    const m = {} as Partial<Record<IonId, number>>;
    for (const id of ACTIVE_ION_IDS) m[id] = num(baseWater[id] ?? '');
    return m;
  }, [baseWater]);

  const ionTotals = useMemo(
    () => computeIonTotals(saltTargets, baseIons, dil),
    [saltTargets, baseIons, dil],
  );

  // Bottled water's own contribution (already diluted)
  const bottledIons = useMemo(() => {
    const m = {} as Record<IonId, number>;
    for (const ion of IONS) m[ion.id] = (baseIons[ion.id] || 0) * dil;
    return m;
  }, [baseIons, dil]);

  const gh = computeGH(ionTotals);
  const kh = computeKH(ionTotals);
  const ghBottled = computeGH(bottledIons);
  const khBottled = computeKH(bottledIons);
  const ghSalt = gh - ghBottled;
  const khSalt = kh - khBottled;

  const overallLevel: TrafficLevel = useMemo(() => {
    let worst: TrafficLevel = 'green';
    for (const id of ACTIVE_ION_IDS) {
      const lvl = classifyIon(ionTotals[id], ION_MAP[id]);
      if (lvl === 'red') return 'red';
      if (lvl === 'yellow') worst = 'yellow';
    }
    return worst;
  }, [ionTotals]);

  const updateRow = (i: number, patch: Partial<SaltRow>) =>
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-start justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-5xl space-y-4">
        {/* Header */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-600 to-cyan-500">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-white" />
              <h1 className="text-lg font-semibold text-white tracking-tight">Coffee Water Mineral Calculator</h1>
            </div>
            <OverallBadge level={overallLevel} />
          </div>
        </div>

        {/* Mineral Table */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader icon={<FlaskConical className="w-4 h-4" />} title="Mineral Salts" />
          <div className="grid grid-cols-[1.3fr_1fr_1.2fr_1fr] gap-3 px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-400 border-b border-slate-700/40">
            <span>Salt</span>
            <span>Target (ppm)</span>
            <span>Hydrated Form</span>
            <span>Amount (mg)</span>
          </div>
          {SALTS.map((salt, i) => {
            const row = rows[i];
            const form = salt.hydrationForms[row.formIdx];
            const target = num(row.target);
            const mg = L > 0 && target > 0
              ? computeSaltMg(target, L, form.molarMass, salt.anhydrousMass)
              : 0;
            return (
              <div key={salt.id} className="grid grid-cols-[1.3fr_1fr_1.2fr_1fr] gap-3 px-6 py-2.5 items-center border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">{salt.name}</span>
                  <span className="text-xs text-slate-500">{salt.formula}</span>
                </div>
                <input
                  type="number"
                  value={row.target}
                  onChange={e => updateRow(i, { target: e.target.value })}
                  placeholder="0"
                  className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                />
                <select
                  value={row.formIdx}
                  onChange={e => updateRow(i, { formIdx: parseInt(e.target.value) })}
                  className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                >
                  {salt.hydrationForms.map((f, fi) => (
                    <option key={fi} value={fi}>{f.label}</option>
                  ))}
                </select>
                <div className="text-sm font-mono text-emerald-300">
                  {mg > 0 ? mg.toFixed(2) : '—'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Water amount */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader icon={<Droplet className="w-4 h-4" />} title="Water Volume" />
          <div className="px-6 py-4 flex items-center gap-4">
            <label className="text-sm text-slate-300">Final batch volume:</label>
            <input
              type="number"
              value={liters}
              onChange={e => setLiters(e.target.value)}
              placeholder="Liters"
              className="w-32 bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
            />
            <span className="text-sm text-slate-400">liters</span>
          </div>
        </div>

        {/* GH / KH Summary */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader icon={<Gauge className="w-4 h-4" />} title="Hardness Summary (as CaCO₃)" />
          <div className="px-6 py-4 grid grid-cols-2 gap-4">
            <HardnessCard label="General Hardness (GH)" value={gh} saltValue={ghSalt} bottledValue={ghBottled} />
            <HardnessCard label="Carbonate Hardness (KH)" value={kh} saltValue={khSalt} bottledValue={khBottled} />
          </div>
        </div>

        {/* Bottled Water */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader icon={<Droplet className="w-4 h-4" />} title="Bottled Water Addition" />
          <div className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-300">Bottled water volume:</label>
                <input
                  type="number"
                  value={bottledMl}
                  onChange={e => setBottledMl(e.target.value)}
                  placeholder="0"
                  className="w-28 bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                />
                <span className="text-sm text-slate-400">mL</span>
              </div>
              {batchMl > 0 && (
                <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg px-3 py-1.5 border border-slate-700/40">
                  {fmt(Math.min(bottled, batchMl))} mL bottled
                  <span className="text-slate-500 mx-1.5">+</span>
                  {fmt(tdsMl)} mL 0 TDS
                  <span className="text-slate-500 mx-1.5">=</span>
                  {fmt(batchMl)} mL final
                </div>
              )}
            </div>
            {overfill && (
              <div className="flex items-center gap-2 mb-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Bottled water volume exceeds the final batch volume. The excess is ignored — the whole batch will be bottled water with no 0 TDS added.
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {ACTIVE_ION_IDS.map(id => (
                <div key={id}>
                  <label className="block text-xs text-slate-400 mb-1">{ION_MAP[id].formula}</label>
                  <input
                    type="number"
                    value={baseWater[id] ?? ''}
                    onChange={e => setBaseWater(prev => ({ ...prev, [id]: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-slate-900/60 border border-slate-600/60 rounded-lg px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Enter mineral concentrations from the bottled water label in mg/L. The bottled water is part of the final batch — the remainder is 0 TDS water.
            </p>
          </div>
        </div>

        {/* Ion Profile */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader icon={<Gauge className="w-4 h-4" />} title="Ion Profile" />
          <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ACTIVE_ION_IDS.map(id => {
              const ion = ION_MAP[id];
              const ppm = ionTotals[id];
              const level = classifyIon(ppm, ion);
              const s = TRAFFIC_STYLES[level];
              return (
                <div key={id} className={`rounded-xl border ${s.border} ${s.bg} px-4 py-3`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-200">{ion.name}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold ${s.text}`}>{ppm.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">ppm</span>
                  </div>
                  <div className={`text-xs ${s.text} mt-0.5`}>
                    {s.label} · &lt;{ion.greenMax} / {ion.greenMax}–{ion.yellowMax} / &gt;{ion.yellowMax}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-700/40 text-slate-300">
      {icon}
      <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
    </div>
  );
}

function OverallBadge({ level }: { level: TrafficLevel }) {
  const s = TRAFFIC_STYLES[level];
  const text = level === 'green' ? 'All ions in range' : level === 'yellow' ? 'Some ions elevated' : 'Ion levels too high';
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.bg} border ${s.border}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
      <span className={`text-xs font-medium ${s.text}`}>{text}</span>
    </div>
  );
}

function HardnessCard({ label, value, saltValue, bottledValue }: {
  label: string; value: number; saltValue: number; bottledValue: number;
}) {
  return (
    <div className="bg-slate-900/40 rounded-xl border border-slate-700/40 px-4 py-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-cyan-300">{value.toFixed(1)}</span>
        <span className="text-sm text-slate-400">ppm CaCO₃</span>
      </div>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Salts:</span>
          <span className="font-mono text-emerald-300">{saltValue.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="text-slate-400">Bottled:</span>
          <span className="font-mono text-sky-300">{bottledValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

export default App;

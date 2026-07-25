import { useEffect, useMemo, useState } from 'react';
import { Calculator, Droplet, FlaskConical, Gauge, Info, AlertTriangle, Settings, Eye, EyeOff } from 'lucide-react';
import {
  SALTS, IONS, ACTIVE_ION_IDS, ION_MAP, AIKI_DEFAULT_PROFILE, classifyIon, computeSaltMg,
  computeIonTotals, computeGH, computeKH,
  type IonId, type TrafficLevel, type WaterProfile, type RangeSet,
} from '@/waterData';
import { SettingsModal } from '@/SettingsModal';
import {
  loadProfiles, saveProfiles, loadActiveProfileId, saveActiveProfileId,
  loadIndicatorOn, saveIndicatorOn, createProfile,
} from '@/profiles';

type SaltRow = { target: string; formIdx: number };
type BaseWater = Partial<Record<IonId, string>>;

const TRAFFIC_STYLES: Record<TrafficLevel, { dot: string; text: string; border: string; bg: string; label: string }> = {
  green:  { dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', label: 'In range' },
  yellow: { dot: 'bg-amber-400',   text: 'text-amber-300',   border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   label: 'Elevated' },
  red:    { dot: 'bg-rose-400',    text: 'text-rose-300',    border: 'border-rose-500/40',    bg: 'bg-rose-500/10',    label: 'Too high' },
};

const num = (s: string): number => {
  const v = parseFloat(s);
  return !Number.isFinite(v) || v < 0 ? 0 : v;
};

const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

function App() {
  const [liters, setLiters] = useState('1');
  const [rows, setRows] = useState<SaltRow[]>(
    SALTS.map(s => ({ target: '', formIdx: s.defaultFormIdx ?? 0 })),
  );
  const [baseWater, setBaseWater] = useState<BaseWater>({});
  const [bottledMl, setBottledMl] = useState('0');

  // Profile + settings state
  const [profiles, setProfiles] = useState<WaterProfile[]>(() => loadProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => loadActiveProfileId());
  const [showSettings, setShowSettings] = useState(false);
  const [indicatorOn, setIndicatorOn] = useState<boolean>(() => loadIndicatorOn());

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? AIKI_DEFAULT_PROFILE;
  const activeRanges: RangeSet = activeProfile.ranges;

  // Persist on changes
  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => { saveActiveProfileId(activeProfileId); }, [activeProfileId]);
  useEffect(() => { saveIndicatorOn(indicatorOn); }, [indicatorOn]);

  const handleSelectProfile = (id: string) => setActiveProfileId(id);
  const handleSaveProfile = (profile: WaterProfile) => {
    setProfiles(prev => {
      const existing = prev.find(p => p.id === profile.id);
      if (existing) return prev.map(p => p.id === profile.id ? profile : p);
      return [...prev, profile];
    });
    setActiveProfileId(profile.id);
  };
  const handleDeleteProfile = (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) setActiveProfileId(AIKI_DEFAULT_PROFILE.id);
  };

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
      const lvl = classifyIon(ionTotals[id], activeRanges[id]);
      if (lvl === 'red') return 'red';
      if (lvl === 'yellow') worst = 'yellow';
    }
    return worst;
  }, [ionTotals, activeRanges]);

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
            <div className="group/badge flex items-center gap-1">
              {indicatorOn && <OverallBadge level={overallLevel} />}
              <button
                onClick={() => setIndicatorOn(prev => !prev)}
                className={`flex items-center gap-1 text-xs text-slate-100/70 hover:text-white hover:bg-white/20 rounded-lg px-2 py-1.5 transition-all focus:opacity-100 ${
                  indicatorOn
                    ? 'opacity-0 group-hover/badge:opacity-100'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title={indicatorOn ? 'Hide status badge' : 'Show status badge'}
              >
                {indicatorOn ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
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
                {salt.hydrationForms.length > 1 ? (
                  <select
                    value={row.formIdx}
                    onChange={e => updateRow(i, { formIdx: parseInt(e.target.value) })}
                    className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                  >
                    {salt.hydrationForms.map((f, fi) => (
                      <option key={fi} value={fi}>{f.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="px-3 py-2 text-sm text-slate-500">{salt.hydrationForms[0].label}</span>
                )}
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
            <div className="col-span-2 flex items-center justify-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">GH : KH Ratio</span>
              <span className="h-4 w-px bg-slate-700" />
              {kh > 0 && gh >= 0 && Number.isFinite(gh / kh) ? (
                <span className="text-lg font-semibold text-sky-300 tabular-nums">
                  {(gh / kh).toFixed(1)}<span className="text-slate-400 font-normal text-sm mx-1">:</span>1
                </span>
              ) : (
                <span className="text-lg font-semibold text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Mineral Water */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader icon={<Droplet className="w-4 h-4" />} title="Mineral Water Addition" />
          <div className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-300">Mineral water volume:</label>
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
                  {fmt(Math.min(bottled, batchMl))} mL mineral
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
                Mineral water volume exceeds the final batch volume. The excess is ignored — the whole batch will be mineral water with no 0 TDS added.
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
              Enter mineral concentrations from the mineral water label in mg/L. The mineral water is part of the final batch — the remainder is 0 TDS water.
            </p>
          </div>
        </div>

        {/* Ion Profile */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700/40 text-slate-300">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Ion Profile</h2>
              <span className="text-xs text-slate-400 font-normal normal-case">— {activeProfile.name}</span>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-700/40 hover:bg-slate-700/60 rounded-lg px-2.5 py-1.5 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
          <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ACTIVE_ION_IDS.map((id, idx) => {
              const ion = ION_MAP[id];
              const ppm = ionTotals[id];
              const level = classifyIon(ppm, activeRanges[id]);
              const s = TRAFFIC_STYLES[level];
              const r = activeRanges[id];
              const tooltipAbove = idx >= Math.ceil(ACTIVE_ION_IDS.length / 2);
              return (
                <div
                  key={id}
                  className={`group/ion relative rounded-xl border ${s.border} ${s.bg} px-4 py-3`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-200 cursor-help">{ion.name}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold ${s.text}`}>{ppm.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">ppm</span>
                  </div>
                  <div className={`text-xs ${s.text} mt-0.5`}>
                    {s.label} · &lt;{r.greenMax} / {r.greenMax}–{r.yellowMax} / &gt;{r.yellowMax}
                  </div>
                  <span className={`pointer-events-none absolute left-0 w-56 z-10 rounded-lg bg-slate-900 border border-slate-600/60 px-3 py-2 text-xs text-slate-300 opacity-0 group-hover/ion:opacity-100 transition-opacity shadow-xl ${
                    tooltipAbove ? 'bottom-full mb-2' : 'top-full mt-2'
                  }`}>
                    {ion.tasteNote}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          profiles={profiles}
          activeProfileId={activeProfileId}
          onClose={() => setShowSettings(false)}
          onSelectProfile={handleSelectProfile}
          onSaveProfile={handleSaveProfile}
          onDeleteProfile={handleDeleteProfile}
        />
      )}
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
          <span className="text-slate-400">Mineral:</span>
          <span className="font-mono text-sky-300">{bottledValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

export default App;

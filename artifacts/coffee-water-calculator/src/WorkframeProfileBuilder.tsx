import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileCheck2,
  FlaskConical,
  Info,
  RotateCcw,
  Send,
  Target,
  X,
} from 'lucide-react';
import type { IonicTargetValues } from './watermancerProfiles';
import {
  WORKFRAME_DEFAULT_DRAFT,
  workframeConstraints,
  workframeMetrics,
  workframeTargetsFromDraft,
  type WorkframeDraft,
} from './workframe';
import { ION_MAP, type IonId } from './waterData';
import { StableNumberInput } from './components/StableNumberInput';

type StageId = 1 | 2 | 3 | 4 | 5;

type FinalizedProfile = {
  name: string;
  targets: IonicTargetValues;
};

const stageNames = [
  ['Anchor GH : KH', 'Hardness frame'],
  ['Set Mg : Ca', 'Texture + body'],
  ['Cap SO₄ + Cl', 'Flavor edge'],
  ['Cap K + Na', 'Alkali check'],
  ['Complete HCO₃', 'Close the loop'],
] as const;

const profileIonOrder: Array<{ id: IonId; label: string; formula: string; tone: string }> = [
  { id: 'calcium', label: 'Calcium', formula: 'Ca²⁺', tone: 'border-teal-300/20 bg-teal-300/[0.06]' },
  { id: 'magnesium', label: 'Magnesium', formula: 'Mg²⁺', tone: 'border-teal-300/20 bg-teal-300/[0.06]' },
  { id: 'bicarbonate', label: 'Bicarbonate', formula: 'HCO₃⁻', tone: 'border-amber-300/20 bg-amber-300/[0.06]' },
  { id: 'sulfate', label: 'Sulfate', formula: 'SO₄²⁻', tone: 'border-amber-300/20 bg-amber-300/[0.06]' },
  { id: 'chloride', label: 'Chloride', formula: 'Cl⁻', tone: 'border-amber-300/20 bg-amber-300/[0.06]' },
  { id: 'potassium', label: 'Potassium', formula: 'K⁺', tone: 'border-teal-300/20 bg-teal-300/[0.06]' },
  { id: 'sodium', label: 'Sodium', formula: 'Na⁺', tone: 'border-teal-300/20 bg-teal-300/[0.06]' },
];

function NumberField({
  label,
  hint,
  value,
  unit,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-xl border border-slate-700/60 bg-slate-950/30 px-3 py-2.5">
      <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <span>{label}</span>
        <em className="not-italic font-normal normal-case tracking-normal text-slate-600">{hint}</em>
      </span>
      <span className="mt-1 flex items-center gap-2">
        <StableNumberInput
          min="0"
          step="0.1"
          value={value}
          onChange={event => onChange(Math.max(Number(event.target.value) || 0, 0))}
          className="w-full min-w-0 bg-transparent font-mono text-lg font-semibold tabular-nums text-slate-100 outline-none"
          aria-label={`${label} value`}
        />
        <span className="shrink-0 text-[10px] text-slate-500">{unit}</span>
      </span>
    </label>
  );
}

function StageHeader({
  id,
  title,
  kicker,
  note,
  active,
  done,
  onClick,
}: {
  id: StageId;
  title: string;
  kicker: string;
  note: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-cyan-300/[0.04] focus:outline-none focus:ring-2 focus:ring-cyan-300/60 sm:px-4"
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
        done
          ? 'border-teal-300/35 bg-teal-300/10 text-teal-200'
          : active
            ? 'border-cyan-300/35 bg-cyan-300/10 text-cyan-100'
            : 'border-slate-700/70 bg-slate-900/60 text-slate-500'
      }`}>
        {done ? <Check className="h-3.5 w-3.5" /> : `0${id}`}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-cyan-200/60">Stage {id} · {kicker}</span>
        <span className="mt-0.5 block text-sm font-semibold text-slate-100">{title}</span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">{note}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1.5 text-[10px] text-slate-500 sm:flex">
        <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-cyan-300' : done ? 'bg-teal-300' : 'bg-slate-700'}`} />
        {active ? 'Editing' : done ? 'Set' : 'Queued'}
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${active ? 'rotate-90 text-cyan-200' : ''}`} />
      </span>
    </button>
  );
}

function RemainingBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const remaining = Math.max(max - value, 0);
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-950/25 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 text-[10px]">
        <span className="font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <span className={`font-mono tabular-nums ${remaining > 0 ? 'text-cyan-200' : 'text-amber-200'}`}>{remaining.toFixed(0)} ppm room</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full transition-all ${percentage >= 100 ? 'bg-amber-300' : 'bg-cyan-300'}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function WorkframeProfileBuilder({
  onSendToWatermancer,
}: {
  onSendToWatermancer: (name: string, targets: IonicTargetValues) => void;
}) {
  const [activeStage, setActiveStage] = useState<StageId>(4);
  const [draft, setDraft] = useState<WorkframeDraft>(WORKFRAME_DEFAULT_DRAFT);
  const [profileName, setProfileName] = useState('House espresso / 01');
  const [nameDraft, setNameDraft] = useState('House espresso / 01');
  const [finalized, setFinalized] = useState<FinalizedProfile | null>(null);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [nameError, setNameError] = useState('');
  const [copied, setCopied] = useState(false);

  const metrics = useMemo(() => workframeMetrics(draft), [draft]);
  const constraints = useMemo(() => workframeConstraints(draft), [draft]);
  const targets = useMemo(() => workframeTargetsFromDraft(draft), [draft]);
  const clearCount = Object.values(constraints).filter(Boolean).length;
  const hasStaleFinalizedDraft = finalized !== null
    && JSON.stringify(finalized.targets) !== JSON.stringify(targets);

  const updateDraft = (field: keyof WorkframeDraft, value: number) => {
    setDraft(previous => ({ ...previous, [field]: value }));
    setFinalized(null);
  };

  const reset = () => {
    setDraft(WORKFRAME_DEFAULT_DRAFT);
    setProfileName('House espresso / 01');
    setNameDraft('House espresso / 01');
    setFinalized(null);
    setFinalizeOpen(false);
    setNameError('');
    setCopied(false);
  };

  const copySummary = () => {
    const text = profileIonOrder
      .map(({ id, label }) => `${label}: ${Number(targets[id] ?? 0).toFixed(1)} ppm`)
      .join('\n');
    navigator.clipboard?.writeText(`${profileName}\n${text}`).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const finalizeProfile = () => {
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      setNameError('Enter a saved profile name before finalizing.');
      return;
    }
    setProfileName(trimmedName);
    setFinalized({ name: trimmedName, targets });
    setFinalizeOpen(false);
    setNameError('');
  };

  const sendProfile = () => {
    if (!finalized || hasStaleFinalizedDraft) return;
    onSendToWatermancer(finalized.name, finalized.targets);
  };

  const resetGhKh = () => {
    updateDraft('gh', WORKFRAME_DEFAULT_DRAFT.gh);
    updateDraft('kh', WORKFRAME_DEFAULT_DRAFT.kh);
  };
  const resetMgCa = () => {
    updateDraft('magnesium', WORKFRAME_DEFAULT_DRAFT.magnesium);
    updateDraft('calcium', WORKFRAME_DEFAULT_DRAFT.calcium);
  };
  const resetAlkali = () => {
    updateDraft('potassium', WORKFRAME_DEFAULT_DRAFT.potassium);
    updateDraft('sodium', WORKFRAME_DEFAULT_DRAFT.sodium);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-slate-950 via-cyan-950/35 to-indigo-950/45 p-4 shadow-xl shadow-cyan-950/20 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/75">
              <FlaskConical className="h-4 w-4 text-cyan-300" />
              Workframe / Profile builder
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Build a water profile from the inside out.</h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
              Anchor the relationships first, spend the mineral room deliberately, then send one named ion profile into Watermancer for salt and water translation.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-2 text-[10px] font-semibold text-cyan-100">
            <Activity className="h-3.5 w-3.5" />
            {clearCount}/5 constraints clear
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <main className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] px-3 py-2.5 text-[10px] leading-relaxed text-cyan-100/75">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
            <span><strong className="text-cyan-100">The order is the guardrail.</strong> Later stages refine the profile without silently rewriting earlier relationship anchors.</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900/60 shadow-lg">
            <section className={`border-b border-slate-700/50 ${activeStage === 1 ? 'bg-cyan-300/[0.025]' : ''}`}>
              <StageHeader id={1} title="Anchor the overall GH : KH ratio" kicker="hardness frame" note="Set the mineral backbone before choosing individual ions." active={activeStage === 1} done={Boolean(finalized) && !hasStaleFinalizedDraft} onClick={() => setActiveStage(1)} />
              {activeStage === 1 && (
                <div className="space-y-3 px-3 pb-4 sm:px-16">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField label="General hardness" hint="anchor" value={draft.gh} unit="°dGH" onChange={value => updateDraft('gh', value)} />
                    <NumberField label="Carbonate hardness" hint="anchor" value={draft.kh} unit="°dKH" onChange={value => updateDraft('kh', value)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 text-[10px]">
                    <span className="text-slate-400">Live relationship</span>
                    <strong className="font-mono text-cyan-100">{metrics.ghKh === null ? '—' : `${metrics.ghKh.toFixed(2)} : 1`} <span className="font-sans text-[9px] font-normal text-slate-500">target 2.8–3.6 : 1</span></strong>
                  </div>
                  <button type="button" onClick={resetGhKh} className="text-[10px] font-semibold text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-white">Use balanced anchor</button>
                </div>
              )}
            </section>

            <section className={`border-b border-slate-700/50 ${activeStage === 2 ? 'bg-cyan-300/[0.025]' : ''}`}>
              <StageHeader id={2} title="Anchor Mg : Ca for body" kicker="texture balance" note="Magnesium brings lift; calcium gives the finish somewhere to land." active={activeStage === 2} done={Boolean(finalized) && !hasStaleFinalizedDraft} onClick={() => setActiveStage(2)} />
              {activeStage === 2 && (
                <div className="space-y-3 px-3 pb-4 sm:px-16">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField label="Magnesium" hint="soft lift" value={draft.magnesium} unit="ppm" onChange={value => updateDraft('magnesium', value)} />
                    <NumberField label="Calcium" hint="structure" value={draft.calcium} unit="ppm" onChange={value => updateDraft('calcium', value)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 text-[10px]">
                    <span className="text-slate-400">Live relationship</span>
                    <strong className="font-mono text-cyan-100">{metrics.mgCa === null ? '—' : `${metrics.mgCa.toFixed(2)} : 1`} <span className="font-sans text-[9px] font-normal text-slate-500">target 0.35–0.70 : 1</span></strong>
                  </div>
                  <button type="button" onClick={resetMgCa} className="text-[10px] font-semibold text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-white">Use 1 : 2 body</button>
                </div>
              )}
            </section>

            <section className={`border-b border-slate-700/50 ${activeStage === 3 ? 'bg-cyan-300/[0.025]' : ''}`}>
              <StageHeader id={3} title="Cap total sulfate and chloride" kicker="flavor edge" note="Spend the anion budget without letting either note dominate." active={activeStage === 3} done={Boolean(finalized) && !hasStaleFinalizedDraft} onClick={() => setActiveStage(3)} />
              {activeStage === 3 && (
                <div className="space-y-3 px-3 pb-4 sm:px-16">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField label="Sulfate" hint="crisp edge" value={draft.sulfate} unit="ppm" onChange={value => updateDraft('sulfate', value)} />
                    <NumberField label="Chloride" hint="round finish" value={draft.chloride} unit="ppm" onChange={value => updateDraft('chloride', value)} />
                  </div>
                  <RemainingBar label="Anion budget used" value={metrics.anions} max={120} />
                </div>
              )}
            </section>

            <section className={`border-b border-slate-700/50 ${activeStage === 4 ? 'bg-cyan-300/[0.025]' : ''}`}>
              <StageHeader id={4} title="Cap potassium and sodium" kicker="alkali check" note="Keep K:Na close to 1:10 while staying inside the total ceiling." active={activeStage === 4} done={Boolean(finalized) && !hasStaleFinalizedDraft} onClick={() => setActiveStage(4)} />
              {activeStage === 4 && (
                <div className="space-y-3 px-3 pb-4 sm:px-16">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField label="Potassium" hint="accent" value={draft.potassium} unit="ppm" onChange={value => updateDraft('potassium', value)} />
                    <NumberField label="Sodium" hint="roundness" value={draft.sodium} unit="ppm" onChange={value => updateDraft('sodium', value)} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2 text-[10px]">
                    <span className="text-slate-400">K : Na relationship</span>
                    <strong className="font-mono text-cyan-100">{metrics.kNa === null ? '—' : `1 : ${metrics.kNa.toFixed(1)}`} <span className="font-sans text-[9px] font-normal text-slate-500">target 1 : 10</span></strong>
                  </div>
                  <RemainingBar label="Alkali budget used" value={metrics.alkali} max={90} />
                  <button type="button" onClick={resetAlkali} className="text-[10px] font-semibold text-cyan-200 underline decoration-cyan-200/30 underline-offset-4 hover:text-white">Return to 1 : 10</button>
                </div>
              )}
            </section>

            <section className={`${activeStage === 5 ? 'bg-cyan-300/[0.025]' : ''}`}>
              <StageHeader id={5} title="Bring bicarbonates up to finish" kicker="close the loop" note="Only now complete the GH : KH relationship with the buffer." active={activeStage === 5} done={Boolean(finalized) && !hasStaleFinalizedDraft} onClick={() => setActiveStage(5)} />
              {activeStage === 5 && (
                <div className="space-y-3 px-3 pb-4 sm:px-16">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <NumberField label="Bicarbonate" hint="buffer" value={draft.bicarbonate} unit="ppm" onChange={value => updateDraft('bicarbonate', value)} />
                    <div className="rounded-xl border border-slate-700/60 bg-slate-950/30 px-3 py-2.5">
                      <span className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500"><span>Expected KH</span><span className="font-normal normal-case tracking-normal text-slate-600">from HCO₃</span></span>
                      <span className="mt-1 block font-mono text-lg font-semibold tabular-nums text-cyan-100">{(draft.bicarbonate / 61 / 2.8).toFixed(1)} <span className="font-sans text-[10px] font-normal text-slate-500">°dKH</span></span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-amber-300/15 bg-amber-300/[0.04] px-3 py-2 text-[10px]">
                    <span className="text-slate-400">Buffer finish line</span>
                    <strong className="font-mono text-amber-100">{draft.bicarbonate.toFixed(1)} ppm <span className="font-sans text-[9px] font-normal text-slate-500">target 92–112 ppm</span></strong>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>

        <aside className="space-y-3">
          <section className="rounded-2xl border border-indigo-300/20 bg-slate-950/65 p-3.5 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100">Constraint monitor</h2>
              <span className="font-mono text-xs text-cyan-200">{clearCount}/5</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[9px] uppercase tracking-wider text-teal-200/75"><span className="h-1.5 w-1.5 rounded-full bg-teal-300" /> live profile check</div>
            <div className="mt-3 space-y-2">
              {([
                ['GH : KH', metrics.ghKh === null ? '—' : `${metrics.ghKh.toFixed(1)} : 1`, constraints.ghKh],
                ['Mg : Ca', metrics.mgCa === null ? '—' : `${metrics.mgCa.toFixed(2)} : 1`, constraints.mgCa],
                ['SO₄ + Cl', `${metrics.anions.toFixed(0)} / 120`, constraints.anions],
                ['K + Na', `${metrics.alkali.toFixed(0)} / 90`, constraints.alkali],
                ['Bicarbonate', `${draft.bicarbonate.toFixed(0)} ppm`, constraints.bicarbonate],
              ] as const).map(([label, value, clear]) => (
                <div key={label} className="flex items-center gap-2 border-b border-slate-800/80 pb-2 last:border-0 last:pb-0">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${clear ? 'bg-teal-300' : 'bg-amber-300'}`} />
                  <span className="min-w-0 flex-1 text-[10px] text-slate-400">{label}</span>
                  <span className={`font-mono text-[10px] tabular-nums ${clear ? 'text-teal-200' : 'text-amber-200'}`}>{value}</span>
                  <span className={`text-[9px] ${clear ? 'text-teal-300' : 'text-amber-300'}`}>{clear ? 'Clear' : 'Tune'}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-300/20 bg-slate-950/65 p-3.5 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-100">Final ion profile</h2>
              <span className={`text-[9px] font-semibold uppercase tracking-wider ${finalized && !hasStaleFinalizedDraft ? 'text-teal-200' : 'text-slate-500'}`}>{finalized && !hasStaleFinalizedDraft ? 'Locked' : 'Preview'}</span>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">Freeze these explicit ion targets into a named profile before Watermancer translates them.</p>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {profileIonOrder.map(({ id, label, formula, tone }) => (
                <div key={id} className={`rounded-lg border px-2 py-2 ${tone}`}>
                  <div className="truncate text-[9px] text-slate-400">{label} <span className="text-slate-600">{formula}</span></div>
                  <div className="mt-1 font-mono text-xs tabular-nums text-slate-100">{Number(targets[id] ?? 0).toFixed(1)} <span className="font-sans text-[9px] text-slate-500">ppm</span></div>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => { setNameDraft(profileName); setFinalizeOpen(true); setNameError(''); }} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/20">
              <FileCheck2 className="h-3.5 w-3.5" />
              {finalized && !hasStaleFinalizedDraft ? 'Review final profile' : 'Make final ion profile'}
            </button>
            {finalized && !hasStaleFinalizedDraft && <div className="mt-2 text-center text-[9px] text-teal-200/80">Locked as “{finalized.name}”</div>}
            {hasStaleFinalizedDraft && <div className="mt-2 text-center text-[9px] text-amber-200">Draft changed — review and finalize again.</div>}
          </section>

          <section className="rounded-2xl border border-violet-300/20 bg-violet-300/[0.05] p-3.5">
            <div className="flex items-start gap-2">
              <Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-200" />
              <div>
                <h2 className="text-xs font-semibold text-violet-100">Send to Watermancer</h2>
                <p className="mt-1 text-[10px] leading-relaxed text-violet-100/65">The saved name and ion targets will become Watermancer’s active target source.</p>
                <button type="button" disabled={!finalized || hasStaleFinalizedDraft} onClick={sendProfile} className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-violet-200/35 bg-violet-200/10 px-3 py-2 text-[10px] font-semibold text-violet-100 transition hover:bg-violet-200/20 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/30 disabled:text-slate-600">
                  {finalized && !hasStaleFinalizedDraft ? 'Send named profile' : 'Finalize profile first'}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={copySummary} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/50 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100">
              {copied ? <Check className="h-3 w-3 text-teal-300" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy summary'}
            </button>
            <button type="button" onClick={reset} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700/70 bg-slate-900/50 px-3 py-2 text-[10px] font-semibold text-slate-400 transition hover:border-amber-300/40 hover:text-amber-100">
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
          <div className="flex items-start gap-2 text-[9px] leading-relaxed text-slate-600"><Info className="mt-0.5 h-3 w-3 shrink-0" />GH/KH and relationship checks remain Workframe diagnostics. Watermancer receives the explicit final ion values shown above.</div>
        </aside>
      </div>

      {finalizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="workframe-finalize-title">
          <div className="w-full max-w-md rounded-2xl border border-cyan-300/25 bg-slate-900 p-5 shadow-2xl shadow-cyan-950/30 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/70">Profile checkpoint</div>
                <h2 id="workframe-finalize-title" className="mt-1 text-lg font-semibold text-white">Name the final ion profile</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">Save this relationship-first snapshot as a named target for Watermancer.</p>
              </div>
              <button type="button" onClick={() => setFinalizeOpen(false)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white" aria-label="Close final profile dialog"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-5 block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Saved profile name</span>
              <input autoFocus value={nameDraft} onChange={event => { setNameDraft(event.target.value); setNameError(''); }} onKeyDown={event => { if (event.key === 'Enter') finalizeProfile(); }} placeholder="e.g. Washed light roast" className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/15" />
            </label>
            {nameError && <p className="mt-2 text-[10px] text-rose-300">{nameError}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-700/60 bg-slate-950/35 p-3 text-[10px]">
              <div><span className="block text-slate-500">GH : KH</span><strong className="mt-1 block font-mono text-cyan-100">{metrics.ghKh === null ? '—' : `${metrics.ghKh.toFixed(2)} : 1`}</strong></div>
              <div><span className="block text-slate-500">Mg : Ca</span><strong className="mt-1 block font-mono text-cyan-100">{metrics.mgCa === null ? '—' : `${metrics.mgCa.toFixed(2)} : 1`}</strong></div>
              <div><span className="block text-slate-500">K : Na</span><strong className="mt-1 block font-mono text-cyan-100">{metrics.kNa === null ? '—' : `1 : ${metrics.kNa.toFixed(1)}`}</strong></div>
              <div><span className="block text-slate-500">Guardrails</span><strong className="mt-1 block font-mono text-teal-200">{clearCount}/5 clear</strong></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setFinalizeOpen(false)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white">Keep editing</button>
              <button type="button" onClick={finalizeProfile} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200/40 bg-cyan-200/15 px-3 py-2 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-200/25"><CheckCircle2 className="h-3.5 w-3.5" /> Save & stage</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkframeProfileBuilder;
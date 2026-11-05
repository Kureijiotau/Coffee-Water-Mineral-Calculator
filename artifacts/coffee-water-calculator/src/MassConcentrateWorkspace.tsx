import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, Droplet, FlaskConical, ListChecks, Pipette } from 'lucide-react';
import { SALTS, getSaltColorTokens, getSaltSolubilityLimitGPer100Ml, splitIntoStockGroups, type SaltRecipeEntry } from './waterData';
import { buildMassStockPlan, computeRecipeMassDropEquivalents, recipeStockSaltMasses, stockCompositionKey,
  waterLitersToEquivalentMassKg,
  resolveStockDropCalibration, computeRecipeMassStrengthForPhysicalSaltPpm, scaleMassStockForSaltEdit, physicalSaltCaCo3EquivalentFactor, type StockDropCalibration } from './concentrateMass';
import { checkMassConcentrate, recommendMassConcentrateStrength } from './concentrateMassWarnings';
import { ConcentratePreparationSteps, buildConcentratePreparationSteps, WATER_MASS_NOTE } from './concentratePreparation';
import { readConcentrateStockRecord, readStandaloneMassSnapshot, isRecord, type MassConcentratePlanSnapshot } from './concentrateStockStorage';
import { ACCOUNT_SYNC_REMOTE_CHANGE_EVENT, loadDiyConcentrateInputs, loadDiyConcentrateStockState, archiveDiyConcentrateInputsForRecovery, saveDiyConcentrateInputs } from './accountSyncStorage';
import { lotusMassStockPlan, LOTUS_DROPPER_DEFINITIONS, getDiyDropperRateForStyle, hasAnyDiyDropperCalibration, lotusMeasuredDropsPerMl, type LotusDropperCalibration, type LotusDropperStyle, type LotusStyleCalibrationInputs } from './lotusConcentrate';
import type { WaterPlanConcentrateSnapshot } from './waterPlans';
import { getLitersAfterVolumeUnitToggle } from './volumeUnits';

type Props = {
  workspaceMode: 'recipe' | 'diy';
  recipeHandoff: { name: string; salts: Record<string, SaltRecipeEntry>; finalLiters: number } | null;
  initialSnapshot: WaterPlanConcentrateSnapshot;
  restoreSnapshot: WaterPlanConcentrateSnapshot | null;
  onRestoreSnapshotConsumed: () => void;
  onSnapshotChange: (snapshot: WaterPlanConcentrateSnapshot) => void;
  onSaveSnapshot: () => void;
  onClearRecipeHandoff: () => void;
  dropsPerMl: number;
  diySaltTargets: Record<string, number>;
  diySaltForms: Record<string, number>;
  diyFinalLiters: number;
  volumeUnit: 'liters' | 'gallons';
  onToggleVolumeUnit: () => void;
};
type Group = MassConcentratePlanSnapshot['groups'][number];
const n = (value: number, digits = 3) => Number(value.toFixed(digits)).toString();
const inputClass = 'mt-1 w-full rounded-lg border border-slate-600/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-fuchsia-300';
const buttonClass = 'rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-2 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-500/20 disabled:opacity-40';
const emptyGroup = (id: string): Group => ({ id, totalStockMassG: 100, strength: 20, saltIds: [], calibration: null });
function SummaryMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'sky' | 'emerald' | 'slate' }) {
  const toneClasses = tone === 'emerald'
    ? 'border-emerald-300/20 bg-emerald-400/[0.07] text-emerald-200'
    : tone === 'sky' ? 'border-sky-200/20 bg-sky-400/[0.07] text-sky-100' : 'border-slate-700/60 bg-slate-950/25 text-slate-200';
  return <div className={`rounded-xl border px-3 py-3 ${toneClasses}`}>
    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
    <div className="mt-1 text-sm font-semibold tabular-nums">{value}</div>
    <div className="mt-1 text-[9px] text-slate-500">{detail}</div>
  </div>;
}
function HelpTip({ testId, label, text, align = 'center' }: { testId: string; label: string; text: string; align?: 'center' | 'right' }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const visible = open || hovered || focused;
  const tooltipId = `${testId}-tooltip`;
  const position = align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  return (
    <span data-testid={testId} className="pointer-events-auto relative z-20 inline-flex" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button type="button" aria-label={label} aria-expanded={open} aria-describedby={tooltipId}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onClick={() => setOpen(value => !value)}
        onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); setFocused(false); } }}
        className="grid h-5 w-5 cursor-help place-items-center rounded-full border border-slate-400/50 bg-slate-950/80 text-[11px] font-bold leading-none text-slate-200 outline-none hover:border-fuchsia-300/70 hover:text-white focus-visible:ring-2 focus-visible:ring-fuchsia-300">
        <span aria-hidden="true">?</span>
      </button>
      <div id={tooltipId} role="tooltip" aria-label={label}
        className={`${visible ? 'block' : 'hidden'} pointer-events-auto absolute ${position} top-full z-[60] w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-fuchsia-200/25 bg-slate-950 p-3 text-left text-xs font-normal leading-relaxed text-slate-100 shadow-xl`}>
        {text}
      </div>
    </span>
  );
}

function SharedDropperCalibrationPanel({ tipKey, dropperRates, sharedCalibrations, onTipChange, onCalibrationChange }: {
  tipKey: LotusDropperStyle;
  dropperRates: Record<LotusDropperStyle, number>;
  sharedCalibrations: LotusStyleCalibrationInputs;
  onTipChange: (style: LotusDropperStyle) => void;
  onCalibrationChange: (style: LotusDropperStyle, field: 'dropsInput' | 'weightInput', value: string) => void;
}) {
  const hasSavedCalibration = hasAnyDiyDropperCalibration(sharedCalibrations);
  const selectedCalibration = sharedCalibrations[tipKey];
  const hasSelectedCalibration = lotusMeasuredDropsPerMl(selectedCalibration) !== null;
  const drops = Number(selectedCalibration?.dropsInput ?? 0);
  const weightG = Number(selectedCalibration?.weightInput ?? 0);
  const waterMassPerDrop = hasSelectedCalibration ? weightG / drops : 1 / dropperRates[tipKey];

  return <details
    className="rounded-2xl border border-sky-300/30 bg-gradient-to-br from-sky-400/[0.08] via-slate-800/80 to-blue-500/[0.06] p-4 shadow-xl sm:p-5"
    data-testid="mass-shared-calibration"
    defaultOpen={!hasSavedCalibration}
  >
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-sky-100 marker:hidden">
      <span className="flex items-center gap-2">
        <Pipette className="h-4 w-4 text-sky-200" aria-hidden="true" />
        Dropper calibration
      </span>
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${hasSavedCalibration
        ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
        : 'border-slate-500/40 bg-slate-950/30 text-slate-400'}`}>
        {hasSavedCalibration && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
        {hasSavedCalibration ? 'Calibrated' : 'Not calibrated'}
      </span>
    </summary>
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-white">{hasSavedCalibration ? 'Saved tip calibration' : 'Measure a tip before dosing'}</h3>
        <HelpTip
          testId="mass-calibration-help-diy"
          label="Dropper calibration explanation"
          text="This shared value measures plain-water drops for the selected tip. Hold the dropper vertically. Finished concentrate can drop differently, so calibrate the prepared stock separately when you need a more accurate dose."
        />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-sky-200/15 bg-slate-950/30 p-1" role="group" aria-label="Stock Builder dropper tip style">
        {(['straight', 'round'] as const).map(style => <button key={style} type="button" onClick={() => onTipChange(style)}
          aria-pressed={tipKey === style} aria-label={`${style === 'straight' ? 'Straight' : 'Round'} tip, ${dropperRates[style].toFixed(1)} drops per mL`}
          className={`rounded-md px-2 py-2 text-left text-[10px] font-semibold capitalize transition ${tipKey === style ? 'bg-sky-400/15 text-sky-100 shadow-sm' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>
          {style} Tip · {dropperRates[style].toFixed(1)} Drops/ML
        </button>)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="shared-dropper-calibration">
        <label className="rounded-xl border border-sky-200/20 bg-slate-950/25 px-3 py-2.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Measured number of drops</span>
          <input aria-label="Measured number of drops" className="mt-1 w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none"
            inputMode="decimal" placeholder="e.g. 100" value={selectedCalibration?.dropsInput ?? ''}
            onChange={e => onCalibrationChange(tipKey, 'dropsInput', e.target.value)} />
        </label>
        <label className="rounded-xl border border-sky-200/20 bg-slate-950/25 px-3 py-2.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Measured weight</span>
          <span className="mt-1 flex items-center gap-2">
            <input aria-label="Shared water calibration weight in grams" className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none"
              inputMode="decimal" placeholder="e.g. 5" value={selectedCalibration?.weightInput ?? ''}
              onChange={e => onCalibrationChange(tipKey, 'weightInput', e.target.value)} />
            <span className="text-sm text-slate-400">g</span>
          </span>
        </label>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <SummaryMetric label="Water mass per drop" value={`${waterMassPerDrop.toFixed(4)} g`}
          detail={hasSelectedCalibration ? 'shared' : 'estimated'} tone="sky" />
        <SummaryMetric label="Drops per mL" value={dropperRates[tipKey].toFixed(1)}
          detail={hasSelectedCalibration ? 'shared' : 'estimated'} tone="sky" />
        <SummaryMetric label="Selected tip status" value={hasSelectedCalibration ? 'Shared value' : 'Assumption'}
          detail={hasSelectedCalibration ? 'Guide + Lotus Drops' : 'measure for accuracy'} tone={hasSelectedCalibration ? 'emerald' : 'slate'} />
      </div>
    </div>
  </details>;
}

function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function readInitial(props: Props) {
  const candidate = props.restoreSnapshot ?? props.initialSnapshot;
  const standalone = props.restoreSnapshot ? readStandaloneMassSnapshot(props.restoreSnapshot) : null;
  if (standalone) return { kind: 'mass' as const, plan: standalone };
  if (props.workspaceMode === 'diy' && !props.restoreSnapshot) {
    const stored = loadDiyConcentrateStockState();
    if (stored) return stored;
  }
  const raw = candidate.recipeConcentratePlan;
  if (raw == null) return { kind: 'empty' as const };
  return readConcentrateStockRecord(raw);
}
export function MassConcentrateWorkspace(props: Props) {
  const [initial] = useState(() => readInitial(props));
  const initialPlan = initial.kind === 'mass' && (!initial.plan.workspaceMode || initial.plan.workspaceMode === props.workspaceMode) ? initial.plan : null;
  const [toolMode, setToolMode] = useState<'recipe' | 'percent' | 'lotus'>(initialPlan?.toolMode ?? 'recipe');
  const [strategy, setStrategy] = useState<MassConcentratePlanSnapshot['strategy']>(initialPlan?.strategy ?? 'individual');
  const [groups, setGroups] = useState<Record<string, Group>>(() => Object.fromEntries(initialPlan?.groups.map(g => [g.id, g]) ?? []));
  const [saltId, setSaltId] = useState(initialPlan?.selectedSaltId ?? 'mgso4');
  const [forms, setForms] = useState<Record<string, number>>(() => ({
    ...props.diySaltForms, ...Object.fromEntries(Object.entries(initialPlan?.recipe ?? {}).map(([id, row]) => [id, row.formIdx])),
  }));
  const [targetInput, setTargetInput] = useState(String(initialPlan?.recipe?.[initialPlan?.selectedSaltId ?? 'mgso4']?.target ?? (props.diySaltTargets.mgso4 > 0 ? props.diySaltTargets.mgso4 : 30)));
  const [percentInput, setPercentInput] = useState(String(initialPlan?.percentWw ?? 5));
  const [finalLitersInput, setFinalLitersInput] = useState(String(initialPlan?.finalLiters ?? props.recipeHandoff?.finalLiters ?? props.diyFinalLiters));
  const [tipKey, setTipKey] = useState<'straight' | 'round'>(initialPlan?.dropperStyle ?? props.initialSnapshot.dropperStyle);
  const [legacy, setLegacy] = useState<Record<string, unknown> | null>(() => {
    if (initial.kind === 'legacy-volume') return initial.original;
    const old = loadDiyConcentrateInputs();
    return props.workspaceMode === 'diy' && !old.massStockPlan && old.stockVolumeInput
      ? { stockVolumeInput: old.stockVolumeInput, note: 'Historical DIY/Lotus water/volume input; not total finished stock grams.' } : null;
  });
  const [legacyOriginal, setLegacyOriginal] = useState(initialPlan?.legacyVolumePlan);
  const [rebuildMass, setRebuildMass] = useState('100');
  const [restoreError, setRestoreError] = useState(() => initial.kind === 'invalid' ? initial.reason : '');
  const [exportError, setExportError] = useState('');
  const [showSteps, setShowSteps] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef(props.initialSnapshot);
  const salt = SALTS.find(s => s.id === saltId) ?? SALTS[0];
  const selectedForm = forms[salt.id] ?? salt.defaultFormIdx ?? 0;
  const finalLiters = Number(finalLitersInput);
  const finalWaterMassKg = waterLitersToEquivalentMassKg(finalLiters);
  const toggleMassVolumeUnit = () => {
    setFinalLitersInput(current => String(getLitersAfterVolumeUnitToggle(Number(current), props.volumeUnit)));
    props.onToggleVolumeUnit();
  };
  const isRecipe = props.workspaceMode === 'recipe';
  const recipeTargets = isRecipe
    ? Object.fromEntries(Object.entries(props.recipeHandoff?.salts ?? {}).filter(([, entry]) => Number(entry.target) > 0).map(([id, entry]) => [id, Number(entry.target)]))
    : { [salt.id]: Number(targetInput) };
  const recipeForms = isRecipe ? Object.fromEntries(Object.entries(props.recipeHandoff?.salts ?? {}).map(([id, entry]) => [id, entry.formIdx])) : { [salt.id]: selectedForm };
  const activeSaltIds = Object.keys(recipeTargets).filter(id => recipeTargets[id] > 0);
  const activeGroups: Array<{ id: string; name: string; saltIds: string[] }> = !isRecipe && toolMode === 'lotus'
    ? LOTUS_DROPPER_DEFINITIONS.map(d => ({ id: `lotus-${d.id}`, name: `${d.label} homemade stock`, saltIds: [d.saltId] }))
    : !isRecipe
      ? [{ id: `diy-${salt.id}`, name: toolMode === 'percent' ? 'Single-salt % w/w stock' : 'DIY single-salt concentrate', saltIds: [salt.id] }]
      : strategy === 'all-in-one'
        ? [{ id: 'all-in-one', name: 'All-in-one concentrate', saltIds: activeSaltIds }]
        : strategy === 'gh-kh' ? splitIntoStockGroups(recipeTargets).map(g => ({ ...g, name: g.name.replace('Stock', 'concentrate') }))
          : activeSaltIds.map(id => ({ id, name: `${SALTS.find(s => s.id === id)?.name ?? id} concentrate`, saltIds: [id] }));
  const [sharedCalibrations, setSharedCalibrations] = useState<Record<string, LotusDropperCalibration>>(
    () => loadDiyConcentrateInputs().lotusCalibrationInputs ?? {},
  );
  const shared = sharedCalibrations;
  const updateSharedCalibration = (style: LotusDropperStyle, field: 'dropsInput' | 'weightInput', value: string) => {
    const current = shared[style] ?? { dropsInput: '', weightInput: '', style };
    const next = { ...current, [field]: value, style };
    const calibrations = { ...shared, [style]: next };
    setSharedCalibrations(calibrations);
    saveDiyConcentrateInputs({ ...loadDiyConcentrateInputs(), lotusCalibrationInputs: calibrations });
  };
  const waterRate = getDiyDropperRateForStyle(tipKey, props.dropsPerMl, shared);
  const dropperRates = {
    straight: getDiyDropperRateForStyle('straight', props.dropsPerMl, shared),
    round: getDiyDropperRateForStyle('round', props.dropsPerMl, shared),
  };
  const waterEstimate: StockDropCalibration = { basis: 'water-estimate', drops: waterRate, massG: 1, compositionKey: '', tipKey };
  const groupFor = (id: string) => groups[id] ?? emptyGroup(id);
  const update = (id: string, patch: Partial<Group>) => setGroups(previous => ({ ...previous, [id]: { ...(previous[id] ?? emptyGroup(id)), ...patch } }));
  const actualRecipe = isRecipe ? recipeTargets : { [salt.id]: Number(targetInput) };
  const data: MassConcentratePlanSnapshot = { version: 2, basis: 'mass', workspaceMode: props.workspaceMode, toolMode: isRecipe ? 'recipe' : toolMode,
    selectedSaltId: salt.id, dropperStyle: tipKey, percentWw: Number(percentInput), strategy, finalLiters,
    recipe: Object.fromEntries(Object.entries(actualRecipe).filter(([, value]) => value > 0).map(([id, target]) => [id, { target, formIdx: recipeForms[id] ?? 0 }])),
    groups: activeGroups.filter(g => g.saltIds.length).map(g => ({ ...groupFor(g.id), saltIds: g.saltIds })),
    ...(legacyOriginal ? { legacyVolumePlan: legacyOriginal } : {}) };
  const dataKey = JSON.stringify(data);

  const applyPlan = (plan: MassConcentratePlanSnapshot) => {
    setGroups(Object.fromEntries(plan.groups.map(g => [g.id, g]))); setStrategy(plan.strategy);
    setToolMode(plan.toolMode ?? 'recipe'); setFinalLitersInput(String(plan.finalLiters));
    setSaltId(plan.selectedSaltId ?? 'mgso4'); setPercentInput(String(plan.percentWw ?? 5));
    setTipKey(plan.dropperStyle ?? snapshotRef.current.dropperStyle);
    setForms(Object.fromEntries(Object.entries(plan.recipe ?? {}).map(([id, row]) => [id, row.formIdx])));
    setTargetInput(String(plan.recipe?.[plan.selectedSaltId ?? 'mgso4']?.target ?? 30));
    setLegacyOriginal(plan.legacyVolumePlan); setLegacy(null); setRestoreError('');
  };
  useEffect(() => {
    if (!props.restoreSnapshot) return;
    snapshotRef.current = props.restoreSnapshot;
    const standalone = readStandaloneMassSnapshot(props.restoreSnapshot);
    const read = standalone ? { kind: 'mass' as const, plan: standalone } : readConcentrateStockRecord(props.restoreSnapshot.recipeConcentratePlan);
    if (read.kind === 'mass') applyPlan(read.plan);
    else if (read.kind === 'legacy-volume') setLegacy(read.original);
    else setRestoreError(read.reason);
    props.onRestoreSnapshotConsumed();
  }, [props.restoreSnapshot, props.onRestoreSnapshotConsumed]);
  useEffect(() => {
    if (legacy || restoreError || !data.groups.length || readConcentrateStockRecord(data).kind !== 'mass') return;
    const snapshot: WaterPlanConcentrateSnapshot = { ...snapshotRef.current, basis: 'mass', stockFormatVersion: 2,
      saltId: salt.id, formIdx: selectedForm, strengthInput: percentInput, totalStockMassInput: String(data.groups[0].totalStockMassG),
      recipeConcentratePlan: data, dropperStyle: tipKey };
    props.onSnapshotChange(snapshot);
    if (!isRecipe) saveDiyConcentrateInputs({ ...loadDiyConcentrateInputs(), massStockPlan: data });
  }, [dataKey, tipKey, legacy, restoreError, props.onSnapshotChange]);
  useEffect(() => {
    const sync = () => {
      if (isRecipe) return;
      const plan = loadDiyConcentrateStockState();
      setSharedCalibrations(loadDiyConcentrateInputs().lotusCalibrationInputs ?? {});
      if (plan?.kind === 'mass') applyPlan(plan.plan);
      else if (plan?.kind === 'invalid') setRestoreError(plan.reason);
    };
    window.addEventListener(ACCOUNT_SYNC_REMOTE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ACCOUNT_SYNC_REMOTE_CHANGE_EVENT, sync);
  }, [isRecipe]);

  if (isRecipe && !props.recipeHandoff) return <section className="rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/10 via-slate-800/70 to-violet-500/10 p-5 shadow-xl sm:p-6">
    <h2 className="text-base font-semibold text-fuchsia-100">No recipe concentrate loaded</h2>
    <p className="mt-2 text-sm text-slate-400">Send a recipe from Calculator to prepare its stocks by weight.</p>
  </section>;
  return <div className="concentrate-workspace space-y-4">
    <div className="app-panel app-panel--quiet app-card rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" aria-hidden="true" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isRecipe ? 'Recipe concentrate workspace' : 'DIY concentrate workspace'}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {isRecipe
                ? 'Build and calibrate the concentrate for the imported calculator recipe.'
                : toolMode === 'lotus'
                  ? 'Craft four independent mineral stocks for your own brewing setup.'
                  : 'Build a single-mineral concentrate by weight.'}
            </div>
          </div>
        </div>
        {!isRecipe && <div role="tablist" aria-label="DIY concentrate workspace" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
          <button type="button" role="tab" aria-selected={toolMode !== 'lotus'} onClick={() => setToolMode(toolMode === 'lotus' ? 'recipe' : toolMode)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${toolMode !== 'lotus' ? 'border border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200 shadow-sm' : 'border border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
            Stock builder
          </button>
          <button type="button" role="tab" aria-selected={toolMode === 'lotus'} onClick={() => setToolMode('lotus')}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${toolMode === 'lotus' ? 'border border-rose-400/40 bg-rose-500/15 text-rose-200 shadow-sm' : 'border border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
            DIY Lotus Drops
          </button>
        </div>}
        <div className="flex items-center gap-2">
          <button className={buttonClass} onClick={props.onSaveSnapshot} disabled={!!legacy || !!restoreError}>Save</button>
          {isRecipe && <button className={buttonClass} onClick={props.onClearRecipeHandoff}>Clear recipe</button>}
        </div>
      </div>
    </div>
    {!isRecipe && toolMode !== 'lotus' && <section className="rounded-2xl border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/10 via-slate-800/70 to-violet-500/10 p-4 shadow-xl sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-fuchsia-100">
            <FlaskConical className="h-4 w-4 text-fuchsia-300" aria-hidden="true" />
            DIY single-salt concentrate
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            Use the same bottle-card workflow as recipe concentrates, with one selected mineral per bottle.
            The target follows the current Calculator setup when that salt is active.
          </p>
        </div>
        <span className="rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-200">One bottle</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5 text-xs transition-colors" style={{ color: getSaltColorTokens(salt).primary }}>
          <span className="block text-[10px] font-semibold uppercase tracking-wider">Mineral</span>
          <select aria-label="DIY concentrate salt" className="mt-1 w-full bg-transparent text-sm font-semibold outline-none" value={salt.id} onChange={e => { setSaltId(e.target.value); setTargetInput(String(props.diySaltTargets[e.target.value] || 30)); }}>
            {SALTS.filter(s => !['mgoh2', 'caco3'].includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="rounded-xl border border-emerald-300/25 bg-slate-950/25 px-3 py-2.5 text-xs transition-colors">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Hydration form</span>
          <select aria-label="DIY concentrate hydration form" className="mt-1 w-full bg-transparent text-sm font-semibold text-emerald-100 outline-none" value={selectedForm} onChange={e => setForms(p => ({ ...p, [salt.id]: Number(e.target.value) }))}>
            {salt.hydrationForms.map((form, i) => <option key={form.label} value={i}>{form.label}</option>)}
          </select>
          <span className="mt-1 block text-[9px] text-slate-500">Controls the salt mass to weigh</span>
        </label>
      </div>
    </section>}
    {isRecipe || toolMode === 'lotus' ? <section className="app-panel app-panel--quiet app-card space-y-4 rounded-2xl border px-4 py-4 shadow-xl backdrop-blur-xl sm:px-6">
      {isRecipe && <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-fuchsia-100">{props.recipeHandoff?.name}</div>
          <p className="mt-1 text-xs text-slate-400">Recipe stocks are prepared by weight. Target stock weight includes salt + water, not the bottle.</p>
        </div>
        <label className="min-w-40 text-xs">Stock arrangement<select aria-label="Stock arrangement" className={inputClass} value={strategy} onChange={e => setStrategy(e.target.value as typeof strategy)}>
          <option value="individual">Separate salts</option><option value="gh-kh">GH + KH groups</option><option value="all-in-one">All-in-one</option></select></label>
      </div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5 text-xs">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-cyan-200">Final brewing water ({props.volumeUnit === 'gallons' ? 'US gal' : 'L'})</span>
          <input aria-label="Final brewing water" className="mt-1 w-full bg-transparent text-sm text-slate-100 outline-none" inputMode="decimal"
            value={props.volumeUnit === 'gallons' ? n(finalLiters / 3.785411784, 6) : finalLitersInput}
            onChange={e => setFinalLitersInput(props.volumeUnit === 'gallons' ? String(Number(e.target.value) * 3.785411784) : e.target.value)} />
        </label>
        <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5 text-xs">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-cyan-200">Dropper tip</span>
          <select aria-label="Stock dropper tip" className={inputClass} value={tipKey} onChange={e => setTipKey(e.target.value as typeof tipKey)}>
            <option value="straight">Straight</option><option value="round">Round</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-700/60 pt-3">
        <button className={buttonClass} onClick={toggleMassVolumeUnit}>Use {props.volumeUnit === 'liters' ? 'gallons' : 'liters'} for brewing water</button>
        <p className="text-xs text-slate-400">{WATER_MASS_NOTE}</p>
      </div>
      {toolMode === 'lotus' && <p className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-xs text-amber-100">Homemade stock estimates use the published salt:water mass ratios. Commercial Lotus recipes remain source references, not exact predictions for a homemade stock. Verify finished-stock drops.</p>}
    </section> : <details className="rounded-2xl border border-slate-700/60 bg-slate-900/45 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">Advanced stock targets</summary>
      <div className="mt-4 space-y-3">
        <div className="relative">
          <div role="tablist" aria-label="DIY stock basis" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
          <button type="button" role="tab" aria-selected={toolMode === 'recipe'} aria-label="Recipe-equivalent salt stock" onClick={() => setToolMode('recipe')}
            className={`rounded-lg px-2.5 py-1.5 pr-8 text-xs font-semibold transition ${toolMode === 'recipe' ? 'border border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200 shadow-sm' : 'border border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
            Recipe target
          </button>
          <button type="button" role="tab" aria-selected={toolMode === 'percent'} aria-label="Single-salt weight percentage" onClick={() => setToolMode('percent')}
            className={`rounded-lg px-2.5 py-1.5 pr-8 text-xs font-semibold transition ${toolMode === 'percent' ? 'border border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200 shadow-sm' : 'border border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
            % w/w
          </button>
          </div>
          <div className="pointer-events-none absolute inset-0 grid grid-cols-2 gap-1 p-1">
            <div className="pointer-events-none flex items-center justify-end pr-2">
              <HelpTip
                testId="recipe-target-help"
                label="Recipe target explanation"
                text="Use this when you have a mineral target for the finished brew. Enter the selected salt's contribution in mg/L as anhydrous equivalent; the card calculates how much salt goes into the concentrate."
              />
            </div>
            <div className="pointer-events-none flex items-center justify-end pr-2">
              <HelpTip
                testId="weight-percent-help"
                label="Weight percentage explanation"
                text="Set the selected salt's share of the finished stock's total weight. For example, 5% w/w means 5 g of salt in 100 g of finished stock; the rest is water."
                align="right"
              />
            </div>
          </div>
        </div>
        {toolMode === 'recipe' && <label className="block rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5 text-xs text-cyan-200">
          <span className="block text-[10px] font-semibold uppercase tracking-wider">Recipe target (anhydrous-equivalent mg/L)</span>
          <input className="mt-1 w-full bg-transparent text-sm text-slate-100 outline-none" inputMode="decimal" value={targetInput} onChange={e => setTargetInput(e.target.value)} />
        </label>}
        {toolMode === 'percent' && <label className="block rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5 text-xs text-cyan-200">
          <span className="block text-[10px] font-semibold uppercase tracking-wider">Strength (% w/w)</span>
          <input aria-label="Stock strength percent w/w" className="mt-1 w-full bg-transparent text-sm text-slate-100 outline-none" inputMode="decimal" value={percentInput} onChange={e => setPercentInput(e.target.value)} />
        </label>}
      </div>
    </details>}
    {restoreError && <div role="alert" className="rounded-xl border border-red-400/40 p-4 text-sm text-red-200">{restoreError} No stock was silently converted.
      <p className="mt-2">The saved record has not been changed. Starting a new plan keeps a local recovery copy first.</p>
      <button className={`${buttonClass} mt-3`} onClick={() => {
        if (!isRecipe && !archiveDiyConcentrateInputsForRecovery()) { setRestoreError('Could not preserve a local recovery copy. Free browser storage before replacing this plan.'); return; }
        setRestoreError('');
      }}>Start a new mass plan</button></div>}
    {legacy ? <section className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-5 space-y-3">
      <h3 className="font-semibold text-amber-100">Legacy volume-based stock — historical record</h3>
      <p className="text-sm">These original settings are not grams of finished concentrate. Do not use this rebuild for an already-prepared bottle; prepare a new stock.</p>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(legacy, null, 2)}</pre>
      <label className="block text-xs">New target stock weight (g)<input className={inputClass} value={rebuildMass} onChange={e => setRebuildMass(e.target.value)} /></label>
      <button className={buttonClass} disabled={!Number.isFinite(Number(rebuildMass)) || Number(rebuildMass) <= 0} onClick={() => {
        setLegacyOriginal(legacy);
        const oldGroups = Array.isArray(legacy.groups) ? legacy.groups.filter(isRecord) : [];
        if (legacy.strategy === 'individual' || legacy.strategy === 'gh-kh' || legacy.strategy === 'all-in-one') setStrategy(legacy.strategy);
        setGroups(Object.fromEntries([...activeGroups.map(g => ({ ...g })), ...oldGroups.filter(g => typeof g.id === 'string')].map(g => {
          const id = String(g.id);
          const old = oldGroups.find(row => row.id === id);
          const oldStrength = Number(old?.strength ?? legacy.strength);
          return [id, { ...emptyGroup(id), strength: Number.isFinite(oldStrength) && oldStrength > 0 ? oldStrength : 20, totalStockMassG: Number(rebuildMass) }];
        })));
        setLegacy(null);
      }}>Rebuild by weight</button>
    </section> : !restoreError && <div ref={cardsRef} className="space-y-4">
      {activeGroups.map(g => {
        const state = groupFor(g.id);
        let targets = Object.fromEntries(g.saltIds.map(id => [id, recipeTargets[id] ?? 0]));
        let groupForms = Object.fromEntries(g.saltIds.map(id => [id, recipeForms[id] ?? SALTS.find(s => s.id === id)?.defaultFormIdx ?? 0]));
        const percent = !isRecipe && toolMode === 'percent';
        const lotus = !isRecipe && toolMode === 'lotus';
        let strength = state.strength * (state.batchScale ?? 1);
        if (percent) {
          const form = salt.hydrationForms[selectedForm];
          targets = { [salt.id]: Number(percentInput) / 100 * state.totalStockMassG * 1000 * salt.anhydrousMass / form.molarMass };
          strength = 1;
        } else if (lotus) {
          const def = LOTUS_DROPPER_DEFINITIONS.find(d => `lotus-${d.id}` === g.id)!;
          const stock = lotusMassStockPlan(def, state.totalStockMassG);
          groupForms = { [def.saltId]: SALTS.find(s => s.id === def.saltId)?.defaultFormIdx ?? 0 };
          targets = { [def.saltId]: stock.valid ? stock.anhydrousEquivalentMassMg : NaN };
          strength = 1;
        }
        if (!percent && !lotus && (state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop)) {
          // Reformulation is a planning estimate. A measurement of the old
          // composition must not be treated as exact for the new composition.
          const pinned = computeRecipeMassStrengthForPhysicalSaltPpm({ saltTargets: targets, formIdxBySaltId: groupForms,
            totalStockMassG: state.totalStockMassG, finalWaterMassKg, calibration: waterEstimate, compositionKey: '', tipKey,
            physicalSaltPpmPerDrop: state.caCo3PpmPerDrop
              ? state.caCo3PpmPerDrop / physicalSaltCaCo3EquivalentFactor(g.saltIds[0], groupForms[g.saltIds[0]] ?? 0)
              : state.physicalSaltPpmPerDrop! });
          strength = pinned.valid ? pinned.strength : NaN;
        }
        return <MassStockCard key={g.id} name={g.name} state={state} saltTargets={targets} forms={groupForms} strength={strength}
          finalLiters={finalLiters} finalWaterMassKg={finalWaterMassKg} finalLitersInput={finalLitersInput} volumeUnit={props.volumeUnit}
          onFinalLitersChange={value => setFinalLitersInput(props.volumeUnit === 'gallons' ? String(Number(value) * 3.785411784) : value)}
          onToggleVolumeUnit={toggleMassVolumeUnit} tipKey={tipKey} dropperRates={dropperRates}
          onTipChange={setTipKey} sharedCalibrations={shared} onSharedCalibrationChange={updateSharedCalibration}
          waterEstimate={waterEstimate} percentMode={percent || lotus}
          onUpdate={patch => update(g.id, patch)} showSteps={showSteps} allowSaltMassEdit={isRecipe && strategy === 'individual'} diySingleSalt={!isRecipe && toolMode !== 'lotus'} />;
      })}
      {(isRecipe || toolMode === 'lotus') && <button className={buttonClass} aria-label="Open concentrate recipe steps" onClick={() => setShowSteps(v => !v)}>{showSteps ? 'Hide recipe steps' : 'Recipe steps'}</button>}
      {(isRecipe || toolMode === 'lotus') && <button className={`${buttonClass} ml-2`} onClick={async () => {
        setExportError('');
        if (!cardsRef.current) return;
        try {
          setShowSteps(true);
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(cardsRef.current, { backgroundColor: '#0f172a', scale: 2 });
          const anchor = document.createElement('a'); anchor.href = canvas.toDataURL('image/jpeg', 0.92); anchor.download = 'mass-concentrate-plan.jpg'; anchor.click();
        } catch { setExportError('Could not export the image. Use the text preparation download on each stock instead.'); }
      }}>Download plan image</button>}
      {exportError && <p role="alert" className="text-sm text-amber-200">{exportError}</p>}
    </div>}
  </div>;
}

function MassStockCard({ name, state, saltTargets, forms, strength, finalLiters, finalWaterMassKg, finalLitersInput, volumeUnit, onFinalLitersChange, onToggleVolumeUnit, tipKey, dropperRates, onTipChange, sharedCalibrations, onSharedCalibrationChange, waterEstimate, onUpdate, percentMode, showSteps, allowSaltMassEdit, diySingleSalt }: {
  name: string; state: Group; saltTargets: Record<string, number>; forms: Record<string, number>; strength: number; finalLiters: number; finalWaterMassKg: number;
  finalLitersInput: string; volumeUnit: 'liters' | 'gallons'; onFinalLitersChange: (value: string) => void; onToggleVolumeUnit: () => void;
  tipKey: 'straight' | 'round'; dropperRates: Record<'straight' | 'round', number>; onTipChange: (tipKey: 'straight' | 'round') => void;
  sharedCalibrations: Record<string, LotusDropperCalibration>;
  onSharedCalibrationChange: (style: LotusDropperStyle, field: 'dropsInput' | 'weightInput', value: string) => void;
  waterEstimate: StockDropCalibration; onUpdate: (patch: Partial<Group>) => void; percentMode: boolean; showSteps: boolean; allowSaltMassEdit: boolean; diySingleSalt: boolean;
}) {
  const [massInput, setMassInput] = useState(String(state.totalStockMassG));
  const [strengthInput, setStrengthInput] = useState(String(state.strength));
  const [dropsInput, setDropsInput] = useState(state.calibration?.basis === 'stock' ? String(state.calibration.drops) : '');
  const [weighedInput, setWeighedInput] = useState(state.calibration?.basis === 'stock' ? String(state.calibration.massG) : '');
  const [targetMgInput, setTargetMgInput] = useState(String(state.desiredSaltMassMg ?? 40));
  const initialSaltId = Object.keys(saltTargets)[0] ?? '';
  const canUseCaCo3Target = Object.keys(saltTargets).length === 1
    && physicalSaltCaCo3EquivalentFactor(initialSaltId, forms[initialSaltId] ?? 0) > 0;
  const [dropTargetInput, setDropTargetInput] = useState(String(state.caCo3PpmPerDrop ?? state.physicalSaltPpmPerDrop ?? (canUseCaCo3Target ? 5 : 1)));
  const [dropBasis, setDropBasis] = useState<'salt-mg' | 'caco3'>(state.caCo3PpmPerDrop ? 'caco3' : state.physicalSaltPpmPerDrop ? 'salt-mg' : canUseCaCo3Target ? 'caco3' : 'salt-mg');
  const [calibrationError, setCalibrationError] = useState('');
  const [jpgStatus, setJpgStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const preparationCardRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setMassInput(String(state.totalStockMassG));
    setStrengthInput(String(state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop ? strength : state.strength));
  }, [state.totalStockMassG, state.strength, state.physicalSaltPpmPerDrop, state.caCo3PpmPerDrop, strength]);
  const salts = recipeStockSaltMasses(saltTargets, forms, strength);
  const equivalentFactor = salts.length === 1 ? physicalSaltCaCo3EquivalentFactor(salts[0].saltId, forms[salts[0].saltId] ?? 0) : 0;
  const compositionKey = stockCompositionKey(salts, state.totalStockMassG, forms);
  const sharedTipCalibration = sharedCalibrations[tipKey];
  const sharedCalibrationDrops = Number(sharedTipCalibration?.dropsInput ?? 0);
  const sharedCalibrationWeightG = Number(sharedTipCalibration?.weightInput ?? 0);
  const hasSharedCalibration = Number.isFinite(sharedCalibrationDrops) && sharedCalibrationDrops > 0
    && Number.isFinite(sharedCalibrationWeightG) && sharedCalibrationWeightG > 0;
  const waterMassPerDrop = hasSharedCalibration ? sharedCalibrationWeightG / sharedCalibrationDrops : 1 / dropperRates[tipKey];
  const measured = resolveStockDropCalibration(state.calibration, compositionKey, tipKey);
  const calibration = measured.basis === 'stock' ? state.calibration : waterEstimate;
  const result = computeRecipeMassDropEquivalents({ saltTargets, formIdxBySaltId: forms, strength, totalStockMassG: state.totalStockMassG, calibration, finalWaterMassKg, compositionKey, tipKey });
  const warnings = checkMassConcentrate({ strength, saltTargets, formIdxBySaltId: forms, totalStockMassG: state.totalStockMassG });
  const preparedMass = result.valid ? result : null;
  const saltMassG = salts.reduce((total, item) => total + item.physicalMassMg / 1000, 0);
  const saltGPer100MlWater = preparedMass && preparedMass.waterMassG > 0 ? saltMassG / preparedMass.waterMassG * 100 : 0;
  const solubilityLimitGPer100Ml = salts.length === 1
    ? getSaltSolubilityLimitGPer100Ml(salts[0].saltId, forms[salts[0].saltId] ?? 0) : null;
  const willDissolve = solubilityLimitGPer100Ml == null || saltGPer100MlWater <= solubilityLimitGPer100Ml;
  const recommendedStrength = percentMode ? null : recommendMassConcentrateStrength({
    saltTargets, formIdxBySaltId: forms, totalStockMassG: state.totalStockMassG,
    gramsPerDrop: measured.gramsPerDrop ?? waterEstimate.massG / waterEstimate.drops,
  });
  const blocked = !result.valid || warnings.some(w => w.severity === 'error');
  const saltLabel = salts.map(s => `${n(s.physicalMassMg / 1000)} g ${SALTS.find(item => item.id === s.saltId)?.name ?? s.saltId}`).join(' + ');
  const doseMassG = result.valid ? percentMode ? Number(targetMgInput) / result.totalSaltMgPerStockG : result.doseMassG : NaN;
  const dropMass = result.valid ? result.gramsPerDrop : null;
  const exactDrops = dropMass ? doseMassG / dropMass : NaN;
  const roundedDrops = Number.isFinite(exactDrops) ? Math.round(exactDrops) : NaN;
  const physicalDeliveredMg = result.valid && dropMass ? roundedDrops * dropMass * result.totalSaltMgPerStockG : NaN;
  const recipeDeliveredIons = result.valid && result.ionPpmPerDrop && Number.isFinite(roundedDrops)
    ? Object.entries(result.ionPpmPerDrop).map(([ion, ppm]) => `${ion}: ${n(ppm * roundedDrops)} mg/L`).join(' · ') : '';
  const savePreparationJpg = async () => {
    const source = preparationCardRef.current;
    if (!source || jpgStatus === 'saving') return;
    setJpgStatus('saving');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(source, {
        backgroundColor: '#1e293b',
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: clonedDocument => clonedDocument
          .querySelectorAll<HTMLElement>('[data-diy-preparation-export-ignore]')
          .forEach(element => element.remove()),
      });
      const jpg = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!jpg) throw new Error('Preparation card JPG could not be created.');
      const url = URL.createObjectURL(jpg);
      const link = document.createElement('a');
      const saltSlug = (SALTS.find(item => item.id === state.saltIds[0])?.name ?? 'single-salt')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      link.href = url;
      link.download = `diy-${saltSlug || 'single-salt'}-preparation.jpg`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setJpgStatus('saved');
      window.setTimeout(() => setJpgStatus('idle'), 2200);
    } catch {
      setJpgStatus('error');
    }
  };
  if (diySingleSalt) return <div className="space-y-3" data-testid="mass-stock-card">
    <section className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 shadow-xl sm:p-5" data-testid="mass-stock-setup">
      <div className="flex items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/70">
        <span className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-cyan-300/80" aria-hidden="true" />
          <span>Concentrate weight and batch volume</span>
        </span>
        <HelpTip
          testId={`mass-water-volume-help-${state.id}`}
          label="Water weighing explanation"
          text={`${WATER_MASS_NOTE} The batch volume is the finished brewing-water amount used to calculate this recipe's dose.`}
          align="right"
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Concentrate weight</span>
          <span className="mt-1 flex items-center gap-2">
            <input aria-label={`${name} target stock weight in grams`} className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none" inputMode="decimal"
              value={massInput} onChange={e => { setMassInput(e.target.value); onUpdate({ totalStockMassG: e.target.value.trim() ? Number(e.target.value) : NaN, batchScale: 1 }); }} />
            <span className="text-sm text-slate-400">g</span>
          </span>
        </label>
        <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
          <span className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Batch volume</span>
            <button type="button" aria-label="Toggle brewing water units" onClick={onToggleVolumeUnit} className="text-cyan-300 hover:text-cyan-100">
              {volumeUnit === 'gallons' ? 'gallons' : 'liters'}
            </button>
          </span>
          <span className="mt-1 flex items-center gap-2">
            <input aria-label="Final brewing water" className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none" inputMode="decimal"
              value={volumeUnit === 'gallons' ? n(finalLiters / 3.785411784, 6) : finalLitersInput}
              onChange={e => onFinalLitersChange(e.target.value)} />
            <span className="text-sm text-slate-400">{volumeUnit === 'gallons' ? 'US gal' : 'L'}</span>
          </span>
        </label>
      </div>
    </section>

    <section className="rounded-2xl border border-sky-300/30 bg-gradient-to-br from-sky-400/[0.08] via-slate-800/80 to-blue-500/[0.06] p-4 shadow-xl sm:p-5" data-testid="mass-stock-calibration">
      <div className="flex items-start gap-3">
        <Pipette className="mt-0.5 h-5 w-5 shrink-0 text-sky-200" aria-hidden="true" />
        <div>
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-sky-100/80">
            <span>Dropper calibration</span>
            <HelpTip
              testId={`mass-calibration-help-${state.id}`}
              label="Dropper calibration explanation"
              text="This shared value measures plain-water drops for the selected tip. Hold the dropper vertically. Finished concentrate can drop differently, so calibrate the prepared stock separately when you need a more accurate dose."
            />
          </div>
          <h3 className="mt-1 text-base font-semibold text-white">{hasSharedCalibration ? 'Calibration in use' : 'Measure this tip before dosing'}</h3>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-sky-200/15 bg-slate-950/30 p-1" role="group" aria-label="Stock Builder dropper tip style">
        {(['straight', 'round'] as const).map(style => <button key={style} type="button" onClick={() => onTipChange(style)}
          aria-pressed={tipKey === style} aria-label={`${style === 'straight' ? 'Straight' : 'Round'} tip, ${dropperRates[style].toFixed(1)} drops per mL`}
          className={`rounded-md px-2 py-2 text-left text-[10px] font-semibold capitalize transition ${tipKey === style ? 'bg-sky-400/15 text-sky-100 shadow-sm' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>
          {style} Tip · {dropperRates[style].toFixed(1)} Drops/ML
        </button>)}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" data-testid="shared-dropper-calibration">
        <label className="rounded-xl border border-sky-200/20 bg-slate-950/25 px-3 py-2.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Measured number of drops</span>
          <input aria-label="Measured number of drops" className="mt-1 w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none"
            inputMode="decimal" placeholder="e.g. 100" value={sharedTipCalibration?.dropsInput ?? ''}
            onChange={e => onSharedCalibrationChange(tipKey, 'dropsInput', e.target.value)} />
        </label>
        <label className="rounded-xl border border-sky-200/20 bg-slate-950/25 px-3 py-2.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Measured weight</span>
          <span className="mt-1 flex items-center gap-2">
            <input aria-label="Shared water calibration weight in grams" className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none"
              inputMode="decimal" placeholder="e.g. 5" value={sharedTipCalibration?.weightInput ?? ''}
              onChange={e => onSharedCalibrationChange(tipKey, 'weightInput', e.target.value)} />
            <span className="text-sm text-slate-400">g</span>
          </span>
        </label>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <SummaryMetric label="Water mass per drop" value={`${waterMassPerDrop.toFixed(4)} g`}
          detail={hasSharedCalibration ? 'shared' : 'estimated'} tone="sky" />
        <SummaryMetric label="Drops per mL" value={dropperRates[tipKey].toFixed(1)}
          detail={hasSharedCalibration ? 'shared' : 'estimated'} tone="sky" />
        <SummaryMetric label="Calibration status" value={hasSharedCalibration ? 'Shared value' : 'Assumption'}
          detail={hasSharedCalibration ? 'Guide + Lotus Drops' : 'measure for accuracy'} tone={hasSharedCalibration ? 'emerald' : 'slate'} />
      </div>
      {state.calibration && measured.basis === 'unavailable' && <p className="mt-2 text-xs text-amber-200">The stock composition or tip changed. Recalibrate this finished stock before using measured drops.</p>}
      <details className="mt-3 rounded-xl border border-slate-700/60 p-3">
        <summary className="cursor-pointer text-sm text-sky-100">Calibrate this finished stock by weight</summary>
        <p className="mt-2 text-xs text-slate-400">Tare a receiving cup. Hold the dropper vertically and weigh counted drops of this actual finished stock. Use the same tip. This calibration is saved to this stock, separate from the shared water value.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs">Counted stock drops<input aria-label={`${name} counted stock drops`} className={inputClass} value={dropsInput} onChange={e => setDropsInput(e.target.value)} /></label>
          <label className="text-xs">Measured stock weight (g)<input aria-label={`${name} measured stock weight`} className={inputClass} value={weighedInput} onChange={e => setWeighedInput(e.target.value)} /></label>
        </div>
        <button type="button" className={`${buttonClass} mt-3`} onClick={() => {
          if (![Number(dropsInput), Number(weighedInput)].every(v => Number.isFinite(v) && v > 0)) { setCalibrationError('Enter a positive drop count and actual stock weight.'); return; }
          onUpdate({ calibration: { basis: 'stock', drops: Number(dropsInput), massG: Number(weighedInput), compositionKey, tipKey } });
          setCalibrationError('');
        }}>Use measured stock calibration</button>
      </details>
      {calibrationError && <p role="status" className="mt-2 text-xs text-amber-200">{calibrationError}</p>}
    </section>

    <section className="rounded-2xl border border-cyan-300/25 bg-slate-800/70 p-4 shadow-xl sm:p-5" data-testid="mass-stock-dose">
      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/70">
        <Droplet className="h-4 w-4 text-cyan-300/80" aria-hidden="true" />
        <span>Desired dose</span>
        <HelpTip
          testId={`mass-dose-help-${state.id}`}
          label="Dose target explanation"
          text="Choose whether the per-drop target is expressed as CaCO₃-equivalent ppm or physical salt mg/L. The planned strength uses your stock weight and water calibration; verify drops with the finished stock before relying on them."
        />
      </div>
      {percentMode ? <label className="mt-3 block rounded-xl border border-cyan-200/20 bg-slate-950/25 px-3 py-2.5">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Desired physical salt dose (mg)</span>
        <input aria-label={`${name} desired salt dose in milligrams`} className="mt-1 w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none"
          inputMode="decimal" value={targetMgInput} onChange={e => { setTargetMgInput(e.target.value); onUpdate({ desiredSaltMassMg: e.target.value.trim() ? Number(e.target.value) : NaN }); }} />
      </label> : <>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-cyan-200/15 bg-slate-950/30 p-1" role="group" aria-label="Drop target basis">
          <button type="button" onClick={() => setDropBasis('caco3')} aria-pressed={dropBasis === 'caco3'} disabled={equivalentFactor <= 0}
            className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${dropBasis === 'caco3' ? 'bg-cyan-400/15 text-cyan-100 shadow-sm' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'} disabled:cursor-not-allowed disabled:opacity-40`}>ppm as CaCO₃</button>
          <button type="button" onClick={() => setDropBasis('salt-mg')} aria-pressed={dropBasis === 'salt-mg'}
            className={`rounded-md px-2 py-1.5 text-[11px] font-semibold transition ${dropBasis === 'salt-mg' ? 'bg-cyan-400/15 text-cyan-100 shadow-sm' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>mg/L salt per drop</button>
        </div>
        <label className="mt-3 block rounded-xl border border-cyan-200/20 bg-slate-950/25 px-3 py-2.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {dropBasis === 'caco3' ? 'Desired ppm as CaCO₃ per drop' : 'Desired physical salt (mg/L per drop)'}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <input aria-label={dropBasis === 'caco3' ? 'DIY CaCO3 ppm per drop' : 'DIY physical salt mg per L per drop'}
              className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none" inputMode="decimal"
              value={dropTargetInput} onChange={e => setDropTargetInput(e.target.value)} />
            <span className="text-sm text-slate-400">{dropBasis === 'caco3' ? 'ppm' : 'mg/L'}</span>
          </span>
        </label>
        <button type="button" className="mt-3 rounded-lg border border-cyan-200/25 bg-slate-950/25 px-3 py-2 text-xs font-semibold text-cyan-100 hover:border-cyan-200/55 hover:bg-cyan-400/10"
          onClick={() => {
            const target = dropBasis === 'caco3' && equivalentFactor > 0 ? Number(dropTargetInput) / equivalentFactor : Number(dropTargetInput);
            const next = computeRecipeMassStrengthForPhysicalSaltPpm({ saltTargets, formIdxBySaltId: forms, totalStockMassG: state.totalStockMassG,
              calibration: waterEstimate, finalWaterMassKg, compositionKey, tipKey, physicalSaltPpmPerDrop: target });
            if (next.valid) {
              onUpdate({ strength: next.strength, batchScale: 1, physicalSaltPpmPerDrop: dropBasis === 'caco3' ? undefined : Number(dropTargetInput),
                caCo3PpmPerDrop: dropBasis === 'caco3' ? Number(dropTargetInput) : undefined });
              setCalibrationError('Strength changed. Verify drops with the newly prepared finished stock.');
            } else setCalibrationError(next.reason);
          }}>Set strength from drop target</button>
      </>}
      {(state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop) && <p className="mt-2 text-xs text-amber-100">
        Pinned target: {n(state.caCo3PpmPerDrop ?? state.physicalSaltPpmPerDrop!)} {state.caCo3PpmPerDrop ? 'ppm CaCO₃-equivalent' : 'mg/L physical salt'} per drop.
      </p>}
      {(!Number.isFinite(doseMassG) || doseMassG <= 0) && <p role="alert" className="mt-3 text-xs text-red-200">Enter a positive, finite salt dose and brewing-water amount.</p>}
      {!blocked && Number.isFinite(doseMassG) && doseMassG > 0 && <div className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] p-3 text-sm text-emerald-50">
        <p>Dose <strong className="text-lg text-emerald-200">{n(doseMassG, 5)} g stock</strong> for {n(finalLiters)} L brewing water.</p>
        {doseMassG > state.totalStockMassG && <p className="mt-2 text-xs text-amber-200">This dose needs more than one prepared bottle. Prepare enough stock at the same mass fraction.</p>}
        <p className="mt-2 text-xs">{measured.basis === 'stock' ? 'Measured finished-stock calibration' : 'Water-based planning estimate — not measured finished stock'}.</p>
        <details className="mt-2 rounded-lg border border-emerald-200/15 bg-slate-950/20 px-3 py-2" data-testid={`mass-stock-dose-details-${state.id}`}>
          <summary className="cursor-pointer text-xs text-emerald-100/80">Dose details</summary>
          {Number.isFinite(exactDrops) && <p className="mt-2 text-xs">Exact: {n(exactDrops)} drops · Rounded: {roundedDrops} drops → {n(physicalDeliveredMg)} mg physical salt ({n(physicalDeliveredMg / finalWaterMassKg)} mg/L).</p>}
          {recipeDeliveredIons && <p className="mt-1 text-xs text-slate-300">Rounded-drop ions: {recipeDeliveredIons}</p>}
          {preparedMass && equivalentFactor > 0 && preparedMass.totalSaltMgPerDrop !== null && <p className="mt-1 text-xs text-slate-300">DIY spreadsheet basis: {n(preparedMass.totalSaltMgPerDrop * equivalentFactor / finalWaterMassKg)} ppm CaCO₃-equivalent per drop; not an additional ion or independent GH/KH target.</p>}
          {(state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop) && <p className="mt-1 text-xs text-amber-100">
            Pinned planning target: {n(state.caCo3PpmPerDrop ?? state.physicalSaltPpmPerDrop!)} {state.caCo3PpmPerDrop ? 'ppm CaCO₃-equivalent' : 'mg/L physical salt'} per drop. Stock weight, final-water amount, and water-tip estimate update the planned strength. Verify the newly prepared stock before relying on drops.
          </p>}
        </details>
      </div>}
    </section>

    <section ref={preparationCardRef} className="rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/[0.08] via-slate-800/75 to-slate-800/70 p-4 shadow-xl sm:p-5" data-testid="mass-stock-preparation-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200/75">
          <ListChecks className="h-4 w-4 text-emerald-200/80" aria-hidden="true" />
          <span>Preparation</span>
        </div>
        <button type="button" onClick={savePreparationJpg} disabled={jpgStatus === 'saving'} data-diy-preparation-export-ignore
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200/25 bg-slate-950/25 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-100 hover:border-emerald-200/55 hover:bg-emerald-400/10 disabled:cursor-wait disabled:opacity-70"
          aria-label="Save preparation card as JPG">{jpgStatus === 'saving' ? 'Saving…' : jpgStatus === 'saved' ? 'Saved JPG' : jpgStatus === 'error' ? 'Try again' : 'Save JPG'}</button>
      </div>
      <h2 className="mt-1 text-base font-semibold text-white">Make this concentrate</h2>
      {!blocked && preparedMass && <div className="mt-3">
        <ConcentratePreparationSteps totalStockMassG={preparedMass.totalStockMassG} waterMassG={preparedMass.waterMassG} saltLabel={saltLabel} />
      </div>}
      <div className={`mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${willDissolve ? 'border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-50' : 'border-rose-300/30 bg-rose-400/[0.08] text-rose-50'}`}>
        <span className="flex items-center gap-2">
          {willDissolve ? <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 text-rose-300" aria-hidden="true" />}
          {willDissolve ? 'Dissolves at this concentration' : 'May not fully dissolve'}
        </span>
        <strong className="text-right text-[10px] tabular-nums">{saltGPer100MlWater.toFixed(2)} / {solubilityLimitGPer100Ml == null ? '—' : solubilityLimitGPer100Ml.toFixed(2)} g per 100 mL</strong>
      </div>
      {warnings.map((warning, i) => <p key={i} role={warning.severity === 'error' ? 'alert' : undefined}
        className={`mt-2 text-xs ${warning.severity === 'error' ? 'text-red-200' : warning.severity === 'warning' ? 'text-amber-200' : 'text-slate-400'}`}>{warning.message}</p>)}
      <button type="button" className="mt-3 rounded-lg border border-emerald-200/25 bg-slate-950/25 px-3 py-2 text-xs font-semibold text-emerald-100 hover:border-emerald-200/55 hover:bg-emerald-400/10"
        disabled={blocked || !Number.isFinite(doseMassG) || doseMassG <= 0}
        onClick={() => preparedMass && downloadText(`${state.id}-stock-preparation.txt`,
          [name, `${n(preparedMass.strengthPercentWw)}% w/w; total stock ${n(preparedMass.totalStockMassG)} g`,
            ...buildConcentratePreparationSteps({ totalStockMassG: preparedMass.totalStockMassG, waterMassG: preparedMass.waterMassG, saltLabel }),
            WATER_MASS_NOTE, `Dose ${n(doseMassG)} g stock for ${n(finalLiters)} L. Drops: ${measured.basis === 'stock' ? 'measured finished-stock' : 'water-based estimate; verify finished stock'}.`,
            ...warnings.map(w => w.message)].join('\n\n'))}>Download preparation text</button>
    </section>

    <details className="rounded-2xl border border-slate-700/60 bg-slate-900/45 p-4" data-testid="mass-stock-advanced-strength">
      <summary className="cursor-pointer text-sm font-semibold text-slate-200">Advanced stock strength and safety</summary>
      <div className="mt-3 space-y-3">
        {!percentMode && <label className="block text-xs">Recipe strength (× one-liter equivalents)
          <input aria-label={`${name} recipe strength`} className={inputClass} inputMode="decimal" value={strengthInput}
            onChange={e => { setStrengthInput(e.target.value); onUpdate({ strength: e.target.value.trim() ? Number(e.target.value) : NaN, batchScale: 1, physicalSaltPpmPerDrop: undefined, caCo3PpmPerDrop: undefined }); }} />
        </label>}
        {!percentMode && <div className="space-y-2">
          <button className={buttonClass} disabled={recommendedStrength === null} onClick={() => onUpdate({ strength: recommendedStrength!, batchScale: 1, physicalSaltPpmPerDrop: undefined, caCo3PpmPerDrop: undefined })}>
            {recommendedStrength === null ? 'No concern-free recommendation at this weight' : `Use conservative recommendation ×${recommendedStrength}`}
          </button>
          <p className="text-xs text-slate-400">Uses the existing safety margin and ×500 model cap, plus at least one planning drop for 0.1 L. This is an estimate, not a stability guarantee.</p>
        </div>}
      </div>
    </details>
  </div>;
  return <section className="app-card rounded-2xl border border-fuchsia-400/25 bg-slate-900/65 p-5 space-y-4" data-testid="mass-stock-card">
    <h3 className="font-semibold text-fuchsia-100">{name}</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs">Target stock weight (g)<input aria-label={`${name} target stock weight in grams`} className={inputClass} inputMode="decimal" placeholder="e.g. 100" value={massInput}
        onChange={e => { setMassInput(e.target.value); onUpdate({ totalStockMassG: e.target.value.trim() ? Number(e.target.value) : NaN, batchScale: 1 }); }} /></label>
      {!percentMode && <label className="text-xs">Recipe strength (× one-liter equivalents)<input aria-label={`${name} recipe strength`} className={inputClass} inputMode="decimal" value={strengthInput}
        onChange={e => { setStrengthInput(e.target.value); onUpdate({ strength: e.target.value.trim() ? Number(e.target.value) : NaN, batchScale: 1, physicalSaltPpmPerDrop: undefined, caCo3PpmPerDrop: undefined }); }} /></label>}
    </div>
    {!result.valid ? <p role="alert" className="text-sm text-red-200">{result.reason}</p> : <>
      <p className="text-xs text-slate-400">{n(result.strengthPercentWw)}% w/w · {n(result.totalSaltMgPerStockG)} mg salt / g stock</p>
      <div className="space-y-2">{salts.map(s => {
        const salt = SALTS.find(item => item.id === s.saltId)!;
        const form = salt.hydrationForms[forms[salt.id] ?? salt.defaultFormIdx ?? 0];
        return <div key={salt.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span style={{ color: getSaltColorTokens(salt).primary }}>{salt.name} <small className="text-slate-400">({form?.label})</small></span>
          {allowSaltMassEdit && salts.length === 1 ? <label className="text-xs">Salt mass (g)<input aria-label={`${name} salt mass in grams`} className={`${inputClass} max-w-32`} inputMode="decimal" value={n(s.physicalMassMg / 1000, 6)}
            onChange={e => { const next = Number(e.target.value); if (Number.isFinite(next) && next > 0 && s.physicalMassMg > 0) {
              const scaled = scaleMassStockForSaltEdit(state, s.physicalMassMg / 1000, next);
              if (scaled) onUpdate({ ...scaled, strength: state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop ? strength : state.strength, physicalSaltPpmPerDrop: undefined, caCo3PpmPerDrop: undefined });
            } }} /></label>
            : <strong>{n(s.physicalMassMg / 1000)} g</strong>}</div>;
      })}</div>
      {(state.batchScale ?? 1) !== 1 && <p className="text-xs text-slate-400">Prepared batch scaled ×{n(state.batchScale ?? 1)} at unchanged mass fraction. This bottle contains ×{n(strength)} one-liter recipe equivalents; the reference strength control stays ×{n(state.strength)}.</p>}
      {(state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop) && <p className="text-xs text-amber-100">Pinned target: {n(state.caCo3PpmPerDrop ?? state.physicalSaltPpmPerDrop!)} {state.caCo3PpmPerDrop ? 'ppm CaCO₃-equivalent' : 'mg/L physical salt'} per drop.</p>}
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-950/50 p-3 text-sm">
        <span>Water <strong className="block text-cyan-200">{n(result.waterMassG)} g</strong></span>
        <span>Total contents <strong className="block text-fuchsia-100">{n(result.totalStockMassG)} g</strong></span>
      </div>
      {percentMode && <label className="block text-xs">Desired physical salt dose (mg)<input aria-label={`${name} desired salt dose in milligrams`} className={inputClass} value={targetMgInput}
        onChange={e => { setTargetMgInput(e.target.value); onUpdate({ desiredSaltMassMg: e.target.value.trim() ? Number(e.target.value) : NaN }); }} /></label>}
      {(!Number.isFinite(doseMassG) || doseMassG <= 0) && <p role="alert" className="text-xs text-red-200">Enter a positive, finite salt dose and brewing-water amount.</p>}
      {!blocked && Number.isFinite(doseMassG) && doseMassG > 0 && <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm">
        <p>Dose <strong className="text-lg text-emerald-200">{n(doseMassG, 5)} g stock</strong> for {n(finalLiters)} L brewing water.</p>
        {doseMassG > state.totalStockMassG && <p className="mt-2 text-xs text-amber-200">This dose needs more than one prepared bottle. Prepare enough stock at the same mass fraction.</p>}
        <p className="mt-2 text-xs">{measured.basis === 'stock' ? 'Measured finished-stock calibration' : 'Water-based planning estimate — not measured finished stock'}.</p>
        <details className="mt-2 rounded-lg border border-emerald-200/15 bg-slate-950/20 px-3 py-2" data-testid={`mass-stock-dose-details-${state.id}`}>
          <summary className="cursor-pointer text-xs text-emerald-100/80">Dose details</summary>
          {Number.isFinite(exactDrops) && <p className="mt-2 text-xs">Exact: {n(exactDrops)} drops · Rounded: {roundedDrops} drops → {n(physicalDeliveredMg)} mg physical salt ({n(physicalDeliveredMg / finalWaterMassKg)} mg/L).</p>}
          {recipeDeliveredIons && <p className="mt-1 text-xs text-slate-400">Rounded-drop ions: {recipeDeliveredIons}</p>}
          {diySingleSalt && equivalentFactor > 0 && result.totalSaltMgPerDrop !== null && <p className="mt-1 text-xs text-slate-400">DIY spreadsheet basis: {n(result.totalSaltMgPerDrop * equivalentFactor / finalWaterMassKg)} ppm CaCO₃-equivalent per drop. This equivalent is not an additional ion or an independent GH/KH target.</p>}
          {(state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop) && <p className="mt-1 text-xs text-amber-100">Pinned planning target: {n(state.caCo3PpmPerDrop ?? state.physicalSaltPpmPerDrop!)} {state.caCo3PpmPerDrop ? 'ppm CaCO₃-equivalent' : 'mg/L physical salt'} per drop. Stock weight, final-water amount, and water-tip estimate update the planned strength. Verify the newly prepared stock before relying on drops.</p>}
        </details>
        {state.calibration && measured.basis === 'unavailable' && <p className="mt-2 text-xs text-amber-200">The stock composition or tip changed. Recalibrate this finished stock before using measured drops.</p>}
      </div>}
      {!percentMode && <div className="space-y-2">
        <button className={buttonClass} disabled={recommendedStrength === null} onClick={() => onUpdate({ strength: recommendedStrength!, batchScale: 1, physicalSaltPpmPerDrop: undefined, caCo3PpmPerDrop: undefined })}>
          {recommendedStrength === null ? 'No concern-free recommendation at this weight' : `Use conservative recommendation ×${recommendedStrength}`}
        </button><p className="text-xs text-slate-400">Uses the existing safety margin and ×500 model cap, plus at least one planning drop for 0.1 L. This is an estimate, not a stability guarantee.</p>
        {diySingleSalt && <label className="block text-xs">Drop target basis<select aria-label="Drop target basis" className={inputClass} value={dropBasis} onChange={e => setDropBasis(e.target.value as typeof dropBasis)}>
          <option value="salt-mg">Physical salt mg/L per drop</option><option value="caco3" disabled={equivalentFactor <= 0}>DIY spreadsheet CaCO₃-equivalent ppm/drop</option></select></label>}
        <div className="flex flex-wrap items-end gap-2"><label className="text-xs">{dropBasis === 'caco3' && diySingleSalt ? 'CaCO₃-equivalent target (ppm per drop)' : 'Physical salt target (mg/L per drop)'}<input className={`${inputClass} max-w-36`} value={dropTargetInput} onChange={e => setDropTargetInput(e.target.value)} /></label>
        <button className={buttonClass} onClick={() => {
          const next = computeRecipeMassStrengthForPhysicalSaltPpm({ saltTargets, formIdxBySaltId: forms, totalStockMassG: state.totalStockMassG,
            calibration: waterEstimate, finalWaterMassKg, compositionKey, tipKey, physicalSaltPpmPerDrop: dropBasis === 'caco3' && diySingleSalt ? Number(dropTargetInput) / equivalentFactor : Number(dropTargetInput) });
          if (next.valid) { onUpdate({ strength: next.strength, batchScale: 1,
            physicalSaltPpmPerDrop: dropBasis === 'caco3' && diySingleSalt ? undefined : Number(dropTargetInput),
            caCo3PpmPerDrop: dropBasis === 'caco3' && diySingleSalt ? Number(dropTargetInput) : undefined }); setCalibrationError('Strength changed. Verify drops with the newly prepared finished stock.'); }
          else setCalibrationError(next.reason);
        }}>Set strength from drop target</button></div></div>}
      <details className="rounded-xl border border-slate-700/60 p-3">
        <summary className="cursor-pointer text-sm text-fuchsia-100">Calibrate this finished stock by weight</summary>
        <p className="mt-2 text-xs text-slate-400">Tare a receiving cup. Holding the dropper vertically, weigh counted drops of this actual finished stock. Use the same tip. Water calibration is only an estimate.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-xs">Counted stock drops<input aria-label={`${name} counted stock drops`} className={inputClass} value={dropsInput} onChange={e => setDropsInput(e.target.value)} /></label>
          <label className="text-xs">Measured stock weight (g)<input aria-label={`${name} measured stock weight`} className={inputClass} value={weighedInput} onChange={e => setWeighedInput(e.target.value)} /></label>
        </div><button className={`${buttonClass} mt-3`} onClick={() => {
          if (![Number(dropsInput), Number(weighedInput)].every(v => Number.isFinite(v) && v > 0)) { setCalibrationError('Enter a positive drop count and actual stock weight.'); return; }
          onUpdate({ calibration: { basis: 'stock', drops: Number(dropsInput), massG: Number(weighedInput), compositionKey, tipKey } }); setCalibrationError('');
        }}>Use measured stock calibration</button>
      </details>
      {calibrationError && <p role="status" className="text-xs text-amber-200">{calibrationError}</p>}
      {(showSteps || percentMode) && !blocked && <ConcentratePreparationSteps totalStockMassG={result.totalStockMassG} waterMassG={result.waterMassG} saltLabel={saltLabel} />}
      <button className={buttonClass} disabled={blocked || !Number.isFinite(doseMassG) || doseMassG <= 0} onClick={() => downloadText(`${state.id}-stock-preparation.txt`,
        [name, `${n(result.strengthPercentWw)}% w/w; total stock ${n(result.totalStockMassG)} g`,
          ...buildConcentratePreparationSteps({ totalStockMassG: result.totalStockMassG, waterMassG: result.waterMassG, saltLabel }),
          WATER_MASS_NOTE, `Dose ${n(doseMassG)} g stock for ${n(finalLiters)} L. Drops: ${measured.basis === 'stock' ? 'measured finished-stock' : 'water-based estimate; verify finished stock'}.`,
          ...warnings.map(w => w.message)].join('\n\n'))}>Download preparation text</button>
    </>}
    {warnings.map((warning, i) => <p key={i} role={warning.severity === 'error' ? 'alert' : undefined} className={`text-xs ${warning.severity === 'error' ? 'text-red-200' : warning.severity === 'warning' ? 'text-amber-200' : 'text-slate-400'}`}>{warning.message}</p>)}
  </section>;
}

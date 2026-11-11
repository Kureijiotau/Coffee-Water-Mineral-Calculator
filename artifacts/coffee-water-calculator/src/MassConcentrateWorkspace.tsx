import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Beaker, Check, ChevronDown, Droplet, FlaskConical, ListChecks, Pipette } from 'lucide-react';
import { SALTS, getSaltColorTokens, getSaltSolubilityLimitGPer100Ml, splitIntoStockGroups, type SaltRecipeEntry } from './waterData';
import { computeRecipeMassDropEquivalents, recipeStockSaltMasses, stockCompositionKey,
  waterLitersToEquivalentMassKg,
  resolveStockDropCalibration, computeRecipeMassStrengthForDose, computeRecipeMassStrengthForPhysicalSaltPpm, scaleMassStockForSaltEdit, physicalSaltCaCo3EquivalentFactor, type StockDropCalibration } from './concentrateMass';
import { checkMassConcentrate, recommendMassConcentrateStrength } from './concentrateMassWarnings';
import { ConcentratePreparationSteps, buildConcentratePreparationSteps, WATER_MASS_NOTE } from './concentratePreparation';
import { readConcentrateStockRecord, readStandaloneMassSnapshot, isRecord, type MassConcentratePlanSnapshot } from './concentrateStockStorage';
import { ACCOUNT_SYNC_REMOTE_CHANGE_EVENT, loadDiyConcentrateInputs, loadDiyConcentrateStockState, archiveDiyConcentrateInputsForRecovery, saveDiyConcentrateInputs } from './accountSyncStorage';
import { HelpTip } from './HelpTip';
import { LotusMassPreparationPanel } from './LotusMassPreparationPanel';
import { lotusMassStockPlan, LOTUS_DROPPER_DEFINITIONS, getDiyDropperRateForStyle, hasAnyDiyDropperCalibration, lotusMeasuredDropsPerMl, type LotusDropperCalibration, type LotusDropperId, type LotusDropperStyle, type LotusStyleCalibrationInputs } from './lotusConcentrate';
import type { WaterPlanConcentrateSnapshot } from './waterPlans';
import {
  createVolumeInputValues,
  updateVolumeInputValue,
  volumeInputToLiters,
} from './volumeUnits';

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

function SharedDropperCalibrationPanel({ dropperRates, sharedCalibrations, selectedStyle, onCalibrationChange, footer }: {
  dropperRates: Record<LotusDropperStyle, number>;
  sharedCalibrations: LotusStyleCalibrationInputs;
  selectedStyle: LotusDropperStyle;
  onCalibrationChange: (style: LotusDropperStyle, field: 'dropsInput' | 'weightInput', value: string) => void;
  footer?: ReactNode;
}) {
  const hasSavedCalibration = hasAnyDiyDropperCalibration(sharedCalibrations);
  const [open, setOpen] = useState(() => !hasSavedCalibration);
  useEffect(() => {
    if (!hasSavedCalibration) setOpen(true);
  }, [hasSavedCalibration]);

  return <details
    className="current-water-details mt-3 rounded-xl border border-sky-300/20 bg-sky-400/[0.045] px-3 py-2.5"
    data-testid="mass-shared-calibration"
    open={open}
    onToggle={event => setOpen(event.currentTarget.open)}
  >
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-sky-100 marker:hidden">
      <span className="flex items-center gap-2">
        <Pipette className="h-3.5 w-3.5 text-sky-200" aria-hidden="true" />
        Dropper calibration
      </span>
      <span className="flex items-center gap-2 text-[10px] text-slate-400">
        {selectedStyle === 'straight' ? 'Straight' : 'Round'} tip · {dropperRates[selectedStyle].toFixed(1)} drops/mL
        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </summary>
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <HelpTip
          testId="mass-shared-calibration-help"
          label="Dropper calibration explanation"
          text="Weigh plain-water drops while holding the dropper vertically. Record both values for each tip; a tip is calibrated only when both are valid. Finished concentrate can drop differently, so calibrate the prepared stock separately when needed."
        />
        <p className="text-xs text-slate-400">Measure each tip separately.</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(['straight', 'round'] as const).map(style => {
          const calibration = sharedCalibrations[style];
          const measuredRate = lotusMeasuredDropsPerMl(calibration);
          const drops = Number(calibration?.dropsInput ?? 0);
          const weightG = Number(calibration?.weightInput ?? 0);
          const rate = dropperRates[style];
          return <fieldset key={style} className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5">
            <legend className="px-1 text-xs font-semibold capitalize text-slate-200">{style} tip</legend>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {style === 'straight' ? 'Straight' : 'Round'} tip measured drops
              <input aria-label={`${style === 'straight' ? 'Straight' : 'Round'} tip measured drops`}
                className="mt-1 min-h-11 w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none"
                inputMode="decimal" placeholder="e.g. 100" value={calibration?.dropsInput ?? ''}
                onChange={event => onCalibrationChange(style, 'dropsInput', event.target.value)} />
            </label>
            <label className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {style === 'straight' ? 'Straight' : 'Round'} tip water weight in grams
              <span className="mt-1 flex items-center gap-2">
                <input aria-label={`${style === 'straight' ? 'Straight' : 'Round'} tip water weight in grams`}
                  className="min-h-11 w-full bg-transparent text-lg font-semibold tabular-nums text-white outline-none"
                  inputMode="decimal" placeholder="e.g. 5" value={calibration?.weightInput ?? ''}
                  onChange={event => onCalibrationChange(style, 'weightInput', event.target.value)} />
                <span className="text-sm text-slate-400">g</span>
              </span>
            </label>
            <p className="mt-2 text-xs text-slate-400">
              {measuredRate !== null
                ? `${rate.toFixed(1)} drops/mL measured · ${(weightG / drops).toFixed(4)} g/drop`
                : `${rate.toFixed(1)} drops/mL estimated`}
            </p>
          </fieldset>;
        })}
      </div>
      {footer}
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
  const [toolMode, setToolMode] = useState<'recipe' | 'lotus'>(() =>
    props.workspaceMode === 'diy' && initialPlan?.toolMode === 'lotus' ? 'lotus' : 'recipe');
  const [selectedLotusDropperId, setSelectedLotusDropperId] = useState<LotusDropperId>(() => {
    if (initialPlan?.toolMode === 'lotus') {
      return LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.saltId === initialPlan.selectedSaltId)?.id ?? 'magnesium';
    }
    return 'magnesium';
  });
  const [lotusMassInputs, setLotusMassInputs] = useState<Record<string, string>>(() => Object.fromEntries(
    (initialPlan?.groups ?? [])
      .filter(group => group.id.startsWith('lotus-') && Number.isFinite(group.totalStockMassG) && group.totalStockMassG > 0)
      .map(group => [group.id.slice('lotus-'.length), String(group.totalStockMassG)]),
  ));
  const [strategy, setStrategy] = useState<MassConcentratePlanSnapshot['strategy']>(initialPlan?.strategy ?? 'individual');
  const [groups, setGroups] = useState<Record<string, Group>>(() => Object.fromEntries(initialPlan?.groups.map(g => [g.id, g]) ?? []));
  const [saltId, setSaltId] = useState(initialPlan?.selectedSaltId ?? 'mgso4');
  const [forms, setForms] = useState<Record<string, number>>(() => ({
    ...props.diySaltForms, ...Object.fromEntries(Object.entries(initialPlan?.recipe ?? {}).map(([id, row]) => [id, row.formIdx])),
  }));
  const [targetInput, setTargetInput] = useState(String(initialPlan?.recipe?.[initialPlan?.selectedSaltId ?? 'mgso4']?.target ?? (props.diySaltTargets.mgso4 > 0 ? props.diySaltTargets.mgso4 : 30)));
  const [percentInput, setPercentInput] = useState(String(initialPlan?.percentWw ?? 5));
  const [finalVolumeInputs, setFinalVolumeInputs] = useState(() =>
    createVolumeInputValues(String(initialPlan?.finalLiters ?? props.recipeHandoff?.finalLiters ?? props.diyFinalLiters)),
  );
  const finalLitersInput = finalVolumeInputs[props.volumeUnit];
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
  const selectedLotusDropper = LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.id === selectedLotusDropperId)
    ?? LOTUS_DROPPER_DEFINITIONS[0];
  const selectedLotusSalt = SALTS.find(item => item.id === selectedLotusDropper.saltId) ?? SALTS[0];
  const selectedLotusForm = selectedLotusSalt.hydrationForms[selectedLotusSalt.defaultFormIdx ?? 0] ?? selectedLotusSalt.hydrationForms[0];
  const selectedForm = forms[salt.id] ?? salt.defaultFormIdx ?? 0;
  const finalLiters = volumeInputToLiters(finalLitersInput, props.volumeUnit);
  const finalWaterMassKg = waterLitersToEquivalentMassKg(finalLiters);
  const updateFinalLitersInput = (value: string) => {
    setFinalVolumeInputs(previous => updateVolumeInputValue(previous, props.volumeUnit, value));
  };
  const toggleMassVolumeUnit = () => props.onToggleVolumeUnit();
  const isRecipe = props.workspaceMode === 'recipe';
  const recipeTargets = isRecipe
    ? Object.fromEntries(Object.entries(props.recipeHandoff?.salts ?? {}).filter(([, entry]) => Number(entry.target) > 0).map(([id, entry]) => [id, Number(entry.target)]))
    : { [salt.id]: Number(targetInput) };
  const recipeForms = isRecipe ? Object.fromEntries(Object.entries(props.recipeHandoff?.salts ?? {}).map(([id, entry]) => [id, entry.formIdx])) : { [salt.id]: selectedForm };
  const activeSaltIds = Object.keys(recipeTargets).filter(id => recipeTargets[id] > 0);
  const activeGroups: Array<{ id: string; name: string; saltIds: string[] }> = !isRecipe && toolMode === 'lotus'
    ? LOTUS_DROPPER_DEFINITIONS.map(d => ({ id: `lotus-${d.id}`, name: `${d.label} homemade stock`, saltIds: [d.saltId] }))
    : !isRecipe
      ? [{ id: `diy-${salt.id}`, name: 'DIY single-salt concentrate', saltIds: [salt.id] }]
      : strategy === 'all-in-one'
        ? [{ id: 'all-in-one', name: 'All-in-one concentrate', saltIds: activeSaltIds }]
        : strategy === 'gh-kh' ? splitIntoStockGroups(recipeTargets).map(g => ({ ...g, name: g.name.replace('Stock', 'concentrate') }))
          : activeSaltIds.map(id => ({ id, name: `${SALTS.find(s => s.id === id)?.name ?? id} concentrate`, saltIds: [id] }));
  const [sharedCalibrations, setSharedCalibrations] = useState<Record<string, LotusDropperCalibration>>(
    () => loadDiyConcentrateInputs().lotusCalibrationInputs ?? {},
  );
  const shared = sharedCalibrations;
  const selectedLotusCalibrated = lotusMeasuredDropsPerMl(shared[tipKey]) !== null;
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
  const updateLotusMassInput = (value: string) => {
    setLotusMassInputs(previous => ({ ...previous, [selectedLotusDropperId]: value }));
    update(`lotus-${selectedLotusDropperId}`, {
      totalStockMassG: value.trim() === '' ? NaN : Number(value),
      batchScale: 1,
    });
  };
  const actualRecipe = isRecipe ? recipeTargets : { [salt.id]: Number(targetInput) };
  const data: MassConcentratePlanSnapshot = { version: 2, basis: 'mass', workspaceMode: props.workspaceMode, toolMode: isRecipe ? 'recipe' : toolMode,
    selectedSaltId: !isRecipe && toolMode === 'lotus' ? selectedLotusDropper.saltId : salt.id, dropperStyle: tipKey, percentWw: Number(percentInput), strategy, finalLiters,
    recipe: Object.fromEntries(Object.entries(actualRecipe).filter(([, value]) => value > 0).map(([id, target]) => [id, { target, formIdx: recipeForms[id] ?? 0 }])),
    groups: activeGroups
      .filter(g => g.saltIds.length && (
        isRecipe || toolMode !== 'lotus'
        || (groups[g.id] && Number.isFinite(groups[g.id].totalStockMassG) && groups[g.id].totalStockMassG > 0)
      ))
      .map(g => ({ ...groupFor(g.id), saltIds: g.saltIds })),
    ...(legacyOriginal ? { legacyVolumePlan: legacyOriginal } : {}) };
  const dataKey = JSON.stringify(data);
  const diyControls = !isRecipe && toolMode !== 'lotus' ? <>
    <section className="rounded-2xl border border-sky-300/20 bg-slate-900/65 p-4 shadow-xl sm:p-5" data-testid="mass-stock-composition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Beaker className="h-4 w-4 text-sky-300" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-100">Stock composition</h2>
        </div>
        <span className="rounded-full border border-sky-300/20 bg-sky-300/[0.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200">Selected</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="rounded-xl border border-sky-300/20 bg-slate-950/30 px-3 py-2.5 text-xs transition-colors" style={{ color: getSaltColorTokens(salt).primary }}>
          <span className="block text-[10px] font-semibold uppercase tracking-wider">Mineral</span>
          <select aria-label="DIY concentrate salt" className="mt-1 w-full bg-transparent text-sm font-semibold outline-none" value={salt.id}
            onChange={event => { setSaltId(event.target.value); setTargetInput(String(props.diySaltTargets[event.target.value] || 30)); }}>
            {SALTS.filter(item => !['mgoh2', 'caco3'].includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="rounded-xl border border-emerald-300/20 bg-slate-950/30 px-3 py-2.5 text-xs transition-colors">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Hydration form</span>
          <select aria-label="DIY concentrate hydration form" className="mt-1 w-full bg-transparent text-sm font-semibold text-emerald-100 outline-none"
            value={selectedForm} onChange={event => setForms(previous => ({ ...previous, [salt.id]: Number(event.target.value) }))}>
            {salt.hydrationForms.map((form, index) => <option key={form.label} value={index}>{form.label}</option>)}
          </select>
        </label>
      </div>
    </section>
    <SharedDropperCalibrationPanel
      dropperRates={dropperRates}
      sharedCalibrations={shared}
      selectedStyle={tipKey}
      onCalibrationChange={updateSharedCalibration}
      footer={
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-300/15 bg-slate-950/35 px-3 py-2.5" data-testid="mass-dosing-tip-selection">
          <label className="min-w-40 text-xs font-semibold text-sky-100">
            Stock dropper tip
            <select aria-label="Stock dropper tip" className={inputClass} value={tipKey}
              onChange={event => setTipKey(event.target.value as LotusDropperStyle)}>
              <option value="straight">Straight tip</option>
              <option value="round">Round tip</option>
            </select>
          </label>
          <p className="text-xs text-slate-400" data-testid="mass-selected-dropper-rate">
            {dropperRates[tipKey].toFixed(1)} drops/mL · {lotusMeasuredDropsPerMl(shared[tipKey]) !== null ? 'Calibrated' : 'Estimated'}
          </p>
        </div>
      }
    />
  </> : null;

  const applyPlan = (plan: MassConcentratePlanSnapshot) => {
    setGroups(Object.fromEntries(plan.groups.map(g => [g.id, g]))); setStrategy(plan.strategy);
    setToolMode(props.workspaceMode === 'diy' && plan.toolMode === 'lotus' ? 'lotus' : 'recipe');
    if (props.workspaceMode === 'diy' && plan.toolMode === 'lotus') {
      setSelectedLotusDropperId(LOTUS_DROPPER_DEFINITIONS.find(dropper => dropper.saltId === plan.selectedSaltId)?.id ?? 'magnesium');
      setLotusMassInputs(Object.fromEntries(plan.groups
        .filter(group => group.id.startsWith('lotus-') && Number.isFinite(group.totalStockMassG) && group.totalStockMassG > 0)
        .map(group => [group.id.slice('lotus-'.length), String(group.totalStockMassG)])));
    }
    setFinalVolumeInputs(previous => ({ ...previous, liters: String(plan.finalLiters) }));
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
  return <div className={`concentrate-workspace ${!isRecipe && toolMode === 'lotus' ? 'space-y-3 sm:space-y-4' : 'space-y-4'}`}>
    <div className="app-panel app-panel--quiet app-card rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-300" aria-hidden="true" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isRecipe ? 'Recipe concentrate workspace' : toolMode === 'lotus' ? 'DIY concentrate workspace' : 'Concentrates / DIY stock'}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {isRecipe
                ? 'Build and calibrate the concentrate for the imported calculator recipe.'
                : toolMode === 'lotus'
                  ? 'Prepare one Lotus-style mineral stock at a time.'
                  : <h2 className="block text-lg font-semibold tracking-tight text-slate-50">Build a single-salt stock</h2>}
            </div>
          </div>
        </div>
        <div data-testid="concentrate-header-actions" className="flex w-full items-center justify-end gap-2 sm:w-auto">
          {!isRecipe && <div role="tablist" aria-label="DIY concentrate workspace" className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
            <button type="button" role="tab" aria-selected={toolMode !== 'lotus'} onClick={() => setToolMode('recipe')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${toolMode !== 'lotus' ? 'border border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200 shadow-sm' : 'border border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
              Stock builder
            </button>
            <button type="button" role="tab" aria-selected={toolMode === 'lotus'} onClick={() => setToolMode('lotus')}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${toolMode === 'lotus' ? 'border border-rose-400/40 bg-rose-500/15 text-rose-200 shadow-sm' : 'border border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}`}>
              DIY Lotus Drops
            </button>
          </div>}
          {isRecipe && <button className={buttonClass} onClick={props.onClearRecipeHandoff}>Clear recipe</button>}
        </div>
      </div>
    </div>
    {!isRecipe && toolMode === 'lotus' && <section className="rounded-2xl border border-rose-300/20 bg-gradient-to-br from-rose-400/[0.08] via-slate-800/75 to-amber-400/[0.045] p-4 shadow-xl sm:p-5" data-testid="lotus-selected-dropper">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Pipette className="h-4 w-4 text-rose-200" aria-hidden="true" /> Dropper setup
        </h2>
        <span
          data-testid="lotus-selected-calibration-status"
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
            selectedLotusCalibrated
              ? 'border-emerald-300/25 bg-emerald-400/10 text-emerald-200'
              : 'border-amber-300/25 bg-amber-400/10 text-amber-200'
          }`}
        >
          {selectedLotusCalibrated
            ? `${tipKey === 'straight' ? 'Straight' : 'Round'} calibrated`
            : 'Not calibrated'}
        </span>
      </div>
      <div className="mt-3 grid items-start gap-2 sm:grid-cols-[1.15fr_1fr]">
        <label className="block min-w-0 rounded-xl border border-rose-200/15 bg-slate-950/35 px-3 py-2.5 text-xs font-semibold text-slate-300" data-testid="lotus-dropper-field">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-100/75">Dropper to prepare</span>
          <select aria-label="Dropper to prepare" data-testid="lotus-dropper-select" className={`${inputClass} min-h-12`}
            value={selectedLotusDropperId}
            onChange={event => setSelectedLotusDropperId(event.target.value as LotusDropperId)}>
            {LOTUS_DROPPER_DEFINITIONS.map(dropper => (
              <option key={dropper.id} value={dropper.id}>
                {dropper.label}{dropper.isBonus ? ' · optional, not Lotus' : ''}
              </option>
            ))}
          </select>
        </label>
        <div
          className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-950/35 p-2.5"
          data-testid="lotus-selected-mineral"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Selected mineral</div>
              <span className="mt-1 block min-w-0">
                <strong className="block text-sm" style={{ color: getSaltColorTokens(selectedLotusSalt).primary }}>{selectedLotusSalt.name}</strong>
                <span className="text-[10px] text-slate-400">{selectedLotusSalt.formula} · {selectedLotusForm?.label}</span>
              </span>
              {selectedLotusDropper.isBonus && (
                <span className="mt-1 inline-flex rounded-full border border-amber-300/25 bg-amber-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-amber-200">
                  Bonus · not Lotus
                </span>
              )}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-1 rounded-lg border border-slate-700/70 bg-slate-900/70 p-1" role="group" aria-label="Lotus dropper tip style">
              {(['straight', 'round'] as const).map(style => (
                <button key={style} type="button" aria-pressed={tipKey === style} onClick={() => setTipKey(style)}
                  className={`min-h-10 rounded-md px-3 py-2 text-xs font-semibold capitalize transition ${
                    tipKey === style
                      ? 'bg-cyan-400/10 text-cyan-100 shadow-sm ring-1 ring-cyan-200/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}>
                  {style === 'straight' ? 'Straight' : 'Round'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <SharedDropperCalibrationPanel
        dropperRates={dropperRates}
        sharedCalibrations={shared}
        selectedStyle={tipKey}
        onCalibrationChange={updateSharedCalibration}
      />
    </section>}
    {isRecipe ? <section className="app-panel app-panel--quiet app-card space-y-4 rounded-2xl border px-4 py-4 shadow-xl backdrop-blur-xl sm:px-6">
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
            value={finalLitersInput}
            onChange={e => updateFinalLitersInput(e.target.value)} />
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
    </section> : null}
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
      {!isRecipe && toolMode === 'lotus' ? (
        <LotusMassPreparationPanel
          dropper={selectedLotusDropper}
          style={tipKey}
          fallbackStraightDropsPerMl={props.dropsPerMl}
          calibration={shared[tipKey]}
          massInput={lotusMassInputs[selectedLotusDropperId] ?? ''}
          onMassInputChange={updateLotusMassInput}
        />
      ) : activeGroups.map(g => {
        const state = groupFor(g.id);
        let targets = Object.fromEntries(g.saltIds.map(id => [id, recipeTargets[id] ?? 0]));
        let groupForms = Object.fromEntries(g.saltIds.map(id => [id, recipeForms[id] ?? SALTS.find(s => s.id === id)?.defaultFormIdx ?? 0]));
        const lotus = !isRecipe && toolMode === 'lotus';
        let strength = state.strength * (state.batchScale ?? 1);
        if (lotus) {
          const def = LOTUS_DROPPER_DEFINITIONS.find(d => `lotus-${d.id}` === g.id)!;
          const stock = lotusMassStockPlan(def, state.totalStockMassG);
          groupForms = { [def.saltId]: SALTS.find(s => s.id === def.saltId)?.defaultFormIdx ?? 0 };
          targets = { [def.saltId]: stock.valid ? stock.anhydrousEquivalentMassMg : NaN };
          strength = 1;
        }
        if (!lotus && (state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop)) {
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
          onFinalLitersChange={updateFinalLitersInput}
          onToggleVolumeUnit={toggleMassVolumeUnit} tipKey={tipKey} waterEstimate={waterEstimate} percentMode={lotus} editableRecipeDose={isRecipe}
          onUpdate={patch => update(g.id, patch)} showSteps={showSteps} allowSaltMassEdit={isRecipe && strategy === 'individual'} diySingleSalt={!isRecipe && toolMode !== 'lotus'} diyControls={diyControls} />;
      })}
      {isRecipe && <button className={buttonClass} aria-label="Open concentrate recipe steps" onClick={() => setShowSteps(v => !v)}>{showSteps ? 'Hide recipe steps' : 'Recipe steps'}</button>}
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

function MassStockCard({ name, state, saltTargets, forms, strength, finalLiters, finalWaterMassKg, finalLitersInput, volumeUnit, onFinalLitersChange, onToggleVolumeUnit, tipKey, waterEstimate, onUpdate, percentMode, editableRecipeDose, showSteps, allowSaltMassEdit, diySingleSalt, diyControls }: {
  name: string; state: Group; saltTargets: Record<string, number>; forms: Record<string, number>; strength: number; finalLiters: number; finalWaterMassKg: number;
  finalLitersInput: string; volumeUnit: 'liters' | 'gallons'; onFinalLitersChange: (value: string) => void; onToggleVolumeUnit: () => void;
  tipKey: 'straight' | 'round';
  waterEstimate: StockDropCalibration; onUpdate: (patch: Partial<Group>) => void; percentMode: boolean; editableRecipeDose: boolean; showSteps: boolean; allowSaltMassEdit: boolean; diySingleSalt: boolean; diyControls: ReactNode;
}) {
  const [massInput, setMassInput] = useState(String(state.totalStockMassG));
  const [strengthInput, setStrengthInput] = useState(String(state.strength));
  const initialDoseMassG = state.totalStockMassG / strength * finalWaterMassKg;
  const [doseMassInput, setDoseMassInput] = useState(
    Number.isFinite(initialDoseMassG) && initialDoseMassG > 0 ? String(initialDoseMassG) : '',
  );
  const [dropsInput, setDropsInput] = useState(state.calibration?.basis === 'stock' ? String(state.calibration.drops) : '');
  const [weighedInput, setWeighedInput] = useState(state.calibration?.basis === 'stock' ? String(state.calibration.massG) : '');
  const [targetMgInput, setTargetMgInput] = useState(String(state.desiredSaltMassMg ?? 40));
  const initialSaltId = Object.keys(saltTargets)[0] ?? '';
  const canUseCaCo3Target = Object.keys(saltTargets).length === 1
    && physicalSaltCaCo3EquivalentFactor(initialSaltId, forms[initialSaltId] ?? 0) > 0;
  const [dropTargetInput, setDropTargetInput] = useState(String(state.caCo3PpmPerDrop ?? state.physicalSaltPpmPerDrop ?? (canUseCaCo3Target ? 5 : 1)));
  const [dropBasis, setDropBasis] = useState<'salt-mg' | 'caco3'>(state.caCo3PpmPerDrop ? 'caco3' : state.physicalSaltPpmPerDrop ? 'salt-mg' : canUseCaCo3Target ? 'caco3' : 'salt-mg');
  const [calibrationError, setCalibrationError] = useState('');
  const [strengthMessage, setStrengthMessage] = useState('');
  const [jpgStatus, setJpgStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const preparationCardRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (Number.isFinite(state.totalStockMassG) && state.totalStockMassG > 0) {
      setMassInput(String(state.totalStockMassG));
    }
    setStrengthInput(String(state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop ? strength : state.strength));
  }, [state.totalStockMassG, state.strength, state.physicalSaltPpmPerDrop, state.caCo3PpmPerDrop, strength]);
  useEffect(() => {
    if (!Number.isFinite(state.totalStockMassG) || state.totalStockMassG <= 0 || !Number.isFinite(strength) || strength <= 0) return;
    const doseGramsPerLiter = state.totalStockMassG / strength;
    const doseMassG = doseGramsPerLiter * finalWaterMassKg;
    if (Number.isFinite(doseMassG) && doseMassG > 0) {
      setDoseMassInput(n(doseMassG, 6));
    }
  }, [state.totalStockMassG, strength, finalWaterMassKg]);
  const salts = recipeStockSaltMasses(saltTargets, forms, strength);
  const equivalentFactor = salts.length === 1 ? physicalSaltCaCo3EquivalentFactor(salts[0].saltId, forms[salts[0].saltId] ?? 0) : 0;
  const compositionKey = stockCompositionKey(salts, state.totalStockMassG, forms);
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
  const parsedDoseMassG = doseMassInput.trim() === '' ? Number.NaN : Number(doseMassInput);
  const parsedDoseGramsPerLiter = Number.isFinite(finalWaterMassKg) && finalWaterMassKg > 0
    ? parsedDoseMassG / finalWaterMassKg
    : Number.NaN;
  const requestedDoseStrength = computeRecipeMassStrengthForDose({
    totalStockMassG: state.totalStockMassG,
    doseGramsPerLiter: parsedDoseGramsPerLiter,
  });
  const doseExceedsSafeRecommendation = editableRecipeDose && requestedDoseStrength.valid
    && (recommendedStrength === null || requestedDoseStrength.strength > recommendedStrength);
  const safeDoseGramsPerLiter = recommendedStrength && recommendedStrength > 0
    ? state.totalStockMassG / recommendedStrength
    : null;
  const blocked = !result.valid || warnings.some(w => w.severity === 'error');
  const saltLabel = salts.map(s => `${n(s.physicalMassMg / 1000)} g ${SALTS.find(item => item.id === s.saltId)?.name ?? s.saltId}`).join(' + ');
  const doseMassG = result.valid ? percentMode ? Number(targetMgInput) / result.totalSaltMgPerStockG : result.doseMassG : NaN;
  const diyPpmCaCo3PerDrop = preparedMass && equivalentFactor > 0 && preparedMass.totalSaltMgPerDrop !== null
    ? preparedMass.totalSaltMgPerDrop * equivalentFactor / finalWaterMassKg : null;
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
  if (diySingleSalt) return <div data-testid="mass-stock-card">
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(390px,0.94fr)]" data-testid="mass-diy-layout">
    <div className="space-y-4" data-testid="mass-diy-controls">
      {diyControls}
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
              value={finalLitersInput}
              onChange={e => onFinalLitersChange(e.target.value)} />
            <span className="text-sm text-slate-400">{volumeUnit === 'gallons' ? 'US gal' : 'L'}</span>
          </span>
        </label>
      </div>
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
              setStrengthMessage('Strength changed. Verify drops with the newly prepared finished stock.');
              setCalibrationError('');
            } else setStrengthMessage(next.reason);
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
        {diyPpmCaCo3PerDrop !== null && <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-emerald-200/15 bg-slate-950/25 px-3 py-2" data-testid="mass-diy-per-drop-equivalent">
          <div>
            <p className="text-[10px] font-semibold text-emerald-100">CaCO₃-equivalent per drop</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-emerald-200">+{n(diyPpmCaCo3PerDrop)} ppm <span className="text-[10px] font-normal text-slate-400">in {n(finalLiters)} L</span></p>
          </div>
          <span className="shrink-0 text-[10px] font-medium text-slate-400">{measured.basis === 'stock' ? 'Measured stock' : 'Estimated'}</span>
        </div>}
        <details className="mt-2 rounded-lg border border-emerald-200/15 bg-slate-950/20 px-3 py-2" data-testid={`mass-stock-dose-details-${state.id}`}>
          <summary className="cursor-pointer text-xs text-emerald-100/80">Dose details</summary>
          {Number.isFinite(exactDrops) && <p className="mt-2 text-xs">Exact: {n(exactDrops)} drops · Rounded: {roundedDrops} drops → {n(physicalDeliveredMg)} mg physical salt ({n(physicalDeliveredMg / finalWaterMassKg)} mg/L).</p>}
          {recipeDeliveredIons && <p className="mt-1 text-xs text-slate-300">Rounded-drop ions: {recipeDeliveredIons}</p>}
          {diyPpmCaCo3PerDrop !== null && <p className="mt-1 text-xs text-slate-300">The CaCO₃-equivalent per-drop value is a planning reference, not an additional ion or independent GH/KH target.</p>}
          {(state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop) && <p className="mt-1 text-xs text-amber-100">
            Pinned planning target: {n(state.caCo3PpmPerDrop ?? state.physicalSaltPpmPerDrop!)} {state.caCo3PpmPerDrop ? 'ppm CaCO₃-equivalent' : 'mg/L physical salt'} per drop. Stock weight, final-water amount, and water-tip estimate update the planned strength. Verify the newly prepared stock before relying on drops.
          </p>}
        </details>
      </div>}
    </section>

    {strengthMessage && <p role="status" className="text-xs text-amber-200">{strengthMessage}</p>}
    </div>
    <div className="space-y-4 lg:sticky lg:top-4" data-testid="mass-diy-preparation">
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
    </section>

    {state.calibration && measured.basis === 'unavailable' && <p className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-3 text-xs text-amber-200">The stock composition or tip changed. Recalibrate this finished stock before using measured drops.</p>}
    <details className="rounded-xl border border-sky-300/20 bg-slate-900/55 p-4" data-testid="mass-stock-calibration">
      <summary className="cursor-pointer text-sm font-semibold text-sky-100">
        Calibrate this finished stock by weight
        <span className="mt-1 block text-xs font-normal text-slate-400">Separate from water-tip calibration</span>
      </summary>
      <p className="mt-3 text-xs text-slate-400">Tare a receiving cup. Hold the dropper vertically and weigh counted drops of this actual finished stock. Use the same tip. This calibration is saved to this stock separately from the shared water calibration.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs">Counted stock drops<input aria-label={`${name} counted stock drops`} className={inputClass} value={dropsInput} onChange={event => setDropsInput(event.target.value)} /></label>
        <label className="text-xs">Measured stock weight (g)<input aria-label={`${name} measured stock weight`} className={inputClass} value={weighedInput} onChange={event => setWeighedInput(event.target.value)} /></label>
      </div>
      <button type="button" className={`${buttonClass} mt-3`} onClick={() => {
        if (![Number(dropsInput), Number(weighedInput)].every(value => Number.isFinite(value) && value > 0)) { setCalibrationError('Enter a positive drop count and actual stock weight.'); return; }
        onUpdate({ calibration: { basis: 'stock', drops: Number(dropsInput), massG: Number(weighedInput), compositionKey, tipKey } });
        setCalibrationError('');
      }}>Use measured stock calibration</button>
      {calibrationError && <p role="status" className="mt-2 text-xs text-amber-200">{calibrationError}</p>}
    </details>

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
    </div>
    </div>
  </div>;
  return <article className="space-y-4" data-testid="mass-stock-card">
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(390px,0.94fr)]" data-testid={`mass-recipe-layout-${state.id}`}>
      <div className="space-y-4" data-testid={`mass-recipe-controls-${state.id}`}>
        <section className="rounded-2xl border border-slate-700/60 bg-slate-800/70 p-4 shadow-xl sm:p-5">
          <h3 className="font-semibold text-fuchsia-100">{name}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5 text-xs">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Concentrate weight</span>
              <span className="mt-1 flex items-center gap-2">
                <input aria-label={`${name} target stock weight in grams`} className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none" inputMode="decimal" placeholder="e.g. 100" value={massInput}
                  onChange={e => {
                    const value = e.target.value;
                    const totalStockMassG = value.trim() ? Number(value) : Number.NaN;
                    setMassInput(value);
                    const patch: Partial<Group> = { totalStockMassG, batchScale: 1 };
                    if (editableRecipeDose && !state.physicalSaltPpmPerDrop && !state.caCo3PpmPerDrop) {
                      const next = computeRecipeMassStrengthForDose({
                        totalStockMassG,
                        doseGramsPerLiter: parsedDoseGramsPerLiter,
                      });
                      if (next.valid) patch.strength = next.strength;
                    }
                    onUpdate(patch);
                  }} />
                <span className="text-sm text-slate-400">g</span>
              </span>
            </label>
            {!percentMode && <label className="rounded-xl border border-slate-700/60 bg-slate-950/25 px-3 py-2.5 text-xs">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Recipe strength</span>
              <span className="mt-1 flex items-center gap-2">
                <input aria-label={`${name} recipe strength`} className="w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none" inputMode="decimal" value={strengthInput}
                  onChange={e => { setStrengthInput(e.target.value); onUpdate({ strength: e.target.value.trim() ? Number(e.target.value) : NaN, batchScale: 1, physicalSaltPpmPerDrop: undefined, caCo3PpmPerDrop: undefined }); }} />
                <span className="text-sm text-slate-400">×</span>
              </span>
              <span className="mt-1 block text-[10px] text-slate-500">One-liter recipe equivalents</span>
            </label>}
          </div>
          {!result.valid ? <p role="alert" className="mt-3 text-sm text-red-200">{result.reason}</p> : <>
            <div className="mt-3 rounded-xl border border-slate-700/60 bg-slate-950/25 p-3">
              <p className="text-xs text-slate-400">{n(result.strengthPercentWw)}% w/w · {n(result.totalSaltMgPerStockG)} mg salt / g stock</p>
              <div className="mt-2 space-y-2">{salts.map(s => {
                const salt = SALTS.find(item => item.id === s.saltId)!;
                const form = salt.hydrationForms[forms[salt.id] ?? salt.defaultFormIdx ?? 0];
                return <div key={salt.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span style={{ color: getSaltColorTokens(salt).primary }}>{salt.name} <small className="text-slate-400">({form?.label})</small></span>
                  {allowSaltMassEdit && salts.length === 1 ? <label className="text-xs">Salt mass (g)<input aria-label={`${name} salt mass in grams`} className={`${inputClass} max-w-32`} inputMode="decimal" value={n(s.physicalMassMg / 1000, 6)}
                    onChange={e => { const next = Number(e.target.value); if (Number.isFinite(next) && next > 0 && s.physicalMassMg > 0) {
                      const scaled = scaleMassStockForSaltEdit(state, s.physicalMassMg / 1000, next);
                      if (scaled) onUpdate({ ...scaled, strength: state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop ? strength : state.strength, physicalSaltPpmPerDrop: undefined, caCo3PpmPerDrop: undefined });
                    } }} /></label>
                    : <strong>{n(s.physicalMassMg / 1000)} g</strong>}
                </div>;
              })}</div>
            </div>
            {(state.batchScale ?? 1) !== 1 && <p className="text-xs text-slate-400">Prepared batch scaled ×{n(state.batchScale ?? 1)} at unchanged mass fraction. This bottle contains ×{n(strength)} one-liter recipe equivalents; the reference strength control stays ×{n(state.strength)}.</p>}
            {(state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop) && <p className="text-xs text-amber-100">Pinned target: {n(state.caCo3PpmPerDrop ?? state.physicalSaltPpmPerDrop!)} {state.caCo3PpmPerDrop ? 'ppm CaCO₃-equivalent' : 'mg/L physical salt'} per drop.</p>}
            <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-slate-950/50 p-3 text-sm">
              <span>Water <strong className="block text-cyan-200">{n(result.waterMassG)} g</strong></span>
              <span>Total contents <strong className="block text-fuchsia-100">{n(result.totalStockMassG)} g</strong></span>
            </div>
          </>}
        </section>

        <section className="rounded-2xl border border-cyan-300/25 bg-slate-800/70 p-4 shadow-xl sm:p-5">
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-cyan-200/70">
            <Droplet className="h-4 w-4 text-cyan-300/80" aria-hidden="true" />
            <span>Desired dose</span>
            <HelpTip testId={`mass-dose-help-${state.id}`} label="Dose target explanation"
              text="Choose whether the per-drop target is expressed as CaCO₃-equivalent ppm or physical salt mg/L. The planned strength uses your stock weight and water calibration; verify drops with the finished stock before relying on them." />
          </div>
          {percentMode && <label className="mt-3 block rounded-xl border border-cyan-200/20 bg-slate-950/25 px-3 py-2.5">
            <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Desired physical salt dose (mg)</span>
            <input aria-label={`${name} desired salt dose in milligrams`} className="mt-1 w-full bg-transparent text-xl font-semibold tabular-nums text-white outline-none" value={targetMgInput}
              onChange={e => { setTargetMgInput(e.target.value); onUpdate({ desiredSaltMassMg: e.target.value.trim() ? Number(e.target.value) : NaN }); }} />
          </label>}
          {!percentMode && <>
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
                  setStrengthMessage('Strength changed. Verify drops with the newly prepared finished stock.');
                  setCalibrationError('');
                } else setStrengthMessage(next.reason);
              }}>Set strength from drop target</button>
          </>}
          {(state.physicalSaltPpmPerDrop || state.caCo3PpmPerDrop) && <p className="mt-2 text-xs text-amber-100">
            Pinned target: {n(state.caCo3PpmPerDrop ?? state.physicalSaltPpmPerDrop!)} {state.caCo3PpmPerDrop ? 'ppm CaCO₃-equivalent' : 'mg/L physical salt'} per drop.
          </p>}
          {(!Number.isFinite(doseMassG) || doseMassG <= 0) && <p role="alert" className="mt-3 text-xs text-red-200">Enter a positive, finite salt dose and brewing-water amount.</p>}
          {(editableRecipeDose || (!blocked && Number.isFinite(doseMassG) && doseMassG > 0)) && <div
            data-testid={editableRecipeDose ? 'recipe-dose-result' : undefined}
            className={`mt-3 rounded-xl border p-4 text-sm ${
              doseExceedsSafeRecommendation
                ? 'border-amber-300/30 bg-amber-400/[0.08]'
                : 'border-emerald-400/30 bg-emerald-400/10'
            }`}
          >
            {editableRecipeDose && <div className="flex flex-wrap items-center gap-2">
              <label className="flex flex-wrap items-baseline gap-x-1.5 font-medium text-emerald-100">
                <span>Dose</span>
                <input
                  aria-label={`${name} dose in grams`}
                  data-testid={`recipe-dose-grams-${state.id}`}
                  className="min-w-[1ch] border-0 bg-transparent p-0 text-right text-lg font-bold tabular-nums text-emerald-200 outline-none focus-visible:underline focus-visible:decoration-emerald-200 focus-visible:underline-offset-4"
                  style={{ width: `${Math.max(1, doseMassInput.length)}ch` }}
                  inputMode="decimal"
                  value={doseMassInput}
                  onChange={event => {
                    const value = event.target.value;
                    setDoseMassInput(value);
                    const requestedDoseMassG = value.trim() === '' ? Number.NaN : Number(value);
                    const next = computeRecipeMassStrengthForDose({
                      totalStockMassG: state.totalStockMassG,
                      doseGramsPerLiter: Number.isFinite(finalWaterMassKg) && finalWaterMassKg > 0
                        ? requestedDoseMassG / finalWaterMassKg
                        : Number.NaN,
                    });
                    if (next.valid) {
                      onUpdate({
                        strength: next.strength,
                        batchScale: 1,
                        physicalSaltPpmPerDrop: undefined,
                        caCo3PpmPerDrop: undefined,
                      });
                      setCalibrationError('');
                    }
                  }}
                />
                <span>g stock for {n(finalLiters)} L brewing water.</span>
              </label>
            </div>}
            {editableRecipeDose && !requestedDoseStrength.valid && <p role="alert" data-testid="recipe-dose-input-error" className="mt-2 text-xs text-red-200">
              Enter a positive, finite dose in g/L. The last valid stock strength remains in use.
            </p>}
            {doseExceedsSafeRecommendation && <div role="alert" data-testid="recipe-dose-safety" className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/[0.08] p-3 text-xs text-amber-100">
              <p>This dose makes the stock too concentrated for the conservative modeled safety recommendation.</p>
              {safeDoseGramsPerLiter !== null
                ? <p className="mt-1">Use at least <strong>{n(safeDoseGramsPerLiter, 5)} g/L</strong> (about {n(safeDoseGramsPerLiter * finalWaterMassKg, 5)} g for this brew) at up to ×{n(recommendedStrength!)} strength to preserve the recipe target.</p>
                : <p className="mt-1">No safe grams-per-liter recommendation is available for this stock weight and recipe. Increase the stock weight or revise the recipe.</p>}
            </div>}
            {!blocked && Number.isFinite(doseMassG) && doseMassG > 0 && <>
              {!editableRecipeDose && <p>Dose <strong className="text-lg text-emerald-200">{n(doseMassG, 5)} g stock</strong> for {n(finalLiters)} L brewing water.</p>}
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
            </>}
          </div>}
          {strengthMessage && <p role="status" className="mt-2 text-xs text-amber-200">{strengthMessage}</p>}
        </section>
      </div>

      <div className="space-y-4" data-testid={`mass-recipe-preparation-${state.id}`}>
        <section ref={preparationCardRef} className="rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/[0.08] via-slate-800/75 to-slate-800/70 p-4 shadow-xl sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-200/75">
              <ListChecks className="h-4 w-4 text-emerald-200/80" aria-hidden="true" />
              <span>Preparation</span>
            </div>
            <span className="text-right text-[10px] text-slate-400">Salt + water · not the bottle</span>
          </div>
          <h4 className="mt-1 text-base font-semibold text-white">Make this concentrate</h4>
          {!blocked && (showSteps || percentMode) && <div className="mt-3">
            <ConcentratePreparationSteps totalStockMassG={result.totalStockMassG} waterMassG={result.waterMassG} saltLabel={saltLabel} />
          </div>}
          {preparedMass && <div className={`mt-3 flex items-center justify-between gap-3 rounded-xl border px-3 py-3 ${willDissolve ? 'border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-50' : 'border-rose-300/30 bg-rose-400/[0.08] text-rose-50'}`}>
            <span className="flex items-center gap-2">
              {willDissolve ? <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 text-rose-300" aria-hidden="true" />}
              {willDissolve ? 'Dissolves at this concentration' : 'May not fully dissolve'}
            </span>
            <strong className="text-right text-[10px] tabular-nums">{saltGPer100MlWater.toFixed(2)} / {solubilityLimitGPer100Ml == null ? '—' : solubilityLimitGPer100Ml.toFixed(2)} g per 100 mL</strong>
          </div>}
          {warnings.map((warning, i) => <p key={i} role={warning.severity === 'error' ? 'alert' : undefined}
            className={`mt-2 text-xs ${warning.severity === 'error' ? 'text-red-200' : warning.severity === 'warning' ? 'text-amber-200' : 'text-slate-400'}`}>{warning.message}</p>)}
          {preparedMass && <button className="mt-3 rounded-lg border border-emerald-200/25 bg-slate-950/25 px-3 py-2 text-xs font-semibold text-emerald-100 hover:border-emerald-200/55 hover:bg-emerald-400/10"
            disabled={blocked || !Number.isFinite(doseMassG) || doseMassG <= 0} onClick={() => downloadText(`${state.id}-stock-preparation.txt`,
              [name, `${n(preparedMass.strengthPercentWw)}% w/w; total stock ${n(preparedMass.totalStockMassG)} g`,
                ...buildConcentratePreparationSteps({ totalStockMassG: preparedMass.totalStockMassG, waterMassG: preparedMass.waterMassG, saltLabel }),
                WATER_MASS_NOTE, `Dose ${n(doseMassG)} g stock for ${n(finalLiters)} L. Drops: ${measured.basis === 'stock' ? 'measured finished-stock' : 'water-based estimate; verify finished stock'}.`,
                ...warnings.map(w => w.message)].join('\n\n'))}>Download preparation text</button>}
        </section>

        <details className="rounded-xl border border-sky-300/20 bg-slate-900/55 p-4" data-testid="mass-stock-calibration">
          <summary className="cursor-pointer text-sm font-semibold text-sky-100">
            Calibrate this finished stock by weight
            <span className="mt-1 block text-xs font-normal text-slate-400">Separate from water-tip calibration</span>
          </summary>
          <p className="mt-3 text-xs text-slate-400">Tare a receiving cup. Hold the dropper vertically and weigh counted drops of this actual finished stock. Use the same tip. This calibration is saved to this stock separately from the shared water calibration.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs">Counted stock drops<input aria-label={`${name} counted stock drops`} className={inputClass} value={dropsInput} onChange={event => setDropsInput(event.target.value)} /></label>
            <label className="text-xs">Measured stock weight (g)<input aria-label={`${name} measured stock weight`} className={inputClass} value={weighedInput} onChange={event => setWeighedInput(event.target.value)} /></label>
          </div>
          <button type="button" className={`${buttonClass} mt-3`} onClick={() => {
            if (![Number(dropsInput), Number(weighedInput)].every(value => Number.isFinite(value) && value > 0)) { setCalibrationError('Enter a positive drop count and actual stock weight.'); return; }
            onUpdate({ calibration: { basis: 'stock', drops: Number(dropsInput), massG: Number(weighedInput), compositionKey, tipKey } });
            setCalibrationError('');
          }}>Use measured stock calibration</button>
          {calibrationError && <p role="status" className="mt-2 text-xs text-amber-200">{calibrationError}</p>}
        </details>

        <details className="rounded-2xl border border-slate-700/60 bg-slate-900/45 p-4" data-testid="mass-stock-advanced-strength">
          <summary className="cursor-pointer text-sm font-semibold text-slate-200">Advanced stock safety</summary>
          <div className="mt-3 space-y-3">
            {!percentMode && <div className="space-y-2">
              <button className={buttonClass} disabled={recommendedStrength === null} onClick={() => onUpdate({ strength: recommendedStrength!, batchScale: 1, physicalSaltPpmPerDrop: undefined, caCo3PpmPerDrop: undefined })}>
                {recommendedStrength === null ? 'No concern-free recommendation at this weight' : `Use conservative recommendation ×${recommendedStrength}`}
              </button>
              <p className="text-xs text-slate-400">Uses the existing safety margin and ×500 model cap, plus at least one planning drop for 0.1 L. This is an estimate, not a stability guarantee.</p>
            </div>}
          </div>
        </details>
      </div>
    </div>
  </article>;
}

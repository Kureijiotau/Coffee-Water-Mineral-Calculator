import { useEffect, useRef, useState } from 'react';
import { SALTS, getSaltColorTokens, splitIntoStockGroups, type SaltRecipeEntry } from './waterData';
import { buildMassStockPlan, computeRecipeMassDropEquivalents, recipeStockSaltMasses, stockCompositionKey,
  resolveStockDropCalibration, computeRecipeMassStrengthForPhysicalSaltPpm, scaleMassStockForSaltEdit, type StockDropCalibration } from './concentrateMass';
import { checkMassConcentrate, recommendMassConcentrateStrength } from './concentrateMassWarnings';
import { ConcentratePreparationSteps, buildConcentratePreparationSteps, WATER_MASS_NOTE } from './concentratePreparation';
import { readConcentrateStockRecord, readStandaloneMassSnapshot, isRecord, type MassConcentratePlanSnapshot } from './concentrateStockStorage';
import { ACCOUNT_SYNC_REMOTE_CHANGE_EVENT, loadDiyConcentrateInputs, saveDiyConcentrateInputs } from './accountSyncStorage';
import { lotusMassStockPlan, LOTUS_DROPPER_DEFINITIONS, getDiyDropperRateForStyle } from './lotusConcentrate';
import type { WaterPlanConcentrateSnapshot } from './waterPlans';

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
function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function readInitial(props: Props) {
  const candidate = props.restoreSnapshot ?? props.initialSnapshot;
  const standalone = props.restoreSnapshot ? readStandaloneMassSnapshot(props.restoreSnapshot) : null;
  if (standalone) return { kind: 'mass' as const, plan: standalone };
  const raw = props.workspaceMode === 'diy' && !props.restoreSnapshot
    ? loadDiyConcentrateInputs().massStockPlan ?? candidate.recipeConcentratePlan : candidate.recipeConcentratePlan;
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
  const [tipKey, setTipKey] = useState<'straight' | 'round'>(() => initialPlan?.groups.some(g => g.calibration?.tipKey === 'round') ? 'round' : 'straight');
  const [legacy, setLegacy] = useState<Record<string, unknown> | null>(() => {
    if (initial.kind === 'legacy-volume') return initial.original;
    const old = loadDiyConcentrateInputs();
    return props.workspaceMode === 'diy' && !old.massStockPlan && old.stockVolumeInput
      ? { stockVolumeInput: old.stockVolumeInput, note: 'Historical DIY/Lotus water/volume input; not total finished stock grams.' } : null;
  });
  const [legacyOriginal, setLegacyOriginal] = useState(initialPlan?.legacyVolumePlan);
  const [rebuildMass, setRebuildMass] = useState('100');
  const [restoreError, setRestoreError] = useState(() => initial.kind === 'invalid' && props.initialSnapshot.recipeConcentratePlan != null ? initial.reason : '');
  const [exportError, setExportError] = useState('');
  const [showSteps, setShowSteps] = useState(false);
  const cardsRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef(props.initialSnapshot);
  const salt = SALTS.find(s => s.id === saltId) ?? SALTS[0];
  const selectedForm = forms[salt.id] ?? salt.defaultFormIdx ?? 0;
  const finalLiters = Number(finalLitersInput);
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
  const shared = loadDiyConcentrateInputs().lotusCalibrationInputs ?? {};
  const waterRate = getDiyDropperRateForStyle(tipKey, props.dropsPerMl, shared);
  const waterEstimate: StockDropCalibration = { basis: 'water-estimate', drops: waterRate, massG: 1, compositionKey: '', tipKey };
  const groupFor = (id: string) => groups[id] ?? emptyGroup(id);
  const update = (id: string, patch: Partial<Group>) => setGroups(previous => ({ ...previous, [id]: { ...(previous[id] ?? emptyGroup(id)), ...patch } }));
  const actualRecipe = isRecipe ? recipeTargets : { [salt.id]: Number(targetInput) };
  const data: MassConcentratePlanSnapshot = { version: 2, basis: 'mass', workspaceMode: props.workspaceMode, toolMode: isRecipe ? 'recipe' : toolMode,
    selectedSaltId: salt.id, percentWw: Number(percentInput), strategy, finalLiters,
    recipe: Object.fromEntries(Object.entries(actualRecipe).filter(([, value]) => value > 0).map(([id, target]) => [id, { target, formIdx: recipeForms[id] ?? 0 }])),
    groups: activeGroups.filter(g => g.saltIds.length).map(g => ({ ...groupFor(g.id), saltIds: g.saltIds })),
    ...(legacyOriginal ? { legacyVolumePlan: legacyOriginal } : {}) };
  const dataKey = JSON.stringify(data);

  const applyPlan = (plan: MassConcentratePlanSnapshot) => {
    setGroups(Object.fromEntries(plan.groups.map(g => [g.id, g]))); setStrategy(plan.strategy);
    setToolMode(plan.toolMode ?? 'recipe'); setFinalLitersInput(String(plan.finalLiters));
    setSaltId(plan.selectedSaltId ?? 'mgso4'); setPercentInput(String(plan.percentWw ?? 5));
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
      const plan = readConcentrateStockRecord(loadDiyConcentrateInputs().massStockPlan);
      if (plan.kind === 'mass') applyPlan(plan.plan);
    };
    window.addEventListener(ACCOUNT_SYNC_REMOTE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ACCOUNT_SYNC_REMOTE_CHANGE_EVENT, sync);
  }, [isRecipe]);

  if (isRecipe && !props.recipeHandoff) return <section className="app-card rounded-2xl border border-fuchsia-400/25 p-5">
    <h2>No recipe concentrate loaded</h2><p className="mt-2 text-sm text-slate-400">Send a recipe from Calculator to prepare its stocks by weight.</p></section>;
  return <div className="concentrate-workspace space-y-4">
    <section className="app-card rounded-2xl border border-fuchsia-400/25 bg-slate-900/60 p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold text-fuchsia-100">{isRecipe ? props.recipeHandoff?.name : 'DIY concentrate workspace'}</h2>
        <p className="mt-1 text-xs text-slate-400">Prepare and dose by weight (w/w). Target stock weight includes salt + water, not the bottle.</p></div>
        <button className={buttonClass} onClick={props.onSaveSnapshot} disabled={!!legacy || !!restoreError}>Save concentrate plan</button>
        {isRecipe && <button className={buttonClass} onClick={props.onClearRecipeHandoff}>Clear recipe</button>}</div>
      {!isRecipe && <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs">Stock tool<select aria-label="Stock tool" className={inputClass} value={toolMode} onChange={e => setToolMode(e.target.value as typeof toolMode)}>
          <option value="recipe">Recipe-equivalent stock</option><option value="percent">Single-salt % w/w</option><option value="lotus">Homemade Lotus-style stocks</option></select></label>
        {toolMode !== 'lotus' && <><label className="text-xs">Salt<select aria-label="DIY concentrate salt" className={inputClass} style={{ color: getSaltColorTokens(salt).primary }} value={salt.id} onChange={e => { setSaltId(e.target.value); setTargetInput(String(props.diySaltTargets[e.target.value] || 30)); }}>
          {SALTS.filter(s => !['mgoh2', 'caco3'].includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="text-xs">Hydration form<select aria-label="DIY concentrate hydration form" className={inputClass} value={selectedForm} onChange={e => setForms(p => ({ ...p, [salt.id]: Number(e.target.value) }))}>
            {salt.hydrationForms.map((form, i) => <option key={form.label} value={i}>{form.label}</option>)}</select></label></>}
        {toolMode === 'recipe' && <label className="text-xs">Recipe target (anhydrous-equivalent mg/L)<input className={inputClass} inputMode="decimal" value={targetInput} onChange={e => setTargetInput(e.target.value)} /></label>}
        {toolMode === 'percent' && <label className="text-xs">Strength (% w/w)<input aria-label="Stock strength percent w/w" className={inputClass} inputMode="decimal" value={percentInput} onChange={e => setPercentInput(e.target.value)} /></label>}
      </div>}
      {isRecipe && <label className="block text-xs">Stock arrangement<select aria-label="Stock arrangement" className={inputClass} value={strategy} onChange={e => setStrategy(e.target.value as typeof strategy)}>
        <option value="individual">Separate salts</option><option value="gh-kh">GH + KH groups</option><option value="all-in-one">All-in-one</option></select></label>}
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs">Final brewing water ({props.volumeUnit === 'gallons' ? 'US gal' : 'L'})
        <input aria-label="Final brewing water" className={inputClass} inputMode="decimal"
          value={props.volumeUnit === 'gallons' ? n(finalLiters / 3.785411784, 6) : finalLitersInput}
          onChange={e => setFinalLitersInput(props.volumeUnit === 'gallons' ? String(Number(e.target.value) * 3.785411784) : e.target.value)} /></label>
        <label className="text-xs">Dropper tip<select aria-label="Stock dropper tip" className={inputClass} value={tipKey} onChange={e => setTipKey(e.target.value as typeof tipKey)}><option value="straight">Straight</option><option value="round">Round</option></select></label></div>
      <button className={buttonClass} onClick={props.onToggleVolumeUnit}>Use {props.volumeUnit === 'liters' ? 'gallons' : 'liters'} for brewing water</button>
      <p className="text-xs text-slate-400">{WATER_MASS_NOTE}</p>
      {toolMode === 'lotus' && !isRecipe && <p className="text-xs text-amber-100">Homemade stock estimates use the published salt:water mass ratios. Commercial Lotus recipes remain source references, not exact predictions for a homemade stock. Verify finished-stock drops.</p>}
    </section>
    {restoreError && <div role="alert" className="rounded-xl border border-red-400/40 p-4 text-sm text-red-200">{restoreError} No stock was silently converted.
      <button className={`${buttonClass} ml-3`} onClick={() => setRestoreError('')}>Start a new mass plan</button></div>}
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
        return <MassStockCard key={g.id} name={g.name} state={state} saltTargets={targets} forms={groupForms} strength={strength}
          finalLiters={finalLiters} tipKey={tipKey} waterEstimate={waterEstimate} percentMode={percent || lotus}
          onUpdate={patch => update(g.id, patch)} showSteps={showSteps} allowSaltMassEdit={isRecipe && strategy === 'individual'} />;
      })}
      <button className={buttonClass} aria-label="Open concentrate recipe steps" onClick={() => setShowSteps(v => !v)}>{showSteps ? 'Hide recipe steps' : 'Recipe steps'}</button>
      <button className={`${buttonClass} ml-2`} onClick={async () => {
        setExportError('');
        if (!cardsRef.current) return;
        try {
          setShowSteps(true);
          await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
          const { default: html2canvas } = await import('html2canvas');
          const canvas = await html2canvas(cardsRef.current, { backgroundColor: '#0f172a', scale: 2 });
          const anchor = document.createElement('a'); anchor.href = canvas.toDataURL('image/jpeg', 0.92); anchor.download = 'mass-concentrate-plan.jpg'; anchor.click();
        } catch { setExportError('Could not export the image. Use the text preparation download on each stock instead.'); }
      }}>Download plan image</button>
      {exportError && <p role="alert" className="text-sm text-amber-200">{exportError}</p>}
    </div>}
  </div>;
}

function MassStockCard({ name, state, saltTargets, forms, strength, finalLiters, tipKey, waterEstimate, onUpdate, percentMode, showSteps, allowSaltMassEdit }: {
  name: string; state: Group; saltTargets: Record<string, number>; forms: Record<string, number>; strength: number; finalLiters: number;
  tipKey: string; waterEstimate: StockDropCalibration; onUpdate: (patch: Partial<Group>) => void; percentMode: boolean; showSteps: boolean; allowSaltMassEdit: boolean;
}) {
  const [massInput, setMassInput] = useState(String(state.totalStockMassG));
  const [strengthInput, setStrengthInput] = useState(String(state.strength));
  const [dropsInput, setDropsInput] = useState(state.calibration?.basis === 'stock' ? String(state.calibration.drops) : '');
  const [weighedInput, setWeighedInput] = useState(state.calibration?.basis === 'stock' ? String(state.calibration.massG) : '');
  const [targetMgInput, setTargetMgInput] = useState(String(state.desiredSaltMassMg ?? 40));
  const [dropTargetInput, setDropTargetInput] = useState('1');
  const [calibrationError, setCalibrationError] = useState('');
  useEffect(() => { setMassInput(String(state.totalStockMassG)); setStrengthInput(String(state.strength)); }, [state.totalStockMassG, state.strength]);
  const salts = recipeStockSaltMasses(saltTargets, forms, strength);
  const compositionKey = stockCompositionKey(salts, state.totalStockMassG, forms);
  const measured = resolveStockDropCalibration(state.calibration, compositionKey, tipKey);
  const calibration = measured.basis === 'stock' ? state.calibration : waterEstimate;
  const result = computeRecipeMassDropEquivalents({ saltTargets, formIdxBySaltId: forms, strength, totalStockMassG: state.totalStockMassG, calibration, finalLiters, compositionKey, tipKey });
  const warnings = checkMassConcentrate({ strength, saltTargets, formIdxBySaltId: forms, totalStockMassG: state.totalStockMassG });
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
  return <section className="app-card rounded-2xl border border-fuchsia-400/25 bg-slate-900/65 p-5 space-y-4" data-testid="mass-stock-card">
    <h3 className="font-semibold text-fuchsia-100">{name}</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs">Target stock weight (g)<input aria-label={`${name} target stock weight in grams`} className={inputClass} inputMode="decimal" placeholder="e.g. 100" value={massInput}
        onChange={e => { setMassInput(e.target.value); onUpdate({ totalStockMassG: e.target.value.trim() ? Number(e.target.value) : NaN, batchScale: 1 }); }} /></label>
      {!percentMode && <label className="text-xs">Recipe strength (× one-liter equivalents)<input aria-label={`${name} recipe strength`} className={inputClass} inputMode="decimal" value={strengthInput}
        onChange={e => { setStrengthInput(e.target.value); onUpdate({ strength: e.target.value.trim() ? Number(e.target.value) : NaN, batchScale: 1 }); }} /></label>}
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
              if (scaled) onUpdate(scaled);
            } }} /></label>
            : <strong>{n(s.physicalMassMg / 1000)} g</strong>}</div>;
      })}</div>
      {(state.batchScale ?? 1) !== 1 && <p className="text-xs text-slate-400">Prepared batch scaled ×{n(state.batchScale ?? 1)} at unchanged mass fraction. This bottle contains ×{n(strength)} one-liter recipe equivalents; the reference strength control stays ×{n(state.strength)}.</p>}
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
        {Number.isFinite(exactDrops) && <p className="mt-1 text-xs">Exact: {n(exactDrops)} drops · Rounded: {roundedDrops} drops → {n(physicalDeliveredMg)} mg physical salt ({n(physicalDeliveredMg / finalLiters)} mg/L).</p>}
        {recipeDeliveredIons && <p className="mt-1 text-xs text-slate-400">Rounded-drop ions: {recipeDeliveredIons}</p>}
        {state.calibration && measured.basis === 'unavailable' && <p className="mt-2 text-xs text-amber-200">The stock composition or tip changed. Recalibrate this finished stock before using measured drops.</p>}
      </div>}
      {!percentMode && <div className="space-y-2">
        <button className={buttonClass} disabled={recommendedStrength === null} onClick={() => onUpdate({ strength: recommendedStrength!, batchScale: 1 })}>
          {recommendedStrength === null ? 'No concern-free recommendation at this weight' : `Use conservative recommendation ×${recommendedStrength}`}
        </button><p className="text-xs text-slate-400">Uses the existing safety margin and ×500 model cap, plus at least one planning drop for 0.1 L. This is an estimate, not a stability guarantee.</p>
        <div className="flex flex-wrap items-end gap-2"><label className="text-xs">Physical salt target (mg/L per drop)<input className={`${inputClass} max-w-36`} value={dropTargetInput} onChange={e => setDropTargetInput(e.target.value)} /></label>
        <button className={buttonClass} onClick={() => {
          const next = computeRecipeMassStrengthForPhysicalSaltPpm({ saltTargets, formIdxBySaltId: forms, totalStockMassG: state.totalStockMassG,
            calibration, finalLiters, compositionKey, tipKey, physicalSaltPpmPerDrop: Number(dropTargetInput) });
          if (next.valid) { onUpdate({ strength: next.strength, batchScale: 1 }); setCalibrationError('Strength changed. Verify drops with the newly prepared finished stock.'); }
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

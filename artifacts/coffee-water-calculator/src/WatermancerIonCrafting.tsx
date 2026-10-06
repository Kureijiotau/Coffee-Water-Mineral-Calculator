import { useEffect, useState } from 'react';
import { ChevronDown, Minus, Plus, Sparkles } from 'lucide-react';
import { ACTIVE_ION_IDS, ION_CHEMISTRY, ION_MAP, type IonId } from '@/waterData';
import type { IonicTargetValues } from './watermancerProfiles';
import { calculateBalancedIonPairTargets } from './watermancerChargeBalance';

const STEP_SIZES = [0.1, 1, 5, 10, 25] as const;

function formatPpm(value: number): string {
  return value.toFixed(1);
}

function failureMessage(status: string): string {
  switch (status) {
    case 'invalid-targets':
      return 'Correct the invalid current targets before crafting a balanced pair.';
    case 'invalid-primary-target':
      return 'Enter a finite, non-negative target value.';
    case 'inactive-ion':
      return 'Choose active Watermancer ions.';
    case 'same-charge':
      return 'Choose a balancing ion with the opposite charge.';
    case 'negative-counterion-target':
      return 'This partner would need a negative target. Choose another counter-ion or adjust a different ion.';
    case 'rounding-outside-tolerance':
      return 'This pair cannot meet the charge-balance tolerance at 0.1 ppm precision. Try another counter-ion.';
    default:
      return 'This target pair could not be balanced.';
  }
}

export default function WatermancerIonCrafting({
  targets,
  onApplyTargets,
}: {
  targets: Partial<Record<IonId, number>>;
  onApplyTargets: (targets: IonicTargetValues) => void;
}) {
  const [open, setOpen] = useState(false);
  const [primaryIonId, setPrimaryIonId] = useState<IonId>('magnesium');
  const [counterionId, setCounterionId] = useState<IonId>('sulfate');
  const [primaryTargetInput, setPrimaryTargetInput] = useState(
    formatPpm(targets.magnesium ?? 0),
  );
  const [stepSize, setStepSize] = useState<number>(1);
  const [notice, setNotice] = useState('');

  const currentPrimaryTarget = targets[primaryIonId] ?? 0;
  const counterionOptions = ACTIVE_ION_IDS.filter(id => (
    Math.sign(ION_CHEMISTRY[id].charge) !== Math.sign(ION_CHEMISTRY[primaryIonId].charge)
  ));

  useEffect(() => {
    setPrimaryTargetInput(formatPpm(currentPrimaryTarget));
  }, [currentPrimaryTarget, primaryIonId]);

  useEffect(() => {
    if (!counterionOptions.includes(counterionId)) {
      setCounterionId(counterionOptions[0] ?? 'chloride');
    }
  }, [counterionId, counterionOptions]);

  const proposedPrimaryTarget = Number.parseFloat(primaryTargetInput);
  const calculation = calculateBalancedIonPairTargets(
    targets,
    primaryIonId,
    counterionId,
    proposedPrimaryTarget,
  );
  const currentCounterionTarget = targets[counterionId] ?? 0;

  const changePrimaryTarget = (direction: -1 | 1) => {
    const currentInput = Number.isFinite(proposedPrimaryTarget)
      ? proposedPrimaryTarget
      : currentPrimaryTarget;
    const nextTarget = Math.max(0, currentInput + direction * stepSize);
    setPrimaryTargetInput(formatPpm(nextTarget));
    setNotice('');
  };

  const applyPair = () => {
    if (calculation.status !== 'balanced') return;
    onApplyTargets(calculation.targets as IonicTargetValues);
    setNotice(
      `Applied ${ION_MAP[primaryIonId].formula} ${formatPpm(calculation.primaryTargetPpm)} ppm and `
      + `${ION_MAP[counterionId].formula} ${formatPpm(calculation.counterionTargetPpm)} ppm.`,
    );
  };

  return (
    <section className="mx-3 mb-3 rounded-xl border border-cyan-300/20 bg-slate-950/25 sm:mx-4">
      <button
        type="button"
        data-testid="watermancer-ion-crafting-toggle"
        aria-expanded={open}
        aria-controls="watermancer-ion-crafting-panel"
        onClick={() => setOpen(value => !value)}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-cyan-300/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-cyan-100">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Craft ions
        </span>
        <span className="flex items-center gap-2">
          <span className="hidden text-[10px] text-slate-500 sm:inline">
            Adjust a target while balancing its counter-ion
          </span>
          <ChevronDown
            className={`h-4 w-4 text-cyan-200/70 transition-transform ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && (
        <div
          id="watermancer-ion-crafting-panel"
          data-testid="watermancer-ion-crafting-panel"
          className="border-t border-cyan-300/15 px-3 pb-3 pt-2.5"
        >
          <p className="max-w-3xl text-[10px] leading-relaxed text-slate-400">
            The counter-ion is calculated from all active targets. Only this pair changes, and the
            complete target set must balance before it can be applied.
          </p>

          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
            <label className="min-w-0 text-[10px] font-medium text-slate-400">
              Adjust ion
              <select
                data-testid="watermancer-ion-crafting-primary"
                aria-label="Ion to adjust"
                value={primaryIonId}
                onChange={event => {
                  const nextPrimary = event.currentTarget.value as IonId;
                  setPrimaryIonId(nextPrimary);
                  const nextOptions = ACTIVE_ION_IDS.filter(id => (
                    Math.sign(ION_CHEMISTRY[id].charge) !== Math.sign(ION_CHEMISTRY[nextPrimary].charge)
                  ));
                  if (!nextOptions.includes(counterionId)) {
                    setCounterionId(nextOptions[0] ?? 'chloride');
                  }
                  setNotice('');
                }}
                className="mt-1 block min-h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
              >
                {ACTIVE_ION_IDS.map(id => (
                  <option key={id} value={id}>{ION_MAP[id].name} · {ION_MAP[id].formula}</option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-[10px] font-medium text-slate-400">
              Balance with
              <select
                data-testid="watermancer-ion-crafting-counterion"
                aria-label="Balancing counter-ion"
                value={counterionId}
                onChange={event => {
                  setCounterionId(event.currentTarget.value as IonId);
                  setNotice('');
                }}
                className="mt-1 block min-h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
              >
                {counterionOptions.map(id => (
                  <option key={id} value={id}>{ION_MAP[id].name} · {ION_MAP[id].formula}</option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-medium text-slate-400">
              Step
              <select
                aria-label="Ion target step size"
                value={stepSize}
                onChange={event => setStepSize(Number(event.currentTarget.value))}
                className="mt-1 block min-h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100 outline-none focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
              >
                {STEP_SIZES.map(size => (
                  <option key={size} value={size}>{size} ppm</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 grid gap-3 rounded-lg border border-slate-700/60 bg-slate-900/45 p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label htmlFor="watermancer-ion-crafting-primary-target" className="text-[10px] font-medium text-slate-400">
                {ION_MAP[primaryIonId].name} target (ppm)
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`Decrease ${ION_MAP[primaryIonId].name} by ${stepSize} ppm`}
                  onClick={() => changePrimaryTarget(-1)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <input
                  id="watermancer-ion-crafting-primary-target"
                  data-testid="watermancer-ion-crafting-primary-target"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={primaryTargetInput}
                  onChange={event => {
                    setPrimaryTargetInput(event.currentTarget.value);
                    setNotice('');
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-cyan-300/25 bg-slate-950 px-2 py-2 text-center text-sm font-semibold tabular-nums text-cyan-100 outline-none focus:border-cyan-200/60 focus:ring-2 focus:ring-cyan-300/20"
                />
                <button
                  type="button"
                  aria-label={`Increase ${ION_MAP[primaryIonId].name} by ${stepSize} ppm`}
                  onClick={() => changePrimaryTarget(1)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-200 transition hover:border-cyan-300/40 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="min-w-0 rounded-lg border border-violet-300/15 bg-violet-400/[0.04] px-3 py-2">
              <div className="text-[10px] font-medium text-slate-400">
                Calculated {ION_MAP[counterionId].name} target
              </div>
              {calculation.status === 'balanced' ? (
                <div className="mt-1 flex items-baseline justify-between gap-2 tabular-nums">
                  <span className="truncate text-xs text-slate-400">
                    {formatPpm(currentCounterionTarget)} → {formatPpm(calculation.counterionTargetPpm)} ppm
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-emerald-200">
                    Δcharge {calculation.differenceMeqPerL.toFixed(3)} meq/L
                  </span>
                </div>
              ) : (
                <p className="mt-1 text-[10px] leading-relaxed text-amber-200" role="status">
                  {failureMessage(calculation.status)}
                </p>
              )}
            </div>

            <button
              type="button"
              data-testid="watermancer-ion-crafting-apply"
              onClick={applyPair}
              disabled={calculation.status !== 'balanced'}
              className="min-h-9 rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Apply balanced pair
            </button>
          </div>
          {notice && (
            <p className="mt-2 text-[10px] text-emerald-200" role="status" aria-live="polite">
              {notice}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

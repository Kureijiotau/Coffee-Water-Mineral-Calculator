import { useEffect, useState, type CSSProperties } from 'react';
import { Minus, Plus, Sparkles } from 'lucide-react';
import { ACTIVE_ION_IDS, ION_CHEMISTRY, ION_MAP, type IonId } from '@/waterData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { IonicTargetValues } from './watermancerProfiles';
import { calculateBalancedIonPairTargets } from './watermancerChargeBalance';

const STEP_SIZES = [0.1, 1, 5, 10, 25] as const;

function formatPpm(value: number): string {
  return value.toFixed(1);
}

type IonAccentStyle = CSSProperties & Record<'--ion-fg' | '--ion-soft' | '--ion-border', string>;

function ionAccentStyle(id: IonId): IonAccentStyle {
  const { color } = ION_MAP[id];
  return {
    '--ion-fg': color.foreground,
    '--ion-soft': color.soft,
    '--ion-border': color.border,
  };
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
  isEditing,
  onBeginEditing,
  onApplyTargets,
}: {
  targets: Partial<Record<IonId, number>>;
  isEditing: boolean;
  onBeginEditing: () => void;
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
  const primaryAccent = ionAccentStyle(primaryIonId);
  const counterionAccent = ionAccentStyle(counterionId);
  const counterionOptions = ACTIVE_ION_IDS.filter(id => (
    Math.sign(ION_CHEMISTRY[id].charge) !== Math.sign(ION_CHEMISTRY[primaryIonId].charge)
  ));

  useEffect(() => {
    setPrimaryTargetInput(formatPpm(currentPrimaryTarget));
  }, [currentPrimaryTarget, primaryIonId]);

  useEffect(() => {
    if (!isEditing) {
      setOpen(false);
      setNotice('');
    }
  }, [isEditing]);

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
    <div className="mx-3 mb-3 sm:mx-4">
      <Dialog
        open={open}
        onOpenChange={nextOpen => {
          if (nextOpen && !isEditing) onBeginEditing();
          setOpen(nextOpen);
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            data-testid="watermancer-ion-crafting-toggle"
            aria-label={`Craft ions; adjust ${ION_MAP[primaryIonId].name} balanced with ${ION_MAP[counterionId].name}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 shadow-sm transition hover:border-cyan-200/50 hover:bg-cyan-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Craft ions</span>
            <span className="inline-flex items-center gap-1.5" aria-hidden="true">
              <span
                className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--ion-fg)]"
                style={primaryAccent}
              >
                {ION_MAP[primaryIonId].formula}
              </span>
              <span className="text-[10px] text-slate-500">↔</span>
              <span
                className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--ion-fg)]"
                style={counterionAccent}
              >
                {ION_MAP[counterionId].formula}
              </span>
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-1.5rem)] max-h-[88vh] max-w-2xl overflow-y-auto border border-cyan-300/20 bg-slate-950 p-4 text-slate-100 shadow-2xl sm:p-5">
          <DialogHeader className="pr-7 text-left">
            <DialogTitle className="text-base font-semibold text-slate-100 sm:text-lg">
              Craft ions
            </DialogTitle>
            <DialogDescription className="max-w-3xl text-[11px] leading-relaxed text-slate-400">
              The counter-ion is calculated from all active targets. Only this pair changes, and the
              complete target set must balance before it can be applied.
            </DialogDescription>
          </DialogHeader>
        <div
          id="watermancer-ion-crafting-panel"
          data-testid="watermancer-ion-crafting-panel"
          className="space-y-3"
        >
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem]">
            <label className="min-w-0 text-[10px] font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                Adjust ion
                <span
                  className="font-semibold text-[color:var(--ion-fg)]"
                  style={primaryAccent}
                >
                  {ION_MAP[primaryIonId].formula}
                </span>
              </span>
              <select
                data-testid="watermancer-ion-crafting-primary"
                aria-label="Ion to adjust"
                value={primaryIonId}
                style={primaryAccent}
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
                className="mt-1 block min-h-9 w-full rounded-lg border border-[color:var(--ion-border)] bg-[color:var(--ion-soft)] px-2 text-xs text-[color:var(--ion-fg)] outline-none focus:border-[color:var(--ion-fg)] focus:ring-2 focus:ring-[color:var(--ion-fg)]/30"
              >
                {ACTIVE_ION_IDS.map(id => (
                  <option
                    key={id}
                    value={id}
                    style={{ color: ION_MAP[id].color.foreground }}
                  >
                    {ION_MAP[id].name} · {ION_MAP[id].formula}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-[10px] font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                Balance with
                <span
                  className="font-semibold text-[color:var(--ion-fg)]"
                  style={counterionAccent}
                >
                  {ION_MAP[counterionId].formula}
                </span>
              </span>
              <select
                data-testid="watermancer-ion-crafting-counterion"
                aria-label="Balancing counter-ion"
                value={counterionId}
                style={counterionAccent}
                onChange={event => {
                  setCounterionId(event.currentTarget.value as IonId);
                  setNotice('');
                }}
                className="mt-1 block min-h-9 w-full rounded-lg border border-[color:var(--ion-border)] bg-[color:var(--ion-soft)] px-2 text-xs text-[color:var(--ion-fg)] outline-none focus:border-[color:var(--ion-fg)] focus:ring-2 focus:ring-[color:var(--ion-fg)]/30"
              >
                {counterionOptions.map(id => (
                  <option
                    key={id}
                    value={id}
                    style={{ color: ION_MAP[id].color.foreground }}
                  >
                    {ION_MAP[id].name} · {ION_MAP[id].formula}
                  </option>
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

          <div className="grid gap-3 rounded-lg border border-slate-700/60 bg-slate-900/45 p-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label
                htmlFor="watermancer-ion-crafting-primary-target"
                className="text-[10px] font-medium text-[color:var(--ion-fg)]"
                style={primaryAccent}
              >
                {ION_MAP[primaryIonId].name} target <span className="text-slate-400">(ppm)</span>
              </label>
              <div className="mt-1 flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={`Decrease ${ION_MAP[primaryIonId].name} by ${stepSize} ppm`}
                  onClick={() => changePrimaryTarget(-1)}
                  style={primaryAccent}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--ion-border)] bg-[color:var(--ion-soft)] text-[color:var(--ion-fg)] transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ion-fg)]"
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
                  style={primaryAccent}
                  className="min-w-0 flex-1 rounded-lg border border-[color:var(--ion-border)] bg-slate-950 px-2 py-2 text-center text-sm font-semibold tabular-nums text-[color:var(--ion-fg)] outline-none focus:border-[color:var(--ion-fg)] focus:ring-2 focus:ring-[color:var(--ion-fg)]/30"
                />
                <button
                  type="button"
                  aria-label={`Increase ${ION_MAP[primaryIonId].name} by ${stepSize} ppm`}
                  onClick={() => changePrimaryTarget(1)}
                  style={primaryAccent}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color:var(--ion-border)] bg-[color:var(--ion-soft)] text-[color:var(--ion-fg)] transition hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ion-fg)]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              className="min-w-0 rounded-lg border border-[color:var(--ion-border)] bg-[color:var(--ion-soft)] px-3 py-2"
              style={counterionAccent}
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-medium text-[color:var(--ion-fg)]">
                Calculated {ION_MAP[counterionId].name} target
                <span className="rounded-md border border-[color:var(--ion-border)] px-1.5 py-0.5 font-semibold">
                  {ION_MAP[counterionId].formula}
                </span>
              </div>
              {calculation.status === 'balanced' ? (
                <div className="mt-1 flex items-baseline justify-between gap-2 tabular-nums">
                  <span className="truncate text-xs">
                    <span className="text-slate-400">{formatPpm(currentCounterionTarget)} → </span>
                    <span className="font-semibold text-[color:var(--ion-fg)]">
                      {formatPpm(calculation.counterionTargetPpm)} ppm
                    </span>
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
            <p
              className="text-[10px] text-emerald-200"
              role="status"
              aria-live="polite"
              data-testid="watermancer-ion-crafting-notice"
            >
              {notice}
            </p>
          )}
        </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, CircleHelp, X } from 'lucide-react';
import { getSaltColorTokens, ION_MAP, SALTS, type IonId } from './waterData';
import type { SaltUnitsBreakdown } from './saltUnitsExplainer';

type Props = {
  breakdown: SaltUnitsBreakdown;
  liters: number;
  children: (slots: { trigger: ReactNode; panel: ReactNode }) => ReactNode;
};

const STEPS = [
  {
    title: 'Salt target vs weighed mass',
    description: 'The salt target is an anhydrous-equivalent concentration. The weigh-in is the physical amount for this batch and the selected hydration form.',
  },
  {
    title: 'A salt separates into ions',
    description: 'Each salt contributes a different share of ions. The app converts the salt target into those ion concentrations; hydration changes the weigh-in, not the target ion profile.',
  },
  {
    title: 'mg is mass; mg/L is concentration',
    description: 'mg is an amount of material. mg/L is that amount in each liter. In dilute water, mg/L is approximately ppm, but a whole-batch mass is not ppm.',
  },
  {
    title: 'GH and KH use different ions',
    description: 'GH comes from calcium and magnesium. KH comes from bicarbonate and carbonate. Both are expressed as CaCO₃-equivalent ppm; TDS is a separate sum of modeled ions.',
  },
] as const;

function formatAmount(value: number) {
  const precision = Math.abs(value) < 1 ? 3 : 2;
  return String(Number(value.toFixed(precision)));
}

function getSaltAccent(saltId: string) {
  const salt = SALTS.find(candidate => candidate.id === saltId);
  if (!salt) return undefined;
  const colors = getSaltColorTokens(salt);
  return {
    nameStyle: { color: colors.primary },
    cardStyle: {
      borderColor: colors.border,
      backgroundImage: `linear-gradient(110deg, ${colors.primarySoft}, ${colors.secondarySoft})`,
    },
  };
}

function MassToDoseDiagram({ breakdown }: { breakdown: SaltUnitsBreakdown }) {
  return (
    <div className="space-y-2">
      {breakdown.contributions.map(contribution => {
        const accent = getSaltAccent(contribution.saltId);
        return (
          <div
            key={contribution.saltId}
            data-testid={`salt-units-salt-card-${contribution.saltId}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2"
            style={accent?.cardStyle}
          >
            <div
              data-testid={`salt-units-salt-name-${contribution.saltId}`}
              className="min-w-0 truncate text-xs font-semibold text-slate-200"
              style={accent?.nameStyle}
            >
              {contribution.saltName}
              <span
                data-testid={`salt-units-form-${contribution.saltId}`}
                className="mt-0.5 block text-[10px] font-normal text-slate-400"
              >
                {contribution.hydrationFormLabel}
              </span>
            </div>
            <span className="text-right text-xs text-cyan-100">
              <span data-testid={`salt-units-target-${contribution.saltId}`}>
                {formatAmount(contribution.targetPpm)} ppm
              </span>
              <span className="mx-1.5 text-slate-600" aria-hidden="true">→</span>
              <span data-testid={`salt-units-mass-${contribution.saltId}`} className="font-semibold text-emerald-200">
                {formatAmount(contribution.weighedMassMg)} mg
              </span>
            </span>
            <span className="col-span-2 text-[10px] uppercase tracking-wide text-slate-500">
              anhydrous-equivalent target <span aria-hidden="true">·</span> physical mass to weigh
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SaltIonDiagram({ breakdown }: { breakdown: SaltUnitsBreakdown }) {
  return (
    <div className="space-y-2">
      {breakdown.contributions.map(contribution => {
        const ions = Object.entries(contribution.ionPpm) as [IonId, number][];
        const accent = getSaltAccent(contribution.saltId);
        return (
          <div
            key={contribution.saltId}
            data-testid={`salt-units-salt-card-${contribution.saltId}`}
            className="rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2"
            style={accent?.cardStyle}
          >
            <div
              data-testid={`salt-units-salt-name-${contribution.saltId}`}
              className="text-xs font-semibold text-slate-200"
              style={accent?.nameStyle}
            >
              {contribution.saltName}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ions.map(([ionId, ppm]) => (
                <span
                  key={ionId}
                  data-testid={`salt-units-ion-${contribution.saltId}-${ionId}`}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-800/90 px-2 py-1 text-[11px]"
                  style={{ color: ION_MAP[ionId]?.color.foreground }}
                >
                  <span className="font-semibold">{ION_MAP[ionId]?.formula ?? ionId}</span>
                  <span className="text-slate-200">{formatAmount(ppm)} mg/L</span>
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MassVsConcentrationVisual({
  breakdown,
  liters,
}: {
  breakdown: SaltUnitsBreakdown;
  liters: number;
}) {
  const totalWeighedMass = breakdown.contributions.reduce(
    (total, contribution) => total + contribution.weighedMassMg,
    0,
  );

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div className="rounded-xl border border-amber-300/25 bg-amber-400/[0.08] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">Mass for this batch</div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-white">{formatAmount(totalWeighedMass)} mg</div>
        <div className="mt-1 text-xs text-slate-400">Salt material to weigh</div>
      </div>
      <div className="rounded-xl border border-cyan-300/25 bg-cyan-400/[0.08] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">Batch volume</div>
        <div className="mt-1 text-xl font-semibold tabular-nums text-white">{formatAmount(liters)} L</div>
        <div className="mt-1 text-xs text-slate-400">Concentrations describe an amount per liter</div>
      </div>
    </div>
  );
}

function HardnessDiagram({ breakdown }: { breakdown: SaltUnitsBreakdown }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Metric label="GH · Ca + Mg" value={breakdown.totalGhCaCo3Ppm} testId="salt-units-total-gh" tone="cyan" />
        <Metric label="KH · HCO₃ + CO₃" value={breakdown.totalKhCaCo3Ppm} testId="salt-units-total-kh" tone="violet" />
        <Metric label="TDS · modeled ions" value={breakdown.totalTdsMgL} testId="salt-units-total-tds" tone="slate" unit="mg/L" />
      </div>
      <div className="space-y-1.5">
        {breakdown.contributions.map(contribution => {
          const accent = getSaltAccent(contribution.saltId);
          return (
            <div
              key={contribution.saltId}
              data-testid={`salt-units-salt-card-${contribution.saltId}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-[11px]"
              style={accent?.cardStyle}
            >
              <span
                data-testid={`salt-units-salt-name-${contribution.saltId}`}
                className="basis-full truncate font-medium text-slate-200 sm:min-w-0 sm:flex-1 sm:basis-auto"
                style={accent?.nameStyle}
              >
                {contribution.saltName}
              </span>
              <span
                data-testid={`salt-units-gh-${contribution.saltId}`}
                className="whitespace-nowrap text-cyan-100"
              >
                GH {formatAmount(contribution.ghCaCo3Ppm)} ppm CaCO₃
              </span>
              <span
                data-testid={`salt-units-kh-${contribution.saltId}`}
                className="whitespace-nowrap text-violet-100"
              >
                KH {formatAmount(contribution.khCaCo3Ppm)} ppm CaCO₃
              </span>
            </div>
          );
        })}
      </div>
      <p className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2 text-xs leading-relaxed text-slate-300">
        Chloride and sulfate add dissolved ions, but not GH or KH. TDS is the modeled ion total—not GH + KH.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  testId,
  tone,
  unit = 'ppm CaCO₃',
}: {
  label: string;
  value: number;
  testId: string;
  tone: 'cyan' | 'violet' | 'slate';
  unit?: string;
}) {
  const tones = {
    cyan: 'border-cyan-300/20 bg-cyan-400/[0.07] text-cyan-100',
    violet: 'border-violet-300/20 bg-violet-400/[0.07] text-violet-100',
    slate: 'border-slate-600/50 bg-slate-950/35 text-slate-100',
  };
  return (
    <div className={`rounded-lg border p-2.5 ${tones[tone]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-75">{label}</div>
      <div className="mt-1 font-semibold tabular-nums">
        <span data-testid={testId}>{formatAmount(value)} {unit}</span>
      </div>
    </div>
  );
}

export default function SaltUnitsExplainer({ breakdown, liters, children }: Props) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];
  const descriptionId = 'salt-units-explainer-description';

  const stepVisual = stepIndex === 0
    ? <MassToDoseDiagram breakdown={breakdown} />
    : stepIndex === 1
      ? <SaltIonDiagram breakdown={breakdown} />
      : stepIndex === 2
        ? <MassVsConcentrationVisual breakdown={breakdown} liters={liters} />
        : <HardnessDiagram breakdown={breakdown} />;

  const trigger = (
    <DialogPrimitive.Trigger asChild>
      <button
          type="button"
          data-testid="salt-units-explainer-trigger"
          aria-label="How it works: salt targets, GH, and KH"
          aria-controls="salt-units-explainer-dialog"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
          How it works
      </button>
    </DialogPrimitive.Trigger>
  );

  const panel = open ? (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        data-testid="salt-units-explainer-overlay"
        className="fixed inset-0 z-[90] bg-slate-950/75 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none"
      />
      <DialogPrimitive.Content
        id="salt-units-explainer-dialog"
        aria-label="Salt units and hardness explainer"
        aria-modal="true"
        aria-describedby={descriptionId}
        data-testid="salt-units-explainer-dialog"
        className="fixed left-1/2 top-1/2 z-[91] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-cyan-200/25 bg-slate-900 p-3 text-slate-100 shadow-2xl shadow-black/60 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 sm:p-5"
      >
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                Salt recipe guide
              </p>
              <DialogPrimitive.Title asChild>
                <h3
                  aria-live="polite"
                  className="mt-1 text-base font-semibold text-white sm:text-lg"
                >
                  {currentStep.title}
                </h3>
              </DialogPrimitive.Title>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                data-testid="salt-units-explainer-progress"
                className="rounded-full border border-cyan-200/20 bg-cyan-200/[0.06] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-cyan-100"
              >
                {stepIndex + 1} of {STEPS.length}
              </span>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  aria-label="Close salt units explainer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </DialogPrimitive.Close>
            </div>
          </header>
          <p
            id={descriptionId}
            aria-live="polite"
            aria-atomic="true"
            className="mt-2 text-sm leading-relaxed text-slate-300"
          >
            {currentStep.description}
          </p>
          <div className="mt-3 rounded-xl border border-cyan-200/15 bg-slate-950/45 p-2.5 sm:p-3">
            {breakdown.available ? stepVisual : (
              <p className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-3 text-sm text-slate-300">
                Add a salt target and set a valid batch volume to see the live breakdown.
              </p>
            )}
          </div>
          <footer className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                Close
              </button>
            </DialogPrimitive.Close>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setStepIndex(index => Math.max(0, index - 1))}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              )}
              {stepIndex === STEPS.length - 1 ? (
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-cyan-200/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                  >
                    Done
                  </button>
                </DialogPrimitive.Close>
              ) : (
                <button
                  type="button"
                  onClick={() => setStepIndex(index => Math.min(STEPS.length - 1, index + 1))}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-cyan-200/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                >
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </footer>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  ) : null;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={nextOpen => {
        setOpen(nextOpen);
        setStepIndex(0);
      }}
    >
      {children({ trigger, panel })}
    </DialogPrimitive.Root>
  );
}

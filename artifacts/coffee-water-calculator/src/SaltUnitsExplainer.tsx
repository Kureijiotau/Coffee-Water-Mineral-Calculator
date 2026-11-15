import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, CircleHelp, X } from 'lucide-react';
import { ION_MAP } from './waterData';
import type { IonId } from './waterData';
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

function MassToDoseDiagram({ breakdown }: { breakdown: SaltUnitsBreakdown }) {
  return (
    <div className="space-y-2">
      {breakdown.contributions.map(contribution => (
        <div
          key={contribution.saltId}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2"
        >
          <div className="min-w-0 truncate text-xs font-semibold text-slate-200">
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
      ))}
    </div>
  );
}

function SaltIonDiagram({ breakdown }: { breakdown: SaltUnitsBreakdown }) {
  return (
    <div className="space-y-2">
      {breakdown.contributions.map(contribution => {
        const ions = Object.entries(contribution.ionPpm) as [IonId, number][];
        return (
          <div
            key={contribution.saltId}
            className="rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2"
          >
            <div className="text-xs font-semibold text-slate-200">{contribution.saltName}</div>
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
        {breakdown.contributions.map(contribution => (
          <div
            key={contribution.saltId}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-[11px]"
          >
            <span className="basis-full truncate font-medium text-slate-200 sm:min-w-0 sm:flex-1 sm:basis-auto">
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
        ))}
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const guideRef = useRef<HTMLElement>(null);
  const currentStep = STEPS[stepIndex];
  const descriptionId = 'salt-units-explainer-description';

  const close = () => {
    setOpen(false);
    setStepIndex(0);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    guideRef.current?.scrollIntoView({ block: 'center' });
    guideRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const stepVisual = stepIndex === 0
    ? <MassToDoseDiagram breakdown={breakdown} />
    : stepIndex === 1
      ? <SaltIonDiagram breakdown={breakdown} />
      : stepIndex === 2
        ? <MassVsConcentrationVisual breakdown={breakdown} liters={liters} />
        : <HardnessDiagram breakdown={breakdown} />;

  const trigger = (
    <button
        ref={triggerRef}
        type="button"
        data-testid="salt-units-explainer-trigger"
        aria-label="How it works: salt targets, GH, and KH"
        aria-expanded={open}
        aria-controls="salt-units-explainer-dialog"
        onClick={() => {
          if (open) close();
          else {
            setStepIndex(0);
            setOpen(true);
          }
        }}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
      >
        <CircleHelp className="h-4 w-4" aria-hidden="true" />
        How it works
    </button>
  );

  const panel = open ? (
    <section
          ref={guideRef}
          id="salt-units-explainer-dialog"
          role="dialog"
          aria-modal="false"
          aria-label="Salt units and hardness explainer"
          aria-describedby={descriptionId}
          tabIndex={-1}
          data-testid="salt-units-explainer-dialog"
          className="max-h-[min(60vh,36rem)] overflow-y-auto rounded-xl border border-cyan-200/25 bg-slate-950/40 p-3 text-slate-100 shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 sm:p-4"
        >
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                Salt recipe guide
              </p>
              <h3
                aria-live="polite"
                className="mt-1 text-base font-semibold text-white sm:text-lg"
              >
                {currentStep.title}
              </h3>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span
                data-testid="salt-units-explainer-progress"
                className="rounded-full border border-cyan-200/20 bg-cyan-200/[0.06] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-cyan-100"
              >
                {stepIndex + 1} of {STEPS.length}
              </span>
              <button
                type="button"
                aria-label="Close salt units explainer"
                onClick={close}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
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
            <button
              type="button"
              onClick={close}
              className="min-h-10 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              Close
            </button>
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
              <button
                type="button"
                onClick={() => {
                  if (stepIndex === STEPS.length - 1) close();
                  else setStepIndex(index => Math.min(STEPS.length - 1, index + 1));
                }}
                className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-cyan-200/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                {stepIndex === STEPS.length - 1 ? 'Done' : 'Next'}
                {stepIndex < STEPS.length - 1 && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </footer>
    </section>
  ) : null;

  return children({ trigger, panel });
}

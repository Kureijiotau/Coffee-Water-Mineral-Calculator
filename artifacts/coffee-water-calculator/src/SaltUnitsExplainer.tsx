import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, CircleHelp, Droplets, X } from 'lucide-react';
import { getSaltColorTokens, ION_MAP, SALTS, type IonId } from './waterData';
import {
  buildSaltUnitsExplainerModel,
  type SaltUnitsExplainerModel,
  type SaltUnitsIonAmount,
  type SaltUnitsRecipeInput,
  type SaltUnitsSaltRow,
} from './saltUnitsExplainerModel';

type Props = {
  children: (slots: { trigger: ReactNode; panel: ReactNode }) => ReactNode;
  recipe: SaltUnitsRecipeInput | null;
};

type IonTokenStyle = CSSProperties & Record<`--ion-${string}`, string>;

const STEPS = [
  {
    title: 'Salts are loot. Ions are the stats.',
    description: 'Each salt you weigh unpacks into ions. Ions are what your water actually gets.',
  },
  {
    title: 'Crystal water is dead weight.',
    description: 'Same ions, heavier crystal. The water adds weight but no stats. Weigh the form on your jar.',
  },
  {
    title: 'The scoreboard counts only some ions.',
    description: 'GH counts calcium and magnesium. KH counts bicarbonate and carbonate. Sodium, potassium, chloride and sulfate count for neither.',
  },
] as const;

const GH_IONS: IonId[] = ['calcium', 'magnesium'];
const KH_IONS: IonId[] = ['bicarbonate', 'carbonate'];
const OTHER_IONS: IonId[] = ['sodium', 'potassium', 'chloride', 'sulfate'];

function formatMg(value: number, approximate = false): string {
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${approximate ? '≈ ' : ''}${formatted} mg/L`;
}

function saltFor(id: string) {
  return SALTS.find(salt => salt.id === id);
}

function SaltIcon({ saltId }: { saltId: string }) {
  const salt = saltFor(saltId);
  if (!salt) return null;
  const colors = getSaltColorTokens(salt);
  return (
    <span
      aria-hidden="true"
      className="h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
    />
  );
}

function IonToken({ ionId, mgPerL, testId, approximate = false }: {
  ionId: IonId;
  mgPerL: number;
  testId?: string;
  approximate?: boolean;
}) {
  const ion = ION_MAP[ionId];
  return (
    <span
      data-testid={testId}
      title={ion.name}
      aria-label={`${ion.name}: ${formatMg(mgPerL, approximate)}`}
      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--ion-border)] bg-[color:var(--ion-soft)] px-2 py-1 text-[10px] font-semibold tabular-nums text-[color:var(--ion-fg)]"
      style={{
        '--ion-fg': ion.color.foreground,
        '--ion-border': ion.color.border,
        '--ion-soft': ion.color.soft,
      } as IonTokenStyle}
    >
      <span>{ion.formula}</span>
      <span>{formatMg(mgPerL, approximate)}</span>
    </span>
  );
}

function CrystalWaterToken({ mgPerL, approximate = false }: { mgPerL: number; approximate?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/50 bg-slate-700/60 px-2 py-1 text-[10px] font-semibold tabular-nums text-slate-200">
      <Droplets className="h-3 w-3 text-slate-300" aria-hidden="true" />
      <span>crystal water · {formatMg(mgPerL, approximate)}</span>
    </span>
  );
}

function SaltLootRow({ row, fallback = false }: { row: SaltUnitsSaltRow; fallback?: boolean }) {
  const salt = saltFor(row.saltId);
  const colors = salt ? getSaltColorTokens(salt) : null;
  const ionTokens = (
    <>
      {row.ions.map(ion => (
        <IonToken
          key={ion.ionId}
          ionId={ion.ionId}
          mgPerL={ion.mgPerL}
          approximate={row.dryExample}
          testId={`salt-units-ion-${ion.ionId}-${row.saltId}`}
        />
      ))}
      {row.supplementalIons.map(ion => (
        <span
          key={ion.name}
          className="inline-flex items-center rounded-full border border-slate-500/50 bg-slate-700/60 px-2 py-1 text-[10px] font-semibold tabular-nums text-slate-200"
        >
          {ion.name} · {formatMg(ion.mgPerL)}
        </span>
      ))}
      {row.otherSaltMassMgPerL > 0.01 && (
        <span className="inline-flex items-center rounded-full border border-slate-500/50 bg-slate-700/60 px-2 py-1 text-[10px] font-semibold tabular-nums text-slate-200">
          other salt mass · {formatMg(row.otherSaltMassMgPerL)}
        </span>
      )}
      {row.reactionUptakeMgPerL > 0.01 && (
        <span className="inline-flex items-center rounded-full border border-slate-500/50 bg-slate-700/60 px-2 py-1 text-[10px] font-semibold tabular-nums text-slate-200">
          reaction uptake · +{formatMg(row.reactionUptakeMgPerL)}
        </span>
      )}
      <CrystalWaterToken mgPerL={row.crystalWaterMgPerL} approximate={row.dryExample} />
    </>
  );

  return (
    <article
      data-testid={`salt-units-row-${row.saltId}`}
      className="min-w-0 rounded-xl border border-slate-700/70 bg-slate-950/40 p-2.5"
      style={colors ? {
        borderColor: colors.border,
        backgroundImage: `linear-gradient(110deg, ${colors.primarySoft}, ${colors.secondarySoft})`,
      } : undefined}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <SaltIcon saltId={row.saltId} />
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-100">{row.saltName}</div>
            <div className="truncate text-[10px] text-slate-400">
              {fallback ? 'dry (anhydrous) form' : row.form.label}
            </div>
          </div>
        </div>
        <span className="shrink-0 text-right text-[11px] font-bold tabular-nums text-white">
          {formatMg(row.weighedMgPerL, row.dryExample)} <span className="font-medium text-slate-400">weigh</span>
        </span>
      </div>
      <div className="mt-2 flex min-w-0 items-center gap-1.5">
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
        <div
          data-testid={fallback ? `salt-units-fallback-example-${row.saltId}` : undefined}
          className="flex min-w-0 flex-wrap gap-1"
        >
          {ionTokens}
        </div>
      </div>
    </article>
  );
}

function RecipeLoot({ model }: { model: SaltUnitsExplainerModel }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {model.rows.map(row => <SaltLootRow key={row.saltId} row={row} fallback={model.isFallback} />)}
      </div>
      {model.hiddenSaltCount > 0 && (
        <p data-testid="salt-units-hidden-count" className="text-right text-[11px] font-semibold text-slate-400">
          +{model.hiddenSaltCount} more
        </p>
      )}
      {model.isFallback && (
        <p
          data-testid="salt-units-fallback-note"
          className="rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-xs text-slate-300"
        >
          Pick a recipe to see this with your own salts.
        </p>
      )}
    </div>
  );
}

function FormBar({ form, maxMass }: {
  form: SaltUnitsExplainerModel['hydration']['forms'][number];
  maxMass: number;
}) {
  return (
    <div
      data-testid={`salt-units-hydration-form-${form.index}`}
      className="rounded-xl border border-slate-700/60 bg-slate-950/35 p-2.5"
    >
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-semibold text-slate-100">{form.label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-slate-300">
          {formatMg(form.weighedMgPerL)} · x{form.multiplier.toFixed(1)}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${form.label}: ${formatMg(form.weighedMgPerL)} total`}
        className="flex h-5 overflow-hidden rounded-full bg-slate-800"
      >
        {form.ions.map((ion: SaltUnitsIonAmount) => {
          const ionInfo = ION_MAP[ion.ionId];
          const width = Math.max(0, (ion.mgPerL / maxMass) * 100);
          return (
            <span
              key={ion.ionId}
              aria-hidden="true"
              className="h-full min-w-0"
              style={{ width: `${width}%`, backgroundColor: ionInfo.color.bar }}
            />
          );
        })}
        {form.supplementalMassMgPerL + form.otherSaltMassMgPerL > 0 && (
          <span
            aria-hidden="true"
            className="h-full bg-slate-600/80"
            style={{
              width: `${Math.max(0, ((form.supplementalMassMgPerL + form.otherSaltMassMgPerL) / maxMass) * 100)}%`,
            }}
          />
        )}
        {form.crystalWaterMgPerL > 0 && (
          <span
            aria-hidden="true"
            className="h-full bg-slate-500/70"
            style={{ width: `${Math.max(0, (form.crystalWaterMgPerL / maxMass) * 100)}%` }}
          />
        )}
      </div>
    </div>
  );
}

function HydrationLoot({ model }: { model: SaltUnitsExplainerModel }) {
  const maxMass = Math.max(...model.hydration.forms.map(form => form.weighedMgPerL), 1);
  const salt = saltFor(model.hydration.saltId);
  return (
    <div data-testid="salt-units-hydration-comparison" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span className="font-semibold text-slate-100">{model.hydration.saltName}</span>
        <span>Same ion payload</span>
        {model.hydration.forms[0]?.ions.map(ion => (
          <IonToken
            key={ion.ionId}
            ionId={ion.ionId}
            mgPerL={ion.mgPerL}
          />
        ))}
      </div>
      <div className="space-y-2">
        {model.hydration.forms.map(form => (
          <FormBar key={`${model.hydration.saltId}-${form.index}`} form={form} maxMass={maxMass} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {salt?.ions.map(({ ionId }) => (
          <span
            key={ionId}
            title={ION_MAP[ionId].name}
            aria-label={ION_MAP[ionId].name}
            className="inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold"
            style={{
              color: ION_MAP[ionId].color.foreground,
              borderColor: ION_MAP[ionId].color.border,
              backgroundColor: ION_MAP[ionId].color.soft,
            }}
          >
            {ION_MAP[ionId].formula} stays the same
          </span>
        ))}
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/50 bg-slate-700/60 px-2 py-1 text-[10px] font-semibold text-slate-200">
          <Droplets className="h-3 w-3" aria-hidden="true" />
          crystal water
        </span>
      </div>
    </div>
  );
}

function IonGroup({ title, ionIds }: { title: string; ionIds: IonId[] }) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-2.5">
      <div className="text-[11px] font-semibold text-slate-200">{title}</div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {ionIds.map(ionId => (
          <span
            key={ionId}
            className="inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold"
            style={{
              color: ION_MAP[ionId].color.foreground,
              borderColor: ION_MAP[ionId].color.border,
              backgroundColor: ION_MAP[ionId].color.soft,
            }}
          >
            {ION_MAP[ionId].formula}
          </span>
        ))}
      </div>
    </div>
  );
}

function Scoreboard({ model }: { model: SaltUnitsExplainerModel }) {
  return (
    <div className="space-y-3 sm:flex sm:h-full sm:flex-col sm:justify-between">
      <div className="grid grid-cols-2 gap-2">
        <div data-testid="salt-units-gh-score" className="rounded-xl border border-cyan-300/25 bg-cyan-400/[0.07] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-cyan-100">GH · hardness stat</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-white">{model.gh.toFixed(1)}</div>
          <div className="text-[10px] text-slate-400">ppm as CaCO₃</div>
        </div>
        <div data-testid="salt-units-kh-score" className="rounded-xl border border-teal-300/25 bg-teal-400/[0.07] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-teal-100">KH · buffer stat</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-white">{model.kh.toFixed(1)}</div>
          <div className="text-[10px] text-slate-400">ppm as CaCO₃</div>
        </div>
      </div>
      <p
        data-testid="salt-units-unit-legend"
        className="rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2 text-[11px] leading-relaxed text-slate-300"
      >
        mg = what you weigh. mg/L = what is in 1 L. ppm ~ mg/L. ppm as CaCO₃ is the GH/KH scale.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <IonGroup title="Counts toward GH" ionIds={GH_IONS} />
        <IonGroup title="Counts toward KH" ionIds={KH_IONS} />
        <div data-testid="salt-units-no-hardness-ions">
          <IonGroup title="Other ions" ionIds={OTHER_IONS} />
        </div>
      </div>
    </div>
  );
}

export default function SaltUnitsExplainer({ children, recipe }: Props) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const model = useMemo(() => buildSaltUnitsExplainerModel(recipe), [recipe]);
  const currentStep = STEPS[stepIndex];
  const descriptionId = 'salt-units-explainer-description';
  const stepVisual = stepIndex === 0
    ? <RecipeLoot model={model} />
    : stepIndex === 1
      ? <HydrationLoot model={model} />
      : <Scoreboard model={model} />;

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
        className="fixed left-1/2 top-1/2 z-[91] flex h-[min(720px,calc(100dvh-1.5rem))] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-cyan-200/25 bg-slate-900 p-3 text-slate-100 shadow-2xl shadow-black/60 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 sm:h-[min(625px,calc(100dvh-1.5rem))] sm:p-5"
      >
        <header className="flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p
              data-testid="salt-units-recipe-eyebrow"
              className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80"
            >
              {model.isFallback
                ? 'ROUNDED EXAMPLE · 1 L'
                : `YOUR RECIPE · ${model.recipeName} · 1 L`}
            </p>
            <DialogPrimitive.Title asChild>
              <h3 aria-live="polite" className="mt-1 text-base font-semibold text-white sm:text-lg">
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
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1 sm:flex sm:flex-col">
          <p id={descriptionId} data-testid="salt-units-page-copy" aria-live="polite" aria-atomic="true" className="text-sm leading-relaxed text-slate-300">
            {currentStep.description}
          </p>
          <div className={`mt-3 rounded-xl border border-cyan-200/15 bg-slate-950/45 p-2.5 sm:p-3 ${stepIndex === 2 ? 'sm:min-h-0 sm:flex-1' : ''}`}>
            {stepVisual}
          </div>
        </div>
        <footer className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-white/10 pt-3">
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
                  className="inline-flex min-h-10 w-24 items-center justify-center gap-1 rounded-lg border border-cyan-200/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                >
                  Done
                </button>
              </DialogPrimitive.Close>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex(index => Math.min(STEPS.length - 1, index + 1))}
                className="inline-flex min-h-10 w-24 items-center justify-center gap-1 rounded-lg border border-cyan-200/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
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

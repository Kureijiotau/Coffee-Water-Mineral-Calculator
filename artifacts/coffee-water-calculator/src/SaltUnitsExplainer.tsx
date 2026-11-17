import { useState, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, CircleHelp, X } from 'lucide-react';
import { getSaltColorTokens, ION_MAP, SALTS, type IonId } from './waterData';

type Props = {
  children: (slots: { trigger: ReactNode; panel: ReactNode }) => ReactNode;
};

type ExampleIon = {
  ionId: IonId;
  roundedMgL: number;
};

type SaltExample = {
  saltId: string;
  saltMgL: number;
  ions: ExampleIon[];
};

const SALT_EXAMPLES: SaltExample[] = [
  { saltId: 'mgcl2', saltMgL: 40, ions: [{ ionId: 'magnesium', roundedMgL: 10 }, { ionId: 'chloride', roundedMgL: 30 }] },
  { saltId: 'cacl2', saltMgL: 40, ions: [{ ionId: 'calcium', roundedMgL: 14 }, { ionId: 'chloride', roundedMgL: 26 }] },
  { saltId: 'mgso4', saltMgL: 40, ions: [{ ionId: 'magnesium', roundedMgL: 8 }, { ionId: 'sulfate', roundedMgL: 32 }] },
  { saltId: 'nahco3', saltMgL: 25, ions: [{ ionId: 'sodium', roundedMgL: 7 }, { ionId: 'bicarbonate', roundedMgL: 18 }] },
  { saltId: 'khco3', saltMgL: 25, ions: [{ ionId: 'potassium', roundedMgL: 10 }, { ionId: 'bicarbonate', roundedMgL: 15 }] },
  { saltId: 'nacl', saltMgL: 20, ions: [{ ionId: 'sodium', roundedMgL: 8 }, { ionId: 'chloride', roundedMgL: 12 }] },
];

const GH_IONS: IonId[] = ['calcium', 'magnesium'];
const KH_IONS: IonId[] = ['bicarbonate', 'carbonate'];
const OTHER_IONS: IonId[] = ['sodium', 'potassium', 'chloride', 'sulfate'];

const STEPS = [
  {
    title: 'Salt splits into tiny pieces',
    description: 'When salt dissolves, it splits into tiny charged pieces called ions. Different salts make different pieces.',
  },
  {
    title: 'GH and KH measure different things',
    description: 'The colors below show which ions count toward each value.',
  },
  {
    title: 'What do mg, mg/L, and ppm mean?',
    description: 'mg is how much you weigh. mg/L is how much is in one liter of water. In water, ppm is about the same as mg/L. GH and KH use a comparison scale called CaCO₃.',
  },
] as const;

function saltForExample(saltId: string) {
  return SALTS.find(salt => salt.id === saltId);
}

function SaltAccent({ saltId }: { saltId: string }) {
  const salt = saltForExample(saltId);
  if (!salt) return null;
  const colors = getSaltColorTokens(salt);
  return (
    <span
      aria-hidden="true"
      className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
    />
  );
}

function IonChip({ ionId }: { ionId: IonId }) {
  const ion = ION_MAP[ionId];
  return (
    <span
      data-testid={`salt-units-ion-key-${ionId}`}
      aria-label={`${ion.name}, ${ion.formula}`}
      className="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold"
      style={{
        color: ion.color.foreground,
        borderColor: ion.color.border,
        backgroundColor: ion.color.soft,
      }}
    >
      {ion.name} · {ion.formula}
    </span>
  );
}

function SaltDissociationDiagram() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SALT_EXAMPLES.map(example => {
          const salt = saltForExample(example.saltId);
          if (!salt) return null;
          const colors = getSaltColorTokens(salt);
          return (
            <div
              key={example.saltId}
              data-testid={`salt-units-example-${example.saltId}`}
              data-salt-units-salt-card={example.saltId}
              className="rounded-xl border bg-slate-950/35 p-3"
              style={{
                borderColor: colors.border,
                backgroundImage: `linear-gradient(110deg, ${colors.primarySoft}, ${colors.secondarySoft})`,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  data-testid={`salt-units-salt-name-${example.saltId}`}
                  className="text-xs font-semibold"
                  style={{ color: colors.primary }}
                >
                  {salt.name}
                </span>
                <SaltAccent saltId={example.saltId} />
              </div>
              {['mgcl2', 'cacl2', 'mgso4'].includes(example.saltId) && (
                <div className="mt-1 text-[10px] text-slate-400">dry (anhydrous) form</div>
              )}
              <div className="mt-1 text-[11px] text-slate-400">
                {example.saltMgL} mg/L salt
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {example.ions.map(({ ionId, roundedMgL }) => (
                  <span
                    key={ionId}
                    data-testid={`salt-units-example-${ION_MAP[ionId].name.toLowerCase()}-${example.saltId}`}
                    className="rounded-full border px-2 py-1 text-[11px]"
                    style={{
                      color: ION_MAP[ionId].color.foreground,
                      borderColor: ION_MAP[ionId].color.border,
                      backgroundColor: ION_MAP[ionId].color.soft,
                    }}
                  >
                    {ION_MAP[ionId].formula} ≈ {roundedMgL} mg/L
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2 text-xs leading-relaxed text-slate-300">
        Rounded examples for 1 L, using dry salts. The common crystal forms hold water, so you weigh more for the same ions: about 2.1x for magnesium chloride hexahydrate, 2.0x for Epsom salt, 1.3x for calcium chloride dihydrate. The calculator does this for you.
      </p>
    </div>
  );
}

function IonGroup({ title, ionIds, tone }: { title: string; ionIds: IonId[]; tone: 'cyan' | 'violet' | 'slate' }) {
  const tones = {
    cyan: 'border-cyan-300/25 bg-cyan-400/[0.07] text-cyan-100',
    violet: 'border-violet-300/25 bg-violet-400/[0.07] text-violet-100',
    slate: 'border-slate-600/60 bg-slate-950/35 text-slate-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="text-xs font-semibold">{title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ionIds.map(ionId => <IonChip key={ionId} ionId={ionId} />)}
      </div>
    </div>
  );
}

function HardnessDiagram() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div data-testid="salt-units-gh-example" className="rounded-xl border border-cyan-300/25 bg-cyan-400/[0.07] p-3">
          <div className="text-xs font-semibold text-cyan-100">GH · general hardness</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Calcium and magnesium make GH. Here, about 10 mg/L magnesium gives about 41 ppm GH.
          </p>
        </div>
        <div data-testid="salt-units-kh-example" className="rounded-xl border border-violet-300/25 bg-violet-400/[0.07] p-3">
          <div className="text-xs font-semibold text-violet-100">KH · carbonate hardness</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            Bicarbonate and carbonate make KH. Here, about 18 mg/L bicarbonate gives about 15 ppm KH.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <IonGroup title="Count toward GH" ionIds={GH_IONS} tone="cyan" />
        <IonGroup title="Count toward KH" ionIds={KH_IONS} tone="violet" />
        <div data-testid="salt-units-no-hardness-ions">
          <IonGroup title="Other ions" ionIds={OTHER_IONS} tone="slate" />
        </div>
      </div>
      <p className="rounded-lg border border-slate-700/60 bg-slate-950/30 px-3 py-2 text-xs leading-relaxed text-slate-300">
        Sodium, potassium, chloride, and sulfate affect the water, but do not count toward GH or KH.
      </p>
    </div>
  );
}

function UnitsDiagram() {
  const units = [
    { id: 'mg', label: 'mg', value: 'Amount', detail: 'How much salt you weigh.' },
    { id: 'mg-l', label: 'mg/L', value: 'In one liter', detail: 'How much is in 1 L of water.' },
    { id: 'ppm', label: 'ppm', value: 'About the same as mg/L', detail: 'In water, ppm is about the same as mg/L.' },
    { id: 'caco3', label: 'ppm CaCO₃', value: 'GH/KH scale', detail: 'A comparison scale for GH and KH. You do not add CaCO₃.' },
  ];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {units.map(unit => (
          <div
            key={unit.id}
            data-testid={`salt-units-unit-${unit.id}`}
            className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-cyan-100">{unit.label}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{unit.value}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">{unit.detail}</p>
          </div>
        ))}
      </div>
      <p className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2 text-xs leading-relaxed text-amber-100/90">
        25 mg/L sodium bicarbonate does not mean 25 ppm KH. Its bicarbonate (about 18 mg/L) gives about 15 ppm KH. Sodium counts toward neither GH nor KH.
      </p>
    </div>
  );
}

export default function SaltUnitsExplainer({ children }: Props) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];
  const descriptionId = 'salt-units-explainer-description';
  const stepVisual = stepIndex === 0
    ? <SaltDissociationDiagram />
    : stepIndex === 1
      ? <HardnessDiagram />
      : <UnitsDiagram />;

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
        className="fixed left-1/2 top-1/2 z-[91] flex h-[min(720px,calc(100dvh-1.5rem))] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-cyan-200/25 bg-slate-900 p-3 text-slate-100 shadow-2xl shadow-black/60 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 sm:p-5"
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
              Simple salt examples · 1 L
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
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
          <p id={descriptionId} aria-live="polite" aria-atomic="true" className="text-sm leading-relaxed text-slate-300">
            {currentStep.description}
          </p>
          <div className="mt-3 rounded-xl border border-cyan-200/15 bg-slate-950/45 p-2.5 sm:p-3">
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

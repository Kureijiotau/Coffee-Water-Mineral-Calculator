import { useMemo, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ArrowLeft, ArrowRight, Check, CircleHelp, X } from 'lucide-react';
import straightTipPhoto from '@assets/4_1792294122444.jpg';
import roundTipPhoto from '@assets/5_1792294122444.jpg';
import scalePhoto from '@assets/6_1792294122444.jpg';
import dropperLineupPhoto from '@assets/watermancer-guide-step5-dropper-lineup.jpg';
import {
  lotusMeasuredDropsPerMl,
  type LotusDropperCalibration,
  type LotusDropperStyle,
} from './lotusConcentrate';
import {
  calculateWatermancerCalibration,
  type CalibrationRunInput,
} from './watermancerGuideCalibrationMath';

type WatermancerGuideCalibrationWizardProps = {
  calibrations: Partial<Record<LotusDropperStyle, LotusDropperCalibration>>;
  onSave: (style: LotusDropperStyle, calibration: LotusDropperCalibration) => void;
};

type TipOption = {
  style: LotusDropperStyle;
  title: string;
  photo: string;
  photoAlt: string;
  color: 'cyan' | 'rose';
};

const TIP_OPTIONS: readonly TipOption[] = [
  {
    style: 'straight',
    title: 'Straight tip',
    photo: straightTipPhoto,
    photoAlt: 'Close-up of a straight dropper tip.',
    color: 'cyan',
  },
  {
    style: 'round',
    title: 'Round tip',
    photo: roundTipPhoto,
    photoAlt: 'Close-up of a round dropper tip.',
    color: 'rose',
  },
];

const TIP_PHOTO_CAPTION = 'Tip shape only. Hold the dropper vertical when dispensing.';
const WIZARD_PAGES = [
  'Choose a tip',
  'Set up the scale',
  'Measure run 1',
  'Repeat the measurement',
  'Your calibration',
] as const;

function initialRuns(): CalibrationRunInput[] {
  return [
    { dropsInput: '50', weightInput: '' },
    { dropsInput: '', weightInput: '' },
    { dropsInput: '', weightInput: '' },
  ];
}

function preferredTip(
  calibrations: Partial<Record<LotusDropperStyle, LotusDropperCalibration>>,
): LotusDropperStyle {
  const hasStraight = lotusMeasuredDropsPerMl(calibrations.straight) !== null;
  const hasRound = lotusMeasuredDropsPerMl(calibrations.round) !== null;
  if (hasRound && !hasStraight) return 'round';
  return 'straight';
}

function numberToInput(value: number): string {
  return Number(value.toPrecision(12)).toString();
}

function TipPhoto({
  option,
  loading,
  className,
}: {
  option: TipOption;
  loading: 'eager' | 'lazy';
  className: string;
}) {
  return (
    <span className="block min-w-0 overflow-hidden rounded-lg border border-slate-700/60 bg-slate-950/50">
      <img
        src={option.photo}
        alt={option.photoAlt}
        width={1024}
        height={1024}
        loading={loading}
        decoding="async"
        className={className}
      />
      <span className="block border-t border-slate-700/50 px-2 py-1.5 text-center text-[10px] leading-snug text-slate-400">
        {TIP_PHOTO_CAPTION}
      </span>
    </span>
  );
}

function RunFields({
  runNumber,
  run,
  onChange,
}: {
  runNumber: number;
  run: CalibrationRunInput;
  onChange: (field: keyof CalibrationRunInput, value: string) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2">
      <label className="min-w-0 rounded-lg border border-slate-700/60 bg-slate-950/45 px-2.5 py-2">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Drops
        </span>
        <input
          data-testid={`guided-calibration-run-${runNumber}-drops`}
          aria-label={`Run ${runNumber} drops`}
          type="number"
          min="0.01"
          step="any"
          inputMode="decimal"
          value={run.dropsInput}
          onChange={event => onChange('dropsInput', event.target.value)}
          className="mt-1 w-full min-w-0 bg-transparent text-base font-semibold tabular-nums text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
        />
      </label>
      <label className="min-w-0 rounded-lg border border-slate-700/60 bg-slate-950/45 px-2.5 py-2">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Water weight (g)
        </span>
        <input
          data-testid={`guided-calibration-run-${runNumber}-weight`}
          aria-label={`Run ${runNumber} water weight in grams`}
          type="number"
          min="0.01"
          step="any"
          inputMode="decimal"
          value={run.weightInput}
          onChange={event => onChange('weightInput', event.target.value)}
          className="mt-1 w-full min-w-0 bg-transparent text-base font-semibold tabular-nums text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
        />
      </label>
    </div>
  );
}

function Metric({
  label,
  value,
  testId,
}: {
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-cyan-200/15 bg-slate-950/35 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div data-testid={testId} className="mt-1 text-base font-bold tabular-nums text-cyan-100">
        {value}
      </div>
    </div>
  );
}

export function WatermancerGuideCalibrationWizard({
  calibrations,
  onSave,
}: WatermancerGuideCalibrationWizardProps) {
  const [open, setOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<LotusDropperStyle>(() => preferredTip(calibrations));
  const [runs, setRuns] = useState<CalibrationRunInput[]>(initialRuns);
  const result = useMemo(() => calculateWatermancerCalibration(runs), [runs]);
  const selectedTip = TIP_OPTIONS.find(option => option.style === selectedStyle) ?? TIP_OPTIONS[0];
  const firstRunValid = calculateWatermancerCalibration([runs[0]]).isValid;

  const resetWizard = () => {
    setPageIndex(0);
    setSelectedStyle(preferredTip(calibrations));
    setRuns(initialRuns());
  };

  const updateRun = (
    runNumber: number,
    field: keyof CalibrationRunInput,
    value: string,
  ) => {
    setRuns(previous => previous.map((run, index) => (
      index === runNumber - 1 ? { ...run, [field]: value } : run
    )));
  };

  const saveCalibration = () => {
    if (!result.isValid || result.dropsPerMl === null || result.gramsPerDrop === null) return;
    onSave(selectedStyle, {
      dropsInput: numberToInput(result.totalDrops),
      weightInput: numberToInput(result.totalWeightGrams),
      style: selectedStyle,
    });
    setOpen(false);
    resetWizard();
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={nextOpen => {
        setOpen(nextOpen);
        if (nextOpen) resetWizard();
        else setPageIndex(0);
      }}
    >
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          data-testid="button-guided-calibration"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan-200/30 bg-cyan-300/10 px-3.5 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
        >
          <CircleHelp className="h-4 w-4" aria-hidden="true" />
          Guided calibration
        </button>
      </DialogPrimitive.Trigger>
      {open && (
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-slate-950/75 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none" />
          <DialogPrimitive.Content
            aria-label="Guided dropper calibration"
            data-testid="guided-calibration-dialog"
            className="fixed left-1/2 top-1/2 z-[91] flex h-[min(720px,calc(100dvh-1.5rem))] max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-cyan-200/25 bg-slate-900 p-3 text-slate-100 shadow-2xl shadow-black/60 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 sm:h-[min(620px,calc(100dvh-1.5rem))] sm:p-5"
          >
            <header className="flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                  Watermancer Guide · Dropper calibration
                </p>
                <DialogPrimitive.Title asChild>
                  <h2
                    aria-live="polite"
                    data-testid="guided-calibration-title"
                    className="mt-1 text-base font-semibold text-white sm:text-lg"
                  >
                    {WIZARD_PAGES[pageIndex]}
                  </h2>
                </DialogPrimitive.Title>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  data-testid="guided-calibration-progress"
                  className="rounded-full border border-cyan-200/20 bg-cyan-200/[0.06] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-cyan-100"
                >
                  {pageIndex + 1} of {WIZARD_PAGES.length}
                </span>
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    data-testid="guided-calibration-close"
                    aria-label="Close guided calibration"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </DialogPrimitive.Close>
              </div>
            </header>

            <div
              data-testid="guided-calibration-scroll-body"
              className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1 sm:flex sm:flex-col sm:justify-start"
            >
              <section
                data-testid={`guided-calibration-page-${pageIndex + 1}`}
                aria-label={`Page ${pageIndex + 1}: ${WIZARD_PAGES[pageIndex]}`}
                className="space-y-3"
              >
                {pageIndex === 0 && (
                  <>
                    <p className="text-sm leading-relaxed text-slate-300">
                      Choose the tip you want to measure. Straight and round tips are calibrated separately.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {TIP_OPTIONS.map(option => {
                        const selected = option.style === selectedStyle;
                        const tone = option.color === 'cyan'
                          ? selected ? 'border-cyan-200/60 bg-cyan-400/15 text-cyan-100' : 'border-cyan-200/20 bg-cyan-400/[0.04] text-cyan-100/80'
                          : selected ? 'border-rose-200/60 bg-rose-400/15 text-rose-100' : 'border-rose-200/20 bg-rose-400/[0.04] text-rose-100/80';
                        return (
                          <button
                            key={option.style}
                            type="button"
                            data-testid={`guided-calibration-tip-${option.style}`}
                            aria-pressed={selected}
                            onClick={() => setSelectedStyle(option.style)}
                            className={`min-w-0 overflow-hidden rounded-xl border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${tone}`}
                          >
                            <TipPhoto
                              option={option}
                              loading="eager"
                              className="h-32 w-full object-cover object-[80%_72%] sm:h-40"
                            />
                            <span className="mt-2 flex items-center gap-2 text-xs font-semibold sm:text-sm">
                              {selected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                              {option.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {pageIndex === 1 && (
                  <>
                    <p className="text-sm leading-relaxed text-slate-300">
                      Place a cup or pan on the scale and tare it to zero. Hold the dropper vertically while dispensing plain water.
                    </p>
                    <figure className="mx-auto overflow-hidden rounded-xl border border-cyan-200/15 bg-slate-950/45 p-2">
                      <img
                        src={scalePhoto}
                        alt="Milligram scale with a weighing pan."
                        width={1024}
                        height={1024}
                        loading="lazy"
                        decoding="async"
                        className="mx-auto h-36 w-full max-w-[320px] object-contain sm:h-[200px]"
                      />
                    </figure>
                    <p className="rounded-lg border border-amber-200/20 bg-amber-200/[0.06] px-3 py-2 text-xs leading-relaxed text-amber-100/90">
                      A 45° tilt can change drop weight by up to 15–20%. Keep the dropper vertical for each run.
                    </p>
                  </>
                )}

                {pageIndex === 2 && (
                  <>
                    <p className="text-sm leading-relaxed text-slate-300">
                      Dispense 50 drops of plain water into the tared cup, then enter the weight.
                    </p>
                    <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[84px_minmax(0,1fr)]">
                      <TipPhoto option={selectedTip} loading="lazy" className="h-14 w-full object-contain sm:h-16" />
                      <div className="space-y-2">
                        <RunFields
                          runNumber={1}
                          run={runs[0]}
                          onChange={(field, value) => updateRun(1, field, value)}
                        />
                        <p className="text-[11px] leading-relaxed text-cyan-100/80">
                          Using a 0.1 g scale? Use 100 drops.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {pageIndex === 3 && (
                  <>
                    <p className="text-sm leading-relaxed text-slate-300">
                      Repeat the same measurement up to two more times. Runs 2 and 3 are optional.
                    </p>
                    <div className="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[84px_minmax(0,1fr)]">
                      <TipPhoto option={selectedTip} loading="lazy" className="h-14 w-full object-contain sm:h-16" />
                      <div className="space-y-2">
                        {[2, 3].map(runNumber => (
                          <section
                            key={runNumber}
                            className="rounded-lg border border-slate-700/60 bg-slate-950/30 p-2"
                            aria-label={`Run ${runNumber}, optional`}
                          >
                            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Run {runNumber} · optional
                            </div>
                            <RunFields
                              runNumber={runNumber}
                              run={runs[runNumber - 1]}
                              onChange={(field, value) => updateRun(runNumber, field, value)}
                            />
                          </section>
                        ))}
                        <div
                          data-testid="guided-calibration-live-result"
                          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-cyan-200/15 bg-cyan-300/[0.05] px-3 py-2 text-xs"
                        >
                          <span className="text-slate-300">Result so far</span>
                          <strong className="tabular-nums text-cyan-100">
                            {result.dropsPerMl === null ? '—' : `${result.dropsPerMl.toFixed(1)} drops/mL`}
                            {' · '}{result.validRuns.length} valid {result.validRuns.length === 1 ? 'run' : 'runs'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {pageIndex === 4 && (
                  <>
                    <p className="text-sm leading-relaxed text-slate-300">
                      For water, use 1 mL ≈ 1 g. These values combine every valid run.
                    </p>
                    <figure className="overflow-hidden rounded-xl border border-cyan-200/15 bg-slate-950/40">
                      <img
                        src={dropperLineupPhoto}
                        alt="Labelled dropper bottles, one salt per bottle."
                        width={1800}
                        height={719}
                        loading="lazy"
                        decoding="async"
                        data-testid="guided-calibration-lineup-banner"
                        className="h-24 w-full object-cover object-[50%_60%] sm:h-[130px]"
                      />
                    </figure>
                    <div className="grid grid-cols-3 gap-2">
                      <Metric
                        label="Drops per mL"
                        value={result.dropsPerMl === null ? '—' : result.dropsPerMl.toFixed(1)}
                        testId="guided-calibration-result-drops-per-ml"
                      />
                      <Metric
                        label="Grams per drop"
                        value={result.gramsPerDrop === null ? '—' : result.gramsPerDrop.toFixed(4)}
                        testId="guided-calibration-result-grams-per-drop"
                      />
                      <Metric
                        label="Run spread"
                        value={result.spreadPercent === null ? '—' : `${result.spreadPercent.toFixed(1)}%`}
                        testId="guided-calibration-result-spread"
                      />
                    </div>
                    {result.spreadPercent !== null && result.spreadPercent > 5 && (
                      <p
                        role="alert"
                        data-testid="guided-calibration-warning"
                        className="rounded-lg border border-amber-200/25 bg-amber-200/[0.07] px-3 py-2 text-xs leading-relaxed text-amber-100"
                      >
                        Your runs differ by more than 5%. Try again with the dropper held vertical.
                      </p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span>{result.validRuns.length} valid {result.validRuns.length === 1 ? 'run' : 'runs'} included</span>
                      <span>{result.totalDrops} drops · {result.totalWeightGrams} g water</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                      <p className="text-[11px] leading-relaxed text-slate-400">
                        Save applies this measurement to the selected tip in the existing DIY tools.
                      </p>
                      <button
                        type="button"
                        data-testid="guided-calibration-start-over"
                        onClick={() => {
                          setSelectedStyle(preferredTip(calibrations));
                          setRuns(initialRuns());
                          setPageIndex(0);
                        }}
                        className="min-h-9 rounded-lg border border-slate-600/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                      >
                        Start over
                      </button>
                    </div>
                  </>
                )}
              </section>
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
                {pageIndex > 0 && (
                  <button
                    type="button"
                    data-testid="guided-calibration-back"
                    onClick={() => setPageIndex(index => Math.max(0, index - 1))}
                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Back
                  </button>
                )}
                {pageIndex === WIZARD_PAGES.length - 1 ? (
                  <button
                    type="button"
                    data-testid="guided-calibration-save"
                    onClick={saveCalibration}
                    disabled={!result.isValid}
                    className="inline-flex min-h-10 w-24 items-center justify-center gap-1 rounded-lg border border-cyan-200/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Save
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    data-testid="guided-calibration-next"
                    onClick={() => {
                      if (pageIndex === 2) {
                        setRuns(previous => previous.map((run, index) => (
                          index > 0 && run.dropsInput === ''
                            ? { ...run, dropsInput: previous[0].dropsInput }
                            : run
                        )));
                      }
                      setPageIndex(index => Math.min(WIZARD_PAGES.length - 1, index + 1));
                    }}
                    disabled={pageIndex === 2 && !firstRunValid}
                    className="inline-flex min-h-10 w-24 items-center justify-center gap-1 rounded-lg border border-cyan-200/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </footer>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
}

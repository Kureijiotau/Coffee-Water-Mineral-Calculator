import { useState } from 'react';
import { ChevronLeft, ChevronRight, FlaskConical } from 'lucide-react';
import straightTipPhoto from '@assets/4_1792294122444.jpg';
import roundTipPhoto from '@assets/5_1792294122444.jpg';
import saltPantryPhoto from '@assets/9_1792294122446.jpg';
import dropperBottlesPhoto from '@assets/2_1792294122443.jpg';
import scalePhoto from '@assets/6_1792294122444.jpg';
import {
  loadDiyConcentrateInputs,
  saveDiyConcentrateInputs,
  withDiyLotusCalibration,
} from './accountSyncStorage';
import {
  lotusMeasuredDropsPerMl,
  migrateLotusCalibrationInputs,
  type LotusDropperCalibration,
  type LotusDropperStyle,
} from './lotusConcentrate';
import {
  WATERMANCER_GUIDE_STEPS,
  type WatermancerGuideDetail,
  type WatermancerGuideEntry,
  type WatermancerGuideInlineSegment,
} from './watermancerGuideContent';
import WatermancerGuideCounterionComparison from './WatermancerGuideCounterionComparison';
import { WatermancerGuideWorkflow } from './WatermancerGuideWorkflow';
import { WatermancerGuideStartingFramework } from './WatermancerGuideStartingFramework';
import WatermancerGuideStep5Intro from './WatermancerGuideStep5Intro';
import { WatermancerGuideStockPreparation } from './WatermancerGuideStockPreparation';
import { MilligramTooltipText } from './MilligramTooltip';
import { WatermancerGuideSaltProductPreview } from './WatermancerGuideSaltProductPreview';

type WatermancerGuideProps = {
  onOpenWatermancer: () => void;
};

const WATERMANCER_STEP_IDS = new Set(['read-dose-plan', 'make-and-taste']);

function renderGuideInlineSegment(segment: WatermancerGuideInlineSegment, key: string) {
  if (segment.kind === 'text') {
    return <MilligramTooltipText key={key} text={segment.text} />;
  }

  if (segment.kind === 'emphasis') {
    return (
      <strong key={key} className="font-semibold text-cyan-100">
        {segment.text}
      </strong>
    );
  }

  return <WatermancerGuideSaltProductPreview key={key} productId={segment.productId} />;
}

function renderGuideDetail(detail: WatermancerGuideDetail, keyPrefix: string) {
  if (typeof detail === 'string') {
    return <MilligramTooltipText text={detail} />;
  }

  return detail.segments.map((segment, segmentIndex) => (
    renderGuideInlineSegment(segment, `${keyPrefix}-${segmentIndex}`)
  ));
}

function EntryDetails({ entry }: { entry: WatermancerGuideEntry }) {
  if (entry.details.length === 0) return null;

  return (
    <ul className="mt-3 space-y-2">
      {entry.details.map((detail, index) => (
        <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-slate-300 break-words">
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/70" />
          <span className="min-w-0">{renderGuideDetail(detail, `${entry.id}-${index}`)}</span>
        </li>
      ))}
    </ul>
  );
}

const actionClass = 'app-control inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors';

type WatermancerGuideCalibrationCardsProps = {
  calibrations?: Partial<Record<LotusDropperStyle, LotusDropperCalibration>>;
  onUse: (style: LotusDropperStyle, calibration: LotusDropperCalibration) => void;
};

const TIP_CALIBRATION_CARDS: readonly {
  style: LotusDropperStyle;
  photo: string;
  photoAlt: string;
  panel: string;
  title: string;
  inputLabel: string;
  value: string;
}[] = [
  {
    style: 'straight',
    photo: straightTipPhoto,
    photoAlt: 'Close-up of a straight dropper tip.',
    panel: 'border-cyan-300/20 bg-cyan-400/[0.035]',
    title: 'Straight tip',
    inputLabel: 'Straight',
    value: 'text-cyan-100',
  },
  {
    style: 'round',
    photo: roundTipPhoto,
    photoAlt: 'Close-up of a round dropper tip.',
    panel: 'border-rose-300/20 bg-rose-400/[0.035]',
    title: 'Round tip',
    inputLabel: 'Round',
    value: 'text-rose-100',
  },
];

export function WatermancerGuideCalibrationCards({
  calibrations = {},
  onUse,
}: WatermancerGuideCalibrationCardsProps) {
  const [drafts, setDrafts] = useState<Partial<Record<LotusDropperStyle, LotusDropperCalibration>>>(() =>
    Object.fromEntries(TIP_CALIBRATION_CARDS.map(({ style }) => [
      style,
      {
        dropsInput: calibrations[style]?.dropsInput ?? '',
        weightInput: calibrations[style]?.weightInput ?? '',
        style,
      },
    ])) as Partial<Record<LotusDropperStyle, LotusDropperCalibration>>,
  );

  const updateDraft = (
    style: LotusDropperStyle,
    field: 'dropsInput' | 'weightInput',
    value: string,
  ) => {
    setDrafts(previous => ({
      ...previous,
      [style]: {
        dropsInput: previous[style]?.dropsInput ?? '',
        weightInput: previous[style]?.weightInput ?? '',
        ...previous[style],
        [field]: value,
        style,
      },
    }));
  };

  return (
    <div className="mt-4" data-testid="guide-tip-calibrations">
      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        Weigh water drops; for water, 1 g is treated as about 1 mL.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TIP_CALIBRATION_CARDS.map(card => {
          const calibration = drafts[card.style] ?? {
            dropsInput: '',
            weightInput: '',
            style: card.style,
          };
          const rate = lotusMeasuredDropsPerMl(calibration);
          const isApplied = calibrations[card.style]?.dropsInput === calibration.dropsInput
            && calibrations[card.style]?.weightInput === calibration.weightInput
            && rate !== null;

          return (
            <div key={card.style} className="min-w-0" data-testid={`guide-tip-calibration-${card.style}`}>
              <figure className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/60">
                <img
                  src={card.photo}
                  alt={card.photoAlt}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  data-testid={`guide-calibration-photo-${card.style}`}
                  className="aspect-square w-full object-contain"
                />
                <figcaption className="border-t border-slate-700/50 px-2 py-2 text-center text-[10px] leading-relaxed text-slate-400">
                  Tip shape only—not a dispensing-angle example. Hold the dropper vertically.
                </figcaption>
              </figure>
              <section className={`mt-3 rounded-xl border p-3 ${card.panel}`}>
                <h4 className={`text-sm font-semibold ${card.value}`}>{card.title} calibration</h4>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="min-w-0 rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Measured drops
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={calibration.dropsInput}
                      onChange={event => updateDraft(card.style, 'dropsInput', event.target.value)}
                      placeholder="e.g. 100"
                      aria-label={`${card.inputLabel} measured drops`}
                      className="mt-1 w-full min-w-0 bg-transparent text-base font-semibold tabular-nums text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    />
                  </label>
                  <label className="min-w-0 rounded-lg border border-slate-700/60 bg-slate-950/55 px-2.5 py-2">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Water weight (g)
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      inputMode="decimal"
                      value={calibration.weightInput}
                      onChange={event => updateDraft(card.style, 'weightInput', event.target.value)}
                      placeholder="e.g. 5"
                      aria-label={`${card.inputLabel} water weight in grams`}
                      className="mt-1 w-full min-w-0 bg-transparent text-base font-semibold tabular-nums text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                    />
                  </label>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-slate-700/60 bg-slate-950/45 px-3 py-2">
                  <span className="text-xs text-slate-400">Calibration value</span>
                  <strong className={`text-sm tabular-nums ${card.value}`} aria-live="polite">
                    {rate === null ? '— drops/mL' : `${rate.toFixed(1)} drops/mL`}
                  </strong>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span role="status" aria-live="polite" className="min-w-0 text-[10px] text-emerald-200/90">
                    {isApplied ? 'Applied to DIY tools' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUse(card.style, calibration)}
                    disabled={rate === null}
                    aria-label={`Use ${card.style} tip calibration`}
                    data-testid={`button-use-guide-calibration-${card.style}`}
                    className={`app-control min-h-10 shrink-0 rounded-lg border px-4 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      card.style === 'straight'
                        ? 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/20'
                        : 'border-rose-300/35 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20'
                    }`}
                  >
                    Use
                  </button>
                </div>
              </section>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function WatermancerGuide({ onOpenWatermancer }: WatermancerGuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [savedCalibrations, setSavedCalibrations] = useState(() =>
    migrateLotusCalibrationInputs(loadDiyConcentrateInputs().lotusCalibrationInputs ?? {}).calibrations,
  );
  const [workingFillVolumeInput, setWorkingFillVolumeInput] = useState('');
  const [stockDropperStyle, setStockDropperStyle] = useState<LotusDropperStyle>(() =>
    savedCalibrations.straight ? 'straight' : savedCalibrations.round ? 'round' : 'straight',
  );
  const total = WATERMANCER_GUIDE_STEPS.length;
  const step = WATERMANCER_GUIDE_STEPS[stepIndex];
  const isBlankWorkspace = Boolean(step.blankWorkspace);
  const useCalibration = (style: LotusDropperStyle, calibration: LotusDropperCalibration) => {
    const next = withDiyLotusCalibration(loadDiyConcentrateInputs(), style, calibration);
    saveDiyConcentrateInputs(next);
    setSavedCalibrations(previous => ({
      ...previous,
      [style]: { ...calibration, style },
    }));
  };

  const wmButton = (
    <button type="button" onClick={onOpenWatermancer} data-testid="button-open-watermancer"
      className={`${actionClass} border-violet-400/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20`}>
      <FlaskConical className="h-4 w-4" aria-hidden="true" />Open Watermancer
    </button>
  );

  return (
    <div className="app-page-stack mx-auto flex w-full max-w-5xl min-w-0 flex-col" data-testid="watermancer-guide">
      <section aria-labelledby="wg-steps-heading" className="app-panel--quiet app-card min-w-0 overflow-hidden border">
          <div className="app-section-header flex items-center justify-between gap-3 border-b border-slate-700/50 px-4 sm:px-6">
            <h2 id="wg-steps-heading" className="app-section-header__title text-xs font-bold uppercase tracking-[0.14em] text-slate-200">Guided path</h2>
            <span className="text-xs font-semibold text-cyan-200" aria-live="polite" data-testid="text-current-step">
              Step {stepIndex + 1} of {total}
            </span>
          </div>

          <ol className="flex gap-1.5 px-4 pt-4 sm:px-6" aria-label="Guide steps">
            {WATERMANCER_GUIDE_STEPS.map((s, i) => (
              <li key={s.id} className="min-w-0 flex-1">
                <button type="button" onClick={() => setStepIndex(i)}
                  aria-current={i === stepIndex ? 'step' : undefined}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  data-testid={`button-step-${s.id}`}
                  className={`flex h-9 w-full items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                    i === stepIndex
                      ? 'border-cyan-300/60 bg-cyan-400/20 text-cyan-100'
                      : i < stepIndex
                        ? 'border-slate-600/60 bg-slate-700/40 text-slate-300'
                        : 'border-slate-700/60 bg-slate-900/30 text-slate-500 hover:text-slate-300'
                  }`}>
                  {i + 1}
                </button>
              </li>
            ))}
          </ol>

          <article
            className={`app-card-body min-w-0 ${isBlankWorkspace ? 'flex min-h-80 flex-col' : ''}`}
            aria-labelledby={isBlankWorkspace ? undefined : `wg-step-${step.id}`}
            aria-label={isBlankWorkspace ? `Step ${stepIndex + 1}: ${step.title}` : undefined}
            data-testid={`step-${step.id}`}
          >
            {!isBlankWorkspace && (
              <>
            <div className="flex items-start gap-3">
              <span className="app-section-header__step mt-0.5 shrink-0" aria-hidden="true">{stepIndex + 1}</span>
              <div className="min-w-0">
                <h3 id={`wg-step-${step.id}`} className="text-lg font-semibold text-slate-100">
                  <MilligramTooltipText text={step.title} />
                </h3>
                {step.id === 'set-targets' ? (
                  <WatermancerGuideStep5Intro
                    summary={step.summary}
                    onOpenWatermancer={onOpenWatermancer}
                  />
                ) : (
                  <p className="mt-1 text-sm font-medium text-cyan-100/80">
                    <MilligramTooltipText text={step.summary} />
                  </p>
                )}
              </div>
            </div>

            {step.id === 'why-profile' && (
              <>
                <p className="mb-5 text-sm leading-relaxed text-slate-300" data-testid="guide-welcome">
                  <strong className="font-semibold text-slate-100">Welcome to the Watermancer Guide.</strong>{' '}
                  This guide will help you set up a separate dropper for each mineral salt so you can fine-tune your water recipes down to the individual ion levels and gain precise control over your water profile.
                </p>
                <WatermancerGuideCounterionComparison />
              </>
            )}
            <EntryDetails entry={step} />

            {step.id === 'read-dose-plan' && <WatermancerGuideStartingFramework />}
            {step.id === 'make-and-taste' && <WatermancerGuideWorkflow />}

            {step.id === 'prepare-stocks' && (
              <WatermancerGuideStockPreparation
                calibrations={savedCalibrations}
                dropperStyle={stockDropperStyle}
                onDropperStyleChange={setStockDropperStyle}
                workingFillVolumeInput={workingFillVolumeInput}
                onWorkingFillVolumeInputChange={setWorkingFillVolumeInput}
                onOpenCalibration={() => setStepIndex(
                  Math.max(0, WATERMANCER_GUIDE_STEPS.findIndex(entry => entry.id === 'calibrate')),
                )}
              />
            )}

            {step.id === 'calibrate' && (
              <WatermancerGuideCalibrationCards
                calibrations={savedCalibrations}
                onUse={useCalibration}
              />
            )}

            {step.id === 'supplies' && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="guide-supplies-photos">
                <figure className="min-w-0 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/30">
                  <img
                    src={saltPantryPhoto}
                    alt="Potassium bicarbonate beside a jar of salt."
                    width={1024}
                    height={1024}
                    loading="lazy"
                    decoding="async"
                    data-testid="guide-salt-photo"
                    className="aspect-square w-full object-cover"
                  />
                  <figcaption className="border-t border-slate-700/50 px-2 py-2 text-center text-xs font-medium text-slate-300">Salts</figcaption>
                </figure>
                <figure className="min-w-0 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/30">
                  <img
                    src={dropperBottlesPhoto}
                    alt="A tray filled with amber dropper bottles."
                    width={1024}
                    height={1024}
                    loading="lazy"
                    decoding="async"
                    data-testid="guide-dropper-bottles-photo"
                    className="aspect-square w-full object-cover"
                  />
                  <figcaption className="border-t border-slate-700/50 px-2 py-2 text-center text-xs font-medium text-slate-300">
                    Dropper bottles
                  </figcaption>
                </figure>
                <figure className="col-span-2 min-w-0 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/30 sm:col-span-1">
                  <img
                    src={scalePhoto}
                    alt="A compact digital scale for weighing small amounts."
                    width={1024}
                    height={1024}
                    loading="lazy"
                    decoding="async"
                    data-testid="guide-scale-photo"
                    className="aspect-[4/3] w-full bg-slate-950/60 object-contain sm:aspect-square"
                  />
                  <figcaption className="border-t border-slate-700/50 px-2 py-2 text-center text-xs font-medium text-slate-300">
                    Digital scale
                  </figcaption>
                </figure>
              </div>
            )}

            {WATERMANCER_STEP_IDS.has(step.id) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {wmButton}
              </div>
            )}
              </>
            )}

            <nav
              className={`${isBlankWorkspace ? 'mt-auto' : 'mt-6'} flex items-center justify-between gap-2 border-t border-slate-700/50 pt-4`}
              aria-label="Step navigation"
            >
              <button type="button" onClick={() => setStepIndex(i => Math.max(0, i - 1))} disabled={stepIndex === 0}
                data-testid="button-previous-step"
                className={`${actionClass} border-slate-600/60 bg-slate-800/50 text-slate-200 hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40`}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />Previous step
              </button>
              <button type="button" onClick={() => setStepIndex(i => Math.min(total - 1, i + 1))} disabled={stepIndex === total - 1}
                data-testid="button-next-step"
                className={`${actionClass} border-cyan-400/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 disabled:cursor-not-allowed disabled:opacity-40`}>
                Next step<ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          </article>
      </section>
    </div>
  );
}

export {
  WatermancerGuideWorkflow,
  WatermancerGuideStartingFramework,
};

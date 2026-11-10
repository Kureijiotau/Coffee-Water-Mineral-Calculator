import { useEffect, useState } from 'react';
import { Droplet, RotateCcw, Scale } from 'lucide-react';
import { HelpTip } from './HelpTip';
import { ConcentratePreparationSteps } from './concentratePreparation';
import {
  ACCOUNT_SYNC_REMOTE_CHANGE_EVENT,
  loadDiyConcentrateInputs,
  saveDiyConcentrateInputs,
} from './accountSyncStorage';
import {
  LOTUS_BOTTLE_VOLUME_ML,
  LOTUS_BREW_VOLUME_ML,
  LOTUS_DROPPER_DEFINITIONS,
  LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML,
  calculateLotusDiyRecipeDoses,
  lotusCalibratedStockPlan,
  lotusMassStockPlan,
  lotusMeasuredDropsPerMl,
  lotusMeasuredStockDropMassG,
  lotusStockPlan,
  type LotusDropperCalibration,
  type LotusDropperStyle,
  type LotusStockDropMeasurement,
} from './lotusConcentrate';
import { LOTUS_RECIPES } from './lotusRecipes';
import { SALTS } from './waterData';

const US_GALLON_IN_ML = 3785.411784;
const DROP_MASS_SOURCE_LABELS = {
  'stock-measurement': 'Finished-stock measurement',
  calibration: 'Water calibration',
  'lotus-reference': 'Lotus reference estimate',
} as const;

export function LotusMassPreparationPanel({
  dropper,
  style,
  fallbackStraightDropsPerMl = LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML,
  calibration,
  massInput,
  onMassInputChange,
}: {
  dropper: typeof LOTUS_DROPPER_DEFINITIONS[number];
  style: LotusDropperStyle;
  fallbackStraightDropsPerMl?: number;
  calibration?: LotusDropperCalibration;
  massInput: string;
  onMassInputChange: (value: string) => void;
}) {
  const [brewVolumeMl, setBrewVolumeMl] = useState(LOTUS_BREW_VOLUME_ML);
  const [volumeUnit, setVolumeUnit] = useState<'mL' | 'L' | 'Gal'>('mL');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [stockDropMeasurements, setStockDropMeasurements] = useState(
    () => loadDiyConcentrateInputs().lotusStockDropMeasurements ?? {},
  );
  useEffect(() => {
    const refreshMeasurements = () => {
      setStockDropMeasurements(loadDiyConcentrateInputs().lotusStockDropMeasurements ?? {});
    };
    window.addEventListener(ACCOUNT_SYNC_REMOTE_CHANGE_EVENT, refreshMeasurements);
    return () => window.removeEventListener(ACCOUNT_SYNC_REMOTE_CHANGE_EVENT, refreshMeasurements);
  }, []);
  const stockDropMeasurement: LotusStockDropMeasurement = stockDropMeasurements[dropper.id]
    ?? { dropsInput: '', weightInput: '' };
  const updateStockDropMeasurement = (field: keyof LotusStockDropMeasurement, value: string) => {
    const nextMeasurements = {
      ...stockDropMeasurements,
      [dropper.id]: { ...stockDropMeasurement, [field]: value },
    };
    setStockDropMeasurements(nextMeasurements);
    saveDiyConcentrateInputs({
      ...loadDiyConcentrateInputs(),
      lotusStockDropMeasurements: nextMeasurements,
    });
  };
  const measuredStockDropMassG = lotusMeasuredStockDropMassG(stockDropMeasurement);
  const measuredDropsPerMl = lotusMeasuredDropsPerMl(calibration);
  const isCalibrated = measuredDropsPerMl !== null;
  const referencePlan = lotusStockPlan(dropper, style, LOTUS_BOTTLE_VOLUME_ML, fallbackStraightDropsPerMl);
  const calibratedPlan = lotusCalibratedStockPlan(
    dropper,
    style,
    LOTUS_BOTTLE_VOLUME_ML,
    fallbackStraightDropsPerMl,
    calibration,
  );
  const displayedVolumeScale = volumeUnit === 'mL'
    ? 1
    : volumeUnit === 'L' ? 1000 : US_GALLON_IN_ML;
  const displayedVolume = brewVolumeMl / displayedVolumeScale;
  const precision = volumeUnit === 'mL' ? 0 : volumeUnit === 'L' ? 2 : 3;
  const volumeText = `${Number(displayedVolume.toFixed(precision))} ${volumeUnit}`;
  const selectedRecipe = LOTUS_RECIPES.find(recipe => recipe.id === selectedRecipeId);
  const recipeDosePlan = selectedRecipe
    ? calculateLotusDiyRecipeDoses(selectedRecipe, style, brewVolumeMl, calibration, stockDropMeasurements)
    : null;
  const referenceScale = LOTUS_BREW_VOLUME_ML / brewVolumeMl;
  const sourceIonPpm = referencePlan.lotusReferenceIonPpmPerDrop * referenceScale;
  const calibratedIonPpm = calibratedPlan.ionPpmPerDrop * referenceScale;
  const parsedMass = massInput.trim() === '' ? null : Number(massInput);
  const stockPlan = isCalibrated && parsedMass !== null
    ? lotusMassStockPlan(dropper, parsedMass)
    : null;
  const salt = SALTS.find(item => item.id === dropper.saltId) ?? SALTS[0];
  const hydrationForm = salt.hydrationForms[salt.defaultFormIdx ?? 0] ?? salt.hydrationForms[0];
  const ionLabel = ({
    magnesium: 'magnesium',
    calcium: 'calcium',
    potassium: 'potassium',
    sodium: 'sodium',
  } as Record<string, string>)[dropper.ionId] ?? dropper.ionId;

  return (
    <>
      <section
        className="space-y-3 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/[0.06] via-slate-800/75 to-slate-800/70 p-4 shadow-xl sm:p-5"
        data-testid="lotus-brew-volume-section"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Droplet className="h-4 w-4 text-cyan-300" aria-hidden="true" /> Brew-water volume
            </h3>
          </div>
          <strong className="text-sm tabular-nums text-cyan-100" data-testid="lotus-brew-volume-value">
            {volumeText}
          </strong>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-700/70 bg-slate-950/35 p-1" role="group" aria-label="Lotus brew volume units">
            {(['mL', 'L', 'Gal'] as const).map(unit => (
              <button
                key={unit}
                type="button"
                aria-pressed={volumeUnit === unit}
                onClick={() => setVolumeUnit(unit)}
                className={`min-h-10 rounded-md px-3 py-2 text-[10px] font-semibold transition ${
                  volumeUnit === unit
                    ? 'bg-cyan-300/20 text-cyan-100 ring-1 ring-cyan-200/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Reset brew volume"
            onClick={() => {
              setBrewVolumeMl(LOTUS_BREW_VOLUME_ML);
              setVolumeUnit('mL');
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-900/60 px-3 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-cyan-200/40 hover:text-cyan-100"
          >
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset
          </button>
        </div>
        <input
          type="range"
          aria-label="Final brewing water volume"
          aria-valuetext={volumeText}
          data-testid="lotus-brew-volume-slider"
          min={50 / displayedVolumeScale}
          max={2000 / displayedVolumeScale}
          step={10 / displayedVolumeScale}
          value={displayedVolume}
          onChange={event => setBrewVolumeMl(Number(event.target.value) * displayedVolumeScale)}
          className="h-10 w-full cursor-pointer accent-cyan-300"
        />
        <div className="flex justify-between text-[9px] tabular-nums text-slate-500">
          <span>50 mL</span>
          <span className="text-cyan-100/65">Changes ppm per drop</span>
          <span>2 L</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2" data-testid={`lotus-per-drop-summary-${dropper.id}`}>
          <div className="rounded-lg border border-slate-700/70 bg-slate-950/35 p-2.5" data-testid="lotus-fixed-reference">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              {dropper.isBonus ? 'Optional Epsom reference · not Lotus' : 'Lotus source reference'}
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-slate-100">
              +{sourceIonPpm.toFixed(3)} ppm {ionLabel} / drop
            </div>
            <div className="mt-0.5 text-[9px] text-slate-500">Published source model · {volumeText} final water</div>
          </div>
          <div className="rounded-lg border border-cyan-300/25 bg-cyan-400/[0.06] p-2.5" data-testid="lotus-calibrated-ppm-per-drop">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-cyan-200/75">
              Your {style} dropper · {isCalibrated ? 'calibrated' : 'estimate'}
            </div>
            <div className="mt-1 text-sm font-semibold tabular-nums text-cyan-100">
              +{calibratedIonPpm.toFixed(3)} ppm {ionLabel} / drop
            </div>
            <div className="mt-0.5 text-[9px] text-slate-500">
              {calibratedPlan.dropsPerMl.toFixed(1)} drops/mL · {volumeText} final water
            </div>
          </div>
        </div>
        {dropper.isBonus && (
          <p className="text-[9px] leading-relaxed text-amber-100/70">
            The Epsom reference matches Lotus’s magnesium contribution only; Epsom is not a Lotus product.
          </p>
        )}
      </section>
      <section
        className="space-y-3 rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/[0.07] via-slate-800/75 to-slate-800/70 p-4 shadow-xl sm:p-5"
        data-testid="lotus-stock-preparation-section"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200/75">
              <Scale className="h-3.5 w-3.5" aria-hidden="true" /> Weight-based preparation
              <HelpTip testId="lotus-weight-help" label="Why weight-based preparation" text="Weighing is more accurate than measuring volume, so this asks for the finished concentrate mass instead of a volume. For water, 1 mL is about 1 g, so grams and mL are interchangeable for the water." />
            </p>
            <h3 className="mt-1 text-base font-semibold text-white">Make this concentrate </h3>
          </div>
        </div>
        <div className={`grid gap-2 ${stockPlan?.valid ? 'sm:grid-cols-3' : 'sm:grid-cols-1'}`}>
          <label className="block rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
            <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">Finished concentrate mass</span>
            <span className="mt-1 flex items-center gap-2">
              <input
                inputMode="decimal"
                value={massInput}
                onChange={event => onMassInputChange(event.target.value)}
                disabled={!isCalibrated}
                placeholder="e.g. 100"
                aria-label="Finished stock mass in grams"
                data-testid="lotus-finished-stock-mass"
                className="min-h-11 w-full bg-transparent text-sm font-semibold tabular-nums text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="text-xs text-slate-400">g</span>
            </span>
          </label>
          {stockPlan?.valid && (
            <div className="contents" data-testid="lotus-finished-stock-amounts">
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Salt to weigh</div>
                <strong className="mt-1 block text-xl font-semibold tabular-nums text-white" data-testid="lotus-stock-salt-mass">
                  {stockPlan.saltMassG.toFixed(3)} <span className="text-xs font-medium text-slate-400">g</span>
                </strong>
                <div className="text-[9px] text-slate-500">{hydrationForm.label} {salt.name}</div>
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
                <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Water to add</div>
                <strong className="mt-1 block text-xl font-semibold tabular-nums text-white" data-testid="lotus-stock-water-mass">
                  {stockPlan.waterMassG.toFixed(3)} <span className="text-xs font-medium text-slate-400">g</span>
                </strong>
                <div className="text-[9px] text-slate-500">Bottle excluded</div>
              </div>
            </div>
          )}
        </div>
        {parsedMass !== null && !stockPlan?.valid && (
          <p role="alert" className="text-[10px] text-amber-200">Enter a positive, finite finished stock mass.</p>
        )}
        {stockPlan?.valid && (
          <>
            <div className="rounded-lg border border-emerald-300/20 bg-slate-950/25 p-3" data-testid="lotus-selected-stock-preparation">
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Preparation steps</h4>
              <ConcentratePreparationSteps
                totalStockMassG={stockPlan.totalStockMassG}
                waterMassG={stockPlan.waterMassG}
                saltLabel={`${stockPlan.saltMassG.toFixed(3)} g ${hydrationForm.label} ${salt.name}`}
              />
            </div>
          </>
        )}
        <div
          className="rounded-xl border border-cyan-300/20 bg-cyan-400/[0.04] p-3"
          data-testid="lotus-stock-drop-measurement"
        >
          <div className="text-[9px] font-semibold uppercase tracking-wider text-cyan-100/80">
            Measure this finished stock
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
            Weigh drops from this {dropper.label} stock, not plain water. Saved separately for each stock.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">Measured drops</span>
              <input
                inputMode="decimal"
                value={stockDropMeasurement.dropsInput}
                onChange={event => updateStockDropMeasurement('dropsInput', event.target.value)}
                aria-label={`${dropper.label} stock measured drops`}
                data-testid="lotus-stock-measured-drops"
                placeholder="e.g. 20"
                className="mt-1 min-h-9 w-full bg-transparent text-sm font-semibold tabular-nums text-slate-100 outline-none"
              />
            </label>
            <label className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">Weight of those drops</span>
              <span className="mt-1 flex items-center gap-2">
                <input
                  inputMode="decimal"
                  value={stockDropMeasurement.weightInput}
                  onChange={event => updateStockDropMeasurement('weightInput', event.target.value)}
                  aria-label={`${dropper.label} stock measured weight in grams`}
                  data-testid="lotus-stock-measured-weight"
                  placeholder="e.g. 1"
                  className="min-h-9 w-full bg-transparent text-sm font-semibold tabular-nums text-slate-100 outline-none"
                />
                <span className="text-xs text-slate-400">g</span>
              </span>
            </label>
          </div>
          {measuredStockDropMassG !== null ? (
            <p className="mt-2 text-[10px] font-medium text-emerald-200" data-testid="lotus-stock-measurement-status">
              Using finished-stock measurement · {measuredStockDropMassG.toFixed(4)} g/drop
            </p>
          ) : (stockDropMeasurement.dropsInput || stockDropMeasurement.weightInput) ? (
            <p role="alert" className="mt-2 text-[10px] text-amber-200">
              Enter a positive drop count and weight; recipe doses will use the fallback until both are valid.
            </p>
          ) : (
            <p className="mt-2 text-[10px] text-slate-500" data-testid="lotus-stock-measurement-status">
              Recipe doses use the active fallback basis until measured.
            </p>
          )}
        </div>
      </section>
      <details
        className="rounded-2xl border border-fuchsia-300/20 bg-gradient-to-br from-fuchsia-400/[0.06] via-slate-800/75 to-violet-400/[0.045] p-4 shadow-xl sm:p-5"
        data-testid="lotus-recipe-dose-panel"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden">
          <span className="flex min-w-0 items-center gap-2.5">
            <Droplet className="h-4 w-4 shrink-0 text-fuchsia-200" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-100">Dose a published Lotus recipe</span>
              <span className="mt-0.5 block text-[10px] text-slate-400">
                {volumeText} · {style === 'round' ? 'Round' : 'Straight'} tip
              </span>
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/[0.07] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-fuchsia-100/80">
            DIY estimate
          </span>
        </summary>
        <div className="mt-3 space-y-3 border-t border-fuchsia-200/10 pt-3">
          <label className="block rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
            <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">
              Published recipe
            </span>
            <select
              aria-label="Published Lotus recipe"
              data-testid="lotus-recipe-dose-select"
              value={selectedRecipeId}
              onChange={event => setSelectedRecipeId(event.target.value)}
              className="mt-1 min-h-11 w-full bg-transparent text-sm font-semibold text-slate-100 outline-none"
            >
              <option value="">Choose a recipe</option>
              {LOTUS_RECIPES.map(recipe => (
                <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
              ))}
            </select>
          </label>
          {recipeDosePlan && selectedRecipe && (
            <div className="space-y-3" data-testid="lotus-recipe-dose-results">
              <div className="grid gap-2 sm:grid-cols-2">
                {LOTUS_DROPPER_DEFINITIONS.filter(dropper => !dropper.isBonus).map(dropper => (
                  <div
                    key={dropper.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2.5"
                    data-testid={`lotus-recipe-dose-row-${dropper.id}`}
                  >
                    <span className="text-xs font-medium text-slate-300">{dropper.label}</span>
                    <div className="text-right">
                      <strong
                        className="block text-sm font-semibold tabular-nums text-white"
                        data-testid={`lotus-recipe-dose-count-${dropper.id}`}
                      >
                        {recipeDosePlan.counts[dropper.id as 'magnesium' | 'calcium' | 'potassium' | 'sodium']} drops
                      </strong>
                      <span
                        className="block text-[9px] text-slate-500"
                        data-testid={`lotus-recipe-dose-basis-${dropper.id}`}
                      >
                        {DROP_MASS_SOURCE_LABELS[recipeDosePlan.stockDropMassSources[dropper.id as 'magnesium' | 'calcium' | 'potassium' | 'sodium']]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] leading-relaxed text-slate-400">
                Watermancer estimate for DIY stocks, not Lotus’s unpublished commercial concentrates.
                {' '}
                Basis is shown for each stock; unfinished or invalid stock measurements use the active fallback.
                {' '}
                <a
                  className="font-semibold text-cyan-200 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-100"
                  href={selectedRecipe.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Lotus instructions
                </a>
              </p>
            </div>
          )}
        </div>
      </details>
    </>
  );
}

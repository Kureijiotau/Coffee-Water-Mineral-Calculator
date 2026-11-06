import { StableNumberInput } from './components/StableNumberInput';
import { ConcentratePreparationSteps } from './concentratePreparation';
import {
  LOTUS_DROPPER_DEFINITIONS,
  lotusMassStockPlan,
  lotusStockPlan,
  type LotusDropperStyle,
} from './lotusConcentrate';

export function LotusInlineStockPreparation({
  dropper,
  style,
  isCalibrated,
  massInput,
  onMassInputChange,
}: {
  dropper: typeof LOTUS_DROPPER_DEFINITIONS[number];
  style: LotusDropperStyle;
  isCalibrated: boolean;
  massInput: string;
  onMassInputChange: (value: string) => void;
}) {
  const parsedMass = massInput.trim() === '' ? null : Number(massInput);
  const finishedMassPlan = isCalibrated && parsedMass !== null
    ? lotusMassStockPlan(dropper, parsedMass)
    : null;
  const hasValidFinishedMass = finishedMassPlan?.valid === true;
  const referencePlan = lotusStockPlan(dropper, style);

  return (
    <section className="space-y-3 rounded-xl border border-emerald-300/20 bg-emerald-400/[0.035] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-emerald-100">Prepare this stock</h3>
          <p className="mt-0.5 text-[10px] text-slate-400">Finished weight includes salt + water, not the bottle.</p>
          {dropper.isBonus && (
            <p className="mt-1 text-[9px] leading-relaxed text-amber-100/75">
              Optional Epsom reference · not Lotus. Epsom is not a Lotus product.
            </p>
          )}
        </div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wider ${
          isCalibrated
            ? 'border border-emerald-300/25 bg-emerald-400/10 text-emerald-200'
            : 'border border-amber-300/25 bg-amber-400/10 text-amber-200'
        }`}>
          {isCalibrated ? `${style} calibrated` : `Calibrate ${style} tip`}
        </span>
      </div>
      {!isCalibrated && (
        <p role="status" className="rounded-lg border border-amber-300/20 bg-amber-400/[0.06] px-3 py-2 text-[10px] text-amber-100/90">
          Complete the selected tip-style calibration above to unlock the finished stock weight.
        </p>
      )}
      <label className="block max-w-sm">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Finished stock mass</span>
        <span className="mt-1 flex items-center gap-2 rounded-lg border border-slate-700/70 bg-slate-950/35 px-3 py-2">
          <StableNumberInput
            min="0.01"
            step="0.01"
            value={massInput}
            onChange={event => onMassInputChange(event.target.value)}
            disabled={!isCalibrated}
            placeholder="e.g. 100"
            aria-label="Finished stock mass in grams"
            data-testid="lotus-finished-stock-mass"
            className="w-full bg-transparent text-right text-sm font-semibold tabular-nums text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="text-xs text-slate-400">g</span>
        </span>
      </label>
      {massInput.trim() !== '' && !hasValidFinishedMass && (
        <p role="alert" className="text-[10px] text-amber-200">
          Enter a positive, finite finished stock mass.
        </p>
      )}
      {finishedMassPlan?.valid && (
        <>
          <div className="grid gap-2 sm:grid-cols-2" data-testid="lotus-finished-stock-amounts">
            <div className="rounded-lg border border-slate-700/70 bg-slate-950/35 p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Salt to weigh</div>
              <strong className="mt-1 block text-sm tabular-nums text-slate-100" data-testid="lotus-stock-salt-mass">
                {finishedMassPlan.saltMassG.toFixed(3)} g
              </strong>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-950/35 p-2.5">
              <div className="text-[9px] uppercase tracking-wider text-slate-500">Water to add</div>
              <strong className="mt-1 block text-sm tabular-nums text-slate-100" data-testid="lotus-stock-water-mass">
                {finishedMassPlan.waterMassG.toFixed(3)} g
              </strong>
            </div>
          </div>
          <div
            className="rounded-lg border border-emerald-300/20 bg-slate-950/25 p-3"
            data-testid="lotus-selected-stock-preparation"
          >
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Preparation steps</h4>
            <ConcentratePreparationSteps
              totalStockMassG={finishedMassPlan.totalStockMassG}
              waterMassG={finishedMassPlan.waterMassG}
              saltLabel={`${finishedMassPlan.saltMassG.toFixed(3)} g ${referencePlan.hydrationForm} ${referencePlan.saltName}`}
            />
          </div>
        </>
      )}
    </section>
  );
}

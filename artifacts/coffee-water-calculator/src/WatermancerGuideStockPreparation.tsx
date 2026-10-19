import parchmentPaperPhoto from '@assets/1_1792294122443.jpg';
import {
  LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML,
  lotusDropsPerMl,
  lotusMeasuredDropsPerMl,
  type LotusDropperCalibration,
  type LotusDropperStyle,
} from './lotusConcentrate';
import {
  calculateOneMgPerDropStockPlan,
  WATERMANCER_GUIDE_STOCK_HEADROOM_ML,
} from './watermancerGuideStock';
import { MilligramTooltipText } from './MilligramTooltip';

type WatermancerGuideStockPreparationProps = {
  calibrations: Partial<Record<LotusDropperStyle, LotusDropperCalibration>>;
  dropperStyle: LotusDropperStyle;
  onDropperStyleChange: (style: LotusDropperStyle) => void;
  bottleVolumeInput: string;
  onBottleVolumeInputChange: (value: string) => void;
  onOpenCalibration: () => void;
};

const TIP_OPTIONS: readonly {
  style: LotusDropperStyle;
  label: string;
  selectedClass: string;
}[] = [
  {
    style: 'straight',
    label: 'Straight',
    selectedClass: 'border-cyan-300/50 bg-cyan-400/15 text-cyan-100',
  },
  {
    style: 'round',
    label: 'Round',
    selectedClass: 'border-rose-300/50 bg-rose-400/15 text-rose-100',
  },
];

function Result({ label, value, note, tone }: {
  label: string;
  value: string;
  note: string;
  tone: 'amber' | 'sky' | 'emerald';
}) {
  const tones = {
    amber: 'border-amber-300/20 bg-amber-400/[0.06] text-amber-100',
    sky: 'border-sky-300/20 bg-sky-400/[0.06] text-sky-100',
    emerald: 'border-emerald-300/20 bg-emerald-400/[0.06] text-emerald-100',
  };

  return (
    <div className={`min-w-0 rounded-xl border p-3 ${tones[tone]}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-75">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums">
        <MilligramTooltipText text={value} />
      </div>
      <div className="mt-1 text-[10px] leading-relaxed text-slate-400">
        <MilligramTooltipText text={note} />
      </div>
    </div>
  );
}

export function WatermancerGuideStockPreparation({
  calibrations,
  dropperStyle,
  onDropperStyleChange,
  bottleVolumeInput,
  onBottleVolumeInputChange,
  onOpenCalibration,
}: WatermancerGuideStockPreparationProps) {
  const savedCalibration = calibrations[dropperStyle];
  const measuredDropsPerMl = lotusMeasuredDropsPerMl(savedCalibration);
  const estimatedDropsPerMl = lotusDropsPerMl(
    dropperStyle,
    LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML,
  );
  const dropsPerMl = measuredDropsPerMl ?? estimatedDropsPerMl;
  const waterDropMassG = measuredDropsPerMl !== null && savedCalibration
    ? Number(savedCalibration.weightInput) / Number(savedCalibration.dropsInput)
    : 1 / estimatedDropsPerMl;
  const volumeMl = Number(bottleVolumeInput);
  const plan = bottleVolumeInput.trim() !== '' && Number.isFinite(volumeMl)
    ? calculateOneMgPerDropStockPlan(volumeMl, waterDropMassG)
    : null;
  const invalidVolume = bottleVolumeInput.trim() !== '' && plan === null;

  return (
    <section
      className="mt-4 rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/[0.07] via-slate-800/80 to-slate-900/70 p-4 sm:p-5"
      aria-labelledby="guide-stock-preparation-title"
      data-testid="guide-stock-preparation"
    >
      <h4 id="guide-stock-preparation-title" className="text-sm font-semibold text-emerald-100">
        Calculate one stock
      </h4>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">
        Same tip calibration and bottle size means the same salt mass for every salt.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Dropper bottle volume
          </span>
          <span className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min={WATERMANCER_GUIDE_STOCK_HEADROOM_ML + 1}
              step="1"
              inputMode="decimal"
              value={bottleVolumeInput}
              onChange={event => onBottleVolumeInputChange(event.target.value)}
              placeholder="e.g. 59"
              aria-label="Dropper bottle volume in milliliters"
              aria-invalid={invalidVolume}
              className="w-full min-w-0 bg-transparent text-xl font-semibold tabular-nums text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
              data-testid="input-guide-dropper-volume"
            />
            <span className="text-sm text-slate-400">mL</span>
          </span>
        </label>

        <div className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Tip style
          </span>
          <div className="mt-1 grid grid-cols-2 gap-2" role="group" aria-label="Dropper tip style">
            {TIP_OPTIONS.map(option => {
              const optionRate = lotusMeasuredDropsPerMl(calibrations[option.style])
                ?? lotusDropsPerMl(option.style, LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML);
              const selected = option.style === dropperStyle;
              return (
                <button
                  key={option.style}
                  type="button"
                  onClick={() => onDropperStyleChange(option.style)}
                  aria-pressed={selected}
                  aria-label={`${option.label} tip, ${optionRate.toFixed(1)} drops per milliliter`}
                  data-testid={`guide-stock-tip-${option.style}`}
                  className={`min-h-11 rounded-xl border px-2 py-2 text-left text-xs font-semibold transition-colors ${
                    selected
                      ? option.selectedClass
                      : 'border-slate-700/60 bg-slate-950/30 text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <span className="block">{option.label}</span>
                  <span className="mt-0.5 block text-[10px] font-medium opacity-80">
                    {optionRate.toFixed(1)} drops/mL
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className={`mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${
          measuredDropsPerMl === null
            ? 'border-amber-300/25 bg-amber-400/[0.06] text-amber-100'
            : 'border-emerald-300/20 bg-emerald-400/[0.05] text-emerald-100'
        }`}
        role="status"
        aria-live="polite"
      >
        <span>
          {dropsPerMl.toFixed(1)} drops/mL · {measuredDropsPerMl === null ? 'estimate' : 'Step 3 calibration'}
        </span>
        {measuredDropsPerMl === null && (
          <button
            type="button"
            onClick={onOpenCalibration}
            className="font-semibold underline decoration-amber-200/50 underline-offset-2 hover:text-white"
            data-testid="button-calibrate-selected-guide-tip"
          >
            Calibrate in Step 3
          </button>
        )}
      </div>

      {plan ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-3" aria-live="polite" data-testid="guide-stock-plan">
          <Result
            label="Salt to weigh"
            value={`${plan.saltMassG.toFixed(3)} g`}
            note={`${plan.saltMassMg.toFixed(1)} mg · 1 mg per drop`}
            tone="amber"
          />
          <Result
            label="Water to add"
            value={`${plan.waterMassG.toFixed(3)} g`}
            note="Distilled or RO water"
            tone="sky"
          />
          <Result
            label="Total mix"
            value={`${plan.totalMixMassG.toFixed(3)} g`}
            note={`≈ ${plan.stockVolumeMl.toFixed(1)} mL stock · ${plan.headroomMl} mL headroom`}
            tone="emerald"
          />
        </div>
      ) : (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
            invalidVolume
              ? 'border-rose-300/25 bg-rose-400/[0.06] text-rose-100'
              : 'border-slate-700/60 bg-slate-950/25 text-slate-400'
          }`}
          role={invalidVolume ? 'alert' : 'status'}
          data-testid="guide-stock-plan-empty"
        >
          {invalidVolume
            ? `Use a bottle larger than ${WATERMANCER_GUIDE_STOCK_HEADROOM_ML} mL to leave mixing headroom.`
            : 'Enter the bottle volume to calculate the amounts.'}
        </p>
      )}

      <p className="mt-3 rounded-lg border border-cyan-300/15 bg-cyan-400/[0.04] px-3 py-2 text-xs leading-relaxed text-cyan-100/80">
        Leave 5–10 mL of headroom so you can shake and dissolve the salt. These amounts leave 5 mL free; use a bottle 5 mL larger to leave 10 mL.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <figure className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/50">
          <img
            src={parchmentPaperPhoto}
            alt="Parchment paper being cut into a small piece for weighing salt."
            width={1024}
            height={1024}
            loading="lazy"
            decoding="async"
            data-testid="guide-parchment-photo"
            className="aspect-[4/3] w-full object-cover"
          />
          <figcaption className="border-t border-slate-700/50 px-3 py-2 text-center text-xs text-slate-300">
            Parchment makes the salt easy to transfer.
          </figcaption>
        </figure>

        <ol className="space-y-2 self-center text-xs leading-relaxed text-slate-300" data-testid="guide-stock-mixing-order">
          <li className="flex gap-2">
            <span className="font-bold text-emerald-200">1.</span>
            <span>Place parchment on the scale and tare it.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-emerald-200">2.</span>
            <span>Weigh the salt amount shown.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-emerald-200">3.</span>
            <span>Transfer the salt to its bottle, then add the water amount shown.</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold text-emerald-200">4.</span>
            <span>Keep 5–10 mL of headroom, close, and shake until dissolved.</span>
          </li>
        </ol>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        Uses the same concentrate estimate: 1 mL ≈ 1 g of total mix.
      </p>
    </section>
  );
}

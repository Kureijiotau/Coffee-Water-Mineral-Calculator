import parchmentPaperPhoto from '@assets/1_1792294122443.jpg';
import { useState } from 'react';
import { ConcentratePreparationSteps, WATER_MASS_NOTE } from './concentratePreparation';
import {
  LOTUS_NOMINAL_STRAIGHT_DROPS_PER_ML,
  lotusDropsPerMl,
  lotusMeasuredDropsPerMl,
  type LotusDropperCalibration,
  type LotusDropperStyle,
} from './lotusConcentrate';
import { calculateOneMgPerDropStockPlan } from './watermancerGuideStock';
import { MilligramTooltipText } from './MilligramTooltip';

type WatermancerGuideStockPreparationProps = {
  calibrations: Partial<Record<LotusDropperStyle, LotusDropperCalibration>>;
  dropperStyle: LotusDropperStyle;
  onDropperStyleChange: (style: LotusDropperStyle) => void;
  targetStockMassInput: string;
  onTargetStockMassInputChange: (value: string) => void;
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
  targetStockMassInput,
  onTargetStockMassInputChange,
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
  const [stockDrops, setStockDrops] = useState('');
  const [stockMass, setStockMass] = useState('');
  const [verification, setVerification] = useState<{ key: string; gramsPerDrop: number } | null>(null);
  const totalStockMassG = Number(targetStockMassInput);
  const verificationKey = `${totalStockMassG}:${dropperStyle}:${waterDropMassG}`;
  const plan = targetStockMassInput.trim() !== '' && Number.isFinite(totalStockMassG)
    ? calculateOneMgPerDropStockPlan(totalStockMassG, { basis: 'water-estimate', drops: 1, massG: waterDropMassG, compositionKey: '', tipKey: dropperStyle })
    : null;
  const invalidVolume = targetStockMassInput.trim() !== '' && plan === null;

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
        Water-calibrated planning estimate: target finished-stock weight and tip estimate set the salt mass. Verify each salt with drops of its actual finished stock.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="min-w-0 rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Target stock weight
          </span>
          <span className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              value={targetStockMassInput}
              onChange={event => onTargetStockMassInputChange(event.target.value)}
              placeholder="e.g. 50"
              aria-label="Target stock weight in grams"
              aria-invalid={invalidVolume}
              className="w-full min-w-0 bg-transparent text-xl font-semibold tabular-nums text-slate-100 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
              data-testid="input-guide-target-stock-mass"
            />
            <span className="text-sm text-slate-400">g</span>
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
                    {(1 / optionRate).toFixed(5)} g/water drop
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
          {waterDropMassG.toFixed(5)} g/water drop · {measuredDropsPerMl === null ? 'source estimate' : 'Step 3 water calibration'} — finished-stock drops are still estimated
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
            note={`${plan.saltMassMg.toFixed(1)} mg · target ≈ 1 mg per drop; verify`}
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
            value={`${plan.totalStockMassG.toFixed(3)} g`}
            note="Salt + water, excluding the bottle"
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
            ? 'Enter a positive stock weight and valid drop estimate that leaves water in the mix.'
            : 'Enter the target stock weight to calculate the amounts.'}
        </p>
      )}

      <p className="mt-3 rounded-lg border border-cyan-300/15 bg-cyan-400/[0.04] px-3 py-2 text-xs leading-relaxed text-cyan-100/80">
        Leave 5–10 mL of physical headroom for shaking and dissolving. Use a larger bottle if needed; finished stock weight does not tell you its occupied volume.
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
            Parchment makes the salt easy to transfer; rinse any clinging crystals into the bottle.
          </figcaption>
        </figure>

        <div className="self-center" data-testid="guide-stock-mixing-order">
          {plan ? <ConcentratePreparationSteps totalStockMassG={plan.totalStockMassG} waterMassG={plan.waterMassG} saltLabel={`${plan.saltMassG.toFixed(3)} g of the selected salt, weighed on tared parchment`} />
            : <p className="text-xs text-slate-400">Tare the bottle; add 20–30% of the calculated water weight, transfer salt, mix, then add the remaining water to total stock weight. Do not tare again.</p>}
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
        {WATER_MASS_NOTE}
      </p>
      {plan && <details className="mt-3 rounded-lg border border-slate-700/60 p-3 text-xs">
        <summary className="cursor-pointer text-emerald-100">Verify actual finished-stock drops</summary>
        <p className="mt-2 text-slate-400">For each prepared salt stock, weigh counted drops in a tared cup, holding the dropper vertically. This checks the existing formulation; it does not silently change it.</p>
        <label className="mt-2 block">Counted finished-stock drops<input aria-label="Guide counted finished-stock drops" className="ml-2 rounded bg-slate-950 p-2" value={stockDrops} onChange={e => setStockDrops(e.target.value)} /></label>
        <label className="mt-2 block">Measured stock weight (g)<input aria-label="Guide measured finished-stock weight" className="ml-2 rounded bg-slate-950 p-2" value={stockMass} onChange={e => setStockMass(e.target.value)} /></label>
        <button className="mt-3 rounded border border-emerald-400/30 px-3 py-2" disabled={![Number(stockDrops), Number(stockMass)].every(v => Number.isFinite(v) && v > 0)}
          onClick={() => setVerification({ key: verificationKey, gramsPerDrop: Number(stockMass) / Number(stockDrops) })}>Check this stock</button>
        {verification?.key === verificationKey && <p className="mt-2 text-emerald-100">Measured: {(plan.saltMassMg / plan.totalStockMassG * verification.gramsPerDrop).toFixed(3)} mg physical salt per drop. Repeat for each salt stock.</p>}
      </details>}
    </section>
  );
}

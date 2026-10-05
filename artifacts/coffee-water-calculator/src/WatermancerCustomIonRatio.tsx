import React from 'react';
import { ION_MAP, type IonId } from './waterData';
import {
  formatCustomIonRatio,
  type CustomIonRatioPair,
  type CustomIonRatioSide,
} from './watermancerCustomIonRatio';

export function WatermancerCustomIonRatio({
  pair,
  ionValues,
  onCycleSide,
}: {
  pair: CustomIonRatioPair;
  ionValues: Partial<Record<IonId, number>>;
  onCycleSide: (side: CustomIonRatioSide) => void;
}) {
  const leftIon = ION_MAP[pair.left];
  const rightIon = ION_MAP[pair.right];
  const ratio = formatCustomIonRatio(
    ionValues[pair.left] ?? 0,
    ionValues[pair.right] ?? 0,
  );

  return (
    <div
      role="group"
      aria-label={`${leftIon.name} to ${rightIon.name} custom ion ratio`}
      data-testid="watermancer-custom-ion-ratio"
      data-pair={`${pair.left}:${pair.right}`}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10px] tabular-nums transition-colors hover:bg-cyan-500/10"
    >
      <button
        type="button"
        onClick={() => onCycleSide('left')}
        aria-label={`Cycle left ion in custom ratio, currently ${leftIon.name}`}
        title={`Click to cycle left ion · currently ${leftIon.name}`}
        data-testid="watermancer-custom-ion-ratio-left"
        className="rounded px-0.5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-200"
      >
        <span style={{ color: leftIon.color.foreground }}>{leftIon.formula}</span>
      </button>
      <span aria-hidden="true" className="text-slate-500">:</span>
      <button
        type="button"
        onClick={() => onCycleSide('right')}
        aria-label={`Cycle right ion in custom ratio, currently ${rightIon.name}`}
        title={`Click to cycle right ion · currently ${rightIon.name}`}
        data-testid="watermancer-custom-ion-ratio-right"
        className="rounded px-0.5 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-200"
      >
        <span style={{ color: rightIon.color.foreground }}>{rightIon.formula}</span>
      </button>
      <span className="ml-0.5 whitespace-nowrap font-semibold text-slate-100" data-testid="watermancer-custom-ion-ratio-value">
        {ratio}
      </span>
    </div>
  );
}
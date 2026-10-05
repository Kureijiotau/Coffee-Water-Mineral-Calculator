import { useState } from 'react';
import { AlertTriangle, Check, Scale } from 'lucide-react';
import { ION_MAP, type IonId } from '@/waterData';
import type { IonicTargetValues } from './watermancerProfiles';
import {
  hasHighRelativeChargeGap,
  applyChargeBalanceAlternative,
  analyzeWatermancerChargeBalance,
  getChargeBalanceIonName,
  getWatermancerTargetSignature,
  type ChargeBalanceAnalysis,
  type ChargeBalanceAlternative,
} from './watermancerChargeBalance';

interface CheckedSnapshot {
  signature: string;
  analysis: ChargeBalanceAnalysis;
  applied?: {
    ionId: IonId;
    targetPpm: number;
  };
}

interface WatermancerChargeBalanceCheckerProps {
  targetIons: Partial<Record<IonId, number>>;
  targetSource: string;
  onApplyTargets: (targets: IonicTargetValues) => void;
}

function formatSignedMeq(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(3)} meq/L`;
}

export default function WatermancerChargeBalanceChecker({
  targetIons,
  targetSource,
  onApplyTargets,
}: WatermancerChargeBalanceCheckerProps) {
  const [checkedSnapshot, setCheckedSnapshot] = useState<CheckedSnapshot | null>(null);
  const currentSignature = getWatermancerTargetSignature(targetSource, targetIons);
  const isStale = checkedSnapshot !== null && checkedSnapshot.signature !== currentSignature;
  const hasHighRelativeGap = hasHighRelativeChargeGap(targetIons);

  const runCheck = () => {
    setCheckedSnapshot({
      signature: currentSignature,
      analysis: analyzeWatermancerChargeBalance(targetIons),
    });
  };

  const applyAlternative = (alternative: ChargeBalanceAlternative) => {
    if (!checkedSnapshot || isStale || checkedSnapshot.analysis.status !== 'unbalanced') return;

    const nextTargets = applyChargeBalanceAlternative(targetIons, alternative) as IonicTargetValues;

    onApplyTargets(nextTargets);
    setCheckedSnapshot({
      signature: getWatermancerTargetSignature(targetSource, nextTargets),
      analysis: analyzeWatermancerChargeBalance(nextTargets),
      applied: {
        ionId: alternative.ionId,
        targetPpm: alternative.proposedTargetPpm,
      },
    });
  };

  return (
    <section
      className={checkedSnapshot
        ? 'mx-3 my-3 rounded-xl border border-cyan-400/20 bg-slate-950/35 p-3 sm:mx-4 sm:p-4'
        : 'mx-3 my-2 sm:mx-4'}
      aria-label="Watermancer charge-balance checker"
      data-testid="watermancer-charge-balance-checker"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {checkedSnapshot && (
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
            <div className="min-w-0">
              <h3
                id="watermancer-charge-balance-title"
                className="text-sm font-semibold text-slate-100"
              >
                Charge-balance reality check
              </h3>
              <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-400">
                Checks the selected target profile at 100% strength. It uses the eight core target ions
                and their configured charges; it does not account for pH-dependent speciation,
                supplemental carriers, source or salt availability, solubility, or taste.
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={runCheck}
          aria-label={hasHighRelativeGap
            ? 'Check charge balance; relative charge gap is at least 20 percent'
            : checkedSnapshot ? 'Run charge-balance check again' : 'Check charge balance'}
          title="Turns red when the relative charge gap reaches 20%."
          data-testid="watermancer-charge-check-run"
          className={`inline-flex min-h-8 shrink-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
            hasHighRelativeGap
              ? 'border-rose-300/45 bg-rose-500/15 text-rose-100 hover:border-rose-200/60 hover:bg-rose-500/25 focus-visible:ring-rose-300/70'
              : 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100 hover:border-cyan-200/50 hover:bg-cyan-400/20 focus-visible:ring-cyan-300/60'
          }`}
        >
          <Scale className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{checkedSnapshot ? 'Run check again' : 'Check balance'}</span>
          {hasHighRelativeGap && (
            <span className="rounded-full border border-rose-200/25 bg-rose-300/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide">
              ≥20% gap
            </span>
          )}
        </button>
      </div>

      {isStale && (
        <p
          className="mt-3 rounded-lg border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
          role="status"
          data-testid="watermancer-charge-check-stale"
        >
          Targets or their source changed since this check. Run it again before applying a suggestion.
        </p>
      )}

      {checkedSnapshot && (
        <div
          className="mt-3 border-t border-slate-700/60 pt-3"
          aria-live="polite"
          data-testid="watermancer-charge-check-result"
        >
          <div className="grid grid-cols-1 gap-2 min-[460px]:grid-cols-3">
            <div className="rounded-lg bg-slate-900/60 px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Positive charge
              </div>
              <div className="mt-0.5 tabular-nums text-sm font-semibold text-cyan-100">
                {checkedSnapshot.analysis.positiveMeqPerL.toFixed(3)} meq/L
              </div>
            </div>
            <div className="rounded-lg bg-slate-900/60 px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Negative charge
              </div>
              <div className="mt-0.5 tabular-nums text-sm font-semibold text-violet-100">
                {checkedSnapshot.analysis.negativeMeqPerL.toFixed(3)} meq/L
              </div>
            </div>
            <div className="rounded-lg bg-slate-900/60 px-3 py-2">
              <div className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Difference · positive − negative
              </div>
              <div className="mt-0.5 tabular-nums text-sm font-semibold text-slate-100">
                {formatSignedMeq(checkedSnapshot.analysis.differenceMeqPerL)}
              </div>
            </div>
          </div>

          {checkedSnapshot.applied && (
            <p
              className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100"
              role="status"
              data-testid="watermancer-charge-check-applied"
            >
              Applied {getChargeBalanceIonName(checkedSnapshot.applied.ionId)} target:
              {' '}{checkedSnapshot.applied.targetPpm.toFixed(1)} ppm. This is a current target
              override; save the profile separately if you want to keep it.
            </p>
          )}

          {checkedSnapshot.analysis.status === 'invalid' && (
            <p className="mt-3 text-xs text-rose-200" role="alert">
              The check could not run because these targets are invalid:{' '}
              {checkedSnapshot.analysis.invalidIonIds
                .map(getChargeBalanceIonName)
                .join(', ')}. Targets must be finite, non-negative numbers.
            </p>
          )}

          {checkedSnapshot.analysis.status === 'no-targets' && (
            <p className="mt-3 text-xs text-slate-300" role="status">
              No ion targets to check. Set at least one core ion target first.
            </p>
          )}

          {checkedSnapshot.analysis.status === 'balanced' && (
            <p
              className="mt-3 flex items-center gap-2 text-xs font-medium text-emerald-200"
              role="status"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              The absolute charge difference is within the 0.1 ppm rounding tolerance.
            </p>
          )}

          {checkedSnapshot.analysis.status === 'unbalanced' && (
            <>
              <p className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-100">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Choose one target change rounded to 0.1 ppm. Other targets will stay unchanged.
              </p>
              <ul className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
                {checkedSnapshot.analysis.alternatives.map(alternative => {
                  const ionName = getChargeBalanceIonName(alternative.ionId);
                  const ionFormula = ION_MAP[alternative.ionId].formula;
                  return (
                    <li
                      key={alternative.ionId}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-700/70 bg-slate-900/55 px-3 py-2"
                      data-testid={`watermancer-charge-option-${alternative.ionId}`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-slate-100">
                          {alternative.direction === 'increase' ? 'Increase' : 'Reduce'} {ionName}
                          <span className="ml-1.5 font-normal text-slate-400">{ionFormula}</span>
                        </div>
                        <div className="mt-0.5 tabular-nums text-[11px] text-slate-400">
                          {alternative.currentTargetPpm.toFixed(1)}
                          {' → '}
                          <span className="font-semibold text-cyan-100">
                            {alternative.proposedTargetPpm.toFixed(1)} ppm
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyAlternative(alternative)}
                        disabled={isStale}
                        aria-label={`Apply ${ionName} target change`}
                        data-testid={`watermancer-charge-apply-${alternative.ionId}`}
                        className="min-h-9 shrink-0 rounded-lg border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-[11px] font-semibold text-emerald-100 transition hover:bg-emerald-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Apply
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
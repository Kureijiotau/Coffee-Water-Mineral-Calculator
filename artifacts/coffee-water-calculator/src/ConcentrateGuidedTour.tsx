import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { ConcentrateTourStep } from './concentrateGuidedTour';

export type ConcentrateTourCloseReason = 'skip' | 'missing-target';

type Props = {
  steps: ConcentrateTourStep[];
  onClose: (reason: ConcentrateTourCloseReason) => void;
  onFinish: () => void;
  onNavigateToCalculator?: () => void;
  tourTitle?: string;
  testIdPrefix?: string;
  renderStepVisual?: (step: ConcentrateTourStep) => ReactNode;
};

type Rect = { top: number; left: number; width: number; height: number };
type TourLayout = {
  targetTestId: string;
  spotlight: Rect;
  dialog: { top: number; left: number; width: number };
};

const EDGE_GAP = 16;
const TARGET_GAP = 12;
const SPOTLIGHT_PAD = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function getTourLayout(
  targetTestId: string,
  target: DOMRect,
  dialogHeight: number,
  illustrated: boolean,
): TourLayout {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const dialogWidth = Math.min(illustrated ? 560 : 420, viewportWidth - EDGE_GAP * 2);
  const spotlightLeft = clamp(target.left - SPOTLIGHT_PAD, EDGE_GAP, viewportWidth - EDGE_GAP);
  const spotlightTop = clamp(target.top - SPOTLIGHT_PAD, EDGE_GAP, viewportHeight - EDGE_GAP);
  const spotlightRight = clamp(target.right + SPOTLIGHT_PAD, spotlightLeft, viewportWidth - EDGE_GAP);
  const spotlightBottom = clamp(target.bottom + SPOTLIGHT_PAD, spotlightTop, viewportHeight - EDGE_GAP);
  const rightSpace = viewportWidth - target.right - TARGET_GAP - EDGE_GAP;
  const leftSpace = target.left - TARGET_GAP - EDGE_GAP;

  if (illustrated && viewportWidth < 640) {
    const dialogTop = target.top >= viewportHeight - dialogHeight - EDGE_GAP
      ? EDGE_GAP
      : clamp(viewportHeight - dialogHeight - EDGE_GAP, EDGE_GAP, viewportHeight - EDGE_GAP);
    const dialogBottom = dialogTop + dialogHeight;
    const targetStartsBelowCard = target.top >= dialogBottom + TARGET_GAP;
    const visibleSpotlightTop = targetStartsBelowCard
      ? Math.max(spotlightTop, dialogBottom + TARGET_GAP)
      : spotlightTop;
    const visibleSpotlightBottom = targetStartsBelowCard
      ? spotlightBottom
      : Math.min(spotlightBottom, dialogTop - TARGET_GAP);
    return {
      targetTestId,
      spotlight: {
        top: visibleSpotlightTop,
        left: spotlightLeft,
        width: spotlightRight - spotlightLeft,
        height: Math.max(0, visibleSpotlightBottom - visibleSpotlightTop),
      },
      dialog: {
        top: dialogTop,
        left: EDGE_GAP,
        width: dialogWidth,
      },
    };
  }

  if (illustrated && Math.max(leftSpace, rightSpace) >= 360) {
    const placeRight = rightSpace >= leftSpace;
    const sideWidth = Math.min(560, placeRight ? rightSpace : leftSpace);
    return {
      targetTestId,
      spotlight: {
        top: spotlightTop,
        left: spotlightLeft,
        width: spotlightRight - spotlightLeft,
        height: spotlightBottom - spotlightTop,
      },
      dialog: {
        top: clamp(target.top + (target.height - dialogHeight) / 2, EDGE_GAP, viewportHeight - dialogHeight - EDGE_GAP),
        left: placeRight ? target.right + TARGET_GAP : target.left - TARGET_GAP - sideWidth,
        width: sideWidth,
      },
    };
  }

  const belowTop = spotlightBottom + TARGET_GAP;
  const aboveTop = spotlightTop - dialogHeight - TARGET_GAP;
  const belowFits = belowTop + dialogHeight <= viewportHeight - EDGE_GAP;
  const aboveFits = aboveTop >= EDGE_GAP;
  const dialogTop = belowFits
    ? belowTop
    : aboveFits
      ? aboveTop
      : clamp(
        target.top < viewportHeight / 2
          ? belowTop
          : aboveTop,
        EDGE_GAP,
        viewportHeight - dialogHeight - EDGE_GAP,
      );
  const dialogLeft = viewportWidth < 640
    ? (viewportWidth - dialogWidth) / 2
    : clamp(target.left, EDGE_GAP, viewportWidth - dialogWidth - EDGE_GAP);

  return {
    targetTestId,
    spotlight: {
      top: spotlightTop,
      left: spotlightLeft,
      width: spotlightRight - spotlightLeft,
      height: spotlightBottom - spotlightTop,
    },
    dialog: { top: dialogTop, left: dialogLeft, width: dialogWidth },
  };
}

export function ConcentrateGuidedTour({
  steps,
  onClose,
  onFinish,
  onNavigateToCalculator,
  tourTitle = 'Concentrates tour',
  testIdPrefix = 'concentrate-guided-tour',
  renderStepVisual,
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [layout, setLayout] = useState<TourLayout | null>(null);
  const currentStep = steps[stepIndex];
  const hasStepVisual = Boolean(renderStepVisual);
  const descriptionId = `${testIdPrefix}-description`;
  const targetRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const measureRef = useRef<() => void>(() => {});
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!currentStep || typeof document === 'undefined') {
      onCloseRef.current('missing-target');
      return;
    }
    const target = document.querySelector<HTMLElement>(`[data-testid="${currentStep.targetTestId}"]`);
    if (!target || target.getClientRects().length === 0) {
      onCloseRef.current('missing-target');
      return;
    }
    targetRef.current = target;

    target.scrollIntoView({
      behavior: 'auto',
      block: window.innerWidth < 640 ? 'start' : 'center',
      inline: 'nearest',
    });

    let frame: number | null = null;
    const measure = () => {
      if (!target.isConnected) {
        onCloseRef.current('missing-target');
        return;
      }
      const targetRect = target.getBoundingClientRect();
      const estimatedDialogHeight = hasStepVisual
        ? Math.min(window.innerWidth < 640 ? Math.min(420, window.innerHeight * 0.48) : 420, window.innerHeight - EDGE_GAP * 2)
        : 260;
      const dialogHeight = Math.min(
        dialogRef.current?.getBoundingClientRect().height ?? estimatedDialogHeight,
        window.innerHeight - EDGE_GAP * 2,
      );
      setLayout(getTourLayout(currentStep.targetTestId, targetRect, dialogHeight, hasStepVisual));
    };
    measureRef.current = measure;
    const scheduleMeasure = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        frame = null;
        measure();
      });
    };
    scheduleMeasure();
    window.addEventListener('scroll', scheduleMeasure, true);
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', scheduleMeasure, true);
      window.removeEventListener('resize', scheduleMeasure);
      if (targetRef.current === target) targetRef.current = null;
    };
  }, [currentStep?.targetTestId, hasStepVisual]);

  useEffect(() => {
    if (!layout) return;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measureRef.current());
    const target = targetRef.current;
    const dialog = dialogRef.current;
    if (target) observer?.observe(target);
    if (dialog) observer?.observe(dialog);
    return () => observer?.disconnect();
  }, [stepIndex, layout?.targetTestId]);

  useEffect(() => {
    if (layout) dialogRef.current?.focus({ preventScroll: true });
  }, [stepIndex, layout?.targetTestId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current('skip');
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!currentStep || !layout || typeof document === 'undefined') return null;
  if (layout.targetTestId !== currentStep.targetTestId) return null;

  const { top, left, width, height } = layout.spotlight;
  const nextStep = () => {
    if (stepIndex >= steps.length - 1) onFinish();
    else setStepIndex(index => index + 1);
  };
  const previousStep = () => setStepIndex(index => Math.max(0, index - 1));

  return createPortal(
    <>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[90] bg-slate-950/75" style={{ height: top }} />
      <div aria-hidden="true" className="fixed left-0 z-[90] bg-slate-950/75" style={{ top, width: left, height }} />
      <div aria-hidden="true" className="fixed right-0 z-[90] bg-slate-950/75" style={{ top, left: left + width, height }} />
      <div aria-hidden="true" className="fixed inset-x-0 bottom-0 z-[90] bg-slate-950/75" style={{ top: top + height }} />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[91] rounded-xl border border-cyan-200 shadow-[0_0_0_2px_rgba(34,211,238,0.18)] transition-shadow duration-150 motion-reduce:duration-0"
        data-testid={`${testIdPrefix}-spotlight`}
        data-target-testid={layout.targetTestId}
        style={{ top, left, width, height }}
      />
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={tourTitle}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="fixed z-[92] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-cyan-200/25 bg-slate-900/95 p-4 text-slate-100 shadow-2xl shadow-black/50 backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80 sm:p-5"
        data-testid={`${testIdPrefix}-dialog`}
        style={{
          top: layout.dialog.top,
          left: layout.dialog.left,
          width: layout.dialog.width,
          ...(renderStepVisual && window.innerWidth < 640 ? { maxHeight: 'min(48dvh, 420px)' } : {}),
        }}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200/80">{tourTitle}</p>
            <h2 aria-live="polite" className="mt-1 text-base font-semibold text-white">{currentStep.title}</h2>
          </div>
          <span
            className="shrink-0 rounded-full border border-cyan-200/20 bg-cyan-200/[0.06] px-2.5 py-1 text-[10px] font-semibold tabular-nums text-cyan-100"
            data-testid={`${testIdPrefix}-progress`}
          >
            {stepIndex + 1} of {steps.length}
          </span>
        </header>
        <div className={renderStepVisual
          ? 'mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.85fr)] sm:items-center'
          : ''}>
          {renderStepVisual && (
            <div className="min-w-0">
              {renderStepVisual(currentStep)}
            </div>
          )}
          <p id={descriptionId} className={renderStepVisual
            ? 'text-sm leading-relaxed text-slate-300'
            : 'mt-2 text-sm leading-relaxed text-slate-300'}>
            {currentStep.description}
          </p>
        </div>
        {currentStep.action === 'calculator' && (
          <button
            type="button"
            onClick={() => onNavigateToCalculator ? onNavigateToCalculator() : onClose('skip')}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-200/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Open Calculator
          </button>
        )}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => onClose('skip')}
            className="min-h-11 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={previousStep}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-800/70 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-cyan-200/35 bg-cyan-300/15 px-3 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
            >
              {stepIndex === steps.length - 1 ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </footer>
      </section>
    </>,
    document.body,
  );
}

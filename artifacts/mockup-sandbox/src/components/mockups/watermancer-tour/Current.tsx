import './_group.css';
import { useState } from 'react';
import { ConcentrateGuidedTour } from './ConcentrateGuidedTour';
import type { GuidedTourStep } from './guidedTour';

const steps: GuidedTourStep[] = [
  {
    targetTestId: 'watermancer-ion-targets',
    title: 'Choose your ion targets',
    description:
      'Start with a saved profile or set ion goals directly. You can also work backwards: add water and salts first, then save these ion targets in a new profile.',
  },
  {
    targetTestId: 'watermancer-batch-volume',
    title: 'Set your finished volume',
    description:
      'Choose how much water you want to make. Water amounts and salt doses are based on this batch size.',
  },
  {
    targetTestId: 'watermancer-water-sources',
    title: 'Add source waters',
    description:
      'Optionally add bottled or mineral water. Its modeled ions count toward your final targets.',
  },
  {
    targetTestId: 'watermancer-salts',
    title: 'Choose salts and doses',
    description:
      'Select which salts Watermancer may use. Editing a dose holds it fixed while the match adjusts the other selected salts.',
  },
  {
    targetTestId: 'watermancer-auto-match',
    title: 'Run Precision Auto-match',
    description:
      'Use Find the best match to apply the best available salt and water plan for your selected targets.',
  },
  {
    targetTestId: 'watermancer-final-mixture',
    title: 'Review the final mixture',
    description:
      'Compare the modeled final ions and summary with your target profile before preparing the water.',
  },
  {
    targetTestId: 'watermancer-recipe-steps',
    title: 'Open Recipe steps',
    description:
      'Review the water and salt amounts for the current plan, along with its preparation steps.',
  },
];

function PreviewSection({
  testId,
  title,
  children,
  className = '',
}: {
  testId: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      data-testid={testId}
      className={`rounded-2xl border border-slate-700/70 bg-slate-900/75 p-5 shadow-xl ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        {title}
      </p>
      {children}
    </section>
  );
}

export function Current() {
  const [tourOpen, setTourOpen] = useState(true);

  return (
    <main className="min-h-screen bg-[#020617] p-5 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-300/15 bg-slate-900/90 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/70">
              Watermancer
            </p>
            <h1 className="mt-1 text-xl font-semibold">Match your water</h1>
          </div>
          <button className="rounded-xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
            How it works
          </button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <PreviewSection testId="watermancer-ion-targets" title="Ion targets">
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-lg border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
                Aiki profile
              </span>
              <span className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
                Set targets
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ['Calcium', '35 ppm'],
                ['Magnesium', '12 ppm'],
                ['Sodium', '10 ppm'],
                ['Chloride', '30 ppm'],
                ['Sulfate', '45 ppm'],
                ['Bicarbonate', '25 ppm'],
              ].map(([name, value]) => (
                <div key={name} className="rounded-xl bg-slate-950/55 px-3 py-2">
                  <p className="text-xs text-slate-400">{name}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </PreviewSection>

          <div className="space-y-4">
            <PreviewSection testId="watermancer-batch-volume" title="Batch volume">
              <p className="mt-3 text-2xl font-semibold tabular-nums">1.0 L</p>
            </PreviewSection>
            <PreviewSection testId="watermancer-water-sources" title="Water sources">
              <p className="mt-3 text-sm text-slate-300">No source water selected</p>
            </PreviewSection>
          </div>

          <PreviewSection testId="watermancer-salts" title="Salt selection">
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              {['Calcium chloride', 'Magnesium sulfate', 'Sodium chloride'].map((salt) => (
                <span
                  key={salt}
                  className="rounded-full border border-slate-700 bg-slate-950/55 px-3 py-1.5 text-slate-200"
                >
                  {salt}
                </span>
              ))}
            </div>
          </PreviewSection>
          <PreviewSection testId="watermancer-auto-match" title="Precision Auto-match">
            <button className="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white">
              Find the best match
            </button>
          </PreviewSection>
          <PreviewSection testId="watermancer-final-mixture" title="Final mixture">
            <p className="mt-3 text-sm text-slate-300">Compare final ions with your target.</p>
          </PreviewSection>
          <PreviewSection testId="watermancer-recipe-steps" title="Recipe steps">
            <p className="mt-3 text-sm text-slate-300">Water and salt preparation instructions</p>
          </PreviewSection>
        </div>
      </div>

      {tourOpen && (
        <ConcentrateGuidedTour
          steps={steps}
          tourTitle="Watermancer tour"
          testIdPrefix="calculator-guided-tour"
          onClose={() => setTourOpen(false)}
          onFinish={() => setTourOpen(false)}
        />
      )}
    </main>
  );
}

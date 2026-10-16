import React from 'react';
import { WATERMANCER_COUNTERION_EXAMPLES } from './watermancerGuideExamples';

export default function WatermancerGuideCounterionComparison() {
  return (
    <section
      aria-labelledby="wg-counterion-heading"
      className="mt-5 space-y-3"
      data-testid="guide-counterion-comparison"
    >
      <div>
        <h4 id="wg-counterion-heading" className="text-sm font-semibold text-slate-100">
          Same GH and KH. Different salts.
        </h4>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">
          GH and KH don’t show every ion in your water. These recipes share the same magnesium, calcium, and bicarbonate targets, but their chloride or sulfate and sodium or potassium differ. Those ions can affect taste.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {WATERMANCER_COUNTERION_EXAMPLES.map(example => (
          <figure key={example.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/40">
            <img
              src={example.imageSrc}
              alt={example.imageAlt}
              className="block h-auto w-full"
              loading="lazy"
              decoding="async"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}

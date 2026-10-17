import React from 'react';
import { WATERMANCER_COUNTERION_EXAMPLES } from './watermancerGuideExamples';

function ZoomableRecipeImage({ example }: { example: (typeof WATERMANCER_COUNTERION_EXAMPLES)[number] }) {
  const [zoomEnabled, setZoomEnabled] = React.useState(false);
  const [zoomOrigin, setZoomOrigin] = React.useState('50% 50%');

  return (
    <figure className="m-0 min-w-0 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/40">
      <button
        type="button"
        aria-label={`Cursor zoom: ${example.recipeName}`}
        aria-pressed={zoomEnabled}
        title={zoomEnabled ? 'Click to return to normal size' : 'Click to zoom around the pointer'}
        className={`block w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 ${zoomEnabled ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        onClick={() => setZoomEnabled(enabled => !enabled)}
        onPointerMove={event => {
          if (event.pointerType === 'touch') return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (bounds.width === 0 || bounds.height === 0) return;
          const x = ((event.clientX - bounds.left) / bounds.width) * 100;
          const y = ((event.clientY - bounds.top) / bounds.height) * 100;
          setZoomOrigin(`${x}% ${y}%`);
        }}
      >
        <img
          data-testid={`counterion-example-${example.id}`}
          src={example.imageSrc}
          alt={example.imageAlt}
          className="block h-auto w-full"
          style={{
            transform: zoomEnabled ? 'scale(2.2)' : 'scale(1)',
            transformOrigin: zoomOrigin,
          }}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </button>
    </figure>
  );
}

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
          <ZoomableRecipeImage key={example.id} example={example} />
        ))}
      </div>
    </section>
  );
}

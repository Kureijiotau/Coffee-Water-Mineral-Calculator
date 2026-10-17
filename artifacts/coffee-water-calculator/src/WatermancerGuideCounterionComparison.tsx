import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from './components/ui/dialog';
import { WATERMANCER_COUNTERION_EXAMPLES } from './watermancerGuideExamples';

export default function WatermancerGuideCounterionComparison() {
  const [zoomedExampleId, setZoomedExampleId] = React.useState<string | null>(null);
  const [zoomOrigin, setZoomOrigin] = React.useState<string | null>(null);
  const zoomedExample = WATERMANCER_COUNTERION_EXAMPLES.find(
    example => example.id === zoomedExampleId,
  );

  return (
    <>
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
              <button
                type="button"
                aria-label={`View larger image: ${example.recipeName}`}
                className="group block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                onClick={() => setZoomedExampleId(example.id)}
              >
                <img
                  src={example.imageSrc}
                  alt={example.imageAlt}
                  className="block h-auto w-full transition-opacity group-hover:opacity-90"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            </figure>
          ))}
        </div>
      </section>
      <Dialog
        open={Boolean(zoomedExample)}
        onOpenChange={open => {
          if (!open) {
            setZoomedExampleId(null);
            setZoomOrigin(null);
          }
        }}
      >
        {zoomedExample && (
          <DialogContent className="w-[calc(100vw-1rem)] max-w-[1200px] max-h-[96dvh] overflow-hidden border-slate-700 bg-slate-950 p-3 text-slate-100 sm:p-4">
            <DialogTitle className="pr-8 text-sm font-medium text-slate-200">
              {zoomedExample.recipeName}
            </DialogTitle>
            <div className="flex h-[calc(96dvh-5rem)] w-full items-center justify-center overflow-hidden">
              <img
                data-testid="zoom-image"
                src={zoomedExample.imageSrc}
                alt={zoomedExample.imageAlt}
                title="Move the pointer over the image to zoom and inspect details"
                className={`block max-h-full max-w-full object-contain ${zoomOrigin ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                style={{
                  transform: zoomOrigin ? 'scale(2.2)' : 'scale(1)',
                  transformOrigin: zoomOrigin ?? '50% 50%',
                }}
                onPointerMove={event => {
                  if (event.pointerType === 'touch') return;
                  const { offsetWidth, offsetHeight } = event.currentTarget;
                  if (offsetWidth === 0 || offsetHeight === 0) return;
                  const x = (event.nativeEvent.offsetX / offsetWidth) * 100;
                  const y = (event.nativeEvent.offsetY / offsetHeight) * 100;
                  setZoomOrigin(`${x}% ${y}%`);
                }}
                onPointerLeave={() => setZoomOrigin(null)}
                decoding="async"
              />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

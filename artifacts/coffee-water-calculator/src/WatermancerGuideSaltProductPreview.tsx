import { useRef, useState, type PointerEvent } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardPortal,
  HoverCardTrigger,
} from './components/ui/hover-card';
import {
  WATERMANCER_GUIDE_SALT_PRODUCTS,
  type GuideSaltProductId,
} from './watermancerGuideSaltProducts';

type WatermancerGuideSaltProductPreviewProps = {
  productId: GuideSaltProductId;
};

export function WatermancerGuideSaltProductPreview({
  productId,
}: WatermancerGuideSaltProductPreviewProps) {
  const product = WATERMANCER_GUIDE_SALT_PRODUCTS[productId];
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const touchPinnedOpenRef = useRef(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (touchPinnedOpenRef.current && !nextOpen) return;
    setOpen(nextOpen);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch') return;

    const nextOpen = !touchPinnedOpenRef.current;
    touchPinnedOpenRef.current = nextOpen;
    setOpen(nextOpen);
  };

  const dismissPreview = () => {
    touchPinnedOpenRef.current = false;
    setOpen(false);
  };

  return (
    <HoverCard open={open} onOpenChange={handleOpenChange} openDelay={250} closeDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={product.label}
          onPointerDown={handlePointerDown}
          className="inline-flex align-baseline border-b border-dotted border-cyan-200/55 bg-transparent px-0.5 font-medium text-cyan-100/90 transition-colors hover:border-cyan-100 hover:text-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {product.label}
        </button>
      </HoverCardTrigger>
      <HoverCardPortal>
        <HoverCardContent
          side="top"
          align="center"
          sideOffset={8}
          role="group"
          aria-label={`${product.label} product preview`}
          onEscapeKeyDown={dismissPreview}
          className="w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-cyan-300/15 bg-slate-950/95 p-2.5 text-slate-100 shadow-xl shadow-black/40 backdrop-blur"
        >
          <div className="overflow-hidden rounded-lg bg-slate-900/70">
            {imageFailed ? (
              <div
                role="status"
                className="flex h-32 w-full items-center justify-center px-4 text-center text-xs text-slate-400"
              >
                Product photo unavailable
              </div>
            ) : (
              <img
                src={product.imageUrl}
                alt={product.alt}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
                className="h-32 w-full object-contain"
              />
            )}
          </div>
          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-slate-100">
              {product.label}
            </span>
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`View product source: ${product.sourceLabel}`}
              className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400 transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
            >
              {product.sourceLabel}
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          </div>
        </HoverCardContent>
      </HoverCardPortal>
    </HoverCard>
  );
}

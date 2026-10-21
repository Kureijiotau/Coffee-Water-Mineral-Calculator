import type { ReactElement, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './components/ui/dialog';

export type WatermancerGuideScreenshotFrameProps = {
  title: string;
  description: ReactNode;
  testId: string;
  screenshotFileName: string;
  imageAlt: string;
};

export function WatermancerGuideScreenshotFrame({
  title,
  description,
  testId,
  screenshotFileName,
  imageAlt,
}: WatermancerGuideScreenshotFrameProps): ReactElement {
  const screenshotUrl = `${import.meta.env.BASE_URL}watermancer-guide/${screenshotFileName}`;

  return (
    <figure
      className="grid min-w-0 w-full grid-cols-1 items-start gap-4 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/75 sm:grid-cols-[minmax(0,1fr)_minmax(0,360px)]"
      data-testid={testId}
      aria-describedby={`${testId}-caption`}
    >
      <figcaption id={`${testId}-caption`} className="min-w-0 px-4 py-4 sm:py-5">
        <span className="block text-base font-semibold leading-6 text-slate-100 sm:text-lg">{title}</span>
        <span className="mt-2 block break-words text-sm leading-6 text-slate-200">
          {description}
        </span>
      </figcaption>
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            className="group mx-auto block w-full min-w-0 max-w-[360px] overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950 transition-colors hover:border-cyan-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            data-testid={`${testId}-preview`}
            aria-label={`View larger screenshot: ${title}`}
            aria-describedby={`${testId}-caption`}
          >
            <img
              className="block h-auto w-full"
              src={screenshotUrl}
              alt={imageAlt}
              loading="lazy"
              decoding="async"
            />
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[min(96vw,1200px)] max-w-none overflow-y-auto border-slate-700 bg-slate-950 p-4 text-slate-100 shadow-2xl sm:p-6">
          <div className="min-w-0 pr-8">
            <DialogTitle className="text-base font-semibold text-slate-100 sm:text-lg">
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">{imageAlt}</DialogDescription>
          </div>
          <div className="flex max-h-[calc(100dvh-8rem)] min-h-0 items-center justify-center overflow-auto">
            <img
              className="max-h-[calc(100dvh-8rem)] max-w-full object-contain"
              src={screenshotUrl}
              alt={imageAlt}
            />
          </div>
        </DialogContent>
      </Dialog>
    </figure>
  );
}

import type { ReactElement } from 'react';

export type WatermancerGuideScreenshotFrameProps = {
  title: string;
  description: string;
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
      className="min-w-0 w-full overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950/75"
      data-testid={testId}
      aria-describedby={`${testId}-caption`}
    >
      <img
        className="block h-auto w-full"
        src={screenshotUrl}
        alt={imageAlt}
        loading="lazy"
        decoding="async"
      />
      <figcaption id={`${testId}-caption`} className="border-t border-slate-800/90 bg-slate-900/45 px-3 py-3 sm:px-4">
        <span className="block text-xs font-semibold text-slate-200">{title}</span>
        <span className="mt-1 block break-words text-[11px] leading-relaxed text-slate-400">
          {description}
        </span>
      </figcaption>
    </figure>
  );
}

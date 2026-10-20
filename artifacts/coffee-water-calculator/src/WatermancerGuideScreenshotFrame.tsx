import { Droplet } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

export type WatermancerGuideScreenshotFrameProps = {
  title: string;
  description: string;
  testId: string;
  children: ReactNode;
};

export function WatermancerGuideScreenshotFrame({
  title,
  description,
  testId,
  children,
}: WatermancerGuideScreenshotFrameProps): ReactElement {
  return (
    <figure
      className="min-w-0 w-full overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/75 shadow-xl shadow-slate-950/30"
      data-testid={testId}
      role="img"
      aria-label={`Example screenshot: ${title}. ${description}`}
    >
      <div className="min-w-0 p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-2.5 border-b border-slate-800 pb-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-200"
            aria-hidden="true"
          >
            <Droplet className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300/75">
              Watermancer
            </span>
            <span className="block truncate text-xs font-semibold text-slate-100">{title}</span>
          </div>
          <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-400/[0.07] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-100/80">
            Example screen
          </span>
        </div>
        <div className="min-w-0 pt-3">{children}</div>
      </div>
      <figcaption className="border-t border-slate-800/90 bg-slate-900/45 px-3 py-3 sm:px-4">
        <span className="block text-xs font-semibold text-slate-200">{title}</span>
        <span className="mt-1 block break-words text-[11px] leading-relaxed text-slate-400">
          {description}
        </span>
      </figcaption>
    </figure>
  );
}

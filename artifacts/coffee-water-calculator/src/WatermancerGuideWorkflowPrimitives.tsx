import type { ReactElement, ReactNode } from 'react';

export function WorkflowScene({
  number,
  title,
  summary,
  children,
}: {
  number: number;
  title: string;
  summary: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="min-w-0 space-y-3" data-testid={`watermancer-guide-scene-${number}`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-400/[0.08] text-[10px] font-bold tabular-nums text-cyan-200">
          {String(number).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 sm:text-base">
            {number}. {title}
          </h3>
          <p className="mt-1 break-words text-xs leading-relaxed text-slate-400">{summary}</p>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-4">{children}</div>
    </section>
  );
}

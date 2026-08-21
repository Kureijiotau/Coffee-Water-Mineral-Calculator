import type { ReactNode } from 'react';

export function SectionHeader({
  icon,
  title,
  after,
}: {
  icon: ReactNode;
  title: string;
  after?: ReactNode;
}) {
  const numberedTitle = title.match(/^(\d+)\.\s+(.+)$/);
  return (
    <div className="app-section-header flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/40 px-4 text-slate-300 sm:px-6">
      <div className="app-section-header__title flex min-w-0 items-center gap-2">
        {numberedTitle && (
          <span className="app-section-header__step" aria-hidden="true">
            {numberedTitle[1]}
          </span>
        )}
        {icon}
        <h2
          className="truncate text-sm font-semibold uppercase tracking-wider"
          aria-label={title}
        >
          {numberedTitle ? numberedTitle[2] : title}
        </h2>
      </div>
      {after && <div className="app-section-header__after flex max-w-full flex-wrap items-center justify-end gap-2">{after}</div>}
    </div>
  );
}
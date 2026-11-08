import { useState } from 'react';

export function HelpTip({ testId, label, text, align = 'center' }: { testId: string; label: string; text: string; align?: 'center' | 'right' }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const visible = open || hovered || focused;
  const tooltipId = `${testId}-tooltip`;
  const position = align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  return (
    <span data-testid={testId} className="pointer-events-auto relative z-20 inline-flex" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <button type="button" aria-label={label} aria-expanded={open} aria-describedby={tooltipId}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onClick={() => setOpen(value => !value)}
        onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); setFocused(false); } }}
        className="grid h-5 w-5 cursor-help place-items-center rounded-full border border-slate-400/50 bg-slate-950/80 text-[11px] font-bold leading-none text-slate-200 outline-none hover:border-fuchsia-300/70 hover:text-white focus-visible:ring-2 focus-visible:ring-fuchsia-300">
        <span aria-hidden="true">?</span>
      </button>
      <div id={tooltipId} role="tooltip" aria-label={label}
        className={`${visible ? 'block' : 'hidden'} pointer-events-auto absolute ${position} top-full z-[60] w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-fuchsia-200/25 bg-slate-950 p-3 text-left text-xs font-normal leading-relaxed text-slate-100 shadow-xl`}>
        {text}
      </div>
    </span>
  );
}

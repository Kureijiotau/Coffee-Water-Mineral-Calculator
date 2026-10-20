import type { ReactElement, ReactNode } from 'react';
import { ION_MAP, type IonId } from './waterData';

export type ExampleIon = {
  id: IonId;
  target: string;
  final: string;
};

export const EXAMPLE_IONS: readonly ExampleIon[] = [
  { id: 'calcium', target: '1.0', final: '1.0' },
  { id: 'magnesium', target: '5.3', final: '5.3' },
  { id: 'sodium', target: '1.6', final: '1.6' },
  { id: 'potassium', target: '1.0', final: '1.0' },
  { id: 'bicarbonate', target: '12.0', final: '12.0' },
  { id: 'chloride', target: '10.0', final: '10.0' },
  { id: 'sulfate', target: '5.1', final: '5.1' },
];

export const EXAMPLE_LABEL_IONS: readonly { id: IonId; value: string }[] = [
  { id: 'calcium', value: '45' },
  { id: 'magnesium', value: '7' },
  { id: 'sodium', value: '4' },
  { id: 'potassium', value: '1' },
  { id: 'bicarbonate', value: '120' },
  { id: 'chloride', value: '10' },
  { id: 'sulfate', value: '12' },
];

type ActionTone = 'cyan' | 'emerald' | 'indigo' | 'rose' | 'slate' | 'violet';

const ACTION_TONES: Record<ActionTone, string> = {
  cyan: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
  emerald: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
  indigo: 'border-indigo-300/35 bg-indigo-400/10 text-indigo-100',
  rose: 'border-rose-300/35 bg-rose-400/10 text-rose-100',
  slate: 'border-slate-600/70 bg-slate-800/70 text-slate-200',
  violet: 'border-violet-300/35 bg-violet-400/10 text-violet-100',
};

export function StaticAction({
  label,
  icon,
  tone = 'slate',
}: {
  label: string;
  icon?: ReactNode;
  tone?: ActionTone;
}): ReactElement {
  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold leading-tight ${ACTION_TONES[tone]}`}
    >
      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="min-w-0 break-words">{label}</span>
    </span>
  );
}

export function ExampleField({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}): ReactElement {
  return (
    <div className="min-w-0 rounded-lg border border-slate-700/70 bg-slate-950/55 px-2.5 py-2">
      <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <span className="mt-1 flex min-w-0 items-baseline gap-1.5 text-xs font-semibold tabular-nums text-slate-100">
        <span className="min-w-0 break-words">{value}</span>
        {unit && <span className="shrink-0 text-[9px] font-medium text-slate-400">{unit}</span>}
      </span>
    </div>
  );
}

export function IonReading({
  id,
  value,
  unit = 'ppm',
}: {
  id: IonId;
  value: string;
  unit?: string;
}): ReactElement {
  const ion = ION_MAP[id];
  const color = ion.color;

  return (
    <div
      className="flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2 py-1.5"
      style={{ borderColor: color.border, backgroundColor: color.soft }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-[10px] font-bold" style={{ color: color.foreground }}>
          {ion.formula}
        </span>
        <span className="min-w-0 truncate text-[9px] text-slate-400">{ion.name}</span>
      </span>
      <span className="shrink-0 text-[10px] font-semibold tabular-nums" style={{ color: color.foreground }}>
        {value}
        <span className="ml-1 text-[8px] font-medium opacity-70">{unit}</span>
      </span>
    </div>
  );
}

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
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

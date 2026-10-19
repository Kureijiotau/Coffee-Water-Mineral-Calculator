import type { ReactNode } from 'react';
import { ION_MAP, type IonId } from './waterData';

export function IonName({ id, children }: { id: IonId; children: ReactNode }) {
  return (
    <span className="font-semibold" style={{ color: ION_MAP[id].color.foreground }}>
      {children}
    </span>
  );
}

export function IonChip({ id, value }: { id: IonId; value: string }) {
  const color = ION_MAP[id].color;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold"
      style={{
        borderColor: color.border,
        backgroundColor: color.soft,
        color: color.foreground,
      }}
    >
      <span>{ION_MAP[id].formula}</span>{' '}
      <span>{value}</span>{' '}
      <span className="text-xs font-medium opacity-75">ppm</span>
    </span>
  );
}

export type MetricKind = 'GH' | 'KH';

export function metricIonId(kind: MetricKind): IonId {
  return kind === 'GH' ? 'magnesium' : 'bicarbonate';
}

export function MetricChip({ kind, value }: { kind: MetricKind; value: string }) {
  const color = ION_MAP[metricIonId(kind)].color;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded-lg border px-2.5 py-1.5 text-sm font-semibold"
      style={{
        borderColor: color.border,
        backgroundColor: color.soft,
        color: color.foreground,
      }}
    >
      <span>{kind}</span>{' '}
      <span>{value}</span>{' '}
      <span className="text-xs font-medium opacity-75">ppm CaCO₃</span>
    </span>
  );
}

export function MetricName({ kind }: { kind: MetricKind }) {
  return (
    <span className="font-semibold" style={{ color: ION_MAP[metricIonId(kind)].color.foreground }}>
      {kind}
    </span>
  );
}

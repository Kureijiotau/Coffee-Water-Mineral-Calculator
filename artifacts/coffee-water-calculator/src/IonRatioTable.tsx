import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Check, RotateCcw, Send } from 'lucide-react';
import { computeGH, computeKH, ION_MAP, type IonId } from './waterData';
import { completeIonTotals } from './watermancerSolver';
import { StableNumberInput } from './components/StableNumberInput';
import {
  DEFAULT_ION_RATIO_DRAFT,
  ION_RATIO_DEFINITIONS,
  cloneIonRatioDraft,
  anchorIonRatioDraftToGh,
  evaluateIonRatioDraft,
  extractDirectIonTargets,
  normalizeIonRatioDraft,
  swapIonRatioDraftRow,
  updateGhKhByRelationship,
  updateMgCaByGhRelationship,
  updateIonRatioDraftValue,
  updateIonRatioByRelationship,
  type IonRatioDraft,
  type IonRatioId,
} from './ionRatios';

const STORAGE_KEY = 'coffee-water-ion-ratio-draft';

function loadDraft(): IonRatioDraft {
  try {
    return anchorIonRatioDraftToGh(
      normalizeIonRatioDraft(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')),
    );
  } catch {
    return { ...DEFAULT_ION_RATIO_DRAFT };
  }
}

function saveDraft(draft: IonRatioDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Keep the editor usable when storage is unavailable.
  }
}

function formatValue(value: number | null): string {
  if (value === null) return '—';
  return value >= 10 ? value.toFixed(1) : value.toFixed(2).replace(/0$/, '').replace(/\.$/, '');
}

function relationshipInputError(value: string): string | null {
  if (value.trim() === '') return 'Enter a relationship greater than zero.';
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? null : 'Set the relationship above zero.';
}

function relationshipInputsForDraft(draft: IonRatioDraft): Record<IonRatioId, string> {
  return evaluateIonRatioDraft(draft).reduce((inputs, row) => {
    inputs[row.id] = row.ratioValue === null ? '' : String(row.ratioValue);
    return inputs;
  }, {} as Record<IonRatioId, string>);
}

type RatioColorStyle = React.CSSProperties & Record<'--ratio-fg' | '--ratio-soft' | '--ratio-border', string>;

const DERIVED_RATIO_COLORS = {
  gh: {
    foreground: '#a5b4fc',
    soft: 'rgba(129, 140, 248, 0.12)',
    border: 'rgba(129, 140, 248, 0.42)',
  },
  kh: {
    foreground: '#fcd34d',
    soft: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.42)',
  },
};

function ratioColorStyle(ionId: IonId | undefined, label: string): RatioColorStyle {
  const color = ionId
    ? ION_MAP[ionId].color
    : label === 'KH'
      ? DERIVED_RATIO_COLORS.kh
      : DERIVED_RATIO_COLORS.gh;
  return {
    '--ratio-fg': color.foreground,
    '--ratio-soft': color.soft,
    '--ratio-border': color.border,
  };
}

export function IonRatioTable({
  targetIons,
  seedDraft,
  onImport,
}: {
  targetIons: Partial<Record<IonId, number>>;
  seedDraft?: IonRatioDraft | null;
  onImport: (targets: Partial<Record<IonId, number>>) => void;
}) {
  const [draft, setDraft] = useState<IonRatioDraft>(() => anchorIonRatioDraftToGh(seedDraft ?? loadDraft()));
  const [relationshipInputs, setRelationshipInputs] = useState<Record<IonRatioId, string>>(
    () => relationshipInputsForDraft(anchorIonRatioDraftToGh(seedDraft ?? loadDraft())),
  );
  const [message, setMessage] = useState<string | null>(null);
  const evaluatedRows = useMemo(() => evaluateIonRatioDraft(draft), [draft]);
  const relationshipErrors = useMemo(
    () => Object.fromEntries(
      Object.entries(relationshipInputs).map(([id, value]) => [id, relationshipInputError(value)]),
    ) as Record<IonRatioId, string | null>,
    [relationshipInputs],
  );
  const hasErrors = evaluatedRows.some(row => row.error || relationshipErrors[row.id]);
  const targetTotals = completeIonTotals(targetIons);
  const liveGh = computeGH(targetTotals);
  const liveKh = computeKH(targetTotals);

  useEffect(() => {
    if (!seedDraft) return;
    const nextDraft = anchorIonRatioDraftToGh(cloneIonRatioDraft(seedDraft));
    setDraft(nextDraft);
    setRelationshipInputs(relationshipInputsForDraft(nextDraft));
    setMessage('Ratio values loaded from the selected Watermancer profile.');
  }, [seedDraft]);

  useEffect(() => {
    const timeout = window.setTimeout(() => saveDraft(draft), 250);
    return () => window.clearTimeout(timeout);
  }, [draft]);

  const updateRow = (id: IonRatioId, field: 'first' | 'second', value: string) => {
    setMessage(null);
    const nextDraft = updateIonRatioDraftValue(draft, id, field, value);
    setDraft(nextDraft);
    setRelationshipInputs(relationshipInputsForDraft(nextDraft));
  };

  const updateRelationship = (id: IonRatioId, value: string) => {
    setMessage(null);
    setRelationshipInputs(current => ({ ...current, [id]: value }));
    const nextRow = id === 'gh-kh'
      ? updateGhKhByRelationship(draft[id], value)
      : id === 'mg-ca'
        ? updateMgCaByGhRelationship(draft['gh-kh'], draft[id], value)
        : updateIonRatioByRelationship(draft[id], value);
    if (!nextRow) return;
    const nextDraft = { ...draft, [id]: nextRow };
    setDraft(nextDraft);
    setRelationshipInputs(relationshipInputsForDraft(nextDraft));
  };

  const swapRow = (id: IonRatioId) => {
    setMessage(null);
    const nextDraft = {
      ...draft,
      [id]: swapIonRatioDraftRow(draft[id]),
    };
    setDraft(nextDraft);
    const nextRow = evaluateIonRatioDraft(nextDraft).find(row => row.id === id);
    setRelationshipInputs(current => ({
      ...current,
      [id]: nextRow?.ratioValue === null || !nextRow ? '' : String(nextRow.ratioValue),
    }));
  };

  const reset = () => {
    const nextDraft = anchorIonRatioDraftToGh(cloneIonRatioDraft(seedDraft ?? DEFAULT_ION_RATIO_DRAFT));
    setDraft(nextDraft);
    setRelationshipInputs(relationshipInputsForDraft(nextDraft));
    setMessage(
      seedDraft
        ? 'Selected profile ratio values restored. Watermancer targets were not changed.'
        : 'Ratio defaults restored. Watermancer targets were not changed.',
    );
  };

  const handleImport = () => {
    if (hasErrors) return;
    onImport(extractDirectIonTargets(draft));
    setMessage('Ion targets sent to Watermancer. GH anchored Mg/Ca and KH-derived bicarbonate were included.');
  };

  return (
    <section className="border-b border-indigo-400/15 bg-slate-950/20 px-4 py-4 sm:px-6" aria-labelledby="ion-ratio-table-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md border border-cyan-300/35 bg-cyan-400/10 text-cyan-200" aria-hidden="true">↔</span>
            <h3 id="ion-ratio-table-heading" className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
              Ion relationships
            </h3>
          </div>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-400">
            GH anchors the Mg/Ca hardness budget. Adjust the Mg:Ca relationship to redistribute that fixed GH, then send the resulting ion targets into Watermancer.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 rounded-lg border border-slate-600/60 bg-slate-900/50 px-2.5 py-1.5 text-[11px] text-slate-300 transition hover:border-amber-300/40 hover:bg-amber-500/10 hover:text-amber-100"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset ratios
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {evaluatedRows.map(row => {
          const values = draft[row.id];
          const isDiagnostic = row.diagnosticOnly;
          const rowError = relationshipErrors[row.id] ?? row.error;
          const firstColorStyle = ratioColorStyle(row.firstIonId, row.firstLabel);
          const secondColorStyle = ratioColorStyle(row.secondIonId, row.secondLabel);
          return (
            <article
              key={row.id}
              className={`rounded-2xl border p-3.5 transition sm:p-4 ${
                rowError
                  ? 'border-rose-400/35 bg-rose-950/20'
                  : isDiagnostic
                    ? 'border-amber-300/15 bg-amber-400/[0.035]'
                    : 'border-cyan-300/15 bg-cyan-400/[0.035] hover:border-cyan-300/30 hover:bg-cyan-400/[0.055]'
              }`}
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(9.5rem,0.8fr)_minmax(24rem,2.4fr)_minmax(9rem,0.75fr)] lg:items-end lg:gap-5">
                <div className="flex items-start justify-between gap-3 lg:block">
                  <div>
                    <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${isDiagnostic ? 'text-amber-200/75' : 'text-cyan-200/75'}`}>
                      {row.label}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-base font-semibold text-slate-100">
                      <span style={firstColorStyle}>{row.firstLabel}</span>
                      <span className="text-slate-500" aria-hidden="true">→</span>
                      <span style={secondColorStyle}>{row.secondLabel}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500">{row.unit} · First ÷ second</div>
                  </div>
                  {isDiagnostic && (
                    <div className="text-right text-[10px] tabular-nums text-amber-200/80 lg:mt-3 lg:text-left">
                      <div className="uppercase tracking-wider text-amber-200/55">Live check</div>
                      <div className="mt-0.5">GH {formatValue(liveGh)} · KH {formatValue(liveKh)}</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)] items-end gap-2 sm:gap-3">
                  <label className="block min-w-0">
                    <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">{row.firstLabel}</span>
                    <div className="relative">
                      <StableNumberInput
                        min="0"
                        step="0.1"
                        value={values.first}
                        onChange={event => updateRow(row.id, 'first', event.target.value)}
                        style={firstColorStyle}
                        className="w-full rounded-xl border border-[color:var(--ratio-border)] bg-[color:var(--ratio-soft)] px-3 py-2.5 pr-14 font-mono text-base tabular-nums text-[color:var(--ratio-fg)] outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
                        aria-label={`${row.firstLabel} value for ${row.label}`}
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">{row.unit}</span>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => swapRow(row.id)}
                    className="mb-0.5 inline-flex h-10 w-11 items-center justify-center rounded-full border border-cyan-300/35 bg-cyan-400/[0.08] text-cyan-100 shadow-[0_0_18px_-10px_rgba(34,211,238,0.9)] transition hover:border-cyan-200/80 hover:bg-cyan-400/20 hover:shadow-[0_0_22px_-8px_rgba(34,211,238,1)] focus:outline-none focus:ring-2 focus:ring-cyan-200/70"
                    aria-label={`Swap ${row.firstLabel} and ${row.secondLabel}`}
                    title={`Swap ${row.firstLabel} and ${row.secondLabel}`}
                  >
                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <label className="block min-w-0">
                    <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">{row.secondLabel}</span>
                    <div className="relative">
                      <StableNumberInput
                        min="0"
                        step="0.1"
                        value={values.second}
                        onChange={event => updateRow(row.id, 'second', event.target.value)}
                        style={secondColorStyle}
                        className="w-full rounded-xl border border-[color:var(--ratio-border)] bg-[color:var(--ratio-soft)] px-3 py-2.5 pr-14 font-mono text-base tabular-nums text-[color:var(--ratio-fg)] outline-none transition focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/20"
                        aria-label={`${row.secondLabel} value for ${row.label}`}
                      />
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">{row.unit}</span>
                    </div>
                  </label>
                </div>

                <label className="block min-w-0">
                  <span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-200/70">Relationship</span>
                  <div className="relative">
                    <StableNumberInput
                      min="0"
                      step="0.1"
                      value={relationshipInputs[row.id]}
                      onChange={event => updateRelationship(row.id, event.target.value)}
                      className={`w-full rounded-xl border bg-cyan-500/[0.08] px-3 py-2.5 pr-10 font-mono text-base font-semibold tabular-nums text-cyan-50 outline-none transition focus:ring-2 focus:ring-cyan-300/20 ${relationshipErrors[row.id] ? 'border-rose-400/60 focus:border-rose-300/80' : 'border-cyan-300/30 focus:border-cyan-200/80'}`}
                      aria-label={`Relationship value for ${row.label}`}
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-cyan-100/55">: 1</span>
                  </div>
                  <span className={`mt-1.5 block text-[10px] ${rowError ? 'text-rose-200' : 'text-slate-500'}`}>
                    {relationshipErrors[row.id] ?? (row.error ? 'Check the ion values above.' : 'First ÷ second')}
                  </span>
                </label>
              </div>

              {rowError && (
                <div className="mt-3 flex items-center gap-1.5 border-t border-rose-300/15 pt-2.5 text-[10px] text-rose-200">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {rowError}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[10px] leading-relaxed text-slate-500">
          GH is the primary hardness anchor. KH is converted to bicarbonate on import; the other relationships update their paired direct ions.
        </p>
        <button
          type="button"
          onClick={handleImport}
          disabled={hasErrors}
          className="flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-[11px] font-semibold text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          Use these targets in Watermancer
        </button>
      </div>
      {message && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-200" role="status">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {message}
        </div>
      )}
    </section>
  );
}

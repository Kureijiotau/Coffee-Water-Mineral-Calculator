import { useMemo, useState } from "react";
import { ArrowRight, Check, FlaskConical, RotateCcw, Sparkles } from "lucide-react";
import "./GuidedRatioLocking.css";

type RatioRow = {
  id: string;
  label: string;
  description: string;
  anchor: string;
  anchorName: string;
  derived: string;
  derivedName: string;
  unit: string;
  anchorValue: string;
  ratio: string;
  mode: "divide" | "multiply";
  accent: string;
};

const initialRows: RatioRow[] = [
  {
    id: "gh-kh",
    label: "GH → KH",
    description: "Hardness / alkalinity",
    anchor: "GH",
    anchorName: "General hardness",
    derived: "KH",
    derivedName: "Carbonate hardness",
    unit: "ppm",
    anchorValue: "34",
    ratio: "3.78",
    mode: "divide",
    accent: "#e9b675",
  },
  {
    id: "mg-ca",
    label: "Ca → Mg",
    description: "Body / fruit",
    anchor: "Ca²⁺",
    anchorName: "Calcium",
    derived: "Mg²⁺",
    derivedName: "Magnesium",
    unit: "mg/L",
    anchorValue: "2.0",
    ratio: "1.60",
    mode: "multiply",
    accent: "#75e0ce",
  },
  {
    id: "cl-so4",
    label: "Cl → SO₄",
    description: "Juicy / crisp",
    anchor: "Cl⁻",
    anchorName: "Chloride",
    derived: "SO₄²⁻",
    derivedName: "Sulfate",
    unit: "mg/L",
    anchorValue: "16.3",
    ratio: "3.88",
    mode: "divide",
    accent: "#b6e36b",
  },
  {
    id: "na-k",
    label: "Na → K",
    description: "Sweetness modifiers",
    anchor: "Na⁺",
    anchorName: "Sodium",
    derived: "K⁺",
    derivedName: "Potassium",
    unit: "mg/L",
    anchorValue: "7.8",
    ratio: "7.8",
    mode: "divide",
    accent: "#aeb9ff",
  },
];

function formatValue(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, "");
}

function derivedValue(row: RatioRow) {
  const anchor = Number(row.anchorValue);
  const ratio = Number(row.ratio);
  if (!Number.isFinite(anchor) || !Number.isFinite(ratio) || anchor < 0 || ratio <= 0) return Number.NaN;
  return row.mode === "multiply" ? anchor * ratio : anchor / ratio;
}

function updateRow(rows: RatioRow[], id: string, field: "anchorValue" | "ratio", value: string) {
  return rows.map(row => row.id === id ? { ...row, [field]: value } : row);
}

export function GuidedRatioLocking() {
  const [rows, setRows] = useState(initialRows);
  const [imported, setImported] = useState(false);

  const calculatedRows = useMemo(
    () => rows.map(row => ({ ...row, derivedValue: derivedValue(row) })),
    [rows],
  );

  const validCount = calculatedRows.filter(row => Number.isFinite(row.derivedValue)).length;

  const reset = () => {
    setRows(initialRows);
    setImported(false);
  };

  return (
    <main className="ratio-lock-shell min-h-[100dvh] px-4 py-5 text-slate-100 sm:px-8 sm:py-7">
      <div className="relative z-[1] mx-auto max-w-[1120px]">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/40 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200/30 bg-teal-300/10 text-teal-200">
              <FlaskConical className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <div>
              <div className="ratio-lock-heading text-[11px] font-bold uppercase tracking-[0.2em] text-slate-200">Watermancer</div>
              <div className="mt-1 text-[10px] text-slate-500">ion relationship set / quick target editor</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="hidden text-slate-500 sm:inline">My saved profiles / morning cup</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/20 bg-teal-300/[0.07] px-2.5 py-1.5 font-semibold text-teal-100">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-200" aria-hidden="true" />
              8 target cards ready
            </span>
          </div>
        </header>

        <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-200/75">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Quick ratio table
            </div>
            <h1 className="ratio-lock-heading text-3xl font-bold tracking-[-0.06em] text-slate-50 sm:text-4xl">
              Set the ratios. Keep the numbers you like.
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
              Enter one anchor value and its ratio. The partner ion calculates immediately. When the set feels right, send these values straight to the Watermancer cards.
            </p>
          </div>
          <button
            type="button"
            className="ratio-lock-focus inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2 text-[10px] font-semibold text-slate-400 transition hover:border-teal-200/30 hover:text-teal-100"
            onClick={reset}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset values
          </button>
        </section>

        <section className="ratio-lock-card overflow-hidden rounded-2xl" aria-label="Ion ratio target editor">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/50 px-4 py-4 sm:px-6">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Your relationship set</div>
              <p className="mt-1 text-[11px] text-slate-400">The right side is always calculated from the left side and the ratio.</p>
            </div>
            <div className="ratio-lock-number rounded-md border border-slate-700/60 bg-slate-950/30 px-2.5 py-1.5 text-[10px] text-teal-100/80">
              {validCount}/4 rows valid
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(150px,1.2fr)_minmax(130px,1fr)_90px_minmax(130px,1fr)_32px] gap-3 border-b border-slate-700/40 px-4 py-3 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-600 sm:grid sm:px-6">
            <div>Relationship</div>
            <div>Anchor value</div>
            <div>Ratio</div>
            <div>Calculated target</div>
            <div />
          </div>

          <div className="divide-y divide-slate-700/40">
            {calculatedRows.map(row => (
              <div key={row.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(150px,1.2fr)_minmax(130px,1fr)_90px_minmax(130px,1fr)_32px] sm:items-center sm:px-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.accent }} aria-hidden="true" />
                    <span className="ratio-lock-heading text-sm font-bold text-slate-100">{row.label}</span>
                  </div>
                  <div className="mt-1 pl-4 text-[10px] uppercase tracking-[0.1em] text-slate-500">{row.description}</div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600 sm:hidden">Anchor value · {row.anchor}</span>
                  <span className="relative flex items-center">
                    <input
                      className="ratio-lock-field ratio-lock-number w-full rounded-lg px-3 py-2.5 pr-14 text-right text-lg font-bold tabular-nums"
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.anchorValue}
                      onChange={event => {
                        setImported(false);
                        setRows(current => updateRow(current, row.id, "anchorValue", event.target.value));
                      }}
                      aria-label={`${row.anchor} anchor value`}
                    />
                    <span className="pointer-events-none absolute right-3 text-[9px] font-semibold text-slate-500">{row.unit}</span>
                  </span>
                  <span className="mt-1 block text-right text-[9px] text-slate-600">{row.anchorName}</span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600 sm:hidden">Ratio</span>
                  <span className="flex items-center gap-1.5">
                    <input
                      className="ratio-lock-field ratio-lock-number w-full rounded-lg px-2 py-2.5 text-center text-base font-bold tabular-nums"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.ratio}
                      onChange={event => {
                        setImported(false);
                        setRows(current => updateRow(current, row.id, "ratio", event.target.value));
                      }}
                      aria-label={`${row.label} ratio`}
                    />
                    <span className="text-[10px] text-slate-600">:1</span>
                  </span>
                </label>

                <div className="ratio-lock-derived rounded-lg px-3 py-2.5" data-unlocked="false">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:hidden">Calculated · {row.derived}</span>
                    <span className="hidden text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:inline">{row.derived}</span>
                    <span className="text-[9px] text-slate-600">{row.unit}</span>
                  </div>
                  <div className="ratio-lock-number mt-1 text-right text-lg font-bold tabular-nums text-teal-100">
                    {formatValue(row.derivedValue)}
                  </div>
                  <div className="mt-1 text-right text-[9px] text-slate-600">{row.derivedName}</div>
                </div>

                <div className="hidden items-center justify-end sm:flex" title="Calculated automatically">
                  <ArrowRight className="h-4 w-4 text-slate-700" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700/40 bg-slate-950/20 px-4 py-4 sm:px-6">
            <div className="flex items-start gap-2.5 text-[10px] leading-relaxed text-slate-500">
              <span className="ratio-lock-number mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-teal-200/30 text-[9px] text-teal-100/80">i</span>
              <p>
                Only these eight represented ions will be updated. Any other Watermancer targets stay untouched.
              </p>
            </div>
          </div>
        </section>

        <footer className="ratio-lock-footer sticky bottom-0 z-10 mt-6 border-t border-slate-700/50 px-4 py-4 sm:-mx-8 sm:px-8">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-200">
                {imported ? "Watermancer cards updated." : "Like these numbers?"}
              </div>
              <div className="mt-0.5 text-[10px] text-slate-500">
                {imported ? "Your matching targets are ready to use." : "Send the calculated targets over in one step."}
              </div>
            </div>
            <button
              type="button"
              className="ratio-lock-import ratio-lock-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-xs font-bold"
              data-imported={imported}
              disabled={validCount !== rows.length}
              onClick={() => setImported(true)}
            >
              {imported ? <Check className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              {imported ? "Targets in Watermancer" : "Use these targets in Watermancer"}
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDot,
  Info,
  LockKeyhole,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  UnlockKeyhole,
  Upload,
  X,
} from 'lucide-react';

type RatioRow = {
  id: string;
  label: string;
  lens: string;
  calculatedIon: string;
  calculatedFormula: string;
  anchorIon: string;
  anchorFormula: string;
  anchor: number;
  ratio: number;
  unit: 'ppm' | 'mg/L';
  accent: 'copper' | 'cyan' | 'lime' | 'violet';
  locked: boolean;
  active: boolean;
};

const startingRows: RatioRow[] = [
  {
    id: 'gh-kh',
    label: 'Extraction vs. Buffer',
    lens: 'hardness / alkalinity',
    calculatedIon: 'General hardness',
    calculatedFormula: 'GH',
    anchorIon: 'Carbonate hardness',
    anchorFormula: 'KH',
    anchor: 9,
    ratio: 3.78,
    unit: 'ppm',
    accent: 'copper',
    locked: true,
    active: true,
  },
  {
    id: 'mg-ca',
    label: 'Fruit vs. Body',
    lens: 'brightness / weight',
    calculatedIon: 'Magnesium',
    calculatedFormula: 'Mg²⁺',
    anchorIon: 'Calcium',
    anchorFormula: 'Ca²⁺',
    anchor: 2,
    ratio: 1.6,
    unit: 'mg/L',
    accent: 'cyan',
    locked: false,
    active: true,
  },
  {
    id: 'cl-so4',
    label: 'Juicy vs. Crisp',
    lens: 'roundness / definition',
    calculatedIon: 'Chloride',
    calculatedFormula: 'Cl⁻',
    anchorIon: 'Sulfate',
    anchorFormula: 'SO₄²⁻',
    anchor: 4.2,
    ratio: 3.88,
    unit: 'mg/L',
    accent: 'lime',
    locked: false,
    active: true,
  },
  {
    id: 'na-k',
    label: 'Sweetness modifiers',
    lens: 'softness / lift',
    calculatedIon: 'Sodium',
    calculatedFormula: 'Na⁺',
    anchorIon: 'Potassium',
    anchorFormula: 'K⁺',
    anchor: 1,
    ratio: 7.8,
    unit: 'mg/L',
    accent: 'violet',
    locked: false,
    active: true,
  },
];

const accentClasses: Record<RatioRow['accent'], {
  line: string;
  soft: string;
  text: string;
  ring: string;
}> = {
  copper: {
    line: 'bg-orange-300',
    soft: 'bg-orange-300/[0.07]',
    text: 'text-orange-200',
    ring: 'focus-within:ring-orange-300/45',
  },
  cyan: {
    line: 'bg-cyan-300',
    soft: 'bg-cyan-300/[0.07]',
    text: 'text-cyan-200',
    ring: 'focus-within:ring-cyan-300/45',
  },
  lime: {
    line: 'bg-lime-300',
    soft: 'bg-lime-300/[0.07]',
    text: 'text-lime-200',
    ring: 'focus-within:ring-lime-300/45',
  },
  violet: {
    line: 'bg-violet-300',
    soft: 'bg-violet-300/[0.07]',
    text: 'text-violet-200',
    ring: 'focus-within:ring-violet-300/45',
  },
};

function cleanNumber(value: string, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? next : fallback;
}

function displayValue(value: number) {
  if (value >= 10) return value.toFixed(1).replace(/\.0$/, '');
  return value.toFixed(2).replace(/0$/, '').replace(/\.$/, '');
}

function IonMark({ formula, className = '' }: { formula: string; className?: string }) {
  return (
    <span
      className={`inline-flex min-w-[42px] items-center justify-center rounded-md border border-slate-600/70 bg-slate-900/80 px-1.5 py-1 font-mono text-[11px] font-medium tracking-tight text-slate-200 ${className}`}
    >
      {formula}
    </span>
  );
}

function RatioRowView({
  row,
  onChange,
  onToggleLock,
  onToggleActive,
}: {
  row: RatioRow;
  onChange: (id: string, key: 'anchor' | 'ratio', value: string) => void;
  onToggleLock: (id: string) => void;
  onToggleActive: (id: string) => void;
}) {
  const tone = accentClasses[row.accent];
  const calculated = row.anchor * row.ratio;

  return (
    <article
      className={`relative overflow-hidden border-b border-slate-800/80 px-3 py-3.5 transition-colors last:border-b-0 sm:px-4 ${
        row.active ? 'bg-slate-950/20' : 'bg-slate-950/45 opacity-55'
      }`}
      aria-label={`${row.label} ion relationship`}
    >
      <span className={`absolute inset-y-0 left-0 w-0.5 ${tone.line}`} aria-hidden="true" />
      <div className="grid gap-3 md:grid-cols-[1.45fr_1.08fr_1fr_0.74fr_1fr_0.65fr] md:items-center md:gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700/80 ${tone.soft}`}>
            <CircleDot className={`h-3.5 w-3.5 ${tone.text}`} strokeWidth={1.7} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold tracking-[-0.01em] text-slate-100">{row.label}</div>
            <div className="mt-0.5 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-slate-600">{row.lens}</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 md:block">
          <div>
            <div className="flex items-center gap-1.5">
              <IonMark formula={row.calculatedFormula} />
              <span className="text-[10px] text-slate-500">{row.calculatedIon}</span>
            </div>
            <div className="mt-1 text-[9px] uppercase tracking-[0.15em] text-slate-600">calculated</div>
          </div>
          <div className={`text-right font-mono text-base font-semibold tabular-nums ${tone.text} md:mt-1 md:text-left`}>
            {displayValue(calculated)} <span className="font-sans text-[9px] font-medium text-slate-500">{row.unit}</span>
          </div>
        </div>

        <label className={`group block rounded-lg border border-slate-700/70 bg-slate-900/75 px-2.5 py-2 transition focus-within:ring-2 ${tone.ring}`}>
          <span className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Anchor</span>
            <span className="font-mono text-[9px] text-slate-600">{row.anchorFormula}</span>
          </span>
          <span className="mt-1 flex items-baseline gap-1.5">
            <input
              type="number"
              min="0"
              step="0.1"
              value={row.anchor}
              disabled={row.locked || !row.active}
              onChange={event => onChange(row.id, 'anchor', event.target.value)}
              aria-label={`${row.anchorIon} concentration for ${row.label}`}
              className="min-w-0 w-full bg-transparent font-mono text-lg font-semibold tabular-nums text-slate-100 outline-none disabled:cursor-not-allowed disabled:text-slate-600"
            />
            <span className="text-[9px] font-medium text-slate-600">{row.unit}</span>
          </span>
        </label>

        <label className={`block rounded-lg border border-slate-700/70 bg-slate-900/75 px-2.5 py-2 transition focus-within:ring-2 ${tone.ring}`}>
          <span className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Ratio</span>
            <span className="font-mono text-[9px] text-slate-600">X : 1</span>
          </span>
          <span className="mt-1 flex items-baseline gap-1.5">
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={row.ratio}
              disabled={row.locked || !row.active}
              onChange={event => onChange(row.id, 'ratio', event.target.value)}
              aria-label={`${row.label} calculated ratio`}
              className="min-w-0 w-full bg-transparent font-mono text-lg font-semibold tabular-nums text-slate-100 outline-none disabled:cursor-not-allowed disabled:text-slate-600"
            />
            <span className="text-[9px] font-medium text-slate-600">: 1</span>
          </span>
        </label>

        <div className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#10161a] px-2.5 py-2 md:block">
          <div className="flex items-center gap-1.5">
            <IonMark formula={row.anchorFormula} className="border-slate-700/70 bg-slate-950/70 text-slate-400" />
            <span className="text-[10px] text-slate-500">{row.anchorIon}</span>
          </div>
          <div className="mt-1 text-right font-mono text-[11px] tabular-nums text-slate-500 md:text-left">
            {displayValue(row.anchor)} {row.unit}
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 border-t border-slate-800/70 pt-2 md:border-t-0 md:pt-0">
          <button
            type="button"
            onClick={() => onToggleActive(row.id)}
            aria-pressed={row.active}
            aria-label={`${row.active ? 'Deactivate' : 'Activate'} ${row.label}`}
            title={`${row.active ? 'Deactivate' : 'Activate'} relationship`}
            className={`rounded-md border px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200/70 ${
              row.active
                ? 'border-lime-300/20 bg-lime-300/[0.08] text-lime-200'
                : 'border-slate-700 bg-slate-900 text-slate-600'
            }`}
          >
            {row.active ? 'Active' : 'Off'}
          </button>
          <button
            type="button"
            onClick={() => onToggleLock(row.id)}
            aria-pressed={row.locked}
            aria-label={`${row.locked ? 'Unlock' : 'Lock'} ${row.label} values`}
            title={`${row.locked ? 'Unlock' : 'Lock'} row values`}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700/70 bg-slate-900/70 text-slate-500 transition hover:border-slate-500 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200/70"
          >
            {row.locked ? <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" /> : <UnlockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </article>
  );
}

export function QuickRatioTable() {
  const [rows, setRows] = useState<RatioRow[]>(startingRows);
  const [imported, setImported] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const activeRows = useMemo(() => rows.filter(row => row.active), [rows]);
  const unlockedCount = rows.filter(row => !row.locked && row.active).length;
  const activeCount = activeRows.length;

  const updateRow = (id: string, key: 'anchor' | 'ratio', value: string) => {
    setImported(false);
    setRows(current =>
      current.map(row =>
        row.id === id
          ? { ...row, [key]: cleanNumber(value, key === 'anchor' ? row.anchor : row.ratio) }
          : row,
      ),
    );
  };

  const toggleLock = (id: string) => {
    setImported(false);
    setRows(current => current.map(row => (row.id === id ? { ...row, locked: !row.locked } : row)));
  };

  const toggleActive = (id: string) => {
    setImported(false);
    setRows(current => current.map(row => (row.id === id ? { ...row, active: !row.active } : row)));
  };

  const resetRows = () => {
    setRows(startingRows);
    setImported(false);
  };

  const addRelationship = () => {
    setRows(current => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        label: 'Custom relationship',
        lens: 'new ion pair',
        calculatedIon: 'Primary ion',
        calculatedFormula: 'A',
        anchorIon: 'Secondary ion',
        anchorFormula: 'B',
        anchor: 1,
        ratio: 1,
        unit: 'mg/L',
        accent: 'violet',
        locked: false,
        active: true,
      },
    ]);
  };

  return (
    <main
      className="min-h-[100dvh] bg-[#0a0d0e] px-3 py-4 text-slate-100 sm:px-6 sm:py-7"
      style={{
        backgroundImage: 'radial-gradient(circle at 12% 0%, rgba(125, 211, 252, 0.07), transparent 28rem), radial-gradient(circle at 100% 70%, rgba(163, 230, 53, 0.035), transparent 30rem)',
      }}
    >
      <div className="mx-auto max-w-[1180px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200/25 bg-cyan-200/[0.06] shadow-[0_0_0_1px_rgba(255,255,255,0.025)_inset]">
              <span className="absolute h-3 w-3 rounded-full border border-cyan-200/80" aria-hidden="true" />
              <span className="absolute h-1 w-1 rounded-full bg-lime-200" aria-hidden="true" />
            </div>
            <div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-cyan-200/70">Watermancer / instrument 04</div>
              <h1 className="mt-0.5 text-[17px] font-semibold tracking-[-0.03em] text-slate-100">Ion ratio table</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300" aria-hidden="true" />
              local recipe
            </div>
            <button
              type="button"
              onClick={resetRows}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-2.5 py-2 text-[10px] font-semibold text-slate-400 transition hover:border-slate-500 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200/70"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-700/75 bg-[#111719]/95 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.95)]">
          <div className="border-b border-slate-800/90 px-4 py-4 sm:px-5 sm:py-5">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-2xl">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md border border-orange-300/25 bg-orange-300/[0.07] px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-orange-200">Target matrix</span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-600">v1.8 / unsaved</span>
                </div>
                <h2 className="text-2xl font-semibold tracking-[-0.045em] text-slate-100 sm:text-[30px]">Tune the relationship, not the guess.</h2>
                <p className="mt-2 max-w-xl text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                  Set one anchor concentration and its ratio. Watermancer keeps the paired ion target calculated, visible, and ready for matching.
                </p>
              </div>
              <div className="grid min-w-[230px] grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-700/70 bg-slate-700/70">
                <div className="bg-[#0c1113] px-3 py-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">Active pairs</div>
                  <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-lime-200">{activeCount}<span className="text-xs text-slate-600"> / {rows.length}</span></div>
                </div>
                <div className="bg-[#0c1113] px-3 py-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-slate-600">Open to tune</div>
                  <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-cyan-200">{unlockedCount}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3">
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                <span>Anchor values drive the calculated side</span>
                <button
                  type="button"
                  onClick={() => setShowNotes(current => !current)}
                  aria-expanded={showNotes}
                  className="rounded-full p-0.5 text-slate-600 transition hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200/70"
                  aria-label="Show ratio calculation notes"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-600">all concentrations at final water</div>
            </div>
            {showNotes && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-3 py-2.5 text-[10px] leading-relaxed text-cyan-100/70">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200/80" aria-hidden="true" />
                <span>Calculated ion = anchor concentration × ratio. Lock a row when it is part of your house water and toggle it off to exclude it from the matching handoff.</span>
                <button type="button" onClick={() => setShowNotes(false)} className="ml-auto shrink-0 text-cyan-200/60 hover:text-cyan-100" aria-label="Close calculation notes">
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>

          <div className="hidden grid-cols-[1.45fr_1.08fr_1fr_0.74fr_1fr_0.65fr] gap-4 border-b border-slate-800/90 bg-[#0c1113] px-4 py-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600 md:grid">
            <div>Relationship</div>
            <div>Calculated ion</div>
            <div>Anchor concentration</div>
            <div>Ratio</div>
            <div>Anchor ion</div>
            <div className="text-right">State</div>
          </div>

          <div>
            {rows.map(row => (
              <RatioRowView
                key={row.id}
                row={row}
                onChange={updateRow}
                onToggleLock={toggleLock}
                onToggleActive={toggleActive}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/90 bg-[#0c1113] px-3 py-3 sm:px-4">
            <button
              type="button"
              onClick={addRelationship}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-slate-700/80 px-2.5 py-2 text-[10px] font-semibold text-slate-500 transition hover:border-slate-500 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-200/70"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add relationship
            </button>
            <div className="font-mono text-[9px] uppercase tracking-[0.13em] text-slate-600">
              {activeCount} rows will enter matching
            </div>
          </div>
        </section>

        <section className="mt-4 flex flex-col gap-3 rounded-2xl border border-lime-200/20 bg-lime-200/[0.045] p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-lime-200/25 bg-lime-200/[0.08]">
              <Upload className="h-4 w-4 text-lime-200" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-lime-100">Targets are ready for the matching workflow</div>
              <div className="mt-1 text-[10px] leading-relaxed text-lime-100/55">Import active calculated values and keep this ratio table as the source of truth.</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setImported(true)}
            disabled={activeCount === 0}
            className="group flex min-h-10 items-center justify-center gap-2 rounded-xl border border-lime-200/35 bg-lime-200 px-4 py-2.5 text-[11px] font-bold text-[#17200d] shadow-[0_8px_24px_-14px_rgba(190,242,100,0.9)] transition hover:bg-lime-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-100 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101719] disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[230px]"
          >
            {imported ? <Check className="h-4 w-4" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {imported ? 'Imported to Watermancer' : 'Import calculated ion values'}
            {!imported && <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
          </button>
        </section>

        {imported && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-cyan-200/20 bg-cyan-200/[0.06] px-3 py-2.5 text-[10px] text-cyan-100/80" role="status" aria-live="polite">
            <Check className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />
            <span><strong className="font-semibold text-cyan-100">{activeCount} ion targets imported.</strong> Matching can now compare recipes against this matrix.</span>
            <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg] text-cyan-200/60" aria-hidden="true" />
          </div>
        )}

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-700">
          <span>Precision editor / concentration units preserved</span>
          <span>Watermancer matching handoff</span>
        </footer>
      </div>
    </main>
  );
}

export default QuickRatioTable;
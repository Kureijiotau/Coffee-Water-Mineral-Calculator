import { useMemo, useState } from "react";

type Water = {
  name: string;
  country: string;
  ca: number;
  mg: number;
  na: number;
  hco3: number;
  so4: number;
  cl: number;
  use: string;
  note: string;
  noteColors: string[];
};

const waters: Water[] = [
  { name: "Donat Mg", country: "Slovenia · carbonated", ca: 380, mg: 1000, na: 1500, hco3: 7800, so4: 2100, cl: 66, use: "Specialty", note: "extreme Mg + buffer", noteColors: ["#64e4f1", "#c79bf6"] },
  { name: "Vichy Catalan", country: "Spain · carbonated", ca: 14, mg: 6, na: 1097, hco3: 2081, so4: 50, cl: 584, use: "Blend-only", note: "high sodium + chloride", noteColors: ["#ffb85c", "#fb7185"] },
  { name: "Courmayeur", country: "Italy · still", ca: 576, mg: 53, na: 1.2, hco3: 151, so4: 1420, cl: 0.5, use: "Specialty", note: "calcium + sulfate", noteColors: ["#76a9ff", "#9b8cff"] },
  { name: "Contrex", country: "France · still", ca: 468, mg: 74, na: 9.4, hco3: 372, so4: 1121, cl: 7.6, use: "Specialty", note: "calcium + sulfate", noteColors: ["#76a9ff", "#9b8cff"] },
  { name: "Gerolsteiner", country: "Germany · carbonated", ca: 348, mg: 108, na: 118, hco3: 1816, cl: 40, so4: 38, use: "Blend-only", note: "high Mg + buffer", noteColors: ["#64e4f1", "#c79bf6"] },
  { name: "Magnesia", country: "Czechia · carbonated", ca: 37.4, mg: 170, na: 6.1, hco3: 970, cl: 2.1, so4: 11, use: "Specialty", note: "high magnesium", noteColors: ["#64e4f1"] },
  { name: "S.Pellegrino", country: "Italy · carbonated", ca: 169, mg: 49.2, na: 31.2, hco3: 249, cl: 49.8, so4: 403, use: "Blend-only", note: "sulfate + body", noteColors: ["#9b8cff", "#76a9ff"] },
  { name: "Evian", country: "France · still", ca: 80, mg: 26, na: 6.5, hco3: 360, cl: 10, so4: 14, use: "Good base", note: "balanced base", noteColors: ["#76a9ff", "#64e4f1"] },
  { name: "Acqua Panna", country: "Italy · still", ca: 32, mg: 6.2, na: 6.4, hco3: 106, cl: 7.1, so4: 22, use: "Good base", note: "light mineral base", noteColors: ["#76a9ff"] },
  { name: "Volvic", country: "France · still", ca: 12, mg: 8, na: 12, hco3: 74, cl: 15, so4: 9, use: "Good base", note: "low mineral canvas", noteColors: ["#94a3b8"] },
];

const columns = [
  ["mg", "Mg"],
  ["hco3", "HCO₃"],
  ["na", "Na"],
  ["ca", "Ca"],
  ["so4", "SO₄"],
  ["cl", "Cl"],
] as const;

const ionColors: Record<string, string> = {
  mg: "#64e4f1",
  na: "#ffb85c",
  hco3: "#c79bf6",
  ca: "#76a9ff",
  so4: "#9b8cff",
  cl: "#fb7185",
};

export function SortableTable() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<keyof Water>("mg");
  const [descending, setDescending] = useState(true);
  const visible = useMemo(
    () =>
      waters
        .filter((water) => `${water.name} ${water.country} ${water.use}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => (descending ? 1 : -1) * (Number(b[sort]) - Number(a[sort]))),
    [query, sort, descending],
  );
  const chooseSort = (key: keyof Water) => {
    if (sort === key) setDescending((value) => !value);
    else {
      setSort(key);
      setDescending(true);
    }
  };
  const max = (key: keyof Water) => Math.max(...waters.map((water) => Number(water[key])));

  return (
    <div className="min-h-screen bg-[#071526] p-7 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between border-b border-slate-700/70 pb-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Watermancer · Source library</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Find a water by its minerals.</h1>
            <p className="mt-2 text-xs text-slate-400">Search names, scan the ion bars, or click a column to sort.</p>
          </div>
          <div className="text-right text-cyan-200"><div className="text-3xl font-semibold">46</div><div className="text-[10px] text-slate-500">waters in catalog</div></div>
        </div>
        <div className="my-5 flex flex-wrap items-center gap-3">
          <label className="flex w-72 items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-cyan-300">
            <span className="text-lg">⌕</span>
            <input className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500" placeholder="Search water or country…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Quick sort</span>
          {columns.slice(0, 4).map(([key, label]) => (
            <button key={key} onClick={() => chooseSort(key as keyof Water)} className={`rounded-lg border px-3 py-2 text-[11px] ${sort === key ? "border-cyan-300 bg-cyan-400/20 text-cyan-100" : "border-slate-700 bg-slate-900/60 text-slate-400"}`}>
              {label} {sort === key ? (descending ? "↓" : "↑") : ""}
            </button>
          ))}
        </div>
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-950/30 px-3 py-2 text-[11px] text-slate-400">
          <span className="text-cyan-300">✦</span><strong className="text-cyan-100">High magnesium + bicarbonate</strong><span>sorted highest first</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/40">
          <div className="grid min-w-[950px] grid-cols-[1.8fr_repeat(6,0.75fr)_0.9fr] gap-3 bg-slate-900/90 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Water</span>
            {columns.map(([key, label]) => <button key={key} onClick={() => chooseSort(key as keyof Water)} className={`text-left ${sort === key ? "text-cyan-300" : ""}`}>{label}<small className="block text-[8px] font-normal normal-case tracking-normal text-slate-600">mg/L {sort === key ? (descending ? "↓" : "↑") : "↕"}</small></button>)}
            <span>Use</span>
          </div>
          {visible.map((water) => (
            <div key={water.name} className="grid min-w-[950px] grid-cols-[1.8fr_repeat(6,0.75fr)_0.9fr] items-center gap-3 border-t border-slate-800 px-4 py-3 hover:bg-cyan-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-full border-2 bg-slate-950/50 leading-none" style={{ borderColor: ionColors[sort] ?? "#64e4f1", boxShadow: `0 0 16px ${ionColors[sort] ?? "#64e4f1"}22` }}>
                  <b className="text-[11px] tabular-nums tracking-tight">{water[sort]}</b>
                  <small className="mt-1 text-[7px] leading-none text-slate-500">mg/L</small>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold leading-tight" style={{ color: water.noteColors[0] }}>
                    <span className="flex shrink-0 gap-0.5">{water.noteColors.map((color) => <i key={color} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />)}</span>
                    <span className="truncate">{water.note}</span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-100">{water.name}</div>
                  <div className="mt-1 text-[9px] text-slate-500">{water.country}</div>
                </div>
              </div>
              {columns.map(([key]) => <div key={key}><div className="mb-1 h-1 rounded-full bg-slate-800"><div className="h-full rounded-full" style={{ width: `${Math.max(4, (Number(water[key as keyof Water]) / max(key as keyof Water)) * 100)}%`, backgroundColor: ionColors[key] ?? "#64748b" }} /></div><span className="text-xs tabular-nums" style={{ color: ionColors[key] ?? "#cbd5e1" }}>{water[key as keyof Water]}</span></div>)}
              <span className="rounded-full border border-slate-600 px-2 py-1 text-center text-[9px] text-slate-300">{water.use}</span>
            </div>
          ))}
          <div className="border-t border-slate-800 px-4 py-3 text-[10px] text-slate-500">Showing {visible.length} of 46 waters · every number is mg/L</div>
        </div>
      </div>
    </div>
  );
}
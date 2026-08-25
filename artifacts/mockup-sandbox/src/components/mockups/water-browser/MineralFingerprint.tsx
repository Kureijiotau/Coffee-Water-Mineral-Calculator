import { useState } from "react";

const waters = [
  { name: "Donat Mg", country: "Slovenia", type: "Specialty · carbonated", mg: 1000, na: 1500, hco3: 7800, ca: 380, so4: 2100, use: "extreme Mg + buffer" },
  { name: "Vichy Catalan", country: "Spain", type: "Blend-only · carbonated", mg: 6, na: 1097, hco3: 2081, ca: 14, so4: 50, use: "high sodium + chloride" },
  { name: "Courmayeur", country: "Italy", type: "Specialty · still", mg: 53, na: 1.2, hco3: 151, ca: 576, so4: 1420, use: "calcium + sulfate" },
  { name: "Contrex", country: "France", type: "Specialty · still", mg: 74, na: 9.4, hco3: 372, ca: 468, so4: 1121, use: "calcium + sulfate" },
  { name: "Gerolsteiner", country: "Germany", type: "Blend-only · carbonated", mg: 108, na: 118, hco3: 1816, ca: 348, so4: 38, use: "high Mg + buffer" },
  { name: "Magnesia", country: "Czechia", type: "Specialty · carbonated", mg: 170, na: 6.1, hco3: 970, ca: 37.4, so4: 11, use: "high magnesium" },
  { name: "Evian", country: "France", type: "Good base · still", mg: 26, na: 6.5, hco3: 360, ca: 80, so4: 14, use: "balanced base" },
  { name: "Acqua Panna", country: "Italy", type: "Good base · still", mg: 6.2, na: 6.4, hco3: 106, ca: 32, so4: 22, use: "light mineral base" },
];

const minerals = [
  ["mg", "Magnesium", "cyan"],
  ["na", "Sodium", "orange"],
  ["hco3", "Bicarbonate", "violet"],
  ["ca", "Calcium", "blue"],
] as const;

export function MineralFingerprint() {
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("mg");
  const visible = waters.filter((water) => `${water.name} ${water.country} ${water.use}`.toLowerCase().includes(query.toLowerCase()));
  const max = (key: string) => Math.max(...waters.map((water) => Number(water[key as keyof typeof waters[number]])));

  return (
    <div className="min-h-screen bg-[#071526] p-7 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between border-b border-slate-700/70 pb-5">
          <div><div className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Source library · mineral fingerprints</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">See the water’s personality.</h1><p className="mt-2 text-xs text-slate-400">Filter by what a water contributes—not just what it’s called.</p></div>
          <span className="rounded-full border border-cyan-400/40 px-3 py-2 text-[10px] tracking-wider text-cyan-200">46 SOURCES</span>
        </div>
        <div className="my-5 flex flex-wrap items-center gap-3">
          <label className="flex w-64 items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-cyan-300"><span className="text-lg">⌕</span><input className="w-full bg-transparent text-xs outline-none placeholder:text-slate-500" placeholder="Find a water…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <span className="text-[10px] uppercase tracking-wider text-slate-500">Highlight</span>
          {minerals.map(([key, label]) => <button key={key} onClick={() => setFocus(key)} className={`rounded-lg border px-3 py-2 text-[10px] ${focus === key ? "border-cyan-300 bg-cyan-400/20 text-cyan-100" : "border-slate-700 bg-slate-900/60 text-slate-400"}`}>{label}</button>)}
        </div>
        <div className="mb-4 flex flex-wrap gap-5 text-[10px] text-slate-400"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-cyan-300" />high magnesium</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-300" />high sodium</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-violet-300" />high bicarbonate</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-300" />high calcium</span></div>
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((water) => (
            <article key={water.name} className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800/90 to-slate-950/80 p-4 shadow-xl">
              <div className="flex justify-between"><div><h2 className="text-sm font-semibold">{water.name}</h2><p className="mt-1 text-[10px]">{water.country} · {water.type}</p></div><span className="text-xl text-cyan-300">↗</span></div>
              <div className="my-4 flex items-center gap-4"><div className="flex h-16 w-16 flex-col items-center justify-center rounded-full border-2 border-cyan-300 bg-cyan-950/70"><b className="text-lg">{water[focus as keyof typeof water]}</b><small className="text-[8px] text-slate-400">mg/L</small></div><div><strong className="block text-xs text-cyan-100">{minerals.find(([key]) => key === focus)?.[1]}</strong><span className="mt-1 block text-[10px] text-amber-200">{water.use}</span><em className="mt-1 block text-[9px] text-slate-500 not-italic">{Number(water[focus as keyof typeof water]) > max(focus) * 0.3 ? "strong contributor" : "light touch"}</em></div></div>
              <div className="space-y-2 border-t border-slate-700 pt-3">{minerals.map(([key, label, color]) => <div key={key}><div className="flex justify-between text-[9px] text-slate-400"><span>{label}</span><b className="text-slate-200">{water[key as keyof typeof water]}</b></div><div className="mt-1 h-1 rounded-full bg-slate-700"><div className={`h-full rounded-full bg-${color}-300`} style={{ width: `${Math.max(3, Number(water[key as keyof typeof water]) / max(key) * 100)}%` }} /></div></div>)}</div>
              <div className="mt-3 flex gap-4 border-t border-slate-700 pt-3 text-[9px] text-slate-400"><span>SO₄ <b className="text-slate-200">{water.so4}</b></span><span className="ml-auto text-emerald-300">{water.use}</span></div>
            </article>
          ))}
        </div>
        <footer className="mt-4 text-[10px] text-slate-500">{visible.length} source profiles · tap a mineral to reframe every card</footer>
      </div>
    </div>
  );
}
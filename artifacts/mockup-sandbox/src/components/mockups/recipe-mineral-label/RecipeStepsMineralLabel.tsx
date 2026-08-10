import { Droplets, FlaskConical, Leaf, Waves } from "lucide-react";

const ions = [
  { name: "Calcium", symbol: "Ca²⁺", value: "12.4", tone: "text-[#0d6170]" },
  { name: "Magnesium", symbol: "Mg²⁺", value: "18.7", tone: "text-[#0d6170]" },
  { name: "Sodium", symbol: "Na⁺", value: "6.2", tone: "text-[#0d6170]" },
  { name: "Potassium", symbol: "K⁺", value: "1.1", tone: "text-[#0d6170]" },
  { name: "Bicarbonate", symbol: "HCO₃⁻", value: "15.0", tone: "text-[#8a5e1b]" },
  { name: "Chloride", symbol: "Cl⁻", value: "21.8", tone: "text-[#8a5e1b]" },
  { name: "Sulfate", symbol: "SO₄²⁻", value: "14.6", tone: "text-[#8a5e1b]" },
];

function IonRow({
  name,
  symbol,
  value,
  tone,
}: (typeof ions)[number]) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#0d6170]/15 py-2.5 last:border-b-0">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="font-semibold tracking-tight text-[#173f49]">{name}</span>
        <span className="font-mono text-[10px] text-[#47737a]">{symbol}</span>
      </div>
      <span className={`shrink-0 font-mono text-sm font-bold tabular-nums ${tone}`}>
        {value}
        <span className="ml-1 text-[9px] font-semibold tracking-normal text-[#47737a]">mg/L</span>
      </span>
    </div>
  );
}

function Step({
  number,
  title,
  children,
  accent = "sky",
}: {
  number: string;
  title: string;
  children: React.ReactNode;
  accent?: "sky" | "violet" | "emerald";
}) {
  const colors = {
    sky: "border-sky-400/20 bg-slate-900/35",
    violet: "border-violet-300/20 bg-slate-900/35",
    emerald: "border-emerald-300/20 bg-emerald-500/[0.06]",
  };
  const numberColors = {
    sky: "bg-sky-400/20 text-sky-100 ring-sky-300/20",
    violet: "bg-violet-400/20 text-violet-100 ring-violet-300/20",
    emerald: "bg-emerald-400/20 text-emerald-100 ring-emerald-300/20",
  };

  return (
    <section className={`flex gap-3 rounded-xl border p-3 ${colors[accent]}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 ${numberColors[accent]}`}>
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-medium text-slate-200">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function WaterDose({
  label,
  name,
  amount,
  tone = "cyan",
}: {
  label: string;
  name: string;
  amount: string;
  tone?: "cyan" | "teal";
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-lg border px-2.5 py-2 ${
      tone === "teal"
        ? "border-teal-300/35 bg-teal-400/[0.08]"
        : "border-cyan-300/35 bg-cyan-400/[0.08]"
    }`}>
      <div className="min-w-0">
        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-cyan-100/70">{label}</div>
        <div className="mt-0.5 truncate text-xs font-semibold text-cyan-50">{name}</div>
      </div>
      <span className="shrink-0 rounded-md border border-cyan-300/30 bg-cyan-400/15 px-2 py-1 font-mono text-base font-bold leading-none tabular-nums text-cyan-100">
        {amount}
      </span>
    </div>
  );
}

function SaltDose({
  number,
  name,
  formula,
  amount,
  tone,
}: {
  number: string;
  name: string;
  formula: string;
  amount: string;
  tone: string;
}) {
  return (
    <div className={`rounded-lg border px-2.5 py-2 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold">{number}. {name}</div>
          <div className="mt-0.5 text-[10px] text-slate-300/65">{formula}</div>
        </div>
        <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.08] px-2 py-1 font-mono text-sm font-bold leading-none tabular-nums text-violet-100">
          {amount}
        </span>
      </div>
    </div>
  );
}

function MineralLabel() {
  return (
    <aside className="relative overflow-hidden rounded-[1.35rem] border border-[#7cc3c5] bg-[#e9f3ee] text-[#173f49] shadow-[0_24px_70px_-35px_rgba(0,0,0,0.9)]">
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent 0, transparent 7px, rgba(13,97,112,0.12) 8px), repeating-linear-gradient(90deg, transparent 0, transparent 7px, rgba(13,97,112,0.08) 8px)",
      }} />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between border-b-2 border-[#0d6170] pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0d6170]/35 bg-[#c9e7df]">
              <Droplets className="h-4 w-4 text-[#0d6170]" />
            </span>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#47737a]">Water profile</div>
              <div className="font-['Georgia'] text-lg font-bold tracking-tight text-[#173f49]">Mineral analysis</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0d6170]">Current mix</div>
            <div className="mt-0.5 text-[9px] text-[#47737a]">final contribution</div>
          </div>
        </div>

        <div className="border-b border-[#0d6170]/35 py-3 text-center">
          <div className="font-['Georgia'] text-2xl font-bold tracking-tight text-[#0d6170]">Brew water</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#47737a]">from current waters + salt doses</div>
          <div className="mt-2 flex items-center justify-center gap-2 text-[9px] text-[#47737a]">
            <span className="h-px w-8 bg-[#0d6170]/35" />
            <span>per litre of finished water</span>
            <span className="h-px w-8 bg-[#0d6170]/35" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-5 border-b border-[#0d6170]/35 py-3">
          <div>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#47737a]">Cations</div>
            {ions.slice(0, 4).map(ion => <IonRow key={ion.name} {...ion} />)}
          </div>
          <div>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#47737a]">Anions</div>
            {ions.slice(4).map(ion => <IonRow key={ion.name} {...ion} />)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-b border-[#0d6170]/35 py-3 text-center">
          {[
            ["TDS", "91", "ppm"],
            ["GH", "83", "ppm"],
            ["KH", "15", "ppm"],
          ].map(([label, value, unit]) => (
            <div key={label} className="rounded-lg border border-[#0d6170]/20 bg-white/40 px-2 py-2">
              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#47737a]">{label}</div>
              <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-[#0d6170]">{value}</div>
              <div className="text-[8px] uppercase tracking-wider text-[#47737a]">{unit}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 text-[9px] text-[#47737a]">
          <span className="flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> calculated profile</span>
          <span className="font-mono font-bold uppercase tracking-[0.14em]">mg/L = ppm</span>
        </div>
      </div>
    </aside>
  );
}

export function RecipeStepsMineralLabel() {
  return (
    <main className="min-h-screen bg-[#020617] p-4 text-slate-100 sm:p-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-4 flex items-center justify-between px-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Recipe steps</div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Waves className="h-3.5 w-3.5 text-cyan-300" /> saved recipe card preview
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)]">
          <div className="space-y-2.5 rounded-2xl border border-sky-400/25 bg-slate-800 p-4 shadow-2xl sm:p-5">
            <div className="mb-1 flex items-center justify-between gap-3">
              <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Step-by-step</div>
              <div className="text-[9px] text-slate-500">7 actions</div>
            </div>

            <Step number="1" title="Prepare the water">
              <div className="mt-3 space-y-1.5">
                <WaterDose label="RO / distilled water" name="Add purified water" amount="2.86 L" />
                <WaterDose label="Base water" name="Aquacode" amount="75 mL" />
                <WaterDose label="Base water" name="Perrier" amount="65 mL" tone="teal" />
              </div>
            </Step>

            <Step number="2" title="Add the minerals in order">
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Add one salt at a time. Stir until fully dissolved before adding the next.
              </p>
              <div className="mt-2 space-y-2">
                <SaltDose number="1" name="Magnesium Sulfate" formula="MgSO₄ · Heptahydrate (Epsom)" amount="78.00 mg" tone="border-violet-300/35 bg-violet-400/[0.08] text-violet-100" />
                <SaltDose number="2" name="Magnesium Chloride" formula="MgCl₂ · Hexahydrate" amount="18.00 mg" tone="border-fuchsia-300/35 bg-fuchsia-400/[0.08] text-fuchsia-100" />
                <SaltDose number="3" name="Calcium Chloride" formula="CaCl₂ · Dihydrate" amount="8.50 mg" tone="border-amber-300/35 bg-amber-400/[0.08] text-amber-100" />
                <SaltDose number="4" name="Sodium Chloride" formula="NaCl · Anhydrous" amount="5.00 mg" tone="border-rose-300/35 bg-rose-400/[0.08] text-rose-100" />
              </div>
            </Step>

            <Step number="3" title="Combine and top up">
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Dissolve the salts in 500 mL first, then add the mineral concentrate to the remaining water and stir thoroughly.
              </p>
            </Step>

            <Step number="4" title="Verify and brew" accent="emerald">
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Check for approximately 91 ppm TDS. The water should be clear and all minerals fully dissolved.
              </p>
            </Step>
          </div>

          <MineralLabel />
        </div>

        <div className="mt-4 flex items-center gap-2 px-1 text-[10px] text-slate-500">
          <Leaf className="h-3.5 w-3.5 text-emerald-300" />
          The label reports the final profile after source waters and current salt doses are combined.
        </div>
      </div>
    </main>
  );
}
import { useState, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  CircleHelp,
  Droplet,
  FlaskConical,
  Pipette,
  RotateCcw,
  Scale,
} from 'lucide-react';
import './_group.css';

type VolumeUnit = 'mL' | 'L' | 'Gal';

const volumeUnitFactors: Record<VolumeUnit, number> = {
  mL: 1,
  L: 1000,
  Gal: 3785.41,
};

function formatVolume(volumeMl: number, unit: VolumeUnit) {
  const value = volumeMl / volumeUnitFactors[unit];
  const precision = unit === 'mL' ? 0 : 2;
  return `${Number(value.toFixed(precision))} ${unit}`;
}

function WorkspaceHeader() {
  return (
    <header className="current-water-header relative overflow-hidden rounded-2xl border border-white/10 bg-slate-800/70 shadow-xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-violet-950 via-fuchsia-950/80 to-slate-950 px-5 py-4 sm:px-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-white">Watermancer</div>
          <p className="mt-0.5 text-xs text-slate-300/75">Coffee water, made precise</p>
        </div>
        <nav aria-label="App workspace" className="flex flex-wrap gap-1.5">
          <button type="button" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300">Calculator</button>
          <button type="button" aria-current="page" className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-300/35 bg-fuchsia-400/15 px-3 py-2 text-xs font-semibold text-fuchsia-100">
            <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" /> Concentrates
          </button>
          <button type="button" className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300">Mixer</button>
        </nav>
      </div>
    </header>
  );
}

function SegmentedButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? 'border border-cyan-300/30 bg-cyan-400/15 text-cyan-100 shadow-sm'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

export function LotusConcentrateProposal() {
  const [volumeMl, setVolumeMl] = useState(450);
  const [unit, setUnit] = useState<VolumeUnit>('mL');
  const [tipStyle, setTipStyle] = useState<'Straight' | 'Round'>('Straight');
  const [bonusEpsom, setBonusEpsom] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState<'Recipe' | 'DIY'>('DIY');
  const [activeDIY, setActiveDIY] = useState<'Stock builder' | 'DIY Lotus Drops'>('DIY Lotus Drops');

  const displayVolume = formatVolume(volumeMl, unit);
  const volumeScale = 450 / volumeMl;
  const sourcePpm = (2.431 * volumeScale).toFixed(3);
  const calibratedPpm = (3.147 * volumeScale).toFixed(3);
  const dropsPerMl = tipStyle === 'Straight' ? '25.0' : '11.2';

  return (
    <main className="current-water-shell min-h-screen font-sans text-slate-100">
      <div className="current-water-stack mx-auto flex min-h-screen w-full max-w-5xl flex-col p-4 sm:p-6">
        <WorkspaceHeader />

        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1" role="tablist" aria-label="Concentrate type">
          <SegmentedButton active={activeWorkspace === 'Recipe'} onClick={() => setActiveWorkspace('Recipe')}>Recipe concentrate</SegmentedButton>
          <SegmentedButton active={activeWorkspace === 'DIY'} onClick={() => setActiveWorkspace('DIY')}>DIY concentrate</SegmentedButton>
        </div>

        <section className="current-water-quiet flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl sm:px-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-fuchsia-200/80">DIY concentrate</p>
            <h1 className="mt-1 text-base font-semibold text-white">Lotus Drops</h1>
          </div>
          <div className="flex rounded-xl border border-slate-700/70 bg-slate-950/40 p-1" role="tablist" aria-label="DIY concentrate mode">
            {(['Stock builder', 'DIY Lotus Drops'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={activeDIY === mode}
                onClick={() => setActiveDIY(mode)}
                className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors ${
                  activeDIY === mode ? 'border border-rose-300/30 bg-rose-400/15 text-rose-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-rose-300/20 bg-gradient-to-br from-rose-400/[0.08] via-slate-800/75 to-amber-400/[0.045] p-4 shadow-xl sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Pipette className="h-4 w-4 text-rose-200" aria-hidden="true" /> Dropper setup
            </h2>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
              <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" /> Straight calibrated
            </span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1.15fr_1fr]">
            <label className="rounded-xl border border-rose-200/15 bg-slate-950/35 px-3 py-2.5">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-100/75">Dropper to prepare</span>
              <select defaultValue="magnesium" className="mt-1 w-full bg-transparent text-sm font-semibold text-white outline-none">
                <option value="magnesium" className="bg-slate-900">Magnesium</option>
              </select>
            </label>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-950/35 px-3 py-2.5">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">Selected mineral</div>
                <div className="mt-1 text-sm font-semibold text-amber-200">Magnesium chloride</div>
                <div className="text-[10px] text-slate-400">MgCl₂ · hexahydrate</div>
              </div>
              <div className="flex shrink-0 rounded-lg border border-slate-700/70 bg-slate-900/70 p-1" role="group" aria-label="Dropper tip style">
                <SegmentedButton active={tipStyle === 'Straight'} onClick={() => setTipStyle('Straight')}>Straight</SegmentedButton>
                <SegmentedButton active={tipStyle === 'Round'} onClick={() => setTipStyle('Round')}>Round</SegmentedButton>
              </div>
            </div>
          </div>

          <details className="current-water-details mt-3 rounded-xl border border-sky-300/20 bg-sky-400/[0.045] px-3 py-2.5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-sky-100">
              <span className="flex items-center gap-2"><Pipette className="h-3.5 w-3.5" aria-hidden="true" /> Dropper calibration</span>
              <span className="flex items-center gap-2 text-[10px] text-slate-400">
                {tipStyle} tip · {tipStyle === 'Straight' ? '25.0' : '11.2'} drops/mL
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">Saved calibration is shared with Lotus and DIY concentrates. Recalibrate only if you change tip style or dropper.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/35 p-2.5 text-xs">
                <div className="font-semibold text-slate-200">Straight tip</div>
                <div className="mt-1 text-slate-400">100 drops · 4 g water</div>
                <div className="mt-1 text-emerald-200">25.0 drops/mL · calibrated</div>
              </div>
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/35 p-2.5 text-xs">
                <div className="font-semibold text-slate-200">Round tip</div>
                <div className="mt-1 text-slate-400">Not calibrated yet</div>
                <div className="mt-1 text-amber-200">11.2 drops/mL · estimate</div>
              </div>
            </div>
          </details>

          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-amber-200/15 bg-amber-400/[0.035] px-3 py-2.5">
            <span className="flex items-center gap-2 text-xs font-medium text-amber-100">
              <input type="checkbox" checked={bonusEpsom} onChange={(event) => setBonusEpsom(event.target.checked)} className="h-4 w-4 accent-amber-300" />
              Add bonus Epsom
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-200/80">Optional · not Lotus</span>
          </label>
        </section>

        <section className="rounded-2xl border border-cyan-300/20 bg-slate-800/70 p-4 shadow-xl sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Droplet className="h-4 w-4 text-cyan-300" aria-hidden="true" /> Brew-water volume
            </h2>
            <div className="flex items-center gap-2">
              <strong className="text-sm tabular-nums text-cyan-100">{displayVolume}</strong>
              <button type="button" onClick={() => setVolumeMl(450)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-600/70 bg-slate-950/40 px-2.5 text-[10px] font-semibold text-slate-300 hover:text-white">
                <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-lg border border-slate-700/70 bg-slate-950/35 p-1" role="group" aria-label="Volume unit">
              {(['mL', 'L', 'Gal'] as const).map((volumeUnit) => (
                <button
                  key={volumeUnit}
                  type="button"
                  aria-pressed={unit === volumeUnit}
                  onClick={() => setUnit(volumeUnit)}
                  className={`rounded-md px-3 py-1.5 text-[10px] font-semibold ${unit === volumeUnit ? 'bg-cyan-300/20 text-cyan-100 ring-1 ring-cyan-200/25' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {volumeUnit}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-500">Changes ppm per drop</span>
          </div>
          <input
            aria-label="Brew-water volume in milliliters"
            type="range"
            min="50"
            max="2000"
            step="10"
            value={volumeMl}
            onChange={(event) => setVolumeMl(Number(event.target.value))}
            className="mt-4 h-2 w-full cursor-pointer accent-cyan-300"
          />
          <div className="flex justify-between text-[9px] tabular-nums text-slate-500"><span>50 mL</span><span>2 L</span></div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-700/70 bg-slate-950/35 p-3">
              <div className="flex items-center justify-between gap-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                Lotus source reference <CircleHelp className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-white">+{sourcePpm} ppm Mg / drop</div>
              <div className="mt-0.5 text-[9px] text-slate-500">At {displayVolume} final water</div>
            </div>
            <div className="rounded-xl border border-cyan-300/25 bg-cyan-400/[0.06] p-3">
              <div className="flex items-center justify-between gap-2 text-[9px] font-semibold uppercase tracking-wider text-cyan-100/65">
                Your {tipStyle.toLowerCase()} dropper <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-cyan-100">+{calibratedPpm} ppm Mg / drop</div>
              <div className="mt-0.5 text-[9px] text-slate-500">{dropsPerMl} drops/mL · at {displayVolume}</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/[0.07] via-slate-800/75 to-slate-800/70 p-4 shadow-xl sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200/75">
                <Scale className="h-3.5 w-3.5" aria-hidden="true" /> Weight-based preparation
              </p>
              <h2 className="mt-1 text-base font-semibold text-white">Make this stock</h2>
            </div>
            <button type="button" className="rounded-lg border border-emerald-200/20 bg-slate-950/30 px-3 py-2 text-[10px] font-semibold text-emerald-100">Save JPG</button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Finished stock</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-white">100 <span className="text-xs font-medium text-slate-400">g</span></div>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Salt to weigh</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-white">22.844 <span className="text-xs font-medium text-slate-400">g</span></div>
              <div className="text-[9px] text-slate-500">MgCl₂ · hexahydrate</div>
            </div>
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/35 px-3 py-2.5">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">Water to add</div>
              <div className="mt-1 text-xl font-semibold tabular-nums text-white">77.156 <span className="text-xs font-medium text-slate-400">g</span></div>
              <div className="text-[9px] text-slate-500">Bottle excluded</div>
            </div>
          </div>

          <ol className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
            <li className="flex gap-2 rounded-lg border border-emerald-200/10 bg-slate-950/25 p-2.5"><span className="font-bold text-emerald-200">1</span><span>Put the bottle on the scale and tare.</span></li>
            <li className="flex gap-2 rounded-lg border border-emerald-200/10 bg-slate-950/25 p-2.5"><span className="font-bold text-emerald-200">2</span><span>Add salt, then water to the target mass.</span></li>
            <li className="flex gap-2 rounded-lg border border-emerald-200/10 bg-slate-950/25 p-2.5"><span className="font-bold text-emerald-200">3</span><span>Leave headspace; cap and shake to dissolve.</span></li>
          </ol>

          <details className="current-water-details mt-3 rounded-lg border border-emerald-200/15 bg-slate-950/20 px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs text-emerald-100/80">
              Notes on the estimate <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </summary>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">The Lotus source reference and your calibrated drop size are separate readings. Stock math stays weight-based; for plain water, 1 mL is approximately 1 g. These sample figures mirror the current visual reference only.</p>
          </details>
          {bonusEpsom && <p className="mt-2 text-[10px] text-amber-200/80">Bonus Epsom is included as an optional extra, not part of the Lotus source recipe.</p>}
        </section>

        <p className="pb-2 text-center text-[10px] text-slate-500">Layout proposal only · the live app’s Lotus calculations remain unchanged.</p>
      </div>
    </main>
  );
}

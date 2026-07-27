import { useMemo } from 'react';
import { X, Droplet, FlaskConical, Gauge, ArrowRight, RotateCcw, ListChecks } from 'lucide-react';
import { SALTS, ION_MAP, ACTIVE_ION_IDS, computeSaltMg } from '@/waterData';
import type { MineralWaterEntry, SaltRow } from './App';

interface BrewGuideModalProps {
  show: boolean;
  onClose: () => void;
  rows: SaltRow[];
  batchMl: number;
  liters: string;
  totalBaseMl: number;
  totalMineralMl: number;
  mineralWaters: MineralWaterEntry[];
  additionWaters: MineralWaterEntry[];
  activeRecipe: { name: string } | null;
  sulfateFirst: boolean;
}

export default function BrewGuideModal({
  show, onClose, rows, batchMl, liters, totalBaseMl, totalMineralMl,
  mineralWaters, additionWaters, activeRecipe, sulfateFirst,
}: BrewGuideModalProps) {
  if (!show) return null;

  const activeSalts = useMemo(() => {
    const salts: { name: string; formula: string; mg: number; hydrate: string; id: string }[] = [];
    SALTS.forEach((s, i) => {
      const target = parseFloat(rows[i].target);
      if (target > 0) {
        const form = s.hydratedForms[rows[i].formIdx];
        const mg = computeSaltMg({ target, batchMl, form, saltId: s.id });
        salts.push({
          name: s.name,
          formula: s.formula,
          mg,
          hydrate: form.name,
          id: s.id,
        });
      }
    });
    return salts;
  }, [rows, batchMl]);

  const orderedSalts = useMemo(() => {
    if (!sulfateFirst) return activeSalts;
    const sulfates = activeSalts.filter(s => s.formula.includes('SO₄'));
    const others = activeSalts.filter(s => !s.formula.includes('SO₄'));
    return [...sulfates, ...others];
  }, [activeSalts, sulfateFirst]);

  const numWaters = mineralWaters.length + additionWaters.length;
  const hasWaters = numWaters > 0;
  const roMl = Math.max(batchMl - totalBaseMl - totalMineralMl, 0);
  const totalSaltMg = activeSalts.reduce((s, e) => s + e.mg, 0);
  const hasMagBicarb = activeSalts.some(s =>
    s.formula.includes('Mg') && (s.formula.includes('HCO₃') || s.formula.includes('CO₃'))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/60 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-white" />
            <h2 className="text-base font-bold text-white">Brew Guide</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-2 text-xs text-slate-400">
          {activeRecipe ? (
            <span>Recipe: <span className="text-sky-300 font-semibold">{activeRecipe.name}</span></span>
          ) : (
            <span className="italic">Custom recipe</span>
          )}
          <span className="mx-2">·</span>
          <span>{liters}L batch</span>
          {totalSaltMg > 0 && (
            <>
              <span className="mx-2">·</span>
              <span className="text-emerald-300">{totalSaltMg.toFixed(1)} mg total salts</span>
            </>
          )}
        </div>

        <div className="px-5 pb-5 space-y-3">
          <Step number={1} icon={<Droplet className="w-4 h-4" />} title="Prepare your water">
            <div className="space-y-1">
              {roMl > 0 && (
                <p>Start with <strong>{roMl} mL</strong> of RO/distilled water.</p>
              )}
              {mineralWaters.map(w => {
                const vol = parseFloat(w.volumeMl);
                if (vol <= 0) return null;
                const ionNames = ACTIVE_ION_IDS
                  .filter(id => parseFloat(w.ions[id] ?? '') > 0)
                  .map(id => `${ION_MAP[id].name} ${w.ions[id]} ppm`);
                return (
                  <p key={w.id}>
                    Add <strong>{vol} mL</strong> of <strong>{w.name || 'Base water'}</strong>
                    {ionNames.length > 0 && <span className="text-slate-400"> ({ionNames.join(', ')})</span>}.
                  </p>
                );
              })}
              {additionWaters.map(w => {
                const vol = parseFloat(w.volumeMl);
                if (vol <= 0) return null;
                const ionNames = ACTIVE_ION_IDS
                  .filter(id => parseFloat(w.ions[id] ?? '') > 0)
                  .map(id => `${ION_MAP[id].name} ${w.ions[id]} ppm`);
                return (
                  <p key={w.id}>
                    Add <strong>{vol} mL</strong> of <strong>{w.name || 'Addition water'}</strong>
                    {ionNames.length > 0 && <span className="text-slate-400"> ({ionNames.join(', ')})</span>}.
                  </p>
                );
              })}
              {!hasWaters && roMl <= 0 && (
                <p>Use <strong>{batchMl} mL</strong> of filtered or bottled water.</p>
              )}
              {roMl > 0 && (totalBaseMl > 0 || totalMineralMl > 0) && (
                <p className="text-slate-400 text-[11px]">
                  Total water: {roMl + totalBaseMl + totalMineralMl} mL
                </p>
              )}
            </div>
          </Step>

          {activeSalts.length > 0 && (
            <Step number={2} icon={<FlaskConical className="w-4 h-4" />} title="Add minerals">
              <div className="space-y-2">
                {sulfateFirst && (
                  <p className="text-xs text-amber-300 flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    Sulfate-first mode — add sulfate minerals before other salts.
                  </p>
                )}
                <div className="bg-slate-900/50 rounded-lg border border-slate-700/40 divide-y divide-slate-700/30">
                  {orderedSalts.length > 0 ? (
                    orderedSalts.map((s, i) => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500 w-5">{i + 1}.</span>
                          <span className="text-sm font-medium text-white">{s.name}</span>
                          <span className="text-[11px] text-slate-400">({s.formula})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-emerald-300">{s.mg.toFixed(1)} mg</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">{s.hydrate}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic px-3 py-2">No salts with targets set.</p>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Weigh each salt on a <strong>0.01 g precision scale</strong>, add to the water, and stir until fully dissolved.
                  {sulfateFirst && ' Add sulfates first, stir, then add the remaining salts.'}
                </p>
                {hasMagBicarb && (
                  <p className="text-xs text-amber-400/80 flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" />
                    Magnesium bicarbonate may degas — dissolve last and use promptly.
                  </p>
                )}
              </div>
            </Step>
          )}

          <Step number={activeSalts.length > 0 ? 3 : 2} icon={<Gauge className="w-4 h-4" />} title="Verify & brew">
            <div className="space-y-1">
              <p>Total batch: <strong>{batchMl} mL</strong> ({liters} L).</p>
              <p>Stir thoroughly and check that all minerals are fully dissolved before brewing. For espresso, pre-heat your equipment.</p>
              <p className="text-[11px] text-slate-400">This guide assumes room-temperature mixing water. Adjust extraction parameters to taste.</p>
            </div>
          </Step>

          <div className="bg-slate-900/40 rounded-xl border border-slate-700/40 px-4 py-3 mt-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Water breakdown</span>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">RO water:</span>
                <span className="float-right font-mono text-slate-300">{roMl} mL</span>
              </div>
              <div>
                <span className="text-slate-500">Base waters:</span>
                <span className="float-right font-mono text-sky-300">{totalBaseMl} mL</span>
              </div>
              <div>
                <span className="text-slate-500">Addition waters:</span>
                <span className="float-right font-mono text-sky-300">{totalMineralMl} mL</span>
              </div>
              <div>
                <span className="text-slate-500">Total salts:</span>
                <span className="float-right font-mono text-emerald-300">{totalSaltMg.toFixed(1)} mg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ number, icon, title, children }: {
  number: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 bg-slate-700/30 px-4 py-2.5 border-b border-slate-700/40">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
          {number}
        </span>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
          {icon}
          {title}
        </span>
      </div>
      <div className="px-4 py-3 text-sm text-slate-300 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

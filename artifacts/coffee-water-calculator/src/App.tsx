import { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Droplet, FlaskConical, Gauge, Info, AlertTriangle, Settings, Eye, EyeOff, Download, Check, Save, Share2, Upload, Trash2 } from 'lucide-react';
import {
  SALTS, IONS, ACTIVE_ION_IDS, ION_MAP, AIKI_DEFAULT_PROFILE, RECIPES, classifyIon, computeSaltMg,
  computeIonTotals, computeGH, computeKH, checkConcentrate,
  type IonId, type TrafficLevel, type WaterProfile, type RangeSet,
  type SaltRecipe, type SaltRecipeEntry, type ConcentrateWarning,
} from '@/waterData';
import {
  loadSavedRecipes, saveSavedRecipes, serializeRecipeFile, parseRecipeFile, newRecipeId,
} from '@/recipes';
import { SettingsModal } from '@/SettingsModal';
import {
  loadProfiles, saveProfiles, loadActiveProfileId, saveActiveProfileId,
  loadIndicatorOn, saveIndicatorOn, createProfile,
} from '@/profiles';

type SaltRow = { target: string; formIdx: number };
type BaseWater = Partial<Record<IonId, string>>;

const TRAFFIC_STYLES: Record<TrafficLevel, { dot: string; text: string; border: string; bg: string; label: string }> = {
  green:  { dot: 'bg-emerald-400', text: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', label: 'In range' },
  yellow: { dot: 'bg-amber-400',   text: 'text-amber-300',   border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   label: 'Elevated' },
  red:    { dot: 'bg-rose-400',    text: 'text-rose-300',    border: 'border-rose-500/40',    bg: 'bg-rose-500/10',    label: 'Too high' },
};

const num = (s: string): number => {
  const v = parseFloat(s);
  return !Number.isFinite(v) || v < 0 ? 0 : v;
};

const fmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

function App() {
  const [liters, setLiters] = useState('1');
  const [rows, setRows] = useState<SaltRow[]>(
    SALTS.map(s => ({ target: '', formIdx: s.defaultFormIdx ?? 0 })),
  );
  const [baseWater, setBaseWater] = useState<BaseWater>({});
  const [bottledMl, setBottledMl] = useState('0');

  // Profile + settings state
  const [profiles, setProfiles] = useState<WaterProfile[]>(() => loadProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string>(() => loadActiveProfileId());
  const [showSettings, setShowSettings] = useState(false);
  const [indicatorOn, setIndicatorOn] = useState<boolean>(() => loadIndicatorOn());

  const activeProfile = profiles.find(p => p.id === activeProfileId) ?? AIKI_DEFAULT_PROFILE;
  const activeRanges: RangeSet = activeProfile.ranges;

  // Persist on changes
  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => { saveActiveProfileId(activeProfileId); }, [activeProfileId]);
  useEffect(() => { saveIndicatorOn(indicatorOn); }, [indicatorOn]);

  const handleSelectProfile = (id: string) => setActiveProfileId(id);
  const handleSaveProfile = (profile: WaterProfile) => {
    setProfiles(prev => {
      const existing = prev.find(p => p.id === profile.id);
      if (existing) return prev.map(p => p.id === profile.id ? profile : p);
      return [...prev, profile];
    });
    setActiveProfileId(profile.id);
  };
  const handleDeleteProfile = (id: string) => {
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfileId === id) setActiveProfileId(AIKI_DEFAULT_PROFILE.id);
  };

  const L = num(liters);
  const batchMl = L * 1000;
  const bottled = num(bottledMl);
  const overfill = bottled > batchMl && batchMl > 0;
  const dil = batchMl > 0 ? Math.min(bottled / batchMl, 1) : 0;
  const tdsMl = Math.max(batchMl - Math.min(bottled, batchMl), 0);

  const saltTargets = useMemo(() => {
    const m: Record<string, number> = {};
    SALTS.forEach((s, i) => { m[s.id] = num(rows[i].target); });
    return m;
  }, [rows]);

  const baseIons = useMemo(() => {
    const m = {} as Partial<Record<IonId, number>>;
    for (const id of ACTIVE_ION_IDS) m[id] = num(baseWater[id] ?? '');
    return m;
  }, [baseWater]);

  const ionTotals = useMemo(
    () => computeIonTotals(saltTargets, baseIons, dil),
    [saltTargets, baseIons, dil],
  );

  // Bottled water's own contribution (already diluted)
  const bottledIons = useMemo(() => {
    const m = {} as Record<IonId, number>;
    for (const ion of IONS) m[ion.id] = (baseIons[ion.id] || 0) * dil;
    return m;
  }, [baseIons, dil]);

  const gh = computeGH(ionTotals);
  const kh = computeKH(ionTotals);
  const ghBottled = computeGH(bottledIons);
  const khBottled = computeKH(bottledIons);
  const ghSalt = gh - ghBottled;
  const khSalt = kh - khBottled;

  // ── Concentrate state ──────────────────────────────
  const [concentrateOn, setConcentrateOn] = useState(false);
  const [concentrateStrength, setConcentrateStrength] = useState(100);
  const [concentrateMl, setConcentrateMl] = useState('500');

  const concL = num(concentrateMl) / 1000;
  const concSaltTargets = useMemo(() => {
    const m: Record<string, number> = {};
    for (const salt of SALTS) {
      m[salt.id] = num(rows[SALTS.indexOf(salt)].target);
    }
    return m;
  }, [rows]);

  const concWarnings: ConcentrateWarning[] = useMemo(
    () => concentrateOn ? checkConcentrate(concentrateStrength, concSaltTargets) : [],
    [concentrateOn, concentrateStrength, concSaltTargets],
  );

  const concFeasibility: { level: 'green' | 'amber' | 'red'; label: string } = useMemo(() => {
    const hasError = concWarnings.some(w => w.severity === 'error');
    const hasWarning = concWarnings.some(w => w.severity === 'warning');
    if (hasError) return { level: 'red', label: 'Split required' };
    if (hasWarning) return { level: 'amber', label: 'Split recommended' };
    return { level: 'green', label: 'Single stock OK' };
  }, [concWarnings]);

  const concDoseMlPerLiter = concentrateOn && concentrateStrength > 0 ? 1000 / concentrateStrength : 0;
  const concDoseMlPerBatch = concDoseMlPerLiter * L;

  const overallLevel: TrafficLevel = useMemo(() => {
    let worst: TrafficLevel = 'green';
    for (const id of ACTIVE_ION_IDS) {
      const lvl = classifyIon(ionTotals[id], activeRanges[id]);
      if (lvl === 'red') return 'red';
      if (lvl === 'yellow') worst = 'yellow';
    }
    return worst;
  }, [ionTotals, activeRanges]);

  // Recipe state
  const [activeRecipeId, setActiveRecipeId] = useState<string>('custom');
  const [savedRecipes, setSavedRecipes] = useState<SaltRecipe[]>(() => loadSavedRecipes());
  useEffect(() => { saveSavedRecipes(savedRecipes); }, [savedRecipes]);

  const allRecipes = [...RECIPES, ...savedRecipes];
  const activeRecipe = allRecipes.find(r => r.id === activeRecipeId);
  const isSavedRecipeActive = savedRecipes.some(r => r.id === activeRecipeId);

  const applyRecipeObject = (recipe: SaltRecipe) => {
    setActiveRecipeId(recipe.id);
    setRows(SALTS.map(salt => {
      const entry = recipe.salts[salt.id];
      if (entry) return { target: entry.target, formIdx: entry.formIdx };
      return { target: '', formIdx: salt.defaultFormIdx ?? 0 };
    }));
  };

  const applyRecipe = (recipeId: string) => {
    if (recipeId === 'custom') { setActiveRecipeId('custom'); return; }
    const recipe = allRecipes.find(r => r.id === recipeId);
    if (recipe) applyRecipeObject(recipe);
  };

  const buildCurrentSalts = (): Record<string, SaltRecipeEntry> => {
    const m: Record<string, SaltRecipeEntry> = {};
    SALTS.forEach((s, i) => {
      if (num(rows[i].target) > 0) m[s.id] = { target: rows[i].target, formIdx: rows[i].formIdx };
    });
    return m;
  };

  const handleSaveRecipe = () => {
    const salts = buildCurrentSalts();
    if (Object.keys(salts).length === 0) {
      window.alert('Enter at least one salt target before saving a recipe.');
      return;
    }
    const name = window.prompt('Name this recipe:')?.trim();
    if (!name) return;
    const recipe: SaltRecipe = { id: newRecipeId(), name, salts };
    setSavedRecipes(prev => [...prev, recipe]);
    setActiveRecipeId(recipe.id);
  };

  const handleDeleteRecipe = () => {
    const recipe = savedRecipes.find(r => r.id === activeRecipeId);
    if (!recipe) return;
    if (!window.confirm(`Delete saved recipe "${recipe.name}"? This cannot be undone.`)) return;
    setSavedRecipes(prev => prev.filter(r => r.id !== recipe.id));
    setActiveRecipeId('custom');
  };

  const handleExportRecipe = () => {
    const salts = buildCurrentSalts();
    if (Object.keys(salts).length === 0) {
      window.alert('Enter at least one salt target before exporting a recipe.');
      return;
    }
    let name = activeRecipe?.name;
    if (!name) {
      name = window.prompt('Name this recipe for sharing:')?.trim() || '';
      if (!name) return;
    }
    const text = serializeRecipeFile({ name, salts });
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'recipe';
    a.download = `${slug}.coffeewater.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const recipe = parseRecipeFile(text);
    if (!recipe) {
      window.alert("Couldn't read that file — it doesn't look like a valid coffee water recipe.");
      return;
    }
    setSavedRecipes(prev => [...prev, recipe]);
    applyRecipeObject(recipe);
  };

  const updateRow = (i: number, patch: Partial<SaltRow>) => {
    setActiveRecipeId('custom');
    setRows(prev => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  // Export recipe card
  const [exportCopied, setExportCopied] = useState(false);
  const exportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildRecipeText = (): string => {
    const lines: string[] = [];
    const line = (s: string) => lines.push(s);
    const divider = (char = '─', len = 44) => lines.push(char.repeat(len));

    line('╔════════════════════════════════════════════╗');
    line('║   Coffee Water Mineral Recipe Card         ║');
    line('╚════════════════════════════════════════════╝');
    line('');
    line(`Profile : ${activeProfile.name}`);
    line(`Volume  : ${liters} L`);
    line('');

    divider();
    line('MINERAL SALTS');
    divider();
    const saltLines = SALTS.map((salt, i) => {
      const row = rows[i];
      const form = salt.hydrationForms[row.formIdx];
      const target = num(row.target);
      if (target === 0) return null;
      const mg = L > 0
        ? computeSaltMg(target, L, form.molarMass, salt.anhydrousMass)
        : 0;
      const saltLabel = `${salt.name}${salt.hydrationForms.length > 1 ? ` (${form.label})` : ''}`;
      return `  ${saltLabel.padEnd(32)} ${mg.toFixed(2).padStart(7)} mg  (${target} ppm target)`;
    }).filter(Boolean);
    if (saltLines.length === 0) {
      line('  (no salts entered)');
    } else {
      saltLines.forEach(l => line(l!));
    }

    line('');
    divider();
    line('ION TOTALS  (mg/L)');
    divider();
    for (const id of ACTIVE_ION_IDS) {
      const ion = ION_MAP[id];
      const ppm = ionTotals[id];
      const level = classifyIon(ppm, activeRanges[id]);
      const flag = level === 'green' ? '✓' : level === 'yellow' ? '△' : '✗';
      line(`  ${flag} ${ion.name.padEnd(16)} ${ppm.toFixed(1).padStart(6)} ppm`);
    }

    line('');
    divider();
    line('HARDNESS  (ppm as CaCO₃)');
    divider();
    line(`  GH (General)   : ${gh.toFixed(1)} ppm  (salts: ${ghSalt.toFixed(1)}, mineral: ${ghBottled.toFixed(1)})`);
    line(`  KH (Carbonate) : ${kh.toFixed(1)} ppm  (salts: ${khSalt.toFixed(1)}, mineral: ${khBottled.toFixed(1)})`);
    if (kh > 0) line(`  GH:KH ratio    : ${(gh / kh).toFixed(2)} : 1`);

    if (bottled > 0) {
      line('');
      divider();
      line('MINERAL WATER ADDITION');
      divider();
      line(`  Volume : ${bottledMl} mL of ${L * 1000} mL total batch`);
    }

    line('');
    line(`Generated: ${new Date().toLocaleString()}`);

    return lines.join('\n');
  };

  const handleExport = () => {
    const text = buildRecipeText();

    // Download .txt file
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coffee-water-recipe-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    // Copy to clipboard
    navigator.clipboard.writeText(text).catch(() => {});

    // Show confirmation briefly
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);
    setExportCopied(true);
    exportTimerRef.current = setTimeout(() => setExportCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-start justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-5xl space-y-4">
        {/* Header */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-2xl border border-slate-700/60 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-sky-600 to-cyan-500">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-white" />
              <h1 className="text-lg font-semibold text-white tracking-tight">Coffee Water Mineral Calculator</h1>
            </div>
            <div className="group/badge flex items-center gap-1">
              {indicatorOn && <OverallBadge level={overallLevel} />}
              <button
                onClick={() => setIndicatorOn(prev => !prev)}
                className={`flex items-center gap-1 text-xs text-slate-100/70 hover:text-white hover:bg-white/20 rounded-lg px-2 py-1.5 transition-all focus:opacity-100 ${
                  indicatorOn
                    ? 'opacity-0 group-hover/badge:opacity-100'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title={indicatorOn ? 'Hide status badge' : 'Show status badge'}
              >
                {indicatorOn ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mineral Table */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-700/40 text-slate-300">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Mineral Salts</h2>
              <span className="text-xs text-slate-400 font-normal normal-case">
                — {activeRecipe?.name ?? 'Custom'}
              </span>
              {concentrateOn && (
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  concFeasibility.level === 'green'
                    ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                    : concFeasibility.level === 'amber'
                    ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                    : 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                }`}>
                  {concFeasibility.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={activeRecipeId}
                onChange={e => applyRecipe(e.target.value)}
                className="bg-slate-700/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
              >
                <option value="custom">Custom</option>
                <optgroup label="Built-in">
                  {RECIPES.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </optgroup>
                {savedRecipes.length > 0 && (
                  <optgroup label="My recipes">
                    {savedRecipes.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              {activeRecipeId === 'custom' && (
                <button
                  onClick={handleSaveRecipe}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-700/40 hover:bg-slate-700/60 rounded-lg px-2.5 py-1.5 transition"
                  title="Save the current salts as a named recipe on this device"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              )}
              {isSavedRecipeActive && (
                <button
                  onClick={handleDeleteRecipe}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-300 bg-slate-700/40 hover:bg-rose-500/20 rounded-lg px-2.5 py-1.5 transition"
                  title="Delete this saved recipe"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleExportRecipe}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-700/40 hover:bg-slate-700/60 rounded-lg px-2.5 py-1.5 transition"
                title="Export this recipe as a shareable file"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-700/40 hover:bg-slate-700/60 rounded-lg px-2.5 py-1.5 transition"
                title="Import a shared recipe file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
          <div className="hidden sm:grid grid-cols-[1.3fr_1fr_1.2fr_1fr] gap-3 px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-slate-400 border-b border-slate-700/40">
            <span>Salt</span>
            <span>Target (ppm)</span>
            <span>Hydrated Form</span>
            <span>{concentrateOn ? 'Amount' : 'Amount (mg)'}</span>
          </div>
          {SALTS.map((salt, i) => {
            const row = rows[i];
            const form = salt.hydrationForms[row.formIdx];
            const target = num(row.target);
            const mg = L > 0 && target > 0
              ? computeSaltMg(target, L, form.molarMass, salt.anhydrousMass)
              : 0;
            const concMg = concentrateOn && target > 0 && concL > 0
              ? computeSaltMg(target, concL, form.molarMass, salt.anhydrousMass) * concentrateStrength
              : 0;
            const displayMass = concentrateOn ? concMg : mg;
            const massLabel = concentrateOn && displayMass >= 1000
              ? `${(displayMass / 1000).toFixed(2)} g`
              : `${displayMass.toFixed(2)} mg`;
            return (
              <div key={salt.id} className="grid grid-cols-2 sm:grid-cols-[1.3fr_1fr_1.2fr_1fr] gap-x-3 gap-y-2 px-4 sm:px-6 py-3 sm:py-2.5 sm:items-center border-b border-slate-700/30 last:border-b-0 hover:bg-slate-700/20 transition-colors">
                <div className="col-span-2 sm:col-span-1 flex flex-row items-baseline gap-2 sm:flex-col sm:items-start sm:gap-0">
                  <span className="text-sm font-medium text-slate-200">{salt.name}</span>
                  <span className="text-xs text-slate-500">{salt.formula}</span>
                </div>
                <div>
                  <label htmlFor={`salt-target-${salt.id}`} className="sm:hidden block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Target (ppm)</label>
                  <input
                    id={`salt-target-${salt.id}`}
                    type="number"
                    inputMode="decimal"
                    aria-label={`${salt.name} target ppm`}
                    value={row.target}
                    onChange={e => updateRow(i, { target: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                  />
                </div>
                <div>
                  <label htmlFor={salt.hydrationForms.length > 1 ? `salt-form-${salt.id}` : undefined} className="sm:hidden block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Hydrated Form</label>
                  {salt.hydrationForms.length > 1 ? (
                    <select
                      id={`salt-form-${salt.id}`}
                      aria-label={`${salt.name} hydrated form`}
                      value={row.formIdx}
                      onChange={e => updateRow(i, { formIdx: parseInt(e.target.value) })}
                      className="w-full bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                    >
                      {salt.hydrationForms.map((f, fi) => (
                        <option key={fi} value={fi}>{f.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="block px-0 sm:px-3 py-2 text-sm text-slate-500">{salt.hydrationForms[0].label}</span>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-baseline gap-2 sm:block">
                  <span className="sm:hidden text-[10px] uppercase tracking-wider text-slate-500">{concentrateOn ? 'Amount' : 'Amount (mg)'}</span>
                  <span className="text-sm font-mono text-emerald-300">
                    {displayMass > 0 ? massLabel : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Water amount + Concentrate */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader
            icon={<Droplet className="w-4 h-4" />}
            title="Water Volume"
            after={
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <span className={`transition-colors ${concentrateOn ? 'text-sky-300' : ''}`}>Concentrate</span>
                <div className={`relative w-9 h-5 rounded-full transition-colors ${concentrateOn ? 'bg-sky-500' : 'bg-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={concentrateOn}
                    onChange={e => setConcentrateOn(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${concentrateOn ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </label>
            }
          />
          <div className="px-4 sm:px-6 py-4 space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <label className="text-sm text-slate-300">Final batch volume:</label>
              <input
                type="number"
                inputMode="decimal"
                value={liters}
                onChange={e => setLiters(e.target.value)}
                placeholder="Liters"
                className="w-32 bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
              />
              <span className="text-sm text-slate-400">liters</span>
            </div>

            {concentrateOn && (
              <div className="space-y-3 border border-sky-500/30 bg-sky-500/5 rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-300">Stock strength:</label>
                    <select
                      value={concentrateStrength}
                      onChange={e => setConcentrateStrength(Number(e.target.value))}
                      className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                    >
                      <option value={10}>×10</option>
                      <option value={25}>×25</option>
                      <option value={50}>×50</option>
                      <option value={100}>×100</option>
                      <option value={150}>×150</option>
                      <option value={200}>×200</option>
                      <option value={500}>×500</option>
                      <option value={0}>Custom</option>
                    </select>
                    {concentrateStrength === 0 && (
                      <input
                        type="number"
                        inputMode="numeric"
                        min={2}
                        value={concentrateStrength || ''}
                        onChange={e => setConcentrateStrength(Number(e.target.value) || 0)}
                        placeholder="×"
                        className="w-20 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-300">Stock volume:</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={concentrateMl}
                      onChange={e => setConcentrateMl(e.target.value)}
                      placeholder="500"
                      className="w-24 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                    />
                    <span className="text-xs text-slate-400">mL</span>
                  </div>
                </div>

                {concentrateStrength > 0 && concL > 0 && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sky-200 bg-sky-500/10 rounded-lg px-3 py-2 border border-sky-500/20">
                    <span>Add <strong>{concDoseMlPerLiter.toFixed(1)} mL</strong> of stock per liter of brew water</span>
                    {L > 0 && (
                      <span className="text-sky-300">· <strong>{concDoseMlPerBatch.toFixed(1)} mL</strong> per batch</span>
                    )}
                    <span className="text-slate-400">· Weigh the amounts shown in the salts table</span>
                  </div>
                )}

                {/* Warnings */}
                {concWarnings.length > 0 && (
                  <div className="space-y-2">
                    {concWarnings.map((w, wi) => (
                      <div
                        key={wi}
                        className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                          w.severity === 'error'
                            ? 'text-rose-200 bg-rose-500/10 border border-rose-500/25'
                            : w.severity === 'warning'
                            ? 'text-amber-200 bg-amber-500/10 border border-amber-500/25'
                            : 'text-slate-300 bg-slate-700/40 border border-slate-600/40'
                        }`}
                      >
                        <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                          w.severity === 'error' ? 'text-rose-400' : w.severity === 'warning' ? 'text-amber-400' : 'text-slate-400'
                        }`} />
                        <span>{w.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* GH / KH Summary */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader icon={<Gauge className="w-4 h-4" />} title="Hardness Summary (as CaCO₃)" />
          <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <HardnessCard label="General Hardness (GH)" value={gh} saltValue={ghSalt} bottledValue={ghBottled} />
            <HardnessCard label="Carbonate Hardness (KH)" value={kh} saltValue={khSalt} bottledValue={khBottled} />
            <div className="sm:col-span-2 flex items-center justify-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">GH : KH Ratio</span>
              <span className="h-4 w-px bg-slate-700" />
              {kh > 0 && gh >= 0 && Number.isFinite(gh / kh) ? (
                <span className="text-lg font-semibold text-sky-300 tabular-nums">
                  {(gh / kh).toFixed(1)}<span className="text-slate-400 font-normal text-sm mx-1">:</span>1
                </span>
              ) : (
                <span className="text-lg font-semibold text-slate-500">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Mineral Water */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader icon={<Droplet className="w-4 h-4" />} title="Mineral Water Addition" />
          <div className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-300">Mineral water volume:</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={bottledMl}
                  onChange={e => setBottledMl(e.target.value)}
                  placeholder="0"
                  className="w-28 bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                />
                <span className="text-sm text-slate-400">mL</span>
              </div>
              {batchMl > 0 && (
                <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg px-3 py-1.5 border border-slate-700/40">
                  {fmt(Math.min(bottled, batchMl))} mL mineral
                  <span className="text-slate-500 mx-1.5">+</span>
                  {fmt(tdsMl)} mL 0 TDS
                  <span className="text-slate-500 mx-1.5">=</span>
                  {fmt(batchMl)} mL final
                </div>
              )}
            </div>
            {overfill && (
              <div className="flex items-center gap-2 mb-4 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Mineral water volume exceeds the final batch volume. The excess is ignored — the whole batch will be mineral water with no 0 TDS added.
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {ACTIVE_ION_IDS.map(id => (
                <div key={id}>
                  <label className="block text-xs text-slate-400 mb-1">{ION_MAP[id].formula}</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={baseWater[id] ?? ''}
                    onChange={e => setBaseWater(prev => ({ ...prev, [id]: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-slate-900/60 border border-slate-600/60 rounded-lg px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Enter mineral concentrations from the mineral water label in mg/L. The mineral water is part of the final batch — the remainder is 0 TDS water.
            </p>
          </div>
        </div>

        {/* Ion Profile */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-700/40 text-slate-300">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wider">Ion Profile</h2>
              <span className="text-xs text-slate-400 font-normal normal-case">— {activeProfile.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className={`flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5 transition ${
                  exportCopied
                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-700/40 hover:bg-slate-700/60'
                }`}
                title="Export recipe card (downloads .txt and copies to clipboard)"
              >
                {exportCopied ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{exportCopied ? 'Copied!' : 'Export'}</span>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-700/40 hover:bg-slate-700/60 rounded-lg px-2.5 py-1.5 transition"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            </div>
          </div>
          <div className="px-4 sm:px-6 py-4 grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ACTIVE_ION_IDS.map((id, idx) => {
              const ion = ION_MAP[id];
              const ppm = ionTotals[id];
              const level = classifyIon(ppm, activeRanges[id]);
              const s = TRAFFIC_STYLES[level];
              const r = activeRanges[id];
              const tooltipAbove = idx >= Math.ceil(ACTIVE_ION_IDS.length / 2);
              return (
                <div
                  key={id}
                  className={`group/ion relative rounded-xl border ${s.border} ${s.bg} px-4 py-3`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-200 cursor-help">{ion.name}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold ${s.text}`}>{ppm.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">ppm</span>
                  </div>
                  <div className={`text-xs ${s.text} mt-0.5`}>
                    {s.label} · &lt;{r.greenMax} / {r.greenMax}–{r.yellowMax} / &gt;{r.yellowMax}
                  </div>
                  <span className={`pointer-events-none absolute left-0 w-56 z-10 rounded-lg bg-slate-900 border border-slate-600/60 px-3 py-2 text-xs text-slate-300 opacity-0 group-hover/ion:opacity-100 transition-opacity shadow-xl ${
                    tooltipAbove ? 'bottom-full mb-2' : 'top-full mt-2'
                  }`}>
                    {ion.tasteNote}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          profiles={profiles}
          activeProfileId={activeProfileId}
          onClose={() => setShowSettings(false)}
          onSelectProfile={handleSelectProfile}
          onSaveProfile={handleSaveProfile}
          onDeleteProfile={handleDeleteProfile}
        />
      )}
    </div>
  );
}

function SectionHeader({ icon, title, after }: { icon: React.ReactNode; title: string; after?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-slate-700/40 text-slate-300">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold uppercase tracking-wider">{title}</h2>
      </div>
      {after}
    </div>
  );
}

function OverallBadge({ level }: { level: TrafficLevel }) {
  const s = TRAFFIC_STYLES[level];
  const text = level === 'green' ? 'All ions in range' : level === 'yellow' ? 'Some ions elevated' : 'Ion levels too high';
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${s.bg} border ${s.border}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
      <span className={`text-xs font-medium ${s.text}`}>{text}</span>
    </div>
  );
}

function HardnessCard({ label, value, saltValue, bottledValue }: {
  label: string; value: number; saltValue: number; bottledValue: number;
}) {
  return (
    <div className="bg-slate-900/40 rounded-xl border border-slate-700/40 px-4 py-3">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-cyan-300">{value.toFixed(1)}</span>
        <span className="text-sm text-slate-400">ppm CaCO₃</span>
      </div>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-400">Salts:</span>
          <span className="font-mono text-emerald-300">{saltValue.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="text-slate-400">Mineral:</span>
          <span className="font-mono text-sky-300">{bottledValue.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}

export default App;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, Droplet, FlaskConical, Gauge, Info, AlertTriangle, Settings, Eye, EyeOff, Download, Check, Save, Share2, Upload, Trash2, Layers, X, RotateCcw, Plus } from 'lucide-react';
import {
  SALTS, IONS, ACTIVE_ION_IDS, ION_MAP, AIKI_DEFAULT_PROFILE, RECIPES, classifyIon, computeSaltMg,
  computeIonTotals, computeGH, computeKH, checkConcentrate, splitIntoStockGroups,
  type IonId, type TrafficLevel, type WaterProfile, type RangeSet,
  type SaltRecipe, type SaltRecipeEntry, type ConcentrateWarning, type StockGroup,
} from '@/waterData';
import {
  loadSavedRecipes, saveSavedRecipes, serializeRecipeFile, parseRecipeFile, newRecipeId,
} from '@/recipes';
import { SettingsModal } from '@/SettingsModal';
import LabelScanner from '@/LabelScanner';
import { loadLocalWaters, saveLocalWaters, newLocalWaterId, type LocalWater } from '@/localWaters';
import {
  loadProfiles, saveProfiles, loadActiveProfileId, saveActiveProfileId,
  loadIndicatorOn, saveIndicatorOn, createProfile,
} from '@/profiles';

type SaltRow = { target: string; formIdx: number };
type MineralWaterEntry = {
  id: string;
  name: string;
  ions: Partial<Record<IonId, string>>;
  volumeMl: string;
};
let _mwId = 0;
const newMwId = () => `mw_${++_mwId}_${Date.now()}`;

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

const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

interface CommunityWater {
  id: number;
  name: string;
  ions: Record<string, number>;
  shared: string;
}

function App() {
  const [liters, setLiters] = useState('1');
  const [rows, setRows] = useState<SaltRow[]>(
    SALTS.map(s => ({ target: '', formIdx: s.defaultFormIdx ?? 0 })),
  );
  const [mineralWaters, setMineralWaters] = useState<MineralWaterEntry[]>([]);
  const [sulfateFirst, setSulfateFirst] = useState(false);
  // 'addition' = mineral water ions stack on top of salts (original)
  // 'base'     = mineral water is the brewing base; ions don't affect totals
  const [mineralWaterMode, setMineralWaterMode] = useState<'addition' | 'base'>('base');
  const addMineralWater = (partial?: { name?: string; ions?: Partial<Record<IonId, string>>; volumeMl?: string }) => {
    const entry: MineralWaterEntry = {
      id: newMwId(),
      name: partial?.name ?? '',
      ions: partial?.ions ?? {},
      volumeMl: partial?.volumeMl ?? '0',
    };
    setMineralWaters(prev => [...prev, entry]);
    return entry;
  };
  const updateMineralWater = (id: string, patch: Partial<MineralWaterEntry>) => {
    setMineralWaters(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };
  const removeMineralWater = (id: string) => {
    setMineralWaters(prev => prev.filter(e => e.id !== id));
  };

  // ── Local waters (curated by user, stored in localStorage) ──
  const [localWaters, setLocalWaters] = useState<LocalWater[]>(() => loadLocalWaters());
  const saveWaters = useCallback((waters: LocalWater[]) => {
    setLocalWaters(waters);
    saveLocalWaters(waters);
  }, []);

  // ── Community waters browser (on-demand from API) ──
  const [communityModalOpen, setCommunityModalOpen] = useState(false);
  const [communityWaters, setCommunityWaters] = useState<CommunityWater[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const openCommunityModal = async () => {
    setCommunityModalOpen(true);
    setCommunityLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/waters`);
      if (resp.ok) {
        const data = await resp.json();
        setCommunityWaters(data.waters ?? []);
      }
    } catch { /* server may be down */ }
    setCommunityLoading(false);
  };

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

  // Combined mineral water state
  const totalMineralMl = batchMl > 0
    ? Math.min(mineralWaters.reduce((s, e) => s + num(e.volumeMl), 0), batchMl)
    : 0;
  const tdsMl = Math.max(batchMl - totalMineralMl, 0);
  const overfill = mineralWaters.reduce((s, e) => s + num(e.volumeMl), 0) > batchMl && batchMl > 0;
  const dil = batchMl > 0 ? totalMineralMl / batchMl : 0;

  const saltTargets = useMemo(() => {
    const m: Record<string, number> = {};
    SALTS.forEach((s, i) => { m[s.id] = num(rows[i].target); });
    return m;
  }, [rows]);

  // Weighted-average base water concentrations across all entries
  const combinedBaseIons = useMemo(() => {
    const m = {} as Partial<Record<IonId, number>>;
    for (const id of ACTIVE_ION_IDS) {
      let weighted = 0, totalVol = 0;
      for (const entry of mineralWaters) {
        const vol = num(entry.volumeMl);
        if (vol > 0) {
          weighted += (num(entry.ions[id] ?? '') * vol);
          totalVol += vol;
        }
      }
      m[id] = totalVol > 0 ? weighted / totalVol : 0;
    }
    return m;
  }, [mineralWaters]);

  const ionTotals = useMemo(
    () => computeIonTotals(saltTargets, mineralWaterMode === 'addition' ? combinedBaseIons : {}, dil),
    [saltTargets, combinedBaseIons, dil, mineralWaterMode],
  );

  // Salt-only contribution (no base water) — used for the coverage bars
  const saltOnlyIons = useMemo(
    () => computeIonTotals(saltTargets, {}, dil),
    [saltTargets, dil],
  );

  // Combined contribution from all mineral waters (already diluted)
  const bottledIons = useMemo(() => {
    const m = {} as Record<IonId, number>;
    for (const ion of IONS) {
      let total = 0;
      for (const entry of mineralWaters) {
        const vol = num(entry.volumeMl);
        if (vol > 0 && batchMl > 0) {
          total += (num(entry.ions[ion.id] ?? '') * vol) / batchMl;
        }
      }
      m[ion.id] = total;
    }
    return m;
  }, [mineralWaters, batchMl]);

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

  // ── Split stocks state ──────────────────────────────
  const [splitMode, setSplitMode] = useState(false);
  const [splitStrengths, setSplitStrengths] = useState<Record<string, number>>({
    hardness: 100, alkalinity: 100, citrate: 50,
  });
  const [splitMls, setSplitMls] = useState<Record<string, string>>({
    hardness: '500', alkalinity: '500', citrate: '500',
  });

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

  // ── Reset state ────────────────────────────────────
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const handleReset = () => {
    setRows(SALTS.map(s => ({ target: '', formIdx: s.defaultFormIdx ?? 0 })));
    setMineralWaters([]);
    setLiters('1');
    setShowResetConfirm(false);
  };

  // ── Split stocks derived state ──────────────────────
  const stockGroups = useMemo(
    () => (splitMode && concentrateOn) ? splitIntoStockGroups(concSaltTargets) : [],
    [splitMode, concentrateOn, concSaltTargets],
  );

  const splitGroupWarnings = useMemo(() => {
    const result: Record<string, ConcentrateWarning[]> = {};
    for (const group of stockGroups) {
      const groupTargets: Record<string, number> = {};
      for (const saltId of group.saltIds) groupTargets[saltId] = concSaltTargets[saltId] ?? 0;
      result[group.id] = checkConcentrate(splitStrengths[group.id] ?? 100, groupTargets);
    }
    return result;
  }, [stockGroups, splitStrengths, concSaltTargets]);

  const splitFeasibility: { level: 'green' | 'amber' | 'red'; label: string } = useMemo(() => {
    if (!splitMode || stockGroups.length === 0) return { level: 'green', label: 'Split OK' };
    const all = Object.values(splitGroupWarnings).flat();
    if (all.some(w => w.severity === 'error'))   return { level: 'red',   label: 'Still issues' };
    if (all.some(w => w.severity === 'warning')) return { level: 'amber', label: 'Check stocks' };
    return { level: 'green', label: 'Split OK' };
  }, [splitMode, stockGroups, splitGroupWarnings]);

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
    // Restore split stocks state — missing fields default to off/100/'500'
    setSplitMode(recipe.splitMode ?? false);
    if (recipe.splitStrengths) setSplitStrengths(prev => ({ ...prev, ...recipe.splitStrengths }));
    if (recipe.splitMls) setSplitMls(prev => ({ ...prev, ...recipe.splitMls }));
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
    const recipe: SaltRecipe = {
      id: newRecipeId(),
      name,
      salts,
      ...(splitMode && {
        splitMode: true,
        splitStrengths: { ...splitStrengths },
        splitMls: { ...splitMls },
      }),
    };
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
    const text = serializeRecipeFile({
      name,
      salts,
      ...(splitMode && {
        splitMode: true,
        splitStrengths: { ...splitStrengths },
        splitMls: { ...splitMls },
      }),
    });
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
    if (concentrateOn) {
      if (splitMode && stockGroups.length > 0) {
        line('Mode    : Split stock concentrate');
      } else {
        line(`Mode    : Single stock concentrate  (×${concentrateStrength}  ${concentrateMl} mL stock)`);
      }
    }
    line('');

    divider();
    line('MINERAL SALTS  (per-batch direct amounts)');
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

    // ── Concentrate instructions ──────────────────────────────────────
    if (concentrateOn && !splitMode) {
      // Single stock
      const stockL = num(concentrateMl) / 1000;
      const dosePerLiter = concentrateStrength > 0 ? 1000 / concentrateStrength : 0;
      const dosePerBatch = dosePerLiter * L;
      line('');
      divider();
      line('SINGLE STOCK CONCENTRATE');
      divider();
      line(`  Strength : ×${concentrateStrength}`);
      line(`  Volume   : ${concentrateMl} mL`);
      line('');
      line('  Weigh into stock:');
      const concSaltLines = SALTS.map((salt, i) => {
        const row = rows[i];
        const form = salt.hydrationForms[row.formIdx];
        const target = num(row.target);
        if (target === 0) return null;
        const mg = concentrateStrength > 0 && stockL > 0
          ? computeSaltMg(target, stockL, form.molarMass, salt.anhydrousMass) * concentrateStrength
          : 0;
        const massLabel = mg >= 1000 ? `${(mg / 1000).toFixed(3)} g ` : `${mg.toFixed(2)} mg`;
        const saltLabel = `${salt.name}${salt.hydrationForms.length > 1 ? ` (${form.label})` : ''}`;
        return `    ${saltLabel.padEnd(30)} ${massLabel.padStart(10)}`;
      }).filter(Boolean);
      if (concSaltLines.length === 0) {
        line('    (no salts entered)');
      } else {
        concSaltLines.forEach(l => line(l!));
      }
      if (concentrateStrength > 0 && stockL > 0) {
        line('');
        line('  Dosing:');
        line(`    ${dosePerLiter.toFixed(1)} mL of stock per liter of brew water`);
        if (L > 0) line(`    ${dosePerBatch.toFixed(1)} mL per batch  (${liters} L)`);
      }
    } else if (concentrateOn && splitMode && stockGroups.length > 0) {
      // Split stocks — one section per group
      line('');
      divider();
      line('SPLIT STOCKS');
      divider();
      for (const group of stockGroups) {
        const strength = splitStrengths[group.id] ?? 100;
        const volumeMl = splitMls[group.id] ?? '500';
        const stockL = num(volumeMl) / 1000;
        const dosePerLiter = strength > 0 ? 1000 / strength : 0;
        const dosePerBatch = dosePerLiter * L;
        line('');
        line(`  ── ${group.name} ${'─'.repeat(Math.max(0, 38 - group.name.length))}`);
        line(`  Strength : ×${strength}  |  Volume: ${volumeMl} mL`);
        line('');
        line('  Weigh into stock:');
        for (const saltId of group.saltIds) {
          const salt = SALTS.find(s => s.id === saltId);
          if (!salt) continue;
          const saltIdx = SALTS.indexOf(salt);
          const row = rows[saltIdx];
          const form = salt.hydrationForms[row.formIdx];
          const target = concSaltTargets[saltId] ?? 0;
          if (target === 0) continue;
          const mg = strength > 0 && stockL > 0
            ? computeSaltMg(target, stockL, form.molarMass, salt.anhydrousMass) * strength
            : 0;
          const massLabel = mg >= 1000 ? `${(mg / 1000).toFixed(3)} g ` : `${mg.toFixed(2)} mg`;
          const saltLabel = `${salt.name}${salt.hydrationForms.length > 1 ? ` (${form.label})` : ''}`;
          line(`    ${saltLabel.padEnd(30)} ${massLabel.padStart(10)}`);
        }
        if (strength > 0 && stockL > 0) {
          line('');
          line('  Dosing:');
          line(`    ${dosePerLiter.toFixed(1)} mL of stock per liter of brew water`);
          if (L > 0) line(`    ${dosePerBatch.toFixed(1)} mL per batch  (${liters} L)`);
        }
      }
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

    if (mineralWaters.length > 0 && totalMineralMl > 0) {
      line('');
      divider();
      line('MINERAL WATER ADDITION');
      divider();
      line(`  Total volume: ${totalMineralMl} mL of ${L * 1000} mL batch`);
      for (const entry of mineralWaters) {
        const vol = num(entry.volumeMl);
        if (vol > 0) {
          const name = entry.name || 'Unnamed';
          line(`  ${name}: ${fmt(vol)} mL`);
        }
      }
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
            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className={`flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 transition-all duration-300 shadow-lg ${
                  exportCopied
                    ? 'text-emerald-900 bg-emerald-300 border border-emerald-400 scale-105'
                    : 'text-amber-900 bg-gradient-to-r from-amber-300 to-orange-300 hover:from-amber-200 hover:to-orange-200 border border-amber-400/60 hover:shadow-amber-400/30 hover:shadow-xl hover:scale-105 active:scale-95'
                }`}
                title="Export recipe card (downloads .txt and copies to clipboard)"
              >
                {exportCopied ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                <span>{exportCopied ? 'Saved!' : 'Export Recipe'}</span>
              </button>
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
              {concentrateOn && (() => {
                const pill = splitMode ? splitFeasibility : concFeasibility;
                return (
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    pill.level === 'green'
                      ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                      : pill.level === 'amber'
                      ? 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                      : 'text-rose-300 border-rose-500/40 bg-rose-500/10'
                  }`}>
                    {pill.label}
                  </span>
                );
              })()}
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
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-300 bg-slate-700/40 hover:bg-rose-500/20 rounded-lg px-2.5 py-1.5 transition"
                title="Reset all inputs to defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
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

            {concentrateOn && !splitMode && (
              <div className="space-y-3 border border-sky-500/30 bg-sky-500/5 rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-300">Stock strength:</label>
                    <select
                      value={STRENGTH_OPTIONS.includes(concentrateStrength) ? concentrateStrength : 0}
                      onChange={e => {
                        const v = Number(e.target.value);
                        setConcentrateStrength(v === 0 ? concentrateStrength : v);
                      }}
                      className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                    >
                      {STRENGTH_OPTIONS.map(v => <option key={v} value={v}>×{v}</option>)}
                      <option value={0}>Custom</option>
                    </select>
                    {!STRENGTH_OPTIONS.includes(concentrateStrength) && (
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

                {/* Warnings — ERROR and WARNING level get bold banners */}
                {concWarnings.length > 0 && (
                  <div className="space-y-2">
                    {/* Count badge */}
                    {(() => {
                      const errCount = concWarnings.filter(w => w.severity === 'error').length;
                      const warnCount = concWarnings.filter(w => w.severity === 'warning').length;
                      if (errCount === 0 && warnCount === 0) return null;
                      const label = errCount > 0
                        ? `${errCount} precipitation risk${errCount > 1 ? 's' : ''} — do not mix this concentrate as-is`
                        : `${warnCount} concern${warnCount > 1 ? 's' : ''} to review`;
                      return (
                        <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold border ${
                          errCount > 0
                            ? 'text-rose-100 bg-rose-600/25 border-rose-500/60 shadow-[0_0_12px_-2px_rgba(244,63,94,0.3)]'
                            : 'text-amber-100 bg-amber-600/20 border-amber-500/50'
                        }`}>
                          <AlertTriangle className={`w-5 h-5 shrink-0 ${
                            errCount > 0 ? 'text-rose-300' : 'text-amber-300'
                          }`} />
                          <span>{label}</span>
                        </div>
                      );
                    })()}
                    {concWarnings.map((w, wi) => (
                      <div
                        key={wi}
                        className={`flex items-start gap-3 rounded-lg ${
                          w.severity === 'error'
                            ? 'bg-rose-950/60 border border-rose-600/50 text-rose-200 px-4 py-3 shadow-[0_0_10px_-1px_rgba(244,63,94,0.15)]'
                            : w.severity === 'warning'
                            ? 'bg-amber-950/40 border border-amber-600/40 text-amber-200 px-3.5 py-2.5'
                            : 'bg-slate-800/60 border border-slate-600/40 text-slate-300 px-3.5 py-2.5'
                        }`}
                      >
                        <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                          w.severity === 'error' ? 'text-rose-400' : w.severity === 'warning' ? 'text-amber-400' : 'text-slate-400'
                        }`} />
                        <div className="space-y-0.5">
                          <span className="text-xs">{w.message}</span>
                          {w.severity === 'error' && w.maxSafeStrength && (
                            <div className="text-[11px] text-rose-300/70 mt-1 font-medium">
                              Try ×{w.maxSafeStrength} or lower, or keep the conflicting salts in separate stocks.
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Split into stocks button */}
                {concFeasibility.level !== 'green' && (
                  <button
                    onClick={() => setSplitMode(true)}
                    className="flex items-center gap-2 text-xs font-medium text-sky-300 hover:text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/50 rounded-lg px-3 py-2 transition w-full justify-center"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Split into stocks
                  </button>
                )}
              </div>
            )}

            {/* ── Split stocks panels ── */}
            {concentrateOn && splitMode && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Split stocks mode
                  </span>
                  <button
                    onClick={() => setSplitMode(false)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition"
                  >
                    <X className="w-3.5 h-3.5" /> Exit split
                  </button>
                </div>
                {stockGroups.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Add salts to the recipe to see stocks.</p>
                ) : (
                  stockGroups.map(group => (
                    <SplitStockCard
                      key={group.id}
                      group={group}
                      saltTargets={concSaltTargets}
                      rows={rows}
                      strength={splitStrengths[group.id] ?? 100}
                      volumeMl={splitMls[group.id] ?? '500'}
                      batchL={L}
                      warnings={splitGroupWarnings[group.id] ?? []}
                      onStrengthChange={v => setSplitStrengths(prev => ({ ...prev, [group.id]: v }))}
                      onVolumeChange={v => setSplitMls(prev => ({ ...prev, [group.id]: v }))}
                    />
                  ))
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

        {/* Mineral Water Base */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader
            icon={<FlaskConical className="w-4 h-4" />}
            title="Mineral Water Base"
            after={<div className="flex items-center gap-2">
              <LabelScanner onExtracted={vals => {
              // Silently use existing local water if ionic profile matches
              const match = localWaters.find(w => {
                for (const [k, raw] of Object.entries(vals)) {
                  const v = parseFloat(raw ?? '0');
                  if (!Number.isFinite(v) || v <= 0) continue;
                  const existing = w.ions[k] ?? 0;
                  const tolerance = Math.max(v * 0.10, 2);
                  if (Math.abs(existing - v) > tolerance) return false;
                }
                return true;
              });
              if (match) {
                const existing: Partial<Record<IonId, string>> = {};
                for (const [k, v] of Object.entries(match.ions)) {
                  if (v > 0) existing[k as IonId] = String(v);
                }
                addMineralWater({ name: match.name || undefined, ions: existing });
              } else {
                addMineralWater({ ions: vals });
                const name = window.prompt("Name this water (so you can find it later):");
                if (name && name.trim()) {
                  saveWaters([...localWaters, { id: newLocalWaterId(), name: name.trim(), ions: vals as Record<string, number> }]);
                  const share = window.confirm("Also share this profile with the community?");
                  if (share) {
                    fetch(`${API_BASE}/api/waters`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: name.trim(), ions: vals, shared: 'yes' }),
                    }).catch(() => {});
                  }
                }
              }
            }} />
              <span className={`text-[11px] font-medium rounded-lg px-2.5 py-1.5 border ${
                mineralWaterMode === 'base'
                  ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                  : 'text-sky-300 bg-sky-500/10 border-sky-500/30'
              }`}>
                Mode: {mineralWaterMode === 'base' ? 'Base' : 'Addition'}
                {' '}
                <button
                  onClick={() => setMineralWaterMode(prev => prev === 'addition' ? 'base' : 'addition')}
                  className={`underline transition-colors ${
                    mineralWaterMode === 'base'
                      ? 'text-emerald-300/70 hover:text-emerald-200'
                      : 'text-sky-300/70 hover:text-sky-200'
                  }`}
                >
                  (swap)
                </button>
              </span>
            </div>}
          />
          <div className="px-6 py-4 space-y-4">
            {/* My waters picker (local) */}
            <div>
              <details className="group" open>
                <summary className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 cursor-pointer hover:text-slate-200 transition select-none">
                  <Droplet className="w-3.5 h-3.5" />
                  My waters ({localWaters.length})
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); openCommunityModal(); }}
                    className="ml-1 flex items-center gap-0.5 text-[11px] text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg px-2 py-0.5 transition shrink-0"
                    title="Browse community waters"
                  >
                    <Plus className="w-3 h-3" />
                    Community
                  </button>
                  <span className="text-slate-600 group-open:rotate-90 transition-transform ml-auto">▶</span>
                </summary>
                {localWaters.length === 0 ? (
                  <div className="mt-2 text-xs text-slate-500 italic">No saved waters yet. Scan a label or browse the community.</div>
                ) : (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {localWaters.map(w => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between gap-2 bg-slate-900/40 border border-slate-700/50 rounded-lg px-3 py-2 hover:bg-sky-500/10 hover:border-sky-500/40 transition cursor-pointer group/water"
                        onClick={() => {
                          const vals: Partial<Record<IonId, string>> = {};
                          for (const [k, v] of Object.entries(w.ions)) {
                            if (v > 0) vals[k as IonId] = String(v);
                          }
                          addMineralWater({ name: w.name || undefined, ions: vals });
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-slate-200 group-hover/water:text-sky-200 transition truncate block">
                            {w.name || 'Unnamed'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-600">{Object.keys(w.ions).length} ions</span>
                          <button
                            onClick={e => { e.stopPropagation(); saveWaters(localWaters.filter(x => x.id !== w.id)); }}
                            className="text-slate-600 hover:text-rose-300 transition p-0.5"
                            title="Remove from my waters"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </details>
            </div>

            {mineralWaters.length === 0 && (
              <p className="text-xs text-slate-500 italic flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                No mineral waters added yet. Scan a label, pick a saved one, or add manually.
              </p>
            )}

            {/* Entry list */}
            {mineralWaters.map(entry => (
              <div key={entry.id} className="border border-slate-700/50 rounded-xl bg-slate-900/30 p-4 space-y-3">
                {/* Entry header: name + volume + remove */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="text"
                      value={entry.name}
                      onChange={e => updateMineralWater(entry.id, { name: e.target.value })}
                      placeholder="Water name (e.g. Solán de Cabras)"
                      className="flex-1 min-w-0 bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={entry.volumeMl}
                        onChange={e => updateMineralWater(entry.id, { volumeMl: e.target.value })}
                        placeholder="0"
                        className="w-20 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                      />
                      <span className="text-xs text-slate-400 shrink-0">mL</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMineralWater(entry.id)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-rose-300 bg-slate-700/40 hover:bg-rose-500/20 rounded-lg px-2 py-1.5 transition shrink-0"
                    title="Remove this water source"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Volume slider */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={2000}
                    step={1}
                    value={Math.min(parseFloat(entry.volumeMl || '0') || 0, 2000)}
                    onChange={e => updateMineralWater(entry.id, { volumeMl: e.target.value })}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer
                      bg-slate-700/60 accent-sky-400
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400
                      [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:shadow-sky-500/40
                      [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing
                      [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-sky-400 [&::-moz-range-thumb]:border-0"
                  />
                  <span className="text-xs tabular-nums text-slate-400 w-10 text-right shrink-0">
                    {fmt(Math.min(parseFloat(entry.volumeMl || '0') || 0, 2000))} mL
                  </span>
                  {batchMl > 0 && (() => {
                    // Calculate optimal volume to hit the nearest ion target
                    const vols: { ion: string; ml: number }[] = [];
                    for (const id of ACTIVE_ION_IDS) {
                      const conc = parseFloat(entry.ions[id] ?? '0');
                      if (conc <= 0) continue;
                      const needed = saltOnlyIons[id] ?? 0;
                      if (needed <= 0) continue;
                      const ml = (needed * batchMl) / conc;
                      if (ml > 0 && ml <= 2000) vols.push({ ion: ION_MAP[id].formula, ml });
                    }
                    if (vols.length === 0) return null;
                    const best = vols.reduce((a, b) => a.ml < b.ml ? a : b);
                    return (
                      <button
                        onClick={() => updateMineralWater(entry.id, { volumeMl: String(Math.round(best.ml)) })}
                        className="text-[10px] font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg px-2 py-1 transition shrink-0"
                        title={`Fill to ${Math.round(best.ml)} mL — hits ${best.ion} target exactly`}
                      >
                        Auto-fill ({Math.round(best.ml)} mL)
                      </button>
                    );
                  })()}
                </div>
                {/* Ion inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {ACTIVE_ION_IDS.map(id => (
                    <div key={id}>
                      <label className="block text-[10px] text-slate-500 mb-0.5">{ION_MAP[id].formula}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        value={entry.ions[id] ?? ''}
                        onChange={e => updateMineralWater(entry.id, {
                          ions: { ...entry.ions, [id]: e.target.value }
                        })}
                        placeholder="0"
                        className="w-full bg-slate-900/60 border border-slate-600/60 rounded-lg px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
                      />
                    </div>
                  ))}
                </div>
                {/* Save + Share buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      const hasName = entry.name.trim().length > 0;
                      const hasIons = Object.values(entry.ions).some(v => parseFloat(v || '0') > 0);
                      if (!hasName || !hasIons) return;
                      const alreadySaved = localWaters.some(l =>
                        l.name === entry.name.trim() &&
                        Object.entries(entry.ions).every(([k, v]) => Math.abs((l.ions[k] ?? 0) - parseFloat(v || '0')) < 0.5)
                      );
                      if (alreadySaved) return;
                      saveWaters([...localWaters, {
                        id: newLocalWaterId(),
                        name: entry.name.trim(),
                        ions: Object.fromEntries(
                          Object.entries(entry.ions)
                            .filter(([, v]) => parseFloat(v || '0') > 0)
                            .map(([k, v]) => [k, parseFloat(v || '0')])
                        ) as Record<string, number>,
                      }]);
                    }}
                    className={`text-xs font-medium rounded-lg px-3 py-1.5 transition shrink-0 ${
                      (!entry.name.trim() || !Object.values(entry.ions).some(v => parseFloat(v || '0') > 0))
                        ? 'text-slate-600 bg-slate-700/20 cursor-not-allowed'
                        : localWaters.some(l =>
                            l.name === entry.name.trim() &&
                            Object.entries(entry.ions).every(([k, v]) => Math.abs((l.ions[k] ?? 0) - parseFloat(v || '0')) < 0.5)
                          )
                        ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 cursor-default'
                        : 'text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30'
                    }`}
                  >
                    {localWaters.some(l =>
                      l.name === entry.name.trim() &&
                      Object.entries(entry.ions).every(([k, v]) => Math.abs((l.ions[k] ?? 0) - parseFloat(v || '0')) < 0.5)
                    ) && entry.name.trim() ? (
                      <><Check className="w-3 h-3 inline mr-1" />Saved</>
                    ) : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      const hasName = entry.name.trim().length > 0;
                      const hasIons = Object.values(entry.ions).some(v => parseFloat(v || '0') > 0);
                      if (!hasName || !hasIons) return;
                      if (window.confirm(`Share "${entry.name.trim()}" with the community? Other users will be able to find and use this water profile.`)) {
                        const vals: Record<string, number> = Object.fromEntries(
                          Object.entries(entry.ions)
                            .filter(([, v]) => parseFloat(v || '0') > 0)
                            .map(([k, v]) => [k, parseFloat(v || '0')])
                        );
                        fetch(`${API_BASE}/api/waters`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: entry.name.trim(), ions: vals, shared: 'yes' }),
                        }).catch(() => {});
                      }
                    }}
                    className={`text-xs font-medium rounded-lg px-3 py-1.5 transition shrink-0 ${
                      (!entry.name.trim() || !Object.values(entry.ions).some(v => parseFloat(v || '0') > 0))
                        ? 'text-slate-600 bg-slate-700/20 cursor-not-allowed'
                        : 'text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30'
                    }`}
                  >
                    <Share2 className="w-3 h-3 inline mr-1" />Share
                  </button>
                </div>
              </div>
            ))}

          {/* Add button */}
            <button
              onClick={() => addMineralWater()}
              className="flex items-center justify-center gap-2 text-sm text-sky-300 hover:text-sky-100 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 hover:border-sky-400/50 rounded-xl px-4 py-3 transition w-full"
            >
              <Droplet className="w-4 h-4" />
              Add water source
            </button>

            {/* Coverage bars — how the salt recipe hits the target */}
            {batchMl > 0 && (
              <div className="border-t border-slate-700/40 pt-4 space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Mineral water coverage of {activeRecipe?.name ?? 'Custom'}</span>
                {ACTIVE_ION_IDS.map(id => {
                  const ion = ION_MAP[id];
                  const target = saltOnlyIons[id] ?? 0;
                  const covered = bottledIons[id] ?? 0;
                  const pct = target > 0 ? Math.min((covered / target) * 100, 100) : 0;
                  const overshoot = target > 0 && covered > target;
                  const level: 'none' | 'partial' | 'full' | 'overshoot' =
                    overshoot ? 'overshoot' :
                    target > 0 && covered >= target ? 'full' :
                    covered > 0 ? 'partial' : 'none';
                  const barColor = level === 'overshoot' ? 'bg-rose-500' : level === 'full' ? 'bg-emerald-500' : level === 'partial' ? 'bg-amber-500' : 'bg-slate-600';
                  const textColor = level === 'overshoot' ? 'text-rose-300' : level === 'full' ? 'text-emerald-300' : level === 'partial' ? 'text-amber-300' : 'text-slate-500';
                  const label = level === 'overshoot'
                    ? `⚠ Mineral water overshoots by ${(covered - target).toFixed(1)} ppm`
                    : level === 'full'
                    ? `${covered.toFixed(1)} ppm — salt target of ${target.toFixed(1)} reached`
                    : level === 'partial'
                    ? `${covered.toFixed(1)} ppm of ${target.toFixed(1)} target covered from mineral water`
                    : target > 0
                    ? `Needs ${target.toFixed(1)} ppm from salts — none from mineral water`
                    : 'No salt target set';
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span className="w-20 text-xs text-slate-400 shrink-0">{ion.name}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`text-xs font-medium tabular-nums ${textColor} w-12 text-right shrink-0`}>
                            {covered.toFixed(1)}
                          </span>
                          <span className="text-xs text-slate-500 shrink-0">/ {target.toFixed(1)} ppm</span>
                        </div>
                        <div className={`text-[11px] mt-0.5 ${textColor}`}>
                          {label}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {mineralWaters.length > 0 && batchMl <= 0 && (
              <div className="border-t border-slate-700/40 pt-4">
                <p className="text-xs text-slate-500 italic">Set a batch volume above to see coverage.</p>
              </div>
            )}

            {/* Remaining gaps — what the salt recipe still needs */}
            {batchMl > 0 && (
              <div className="border-t border-slate-700/40 pt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Still needed from salts</span>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ACTIVE_ION_IDS.map(id => {
                    const target = saltOnlyIons[id] ?? 0;
                    const covered = bottledIons[id] ?? 0;
                    const remaining = Math.max(target - covered, 0);
                    const overshot = covered > target + 0.01;
                    if (target <= 0) return null;
                    return (
                      <div key={id} className="bg-slate-900/40 border border-slate-700/50 rounded-lg px-3 py-2">
                        <span className="block text-[10px] text-slate-500">{ION_MAP[id].formula}</span>
                        {overshot ? (
                          <span className="text-sm font-semibold tabular-nums text-rose-300">
                            +{(covered - target).toFixed(1)} ppm overshoot
                          </span>
                        ) : remaining > 0 ? (
                          <span className="text-sm font-semibold tabular-nums text-amber-300">
                            {remaining.toFixed(1)} ppm
                          </span>
                        ) : (
                          <span className="text-sm font-semibold tabular-nums text-emerald-300">✓ Covered</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Salt powder amounts — safe salts only, sorted by GH/KH neutrality */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Suggested salts</span>
                  <span className="text-[10px] font-medium rounded-lg px-2.5 py-1.5 border text-violet-300 bg-violet-500/10 border-violet-500/30">
                    Salts: {sulfateFirst ? 'Sulfates preferred' : 'Chlorides preferred'}
                    {' '}
                    <button
                      onClick={() => setSulfateFirst(p => !p)}
                      className="text-violet-300/70 hover:text-violet-200 underline transition-colors"
                    >
                      (swap)
                    </button>
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(() => {
                    // Gather salts that are safe to add at full target
                    const safe: { salt: typeof SALTS[0]; target: number; form: { molarMass: number }; mg: number; ghkhLabel: string; isChloride: boolean; isSulfate: boolean }[] = [];
                    for (let i = 0; i < SALTS.length; i++) {
                      const tgt = num(rows[i].target);
                      if (tgt <= 0) continue;
                      const salt = SALTS[i];
                      const form = salt.hydrationForms[rows[i].formIdx];
                      // Check if adding at full target would overshoot any ion
                      let overshoots = false;
                      for (const c of salt.ions) {
                        const total = saltOnlyIons[c.ionId] ?? 0;
                        const covered = bottledIons[c.ionId] ?? 0;
                        if (total > 0 && covered >= total * (1 - 1e-9)) {
                          overshoots = true;
                          break;
                        }
                      }
                      if (overshoots) continue;
                      const caMgIds: IonId[] = ['calcium', 'magnesium'];
                      const affectsGH = salt.ions.some(c => (caMgIds as string[]).includes(c.ionId));
                      const affectsKH = salt.ions.some(c => c.ionId === 'bicarbonate');
                      const ghkhLabel = !affectsGH && !affectsKH ? 'Neutral' : affectsGH && affectsKH ? 'GH + KH' : affectsGH ? 'GH' : 'KH';
                      const isChloride = salt.id === 'mgcl2' || salt.id === 'cacl2' || salt.id === 'nacl';
                      const isSulfate = salt.id === 'mgso4';
                      safe.push({
                        salt, target: tgt, form,
                        mg: computeSaltMg(tgt, L, form.molarMass, salt.anhydrousMass),
                        ghkhLabel, isChloride, isSulfate,
                      });
                    }
                    // Sort: neutral first, then chlorides or sulfates depending on toggle
                    safe.sort((a, b) => {
                      const aNeutral = a.ghkhLabel === 'Neutral' ? 0 : 1;
                      const bNeutral = b.ghkhLabel === 'Neutral' ? 0 : 1;
                      if (aNeutral !== bNeutral) return aNeutral - bNeutral;
                      if (sulfateFirst) {
                        if (a.isSulfate && !b.isSulfate) return -1;
                        if (!a.isSulfate && b.isSulfate) return 1;
                        if (a.isChloride && !b.isChloride) return 1;
                        if (!a.isChloride && b.isChloride) return -1;
                      } else {
                        if (a.isChloride && !b.isChloride) return -1;
                        if (!a.isChloride && b.isChloride) return 1;
                        if (a.isSulfate && !b.isSulfate) return 1;
                        if (!a.isSulfate && b.isSulfate) return -1;
                      }
                      return 0;
                    });
                    return safe.map(item => (
                      <div key={item.salt.id} className="bg-slate-900/40 border border-slate-700/50 rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">{item.salt.formula}</span>
                          <span className={`text-[10px] font-medium ${item.ghkhLabel === 'Neutral' ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {item.ghkhLabel}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-sky-300">
                          {item.mg.toFixed(1)} mg
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mineral Water Addition (volume summary) */}
        <div className="bg-slate-800/70 backdrop-blur rounded-2xl shadow-xl border border-slate-700/60 overflow-hidden">
          <SectionHeader
            icon={<Droplet className="w-4 h-4" />}
            title="Mineral Water Addition"
          />
          <div className="px-6 py-4">
            <div className="flex flex-wrap items-center gap-4">
              {batchMl > 0 && (
                <div className="text-xs text-slate-400 bg-slate-900/50 rounded-lg px-3 py-1.5 border border-slate-700/40">
                  {totalMineralMl > 0 ? fmt(totalMineralMl) : '0'} mL mineral
                  <span className="text-slate-500 mx-1.5">+</span>
                  {fmt(tdsMl)} mL 0 TDS
                  <span className="text-slate-500 mx-1.5">=</span>
                  {fmt(batchMl)} mL final
                </div>
              )}
            </div>
            {overfill && (
              <div className="flex items-center gap-2 mt-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Total mineral water volume exceeds the batch volume. The excess is ignored — the whole batch will be mineral water with no 0 TDS added.
              </div>
            )}
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

      {/* Reset confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-slate-800 border border-slate-600/60 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-100">Reset everything?</h3>
            <p className="text-sm text-slate-400">
              This will clear all salt targets, mineral water values, and volume back to defaults. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-sm text-slate-400 hover:text-slate-200 bg-slate-700/40 hover:bg-slate-700/60 rounded-lg px-4 py-2 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="text-sm font-medium text-white bg-rose-600 hover:bg-rose-500 rounded-lg px-4 py-2 transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* ── Community waters modal ── */}
      {communityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setCommunityModalOpen(false)}>
          <div className="w-full max-w-2xl max-h-[80vh] bg-slate-800 rounded-2xl border border-slate-700/60 shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40 shrink-0">
              <h2 className="text-sm font-semibold text-slate-200">Community waters</h2>
              <button onClick={() => setCommunityModalOpen(false)} className="text-slate-500 hover:text-slate-200 transition p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {communityLoading ? (
                <p className="text-xs text-slate-500 italic text-center py-8">Loading community waters…</p>
              ) : communityWaters.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-8">No community waters found yet.</p>
              ) : (
                communityWaters
                  .filter(w => w.shared === 'yes')
                  .map(w => {
                    const alreadyAdded = localWaters.some(l => l.sourceId === w.id);
                    return (
                      <div key={w.id} className="flex items-center justify-between gap-3 bg-slate-900/40 border border-slate-700/50 rounded-lg px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-slate-200 block truncate">{w.name || `Water #${w.id}`}</span>
                          <span className="text-[10px] text-slate-500">{Object.keys(w.ions).length} ions</span>
                        </div>
                        <button
                          onClick={() => {
                            if (alreadyAdded) return;
                            const nw: LocalWater = {
                              id: newLocalWaterId(),
                              name: w.name || `Water #${w.id}`,
                              ions: w.ions,
                              sourceId: w.id,
                            };
                            saveWaters([...localWaters, nw]);
                            const vals: Partial<Record<IonId, string>> = {};
                            for (const [k, v] of Object.entries(w.ions)) {
                              if (v > 0) vals[k as IonId] = String(v);
                            }
                            addMineralWater({ name: w.name || undefined, ions: vals });
                          }}
                          disabled={alreadyAdded}
                          className={`text-xs font-medium rounded-lg px-3 py-1.5 transition shrink-0 ${
                            alreadyAdded
                              ? 'text-slate-500 bg-slate-700/30 cursor-default'
                              : 'text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30'
                          }`}
                        >
                          {alreadyAdded ? 'Added' : 'Add to my waters'}
                        </button>
                      </div>
                    );
                  })
              )}
              {!communityLoading && communityWaters.filter(w => w.shared === 'yes').length === 0 && communityWaters.length > 0 && (
                <p className="text-xs text-slate-500 italic text-center py-4">No publicly shared waters available.</p>
              )}
            </div>
          </div>
        </div>
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

const STRENGTH_OPTIONS = [10, 25, 50, 100, 150, 200, 500];

const STOCK_COLOR_CLASSES = {
  sky:    { border: 'border-sky-500/30',    bg: 'bg-sky-500/5',    heading: 'text-sky-300',    doseBg: 'bg-sky-500/10 border-sky-500/20',    doseText: 'text-sky-200' },
  violet: { border: 'border-violet-500/30', bg: 'bg-violet-500/5', heading: 'text-violet-300', doseBg: 'bg-violet-500/10 border-violet-500/20', doseText: 'text-violet-200' },
  amber:  { border: 'border-amber-500/30',  bg: 'bg-amber-500/5',  heading: 'text-amber-300',  doseBg: 'bg-amber-500/10 border-amber-500/20',  doseText: 'text-amber-200' },
};

function SplitStockCard({
  group, saltTargets, rows, strength, volumeMl, batchL, warnings,
  onStrengthChange, onVolumeChange,
}: {
  group: StockGroup;
  saltTargets: Record<string, number>;
  rows: SaltRow[];
  strength: number;
  volumeMl: string;
  batchL: number;
  warnings: ConcentrateWarning[];
  onStrengthChange: (v: number) => void;
  onVolumeChange: (v: string) => void;
}) {
  const cls = STOCK_COLOR_CLASSES[group.color];
  const stockL = num(volumeMl) / 1000;
  const dosePerLiter = strength > 0 ? 1000 / strength : 0;
  const dosePerBatch = dosePerLiter * batchL;

  return (
    <div className={`rounded-xl border ${cls.border} ${cls.bg} px-4 py-3 space-y-3`}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className={`w-3.5 h-3.5 ${cls.heading}`} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${cls.heading}`}>{group.name}</span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300">Strength:</label>
          <select
            value={STRENGTH_OPTIONS.includes(strength) ? strength : 0}
            onChange={e => {
              const v = Number(e.target.value);
              onStrengthChange(v === 0 ? strength : v);
            }}
            className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
          >
            {STRENGTH_OPTIONS.map(v => <option key={v} value={v}>×{v}</option>)}
            <option value={0}>Custom</option>
          </select>
          {!STRENGTH_OPTIONS.includes(strength) && (
            <input
              type="number"
              inputMode="numeric"
              min={2}
              value={strength || ''}
              onChange={e => onStrengthChange(Number(e.target.value) || 0)}
              placeholder="×"
              className="w-20 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300">Volume:</label>
          <input
            type="number"
            inputMode="decimal"
            value={volumeMl}
            onChange={e => onVolumeChange(e.target.value)}
            placeholder="500"
            className="w-24 bg-slate-900/60 border border-slate-600/60 rounded-lg px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 focus:border-sky-400 transition"
          />
          <span className="text-xs text-slate-400">mL</span>
        </div>
      </div>

      {/* Dosing info */}
      {strength > 0 && stockL > 0 && (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${cls.doseText} ${cls.doseBg} rounded-lg px-3 py-2 border`}>
          <span>Add <strong>{dosePerLiter.toFixed(1)} mL</strong> per liter of brew water</span>
          {batchL > 0 && <span>· <strong>{dosePerBatch.toFixed(1)} mL</strong> per batch</span>}
        </div>
      )}

      {/* Salt masses */}
      <div className="space-y-1">
        {group.saltIds.map(saltId => {
          const salt = SALTS.find(s => s.id === saltId)!;
          const saltIdx = SALTS.indexOf(salt);
          const row = rows[saltIdx];
          const form = salt.hydrationForms[row.formIdx];
          const target = saltTargets[saltId] ?? 0;
          const mg = strength > 0 && stockL > 0 && target > 0
            ? computeSaltMg(target, stockL, form.molarMass, salt.anhydrousMass) * strength
            : 0;
          const massLabel = mg >= 1000 ? `${(mg / 1000).toFixed(3)} g` : `${mg.toFixed(2)} mg`;
          const formLabel = salt.hydrationForms.length > 1 ? ` (${form.label})` : '';
          return (
            <div key={saltId} className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-slate-300">{salt.name}{formLabel}</span>
              <span className="text-xs font-mono text-emerald-300 shrink-0">{mg > 0 ? massLabel : '—'}</span>
            </div>
          );
        })}
      </div>

      {/* Warnings for this group */}
      {warnings.filter(w => w.severity !== 'info').length > 0 && (
        <div className="space-y-1.5">
          {warnings.filter(w => w.severity !== 'info').map((w, wi) => (
            <div
              key={wi}
              className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                w.severity === 'error'
                  ? 'text-rose-200 bg-rose-500/10 border border-rose-500/25'
                  : 'text-amber-200 bg-amber-500/10 border border-amber-500/25'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${w.severity === 'error' ? 'text-rose-400' : 'text-amber-400'}`} />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}
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

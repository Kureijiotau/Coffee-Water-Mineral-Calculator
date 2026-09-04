import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Database, Download, FlaskConical, Minus, Plus, RotateCcw, Save, Search, SlidersHorizontal, Trash2, Upload, Waves, X } from 'lucide-react';
import {
  ACTIVE_ION_IDS,
  ION_MAP,
  SALTS,
  computeSaltIonPpmTotal,
  computeSaltMg,
  computeSaltTargetPpm,
  type IonId,
} from '@/waterData';
import type { LocalWater, WaterMetadata } from '@/localWaters';
import {
  calculateWaterMix,
  createWaterMixRecipe,
  deleteWaterMixRecipe,
  dedupeWaterMixSourceSnapshots,
  loadImportedWaterMixSources,
  loadWaterMixRecipes,
  migrateWaterMixSourceSnapshot,
  saveImportedWaterMixSources,
  saveWaterMixRecipe,
  serializeWaterMixRecipeFile,
  type WaterMixRecipe,
  type WaterMixResult,
  type WaterMixSourceKind,
  type WaterMixSourceSnapshot,
} from './waterMixer';
import type { WaterMixerImportResult } from './waterMixerImport';
import { buildRecipeShareCardSvg, embedWaterRecipeJsonInPng, rasterizeRecipeShareCard } from './waterRecipeImage';
import { recipeFilenameSlug } from './recipes';

export type WaterMixerDatabaseWater = {
  id: string | number;
  name: string;
  ions: LocalWater['ions'];
  metadata?: WaterMetadata;
  provenance?: string;
  sourceId?: string | number;
};

export type WaterMixerSavedSource = WaterMixSourceSnapshot & {
  id?: string;
  provenance?: string;
};

export type WaterMixerProps = {
  /** Finished sources only. Target-only or salt-only recipes should be filtered by the parent. */
  savedSources?: WaterMixerSavedSource[];
  /** Optional parent-provided Mixer collection; local persistence remains the fallback. */
  savedMixerRecipes?: WaterMixRecipe[];
  localWaters?: WaterMixerDatabaseWater[];
  communityWaters?: WaterMixerDatabaseWater[];
  databaseLoading?: boolean;
  databaseError?: string | null;
  onLoadCommunityWaters?: () => void | Promise<unknown>;
  onSavedRecipe?: (recipe: WaterMixRecipe) => void;
  onImportRecipeFile?: (file: File) => Promise<WaterMixerImportResult>;
};

type CardState = {
  mode: WaterMixSourceKind;
  source: WaterMixSourceSnapshot | null;
  manualName: string;
  manualIons: Partial<Record<IonId, string>>;
  databaseQuery: string;
};

const emptyCard = (): CardState => ({
  mode: 'saved-recipe',
  source: null,
  manualName: '',
  manualIons: {},
  databaseQuery: '',
});

const blankSnapshot = (name: string, sourceKind: WaterMixSourceKind, ions: Partial<Record<IonId, number>> = {}): WaterMixSourceSnapshot => ({
  name,
  sourceKind,
  ions: Object.fromEntries(ACTIVE_ION_IDS.map(id => [id, ions[id] ?? 0])) as Record<IonId, number>,
});

const formatReading = (value: number): string => value < 10 ? value.toFixed(2) : value.toFixed(1);
const formatVolume = (value: number): string => Number.isInteger(value) ? String(value) : value.toFixed(1);
const formatSaltDose = (value: number): string => value < 10 ? value.toFixed(2) : value.toFixed(1);
const formatGhKhRatio = (gh: number, kh: number): string => {
  if (kh > 0 && Number.isFinite(gh / kh)) return `${(gh / kh).toFixed(2)}:1`;
  return gh > 0 ? '∞:1' : '—';
};

const MIXER_MEME_SALT_IDS = new Set(['calact', 'mggly']);

type MixerSaltStep = {
  name: string;
  formula: string;
  form: string;
  amount: string;
  contributionPpm: number;
};

function buildMixerSaltSteps(
  saltTargets: Record<string, number>,
  formIdxBySaltId: Record<string, number>,
  totalVolumeMl: number,
): MixerSaltStep[] {
  return SALTS.flatMap(salt => {
    const target = Number(saltTargets[salt.id] ?? 0);
    if (!Number.isFinite(target) || target <= 0 || totalVolumeMl <= 0) return [];
    const formIdx = Math.min(
      Math.max(0, formIdxBySaltId[salt.id] ?? salt.defaultFormIdx ?? 0),
      Math.max(0, salt.hydrationForms.length - 1),
    );
    const form = salt.hydrationForms[formIdx] ?? salt.hydrationForms[0];
    if (!form) return [];
    const amount = computeSaltMg(target, totalVolumeMl / 1000, form.molarMass, salt.anhydrousMass);
    return [{
      name: salt.name,
      formula: salt.formula,
      form: form.label,
      amount: `${formatSaltDose(amount)} mg`,
      contributionPpm: computeSaltIonPpmTotal(salt.id, target),
    }];
  });
}

function manualIsComplete(card: CardState): boolean {
  return ACTIVE_ION_IDS.every(id => {
    const raw = card.manualIons[id];
    return raw !== undefined && raw.trim() !== '' && Number.isFinite(Number(raw));
  });
}

function sourceLabel(kind: WaterMixSourceKind): string {
  if (kind === 'saved-recipe') return 'Saved recipe';
  if (kind === 'database') return 'Water database';
  return 'Enter readings';
}

function sourceProvenance(source: WaterMixSourceSnapshot | null): string {
  if (!source) return 'Awaiting a finished-water snapshot';
  if (source.sourceKind === 'saved-recipe') return 'Finished recipe snapshot';
  if (source.sourceKind === 'database') return source.sourceId ? `Database snapshot · ${source.sourceId}` : 'Database snapshot';
  return 'Manual final readings';
}

function toSnapshot(
  water: WaterMixerDatabaseWater,
  sourceKind: 'database' = 'database',
): WaterMixSourceSnapshot {
  return {
    name: water.name,
    sourceKind,
    sourceId: String(water.sourceId ?? water.id),
    ions: Object.fromEntries(ACTIVE_ION_IDS.map(id => [id, Number(water.ions[id] ?? 0)])) as Record<IonId, number>,
    ...(water.metadata ? { metadata: water.metadata } : {}),
  };
}

function IonReading({ id, value, compact = false, testId }: { id: IonId; value: number; compact?: boolean; testId?: string }) {
  const ion = ION_MAP[id];
  return (
    <div
      className={`flex items-baseline justify-between gap-2 border-b border-slate-700/45 py-2 last:border-b-0 ${compact ? 'text-[11px]' : 'text-xs'}`}
      data-testid={testId ?? `text-mixer-ion-${id}`}
    >
      <span className="flex min-w-0 items-center gap-2 text-slate-400">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ion.color.foreground }} />
        <span className="truncate">{ion.name}</span>
      </span>
      <span className="shrink-0 font-mono tabular-nums text-slate-200">{formatReading(value)} <small className="text-[9px] text-slate-500">mg/L</small></span>
    </div>
  );
}

function MixerLiveReadings({ result, sideRail = false }: { result: WaterMixResult; sideRail?: boolean }) {
  return (
    <section
      className="overflow-hidden rounded-xl border border-cyan-300/25 bg-slate-950/90 shadow-xl shadow-slate-950/30 backdrop-blur-xl"
      data-testid="panel-mixer-live-readings"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-300/10 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_9px_rgba(103,232,249,0.9)]" aria-hidden="true" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">Live final readings</h2>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">updates with salt edits · mg/L</span>
      </div>
      {result.valid ? (
        <div className={sideRail ? 'grid grid-cols-2 gap-x-2 px-2' : 'flex min-w-max divide-x divide-slate-800/80 overflow-x-auto'} data-testid="list-mixer-live-ions">
          {ACTIVE_ION_IDS.map(id => (
            <div key={id} className={sideRail ? 'min-w-0 border-b border-slate-800/80 px-2 py-2.5' : 'min-w-[6.4rem] px-3 py-2.5 first:pl-4 last:pr-4'}>
              <span className="block truncate text-[9px] uppercase tracking-wider text-slate-500">{ION_MAP[id].name}</span>
              <strong className="mt-1 block font-mono text-sm tabular-nums text-cyan-100" data-testid={`text-mixer-live-ion-${id}`}>
                {formatReading(result.finalIons[id])}
              </strong>
            </div>
          ))}
          <div className={sideRail ? 'min-w-0 border-b border-slate-800/80 px-2 py-2.5' : 'min-w-[6.4rem] px-3 py-2.5 last:pr-4'}>
            <span className="block truncate text-[9px] uppercase tracking-wider text-slate-500">Modeled TDS</span>
            <strong className="mt-1 block font-mono text-sm tabular-nums text-emerald-200" data-testid="text-mixer-live-tds">
              {formatReading(result.tds)}
            </strong>
          </div>
        </div>
      ) : (
        <p className="px-4 py-3 text-xs text-slate-500" data-testid="status-mixer-live-readings-incomplete">
          Choose two finished sources and enter a positive total volume to see live readings.
        </p>
      )}
    </section>
  );
}

function SourcePicker({
  side,
  card,
  savedSources,
  databaseWaters,
  databaseLoading,
  databaseError,
  onLoadCommunityWaters,
  onMode,
  onSelectSaved,
  onSelectDatabase,
  onSearch,
}: {
  side: 'a' | 'b';
  card: CardState;
  savedSources: WaterMixerSavedSource[];
  databaseWaters: WaterMixerDatabaseWater[];
  databaseLoading: boolean;
  databaseError?: string | null;
  onLoadCommunityWaters?: () => void | Promise<unknown>;
  onMode: (mode: WaterMixSourceKind) => void;
  onSelectSaved: (source: WaterMixSourceSnapshot) => void;
  onSelectDatabase: (water: WaterMixerDatabaseWater) => void;
  onSearch: (value: string) => void;
}) {
  const filteredDatabase = databaseWaters.filter(water => water.name.toLowerCase().includes(card.databaseQuery.toLowerCase()));
  return (
    <div className="mt-4 border-t border-slate-700/60 pt-4">
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500" htmlFor={`select-mixer-source-mode-${side}`}>
        Source mode
      </label>
      <div className="relative">
        <select
          id={`select-mixer-source-mode-${side}`}
          value={card.mode}
          onChange={event => onMode(event.target.value as WaterMixSourceKind)}
          data-testid={`select-mixer-source-mode-${side}`}
          className="app-control w-full appearance-none rounded-lg border border-slate-600/70 bg-slate-950/70 px-3 pr-9 text-sm text-slate-200"
          aria-label={`Water ${side.toUpperCase()} source mode`}
        >
          <option value="saved-recipe">Saved recipe</option>
          <option value="database">Water database</option>
          <option value="manual">Enter readings</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-500" />
      </div>

      {card.mode === 'saved-recipe' && (
        <div className="mt-3">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor={`select-mixer-saved-source-${side}`}>
            Finished sources
          </label>
          <select
            id={`select-mixer-saved-source-${side}`}
            value={card.source?.sourceKind === 'saved-recipe' ? card.source.sourceId ?? '' : ''}
            onChange={event => {
              const picked = savedSources.find(item => (item.id ?? item.sourceId ?? item.name) === event.target.value);
              if (picked) onSelectSaved(picked);
            }}
            data-testid={`select-mixer-saved-source-${side}`}
            className="app-control w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-200"
            aria-label={`Select finished source for Water ${side.toUpperCase()}`}
          >
            <option value="">Select a finished water</option>
            {savedSources.map((item, index) => (
              <option key={item.id ?? item.sourceId ?? `${item.name}-${index}`} value={item.id ?? item.sourceId ?? item.name}>
                {item.name}{item.provenance ? ` · ${item.provenance}` : ''}
              </option>
            ))}
          </select>
          {!savedSources.length && <p className="mt-2 text-xs text-slate-500" data-testid={`status-mixer-saved-empty-${side}`}>No finalized water recipes are available yet.</p>}
        </div>
      )}

      {card.mode === 'database' && (
        <div className="mt-3">
          <div className="flex gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search water database</span>
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                value={card.databaseQuery}
                onChange={event => onSearch(event.target.value)}
                data-testid={`input-mixer-database-search-${side}`}
                className="app-control w-full rounded-lg border border-slate-700 bg-slate-950/70 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-600"
                placeholder="Search catalog"
                aria-label={`Search water database for Water ${side.toUpperCase()}`}
              />
            </label>
            <button
              type="button"
              onClick={() => onLoadCommunityWaters?.()}
              disabled={databaseLoading}
              data-testid={`button-load-community-waters-${side}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 text-[10px] font-bold uppercase tracking-wider text-cyan-200 transition hover:border-cyan-300/60 disabled:cursor-wait disabled:opacity-60"
              aria-label="Load community waters"
            >
              <Waves className="h-3.5 w-3.5" /> {databaseLoading ? 'Loading' : 'Sync'}
            </button>
          </div>
          {databaseError && <p className="mt-2 text-xs text-amber-300" data-testid={`status-mixer-database-error-${side}`}>{databaseError}</p>}
          {databaseLoading && <div className="mt-3 h-16 animate-pulse rounded-lg bg-slate-800/60" data-testid={`status-mixer-database-loading-${side}`} />}
          {!databaseLoading && !filteredDatabase.length && (
            <p className="mt-3 rounded-lg border border-dashed border-slate-700 px-3 py-3 text-xs text-slate-500" data-testid={`status-mixer-database-empty-${side}`}>
              {databaseWaters.length ? 'No waters match this search.' : 'The database is empty. Load community waters or use a manual reading.'}
            </p>
          )}
          {!databaseLoading && filteredDatabase.length > 0 && (
            <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-700/70 bg-slate-950/45">
              {filteredDatabase.map(water => (
                <button
                  type="button"
                  key={water.id}
                  onClick={() => onSelectDatabase(water)}
                  data-testid={`button-select-database-water-${side}-${water.id}`}
                  className="flex w-full items-center justify-between gap-3 border-b border-slate-800 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-800/70"
                  aria-label={`Use ${water.name} for Water ${side.toUpperCase()}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-slate-200">{water.name}</span>
                    <span className="block truncate text-[10px] text-slate-500">{water.provenance ?? 'Local water snapshot'}</span>
                  </span>
                  <span className="font-mono text-[10px] text-cyan-300">Use</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourceCard({
  side,
  card,
  volume,
  savedSources,
  databaseWaters,
  databaseLoading,
  databaseError,
  onLoadCommunityWaters,
  onChange,
  onVolume,
  onClear,
}: {
  side: 'a' | 'b';
  card: CardState;
  volume: string;
  savedSources: WaterMixerSavedSource[];
  databaseWaters: WaterMixerDatabaseWater[];
  databaseLoading: boolean;
  databaseError?: string | null;
  onLoadCommunityWaters?: () => void | Promise<unknown>;
  onChange: (next: CardState) => void;
  onVolume: (value: string) => void;
  onClear: () => void;
}) {
  const source = card.source;
  const patch = (updates: Partial<CardState>) => onChange({ ...card, ...updates });
  const manualSource = card.mode === 'manual'
    ? blankSnapshot(card.manualName.trim() || `Water ${side.toUpperCase()}`, 'manual', Object.fromEntries(
      ACTIVE_ION_IDS.map(id => [id, Number(card.manualIons[id] ?? 0)]),
    ))
    : source;
  const displayedSource = card.mode === 'manual' ? (card.manualName || Object.values(card.manualIons).some(Boolean) ? manualSource : null) : source;
  const hasSource = Boolean(displayedSource);

  return (
    <section className="app-card relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 shadow-2xl shadow-slate-950/30" data-testid={`card-mixer-source-${side}`}>
      <div className={`absolute inset-x-0 top-0 h-px ${side === 'a' ? 'bg-cyan-300/80' : 'bg-violet-300/80'}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg border font-mono text-xs font-bold ${side === 'a' ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200' : 'border-violet-300/30 bg-violet-300/10 text-violet-200'}`}>
              {side.toUpperCase()}
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-wide text-slate-100">Water {side.toUpperCase()}</h3>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">{sourceLabel(card.mode)}</p>
            </div>
          </div>
        </div>
        <button type="button" onClick={onClear} data-testid={`button-clear-mixer-source-${side}`} className="rounded-md p-1.5 text-slate-500 hover:bg-rose-400/10 hover:text-rose-300" aria-label={`Clear Water ${side.toUpperCase()}`}>
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <SourcePicker
        side={side}
        card={card}
        savedSources={savedSources}
        databaseWaters={databaseWaters}
        databaseLoading={databaseLoading}
        databaseError={databaseError}
        onLoadCommunityWaters={onLoadCommunityWaters}
        onMode={mode => {
          patch({ mode, source: null });
          if (mode === 'database') void onLoadCommunityWaters?.();
        }}
        onSelectSaved={picked => patch({ source: picked })}
        onSelectDatabase={water => patch({ source: toSnapshot(water) })}
        onSearch={databaseQuery => patch({ databaseQuery })}
      />

      {card.mode === 'manual' && (
        <div className="mt-3 space-y-3">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Source label
            <input
              value={card.manualName}
              onChange={event => patch({ manualName: event.target.value })}
              data-testid={`input-mixer-manual-name-${side}`}
              className="app-control mt-1 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-sm font-normal normal-case tracking-normal text-slate-200 placeholder:text-slate-600"
              placeholder="Filtered water"
              aria-label={`Manual source label for Water ${side.toUpperCase()}`}
            />
          </label>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {ACTIVE_ION_IDS.map(id => (
              <label key={id} className="min-w-0 text-[10px] text-slate-500">
                <span className="flex items-center justify-between gap-1">
                  <span className="truncate">{ION_MAP[id].name}</span><span className="font-mono text-[9px] text-slate-600">mg/L</span>
                </span>
                <input
                  inputMode="decimal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={card.manualIons[id] ?? ''}
                  onChange={event => patch({ manualIons: { ...card.manualIons, [id]: event.target.value } })}
                  data-testid={`input-mixer-manual-ion-${side}-${id}`}
                  className="app-control mt-1 w-full rounded-md border border-slate-700 bg-slate-950/70 px-2 font-mono text-xs tabular-nums text-slate-200"
                  aria-label={`${ION_MAP[id].name} reading for Water ${side.toUpperCase()}`}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-slate-700/60 pt-4">
        <div className="flex items-end justify-between gap-3">
          <label className="block flex-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500" htmlFor={`input-mixer-volume-${side}`}>
            Volume
            <div className="mt-1 flex items-center gap-2">
              <input
                id={`input-mixer-volume-${side}`}
                type="number"
                min="0"
                step="1"
                value={volume}
                onChange={event => onVolume(event.target.value)}
                data-testid={`input-mixer-volume-${side}`}
                className="app-control w-full rounded-lg border border-slate-600/80 bg-slate-950 px-3 font-mono text-lg font-semibold tabular-nums text-slate-100"
                aria-label={`Water ${side.toUpperCase()} volume in milliliters`}
              />
              <span className="pb-2 font-mono text-xs text-slate-500">mL</span>
            </div>
          </label>
          <span className="pb-2 text-right font-mono text-[10px] text-slate-500" data-testid={`text-mixer-source-proportion-${side}`}>
            {hasSource ? sourceProvenance(displayedSource) : 'No snapshot'}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3" data-testid={`panel-mixer-source-preview-${side}`}>
        {displayedSource ? (
          <>
            <div className="flex items-center justify-between gap-2 py-2">
              <span className="truncate text-xs font-semibold text-slate-200" data-testid={`text-mixer-source-name-${side}`}>{displayedSource.name}</span>
              <span className="shrink-0 text-[10px] text-slate-500">{displayedSource.metadata?.tds !== undefined ? `reported TDS ${formatReading(displayedSource.metadata.tds)}` : 'ion snapshot'}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              {ACTIVE_ION_IDS.map(id => <IonReading key={id} id={id} value={displayedSource.ions[id] ?? 0} compact testId={`text-mixer-source-ion-${side}-${id}`} />)}
            </div>
            <p className="py-2 text-[10px] text-slate-600">All modeled ions are shown in this source snapshot.</p>
          </>
        ) : (
          <div className="flex items-center gap-2 py-4 text-xs text-slate-500" data-testid={`status-mixer-source-incomplete-${side}`}>
            <SlidersHorizontal className="h-4 w-4 text-slate-600" /> Choose a finished source or enter readings.
          </div>
        )}
      </div>
    </section>
  );
}

function MixerSaltTable({
  saltTargets,
  formIdxBySaltId,
  doseDrafts,
  totalVolumeMl,
  showMemeSalts,
  onToggleSalt,
  onFormChange,
  onDoseChange,
  onDoseBlur,
  onReset,
  onToggleMemeSalts,
}: {
  saltTargets: Record<string, number>;
  formIdxBySaltId: Record<string, number>;
  doseDrafts: Record<string, string>;
  totalVolumeMl: number;
  showMemeSalts: boolean;
  onToggleSalt: (saltId: string) => void;
  onFormChange: (saltId: string, formIdx: number) => void;
  onDoseChange: (saltId: string, value: string) => void;
  onDoseBlur: (saltId: string) => void;
  onReset: () => void;
  onToggleMemeSalts: () => void;
}) {
  const liters = totalVolumeMl / 1000;
  const visibleSalts = SALTS.filter(salt => showMemeSalts || !MIXER_MEME_SALT_IDS.has(salt.id));

  return (
    <section className="rounded-2xl border border-indigo-400/25 bg-slate-800/70 p-4 shadow-xl sm:p-6" data-testid="panel-mixer-salts">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">
            <FlaskConical className="h-4 w-4" aria-hidden="true" /> Final blend adjustment
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-100">Add salts to the final mixture</h2>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
            Fine-tune the blended water with manual final-batch doses. These salts are added after Water A and Water B are combined.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-slate-600/70 bg-slate-900/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition hover:border-indigo-300/50 hover:bg-indigo-500/15 hover:text-indigo-200"
          aria-label="Reset Mixer salt doses"
          data-testid="button-reset-mixer-salts"
        >
          Reset salts
        </button>
      </div>

      <div className="watermancer-salt-table mt-4 overflow-hidden rounded-xl border border-slate-700/60">
        <div className="watermancer-salt-table__header hidden bg-slate-950/50 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:grid">
          <span className="text-left">Salt</span>
          <span>Hydration form</span>
          <span className="text-center">Final dose</span>
          <span className="text-center">Use</span>
        </div>
        <div className="divide-y divide-slate-700/50">
          {visibleSalts.map(salt => {
            const formIdx = Math.min(
              Math.max(0, formIdxBySaltId[salt.id] ?? salt.defaultFormIdx ?? 0),
              Math.max(0, salt.hydrationForms.length - 1),
            );
            const form = salt.hydrationForms[formIdx] ?? salt.hydrationForms[0];
            const target = Math.max(0, Number(saltTargets[salt.id] ?? 0));
            const used = Object.prototype.hasOwnProperty.call(saltTargets, salt.id);
            const activeMg = liters > 0 && target > 0 && form
              ? computeSaltMg(target, liters, form.molarMass, salt.anhydrousMass)
              : 0;
            const doseValue = Object.prototype.hasOwnProperty.call(doseDrafts, salt.id)
              ? doseDrafts[salt.id]
              : (used ? formatSaltDose(activeMg) : '0');
            return (
              <div
                key={salt.id}
                className={`watermancer-salt-table__row bg-slate-900/25 ${used ? 'watermancer-salt-table__row--used' : ''}`}
                data-testid={`row-mixer-salt-${salt.id}`}
              >
                <div className="watermancer-salt-table__salt flex items-center gap-2 text-left sm:justify-start">
                  <span className={`h-2 w-2 shrink-0 rounded-full transition ${used ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]' : 'bg-slate-700'}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="watermancer-salt-table__salt-name text-xs font-semibold text-slate-100">{salt.name}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                      <span>{salt.formula}</span>
                      <span>·</span>
                      <span>{salt.ions.map(contribution => ION_MAP[contribution.ionId]?.name).filter(Boolean).join(' + ')}</span>
                    </div>
                  </div>
                </div>
                <label className="watermancer-salt-table__hydration flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:hidden">Hydration form</span>
                  <select
                    value={formIdx}
                    onChange={event => onFormChange(salt.id, Number(event.target.value))}
                    className="min-w-0 flex-1 cursor-pointer rounded-lg border border-cyan-300/20 bg-slate-950/70 px-2 py-1.5 text-[11px] font-medium text-slate-200 outline-none transition hover:border-cyan-300/45 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-400/20"
                    aria-label={`${salt.name} hydration form for Mixer`}
                    data-testid={`select-mixer-salt-form-${salt.id}`}
                  >
                    {salt.hydrationForms.map((hydration, index) => (
                      <option key={`${salt.id}-${index}`} value={index}>{hydration.label}</option>
                    ))}
                  </select>
                </label>
                <div className="watermancer-salt-table__dose">
                  <span className="watermancer-salt-table__dose-label text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:hidden">Final dose</span>
                  <div className="watermancer-salt-table__dose-controls">
                    <button
                      type="button"
                      onClick={() => onDoseChange(salt.id, String(Math.max(0, activeMg - 1)))}
                      disabled={!used || activeMg <= 0}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/60 text-slate-300 transition hover:border-cyan-300/50 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Decrease ${salt.name} Mixer dose by 1 mg`}
                      data-testid={`button-decrease-mixer-salt-${salt.id}`}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <div className="watermancer-salt-table__dose-value">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={doseValue}
                        onFocus={() => onDoseChange(salt.id, doseValue)}
                        onChange={event => onDoseChange(salt.id, event.target.value)}
                        onBlur={() => onDoseBlur(salt.id)}
                        onKeyDown={event => {
                          if (event.key === '-' || event.key === '+' || event.key === 'e' || event.key === 'E') event.preventDefault();
                        }}
                        disabled={!used}
                        placeholder="0"
                        className="min-w-0 w-16 rounded-lg border border-cyan-400/30 bg-slate-950/70 px-1.5 py-1.5 text-center text-xs font-semibold tabular-nums text-cyan-100 outline-none transition focus:border-cyan-300/80 focus:ring-2 focus:ring-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`${salt.name} final dose in milligrams`}
                        data-testid={`input-mixer-salt-dose-${salt.id}`}
                      />
                      <span className="watermancer-salt-table__dose-status text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                        {used ? 'Final blend' : ''}
                      </span>
                    </div>
                    <span className="watermancer-salt-table__dose-unit text-[10px] font-semibold uppercase tracking-wider text-slate-500">mg</span>
                    <button
                      type="button"
                      onClick={() => onDoseChange(salt.id, String(activeMg + 1))}
                      disabled={!used}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/35 bg-cyan-500/10 text-cyan-200 transition hover:border-cyan-200/60 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label={`Increase ${salt.name} Mixer dose by 1 mg`}
                      data-testid={`button-increase-mixer-salt-${salt.id}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="watermancer-salt-table__use">
                  <button
                    type="button"
                    onClick={() => onToggleSalt(salt.id)}
                    aria-pressed={used}
                    className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold shadow-sm transition active:scale-95 ${used ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25' : 'border-slate-700 bg-slate-950/40 text-slate-500 hover:border-indigo-300/50 hover:bg-indigo-500/10 hover:text-indigo-200'}`}
                    data-testid={`button-toggle-mixer-salt-${salt.id}`}
                  >
                    {used ? 'Use' : 'Not used'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] leading-relaxed text-slate-500">
          Dose is the physical salt mass for the current {formatVolume(totalVolumeMl)} mL final blend. Changing volume keeps the mineral target constant and updates the required mass.
        </p>
        <button
          type="button"
          onClick={onToggleMemeSalts}
          className="rounded-lg border border-fuchsia-300/25 bg-fuchsia-500/10 px-3 py-1.5 text-[10px] font-semibold text-fuchsia-200 transition hover:border-fuchsia-200/60 hover:bg-fuchsia-500/20"
          aria-pressed={showMemeSalts}
          data-testid="button-toggle-mixer-meme-salts"
        >
          {showMemeSalts ? 'Hide specialty salts' : 'Show specialty salts'}
        </button>
      </div>
    </section>
  );
}

function MixerRecipeCardModal({
  name,
  sourceA,
  sourceB,
  result,
  saltTargets,
  formIdxBySaltId,
  onClose,
}: {
  name: string;
  sourceA: WaterMixSourceSnapshot;
  sourceB: WaterMixSourceSnapshot;
  result: WaterMixResult;
  saltTargets: Record<string, number>;
  formIdxBySaltId: Record<string, number>;
  onClose: () => void;
}) {
  const recipeName = name.trim() || 'Mixer blend';
  const saltSteps = useMemo(
    () => buildMixerSaltSteps(saltTargets, formIdxBySaltId, result.totalVolumeMl),
    [formIdxBySaltId, result.totalVolumeMl, saltTargets],
  );
  const model = useMemo(() => buildRecipeShareCardSvg({
    recipeName,
    batchLabel: `${formatVolume(result.totalVolumeMl)} mL finished-water blend`,
    waterSteps: [
      { label: 'Water A', name: sourceA.name, amount: `${formatVolume(result.volumeAMl)} mL` },
      { label: 'Water B', name: sourceB.name, amount: `${formatVolume(result.volumeBMl)} mL` },
    ],
    saltTitle: saltSteps.length > 0 ? 'Add final-blend salts' : 'Combine the finished waters',
    saltIntro: saltSteps.length > 0
      ? 'After combining both waters, add these physical salt doses to tune the final mixture.'
      : 'Measure both finished waters by volume and combine them. The Mixer uses volume-weighted final-ion averages only.',
    saltSteps,
    finalStep: saltSteps.length > 0
      ? `Verify the final volume is ${formatVolume(result.totalVolumeMl)} mL, dissolve all salts completely, and proceed with your brew method.`
      : `Verify the final volume is ${formatVolume(result.totalVolumeMl)} mL, confirm the blend is clear, and proceed with your brew method.`,
    tdsTarget: 0,
    analysis: {
      ions: ACTIVE_ION_IDS.map(id => ({
        id,
        name: ION_MAP[id].name,
        formula: ION_MAP[id].formula,
        value: result.finalIons[id] ?? 0,
        category: ['calcium', 'magnesium', 'sodium', 'potassium'].includes(id)
          ? 'Cations' as const
          : ['bicarbonate', 'chloride', 'sulfate'].includes(id)
            ? 'Anions' as const
            : 'Other modeled ions' as const,
      })),
      tds: result.tds,
      gh: result.gh,
      kh: result.kh,
    },
  }), [recipeName, result, saltSteps, sourceA.name, sourceB.name]);
  const previewUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(model.svg)}`;
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(false);
    try {
      const blob = await rasterizeRecipeShareCard(model.svg, model.width, model.height, 'png', 2);
      const packagedPng = embedWaterRecipeJsonInPng(await blob.arrayBuffer(), serializeWaterMixRecipeFile({
        name: recipeName,
        sourceA,
        sourceB,
        volumeAMl: result.volumeAMl,
        volumeBMl: result.volumeBMl,
        finalIons: result.finalIons,
        finalMetadata: result.finalMetadata,
         saltTargets,
         formIdxBySaltId,
      }));
      const url = URL.createObjectURL(new Blob([packagedPng], { type: 'image/png' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${recipeFilenameSlug(recipeName)}.WATER.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 backdrop-blur-sm sm:p-4" onClick={onClose} role="presentation">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-sky-400/25 bg-slate-800 shadow-2xl sm:max-h-[calc(100dvh-2rem)]" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Mixer recipe card">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700/50 bg-gradient-to-r from-sky-500/15 to-emerald-500/10 px-4 py-3 sm:px-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Step-by-step</div>
            <h2 className="mt-1 text-lg font-bold text-slate-100">Mixer recipe card</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700/60 hover:text-slate-100" aria-label="Close Mixer recipe card">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid items-start gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="min-w-0">
              <ol className="space-y-2.5">
                <li className="flex gap-3 rounded-xl border border-sky-400/15 bg-slate-900/35 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-xs font-bold text-sky-100 ring-1 ring-sky-300/20">1</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-200">Measure Water A</div>
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-cyan-300/30 bg-cyan-400/[0.08] px-2 py-1.5 text-cyan-100">
                      <span className="truncate text-xs font-semibold">{sourceA.name}</span>
                      <span className="shrink-0 rounded-md border border-cyan-300/30 bg-cyan-400/15 px-2 py-1 font-mono text-base font-bold">{formatVolume(result.volumeAMl)} mL</span>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3 rounded-xl border border-violet-400/15 bg-slate-900/35 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-400/20 text-xs font-bold text-violet-100 ring-1 ring-violet-300/20">2</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-200">Measure Water B</div>
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-violet-300/30 bg-violet-400/[0.08] px-2 py-1.5 text-violet-100">
                      <span className="truncate text-xs font-semibold">{sourceB.name}</span>
                      <span className="shrink-0 rounded-md border border-violet-300/30 bg-violet-400/15 px-2 py-1 font-mono text-base font-bold">{formatVolume(result.volumeBMl)} mL</span>
                    </div>
                  </div>
                </li>
                <li className="flex gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/20">3</span>
                  <div>
                    <div className="text-sm font-medium text-slate-200">Combine and verify</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-slate-400">Combine both waters, check the final volume, and confirm the blend is clear before brewing.</div>
                    <div className="mt-2 font-mono text-sm font-bold text-emerald-200">{formatVolume(result.totalVolumeMl)} mL total</div>
                  </div>
                </li>
                {saltSteps.length > 0 && (
                  <li className="flex gap-3 rounded-xl border border-indigo-400/20 bg-indigo-500/[0.06] p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-400/20 text-xs font-bold text-indigo-100 ring-1 ring-indigo-300/20">4</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200">Add final-blend salts</div>
                      <div className="mt-2 space-y-2">
                        {saltSteps.map(step => (
                          <div key={step.name} className="flex items-center justify-between gap-2 rounded-lg border border-indigo-300/20 bg-indigo-400/[0.08] px-2 py-1.5">
                            <span className="min-w-0 truncate text-xs font-semibold text-indigo-100">{step.name} <span className="font-normal text-indigo-200/70">· {step.form}</span></span>
                            <span className="shrink-0 font-mono text-sm font-bold text-indigo-100">{step.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                )}
              </ol>
              <button type="button" onClick={handleSave} disabled={isSaving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-sky-200/70 bg-sky-400 px-4 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-sky-950/30 transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:cursor-wait disabled:opacity-60" data-testid="button-save-mixer-recipe-image">
                <Download className="h-5 w-5" aria-hidden="true" /> {isSaving ? 'Saving share card…' : 'Save Recipe Image'}
              </button>
              {saveError && <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-100" role="status">Couldn’t create the share-card image in this browser. Try again.</p>}
              <p className="mt-1.5 text-center text-[10px] text-slate-500">Download a clean PNG with the Mixer steps and final mineral analysis.</p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/35 p-2 sm:p-3">
              <img src={previewUrl} alt={`${recipeName} Mixer recipe card preview`} className="h-auto w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WaterMixer({
  savedSources = [],
  savedMixerRecipes,
  localWaters = [],
  communityWaters = [],
  databaseLoading = false,
  databaseError = null,
  onLoadCommunityWaters,
  onSavedRecipe,
  onImportRecipeFile,
}: WaterMixerProps) {
  const [cardA, setCardA] = useState<CardState>(emptyCard);
  const [cardB, setCardB] = useState<CardState>(emptyCard);
  const [volumeA, setVolumeA] = useState('250');
  const [volumeB, setVolumeB] = useState('250');
  const [recipeName, setRecipeName] = useState('');
  const [saltTargets, setSaltTargets] = useState<Record<string, number>>({});
  const [formIdxBySaltId, setFormIdxBySaltId] = useState<Record<string, number>>({});
  const [saltDoseDrafts, setSaltDoseDrafts] = useState<Record<string, string>>({});
  const [showMemeSalts, setShowMemeSalts] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [deleteMessageIsError, setDeleteMessageIsError] = useState(false);
  const [pendingDeleteRecipe, setPendingDeleteRecipe] = useState<WaterMixRecipe | null>(null);
  const [storedRecipes, setStoredRecipes] = useState<WaterMixRecipe[]>(() => savedMixerRecipes ?? loadWaterMixRecipes());
  const [importedSources, setImportedSources] = useState<WaterMixerSavedSource[]>(() => loadImportedWaterMixSources());
  const [importMessage, setImportMessage] = useState('');
  const [pendingImport, setPendingImport] = useState<WaterMixerSavedSource | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [shareCardOpen, setShareCardOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const deleteConfirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pendingDeleteRecipe) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingDeleteRecipe(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    deleteConfirmRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingDeleteRecipe]);

  const databaseWaters = useMemo(() => {
    const byId = new Map<string, WaterMixerDatabaseWater>();
    [...localWaters, ...communityWaters].forEach(water => byId.set(String(water.id), water));
    return [...byId.values()];
  }, [communityWaters, localWaters]);

  const effectiveSourceA = cardA.mode === 'manual'
    ? (manualIsComplete(cardA) ? blankSnapshot(cardA.manualName.trim() || 'Water A', 'manual', Object.fromEntries(ACTIVE_ION_IDS.map(id => [id, Number(cardA.manualIons[id] ?? 0)]))) : null)
    : cardA.source;
  const effectiveSourceB = cardB.mode === 'manual'
    ? (manualIsComplete(cardB) ? blankSnapshot(cardB.manualName.trim() || 'Water B', 'manual', Object.fromEntries(ACTIVE_ION_IDS.map(id => [id, Number(cardB.manualIons[id] ?? 0)]))) : null)
    : cardB.source;
  const result = useMemo(() => calculateWaterMix({
    sourceA: effectiveSourceA ?? undefined,
    sourceB: effectiveSourceB ?? undefined,
    volumeAMl: Number(volumeA),
    volumeBMl: Number(volumeB),
    saltTargets,
    formIdxBySaltId,
  }), [effectiveSourceA, effectiveSourceB, formIdxBySaltId, saltTargets, volumeA, volumeB]);
  const mixerSaltSteps = useMemo(
    () => buildMixerSaltSteps(saltTargets, formIdxBySaltId, result.totalVolumeMl),
    [formIdxBySaltId, result.totalVolumeMl, saltTargets],
  );
  const eligibleSources = useMemo<WaterMixerSavedSource[]>(() => dedupeWaterMixSourceSnapshots([
    ...savedSources.map(migrateWaterMixSourceSnapshot),
    ...importedSources.map(migrateWaterMixSourceSnapshot),
    ...storedRecipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      sourceKind: 'saved-recipe' as const,
      sourceId: recipe.id,
      ions: recipe.finalIons,
      metadata: recipe.finalMetadata,
      provenance: 'Mixer recipe',
    })).map(migrateWaterMixSourceSnapshot),
  ]), [importedSources, savedSources, storedRecipes]);

  const rememberImportedSource = (source: WaterMixerSavedSource) => {
    setImportedSources(previous => {
      const next = dedupeWaterMixSourceSnapshots([source, ...previous]);
      saveImportedWaterMixSources(next);
      return next;
    });
  };

  const applyImportedSource = (source: WaterMixerSavedSource, side: 'a' | 'b') => {
    rememberImportedSource(source);
    const nextCard = { ...emptyCard(), mode: 'saved-recipe' as const, source };
    if (side === 'a') setCardA(nextCard);
    else setCardB(nextCard);
    setPendingImport(null);
    const legacyNote = source.provenance === 'Legacy recipe · zero-mineral RO estimate'
      ? ' Salt targets were calculated over zero-mineral RO/distilled water.'
      : '';
    setImportMessage(`Imported "${source.name}" into Water ${side.toUpperCase()}.${legacyNote}`);
  };

  const handleImportFile = async (file: File) => {
    if (!onImportRecipeFile) return;
    setImportMessage('');
    setPendingImport(null);
    setIsImporting(true);
    try {
      const parsed = await onImportRecipeFile(file);
      if ('error' in parsed) {
        setImportMessage(parsed.error);
        return;
      }
      const imported: WaterMixerSavedSource = {
        ...parsed.source,
        sourceKind: 'saved-recipe',
        sourceId: parsed.source.sourceId ?? `import-${Date.now().toString(36)}`,
        provenance: parsed.provenance ?? 'Imported recipe',
      };
      if (!effectiveSourceA) {
        applyImportedSource(imported, 'a');
      } else if (!effectiveSourceB) {
        applyImportedSource(imported, 'b');
      } else {
        rememberImportedSource(imported);
        setPendingImport(imported);
        setImportMessage('Both Mixer sources are in use. Choose a source to replace.');
      }
    } catch {
      setImportMessage('Could not read that recipe file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSave = () => {
    if (!result.valid || !effectiveSourceA || !effectiveSourceB) return;
    const recipe = createWaterMixRecipe(recipeName, {
      sourceA: effectiveSourceA,
      sourceB: effectiveSourceB,
      volumeAMl: Number(volumeA),
      volumeBMl: Number(volumeB),
      saltTargets,
      formIdxBySaltId,
    }, result);
    if (!recipe) {
      setSaveMessage('Add a name before saving this blend.');
      return;
    }
    const next = saveWaterMixRecipe(recipe);
    setStoredRecipes(next);
    onSavedRecipe?.(recipe);
      setRecipeName(recipe.name);
    setSaveOpen(false);
    setSaveMessage(`Saved "${recipe.name}"`);
  };

  const reopen = (recipe: WaterMixRecipe) => {
    setCardA({ ...emptyCard(), mode: 'saved-recipe', source: recipe.sourceA });
    setCardB({ ...emptyCard(), mode: 'saved-recipe', source: recipe.sourceB });
    setVolumeA(String(recipe.volumeAMl));
    setVolumeB(String(recipe.volumeBMl));
    setRecipeName(recipe.name);
    setSaltTargets(recipe.saltTargets ?? {});
    setFormIdxBySaltId(recipe.formIdxBySaltId ?? {});
    setSaltDoseDrafts({});
    setSaveMessage(`Reopened "${recipe.name}"`);
  };

  const confirmDeleteRecipe = () => {
    const recipe = pendingDeleteRecipe;
    if (!recipe) return;

    const outcome = deleteWaterMixRecipe(recipe.id, storedRecipes);
    if (!outcome.persisted) {
      setDeleteMessage(`Couldn’t delete "${recipe.name}" from saved storage.`);
      setDeleteMessageIsError(true);
      setPendingDeleteRecipe(null);
      return;
    }

    setStoredRecipes(outcome.recipes);
    if (cardA.source?.sourceKind === 'saved-recipe' && cardA.source.sourceId === recipe.id) {
      setCardA(emptyCard());
    }
    if (cardB.source?.sourceKind === 'saved-recipe' && cardB.source.sourceId === recipe.id) {
      setCardB(emptyCard());
    }
    setDeleteMessage(outcome.deleted ? `Deleted "${recipe.name}".` : `"${recipe.name}" was already deleted.`);
    setDeleteMessageIsError(false);
    setPendingDeleteRecipe(null);
  };

  const updateMixerSaltDose = (saltId: string, value: string) => {
    setSaltDoseDrafts(current => ({ ...current, [saltId]: value }));
    const salt = SALTS.find(item => item.id === saltId);
    if (!salt) return;
    const formIdx = Math.min(
      Math.max(0, formIdxBySaltId[saltId] ?? salt.defaultFormIdx ?? 0),
      Math.max(0, salt.hydrationForms.length - 1),
    );
    const form = salt.hydrationForms[formIdx] ?? salt.hydrationForms[0];
    const parsed = value.trim() === '' ? 0 : Number(value);
    const liters = result.totalVolumeMl / 1000;
    const target = form && Number.isFinite(parsed) && parsed >= 0
      ? computeSaltTargetPpm(parsed, liters, form.molarMass, salt.anhydrousMass)
      : 0;
    setSaltTargets(current => ({ ...current, [saltId]: target }));
  };

  const toggleMixerSalt = (saltId: string) => {
    setSaltTargets(current => {
      if (Object.prototype.hasOwnProperty.call(current, saltId)) {
        const next = { ...current };
        delete next[saltId];
        return next;
      }
      return { ...current, [saltId]: 0 };
    });
    setSaltDoseDrafts(current => {
      const next = { ...current };
      delete next[saltId];
      return next;
    });
  };

  const updateMixerSaltForm = (saltId: string, formIdx: number) => {
    setFormIdxBySaltId(current => ({ ...current, [saltId]: formIdx }));
    setSaltDoseDrafts(current => {
      const next = { ...current };
      delete next[saltId];
      return next;
    });
  };

  const statusMessage = result.errors[0]?.message ?? 'Ready to calculate.';

  return (
    <main className="app-page-stack mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col px-4 py-6 text-slate-200 sm:px-6 lg:px-8" data-testid="workspace-water-mixer">
      <header className="relative overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-900/75 px-5 py-6 shadow-2xl shadow-slate-950/40 sm:px-7">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border border-cyan-300/10 bg-cyan-300/[0.03]" />
        <div className="absolute right-10 top-8 h-20 w-20 rounded-full border border-violet-300/10" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-end">
             <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">
              <FlaskConical className="h-4 w-4" /> Finished-water instrument
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">Mixer</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">Combine two finished waters by volume and see the final mineral readings.</p>
          </div>
           <div className="flex max-w-xs flex-col items-stretch gap-3 border-l border-slate-700 pl-4">
             <div className="text-[11px] leading-relaxed text-slate-500">
                Volume-weighted composition with explicit final-batch salt adjustments. No target matching or hidden chemistry.
             </div>
             <button
               type="button"
               onClick={() => importInputRef.current?.click()}
               disabled={!onImportRecipeFile || isImporting}
               data-testid="button-import-mixer-recipe"
               className="inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/15 disabled:cursor-wait disabled:opacity-50"
               aria-label="Import recipe into Mixer"
             >
               <Upload className="h-3.5 w-3.5" /> {isImporting ? 'Reading' : 'Import recipe'}
             </button>
             <input
               ref={importInputRef}
               type="file"
               className="hidden"
               accept=".json,.WATER,.water,.WATER.png,.water.png,.png,application/json,image/png"
               data-testid="input-import-mixer-recipe"
               onChange={event => {
                 const file = event.target.files?.[0];
                 event.target.value = '';
                 if (file) void handleImportFile(file);
               }}
             />
          </div>
        </div>
      </header>

       {importMessage && (
         <div
           className={`rounded-xl border px-4 py-3 text-xs ${pendingImport ? 'border-amber-300/30 bg-amber-300/10 text-amber-100' : importMessage.startsWith('Imported ') ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-rose-300/30 bg-rose-300/10 text-rose-100'}`}
           data-testid="status-mixer-import"
         >
           <p>{importMessage}</p>
           {pendingImport && (
             <div className="mt-3 flex flex-wrap gap-2">
               <button type="button" onClick={() => applyImportedSource(pendingImport, 'a')} data-testid="button-replace-mixer-source-a" className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-cyan-100 hover:border-cyan-200/60">Replace Water A</button>
               <button type="button" onClick={() => applyImportedSource(pendingImport, 'b')} data-testid="button-replace-mixer-source-b" className="rounded-lg border border-violet-300/30 bg-violet-300/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-violet-100 hover:border-violet-200/60">Replace Water B</button>
               <button type="button" onClick={() => { setPendingImport(null); setImportMessage(''); }} data-testid="button-cancel-mixer-import" className="rounded-lg border border-slate-700 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200">Cancel</button>
             </div>
           )}
         </div>
       )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_minmax(21rem,0.84fr)]">
        <div className="grid gap-4 md:grid-cols-2">
          <SourceCard side="a" card={cardA} volume={volumeA} savedSources={eligibleSources} databaseWaters={databaseWaters} databaseLoading={databaseLoading} databaseError={databaseError} onLoadCommunityWaters={onLoadCommunityWaters} onChange={next => setCardA(next)} onVolume={setVolumeA} onClear={() => { setCardA(emptyCard()); setVolumeA('250'); }} />
          <SourceCard side="b" card={cardB} volume={volumeB} savedSources={eligibleSources} databaseWaters={databaseWaters} databaseLoading={databaseLoading} databaseError={databaseError} onLoadCommunityWaters={onLoadCommunityWaters} onChange={next => setCardB(next)} onVolume={setVolumeB} onClear={() => { setCardB(emptyCard()); setVolumeB('250'); }} />
        </div>

        <section className="flex flex-col rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 shadow-2xl shadow-slate-950/30" data-testid="panel-mixer-result">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300"><Database className="h-3.5 w-3.5" /> Blend output</div>
              <h2 className="mt-1 text-lg font-bold text-slate-100">Recipe steps</h2>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${result.valid ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/30 bg-amber-300/10 text-amber-200'}`} data-testid="status-mixer-result">
              {result.valid ? 'Calculated' : 'Incomplete'}
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/45 p-4">
            {result.valid ? (
              <ol className="space-y-3" data-testid="list-mixer-recipe-steps">
                <li className="flex items-center gap-3"><span className="font-mono text-xs text-cyan-300">01</span><span className="text-sm text-slate-300">Add <strong className="font-mono text-slate-100">{formatVolume(result.volumeAMl)} mL</strong> Water A</span></li>
                <li className="flex items-center gap-3"><span className="font-mono text-xs text-violet-300">02</span><span className="text-sm text-slate-300">Add <strong className="font-mono text-slate-100">{formatVolume(result.volumeBMl)} mL</strong> Water B</span></li>
                {mixerSaltSteps.length > 0 && (
                  <li className="flex items-start gap-3 border-t border-slate-700/60 pt-3">
                    <span className="font-mono text-xs text-indigo-300">03</span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-slate-300">Add final-blend salts</span>
                      <div className="mt-2 space-y-1.5">
                        {mixerSaltSteps.map(step => (
                          <div key={step.name} className="flex items-center justify-between gap-2 rounded-lg border border-indigo-300/20 bg-indigo-400/[0.06] px-2 py-1.5">
                            <span className="min-w-0 truncate text-xs text-indigo-100">{step.name} <span className="text-indigo-200/60">· {step.form}</span></span>
                            <strong className="shrink-0 font-mono text-xs text-indigo-100" data-testid={`text-mixer-step-salt-${step.name.toLowerCase().replaceAll(' ', '-')}`}>{step.amount}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </li>
                )}
                <li className="mt-4 flex items-center justify-between border-t border-slate-700/60 pt-3"><span className="text-sm font-semibold text-slate-200">Final volume</span><strong className="font-mono text-lg text-cyan-200" data-testid="text-mixer-final-volume">{formatVolume(result.totalVolumeMl)} mL</strong></li>
              </ol>
            ) : (
              <div className="flex min-h-32 flex-col justify-center" data-testid="status-mixer-incomplete">
                <p className="text-sm font-semibold text-amber-200">{statusMessage}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">Choose two finished snapshots, then add a positive total volume. The output will appear here immediately.</p>
              </div>
            )}
          </div>

           <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2"><span className="block text-[9px] uppercase tracking-wider text-slate-500">Water A</span><strong className="font-mono text-sm text-cyan-200" data-testid="text-mixer-percent-a">{result.percentageA.toFixed(1)}%</strong></div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2"><span className="block text-[9px] uppercase tracking-wider text-slate-500">Water B</span><strong className="font-mono text-sm text-violet-200" data-testid="text-mixer-percent-b">{result.percentageB.toFixed(1)}%</strong></div>
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-2"><span className="block text-[9px] uppercase tracking-wider text-slate-500">Total</span><strong className="font-mono text-sm text-slate-200" data-testid="text-mixer-total-volume">{formatVolume(result.totalVolumeMl)} mL</strong></div>
             <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.06] px-3 py-2" title="General hardness divided by carbonate hardness"><span className="block text-[9px] uppercase tracking-wider text-slate-500">GH:KH</span><strong className="font-mono text-sm text-emerald-200" data-testid="text-mixer-gh-kh-ratio">{formatGhKhRatio(result.gh, result.kh)}</strong><span className="text-[9px] text-slate-600">ratio</span></div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Final readings</h3><span className="font-mono text-[10px] text-slate-600">mg/L</span></div>
            {result.valid ? (
              <div className="grid gap-x-5 sm:grid-cols-2" data-testid="list-mixer-final-ions">
                {ACTIVE_ION_IDS.map(id => <IonReading key={id} id={id} value={result.finalIons[id]} testId={`text-mixer-final-ion-${id}`} />)}
              </div>
            ) : <div className="rounded-lg border border-dashed border-slate-700 px-3 py-4 text-xs text-slate-600" data-testid="status-mixer-readings-hidden">Final readings stay hidden until the blend is valid.</div>}
          </div>

          {result.valid && (
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-700/60 pt-4" data-testid="panel-mixer-derived-values">
              <div><span className="block text-[9px] uppercase tracking-wider text-slate-500">GH</span><strong className="font-mono text-sm text-slate-100" data-testid="text-mixer-gh">{formatReading(result.gh)}</strong><span className="text-[9px] text-slate-600">as CaCO₃</span></div>
              <div><span className="block text-[9px] uppercase tracking-wider text-slate-500">KH</span><strong className="font-mono text-sm text-slate-100" data-testid="text-mixer-kh">{formatReading(result.kh)}</strong><span className="text-[9px] text-slate-600">as CaCO₃</span></div>
              <div><span className="block text-[9px] uppercase tracking-wider text-slate-500">Modeled TDS</span><strong className="font-mono text-sm text-slate-100" data-testid="text-mixer-tds">{formatReading(result.tds)}</strong><span className="text-[9px] text-slate-600">ion sum</span></div>
            </div>
          )}

          <div className="mt-auto pt-5">
            {result.valid && (
              <button type="button" onClick={() => setShareCardOpen(true)} data-testid="button-open-mixer-recipe-card" className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-300/30 bg-violet-300/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-violet-100 transition hover:border-violet-200/60 hover:bg-violet-300/15">
                <Download className="h-4 w-4" /> Recipe steps card
              </button>
            )}
            {!saveOpen ? (
              <button type="button" onClick={() => setSaveOpen(true)} disabled={!result.valid} data-testid="button-open-save-mixer-recipe" className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Save mixer blend as recipe">
                <Save className="h-4 w-4" /> Save as recipe
              </button>
            ) : (
              <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] p-3" data-testid="panel-save-mixer-recipe">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-cyan-200" htmlFor="input-mixer-recipe-name">Recipe name</label>
                <input id="input-mixer-recipe-name" autoFocus value={recipeName} onChange={event => setRecipeName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') handleSave(); }} data-testid="input-mixer-recipe-name" className="app-control mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-sm text-slate-100 placeholder:text-slate-600" placeholder="Morning clarity blend" aria-label="Mixer recipe name" />
                {saveMessage && <p className="mt-2 text-xs text-amber-300" data-testid="status-mixer-save-error">{saveMessage}</p>}
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={handleSave} data-testid="button-save-mixer-recipe" className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-200"><Check className="h-4 w-4" /> Save</button>
                  <button type="button" onClick={() => { setSaveOpen(false); setSaveMessage(''); }} data-testid="button-cancel-save-mixer-recipe" className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200">Cancel</button>
                </div>
              </div>
            )}
            {saveMessage && !saveOpen && <p className="mt-2 text-xs text-emerald-300" data-testid="status-mixer-save-success">{saveMessage}</p>}
          </div>
        </section>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="order-2 min-w-0 xl:order-1">
          <MixerSaltTable
            saltTargets={saltTargets}
            formIdxBySaltId={formIdxBySaltId}
            doseDrafts={saltDoseDrafts}
            totalVolumeMl={result.totalVolumeMl}
            showMemeSalts={showMemeSalts}
            onToggleSalt={toggleMixerSalt}
            onFormChange={updateMixerSaltForm}
            onDoseChange={updateMixerSaltDose}
            onDoseBlur={saltId => setSaltDoseDrafts(current => {
              const next = { ...current };
              delete next[saltId];
              return next;
            })}
            onReset={() => {
              setSaltTargets({});
              setFormIdxBySaltId({});
              setSaltDoseDrafts({});
            }}
            onToggleMemeSalts={() => setShowMemeSalts(value => !value)}
          />
        </div>
        <aside className="order-1 xl:sticky xl:top-3 xl:order-2" data-testid="panel-mixer-live-readings-rail" aria-label="Live final readings">
          <MixerLiveReadings result={result} sideRail />
        </aside>
      </div>

      {deleteMessage && (
        <p
          className={`rounded-xl border px-4 py-3 text-xs ${deleteMessageIsError ? 'border-rose-300/30 bg-rose-300/10 text-rose-100' : 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100'}`}
          role="status"
          data-testid="status-mixer-delete"
        >
          {deleteMessage}
        </p>
      )}

      {storedRecipes.length > 0 && (
        <section className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4" data-testid="panel-mixer-saved-recipes">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700/60 pb-3">
            <div><h2 className="text-sm font-bold text-slate-100">Saved Mixer recipes</h2><p className="mt-1 text-xs text-slate-500">Snapshots reopen without a database connection.</p></div>
            <span className="font-mono text-[10px] text-slate-600">{storedRecipes.length} saved</span>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {storedRecipes.map(recipe => (
              <div key={recipe.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/60 bg-slate-950/35 px-3 py-3" data-testid={`card-mixer-saved-recipe-${recipe.id}`}>
                <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-200">{recipe.name}</p><p className="mt-1 font-mono text-[10px] text-slate-500">{formatVolume(recipe.volumeAMl)} + {formatVolume(recipe.volumeBMl)} mL</p></div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => reopen(recipe)} data-testid={`button-reopen-mixer-recipe-${recipe.id}`} className="rounded-md border border-violet-300/25 bg-violet-300/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-200 hover:border-violet-200/60" aria-label={`Reopen ${recipe.name}`}>Reopen</button>
                  <button type="button" onClick={() => { setDeleteMessage(''); setPendingDeleteRecipe(recipe); }} data-testid={`button-delete-mixer-recipe-${recipe.id}`} className="rounded-md border border-rose-300/25 bg-rose-300/10 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-200 hover:border-rose-200/60" aria-label={`Delete ${recipe.name}`}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {pendingDeleteRecipe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setPendingDeleteRecipe(null);
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-rose-300/25 bg-slate-900 p-5 shadow-2xl shadow-slate-950/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mixer-delete-dialog-title"
            aria-describedby="mixer-delete-dialog-description"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-300/25 bg-rose-300/10">
                <Trash2 className="h-4 w-4 text-rose-200" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id="mixer-delete-dialog-title" className="text-base font-bold text-slate-100">Delete saved recipe?</h2>
                <p id="mixer-delete-dialog-description" className="mt-2 text-sm leading-relaxed text-slate-400">
                  Delete <strong className="text-slate-200">{pendingDeleteRecipe.name}</strong> from your saved Mixer recipes? This will not remove any catalog or imported water sources.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPendingDeleteRecipe(null)} data-testid="button-cancel-delete-mixer-recipe" className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-slate-100">Cancel</button>
              <button ref={deleteConfirmRef} type="button" onClick={confirmDeleteRecipe} data-testid="button-confirm-delete-mixer-recipe" className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300/40 bg-rose-400/15 px-3 py-2 text-xs font-bold text-rose-100 hover:border-rose-200/70 hover:bg-rose-400/25">
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete recipe
              </button>
            </div>
          </div>
        </div>
      )}
       {shareCardOpen && result.valid && effectiveSourceA && effectiveSourceB && (
         <MixerRecipeCardModal
           name={recipeName}
           sourceA={effectiveSourceA}
           sourceB={effectiveSourceB}
           result={result}
            saltTargets={saltTargets}
            formIdxBySaltId={formIdxBySaltId}
           onClose={() => setShareCardOpen(false)}
         />
       )}
    </main>
  );
}
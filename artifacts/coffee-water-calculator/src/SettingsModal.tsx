import { useEffect, useState } from 'react';
import { Lock, Save, Trash2, Copy, RotateCcw, X, Plus, Check } from 'lucide-react';
import {
  ACTIVE_ION_IDS, ION_MAP, AIKI_DEFAULT_PROFILE, WATERMANCER_SENSORY_PROFILE,
  type IonId, type RangeSet, type WaterProfile,
} from '@/waterData';
import { createProfile, emptyRangeSet } from '@/profiles';

interface Props {
  profiles: WaterProfile[];
  activeProfileId: string;
  onClose: () => void;
  onSelectProfile: (id: string) => void;
  onSaveProfile: (profile: WaterProfile) => void;
  onDeleteProfile: (id: string) => void;
  inline?: boolean;
}

const num = (s: string): number => {
  const v = parseFloat(s);
  return isNaN(v) || v < 0 ? 0 : v;
};

export function SettingsModal({
  profiles, activeProfileId, onClose,
  onSelectProfile, onSaveProfile, onDeleteProfile,
  inline = false,
}: Props) {
  const active = profiles.find(p => p.id === activeProfileId) ?? AIKI_DEFAULT_PROFILE;
  const selectableProfiles = profiles.filter(
    profile => profile.id !== AIKI_DEFAULT_PROFILE.id
      && profile.id !== WATERMANCER_SENSORY_PROFILE.id,
  );
  const isLocked = active.locked;
  const [draftRanges, setDraftRanges] = useState<RangeSet>(structuredClone(active.ranges));
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    setDraftRanges(structuredClone(active.ranges));
  }, [activeProfileId, active.ranges]);

  const updateRange = (id: IonId, field: 'greenMax' | 'yellowMax', value: string) => {
    setDraftRanges(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: num(value) },
    }));
  };

  const handleSaveNew = () => {
    const name = newName.trim();
    if (!name) return;
    const profile = createProfile(name, draftRanges);
    onSaveProfile(profile);
    setNewName('');
    setNaming(false);
  };

  const handleDuplicate = () => {
    const profile = createProfile(`${active.name} (copy)`, draftRanges);
    onSaveProfile(profile);
  };

  const cancelNaming = () => {
    setNaming(false);
    setNewName('');
  };

  const handleSaveOverwrite = () => {
    if (isLocked) return;
    onSaveProfile({ ...active, ranges: structuredClone(draftRanges) });
  };

  return (
    <div className={inline ? 'w-full' : 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm'}>
      <div className={inline
        ? 'w-full overflow-hidden rounded-2xl border border-indigo-400/25 bg-slate-800/70 shadow-xl'
        : 'w-full max-w-3xl max-h-[85vh] overflow-hidden bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/60 flex flex-col'
      }>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-100">{inline ? 'Ion profile ranges' : 'Ion Range Settings'}</h2>
            {isLocked && (
              <span className="flex items-center gap-1 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-0.5">
                <Lock className="w-3 h-3" /> Locked
              </span>
            )}
          </div>
          {!inline && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className={`${inline ? '' : 'overflow-y-auto max-h-[70vh]'} px-6 py-4 space-y-5`}>
          {/* Profile selector */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-2">Profile</label>
            <div className="flex flex-wrap items-center gap-3">
              {activeProfileId === AIKI_DEFAULT_PROFILE.id ? (
                <div className="flex-1 min-w-[200px] rounded-lg border border-slate-600/60 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                  Default ion guidance
                </div>
              ) : (
                <select
                  value={activeProfileId}
                  onChange={e => onSelectProfile(e.target.value)}
                  className="flex-1 min-w-[200px] bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition"
                >
                  {selectableProfiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.locked ? ' — default' : ''}
                    </option>
                  ))}
                </select>
              )}
              {!isLocked && (
                <button
                  onClick={handleSaveOverwrite}
                  className="flex items-center gap-1.5 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 hover:bg-emerald-500/20 transition"
                >
                  <Save className="w-4 h-4" /> Save changes
                </button>
              )}
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-1.5 text-sm text-sky-300 bg-sky-500/10 border border-sky-500/30 rounded-lg px-3 py-2 hover:bg-sky-500/20 transition"
              >
                <Copy className="w-4 h-4" /> Duplicate
              </button>
              <button
                onClick={() => setNaming(true)}
                className="flex items-center gap-1.5 text-sm text-slate-100 bg-sky-600 hover:bg-sky-500 rounded-lg px-3 py-2 transition"
              >
                <Plus className="w-4 h-4" /> Save new
              </button>
              {!isLocked && activeProfileId !== AIKI_DEFAULT_PROFILE.id && (
                <button
                  onClick={() => onDeleteProfile(activeProfileId)}
                  className="flex items-center gap-1.5 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 hover:bg-rose-500/20 transition"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
              {naming && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Profile name"
                    autoFocus
                    className="bg-slate-900/60 border border-slate-600/60 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/60 transition w-40"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveNew();
                      if (e.key === 'Escape') cancelNaming();
                    }}
                  />
                  <button
                    onClick={handleSaveNew}
                    disabled={!newName.trim()}
                    className="flex items-center justify-center w-9 h-9 text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelNaming}
                    className="flex items-center justify-center gap-1.5 h-9 px-3 text-sm text-slate-300 bg-slate-700/40 border border-slate-600/40 rounded-lg hover:bg-slate-700/60 transition"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                </div>
              )}
            </div>
            {active.description && (
              <p className="text-xs text-slate-500 mt-2">{active.description}</p>
            )}
          </div>

          {/* Range editor */}
          <div>
            <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 px-1 pb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
              <span>Ion</span>
              <span title="Below this value the ion is in the ideal range.">Good (up to)</span>
              <span title="Between 'Good' and this value the ion is elevated.">Elevated (up to)</span>
              <span title="Above this value the ion is too high.">Too high (above)</span>
            </div>
            {ACTIVE_ION_IDS.map(id => {
              const ion = ION_MAP[id];
              const r = draftRanges[id];
              return (
                <div key={id} className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-3 py-1.5 items-center border-b border-slate-700/20 last:border-b-0">
                  <div className="flex flex-col group relative">
                    <span className="text-sm font-medium text-slate-200 cursor-help">{ion.name}</span>
                    <span className="text-xs text-slate-500">{ion.formula}</span>
                    <Tooltip text={ion.tasteNote} />
                  </div>
                  <RangeInput
                    value={r.greenMax}
                    disabled={isLocked}
                    color="emerald"
                    tooltip={ion.flagNotes.green}
                    onChange={v => updateRange(id, 'greenMax', v)}
                  />
                  <RangeInput
                    value={r.yellowMax}
                    disabled={isLocked}
                    color="amber"
                    tooltip={ion.flagNotes.yellow}
                    onChange={v => updateRange(id, 'yellowMax', v)}
                  />
                  <RangeInput
                    value={r.yellowMax}
                    disabled={isLocked}
                    color="rose"
                    tooltip={ion.flagNotes.red}
                    onChange={v => updateRange(id, 'yellowMax', v)}
                    readOnly
                  />
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-700/40 bg-slate-900/30">
          <button
            onClick={() => setDraftRanges(structuredClone(AIKI_DEFAULT_PROFILE.ranges))}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset editor to Aiki's defaults
          </button>
          {!inline && (
            <button
              onClick={onClose}
              className="text-sm text-slate-300 bg-slate-700/60 hover:bg-slate-700 rounded-lg px-4 py-2 transition"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const COLOR_CLASSES = {
  emerald: 'border-emerald-500/40 focus:ring-emerald-500/40 text-emerald-200',
  amber: 'border-amber-500/40 focus:ring-amber-500/40 text-amber-200',
  rose: 'border-rose-500/40 focus:ring-rose-500/40 text-rose-200',
} as const;

function RangeInput({
  value, disabled, color, tooltip, onChange, readOnly,
}: {
  value: number;
  disabled: boolean;
  color: keyof typeof COLOR_CLASSES;
  tooltip: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="group relative">
      <input
        type="number"
        value={value}
        disabled={disabled}
        readOnly={readOnly}
        onChange={e => onChange(e.target.value)}
        className={`w-full bg-slate-900/60 border rounded-lg px-2 py-1.5 text-sm ${COLOR_CLASSES[color]} placeholder-slate-500 focus:outline-none focus:ring-2 transition disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      <Tooltip text={tooltip} />
    </div>
  );
}

function Tooltip({ text }: { text: string }) {
  return (
    <span className="pointer-events-none absolute left-0 bottom-full mb-2 w-56 z-10 rounded-lg bg-slate-900 border border-slate-600/60 px-3 py-2 text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
      {text}
    </span>
  );
}

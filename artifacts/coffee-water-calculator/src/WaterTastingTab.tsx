import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowRight, BookOpen, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  WATER_TASTING_AFFECTIVE_ATTRIBUTES, WATER_TASTING_DESCRIPTIVE_ATTRIBUTES,
  WATER_TASTING_SPECTRUM, WATER_TASTING_DESCRIPTORS,
  createNeutralWaterTastingSpectrum,
  calculateWaterTastingTotal, createWaterTastingRecord, createWaterTastingDeletionMarker,
  isCvaWaterTastingRecord, updateWaterTastingRecord,
  loadWaterTastingCollection, saveWaterTastingCollection, sortWaterTastingsByName, sortWaterTastingsNewestFirst,
  type WaterTastingCvaDraft, type WaterTastingLegacyDraft,
  type WaterTastingCollection, type WaterTastingEditorValues, type WaterTastingProfileOption,
  type WaterTastingRecord, type WaterTastingStorageError,
} from './waterTasting';
import { WaterTastingScoring } from './WaterTastingScoring';

interface WaterTastingTabProps {
  profileOptions: WaterTastingProfileOption[];
  renderProfileAnalysis: (sourceId: string) => ReactNode;
  onOpenWatermancer: () => void;
}

const descriptorNames = new Map<string, string>(
  WATER_TASTING_DESCRIPTORS.flatMap(group => group.options.map(option => [option.id, option.label] as const)),
);

const inputStyle = 'h-11 rounded-lg border-slate-600/60 bg-slate-950/45 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-300/70';
const ghostButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-600/60 bg-slate-800/40 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-cyan-300/40 hover:bg-slate-700/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300';
const eyebrow = 'text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80';

function emptyDraft(profileSourceId = ''): WaterTastingEditorValues {
  return {
    mode: 'cva',
    profileSourceId,
    profileNameSnapshot: '',
    coffee: {},
    ratings: {},
    spectrum: createNeutralWaterTastingSpectrum(),
    descriptive: {},
    affective: {},
    descriptorIds: [],
    notes: '',
    legacySpectrumCaptured: false,
  };
}

function storageMessage(error: WaterTastingStorageError): string {
  switch (error) {
    case 'invalid-data':
      return 'Saved tasting data could not be read. Your notes here remain editable, but saving is blocked so the stored data is not overwritten.';
    case 'unavailable':
      return 'Local browser storage is unavailable. Your notes here remain editable, but cannot be saved.';
    case 'invalid-records':
      return 'This tasting could not be saved because its record is invalid. Your entries have been kept.';
    case 'changed-data':
      return 'Saved tastings changed in another tab. Your entries are still here; refresh this page to load the latest notes before saving again.';
    case 'write-failed':
      return 'The browser could not save this tasting. Your entries have been kept; please check available storage and try again.';
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value));
}

function formatSpectrumValue(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
}

export function WaterTastingTab({ profileOptions, onOpenWatermancer }: WaterTastingTabProps) {
  const [initialLoad] = useState(loadWaterTastingCollection);
  const expectedCollectionRef = useRef<WaterTastingCollection | null>(
    initialLoad.ok ? initialLoad.collection : null,
  );
  const [records, setRecords] = useState<WaterTastingRecord[]>(() =>
    initialLoad.ok ? sortWaterTastingsNewestFirst(initialLoad.collection.records) : [],
  );
  const [historySort, setHistorySort] = useState<'newest' | 'name'>('newest');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const formStart = useRef<HTMLDivElement>(null);
  const form = useForm<WaterTastingEditorValues>({ defaultValues: emptyDraft() });
  const mode = form.watch('mode');
  const editingRecord = records.find(record => record.id === editingId);
  const displayedRecords = historySort === 'name' ? sortWaterTastingsByName(records) : records;
  useEffect(() => {
    const refreshRecords = () => {
      const latest = loadWaterTastingCollection();
      if (!latest.ok) return;
      setRecords(sortWaterTastingsNewestFirst(latest.collection.records));
      if (editingId === null && !form.formState.isDirty) {
        expectedCollectionRef.current = latest.collection;
      }
    };
    window.addEventListener('storage', refreshRecords);
    return () => {
      window.removeEventListener('storage', refreshRecords);
    };
  }, [editingId, form]);
  const profileChoices = editingRecord && !profileOptions.some(option => option.sourceId === editingRecord.profileSourceId)
    ? [...profileOptions, {
      sourceId: editingRecord.profileSourceId,
      name: `${editingRecord.profileNameSnapshot} (no longer available)`,
      group: editingRecord.profileSourceId.startsWith('alchemist:') ? 'Alchemist' as const : 'Watermancer' as const,
      readings: { ions: {} },
    }]
    : profileOptions;
  function beginNew() {
    setEditingId(null);
    form.reset(emptyDraft());
    setFeedback(null);
    formStart.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openRecord(record: WaterTastingRecord) {
    setEditingId(record.id);
    if (isCvaWaterTastingRecord(record)) {
      form.reset({
        ...emptyDraft(record.profileSourceId),
        mode: 'cva',
        profileNameSnapshot: record.profileNameSnapshot,
        coffee: { ...record.coffee },
        notes: record.notes ?? '',
        descriptive: { ...record.descriptive },
        affective: { ...record.affective },
        descriptorIds: [...record.descriptorIds],
      });
    } else {
      form.reset({
        ...emptyDraft(record.profileSourceId),
        mode: 'legacy',
        profileNameSnapshot: record.profileNameSnapshot,
        coffee: { ...record.coffee },
        notes: record.notes ?? '',
        ratings: { ...record.ratings },
        spectrum: record.spectrum
          ? { ...record.spectrum }
          : createNeutralWaterTastingSpectrum(),
        descriptorIds: [...record.descriptorIds],
        legacySpectrumCaptured: record.spectrum !== undefined,
      });
    }
    setFeedback(null);
    formStart.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saveDraft(values: WaterTastingEditorValues) {
    if (!initialLoad.ok) {
      setFeedback({ kind: 'error', text: storageMessage(initialLoad.error) });
      return;
    }
    const option = profileChoices.find(choice => choice.sourceId === values.profileSourceId);
    if (!option) {
      form.setError('profileSourceId', { message: 'Select a water profile before saving.' });
      setFeedback({ kind: 'error', text: 'Select a water profile before saving this tasting.' });
      return;
    }
    const snapshot = editingRecord?.profileSourceId === option.sourceId
      ? editingRecord.profileNameSnapshot
      : option.name;
    const coffee = editingRecord
      ? {
        ...editingRecord.coffee,
        ...(typeof values.coffee?.name === 'string' ? { name: values.coffee.name } : {}),
      }
      : values.coffee;
    const preserveCvaDescriptors = editingRecord
      && isCvaWaterTastingRecord(editingRecord)
      && values.mode === 'cva';
    const draftBase = {
      profileSourceId: option.sourceId,
      profileNameSnapshot: snapshot,
      coffee,
      notes: values.notes,
      descriptorIds: preserveCvaDescriptors
        ? [...editingRecord.descriptorIds]
        : values.descriptorIds ?? [],
    };
    let nextRecord: WaterTastingRecord;
    if (values.mode === 'cva') {
      const draft: WaterTastingCvaDraft = {
        ...draftBase,
        scoringVersion: 2,
        descriptive: {
          ...(editingRecord && isCvaWaterTastingRecord(editingRecord) ? editingRecord.descriptive : {}),
          ...(values.descriptive ?? {}),
        },
        affective: {
          ...(editingRecord && isCvaWaterTastingRecord(editingRecord) ? editingRecord.affective : {}),
          ...(values.affective ?? {}),
        },
      };
      if (editingRecord && isCvaWaterTastingRecord(editingRecord)) {
        nextRecord = updateWaterTastingRecord(editingRecord, draft);
      } else if (!editingRecord) {
        nextRecord = createWaterTastingRecord(draft);
      } else {
        setFeedback({ kind: 'error', text: 'This note must be edited with its original scoring format.' });
        return;
      }
    } else {
      const priorLegacy = editingRecord && !isCvaWaterTastingRecord(editingRecord)
        ? editingRecord
        : undefined;
      if (editingRecord && !priorLegacy) {
        setFeedback({ kind: 'error', text: 'This note must be edited with its original scoring format.' });
        return;
      }
      const draft: WaterTastingLegacyDraft = {
        ...draftBase,
        ratings: values.ratings ?? {},
        spectrum: values.legacySpectrumCaptured
          ? { ...values.spectrum }
          : priorLegacy?.spectrum,
      };
      if (priorLegacy) nextRecord = updateWaterTastingRecord(priorLegacy, draft);
      else {
        setFeedback({ kind: 'error', text: 'Start a new tasting to use the current scoring format.' });
        return;
      }
    }
    const nextRecords = sortWaterTastingsNewestFirst(
      editingRecord ? records.map(record => record.id === editingId ? nextRecord : record) : [...records, nextRecord],
    );
    const expectedCollection = expectedCollectionRef.current;
    if (!expectedCollection) {
      setFeedback({ kind: 'error', text: storageMessage('unavailable') });
      return;
    }
    const nextCollection = { ...expectedCollection, records: nextRecords };
    const result = saveWaterTastingCollection(nextCollection, expectedCollection);
    if (!result.ok) {
      setFeedback({ kind: 'error', text: storageMessage(result.error) });
      return;
    }
    expectedCollectionRef.current = nextCollection;
    setRecords(nextRecords);
    setEditingId(null);
    form.reset(emptyDraft());
    setFeedback({ kind: 'success', text: editingRecord ? 'Tasting updated.' : 'Tasting saved.' });
  }

  function deleteRecord(record: WaterTastingRecord) {
    if (!initialLoad.ok) {
      setFeedback({ kind: 'error', text: storageMessage(initialLoad.error) });
      return;
    }
    const nextRecords = records.filter(item => item.id !== record.id);
    const expectedCollection = expectedCollectionRef.current;
    if (!expectedCollection) {
      setFeedback({ kind: 'error', text: storageMessage('unavailable') });
      return;
    }
    const priorDeletion = expectedCollection.deletions.find(item => item.id === record.id);
    const deletion = createWaterTastingDeletionMarker(record, new Date(), priorDeletion);
    const nextCollection: WaterTastingCollection = {
      records: nextRecords,
      deletions: [
        ...expectedCollection.deletions.filter(item => item.id !== record.id),
        deletion,
      ],
    };
    const result = saveWaterTastingCollection(nextCollection, expectedCollection);
    if (!result.ok) {
      setFeedback({ kind: 'error', text: storageMessage(result.error) });
      return;
    }
    expectedCollectionRef.current = nextCollection;
    setRecords(nextRecords);
    if (editingId === record.id) {
      setEditingId(null);
    form.reset(emptyDraft());
    }
    setFeedback({ kind: 'success', text: 'Tasting deleted.' });
  }

  return (
    <main id="water-tasting-panel" role="tabpanel" aria-labelledby="water-tasting-tab-button" tabIndex={0} className="app-card overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-800/70 text-slate-100 shadow-2xl shadow-slate-950/30" data-testid="water-tasting-tab">
      <div className="relative overflow-hidden border-b border-cyan-300/15 bg-gradient-to-br from-cyan-950/55 via-slate-900/75 to-indigo-950/35 px-5 py-7 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute right-[-4rem] top-[-7rem] h-64 w-64 rounded-full border border-cyan-300/10" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[-1rem] top-[-4rem] h-44 w-44 rounded-full border border-cyan-300/10" aria-hidden="true" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">Water Tasting</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              Choose the water used to brew this coffee, then note what changes in the cup.
            </p>
          </div>
        </div>
      </div>

      <div ref={formStart} className="scroll-mt-6 px-4 py-6 sm:px-8 sm:py-8">
        {!initialLoad.ok && (
          <div role="alert" data-testid="alert-tasting-storage" className="mb-6 rounded-xl border border-amber-300/35 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
            {storageMessage(initialLoad.error)}
          </div>
        )}
        {feedback && (
          <div role={feedback.kind === 'error' ? 'alert' : 'status'} aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'} data-testid="status-tasting-feedback" className={`mb-6 rounded-xl border px-4 py-3 text-sm leading-relaxed ${feedback.kind === 'error' ? 'border-amber-300/35 bg-amber-400/10 text-amber-100' : 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'}`}>
            {feedback.text}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(saveDraft)} className="space-y-8" data-testid="form-water-tasting">
            <section aria-labelledby="tasting-source-heading" className="rounded-xl border border-cyan-300/20 bg-slate-950/30 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-300/30 bg-cyan-300/10 font-mono text-xs text-cyan-200">01</span>
                <div className="min-w-0 flex-1">
                  <h3 id="tasting-source-heading" className="font-semibold text-slate-100">Water used</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">Choose the water that was used to brew this coffee.</p>
                </div>
              </div>
              <div className="mt-5 sm:pl-10">
                <FormField control={form.control} name="profileSourceId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-300">Water profile</FormLabel>
                    <FormControl>
                      <select {...field} value={field.value ?? ''} data-testid="select-tasting-profile" className={`${inputStyle} w-full appearance-auto border px-3 sm:max-w-md`}>
                        {!profileChoices.length && <option value="">No profiles available</option>}
                        <option value="" disabled>Select a water profile</option>
                        {(['Alchemist', 'Watermancer'] as const).map(group => {
                          const options = profileChoices.filter(option => option.group === group);
                          return options.length ? <optgroup key={group} label={group}>
                            {options.map(option => <option key={option.sourceId} value={option.sourceId}>{option.name}</option>)}
                          </optgroup> : null;
                        })}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                {editingRecord && profileOptions.some(option => option.sourceId === editingRecord.profileSourceId && option.name !== editingRecord.profileNameSnapshot) && (
                  <p className="mt-2 text-xs text-slate-400" data-testid="text-profile-snapshot">Originally saved as “{editingRecord.profileNameSnapshot}”. That name stays with this note.</p>
                )}
                {!profileOptions.some(option => option.sourceId.startsWith('saved:')) && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
                    <span>No saved Watermancer profiles yet. The other sources are ready to use.</span>
                    <button type="button" onClick={onOpenWatermancer} data-testid="button-open-watermancer" className="inline-flex min-h-11 items-center gap-1 font-semibold text-cyan-200 underline decoration-cyan-300/40 underline-offset-4 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                      Create a target in Watermancer <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section aria-labelledby="tasting-coffee-heading" className="border-b border-slate-600/35 pb-8">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-500/40 bg-slate-700/35 font-mono text-xs text-slate-300">02</span>
                <div>
                  <h3 id="tasting-coffee-heading" className="font-semibold text-slate-100">Coffee <span className="ml-1 text-xs font-normal text-slate-400">· optional</span></h3>
                  <p className="mt-1 text-xs text-slate-400">Add a name to recognize this cup later.</p>
                </div>
              </div>
              <div className="mt-5 sm:pl-10">
                <label className="block max-w-md space-y-2 text-xs font-semibold text-slate-300">
                  <span>Coffee name</span>
                  <Input {...form.register('coffee.name')} data-testid="input-tasting-name" placeholder="e.g. Sunday morning blend" className={inputStyle} />
                </label>
              </div>
            </section>

            <WaterTastingScoring mode={mode} form={form} onChange={() => setFeedback(null)} />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:ml-10">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <FormLabel className="text-sm font-semibold text-slate-100">
                      Additional notes <span className="font-normal text-slate-400">optional</span>
                    </FormLabel>
                    <span className="text-xs tabular-nums text-slate-500">
                      {(field.value ?? '').length} / 2,000
                    </span>
                  </div>
                  <FormControl>
                    <textarea
                      {...field}
                      value={field.value ?? ''}
                      maxLength={2000}
                      rows={3}
                      placeholder="Anything else you noticed in the cup?"
                      data-testid="input-water-tasting-notes"
                      className="min-h-24 w-full resize-y rounded-lg border border-slate-600/60 bg-slate-950/45 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
                      onChange={event => {
                        field.onChange(event);
                        setFeedback(null);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap items-center gap-3 sm:pl-10">
              <button type="submit" data-testid="button-save-tasting" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-cyan-200/65 bg-cyan-300 px-6 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
                {editingId ? <Check className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {editingId ? 'Save changes' : 'Save tasting'}
              </button>
              {editingId && <button type="button" onClick={beginNew} data-testid="button-cancel-tasting-edit" className={ghostButton}>Cancel editing</button>}
              <span className="text-xs text-slate-400">Partial notes are welcome. Saved only in this browser.</span>
            </div>
          </form>
        </Form>
      </div>

      <section aria-labelledby="tasting-history-heading" className="border-t border-cyan-300/15 bg-slate-950/25 px-4 py-7 sm:px-8 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className={eyebrow}>The notebook</div>
            <h3 id="tasting-history-heading" className="mt-1 flex items-center gap-2 text-xl font-semibold text-slate-100"><BookOpen className="h-5 w-5 text-cyan-300/80" aria-hidden="true" /> Saved tastings</h3>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="tasting-history-sort" className="text-xs font-medium text-slate-300">Sort by</label>
            <select
              id="tasting-history-sort"
              value={historySort}
              onChange={event => setHistorySort(event.target.value as 'newest' | 'name')}
              data-testid="select-tasting-history-sort"
              className={`${inputStyle} w-auto appearance-auto border px-3`}
            >
              <option value="newest">Newest first</option>
              <option value="name">Name A–Z</option>
            </select>
            <span data-testid="count-tasting-history" className="rounded-full border border-slate-600/50 px-3 py-1 font-mono text-xs text-slate-400">{records.length} {records.length === 1 ? 'entry' : 'entries'}</span>
          </div>
        </div>
        {records.length === 0 ? (
          <div data-testid="empty-tasting-history" className="mt-5 rounded-xl border border-dashed border-slate-600/70 bg-slate-900/35 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-200">No cups in the notebook yet.</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Save a first observation above, even if you only have a few notes.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {displayedRecords.map((record, index) => {
              const isCvaRecord = isCvaWaterTastingRecord(record);
              const savedTotal = isCvaRecord ? null : calculateWaterTastingTotal(record.ratings);
              const spectrum = isCvaRecord ? undefined : record.spectrum;
              return <article key={record.id} data-testid={`card-tasting-${record.id}`} className={`rounded-xl border bg-slate-900/65 p-4 sm:p-5 ${editingId === record.id ? 'border-cyan-300/65' : 'border-slate-600/45'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.15em] text-slate-400">
                      <span className="font-mono text-cyan-300/80">{String(index + 1).padStart(2, '0')}</span>
                      <time dateTime={record.createdAt} data-testid={`date-tasting-${record.id}`}>{formatDate(record.createdAt)}</time>
                      {editingId === record.id && <span className="text-cyan-200">Editing</span>}
                    </div>
                    <h4 data-testid={`profile-tasting-${record.id}`} className="mt-2 break-words text-base font-semibold text-slate-100">{record.profileNameSnapshot}</h4>
                    {record.coffee.name && <p data-testid={`coffee-tasting-${record.id}`} className="mt-1 text-sm text-slate-300">{record.coffee.name}</p>}
                  </div>
                  {isCvaRecord && typeof record.affective.overall === 'number' && (
                    <div data-testid={`overall-tasting-${record.id}`} className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 font-mono text-sm font-semibold tabular-nums text-cyan-100">
                      Overall {record.affective.overall} / 9
                    </div>
                  )}
                  {!isCvaRecord && savedTotal !== null && <div data-testid={`total-tasting-${record.id}`} className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 font-mono text-sm font-semibold tabular-nums text-cyan-100">{savedTotal} / 50</div>}
                </div>
                {isCvaRecord && (
                  <dl data-testid={`scores-tasting-${record.id}`} aria-label="Descriptive and affective scores" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {WATER_TASTING_DESCRIPTIVE_ATTRIBUTES.flatMap(attribute => {
                      const score = record.descriptive[attribute.id];
                      return typeof score === 'number'
                        ? [<div key={`descriptive-${attribute.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-600/40 bg-slate-800/45 px-3 py-2">
                          <dt className="text-xs text-slate-400">{attribute.label.replace(' intensity', '')}</dt>
                          <dd className="font-mono text-xs font-semibold tabular-nums text-cyan-100">{score} / 15</dd>
                        </div>]
                        : [];
                    })}
                    {WATER_TASTING_AFFECTIVE_ATTRIBUTES.flatMap(attribute => {
                      const score = record.affective[attribute.id];
                      return typeof score === 'number'
                        ? [<div key={`affective-${attribute.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-600/40 bg-slate-800/45 px-3 py-2">
                          <dt className="text-xs text-slate-400">{attribute.label}</dt>
                          <dd className="font-mono text-xs font-semibold tabular-nums text-cyan-100">{score} / 9</dd>
                        </div>]
                        : [];
                    })}
                  </dl>
                )}
                {spectrum ? (
                  <dl data-testid={`spectrum-tasting-${record.id}`} aria-label="Cup shape summary" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {WATER_TASTING_SPECTRUM.map(axis => (
                      <div key={axis.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-600/40 bg-slate-800/45 px-3 py-2">
                        <dt className="text-xs text-slate-400">{axis.historyLabel}</dt>
                        <dd className="font-mono text-xs font-semibold tabular-nums text-cyan-100">{formatSpectrumValue(spectrum[axis.id])}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p data-testid={`spectrum-tasting-${record.id}`} className="mt-4 text-xs text-slate-500">Cup shape not captured</p>
                )}
                {record.descriptorIds.length > 0 && <div data-testid={`descriptors-tasting-${record.id}`} className="mt-4 flex flex-wrap gap-1.5">
                  {record.descriptorIds.map(id => <span key={id} className="rounded-full border border-slate-600/60 bg-slate-800/65 px-2.5 py-1 text-xs text-slate-300">{descriptorNames.get(id) ?? id}</span>)}
                </div>}
                {record.notes && <p data-testid={`notes-tasting-${record.id}`} className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-600/40 bg-slate-800/45 px-3 py-2.5 text-sm leading-relaxed text-slate-300">{record.notes}</p>}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-600/30 pt-4">
                  <button type="button" onClick={() => openRecord(record)} data-testid={`button-edit-tasting-${record.id}`} className={ghostButton}><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Open &amp; edit</button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button type="button" data-testid={`button-delete-tasting-${record.id}`} className={`${ghostButton} hover:border-rose-300/45 hover:text-rose-200`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Delete</button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl border-slate-600 bg-slate-900 text-slate-100">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this tasting?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-300">The tasting for {record.profileNameSnapshot} will be removed from saved records in this browser. This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid={`button-cancel-delete-tasting-${record.id}`} className="min-h-11 border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700">Keep note</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteRecord(record)} data-testid={`button-confirm-delete-tasting-${record.id}`} className="min-h-11 bg-rose-700 text-white hover:bg-rose-600">Delete note</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
    </main>
  );
}
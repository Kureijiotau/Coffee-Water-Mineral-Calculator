import { useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowRight, BookOpen, Check, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  WATER_TASTING_RATINGS, WATER_TASTING_DESCRIPTORS,
  calculateWaterTastingTotal, createWaterTastingRecord, updateWaterTastingRecord,
  loadWaterTastings, saveWaterTastings, sortWaterTastingsNewestFirst,
  type WaterTastingDraft, type WaterTastingProfileOption,
  type WaterTastingRecord, type WaterTastingStorageError,
} from './waterTasting';

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

function emptyDraft(profileSourceId = ''): WaterTastingDraft {
  return { profileSourceId, profileNameSnapshot: '', coffee: {}, ratings: {}, descriptorIds: [] };
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

export function WaterTastingTab({ profileOptions, renderProfileAnalysis, onOpenWatermancer }: WaterTastingTabProps) {
  const [initialLoad] = useState(loadWaterTastings);
  const expectedRecordsRef = useRef<WaterTastingRecord[] | null>(
    initialLoad.ok ? initialLoad.records : null,
  );
  const [records, setRecords] = useState<WaterTastingRecord[]>(() =>
    initialLoad.ok ? sortWaterTastingsNewestFirst(initialLoad.records) : [],
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const formStart = useRef<HTMLDivElement>(null);
  const form = useForm<WaterTastingDraft>({ defaultValues: emptyDraft() });
  const selectedProfileSourceId = form.watch('profileSourceId');
  const ratings = form.watch('ratings');
  const selectedDescriptors = form.watch('descriptorIds') ?? [];
  const total = calculateWaterTastingTotal(ratings ?? {});
  const ratedCount = WATER_TASTING_RATINGS.filter(({ id }) => (
    Number.isInteger(ratings?.[id])
    && Number(ratings?.[id]) >= 0
    && Number(ratings?.[id]) <= 10
  )).length;
  const editingRecord = records.find(record => record.id === editingId);
  const profileChoices = editingRecord && !profileOptions.some(option => option.sourceId === editingRecord.profileSourceId)
    ? [...profileOptions, {
      sourceId: editingRecord.profileSourceId,
      name: `${editingRecord.profileNameSnapshot} (no longer available)`,
      group: 'Saved' as const,
    }]
    : profileOptions;
  const selectedProfileAnalysis = selectedProfileSourceId
    ? renderProfileAnalysis(selectedProfileSourceId)
    : null;

  function beginNew() {
    setEditingId(null);
    form.reset(emptyDraft());
    setFeedback(null);
    formStart.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openRecord(record: WaterTastingRecord) {
    setEditingId(record.id);
    form.reset({
      profileSourceId: record.profileSourceId,
      profileNameSnapshot: record.profileNameSnapshot,
      coffee: { ...record.coffee },
      ratings: { ...record.ratings },
      descriptorIds: [...record.descriptorIds],
    });
    setFeedback(null);
    formStart.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function saveDraft(values: WaterTastingDraft) {
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
    const draft: WaterTastingDraft = {
      profileSourceId: option.sourceId,
      profileNameSnapshot: snapshot,
      coffee: values.coffee,
      ratings: values.ratings ?? {},
      descriptorIds: values.descriptorIds ?? [],
    };
    const nextRecord = editingRecord
      ? updateWaterTastingRecord(editingRecord, draft)
      : createWaterTastingRecord(draft);
    const nextRecords = sortWaterTastingsNewestFirst(
      editingRecord ? records.map(record => record.id === editingId ? nextRecord : record) : [...records, nextRecord],
    );
    const expectedRecords = expectedRecordsRef.current;
    if (!expectedRecords) {
      setFeedback({ kind: 'error', text: storageMessage('unavailable') });
      return;
    }
    const result = saveWaterTastings(nextRecords, expectedRecords);
    if (!result.ok) {
      setFeedback({ kind: 'error', text: storageMessage(result.error) });
      return;
    }
    expectedRecordsRef.current = nextRecords;
    setRecords(nextRecords);
    setEditingId(null);
    form.reset(emptyDraft());
    setFeedback({ kind: 'success', text: editingRecord ? 'Tasting updated in this browser.' : 'Tasting saved in this browser.' });
  }

  function deleteRecord(record: WaterTastingRecord) {
    if (!initialLoad.ok) {
      setFeedback({ kind: 'error', text: storageMessage(initialLoad.error) });
      return;
    }
    const nextRecords = records.filter(item => item.id !== record.id);
    const expectedRecords = expectedRecordsRef.current;
    if (!expectedRecords) {
      setFeedback({ kind: 'error', text: storageMessage('unavailable') });
      return;
    }
    const result = saveWaterTastings(nextRecords, expectedRecords);
    if (!result.ok) {
      setFeedback({ kind: 'error', text: storageMessage(result.error) });
      return;
    }
    expectedRecordsRef.current = nextRecords;
    setRecords(nextRecords);
    if (editingId === record.id) {
      setEditingId(null);
    form.reset(emptyDraft());
    }
    setFeedback({ kind: 'success', text: 'Tasting deleted from this browser.' });
  }

  return (
    <main id="water-tasting-panel" role="tabpanel" aria-labelledby="water-tasting-tab-button" tabIndex={0} className="app-card overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-800/70 text-slate-100 shadow-2xl shadow-slate-950/30" data-testid="water-tasting-tab">
      <div className="relative overflow-hidden border-b border-cyan-300/15 bg-gradient-to-br from-cyan-950/55 via-slate-900/75 to-indigo-950/35 px-5 py-7 sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute right-[-4rem] top-[-7rem] h-64 w-64 rounded-full border border-cyan-300/10" aria-hidden="true" />
        <div className="pointer-events-none absolute right-[-1rem] top-[-4rem] h-44 w-44 rounded-full border border-cyan-300/10" aria-hidden="true" />
        <div className={eyebrow}>Watermancer / Field notes</div>
        <div className="relative mt-3 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">Water Tasting</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              One water target. One brewed cup. Note what the water helped bring forward, in your own terms.
            </p>
          </div>
          <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium tracking-wide text-cyan-100">A personal observation, not a coffee score</span>
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
                  <h3 id="tasting-source-heading" className="font-semibold text-slate-100">Water target</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">Saved as context for this cup. It won’t change the prompts or your ratings.</p>
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
                        {(['Built-in', 'Alchemist', 'Watermancer', 'Saved'] as const).map(group => {
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
                {selectedProfileAnalysis && (
                  <div className="mt-5" data-testid="panel-tasting-profile-analysis">
                    {selectedProfileAnalysis}
                  </div>
                )}
                {editingRecord && profileOptions.some(option => option.sourceId === editingRecord.profileSourceId && option.name !== editingRecord.profileNameSnapshot) && (
                  <p className="mt-2 text-xs text-slate-400" data-testid="text-profile-snapshot">Originally saved as “{editingRecord.profileNameSnapshot}”. That name stays with this note.</p>
                )}
                {!profileOptions.some(option => option.group === 'Watermancer') && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
                    <span>No saved Watermancer targets yet. The other profiles are ready to use.</span>
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
                  <h3 id="tasting-coffee-heading" className="font-semibold text-slate-100">The cup <span className="ml-1 text-xs font-normal text-slate-400">· all optional</span></h3>
                  <p className="mt-1 text-xs text-slate-400">A few details to recognize this brew later.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 sm:pl-10">
                {([
                  ['name', 'Coffee name', 'e.g. Sunday morning blend'],
                  ['roast', 'Roast', 'e.g. Light'],
                  ['origin', 'Origin', 'e.g. Huila, Colombia'],
                  ['brewMethod', 'Brew method', 'e.g. V60'],
                ] as const).map(([key, label, placeholder]) => (
                  <label key={key} className="block space-y-2 text-xs font-semibold text-slate-300">
                    <span>{label}</span>
                    <Input {...form.register(`coffee.${key}`)} data-testid={`input-tasting-${key}`} placeholder={placeholder} className={inputStyle} />
                  </label>
                ))}
              </div>
            </section>

            <section aria-labelledby="tasting-ratings-heading" className="border-b border-slate-600/35 pb-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-500/40 bg-slate-700/35 font-mono text-xs text-slate-300">03</span>
                  <div>
                    <h3 id="tasting-ratings-heading" className="font-semibold text-slate-100">Water contribution</h3>
                    <p className="mt-1 max-w-lg text-xs leading-relaxed text-slate-400">Rate how well this water supported each quality in this cup. Leave anything unanswered if you’re not sure yet.</p>
                  </div>
                </div>
                <div className="min-w-32 rounded-lg border border-cyan-300/25 bg-cyan-950/30 px-4 py-2 text-right">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-200/75">Your impression</span>
                  <strong data-testid="value-tasting-total" className="mt-0.5 block font-mono text-xl font-semibold tabular-nums text-cyan-100">{total === null ? '— / 50' : `${total} / 50`}</strong>
                  <span className="block text-[10px] text-slate-400">{total === null ? 'All five to show total' : 'Five dimensions rated'}</span>
                </div>
              </div>
              <span
                role="status"
                aria-live="polite"
                aria-atomic="true"
                data-testid="announcement-tasting-total"
                className="sr-only"
              >
                {total === null
                  ? `${ratedCount} of 5 ratings selected. The total appears when all five are rated.`
                  : `Your impression total is ${total} out of 50.`}
              </span>
              <div className="mt-5 space-y-3 sm:pl-10">
                {WATER_TASTING_RATINGS.map(rating => (
                  <FormField key={rating.id} control={form.control} name={`ratings.${rating.id}`} render={({ field }) => (
                    <FormItem className="rounded-xl border border-slate-600/40 bg-slate-900/55 p-3.5 sm:p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <div>
                          <span className="text-sm font-semibold text-slate-100">{rating.label}</span>
                          <p id={`hint-rating-${rating.id}`} className="mt-1 text-xs leading-relaxed text-slate-400">{rating.prompt}</p>
                        </div>
                        <span data-testid={`value-rating-${rating.id}`} className="font-mono text-sm font-semibold tabular-nums text-cyan-200">{field.value === undefined ? 'Not rated' : `${field.value} / 10`}</span>
                      </div>
                      <div role="group" aria-label={`${rating.label} rating, 0 to 10`} aria-describedby={`hint-rating-${rating.id}`} className="mt-3 flex flex-wrap gap-1.5">
                        {Array.from({ length: 11 }, (_, score) => (
                          <button
                            key={score}
                            type="button"
                            aria-label={`${rating.label}: ${score} out of 10`}
                            aria-pressed={field.value === score}
                            onClick={() => { field.onChange(score); setFeedback(null); }}
                            data-testid={`button-rating-${rating.id}-${score}`}
                            className={`flex h-10 w-10 items-center justify-center rounded-md border font-mono text-xs font-semibold tabular-nums transition-colors sm:h-11 sm:w-11 ${field.value === score ? 'border-cyan-200 bg-cyan-300 text-slate-950' : 'border-slate-600/70 bg-slate-800/70 text-slate-300 hover:border-cyan-300/60 hover:text-cyan-100'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900`}
                          >{score}</button>
                        ))}
                        {field.value !== undefined && <button type="button" onClick={() => { field.onChange(undefined); setFeedback(null); }} data-testid={`button-clear-rating-${rating.id}`} className="min-h-10 rounded-md px-2 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Clear</button>}
                      </div>
                    </FormItem>
                  )} />
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500 sm:pl-10">Each dimension is equally weighted. This total reflects your impression, not an objective measurement or an official Q score.</p>
            </section>

            <section aria-labelledby="tasting-descriptors-heading" className="border-b border-slate-600/35 pb-8">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-500/40 bg-slate-700/35 font-mono text-xs text-slate-300">04</span>
                <div>
                  <h3 id="tasting-descriptors-heading" className="font-semibold text-slate-100">Words for the cup <span className="ml-1 text-xs font-normal text-slate-400">· optional</span></h3>
                  <p className="mt-1 text-xs text-slate-400">Choose any that fit. Descriptors never change the total.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 sm:pl-10">
                {WATER_TASTING_DESCRIPTORS.map(group => (
                  <details key={group.id} className="group rounded-xl border border-slate-600/45 bg-slate-900/35" data-testid={`group-descriptors-${group.id}`}>
                    <summary data-testid={`toggle-descriptors-${group.id}`} className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-slate-200 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-300 [&::-webkit-details-marker]:hidden">
                      <span>{group.label} <span className="ml-1 font-normal text-slate-500">({group.options.filter(option => selectedDescriptors.includes(option.id)).length} selected)</span></span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-cyan-300 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="flex flex-wrap gap-2 border-t border-slate-600/35 px-4 py-4">
                      {group.options.map(option => {
                        const selected = selectedDescriptors.includes(option.id);
                        return <button
                          key={option.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => form.setValue('descriptorIds', selected ? selectedDescriptors.filter(id => id !== option.id) : [...selectedDescriptors, option.id], { shouldDirty: true })}
                          data-testid={`button-descriptor-${option.id}`}
                          className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? 'border-cyan-300/65 bg-cyan-300/15 text-cyan-100' : 'border-slate-600/65 bg-slate-800/60 text-slate-300 hover:border-cyan-300/45'}`}
                        >{selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}{option.label}</button>;
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </section>

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
          <span data-testid="count-tasting-history" className="rounded-full border border-slate-600/50 px-3 py-1 font-mono text-xs text-slate-400">{records.length} {records.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        {records.length === 0 ? (
          <div data-testid="empty-tasting-history" className="mt-5 rounded-xl border border-dashed border-slate-600/70 bg-slate-900/35 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-200">No cups in the notebook yet.</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">Save a first observation above, even if you only have a few notes.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {records.map((record, index) => {
              const savedTotal = calculateWaterTastingTotal(record.ratings);
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
                  {savedTotal !== null && <div data-testid={`total-tasting-${record.id}`} className="rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 font-mono text-sm font-semibold tabular-nums text-cyan-100">{savedTotal} / 50</div>}
                </div>
                {record.descriptorIds.length > 0 && <div data-testid={`descriptors-tasting-${record.id}`} className="mt-4 flex flex-wrap gap-1.5">
                  {record.descriptorIds.map(id => <span key={id} className="rounded-full border border-slate-600/60 bg-slate-800/65 px-2.5 py-1 text-xs text-slate-300">{descriptorNames.get(id) ?? id}</span>)}
                </div>}
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-600/30 pt-4">
                  <button type="button" onClick={() => openRecord(record)} data-testid={`button-edit-tasting-${record.id}`} className={ghostButton}><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Open &amp; edit</button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button type="button" data-testid={`button-delete-tasting-${record.id}`} className={`${ghostButton} hover:border-rose-300/45 hover:text-rose-200`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Delete</button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl border-slate-600 bg-slate-900 text-slate-100">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this tasting?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-300">The note for {record.profileNameSnapshot} will be removed from this browser. This cannot be undone.</AlertDialogDescription>
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
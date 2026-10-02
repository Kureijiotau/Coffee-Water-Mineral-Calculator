import type { CSSProperties } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Check, ChevronDown } from 'lucide-react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  WATER_TASTING_AFFECTIVE_ATTRIBUTES,
  WATER_TASTING_DESCRIPTORS,
  WATER_TASTING_RATINGS,
  WATER_TASTING_SPECTRUM,
  calculateWaterTastingTotal,
  getWaterTastingAffectiveAnchors,
  getWaterTastingAffectiveColor,
  getWaterTastingAffectiveCue,
  type WaterTastingEditorValues,
} from './waterTasting';

interface WaterTastingScoringProps {
  mode: 'legacy' | 'cva';
  form: UseFormReturn<WaterTastingEditorValues>;
  onChange: () => void;
}

const sectionNumberClass =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-500/40 bg-slate-700/35 font-mono text-xs text-slate-300';

function formatSpectrumValue(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
}

function getScoreColor(mode: 'descriptive' | 'affective', value: number): string {
  if (mode === 'descriptive') {
    const saturation = 22 + (value / 15) * 45;
    const lightness = 72 - (value / 15) * 18;
    return `hsl(190 ${saturation}% ${lightness}%)`;
  }
  return getWaterTastingAffectiveColor('overall', value);
}

function AffectiveAssessment({
  form,
  onChange,
}: Pick<WaterTastingScoringProps, 'form' | 'onChange'>) {
  return (
    <section aria-labelledby="tasting-affective-heading" className="rounded-xl border border-cyan-300/20 bg-slate-950/30 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={sectionNumberClass}>03</span>
        <div>
          <h3 id="tasting-affective-heading" className="font-semibold text-slate-100">Water's effect on the cup</h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
            Rate what the water brings forward in this coffee. Leave any slider untouched to skip it.
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-3 sm:pl-10">
        {WATER_TASTING_AFFECTIVE_ATTRIBUTES.map(attribute => (
          <FormField
            key={attribute.id}
            control={form.control}
            name={`affective.${attribute.id}` as const}
            render={({ field }) => {
              const value = typeof field.value === 'number' ? field.value : undefined;
              const position = value ?? 5;
              const cue = value === undefined
                ? 'Choose a value to record your impression.'
                : getWaterTastingAffectiveCue(attribute.id, value) ?? '';
              const color = value === undefined
                ? '#94a3b8'
                : getWaterTastingAffectiveColor(attribute.id, value);
              const anchors = getWaterTastingAffectiveAnchors(attribute.id);
              const sliderStyle = {
                '--water-tasting-progress': `${((position - 1) / 8) * 100}%`,
                '--water-tasting-muted': getWaterTastingAffectiveColor(attribute.id, 1),
                '--water-tasting-active': color,
              } as CSSProperties;
              const scaleId = `scale-affective-${attribute.id}`;
              const anchorsId = `anchors-affective-${attribute.id}`;
              return (
                <FormItem className="rounded-xl border border-slate-600/40 bg-slate-900/55 p-3.5 sm:p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <FormLabel className="text-sm font-bold text-slate-100">{attribute.label}</FormLabel>
                    <span
                      data-testid={`value-affective-${attribute.id}`}
                      className="font-mono text-sm font-bold tabular-nums"
                      style={{ color }}
                    >
                      {value === undefined ? 'Not scored' : `${value} / 9`}
                    </span>
                  </div>
                   <p data-testid={`cue-affective-${attribute.id}`} className="mt-1 text-sm font-bold leading-relaxed" style={{ color }}>
                    {cue}
                  </p>
                  <div className="mt-3">
                    <div id={scaleId} className="flex justify-between gap-2 text-xs font-bold">
                      {anchors.map((anchor, index) => (
                        <span
                          key={anchor.value}
                          className={index === 1 ? 'text-center' : index === 2 ? 'text-right' : ''}
                          style={{ color: getWaterTastingAffectiveColor(attribute.id, anchor.value) }}
                        >
                          {anchor.value} · {anchor.label}
                        </span>
                      ))}
                    </div>
                    <FormControl>
                      <input
                        type="range"
                        min={1}
                        max={9}
                        step={1}
                        value={position}
                        onChange={event => {
                          field.onChange(Number(event.currentTarget.value));
                          onChange();
                        }}
                        aria-label={attribute.label}
                        aria-describedby={`${scaleId} ${anchorsId}`}
                        aria-valuetext={value === undefined
                          ? 'Not scored. Adjust to record your impression.'
                          : `${value} out of 9. ${cue}`}
                        data-testid={`input-affective-${attribute.id}`}
                        className="water-tasting-affective-range mt-1 h-6 w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                        style={sliderStyle}
                      />
                    </FormControl>
                  </div>
                  {value !== undefined && (
                    <button
                      type="button"
                      onClick={() => { field.onChange(undefined); onChange(); }}
                      data-testid={`button-clear-affective-${attribute.id}`}
                      className="mt-1 min-h-9 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                    >Clear score</button>
                  )}
                  <FormMessage />
                  <span id={anchorsId} className="sr-only">
                    {anchors.map(anchor => `${anchor.value}: ${anchor.label}`).join('. ')}
                  </span>
                </FormItem>
              );
            }}
          />
        ))}
      </div>
    </section>
  );
}

function DescriptorChoices({
  form,
  legacy,
}: {
  form: UseFormReturn<WaterTastingEditorValues>;
  legacy: boolean;
}) {
  const selectedDescriptors = form.watch('descriptorIds') ?? [];
  return (
    <section aria-labelledby="tasting-descriptors-heading" className={legacy ? 'border-b border-slate-600/35 pb-8' : 'mt-7'}>
      <div className="flex items-start gap-3">
        {legacy && <span className={sectionNumberClass}>05</span>}
        <div>
          <h3 id="tasting-descriptors-heading" className="font-semibold text-slate-100">
            Descriptors <span className="ml-1 text-xs font-normal text-slate-400">· optional</span>
          </h3>
          <p className="mt-1 text-xs text-slate-400">Choose any words that fit. Descriptors do not change your scores.</p>
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
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      form.setValue(
                        'descriptorIds',
                        selected ? selectedDescriptors.filter(id => id !== option.id) : [...selectedDescriptors, option.id],
                        { shouldDirty: true },
                      );
                    }}
                    data-testid={`button-descriptor-${option.id}`}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? 'border-cyan-300/65 bg-cyan-300/15 text-cyan-100' : 'border-slate-600/65 bg-slate-800/60 text-slate-300 hover:border-cyan-300/45'}`}
                  >{selected && <Check className="h-3.5 w-3.5" aria-hidden="true" />}{option.label}</button>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function LegacyAssessment({
  form,
  onChange,
}: Pick<WaterTastingScoringProps, 'form' | 'onChange'>) {
  const ratings = form.watch('ratings') ?? {};
  const total = calculateWaterTastingTotal(ratings);
  const ratedCount = WATER_TASTING_RATINGS.filter(({ id }) => (
    Number.isInteger(ratings[id])
    && Number(ratings[id]) >= 0
    && Number(ratings[id]) <= 10
  )).length;

  return (
    <>
      <section aria-labelledby="tasting-ratings-heading" className="border-b border-slate-600/35 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={sectionNumberClass}>03</span>
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
            <FormField key={rating.id} control={form.control} name={`ratings.${rating.id}` as const} render={({ field }) => (
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
                      onClick={() => { field.onChange(score); onChange(); }}
                      data-testid={`button-rating-${rating.id}-${score}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-md border font-mono text-xs font-semibold tabular-nums transition-colors sm:h-11 sm:w-11 ${field.value === score ? 'border-cyan-200 bg-cyan-300 text-slate-950' : 'border-slate-600/70 bg-slate-800/70 text-slate-300 hover:border-cyan-300/60 hover:text-cyan-100'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900`}
                    >{score}</button>
                  ))}
                  {field.value !== undefined && <button type="button" onClick={() => { field.onChange(undefined); onChange(); }} data-testid={`button-clear-rating-${rating.id}`} className="min-h-10 rounded-md px-2 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">Clear</button>}
                </div>
              </FormItem>
            )} />
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500 sm:pl-10">This original legacy total is retained only for notes created with the earlier scoring format.</p>
      </section>

      <section aria-labelledby="tasting-spectrum-heading" className="border-b border-slate-600/35 pb-8">
        <div className="flex items-start gap-3">
          <span className={sectionNumberClass}>04</span>
          <div>
            <h3 id="tasting-spectrum-heading" className="font-semibold text-slate-100">Cup shape <span className="ml-1 text-xs font-normal text-slate-400">· optional</span></h3>
            <p className="mt-1 text-xs text-slate-400">Original directional notes for this legacy tasting. These stay separate from the ratings above.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:pl-10">
          {WATER_TASTING_SPECTRUM.map(axis => (
            <FormField
              key={axis.id}
              control={form.control}
              name={`spectrum.${axis.id}` as const}
              render={({ field }) => {
                const value = typeof field.value === 'number' ? field.value : 0;
                const position = value === 0 ? 'Neutral' : value < 0 ? axis.leftLabel : axis.rightLabel;
                return (
                  <FormItem className="rounded-xl border border-slate-600/45 bg-slate-900/35 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <FormLabel className="text-sm font-medium text-slate-100">{axis.label}</FormLabel>
                      <span data-testid={`value-spectrum-${axis.id}`} className="font-mono text-xs tabular-nums text-cyan-200">
                        {formatSpectrumValue(value)} <span className="font-sans text-slate-400">· {position}</span>
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-x-2 gap-y-2">
                      <span className="text-xs leading-tight text-slate-400"><span className="font-mono">−5</span> · {axis.leftLabel}</span>
                      <span className="text-center text-[10px] text-slate-500"><span className="font-mono">0</span> · Neutral</span>
                      <span className="text-right text-xs leading-tight text-slate-400">{axis.rightLabel} · <span className="font-mono">+5</span></span>
                      <FormControl>
                        <input
                          type="range"
                          min={-5}
                          max={5}
                          step={1}
                          value={value}
                          onChange={event => {
                            field.onChange(Number(event.currentTarget.value));
                            form.setValue('legacySpectrumCaptured', true, { shouldDirty: true });
                            onChange();
                          }}
                          aria-label={`${axis.label}: ${axis.leftLabel} to ${axis.rightLabel}`}
                          aria-valuetext={`${position} (${formatSpectrumValue(value)})`}
                          data-testid={`input-spectrum-${axis.id}`}
                          className="col-span-3 h-5 w-full cursor-pointer accent-cyan-300"
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          ))}
        </div>
      </section>
      <DescriptorChoices form={form} legacy />
    </>
  );
}

export function WaterTastingScoring({ mode, form, onChange }: WaterTastingScoringProps) {
  if (mode === 'legacy') return <LegacyAssessment form={form} onChange={onChange} />;
  return <AffectiveAssessment form={form} onChange={onChange} />;
}
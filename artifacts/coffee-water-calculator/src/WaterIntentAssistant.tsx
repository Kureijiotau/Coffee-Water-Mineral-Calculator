import { useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, ChevronUp, Loader2, Sparkles, Wand2 } from 'lucide-react';
import type { IonId } from '@/waterData';

export type WaterAssistantResult = {
  workspace: 'alchemist' | 'watermancer';
  title: string;
  summary: string;
  ionTargets: Partial<Record<IonId, number>>;
  saltTargets: Record<string, number>;
};

type WaterIntentAssistantProps = {
  apiBase: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (result: WaterAssistantResult) => void;
};

const EXAMPLES = [
  'Bright, floral and tea-like with crisp clarity',
  'Sweet and round with more body but gentle alkalinity',
  'Clean, structured, low-bicarbonate water for light roast',
];

function labelWorkspace(workspace: WaterAssistantResult['workspace']): string {
  return workspace === 'watermancer' ? 'Watermancer · ion targets' : 'Alchemist · salt recipe';
}

export default function WaterIntentAssistant({ apiBase, open, onOpenChange, onApply }: WaterIntentAssistantProps) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<WaterAssistantResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'applied'>('idle');
  const [error, setError] = useState('');

  const submit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || status === 'loading') return;

    setStatus('loading');
    setError('');
    setResult(null);
    try {
      const response = await fetch(`${apiBase}/api/water-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : 'The water assistant could not respond.');
      }
      setResult(payload as WaterAssistantResult);
      setStatus('idle');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The water assistant could not respond.');
      setStatus('error');
    }
  };

  const apply = () => {
    if (!result) return;
    onApply(result);
    setStatus('applied');
  };

  if (!open) {
    return null;
  }

  return (
    <section className="app-card overflow-hidden rounded-2xl border border-fuchsia-300/25 bg-gradient-to-br from-fuchsia-950/55 via-slate-900/85 to-indigo-950/70 shadow-xl shadow-fuchsia-950/15">
      <div className="border-b border-fuchsia-200/10 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="mt-0.5 rounded-lg border border-fuchsia-200/20 bg-fuchsia-300/10 p-1.5 text-fuchsia-200">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fuchsia-200/75">Water design assistant</div>
              <h2 className="mt-1 text-sm font-semibold text-white">Describe the water you want</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
                Gemini chooses the right workspace, then the calculator turns the interpretation into real ions and salt amounts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-medium text-slate-400">
              One request on submit
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-expanded="true"
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/15 px-2 py-1.5 text-[10px] font-semibold text-slate-400 transition hover:border-white/25 hover:bg-white/10 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-fuchsia-200/60"
            >
              Hide
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map(example => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setPrompt(example);
                setResult(null);
                setStatus('idle');
                setError('');
              }}
              className="rounded-full border border-fuchsia-200/15 bg-slate-950/25 px-2.5 py-1 text-left text-[10px] text-slate-400 transition hover:border-fuchsia-200/35 hover:bg-fuchsia-300/10 hover:text-fuchsia-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-200/60"
            >
              {example}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Describe your desired water</span>
            <textarea
              value={prompt}
              onChange={event => {
                setPrompt(event.target.value);
                if (status === 'applied' || status === 'error') setStatus('idle');
              }}
              onKeyDown={event => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                  event.preventDefault();
                  void submit();
                }
              }}
              maxLength={1200}
              rows={3}
              placeholder="e.g. Clear and floral for a light roast, with enough sweetness to keep it balanced"
              className="min-h-20 w-full resize-y rounded-xl border border-slate-700/80 bg-slate-950/55 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-fuchsia-300/60 focus:ring-2 focus:ring-fuchsia-300/15"
            />
            <span className="mt-1 block text-right text-[10px] text-slate-600">{prompt.length}/1200</span>
          </label>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!prompt.trim() || status === 'loading'}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-fuchsia-200/35 bg-fuchsia-300/15 px-4 py-2.5 text-sm font-semibold text-fuchsia-100 transition hover:-translate-y-0.5 hover:border-fuchsia-200/60 hover:bg-fuchsia-300/25 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-fuchsia-200/70 focus:ring-offset-2 focus:ring-offset-slate-900"
          >
            {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4" aria-hidden="true" />}
            {status === 'loading' ? 'Designing…' : 'Generate plan'}
          </button>
        </div>

        {status === 'error' && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-fuchsia-200/20 bg-slate-950/35 p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-fuchsia-200/20 bg-fuchsia-300/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fuchsia-100">
                    {labelWorkspace(result.workspace)}
                  </span>
                  <span className="text-[10px] text-slate-500">Preview</span>
                </div>
                <h3 className="mt-2 text-sm font-semibold text-white">{result.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-300">{result.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                  <span className="rounded-full bg-white/5 px-2 py-1">{Object.keys(result.ionTargets ?? {}).length} ion targets</span>
                  {result.workspace === 'alchemist' && (
                    <span className="rounded-full bg-white/5 px-2 py-1">{Object.keys(result.saltTargets ?? {}).length} salt inputs</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={apply}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-300/35 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-200/60 hover:bg-emerald-300/20 focus:outline-none focus:ring-2 focus:ring-emerald-200/70"
              >
                {status === 'applied' ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                {status === 'applied' ? 'Applied' : 'Apply to calculator'}
              </button>
            </div>
            <p className="mt-3 border-t border-white/5 pt-2 text-[10px] leading-relaxed text-slate-500">
              The chemistry engine calculates the final doses. Review the result before preparing water.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
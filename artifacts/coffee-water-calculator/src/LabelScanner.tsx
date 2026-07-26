import { useCallback, useRef, useState } from 'react';
import { createWorker } from 'tesseract.js';
import { Camera, Loader2, Check, X, AlertTriangle, ScanLine } from 'lucide-react';
import { ION_MAP, type IonId } from '@/waterData';

const ACTIVE_ION_IDS: IonId[] = ['sodium','potassium','magnesium','calcium','chloride','sulfate','bicarbonate','citrates'];

/**
 * Map of human-readable label keywords to our internal ion IDs.
 * Order matters — more specific patterns (e.g. "hydrogen carbonate") before shorter ones.
 */
const LABEL_PATTERNS: { keywords: string[]; id: IonId }[] = [
  { keywords: ['hydrogen carbonate', 'hydrogencarbonate', 'bicarbonate', 'bicarbonato', 'bicarb'],      id: 'bicarbonate' },
  { keywords: ['sodium', 'natrium', 'na⁺', 'na+', 'na '],                                              id: 'sodium' },
  { keywords: ['potassium', 'kalium', 'k⁺', 'k+', 'k '],                                               id: 'potassium' },
  { keywords: ['magnesium', 'magnesio', 'mg²⁺', 'mg++', 'mg⁺⁺', 'mg+', 'mg '],                         id: 'magnesium' },
  { keywords: ['calcium', 'calcio', 'ca²⁺', 'ca++', 'ca⁺⁺', 'ca+', 'ca '],                             id: 'calcium' },
  { keywords: ['chloride', 'chlorid', 'cloruro', 'cl⁻', 'cl-', 'cl '],                                 id: 'chloride' },
  { keywords: ['sulfate', 'sulphate', 'sulfate ion', 'sulfato', 'so₄²⁻', 'so4²⁻', 'so4--', 'so₄--', 'so₄', 'so4'], id: 'sulfate' },
  { keywords: ['citrate', 'citrato', 'citric', 'c₆h₅o₇³⁻', 'c6h5o7'],                                  id: 'citrates' },
  { keywords: ['carbonate', 'carbonato', 'co₃²⁻', 'co3²⁻', 'co3--', 'co₃--'],                          id: 'carbonate' },
];

interface ScannedValue {
  id: IonId;
  label: string;
  value: number;
}

interface Props {
  onExtracted: (values: Partial<Record<IonId, string>>) => void;
  disabled?: boolean;
}

// Regex helpers — match numbers that could be ion concentrations
const NUM_RE = /(\d+(?:[.,]\d+)?)\s*(?:mg\/[lL]|mg\.L|ppm|mg\/l)?/;

/** Try to locate a number near a keyword match in the OCR text. */
function findValue(text: string, keywords: string[]): number | null {
  const lower = text.toLowerCase();
  // Try each keyword variant
  for (const kw of keywords) {
    let idx = lower.indexOf(kw);
    if (idx === -1) {
      // Also try without superscript unicode chars
      const ascii = kw.replace(/[⁺⁻²³¹]/g, '').trim();
      if (ascii.length >= 2) idx = lower.indexOf(ascii);
    }
    if (idx === -1) continue;

    // Search ±80 chars around the match for a number
    const start = Math.max(0, idx - 80);
    const end = Math.min(lower.length, idx + kw.length + 80);
    const window = lower.slice(start, end);

    const m = window.match(NUM_RE);
    if (m) {
      // Parse with comma → dot for European decimal
      return parseFloat(m[1].replace(',', '.'));
    }
  }
  return null;
}

/** Attempt to identify all known ions in the OCR text. */
function parseOcrText(text: string): ScannedValue[] {
  const results: ScannedValue[] = [];
  const seen = new Set<IonId>();

  for (const pattern of LABEL_PATTERNS) {
    const value = findValue(text, pattern.keywords);
    if (value !== null && !seen.has(pattern.id)) {
      seen.add(pattern.id);
      const ion = ION_MAP[pattern.id];
      results.push({ id: pattern.id, label: ion?.name ?? pattern.id, value });
    }
  }
  return results;
}

export default function LabelScanner({ onExtracted, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ScannedValue[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleScan = useCallback((file: File) => {
    setState('scanning');
    setProgress(0);
    setErrorMsg('');

    (async () => {
      // We only need English for mineral labels
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round((m.progress ?? 0) * 100));
          }
        },
      });

      try {
        const { data } = await worker.recognize(file);
        const text = data.text;
        if (!text.trim()) {
          setErrorMsg("Couldn't read any text from the image. Try a clearer photo with the label flat and well-lit.");
          setState('error');
          return;
        }

        const parsed = parseOcrText(text);
        if (parsed.length === 0) {
          setErrorMsg(
            "Found text but couldn't identify any mineral values. " +
            "Make sure the nutrition/mineral panel is visible. " +
            "You can still enter values manually below.",
          );
          setState('error');
          return;
        }

        setResults(parsed);
        setState('done');
      } catch (err) {
        setErrorMsg('OCR processing failed. Try again with a different photo.');
        setState('error');
      } finally {
        await worker.terminate();
      }
    })();
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleScan(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  }, [handleScan]);

  const applyResults = useCallback(() => {
    const vals: Partial<Record<IonId, string>> = {};
    for (const r of results) {
      vals[r.id] = String(r.value);
    }
    onExtracted(vals);
    reset();
  }, [results, onExtracted]);

  const reset = useCallback(() => {
    setState('idle');
    setProgress(0);
    setResults([]);
    setErrorMsg('');
  }, []);

  if (state === 'scanning') {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
        <div className="w-full max-w-48 bg-slate-700/50 rounded-full h-1.5">
          <div className="bg-sky-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.max(5, progress)}%` }} />
        </div>
        <span className="text-xs text-slate-400">Reading label... {progress}%</span>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <Check className="w-4 h-4" />
          <span className="font-medium">Found {results.length} values</span>
          <button onClick={reset} className="ml-auto text-slate-400 hover:text-slate-200 underline">discard</button>
        </div>
        <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-1.5">
          {results.map(r => (
            <div key={r.id} className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">
              <Check className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="text-xs text-slate-200">{ION_MAP[r.id]?.formula ?? r.label}</span>
              <span className="text-xs font-semibold text-emerald-200 ml-auto">{r.value} mg/L</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={applyResults}
            className="flex items-center gap-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3 py-1.5 transition"
          >
            <Check className="w-3.5 h-3.5" />
            Fill in mineral water
          </button>
          <button
            onClick={reset}
            className="text-xs text-slate-400 hover:text-slate-200 underline"
          >
            Cancel
          </button>
        </div>
        <p className="text-[11px] text-slate-500">Double-check the values — OCR isn't perfect on curved or glossy labels.</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
        <button
          onClick={reset}
          className="text-xs text-slate-400 hover:text-slate-200 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // idle
  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
        className="flex items-center gap-1.5 text-xs bg-slate-700/40 hover:bg-slate-600/50 disabled:opacity-40 text-slate-300 hover:text-slate-100 rounded-lg px-3 py-1.5 transition border border-slate-600/40"
      >
        <ScanLine className="w-3.5 h-3.5" />
        Scan label
      </button>
    </div>
  );
}

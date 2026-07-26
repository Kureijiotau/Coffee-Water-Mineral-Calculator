import { useCallback, useRef, useState } from 'react';
import { Camera, Loader2, Check, X, AlertTriangle, ScanLine } from 'lucide-react';
import { ION_MAP, type IonId } from '@/waterData';

// On Replit, the proxy routes /api/* to the API server automatically.
// On your own hosting (Vercel etc.), set VITE_API_URL to the Replit workspace URL
// so scans reach the API server running on Replit.
const API_BASE = (import.meta as Record<string, any>).env?.VITE_API_URL ?? '';

interface ScannedValue {
  id: IonId;
  label: string;
  value: number;
}

interface Props {
  onExtracted: (values: Partial<Record<IonId, string>>) => void;
  disabled?: boolean;
}

export default function LabelScanner({ onExtracted, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'scanning' | 'done' | 'error'>('idle');
  const [results, setResults] = useState<ScannedValue[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleScan = useCallback(async (file: File) => {
    setState('scanning');
    setErrorMsg('');

    try {
      // Convert file to base64
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip the data:... prefix — keep only the raw base64
          const comma = result.indexOf(',');
          resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resp = await fetch(`${API_BASE}/api/scan-label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: b64 }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setErrorMsg(data.error ?? 'Scan failed. Try a clearer photo.');
        setState('error');
        return;
      }

      const vals: ScannedValue[] = [];
      for (const [id, val] of Object.entries(data.values ?? {})) {
        if (typeof val === 'number' && ION_MAP[id as IonId]) {
          // Negative values mean "< X" (less than)
          vals.push({ id: id as IonId, label: ION_MAP[id as IonId].name, value: val });
        }
      }

      if (vals.length === 0) {
        setErrorMsg("Couldn't identify any mineral values on that label.");
        setState('error');
        return;
      }

      setResults(vals);
      setState('done');
    } catch (err) {
      setErrorMsg('Failed to reach the scanner. Is the API server running?');
      setState('error');
    }
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleScan(file);
    e.target.value = '';
  }, [handleScan]);

  const applyResults = useCallback(() => {
    const vals: Partial<Record<IonId, string>> = {};
    for (const r of results) {
      // Negative = "< X" — skip these or set a lower bound note
      if (r.value < 0) continue;
      vals[r.id] = String(r.value);
    }
    onExtracted(vals);
    reset();
  }, [results, onExtracted]);

  const reset = useCallback(() => {
    setState('idle');
    setResults([]);
    setErrorMsg('');
  }, []);

  if (state === 'scanning') {
    return (
      <div className="flex flex-col items-center gap-2 py-3">
        <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
        <span className="text-xs text-slate-400">Analyzing label with AI...</span>
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
              <span className="text-xs font-semibold text-emerald-200 ml-auto">
                {r.value < 0 ? `<${Math.abs(r.value)}` : `${r.value}`} mg/L
              </span>
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
          <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-200 underline">
            Cancel
          </button>
        </div>
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
        <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-200 underline">
          Try again
        </button>
      </div>
    );
  }

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

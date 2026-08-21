import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Coffee, Sparkles, X } from 'lucide-react';
import { inferTasteProfile, type TasteInference, type TastePreferenceAnswers } from './tastePreference';

interface Props {
  onClose: () => void;
  onApply: (inference: TasteInference) => void;
}

const initialAnswers: TastePreferenceAnswers = {
  roast: 'light', process: 'washed', taste: 'balanced',
  acidity: 'bright', body: 'medium', brewMethod: 'pourover',
};

const questions = [
  { key: 'roast', title: 'How dark is the roast?', description: 'Roast development changes how much extraction and buffering the coffee needs.', options: [['light', 'Light / Nordic'], ['medium', 'Medium'], ['dark', 'Medium-dark / dark']] },
  { key: 'process', title: 'How was the coffee processed?', description: 'Processing changes how much the water should emphasize clarity, fruit, or restraint.', options: [['washed', 'Washed'], ['natural', 'Natural / dry'], ['honey', 'Honey / pulped natural'], ['coferment', 'Co-ferment / anaerobic']] },
  { key: 'taste', title: 'What do you want more of?', description: 'Pick the cup character you reach for most often.', options: [['clarity', 'Clarity and sparkling acidity'], ['sweetness', 'Sweetness and balance'], ['body', 'Body and syrupy texture'], ['balanced', 'A little of everything']] },
  { key: 'acidity', title: 'Where should acidity land?', description: 'This tunes the buffer level, which controls how sharp or rounded the cup feels.', options: [['bright', 'Bright and lively'], ['round', 'Round but present'], ['soft', 'Soft and mellow']] },
  { key: 'body', title: 'How much body do you prefer?', description: 'This adjusts calcium, chloride, and total mineral strength.', options: [['light', 'Light and tea-like'], ['medium', 'Medium and silky'], ['full', 'Full and coating']] },
  { key: 'brewMethod', title: 'How do you usually brew it?', description: 'A final extraction adjustment keeps the recommendation practical for your setup.', options: [['pourover', 'Pour-over'], ['immersion', 'Immersion / AeroPress'], ['espresso', 'Espresso']] },
] as const;

export default function TastePreferenceModal({ onClose, onApply }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<TastePreferenceAnswers>(initialAnswers);
  const [result, setResult] = useState<TasteInference | null>(null);
  const question = questions[step];
  const isLast = step === questions.length - 1;

  const select = (value: string) => {
    setAnswers(prev => ({ ...prev, [question.key]: value } as TastePreferenceAnswers));
  };

  const next = () => {
    if (isLast) setResult(inferTasteProfile(answers));
    else setStep(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl max-h-[90vh] overflow-hidden bg-slate-800 rounded-2xl border border-slate-700/70 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-700/50 bg-gradient-to-r from-violet-600/30 to-sky-500/20">
          <div className="flex gap-3">
            <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300"><Sparkles className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Build a starting recipe</h2>
              <p className="text-xs text-slate-400 mt-1">Answer a few coffee questions to get a mineral recipe you can tune in Brewer mode.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 p-1"><X className="w-5 h-5" /></button>
        </div>

        {!result ? (
          <>
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
                <span>Question {step + 1} of {questions.length}</span><span>{Math.round(((step + 1) / questions.length) * 100)}%</span>
              </div>
              <div className="h-1 mt-2 rounded-full bg-slate-700 overflow-hidden"><div className="h-full bg-violet-400 transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div>
            </div>
            <div className="overflow-y-auto px-6 py-6">
              <h3 className="text-xl font-semibold text-slate-100">{question.title}</h3>
              <p className="text-sm text-slate-400 mt-2">{question.description}</p>
              <div className="grid gap-2 mt-6">
                {question.options.map(([value, label]) => (
                  <button key={value} onClick={() => select(value)} className={`text-left rounded-xl border px-4 py-3 transition ${answers[question.key] === value ? 'border-violet-400 bg-violet-500/15 text-violet-100' : 'border-slate-700 bg-slate-900/30 text-slate-300 hover:border-slate-500 hover:bg-slate-700/50'}`}>
                    <span className={`inline-block w-3 h-3 rounded-full border mr-3 align-[-1px] ${answers[question.key] === value ? 'border-violet-300 bg-violet-300' : 'border-slate-500'}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
              <button onClick={() => step > 0 ? setStep(prev => prev - 1) : onClose()} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"><ArrowLeft className="w-4 h-4" /> {step > 0 ? 'Back' : 'Cancel'}</button>
              <button onClick={next} className="flex items-center gap-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg px-4 py-2">{isLast ? 'Show my profile' : 'Next'} {isLast ? <Sparkles className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}</button>
            </div>
          </>
        ) : (
          <div className="overflow-y-auto px-6 py-6">
            <div className="flex items-center gap-2 text-violet-300"><Coffee className="w-4 h-4" /><span className="text-xs uppercase tracking-widest font-semibold">Your recipe starting point</span></div>
            <h3 className="text-xl font-semibold text-slate-100 mt-3">{result.title}</h3>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">{result.summary}</p>
            <p className="mt-3 rounded-lg border border-amber-400/20 bg-amber-500/[0.08] px-3 py-2 text-xs leading-relaxed text-amber-100">
              This is a tunable starting point, not a guaranteed best recipe. Applying it will replace the current Brewer mineral recipe.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-5">
              {([['Mg', result.profile.magnesium], ['Ca', result.profile.calcium], ['SO₄', result.profile.sulfate], ['Cl', result.profile.chloride], ['HCO₃', result.profile.bicarbonate], ['Na', result.profile.sodium]] as const).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-900/50 border border-slate-700/50 px-3 py-2"><div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div><div className="font-mono text-sm text-sky-300 mt-1">{value} <span className="text-[10px] text-slate-500">ppm</span></div></div>
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {result.rationale.map((item, index) => <p key={index} className="text-xs text-slate-400 leading-relaxed"><span className="text-violet-300 mr-2">·</span>{item}</p>)}
            </div>
            <div className="flex items-center justify-between gap-3 mt-6">
              <button onClick={() => setResult(null)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"><ArrowLeft className="w-4 h-4" /> Adjust answers</button>
              <button onClick={() => onApply(result)} className="flex items-center gap-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg px-4 py-2"><Check className="w-4 h-4" /> Apply starting recipe</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
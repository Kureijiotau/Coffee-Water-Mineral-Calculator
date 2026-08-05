import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Beaker,
  Check,
  ChevronDown,
  CircleHelp,
  Droplets,
  FlaskConical,
  Info,
  LockKeyhole,
  Sparkles,
  Target,
} from 'lucide-react';
import { computeGH, computeIonTotals, computeKH, SALTS } from './waterData';

export type Week1Recipe = {
  id: string;
  targets: Record<string, number>;
  formIdx: Record<string, number>;
};

type Week1GuideProps = {
  onApplyRecipe: (recipe: Week1Recipe) => void;
};

type Week1Day = {
  day: number;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  prompt: string;
  note: string;
  learningNote: string;
  targets: Record<string, number>;
  formIdx: Record<string, number>;
  displayTargets: Record<string, string>;
};

const styles = `
  .week1-shell {
    --week1-ink: #08151b;
    --week1-panel: #102b32;
    --week1-line: rgba(151, 223, 215, .16);
    --week1-line-strong: rgba(151, 223, 215, .28);
    --week1-text: #e8f6f2;
    --week1-muted: #8ca9ab;
    --week1-faint: #607d81;
    --week1-cyan: #8ee4dc;
    --week1-cyan-soft: #c6faf0;
    --week1-emerald: #5dd4a4;
    --week1-indigo: #9fa9ff;
    position: relative;
    overflow: hidden;
    width: 100%;
    padding: 28px clamp(16px, 3vw, 38px) 34px;
    color: var(--week1-text);
    background:
      radial-gradient(circle at 87% 8%, rgba(57, 103, 167, .18), transparent 29%),
      radial-gradient(circle at 12% 96%, rgba(24, 130, 118, .12), transparent 34%),
      var(--week1-ink);
    font-family: "DM Sans", "Trebuchet MS", sans-serif;
  }
  .week1-shell *, .week1-shell *::before, .week1-shell *::after { box-sizing: border-box; }
  .week1-frame { width: min(1100px, 100%); margin: 0 auto; position: relative; }
  .week1-frame::before {
    content: "";
    position: absolute;
    inset: -28px -7% auto;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(142,228,220,.35), transparent);
    opacity: .7;
  }
  .week1-topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 22px; }
  .week1-kicker { display: flex; align-items: center; gap: 10px; color: var(--week1-cyan); font: 700 10px/1 "Space Mono", monospace; letter-spacing: .16em; }
  .week1-kicker-mark { width: 27px; height: 27px; display: grid; place-items: center; border: 1px solid rgba(142,228,220,.4); border-radius: 8px; background: rgba(142,228,220,.08); }
  .week1-kicker-mark svg { width: 14px; height: 14px; }
  .week1-top-note { color: var(--week1-faint); font: 10px/1.4 "Space Mono", monospace; letter-spacing: .1em; text-align: right; text-transform: uppercase; }
  .week1-top-note strong { color: var(--week1-muted); font-weight: 500; }
  .week1-header { display: flex; justify-content: space-between; align-items: end; gap: 28px; margin-bottom: 27px; }
  .week1-header h2 { margin: 0 0 10px; color: var(--week1-text); font: 500 clamp(30px, 4vw, 48px)/.98 "Bricolage Grotesque", "Trebuchet MS", sans-serif; letter-spacing: -.045em; }
  .week1-header p { margin: 0; max-width: 535px; color: var(--week1-muted); font-size: 13px; line-height: 1.65; }
  .week1-lesson-badge { flex: 0 0 auto; display: flex; align-items: center; gap: 9px; padding: 10px 13px; color: var(--week1-cyan-soft); border: 1px solid rgba(142,228,220,.25); border-radius: 10px; background: rgba(16, 58, 63, .52); font: 600 10px/1 "Space Mono", monospace; letter-spacing: .08em; text-transform: uppercase; }
  .week1-lesson-badge svg { color: var(--week1-emerald); width: 14px; height: 14px; }
  .week1-rail { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 18px; padding: 15px 17px 14px; border: 1px solid var(--week1-line); border-radius: 14px; background: rgba(13, 32, 39, .77); box-shadow: 0 16px 46px rgba(0,0,0,.12); }
  .week1-step { min-width: 0; appearance: none; border: 0; padding: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
  .week1-step:focus-visible, .week1-button:focus-visible, .week1-recipe-button:focus-visible, .week1-summary:focus-visible, .week1-source:focus-visible { outline: 2px solid var(--week1-cyan); outline-offset: 3px; }
  .week1-step-line { height: 3px; border-radius: 99px; background: rgba(140,169,171,.17); margin-bottom: 11px; transition: background .2s ease, transform .2s ease; }
  .week1-step:hover .week1-step-line { transform: translateY(-1px); background: rgba(142,228,220,.35); }
  .week1-step.active .week1-step-line, .week1-step.done .week1-step-line { background: var(--week1-cyan); }
  .week1-step.active .week1-step-number { background: var(--week1-cyan); color: var(--week1-ink); border-color: var(--week1-cyan); }
  .week1-step.done .week1-step-number { border-color: rgba(93,212,164,.7); color: var(--week1-emerald); }
  .week1-step-number { width: 22px; height: 22px; display: grid; place-items: center; margin-bottom: 8px; border: 1px solid rgba(140,169,171,.3); border-radius: 50%; color: var(--week1-muted); font: 11px/1 "Space Mono", monospace; transition: color .2s ease, background .2s ease, border-color .2s ease; }
  .week1-step-label { display: block; overflow: hidden; color: var(--week1-faint); font: 9px/1.2 "Space Mono", monospace; letter-spacing: .08em; text-overflow: ellipsis; white-space: nowrap; }
  .week1-step.active .week1-step-label { color: var(--week1-cyan); }
  .week1-step-title { display: block; overflow: hidden; margin-top: 5px; color: var(--week1-muted); font-size: 11px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
  .week1-step.active .week1-step-title { color: var(--week1-text); }
  .week1-content { display: grid; grid-template-columns: minmax(0, 1.24fr) minmax(280px, .76fr); gap: 14px; }
  .week1-card { border: 1px solid var(--week1-line); border-radius: 16px; background: rgba(16, 43, 50, .88); box-shadow: 0 18px 50px rgba(0,0,0,.13); }
  .week1-recipe { padding: 23px; }
  .week1-card-heading { display: flex; justify-content: space-between; align-items: start; gap: 18px; margin-bottom: 21px; }
  .week1-eyebrow { color: var(--week1-cyan); font: 700 10px/1.2 "Space Mono", monospace; letter-spacing: .12em; }
  .week1-card h3 { margin: 8px 0 0; color: var(--week1-text); font: 500 24px/1.1 "Bricolage Grotesque", sans-serif; letter-spacing: -.025em; }
  .week1-target { display: flex; align-items: center; gap: 8px; color: var(--week1-muted); font-size: 11px; white-space: nowrap; }
  .week1-target svg { color: var(--week1-emerald); width: 15px; height: 15px; }
  .week1-mineral-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 17px; }
  .week1-summary { appearance: none; width: 100%; border: 1px solid rgba(142,228,220,.16); border-radius: 11px; padding: 13px 15px; color: var(--week1-text); background: rgba(4, 19, 25, .3); text-align: left; cursor: default; }
  .week1-summary-label { display: block; margin-bottom: 10px; color: var(--week1-muted); font: 10px/1 "Space Mono", monospace; letter-spacing: .1em; text-transform: uppercase; }
  .week1-summary-value { display: flex; align-items: baseline; gap: 6px; color: var(--week1-cyan-soft); font: 500 26px/1 "Space Mono", monospace; letter-spacing: -.08em; }
  .week1-summary-value small { color: var(--week1-muted); font: 11px/1 "DM Sans", sans-serif; letter-spacing: 0; }
  .week1-table { border-top: 1px solid var(--week1-line); }
  .week1-table-head, .week1-ingredient { display: grid; grid-template-columns: minmax(0, 1.4fr) .72fr .72fr; gap: 16px; align-items: center; }
  .week1-table-head { padding: 13px 7px 10px; color: var(--week1-faint); font: 9px/1 "Space Mono", monospace; letter-spacing: .1em; text-transform: uppercase; }
  .week1-ingredient { padding: 14px 7px; border-top: 1px solid rgba(151,223,215,.1); }
  .week1-ingredient-name { display: flex; min-width: 0; align-items: center; gap: 11px; }
  .week1-ingredient-icon { width: 32px; height: 32px; display: grid; flex: 0 0 auto; place-items: center; border: 1px solid rgba(142,228,220,.18); border-radius: 9px; background: rgba(142,228,220,.07); color: var(--week1-cyan); }
  .week1-ingredient-icon svg { width: 15px; height: 15px; }
  .week1-ingredient-name strong { display: block; color: var(--week1-text); font-size: 13px; font-weight: 600; line-height: 1.3; }
  .week1-ingredient-name span { display: block; margin-top: 4px; color: var(--week1-faint); font-size: 11px; line-height: 1.3; }
  .week1-amount { color: var(--week1-text); font: 600 12px/1.2 "Space Mono", monospace; }
  .week1-amount small { display: block; margin-top: 5px; color: var(--week1-faint); font: 10px/1 "DM Sans", sans-serif; }
  .week1-amount.accent { color: var(--week1-cyan-soft); }
  .week1-table-foot { display: flex; gap: 8px; align-items: center; margin-top: 16px; padding: 12px 13px; border-radius: 9px; background: rgba(93, 212, 164, .07); color: #a5c9c3; font-size: 11px; line-height: 1.45; }
  .week1-table-foot svg { flex: 0 0 auto; color: var(--week1-emerald); width: 14px; height: 14px; }
  .week1-side { display: flex; flex-direction: column; gap: 14px; }
  .week1-learning { position: relative; overflow: hidden; padding: 24px; background: linear-gradient(145deg, rgba(39, 48, 104, .83), rgba(20, 48, 60, .92)); }
  .week1-learning::after { content: ""; position: absolute; width: 160px; height: 160px; right: -54px; top: -54px; border: 1px solid rgba(159,169,255,.24); border-radius: 50%; box-shadow: 0 0 0 20px rgba(159,169,255,.035), 0 0 0 42px rgba(159,169,255,.025); pointer-events: none; }
  .week1-learning > * { position: relative; z-index: 1; }
  .week1-prompt-mark { width: 35px; height: 35px; display: grid; place-items: center; margin-bottom: 20px; border-radius: 10px; color: #c9ceff; background: rgba(159,169,255,.13); }
  .week1-prompt-mark svg { width: 17px; height: 17px; }
  .week1-learning h4 { max-width: 270px; margin: 0 0 13px; color: #f0f0ff; font: 500 22px/1.1 "Bricolage Grotesque", sans-serif; letter-spacing: -.025em; }
  .week1-learning p { margin: 0; color: #b6c1d1; font-size: 12px; line-height: 1.65; }
  .week1-learning strong { color: #e4e7ff; font-weight: 600; }
  .week1-prompt-answer { display: flex; gap: 9px; align-items: start; margin-top: 20px; padding-top: 17px; border-top: 1px solid rgba(196, 202, 255, .17); color: #b6c1d1; font-size: 11px; line-height: 1.5; }
  .week1-prompt-answer svg { flex: 0 0 auto; margin-top: 1px; color: var(--week1-indigo); width: 14px; height: 14px; }
  .week1-note { padding: 20px 22px; }
  .week1-note-head { display: flex; align-items: center; gap: 9px; margin-bottom: 11px; color: var(--week1-muted); font: 10px/1 "Space Mono", monospace; letter-spacing: .1em; text-transform: uppercase; }
  .week1-note-head svg { color: var(--week1-cyan); width: 14px; height: 14px; }
  .week1-note p { margin: 0; color: #b3c8c7; font-size: 12px; line-height: 1.58; }
  .week1-note p em { color: var(--week1-cyan-soft); font-style: normal; }
  .week1-details { margin-top: 13px; border-top: 1px solid var(--week1-line); }
  .week1-details summary { list-style: none; }
  .week1-details summary::-webkit-details-marker { display: none; }
  .week1-summary-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-top: 13px; color: var(--week1-faint); font-size: 11px; cursor: pointer; }
  .week1-summary-row svg { width: 14px; height: 14px; transition: transform .2s ease; }
  .week1-details[open] .week1-summary-row svg { transform: rotate(180deg); }
  .week1-detail-copy { padding: 10px 0 0; color: var(--week1-muted); font-size: 11px; line-height: 1.55; }
  .week1-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 19px; }
  .week1-button { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; border: 1px solid var(--week1-line-strong); border-radius: 9px; padding: 0 14px; color: var(--week1-muted); background: rgba(12, 29, 35, .65); font: 600 11px/1 "DM Sans", sans-serif; cursor: pointer; transition: background .2s ease, border-color .2s ease, color .2s ease, transform .2s ease; }
  .week1-button:hover:not(:disabled) { border-color: rgba(142,228,220,.5); color: var(--week1-text); background: rgba(142,228,220,.1); transform: translateY(-1px); }
  .week1-button:disabled { opacity: .4; cursor: not-allowed; }
  .week1-button svg { width: 14px; height: 14px; }
  .week1-recipe-button { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 42px; border: 1px solid var(--week1-cyan); border-radius: 9px; padding: 0 17px; color: var(--week1-ink); background: var(--week1-cyan); font: 700 11px/1 "DM Sans", sans-serif; cursor: pointer; box-shadow: 0 7px 20px rgba(70, 186, 172, .18); transition: background .2s ease, transform .2s ease; }
  .week1-recipe-button:hover { background: var(--week1-cyan-soft); transform: translateY(-1px); }
  .week1-recipe-button.applied { border-color: var(--week1-emerald); color: #06251e; background: var(--week1-emerald); }
  .week1-recipe-button svg { width: 15px; height: 15px; }
  .week1-bottom { display: flex; justify-content: space-between; gap: 16px; margin-top: 16px; color: var(--week1-faint); font: 10px/1.4 "Space Mono", monospace; }
  .week1-bottom span:last-child { color: rgba(140,169,171,.75); text-align: right; }
  .week1-source { color: var(--week1-cyan); text-decoration: underline; text-decoration-color: rgba(142,228,220,.35); text-underline-offset: 3px; }
  @media (max-width: 760px) {
    .week1-shell { padding: 24px 15px 30px; }
    .week1-frame::before { inset: -24px -15px auto; }
    .week1-top-note { display: none; }
    .week1-header { display: block; margin-bottom: 23px; }
    .week1-header h2 { max-width: 340px; font-size: 40px; }
    .week1-lesson-badge { display: inline-flex; margin-top: 17px; }
    .week1-rail { overflow-x: auto; grid-template-columns: repeat(7, minmax(104px, 1fr)); margin-right: -15px; padding-right: 15px; border-right: 0; border-radius: 14px 0 0 14px; }
    .week1-content { grid-template-columns: 1fr; }
    .week1-recipe { padding: 20px 17px; }
    .week1-learning, .week1-note { padding: 21px 19px; }
  }
  @media (max-width: 430px) {
    .week1-card-heading { display: block; }
    .week1-target { margin-top: 15px; }
    .week1-table-head, .week1-ingredient { grid-template-columns: minmax(0, 1.25fr) .64fr .64fr; gap: 8px; }
    .week1-ingredient-name { gap: 7px; }
    .week1-ingredient-icon { width: 28px; height: 28px; border-radius: 7px; }
    .week1-ingredient-name strong { font-size: 12px; }
    .week1-amount { font-size: 11px; }
    .week1-actions { flex-wrap: wrap; }
    .week1-recipe-button { flex: 1 0 100%; order: -1; }
  }
`;

const massTargets = (
  masses: Record<string, number>,
  forms: Record<string, number>,
): Record<string, number> => Object.fromEntries(
  Object.entries(masses).map(([saltId, massMg]) => {
    const salt = SALTS.find(item => item.id === saltId);
    const formIdx = forms[saltId] ?? salt?.defaultFormIdx ?? 0;
    const form = salt?.hydrationForms[formIdx] ?? salt?.hydrationForms[0];
    return [saltId, salt && form ? (massMg * salt.anhydrousMass) / form.molarMass : 0];
  }),
);

const DAYS: Week1Day[] = [
  {
    day: 1,
    label: 'FOUNDATION',
    title: 'The neutral starting point',
    subtitle: 'Start here',
    description: 'The common-mineral baseline. Keep the coffee, recipe, and temperature steady so you can learn what a composed cup tastes like before changing the hardness mineral.',
    prompt: 'What does “balanced” taste like to you?',
    note: 'Robert’s Day 1 recipe gives you a clear baseline: enough magnesium to shape extraction, with gentle alkalinity to keep the cup composed.',
    learningNote: 'Tomorrow, the coffee stays the same. Only the mineral balance moves, so your palate has something honest to compare.',
    formIdx: { mgso4: 1, nahco3: 0 },
    targets: massTargets({ mgso4: 148, nahco3: 25 }, { mgso4: 1, nahco3: 0 }),
    displayTargets: { mgso4: '60 GH', nahco3: '15 KH' },
  },
  {
    day: 2,
    label: 'BALANCE',
    title: 'Taste the shift',
    subtitle: 'Taste the shift',
    description: 'Create contrast with a calcium-led water. Notice how the same coffee changes when the hardness mineral moves from magnesium to calcium.',
    prompt: 'Does the cup feel more focused or more muted?',
    note: 'Day 2 is deliberately close to Day 1 in GH and KH. The lesson is the source of hardness, not a larger mineral load.',
    learningNote: 'Compare this cup directly with Day 1. Look for changes in texture, sweetness, and how the finish leaves your palate.',
    formIdx: { cacl2: 0, nahco3: 0 },
    targets: massTargets({ cacl2: 44, nahco3: 25 }, { cacl2: 0, nahco3: 0 }),
    displayTargets: { cacl2: '40 GH', nahco3: '15 KH' },
  },
  {
    day: 3,
    label: 'ACIDITY',
    title: 'Find the blend',
    subtitle: 'Find the edge',
    description: 'Blend magnesium and calcium. This is the first step toward noticing which hardness direction you prefer without changing the overall GH/KH destination.',
    prompt: 'Where does the blend land between vivid and round?',
    note: 'Day 3 touches on blending minerals. Use it to gauge how you feel about magnesium after tasting the calcium-led Day 2 water.',
    learningNote: 'The two hardness minerals can create different extraction and texture cues even when the headline hardness looks similar.',
    formIdx: { mgso4: 1, cacl2: 0, nahco3: 0 },
    targets: massTargets({ mgso4: 100, cacl2: 22, nahco3: 25 }, { mgso4: 1, cacl2: 0, nahco3: 0 }),
    displayTargets: { mgso4: '40 GH', cacl2: '20 GH', nahco3: '15 KH' },
  },
  {
    day: 4,
    label: 'BODY',
    title: 'Flip the emphasis',
    subtitle: 'Feel the weight',
    description: 'Keep the blended approach, but lean heavier toward calcium. Notice whether the cup gains focus, weight, or a different kind of roundness.',
    prompt: 'Which hardness source feels more natural in the finish?',
    note: 'Compared with Day 3, Day 4 flips the primary GH mineral and leans heavier toward calcium.',
    learningNote: 'At this point, you are not searching for a universal winner. You are learning which direction your coffee and palate prefer.',
    formIdx: { mgso4: 1, cacl2: 0, nahco3: 0 },
    targets: massTargets({ mgso4: 50, cacl2: 44, nahco3: 25 }, { mgso4: 1, cacl2: 0, nahco3: 0 }),
    displayTargets: { mgso4: '20 GH', cacl2: '40 GH', nahco3: '15 KH' },
  },
  {
    day: 5,
    label: 'CLARITY',
    title: 'Change the buffer',
    subtitle: 'Read the finish',
    description: 'Keep the balanced hardness split and swap sodium bicarbonate for potassium bicarbonate. Notice the effect of an alternate buffer source.',
    prompt: 'Does the alternate buffer change the cup’s shape?',
    note: 'Day 5 introduces a different KH source. Keep the GH split steady so the buffer is the variable you notice.',
    learningNote: 'Potassium bicarbonate is a useful comparison, but higher potassium can taste unpleasant to some people. Treat this as a tasting experiment.',
    formIdx: { mgso4: 1, cacl2: 0, khco3: 0 },
    targets: massTargets({ mgso4: 74, cacl2: 33, khco3: 30 }, { mgso4: 1, cacl2: 0, khco3: 0 }),
    displayTargets: { mgso4: '30 GH', cacl2: '30 GH', khco3: '15 KH' },
  },
  {
    day: 6,
    label: 'CONTROL',
    title: 'Add complexity',
    subtitle: 'Make a call',
    description: 'Introduce more mineral types and a small sodium chloride contribution. The goal is not complexity for its own sake; it is to identify which effects are worth keeping.',
    prompt: 'Which new mineral effect is actually useful?',
    note: 'Day 6 moves beyond the GH/KH shorthand. Taste slowly and write down what each added mineral seems to change.',
    learningNote: 'This is intentionally a tiny-dose recipe. It is often easier to prepare as a concentrate or larger batch than to weigh directly for one liter.',
    formIdx: { mgcl2: 1, mgso4: 1, cacl2: 0, nahco3: 0, khco3: 0, nacl: 0 },
    targets: massTargets({ mgcl2: 30, mgso4: 37, cacl2: 17, nahco3: 17, khco3: 10, nacl: 15 }, { mgcl2: 1, mgso4: 1, cacl2: 0, nahco3: 0, khco3: 0, nacl: 0 }),
    displayTargets: { mgcl2: '15 Mg', mgso4: '15 SO₄', cacl2: '15 Ca', nahco3: '10 HCO₃', khco3: '5 HCO₃', nacl: '15 NaCl' },
  },
  {
    day: 7,
    label: 'REVIEW',
    title: 'Find your water map',
    subtitle: 'Your water map',
    description: 'Lower the overall GH and keep the recipe complex. Use the final comparison to identify the balance you enjoy—and the amount of work you are willing to repeat.',
    prompt: 'What would you keep for your next brew?',
    note: 'Day 7 is not a shortcut to the “best” recipe. It is a final contrast that helps you work backward toward water you understand and can reproduce.',
    learningNote: 'From here, choose a favorite and iterate: adjust GH, KH, hardness balance, mineral source, or preparation effort one variable at a time.',
    formIdx: { mgso4: 1, cacl2: 0, nahco3: 0, khco3: 0, nacl: 0 },
    targets: massTargets({ mgso4: 37, cacl2: 17, nahco3: 8, khco3: 10, nacl: 20 }, { mgso4: 1, cacl2: 0, nahco3: 0, khco3: 0, nacl: 0 }),
    displayTargets: { mgso4: '15 GH', cacl2: '15 GH', nahco3: '5 KH', khco3: '5 KH', nacl: '20 NaCl' },
  },
];

const saltDisplay: Record<string, { label: string; note: string }> = {
  mgso4: { label: 'Epsom salt', note: 'Magnesium sulfate' },
  mgcl2: { label: 'Magnesium chloride', note: 'Magnesium flakes' },
  cacl2: { label: 'Calcium chloride', note: 'Calcium hardness' },
  nahco3: { label: 'Sodium bicarbonate', note: 'Baking soda' },
  khco3: { label: 'Potassium bicarbonate', note: 'Alternate buffer' },
  nacl: { label: 'Sodium chloride', note: 'Table / spring salt' },
};

const orderedRecipeSalts = (day: Week1Day) => SALTS.filter(salt => day.targets[salt.id] > 0);

const formatMass = (massMg: number) => `${(massMg / 1000).toFixed(3)} g`;

function recipeIons(day: Week1Day) {
  return computeIonTotals(day.targets, {}, 1);
}

export default function Week1Guide({ onApplyRecipe }: Week1GuideProps) {
  const [activeDay, setActiveDay] = useState(1);
  const [appliedDay, setAppliedDay] = useState<number | null>(null);
  const [visitedDays, setVisitedDays] = useState(() => new Set([1]));
  const currentDay = DAYS[activeDay - 1];
  const ions = useMemo(() => recipeIons(currentDay), [currentDay]);
  const recipeSalts = orderedRecipeSalts(currentDay);
  const gh = computeGH(ions);
  const kh = computeKH(ions);

  const goToDay = (day: number) => {
    const nextDay = Math.max(1, Math.min(DAYS.length, day));
    setActiveDay(nextDay);
    setAppliedDay(null);
    setVisitedDays(previous => new Set(previous).add(nextDay));
  };

  const applyCurrentRecipe = () => {
    onApplyRecipe({
      id: `robert-asami-week1-day-${currentDay.day}`,
      targets: currentDay.targets,
      formIdx: currentDay.formIdx,
    });
    setAppliedDay(currentDay.day);
  };

  const massFor = (saltId: string) => {
    const salt = SALTS.find(item => item.id === saltId);
    if (!salt) return 0;
    const formIdx = currentDay.formIdx[saltId] ?? salt.defaultFormIdx ?? 0;
    const form = salt.hydrationForms[formIdx] ?? salt.hydrationForms[0];
    return currentDay.targets[saltId] * (form.molarMass / salt.anhydrousMass);
  };

  return (
    <section className="order-1 overflow-hidden rounded-2xl border border-sky-300/20 bg-slate-950/45 shadow-xl">
      <style>{styles}</style>
      <main className="week1-shell">
        <div className="week1-frame">
          <header className="week1-topbar">
            <div className="week1-kicker">
              <span className="week1-kicker-mark"><FlaskConical /></span>
              <span>BREWER / WEEK 1 GUIDE</span>
            </div>
            <div className="week1-top-note">
              <strong>OPTIONAL LESSON</strong><br />
              Learn by changing one variable
            </div>
          </header>

          <section className="week1-header" aria-labelledby="week1-title">
            <div>
              <h2 id="week1-title">Build your water intuition.</h2>
              <p>Seven small experiments to make mineral choices feel less like a formula and more like a taste you can recognize.</p>
            </div>
            <div className="week1-lesson-badge"><Sparkles /> Robert Asami · 7 day path</div>
          </section>

          <nav className="week1-rail" aria-label="Week 1 lesson progress">
            {DAYS.map(day => (
              <button
                className={`week1-step ${activeDay === day.day ? 'active' : ''} ${visitedDays.has(day.day) && activeDay !== day.day ? 'done' : ''}`}
                key={day.day}
                type="button"
                aria-current={activeDay === day.day ? 'step' : undefined}
                onClick={() => goToDay(day.day)}
              >
                <span className="week1-step-line" />
                <span className="week1-step-number">{day.day}</span>
                <span className="week1-step-label">{day.label}</span>
                <span className="week1-step-title">{day.subtitle}</span>
              </button>
            ))}
          </nav>

          <div className="week1-content">
            <section className="week1-card week1-recipe" aria-labelledby="week1-recipe-title">
              <div className="week1-card-heading">
                <div>
                  <div className="week1-eyebrow">DAY {currentDay.day} / {currentDay.label}</div>
                  <h3 id="week1-recipe-title">{currentDay.title}</h3>
                </div>
                <div className="week1-target"><Target /> Target · 1 L brew water</div>
              </div>

              <div className="week1-mineral-summary">
                <div className="week1-summary">
                  <span className="week1-summary-label">General hardness</span>
                  <span className="week1-summary-value">{gh.toFixed(0)} <small>GH</small></span>
                </div>
                <div className="week1-summary">
                  <span className="week1-summary-label">Carbonate hardness</span>
                  <span className="week1-summary-value">{kh.toFixed(0)} <small>KH</small></span>
                </div>
              </div>

              <div className="week1-table" role="table" aria-label={`Day ${currentDay.day} mineral recipe`}>
                <div className="week1-table-head" role="row">
                  <span role="columnheader">Mineral</span>
                  <span role="columnheader">Water target</span>
                  <span role="columnheader">For 1 L</span>
                </div>
                {recipeSalts.map((salt, index) => {
                  const display = saltDisplay[salt.id] ?? { label: salt.name, note: salt.formula };
                  return (
                    <div className="week1-ingredient" role="row" key={salt.id}>
                      <div className="week1-ingredient-name" role="cell">
                        <span className="week1-ingredient-icon">{index % 2 === 0 ? <Droplets /> : <Beaker />}</span>
                        <span><strong>{display.label}</strong><span>{display.note}</span></span>
                      </div>
                      <span className="week1-amount" role="cell">{currentDay.displayTargets[salt.id] ?? `${currentDay.targets[salt.id].toFixed(1)} ppm`}<small>source target</small></span>
                      <span className="week1-amount accent" role="cell">{formatMass(massFor(salt.id))}</span>
                    </div>
                  );
                })}
              </div>
              <div className="week1-table-foot"><Info /> Weigh the listed hydrated forms, then dissolve completely before brewing.</div>
            </section>

            <aside className="week1-side">
              <section className="week1-card week1-learning" aria-labelledby="week1-prompt-title">
                <div className="week1-prompt-mark"><CircleHelp /></div>
                <div className="week1-eyebrow">TODAY&apos;S TASTING PROMPT</div>
                <h4 id="week1-prompt-title">{currentDay.prompt}</h4>
                <p>{currentDay.description}</p>
                <div className="week1-prompt-answer"><LockKeyhole /> Keep the coffee and brew method steady. Write down the first three words that arrive.</div>
              </section>

              <section className="week1-card week1-note" aria-labelledby="week1-why-title">
                <div className="week1-note-head" id="week1-why-title"><FlaskConical /> Why this experiment?</div>
                <p>{currentDay.note}</p>
                <details className="week1-details">
                  <summary className="week1-summary-row">
                    <span>Show the learning note</span>
                    <ChevronDown />
                  </summary>
                  <div className="week1-detail-copy">{currentDay.learningNote}</div>
                </details>
              </section>
            </aside>
          </div>

          <div className="week1-actions">
            <button className="week1-button" type="button" disabled={activeDay === 1} onClick={() => goToDay(activeDay - 1)}>
              <ArrowLeft /> Previous
            </button>
            <button className={`week1-recipe-button ${appliedDay === currentDay.day ? 'applied' : ''}`} type="button" onClick={applyCurrentRecipe}>
              {appliedDay === currentDay.day ? <Check /> : <FlaskConical />}
              {appliedDay === currentDay.day ? 'Recipe added to your calculator' : 'Use this recipe'}
            </button>
            <button className="week1-button" type="button" disabled={activeDay === DAYS.length} onClick={() => goToDay(activeDay + 1)}>
              Next <ArrowRight />
            </button>
          </div>
          <div className="week1-bottom">
            <span>DAY {activeDay} OF 7 · {appliedDay === currentDay.day ? 'SAVED TO CALCULATOR' : 'READY TO EXPERIMENT'}</span>
            <span>Source: <a className="week1-source" href="https://www.robertasami.com/water#rasamifilter" target="_blank" rel="noreferrer">Robert Asami’s Watering Hole</a></span>
          </div>
        </div>
      </main>
    </section>
  );
}
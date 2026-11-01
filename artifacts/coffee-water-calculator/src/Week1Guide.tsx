import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Beaker,
  Check,
  ChevronDown,
  CircleHelp,
  Droplets,
  FlaskConical,
  Info,
  Target,
} from 'lucide-react';
import robertAsamiLogo from '@assets/robert-asami-logo-transparent.png';
import { computeGH, computeIonTotals, computeKH, getSaltColorTokens, ION_MAP, SALTS } from './waterData';
import {
  DAYS,
  DAY5_MGCL2_TARGET,
  DAY5_NAHCO3_TARGET,
  type Week1Recipe,
} from './week1GuideRecipes';
import { Week1SaltLabel } from './Week1SaltLabel';

export { DAYS, equivalentSaltTarget } from './week1GuideRecipes';
export type { Week1Day, Week1Recipe } from './week1GuideRecipes';

type Week1GuideProps = {
  onApplyRecipe: (recipe: Week1Recipe) => void;
};

const styles = `
  .week1-shell {
    --week1-ink: #12344b;
    --week1-panel: #153b54;
    --week1-line: rgba(180, 204, 219, .22);
    --week1-line-strong: rgba(180, 204, 219, .34);
    --week1-text: #f2f4f5;
    --week1-muted: #c3d1d9;
    --week1-faint: #9bb1bf;
    --week1-cyan: #bdd2df;
    --week1-cyan-soft: #e1eaf0;
    --week1-emerald: #9dc0cc;
    --week1-indigo: #c1d2e1;
    position: relative;
    overflow: hidden;
    width: 100%;
    padding: 28px clamp(16px, 3vw, 38px) 34px;
    color: var(--week1-text);
    background: var(--week1-ink);
    font-family: Georgia, "Times New Roman", serif;
  }
  .week1-shell *, .week1-shell *::before, .week1-shell *::after { box-sizing: border-box; }
  .week1-frame { width: min(1100px, 100%); margin: 0 auto; position: relative; }
  .week1-frame::before {
    content: "";
    position: absolute;
    inset: -28px -7% auto;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(190,211,224,.45), transparent);
    opacity: .7;
  }
  .week1-topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 22px; }
  .week1-attribution { display: flex; align-items: center; gap: 13px; min-width: 0; }
  .week1-attribution-link { display: inline-flex; align-items: center; padding: 7px 10px; border: 1px solid var(--week1-line); border-radius: 5px; background: rgba(9, 34, 51, .38); box-shadow: none; transition: border-color .2s ease, background .2s ease, transform .2s ease; }
  .week1-attribution-link:hover { border-color: var(--week1-line-strong); background: rgba(9, 34, 51, .55); transform: translateY(-1px); }
  .week1-attribution-link img { display: block; width: 148px; height: auto; max-width: 100%; opacity: .92; }
  .week1-kicker { display: flex; align-items: center; gap: 10px; color: var(--week1-cyan); font: 700 10px/1 "Space Mono", monospace; letter-spacing: .16em; }
  .week1-kicker-mark { width: 27px; height: 27px; display: grid; place-items: center; border: 1px solid rgba(142,228,220,.4); border-radius: 8px; background: rgba(142,228,220,.08); }
  .week1-kicker-mark svg { width: 14px; height: 14px; }
  .week1-top-note { color: var(--week1-faint); font: 10px/1.4 "Space Mono", monospace; letter-spacing: .1em; text-align: right; text-transform: uppercase; }
  .week1-top-note strong { color: var(--week1-muted); font-weight: 500; }
  .week1-header { display: flex; justify-content: space-between; align-items: end; gap: 28px; margin-bottom: 27px; }
  .week1-header h2 { margin: 0 0 10px; color: var(--week1-text); font: 400 clamp(30px, 4vw, 44px)/1.08 Georgia, "Times New Roman", serif; letter-spacing: -.025em; }
  .week1-header p { margin: 0; max-width: 535px; color: var(--week1-muted); font-size: 13px; line-height: 1.65; }
  .week1-lesson-badge { flex: 0 0 auto; display: flex; align-items: center; gap: 9px; padding: 10px 13px; color: var(--week1-cyan-soft); border: 1px solid var(--week1-line); border-radius: 4px; background: rgba(9, 34, 51, .28); font: 600 10px/1 "Space Mono", monospace; letter-spacing: .08em; text-transform: uppercase; }
  .week1-lesson-mark { flex: 0 0 14px; width: 14px; height: 14px; display: block; background-image: url(${robertAsamiLogo}); background-position: left center; background-repeat: no-repeat; background-size: auto 14px; }
  .week1-rail { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 18px; padding: 15px 17px 14px; border: 1px solid var(--week1-line); border-radius: 4px; background: rgba(9, 34, 51, .26); box-shadow: none; }
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
  .week1-card { border: 1px solid var(--week1-line); border-radius: 4px; background: rgba(18, 52, 75, .82); box-shadow: none; }
  .week1-recipe { padding: 23px; }
  .week1-card-heading { display: flex; justify-content: space-between; align-items: start; gap: 18px; margin-bottom: 21px; }
  .week1-swap-button { display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto; margin-left: auto; padding: 5px 7px; border: 1px solid rgba(142,228,220,.34); border-radius: 7px; color: var(--week1-cyan-soft); background: rgba(142,228,220,.08); font: 600 9px/1.2 "DM Sans", sans-serif; cursor: pointer; transition: background .2s ease, border-color .2s ease, transform .2s ease; }
  .week1-swap-button:hover { border-color: rgba(142,228,220,.62); background: rgba(142,228,220,.15); transform: translateY(-1px); }
  .week1-swap-button.active { border-color: rgba(93,212,164,.62); color: #d6fff1; background: rgba(93,212,164,.14); }
  .week1-swap-button:focus-visible { outline: 2px solid var(--week1-cyan); outline-offset: 3px; }
  .week1-swap-button svg { width: 12px; height: 12px; }
  .week1-eyebrow { color: var(--week1-cyan); font: 700 10px/1.2 "Space Mono", monospace; letter-spacing: .12em; }
  .week1-card h3 { margin: 8px 0 0; color: var(--week1-text); font: 400 23px/1.18 Georgia, "Times New Roman", serif; letter-spacing: 0; }
  .week1-target { display: flex; align-items: center; gap: 8px; color: var(--week1-muted); font-size: 11px; white-space: nowrap; }
  .week1-target svg { color: var(--week1-emerald); width: 15px; height: 15px; }
  .week1-mineral-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 17px; }
  .week1-summary { appearance: none; width: 100%; border: 1px solid var(--week1-line); border-radius: 4px; padding: 13px 15px; color: var(--week1-text); background: rgba(9, 34, 51, .3); text-align: left; cursor: default; }
  .week1-summary-label { display: block; margin-bottom: 10px; color: var(--week1-muted); font: 10px/1 "Space Mono", monospace; letter-spacing: .1em; text-transform: uppercase; }
  .week1-summary-value { display: flex; align-items: baseline; gap: 6px; color: var(--week1-cyan-soft); font: 500 26px/1 "Space Mono", monospace; letter-spacing: -.08em; }
  .week1-summary-value small { color: var(--week1-muted); font: 11px/1 "DM Sans", sans-serif; letter-spacing: 0; }
  .week1-table { border-top: 1px solid var(--week1-line); }
  .week1-table-head, .week1-ingredient { display: grid; grid-template-columns: minmax(0, 1.4fr) .72fr .72fr; gap: 16px; align-items: center; }
  .week1-table-head { padding: 13px 7px 10px; color: var(--week1-faint); font: 9px/1 "Space Mono", monospace; letter-spacing: .1em; text-transform: uppercase; }
  .week1-ingredient { padding: 14px 7px; border-top: 1px solid rgba(180,204,219,.15); }
  .week1-ingredient-name { display: flex; min-width: 0; align-items: center; gap: 11px; }
  .week1-ingredient-icon { width: 32px; height: 32px; display: grid; flex: 0 0 auto; align-items: center; justify-items: center; padding: 0; border: 1px solid rgba(142,228,220,.18); border-radius: 9px; background: rgba(142,228,220,.07); color: var(--week1-cyan); line-height: 0; }
  .week1-ingredient-icon svg { display: block; width: 15px; height: 15px; margin: 0; transform: translateY(8px); }
  .week1-ingredient-name strong { display: block; color: var(--week1-text); font-size: 13px; font-weight: 600; line-height: 1.3; }
  .week1-ingredient-name span { display: block; margin-top: 4px; color: var(--week1-faint); font-size: 11px; line-height: 1.3; }
  .week1-amount { color: var(--week1-text); font: 600 12px/1.2 "Space Mono", monospace; }
  .week1-amount small { display: block; margin-top: 5px; color: var(--week1-faint); font: 10px/1 "DM Sans", sans-serif; }
  .week1-amount.accent { color: var(--week1-cyan-soft); }
  .week1-table-foot { display: flex; gap: 8px; align-items: center; margin-top: 16px; padding: 12px 13px; border-radius: 4px; border: 1px solid var(--week1-line); background: rgba(9, 34, 51, .28); color: var(--week1-muted); font-size: 11px; line-height: 1.45; }
  .week1-table-foot svg { flex: 0 0 auto; color: var(--week1-emerald); width: 14px; height: 14px; }
  .week1-side { display: flex; flex-direction: column; gap: 14px; }
  .week1-learning { position: relative; overflow: hidden; padding: 24px; background: rgba(9, 34, 51, .35); }
  .week1-learning::after { content: ""; position: absolute; width: 160px; height: 160px; right: -54px; top: -54px; border: 1px solid rgba(190,211,224,.16); border-radius: 50%; box-shadow: 0 0 0 20px rgba(190,211,224,.025), 0 0 0 42px rgba(190,211,224,.018); pointer-events: none; }
  .week1-learning > * { position: relative; z-index: 1; }
  .week1-prompt-mark { width: 35px; height: 35px; display: grid; place-items: center; margin-bottom: 20px; border-radius: 4px; color: var(--week1-cyan-soft); background: rgba(190,211,224,.1); transition: color .2s ease, background .2s ease, transform .2s ease; }
  .week1-prompt-mark:hover { color: #fff; background: rgba(190,211,224,.2); transform: translateY(-1px); }
  .week1-prompt-mark:focus-visible { outline: 2px solid var(--week1-cyan); outline-offset: 3px; }
  .week1-prompt-mark svg { width: 17px; height: 17px; }
  .week1-learning h4 { max-width: 270px; margin: 0 0 13px; color: var(--week1-muted); font: 400 14px/1.45 Georgia, "Times New Roman", serif; letter-spacing: 0; }
  .week1-learning p { margin: 0; color: var(--week1-muted); font-size: 12px; line-height: 1.65; }
  .week1-learning .week1-source-copy { color: var(--week1-text); font: 500 21px/1.42 Georgia, "Times New Roman", serif; letter-spacing: 0; }
  .week1-learning strong { color: var(--week1-text); font-weight: 600; }
  .week1-app-prompt { margin-top: 19px; padding-top: 16px; border-top: 1px solid var(--week1-line); }
  .week1-app-prompt .week1-eyebrow { margin-bottom: 9px; }
  .week1-app-prompt .week1-prompt-answer { margin-top: 8px; padding-top: 0; border-top: 0; }
  .week1-prompt-answer { display: flex; gap: 9px; align-items: start; margin-top: 20px; padding-top: 17px; border-top: 1px solid var(--week1-line); color: var(--week1-muted); font-size: 11px; line-height: 1.5; }
  .week1-prompt-answer svg { flex: 0 0 auto; margin-top: 1px; color: var(--week1-indigo); width: 14px; height: 14px; }
  .week1-watermancer-note { margin-top: 17px; padding-top: 13px; border-top: 1px solid var(--week1-line); }
  .week1-watermancer-note p { margin: 6px 0 0; color: var(--week1-muted); font-size: 11px; line-height: 1.55; }
  .week1-watermancer-note .week1-details { margin-top: 7px; border-top: 0; }
  .week1-watermancer-note .week1-summary-row { padding-top: 6px; }
  .week1-details { margin-top: 13px; border-top: 1px solid var(--week1-line); }
  .week1-details summary { list-style: none; }
  .week1-details summary::-webkit-details-marker { display: none; }
  .week1-summary-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-top: 13px; color: var(--week1-faint); font-size: 11px; cursor: pointer; }
  .week1-summary-row svg { width: 14px; height: 14px; transition: transform .2s ease; }
  .week1-details[open] .week1-summary-row svg { transform: rotate(180deg); }
  .week1-detail-copy { padding: 10px 0 0; color: var(--week1-muted); font-size: 11px; line-height: 1.55; }
  .week1-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 19px; }
  .week1-button { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; border: 1px solid var(--week1-line-strong); border-radius: 4px; padding: 0 14px; color: var(--week1-muted); background: rgba(9, 34, 51, .4); font: 600 11px/1 "DM Sans", sans-serif; cursor: pointer; transition: background .2s ease, border-color .2s ease, color .2s ease, transform .2s ease; }
  .week1-button:hover:not(:disabled) { border-color: var(--week1-line-strong); color: var(--week1-text); background: rgba(190,211,224,.12); transform: translateY(-1px); }
  .week1-button:disabled { opacity: .4; cursor: not-allowed; }
  .week1-button svg { width: 14px; height: 14px; }
  .week1-recipe-button { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 42px; border: 1px solid var(--week1-cyan); border-radius: 4px; padding: 0 17px; color: var(--week1-ink); background: var(--week1-cyan); font: 700 11px/1 "DM Sans", sans-serif; cursor: pointer; box-shadow: none; transition: background .2s ease, transform .2s ease; }
  .week1-recipe-button:hover { background: var(--week1-cyan-soft); transform: translateY(-1px); }
  .week1-recipe-button.applied { border-color: var(--week1-emerald); color: #12344b; background: var(--week1-emerald); }
  .week1-recipe-button svg { width: 15px; height: 15px; }
  .week1-bottom { display: flex; justify-content: space-between; gap: 16px; margin-top: 16px; color: var(--week1-faint); font: 10px/1.4 "Space Mono", monospace; }
  .week1-bottom span:last-child { color: rgba(140,169,171,.75); text-align: right; }
  .week1-source { color: var(--week1-cyan); text-decoration: underline; text-decoration-color: rgba(190,211,224,.4); text-underline-offset: 3px; }
  @media (max-width: 760px) {
    .week1-shell { padding: 24px 15px 30px; }
    .week1-frame::before { inset: -24px -15px auto; }
    .week1-top-note { display: none; }
    .week1-attribution { gap: 0; }
    .week1-attribution-link { padding: 6px 8px; }
    .week1-attribution-link img { width: 126px; }
    .week1-header { display: block; margin-bottom: 23px; }
    .week1-header h2 { max-width: 340px; font-size: 40px; }
    .week1-lesson-badge { display: inline-flex; margin-top: 17px; }
    .week1-rail { overflow-x: auto; grid-template-columns: repeat(7, minmax(104px, 1fr)); margin-right: -15px; padding-right: 15px; border-right: 0; border-radius: 14px 0 0 14px; }
    .week1-content { grid-template-columns: 1fr; }
    .week1-recipe { padding: 20px 17px; }
    .week1-learning { padding: 21px 19px; }
  }
  @media (max-width: 430px) {
    .week1-card-heading { display: block; }
    .week1-target { margin-top: 15px; }
    .week1-table-head, .week1-ingredient { grid-template-columns: minmax(0, 1.25fr) .64fr .64fr; gap: 8px; }
     .week1-ingredient-name { gap: 7px; }
     .week1-swap-button { padding: 5px; font-size: 0; }
     .week1-swap-button svg { width: 13px; height: 13px; }
    .week1-ingredient-icon { width: 28px; height: 28px; border-radius: 7px; }
    .week1-ingredient-name strong { font-size: 12px; }
    .week1-amount { font-size: 11px; }
    .week1-actions { flex-wrap: wrap; }
    .week1-recipe-button { flex: 1 0 100%; order: -1; }
  }
`;

const saltDisplay: Record<string, { label: string; note: string }> = {
  mgso4: { label: 'Epsom salt', note: 'Magnesium sulfate' },
  mgcl2: { label: 'Magnesium chloride', note: 'Magnesium flakes' },
  cacl2: { label: 'Calcium chloride', note: 'Calcium hardness' },
  nahco3: { label: 'Sodium bicarbonate', note: 'Baking soda' },
  khco3: { label: 'Potassium bicarbonate', note: 'Alternate buffer' },
  nacl: { label: 'Sodium chloride', note: 'Table / spring salt' },
};

const formatMass = (massMg: number) => `${(massMg / 1000).toFixed(3)} g`;

export default function Week1Guide({ onApplyRecipe }: Week1GuideProps) {
  const [activeDay, setActiveDay] = useState(1);
  const [appliedDay, setAppliedDay] = useState<number | null>(null);
  const [day5MagnesiumSwapped, setDay5MagnesiumSwapped] = useState(false);
  const [day5BufferSwapped, setDay5BufferSwapped] = useState(false);
  const [visitedDays, setVisitedDays] = useState(() => new Set([1]));
  const currentDay = DAYS[activeDay - 1];
  const activeTargets: Record<string, number> = useMemo(() => {
    if (activeDay !== 5) return currentDay.targets;
    const targets = { ...currentDay.targets };
    if (day5MagnesiumSwapped) {
      delete targets.mgso4;
      targets.mgcl2 = DAY5_MGCL2_TARGET;
    }
    if (day5BufferSwapped) {
      delete targets.khco3;
      targets.nahco3 = DAY5_NAHCO3_TARGET;
    }
    return targets;
  }, [activeDay, currentDay, day5BufferSwapped, day5MagnesiumSwapped]);
  const activeFormIdx: Record<string, number> = useMemo(() => {
    if (activeDay !== 5) return currentDay.formIdx;
    const formIdx = { ...currentDay.formIdx };
    if (day5MagnesiumSwapped) {
      delete formIdx.mgso4;
      formIdx.mgcl2 = 1;
    }
    if (day5BufferSwapped) {
      delete formIdx.khco3;
      formIdx.nahco3 = 0;
    }
    return formIdx;
  }, [activeDay, currentDay, day5BufferSwapped, day5MagnesiumSwapped]);
  const activeDisplayTargets: Record<string, string> = useMemo(() => {
    if (activeDay !== 5) return currentDay.displayTargets;
    const displayTargets = { ...currentDay.displayTargets };
    if (day5MagnesiumSwapped) {
      delete displayTargets.mgso4;
      displayTargets.mgcl2 = '30 GH';
    }
    if (day5BufferSwapped) {
      delete displayTargets.khco3;
      displayTargets.nahco3 = '15 KH';
    }
    return displayTargets;
  }, [activeDay, currentDay, day5BufferSwapped, day5MagnesiumSwapped]);
  const ions = useMemo(() => computeIonTotals(activeTargets, {}, 1), [activeTargets]);
  const recipeSalts = SALTS.filter(salt => (activeTargets[salt.id] ?? 0) > 0);
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
      id: `robert-asami-week1-day-${currentDay.day}${activeDay === 5 && (day5MagnesiumSwapped || day5BufferSwapped) ? '-swapped' : ''}`,
      targets: activeTargets,
      formIdx: activeFormIdx,
    });
    setAppliedDay(currentDay.day);
  };

  const massFor = (saltId: string) => {
    const salt = SALTS.find(item => item.id === saltId);
    if (!salt) return 0;
    const formIdx = activeFormIdx[saltId] ?? salt.defaultFormIdx ?? 0;
    const form = salt.hydrationForms[formIdx] ?? salt.hydrationForms[0];
    return (activeTargets[saltId] ?? 0) * (form.molarMass / salt.anhydrousMass);
  };

  return (
    <section id="brewer-week1-guide" tabIndex={-1} data-guide-export-ignore className="order-1 scroll-mt-6 overflow-hidden rounded-2xl border border-sky-300/20 bg-slate-950/45 shadow-xl focus:outline-none focus:ring-2 focus:ring-teal-300/50 focus:ring-offset-2 focus:ring-offset-slate-950">
      <style>{styles}</style>
      <main className="week1-shell">
        <div className="week1-frame">
          <header className="week1-topbar">
            <div className="week1-attribution">
              <a
                className="week1-attribution-link"
                href="https://www.robertasami.com/water#rasamifilter"
                target="_blank"
                rel="noreferrer"
                aria-label="Visit Robert Asami's Week 1 water guide"
              >
                <img src={robertAsamiLogo} alt="Robert Asami" />
              </a>
              <div className="week1-kicker">
              <span className="week1-kicker-mark"><FlaskConical /></span>
              <span>BREWER / WEEK 1 GUIDE</span>
              </div>
            </div>
            <div className="week1-top-note">
              <strong>OPTIONAL LESSON</strong><br />
              Learn through ordered comparisons
            </div>
          </header>

          <section className="week1-header" aria-labelledby="week1-title">
            <div>
              <h2 id="week1-title">Rasami’s week 1 filter recipes</h2>
              <p>If you take “famous” recipes, it might taste good, but you likely miss building the fundamentals. This is a set of recipes to start you out through that journey.</p>
            </div>
            <div className="week1-lesson-badge"><span className="week1-lesson-mark" aria-hidden="true" /> Robert Asami · 7 day path</div>
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
                  <span className="week1-summary-value" style={{ color: ION_MAP.magnesium.color.foreground }}>{gh.toFixed(0)} <small>GH</small></span>
                </div>
                <div className="week1-summary">
                  <span className="week1-summary-label">Carbonate hardness</span>
                  <span className="week1-summary-value" style={{ color: ION_MAP.bicarbonate.color.foreground }}>{kh.toFixed(0)} <small>KH</small></span>
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
                        <span className="week1-ingredient-icon" style={{ color: getSaltColorTokens(salt).primary, borderColor: getSaltColorTokens(salt).border, background: getSaltColorTokens(salt).primarySoft }}>{index % 2 === 0 ? <Droplets /> : <Beaker />}</span>
                         <span className="min-w-0"><Week1SaltLabel saltId={salt.id} /><span>{salt.id === 'mgso4' ? 'Epsom salt' : display.note}</span></span>
                         {activeDay === 5 && (salt.id === 'mgso4' || salt.id === 'mgcl2') && (
                           <button
                             className={`week1-swap-button ${day5MagnesiumSwapped ? 'active' : ''}`}
                             type="button"
                             onClick={() => {
                               setDay5MagnesiumSwapped(previous => !previous);
                               setAppliedDay(null);
                             }}
                             aria-label={day5MagnesiumSwapped ? 'Use Epsom salt instead' : 'Swap Epsom salt for magnesium chloride'}
                           >
                             <ArrowLeftRight />
                             <span>{day5MagnesiumSwapped ? 'Use Epsom' : 'Swap to MgCl₂'}</span>
                           </button>
                         )}
                         {activeDay === 5 && (salt.id === 'nahco3' || salt.id === 'khco3') && (
                           <button
                             className={`week1-swap-button ${day5BufferSwapped ? 'active' : ''}`}
                             type="button"
                             onClick={() => {
                               setDay5BufferSwapped(previous => !previous);
                               setAppliedDay(null);
                             }}
                             aria-label={day5BufferSwapped ? 'Restore published potassium bicarbonate' : 'Optional Watermancer swap: potassium bicarbonate for sodium bicarbonate'}
                           >
                             <ArrowLeftRight />
                             <span>{day5BufferSwapped ? 'Restore KHCO₃' : 'Try NaHCO₃ (app option)'}</span>
                           </button>
                         )}
                      </div>
                       <span className="week1-amount" role="cell">{activeDisplayTargets[salt.id] ?? `${activeTargets[salt.id].toFixed(1)} ppm`}<small>source target</small></span>
                      <span className="week1-amount accent" role="cell">{formatMass(massFor(salt.id))}</span>
                    </div>
                  );
                })}
              </div>
              <div className="week1-table-foot"><Info /> Use distilled or RO water. GH/KH labels are ppm as CaCO₃, not elemental-ion ppm. Weigh the displayed hydration forms and dissolve completely. Calcium chloride uses the anhydrous basis implied by the published masses.</div>
            </section>

            <aside className="week1-side">
              <section className="week1-card week1-learning" aria-labelledby="week1-prompt-title">
                <a
                  className="week1-prompt-mark"
                  href="https://www.robertasami.com/water#rasamifilter"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open Robert Asami's original Week 1 water guide"
                  title="Open Robert Asami's original Week 1 water guide"
                >
                  <CircleHelp />
                </a>
                <div className="week1-eyebrow">ROBERT ASAMI&apos;S ORIGINAL GUIDE</div>
                <p className="week1-source-copy">{currentDay.description}</p>
                <div className="week1-app-prompt">
                  <div className="week1-eyebrow">WATERMANCER TASTING PROMPT</div>
                  <h4 id="week1-prompt-title">{currentDay.prompt}</h4>
                  <div className="week1-prompt-answer"><Info /> Note any change in the finish, juiciness, acidity, or body. There’s no expected direction; record what you notice with this coffee and brew method.</div>
                </div>
                <div className="week1-watermancer-note" aria-labelledby="week1-why-title">
                  <div className="week1-eyebrow" id="week1-why-title">WATERMANCER NOTE</div>
                  <p>{currentDay.note}</p>
                  <details className="week1-details">
                    <summary className="week1-summary-row">
                      <span>{activeDay === 7 ? 'Robert Asami · Next steps' : 'Show calculation details'}</span>
                      <ChevronDown />
                    </summary>
                    <div className="week1-detail-copy">{currentDay.learningNote}</div>
                  </details>
                </div>
              </section>
            </aside>
          </div>

          <div className="week1-actions">
            <button className="week1-button" type="button" disabled={activeDay === 1} onClick={() => goToDay(activeDay - 1)} data-week1-export-ignore>
              <ArrowLeft /> Previous
            </button>
            <button className={`week1-recipe-button ${appliedDay === currentDay.day ? 'applied' : ''}`} type="button" onClick={applyCurrentRecipe} data-week1-export-ignore>
              {appliedDay === currentDay.day ? <Check /> : <FlaskConical />}
              {appliedDay === currentDay.day ? 'Recipe ready to prepare' : 'Use this recipe'}
            </button>
            <button className="week1-button" type="button" disabled={activeDay === DAYS.length} onClick={() => goToDay(activeDay + 1)} data-week1-export-ignore>
              Next <ArrowRight />
            </button>
          </div>
          <div className="week1-bottom">
            <span>DAY {activeDay} OF 7 · {appliedDay === currentDay.day ? 'RECIPE READY TO PREPARE' : 'READY TO EXPERIMENT'}</span>
            <span>Source: <a className="week1-source" href="https://www.robertasami.com/water#rasamifilter" target="_blank" rel="noreferrer">Robert Asami’s Watering Hole</a></span>
          </div>
        </div>
      </main>
    </section>
  );
}
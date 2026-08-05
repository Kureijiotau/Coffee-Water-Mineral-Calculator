import { useState } from "react";
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
} from "lucide-react";

type Day = {
  day: number;
  label: string;
  title: string;
  status: "current" | "done" | "upcoming";
};

const days: Day[] = [
  { day: 1, label: "FOUNDATION", title: "Start here", status: "current" },
  { day: 2, label: "BALANCE", title: "Taste the shift", status: "upcoming" },
  { day: 3, label: "ACIDITY", title: "Find the edge", status: "upcoming" },
  { day: 4, label: "BODY", title: "Feel the weight", status: "upcoming" },
  { day: 5, label: "CLARITY", title: "Read the finish", status: "upcoming" },
  { day: 6, label: "CONTROL", title: "Make a call", status: "upcoming" },
  { day: 7, label: "REVIEW", title: "Your water map", status: "upcoming" },
];

const styles = `
  .week1-shell {
    --ink: #08151b;
    --ink-soft: #0d2027;
    --panel: #102b32;
    --panel-raised: #153941;
    --line: rgba(151, 223, 215, .16);
    --line-strong: rgba(151, 223, 215, .28);
    --text: #e8f6f2;
    --muted: #8ca9ab;
    --faint: #607d81;
    --cyan: #8ee4dc;
    --cyan-soft: #c6faf0;
    --emerald: #5dd4a4;
    --indigo: #9fa9ff;
    min-height: 100vh;
    width: 100%;
    box-sizing: border-box;
    padding: 38px clamp(18px, 4vw, 66px);
    color: var(--text);
    background:
      radial-gradient(circle at 87% 8%, rgba(57, 103, 167, .23), transparent 29%),
      radial-gradient(circle at 12% 96%, rgba(24, 130, 118, .14), transparent 34%),
      var(--ink);
    font-family: "DM Sans", "Trebuchet MS", sans-serif;
    overflow-x: hidden;
  }

  .week1-shell *, .week1-shell *::before, .week1-shell *::after { box-sizing: border-box; }
  .week1-frame { width: min(1100px, 100%); margin: 0 auto; position: relative; }
  .week1-frame::before {
    content: "";
    position: absolute;
    inset: -38px -7% auto;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(142,228,220,.35), transparent);
    opacity: .7;
  }
  .week1-topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 28px; }
  .week1-kicker { display: flex; align-items: center; gap: 10px; color: var(--cyan); font: 700 10px/1 "Space Mono", monospace; letter-spacing: .16em; }
  .week1-kicker-mark { width: 27px; height: 27px; display: grid; place-items: center; border: 1px solid rgba(142,228,220,.4); border-radius: 8px; background: rgba(142,228,220,.08); }
  .week1-kicker-mark svg { width: 14px; height: 14px; }
  .week1-top-note { color: var(--faint); font: 10px/1.4 "Space Mono", monospace; letter-spacing: .1em; text-align: right; text-transform: uppercase; }
  .week1-top-note strong { color: var(--muted); font-weight: 500; }

  .week1-header { display: flex; justify-content: space-between; align-items: end; gap: 28px; margin-bottom: 33px; }
  .week1-header h1 { margin: 0 0 12px; color: var(--text); font: 500 clamp(32px, 5vw, 56px)/.98 "Bricolage Grotesque", "Trebuchet MS", sans-serif; letter-spacing: -.045em; }
  .week1-header p { margin: 0; max-width: 535px; color: var(--muted); font-size: 14px; line-height: 1.65; }
  .week1-lesson-badge { flex: 0 0 auto; display: flex; align-items: center; gap: 9px; padding: 10px 13px; color: var(--cyan-soft); border: 1px solid rgba(142,228,220,.25); border-radius: 10px; background: rgba(16, 58, 63, .52); font: 600 10px/1 "Space Mono", monospace; letter-spacing: .08em; text-transform: uppercase; }
  .week1-lesson-badge svg { color: var(--emerald); width: 14px; height: 14px; }

  .week1-rail { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 26px; padding: 17px 17px 15px; border: 1px solid var(--line); border-radius: 14px; background: rgba(13, 32, 39, .77); box-shadow: 0 16px 46px rgba(0,0,0,.12); }
  .week1-step { min-width: 0; appearance: none; border: 0; padding: 0; background: transparent; color: inherit; text-align: left; cursor: pointer; }
  .week1-step:focus-visible, .week1-button:focus-visible, .week1-recipe-button:focus-visible, .week1-summary:focus-visible { outline: 2px solid var(--cyan); outline-offset: 3px; }
  .week1-step-line { height: 3px; border-radius: 99px; background: rgba(140,169,171,.17); margin-bottom: 11px; transition: background .2s ease, transform .2s ease; }
  .week1-step:hover .week1-step-line { transform: translateY(-1px); background: rgba(142,228,220,.35); }
  .week1-step.active .week1-step-line { background: var(--cyan); }
  .week1-step.active .week1-step-number { background: var(--cyan); color: var(--ink); border-color: var(--cyan); }
  .week1-step-number { width: 22px; height: 22px; display: grid; place-items: center; margin-bottom: 8px; border: 1px solid rgba(140,169,171,.3); border-radius: 50%; color: var(--muted); font: 11px/1 "Space Mono", monospace; transition: color .2s ease, background .2s ease, border-color .2s ease; }
  .week1-step-label { display: block; overflow: hidden; color: var(--faint); font: 9px/1.2 "Space Mono", monospace; letter-spacing: .08em; text-overflow: ellipsis; white-space: nowrap; }
  .week1-step.active .week1-step-label { color: var(--cyan); }
  .week1-step-title { display: block; overflow: hidden; margin-top: 5px; color: var(--muted); font-size: 11px; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
  .week1-step.active .week1-step-title { color: var(--text); }

  .week1-content { display: grid; grid-template-columns: minmax(0, 1.24fr) minmax(300px, .76fr); gap: 14px; }
  .week1-card { border: 1px solid var(--line); border-radius: 16px; background: rgba(16, 43, 50, .88); box-shadow: 0 18px 50px rgba(0,0,0,.13); }
  .week1-recipe { padding: 26px; }
  .week1-card-heading { display: flex; justify-content: space-between; align-items: start; gap: 18px; margin-bottom: 24px; }
  .week1-eyebrow { color: var(--cyan); font: 700 10px/1.2 "Space Mono", monospace; letter-spacing: .12em; }
  .week1-card h2 { margin: 8px 0 0; color: var(--text); font: 500 25px/1.1 "Bricolage Grotesque", sans-serif; letter-spacing: -.025em; }
  .week1-target { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: 11px; white-space: nowrap; }
  .week1-target svg { color: var(--emerald); width: 15px; height: 15px; }
  .week1-mineral-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 17px; }
  .week1-summary { appearance: none; width: 100%; border: 1px solid rgba(142,228,220,.16); border-radius: 11px; padding: 14px 15px; color: var(--text); background: rgba(4, 19, 25, .3); text-align: left; cursor: pointer; }
  .week1-summary:hover { border-color: rgba(142,228,220,.34); background: rgba(4, 19, 25, .46); }
  .week1-summary-label { display: block; margin-bottom: 10px; color: var(--muted); font: 10px/1 "Space Mono", monospace; letter-spacing: .1em; text-transform: uppercase; }
  .week1-summary-value { display: flex; align-items: baseline; gap: 6px; color: var(--cyan-soft); font: 500 28px/1 "Space Mono", monospace; letter-spacing: -.08em; }
  .week1-summary-value small { color: var(--muted); font: 11px/1 "DM Sans", sans-serif; letter-spacing: 0; }
  .week1-table { border-top: 1px solid var(--line); }
  .week1-table-head, .week1-ingredient { display: grid; grid-template-columns: minmax(0, 1.4fr) .72fr .72fr; gap: 16px; align-items: center; }
  .week1-table-head { padding: 13px 7px 10px; color: var(--faint); font: 9px/1 "Space Mono", monospace; letter-spacing: .1em; text-transform: uppercase; }
  .week1-ingredient { padding: 15px 7px; border-top: 1px solid rgba(151,223,215,.1); }
  .week1-ingredient-name { display: flex; min-width: 0; align-items: center; gap: 11px; }
  .week1-ingredient-icon { width: 32px; height: 32px; display: grid; flex: 0 0 auto; place-items: center; border: 1px solid rgba(142,228,220,.18); border-radius: 9px; background: rgba(142,228,220,.07); color: var(--cyan); }
  .week1-ingredient-icon svg { width: 15px; height: 15px; }
  .week1-ingredient-name strong { display: block; color: var(--text); font-size: 13px; font-weight: 600; line-height: 1.3; }
  .week1-ingredient-name span { display: block; margin-top: 4px; color: var(--faint); font-size: 11px; line-height: 1.3; }
  .week1-amount { color: var(--text); font: 600 13px/1.2 "Space Mono", monospace; }
  .week1-amount small { display: block; margin-top: 5px; color: var(--faint); font: 10px/1 "DM Sans", sans-serif; }
  .week1-amount.accent { color: var(--cyan-soft); }
  .week1-table-foot { display: flex; gap: 8px; align-items: center; margin-top: 16px; padding: 12px 13px; border-radius: 9px; background: rgba(93, 212, 164, .07); color: #a5c9c3; font-size: 11px; line-height: 1.45; }
  .week1-table-foot svg { flex: 0 0 auto; color: var(--emerald); width: 14px; height: 14px; }

  .week1-side { display: flex; flex-direction: column; gap: 14px; }
  .week1-learning { position: relative; overflow: hidden; padding: 26px; background: linear-gradient(145deg, rgba(39, 48, 104, .83), rgba(20, 48, 60, .92)); }
  .week1-learning::after { content: ""; position: absolute; width: 160px; height: 160px; right: -54px; top: -54px; border: 1px solid rgba(159,169,255,.24); border-radius: 50%; box-shadow: 0 0 0 20px rgba(159,169,255,.035), 0 0 0 42px rgba(159,169,255,.025); pointer-events: none; }
  .week1-learning > * { position: relative; z-index: 1; }
  .week1-prompt-mark { width: 35px; height: 35px; display: grid; place-items: center; margin-bottom: 22px; border-radius: 10px; color: #c9ceff; background: rgba(159,169,255,.13); }
  .week1-prompt-mark svg { width: 17px; height: 17px; }
  .week1-learning h3 { max-width: 270px; margin: 0 0 13px; color: #f0f0ff; font: 500 23px/1.1 "Bricolage Grotesque", sans-serif; letter-spacing: -.025em; }
  .week1-learning p { margin: 0; color: #b6c1d1; font-size: 12px; line-height: 1.65; }
  .week1-learning strong { color: #e4e7ff; font-weight: 600; }
  .week1-prompt-answer { display: flex; gap: 9px; align-items: start; margin-top: 22px; padding-top: 17px; border-top: 1px solid rgba(196, 202, 255, .17); color: #b6c1d1; font-size: 11px; line-height: 1.5; }
  .week1-prompt-answer svg { flex: 0 0 auto; margin-top: 1px; color: var(--indigo); width: 14px; height: 14px; }
  .week1-note { padding: 21px 22px; }
  .week1-note-head { display: flex; align-items: center; gap: 9px; margin-bottom: 11px; color: var(--muted); font: 10px/1 "Space Mono", monospace; letter-spacing: .1em; text-transform: uppercase; }
  .week1-note-head svg { color: var(--cyan); width: 14px; height: 14px; }
  .week1-note p { margin: 0; color: #b3c8c7; font-size: 12px; line-height: 1.58; }
  .week1-note p em { color: var(--cyan-soft); font-style: normal; }
  .week1-details { margin-top: 13px; border-top: 1px solid var(--line); }
  .week1-details summary { list-style: none; }
  .week1-details summary::-webkit-details-marker { display: none; }
  .week1-summary-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding-top: 13px; color: var(--faint); font-size: 11px; cursor: pointer; }
  .week1-summary-row svg { width: 14px; height: 14px; transition: transform .2s ease; }
  .week1-details[open] .week1-summary-row svg { transform: rotate(180deg); }
  .week1-detail-copy { padding: 10px 0 0; color: var(--muted); font-size: 11px; line-height: 1.55; }
  .week1-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 21px; }
  .week1-button { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 40px; border: 1px solid var(--line-strong); border-radius: 9px; padding: 0 14px; color: var(--muted); background: rgba(12, 29, 35, .65); font: 600 11px/1 "DM Sans", sans-serif; cursor: pointer; transition: background .2s ease, border-color .2s ease, color .2s ease, transform .2s ease; }
  .week1-button:hover:not(:disabled) { border-color: rgba(142,228,220,.5); color: var(--text); background: rgba(142,228,220,.1); transform: translateY(-1px); }
  .week1-button:disabled { opacity: .4; cursor: not-allowed; }
  .week1-button svg { width: 14px; height: 14px; }
  .week1-recipe-button { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 42px; border: 1px solid var(--cyan); border-radius: 9px; padding: 0 17px; color: var(--ink); background: var(--cyan); font: 700 11px/1 "DM Sans", sans-serif; cursor: pointer; box-shadow: 0 7px 20px rgba(70, 186, 172, .18); transition: background .2s ease, transform .2s ease; }
  .week1-recipe-button:hover { background: var(--cyan-soft); transform: translateY(-1px); }
  .week1-recipe-button.applied { border-color: var(--emerald); color: #06251e; background: var(--emerald); }
  .week1-recipe-button svg { width: 15px; height: 15px; }
  .week1-bottom { display: flex; justify-content: space-between; gap: 16px; margin-top: 18px; color: var(--faint); font: 10px/1.4 "Space Mono", monospace; }
  .week1-bottom span:last-child { color: rgba(140,169,171,.75); text-align: right; }

  @media (max-width: 760px) {
    .week1-shell { padding: 25px 15px 34px; }
    .week1-frame::before { inset: -25px -15px auto; }
    .week1-topbar { margin-bottom: 23px; }
    .week1-top-note { display: none; }
    .week1-header { display: block; margin-bottom: 25px; }
    .week1-header h1 { max-width: 340px; font-size: 42px; }
    .week1-header p { max-width: 440px; }
    .week1-lesson-badge { display: inline-flex; margin-top: 18px; }
    .week1-rail { overflow-x: auto; grid-template-columns: repeat(7, minmax(104px, 1fr)); margin-right: -15px; padding-right: 15px; border-right: 0; border-radius: 14px 0 0 14px; }
    .week1-content { grid-template-columns: 1fr; }
    .week1-recipe { padding: 21px 17px; }
    .week1-learning, .week1-note { padding: 22px 19px; }
  }
  @media (max-width: 430px) {
    .week1-card-heading { display: block; }
    .week1-target { margin-top: 15px; }
    .week1-mineral-summary { gap: 7px; }
    .week1-summary { padding: 12px; }
    .week1-summary-value { font-size: 22px; }
    .week1-table-head, .week1-ingredient { grid-template-columns: minmax(0, 1.25fr) .64fr .64fr; gap: 8px; }
    .week1-ingredient-name { gap: 7px; }
    .week1-ingredient-icon { width: 28px; height: 28px; border-radius: 7px; }
    .week1-ingredient-name strong { font-size: 12px; }
    .week1-amount { font-size: 11px; }
    .week1-actions { flex-wrap: wrap; }
    .week1-recipe-button { flex: 1 0 100%; order: -1; }
  }
`;

export function Week1Guide() {
  const [activeDay, setActiveDay] = useState(1);
  const [applied, setApplied] = useState(false);
  const currentDay = days[activeDay - 1];

  const goToDay = (nextDay: number) => {
    setActiveDay(Math.max(1, Math.min(days.length, nextDay)));
    setApplied(false);
  };

  return (
    <main className="week1-shell">
      <style>{styles}</style>
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
            <h1 id="week1-title">Build your water intuition.</h1>
            <p>Seven small experiments to make mineral choices feel less like a formula and more like a taste you can recognize.</p>
          </div>
          <div className="week1-lesson-badge"><Sparkles /> Robert Asami · 7 day path</div>
        </section>

        <nav className="week1-rail" aria-label="Week 1 lesson progress">
          {days.map((day) => (
            <button
              className={`week1-step ${activeDay === day.day ? "active" : ""}`}
              key={day.day}
              type="button"
              aria-current={activeDay === day.day ? "step" : undefined}
              onClick={() => goToDay(day.day)}
            >
              <span className="week1-step-line" />
              <span className="week1-step-number">{day.day}</span>
              <span className="week1-step-label">{day.label}</span>
              <span className="week1-step-title">{day.title}</span>
            </button>
          ))}
        </nav>

        <div className="week1-content">
          <section className="week1-card week1-recipe" aria-labelledby="recipe-title">
            <div className="week1-card-heading">
              <div>
                <div className="week1-eyebrow">DAY {currentDay.day} / {currentDay.label}</div>
                <h2 id="recipe-title">{currentDay.day === 1 ? "The neutral starting point" : currentDay.title}</h2>
              </div>
              <div className="week1-target"><Target /> Target · 1 L brew water</div>
            </div>

            <div className="week1-mineral-summary">
              <button type="button" className="week1-summary" onClick={() => setActiveDay(1)} aria-label="View GH target">
                <span className="week1-summary-label">General hardness</span>
                <span className="week1-summary-value">60 <small>GH</small></span>
              </button>
              <button type="button" className="week1-summary" onClick={() => setActiveDay(1)} aria-label="View KH target">
                <span className="week1-summary-label">Carbonate hardness</span>
                <span className="week1-summary-value">15 <small>KH</small></span>
              </button>
            </div>

            <div className="week1-table" role="table" aria-label="Mineral recipe amounts">
              <div className="week1-table-head" role="row">
                <span role="columnheader">Mineral</span>
                <span role="columnheader">Water target</span>
                <span role="columnheader">For 1 L</span>
              </div>
              <div className="week1-ingredient" role="row">
                <div className="week1-ingredient-name" role="cell">
                  <span className="week1-ingredient-icon"><Droplets /></span>
                  <span><strong>Epsom salt</strong><span>Magnesium sulfate</span></span>
                </div>
                <span className="week1-amount" role="cell">60 <small>ppm</small></span>
                <span className="week1-amount accent" role="cell">0.15 g</span>
              </div>
              <div className="week1-ingredient" role="row">
                <div className="week1-ingredient-name" role="cell">
                  <span className="week1-ingredient-icon"><Beaker /></span>
                  <span><strong>Sodium bicarbonate</strong><span>Buffering mineral</span></span>
                </div>
                <span className="week1-amount" role="cell">15 <small>ppm</small></span>
                <span className="week1-amount accent" role="cell">0.025 g</span>
              </div>
            </div>
            <div className="week1-table-foot"><Info /> Weigh both minerals dry, then dissolve completely before brewing.</div>
          </section>

          <aside className="week1-side">
            <section className="week1-card week1-learning" aria-labelledby="learning-title">
              <div className="week1-prompt-mark"><CircleHelp /></div>
              <div className="week1-eyebrow">TODAY&apos;S TASTING PROMPT</div>
              <h3 id="learning-title">What does “balanced” taste like to you?</h3>
              <p>Keep the coffee, recipe, and temperature steady. Notice where the cup lands between <strong>bright acidity</strong> and a <strong>round, mineral finish</strong>.</p>
              <div className="week1-prompt-answer"><LockKeyhole /> Don&apos;t chase the right answer yet. Write down the first three words that arrive.</div>
            </section>

            <section className="week1-card week1-note" aria-labelledby="why-title">
              <div className="week1-note-head" id="why-title"><FlaskConical /> Why this first?</div>
              <p>Robert&apos;s Day 1 recipe gives you a <em>clear baseline</em>: enough magnesium to shape extraction, with gentle alkalinity to keep the cup composed.</p>
              <details className="week1-details">
                <summary className="week1-summary-row">
                  <span>Show the learning note</span>
                  <ChevronDown />
                </summary>
                <div className="week1-detail-copy">Tomorrow, the coffee stays the same. Only the mineral balance moves, so your palate has something honest to compare.</div>
              </details>
            </section>
          </aside>
        </div>

        <div className="week1-actions">
          <button className="week1-button" type="button" disabled={activeDay === 1} onClick={() => goToDay(activeDay - 1)}>
            <ArrowLeft /> Previous
          </button>
          <button className={`week1-recipe-button ${applied ? "applied" : ""}`} type="button" onClick={() => setApplied((value) => !value)}>
            {applied ? <Check /> : <FlaskConical />}
            {applied ? "Recipe added to your calculator" : "Use this recipe"}
          </button>
          <button className="week1-button" type="button" disabled={activeDay === days.length} onClick={() => goToDay(activeDay + 1)}>
            Next <ArrowRight />
          </button>
        </div>
        <div className="week1-bottom">
          <span>DAY {activeDay} OF 7 · {applied ? "SAVED TO CALCULATOR" : "READY TO EXPERIMENT"}</span>
          <span>Lesson changes one variable at a time.</span>
        </div>
      </div>
    </main>
  );
}

export default Week1Guide;
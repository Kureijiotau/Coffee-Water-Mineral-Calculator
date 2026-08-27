import "./_group.css";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Beaker,
  Check,
  ChevronRight,
  Copy,
  Droplets,
  FlaskConical,
  Gauge,
  Info,
  LockKeyhole,
  RotateCcw,
  Save,
  Share2,
  Target,
} from "lucide-react";

type StageId = 1 | 2 | 3 | 4 | 5;
type TabId = "workframe" | "watermancer";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function NumericControl({
  label,
  hint,
  value,
  unit,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  unit: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="wf-control">
      <div className="wf-control-label">
        <span>{label}</span>
        <em>{hint}</em>
      </div>
      <div className="wf-number-input">
        <input
          aria-label={`${label} value`}
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/[^0-9.]/g, ""))}
        />
        <span>{unit}</span>
      </div>
    </div>
  );
}

function RemainingBar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const remaining = Math.max(max - value, 0);
  const percentage = clamp((value / max) * 100, 0, 100);
  return (
    <div className="wf-remaining">
      <div className="wf-remaining-copy">
        <strong>{label}</strong>
        <div className="wf-progress" aria-label={`${label} ${percentage.toFixed(0)} percent used`}>
          <span style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <div className="wf-remaining-value">
        {remaining.toFixed(0)} <small>{unit} room</small>
      </div>
    </div>
  );
}

function StageHeader({
  id,
  title,
  kicker,
  note,
  active,
  done,
  onClick,
}: {
  id: StageId;
  title: string;
  kicker: string;
  note: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="wf-stage-header" onClick={onClick} aria-expanded={active}>
      <span className="wf-stage-index">{done ? <Check size={13} strokeWidth={2.5} /> : `0${id}`}</span>
      <span>
        <span className="wf-stage-kicker">Stage {id} · {kicker}</span>
        <span className="wf-stage-title">{title}</span>
        <span className="wf-stage-note">{note}</span>
      </span>
      <span className="wf-stage-state">
        <span className="wf-state-dot" />
        {active ? "Editing" : done ? "Set" : "Queued"}
        <ChevronRight size={13} className={active ? "rotate-90" : ""} />
      </span>
    </button>
  );
}

export function WorkframeProfileBuilder() {
  const [activeTab, setActiveTab] = useState<TabId>("workframe");
  const [activeStage, setActiveStage] = useState<StageId>(4);
  const [gh, setGh] = useState("5.6");
  const [kh, setKh] = useState("1.7");
  const [mg, setMg] = useState("26");
  const [ca, setCa] = useState("52");
  const [sulfate, setSulfate] = useState(58);
  const [chloride, setChloride] = useState(42);
  const [potassium, setPotassium] = useState("8");
  const [sodium, setSodium] = useState("76");
  const [bicarbonate, setBicarbonate] = useState("104");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [locked, setLocked] = useState(false);

  const values = useMemo(() => {
    const ghValue = Number(gh) || 0;
    const khValue = Number(kh) || 0;
    const mgValue = Number(mg) || 0;
    const caValue = Number(ca) || 0;
    const kValue = Number(potassium) || 0;
    const naValue = Number(sodium) || 0;
    return {
      ghValue,
      khValue,
      mgValue,
      caValue,
      kValue,
      naValue,
      ghKh: khValue ? ghValue / khValue : 0,
      mgCa: caValue ? mgValue / caValue : 0,
      kNa: kValue ? naValue / kValue : 0,
      anions: sulfate + chloride,
      alkali: kValue + naValue,
      bicarbonateValue: Number(bicarbonate) || 0,
    };
  }, [gh, kh, mg, ca, potassium, sodium, sulfate, chloride, bicarbonate]);

  const resetPlan = () => {
    setGh("5.6");
    setKh("1.7");
    setMg("26");
    setCa("52");
    setSulfate(58);
    setChloride(42);
    setPotassium("8");
    setSodium("76");
    setBicarbonate("104");
    setSaved(false);
    setHandoff(false);
  };

  const copySummary = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const isGhKhInRange = values.ghKh >= 2.8 && values.ghKh <= 3.6;
  const isMgCaInRange = values.mgCa >= 0.35 && values.mgCa <= 0.7;
  const isAnionsInRange = values.anions <= 120;
  const isAlkaliInRange = values.alkali <= 90 && values.kNa >= 8 && values.kNa <= 12;
  const isBicarbonateInRange = values.bicarbonateValue >= 92 && values.bicarbonateValue <= 112;

  const constraints = [
    { label: "GH : KH", detail: "anchor ratio · 2.8–3.6 : 1", value: `${values.ghKh.toFixed(1)} : 1`, ok: isGhKhInRange },
    { label: "Mg : Ca", detail: "body balance · 0.35–0.70 : 1", value: `${values.mgCa.toFixed(2)} : 1`, ok: isMgCaInRange },
    { label: "SO₄ + Cl", detail: "anion ceiling · 120 ppm", value: `${values.anions} / 120`, ok: isAnionsInRange },
    { label: "K + Na", detail: "alkali ceiling · 90 ppm", value: `${values.alkali} / 90`, ok: isAlkaliInRange },
    { label: "Bicarbonate", detail: "finish line · 92–112 ppm", value: `${values.bicarbonateValue} ppm`, ok: isBicarbonateInRange },
  ];

  const statusCount = constraints.filter((constraint) => constraint.ok).length;

  return (
    <div className="workframe-app">
      <header className="wf-topbar">
        <div className="wf-brand">
          <span className="wf-brand-mark"><Beaker size={17} /></span>
          <div>
            <div className="wf-brand-name wf-display">Coffee Water Calculator</div>
            <div className="wf-brand-sub">A deliberate mineral workbench</div>
          </div>
        </div>
        <nav className="wf-tabs" aria-label="Workspace tabs">
          <button type="button" className={`wf-tab ${activeTab === "watermancer" ? "is-active" : ""}`} onClick={() => setActiveTab("watermancer")}>
            <Droplets size={13} /> <span className="wf-tab-label">Watermancer</span>
          </button>
          <button type="button" className={`wf-tab ${activeTab === "workframe" ? "is-active" : ""}`} onClick={() => setActiveTab("workframe")}>
            <FlaskConical size={13} /> <span className="wf-tab-label">Workframe</span>
          </button>
        </nav>
        <div className="wf-top-status">
          <span className="wf-status-dot" />
          <span>{activeTab === "workframe" ? "Planning mode" : "Handoff preview"}</span>
          <button type="button" className="wf-icon-btn" onClick={() => setLocked(!locked)} aria-label={locked ? "Unlock profile" : "Lock profile"}>
            <LockKeyhole size={13} />
          </button>
        </div>
      </header>

      <div className="wf-layout">
        <aside className="wf-rail">
          <div className="wf-overline">Profile sequence</div>
          <h2 className="wf-display">Build by<br />relationship.</h2>
          <p className="wf-rail-copy">Every choice earns its place. The rail keeps the chemistry in order.</p>
          <div className="wf-steps">
            {[
              ["Anchor GH : KH", "Hardness frame"],
              ["Set Mg : Ca", "Texture + body"],
              ["Cap SO₄ + Cl", "Flavor edge"],
              ["Cap K + Na", "Alkali check"],
              ["Complete HCO₃", "Close the loop"],
            ].map(([title, meta], index) => {
              const id = (index + 1) as StageId;
              return (
                <button key={title} type="button" className={`wf-step ${activeStage === id ? "is-active" : ""} ${id < 4 ? "is-done" : ""}`} onClick={() => setActiveStage(id)}>
                  <span className="wf-step-number">{id < 4 ? <Check size={11} /> : `0${id}`}</span>
                  <span><span className="wf-step-title">{title}</span><span className="wf-step-meta">{meta}</span></span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="wf-main">
          <div className="wf-main-header">
            <div>
              <div className="wf-overline">Workframe / Profile builder</div>
              <h1 className="wf-display">Build a water profile<br />from the inside out.</h1>
              <p>Anchor relationships first. Then spend the available mineral room with intention, until the profile reads as one coherent cup.</p>
            </div>
            <div className="wf-plan-chip"><Activity size={13} /> {statusCount}/5 constraints clear</div>
          </div>

          {activeTab === "watermancer" && (
            <div className="wf-callout"><Info size={14} /><span><strong>Watermancer handoff preview.</strong> Your profile stays here while you reason through the constraints. Carry it over when the relationships are settled.</span></div>
          )}
          {activeTab === "workframe" && (
            <div className="wf-callout"><Target size={14} /><span><strong>The order is the guardrail.</strong> Work top to bottom. Later stages can refine the profile, but never quietly rewrite an earlier anchor.</span></div>
          )}

          <div className="wf-stage-list">
            <section className={`wf-stage ${activeStage === 1 ? "is-active" : ""} is-done`}>
              <StageHeader id={1} title="Anchor the overall GH : KH ratio" kicker="hardness frame" note="Set the mineral backbone before choosing individual ions." active={activeStage === 1} done onClick={() => setActiveStage(1)} />
              {activeStage === 1 && <div className="wf-stage-content"><div className="wf-stage-content-inner">
                <div className="wf-control-grid">
                  <NumericControl label="General hardness" hint="anchor" value={gh} unit="°dGH" onChange={setGh} />
                  <NumericControl label="Carbonate hardness" hint="anchor" value={kh} unit="°dKH" onChange={setKh} />
                </div>
                <div className="wf-ratio-readout"><span>Live relationship</span><strong>{values.ghKh.toFixed(1)} : 1 <small>target 3.3 : 1</small></strong></div>
                <div className="wf-inline-actions"><button type="button" className="wf-ghost-btn" onClick={() => { setGh("5.6"); setKh("1.7"); }}>Use balanced anchor</button></div>
              </div></div>}
            </section>

            <section className={`wf-stage ${activeStage === 2 ? "is-active" : ""} is-done`}>
              <StageHeader id={2} title="Anchor Mg : Ca for body" kicker="texture balance" note="Magnesium brings lift; calcium gives the finish somewhere to land." active={activeStage === 2} done onClick={() => setActiveStage(2)} />
              {activeStage === 2 && <div className="wf-stage-content"><div className="wf-stage-content-inner">
                <div className="wf-control-grid">
                  <NumericControl label="Magnesium" hint="soft lift" value={mg} unit="ppm" onChange={setMg} />
                  <NumericControl label="Calcium" hint="structure" value={ca} unit="ppm" onChange={setCa} />
                </div>
                <div className="wf-ratio-readout"><span>Live relationship</span><strong>{values.mgCa.toFixed(2)} : 1 <small>target 0.50 : 1</small></strong></div>
                <div className="wf-inline-actions"><button type="button" className="wf-ghost-btn" onClick={() => { setMg("26"); setCa("52"); }}>Use 1 : 2 body</button></div>
              </div></div>}
            </section>

            <section className={`wf-stage ${activeStage === 3 ? "is-active" : ""}`}>
              <StageHeader id={3} title="Cap total sulfate and chloride" kicker="flavor edge" note="Spend the anion budget without letting either note dominate." active={activeStage === 3} done onClick={() => setActiveStage(3)} />
              {activeStage === 3 && <div className="wf-stage-content"><div className="wf-stage-content-inner">
                <div className="wf-slider-row">
                  <div><div className="wf-slider-label"><span>Sulfate</span><span>0–90 ppm</span></div><input className="wf-slider" type="range" min="0" max="90" value={sulfate} onChange={(event) => setSulfate(Number(event.target.value))} /></div>
                  <div className="wf-slider-output">{sulfate} ppm</div>
                </div>
                <div className="wf-slider-row">
                  <div><div className="wf-slider-label"><span>Chloride</span><span>0–90 ppm</span></div><input className="wf-slider" type="range" min="0" max="90" value={chloride} onChange={(event) => setChloride(Number(event.target.value))} /></div>
                  <div className="wf-slider-output">{chloride} ppm</div>
                </div>
                <RemainingBar label="Anion budget used" value={values.anions} max={120} unit="ppm" />
              </div></div>}
            </section>

            <section className={`wf-stage ${activeStage === 4 ? "is-active" : ""}`}>
              <StageHeader id={4} title="Cap potassium and sodium" kicker="alkali check" note="Keep K:Na close to 1:10 while staying inside the total ceiling." active={activeStage === 4} done onClick={() => setActiveStage(4)} />
              {activeStage === 4 && <div className="wf-stage-content"><div className="wf-stage-content-inner">
                <div className="wf-control-grid">
                  <NumericControl label="Potassium" hint="accent" value={potassium} unit="ppm" onChange={setPotassium} />
                  <NumericControl label="Sodium" hint="roundness" value={sodium} unit="ppm" onChange={setSodium} />
                </div>
                <div className="wf-ratio-readout"><span>K : Na relationship</span><strong>1 : {values.kNa.toFixed(1)} <small>target 1 : 10</small></strong></div>
                <RemainingBar label="Alkali budget used" value={values.alkali} max={90} unit="ppm" />
                <div className="wf-inline-actions"><button type="button" className="wf-ghost-btn" onClick={() => { setPotassium("8"); setSodium("76"); }}>Return to 1 : 10</button><button type="button" className="wf-ghost-btn" onClick={() => setActiveStage(5)}>Next: bicarbonate <ArrowRight size={12} /></button></div>
              </div></div>}
            </section>

            <section className={`wf-stage ${activeStage === 5 ? "is-active" : ""}`}>
              <StageHeader id={5} title="Bring bicarbonates up to finish" kicker="close the loop" note="Only now complete the GH : KH relationship with the buffer." active={activeStage === 5} done onClick={() => setActiveStage(5)} />
              {activeStage === 5 && <div className="wf-stage-content"><div className="wf-stage-content-inner">
                <div className="wf-control-grid"><NumericControl label="Bicarbonate" hint="buffer" value={bicarbonate} unit="ppm" onChange={setBicarbonate} /><div className="wf-control"><div className="wf-control-label"><span>Expected KH</span><em>from HCO₃</em></div><div className="wf-number-input"><strong className="wf-mono" style={{ color: "var(--wf-cyan)", fontSize: 23 }}>{(values.bicarbonateValue / 61.0 / 2.8).toFixed(1)}</strong><span>°dKH</span></div></div></div>
                <div className="wf-ratio-readout"><span>Buffer finish line</span><strong>{values.bicarbonateValue} ppm <small>target 92–112 ppm</small></strong></div>
                <div className="wf-inline-actions"><button type="button" className="wf-ghost-btn" onClick={() => setBicarbonate("104")}>Set calculated finish</button></div>
              </div></div>}
            </section>
          </div>
        </main>

        <aside className="wf-side">
          <div className="wf-side-sticky">
            <section className="wf-panel">
              <div className="wf-panel-heading"><h3 className="wf-display">Constraint monitor</h3><span className="wf-mono">{statusCount}/5</span></div>
              <div className="wf-health"><span className="wf-status-dot" /> all systems nominal</div>
              <div className="wf-constraint-list">
                {constraints.map((constraint) => <div className="wf-constraint" key={constraint.label}><span className="wf-constraint-dot" style={{ background: constraint.ok ? "var(--wf-teal)" : "var(--wf-amber)" }} /><span className="wf-constraint-label">{constraint.label}<small>{constraint.detail}</small></span><span className="wf-constraint-value">{constraint.value}<b style={{ color: constraint.ok ? "var(--wf-teal)" : "var(--wf-amber)" }}>{constraint.ok ? "Clear" : "Tune"}</b></span></div>)}
              </div>
            </section>

            <section className="wf-panel wf-profile-card">
              <div className="wf-panel-heading"><h3 className="wf-display">Profile summary</h3><span>{locked ? "LOCKED" : "DRAFT"}</span></div>
              <h2 className="wf-profile-name wf-display">House espresso / 01</h2>
              <p className="wf-profile-subtitle">Balanced sweetness · articulate finish · 1 L final water</p>
              <div className="wf-profile-metrics">
                <div className="wf-profile-metric"><label>GH</label><strong>{values.ghValue.toFixed(1)} <span>°dGH</span></strong></div>
                <div className="wf-profile-metric"><label>KH</label><strong>{values.khValue.toFixed(1)} <span>°dKH</span></strong></div>
                <div className="wf-profile-metric"><label>Mg / Ca</label><strong>{values.mgValue}<span> / {values.caValue}</span></strong></div>
                <div className="wf-profile-metric"><label>Anions</label><strong>{values.anions}<span> ppm</span></strong></div>
              </div>
              <div className="wf-profile-ratio"><span>GH : KH · K : Na</span><strong>{values.ghKh.toFixed(1)} : 1 · 1 : {values.kNa.toFixed(1)}</strong></div>
              <div className="wf-panel-actions">
                <button type="button" className="wf-primary-btn" onClick={() => { setSaved(true); setLocked(true); }}><Save size={13} /> Save as draft</button>
                <button type="button" className="wf-icon-btn" onClick={copySummary} aria-label="Copy profile summary">{copied ? <Check size={13} /> : <Copy size={13} />}</button>
              </div>
              <div className="wf-save-state">{saved ? "Draft saved locally · ready for handoff" : copied ? "Summary copied to clipboard" : "Example values · no API connected"}</div>
            </section>

            <section className="wf-handoff">
              <Share2 size={14} />
              <div><strong>Ready for Watermancer?</strong>Carry this relationship-first profile into the salt and dose workspace.
                <button type="button" onClick={() => { setHandoff(true); setActiveTab("watermancer"); }}>{handoff ? "Handoff staged" : "Carry to Watermancer"} <ArrowRight size={11} /></button>
              </div>
            </section>

            <div className="wf-bottom-note"><Gauge size={13} /> Room remaining is calculated against the example guardrails, not a live water source.</div>
            <button type="button" className="wf-ghost-btn" onClick={resetPlan}><RotateCcw size={11} /> Reset example plan</button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default WorkframeProfileBuilder;
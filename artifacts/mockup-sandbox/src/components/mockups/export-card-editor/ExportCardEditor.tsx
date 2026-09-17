import { useState, type CSSProperties, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Type,
  Waves,
} from "lucide-react";

import "./ExportCardEditor.css";

type FontKey = "fraunces" | "dm-sans" | "space-grotesk" | "instrument-serif";
type ScaleKey = "compact" | "balanced" | "large";
type DensityKey = "tight" | "roomy" | "airy";
type SectionKey = "water" | "minerals" | "analysis";

type Accent = {
  name: string;
  color: string;
  soft: string;
  deep: string;
};

const accents: Accent[] = [
  { name: "Sea glass", color: "#2caeaa", soft: "#d8f3ed", deep: "#0d6465" },
  { name: "Apricot", color: "#d5834e", soft: "#fce5d4", deep: "#914629" },
  { name: "Lilac", color: "#8d71c8", soft: "#e9e1fb", deep: "#574293" },
  { name: "Saffron", color: "#c5a12f", soft: "#f8efc6", deep: "#806b18" },
];

const fontOptions: Array<{ key: FontKey; label: string; sample: string }> = [
  { key: "fraunces", label: "Fraunces", sample: "Soft editorial" },
  { key: "dm-sans", label: "DM Sans", sample: "Neutral instrument" },
  { key: "space-grotesk", label: "Space Grotesk", sample: "Technical display" },
  { key: "instrument-serif", label: "Instrument Serif", sample: "Quiet classic" },
];

const scaleOptions: Array<{ key: ScaleKey; label: string }> = [
  { key: "compact", label: "Compact" },
  { key: "balanced", label: "Balanced" },
  { key: "large", label: "Large" },
];

const densityOptions: Array<{ key: DensityKey; label: string; note: string }> = [
  { key: "tight", label: "Tight", note: "less paper" },
  { key: "roomy", label: "Roomy", note: "recommended" },
  { key: "airy", label: "Airy", note: "more paper" },
];

const defaultSettings = {
  font: "fraunces" as FontKey,
  scale: "balanced" as ScaleKey,
  density: "roomy" as DensityKey,
  shadow: true,
  shadowIntensity: 52,
  accent: accents[0],
  sections: {
    water: true,
    minerals: true,
    analysis: true,
  },
};

const ionGroups = [
  {
    label: "Cations",
    ions: [
      { formula: "Ca²⁺", name: "Calcium", value: "1.2", color: "#c97838" },
      { formula: "Mg²⁺", name: "Magnesium", value: "0.1", color: "#bd9d28" },
      { formula: "Na⁺", name: "Sodium", value: "0.4", color: "#d75e77" },
      { formula: "K⁺", name: "Potassium", value: "0.0", color: "#8563c2" },
    ],
  },
  {
    label: "Anions",
    ions: [
      { formula: "HCO₃⁻", name: "Bicarbonate", value: "0.3", color: "#2caa9b" },
      { formula: "Cl⁻", name: "Chloride", value: "0.6", color: "#4d88c8" },
      { formula: "SO₄²⁻", name: "Sulfate", value: "2.8", color: "#6b73c7" },
    ],
  },
];

function ControlLabel({
  children,
  detail,
}: {
  children: ReactNode;
  detail?: string;
}) {
  return (
    <div className="control-label-row">
      <span>{children}</span>
      {detail ? <span className="control-detail">{detail}</span> : null}
    </div>
  );
}

function SectionToggle({
  label,
  detail,
  active,
  onChange,
}: {
  label: string;
  detail: string;
  active: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className={`section-toggle ${active ? "is-on" : ""}`}
      type="button"
      aria-pressed={active}
      onClick={onChange}
    >
      <span className="section-toggle-copy">
        {active ? <Eye size={14} strokeWidth={1.8} /> : <EyeOff size={14} strokeWidth={1.8} />}
        <span>
          <strong>{label}</strong>
          <small>{detail}</small>
        </span>
      </span>
      <span className="toggle-track" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

function ExportCardEditor() {
  const [settings, setSettings] = useState(defaultSettings);
  const { accent, sections } = settings;

  const updateSetting = <Key extends keyof typeof defaultSettings>(
    key: Key,
    value: (typeof defaultSettings)[Key],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const updateSection = (section: SectionKey) => {
    setSettings((current) => ({
      ...current,
      sections: { ...current.sections, [section]: !current.sections[section] },
    }));
  };

  const reset = () => setSettings({ ...defaultSettings, sections: { ...defaultSettings.sections } });

  const cardStyle = {
    "--card-accent": accent.color,
    "--card-accent-soft": accent.soft,
    "--card-ink": accent.deep,
    "--card-font": `var(--font-${settings.font})`,
    "--card-scale": settings.scale === "compact" ? "0.91" : settings.scale === "large" ? "1.08" : "1",
    "--card-row-gap": settings.density === "tight" ? "7px" : settings.density === "airy" ? "16px" : "11px",
    "--card-section-pad": settings.density === "tight" ? "17px" : settings.density === "airy" ? "28px" : "22px",
    "--formula-shadow": settings.shadow
      ? `0 ${Math.max(1, settings.shadowIntensity / 24).toFixed(1)}px ${Math.max(1, settings.shadowIntensity / 9).toFixed(1)}px rgba(24, 56, 58, ${(
          settings.shadowIntensity / 170
        ).toFixed(2)})`
      : "none",
  } as CSSProperties;

  return (
    <main className="export-editor-shell">
      <header className="editor-topbar">
        <div className="brand-lockup">
          <span className="brand-mark"><Waves size={17} strokeWidth={2.2} /></span>
          <span className="brand-name">watermancer</span>
          <span className="brand-slash">/</span>
          <span className="brand-context">export studio</span>
        </div>
        <div className="topbar-status">
          <span className="status-dot" />
          local preview
          <span className="status-divider" />
          <span className="version-label">card 04</span>
        </div>
      </header>

      <section className="editor-intro">
        <div>
          <p className="eyebrow"><Sparkles size={13} /> RECIPE CARD DESIGNER</p>
          <h1>Make the recipe<br /><em>worth keeping.</em></h1>
          <p className="intro-copy">Tune the visual language of a Watermancer card before it leaves the lab bench.</p>
        </div>
        <button className="reset-button" type="button" onClick={reset}>
          <RotateCcw size={15} strokeWidth={1.8} />
          Reset to default
        </button>
      </section>

      <div className="editor-workspace">
        <aside className="control-panel" aria-label="Export card controls">
          <div className="panel-heading">
            <span className="panel-index">01</span>
            <div>
              <p className="panel-kicker">Control surface</p>
              <h2>Card styling</h2>
            </div>
            <SlidersHorizontal size={17} className="panel-icon" strokeWidth={1.7} />
          </div>

          <div className="control-group">
            <ControlLabel detail="display + body"><Type size={14} /> Typeface</ControlLabel>
            <div className="select-shell">
              <select
                aria-label="Font family"
                value={settings.font}
                onChange={(event) => updateSetting("font", event.target.value as FontKey)}
              >
                {fontOptions.map((font) => <option key={font.key} value={font.key}>{font.label} — {font.sample}</option>)}
              </select>
              <ChevronDown size={15} />
            </div>
          </div>

          <div className="control-group">
            <ControlLabel detail={`${settings.scale} hierarchy`}>Typography scale</ControlLabel>
            <div className="segmented-control">
              {scaleOptions.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  className={settings.scale === option.key ? "is-selected" : ""}
                  onClick={() => updateSetting("scale", option.key)}
                >
                  {settings.scale === option.key ? <Check size={12} /> : null}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <ControlLabel detail="inner rhythm">Card density</ControlLabel>
            <div className="density-options">
              {densityOptions.map((option) => (
                <button
                  type="button"
                  key={option.key}
                  className={`density-option density-${option.key} ${settings.density === option.key ? "is-selected" : ""}`}
                  onClick={() => updateSetting("density", option.key)}
                >
                  <span className="density-preview"><i /><i /><i /></span>
                  <span className="density-copy"><strong>{option.label}</strong><small>{option.note}</small></span>
                </button>
              ))}
            </div>
          </div>

          <div className="control-group shadow-group">
            <div className="shadow-heading">
              <ControlLabel detail={settings.shadow ? `${settings.shadowIntensity}%` : "off"}>Formula label shadow</ControlLabel>
              <button
                type="button"
                className={`mini-switch ${settings.shadow ? "is-on" : ""}`}
                aria-label="Toggle formula label shadow"
                aria-pressed={settings.shadow}
                onClick={() => updateSetting("shadow", !settings.shadow)}
              >
                <span />
              </button>
            </div>
            <input
              className="intensity-range"
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.shadowIntensity}
              disabled={!settings.shadow}
              aria-label="Formula shadow intensity"
              onChange={(event) => updateSetting("shadowIntensity", Number(event.target.value))}
            />
            <div className="range-ends"><span>subtle</span><span>defined</span></div>
          </div>

          <div className="control-group">
            <ControlLabel detail={accent.name}>Accent color</ControlLabel>
            <div className="accent-options">
              {accents.map((option) => (
                <button
                  type="button"
                  key={option.name}
                  className={`accent-swatch ${accent.name === option.name ? "is-selected" : ""}`}
                  style={{ "--swatch": option.color } as CSSProperties}
                  aria-label={`Use ${option.name} accent`}
                  aria-pressed={accent.name === option.name}
                  onClick={() => updateSetting("accent", option)}
                >
                  {accent.name === option.name ? <Check size={14} /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group visibility-group">
            <ControlLabel detail="show on card">Visible sections</ControlLabel>
            <SectionToggle label="Water steps" detail="RO / distilled water" active={sections.water} onChange={() => updateSection("water")} />
            <SectionToggle label="Mineral recipe" detail="salts + mixing order" active={sections.minerals} onChange={() => updateSection("minerals")} />
            <SectionToggle label="Mineral analysis" detail="ion balance + totals" active={sections.analysis} onChange={() => updateSection("analysis")} />
          </div>

          <div className="panel-footnote">
            <span className="footnote-line" />
            <p>Every change is previewed locally.<br />No recipe data leaves this window.</p>
          </div>
        </aside>

        <section className="preview-stage" aria-label="Live export card preview">
          <div className="preview-heading">
            <div>
              <span className="preview-kicker">LIVE EXPORT</span>
              <span className="preview-size">1200 × auto</span>
            </div>
            <span className="preview-pulse"><i /> updates instantly</span>
          </div>
          <div className="paper-shadow">
            <article className="export-card" style={cardStyle}>
              <div className="paper-grain" />
              <header className="card-header">
                <div className="card-brand">
                  <span className="card-water-mark"><Waves size={15} /></span>
                  <span>WATERMANCER</span>
                </div>
                <span className="card-serial">WM / 0427 / RECIPE</span>
              </header>
              <div className="card-title-row">
                <div>
                  <p className="card-overline">FILTER COFFEE · PREPARED WATER</p>
                  <h2>Bright Cup</h2>
                  <p className="card-meta">2 L finished batch <span /> tuned for a washed Ethiopia</p>
                </div>
                <div className="target-stamp">
                  <span>APPROX. TDS</span>
                  <strong>98.6</strong>
                  <small>mg/L</small>
                </div>
              </div>

              {sections.water ? (
                <CardSection label="01" title="Prepare the water" tone="dark">
                  <div className="step-list">
                    <RecipeRow label="BASE" title="RO / distilled water" amount="1.75 L" meta="start with a clean, low-mineral base" />
                    <RecipeRow label="TOP UP" title="RO / distilled water" amount="250 mL" meta="reserve for final volume" />
                  </div>
                </CardSection>
              ) : null}

              {sections.minerals ? (
                <CardSection label="02" title="Add the mineral salts" tone="dark">
                  <p className="section-intro">Add one salt at a time. Stir until fully dissolved before adding the next.</p>
                  <div className="step-list">
                    <RecipeRow label="01 / HEXAHYDRATE" title="Magnesium sulfate" formula="MgSO₄" amount="12.5 mg" meta="contributes 1.2 mg/L magnesium" />
                    <RecipeRow label="02 / ANHYDROUS" title="Calcium sulfate" formula="CaSO₄" amount="8.0 mg" meta="contributes 1.2 mg/L calcium" />
                    <RecipeRow label="03 / LAST" title="Sodium bicarbonate" formula="NaHCO₃" amount="1.6 mg" meta="dissolve only after the other salts are clear" flagged />
                  </div>
                  <div className="mixing-note"><span>MIXING VESSEL</span> Reserve 500 mL for the salt concentrate, then rinse the vessel into the batch.</div>
                </CardSection>
              ) : null}

              {sections.analysis ? (
                <CardSection label="03" title="Mineral analysis" tone="light">
                  <div className="analysis-title-row">
                    <div>
                      <p className="analysis-overline">FINAL MIX / ION BALANCE</p>
                      <h3>Bright Cup</h3>
                    </div>
                    <span className="analysis-unit">mg/L</span>
                  </div>
                  <div className="ion-groups">
                    {ionGroups.map((group) => (
                      <div className="ion-group" key={group.label}>
                        <p className="ion-group-label">{group.label}</p>
                        {group.ions.map((ion) => (
                          <div className="ion-row" key={ion.formula}>
                            <div className="ion-copy">
                              <strong className="formula-label" style={{ "--formula-color": ion.color } as CSSProperties}>{ion.formula}</strong>
                              <span>{ion.name}</span>
                            </div>
                            <strong className="ion-value" style={{ color: ion.color }}>{ion.value}</strong>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="analysis-metrics">
                    <Metric label="GH" value="4.1" unit="°dH" />
                    <Metric label="KH" value="0.8" unit="°dH" />
                    <Metric label="ION TOTAL" value="5.4" unit="mg/L" />
                  </div>
                </CardSection>
              ) : null}

              <footer className="card-footer">
                <p><span className="footer-dot" /> Verify the water is clear and all minerals are dissolved before brewing.</p>
                <span className="footer-mark">W / 04</span>
              </footer>
            </article>
          </div>
          <div className="preview-caption">
            <span><span className="caption-marker" /> paper artifact</span>
            <span>formula shadow: {settings.shadow ? "on" : "off"}</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function CardSection({
  label,
  title,
  tone,
  children,
}: {
  label: string;
  title: string;
  tone: "dark" | "light";
  children: ReactNode;
}) {
  return (
    <section className={`card-section ${tone === "light" ? "card-section-light" : "card-section-dark"}`}>
      <div className="card-section-heading">
        <div><span>{label} /</span><h4>{title}</h4></div>
        <span className="section-rule" />
      </div>
      {children}
    </section>
  );
}

function RecipeRow({
  label,
  title,
  formula,
  amount,
  meta,
  flagged = false,
}: {
  label: string;
  title: string;
  formula?: string;
  amount: string;
  meta: string;
  flagged?: boolean;
}) {
  return (
    <div className={`recipe-row ${flagged ? "recipe-row-flagged" : ""}`}>
      <div className="recipe-row-copy">
        <span className="recipe-row-label">{label}</span>
        <strong>{title} {formula ? <em className="recipe-formula">{formula}</em> : null}</strong>
        <small>{meta}</small>
      </div>
      <strong className="recipe-amount">{amount}</strong>
    </div>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="analysis-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{unit}</small>
    </div>
  );
}

export { ExportCardEditor };
export default ExportCardEditor;
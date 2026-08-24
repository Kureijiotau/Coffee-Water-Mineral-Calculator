import { Beaker, Calculator, Coffee, Droplets, FlaskConical, Gauge, Layers3, MessageCircle, Save } from 'lucide-react';
import mark from '@assets/image_1787373159788.png';

export type AppView = 'intro' | 'brewer' | 'alchemist' | 'watermancer' | 'concentrate' | 'outro';

function Header({ view }: { view: AppView }) {
  const calculator = view !== 'concentrate';
  return (
    <>
      <header className="app-header">
        <div className="brand-lockup">
          <img className="brand-mark" src={mark} alt="" />
          <div>
            <div className="brand-title">WATERMANCER</div>
            <div className="brand-subtitle">Min-Max Your Coffee Water Chemistry</div>
          </div>
        </div>
        <nav className="top-nav" aria-label="Product navigation">
          <div className="top-nav-item" aria-hidden="true"><MessageCircle /></div>
          <div className="top-nav-item"><Save /> Sessions</div>
          <div className={`top-nav-item ${calculator ? 'selected' : ''}`}><Calculator /> Calculator</div>
          <div className={`top-nav-item ${!calculator ? 'selected' : ''}`}><Beaker /> Concentrate</div>
        </nav>
      </header>
      <div className="detail-bar">
        <div className="detail-copy">
          <Gauge />
          <div>
            <div className="detail-heading">Detail level</div>
            <div className="detail-help">Choose how much detail to show. Brewer mode keeps the focus on simple salt recipes.</div>
          </div>
        </div>
        <div className="mode-tabs">
          {[
            ['brewer', 'Brewer', Coffee],
            ['alchemist', 'Alchemist', FlaskConical],
            ['watermancer', 'Watermancer', Beaker],
          ].map(([id, label, Icon]) => (
            <div key={id as string} className={`mode-tab ${view === id || (view === 'intro' && id === 'brewer') ? 'active' : ''}`}>
              <Icon /><span>{label as string}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Brewer({ intro = false }: { intro?: boolean }) {
  return (
    <div>
      <div className="screen-card">
        <div className="card-head">
          <div><div className="eyebrow">Flavor builder</div><div className="card-title">Choose a starting direction</div><p className="helper">Shape the cup with a simple flavor-first recipe using RO / distilled water.</p></div>
          <div className="chip">Flavor first</div>
        </div>
      </div>
      {intro && <div className="screen-card soft crash-course"><div className="card-head"><div><div className="eyebrow" style={{ color: 'var(--lime)' }}>New to water?</div><div className="card-title">Hey, new to water? Start here</div><p className="helper">Robert Asami's one-week crash course turns mineral choices into seven small experiments.</p></div><div className="chip lime">7-day crash course</div></div></div>}
      <div className="screen-card soft build-card">
        <div className="card-head">
          <div><div className="eyebrow">Build your water by flavor</div><div className="card-title" style={{ fontSize: '.72vw', fontWeight: 500, color: 'var(--muted)' }}>Start with RO / distilled water, then click the pyramid or drag the star.</div></div>
          <div className="chip violet">Build from my coffee</div>
        </div>
        <div className="content-row">
          <div>
            <p className="helper">Your mineral recipe updates instantly.</p>
            <div className="pyramid-wrap" style={{ marginTop: '.85vw' }}>
              <div className="pyramid-label">Drag the star to shape your cup</div>
              <div className="pyramid-title">Brightness / Fruit Acidity</div>
              <div className="pyramid">
                <span className="axis-label axis-top">Bright</span><span className="axis-label axis-left">Sweet</span><span className="axis-label axis-right">Body</span>
                <div className="pyramid-star" />
              </div>
            </div>
          </div>
          <div className="row-list">
            <div className="list-heading">Current recipe · 1 liter</div>
            <div className="metric-grid" style={{ marginTop: '.8vw' }}>
              <div className="metric"><div className="metric-label">Water</div><div className="metric-value">1<span className="metric-unit"> L</span></div></div>
              <div className="metric"><div className="metric-label">Calcium</div><div className="metric-value violet">35<span className="metric-unit"> ppm</span></div></div>
              <div className="metric"><div className="metric-label">GH</div><div className="metric-value lime">65<span className="metric-unit"> ppm</span></div></div>
            </div>
            {[
              ['Magnesium sulfate', '0.38 g', 'var(--violet)'],
              ['Calcium chloride', '0.21 g', 'var(--cyan)'],
              ['Sodium bicarbonate', '0.09 g', 'var(--lime)'],
            ].map(([name, amount, color]) => <div className="list-row" key={name}><span>{name}</span><strong style={{ color }}>{amount}</strong></div>)}
            <div className="foot-note"><Droplets size=".72vw" style={{ verticalAlign: 'middle', marginRight: '.3vw', color: 'var(--cyan)' }} /> Balanced · ready to brew</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Alchemist() {
  return <div className="screen-card">
    <div className="card-head"><div><div className="eyebrow" style={{ color: 'var(--violet)' }}>Alchemist workspace</div><div className="card-title">Tune a complete mineral recipe</div></div><div className="chip violet"><FlaskConical /> Profile loaded · soft + sweet</div></div>
    <div className="panel-grid">
      <div className="info-panel"><div className="eyebrow">Starting water</div><h3>Third Wave Water</h3><p>Light roast profile · 100 ppm starting point</p><div className="readout"><strong>65</strong><span>GH / ppm</span></div></div>
      <div className="info-panel"><div className="eyebrow" style={{ color: 'var(--cyan)' }}>Taste direction</div><h3>Sweet · clear · balanced</h3><p>Adjust the controls to see the chemistry respond in real time.</p><div className="slider"><i /></div><div className="readout"><span>brightness</span><strong style={{ color: 'var(--cyan)' }}>70</strong></div></div>
      <div className="info-panel" style={{ gridColumn: '1 / -1' }}><div className="list-heading">Dose into 1 liter</div>{[['Magnesium sulfate','0.38 g','var(--violet)'],['Calcium chloride','0.21 g','var(--cyan)'],['Sodium bicarbonate','0.09 g','var(--lime)']].map(([name, amount, color]) => <div className="list-row" key={name}><span>{name}</span><strong style={{ color }}>{amount}</strong></div>)}</div>
    </div>
  </div>;
}

function Watermancer() {
  return <div className="screen-card">
    <div className="card-head"><div><div className="eyebrow" style={{ color: 'var(--lime)' }}>Watermancer workspace</div><div className="card-title">Match water to your target ions</div></div><div className="chip lime">Best match found</div></div>
    <div className="panel-grid three">
      <div className="info-panel"><div className="eyebrow" style={{ color: 'var(--lime)' }}>Target profile</div><h3>AIKI · soft + sweet</h3><p>Calcium, magnesium, bicarbonate and sodium targets in one view.</p><div className="readout"><strong style={{ color: 'var(--lime)' }}>96.8</strong><span>match score</span></div></div>
      <div className="info-panel"><div className="eyebrow">Chemistry readout</div>{[['Calcium','35','34.7','var(--cyan)'],['Magnesium','18','18.2','var(--violet)'],['Bicarbonate','40','39.4','var(--lime)']].map(([name, target, result, color]) => <div className="list-row" key={name}><span>{name}</span><strong style={{ color }}>{target} → {result}</strong></div>)}</div>
      <div className="info-panel"><div className="eyebrow" style={{ color: 'var(--gold)' }}>Mineral plan</div><h3>Add only what is missing</h3><p>0 overshoots · 4 ions in range</p><div className="slider"><i style={{ width: '94%', background: 'linear-gradient(90deg, var(--lime), var(--cyan))' }} /></div><div className="readout"><span>precision</span><strong style={{ color: 'var(--lime)' }}>high</strong></div></div>
    </div>
  </div>;
}

function Concentrate() {
  return <div className="screen-card">
    <div className="card-head"><div><div className="eyebrow" style={{ color: 'var(--gold)' }}>Concentrate workspace</div><div className="card-title">Make the dose repeatable</div></div><div className="chip gold">10× strength</div></div>
    <div className="concentrate-layout">
      <div className="bottle-panel"><div className="bottle" /><div><div className="eyebrow" style={{ color: 'var(--gold)' }}>Stock bottle</div><h3 style={{ margin: '.45vw 0', fontSize: '.88vw' }}>100 mL mineral stock</h3><p className="helper">Choose a dropper and calibrate your dose for reliable repeats.</p><div className="chip" style={{ marginTop: '.85vw' }}>18 drops / 320 mL brew</div></div></div>
      <div className="recipe-list"><div className="list-heading">Bottle recipe · 10× strength</div>{[['Magnesium sulfate','3.80 g'],['Calcium chloride','2.10 g'],['Sodium bicarbonate','0.90 g']].map(([name, amount]) => <div className="list-row" key={name}><span>{name}</span><strong>{amount}</strong></div>)}<div className="foot-note"><Layers3 size=".72vw" style={{ verticalAlign: 'middle', marginRight: '.3vw', color: 'var(--gold)' }} /> Straight dropper calibrated · 20 drops / mL</div></div>
    </div>
  </div>;
}

export function AppScreen({ view }: { view: AppView }) {
  return <div className="app-capture">
    <div className="app-camera capture-zoom">
      <div className="capture-inner">
        <Header view={view} />
        <main className="workspace-content">
          {view === 'intro' && <Brewer intro />}
          {view === 'brewer' && <Brewer />}
          {view === 'alchemist' && <Alchemist />}
          {view === 'watermancer' && <Watermancer />}
          {view === 'concentrate' && <Concentrate />}
          {view === 'outro' && <Brewer />}
        </main>
      </div>
      <div className="focus-ring" style={{ left: view === 'watermancer' ? '66vw' : view === 'concentrate' ? '74vw' : '49vw', top: view === 'intro' ? '65vh' : '49vh' }} />
      <div className="app-footer">offline-first · chemistry for the curious brewer</div>
    </div>
  </div>;
}
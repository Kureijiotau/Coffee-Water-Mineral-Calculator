import { motion } from 'framer-motion';
import { Check, Crosshair, FlaskConical, Target } from 'lucide-react';
import { Label, Metric, MiniHeader, Panel, Pill, SectionTitle, Sparkline, easeOut } from '../SceneUI';

export function Scene4() {
  return (
    <div className="scene" style={{ padding: '8.7vw 8vw 5vw 12vw' }}>
      <div style={{ width: '28vw', paddingTop: '3vw' }}>
        <SectionTitle eyebrow="03 / WATERMANCER" title="Find the water that fits." detail="Match a target profile, see the chemistry, and know exactly what to add." />
        <motion.div initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .95, duration: .6, ease: easeOut }} style={{ display: 'flex', gap: '.55vw', marginTop: '2vw' }}>
          <Pill tone="lime"><Check size=".78vw" /> best match found</Pill>
          <span className="mono" style={{ fontSize: '.68vw', color: 'var(--muted)' }}>coverage 96.8%</span>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, x: '2vw' }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .25, duration: 1, ease: easeOut }} style={{ position: 'absolute', right: '7.5vw', top: '5.6vw', width: '44vw' }}>
        <Panel delay={.25}>
          <div style={{ padding: '1.25vw 1.45vw 1.1vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <MiniHeader number="C3" label="WATER MATCH" color="var(--lime)" />
              <Pill tone="lime"><Target size=".72vw" /> profile match</Pill>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.4vw' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.65vw', marginBottom: '1.1vw' }}>
                  <div style={{ width: '3.3vw', height: '3.3vw', display: 'grid', placeItems: 'center', borderRadius: '50%', border: '2px solid var(--lime)', boxShadow: '0 0 2vw rgba(200,232,125,.16)' }}>
                    <span className="mono" style={{ color: 'var(--lime)', fontSize: '1.1vw' }}>96.8</span>
                  </div>
                  <div><Label tone="lime">recommended source</Label><div style={{ fontSize: '1.08vw', fontWeight: 700, marginTop: '.28vw' }}>Crystal Geyser</div><span className="mono" style={{ color: 'var(--muted)', fontSize: '.68vw' }}>add minerals to land on target</span></div>
                </div>
                <div style={{ padding: '.75vw .9vw', border: '1px solid rgba(190,204,236,.1)', borderRadius: '.75vw' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.35vw' }}><Label>match confidence</Label><span className="mono" style={{ fontSize: '.68vw', color: 'var(--lime)' }}>high</span></div>
                  <Sparkline color="var(--lime)" points="0,31 27,27 51,28 75,16 101,19 128,8 150,11" />
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(190,204,236,.1)', paddingLeft: '1.35vw' }}>
                <div className="tiny-label mono">TARGET / RESULT</div>
                {[
                  ['Calcium', '35', '34.7', 'var(--cyan)'],
                  ['Magnesium', '18', '18.2', 'var(--violet)'],
                  ['Bicarbonate', '40', '39.4', 'var(--lime)'],
                  ['Sodium', '10', '10.1', 'var(--coral)'],
                ].map(([name, target, result, color], index) => (
                  <motion.div key={name} initial={{ opacity: 0, x: '.6vw' }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .7 + index * .12, duration: .35, ease: easeOut }} style={{ display: 'grid', gridTemplateColumns: '1fr .5fr .5fr', padding: '.62vw 0', borderBottom: '1px solid rgba(190,204,236,.08)', fontSize: '.74vw' }}>
                    <span style={{ color: '#cbd5e5' }}>{name}</span><span className="mono" style={{ color: 'var(--muted)' }}>{target}</span><span className="mono" style={{ color }}>{result}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.2vw', marginTop: '1.15vw', paddingTop: '.8vw', borderTop: '1px solid rgba(190,204,236,.1)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.35vw', color: 'var(--lime)', fontSize: '.7vw' }}><Crosshair size=".75vw" /> 4 ions in range</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '.35vw', color: 'var(--muted)', fontSize: '.7vw' }}><FlaskConical size=".75vw" /> 0 overshoots</span>
            </div>
          </div>
        </Panel>
      </motion.div>
    </div>
  );
}
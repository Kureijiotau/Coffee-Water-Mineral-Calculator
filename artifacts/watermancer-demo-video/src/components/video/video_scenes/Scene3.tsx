import { motion } from 'framer-motion';
import { Beaker, CircleDot, WandSparkles } from 'lucide-react';
import { Label, Metric, MiniHeader, Panel, Pill, SectionTitle, SaltRow, easeOut } from '../SceneUI';

export function Scene3() {
  return (
    <div className="scene" style={{ padding: '8.7vw 8vw 5vw 12vw' }}>
      <div style={{ width: '27vw', paddingTop: '3.5vw' }}>
        <SectionTitle eyebrow="02 / ALCHEMIST" title="Turn minerals into a recipe." detail="Choose a starting water, then tune the salts with a clear view of every ion." />
        <motion.div initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .95, duration: .6, ease: easeOut }} style={{ marginTop: '2vw', display: 'flex', flexDirection: 'column', gap: '.55vw' }}>
          <Pill tone="violet"><WandSparkles size=".8vw" /> AIKI profile · soft + sweet</Pill>
          <Label>target taste profile loaded</Label>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, scale: .94, rotate: 1.5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ delay: .25, duration: 1, ease: easeOut }} style={{ position: 'absolute', right: '8vw', top: '5.7vw', width: '43vw' }}>
        <Panel delay={.25}>
          <div style={{ padding: '1.3vw 1.5vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <MiniHeader number="B2" label="MINERAL BLEND" color="var(--violet)" />
              <Pill tone="violet"><Beaker size=".75vw" /> batch 014</Pill>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '1.5vw' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.05vw' }}>
                <div style={{ padding: '1vw', borderRadius: '.8vw', background: 'linear-gradient(130deg, rgba(157,141,245,.17), rgba(110,231,235,.05))', border: '1px solid rgba(157,141,245,.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Label>water source</Label><CircleDot size=".9vw" color="var(--violet)" /></div>
                  <div style={{ marginTop: '.5vw', fontSize: '1.18vw', fontWeight: 700, letterSpacing: '-.04em' }}>Third Wave Water</div>
                  <div className="mono" style={{ marginTop: '.35vw', color: 'var(--muted)', fontSize: '.7vw' }}>light roast · 100 ppm</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6vw' }}>
                  <Metric icon="gauge" label="GH" value="65" unit="ppm" tone="violet" />
                  <Metric icon="scale" label="KH" value="40" unit="ppm" tone="cyan" />
                </div>
              </div>
              <div style={{ paddingLeft: '1.3vw', borderLeft: '1px solid rgba(190,204,236,.1)' }}>
                <div className="tiny-label mono" style={{ marginBottom: '.25vw' }}>DOSE INTO 1L</div>
                <SaltRow name="Magnesium sulfate" amount="0.38 g" color="var(--violet)" index={0} />
                <SaltRow name="Calcium chloride" amount="0.21 g" color="var(--cyan)" index={1} />
                <SaltRow name="Sodium bicarbonate" amount="0.09 g" color="var(--lime)" index={2} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1vw', color: 'var(--muted)', fontSize: '.7vw' }}><span>predicted cup</span><span className="mono" style={{ color: 'var(--lime)' }}>sweet / clear</span></div>
              </div>
            </div>
          </div>
        </Panel>
      </motion.div>
    </div>
  );
}
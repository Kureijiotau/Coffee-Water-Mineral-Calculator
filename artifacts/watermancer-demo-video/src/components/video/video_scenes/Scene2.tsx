import { motion } from 'framer-motion';
import { ChevronRight, Coffee, Timer } from 'lucide-react';
import { Metric, MiniHeader, Panel, Pill, RecipeStamp, SectionTitle, Sparkline, WaterDrop, easeOut } from '../SceneUI';

export function Scene2() {
  return (
    <div className="scene" style={{ padding: '8.7vw 8vw 5vw 12vw' }}>
      <div style={{ width: '29vw', paddingTop: '3vw' }}>
        <SectionTitle eyebrow="01 / BREWER" title="Start with the cup." detail="Set the recipe. Watermancer keeps the ratios and the water in the same frame." />
        <motion.div initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .9, duration: .6, ease: easeOut }} style={{ display: 'flex', alignItems: 'center', gap: '.5vw', marginTop: '2vw' }}>
          <Pill tone="cyan"><Coffee size=".8vw" /> V60 / washed Ethiopia</Pill>
          <span className="mono" style={{ color: 'var(--muted-2)', fontSize: '.7vw' }}>08:42</span>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, x: '2vw', rotateY: 8 }} animate={{ opacity: 1, x: 0, rotateY: 0 }} transition={{ delay: .3, duration: 1, ease: easeOut }} style={{ position: 'absolute', right: '7vw', top: '6vw', width: '45vw', perspective: '1000px' }}>
        <Panel className="app-card" delay={.3}>
          <div style={{ padding: '1.25vw 1.45vw .85vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <MiniHeader number="A1" label="BREW RECIPE" />
              <Pill tone="lime">balanced</Pill>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: '1.2vw' }}>
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.6vw', marginBottom: '1vw' }}>
                  <Metric icon="drop" label="WATER" value="320" unit="ml" tone="cyan" />
                  <Metric icon="scale" label="COFFEE" value="20" unit="g" tone="violet" />
                  <Metric icon="gauge" label="RATIO" value="16" unit=": 1" tone="lime" />
                </div>
                <div style={{ padding: '.85vw 1vw', border: '1px solid rgba(190,204,236,.1)', borderRadius: '.75vw', background: 'rgba(10,15,28,.25)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.2vw' }}><span className="mono" style={{ fontSize: '.7vw', color: 'var(--muted)' }}>brew curve</span><span className="mono" style={{ fontSize: '.7vw', color: 'var(--cyan)' }}>02:48</span></div>
                  <Sparkline />
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(190,204,236,.1)', paddingLeft: '1.2vw' }}>
                <div className="tiny-label mono">POUR PLAN</div>
                {['Bloom · 45g', 'Pulse 01 · 110g', 'Pulse 02 · 165g'].map((pour, index) => (
                  <motion.div key={pour} initial={{ opacity: 0, x: '.6vw' }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .75 + index * .12, duration: .35, ease: easeOut }} style={{ display: 'flex', alignItems: 'center', gap: '.55vw', padding: '.72vw 0', borderBottom: '1px solid rgba(190,204,236,.08)', color: index === 0 ? 'var(--cyan)' : '#c7d0e3', fontSize: '.78vw' }}>
                    <WaterDrop size={8} color={index === 0 ? 'var(--cyan)' : 'var(--violet)'} delay={.8 + index * .13} />{pour}<ChevronRight size=".75vw" style={{ marginLeft: 'auto', opacity: .45 }} />
                  </motion.div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.2vw', paddingTop: '.8vw', borderTop: '1px solid rgba(190,204,236,.1)' }}>
              <RecipeStamp><Timer size=".72vw" /> recipe synced · ready to brew</RecipeStamp>
              <span className="mono" style={{ color: 'var(--muted-2)', fontSize: '.65vw' }}>saved just now</span>
            </div>
          </div>
        </Panel>
      </motion.div>
    </div>
  );
}
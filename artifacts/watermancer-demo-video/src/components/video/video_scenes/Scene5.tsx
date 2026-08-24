import { motion } from 'framer-motion';
import { ArrowDownToLine, BottleWine, Droplets, Pipette, Scale } from 'lucide-react';
import straightDropper from '@assets/straight_1786763676557.jpg';
import roundedDropper from '@assets/rounded_1786763676557.jpg';
import { Label, MiniHeader, Panel, Pill, SectionTitle, SaltRow, easeOut } from '../SceneUI';

export function Scene5() {
  return (
    <div className="scene" style={{ padding: '8.7vw 8vw 5vw 12vw' }}>
      <div style={{ width: '27vw', paddingTop: '3vw' }}>
        <SectionTitle eyebrow="04 / CONCENTRATE" title="Make the dose repeatable." detail="Convert the plan into a bottle you can trust — drops, strength, and all." />
        <motion.div initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .95, duration: .6, ease: easeOut }} style={{ marginTop: '2vw' }}>
          <Pill tone="coral"><BottleWine size=".8vw" /> 100 mL stock bottle</Pill>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, scale: .95, rotateY: -8 }} animate={{ opacity: 1, scale: 1, rotateY: 0 }} transition={{ delay: .24, duration: 1, ease: easeOut }} style={{ position: 'absolute', right: '7.4vw', top: '5.2vw', width: '44vw', perspective: '1000px' }}>
        <Panel delay={.24}>
          <div style={{ padding: '1.2vw 1.45vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <MiniHeader number="D4" label="STOCK CONCENTRATE" color="var(--coral)" />
              <Pill tone="coral"><Scale size=".72vw" /> 10× strength</Pill>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: '1.3vw' }}>
              <div>
                <div style={{ display: 'flex', gap: '.8vw', alignItems: 'flex-end', height: '9.4vw', marginBottom: '1vw', padding: '0 .8vw' }}>
                  <div style={{ position: 'relative', width: '5vw', height: '7.4vw', border: '1px solid rgba(231,155,121,.48)', borderRadius: '1vw .9vw .8vw .8vw', background: 'linear-gradient(105deg, rgba(231,155,121,.18), rgba(157,141,245,.08))', boxShadow: '0 1vw 2vw rgba(4,8,18,.28)' }}>
                    <div style={{ position: 'absolute', top: '-1.15vw', left: '1.2vw', width: '2.55vw', height: '1.25vw', borderRadius: '.4vw', background: '#2d374b', border: '1px solid rgba(231,155,121,.4)' }} />
                    <div style={{ position: 'absolute', top: '3.3vw', left: '.7vw', right: '.7vw', padding: '.38vw .2vw', textAlign: 'center', borderTop: '1px solid rgba(231,155,121,.34)', borderBottom: '1px solid rgba(231,155,121,.34)', color: 'var(--coral)', fontSize: '.55vw', letterSpacing: '.09em' }}>WATERMANCER<br /><span style={{ color: 'var(--muted)', fontSize: '.42vw' }}>MINERAL STOCK</span></div>
                  </div>
                  <div style={{ position: 'relative', width: '3.6vw', height: '5.6vw', border: '1px solid rgba(110,231,235,.36)', borderRadius: '.7vw .7vw .5vw .5vw', background: 'linear-gradient(105deg, rgba(110,231,235,.16), rgba(157,141,245,.08))' }}>
                    <div style={{ position: 'absolute', top: '-.8vw', left: '.9vw', width: '1.75vw', height: '.9vw', borderRadius: '.3vw', background: '#2d374b', border: '1px solid rgba(110,231,235,.4)' }} />
                    <div style={{ position: 'absolute', top: '2.3vw', left: '.4vw', right: '.4vw', textAlign: 'center', color: 'var(--cyan)', fontSize: '.48vw', letterSpacing: '.05em' }}>DROP<br />PERFECT</div>
                  </div>
                  <div style={{ alignSelf: 'center', color: 'var(--muted-2)' }}><ArrowDownToLine size="1.15vw" /></div>
                  <div style={{ alignSelf: 'center', color: 'var(--cyan)' }}><Pipette size="1.35vw" /></div>
                </div>
                <div style={{ display: 'flex', gap: '.5vw' }}>
                  <div style={{ flex: 1, height: '2.5vw', overflow: 'hidden', borderRadius: '.55vw', border: '1px solid rgba(190,204,236,.1)' }}><img src={roundedDropper} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 32%', filter: 'saturate(.72) contrast(1.06)' }} /></div>
                  <div style={{ flex: 1, height: '2.5vw', overflow: 'hidden', borderRadius: '.55vw', border: '1px solid rgba(190,204,236,.1)' }}><img src={straightDropper} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%', filter: 'saturate(.72) contrast(1.06)' }} /></div>
                  <div style={{ width: '7.5vw', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '.62vw' }}>choose your dropper</div>
                </div>
              </div>
              <div style={{ borderLeft: '1px solid rgba(190,204,236,.1)', paddingLeft: '1.3vw' }}>
                <div className="tiny-label mono" style={{ marginBottom: '.15vw' }}>BOTTLE RECIPE</div>
                <SaltRow name="Magnesium sulfate" amount="3.80 g" color="var(--violet)" index={0} />
                <SaltRow name="Calcium chloride" amount="2.10 g" color="var(--cyan)" index={1} />
                <SaltRow name="Sodium bicarbonate" amount="0.90 g" color="var(--lime)" index={2} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4vw', marginTop: '.95vw', color: 'var(--coral)', fontSize: '.7vw' }}><Droplets size=".8vw" /> 18 drops / 320 mL brew</div>
              </div>
            </div>
          </div>
        </Panel>
      </motion.div>
    </div>
  );
}
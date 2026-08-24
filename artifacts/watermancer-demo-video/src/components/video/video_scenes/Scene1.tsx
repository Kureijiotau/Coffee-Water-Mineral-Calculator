import { motion } from 'framer-motion';
import mark from '@assets/image_1787373159788.png';
import { Label, Pill, easeOut } from '../SceneUI';

export function Scene1() {
  return (
    <div className="scene" style={{ padding: '10vw 10.5vw' }}>
      <motion.div
        initial={{ opacity: 0, scale: .72, rotate: -18 }}
        animate={{ opacity: .13, scale: 1, rotate: 9 }}
        transition={{ duration: 1.4, ease: easeOut }}
        style={{ position: 'absolute', right: '8vw', top: '9vw', width: '37vw', height: '37vw', border: '1px solid var(--cyan)', borderRadius: '50%', boxShadow: '0 0 0 2vw rgba(110,231,235,.03), 0 0 5vw rgba(110,231,235,.1)' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: .2 }}
        animate={{ opacity: .18, scale: 1 }}
        transition={{ delay: .35, duration: 1.2, ease: easeOut }}
        style={{ position: 'absolute', right: '25vw', top: '17vw', width: '16vw', height: '16vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(157,141,245,.5), rgba(157,141,245,0) 68%)', filter: 'blur(1vw)' }}
      />
      <motion.div initial={{ opacity: 0, x: '-2vw' }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .7, ease: easeOut }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.7vw', marginBottom: '2.4vw' }}>
          <img src={mark} alt="" style={{ width: '2.6vw', height: '2.6vw', objectFit: 'contain', mixBlendMode: 'screen' }} />
          <span className="mono" style={{ color: 'var(--ink)', fontSize: '.85vw', letterSpacing: '.13em' }}>WATERMANCER</span>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .28, duration: .8, ease: easeOut }}>
        <Label tone="cyan">Coffee water, decoded</Label>
        <h1 className="display" style={{ maxWidth: '50vw', margin: '.8vw 0 1.15vw', fontSize: '6.5vw', lineHeight: .9, letterSpacing: '-.105em', fontWeight: 800 }}>
          Make water<br /><span style={{ color: 'var(--cyan)' }}>taste intentional.</span>
        </h1>
      </motion.div>
      <motion.p initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .72, duration: .7, ease: easeOut }} style={{ margin: 0, width: '25vw', color: 'var(--muted)', fontSize: '1.1vw', lineHeight: 1.55 }}>
        A chemistry-first workspace for brewers who want repeatable cups — from first pour to final drop.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.12, duration: .65, ease: easeOut }} style={{ display: 'flex', gap: '.55vw', marginTop: '2.4vw' }}>
        <Pill tone="cyan">4 workspaces</Pill>
        <Pill tone="violet">ion-aware</Pill>
        <Pill tone="lime">made for coffee</Pill>
      </motion.div>
    </div>
  );
}
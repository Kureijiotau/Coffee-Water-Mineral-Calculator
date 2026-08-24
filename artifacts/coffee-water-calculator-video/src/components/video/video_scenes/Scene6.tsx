import { motion } from 'framer-motion';
import mark from '@assets/image_1787373159788.png';
import { Label, Pill, easeOut } from '../SceneUI';

export function Scene6() {
  return (
    <div className="scene" style={{ padding: '9vw 10.5vw' }}>
      <motion.div initial={{ opacity: 0, scale: .55, rotate: -15 }} animate={{ opacity: .2, scale: 1, rotate: 6 }} transition={{ duration: 1.1, ease: easeOut }} style={{ position: 'absolute', left: '52vw', top: '-10vw', width: '50vw', height: '50vw', border: '1px solid var(--violet)', borderRadius: '50%', boxShadow: '0 0 0 2vw rgba(157,141,245,.025)' }} />
      <motion.div initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2, duration: .8, ease: easeOut }}>
        <img src={mark} alt="" style={{ width: '3.2vw', height: '3.2vw', objectFit: 'contain', mixBlendMode: 'screen', marginBottom: '2.3vw' }} />
        <Label tone="lime">From minerals to ritual</Label>
        <h2 className="display" style={{ width: '49vw', margin: '.75vw 0 1vw', fontSize: '5.1vw', lineHeight: .94, letterSpacing: '-.1em', fontWeight: 800 }}>
          Your best cup<br /><span style={{ color: 'var(--lime)' }}>starts in the water.</span>
        </h2>
        <motion.p initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .7, duration: .65, ease: easeOut }} style={{ margin: 0, color: 'var(--muted)', fontSize: '1.05vw' }}>
          Watermancer · chemistry for the curious brewer
        </motion.p>
        <motion.div initial={{ opacity: 0, y: '1vw' }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: .55, ease: easeOut }} style={{ display: 'flex', gap: '.6vw', marginTop: '2.15vw' }}>
          <Pill tone="cyan">Brewer</Pill><Pill tone="violet">Alchemist</Pill><Pill tone="lime">Watermancer</Pill><Pill tone="coral">Concentrate</Pill>
        </motion.div>
      </motion.div>
    </div>
  );
}
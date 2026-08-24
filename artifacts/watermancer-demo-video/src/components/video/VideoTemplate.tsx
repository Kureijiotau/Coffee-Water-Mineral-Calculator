import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Beaker, Droplets, FlaskConical, Layers3, Sparkles } from 'lucide-react';
import { useVideoPlayer } from '../../lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

const SCENE_DURATIONS = {
  intro: 4200,
  brewer: 4600,
  alchemist: 5000,
  watermancer: 5000,
  concentrate: 4500,
  outro: 4200,
};
const SCENES = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6];
const WORKSPACES = [
  { label: 'Brewer', icon: Droplets, color: 'var(--cyan)' },
  { label: 'Alchemist', icon: FlaskConical, color: 'var(--violet)' },
  { label: 'Watermancer', icon: Beaker, color: 'var(--lime)' },
  { label: 'Concentrate', icon: Layers3, color: 'var(--coral)' },
];

export function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const sceneDurations = Object.values(SCENE_DURATIONS);
  const [sceneElapsed, setSceneElapsed] = useState(0);
  useEffect(() => {
    setSceneElapsed(0);
    const startedAt = performance.now();
    let frame = 0;
    const update = (now: number) => {
      setSceneElapsed(Math.min(sceneDurations[currentScene], now - startedAt));
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [currentScene]);
  const Scene = SCENES[currentScene];
  const progress = Math.min(1, Math.max(0, sceneElapsed / sceneDurations[currentScene]));

  return (
    <main className="video-root">
      <div className="video-frame" style={{ aspectRatio: '16 / 9' }}>
        <div className="grid-lines" style={{ position: 'absolute', inset: '-5vw', opacity: .7, zIndex: -1 }} />

        <motion.div
          animate={{
            x: currentScene === 0 ? '49vw' : currentScene === 5 ? '68vw' : '76vw',
            y: currentScene === 0 ? '22vw' : currentScene === 1 ? '7vw' : '10vw',
            scale: currentScene === 0 ? 1.35 : currentScene === 5 ? 1.7 : .85,
            background: currentScene === 2 || currentScene === 3 ? 'rgba(157,141,245,.13)' : 'rgba(110,231,235,.11)',
          }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="breathe"
          style={{ position: 'absolute', width: '25vw', height: '25vw', borderRadius: '50%', filter: 'blur(2vw)', zIndex: -1 }}
        />
        <motion.div
          animate={{
            x: currentScene <= 1 ? '-5vw' : currentScene === 4 ? '8vw' : '1vw',
            y: currentScene <= 1 ? '70vh' : '78vh',
            rotate: currentScene * 12,
          }}
          transition={{ duration: 1.35, ease: [0.16, 1, 0.3, 1] }}
          className="drift"
          style={{ position: 'absolute', width: '18vw', height: '18vw', border: '1px solid rgba(200,232,125,.18)', borderRadius: '42% 58% 61% 39%', zIndex: -1 }}
        />

        <header style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4.6vw', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4.2vw 0 4.4vw', borderBottom: '1px solid rgba(190,204,236,.11)', background: 'linear-gradient(180deg, rgba(16,21,37,.7), rgba(16,21,37,.08))', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.55vw' }}>
            <motion.span animate={{ rotate: currentScene * 90 }} transition={{ duration: .8 }} style={{ display: 'grid', placeItems: 'center', width: '1.45vw', height: '1.45vw', border: '1px solid rgba(110,231,235,.55)', borderRadius: '.42vw', color: 'var(--cyan)' }}>
              <Droplets size=".8vw" strokeWidth={1.8} />
            </motion.span>
            <span className="mono" style={{ fontSize: '.72vw', letterSpacing: '.16em', color: '#dce4f1' }}>WATERMANCER</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.3vw' }}>
            <span className="mono" style={{ fontSize: '.63vw', letterSpacing: '.08em', color: 'var(--muted-2)' }}>COFFEE WATER CALCULATOR</span>
            <span className="mono" style={{ fontSize: '.66vw', color: 'var(--muted)' }}>{String(currentScene + 1).padStart(2, '0')} <span style={{ color: 'var(--muted-2)' }}>/ 06</span></span>
          </div>
        </header>

        <aside style={{ position: 'absolute', left: 0, top: '4.6vw', bottom: '2.65vw', width: '4.4vw', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '2.2vw', borderRight: '1px solid rgba(190,204,236,.09)', zIndex: 9 }}>
          <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'var(--muted-2)', fontSize: '.57vw', letterSpacing: '.2em' }} className="mono">THE WORKSPACE</div>
          <div style={{ width: '1px', height: '2.2vw', margin: '1vw 0', background: 'rgba(190,204,236,.16)' }} />
          {WORKSPACES.map(({ label, icon: Icon, color }, index) => {
            const active = currentScene === index + 1;
            return (
              <motion.div
                key={label}
                animate={{ opacity: active ? 1 : .33, scale: active ? 1.08 : 1, x: active ? '.15vw' : 0 }}
                transition={{ duration: .35 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.35vw', marginBottom: '1.25vw', color }}
              >
                <div style={{ width: '1.8vw', height: '1.8vw', display: 'grid', placeItems: 'center', border: `1px solid ${active ? color : 'rgba(190,204,236,.18)'}`, borderRadius: '.55vw', background: active ? `${color}15` : 'rgba(25,32,51,.38)' }}>
                  <Icon size=".8vw" strokeWidth={1.75} />
                </div>
                <span className="mono" style={{ fontSize: '.46vw', letterSpacing: '.05em', color: active ? color : 'var(--muted-2)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{label.toUpperCase()}</span>
              </motion.div>
            );
          })}
        </aside>

        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={currentScene}
            initial={{ clipPath: 'circle(0% at 88% 14%)', opacity: 0, scale: 1.035 }}
            animate={{ clipPath: 'circle(115% at 50% 50%)', opacity: 1, scale: 1 }}
            exit={{ clipPath: 'circle(0% at 12% 82%)', opacity: 0, scale: .985 }}
            transition={{ duration: .8, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Scene />
          </motion.div>
        </AnimatePresence>

        <footer style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2.65vw', display: 'flex', alignItems: 'center', padding: '0 4.4vw', borderTop: '1px solid rgba(190,204,236,.1)', zIndex: 10, background: 'rgba(13,18,31,.38)' }}>
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1vw' }}>
            <Sparkles size=".75vw" color="var(--lime)" />
            <span className="mono" style={{ color: 'var(--muted)', fontSize: '.57vw', letterSpacing: '.08em' }}>PRECISION / TASTE / REPEAT</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(190,204,236,.13)', overflow: 'hidden' }}>
              <motion.div animate={{ width: `${progress * 100}%` }} transition={{ duration: .1, ease: 'linear' }} style={{ height: '100%', background: 'linear-gradient(90deg, var(--cyan), var(--violet), var(--lime))' }} />
            </div>
            <span className="mono" style={{ color: 'var(--muted-2)', fontSize: '.57vw' }}>ION BY ION</span>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default VideoTemplate;
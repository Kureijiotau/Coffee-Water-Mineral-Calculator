import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useVideoPlayer } from '../../lib/video/hooks';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

const SCENE_DURATIONS = {
  intro: 3800,
  brewer: 4400,
  alchemist: 4400,
  watermancer: 4700,
  concentrate: 4400,
  outro: 3600,
};
const SCENES = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6];

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
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={currentScene}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .55, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', inset: 0 }}
          >
            <Scene />
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}

export default VideoTemplate;
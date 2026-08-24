import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    startRecording?: () => void;
    stopRecording?: () => void;
  }
}

export type VideoPlayerState = {
  currentScene: number;
  elapsed: number;
};

export function useVideoPlayer(sceneDurations: number[]): VideoPlayerState {
  const [state, setState] = useState<VideoPlayerState>({ currentScene: 0, elapsed: 0 });
  const startedAt = useRef<number | null>(null);
  const totalDuration = sceneDurations.reduce((sum, duration) => sum + duration, 0);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      if (startedAt.current === null) startedAt.current = now;
      const elapsed = (now - startedAt.current) % totalDuration;
      let cursor = 0;
      let currentScene = 0;
      for (let index = 0; index < sceneDurations.length; index += 1) {
        if (elapsed >= cursor && elapsed < cursor + sceneDurations[index]) {
          currentScene = index;
          break;
        }
        cursor += sceneDurations[index];
      }
      setState({ currentScene, elapsed });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    window.startRecording?.();
    return () => {
      cancelAnimationFrame(frame);
      window.stopRecording?.();
    };
  }, [sceneDurations, totalDuration]);

  return state;
}
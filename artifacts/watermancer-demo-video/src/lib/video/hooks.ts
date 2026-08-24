import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    __replitVideoPlayerMounted?: boolean;
    __replitVideoTotalDurationMs?: number;
    startRecording?: () => Promise<void>;
    stopRecording?: () => void;
  }
}

export interface SceneDurations {
  [key: string]: number;
}

export interface UseVideoPlayerOptions {
  durations: SceneDurations;
  onVideoEnd?: () => void;
  loop?: boolean;
}

export interface UseVideoPlayerReturn {
  currentScene: number;
  totalScenes: number;
  currentSceneKey: string;
  hasEnded: boolean;
}

export function useVideoPlayer(
  options: UseVideoPlayerOptions,
): UseVideoPlayerReturn {
  const { durations, onVideoEnd, loop = true } = options;
  const sceneKeys = useRef(Object.keys(durations)).current;
  const totalScenes = sceneKeys.length;
  const durationsArray = useRef(Object.values(durations)).current;
  const [currentScene, setCurrentScene] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);

  useEffect(() => {
    window.__replitVideoPlayerMounted = true;
    window.__replitVideoTotalDurationMs = durationsArray.reduce(
      (total, duration) => total + duration,
      0,
    );
    window.startRecording?.();

    return () => {
      window.__replitVideoPlayerMounted = false;
    };
  }, []);

  useEffect(() => {
    if (hasEnded && !loop) return;
    const currentDuration = durationsArray[currentScene];
    const timer = setTimeout(() => {
      if (currentScene >= totalScenes - 1) {
        if (!hasEnded) {
          window.stopRecording?.();
          setHasEnded(true);
          onVideoEnd?.();
        }
        if (loop) setCurrentScene(0);
      } else {
        setCurrentScene(previous => previous + 1);
      }
    }, currentDuration);
    return () => clearTimeout(timer);
  }, [currentScene, totalScenes, durationsArray, hasEnded, loop, onVideoEnd]);

  return {
    currentScene,
    totalScenes,
    currentSceneKey: sceneKeys[currentScene],
    hasEnded,
  };
}

export function useSceneTimer(
  events: Array<{ time: number; callback: () => void }>,
) {
  const firedRef = useRef<Set<number>>(new Set());
  const callbacksRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    callbacksRef.current = events.map(event => event.callback);
  }, [events]);

  const scheduleKey = events.map((event, index) => `${index}:${event.time}`).join('|');

  useEffect(() => {
    firedRef.current = new Set();
    const timers = events.map(({ time }, index) => setTimeout(() => {
      if (!firedRef.current.has(index)) {
        firedRef.current.add(index);
        callbacksRef.current[index]?.();
      }
    }, time));
    return () => timers.forEach(timer => clearTimeout(timer));
  }, [scheduleKey]);
}
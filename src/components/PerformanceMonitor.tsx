// Adaptive performance monitor — tracks FPS and auto-degrades features when needed

import { useEffect, useRef, useState, useCallback } from 'react';

/** Performance state exposed to consumers */
export interface PerfState {
  fps: number;
  degraded: boolean;
}

/** FPS sampling interval in ms */
const SAMPLE_INTERVAL = 1000;
/** Sustained low FPS threshold */
const LOW_FPS = 30;
/** Recovery threshold */
const HIGH_FPS = 45;
/** Consecutive low samples before degrading */
const DEGRADE_COUNT = 3;
/** Consecutive high samples before recovering */
const RECOVER_COUNT = 3;

/**
 * Hook that tracks real-time FPS via rAF frame counting.
 * Returns current FPS and whether adaptive degradation is active.
 * When degraded, consumers should disable expensive effects (sparklines, animations).
 */
export function usePerformanceMonitor(): PerfState {
  const [state, setState] = useState<PerfState>({ fps: 60, degraded: false });
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const lowCountRef = useRef(0);
  const highCountRef = useRef(0);
  const degradedRef = useRef(false);
  const rafRef = useRef(0);

  const tick = useCallback(() => {
    framesRef.current++;
    const now = performance.now();
    const elapsed = now - lastTimeRef.current;

    if (elapsed >= SAMPLE_INTERVAL) {
      const fps = Math.round((framesRef.current / elapsed) * 1000);
      framesRef.current = 0;
      lastTimeRef.current = now;

      if (fps < LOW_FPS) {
        lowCountRef.current++;
        highCountRef.current = 0;
        if (lowCountRef.current >= DEGRADE_COUNT && !degradedRef.current) {
          degradedRef.current = true;
          setState({ fps, degraded: true });
        } else {
          setState(prev => prev.fps !== fps ? { fps, degraded: prev.degraded } : prev);
        }
      } else if (fps > HIGH_FPS) {
        highCountRef.current++;
        lowCountRef.current = 0;
        if (highCountRef.current >= RECOVER_COUNT && degradedRef.current) {
          degradedRef.current = false;
          setState({ fps, degraded: false });
        } else {
          setState(prev => prev.fps !== fps ? { fps, degraded: prev.degraded } : prev);
        }
      } else {
        lowCountRef.current = 0;
        highCountRef.current = 0;
        setState(prev => prev.fps !== fps ? { fps, degraded: prev.degraded } : prev);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  return state;
}

/**
 * Small FPS badge for the UI — shows FPS with color feedback.
 */
export function FPSBadge({ fps, degraded }: PerfState) {
  const color = degraded ? '#ef4444' : fps < 40 ? '#f59e0b' : '#22c55e';
  return (
    <div
      className="fixed bottom-2 right-2 z-50 px-2 py-0.5 rounded-md text-[10px] font-mono border"
      style={{
        backgroundColor: 'rgba(10, 14, 23, 0.85)',
        borderColor: `${color}40`,
        color,
      }}
      aria-label={`${fps} frames per second${degraded ? ' — performance degraded' : ''}`}
    >
      {fps} FPS{degraded && ' ⚠'}
    </div>
  );
}

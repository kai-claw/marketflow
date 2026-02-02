// Shared utility functions for MarketFlow

import { CHANGE_COLOR_STOPS, CHANGE_COLOR_FLOOR } from './constants';

/**
 * Linear congruential PRNG — deterministic from seed.
 * Returns a function that produces values in (0, 1).
 */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Map a daily % change to a treemap cell color.
 * Derives from CHANGE_COLOR_STOPS in constants.ts — single source of truth.
 */
export function changeToColor(change: number): string {
  for (const stop of CHANGE_COLOR_STOPS) {
    if (change > stop.threshold) return stop.color;
  }
  return CHANGE_COLOR_FLOOR;
}

/**
 * Normalize candle data to % change from period start.
 */
export function normalizeToPercent(
  candles: { open: number; close: number; time: string }[]
): { time: string; value: number }[] {
  if (candles.length === 0) return [];
  const basePrice = candles[0].open;
  if (basePrice === 0) return [];
  return candles.map(c => ({
    time: c.time,
    value: Number((((c.close - basePrice) / basePrice) * 100).toFixed(2)),
  }));
}

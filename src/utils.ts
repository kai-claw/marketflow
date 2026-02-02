// Shared utility functions for MarketFlow

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
 */
export function changeToColor(change: number): string {
  if (change > 3) return '#15803d';
  if (change > 2) return '#16a34a';
  if (change > 1) return '#22c55e';
  if (change > 0.5) return '#4ade80';
  if (change > 0) return '#86efac';
  if (change > -0.5) return '#fca5a5';
  if (change > -1) return '#f87171';
  if (change > -2) return '#ef4444';
  if (change > -3) return '#dc2626';
  return '#b91c1c';
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

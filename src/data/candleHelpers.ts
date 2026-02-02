// Shared candlestick data helpers — eliminates duplication between store.ts and ComparisonChart.tsx

import type { Candle, ChartTimeframe } from '../types';
import { STOCK_PRESETS, TIMEFRAME_DAYS } from '../constants';
import { generateCandlestickData } from './candlestickData';

/** Default generation parameters when a symbol has no preset. */
export const DEFAULT_PRESET = { price: 100, volatility: 0.02, trend: 0.0003 } as const;

/** Total days of raw candle data to generate before slicing. */
export const GENERATION_DAYS = 400;

/**
 * Cache for generated full candle data per symbol.
 * Since data is seeded and deterministic, the full 400-day series never changes
 * for a given symbol. Caching avoids re-running the PRNG (400 iterations
 * with Box-Muller) on every timeframe switch or comparison add.
 */
const candleCache = new Map<string, Candle[]>();

/** Maximum cache entries to prevent unbounded growth. */
const MAX_CACHE_SIZE = 32;

/**
 * Generate (or retrieve cached) full candle data for a symbol.
 */
function getFullCandleData(symbol: string): Candle[] {
  const cached = candleCache.get(symbol);
  if (cached) return cached;

  const preset = STOCK_PRESETS[symbol] || DEFAULT_PRESET;
  const allData = generateCandlestickData(
    symbol,
    preset.price * 0.7,
    GENERATION_DAYS,
    preset.volatility,
    preset.trend,
  );

  // Evict oldest entry if at capacity
  if (candleCache.size >= MAX_CACHE_SIZE) {
    const firstKey = candleCache.keys().next().value;
    if (firstKey !== undefined) candleCache.delete(firstKey);
  }

  candleCache.set(symbol, allData);
  return allData;
}

/**
 * Generate candlestick data for a symbol and trim to the given timeframe.
 * Uses STOCK_PRESETS for known symbols, falls back to DEFAULT_PRESET.
 * Results for the full 400-day series are cached per symbol.
 */
export function getCandleData(symbol: string, timeframe: ChartTimeframe): Candle[] {
  const allData = getFullCandleData(symbol);
  const days = TIMEFRAME_DAYS[timeframe];
  return allData.slice(-days);
}

/**
 * Invalidate the candle cache (e.g. on market refresh).
 */
export function clearCandleCache(): void {
  candleCache.clear();
}

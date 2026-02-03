// Shared candlestick data helpers — eliminates duplication between store.ts and ComparisonChart.tsx
// Now supports async fetching from Alpaca with fallback to generated data

import type { Candle, ChartTimeframe } from '../types';
import { STOCK_PRESETS, TIMEFRAME_DAYS } from '../constants';
import { generateCandlestickData, fetchCandlestickData } from './candlestickData';

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
 * Sync version — uses generated data only.
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
 * Sync version — always returns generated data.
 */
export function getCandleData(symbol: string, timeframe: ChartTimeframe): Candle[] {
  const allData = getFullCandleData(symbol);
  const days = TIMEFRAME_DAYS[timeframe];
  return allData.slice(-days);
}

/**
 * Async version — tries to fetch real data from Alpaca, falls back to generated.
 * Caches the result for subsequent calls.
 * Returns { candles, isLive } indicating whether data is real.
 */
export async function getCandleDataAsync(
  symbol: string,
  timeframe: ChartTimeframe,
): Promise<{ candles: Candle[]; isLive: boolean }> {
  const days = TIMEFRAME_DAYS[timeframe];
  const cacheKey = `${symbol}_live`;

  // Check if we have cached live data
  const cached = candleCache.get(cacheKey);
  if (cached) {
    return { candles: cached.slice(-days), isLive: true };
  }

  // Try fetching from Alpaca
  const fetchDays = GENERATION_DAYS; // Fetch max range for cache
  const realData = await fetchCandlestickData(symbol, fetchDays);

  if (realData && realData.length > 0) {
    // Cache the full real dataset
    if (candleCache.size >= MAX_CACHE_SIZE) {
      const firstKey = candleCache.keys().next().value;
      if (firstKey !== undefined) candleCache.delete(firstKey);
    }
    candleCache.set(cacheKey, realData);
    return { candles: realData.slice(-days), isLive: true };
  }

  // Fallback to generated
  return { candles: getCandleData(symbol, timeframe), isLive: false };
}

/**
 * Invalidate the candle cache (e.g. on market refresh).
 */
export function clearCandleCache(): void {
  candleCache.clear();
}

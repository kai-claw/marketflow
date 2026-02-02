// Shared candlestick data helpers — eliminates duplication between store.ts and ComparisonChart.tsx

import type { Candle, ChartTimeframe } from '../types';
import { STOCK_PRESETS, TIMEFRAME_DAYS } from '../constants';
import { generateCandlestickData } from './candlestickData';

/** Default generation parameters when a symbol has no preset. */
export const DEFAULT_PRESET = { price: 100, volatility: 0.02, trend: 0.0003 } as const;

/** Total days of raw candle data to generate before slicing. */
export const GENERATION_DAYS = 400;

/**
 * Generate candlestick data for a symbol and trim to the given timeframe.
 * Uses STOCK_PRESETS for known symbols, falls back to DEFAULT_PRESET.
 */
export function getCandleData(symbol: string, timeframe: ChartTimeframe): Candle[] {
  const preset = STOCK_PRESETS[symbol] || DEFAULT_PRESET;
  const allData = generateCandlestickData(
    symbol,
    preset.price * 0.7,
    GENERATION_DAYS,
    preset.volatility,
    preset.trend,
  );
  const days = TIMEFRAME_DAYS[timeframe];
  return allData.slice(-days);
}

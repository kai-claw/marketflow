// Generate realistic OHLCV candlestick data

import type { Candle } from '../types';
import { seededRandom } from '../utils';
import {
  DEFAULT_CANDLE_DAYS,
  DEFAULT_VOLATILITY,
  DEFAULT_TREND,
} from '../constants';

export function generateCandlestickData(
  symbol: string,
  startPrice: number,
  days: number = DEFAULT_CANDLE_DAYS,
  volatility: number = DEFAULT_VOLATILITY,
  trend: number = DEFAULT_TREND
): Candle[] {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 31337;
  const rand = seededRandom(seed);

  const candles: Candle[] = [];
  let price = startPrice;
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Skip weekends
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;

    // Generate OHLC with realistic patterns
    const u1 = rand();
    const u2 = rand();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    const dailyReturn = trend + normal * volatility;
    const open = price;
    const close = open * (1 + dailyReturn);

    // Wicks
    const wickUp = Math.abs(normal * volatility * 0.5 * rand());
    const wickDown = Math.abs(normal * volatility * 0.5 * rand());
    const high = Math.max(open, close) * (1 + wickUp);
    const low = Math.min(open, close) * (1 - wickDown);

    // Volume pattern - higher on volatile days
    const baseVol = 10000000 + rand() * 40000000;
    const volMult = 1 + Math.abs(dailyReturn) * 20;
    const volume = Math.round(baseVol * volMult);

    candles.push({
      time: date.toISOString().slice(0, 10),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  return candles;
}

// Re-export indicators for backward compat (existing tests/components import from here)
export {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from './indicators';

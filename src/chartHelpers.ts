// Typed helpers for lightweight-charts data — eliminates all `as any` casts

import type { Time } from 'lightweight-charts';
import type { Candle, TimeSeriesPoint } from './types';

/**
 * Candle data with lightweight-charts Time type (string dates are valid Time values).
 */
export interface ChartCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartVolumeBar {
  time: Time;
  value: number;
  color: string;
}

export interface ChartLinePoint {
  time: Time;
  value: number;
}

export interface ChartHistogramPoint {
  time: Time;
  value: number;
  color: string;
}

/**
 * Convert Candle[] to lightweight-charts candlestick format.
 * YYYY-MM-DD strings are a valid Time type — no cast needed.
 */
export function toCandlestickData(candles: Candle[]): ChartCandle[] {
  return candles.map(c => ({
    time: c.time as Time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

// Pre-allocated color strings for volume bars (avoids per-candle string creation)
const VOL_COLOR_UP = 'rgba(34, 197, 94, 0.3)';
const VOL_COLOR_DOWN = 'rgba(239, 68, 68, 0.3)';

/**
 * Convert Candle[] to volume histogram data.
 */
export function toVolumeData(candles: Candle[]): ChartVolumeBar[] {
  return candles.map(c => ({
    time: c.time as Time,
    value: c.volume,
    color: c.close >= c.open ? VOL_COLOR_UP : VOL_COLOR_DOWN,
  }));
}

/**
 * Convert TimeSeriesPoint[] to chart line data.
 */
export function toLineData(points: TimeSeriesPoint[]): ChartLinePoint[] {
  return points.map(p => ({
    time: p.time as Time,
    value: p.value,
  }));
}

/**
 * Create a constant-value reference line from a time series.
 */
export function toConstantLine(points: TimeSeriesPoint[], value: number): ChartLinePoint[] {
  return points.map(p => ({
    time: p.time as Time,
    value,
  }));
}

/**
 * Convert MACD histogram data to chart format.
 */
export function toHistogramData(
  points: { time: string; value: number; color: string }[]
): ChartHistogramPoint[] {
  return points.map(p => ({
    time: p.time as Time,
    value: p.value,
    color: p.color,
  }));
}

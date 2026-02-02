// Technical indicator calculations — pure functions, no side effects

import type { Candle, TimeSeriesPoint, MACDResult, BollingerResult } from '../types';

export function calculateSMA(data: Candle[], period: number): TimeSeriesPoint[] {
  if (period <= 0 || data.length < period) return [];
  const result: TimeSeriesPoint[] = [];
  // Rolling sum avoids O(n*period) repeated slicing
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  result.push({ time: data[period - 1].time, value: Number((sum / period).toFixed(2)) });
  for (let i = period; i < data.length; i++) {
    sum += data[i].close - data[i - period].close;
    result.push({ time: data[i].time, value: Number((sum / period).toFixed(2)) });
  }
  return result;
}

export function calculateEMA(data: Candle[], period: number): TimeSeriesPoint[] {
  if (period <= 0 || data.length < period) return [];
  const result: TimeSeriesPoint[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: Number(ema.toFixed(2)) });

  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: Number(ema.toFixed(2)) });
  }
  return result;
}

export function calculateRSI(data: Candle[], period: number = 14): TimeSeriesPoint[] {
  if (period <= 0 || data.length < period + 1) return [];
  const result: TimeSeriesPoint[] = [];
  const changes = data.slice(1).map((c, i) => c.close - data[i].close);

  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: data[period].time, value: Number((100 - 100 / (1 + rs)).toFixed(2)) });

  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    result.push({ time: data[i + 1].time, value: Number(rsi.toFixed(2)) });
  }
  return result;
}

export function calculateMACD(data: Candle[]): MACDResult {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);

  // Align by time
  const ema26Times = new Set(ema26.map(e => e.time));
  const aligned12 = ema12.filter(e => ema26Times.has(e.time));
  const ema26Map = new Map(ema26.map(e => [e.time, e.value]));

  const macdLine = aligned12.map(e => ({
    time: e.time,
    value: Number((e.value - (ema26Map.get(e.time) || 0)).toFixed(2)),
  }));

  // Signal line (9-period EMA of MACD)
  const signalPeriod = 9;
  const signalMult = 2 / (signalPeriod + 1);
  const signal: TimeSeriesPoint[] = [];

  if (macdLine.length >= signalPeriod) {
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) sum += macdLine[i].value;
    let ema = sum / signalPeriod;
    signal.push({ time: macdLine[signalPeriod - 1].time, value: Number(ema.toFixed(4)) });

    for (let i = signalPeriod; i < macdLine.length; i++) {
      ema = (macdLine[i].value - ema) * signalMult + ema;
      signal.push({ time: macdLine[i].time, value: Number(ema.toFixed(4)) });
    }
  }

  const signalMap = new Map(signal.map(s => [s.time, s.value]));
  const histogram = macdLine
    .filter(m => signalMap.has(m.time))
    .map(m => {
      const val = Number((m.value - (signalMap.get(m.time) || 0)).toFixed(4));
      return { time: m.time, value: val, color: val >= 0 ? '#22c55e' : '#ef4444' };
    });

  return { macd: macdLine, signal, histogram };
}

export function calculateBollingerBands(
  data: Candle[],
  period: number = 20,
  stdDev: number = 2
): BollingerResult {
  const empty: BollingerResult = { upper: [], middle: [], lower: [] };
  if (period <= 0 || data.length < period) return empty;

  const upper: TimeSeriesPoint[] = [];
  const middle: TimeSeriesPoint[] = [];
  const lower: TimeSeriesPoint[] = [];

  // Rolling sum and sum-of-squares — O(n) instead of O(n*period)
  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
    sumSq += data[i].close * data[i].close;
  }

  for (let i = period - 1; i < data.length; i++) {
    if (i > period - 1) {
      const added = data[i].close;
      const removed = data[i - period].close;
      sum += added - removed;
      sumSq += added * added - removed * removed;
    }
    const mean = sum / period;
    // variance = E[x²] - (E[x])²
    const variance = Math.max(0, sumSq / period - mean * mean);
    const sd = Math.sqrt(variance);

    middle.push({ time: data[i].time, value: Number(mean.toFixed(2)) });
    upper.push({ time: data[i].time, value: Number((mean + stdDev * sd).toFixed(2)) });
    lower.push({ time: data[i].time, value: Number((mean - stdDev * sd).toFixed(2)) });
  }

  return { upper, middle, lower };
}

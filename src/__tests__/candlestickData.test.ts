import { describe, it, expect } from 'vitest';
import {
  generateCandlestickData,
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  STOCK_PRESETS,
  type Candle,
} from '../data/candlestickData';

describe('generateCandlestickData', () => {
  const data = generateCandlestickData('AAPL', 200, 365, 0.02, 0.0003);

  it('generates ~260 trading days from 365 calendar days (weekends skipped)', () => {
    expect(data.length).toBeGreaterThan(240);
    expect(data.length).toBeLessThan(280);
  });

  it('every candle has valid OHLCV', () => {
    for (const c of data) {
      expect(c.time).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(c.open).toBeGreaterThan(0);
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
      expect(c.low).toBeGreaterThan(0);
      expect(c.volume).toBeGreaterThan(0);
      expect(Number.isFinite(c.open)).toBe(true);
      expect(Number.isFinite(c.close)).toBe(true);
    }
  });

  it('dates are in chronological order', () => {
    for (let i = 1; i < data.length; i++) {
      expect(data[i].time > data[i - 1].time).toBe(true);
    }
  });

  it('no weekend dates', () => {
    for (const c of data) {
      const d = new Date(c.time + 'T12:00:00Z');
      expect(d.getUTCDay()).not.toBe(0);
      expect(d.getUTCDay()).not.toBe(6);
    }
  });

  it('same symbol produces same data (seeded)', () => {
    const a = generateCandlestickData('MSFT', 100, 100, 0.02, 0);
    const b = generateCandlestickData('MSFT', 100, 100, 0.02, 0);
    expect(a.map(c => c.close)).toEqual(b.map(c => c.close));
  });

  it('different symbols produce different data', () => {
    const a = generateCandlestickData('AAPL', 100, 100, 0.02, 0);
    const b = generateCandlestickData('GOOGL', 100, 100, 0.02, 0);
    expect(a.map(c => c.close)).not.toEqual(b.map(c => c.close));
  });

  it('higher volatility produces wider candle ranges', () => {
    const low = generateCandlestickData('TEST', 100, 200, 0.005, 0);
    const high = generateCandlestickData('TEST2', 100, 200, 0.05, 0);
    const avgRangeLow = low.reduce((s, c) => s + (c.high - c.low) / c.open, 0) / low.length;
    const avgRangeHigh = high.reduce((s, c) => s + (c.high - c.low) / c.open, 0) / high.length;
    expect(avgRangeHigh).toBeGreaterThan(avgRangeLow);
  });
});

describe('calculateSMA', () => {
  const data = generateCandlestickData('AAPL', 200, 100, 0.02, 0);

  it('returns correct count (data.length - period + 1)', () => {
    const sma = calculateSMA(data, 20);
    expect(sma.length).toBe(data.length - 20 + 1);
  });

  it('values are positive', () => {
    const sma = calculateSMA(data, 20);
    for (const p of sma) {
      expect(p.value).toBeGreaterThan(0);
      expect(Number.isFinite(p.value)).toBe(true);
    }
  });

  it('SMA is actual average of window', () => {
    const sma = calculateSMA(data, 5);
    // Check first value
    const manualAvg = data.slice(0, 5).reduce((s, c) => s + c.close, 0) / 5;
    expect(sma[0].value).toBeCloseTo(manualAvg, 1);
  });
});

describe('calculateEMA', () => {
  const data = generateCandlestickData('AAPL', 200, 100, 0.02, 0);

  it('returns correct count', () => {
    const ema = calculateEMA(data, 12);
    expect(ema.length).toBe(data.length - 12 + 1);
  });

  it('first value equals SMA', () => {
    const ema = calculateEMA(data, 12);
    const sma = calculateSMA(data, 12);
    expect(ema[0].value).toBeCloseTo(sma[0].value, 1);
  });

  it('EMA values are positive and finite', () => {
    const ema = calculateEMA(data, 26);
    for (const p of ema) {
      expect(p.value).toBeGreaterThan(0);
      expect(Number.isFinite(p.value)).toBe(true);
    }
  });
});

describe('calculateRSI', () => {
  const data = generateCandlestickData('AAPL', 200, 200, 0.02, 0);

  it('returns values in 0-100 range', () => {
    const rsi = calculateRSI(data, 14);
    for (const p of rsi) {
      expect(p.value).toBeGreaterThanOrEqual(0);
      expect(p.value).toBeLessThanOrEqual(100);
    }
  });

  it('returns correct count', () => {
    const rsi = calculateRSI(data, 14);
    expect(rsi.length).toBe(data.length - 14 - 1 + 1);
  });

  it('values are finite', () => {
    const rsi = calculateRSI(data, 14);
    for (const p of rsi) {
      expect(Number.isFinite(p.value)).toBe(true);
    }
  });
});

describe('calculateMACD', () => {
  const data = generateCandlestickData('AAPL', 200, 200, 0.02, 0);
  const { macd, signal, histogram } = calculateMACD(data);

  it('macd line has values', () => {
    expect(macd.length).toBeGreaterThan(0);
  });

  it('signal line has values', () => {
    expect(signal.length).toBeGreaterThan(0);
  });

  it('histogram has values', () => {
    expect(histogram.length).toBeGreaterThan(0);
  });

  it('histogram = macd - signal at matching times', () => {
    const signalMap = new Map(signal.map(s => [s.time, s.value]));
    for (const h of histogram) {
      const macdVal = macd.find(m => m.time === h.time)?.value;
      const sigVal = signalMap.get(h.time);
      if (macdVal !== undefined && sigVal !== undefined) {
        expect(h.value).toBeCloseTo(macdVal - sigVal, 3);
      }
    }
  });

  it('histogram colors match sign', () => {
    for (const h of histogram) {
      if (h.value >= 0) expect(h.color).toBe('#22c55e');
      else expect(h.color).toBe('#ef4444');
    }
  });

  it('all values are finite', () => {
    for (const m of macd) expect(Number.isFinite(m.value)).toBe(true);
    for (const s of signal) expect(Number.isFinite(s.value)).toBe(true);
    for (const h of histogram) expect(Number.isFinite(h.value)).toBe(true);
  });
});

describe('calculateBollingerBands', () => {
  const data = generateCandlestickData('AAPL', 200, 200, 0.02, 0);
  const bb = calculateBollingerBands(data, 20, 2);

  it('upper >= middle >= lower', () => {
    for (let i = 0; i < bb.middle.length; i++) {
      expect(bb.upper[i].value).toBeGreaterThanOrEqual(bb.middle[i].value);
      expect(bb.middle[i].value).toBeGreaterThanOrEqual(bb.lower[i].value);
    }
  });

  it('returns correct count', () => {
    expect(bb.middle.length).toBe(data.length - 20 + 1);
    expect(bb.upper.length).toBe(bb.middle.length);
    expect(bb.lower.length).toBe(bb.middle.length);
  });

  it('middle band equals SMA(20)', () => {
    const sma = calculateSMA(data, 20);
    for (let i = 0; i < sma.length; i++) {
      expect(bb.middle[i].value).toBeCloseTo(sma[i].value, 1);
    }
  });

  it('all values positive and finite', () => {
    for (const p of bb.upper) {
      expect(p.value).toBeGreaterThan(0);
      expect(Number.isFinite(p.value)).toBe(true);
    }
    for (const p of bb.lower) {
      expect(p.value).toBeGreaterThan(0);
      expect(Number.isFinite(p.value)).toBe(true);
    }
  });
});

describe('STOCK_PRESETS', () => {
  it('has at least 10 presets', () => {
    expect(Object.keys(STOCK_PRESETS).length).toBeGreaterThanOrEqual(10);
  });

  it('all presets have valid params', () => {
    for (const [symbol, preset] of Object.entries(STOCK_PRESETS)) {
      expect(preset.price).toBeGreaterThan(0);
      expect(preset.volatility).toBeGreaterThan(0);
      expect(preset.volatility).toBeLessThan(0.2);
      expect(typeof preset.trend).toBe('number');
      expect(Number.isFinite(preset.trend)).toBe(true);
    }
  });

  it('preset symbols exist in market data', async () => {
    const { generateMarketData } = await import('../data/marketData');
    const allStocks = generateMarketData(1);
    const marketSymbols = new Set(allStocks.map(s => s.symbol));
    for (const symbol of Object.keys(STOCK_PRESETS)) {
      expect(marketSymbols.has(symbol)).toBe(true);
    }
  });
});

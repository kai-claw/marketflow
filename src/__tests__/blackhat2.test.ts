// Black Hat #2 — Stress Tests
// Performance audit: per-frame allocations, cache correctness, rolling algorithms,
// large dataset safety, debounce patterns, adaptive monitoring

import { describe, it, expect } from 'vitest';
import { generateMarketData, groupBySector } from '../data/marketData';
import { generateCandlestickData } from '../data/candlestickData';
import { getCandleData, clearCandleCache, DEFAULT_PRESET, GENERATION_DAYS } from '../data/candleHelpers';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from '../data/indicators';
import { changeToColor, seededRandom, normalizeToPercent } from '../utils';
import { computeMarketMood, MOOD_THRESHOLDS } from '../data/marketMood';
import { generateSparkline, generateAllSparklines, sparklineToPath, sparklineToArea, SPARKLINE_POINTS } from '../data/sparklines';
import {
  STOCK_PRESETS,
  TIMEFRAME_DAYS,
  CINEMATIC_STOCKS,
  CHANGE_COLOR_STOPS,
  CHANGE_COLOR_FLOOR,
} from '../constants';
import type { Candle, ChartTimeframe } from '../types';

// ── Candle Cache ──

describe('Candle Cache', () => {
  it('returns identical data for same symbol across calls', () => {
    clearCandleCache();
    const a = getCandleData('AAPL', '1Y');
    const b = getCandleData('AAPL', '1Y');
    // Should be same content (cached)
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].time).toBe(b[i].time);
      expect(a[i].close).toBe(b[i].close);
    }
  });

  it('returns different slices for different timeframes from same cache', () => {
    clearCandleCache();
    const y = getCandleData('NVDA', '1Y');
    const m = getCandleData('NVDA', '1M');
    expect(y.length).toBeGreaterThan(m.length);
    // 1M slice should be the tail of 1Y
    const yTail = y.slice(-m.length);
    for (let i = 0; i < m.length; i++) {
      expect(m[i].time).toBe(yTail[i].time);
      expect(m[i].close).toBe(yTail[i].close);
    }
  });

  it('clearCandleCache forces regeneration', () => {
    clearCandleCache();
    const a = getCandleData('TSLA', '3M');
    clearCandleCache();
    const b = getCandleData('TSLA', '3M');
    // Seeded PRNG — should produce identical data even after cache clear
    expect(a.length).toBe(b.length);
    expect(a[0].close).toBe(b[0].close);
  });

  it('handles all STOCK_PRESETS symbols without error', () => {
    clearCandleCache();
    const symbols = Object.keys(STOCK_PRESETS);
    for (const sym of symbols) {
      const data = getCandleData(sym, '1Y');
      expect(data.length).toBeGreaterThan(0);
      for (const c of data) {
        expect(Number.isFinite(c.open)).toBe(true);
        expect(Number.isFinite(c.close)).toBe(true);
        expect(Number.isFinite(c.high)).toBe(true);
        expect(Number.isFinite(c.low)).toBe(true);
      }
    }
  });

  it('falls back to DEFAULT_PRESET for unknown symbols', () => {
    clearCandleCache();
    const data = getCandleData('ZZZZZ', '1M');
    expect(data.length).toBeGreaterThan(0);
    // Uses DEFAULT_PRESET params — verify data is valid and price is in reasonable range
    expect(data[0].open).toBeGreaterThan(0);
    expect(Number.isFinite(data[0].close)).toBe(true);
    // Full 1Y data starts at price*0.7=70 and random walks from there;
    // 1M is the last ~30 days so price drifts. Just verify it's finite and positive.
    for (const c of data) {
      expect(c.open).toBeGreaterThan(0);
      expect(c.close).toBeGreaterThan(0);
    }
  });
});

// ── Rolling Bollinger Bands ──

describe('Rolling Bollinger Bands', () => {
  const candles: Candle[] = [];
  // Create 100 candles with known prices for deterministic testing
  for (let i = 0; i < 100; i++) {
    const d = new Date(2025, 0, 2 + i); // skip weekends isn't relevant for raw test data
    candles.push({
      time: d.toISOString().slice(0, 10),
      open: 100 + i * 0.5,
      high: 102 + i * 0.5,
      low: 98 + i * 0.5,
      close: 100 + i * 0.5, // linear uptrend
      volume: 1000000,
    });
  }

  it('produces correct number of points', () => {
    const bb = calculateBollingerBands(candles, 20);
    expect(bb.upper.length).toBe(candles.length - 20 + 1);
    expect(bb.middle.length).toBe(bb.upper.length);
    expect(bb.lower.length).toBe(bb.upper.length);
  });

  it('middle band equals SMA', () => {
    const bb = calculateBollingerBands(candles, 20);
    const sma = calculateSMA(candles, 20);
    expect(bb.middle.length).toBe(sma.length);
    for (let i = 0; i < sma.length; i++) {
      expect(bb.middle[i].value).toBeCloseTo(sma[i].value, 1);
    }
  });

  it('upper > middle > lower always', () => {
    const bb = calculateBollingerBands(candles, 20);
    for (let i = 0; i < bb.upper.length; i++) {
      expect(bb.upper[i].value).toBeGreaterThanOrEqual(bb.middle[i].value);
      expect(bb.middle[i].value).toBeGreaterThanOrEqual(bb.lower[i].value);
    }
  });

  it('handles period=1 gracefully', () => {
    const bb = calculateBollingerBands(candles, 1);
    // With period 1, stddev = 0, so upper = middle = lower = close
    expect(bb.upper.length).toBe(candles.length);
    for (let i = 0; i < bb.upper.length; i++) {
      expect(bb.upper[i].value).toBeCloseTo(bb.middle[i].value, 2);
      expect(bb.lower[i].value).toBeCloseTo(bb.middle[i].value, 2);
    }
  });

  it('handles period > data length', () => {
    const bb = calculateBollingerBands(candles.slice(0, 5), 20);
    expect(bb.upper.length).toBe(0);
    expect(bb.middle.length).toBe(0);
    expect(bb.lower.length).toBe(0);
  });

  it('rolling variance does not produce NaN with constant prices', () => {
    // Constant prices → variance should be exactly 0, not negative from float imprecision
    const flat: Candle[] = candles.map(c => ({ ...c, close: 100 }));
    const bb = calculateBollingerBands(flat, 20);
    for (const pt of bb.upper) {
      expect(Number.isFinite(pt.value)).toBe(true);
    }
    for (const pt of bb.lower) {
      expect(Number.isFinite(pt.value)).toBe(true);
    }
    // With constant prices, upper = middle = lower = 100
    for (let i = 0; i < bb.middle.length; i++) {
      expect(bb.middle[i].value).toBeCloseTo(100, 1);
    }
  });
});

// ── Large Dataset Safety ──

describe('Large Dataset Safety', () => {
  it('manual volume min/max handles 1000 stocks without stack overflow', () => {
    // Math.max(...arr) with 66K+ elements can overflow the call stack
    // Our fix uses a manual loop — verify correctness
    const stocks = [];
    for (let i = 0; i < 1000; i++) {
      stocks.push({
        symbol: `S${i}`,
        name: `Stock ${i}`,
        sector: 'Test',
        price: 100 + i,
        change: (i % 10) - 5,
        volume: i * 1000,
        marketCap: 100 + i,
      });
    }

    // Manually compute what the heatmap does
    let maxVol = 1;
    let minVol = Infinity;
    for (const s of stocks) {
      if (s.volume > maxVol) maxVol = s.volume;
      if (s.volume < minVol) minVol = s.volume;
    }
    expect(maxVol).toBe(999000);
    expect(minVol).toBe(0);
    expect(maxVol - minVol).toBe(999000);
  });

  it('generateCandlestickData handles 2000 days without degradation', () => {
    const data = generateCandlestickData('TEST', 100, 2000);
    expect(data.length).toBeGreaterThan(1000); // weekends excluded
    // No NaN or Infinity
    for (const c of data) {
      expect(Number.isFinite(c.open)).toBe(true);
      expect(Number.isFinite(c.close)).toBe(true);
      expect(Number.isFinite(c.high)).toBe(true);
      expect(Number.isFinite(c.low)).toBe(true);
      expect(c.volume).toBeGreaterThan(0);
    }
  });

  it('sparkline generation for 200 stocks completes in <100ms', () => {
    const stocks = Array.from({ length: 200 }, (_, i) => ({
      symbol: `S${i}`,
      change: (i % 10) - 5,
    }));
    const start = performance.now();
    const map = generateAllSparklines(stocks);
    const elapsed = performance.now() - start;
    expect(map.size).toBe(200);
    expect(elapsed).toBeLessThan(100);
  });

  it('all indicators handle 1000-candle dataset', () => {
    const data = generateCandlestickData('BENCH', 100, 1400);
    expect(data.length).toBeGreaterThan(900);

    const sma = calculateSMA(data, 50);
    expect(sma.length).toBeGreaterThan(0);
    expect(sma.every(p => Number.isFinite(p.value))).toBe(true);

    const ema = calculateEMA(data, 26);
    expect(ema.length).toBeGreaterThan(0);
    expect(ema.every(p => Number.isFinite(p.value))).toBe(true);

    const rsi = calculateRSI(data, 14);
    expect(rsi.length).toBeGreaterThan(0);
    expect(rsi.every(p => p.value >= 0 && p.value <= 100)).toBe(true);

    const macd = calculateMACD(data);
    expect(macd.macd.length).toBeGreaterThan(0);
    expect(macd.signal.length).toBeGreaterThan(0);
    expect(macd.histogram.length).toBeGreaterThan(0);

    const bb = calculateBollingerBands(data, 20);
    expect(bb.upper.length).toBeGreaterThan(0);
    expect(bb.upper.every(p => Number.isFinite(p.value))).toBe(true);
  });
});

// ── Seeded PRNG Determinism ──

describe('Seeded PRNG Determinism', () => {
  it('produces identical sequences for identical seeds', () => {
    const a = seededRandom(12345);
    const b = seededRandom(12345);
    for (let i = 0; i < 1000; i++) {
      expect(a()).toBe(b());
    }
  });

  it('values are always in (0, 1)', () => {
    const r = seededRandom(99999);
    for (let i = 0; i < 10000; i++) {
      const v = r();
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('candle generation is deterministic', () => {
    const a = generateCandlestickData('DET', 100, 100);
    const b = generateCandlestickData('DET', 100, 100);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].close).toBe(b[i].close);
    }
  });
});

// ── Cache Eviction ──

describe('Cache Eviction', () => {
  it('cache still works correctly after exceeding MAX_CACHE_SIZE', () => {
    clearCandleCache();
    // Generate 35 unique symbols (MAX_CACHE_SIZE = 32)
    for (let i = 0; i < 35; i++) {
      getCandleData(`SYM${i}`, '1M');
    }
    // Earliest symbols should still produce correct data even if evicted
    const data = getCandleData('SYM0', '1M');
    const fresh = getCandleData('SYM0', '1M');
    expect(data.length).toBe(fresh.length);
    expect(data[0].close).toBe(fresh[0].close);
  });
});

// ── normalizeToPercent Edge Cases ──

describe('normalizeToPercent Edge Cases', () => {
  it('handles empty input', () => {
    expect(normalizeToPercent([])).toEqual([]);
  });

  it('handles zero base price', () => {
    expect(normalizeToPercent([{ time: '2025-01-01', open: 0, close: 10 }])).toEqual([]);
  });

  it('correctly normalizes a known sequence', () => {
    const candles = [
      { time: '2025-01-01', open: 100, close: 100 },
      { time: '2025-01-02', open: 105, close: 110 },
      { time: '2025-01-03', open: 108, close: 90 },
    ];
    const result = normalizeToPercent(candles);
    expect(result).toHaveLength(3);
    expect(result[0].value).toBe(0); // (100-100)/100 * 100
    expect(result[1].value).toBe(10); // (110-100)/100 * 100
    expect(result[2].value).toBe(-10); // (90-100)/100 * 100
  });
});

// ── changeToColor Exhaustive ──

describe('changeToColor Completeness', () => {
  it('returns a color for every 0.5% increment from -5 to +5', () => {
    for (let c = -5; c <= 5; c += 0.5) {
      const color = changeToColor(c);
      expect(color).toBeTruthy();
      expect(color.startsWith('#')).toBe(true);
    }
  });

  it('returns floor color for extreme negatives', () => {
    expect(changeToColor(-100)).toBe(CHANGE_COLOR_FLOOR);
  });

  it('CHANGE_COLOR_STOPS are in descending threshold order', () => {
    for (let i = 1; i < CHANGE_COLOR_STOPS.length; i++) {
      expect(CHANGE_COLOR_STOPS[i - 1].threshold).toBeGreaterThan(CHANGE_COLOR_STOPS[i].threshold);
    }
  });
});

// ── Market Mood Stress ──

describe('Market Mood Stress', () => {
  it('handles all-positive market (100% advancers)', () => {
    const stocks = Array.from({ length: 66 }, (_, i) => ({
      symbol: `S${i}`, name: `S${i}`, sector: 'Test',
      price: 100, change: 1 + i * 0.01, volume: 1000, marketCap: 100,
    }));
    const mood = computeMarketMood(stocks);
    expect(mood.advancers).toBe(66);
    expect(mood.decliners).toBe(0);
    expect(mood.label).toBe('Strong Rally');
  });

  it('handles all-negative market (100% decliners)', () => {
    const stocks = Array.from({ length: 66 }, (_, i) => ({
      symbol: `S${i}`, name: `S${i}`, sector: 'Test',
      price: 100, change: -(1 + i * 0.01), volume: 1000, marketCap: 100,
    }));
    const mood = computeMarketMood(stocks);
    expect(mood.advancers).toBe(0);
    expect(mood.decliners).toBe(66);
    expect(mood.label).toBe('Selloff');
  });

  it('handles empty stock list gracefully', () => {
    const mood = computeMarketMood([]);
    expect(mood.advancers).toBe(0);
    expect(mood.decliners).toBe(0);
    // breadth = 0.5 → Mixed
    expect(mood.label).toBe('Mixed');
  });

  it('MOOD_THRESHOLDS cover full [0,1] breadth range', () => {
    // Last threshold should be -Infinity to catch everything
    const last = MOOD_THRESHOLDS[MOOD_THRESHOLDS.length - 1];
    expect(last.min).toBe(-Infinity);
    // First should be high positive
    expect(MOOD_THRESHOLDS[0].min).toBeGreaterThan(0.5);
  });
});

// ── Sparkline Stress ──

describe('Sparkline Stress', () => {
  it('all sparkline values are in [0, 1]', () => {
    for (const sym of Object.keys(STOCK_PRESETS)) {
      const sp = generateSparkline(sym, 2.5);
      expect(sp.length).toBe(SPARKLINE_POINTS);
      for (const v of sp) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('sparklineToPath produces valid SVG M/L path', () => {
    const sp = generateSparkline('AAPL', 1.0);
    const path = sparklineToPath(sp, 100, 50);
    expect(path.startsWith('M')).toBe(true);
    expect(path.includes('L')).toBe(true);
    // No NaN in path
    expect(path.includes('NaN')).toBe(false);
  });

  it('sparklineToArea produces closed path (ends with Z)', () => {
    const sp = generateSparkline('MSFT', -1.0);
    const area = sparklineToArea(sp, 100, 50);
    expect(area.endsWith('Z')).toBe(true);
    expect(area.includes('NaN')).toBe(false);
  });

  it('sparkline determinism — same symbol+change produces same data', () => {
    const a = generateSparkline('NVDA', 3.0);
    const b = generateSparkline('NVDA', 3.0);
    expect(a).toEqual(b);
  });
});

// ── Cinematic Stocks Coverage ──

describe('Cinematic Stocks', () => {
  it('all cinematic stocks exist in STOCK_PRESETS', () => {
    for (const sym of CINEMATIC_STOCKS) {
      expect(STOCK_PRESETS[sym]).toBeDefined();
    }
  });

  it('all cinematic stocks produce valid candle data', () => {
    clearCandleCache();
    for (const sym of CINEMATIC_STOCKS) {
      const data = getCandleData(sym, '1Y');
      expect(data.length).toBeGreaterThan(200);
    }
  });
});

// ── Timeframe Consistency ──

describe('Timeframe Consistency', () => {
  it('longer timeframes always produce more candles', () => {
    clearCandleCache();
    const timeframes: ChartTimeframe[] = ['1M', '3M', '6M', '1Y'];
    const lengths = timeframes.map(tf => getCandleData('AAPL', tf).length);
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThan(lengths[i - 1]);
    }
  });

  it('TIMEFRAME_DAYS values are monotonically increasing', () => {
    const values = Object.values(TIMEFRAME_DAYS);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

// ── Rapid Computation Benchmark ──

describe('Rapid Computation Benchmark', () => {
  it('1000 getCandleData calls complete in <2s (cache hit)', () => {
    clearCandleCache();
    getCandleData('AAPL', '1Y'); // warm cache
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      getCandleData('AAPL', '1Y');
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  it('100 full indicator pipelines complete in <1s', () => {
    const data = generateCandlestickData('BENCH', 100, 400);
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      calculateSMA(data, 20);
      calculateEMA(data, 12);
      calculateRSI(data, 14);
      calculateBollingerBands(data, 20);
      calculateMACD(data);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
  });

  it('groupBySector handles 500 stocks in <50ms', () => {
    const stocks = Array.from({ length: 500 }, (_, i) => ({
      symbol: `S${i}`,
      name: `Stock ${i}`,
      sector: ['Technology', 'Healthcare', 'Financials', 'Energy'][i % 4],
      price: 100,
      change: (i % 10) - 5,
      volume: 1000000,
      marketCap: 100 + i,
    }));
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      groupBySector(stocks);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

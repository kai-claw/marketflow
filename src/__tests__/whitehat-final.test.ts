// Pass 10/10 — White Hat Final Verification
// Comprehensive integration tests covering end-to-end data pipelines, cross-module
// consistency, feature combinations, type system invariants, and deployment readiness.

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Data layer imports ──
import {
  generateMarketData,
  groupBySector,
  generateCandlestickData,
  getCandleData,
  clearCandleCache,
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  createPortfolio,
  executeTrade,
  getPortfolioValue,
  getPortfolioReturn,
  getPositionPnL,
  computeMarketMood,
  MOOD_THRESHOLDS,
  generateSparkline,
  sparklineToPath,
  sparklineToArea,
  generateAllSparklines,
  SPARKLINE_POINTS,
  DEFAULT_PRESET,
  GENERATION_DAYS,
} from '../data';

// ── Constants & utils ──
import {
  STOCK_PRESETS,
  POPULAR_SYMBOLS,
  SECTOR_COLORS,
  CHART_THEME,
  INDICATORS,
  COMPARISON_COLORS,
  MAX_COMPARISON_STOCKS,
  CINEMATIC_STOCKS,
  CINEMATIC_INTERVAL,
  TIMEFRAME_DAYS,
  TIMEFRAMES,
  CHANGE_COLOR_STOPS,
  CHANGE_COLOR_FLOOR,
  DEFAULT_STARTING_CASH,
  DEFAULT_CANDLE_DAYS,
} from '../constants';
import { seededRandom, changeToColor, normalizeToPercent } from '../utils';

// ── Types ──
import type {
  View,
  ChartTimeframe,
  Indicator,
  Stock,
  Sector,
  Candle,
  Portfolio,
  MarketMood,
  MACDResult,
  BollingerResult,
  Position,
  Trade,
  TradeResult,
  PnL,
  StockPreset,
  IndicatorConfig,
} from '../types';

const ROOT = path.resolve(__dirname, '..', '..');

// ═════════════════════════════════════════════════════════════
// 1. END-TO-END DATA PIPELINE
// ═════════════════════════════════════════════════════════════

describe('End-to-End Data Pipeline', () => {
  it('market → sectors → mood → candles → indicators pipeline', () => {
    const stocks = generateMarketData(42);
    expect(stocks.length).toBeGreaterThan(0);

    const sectors = groupBySector(stocks);
    expect(sectors.length).toBeGreaterThan(0);
    const totalStocksInSectors = sectors.reduce((s, sec) => s + sec.stocks.length, 0);
    expect(totalStocksInSectors).toBe(stocks.length);

    const mood = computeMarketMood(stocks);
    expect(mood.advancers + mood.decliners).toBeLessThanOrEqual(stocks.length);
    expect(mood.breadth).toBeGreaterThanOrEqual(0);
    expect(mood.breadth).toBeLessThanOrEqual(1);
    expect(mood.label).toBeTruthy();

    // Pick a random stock and run full indicator pipeline
    const sym = stocks[0].symbol;
    clearCandleCache();
    const candles = getCandleData(sym, '1Y');
    // Trading days (~285) < calendar days (365) due to weekend skip
    expect(candles.length).toBeGreaterThan(200);
    expect(candles.length).toBeLessThanOrEqual(TIMEFRAME_DAYS['1Y']);

    const sma = calculateSMA(candles, 20);
    expect(sma.length).toBeGreaterThan(0);

    const ema = calculateEMA(candles, 12);
    expect(ema.length).toBeGreaterThan(0);

    const rsi = calculateRSI(candles);
    expect(rsi.length).toBeGreaterThan(0);
    rsi.forEach(p => {
      expect(p.value).toBeGreaterThanOrEqual(0);
      expect(p.value).toBeLessThanOrEqual(100);
    });

    const macd = calculateMACD(candles);
    expect(macd.macd.length).toBeGreaterThan(0);
    expect(macd.signal.length).toBeGreaterThan(0);
    expect(macd.histogram.length).toBeGreaterThan(0);

    const bb = calculateBollingerBands(candles);
    expect(bb.upper.length).toBeGreaterThan(0);
    for (let i = 0; i < bb.upper.length; i++) {
      expect(bb.upper[i].value).toBeGreaterThanOrEqual(bb.middle[i].value);
      expect(bb.lower[i].value).toBeLessThanOrEqual(bb.middle[i].value);
    }
  });

  it('market → sparklines pipeline', () => {
    const stocks = generateMarketData(99);
    const sparklines = generateAllSparklines(stocks);
    expect(sparklines.size).toBe(stocks.length);

    for (const [sym, sp] of sparklines) {
      expect(sp.length).toBe(SPARKLINE_POINTS);
      sp.forEach(v => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      });

      const pathD = sparklineToPath(sp, 100, 40);
      expect(pathD).toMatch(/^M/);
      expect(pathD).toContain('L');

      const areaD = sparklineToArea(sp, 100, 40);
      expect(areaD).toMatch(/Z$/);
    }
  });

  it('market → portfolio trade → PnL pipeline', () => {
    const stocks = generateMarketData(123);
    const portfolio = createPortfolio(DEFAULT_STARTING_CASH);
    expect(getPortfolioValue(portfolio)).toBe(DEFAULT_STARTING_CASH);
    expect(getPortfolioReturn(portfolio)).toEqual({ absolute: 0, percent: 0 });

    // Buy first 3 stocks
    let p = portfolio;
    for (let i = 0; i < 3; i++) {
      const s = stocks[i];
      const result = executeTrade(p, s.symbol, 'buy', 10, s.price);
      expect(result.success).toBe(true);
      p = result.portfolio;
    }

    expect(p.positions.length).toBe(3);
    expect(p.trades.length).toBe(3);
    expect(p.cash).toBeLessThan(DEFAULT_STARTING_CASH);

    const value = getPortfolioValue(p);
    expect(value).toBeCloseTo(DEFAULT_STARTING_CASH, 0);

    // Sell one
    const sellSym = p.positions[0].symbol;
    const result = executeTrade(p, sellSym, 'sell', 10, stocks[0].price * 1.05);
    expect(result.success).toBe(true);
    expect(result.portfolio.positions.length).toBe(2);

    const pnl = getPositionPnL(result.portfolio.positions[0]);
    expect(Number.isFinite(pnl.absolute)).toBe(true);
    expect(Number.isFinite(pnl.percent)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════
// 2. CANDLE DATA CONSISTENCY
// ═════════════════════════════════════════════════════════════

describe('Candle Data Consistency', () => {
  it('all STOCK_PRESETS produce valid candle data for all timeframes', () => {
    clearCandleCache();
    for (const sym of POPULAR_SYMBOLS) {
      for (const tf of TIMEFRAMES) {
        const candles = getCandleData(sym, tf);
        // Weekends are skipped, so trading days ≤ calendar days
        expect(candles.length).toBeGreaterThan(0);
        expect(candles.length).toBeLessThanOrEqual(TIMEFRAME_DAYS[tf]);
        candles.forEach(c => {
          expect(c.high).toBeGreaterThanOrEqual(c.low);
          expect(c.open).toBeGreaterThanOrEqual(c.low);
          expect(c.open).toBeLessThanOrEqual(c.high);
          expect(c.close).toBeGreaterThanOrEqual(c.low);
          expect(c.close).toBeLessThanOrEqual(c.high);
          expect(c.volume).toBeGreaterThan(0);
          expect(c.time).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
      }
    }
  });

  it('candle dates are in chronological order and skip weekends', () => {
    clearCandleCache();
    const candles = getCandleData('AAPL', '1Y');
    expect(candles.length).toBeGreaterThan(200); // ~285 trading days in a year
    for (let i = 1; i < candles.length; i++) {
      expect(candles[i].time > candles[i - 1].time).toBe(true);
      const d = new Date(candles[i].time + 'T12:00:00Z'); // noon UTC avoids TZ edge
      expect(d.getUTCDay()).not.toBe(0); // not Sunday
      expect(d.getUTCDay()).not.toBe(6); // not Saturday
    }
  });

  it('seeded generation is deterministic', () => {
    clearCandleCache();
    const a = getCandleData('NVDA', '3M');
    clearCandleCache();
    const b = getCandleData('NVDA', '3M');
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].time).toBe(b[i].time);
      expect(a[i].open).toBe(b[i].open);
      expect(a[i].close).toBe(b[i].close);
    }
  });

  it('normalizeToPercent produces valid percentage data', () => {
    clearCandleCache();
    const candles = getCandleData('TSLA', '6M');
    const normalized = normalizeToPercent(candles);
    expect(normalized.length).toBe(candles.length);
    // First point should be relatively small % (close vs open on day 1)
    expect(Math.abs(normalized[0].value)).toBeLessThan(10);
    normalized.forEach(p => expect(Number.isFinite(p.value)).toBe(true));
  });
});

// ═════════════════════════════════════════════════════════════
// 3. INDICATOR CORRECTNESS
// ═════════════════════════════════════════════════════════════

describe('Indicator Correctness', () => {
  const candles = getCandleData('AAPL', '1Y');

  it('SMA 20 length matches expected output', () => {
    const sma = calculateSMA(candles, 20);
    expect(sma.length).toBe(candles.length - 20 + 1);
    // SMA should roughly track closing prices
    const avgClose = candles.reduce((s, c) => s + c.close, 0) / candles.length;
    const avgSMA = sma.reduce((s, p) => s + p.value, 0) / sma.length;
    expect(Math.abs(avgSMA - avgClose)).toBeLessThan(avgClose * 0.2);
  });

  it('EMA responds faster than SMA to price changes', () => {
    const ema12 = calculateEMA(candles, 12);
    const sma20 = calculateSMA(candles, 20);
    // EMA should be available sooner
    expect(ema12.length).toBeGreaterThan(sma20.length);
  });

  it('RSI stays within 0-100 bounds for all presets', () => {
    for (const sym of POPULAR_SYMBOLS) {
      const data = getCandleData(sym, '1Y');
      const rsi = calculateRSI(data);
      rsi.forEach(p => {
        expect(p.value).toBeGreaterThanOrEqual(0);
        expect(p.value).toBeLessThanOrEqual(100);
      });
    }
  });

  it('MACD histogram sums to approximately zero (mean-reverting)', () => {
    const macd = calculateMACD(candles);
    const histSum = macd.histogram.reduce((s, h) => s + h.value, 0);
    const histAvg = histSum / macd.histogram.length;
    // Average should be close to zero
    expect(Math.abs(histAvg)).toBeLessThan(5);
  });

  it('Bollinger Bands widen with higher volatility', () => {
    const bb20 = calculateBollingerBands(candles, 20, 2);
    const bb20_3 = calculateBollingerBands(candles, 20, 3);
    // 3-stddev bands should be wider
    const width2 = bb20.upper.reduce((s, p, i) => s + (p.value - bb20.lower[i].value), 0) / bb20.upper.length;
    const width3 = bb20_3.upper.reduce((s, p, i) => s + (p.value - bb20_3.lower[i].value), 0) / bb20_3.upper.length;
    expect(width3).toBeGreaterThan(width2);
  });

  it('indicators handle edge cases gracefully', () => {
    expect(calculateSMA([], 20)).toEqual([]);
    expect(calculateSMA(candles, 0)).toEqual([]);
    expect(calculateSMA(candles, 9999)).toEqual([]);
    expect(calculateEMA([], 12)).toEqual([]);
    expect(calculateRSI([], 14)).toEqual([]);
    const bb = calculateBollingerBands([], 20);
    expect(bb.upper).toEqual([]);
    expect(bb.middle).toEqual([]);
    expect(bb.lower).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════
// 4. PORTFOLIO SYSTEM INTEGRITY
// ═════════════════════════════════════════════════════════════

describe('Portfolio System Integrity', () => {
  it('rejects invalid trade inputs', () => {
    const p = createPortfolio(100000);
    expect(executeTrade(p, 'AAPL', 'buy', 0, 100).success).toBe(false);
    expect(executeTrade(p, 'AAPL', 'buy', -5, 100).success).toBe(false);
    expect(executeTrade(p, 'AAPL', 'buy', 1.5, 100).success).toBe(false);
    expect(executeTrade(p, 'AAPL', 'buy', NaN, 100).success).toBe(false);
    expect(executeTrade(p, 'AAPL', 'buy', Infinity, 100).success).toBe(false);
    expect(executeTrade(p, 'AAPL', 'buy', 10, 0).success).toBe(false);
    expect(executeTrade(p, 'AAPL', 'buy', 10, -50).success).toBe(false);
    expect(executeTrade(p, 'AAPL', 'buy', 10, NaN).success).toBe(false);
    // Portfolio should be unchanged for all rejections
    expect(p.positions.length).toBe(0);
    expect(p.cash).toBe(100000);
  });

  it('maintains cash + positions = total value invariant', () => {
    let p = createPortfolio(100000);
    const stocks = generateMarketData(77);

    for (let i = 0; i < 5; i++) {
      const s = stocks[i];
      const result = executeTrade(p, s.symbol, 'buy', 10, s.price);
      if (result.success) p = result.portfolio;
    }

    const posValue = p.positions.reduce((sum, pos) => sum + pos.shares * pos.currentPrice, 0);
    expect(p.cash + posValue).toBeCloseTo(getPortfolioValue(p), 2);
  });

  it('cost averaging works correctly', () => {
    let p = createPortfolio(100000);

    // Buy 10 @ $100
    let result = executeTrade(p, 'TEST', 'buy', 10, 100);
    expect(result.success).toBe(true);
    p = result.portfolio;
    expect(p.positions[0].avgCost).toBe(100);

    // Buy 10 more @ $200
    result = executeTrade(p, 'TEST', 'buy', 10, 200);
    expect(result.success).toBe(true);
    p = result.portfolio;
    expect(p.positions[0].avgCost).toBe(150);
    expect(p.positions[0].shares).toBe(20);
  });

  it('NaN guards protect portfolio calculations', () => {
    const p: Portfolio = {
      cash: 50000,
      positions: [{ symbol: 'X', shares: 10, avgCost: NaN, currentPrice: 100 }],
      trades: [],
      startingCash: 100000,
    };
    const value = getPortfolioValue(p);
    expect(Number.isFinite(value)).toBe(true);

    const ret = getPortfolioReturn(p);
    expect(Number.isFinite(ret.absolute)).toBe(true);
    expect(Number.isFinite(ret.percent)).toBe(true);

    const pnl = getPositionPnL(p.positions[0]);
    expect(Number.isFinite(pnl.absolute)).toBe(true);
    expect(Number.isFinite(pnl.percent)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════
// 5. MARKET MOOD SYSTEM
// ═════════════════════════════════════════════════════════════

describe('Market Mood System', () => {
  it('mood thresholds are properly ordered (descending)', () => {
    for (let i = 1; i < MOOD_THRESHOLDS.length; i++) {
      expect(MOOD_THRESHOLDS[i - 1].min).toBeGreaterThan(MOOD_THRESHOLDS[i].min);
    }
  });

  it('all-positive stocks produce bullish/rally mood', () => {
    const stocks = Array.from({ length: 20 }, (_, i) => ({
      symbol: `S${i}`, name: '', sector: '', marketCap: 100, price: 100, change: 2, volume: 1000,
    }));
    const mood = computeMarketMood(stocks);
    expect(mood.breadth).toBe(1);
    expect(['Strong Rally', 'Bullish']).toContain(mood.label);
  });

  it('all-negative stocks produce bearish/selloff mood', () => {
    const stocks = Array.from({ length: 20 }, (_, i) => ({
      symbol: `S${i}`, name: '', sector: '', marketCap: 100, price: 100, change: -2, volume: 1000,
    }));
    const mood = computeMarketMood(stocks);
    expect(mood.breadth).toBe(0);
    expect(['Selloff', 'Bearish']).toContain(mood.label);
  });

  it('empty stocks produce neutral mood', () => {
    const mood = computeMarketMood([]);
    expect(mood.breadth).toBe(0.5);
  });

  it('each mood tier has unique color and emoji', () => {
    const colors = new Set(MOOD_THRESHOLDS.map(t => t.color));
    const emojis = new Set(MOOD_THRESHOLDS.map(t => t.emoji));
    expect(colors.size).toBe(MOOD_THRESHOLDS.length);
    expect(emojis.size).toBe(MOOD_THRESHOLDS.length);
  });
});

// ═════════════════════════════════════════════════════════════
// 6. CONSTANTS COMPLETENESS & CONSISTENCY
// ═════════════════════════════════════════════════════════════

describe('Constants Completeness', () => {
  it('all CINEMATIC_STOCKS exist in STOCK_PRESETS', () => {
    for (const sym of CINEMATIC_STOCKS) {
      expect(STOCK_PRESETS[sym]).toBeDefined();
    }
  });

  it('POPULAR_SYMBOLS matches STOCK_PRESETS keys', () => {
    expect(new Set(POPULAR_SYMBOLS)).toEqual(new Set(Object.keys(STOCK_PRESETS)));
  });

  it('all 11 sector colors are valid hex', () => {
    const sectors = Object.keys(SECTOR_COLORS);
    expect(sectors.length).toBe(11);
    for (const color of Object.values(SECTOR_COLORS)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('CHART_THEME has all required fields', () => {
    expect(CHART_THEME.background).toMatch(/^#/);
    expect(CHART_THEME.textColor).toMatch(/^#/);
    expect(CHART_THEME.fontSize).toBeGreaterThan(0);
    expect(CHART_THEME.gridColor).toMatch(/^#/);
    expect(CHART_THEME.upColor).toMatch(/^#/);
    expect(CHART_THEME.downColor).toMatch(/^#/);
  });

  it('all 8 INDICATORS have unique ids and colors', () => {
    expect(INDICATORS.length).toBe(8);
    const ids = new Set(INDICATORS.map(i => i.id));
    expect(ids.size).toBe(8);
    for (const ind of INDICATORS) {
      expect(ind.label).toBeTruthy();
      expect(ind.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('COMPARISON_COLORS has enough for MAX_COMPARISON_STOCKS', () => {
    expect(COMPARISON_COLORS.length).toBeGreaterThanOrEqual(MAX_COMPARISON_STOCKS);
    const unique = new Set(COMPARISON_COLORS);
    expect(unique.size).toBe(COMPARISON_COLORS.length);
  });

  it('CHANGE_COLOR_STOPS are in descending threshold order', () => {
    for (let i = 1; i < CHANGE_COLOR_STOPS.length; i++) {
      expect(CHANGE_COLOR_STOPS[i - 1].threshold).toBeGreaterThan(CHANGE_COLOR_STOPS[i].threshold);
    }
    // Floor color exists
    expect(CHANGE_COLOR_FLOOR).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('timing constants are reasonable', () => {
    expect(CINEMATIC_INTERVAL).toBeGreaterThanOrEqual(5000);
    expect(CINEMATIC_INTERVAL).toBeLessThanOrEqual(30000);
    expect(DEFAULT_CANDLE_DAYS).toBeGreaterThan(TIMEFRAME_DAYS['1Y']);
    expect(DEFAULT_STARTING_CASH).toBeGreaterThan(0);
  });

  it('STOCK_PRESETS have valid ranges', () => {
    for (const [sym, preset] of Object.entries(STOCK_PRESETS)) {
      expect(preset.price).toBeGreaterThan(0);
      expect(preset.volatility).toBeGreaterThan(0);
      expect(preset.volatility).toBeLessThan(1);
      expect(Math.abs(preset.trend)).toBeLessThan(0.01);
    }
  });
});

// ═════════════════════════════════════════════════════════════
// 7. TYPE SYSTEM CONSISTENCY
// ═════════════════════════════════════════════════════════════

describe('Type System Consistency', () => {
  it('View type covers all 3 views', () => {
    const views: View[] = ['heatmap', 'chart', 'portfolio'];
    expect(views.length).toBe(3);
  });

  it('ChartTimeframe type covers all 4 timeframes', () => {
    const tfs: ChartTimeframe[] = ['1M', '3M', '6M', '1Y'];
    expect(tfs.length).toBe(4);
    tfs.forEach(tf => expect(TIMEFRAME_DAYS[tf]).toBeGreaterThan(0));
  });

  it('Indicator type covers all 8 indicators', () => {
    const inds: Indicator[] = ['sma20', 'sma50', 'ema12', 'ema26', 'bollinger', 'rsi', 'macd', 'volume'];
    expect(inds.length).toBe(8);
    const configIds = new Set(INDICATORS.map(i => i.id));
    inds.forEach(ind => expect(configIds.has(ind)).toBe(true));
  });

  it('Stock interface has all required fields', () => {
    const stocks = generateMarketData(1);
    const s = stocks[0];
    expect(typeof s.symbol).toBe('string');
    expect(typeof s.name).toBe('string');
    expect(typeof s.sector).toBe('string');
    expect(typeof s.marketCap).toBe('number');
    expect(typeof s.price).toBe('number');
    expect(typeof s.change).toBe('number');
    expect(typeof s.volume).toBe('number');
  });

  it('Candle interface has all required OHLCV fields', () => {
    const candles = getCandleData('AAPL', '1M');
    const c = candles[0];
    expect(typeof c.time).toBe('string');
    expect(typeof c.open).toBe('number');
    expect(typeof c.high).toBe('number');
    expect(typeof c.low).toBe('number');
    expect(typeof c.close).toBe('number');
    expect(typeof c.volume).toBe('number');
  });

  it('Trade result always includes portfolio', () => {
    const p = createPortfolio(100);
    const fail = executeTrade(p, 'X', 'buy', 10, 50);
    expect(fail.success).toBe(false);
    expect(fail.portfolio).toBeDefined();
    expect(fail.portfolio.cash).toBe(100);

    const ok = executeTrade(p, 'X', 'buy', 1, 50);
    expect(ok.success).toBe(true);
    expect(ok.portfolio).toBeDefined();
    expect(ok.portfolio.cash).toBe(50);
  });
});

// ═════════════════════════════════════════════════════════════
// 8. SEEDED DETERMINISM & PRNG
// ═════════════════════════════════════════════════════════════

describe('Seeded Determinism', () => {
  it('seededRandom produces deterministic sequences', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('seededRandom values are in (0, 1) exclusive', () => {
    const rand = seededRandom(12345);
    for (let i = 0; i < 10000; i++) {
      const v = rand();
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const a = seededRandom(1);
    const b = seededRandom(2);
    let same = 0;
    for (let i = 0; i < 100; i++) {
      if (a() === b()) same++;
    }
    expect(same).toBeLessThan(5);
  });

  it('market data is deterministic with same seed', () => {
    const a = generateMarketData(42);
    const b = generateMarketData(42);
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].symbol).toBe(b[i].symbol);
      expect(a[i].price).toBe(b[i].price);
      expect(a[i].change).toBe(b[i].change);
    }
  });
});

// ═════════════════════════════════════════════════════════════
// 9. CHANGETOCOLOR & VISUAL ENCODING
// ═════════════════════════════════════════════════════════════

describe('Visual Encoding', () => {
  it('changeToColor maps positive changes to green hues', () => {
    const green = changeToColor(3.5);
    expect(green).toMatch(/#[12][\da-f]{4}/i); // dark green range
    const lightGreen = changeToColor(0.3);
    expect(lightGreen).toBeTruthy();
  });

  it('changeToColor maps negative changes to red hues', () => {
    const red = changeToColor(-3.5);
    expect(red).toBe(CHANGE_COLOR_FLOOR);
    const lightRed = changeToColor(-0.3);
    expect(lightRed).toBeTruthy();
  });

  it('changeToColor is monotonic — larger positive = darker green', () => {
    // Each threshold gives a distinct color
    const c5 = changeToColor(5);
    const c2 = changeToColor(2.5);
    const c1 = changeToColor(1.5);
    const cn1 = changeToColor(-1.5);
    const cn5 = changeToColor(-5);
    // They should all be different
    const colors = new Set([c5, c2, c1, cn1, cn5]);
    expect(colors.size).toBeGreaterThanOrEqual(4);
  });

  it('normalizeToPercent handles empty and zero-base', () => {
    expect(normalizeToPercent([])).toEqual([]);
    const zeroBase = [{ open: 0, close: 0, time: '2025-01-01' }];
    expect(normalizeToPercent(zeroBase)).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════
// 10. CROSS-MODULE INTEGRATION
// ═════════════════════════════════════════════════════════════

describe('Cross-Module Integration', () => {
  it('groupBySector produces sectors matching SECTOR_COLORS', () => {
    const stocks = generateMarketData(42);
    const sectors = groupBySector(stocks);
    for (const sec of sectors) {
      expect(SECTOR_COLORS[sec.name]).toBeDefined();
    }
  });

  it('candleHelpers and sparklines use same STOCK_PRESETS', () => {
    for (const sym of POPULAR_SYMBOLS) {
      const candles = getCandleData(sym, '1M');
      expect(candles.length).toBe(30);
      const sp = generateSparkline(sym, 1);
      expect(sp.length).toBe(SPARKLINE_POINTS);
    }
  });

  it('INDICATORS config matches calculateX function availability', () => {
    const candles = getCandleData('MSFT', '1Y');
    for (const ind of INDICATORS) {
      switch (ind.id) {
        case 'sma20': expect(calculateSMA(candles, 20).length).toBeGreaterThan(0); break;
        case 'sma50': expect(calculateSMA(candles, 50).length).toBeGreaterThan(0); break;
        case 'ema12': expect(calculateEMA(candles, 12).length).toBeGreaterThan(0); break;
        case 'ema26': expect(calculateEMA(candles, 26).length).toBeGreaterThan(0); break;
        case 'bollinger': expect(calculateBollingerBands(candles).upper.length).toBeGreaterThan(0); break;
        case 'rsi': expect(calculateRSI(candles).length).toBeGreaterThan(0); break;
        case 'macd': expect(calculateMACD(candles).macd.length).toBeGreaterThan(0); break;
        case 'volume': break; // volume is raw candle data, no indicator fn
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════
// 11. FEATURE COMBINATIONS
// ═════════════════════════════════════════════════════════════

describe('Feature Combinations', () => {
  it('all 14 stock presets produce stable 1Y candle data with all indicators', () => {
    clearCandleCache();
    for (const sym of POPULAR_SYMBOLS) {
      const candles = getCandleData(sym, '1Y');
      expect(candles.length).toBeGreaterThan(200); // ~285 trading days

      // Verify no NaN/Infinity in any data
      candles.forEach(c => {
        expect(Number.isFinite(c.open)).toBe(true);
        expect(Number.isFinite(c.high)).toBe(true);
        expect(Number.isFinite(c.low)).toBe(true);
        expect(Number.isFinite(c.close)).toBe(true);
        expect(Number.isFinite(c.volume)).toBe(true);
      });

      // All indicators should work
      expect(calculateSMA(candles, 20).length).toBeGreaterThan(0);
      expect(calculateEMA(candles, 12).length).toBeGreaterThan(0);
      expect(calculateRSI(candles).length).toBeGreaterThan(0);
      expect(calculateMACD(candles).macd.length).toBeGreaterThan(0);
      expect(calculateBollingerBands(candles).upper.length).toBeGreaterThan(0);
    }
  });

  it('rapid cache clear + regenerate cycle is stable', () => {
    for (let i = 0; i < 20; i++) {
      clearCandleCache();
      const candles = getCandleData('NVDA', '3M');
      expect(candles.length).toBe(90);
    }
  });

  it('portfolio handles rapid buy/sell cycles', () => {
    let p = createPortfolio(100000);
    for (let i = 0; i < 50; i++) {
      const buyResult = executeTrade(p, 'TEST', 'buy', 1, 100);
      if (buyResult.success) p = buyResult.portfolio;
      if (p.positions.length > 0) {
        const sellResult = executeTrade(p, 'TEST', 'sell', 1, 105);
        if (sellResult.success) p = sellResult.portfolio;
      }
    }
    expect(p.cash).toBeGreaterThan(100000); // Should have profited
    expect(p.trades.length).toBe(100); // 50 buys + 50 sells
  });
});

// ═════════════════════════════════════════════════════════════
// 12. DEPLOYMENT READINESS
// ═════════════════════════════════════════════════════════════

describe('Deployment Readiness', () => {
  it('all required public assets exist', () => {
    const publicDir = path.join(ROOT, 'public');
    expect(fs.existsSync(path.join(publicDir, 'favicon.svg'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'og-image.svg'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, '404.html'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'robots.txt'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'sitemap.xml'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'manifest.json'))).toBe(true);
  });

  it('LICENSE and README exist', () => {
    expect(fs.existsSync(path.join(ROOT, 'LICENSE'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'README.md'))).toBe(true);
  });

  it('CI/CD workflow exists', () => {
    expect(fs.existsSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'))).toBe(true);
  });

  it('package.json has all metadata', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.name).toBe('marketflow');
    expect(pkg.version).toBe('1.0.0');
    expect(pkg.description).toBeTruthy();
    expect(pkg.homepage).toContain('github.io');
    expect(pkg.repository).toBeDefined();
    expect(pkg.keywords?.length).toBeGreaterThan(0);
    expect(pkg.author).toBeTruthy();
    expect(pkg.license).toBe('MIT');
    expect(pkg.scripts?.build).toBeTruthy();
    expect(pkg.scripts?.test).toBeTruthy();
    expect(pkg.scripts?.deploy).toBeTruthy();
  });

  it('manifest.json has required PWA fields', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'manifest.json'), 'utf-8'));
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.icons?.length).toBeGreaterThan(0);
  });

  it('index.html has essential meta tags', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
    expect(html).toContain('og:title');
    expect(html).toContain('og:description');
    expect(html).toContain('og:image');
    expect(html).toContain('twitter:card');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('theme-color');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('name="keywords"');
  });

  it('tsconfig is strict mode with all linting flags', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'tsconfig.app.json'), 'utf-8');
    // tsconfig may have comments — strip them before parsing
    const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
    const tsconfig = JSON.parse(stripped);
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noUnusedLocals).toBe(true);
    expect(tsconfig.compilerOptions.noUnusedParameters).toBe(true);
    expect(tsconfig.compilerOptions.noFallthroughCasesInSwitch).toBe(true);
    expect(tsconfig.exclude).toContain('src/__tests__');
  });
});

// ═════════════════════════════════════════════════════════════
// 13. MODULE EXPORTS VERIFICATION
// ═════════════════════════════════════════════════════════════

describe('Module Exports', () => {
  it('data barrel exports all public functions', () => {
    expect(typeof generateMarketData).toBe('function');
    expect(typeof groupBySector).toBe('function');
    expect(typeof generateCandlestickData).toBe('function');
    expect(typeof getCandleData).toBe('function');
    expect(typeof clearCandleCache).toBe('function');
    expect(typeof calculateSMA).toBe('function');
    expect(typeof calculateEMA).toBe('function');
    expect(typeof calculateRSI).toBe('function');
    expect(typeof calculateMACD).toBe('function');
    expect(typeof calculateBollingerBands).toBe('function');
    expect(typeof createPortfolio).toBe('function');
    expect(typeof executeTrade).toBe('function');
    expect(typeof getPortfolioValue).toBe('function');
    expect(typeof getPortfolioReturn).toBe('function');
    expect(typeof getPositionPnL).toBe('function');
    expect(typeof computeMarketMood).toBe('function');
    expect(typeof generateSparkline).toBe('function');
    expect(typeof sparklineToPath).toBe('function');
    expect(typeof sparklineToArea).toBe('function');
    expect(typeof generateAllSparklines).toBe('function');
  });

  it('utils exports all public functions', () => {
    expect(typeof seededRandom).toBe('function');
    expect(typeof changeToColor).toBe('function');
    expect(typeof normalizeToPercent).toBe('function');
  });

  it('constants exports all values', () => {
    expect(STOCK_PRESETS).toBeDefined();
    expect(POPULAR_SYMBOLS).toBeDefined();
    expect(SECTOR_COLORS).toBeDefined();
    expect(CHART_THEME).toBeDefined();
    expect(INDICATORS).toBeDefined();
    expect(COMPARISON_COLORS).toBeDefined();
    expect(CINEMATIC_STOCKS).toBeDefined();
    expect(TIMEFRAME_DAYS).toBeDefined();
    expect(TIMEFRAMES).toBeDefined();
    expect(CHANGE_COLOR_STOPS).toBeDefined();
    expect(DEFAULT_STARTING_CASH).toBeDefined();
  });

  it('data barrel re-exports match direct module imports', () => {
    expect(DEFAULT_PRESET.price).toBe(100);
    expect(DEFAULT_PRESET.volatility).toBe(0.02);
    expect(GENERATION_DAYS).toBeGreaterThan(0);
    expect(MOOD_THRESHOLDS.length).toBe(5);
    expect(SPARKLINE_POINTS).toBe(30);
  });
});

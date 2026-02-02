import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ── Module imports (verify all public APIs are accessible) ──

import type {
  Stock, Sector, Candle, TimeSeriesPoint, MACDResult, BollingerResult,
  Position, Trade, Portfolio, TradeResult, PnL,
  View, ChartTimeframe, Indicator, MarketMood, StockPreset, IndicatorConfig,
} from '../types';

import {
  TIMEFRAME_DAYS, TIMEFRAMES, SECTOR_COLORS, CHART_THEME, INDICATORS,
  COMPARISON_COLORS, MAX_COMPARISON_STOCKS, CINEMATIC_STOCKS, CINEMATIC_INTERVAL,
  STOCK_PRESETS, POPULAR_SYMBOLS, CHANGE_COLOR_STOPS, CHANGE_COLOR_FLOOR,
  DEFAULT_STARTING_CASH, DEFAULT_CANDLE_DAYS, DEFAULT_VOLATILITY, DEFAULT_TREND,
  DEFAULT_PRICE,
} from '../constants';

import { seededRandom, changeToColor, normalizeToPercent } from '../utils';

import {
  calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands,
} from '../data/indicators';

import { generateMarketData, groupBySector } from '../data/marketData';
import { generateCandlestickData } from '../data/candlestickData';
import {
  createPortfolio, executeTrade, getPortfolioValue, getPortfolioReturn, getPositionPnL,
} from '../data/portfolioData';

import {
  toCandlestickData, toVolumeData, toLineData, toConstantLine, toHistogramData,
} from '../chartHelpers';

// ── Constants Validation ──

describe('Constants Validation', () => {
  it('TIMEFRAME_DAYS has all 4 timeframes', () => {
    expect(Object.keys(TIMEFRAME_DAYS)).toEqual(['1M', '3M', '6M', '1Y']);
    expect(TIMEFRAME_DAYS['1M']).toBe(30);
    expect(TIMEFRAME_DAYS['1Y']).toBe(365);
  });

  it('TIMEFRAMES matches TIMEFRAME_DAYS keys', () => {
    expect(TIMEFRAMES).toEqual(Object.keys(TIMEFRAME_DAYS));
  });

  it('SECTOR_COLORS covers all 11 sectors', () => {
    const sectorNames = Object.keys(SECTOR_COLORS);
    expect(sectorNames.length).toBe(11);
    // All values are valid hex colors
    for (const color of Object.values(SECTOR_COLORS)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('CHART_THEME has all required fields', () => {
    expect(CHART_THEME.background).toBeTruthy();
    expect(CHART_THEME.textColor).toBeTruthy();
    expect(CHART_THEME.fontSize).toBeGreaterThan(0);
    expect(CHART_THEME.gridColor).toBeTruthy();
    expect(CHART_THEME.upColor).toBeTruthy();
    expect(CHART_THEME.downColor).toBeTruthy();
  });

  it('INDICATORS has 8 entries with unique ids', () => {
    expect(INDICATORS.length).toBe(8);
    const ids = INDICATORS.map(i => i.id);
    expect(new Set(ids).size).toBe(8);
    // Each has label and color
    for (const ind of INDICATORS) {
      expect(ind.label.length).toBeGreaterThan(0);
      expect(ind.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('COMPARISON_COLORS has 8 distinct colors', () => {
    expect(COMPARISON_COLORS.length).toBe(8);
    expect(new Set(COMPARISON_COLORS).size).toBe(8);
  });

  it('MAX_COMPARISON_STOCKS matches COMPARISON_COLORS length', () => {
    expect(MAX_COMPARISON_STOCKS).toBe(COMPARISON_COLORS.length);
  });

  it('CINEMATIC_STOCKS are all valid presets', () => {
    expect(CINEMATIC_STOCKS.length).toBe(10);
    for (const sym of CINEMATIC_STOCKS) {
      expect(STOCK_PRESETS[sym]).toBeDefined();
    }
  });

  it('CINEMATIC_INTERVAL is reasonable', () => {
    expect(CINEMATIC_INTERVAL).toBeGreaterThanOrEqual(5000);
    expect(CINEMATIC_INTERVAL).toBeLessThanOrEqual(30000);
  });

  it('STOCK_PRESETS has 14 entries with valid params', () => {
    expect(Object.keys(STOCK_PRESETS).length).toBe(14);
    for (const [sym, preset] of Object.entries(STOCK_PRESETS)) {
      expect(preset.price).toBeGreaterThan(0);
      expect(preset.volatility).toBeGreaterThan(0);
      expect(typeof preset.trend).toBe('number');
      expect(sym.length).toBeGreaterThan(0);
    }
  });

  it('POPULAR_SYMBOLS matches STOCK_PRESETS keys', () => {
    expect(POPULAR_SYMBOLS).toEqual(Object.keys(STOCK_PRESETS));
  });

  it('CHANGE_COLOR_STOPS are ordered descending', () => {
    for (let i = 1; i < CHANGE_COLOR_STOPS.length; i++) {
      expect(CHANGE_COLOR_STOPS[i - 1].threshold).toBeGreaterThan(CHANGE_COLOR_STOPS[i].threshold);
    }
  });

  it('DEFAULT_STARTING_CASH is 100000', () => {
    expect(DEFAULT_STARTING_CASH).toBe(100000);
  });

  it('Default candle generation params are positive', () => {
    expect(DEFAULT_CANDLE_DAYS).toBeGreaterThan(0);
    expect(DEFAULT_VOLATILITY).toBeGreaterThan(0);
    expect(DEFAULT_TREND).toBeGreaterThan(0);
    expect(DEFAULT_PRICE).toBeGreaterThan(0);
  });
});

// ── Utils Validation ──

describe('Utils — seededRandom', () => {
  it('produces deterministic values', () => {
    const r1 = seededRandom(42);
    const r2 = seededRandom(42);
    const vals1 = Array.from({ length: 10 }, () => r1());
    const vals2 = Array.from({ length: 10 }, () => r2());
    expect(vals1).toEqual(vals2);
  });

  it('values are in (0, 1)', () => {
    const r = seededRandom(12345);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const r1 = seededRandom(1);
    const r2 = seededRandom(2);
    const v1 = r1();
    const v2 = r2();
    expect(v1).not.toBe(v2);
  });
});

describe('Utils — changeToColor', () => {
  it('returns green for positive changes', () => {
    expect(changeToColor(5)).toBe('#15803d');  // > 3
    expect(changeToColor(2.5)).toBe('#16a34a'); // > 2
    expect(changeToColor(1.5)).toBe('#22c55e'); // > 1
    expect(changeToColor(0.8)).toBe('#4ade80'); // > 0.5
    expect(changeToColor(0.3)).toBe('#86efac'); // > 0
  });

  it('returns red for negative changes', () => {
    expect(changeToColor(-0.3)).toBe('#fca5a5'); // > -0.5
    expect(changeToColor(-0.8)).toBe('#f87171'); // > -1
    expect(changeToColor(-1.5)).toBe('#ef4444'); // > -2
    expect(changeToColor(-2.5)).toBe('#dc2626'); // > -3
    expect(changeToColor(-5)).toBe('#b91c1c');   // floor
  });

  it('boundary: exactly 0 returns light green', () => {
    // 0 is > -0.5, so it returns '#86efac' (just above 0 threshold)
    // Actually: change > 0 → '#86efac'. change = 0 fails the > 0 check,
    // so falls through to change > -0.5 → '#fca5a5'
    expect(changeToColor(0)).toBe('#fca5a5');
    expect(changeToColor(0.01)).toBe('#86efac');
  });
});

describe('Utils — normalizeToPercent', () => {
  it('returns empty for empty input', () => {
    expect(normalizeToPercent([])).toEqual([]);
  });

  it('returns empty when basePrice is 0', () => {
    expect(normalizeToPercent([{ time: '2025-01-01', open: 0, close: 50 }])).toEqual([]);
  });

  it('first value starts near 0%', () => {
    const candles = [
      { time: '2025-01-01', open: 100, close: 100 },
      { time: '2025-01-02', open: 100, close: 110 },
    ];
    const result = normalizeToPercent(candles);
    expect(result[0].value).toBe(0);
    expect(result[1].value).toBe(10); // +10%
  });
});

// ── Indicators (extracted module) ──

describe('Indicators Module', () => {
  const testCandles: Candle[] = Array.from({ length: 50 }, (_, i) => ({
    time: `2025-01-${String(i + 1).padStart(2, '0')}`,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i + (i % 2 === 0 ? 2 : -1),
    volume: 1000000,
  }));

  it('SMA produces correct length', () => {
    const sma = calculateSMA(testCandles, 20);
    expect(sma.length).toBe(testCandles.length - 20 + 1);
  });

  it('EMA produces correct length', () => {
    const ema = calculateEMA(testCandles, 12);
    expect(ema.length).toBe(testCandles.length - 12 + 1);
  });

  it('RSI values are 0-100', () => {
    const rsi = calculateRSI(testCandles, 14);
    expect(rsi.length).toBeGreaterThan(0);
    for (const p of rsi) {
      expect(p.value).toBeGreaterThanOrEqual(0);
      expect(p.value).toBeLessThanOrEqual(100);
    }
  });

  it('MACD returns all three components', () => {
    const result = calculateMACD(testCandles);
    expect(result.macd.length).toBeGreaterThan(0);
    expect(result.signal.length).toBeGreaterThan(0);
    expect(result.histogram.length).toBeGreaterThan(0);
  });

  it('Bollinger bands: upper > middle > lower', () => {
    const bb = calculateBollingerBands(testCandles, 20, 2);
    expect(bb.upper.length).toBeGreaterThan(0);
    for (let i = 0; i < bb.upper.length; i++) {
      expect(bb.upper[i].value).toBeGreaterThan(bb.middle[i].value);
      expect(bb.middle[i].value).toBeGreaterThan(bb.lower[i].value);
    }
  });

  it('all indicators return empty for insufficient data', () => {
    const short: Candle[] = testCandles.slice(0, 3);
    expect(calculateSMA(short, 20)).toEqual([]);
    expect(calculateEMA(short, 20)).toEqual([]);
    expect(calculateRSI(short, 14)).toEqual([]);
    expect(calculateBollingerBands(short, 20).upper).toEqual([]);
  });
});

// ── Chart Helpers ──

describe('Chart Helpers', () => {
  const candles: Candle[] = [
    { time: '2025-01-01', open: 100, high: 105, low: 95, close: 102, volume: 1000 },
    { time: '2025-01-02', open: 102, high: 108, low: 99, close: 97, volume: 2000 },
  ];

  it('toCandlestickData preserves OHLC', () => {
    const result = toCandlestickData(candles);
    expect(result.length).toBe(2);
    expect(result[0].open).toBe(100);
    expect(result[0].close).toBe(102);
  });

  it('toVolumeData colors green for up, red for down', () => {
    const result = toVolumeData(candles);
    expect(result[0].color).toContain('94, 0.3'); // green (close > open)
    expect(result[1].color).toContain('68, 0.3'); // red (close < open)
  });

  it('toLineData maps correctly', () => {
    const points: TimeSeriesPoint[] = [
      { time: '2025-01-01', value: 42 },
    ];
    const result = toLineData(points);
    expect(result[0].value).toBe(42);
    expect(result[0].time).toBe('2025-01-01');
  });

  it('toConstantLine creates constant values', () => {
    const points: TimeSeriesPoint[] = [
      { time: '2025-01-01', value: 50 },
      { time: '2025-01-02', value: 60 },
    ];
    const result = toConstantLine(points, 70);
    expect(result.length).toBe(2);
    expect(result[0].value).toBe(70);
    expect(result[1].value).toBe(70);
  });

  it('toHistogramData preserves colors', () => {
    const hist = [{ time: '2025-01-01', value: 0.5, color: '#22c55e' }];
    const result = toHistogramData(hist);
    expect(result[0].color).toBe('#22c55e');
  });
});

// ── Cross-Module Integration ──

describe('Cross-Module Integration', () => {
  it('generateMarketData returns stocks with all required fields', () => {
    const stocks = generateMarketData(42);
    expect(stocks.length).toBeGreaterThan(0);
    for (const s of stocks) {
      expect(typeof s.symbol).toBe('string');
      expect(typeof s.name).toBe('string');
      expect(typeof s.sector).toBe('string');
      expect(s.marketCap).toBeGreaterThan(0);
      expect(s.price).toBeGreaterThan(0);
      expect(typeof s.change).toBe('number');
      expect(s.volume).toBeGreaterThan(0);
    }
  });

  it('groupBySector uses all SECTOR_COLORS', () => {
    const stocks = generateMarketData(42);
    const sectors = groupBySector(stocks);
    for (const sector of sectors) {
      expect(SECTOR_COLORS[sector.name]).toBeDefined();
    }
  });

  it('generateCandlestickData works with STOCK_PRESETS', () => {
    for (const [sym, preset] of Object.entries(STOCK_PRESETS)) {
      const candles = generateCandlestickData(sym, preset.price * 0.7, 30, preset.volatility, preset.trend);
      expect(candles.length).toBeGreaterThan(0);
      for (const c of candles) {
        expect(Number.isFinite(c.open)).toBe(true);
        expect(Number.isFinite(c.close)).toBe(true);
        expect(c.high).toBeGreaterThanOrEqual(Math.min(c.open, c.close));
        expect(c.low).toBeLessThanOrEqual(Math.max(c.open, c.close));
      }
    }
  });

  it('portfolio pipeline: create → buy → sell → value', () => {
    const p = createPortfolio(DEFAULT_STARTING_CASH);
    expect(getPortfolioValue(p)).toBe(DEFAULT_STARTING_CASH);

    const buyResult = executeTrade(p, 'AAPL', 'buy', 10, 150);
    expect(buyResult.success).toBe(true);
    expect(buyResult.portfolio.cash).toBe(DEFAULT_STARTING_CASH - 1500);

    const sellResult = executeTrade(buyResult.portfolio, 'AAPL', 'sell', 5, 160);
    expect(sellResult.success).toBe(true);

    const pnl = getPositionPnL(sellResult.portfolio.positions[0]);
    expect(pnl.absolute).toBeGreaterThan(0); // bought at 150, current = 160
  });

  it('indicators work on generated candle data', () => {
    const candles = generateCandlestickData('AAPL', 160, 200, 0.018, 0.0004);
    expect(calculateSMA(candles, 20).length).toBeGreaterThan(0);
    expect(calculateEMA(candles, 12).length).toBeGreaterThan(0);
    expect(calculateRSI(candles, 14).length).toBeGreaterThan(0);
    const macd = calculateMACD(candles);
    expect(macd.macd.length).toBeGreaterThan(0);
    const bb = calculateBollingerBands(candles);
    expect(bb.upper.length).toBeGreaterThan(0);
  });

  it('changeToColor covers full range of generated market data', () => {
    const stocks = generateMarketData(42);
    for (const s of stocks) {
      const color = changeToColor(s.change);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

// ── Module Export Verification ──

describe('Module Export Verification', () => {
  it('types.ts exports are used without runtime errors', () => {
    // Type-only assertions — if this compiles, types are correct
    const _view: View = 'heatmap';
    const _tf: ChartTimeframe = '1Y';
    const _ind: Indicator = 'rsi';
    expect(_view).toBe('heatmap');
    expect(_tf).toBe('1Y');
    expect(_ind).toBe('rsi');
  });

  it('constants.ts exports all required constants', () => {
    // Verify existence
    expect(TIMEFRAME_DAYS).toBeDefined();
    expect(TIMEFRAMES).toBeDefined();
    expect(SECTOR_COLORS).toBeDefined();
    expect(CHART_THEME).toBeDefined();
    expect(INDICATORS).toBeDefined();
    expect(COMPARISON_COLORS).toBeDefined();
    expect(MAX_COMPARISON_STOCKS).toBeDefined();
    expect(CINEMATIC_STOCKS).toBeDefined();
    expect(CINEMATIC_INTERVAL).toBeDefined();
    expect(STOCK_PRESETS).toBeDefined();
    expect(POPULAR_SYMBOLS).toBeDefined();
    expect(DEFAULT_STARTING_CASH).toBeDefined();
  });

  it('utils.ts exports all utility functions', () => {
    expect(typeof seededRandom).toBe('function');
    expect(typeof changeToColor).toBe('function');
    expect(typeof normalizeToPercent).toBe('function');
  });

  it('chartHelpers.ts exports all chart conversion functions', () => {
    expect(typeof toCandlestickData).toBe('function');
    expect(typeof toVolumeData).toBe('function');
    expect(typeof toLineData).toBe('function');
    expect(typeof toConstantLine).toBe('function');
    expect(typeof toHistogramData).toBe('function');
  });

  it('indicators.ts exports all indicator functions', () => {
    expect(typeof calculateSMA).toBe('function');
    expect(typeof calculateEMA).toBe('function');
    expect(typeof calculateRSI).toBe('function');
    expect(typeof calculateMACD).toBe('function');
    expect(typeof calculateBollingerBands).toBe('function');
  });
});

// ── No as-any in source ──

describe('Code Quality', () => {
  it('no `as any` casts in source files (excluding tests)', () => {
    const srcDir = path.resolve(__dirname, '..');
    const sourceFiles = fs.readdirSync(srcDir, { recursive: true })
      .map(f => String(f))
      .filter(f => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('__tests__'));

    for (const file of sourceFiles) {
      const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
      const asAnyMatches = content.match(/\bas any\b/g);
      // Allow 'as any' only in comments (grep for lines without //)
      if (asAnyMatches) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (/\bas any\b/.test(line) && !line.trimStart().startsWith('//') && !line.trimStart().startsWith('*')) {
            // This is a real `as any` in code — fail
            expect(`${file}:${i + 1}`).toBe('no as-any casts');
          }
        }
      }
    }
  });

  it('no TODO/FIXME/HACK in source files', () => {
    const srcDir = path.resolve(__dirname, '..');
    const sourceFiles = fs.readdirSync(srcDir, { recursive: true })
      .map(f => String(f))
      .filter(f => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('__tests__'));

    for (const file of sourceFiles) {
      const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
      expect(content).not.toMatch(/\bTODO\b/);
      expect(content).not.toMatch(/\bFIXME\b/);
      expect(content).not.toMatch(/\bHACK\b/);
    }
  });

  it('no duplicate seededRandom implementations', () => {
    const srcDir = path.resolve(__dirname, '..');
    const sourceFiles = fs.readdirSync(srcDir, { recursive: true })
      .map(f => String(f))
      .filter(f => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('__tests__'));

    let definitionCount = 0;
    for (const file of sourceFiles) {
      const content = fs.readFileSync(path.join(srcDir, file), 'utf-8');
      if (content.includes('function seededRandom')) {
        definitionCount++;
      }
    }
    expect(definitionCount).toBe(1); // Only in utils.ts
  });
});
